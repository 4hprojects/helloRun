'use strict';

const crypto = require('crypto');
const StravaWebhookEvent = require('../models/StravaWebhookEvent');
const stravaService = require('./strava.service');

const WEBHOOK_TTL_MS = 24 * 60 * 60 * 1000;
const WEBHOOK_JOB_LEASE_MS = 5 * 60 * 1000;
const WEBHOOK_JOB_MAX_ATTEMPTS = 8;

function verifyChallenge(query = {}) {
  const mode = boundedString(query['hub.mode'], 32);
  const token = boundedString(query['hub.verify_token'], 256);
  const challenge = boundedString(query['hub.challenge'], 256);
  const expected = String(process.env.STRAVA_WEBHOOK_VERIFY_TOKEN || '');
  if (mode !== 'subscribe' || !challenge || !expected || !safeEqual(token, expected)) {
    return null;
  }
  return challenge;
}

async function enqueueWebhookEvent(payload = {}, { JobModel = StravaWebhookEvent } = {}) {
  const normalized = normalizeWebhookPayload(payload);
  const eventKey = crypto.createHash('sha256').update([
    normalized.objectType,
    normalized.objectId,
    normalized.aspectType,
    normalized.ownerId,
    normalized.eventTime
  ].join(':')).digest('hex');

  await JobModel.updateOne(
    { eventKey },
    {
      $setOnInsert: {
        eventKey,
        ...normalized,
        status: 'pending',
        retryAt: new Date(),
        expiresAt: new Date(Date.now() + WEBHOOK_TTL_MS)
      }
    },
    { upsert: true }
  );
  return { eventKey };
}

async function processWebhookEvents({
  limit = 50,
  now = new Date(),
  JobModel = StravaWebhookEvent,
  disconnectByAthleteId = stravaService.disconnectByAthleteId
} = {}) {
  const staleBefore = new Date(now.getTime() - WEBHOOK_JOB_LEASE_MS);
  const recovery = await JobModel.updateMany(
    {
      status: 'processing',
      $or: [{ lockedAt: { $lte: staleBefore } }, { lockedAt: null }, { lockedAt: { $exists: false } }],
      expiresAt: { $gt: now }
    },
    { $set: { status: 'failed', retryAt: now, lockedAt: null, lastErrorCode: 'processing_lease_expired' } }
  );
  await JobModel.deleteMany({ expiresAt: { $lte: now } });

  const result = {
    processed: 0,
    completed: 0,
    failed: 0,
    exhausted: 0,
    recovered: Number(recovery.modifiedCount || 0)
  };
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);
  for (let index = 0; index < safeLimit; index += 1) {
    const job = await JobModel.findOneAndUpdate(
      {
        status: { $in: ['pending', 'failed'] },
        attempts: { $lt: WEBHOOK_JOB_MAX_ATTEMPTS },
        retryAt: { $lte: now },
        expiresAt: { $gt: now }
      },
      { $set: { status: 'processing', lockedAt: now } },
      { sort: { createdAt: 1, _id: 1 }, new: true }
    );
    if (!job) break;
    result.processed += 1;
    try {
      if (job.objectType === 'athlete' && job.aspectType === 'update' && job.authorized === false) {
        await disconnectByAthleteId(job.ownerId || job.objectId);
      }
      // Activities are deliberately not cached. Create/update/delete therefore require no
      // fetch or local mutation, which also prevents a webhook from entering official flows.
      await job.deleteOne();
      result.completed += 1;
    } catch (error) {
      job.attempts += 1;
      job.lastErrorCode = String(error.code || error.status || 'webhook_processing_failed').slice(0, 80);
      job.lockedAt = null;
      if (job.attempts >= WEBHOOK_JOB_MAX_ATTEMPTS) {
        job.status = 'exhausted';
        result.exhausted += 1;
      } else {
        job.status = 'failed';
        job.retryAt = new Date(now.getTime() + Math.min(60 * 60 * 1000, 30_000 * (2 ** job.attempts)));
        result.failed += 1;
      }
      await job.save();
    }
  }
  return result;
}

function normalizeWebhookPayload(payload) {
  const objectType = String(payload.object_type || '').trim().toLowerCase();
  const aspectType = String(payload.aspect_type || '').trim().toLowerCase();
  const ownerId = Number(payload.owner_id || 0);
  const objectId = Number(payload.object_id || 0);
  const eventTime = Number(payload.event_time || 0);
  if (!['athlete', 'activity'].includes(objectType) || !['create', 'update', 'delete'].includes(aspectType)) {
    throw new Error('Unsupported Strava webhook event.');
  }
  if (!Number.isSafeInteger(ownerId) || ownerId <= 0 || !Number.isSafeInteger(objectId) || objectId <= 0 || !Number.isSafeInteger(eventTime) || eventTime <= 0) {
    throw new Error('Invalid Strava webhook event.');
  }
  const authorized = objectType === 'athlete' && aspectType === 'update'
    ? payload.updates?.authorized !== false
    : null;
  return { objectType, aspectType, ownerId, objectId, eventTime, authorized };
}

function safeEqual(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function boundedString(value, maxLength) {
  const text = typeof value === 'string' ? value : '';
  return text.length <= maxLength ? text : '';
}

module.exports = {
  verifyChallenge,
  enqueueWebhookEvent,
  processWebhookEvents,
  _private: {
    WEBHOOK_JOB_LEASE_MS,
    WEBHOOK_JOB_MAX_ATTEMPTS,
    normalizeWebhookPayload,
    safeEqual,
    boundedString
  }
};
