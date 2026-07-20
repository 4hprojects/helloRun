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
const { createRunningGroup, joinRunningGroup } = require('../src/services/running-group.service');
const {
  listAdminRunningGroups,
  getAdminRunningGroupDetail,
  updateRunningGroupMetadata,
  archiveRunningGroup,
  reactivateRunningGroup,
  removeRunningGroupMember,
  transferRunningGroupCreator,
  reconcileRunningGroupMemberCount
} = require('../src/services/admin-running-group.service');

const stamp = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
const createdUsers = [];
const createdGroups = [];

test.before(async () => { await mongoose.connect(process.env.MONGODB_URI); });
test.after(async () => {
  await Notification.deleteMany({ userId: { $in: createdUsers } });
  await RunningGroupActivity.deleteMany({ groupId: { $in: createdGroups } });
  await RunningGroup.deleteMany({ _id: { $in: createdGroups } });
  await User.deleteMany({ _id: { $in: createdUsers } });
  await mongoose.disconnect();
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
  const otherName = `Other ${stamp}`;
  const group = await groupFor(creator, 'Rename');
  legacy.runningGroups = [otherName, group.name];
  legacy.runningGroup = otherName;
  await legacy.save();
  const originalSlug = group.slug;
  const nextName = `Renamed ${stamp}`;
  await updateRunningGroupMetadata(group._id, { name: nextName, description: 'Updated description' });
  const [freshGroup, freshCreator, freshLegacy] = await Promise.all([
    RunningGroup.findById(group._id).lean(), User.findById(creator._id).lean(), User.findById(legacy._id).lean()
  ]);
  assert.equal(freshGroup.slug, originalSlug);
  assert.equal(freshGroup.name, nextName);
  assert.deepEqual(freshLegacy.runningGroups, [otherName, nextName]);
  assert.equal(freshLegacy.runningGroup, otherName);
  assert.equal(freshCreator.runningGroup, nextName);
});

test('member removal preserves unrelated memberships, logs a leave, and notifies runner', async () => {
  const creator = await runner('remove-creator');
  const member = await runner('remove-member');
  const group = await groupFor(creator, 'Remove');
  const otherName = `Legacy Other ${stamp}`;
  member.runningGroups = [group.name, otherName]; member.runningGroup = group.name; await member.save();
  await removeRunningGroupMember(group._id, member._id);
  const [fresh, activity, notice] = await Promise.all([
    User.findById(member._id).lean(),
    RunningGroupActivity.findOne({ groupId: group._id, actorUserId: member._id, type: 'left_group' }).lean(),
    Notification.findOne({ userId: member._id, type: 'running_group_member_removed' }).lean()
  ]);
  assert.deepEqual(fresh.runningGroups, [otherName]);
  assert.equal(fresh.runningGroup, otherName);
  assert.ok(activity);
  assert.ok(notice);
});

test('archive removes memberships and notifications while reactivation stays empty', async () => {
  const creator = await runner('archive-creator');
  const member = await runner('archive-member');
  const group = await groupFor(creator, 'Archive');
  await joinRunningGroup({ user: member, groupId: String(group._id) });
  const result = await archiveRunningGroup(group._id);
  assert.equal(result.removedMembers, 2);
  const archived = await RunningGroup.findById(group._id).lean();
  assert.equal(archived.isActive, false);
  assert.equal(archived.memberCount, 0);
  assert.equal((await User.findById(member._id).lean()).runningGroup, '');
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
  await transferRunningGroupCreator(group._id, nextCreator.email);
  const fresh = await RunningGroup.findById(group._id).lean();
  assert.equal(String(fresh.createdBy), String(nextCreator._id));
  assert.equal((await User.findById(nextCreator._id).lean()).runningGroup, '');
  await RunningGroup.updateOne({ _id: group._id }, { $set: { memberCount: 99 } });
  const reconciled = await reconcileRunningGroupMemberCount(group._id);
  assert.equal(reconciled.previousCount, 99);
  assert.equal(reconciled.actualCount, 1);
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
