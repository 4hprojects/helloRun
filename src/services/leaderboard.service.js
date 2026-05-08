const mongoose = require('mongoose');
const Submission = require('../models/Submission');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const User = require('../models/User');
const { getAccumulatedLeaderboardRows } = require('./accumulated-activity.service');

async function getLeaderboardData(rawFilters = {}) {
  const filters = normalizeLeaderboardFilters(rawFilters);
  const query = buildLeaderboardQuery(filters);

  const rows = await Submission.find(query)
    .sort({ elapsedMs: 1, submittedAt: 1, createdAt: 1 })
    .limit(filters.limit)
    .populate({ path: 'runnerId', select: 'firstName lastName email' })
    .populate({ path: 'eventId', select: 'title slug status isDeleted' })
    .select('eventId runnerId raceDistance participationMode elapsedMs submittedAt')
    .lean();

  const visibleRows = rows.filter((item) => item.eventId && item.eventId.status === 'published' && item.eventId.isDeleted !== true);
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

async function hydrateAccumulatedLeaderboardRows(rows = []) {
  if (!rows.length) return [];
  const eventIds = rows.map((item) => item.eventId).filter(Boolean);
  const runnerIds = rows.map((item) => item.runnerId).filter(Boolean);
  const registrationIds = rows.map((item) => item._id).filter(Boolean);
  const [events, runners, registrations] = await Promise.all([
    Event.find({ _id: { $in: eventIds }, status: 'published', isDeleted: { $ne: true } })
      .select('title slug status isDeleted')
      .lean(),
    User.find({ _id: { $in: runnerIds } }).select('firstName lastName email').lean(),
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

  const events = await Event.find({ _id: { $in: ids }, status: 'published', isDeleted: { $ne: true }, isPersonalRecord: { $ne: true } }).select('title slug').lean();
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
  const first = String(runner?.firstName || '').trim();
  const last = String(runner?.lastName || '').trim();
  const full = `${first} ${last}`.trim();
  if (full) return full;
  const email = String(runner?.email || '').trim();
  if (!email) return 'Runner';
  const [name] = email.split('@');
  return name || 'Runner';
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

function clampInt(value, min, max, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

module.exports = {
  getLeaderboardData
};
