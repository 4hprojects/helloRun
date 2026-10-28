const os = require('os');
const ActiveQuestSeries = require('../models/ActiveQuestSeries');
const ActiveQuestGenerationJob = require('../models/ActiveQuestGenerationJob');
const Event = require('../models/Event');
const User = require('../models/User');
const { ACTIVE_QUEST_SERIES_KEY } = require('../config/active-quest');
const { buildActiveQuestSchedule } = require('./active-quest-schedule.service');
const { generateActiveQuestEdition } = require('./active-quest-generator.service');
const { getPhtYearMonth } = require('./active-quest-public.service');
const { reconcileActiveQuestAchievements } = require('./active-quest-achievement.service');

const STALE_CLAIM_MS = 30 * 60 * 1000;
const MAX_ATTEMPTS = 5;

async function runActiveQuestSchedulerCycle(options = {}, dependencies = {}) {
  const now = options.now instanceof Date ? options.now : new Date();
  const SeriesModel = dependencies.SeriesModel || ActiveQuestSeries;
  const EventModel = dependencies.EventModel || Event;
  const series = await SeriesModel.findOne({ key: ACTIVE_QUEST_SERIES_KEY });
  if (!isActiveQuestSchedulerEnabled(series)) return { status: 'disabled', checked: 0, generated: 0, failed: 0 };

  const targets = getDueSchedulerTargets({
    now,
    scheduleDefaults: series.scheduleDefaults,
    lookbackMonths: 0,
    lookaheadMonths: 2
  }).filter((target) => target.schedule.instants.activityStart > now);
  const summary = { status: 'enabled', checked: targets.length, generated: 0, existing: 0, failed: 0 };
  for (const target of targets) {
    const existing = await EventModel.findOne({
      seriesKey: ACTIVE_QUEST_SERIES_KEY,
      seriesYear: target.year,
      seriesMonth: target.month
    });
    if (existing) {
      summary.existing += 1;
      continue;
    }
    const job = await claimGenerationJob(target, { now, JobModel: dependencies.JobModel || ActiveQuestGenerationJob, workerId: options.workerId });
    if (!job) continue;
    try {
      const actor = await (dependencies.UserModel || User).findById(series.updatedBy).select('_id role adminTier');
      const result = await (dependencies.generateEdition || generateActiveQuestEdition)({
        seriesKey: ACTIVE_QUEST_SERIES_KEY,
        year: target.year,
        month: target.month,
        requestedBy: actor
      });
      await markJobSucceeded(job, result.eventId, { now, JobModel: dependencies.JobModel || ActiveQuestGenerationJob });
      summary[result.created ? 'generated' : 'existing'] += 1;
    } catch (error) {
      await markJobFailed(job, error, { now, JobModel: dependencies.JobModel || ActiveQuestGenerationJob });
      summary.failed += 1;
    }
  }
  if (options.skipAchievements !== true) {
    await (dependencies.reconcileAchievements || reconcileActiveQuestAchievements)({ now }).catch(() => {});
  }
  return summary;
}

function isActiveQuestSchedulerEnabled(series) {
  return Boolean(
    series?.isActive === true &&
    series?.featureFlags?.activeQuestSeriesEnabled === true &&
    series?.featureFlags?.activeQuestDraftGenerationEnabled === true &&
    series?.featureFlags?.activeQuestSchedulerEnabled === true &&
    series?.featureFlags?.activeQuestAutoPublishEnabled !== true
  );
}

function getDueSchedulerTargets({ now = new Date(), scheduleDefaults = {}, lookbackMonths = 0, lookaheadMonths = 2 } = {}) {
  const current = getPhtYearMonth(now);
  const preparationDays = clamp(Number(scheduleDefaults.draftPreparationDaysBeforeRegistration || 10), 7, 14);
  const targets = [];
  for (let offset = -lookbackMonths; offset <= lookaheadMonths; offset += 1) {
    const target = addMonths(current.year, current.month, offset);
    const schedule = buildActiveQuestSchedule({ year: target.year, month: target.month, scheduleDefaults });
    const dueAt = new Date(schedule.instants.registrationOpen.getTime() - preparationDays * 86400000);
    if (now >= dueAt) targets.push({ ...target, dueAt, schedule });
  }
  return targets;
}

async function listActiveQuestSchedulerRecovery(options = {}, dependencies = {}) {
  const now = options.now instanceof Date ? options.now : new Date();
  const SeriesModel = dependencies.SeriesModel || ActiveQuestSeries;
  const EventModel = dependencies.EventModel || Event;
  const JobModel = dependencies.JobModel || ActiveQuestGenerationJob;
  const series = await SeriesModel.findOne({ key: ACTIVE_QUEST_SERIES_KEY }).lean();
  if (!series) return { enabled: false, missed: [], jobs: [] };
  const targets = getDueSchedulerTargets({ now, scheduleDefaults: series.scheduleDefaults, lookbackMonths: 6, lookaheadMonths: 1 });
  const existing = await EventModel.find({
    seriesKey: ACTIVE_QUEST_SERIES_KEY,
    $or: targets.map((target) => ({ seriesYear: target.year, seriesMonth: target.month }))
  }).select('seriesYear seriesMonth').lean();
  const existingKeys = new Set(existing.map((event) => `${event.seriesYear}-${event.seriesMonth}`));
  const missed = targets.filter((target) => !existingKeys.has(`${target.year}-${target.month}`));
  const jobs = await JobModel.find({ seriesKey: ACTIVE_QUEST_SERIES_KEY }).sort({ updatedAt: -1 }).limit(20).lean();
  return { enabled: isActiveQuestSchedulerEnabled(series), missed, jobs };
}

async function claimGenerationJob(target, { now, JobModel, workerId = '' }) {
  const key = `${ACTIVE_QUEST_SERIES_KEY}:${target.year}-${String(target.month).padStart(2, '0')}`;
  const staleBefore = new Date(now.getTime() - STALE_CLAIM_MS);
  try {
    return await JobModel.findOneAndUpdate({
      key,
      $or: [
        { status: { $exists: false } },
        { status: 'failed', attempts: { $lt: MAX_ATTEMPTS }, nextRetryAt: { $lte: now } },
        { status: 'running', claimedAt: { $lte: staleBefore } }
      ]
    }, {
      $setOnInsert: { key, seriesKey: ACTIVE_QUEST_SERIES_KEY, year: target.year, month: target.month },
      $set: { status: 'running', claimedAt: now, workerId: workerId || `${os.hostname()}:${process.pid}`, lastError: '' },
      $inc: { attempts: 1 }
    }, { new: true, upsert: true, runValidators: true });
  } catch (error) {
    if (error?.code === 11000) return null;
    throw error;
  }
}

async function markJobSucceeded(job, eventId, { now, JobModel }) {
  return JobModel.updateOne({ _id: job._id, status: 'running', claimedAt: job.claimedAt }, {
    $set: { status: 'succeeded', eventId, completedAt: now, nextRetryAt: null, lastError: '' }
  });
}

async function markJobFailed(job, error, { now, JobModel }) {
  const attempts = Number(job.attempts || 1);
  const retryMinutes = Math.min(24 * 60, 5 * (2 ** Math.max(0, attempts - 1)));
  return JobModel.updateOne({ _id: job._id, status: 'running', claimedAt: job.claimedAt }, {
    $set: {
      status: 'failed',
      completedAt: now,
      nextRetryAt: attempts >= MAX_ATTEMPTS ? null : new Date(now.getTime() + retryMinutes * 60000),
      lastError: String(error?.message || error || 'Unknown scheduler error').slice(0, 2000)
    }
  });
}

function addMonths(year, month, offset) {
  const date = new Date(Date.UTC(year, month - 1 + offset, 1));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
}

function clamp(value, min, max) {
  return Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : min;
}

module.exports = {
  STALE_CLAIM_MS,
  MAX_ATTEMPTS,
  runActiveQuestSchedulerCycle,
  isActiveQuestSchedulerEnabled,
  getDueSchedulerTargets,
  listActiveQuestSchedulerRecovery,
  claimGenerationJob,
  markJobSucceeded,
  markJobFailed,
  addMonths
};
