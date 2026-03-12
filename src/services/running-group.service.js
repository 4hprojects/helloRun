const RunningGroup = require('../models/RunningGroup');
const RunningGroupActivity = require('../models/RunningGroupActivity');
const User = require('../models/User');

async function searchRunningGroups(query, options = {}) {
  const limit = clampInt(options.limit, 1, 20, 8);
  const trimmedQuery = String(query || '').trim().slice(0, 80);

  const filter = { isActive: true };
  if (trimmedQuery) {
    filter.$or = [
      { name: new RegExp(escapeRegex(trimmedQuery), 'i') },
      { slug: new RegExp(escapeRegex(trimmedQuery), 'i') }
    ];
  }

  return RunningGroup.find(filter)
    .sort({ memberCount: -1, updatedAt: -1 })
    .limit(limit)
    .select('name slug description memberCount')
    .lean();
}

async function getTopRunningGroups(limit = 8) {
  const safeLimit = clampInt(limit, 1, 20, 8);
  return RunningGroup.find({ isActive: true })
    .sort({ memberCount: -1, updatedAt: -1 })
    .limit(safeLimit)
    .select('name slug description memberCount')
    .lean();
}

async function getCurrentRunnerGroup(user) {
  const currentGroupNames = getUserGroupNames(user);
  if (!currentGroupNames.length) return null;
  return RunningGroup.findOne({
    normalizedName: normalizeGroupName(currentGroupNames[0]),
    isActive: true
  })
    .select('name slug description memberCount')
    .lean();
}

async function getCurrentRunnerGroups(user) {
  const groupNames = getUserGroupNames(user);
  if (!groupNames.length) return [];
  const normalizedNames = groupNames.map((name) => normalizeGroupName(name)).filter(Boolean);
  if (!normalizedNames.length) return [];
  const groups = await RunningGroup.find({
    normalizedName: { $in: normalizedNames },
    isActive: true
  })
    .select('name slug description memberCount')
    .lean();
  const byNormalizedName = new Map(groups.map((item) => [normalizeGroupName(item.name), item]));
  return normalizedNames.map((name) => byNormalizedName.get(name)).filter(Boolean);
}

async function getRunningGroupBySlug(slug) {
  const safeSlug = String(slug || '').trim().toLowerCase();
  if (!safeSlug) return null;
  return RunningGroup.findOne({ slug: safeSlug, isActive: true })
    .select('name slug description memberCount createdBy updatedAt')
    .lean();
}

async function getRunningGroupActivity(groupId, limit = 12) {
  const safeLimit = clampInt(limit, 1, 30, 12);
  const safeGroupId = String(groupId || '').trim();
  if (!safeGroupId) return [];

  return RunningGroupActivity.find({ groupId: safeGroupId })
    .sort({ createdAt: -1 })
    .limit(safeLimit)
    .select('type actorName message createdAt')
    .lean();
}

async function getRecentRunnerGroupActivity(user, limit = 4) {
  const currentGroups = await getCurrentRunnerGroups(user);
  if (!currentGroups.length) {
    return [];
  }
  const safeLimit = clampInt(limit, 1, 20, 4);
  const groupIds = currentGroups.map((item) => item._id).filter(Boolean);
  if (!groupIds.length) return [];
  const activity = await RunningGroupActivity.find({ groupId: { $in: groupIds } })
    .sort({ createdAt: -1 })
    .limit(safeLimit)
    .select('groupId type actorName message createdAt')
    .lean();
  const groupsById = new Map(currentGroups.map((item) => [String(item._id), item]));
  return activity.map((item) => ({
    type: 'group_activity',
    at: item.createdAt || null,
    groupName: groupsById.get(String(item.groupId))?.name || '',
    message: item.message || '',
    actorName: item.actorName || ''
  }));
}

async function createRunningGroup({ user, name, description }) {
  const cleanName = sanitizeGroupName(name);
  validateGroupName(cleanName);
  const cleanDescription = sanitizeGroupDescription(description);
  const normalizedName = normalizeGroupName(cleanName);

  const existing = await RunningGroup.findOne({ normalizedName }).select('_id name').lean();
  if (existing) {
    throw new Error('A running group with that name already exists.');
  }

  const slug = await generateUniqueSlug(cleanName);
  const group = await RunningGroup.create({
    name: cleanName,
    normalizedName,
    slug,
    description: cleanDescription,
    createdBy: user._id,
    memberCount: 1,
    isActive: true
  });

  await addUserGroupMembership(user._id, group.name);
  await logRunningGroupActivity({
    groupId: group._id,
    actorUserId: user._id,
    actorName: getActorName(user),
    type: 'group_created',
    message: `${getActorName(user)} created ${group.name}.`
  });

  return group;
}

async function joinRunningGroup({ user, groupId }) {
  const safeGroupId = String(groupId || '').trim();
  if (!safeGroupId) {
    throw new Error('Select a running group to join.');
  }
  if (!user?._id) {
    throw new Error('Runner account is required.');
  }

  const currentUser = await User.findById(user._id);
  if (!currentUser) {
    throw new Error('Runner account not found.');
  }

  const group = await RunningGroup.findOne({ _id: safeGroupId, isActive: true });
  if (!group) {
    throw new Error('Running group not found.');
  }

  const currentGroupNames = getUserGroupNames(currentUser);
  const nextGroupName = String(group.name || '').trim();
  if (currentGroupNames.some((name) => normalizeGroupName(name) === normalizeGroupName(nextGroupName))) {
    return { group, alreadyMember: true };
  }
  const previousGroupNames = currentGroupNames.filter(
    (name) => normalizeGroupName(name) !== normalizeGroupName(nextGroupName)
  );
  await setUserGroupMemberships(currentUser, [nextGroupName]);
  for (const previousName of previousGroupNames) {
    // Keep member counts accurate when switching groups.
    // eslint-disable-next-line no-await-in-loop
    await recalculateMemberCountByName(previousName);
  }
  await recalculateMemberCountByName(nextGroupName);
  await logRunningGroupActivity({
    groupId: group._id,
    actorUserId: currentUser._id,
    actorName: getActorName(currentUser),
    type: 'joined_group',
    message: `${getActorName(currentUser)} joined ${nextGroupName}.`
  });

  return { group, alreadyMember: false };
}

async function leaveRunningGroup({ user, groupId }) {
  if (!user?._id) {
    throw new Error('Runner account is required.');
  }

  const currentUser = await User.findById(user._id);
  if (!currentUser) {
    throw new Error('Runner account not found.');
  }

  const safeGroupId = String(groupId || '').trim();
  const currentGroupNames = getUserGroupNames(currentUser);
  if (!currentGroupNames.length) {
    return { hadGroup: false };
  }

  if (safeGroupId) {
    const targetGroup = await RunningGroup.findOne({ _id: safeGroupId, isActive: true }).select('_id name').lean();
    if (!targetGroup?.name) {
      throw new Error('Running group not found.');
    }
    const targetNormalized = normalizeGroupName(targetGroup.name);
    const nextGroups = currentGroupNames.filter((name) => normalizeGroupName(name) !== targetNormalized);
    if (nextGroups.length === currentGroupNames.length) {
      return { hadGroup: false };
    }
    await setUserGroupMemberships(currentUser, nextGroups);
    await recalculateMemberCountByName(targetGroup.name);
    await logRunningGroupActivity({
      groupId: targetGroup._id,
      actorUserId: currentUser._id,
      actorName: getActorName(currentUser),
      type: 'left_group',
      message: `${getActorName(currentUser)} left ${targetGroup.name}.`
    });
    return { hadGroup: true };
  }

  await setUserGroupMemberships(currentUser, []);
  for (const groupName of currentGroupNames) {
    await recalculateMemberCountByName(groupName);
    const previousGroup = await RunningGroup.findOne({
      normalizedName: normalizeGroupName(groupName),
      isActive: true
    })
      .select('_id name')
      .lean();
    if (previousGroup?._id) {
      await logRunningGroupActivity({
        groupId: previousGroup._id,
        actorUserId: currentUser._id,
        actorName: getActorName(currentUser),
        type: 'left_group',
        message: `${getActorName(currentUser)} left ${previousGroup.name}.`
      });
    }
  }

  return { hadGroup: true };
}

async function recalculateMemberCountByName(groupName) {
  const normalizedName = normalizeGroupName(groupName);
  if (!normalizedName) return;

  const group = await RunningGroup.findOne({ normalizedName, isActive: true });
  if (!group) return;

  const memberCount = await User.countDocuments({
    $or: [
      { runningGroups: group.name },
      { runningGroup: new RegExp(`^${escapeRegex(group.name)}$`, 'i') }
    ]
  });
  group.memberCount = memberCount;
  await group.save();
}

function getUserGroupNames(user) {
  if (Array.isArray(user?.runningGroups) && user.runningGroups.length) {
    return sanitizeGroupNames(user.runningGroups);
  }
  const legacy = String(user?.runningGroup || '').trim();
  return legacy ? [legacy] : [];
}

function sanitizeGroupNames(values = []) {
  return Array.from(
    new Set(
      (values || [])
        .map((item) => sanitizeGroupName(item))
        .filter(Boolean)
    )
  ).slice(0, 10);
}

async function setUserGroupMemberships(userDoc, groupNames = []) {
  const sanitized = sanitizeGroupNames(groupNames);
  userDoc.runningGroups = sanitized;
  userDoc.runningGroup = sanitized[0] || '';
  await userDoc.save();
}

async function addUserGroupMembership(userId, groupName) {
  const userDoc = await User.findById(userId);
  if (!userDoc) {
    throw new Error('Runner account not found.');
  }
  const existing = getUserGroupNames(userDoc);
  if (!existing.some((name) => normalizeGroupName(name) === normalizeGroupName(groupName))) {
    existing.push(String(groupName || '').trim());
  }
  await setUserGroupMemberships(userDoc, existing);
}

async function generateUniqueSlug(name) {
  const baseSlug = toSlug(name);
  if (!baseSlug) {
    throw new Error('Unable to generate running group slug.');
  }

  let candidate = baseSlug;
  let suffix = 2;
  while (true) {
    // eslint-disable-next-line no-await-in-loop
    const exists = await RunningGroup.exists({ slug: candidate });
    if (!exists) return candidate;
    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
}

function toSlug(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 140);
}

function sanitizeGroupName(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
}

function sanitizeGroupDescription(value) {
  return String(value || '')
    .trim()
    .slice(0, 400);
}

function validateGroupName(value) {
  if (!value || value.length < 2) {
    throw new Error('Running group name must be at least 2 characters.');
  }
}

function normalizeGroupName(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .slice(0, 120);
}

function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function clampInt(value, min, max, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function getActorName(user) {
  const first = String(user?.firstName || '').trim();
  const last = String(user?.lastName || '').trim();
  const fullName = `${first} ${last}`.trim();
  if (fullName) return fullName.slice(0, 140);
  const email = String(user?.email || '').trim();
  if (email) return email.slice(0, 140);
  return 'Runner';
}

async function logRunningGroupActivity({ groupId, actorUserId, actorName, type, message }) {
  if (!groupId || !actorUserId || !type || !message) return;
  await RunningGroupActivity.create({
    groupId,
    actorUserId,
    actorName: String(actorName || 'Runner').slice(0, 140),
    type,
    message: String(message || '').slice(0, 220)
  });
}

module.exports = {
  searchRunningGroups,
  getTopRunningGroups,
  getCurrentRunnerGroup,
  getCurrentRunnerGroups,
  getRunningGroupBySlug,
  getRunningGroupActivity,
  getRecentRunnerGroupActivity,
  createRunningGroup,
  joinRunningGroup,
  leaveRunningGroup
};
