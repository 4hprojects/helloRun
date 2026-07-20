'use strict';

const mongoose = require('mongoose');
const RunningGroup = require('../models/RunningGroup');
const RunningGroupAnnouncement = require('../models/RunningGroupAnnouncement');
const RunningGroupComment = require('../models/RunningGroupComment');
const RunningGroupCommunityReport = require('../models/RunningGroupCommunityReport');
const Notification = require('../models/Notification');
const User = require('../models/User');
const logger = require('../utils/logger');
const { sanitizeHtml } = require('../utils/sanitize');
const { analyzeCommentSafety } = require('../utils/blog-safety');
const { normalizeRunningGroupMemberships, normalizeRunningGroupKey } = require('../utils/running-group-memberships');
const {
  createThreadedComments,
  createMongooseRepositories,
  normalizePolicy,
  presentComment,
  createLifecycleBus,
  LIFECYCLE_EVENTS
} = require('@hellorun/threaded-comments');

const ANNOUNCEMENTS_PAGE_SIZE = 10;
const EDIT_WINDOW_MS = 30 * 60 * 1000;
const MAX_EDITS = 5;
const REPORT_REASONS = RunningGroupCommunityReport.REPORT_REASONS;

class GroupCommunityError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = 'GroupCommunityError';
    this.status = status;
  }
}

const commentPolicy = normalizePolicy({
  commentsPageSize: 20,
  repliesPageSize: 20,
  replyPreviewSize: 3,
  maxContentLength: RunningGroupComment.MAX_COMMENT_LENGTH,
  editWindowMs: EDIT_WINDOW_MS,
  maxEdits: MAX_EDITS,
  tombstoneText: 'Comment deleted',
  redactedRevisionText: 'Revision removed by author',
  reportReasons: REPORT_REASONS
});

function objectId(value) {
  const safe = String(value || '').trim();
  return mongoose.Types.ObjectId.isValid(safe) ? new mongoose.Types.ObjectId(safe) : null;
}

function sanitizeText(value) {
  return sanitizeHtml(String(value || ''), { allowedTags: [], allowedAttributes: {} }).trim();
}

function authorName(user = {}) {
  return String(user.displayName || `${user.firstName || ''} ${user.lastName || ''}`)
    .replace(/\s+/g, ' ').trim() || 'HelloRun runner';
}

function isGroupMember(user, group) {
  if (!user || !group) return false;
  const names = normalizeRunningGroupMemberships(
    Array.isArray(user.runningGroups) && user.runningGroups.length ? user.runningGroups : [user.runningGroup]
  );
  return names.some((name) => normalizeRunningGroupKey(name) === normalizeRunningGroupKey(group.name));
}

async function requireActiveGroup(slug) {
  const group = await RunningGroup.findOne({ slug: String(slug || '').trim().toLowerCase(), isActive: true }).lean();
  if (!group) throw new GroupCommunityError('Running group not found.', 404);
  return group;
}

async function requireAnnouncement(group, announcementId, options = {}) {
  const id = objectId(announcementId);
  if (!id) throw new GroupCommunityError('Invalid announcement id.', 400);
  const query = { _id: id, groupId: group._id };
  if (!options.includeRemoved) Object.assign(query, { status: 'active', isDeleted: { $ne: true } });
  const announcement = await RunningGroupAnnouncement.findOne(query).lean();
  if (!announcement) throw new GroupCommunityError('Announcement not found.', 404);
  return announcement;
}

function validateAnnouncementContent(input, current = null) {
  const raw = String(input || '').trim();
  if (!raw) throw new GroupCommunityError('Announcement content is required.');
  if (raw.length > RunningGroupAnnouncement.MAX_ANNOUNCEMENT_LENGTH) {
    throw new GroupCommunityError(`Announcement must not exceed ${RunningGroupAnnouncement.MAX_ANNOUNCEMENT_LENGTH} characters.`);
  }
  const content = sanitizeText(raw);
  if (!content) throw new GroupCommunityError('Announcement content is required.');
  if (current !== null && content === String(current || '')) throw new GroupCommunityError('Make a change before saving your announcement.');
  return content;
}

function clampPage(value) {
  const page = Number.parseInt(value, 10);
  return Number.isInteger(page) && page > 0 ? Math.min(page, 500) : 1;
}

function presentAnnouncement(item, currentUserId = '') {
  const deleted = item.isDeleted === true || item.status === 'removed';
  const author = item.authorId && typeof item.authorId === 'object' ? item.authorId : { _id: item.authorId };
  const createdAt = item.createdAt || null;
  return {
    id: String(item._id),
    content: deleted ? 'Announcement removed' : String(item.content || ''),
    authorId: String(author._id || ''),
    authorName: deleted ? 'Removed announcement' : authorName(author),
    avatarUrl: deleted ? '' : String(author.avatarUrl || ''),
    createdAt,
    updatedAt: item.updatedAt || createdAt,
    lastEditedAt: item.lastEditedAt || null,
    commentsCount: Number(item.commentsCount || 0),
    isDeleted: deleted,
    canEdit: !deleted && String(author._id || '') === String(currentUserId) && Number(item.editCount || 0) < MAX_EDITS
      && new Date(createdAt).getTime() + EDIT_WINDOW_MS > Date.now(),
    canDelete: !deleted && String(author._id || '') === String(currentUserId),
    hasEditHistory: !deleted && Array.isArray(item.editHistory) && item.editHistory.length > 0
  };
}

async function listAnnouncements(group, options = {}) {
  const page = clampPage(options.page);
  const rootsWithComments = await RunningGroupAnnouncement.distinct('_id', { groupId: group._id, commentsCount: { $gt: 0 } });
  const query = {
    groupId: group._id,
    $or: [{ status: 'active', isDeleted: { $ne: true } }, { _id: { $in: rootsWithComments } }]
  };
  const total = await RunningGroupAnnouncement.countDocuments(query);
  const totalPages = Math.max(1, Math.ceil(total / ANNOUNCEMENTS_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const items = await RunningGroupAnnouncement.find(query)
    .sort({ createdAt: -1, _id: -1 })
    .skip((currentPage - 1) * ANNOUNCEMENTS_PAGE_SIZE)
    .limit(ANNOUNCEMENTS_PAGE_SIZE)
    .populate('authorId', 'displayName firstName lastName avatarUrl')
    .lean();
  return {
    items: items.map((item) => presentAnnouncement(item, options.currentUserId)),
    pagination: { page: currentPage, total, totalPages, pageSize: ANNOUNCEMENTS_PAGE_SIZE }
  };
}

async function notifyMembers(group, announcement, actor) {
  const namePattern = new RegExp(`^${String(group.name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
  const recipients = await User.find({
    _id: { $ne: actor._id },
    accountStatus: 'active',
    $or: [{ runningGroups: namePattern }, { runningGroup: namePattern }]
  }).select('_id').lean();
  if (!recipients.length) return;
  const href = `/runner/groups/${encodeURIComponent(group.slug)}#announcement-${announcement._id}`;
  const operations = recipients.map((recipient) => ({
    updateOne: {
      filter: { userId: recipient._id, dedupeKey: `group-announcement:${announcement._id}` },
      update: { $setOnInsert: {
        userId: recipient._id,
        type: 'running_group_announcement',
        title: `New announcement in ${String(group.name).slice(0, 120)}`,
        message: `${authorName(actor)} posted a new group announcement.`,
        href,
        dedupeKey: `group-announcement:${announcement._id}`,
        metadata: { groupId: String(group._id), announcementId: String(announcement._id) }
      } },
      upsert: true
    }
  }));
  for (let index = 0; index < operations.length; index += 500) {
    // eslint-disable-next-line no-await-in-loop
    await Notification.bulkWrite(operations.slice(index, index + 500), { ordered: false });
  }
}

async function createAnnouncement({ group, user, content: input }) {
  if (!isGroupMember(user, group)) throw new GroupCommunityError('Join this group before posting an announcement.', 403);
  const content = validateAnnouncementContent(input);
  const safety = analyzeCommentSafety(content);
  const announcement = await RunningGroupAnnouncement.create({
    groupId: group._id,
    authorId: user._id,
    content,
    moderationFlags: safety.flags,
    moderationFlagSummary: safety.summary
  });
  try {
    await notifyMembers(group, announcement, user);
  } catch (error) {
    logger.error('Running group announcement notification fanout failed:', error.message);
  }
  return announcement;
}

async function editAnnouncement({ group, user, announcementId, content: input, expectedUpdatedAt }) {
  const announcement = await requireAnnouncement(group, announcementId);
  if (String(announcement.authorId) !== String(user._id)) throw new GroupCommunityError('You can only edit your own announcement.', 403);
  if (Date.now() >= new Date(announcement.createdAt).getTime() + EDIT_WINDOW_MS) throw new GroupCommunityError('The 30-minute editing window has ended.', 409);
  if (Number(announcement.editCount || 0) >= MAX_EDITS) throw new GroupCommunityError('This announcement has reached its five-edit limit.', 409);
  const expected = new Date(expectedUpdatedAt);
  if (!expectedUpdatedAt || !Number.isFinite(expected.getTime())) throw new GroupCommunityError('Refresh the group before editing this announcement.');
  const content = validateAnnouncementContent(input, announcement.content);
  const safety = analyzeCommentSafety(content);
  const result = await RunningGroupAnnouncement.findOneAndUpdate({
    _id: announcement._id,
    groupId: group._id,
    authorId: user._id,
    updatedAt: expected,
    status: 'active',
    isDeleted: { $ne: true }
  }, {
    $set: { content, lastEditedAt: new Date(), moderationFlags: safety.flags, moderationFlagSummary: safety.summary },
    $inc: { editCount: 1 },
    $push: { editHistory: { content: announcement.content, effectiveAt: announcement.lastEditedAt || announcement.createdAt, replacedAt: new Date() } }
  }, { new: true, runValidators: true });
  if (!result) throw new GroupCommunityError('This announcement changed in another session. Refresh and try again.', 409);
  return result;
}

async function listAnnouncementHistory({ group, announcementId }) {
  const announcement = await requireAnnouncement(group, announcementId);
  const versions = (announcement.editHistory || []).map((revision) => ({
    id: String(revision._id),
    content: revision.redactedAt ? 'Revision removed by author' : String(revision.content || ''),
    effectiveAt: revision.effectiveAt,
    replacedAt: revision.replacedAt,
    isRedacted: Boolean(revision.redactedAt),
    isCurrent: false
  }));
  versions.push({
    id: String(announcement._id), content: announcement.content,
    effectiveAt: announcement.lastEditedAt || announcement.createdAt,
    replacedAt: null, isRedacted: false, isCurrent: true
  });
  return { announcement: presentAnnouncement(announcement), versions };
}

async function redactAnnouncementRevision({ group, user, announcementId, revisionId }) {
  const announcement = await requireAnnouncement(group, announcementId);
  if (String(announcement.authorId) !== String(user._id)) throw new GroupCommunityError('You can only redact revisions from your own announcement.', 403);
  const revisionObjectId = objectId(revisionId);
  if (!revisionObjectId) throw new GroupCommunityError('Revision not found.', 404);
  const result = await RunningGroupAnnouncement.updateOne({
    _id: announcement._id, groupId: group._id, 'editHistory._id': revisionObjectId,
    status: 'active', isDeleted: { $ne: true }
  }, { $set: {
    'editHistory.$.content': '', 'editHistory.$.redactedAt': new Date(), 'editHistory.$.redactedBy': user._id
  } });
  if (result.matchedCount !== 1) throw new GroupCommunityError('Revision not found.', 404);
  return listAnnouncementHistory({ group, announcementId });
}

async function removeAnnouncement({ group, user, announcementId, isAdmin = false, moderationNote = '' }) {
  const announcement = await requireAnnouncement(group, announcementId);
  if (!isAdmin && String(announcement.authorId) !== String(user._id)) throw new GroupCommunityError('You can only delete your own announcement.', 403);
  await RunningGroupAnnouncement.updateOne({ _id: announcement._id, groupId: group._id }, { $set: {
    status: 'removed', isDeleted: true, deletedAt: new Date(), deletedBy: user._id,
    moderationNote: String(moderationNote || '').trim().slice(0, 500)
  } });
  return { announcementId: String(announcement._id) };
}

async function reportAnnouncement({ group, user, announcementId, reason, note }) {
  const announcement = await requireAnnouncement(group, announcementId);
  if (String(announcement.authorId) === String(user._id)) throw new GroupCommunityError('You cannot report your own announcement.', 403);
  if (!REPORT_REASONS.includes(String(reason || ''))) throw new GroupCommunityError('A valid report reason is required.');
  return RunningGroupCommunityReport.create({
    targetType: 'announcement', groupId: group._id, announcementId: announcement._id,
    reporterId: user._id, reason, note: String(note || '').trim().slice(0, 500),
    contentSnapshot: announcement.content, authorIdSnapshot: announcement.authorId,
    revisionAtSnapshot: announcement.lastEditedAt || announcement.createdAt,
    editCountSnapshot: Number(announcement.editCount || 0)
  });
}

async function populateComments(records) {
  return RunningGroupComment.populate(records, [
    { path: 'authorId', select: 'displayName firstName lastName avatarUrl' },
    { path: 'replyToCommentId', select: 'authorId', populate: { path: 'authorId', select: 'displayName firstName lastName' } }
  ]);
}

const lifecycle = createLifecycleBus();
const repositories = createMongooseRepositories({
  models: { Comment: RunningGroupComment, Resource: RunningGroupAnnouncement, Identity: User },
  fields: {
    resourceId: 'announcementId', resourceKey: '_id',
    resourceVisibleQuery: { status: 'active', isDeleted: { $ne: true } },
    contributionCount: 'commentsCount'
  },
  createId: () => new mongoose.Types.ObjectId(),
  toObjectId: (value) => objectId(value) || value,
  populate: populateComments
});
repositories.reports = {
  async create(input) {
    const announcement = await RunningGroupAnnouncement.findById(input.resourceId).select('groupId').lean();
    return RunningGroupCommunityReport.create({
      targetType: 'comment', groupId: announcement.groupId, announcementId: input.resourceId,
      commentId: input.commentId, reporterId: input.reporterId, reason: input.reason, note: input.note,
      contentSnapshot: input.snapshot.content, authorIdSnapshot: input.snapshot.authorId,
      revisionAtSnapshot: input.snapshot.revisionAt, editCountSnapshot: input.snapshot.editCount
    });
  }
};

const commentWorkflow = createThreadedComments({
  repositories,
  policy: commentPolicy,
  sanitize: sanitizeText,
  analyzeSafety: analyzeCommentSafety,
  events: lifecycle,
  ids: { next: () => new mongoose.Types.ObjectId() },
  presentComment: (comment, options = {}) => {
    const author = comment.authorId && typeof comment.authorId === 'object' ? comment.authorId : { _id: comment.authorId };
    const target = comment.replyToCommentId && typeof comment.replyToCommentId === 'object' ? comment.replyToCommentId.authorId : {};
    return presentComment(comment, commentPolicy, { ...options, author, replyTargetAuthor: target || {}, getAuthorName: authorName });
  }
});

async function notifyDiscussionTarget({ resource, target, comment, actor, rootCommentId }) {
  const targetId = target?.authorId || resource?.authorId;
  if (!targetId || String(targetId) === String(actor?._id || actor?.id)) return;
  const group = await RunningGroup.findById(resource.groupId).select('name slug').lean();
  if (!group) return;
  const replyId = String(comment._id || comment.id);
  const rootId = String(rootCommentId || comment.parentCommentId || comment._id || comment.id);
  const href = `/runner/groups/${encodeURIComponent(group.slug)}?announcement=${resource._id}&thread=${rootId}&reply=${replyId}#announcement-${resource._id}`;
  try {
    await Notification.updateOne({ userId: targetId, dedupeKey: `group-reply:${replyId}` }, { $setOnInsert: {
      userId: targetId, type: 'running_group_reply', title: 'New reply in your running group',
      message: `${authorName(actor)} replied in ${group.name}.`, href,
      dedupeKey: `group-reply:${replyId}`,
      metadata: { groupId: String(group._id), announcementId: String(resource._id), replyId }
    } }, { upsert: true });
  } catch (error) {
    logger.error('Running group reply notification failed:', error.message);
  }
}

lifecycle.on(LIFECYCLE_EVENTS.COMMENT_CREATED, notifyDiscussionTarget);
lifecycle.on(LIFECYCLE_EVENTS.REPLY_CREATED, notifyDiscussionTarget);

module.exports = {
  ANNOUNCEMENTS_PAGE_SIZE,
  EDIT_WINDOW_MS,
  MAX_EDITS,
  REPORT_REASONS,
  GroupCommunityError,
  commentPolicy,
  commentWorkflow,
  isGroupMember,
  requireActiveGroup,
  requireAnnouncement,
  listAnnouncements,
  createAnnouncement,
  editAnnouncement,
  listAnnouncementHistory,
  redactAnnouncementRevision,
  removeAnnouncement,
  reportAnnouncement,
  presentAnnouncement
};
