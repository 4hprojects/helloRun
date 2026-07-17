'use strict';

const crypto = require('crypto');
const CommunicationLog = require('../models/CommunicationLog');
const { getRedisClient } = require('../config/redis');

const CONTACT_EVENT_KEY = 'organiser.runner_contact';
const CONTACT_COOLDOWN_MS = 10 * 60 * 1000;
const CONTACT_SEND_LOCK_MS = 60 * 1000;
const memoryCooldowns = new Map();
const memoryLocks = new Map();
let disableRedisForTests = false;

function buildScopeKey(userId, eventId) {
  return crypto
    .createHash('sha256')
    .update(`${String(userId || '')}|${String(eventId || '')}`)
    .digest('hex');
}

function getReadyRedis() {
  if (disableRedisForTests) return null;
  const redis = getRedisClient();
  return redis && redis.status === 'ready' ? redis : null;
}

function pruneMemory(nowMs = Date.now()) {
  for (const [key, expiresAt] of memoryCooldowns) {
    if (expiresAt <= nowMs) memoryCooldowns.delete(key);
  }
  for (const [key, entry] of memoryLocks) {
    if (!entry || entry.expiresAt <= nowMs) memoryLocks.delete(key);
  }
}

async function getContactCooldown({ userId, eventId, now = new Date() }) {
  if (!userId || !eventId) return null;
  const nowMs = now.getTime();
  const scopeKey = buildScopeKey(userId, eventId);
  pruneMemory(nowMs);

  const redis = getReadyRedis();
  if (redis) {
    try {
      const cached = Number(await redis.get(`event-contact:cooldown:${scopeKey}`));
      if (Number.isFinite(cached) && cached > nowMs) return buildCooldown(cached, nowMs);
    } catch (_) {
      // The durable communication-log check below remains authoritative.
    }
  }

  const memoryExpiry = Number(memoryCooldowns.get(scopeKey));
  if (Number.isFinite(memoryExpiry) && memoryExpiry > nowMs) {
    return buildCooldown(memoryExpiry, nowMs);
  }

  const cutoff = new Date(nowMs - CONTACT_COOLDOWN_MS);
  const recentLog = await CommunicationLog.findOne({
    eventKey: CONTACT_EVENT_KEY,
    channel: 'email',
    status: 'sent',
    'metadata.eventId': String(eventId),
    'metadata.senderUserId': String(userId),
    $or: [
      { sentAt: { $gte: cutoff } },
      { sentAt: null, createdAt: { $gte: cutoff } }
    ]
  })
    .sort({ sentAt: -1, createdAt: -1 })
    .select('sentAt createdAt')
    .lean();

  const sentAt = recentLog?.sentAt || recentLog?.createdAt;
  if (!sentAt) return null;
  const expiresAt = new Date(sentAt).getTime() + CONTACT_COOLDOWN_MS;
  if (!Number.isFinite(expiresAt) || expiresAt <= nowMs) return null;

  memoryCooldowns.set(scopeKey, expiresAt);
  return buildCooldown(expiresAt, nowMs);
}

async function startContactCooldown({ userId, eventId, now = new Date() }) {
  const nowMs = now.getTime();
  const expiresAt = nowMs + CONTACT_COOLDOWN_MS;
  const scopeKey = buildScopeKey(userId, eventId);
  memoryCooldowns.set(scopeKey, expiresAt);

  const redis = getReadyRedis();
  if (redis) {
    try {
      await redis.set(
        `event-contact:cooldown:${scopeKey}`,
        String(expiresAt),
        'PX',
        CONTACT_COOLDOWN_MS
      );
    } catch (_) {
      // The in-memory entry and successful communication log are fallbacks.
    }
  }

  return buildCooldown(expiresAt, nowMs);
}

async function acquireContactSendLock({ userId, eventId, now = new Date() }) {
  const nowMs = now.getTime();
  const scopeKey = buildScopeKey(userId, eventId);
  const redisKey = `event-contact:sending:${scopeKey}`;
  const token = crypto.randomBytes(16).toString('hex');
  pruneMemory(nowMs);

  const redis = getReadyRedis();
  if (redis) {
    try {
      const acquired = await redis.set(redisKey, token, 'PX', CONTACT_SEND_LOCK_MS, 'NX');
      if (acquired !== 'OK') throw buildContactConflict(nowMs);
      return {
        async release() {
          await redis.eval(
            'if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end',
            1,
            redisKey,
            token
          ).catch(() => {});
        }
      };
    } catch (error) {
      if (error?.code === 'CONTACT_SEND_IN_PROGRESS') throw error;
      // Fall through to the process-local lock if Redis is unavailable.
    }
  }

  const existing = memoryLocks.get(scopeKey);
  if (existing && existing.expiresAt > nowMs) throw buildContactConflict(nowMs);
  memoryLocks.set(scopeKey, { token, expiresAt: nowMs + CONTACT_SEND_LOCK_MS });

  return {
    async release() {
      if (memoryLocks.get(scopeKey)?.token === token) memoryLocks.delete(scopeKey);
    }
  };
}

function buildContactConflict(nowMs) {
  const error = new Error('Your message is already being sent. Please wait before trying again.');
  error.code = 'CONTACT_SEND_IN_PROGRESS';
  error.retryAt = new Date(nowMs + CONTACT_SEND_LOCK_MS);
  return error;
}

function buildCooldown(expiresAt, nowMs) {
  return {
    active: expiresAt > nowMs,
    retryAt: new Date(expiresAt),
    retryAfterSeconds: Math.max(1, Math.ceil((expiresAt - nowMs) / 1000))
  };
}

function __resetContactProtectionForTests() {
  memoryCooldowns.clear();
  memoryLocks.clear();
}

function __setDisableContactProtectionRedis(value) {
  disableRedisForTests = Boolean(value);
}

module.exports = {
  CONTACT_COOLDOWN_MS,
  CONTACT_SEND_LOCK_MS,
  getContactCooldown,
  startContactCooldown,
  acquireContactSendLock,
  __resetContactProtectionForTests,
  __setDisableContactProtectionRedis
};
