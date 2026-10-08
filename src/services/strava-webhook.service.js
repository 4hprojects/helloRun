'use strict';

const crypto = require('crypto');
const StravaWebhookEvent = require('../models/StravaWebhookEvent');
const stravaService = require('./strava.service');

const WEBHOOK_TTL_MS = 24 * 60 * 60 * 1000;

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

async function enqueueWebhookEvent(payload = {}) {
  const normalized = normalizeWebhookPayload(payload);
  const eventKey = crypto.createHash('sha256').update([
    normalized.objectType,
    normalized.objectId,
    normalized.aspectType,
    normalized.ownerId,
    normalized.eventTime
  ].join(':')).digest('hex');

  await StravaWebhookEvent.updateOne(
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

async function processWebhookEvents({ limit = 50, now = new Date() } = {}) {
  const jobs = await StravaWebhookEvent.find({
    status: { $in: ['pending', 'failed'] },
    retryAt: { $lte: now },
    expiresAt: { $gt: now }
  }).sort({ createdAt: 1 }).limit(Math.min(Math.max(Number(limit) || 50, 1), 100));
  const result = { processed: 0, completed: 0, failed: 0 };
  for (const job of jobs) {
    result.processed += 1;
    job.status = 'processing';
    await job.save();
    try {
      if (job.objectType === 'athlete' && job.aspectType === 'update' && job.authorized === false) {
        await stravaService.disconnectByAthleteId(job.ownerId || job.objectId);
      }
      // Activities are deliberately not cached. Create/update/delete therefore require no
      // fetch or local mutation, which also prevents a webhook from entering official flows.
      await job.deleteOne();
      result.completed += 1;
    } catch (error) {
      job.attempts += 1;
      job.status = 'failed';
      job.retryAt = new Date(Date.now() + Math.min(60 * 60 * 1000, 30_000 * (2 ** job.attempts)));
      await job.save();
      result.failed += 1;
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
  _private: { normalizeWebhookPayload, safeEqual, boundedString }
};
