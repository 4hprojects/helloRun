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
  const currentGroupName = String(user?.runningGroup || '').trim();
  if (!currentGroupName) return null;
  return RunningGroup.findOne({
    normalizedName: normalizeGroupName(currentGroupName),
    isActive: true
  })
    .select('name slug description memberCount')
    .lean();
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
  const currentGroup = await getCurrentRunnerGroup(user);
  if (!currentGroup?._id) {
    return [];
  }
  const activity = await getRunningGroupActivity(currentGroup._id, limit);
  return activity.map((item) => ({
    type: 'group_activity',
    at: item.createdAt || null,
    groupName: currentGroup.name || '',
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

  user.runningGroup = group.name;
  await user.save();
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

  const currentGroupName = String(currentUser.runningGroup || '').trim();
  const nextGroupName = String(group.name || '').trim();
  if (normalizeGroupName(currentGroupName) === normalizeGroupName(nextGroupName)) {
    return { group, alreadyMember: true };
  }
  const previousGroupName = currentGroupName;
  currentUser.runningGroup = nextGroupName;
  await currentUser.save();

  if (previousGroupName) {
    await recalculateMemberCountByName(previousGroupName);
    const previousGroup = await RunningGroup.findOne({
      normalizedName: normalizeGroupName(previousGroupName),
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

async function leaveRunningGroup({ user }) {
  if (!user?._id) {
    throw new Error('Runner account is required.');
  }

  const currentUser = await User.findById(user._id);
  if (!currentUser) {
    throw new Error('Runner account not found.');
  }

  const currentGroupName = String(currentUser.runningGroup || '').trim();
  if (!currentGroupName) {
    return { hadGroup: false };
  }

  currentUser.runningGroup = '';
  await currentUser.save();
  await recalculateMemberCountByName(currentGroupName);
  const previousGroup = await RunningGroup.findOne({
    normalizedName: normalizeGroupName(currentGroupName),
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
  return { hadGroup: true };
}

async function recalculateMemberCountByName(groupName) {
  const normalizedName = normalizeGroupName(groupName);
  if (!normalizedName) return;

  const group = await RunningGroup.findOne({ normalizedName, isActive: true });
  if (!group) return;

  const memberCount = await User.countDocuments({
    runningGroup: new RegExp(`^${escapeRegex(group.name)}$`, 'i')
  });
  group.memberCount = memberCount;
  await group.save();
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
  getRunningGroupBySlug,
  getRunningGroupActivity,
  getRecentRunnerGroupActivity,
  createRunningGroup,
  joinRunningGroup,
  leaveRunningGroup
};
