const mongoose = require('mongoose');
const Submission = require('../models/Submission');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const User = require('../models/User');
const AccumulatedActivitySubmission = require('../models/AccumulatedActivitySubmission');
const { getAccumulatedLeaderboardRows } = require('./accumulated-activity.service');
const { getPublicEventVisibilityQuery, isPublicEventVisible } = require('../utils/public-event-visibility');

const DEFAULT_EVENT_LEADERBOARD_COLUMNS = ['rank', 'runner', 'category', 'distance', 'time', 'pace', 'status'];
const DEFAULT_EVENT_IMAGE_URL = '/images/helloRun-icon.webp';

async function getLeaderboardDiscoveryData(rawFilters = {}) {
  const filters = normalizeLeaderboardDiscoveryFilters(rawFilters);
  const now = new Date();
  const query = {
    ...getPublicEventVisibilityQuery(now),
    leaderboardRecognitionEnabled: { $ne: false },
    'leaderboardSettings.enabled': { $ne: false }
  };

  if (filters.q) {
    const safePattern = new RegExp(escapeRegex(filters.q), 'i');
    query.$and = query.$and || [];
    query.$and.push({
      $or: [
        { title: safePattern },
        { organiserName: safePattern },
        { description: safePattern }
      ]
    });
  }
  if (filters.distance) {
    query.raceDistances = filters.distance;
  }
  if (filters.mode) {
    query.$or = [
      { eventType: filters.mode },
      { eventTypesAllowed: filters.mode }
    ];
  }

  const events = await Event.find(query)
    .select('title slug description organiserName eventType eventTypesAllowed raceDistances eventStartAt eventEndAt bannerImageUrl leaderboardRecognitionEnabled leaderboardSettings virtualCompletionMode targetDistanceKm createdAt updatedAt')
    .sort({ eventStartAt: -1, updatedAt: -1, createdAt: -1 })
    .limit(200)
    .lean();

  const filteredEvents = events
    .map((event) => ({ event, settings: resolveEventLeaderboardSettings(event) }))
    .filter((item) => item.settings.enabled)
    .filter((item) => !filters.type || item.settings.type === filters.type);
  const eventIds = filteredEvents.map((item) => item.event._id).filter(Boolean);
  const [submissionStats, accumulatedStats] = await Promise.all([
    getSubmissionDiscoveryStats(eventIds),
    getAccumulatedDiscoveryStats(eventIds)
  ]);

  const cards = filteredEvents
    .map(({ event, settings }) => formatLeaderboardDiscoveryCard({
      event,
      settings,
      submissionStats: submissionStats.get(String(event._id)),
      accumulatedStats: accumulatedStats.get(String(event._id)),
      now
    }))
    .sort(compareLeaderboardDiscoveryCards)
    .slice(0, filters.limit);

  return {
    filters,
    cards,
    options: {
      types: [
        { value: 'race_result', label: 'Race Result' },
        { value: 'accumulated_challenge', label: 'Accumulated Challenge' }
      ],
      distances: getUniqueEventDistances(events),
      modes: ['virtual', 'onsite']
    },
    stats: {
      totalEvents: filteredEvents.length,
      totalShown: cards.length,
      totalVerifiedResults: cards.reduce((sum, card) => sum + card.verifiedCount, 0),
      totalPendingResults: cards.reduce((sum, card) => sum + card.pendingCount, 0)
    }
  };
}

async function getLeaderboardData(rawFilters = {}) {
  const filters = normalizeLeaderboardFilters(rawFilters);
  const query = buildLeaderboardQuery(filters);

  const rows = await Submission.find(query)
    .sort({ elapsedMs: 1, submittedAt: 1, createdAt: 1 })
    .limit(filters.limit)
    .populate({ path: 'runnerId', select: 'firstName lastName displayName email' })
    .populate({ path: 'eventId', select: 'title slug status isDeleted isPersonalRecord publicListingAvailableAt' })
    .select('eventId runnerId raceDistance participationMode elapsedMs submittedAt')
    .lean();

  const visibleRows = rows.filter((item) => isPublicEventVisible(item.eventId));
  const singleEntries = visibleRows.map((item) => ({
    rank: 0,
    submissionId: String(item._id),
    runnerName: getRunnerDisplayName(item.runnerId),
    eventTitle: item.eventId?.title || 'Event unavailable',
    eventSlug: item.eventId?.slug || '',
    raceDistance: item.raceDistance || 'N/A',
    participationMode: item.participationMode || 'N/A',
    elapsedMs: Number(item.elapsedMs || 0),
    elapsedLabel: formatElapsedMs(item.elapsedMs),
    submittedAt: item.submittedAt || null,
    leaderboardType: 'single_activity'
  }));

  const accumulatedRows = await getAccumulatedLeaderboardRows({
    eventId: filters.eventId ? new mongoose.Types.ObjectId(filters.eventId) : null,
    distance: filters.distance,
    mode: filters.mode,
    submittedAt: query.submittedAt,
    limit: filters.limit
  });
  const accumulatedEntries = await hydrateAccumulatedLeaderboardRows(accumulatedRows);
  const entries = [...singleEntries, ...accumulatedEntries]
    .sort((a, b) => {
      if (a.leaderboardType === 'accumulated' || b.leaderboardType === 'accumulated') {
        return Number(b.approvedDistanceKm || 0) - Number(a.approvedDistanceKm || 0);
      }
      return Number(a.elapsedMs || 0) - Number(b.elapsedMs || 0);
    })
    .slice(0, filters.limit)
    .map((item, index) => ({ ...item, rank: index + 1 }));

  const [totalApproved, events, distances, modes] = await Promise.all([
    Submission.countDocuments({ status: 'approved', isPersonalRecord: { $ne: true } }),
    getLeaderboardEvents(),
    Submission.distinct('raceDistance', { status: 'approved', isPersonalRecord: { $ne: true } }),
    Submission.distinct('participationMode', { status: 'approved', isPersonalRecord: { $ne: true } })
  ]);

  return {
    filters,
    entries,
    options: {
      events,
      distances: distances
        .map((item) => String(item || '').trim())
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b)),
      modes: modes
        .map((item) => String(item || '').trim())
        .filter((item) => item === 'virtual' || item === 'onsite')
        .sort()
    },
    stats: {
      totalApproved,
      totalShown: entries.length
    }
  };
}

async function getEventLeaderboard(eventSlug, rawOptions = {}) {
  const event = await getLeaderboardEventBySlug(eventSlug);
  if (!event) return null;
  const settings = resolveEventLeaderboardSettings(event);
  if (!settings.enabled) return null;

  const options = normalizeEventLeaderboardOptions(rawOptions);
  const officialEntries = settings.type === 'accumulated_challenge'
    ? await getAccumulatedEventEntries(event, settings)
    : await getRaceResultEventEntries(event, settings);
  const pendingEntries = settings.showPending
    ? await getPendingEventEntries(event, settings)
    : [];

  const searched = applyEventLeaderboardFilters([...officialEntries, ...pendingEntries], options);
  const groups = buildEventLeaderboardGroups(searched, event);
  const groupedEntries = flattenEventLeaderboardGroups(groups);
  const paged = groupedEntries.slice((options.page - 1) * options.limit, options.page * options.limit);

  return {
    event: formatLeaderboardEvent(event),
    settings,
    filters: options,
    entries: paged,
    groups,
    pagination: {
      page: options.page,
      limit: options.limit,
      total: groupedEntries.length,
      totalPages: Math.max(1, Math.ceil(groupedEntries.length / options.limit))
    },
    stats: {
      totalEntries: officialEntries.length + pendingEntries.length,
      verifiedEntries: officialEntries.length,
      pendingEntries: pendingEntries.length,
      lastUpdatedAt: getLastUpdatedAt([...officialEntries, ...pendingEntries])
    },
    rankingExplanation: settings.type === 'accumulated_challenge'
      ? 'Ranked by highest verified accumulated distance. Official rankings include approved submissions only.'
      : 'Ranked by fastest verified time. Official rankings include approved submissions only.'
  };
}

async function getMyStanding(eventSlug, userId, rawOptions = {}) {
  const safeUserId = normalizeObjectId(userId);
  if (!safeUserId) return null;
  const data = await getEventLeaderboard(eventSlug, {
    ...rawOptions,
    page: 1,
    limit: 500
  });
  if (!data) return null;
  const allEntries = flattenEventLeaderboardGroups(data.groups || []);
  const entry = allEntries.find((item) => String(item.userId || '') === safeUserId) || null;
  if (entry) {
    return {
      event: data.event,
      settings: data.settings,
      standing: entry,
      nearby: await getNearbyRunners(eventSlug, userId, rawOptions)
    };
  }

  const pending = await getRunnerPendingStanding(data.event.id, safeUserId, data.settings);
  return {
    event: data.event,
    settings: data.settings,
    standing: pending,
    nearby: []
  };
}

async function getNearbyRunners(eventSlug, userId, rawOptions = {}) {
  const safeUserId = normalizeObjectId(userId);
  if (!safeUserId) return [];
  const data = await getEventLeaderboard(eventSlug, {
    ...rawOptions,
    page: 1,
    limit: 500
  });
  if (!data) return [];
  const allEntries = flattenEventLeaderboardGroups(data.groups || []);
  const current = allEntries.find((item) => String(item.userId || '') === safeUserId);
  if (!current) return [];
  const currentCategory = normalizeDistance(current.category) || '';
  const official = allEntries
    .filter((item) => Number.isInteger(item.rank))
    .filter((item) => (normalizeDistance(item.category) || '') === currentCategory);
  const currentIndex = official.findIndex((item) => String(item.userId || '') === safeUserId);
  if (currentIndex < 0) return [];
  return official.slice(Math.max(0, currentIndex - 2), currentIndex + 3).map((item) => ({
    ...item,
    isCurrentUser: String(item.userId || '') === safeUserId
  }));
}

function buildEventLeaderboardGroups(entries = [], event = {}) {
  const buckets = new Map();

  entries.forEach((entry) => {
    const key = getEventLeaderboardGroupKey(entry.category);
    if (!buckets.has(key)) {
      buckets.set(key, {
        key,
        label: resolveEventLeaderboardGroupLabel(key, event, entry.category),
        entries: []
      });
    }
    buckets.get(key).entries.push({ ...entry, groupKey: key });
  });

  const orderedKeys = orderEventLeaderboardGroupKeys({
    event,
    availableKeys: Array.from(buckets.keys())
  });

  return orderedKeys.map((key) => {
    const bucket = buckets.get(key) || {
      key,
      label: resolveEventLeaderboardGroupLabel(key, event, ''),
      entries: []
    };
    let officialRank = 0;
    const rankedEntries = bucket.entries.map((entry) => {
      if (entry.status === 'verified') {
        officialRank += 1;
        return { ...entry, rank: officialRank };
      }
      return { ...entry, rank: null };
    });
    const verifiedCount = rankedEntries.filter((entry) => entry.status === 'verified').length;
    const pendingCount = rankedEntries.filter((entry) => entry.status === 'pending_review').length;

    return {
      key,
      label: bucket.label,
      entries: rankedEntries,
      stats: {
        totalEntries: rankedEntries.length,
        verifiedEntries: verifiedCount,
        pendingEntries: pendingCount
      }
    };
  });
}

function flattenEventLeaderboardGroups(groups = []) {
  return groups.flatMap((group) => group.entries || []);
}

function getEventLeaderboardGroupKey(category) {
  const normalized = normalizeDistance(category);
  if (normalized) return normalized;
  return 'uncategorized';
}

function resolveEventLeaderboardGroupLabel(key, event = {}, fallbackCategory = '') {
  if (key === 'uncategorized') return 'Uncategorized';
  const configuredDistances = Array.isArray(event.raceDistances)
    ? event.raceDistances.map((item) => String(item || '').trim()).filter(Boolean)
    : [];
  const matchingConfigured = configuredDistances.find((item) => normalizeDistance(item) === key);
  if (matchingConfigured) return matchingConfigured;
  const fallback = String(fallbackCategory || '').trim();
  return fallback || key;
}

function orderEventLeaderboardGroupKeys({ event = {}, availableKeys = [] }) {
  const configuredDistances = Array.isArray(event.raceDistances)
    ? event.raceDistances.map((item) => String(item || '').trim()).filter(Boolean)
    : [];
  const configuredKeys = configuredDistances
    .map((item) => normalizeDistance(item))
    .filter(Boolean);

  const order = [];
  configuredKeys.forEach((key) => {
    if (availableKeys.includes(key) && !order.includes(key)) {
      order.push(key);
    }
  });

  availableKeys
    .filter((key) => !order.includes(key) && key !== 'uncategorized')
    .sort((a, b) => a.localeCompare(b))
    .forEach((key) => order.push(key));

  if (availableKeys.includes('uncategorized')) {
    order.push('uncategorized');
  }

  return order;
}

async function getLeaderboardEventBySlug(eventSlug) {
  const slug = String(eventSlug || '').trim();
  if (!slug) return null;
  return Event.findOne({ slug, ...getPublicEventVisibilityQuery(new Date()) })
    .select('title slug status eventStartAt eventEndAt virtualWindow virtualCompletionMode targetDistanceKm leaderboardRecognitionEnabled leaderboardSettings raceDistances raceCategories updatedAt')
    .lean();
}

function resolveEventLeaderboardSettings(event = {}) {
  const existing = event.leaderboardSettings || {};
  const type = ['race_result', 'accumulated_challenge'].includes(existing.type)
    ? existing.type
    : (event.virtualCompletionMode === 'accumulated_distance' ? 'accumulated_challenge' : 'race_result');
  return {
    enabled: typeof existing.enabled === 'boolean' ? existing.enabled : event.leaderboardRecognitionEnabled !== false,
    type,
    rankingBasis: type === 'accumulated_challenge' ? 'highest_verified_distance' : 'fastest_time',
    visibility: ['public', 'registered_only', 'private_until_published'].includes(existing.visibility) ? existing.visibility : 'public',
    showPending: Boolean(existing.showPending),
    hideFlagged: typeof existing.hideFlagged === 'boolean' ? existing.hideFlagged : true,
    nameDisplayMode: ['full_name', 'first_name_last_initial', 'display_name', 'anonymous_runner_id'].includes(existing.nameDisplayMode)
      ? existing.nameDisplayMode
      : 'first_name_last_initial',
    visibleColumns: Array.isArray(existing.visibleColumns) && existing.visibleColumns.length
      ? existing.visibleColumns.filter((item) => DEFAULT_EVENT_LEADERBOARD_COLUMNS.includes(item))
      : DEFAULT_EVENT_LEADERBOARD_COLUMNS.slice()
  };
}

async function getRaceResultEventEntries(event, settings) {
  const rows = await Submission.find({
    eventId: event._id,
    status: 'approved',
    isPersonalRecord: { $ne: true },
    ...(settings.hideFlagged ? { suspiciousFlag: { $ne: true } } : {})
  })
    .sort({ elapsedMs: 1, reviewedAt: 1, submittedAt: 1, createdAt: 1 })
    .populate({ path: 'runnerId', select: 'firstName lastName displayName email userId' })
    .populate({ path: 'registrationId', select: 'confirmationCode raceDistance participationMode participant registeredAt' })
    .select('eventId runnerId registrationId raceDistance participationMode distanceKm elapsedMs status submittedAt reviewedAt updatedAt')
    .lean();

  return rows.map((row, index) => formatRaceEntry(row, event, settings, index + 1));
}

async function getAccumulatedEventEntries(event, settings) {
  const rows = await AccumulatedActivitySubmission.aggregate([
    {
      $match: {
        eventId: event._id,
        status: 'approved',
        ...(settings.hideFlagged ? { suspiciousFlag: { $ne: true } } : {})
      }
    },
    {
      $group: {
        _id: '$registrationId',
        eventId: { $first: '$eventId' },
        runnerId: { $first: '$runnerId' },
        raceDistance: { $first: '$raceDistance' },
        participationMode: { $first: '$participationMode' },
        totalDistanceKm: { $sum: '$distanceKm' },
        activityCount: { $sum: 1 },
        submittedAt: { $min: '$submittedAt' },
        verifiedAt: { $max: '$reviewedAt' },
        updatedAt: { $max: '$updatedAt' }
      }
    },
    { $sort: { totalDistanceKm: -1, verifiedAt: 1, submittedAt: 1 } }
  ]);
  if (!rows.length) return [];

  const [runners, registrations] = await Promise.all([
    User.find({ _id: { $in: rows.map((item) => item.runnerId).filter(Boolean) } })
      .select('firstName lastName displayName email userId')
      .lean(),
    Registration.find({ _id: { $in: rows.map((item) => item._id).filter(Boolean) } })
      .select('confirmationCode raceDistance participationMode participant registeredAt')
      .lean()
  ]);
  const runnerById = new Map(runners.map((item) => [String(item._id), item]));
  const registrationById = new Map(registrations.map((item) => [String(item._id), item]));

  return rows.map((row, index) => formatAccumulatedEntry({
    row,
    event,
    settings,
    runner: runnerById.get(String(row.runnerId)),
    registration: registrationById.get(String(row._id)),
    rank: index + 1
  }));
}

async function getPendingEventEntries(event, settings) {
  if (settings.type === 'accumulated_challenge') {
    return getPendingAccumulatedEventEntries(event, settings);
  }
  const rows = await Submission.find({
    eventId: event._id,
    status: 'submitted',
    isPersonalRecord: { $ne: true },
    ...(settings.hideFlagged ? { suspiciousFlag: { $ne: true } } : {})
  })
    .sort({ submittedAt: -1 })
    .populate({ path: 'runnerId', select: 'firstName lastName displayName email userId' })
    .populate({ path: 'registrationId', select: 'confirmationCode raceDistance participationMode participant registeredAt' })
    .select('eventId runnerId registrationId raceDistance participationMode distanceKm elapsedMs status submittedAt updatedAt')
    .lean();
  return rows.map((row) => formatRaceEntry(row, event, settings, null));
}

async function getPendingAccumulatedEventEntries(event, settings) {
  const rows = await AccumulatedActivitySubmission.aggregate([
    {
      $match: {
        eventId: event._id,
        status: 'submitted',
        ...(settings.hideFlagged ? { suspiciousFlag: { $ne: true } } : {})
      }
    },
    {
      $group: {
        _id: '$registrationId',
        eventId: { $first: '$eventId' },
        runnerId: { $first: '$runnerId' },
        raceDistance: { $first: '$raceDistance' },
        participationMode: { $first: '$participationMode' },
        totalDistanceKm: { $sum: '$distanceKm' },
        activityCount: { $sum: 1 },
        submittedAt: { $min: '$submittedAt' },
        updatedAt: { $max: '$updatedAt' }
      }
    },
    { $sort: { submittedAt: -1 } }
  ]);
  if (!rows.length) return [];
  const [runners, registrations] = await Promise.all([
    User.find({ _id: { $in: rows.map((item) => item.runnerId).filter(Boolean) } }).select('firstName lastName displayName email userId').lean(),
    Registration.find({ _id: { $in: rows.map((item) => item._id).filter(Boolean) } }).select('confirmationCode raceDistance participationMode participant registeredAt').lean()
  ]);
  const runnerById = new Map(runners.map((item) => [String(item._id), item]));
  const registrationById = new Map(registrations.map((item) => [String(item._id), item]));
  return rows.map((row) => formatAccumulatedEntry({
    row,
    event,
    settings,
    runner: runnerById.get(String(row.runnerId)),
    registration: registrationById.get(String(row._id)),
    rank: null,
    status: 'submitted'
  }));
}

async function hydrateAccumulatedLeaderboardRows(rows = []) {
  if (!rows.length) return [];
  const eventIds = rows.map((item) => item.eventId).filter(Boolean);
  const runnerIds = rows.map((item) => item.runnerId).filter(Boolean);
  const registrationIds = rows.map((item) => item._id).filter(Boolean);
  const [events, runners, registrations] = await Promise.all([
    Event.find({ _id: { $in: eventIds }, ...getPublicEventVisibilityQuery(new Date()) })
      .select('title slug status isDeleted')
      .lean(),
    User.find({ _id: { $in: runnerIds } }).select('firstName lastName displayName email').lean(),
    Registration.find({ _id: { $in: registrationIds } }).select('confirmationCode').lean()
  ]);
  const eventById = new Map(events.map((item) => [String(item._id), item]));
  const runnerById = new Map(runners.map((item) => [String(item._id), item]));
  const registrationById = new Map(registrations.map((item) => [String(item._id), item]));

  return rows
    .map((item) => {
      const event = eventById.get(String(item.eventId));
      if (!event) return null;
      const approvedDistanceKm = Number(item.approvedDistanceKm || 0);
      return {
        rank: 0,
        submissionId: String(item._id),
        runnerName: getRunnerDisplayName(runnerById.get(String(item.runnerId))),
        eventTitle: event.title || 'Event unavailable',
        eventSlug: event.slug || '',
        raceDistance: item.raceDistance || 'N/A',
        participationMode: item.participationMode || 'virtual',
        elapsedMs: 0,
        elapsedLabel: `${formatDistance(approvedDistanceKm)} km total`,
        submittedAt: item.lastApprovedAt || item.firstSubmittedAt || null,
        leaderboardType: 'accumulated',
        approvedDistanceKm,
        approvedActivityCount: Number(item.approvedActivityCount || 0),
        confirmationCode: registrationById.get(String(item._id))?.confirmationCode || ''
      };
    })
    .filter(Boolean);
}

function normalizeLeaderboardFilters(rawFilters = {}) {
  const normalized = {
    eventId: normalizeObjectId(rawFilters.eventId || rawFilters.event),
    distance: normalizeDistance(rawFilters.distance),
    mode: normalizeMode(rawFilters.mode || rawFilters.category),
    period: normalizePeriod(rawFilters.period),
    limit: clampInt(rawFilters.limit, 1, 200, 100)
  };
  return normalized;
}

function normalizeLeaderboardDiscoveryFilters(rawFilters = {}) {
  const type = String(rawFilters.type || '').trim().toLowerCase();
  return {
    q: String(rawFilters.q || rawFilters.search || '').trim().slice(0, 80),
    type: ['race_result', 'accumulated_challenge'].includes(type) ? type : '',
    distance: normalizeDistance(rawFilters.distance),
    mode: normalizeMode(rawFilters.mode),
    limit: clampInt(rawFilters.limit, 1, 200, 100)
  };
}

function buildLeaderboardQuery(filters) {
  const query = { status: 'approved', isPersonalRecord: { $ne: true } };
  if (filters.eventId) {
    query.eventId = new mongoose.Types.ObjectId(filters.eventId);
  }
  if (filters.distance) {
    query.raceDistance = filters.distance;
  }
  if (filters.mode) {
    query.participationMode = filters.mode;
  }
  const periodDays = periodToDays(filters.period);
  if (periodDays > 0) {
    const cutoff = new Date(Date.now() - (periodDays * 24 * 60 * 60 * 1000));
    query.submittedAt = { $gte: cutoff };
  }
  return query;
}

async function getLeaderboardEvents() {
  const grouped = await Submission.aggregate([
    { $match: { status: 'approved', isPersonalRecord: { $ne: true } } },
    { $group: { _id: '$eventId', approvedCount: { $sum: 1 } } },
    { $sort: { approvedCount: -1 } },
    { $limit: 100 }
  ]);

  const ids = grouped
    .map((item) => item._id)
    .filter(Boolean);
  if (!ids.length) return [];

  const events = await Event.find({ _id: { $in: ids }, ...getPublicEventVisibilityQuery(new Date()) }).select('title slug').lean();
  const eventById = new Map(events.map((item) => [String(item._id), item]));

  return grouped
    .map((item) => {
      const event = eventById.get(String(item._id));
      if (!event) return null;
      return {
        id: String(event._id),
        title: event.title || 'Untitled event',
        slug: event.slug || '',
        approvedCount: Number(item.approvedCount || 0)
      };
    })
    .filter(Boolean);
}

async function getSubmissionDiscoveryStats(eventIds = []) {
  if (!eventIds.length) return new Map();
  const rows = await Submission.aggregate([
    {
      $match: {
        eventId: { $in: eventIds },
        isPersonalRecord: { $ne: true },
        status: { $in: ['approved', 'submitted'] },
        suspiciousFlag: { $ne: true }
      }
    },
    {
      $group: {
        _id: '$eventId',
        verifiedCount: {
          $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
        },
        pendingCount: {
          $sum: { $cond: [{ $eq: ['$status', 'submitted'] }, 1, 0] }
        },
        lastUpdatedAt: { $max: { $ifNull: ['$reviewedAt', '$submittedAt'] } }
      }
    }
  ]);

  return new Map(rows.map((row) => [String(row._id), {
    verifiedCount: Number(row.verifiedCount || 0),
    pendingCount: Number(row.pendingCount || 0),
    lastUpdatedAt: row.lastUpdatedAt || null
  }]));
}

async function getAccumulatedDiscoveryStats(eventIds = []) {
  if (!eventIds.length) return new Map();
  const rows = await AccumulatedActivitySubmission.aggregate([
    {
      $match: {
        eventId: { $in: eventIds },
        status: { $in: ['approved', 'submitted'] },
        suspiciousFlag: { $ne: true }
      }
    },
    {
      $group: {
        _id: {
          eventId: '$eventId',
          registrationId: '$registrationId',
          status: '$status'
        },
        lastUpdatedAt: { $max: { $ifNull: ['$reviewedAt', '$submittedAt'] } }
      }
    },
    {
      $group: {
        _id: '$_id.eventId',
        verifiedCount: {
          $sum: { $cond: [{ $eq: ['$_id.status', 'approved'] }, 1, 0] }
        },
        pendingCount: {
          $sum: { $cond: [{ $eq: ['$_id.status', 'submitted'] }, 1, 0] }
        },
        lastUpdatedAt: { $max: '$lastUpdatedAt' }
      }
    }
  ]);

  return new Map(rows.map((row) => [String(row._id), {
    verifiedCount: Number(row.verifiedCount || 0),
    pendingCount: Number(row.pendingCount || 0),
    lastUpdatedAt: row.lastUpdatedAt || null
  }]));
}

function formatLeaderboardDiscoveryCard({ event, settings, submissionStats = {}, accumulatedStats = {}, now = new Date() }) {
  const raceDistances = Array.isArray(event.raceDistances)
    ? event.raceDistances.map((item) => String(item || '').trim().toUpperCase()).filter(Boolean)
    : [];
  const eventModes = Array.from(new Set(
    [event.eventType].concat(Array.isArray(event.eventTypesAllowed) ? event.eventTypesAllowed : [])
      .map((item) => String(item || '').trim().toLowerCase())
      .filter((item) => item === 'virtual' || item === 'onsite' || item === 'hybrid')
  ));
  const stats = settings.type === 'accumulated_challenge' ? accumulatedStats : submissionStats;
  const lastUpdatedAt = stats.lastUpdatedAt || event.updatedAt || null;

  return {
    id: String(event._id || ''),
    title: event.title || 'Untitled event',
    slug: event.slug || '',
    href: event.slug ? `/events/${event.slug}/leaderboard` : '',
    eventHref: event.slug ? `/events/${event.slug}` : '',
    imageUrl: event.bannerImageUrl || DEFAULT_EVENT_IMAGE_URL,
    organiserName: event.organiserName || '',
    eventType: event.eventType || '',
    eventTypeLabel: formatEventTypeLabel(event.eventType),
    modes: eventModes,
    modeLabel: eventModes.map(formatEventTypeLabel).join(', ') || 'Mode TBA',
    raceDistances,
    distanceLabel: raceDistances.join(', ') || 'Distances TBA',
    leaderboardType: settings.type,
    leaderboardTypeLabel: settings.type === 'accumulated_challenge' ? 'Accumulated Challenge' : 'Race Result',
    rankingExplanation: settings.type === 'accumulated_challenge'
      ? 'Ranked by highest verified accumulated distance.'
      : 'Ranked by fastest verified time.',
    verifiedCount: Number(stats.verifiedCount || 0),
    pendingCount: Number(stats.pendingCount || 0),
    lastUpdatedAt,
    lastUpdatedLabel: formatDateTimeLabel(lastUpdatedAt),
    eventStartAt: event.eventStartAt || null,
    dateLabel: formatDateRangeLabel(event.eventStartAt, event.eventEndAt),
    isActiveOrUpcoming: isEventActiveOrUpcoming(event, now)
  };
}

function compareLeaderboardDiscoveryCards(a, b) {
  const verifiedDiff = Number(b.verifiedCount || 0) - Number(a.verifiedCount || 0);
  if (verifiedDiff !== 0) return verifiedDiff;
  if (a.isActiveOrUpcoming !== b.isActiveOrUpcoming) return a.isActiveOrUpcoming ? -1 : 1;
  const activityDiff = getTimeValue(b.lastUpdatedAt) - getTimeValue(a.lastUpdatedAt);
  if (activityDiff !== 0) return activityDiff;
  return getTimeValue(a.eventStartAt) - getTimeValue(b.eventStartAt);
}

function getUniqueEventDistances(events = []) {
  return Array.from(new Set(
    events.flatMap((event) => Array.isArray(event.raceDistances) ? event.raceDistances : [])
      .map((item) => String(item || '').trim().toUpperCase())
      .filter(Boolean)
  )).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

function formatEventTypeLabel(value) {
  const safe = String(value || '').trim().toLowerCase();
  if (safe === 'virtual') return 'Virtual';
  if (safe === 'onsite') return 'Onsite';
  if (safe === 'hybrid') return 'Hybrid';
  return safe ? safe.charAt(0).toUpperCase() + safe.slice(1) : 'Event';
}

function formatDateTimeLabel(value) {
  if (!value) return 'No verified results yet';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No verified results yet';
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

function formatDateRangeLabel(startValue, endValue) {
  const start = startValue ? new Date(startValue) : null;
  const end = endValue ? new Date(endValue) : null;
  const validStart = start && !Number.isNaN(start.getTime());
  const validEnd = end && !Number.isNaN(end.getTime());
  if (validStart && validEnd) {
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  }
  if (validStart) {
    return start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  return 'Dates TBA';
}

function isEventActiveOrUpcoming(event, now = new Date()) {
  const end = event?.eventEndAt ? new Date(event.eventEndAt) : null;
  if (!end || Number.isNaN(end.getTime())) return true;
  return end >= now;
}

function getTimeValue(value) {
  if (!value) return 0;
  const date = new Date(value);
  const time = date.getTime();
  return Number.isFinite(time) ? time : 0;
}

function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeObjectId(value) {
  const safe = String(value || '').trim();
  return mongoose.Types.ObjectId.isValid(safe) ? safe : '';
}

function normalizeDistance(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
    .slice(0, 30);
}

function normalizeMode(value) {
  const safe = String(value || '').trim().toLowerCase();
  if (safe === 'virtual' || safe === 'onsite') return safe;
  return '';
}

function normalizePeriod(value) {
  const safe = String(value || '').trim().toLowerCase();
  if (safe === '7d' || safe === '30d' || safe === '90d') return safe;
  return 'all';
}

function periodToDays(value) {
  if (value === '7d') return 7;
  if (value === '30d') return 30;
  if (value === '90d') return 90;
  return 0;
}

function getRunnerDisplayName(runner) {
  const displayName = String(runner?.displayName || '').trim();
  if (displayName) return displayName;
  const first = String(runner?.firstName || '').trim();
  const last = String(runner?.lastName || '').trim();
  if (first && last) return `${first} ${last.charAt(0)}.`;
  if (first) return first;
  return 'Runner';
}

function formatElapsedMs(value) {
  const totalMs = Number(value || 0);
  if (!Number.isFinite(totalMs) || totalMs <= 0) return '00:00:00';
  const totalSeconds = Math.floor(totalMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function formatDistance(value) {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric)) return '0';
  return Number(numeric.toFixed(2)).toString();
}

function formatLeaderboardEvent(event = {}) {
  return {
    id: String(event._id || ''),
    title: event.title || 'Event unavailable',
    slug: event.slug || '',
    eventStartAt: event.eventStartAt || null,
    eventEndAt: event.eventEndAt || null,
    virtualWindow: event.virtualWindow || null,
    targetDistanceKm: Number(event.targetDistanceKm || 0) || null,
    leaderboardType: event.virtualCompletionMode === 'accumulated_distance' ? 'accumulated_challenge' : 'race_result'
  };
}

function normalizeEventLeaderboardOptions(rawOptions = {}) {
  return {
    view: String(rawOptions.view || 'overall').trim().toLowerCase(),
    category: normalizeDistance(rawOptions.category || rawOptions.categoryId || rawOptions.distance),
    mode: normalizeMode(rawOptions.mode || rawOptions.participationMode),
    status: normalizePublicStatus(rawOptions.status),
    search: String(rawOptions.search || '').trim().toLowerCase().slice(0, 80),
    page: clampInt(rawOptions.page, 1, 10000, 1),
    limit: clampInt(rawOptions.limit, 1, 500, 25)
  };
}

function normalizePublicStatus(value) {
  const safe = String(value || '').trim().toLowerCase();
  if (['verified', 'pending_review', 'rejected'].includes(safe)) return safe;
  if (safe === 'approved') return 'verified';
  if (safe === 'submitted' || safe === 'pending') return 'pending_review';
  return '';
}

function formatRaceEntry(row, event, settings, rank) {
  const registration = row.registrationId || {};
  const distanceKm = Number(row.distanceKm || 0);
  const elapsedMs = Number(row.elapsedMs || 0);
  const paceSecondsPerKm = distanceKm > 0 && elapsedMs > 0 ? Math.round((elapsedMs / 1000) / distanceKm) : 0;
  return {
    rank: Number.isInteger(rank) ? rank : null,
    registrationId: String(registration._id || row.registrationId || ''),
    submissionId: String(row._id || ''),
    userId: String(row.runnerId?._id || row.runnerId || ''),
    runnerName: formatRunnerName(row.runnerId, settings.nameDisplayMode, registration),
    category: registration.raceDistance || row.raceDistance || '',
    participationMode: registration.participationMode || row.participationMode || '',
    distanceKm,
    distanceLabel: distanceKm > 0 ? `${formatDistance(distanceKm)} km` : '',
    timeMs: elapsedMs,
    timeLabel: formatElapsedMs(elapsedMs),
    paceSecondsPerKm,
    paceLabel: formatPace(paceSecondsPerKm),
    activityCount: 1,
    status: mapPublicStatus(row.status),
    statusLabel: getPublicStatusLabel(mapPublicStatus(row.status)),
    submittedAt: row.submittedAt || null,
    verifiedAt: row.reviewedAt || null,
    updatedAt: row.updatedAt || row.reviewedAt || row.submittedAt || null,
    searchableText: buildSearchableText({ runner: row.runnerId, registration, row, event })
  };
}

function formatAccumulatedEntry({ row, event, settings, runner, registration, rank, status = 'approved' }) {
  const totalDistanceKm = Number(row.totalDistanceKm || 0);
  const target = Number(event.targetDistanceKm || 0);
  return {
    rank: Number.isInteger(rank) ? rank : null,
    registrationId: String(registration?._id || row._id || ''),
    submissionId: String(row._id || ''),
    userId: String(runner?._id || row.runnerId || ''),
    runnerName: formatRunnerName(runner, settings.nameDisplayMode, registration),
    category: registration?.raceDistance || row.raceDistance || '',
    participationMode: registration?.participationMode || row.participationMode || '',
    distanceKm: totalDistanceKm,
    totalDistanceKm,
    distanceLabel: `${formatDistance(totalDistanceKm)} km total`,
    timeMs: 0,
    timeLabel: '',
    paceSecondsPerKm: 0,
    paceLabel: '',
    activityCount: Number(row.activityCount || 0),
    completionPercentage: target > 0 ? Math.min(100, Math.round((totalDistanceKm / target) * 100)) : null,
    status: mapPublicStatus(status),
    statusLabel: getPublicStatusLabel(mapPublicStatus(status)),
    submittedAt: row.submittedAt || null,
    verifiedAt: row.verifiedAt || null,
    updatedAt: row.updatedAt || row.verifiedAt || row.submittedAt || null,
    searchableText: buildSearchableText({ runner, registration, row, event })
  };
}

function applyEventLeaderboardFilters(entries, options) {
  return entries
    .filter((entry) => !options.category || normalizeDistance(entry.category) === options.category)
    .filter((entry) => !options.mode || entry.participationMode === options.mode)
    .filter((entry) => !options.status || entry.status === options.status)
    .filter((entry) => !options.search || entry.searchableText.includes(options.search))
    .map(stripInternalLeaderboardFields);
}

function stripInternalLeaderboardFields(entry) {
  const { searchableText, ...publicEntry } = entry;
  return publicEntry;
}

function formatRunnerName(runner, mode, registration = {}) {
  const participant = registration?.participant || {};
  const first = String(runner?.firstName || participant.firstName || '').trim();
  const last = String(runner?.lastName || participant.lastName || '').trim();
  const displayName = String(runner?.displayName || '').trim();
  const confirmationCode = String(registration?.confirmationCode || '').replace(/^HR-/, '');
  if (mode === 'full_name') return `${first} ${last}`.trim() || displayName || 'Runner';
  if (mode === 'display_name') return displayName || `${first} ${last.charAt(0)}.`.trim() || 'Runner';
  if (mode === 'anonymous_runner_id') return `Runner #${confirmationCode || String(registration?._id || '').slice(-6) || '----'}`;
  return `${first || 'Runner'}${last ? ` ${last.charAt(0)}.` : ''}`;
}

function buildSearchableText({ runner, registration, row, event }) {
  return [
    runner?.firstName,
    runner?.lastName,
    runner?.displayName,
    registration?.participant?.firstName,
    registration?.participant?.lastName,
    registration?.confirmationCode,
    row?.raceDistance,
    row?.participationMode,
    event?.title
  ].map((item) => String(item || '').trim().toLowerCase()).filter(Boolean).join(' ');
}

function mapPublicStatus(status) {
  const safe = String(status || '').trim().toLowerCase();
  if (safe === 'approved' || safe === 'verified') return 'verified';
  if (safe === 'submitted' || safe === 'pending_review') return 'pending_review';
  if (safe === 'rejected') return 'rejected';
  return 'incomplete';
}

function getPublicStatusLabel(status) {
  if (status === 'verified') return 'Verified';
  if (status === 'pending_review') return 'Pending Review';
  if (status === 'rejected') return 'Rejected';
  return 'Incomplete';
}

function formatPace(secondsPerKm) {
  const totalSeconds = Number(secondsPerKm || 0);
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return '';
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}/km`;
}

function getLastUpdatedAt(entries = []) {
  const timestamps = entries
    .map((item) => new Date(item.updatedAt || item.verifiedAt || item.submittedAt || 0).getTime())
    .filter((item) => Number.isFinite(item) && item > 0);
  if (!timestamps.length) return null;
  return new Date(Math.max(...timestamps));
}

async function getRunnerPendingStanding(eventId, userId, settings) {
  const Model = settings.type === 'accumulated_challenge' ? AccumulatedActivitySubmission : Submission;
  const row = await Model.findOne({
    eventId,
    runnerId: userId,
    status: { $in: ['submitted', 'rejected'] },
    ...(settings.hideFlagged ? { suspiciousFlag: { $ne: true } } : {})
  })
    .sort({ submittedAt: -1 })
    .populate({ path: 'runnerId', select: 'firstName lastName displayName email userId' })
    .populate({ path: 'registrationId', select: 'confirmationCode raceDistance participationMode participant registeredAt' })
    .select('runnerId registrationId raceDistance participationMode distanceKm elapsedMs status submittedAt updatedAt')
    .lean();
  if (!row) return null;
  return formatRaceEntry(row, { _id: eventId }, settings, null);
}

function clampInt(value, min, max, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

module.exports = {
  getLeaderboardDiscoveryData,
  getLeaderboardData,
  getEventLeaderboard,
  getMyStanding,
  getNearbyRunners,
  resolveEventLeaderboardSettings
};
