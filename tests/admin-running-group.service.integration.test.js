'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../src/models/User');
const RunningGroup = require('../src/models/RunningGroup');
const RunningGroupActivity = require('../src/models/RunningGroupActivity');
const Notification = require('../src/models/Notification');
const RunningGroupAnnouncement = require('../src/models/RunningGroupAnnouncement');
const RunningGroupComment = require('../src/models/RunningGroupComment');
const RunningGroupCommunityReport = require('../src/models/RunningGroupCommunityReport');
const { createRunningGroup, joinRunningGroup } = require('../src/services/running-group.service');
const {
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
  moderateRunningGroupContent,
  resolveRunningGroupCommunityReport
} = require('../src/services/admin-running-group.service');

const stamp = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
const createdUsers = [];
const createdGroups = [];

test.before(async () => { await mongoose.connect(process.env.MONGODB_URI); });
test.after(async () => {
  const announcementIds = await RunningGroupAnnouncement.find({ groupId: { $in: createdGroups } }).distinct('_id');
  await RunningGroupCommunityReport.deleteMany({ groupId: { $in: createdGroups } });
  await RunningGroupComment.deleteMany({ announcementId: { $in: announcementIds } });
  await RunningGroupAnnouncement.deleteMany({ groupId: { $in: createdGroups } });
  await Notification.deleteMany({ userId: { $in: createdUsers } });
  await RunningGroupActivity.deleteMany({ groupId: { $in: createdGroups } });
  await RunningGroup.deleteMany({ _id: { $in: createdGroups } });
  await User.deleteMany({ _id: { $in: createdUsers } });
  await mongoose.disconnect();
});

test('community moderation lists, removes, restores, and resolves group reports', async () => {
  const creator = await runner('community-admin');
  const group = await groupFor(creator, 'Community moderation');
  const announcement = await RunningGroupAnnouncement.create({ groupId: group._id, authorId: creator._id, content: 'Moderated announcement', commentsCount: 1 });
  const comment = await RunningGroupComment.create({ announcementId: announcement._id, authorId: creator._id, content: 'Moderated comment' });
  const report = await RunningGroupCommunityReport.create({
    targetType: 'comment', groupId: group._id, announcementId: announcement._id, commentId: comment._id,
    reporterId: creator._id, reason: 'other', contentSnapshot: comment.content, authorIdSnapshot: creator._id
  });
  const detail = await getAdminRunningGroupDetail(group._id);
  assert.ok(detail.communityAnnouncements.some((item) => String(item._id) === String(announcement._id)));
  assert.ok(detail.communityComments.some((item) => String(item._id) === String(comment._id)));
  assert.ok(detail.communityReports.some((item) => String(item._id) === String(report._id)));

  await moderateRunningGroupContent({ groupId: group._id, targetType: 'comment', targetId: comment._id, action: 'remove', adminId: creator._id, moderationNote: 'Test moderation reason' });
  assert.equal((await RunningGroupComment.findById(comment._id).lean()).isDeleted, true);
  assert.equal((await RunningGroupAnnouncement.findById(announcement._id).lean()).commentsCount, 0);
  await moderateRunningGroupContent({ groupId: group._id, targetType: 'comment', targetId: comment._id, action: 'restore', adminId: creator._id });
  assert.equal((await RunningGroupComment.findById(comment._id).lean()).isDeleted, false);
  assert.equal((await RunningGroupAnnouncement.findById(announcement._id).lean()).commentsCount, 1);

  await resolveRunningGroupCommunityReport({ groupId: group._id, reportId: report._id, status: 'resolved', adminId: creator._id, resolutionNote: 'Reviewed in test.' });
  assert.equal((await RunningGroupCommunityReport.findById(report._id).lean()).status, 'resolved');
});

test('admin list and detail support search, status, creator data, and actual counts', async () => {
  const creator = await runner('list-creator');
  const member = await runner('list-member');
  const group = await groupFor(creator, 'List Search');
  await joinRunningGroup({ user: member, groupId: String(group._id) });
  const list = await listAdminRunningGroups({ q: group.name, status: 'all', sort: 'name' });
  assert.ok(list.groups.some((item) => String(item._id) === String(group._id)));
  const detail = await getAdminRunningGroupDetail(group._id, { q: member.email });
  assert.equal(detail.actualMemberCount, 2);
  assert.equal(detail.members.length, 1);
  assert.equal(detail.members[0].email, member.email);
});

test('rename keeps slug stable and synchronizes current and legacy membership fields', async () => {
  const creator = await runner('rename-creator');
  const legacy = await runner('rename-legacy');
  const otherNames = Array.from({ length: 11 }, (_, index) => `Other ${index + 1} ${stamp}`);
  const group = await groupFor(creator, 'Rename');
  legacy.runningGroups = [...otherNames, group.name];
  legacy.runningGroup = otherNames[0];
  await legacy.save();
  const originalSlug = group.slug;
  const nextName = `Renamed ${stamp}`;
  await updateRunningGroupMetadata(group._id, { name: nextName, description: 'Updated description' });
  const [freshGroup, freshCreator, freshLegacy] = await Promise.all([
    RunningGroup.findById(group._id).lean(), User.findById(creator._id).lean(), User.findById(legacy._id).lean()
  ]);
  assert.equal(freshGroup.slug, originalSlug);
  assert.equal(freshGroup.name, nextName);
  assert.deepEqual(freshLegacy.runningGroups, [...otherNames, nextName]);
  assert.equal(freshLegacy.runningGroups.length, 12);
  assert.equal(freshLegacy.runningGroup, otherNames[0]);
  assert.equal(freshCreator.runningGroup, nextName);
});

test('member removal preserves unrelated memberships, logs a leave, and notifies runner', async () => {
  const creator = await runner('remove-creator');
  const member = await runner('remove-member');
  const group = await groupFor(creator, 'Remove');
  const otherNames = Array.from({ length: 11 }, (_, index) => `Legacy Other ${index + 1} ${stamp}`);
  member.runningGroups = [group.name, ...otherNames]; member.runningGroup = group.name; await member.save();
  await removeRunningGroupMember(group._id, member._id);
  const [fresh, activity, notice] = await Promise.all([
    User.findById(member._id).lean(),
    RunningGroupActivity.findOne({ groupId: group._id, actorUserId: member._id, type: 'left_group' }).lean(),
    Notification.findOne({ userId: member._id, type: 'running_group_member_removed' }).lean()
  ]);
  assert.deepEqual(fresh.runningGroups, otherNames);
  assert.equal(fresh.runningGroups.length, 11);
  assert.equal(fresh.runningGroup, otherNames[0]);
  assert.ok(activity);
  assert.ok(notice);
});

test('archive removes memberships and notifications while reactivation stays empty', async () => {
  const creator = await runner('archive-creator');
  const member = await runner('archive-member');
  const group = await groupFor(creator, 'Archive');
  const otherNames = Array.from({ length: 11 }, (_, index) => `Archive Other ${index + 1} ${stamp}`);
  member.runningGroups = [...otherNames, group.name];
  member.runningGroup = otherNames[0];
  await member.save();
  const result = await archiveRunningGroup(group._id);
  assert.equal(result.removedMembers, 2);
  const archived = await RunningGroup.findById(group._id).lean();
  assert.equal(archived.isActive, false);
  assert.equal(archived.memberCount, 0);
  const archivedMember = await User.findById(member._id).lean();
  assert.deepEqual(archivedMember.runningGroups, otherNames);
  assert.equal(archivedMember.runningGroup, otherNames[0]);
  assert.equal(await Notification.countDocuments({ userId: { $in: [creator._id, member._id] }, type: 'running_group_archived' }), 2);
  await reactivateRunningGroup(group._id);
  const reactivated = await RunningGroup.findById(group._id).lean();
  assert.equal(reactivated.isActive, true);
  assert.equal(reactivated.memberCount, 0);
});

test('creator transfer is attribution-only and reconciliation repairs stale count', async () => {
  const creator = await runner('transfer-creator');
  const nextCreator = await runner('transfer-next');
  const group = await groupFor(creator, 'Transfer');
  const otherNames = Array.from({ length: 11 }, (_, index) => `Reconcile Other ${index + 1} ${stamp}`);
  const creatorWithMembership = await User.findById(creator._id);
  creatorWithMembership.runningGroups = [group.name, ...otherNames];
  creatorWithMembership.runningGroup = group.name;
  await creatorWithMembership.save();
  await transferRunningGroupCreator(group._id, nextCreator.email);
  const fresh = await RunningGroup.findById(group._id).lean();
  assert.equal(String(fresh.createdBy), String(nextCreator._id));
  assert.equal((await User.findById(nextCreator._id).lean()).runningGroup, '');
  await RunningGroup.updateOne({ _id: group._id }, { $set: { memberCount: 99 } });
  const reconciled = await reconcileRunningGroupMemberCount(group._id);
  assert.equal(reconciled.previousCount, 99);
  assert.equal(reconciled.actualCount, 1);
  const reconciledCreator = await User.findById(creator._id).lean();
  assert.deepEqual(reconciledCreator.runningGroups, [group.name, ...otherNames]);
  assert.equal(reconciledCreator.runningGroups.length, 12);
});

test('bulk deletion validates selections and purges only selected group data', async () => {
  const creator = await runner('delete-creator');
  const member = await runner('delete-member');
  const target = await groupFor(creator, 'Delete target');
  const preserved = await groupFor(creator, 'Delete preserved');
  await joinRunningGroup({ user: member, groupId: String(target._id) });
  await joinRunningGroup({ user: member, groupId: String(preserved._id) });
  const announcement = await RunningGroupAnnouncement.create({ groupId: target._id, authorId: creator._id, content: 'Delete this announcement', commentsCount: 1 });
  const comment = await RunningGroupComment.create({ announcementId: announcement._id, authorId: member._id, content: 'Delete this comment' });
  await RunningGroupCommunityReport.create({
    targetType: 'comment', groupId: target._id, announcementId: announcement._id, commentId: comment._id,
    reporterId: creator._id, reason: 'other', contentSnapshot: comment.content, authorIdSnapshot: member._id
  });
  await Notification.create({
    userId: member._id, type: 'running_group_reply', title: 'Linked notice', message: 'Group-linked notice', href: `/runner/groups/${target.slug}`,
    dedupeKey: `group-reply:${comment._id}`, metadata: { groupId: String(target._id), announcementId: String(announcement._id) }
  });
  await Notification.create({ userId: member._id, type: 'profile', title: 'Keep notice', message: 'Unrelated notice', href: '/runner/profile', dedupeKey: `keep:${target._id}` });

  assert.throws(() => normalizeRunningGroupDeleteIds([]), /Select at least one/);
  assert.throws(() => normalizeRunningGroupDeleteIds(['invalid']), /invalid/);
  assert.throws(() => normalizeRunningGroupDeleteIds([String(target._id), String(target._id)]), /Duplicate/);
  assert.throws(() => normalizeRunningGroupDeleteIds(Array.from({ length: 101 }, () => new mongoose.Types.ObjectId().toString())), /no more than 100/);
  await assert.rejects(deleteRunningGroups([String(target._id), new mongoose.Types.ObjectId().toString()]), /no longer exist/);
  assert.ok(await RunningGroup.findById(target._id));

  const results = await deleteRunningGroups([String(target._id)]);
  assert.equal(results.length, 1);
  assert.equal(results[0].removedMembers, 2);
  const [freshCreator, freshMember] = await Promise.all([User.findById(creator._id).lean(), User.findById(member._id).lean()]);
  assert.deepEqual(freshCreator.runningGroups, [preserved.name]);
  assert.equal(freshCreator.runningGroup, preserved.name);
  assert.deepEqual(freshMember.runningGroups, [preserved.name]);
  assert.equal(freshMember.runningGroup, preserved.name);
  assert.equal(await RunningGroup.countDocuments({ _id: target._id }), 0);
  assert.equal(await RunningGroup.countDocuments({ _id: preserved._id }), 1);
  assert.equal(await RunningGroupAnnouncement.countDocuments({ groupId: target._id }), 0);
  assert.equal(await RunningGroupComment.countDocuments({ announcementId: announcement._id }), 0);
  assert.equal(await RunningGroupCommunityReport.countDocuments({ groupId: target._id }), 0);
  assert.equal(await RunningGroupActivity.countDocuments({ groupId: target._id }), 0);
  assert.equal(await Notification.countDocuments({ userId: member._id, type: 'running_group_reply' }), 0);
  assert.equal(await Notification.countDocuments({ userId: member._id, type: 'profile' }), 1);
  assert.equal(await Notification.countDocuments({ userId: { $in: [creator._id, member._id] }, type: 'running_group_deleted' }), 2);
});

async function runner(tag) {
  const email = `admin.rg.${tag}.${stamp}.${Math.floor(Math.random() * 10000)}@example.com`;
  const user = await User.create({
    userId: `ARG${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(0, 22), email,
    passwordHash: await bcrypt.hash('Pass1234', 4), role: 'runner', firstName: 'Admin', lastName: 'Group Test',
    emailVerified: true, accountStatus: 'active'
  });
  createdUsers.push(user._id); return user;
}

async function groupFor(creator, seed) {
  const group = await createRunningGroup({ user: creator, name: `${seed} ${stamp} ${Math.floor(Math.random() * 10000)}`, description: 'Admin management fixture' });
  createdGroups.push(group._id); return group;
}
