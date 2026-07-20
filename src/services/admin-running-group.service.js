'use strict';

const mongoose = require('mongoose');
const RunningGroup = require('../models/RunningGroup');
const RunningGroupActivity = require('../models/RunningGroupActivity');
const RunningGroupAnnouncement = require('../models/RunningGroupAnnouncement');
const RunningGroupComment = require('../models/RunningGroupComment');
const RunningGroupCommunityReport = require('../models/RunningGroupCommunityReport');
const Notification = require('../models/Notification');
const {
  cleanRunningGroupName,
  normalizeRunningGroupKey,
  normalizeRunningGroupMemberships
} = require('../utils/running-group-memberships');
const User = require('../models/User');
const { createNotificationSafe } = require('./notification.service');

const PAGE_SIZE_OPTIONS = [25, 50, 100];
const SORTS = new Set(['members', 'newest', 'oldest', 'name']);
const STATUSES = new Set(['all', 'active', 'archived']);
const MAX_BULK_DELETE_GROUPS = 100;

function normalizeAdminRunningGroupFilters(query = {}) {
  const perPage = PAGE_SIZE_OPTIONS.includes(Number(query.perPage)) ? Number(query.perPage) : 25;
  const status = STATUSES.has(String(query.status || 'active')) ? String(query.status || 'active') : 'active';
  const sort = SORTS.has(String(query.sort || 'members')) ? String(query.sort || 'members') : 'members';
  return {
    q: String(query.q || '').trim().slice(0, 120),
    status,
    sort,
    page: clampInt(query.page, 1, 100000, 1),
    perPage
  };
}

async function listAdminRunningGroups(rawFilters = {}) {
  const filters = normalizeAdminRunningGroupFilters(rawFilters);
  const query = {};
  if (filters.status === 'active') query.isActive = true;
  if (filters.status === 'archived') query.isActive = false;

  if (filters.q) {
    const pattern = new RegExp(escapeRegex(filters.q), 'i');
    const creatorMatches = await User.find({
      $or: [{ email: pattern }, { firstName: pattern }, { lastName: pattern }, { userId: pattern }]
    }).select('_id').limit(100).lean();
    query.$or = [
      { name: pattern },
      { slug: pattern },
      { description: pattern },
      { createdBy: { $in: creatorMatches.map((item) => item._id) } }
    ];
  }

  const sort = {
    members: { memberCount: -1, updatedAt: -1 },
    newest: { createdAt: -1, _id: -1 },
    oldest: { createdAt: 1, _id: 1 },
    name: { normalizedName: 1, _id: 1 }
  }[filters.sort];
  const total = await RunningGroup.countDocuments(query);
  const totalPages = Math.max(1, Math.ceil(total / filters.perPage));
  filters.page = Math.min(filters.page, totalPages);
  const groups = await RunningGroup.find(query)
    .populate('createdBy', 'userId firstName lastName email accountStatus')
    .sort(sort)
    .skip((filters.page - 1) * filters.perPage)
    .limit(filters.perPage)
    .lean();
  const [statusCounts, cachedMemberships] = await Promise.all([
    RunningGroup.aggregate([{ $group: { _id: '$isActive', count: { $sum: 1 } } }]),
    RunningGroup.aggregate([{ $match: { isActive: true } }, { $group: { _id: null, count: { $sum: '$memberCount' } } }])
  ]);
  const countMap = new Map(statusCounts.map((item) => [String(item._id), Number(item.count || 0)]));

  return {
    filters,
    groups,
    pagination: { page: filters.page, perPage: filters.perPage, total, totalPages },
    counts: {
      active: countMap.get('true') || 0,
      archived: countMap.get('false') || 0,
      total: (countMap.get('true') || 0) + (countMap.get('false') || 0),
      cachedMemberships: Number(cachedMemberships[0]?.count || 0)
    }
  };
}

async function getAdminRunningGroupDetail(groupId, memberQuery = {}) {
  assertObjectId(groupId, 'Running group not found.');
  const group = await RunningGroup.findById(groupId)
    .populate('createdBy', 'userId firstName lastName email accountStatus')
    .lean();
  if (!group) return null;

  const memberFilters = {
    q: String(memberQuery.q || '').trim().slice(0, 120),
    page: clampInt(memberQuery.memberPage, 1, 100000, 1),
    perPage: 25
  };
  const membershipQuery = buildMembershipQuery(group.name);
  const query = memberFilters.q
    ? { $and: [membershipQuery, buildUserSearchQuery(memberFilters.q)] }
    : membershipQuery;
  const totalMembers = await User.countDocuments(query);
  const totalPages = Math.max(1, Math.ceil(totalMembers / memberFilters.perPage));
  memberFilters.page = Math.min(memberFilters.page, totalPages);
  const [members, activity, communityAnnouncements, communityComments, communityReports] = await Promise.all([
    User.find(query)
      .select('userId firstName lastName email role accountStatus runningGroup runningGroups createdAt')
      .sort({ firstName: 1, lastName: 1, email: 1 })
      .skip((memberFilters.page - 1) * memberFilters.perPage)
      .limit(memberFilters.perPage)
      .lean(),
    RunningGroupActivity.find({ groupId: group._id })
      .sort({ createdAt: -1, _id: -1 })
      .limit(50)
      .select('type actorName message createdAt')
      .lean(),
    RunningGroupAnnouncement.find({ groupId: group._id })
      .sort({ createdAt: -1, _id: -1 }).limit(20)
      .populate('authorId', 'userId firstName lastName email')
      .select('authorId content commentsCount status isDeleted moderationNote createdAt updatedAt')
      .lean(),
    RunningGroupComment.find({ announcementId: { $in: await RunningGroupAnnouncement.distinct('_id', { groupId: group._id }) } })
      .sort({ createdAt: -1, _id: -1 }).limit(30)
      .populate('authorId', 'userId firstName lastName email')
      .select('announcementId authorId content status isDeleted moderationNote createdAt updatedAt')
      .lean(),
    RunningGroupCommunityReport.find({ groupId: group._id, status: 'open' })
      .sort({ createdAt: -1, _id: -1 }).limit(30)
      .populate('reporterId', 'userId firstName lastName email')
      .select('targetType announcementId commentId reporterId reason note contentSnapshot createdAt')
      .lean()
  ]);

  return {
    group,
    members,
    activity,
    communityAnnouncements,
    communityComments,
    communityReports,
    memberFilters,
    memberPagination: { page: memberFilters.page, total: totalMembers, totalPages },
    actualMemberCount: await countMembersByName(group.name)
  };
}

async function moderateRunningGroupContent({ groupId, targetType, targetId, action, adminId, moderationNote = '' }) {
  const group = await requireGroup(groupId);
  assertObjectId(targetId, 'Community content not found.');
  const Model = targetType === 'comment' ? RunningGroupComment : RunningGroupAnnouncement;
  const record = await Model.findById(targetId);
  if (!record) throw new Error('Community content not found.');
  const announcement = targetType === 'comment'
    ? await RunningGroupAnnouncement.findOne({ _id: record.announcementId, groupId: group._id })
    : record;
  if (!announcement || String(announcement.groupId) !== String(group._id)) throw new Error('Community content not found.');
  if (action === 'remove') {
    if (record.isDeleted) throw new Error('Community content is already removed.');
    record.status = 'removed'; record.isDeleted = true; record.deletedAt = new Date(); record.deletedBy = adminId;
    record.moderationNote = String(moderationNote || '').trim().slice(0, 500);
    await record.save();
    if (targetType === 'comment') await RunningGroupAnnouncement.updateOne({ _id: announcement._id, commentsCount: { $gt: 0 } }, { $inc: { commentsCount: -1 } });
  } else {
    if (!record.isDeleted) throw new Error('Community content is already active.');
    record.status = 'active'; record.isDeleted = false; record.deletedAt = null; record.deletedBy = null; record.moderationNote = '';
    await record.save();
    if (targetType === 'comment') await RunningGroupAnnouncement.updateOne({ _id: announcement._id }, { $inc: { commentsCount: 1 } });
  }
  return { group, record };
}

async function resolveRunningGroupCommunityReport({ groupId, reportId, status, adminId, resolutionNote = '' }) {
  await requireGroup(groupId);
  assertObjectId(reportId, 'Community report not found.');
  if (!['resolved', 'dismissed'].includes(status)) throw new Error('Invalid report status.');
  const report = await RunningGroupCommunityReport.findOne({ _id: reportId, groupId, status: 'open' });
  if (!report) throw new Error('Community report not found.');
  report.status = status; report.resolvedAt = new Date(); report.resolvedBy = adminId;
  report.resolutionNote = String(resolutionNote || '').trim().slice(0, 500);
  await report.save();
  return report;
}

async function updateRunningGroupMetadata(groupId, input = {}) {
  const group = await requireGroup(groupId);
  const rawName = String(input.name || '').replace(/\s+/g, ' ').trim();
  const rawDescription = String(input.description || '').trim();
  if (rawName.length > 120) throw new Error('Running group name must be 120 characters or less.');
  if (rawDescription.length > 400) throw new Error('Running group description must be 400 characters or less.');
  const name = sanitizeName(rawName);
  const description = rawDescription;
  if (name.length < 2) throw new Error('Running group name must be at least 2 characters.');
  const normalizedName = normalizeName(name);
  const duplicate = await RunningGroup.exists({ normalizedName, _id: { $ne: group._id } });
  if (duplicate) throw new Error('A running group with that name already exists.');

  const previousName = group.name;
  if (normalizeName(previousName) !== normalizedName || previousName !== name) {
    const members = await findMemberDocuments(previousName);
    await applyMembershipTransforms(members, (names) => names.map((item) => (
      normalizeName(item) === normalizeName(previousName) ? name : item
    )));
    group.name = name;
    group.normalizedName = normalizedName;
  }
  group.description = description;
  group.memberCount = await countMembersByName(name);
  await group.save();
  return { group, previousName };
}

async function archiveRunningGroup(groupId) {
  const group = await requireGroup(groupId);
  const wasActive = group.isActive;
  // Hide the group before membership cleanup so no new join can race the archive.
  group.isActive = false;
  await group.save();
  const members = await findMemberDocuments(group.name);
  await applyMembershipTransforms(members, (names) => names.filter(
    (item) => normalizeName(item) !== normalizeName(group.name)
  ));
  group.memberCount = 0;
  await group.save();
  await Promise.all(members.map((member) => createNotificationSafe({
    userId: member._id,
    type: 'running_group_archived',
    title: 'Running group archived',
    message: `${group.name} was archived by HelloRun and removed from your joined groups.`,
    href: '/runner/groups',
    dedupeKey: `running-group-archived:${group._id}:${member._id}:${Date.now()}`
  }, 'running group archive notification')));
  return { group, removedMembers: members.length, wasActive };
}

async function reactivateRunningGroup(groupId) {
  const group = await requireGroup(groupId);
  if (group.isActive) throw new Error('This running group is already active.');
  group.isActive = true;
  group.memberCount = await countMembersByName(group.name);
  await group.save();
  return group;
}

async function removeRunningGroupMember(groupId, userId) {
  const group = await requireGroup(groupId);
  assertObjectId(userId, 'Runner account not found.');
  const member = await User.findById(userId);
  if (!member) throw new Error('Runner account not found.');
  const names = getUserGroupNames(member);
  if (!names.some((item) => normalizeName(item) === normalizeName(group.name))) {
    throw new Error('This runner is not a member of the selected group.');
  }
  const remaining = names.filter((item) => normalizeName(item) !== normalizeName(group.name));
  member.runningGroups = remaining;
  member.runningGroup = remaining[0] || '';
  await member.save();
  group.memberCount = await countMembersByName(group.name);
  await group.save();
  const actorName = displayName(member);
  await RunningGroupActivity.create({
    groupId: group._id,
    actorUserId: member._id,
    actorName,
    type: 'left_group',
    message: `${actorName} left ${group.name}.`
  });
  await createNotificationSafe({
    userId: member._id,
    type: 'running_group_member_removed',
    title: 'Running group membership updated',
    message: `An administrator removed you from ${group.name}.`,
    href: '/runner/groups',
    dedupeKey: `running-group-member-removed:${group._id}:${member._id}:${Date.now()}`
  }, 'running group member removal notification');
  return { group, member };
}

async function transferRunningGroupCreator(groupId, identifier) {
  const group = await requireGroup(groupId);
  const cleanIdentifier = String(identifier || '').trim();
  if (!cleanIdentifier) throw new Error('Enter an active runner ID or email address.');
  if (cleanIdentifier.length > 200) throw new Error('Creator identifier must be 200 characters or less.');
  const identifierQuery = cleanIdentifier.includes('@')
    ? { email: cleanIdentifier.toLowerCase() }
    : { userId: cleanIdentifier.toUpperCase() };
  const nextCreator = await User.findOne({ ...identifierQuery, accountStatus: 'active' });
  if (!nextCreator) throw new Error('No active user matches that runner ID or email address.');
  const previousCreatorId = String(group.createdBy || '');
  group.createdBy = nextCreator._id;
  await group.save();
  if (previousCreatorId !== String(nextCreator._id)) {
    await createNotificationSafe({
      userId: nextCreator._id,
      type: 'running_group_creator_transferred',
      title: 'Running group creator attribution updated',
      message: `You are now listed as the creator of ${group.name}. This does not change your membership.`,
      href: group.isActive ? `/runner/groups/${group.slug}` : '/runner/groups',
      dedupeKey: `running-group-creator:${group._id}:${nextCreator._id}:${Date.now()}`
    }, 'running group creator transfer notification');
  }
  return { group, nextCreator, previousCreatorId };
}

async function reconcileRunningGroupMemberCount(groupId) {
  const group = await requireGroup(groupId);
  const previousCount = Number(group.memberCount || 0);
  if (!group.isActive) {
    const staleMembers = await findMemberDocuments(group.name);
    await applyMembershipTransforms(staleMembers, (names) => names.filter(
      (item) => normalizeName(item) !== normalizeName(group.name)
    ));
  }
  const actualCount = group.isActive ? await countMembersByName(group.name) : 0;
  group.memberCount = actualCount;
  await group.save();
  return { group, previousCount, actualCount };
}

function normalizeRunningGroupDeleteIds(values) {
  const raw = [].concat(values || []).flatMap((value) => String(value || '').split(','))
    .map((value) => value.trim()).filter(Boolean);
  if (!raw.length) throw deleteValidationError('Select at least one running group to delete.');
  if (raw.length > MAX_BULK_DELETE_GROUPS) throw deleteValidationError(`Select no more than ${MAX_BULK_DELETE_GROUPS} running groups at once.`);
  if (raw.some((value) => !mongoose.Types.ObjectId.isValid(value))) throw deleteValidationError('One or more selected running groups are invalid.');
  const unique = [...new Set(raw)];
  if (unique.length !== raw.length) throw deleteValidationError('Duplicate running-group selections are not allowed.');
  return unique;
}

async function deleteRunningGroups(groupIds) {
  const ids = normalizeRunningGroupDeleteIds(groupIds);
  const groups = await RunningGroup.find({ _id: { $in: ids } }).sort({ _id: 1 }).lean();
  if (groups.length !== ids.length) throw deleteValidationError('One or more selected running groups no longer exist. Refresh and try again.', 404);

  // Stop new joins before removing memberships and dependent records. Each
  // group record is removed last, making an interrupted deletion safe to retry.
  await RunningGroup.updateMany({ _id: { $in: ids } }, { $set: { isActive: false } });
  const results = [];
  for (const group of groups) {
    // eslint-disable-next-line no-await-in-loop
    const members = await findMemberDocuments(group.name);
    // eslint-disable-next-line no-await-in-loop
    await applyMembershipTransforms(members, (names) => names.filter(
      (item) => normalizeName(item) !== normalizeName(group.name)
    ));
    // eslint-disable-next-line no-await-in-loop
    const announcementIds = await RunningGroupAnnouncement.distinct('_id', { groupId: group._id });
    // eslint-disable-next-line no-await-in-loop
    const [announcementCount, commentCount, reportCount, activityCount] = await Promise.all([
      RunningGroupAnnouncement.countDocuments({ groupId: group._id }),
      RunningGroupComment.countDocuments({ announcementId: { $in: announcementIds } }),
      RunningGroupCommunityReport.countDocuments({ groupId: group._id }),
      RunningGroupActivity.countDocuments({ groupId: group._id })
    ]);
    const groupId = String(group._id);
    const groupNotificationPattern = new RegExp(`^running-group-(?:archived|member-removed|creator):${escapeRegex(groupId)}:`);
    // eslint-disable-next-line no-await-in-loop
    await Promise.all([
      RunningGroupComment.deleteMany({ announcementId: { $in: announcementIds } }),
      RunningGroupCommunityReport.deleteMany({ groupId: group._id }),
      RunningGroupAnnouncement.deleteMany({ groupId: group._id }),
      RunningGroupActivity.deleteMany({ groupId: group._id }),
      Notification.deleteMany({
        $or: [
          { 'metadata.groupId': groupId },
          { dedupeKey: groupNotificationPattern }
        ]
      })
    ]);
    // eslint-disable-next-line no-await-in-loop
    await RunningGroup.deleteOne({ _id: group._id });
    for (let index = 0; index < members.length; index += 100) {
      // eslint-disable-next-line no-await-in-loop
      await Promise.all(members.slice(index, index + 100).map((member) => createNotificationSafe({
        userId: member._id,
        type: 'running_group_deleted',
        title: 'Running group removed',
        message: `${group.name} was permanently removed by HelloRun and is no longer in your joined groups.`,
        href: '/runner/groups',
        dedupeKey: `running-group-deleted:${groupId}:${member._id}`,
        metadata: { deletedGroupId: groupId }
      }, 'running group deletion notification')));
    }
    results.push({
      id: groupId,
      name: group.name,
      slug: group.slug,
      previousStatus: group.isActive ? 'active' : 'archived',
      removedMembers: members.length,
      announcementCount,
      commentCount,
      reportCount,
      activityCount
    });
  }
  return results;
}

function deleteValidationError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function buildMembershipQuery(groupName) {
  const exact = new RegExp(`^${escapeRegex(String(groupName || '').trim())}$`, 'i');
  return { $or: [{ runningGroups: exact }, { runningGroup: exact }] };
}

function buildUserSearchQuery(value) {
  const pattern = new RegExp(escapeRegex(value), 'i');
  return { $or: [{ userId: pattern }, { email: pattern }, { firstName: pattern }, { lastName: pattern }] };
}

async function countMembersByName(groupName) {
  return User.countDocuments(buildMembershipQuery(groupName));
}

async function findMemberDocuments(groupName) {
  return User.find(buildMembershipQuery(groupName)).select('_id firstName lastName email runningGroup runningGroups').lean();
}

async function applyMembershipTransforms(members, transform) {
  const operations = members.map((member) => {
    const transformed = dedupeNames(transform(getUserGroupNames(member)));
    return {
      updateOne: {
        filter: { _id: member._id },
        update: { $set: { runningGroups: transformed, runningGroup: transformed[0] || '' } }
      }
    };
  });
  if (operations.length) await User.bulkWrite(operations, { ordered: true });
}

function getUserGroupNames(user) {
  const values = Array.isArray(user?.runningGroups) && user.runningGroups.length
    ? user.runningGroups
    : [user?.runningGroup];
  return dedupeNames(values);
}

function dedupeNames(values) {
  return normalizeRunningGroupMemberships(values);
}

async function requireGroup(groupId) {
  assertObjectId(groupId, 'Running group not found.');
  const group = await RunningGroup.findById(groupId);
  if (!group) throw new Error('Running group not found.');
  return group;
}

function assertObjectId(value, message) {
  if (!mongoose.Types.ObjectId.isValid(String(value || ''))) throw new Error(message);
}

function sanitizeName(value) {
  return cleanRunningGroupName(value).slice(0, 120);
}

function normalizeName(value) {
  return normalizeRunningGroupKey(value).slice(0, 120);
}

function displayName(user) {
  return `${String(user?.firstName || '').trim()} ${String(user?.lastName || '').trim()}`.trim()
    || String(user?.email || '').trim()
    || 'Runner';
}

function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function clampInt(value, min, max, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}

module.exports = {
  normalizeAdminRunningGroupFilters,
  listAdminRunningGroups,
  getAdminRunningGroupDetail,
  updateRunningGroupMetadata,
  archiveRunningGroup,
  reactivateRunningGroup,
  removeRunningGroupMember,
  transferRunningGroupCreator,
  reconcileRunningGroupMemberCount,
  normalizeRunningGroupDeleteIds,
  deleteRunningGroups,
  buildMembershipQuery,
  getUserGroupNames,
  moderateRunningGroupContent,
  resolveRunningGroupCommunityReport
};
