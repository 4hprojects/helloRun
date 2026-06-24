const crypto = require('crypto');
const mongoose = require('mongoose');
const CommunicationRetry = require('../models/CommunicationRetry');
const communicationService = require('./communication.service');
const logger = require('../utils/logger');

const MAX_RETRY_ATTEMPTS = Number(process.env.COMMUNICATION_RETRY_MAX_ATTEMPTS || 5);
const RETRY_DELAYS_MS = [60 * 1000, 5 * 60 * 1000, 15 * 60 * 1000, 60 * 60 * 1000, 6 * 60 * 60 * 1000];
const STALE_RETRY_DEAD_LETTER_MS = Number(process.env.COMMUNICATION_RETRY_STALE_MS || 24 * 60 * 60 * 1000);
const SENT_RETRY_RETENTION_MS = Number(process.env.COMMUNICATION_RETRY_SENT_RETENTION_MS || 14 * 24 * 60 * 60 * 1000);
const DEAD_RETRY_RETENTION_MS = Number(process.env.COMMUNICATION_RETRY_DEAD_RETENTION_MS || 30 * 24 * 60 * 60 * 1000);
const DEAD_RETRY_ALERT_WINDOW_MS = Number(process.env.COMMUNICATION_RETRY_DEAD_ALERT_WINDOW_MS || 24 * 60 * 60 * 1000);
const DUE_RETRY_BACKLOG_MS = Number(process.env.COMMUNICATION_RETRY_DUE_BACKLOG_MS || 15 * 60 * 1000);

async function notifyWithRetry(eventKey, payload = {}, options = {}) {
  const retryPayload = withEmailFailureThrow(payload);
  try {
    return await communicationService.notify(eventKey, retryPayload);
  } catch (error) {
    await enqueueCommunicationRetry(eventKey, payload, {
      ...options,
      error
    });
    logger.warn('[communication-retry] Queued failed notification:', {
      eventKey,
      source: options.source || '',
      error: error.message
    });
    return { queued: true, error };
  }
}

function notifyWithRetryInBackground(eventKey, payload = {}, options = {}) {
  notifyWithRetry(eventKey, payload, options).catch((error) => {
    logger.error('[communication-retry] Background reliable notify failed:', {
      eventKey,
      source: options.source || '',
      error: error.message
    });
  });
}

async function enqueueCommunicationRetry(eventKey, payload = {}, options = {}) {
  const idempotencyKey = options.idempotencyKey || buildCommunicationRetryKey(eventKey, payload, options);
  const now = new Date();
  const update = {
    $setOnInsert: {
      eventKey: String(eventKey || '').trim(),
      payload: scrubRetryPayload(payload),
      status: 'queued',
      attempts: 0,
      nextAttemptAt: now,
      source: String(options.source || '').trim().slice(0, 120),
      idempotencyKey,
      metadata: normalizeMetadata(options.metadata || payload.email?.metadata || payload.notification?.metadata || {}),
      createdAt: now
    },
    $set: {
      lastError: String(options.error?.message || options.error || '').slice(0, 1000),
      updatedAt: now
    }
  };

  return CommunicationRetry.findOneAndUpdate(
    { idempotencyKey },
    update,
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

async function processCommunicationRetryBatch(options = {}) {
  const limit = Number(options.limit || process.env.COMMUNICATION_RETRY_BATCH_SIZE || 20);
  const now = new Date();
  const jobs = await CommunicationRetry.find({
    status: { $in: ['queued', 'retrying'] },
    nextAttemptAt: { $lte: now },
    attempts: { $lt: MAX_RETRY_ATTEMPTS }
  })
    .sort({ nextAttemptAt: 1, createdAt: 1 })
    .limit(limit);

  for (const job of jobs) {
    await retryCommunicationJob(job);
  }

  return { processed: jobs.length };
}

async function runCommunicationRetryHygiene(options = {}) {
  const now = options.now instanceof Date ? options.now : new Date();
  const staleMs = Number(options.staleMs || STALE_RETRY_DEAD_LETTER_MS);
  const sentRetentionMs = Number(options.sentRetentionMs || SENT_RETRY_RETENTION_MS);
  const deadRetentionMs = Number(options.deadRetentionMs || DEAD_RETRY_RETENTION_MS);
  const staleCutoff = new Date(now.getTime() - staleMs);
  const sentCutoff = new Date(now.getTime() - sentRetentionMs);
  const deadCutoff = new Date(now.getTime() - deadRetentionMs);

  const [staleDeadLettered, sentDeleted, deadDeleted] = await Promise.all([
    CommunicationRetry.updateMany(
      {
        status: { $in: ['queued', 'retrying'] },
        createdAt: { $lte: staleCutoff }
      },
      {
        $set: {
          status: 'dead',
          lastError: 'Retry job exceeded the stale queue window and was dead-lettered automatically.',
          updatedAt: now
        }
      }
    ),
    CommunicationRetry.deleteMany({
      status: 'sent',
      $or: [
        { sentAt: { $lte: sentCutoff } },
        { sentAt: { $exists: false }, updatedAt: { $lte: sentCutoff } }
      ]
    }),
    CommunicationRetry.deleteMany({
      status: 'dead',
      updatedAt: { $lte: deadCutoff }
    })
  ]);

  return {
    staleDeadLettered: staleDeadLettered.modifiedCount || 0,
    sentDeleted: sentDeleted.deletedCount || 0,
    deadDeleted: deadDeleted.deletedCount || 0
  };
}

async function getCommunicationRetryHealth(options = {}) {
  const now = options.now instanceof Date ? options.now : new Date();
  const staleMs = Number(options.staleMs || STALE_RETRY_DEAD_LETTER_MS);
  const deadAlertWindowMs = Number(options.deadAlertWindowMs || DEAD_RETRY_ALERT_WINDOW_MS);
  const dueBacklogMs = Number(options.dueBacklogMs || DUE_RETRY_BACKLOG_MS);
  const staleCutoff = new Date(now.getTime() - staleMs);
  const deadAlertCutoff = new Date(now.getTime() - deadAlertWindowMs);
  const dueBacklogCutoff = new Date(now.getTime() - dueBacklogMs);
  const [counts, staleQueued, dueNow, overdueDue, deadRecently] = await Promise.all([
    CommunicationRetry.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]),
    CommunicationRetry.countDocuments({
      status: { $in: ['queued', 'retrying'] },
      createdAt: { $lte: staleCutoff }
    }),
    CommunicationRetry.countDocuments({
      status: { $in: ['queued', 'retrying'] },
      nextAttemptAt: { $lte: now },
      attempts: { $lt: MAX_RETRY_ATTEMPTS }
    }),
    CommunicationRetry.countDocuments({
      status: { $in: ['queued', 'retrying'] },
      nextAttemptAt: { $lte: dueBacklogCutoff },
      attempts: { $lt: MAX_RETRY_ATTEMPTS }
    }),
    CommunicationRetry.countDocuments({
      status: 'dead',
      updatedAt: { $gte: deadAlertCutoff }
    })
  ]);

  const byStatus = counts.reduce((memo, row) => {
    memo[row._id || 'unknown'] = row.count;
    return memo;
  }, {});

  const health = {
    queued: byStatus.queued || 0,
    retrying: byStatus.retrying || 0,
    sent: byStatus.sent || 0,
    dead: byStatus.dead || 0,
    staleQueued,
    dueNow,
    overdueDue,
    deadRecently
  };
  health.alerts = buildCommunicationRetryAlerts(health);
  return health;
}

async function listCommunicationRetries(filters = {}) {
  const normalized = normalizeRetryFilters(filters);
  const query = {};
  if (normalized.status) query.status = normalized.status;
  if (normalized.eventKey) query.eventKey = normalized.eventKey;
  if (normalized.q) {
    const pattern = new RegExp(escapeRegex(normalized.q), 'i');
    query.$or = [
      { eventKey: pattern },
      { source: pattern },
      { lastError: pattern },
      { 'metadata.registrationId': pattern },
      { 'metadata.submissionId': pattern },
      { 'metadata.activityId': pattern },
      { 'metadata.eventId': pattern },
      { 'payload.email.to': pattern }
    ];
  }

  const [totalItems, counts] = await Promise.all([
    CommunicationRetry.countDocuments(query),
    CommunicationRetry.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ])
  ]);

  const totalPages = Math.max(1, Math.ceil(totalItems / normalized.limit));
  const page = Math.min(normalized.page, totalPages);
  const items = await CommunicationRetry.find(query)
    .sort({ nextAttemptAt: 1, createdAt: -1 })
    .skip((page - 1) * normalized.limit)
    .limit(normalized.limit)
    .lean();

  return {
    items,
    filters: normalized,
    counts: counts.reduce((memo, row) => {
      memo[row._id || 'unknown'] = row.count;
      return memo;
    }, {}),
    pagination: {
      page,
      totalItems,
      totalPages,
      limit: normalized.limit
    }
  };
}

async function retryCommunicationNow(retryId) {
  const safeId = String(retryId || '').trim();
  if (!mongoose.Types.ObjectId.isValid(safeId)) {
    throw new Error('Invalid retry job.');
  }

  const job = await CommunicationRetry.findById(safeId);
  if (!job) {
    throw new Error('Retry job not found.');
  }
  if (job.status === 'sent') {
    return { alreadySent: true, job };
  }

  job.status = 'queued';
  job.attempts = 0;
  job.nextAttemptAt = new Date();
  job.lastError = '';
  await job.save();
  const result = await retryCommunicationJob(job);
  return { ...result, job };
}

async function retryCommunicationJob(job) {
  const attemptNumber = Number(job.attempts || 0) + 1;
  job.status = 'retrying';
  job.lastAttemptAt = new Date();
  job.attempts = attemptNumber;
  await job.save();

  try {
    await communicationService.notify(job.eventKey, withEmailFailureThrow(job.payload || {}));
    job.status = 'sent';
    job.sentAt = new Date();
    job.lastError = '';
    await job.save();
    return { sent: true };
  } catch (error) {
    const dead = attemptNumber >= MAX_RETRY_ATTEMPTS;
    job.status = dead ? 'dead' : 'queued';
    job.lastError = String(error.message || error).slice(0, 1000);
    job.nextAttemptAt = new Date(Date.now() + getRetryDelayMs(attemptNumber));
    await job.save();

    if (dead) {
      logger.error('[communication-retry] Dead-lettered notification retry:', {
        id: String(job._id),
        eventKey: job.eventKey,
        error: job.lastError
      });
    }
    return { sent: false, dead };
  }
}

function withEmailFailureThrow(payload = {}) {
  return {
    ...payload,
    throwOnInAppFailure: true,
    throwOnEmailFailure: true
  };
}

function buildCommunicationRetryKey(eventKey, payload = {}, options = {}) {
  const metadata = payload.email?.metadata || payload.notification?.metadata || {};
  const stable = {
    eventKey: String(eventKey || '').trim(),
    source: String(options.source || '').trim(),
    recipientUserId: String(payload.email?.recipientUserId || payload.notification?.userId || ''),
    recipientEmail: String(payload.email?.to || '').trim().toLowerCase(),
    registrationId: String(metadata.registrationId || ''),
    submissionId: String(metadata.submissionId || ''),
    activityId: String(metadata.activityId || ''),
    eventId: String(metadata.eventId || '')
  };
  return crypto.createHash('sha256').update(JSON.stringify(stable)).digest('hex');
}

function scrubRetryPayload(payload = {}) {
  return JSON.parse(JSON.stringify(payload || {}));
}

function normalizeMetadata(metadata = {}) {
  return metadata && typeof metadata === 'object' ? JSON.parse(JSON.stringify(metadata)) : {};
}

function normalizeRetryFilters(filters = {}) {
  const status = ['queued', 'retrying', 'sent', 'dead'].includes(String(filters.status || '').trim())
    ? String(filters.status).trim()
    : '';
  const requestedPage = Number.parseInt(String(filters.page || '1'), 10);
  return {
    status,
    eventKey: String(filters.eventKey || '').trim().slice(0, 120),
    q: String(filters.q || '').trim().slice(0, 120),
    page: Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1,
    limit: 40
  };
}

function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getRetryDelayMs(attemptNumber) {
  return RETRY_DELAYS_MS[Math.min(Math.max(attemptNumber - 1, 0), RETRY_DELAYS_MS.length - 1)];
}

function buildCommunicationRetryAlerts(health = {}) {
  const alerts = [];
  if (Number(health.deadRecently || 0) > 0) {
    alerts.push({
      code: 'dead_letters_increased',
      severity: 'error',
      title: 'Dead letters increased',
      message: `${health.deadRecently} notification retry${health.deadRecently === 1 ? ' has' : 'ies have'} dead-lettered recently.`,
      href: '/admin/communications/retries?status=dead'
    });
  }
  if (Number(health.staleQueued || 0) > 0) {
    alerts.push({
      code: 'stale_queue',
      severity: 'warning',
      title: 'Retry queue has stale jobs',
      message: `${health.staleQueued} queued notification retry${health.staleQueued === 1 ? ' is' : 'ies are'} older than the stale queue window.`,
      href: '/admin/communications/retries?status=queued'
    });
  }
  if (Number(health.overdueDue || 0) > 0) {
    alerts.push({
      code: 'retry_worker_backlog',
      severity: 'warning',
      title: 'Retry worker may be falling behind',
      message: `${health.overdueDue} due notification retry${health.overdueDue === 1 ? ' has' : 'ies have'} not cleared within the backlog window.`,
      href: '/admin/communications/retries'
    });
  }
  return alerts;
}

module.exports = {
  buildCommunicationRetryAlerts,
  buildCommunicationRetryKey,
  enqueueCommunicationRetry,
  getCommunicationRetryHealth,
  listCommunicationRetries,
  notifyWithRetry,
  notifyWithRetryInBackground,
  processCommunicationRetryBatch,
  retryCommunicationNow,
  runCommunicationRetryHygiene
};
