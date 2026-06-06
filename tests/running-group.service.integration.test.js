const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../src/models/User');
const RunningGroup = require('../src/models/RunningGroup');
const {
  searchRunningGroups,
  getTopRunningGroups,
  getCurrentRunnerGroup,
  getRunningGroupBySlug,
  getRunningGroupActivity,
  getRecentRunnerGroupActivity,
  createRunningGroup,
  joinRunningGroup,
  leaveRunningGroup
} = require('../src/services/running-group.service');

test.before(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
});

test.after(async () => {
  await mongoose.disconnect();
});

test('createRunningGroup creates group and auto-joins creator', async () => {
  const user = await createRunner('create');
  const groupName = uniqueGroupName('create');
  const group = await createRunningGroup({
    user,
    name: groupName,
    description: 'First test running group'
  });

  const freshUser = await User.findById(user._id).lean();
  const storedGroup = await RunningGroup.findById(group._id).lean();

  assert.equal(freshUser.runningGroup, groupName);
  assert.equal(storedGroup.name, groupName);
  assert.equal(storedGroup.memberCount, 1);
  assert.ok(storedGroup.slug && storedGroup.slug.length > 0);

  const activity = await getRunningGroupActivity(group._id, 5);
  assert.ok(activity.length >= 1);
  assert.equal(activity[0].type, 'group_created');
});

test('createRunningGroup blocks duplicate names case-insensitively', async () => {
  const userA = await createRunner('dup-a');
  const userB = await createRunner('dup-b');
  const groupName = uniqueGroupName('duplicate');

  await createRunningGroup({
    user: userA,
    name: groupName,
    description: ''
  });

  await assert.rejects(
    () =>
      createRunningGroup({
        user: userB,
        name: groupName.toUpperCase(),
        description: ''
      }),
    /already exists/i
  );
});

test('joinRunningGroup changes membership and updates member counts', async () => {
  const creatorA = await createRunner('join-a');
  const creatorB = await createRunner('join-b');
  const joiner = await createRunner('join-c');

  const groupA = await createRunningGroup({
    user: creatorA,
    name: uniqueGroupName('group-a'),
    description: ''
  });
  const groupB = await createRunningGroup({
    user: creatorB,
    name: uniqueGroupName('group-b'),
    description: ''
  });

  await joinRunningGroup({ user: joiner, groupId: String(groupA._id) });
  let freshGroupA = await RunningGroup.findById(groupA._id).lean();
  assert.equal(freshGroupA.memberCount, 2);

  await joinRunningGroup({ user: joiner, groupId: String(groupB._id) });
  freshGroupA = await RunningGroup.findById(groupA._id).lean();
  const freshGroupB = await RunningGroup.findById(groupB._id).lean();
  const freshJoiner = await User.findById(joiner._id).lean();

  assert.equal(freshJoiner.runningGroup, groupB.name);
  assert.equal(freshGroupA.memberCount, 1);
  assert.equal(freshGroupB.memberCount, 2);
});

test('leaveRunningGroup clears runner group and updates member count', async () => {
  const creator = await createRunner('leave-a');
  const member = await createRunner('leave-b');

  const group = await createRunningGroup({
    user: creator,
    name: uniqueGroupName('leave-group'),
    description: ''
  });
  await joinRunningGroup({ user: member, groupId: String(group._id) });

  await leaveRunningGroup({ user: member });

  const freshMember = await User.findById(member._id).lean();
  const freshGroup = await RunningGroup.findById(group._id).lean();
  assert.equal(freshMember.runningGroup, '');
  assert.equal(freshGroup.memberCount, 1);
});

test('search/top/current running group queries return expected data', async () => {
  const creatorSunrise = await createRunner('search-a');
  const creatorSunset = await createRunner('search-b');
  const creatorNight = await createRunner('search-c');

  const sunrise = await createRunningGroup({
    user: creatorSunrise,
    name: uniqueGroupName('Sunrise Pacers'),
    description: ''
  });
  await createRunningGroup({
    user: creatorSunset,
    name: uniqueGroupName('Sunset Cruisers'),
    description: ''
  });
  await createRunningGroup({
    user: creatorNight,
    name: uniqueGroupName('Night Striders'),
    description: ''
  });

  const searchResults = await searchRunningGroups('sun', { limit: 10 });
  assert.ok(searchResults.length >= 2);
  assert.ok(searchResults.some((item) => item.name.toLowerCase().includes('sunrise')));
  assert.ok(searchResults.some((item) => item.name.toLowerCase().includes('sunset')));

  const topGroups = await getTopRunningGroups(5);
  assert.ok(topGroups.length >= 3);

  const current = await getCurrentRunnerGroup(await User.findById(creatorSunrise._id));
  assert.equal(current.name, sunrise.name);

  const bySlug = await getRunningGroupBySlug(sunrise.slug);
  assert.equal(bySlug.name, sunrise.name);

  const recentActivity = await getRecentRunnerGroupActivity(await User.findById(creatorSunrise._id), 4);
  assert.ok(Array.isArray(recentActivity));
});

async function createRunner(tag) {
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const email = `phase4.rgtest.${tag}.${stamp}@example.com`;
  const passwordHash = await bcrypt.hash('Pass1234', 10);
  return User.create({
    userId: `URG${stamp}`.slice(0, 22),
    email,
    passwordHash,
    role: 'runner',
    firstName: 'RG',
    lastName: 'Tester',
    emailVerified: true,
    mobile: '09170000000',
    country: 'PH',
    gender: 'male',
    emergencyContactName: 'RG Emergency',
    emergencyContactNumber: '09171111111'
  });
}

function uniqueGroupName(seed) {
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  return `RGT ${seed} ${stamp}`.slice(0, 120);
}
