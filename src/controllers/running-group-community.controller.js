'use strict';

const User = require('../models/User');
const logger = require('../utils/logger');
const { ThreadedCommentsError } = require('@hellorun/threaded-comments');
const {
  GroupCommunityError,
  commentWorkflow,
  isGroupMember,
  requireActiveGroup,
  requireAnnouncement,
  createAnnouncement,
  editAnnouncement,
  listAnnouncementHistory,
  redactAnnouncementRevision,
  removeAnnouncement,
  reportAnnouncement
} = require('../services/running-group-community.service');

async function context(req, options = {}) {
  const [user, group] = await Promise.all([
    User.findById(req.session.userId).select('firstName lastName displayName avatarUrl runningGroup runningGroups role accountStatus').lean(),
    requireActiveGroup(req.params.slug)
  ]);
  if (!user) throw new GroupCommunityError('Runner account not found.', 404);
  const announcement = req.params.announcementId
    ? await requireAnnouncement(group, req.params.announcementId, options)
    : null;
  return { user, group, announcement };
}

function actor(user) {
  return { id: String(user._id), _id: user._id, firstName: user.firstName, lastName: user.lastName, displayName: user.displayName };
}

function handle(error, res, fallback) {
  if (error instanceof GroupCommunityError || error instanceof ThreadedCommentsError) {
    return res.status(error.status || 400).json({ success: false, message: error.message, code: error.code });
  }
  if (error?.code === 11000) return res.status(409).json({ success: false, message: 'You already have an open report for this content.' });
  logger.error(`${fallback}:`, error);
  return res.status(500).json({ success: false, message: fallback });
}

exports.createAnnouncement = async (req, res) => {
  try {
    const { user, group } = await context(req);
    const item = await createAnnouncement({ group, user, content: req.body.content });
    if (String(req.get('accept') || '').includes('application/json')) {
      return res.status(201).json({ success: true, announcementId: String(item._id) });
    }
    return res.redirect(`/runner/groups/${group.slug}?type=success&msg=${encodeURIComponent('Announcement posted.') }#announcement-${item._id}`);
  } catch (error) {
    if (String(req.get('accept') || '').includes('application/json')) return handle(error, res, 'Failed to post announcement.');
    const message = error.message || 'Failed to post announcement.';
    return res.redirect(`/runner/groups/${encodeURIComponent(req.params.slug)}?type=error&msg=${encodeURIComponent(message)}`);
  }
};

exports.editAnnouncement = async (req, res) => {
  try {
    const { user, group } = await context(req);
    const item = await editAnnouncement({ group, user, announcementId: req.params.announcementId, content: req.body.content, expectedUpdatedAt: req.body.expectedUpdatedAt });
    return res.json({ success: true, announcement: { id: String(item._id), content: item.content, updatedAt: item.updatedAt } });
  } catch (error) { return handle(error, res, 'Failed to edit announcement.'); }
};

exports.deleteAnnouncement = async (req, res) => {
  try {
    const { user, group } = await context(req);
    const result = await removeAnnouncement({ group, user, announcementId: req.params.announcementId });
    return res.json({ success: true, ...result });
  } catch (error) { return handle(error, res, 'Failed to delete announcement.'); }
};

exports.announcementHistory = async (req, res) => {
  try {
    const { group } = await context(req);
    return res.json({ success: true, ...(await listAnnouncementHistory({ group, announcementId: req.params.announcementId })) });
  } catch (error) { return handle(error, res, 'Failed to load announcement history.'); }
};

exports.redactAnnouncementRevision = async (req, res) => {
  try {
    const { user, group } = await context(req);
    return res.json({ success: true, ...(await redactAnnouncementRevision({ group, user, announcementId: req.params.announcementId, revisionId: req.params.revisionId })) });
  } catch (error) { return handle(error, res, 'Failed to redact announcement revision.'); }
};

exports.reportAnnouncement = async (req, res) => {
  try {
    const { user, group } = await context(req);
    await reportAnnouncement({ group, user, announcementId: req.params.announcementId, reason: req.body.reason, note: req.body.note });
    return res.status(201).json({ success: true, message: 'Report submitted.' });
  } catch (error) { return handle(error, res, 'Failed to report announcement.'); }
};

exports.listComments = async (req, res) => {
  try {
    await context(req);
    const result = await commentWorkflow.list({ resourceKey: req.params.announcementId, page: req.query.page, focusThreadId: req.query.thread, focusReplyId: req.query.reply });
    return res.json({ success: true, ...result });
  } catch (error) { return handle(error, res, 'Failed to load comments.'); }
};

exports.listReplies = async (req, res) => {
  try {
    await context(req);
    const result = await commentWorkflow.replies({ resourceKey: req.params.announcementId, rootCommentId: req.params.commentId, page: req.query.page });
    return res.json({ success: true, ...result });
  } catch (error) { return handle(error, res, 'Failed to load replies.'); }
};

exports.createComment = async (req, res) => {
  try {
    const { user, group } = await context(req);
    if (!isGroupMember(user, group)) throw new GroupCommunityError('Join this group before joining the discussion.', 403);
    const comment = await commentWorkflow.create({ resourceKey: req.params.announcementId, actor: actor(user), content: req.body.content, replyToCommentId: req.body.replyToCommentId });
    return res.status(201).json({ success: true, comment });
  } catch (error) { return handle(error, res, 'Failed to post comment.'); }
};

exports.editComment = async (req, res) => {
  try {
    const { user } = await context(req);
    const comment = await commentWorkflow.edit({ resourceKey: req.params.announcementId, commentId: req.params.commentId, actor: actor(user), content: req.body.content, expectedVersion: req.body.expectedVersion || req.body.expectedUpdatedAt });
    return res.json({ success: true, comment });
  } catch (error) { return handle(error, res, 'Failed to edit comment.'); }
};

exports.deleteComment = async (req, res) => {
  try {
    const { user } = await context(req);
    const result = await commentWorkflow.remove({ resourceKey: req.params.announcementId, commentId: req.params.commentId, actor: actor(user) });
    return res.json({ success: true, ...result });
  } catch (error) { return handle(error, res, 'Failed to delete comment.'); }
};

exports.commentHistory = async (req, res) => {
  try {
    await context(req);
    const result = await commentWorkflow.history({ resourceKey: req.params.announcementId, commentId: req.params.commentId });
    return res.json({ success: true, ...result });
  } catch (error) { return handle(error, res, 'Failed to load comment history.'); }
};

exports.redactCommentRevision = async (req, res) => {
  try {
    const { user } = await context(req);
    const result = await commentWorkflow.redact({ resourceKey: req.params.announcementId, commentId: req.params.commentId, revisionId: req.params.revisionId, actor: actor(user) });
    return res.json({ success: true, ...result });
  } catch (error) { return handle(error, res, 'Failed to redact revision.'); }
};

exports.reportComment = async (req, res) => {
  try {
    const { user } = await context(req);
    await commentWorkflow.report({ resourceKey: req.params.announcementId, commentId: req.params.commentId, actor: actor(user), reason: req.body.reason, note: req.body.note });
    return res.status(201).json({ success: true, message: 'Report submitted.' });
  } catch (error) { return handle(error, res, 'Failed to report comment.'); }
};
