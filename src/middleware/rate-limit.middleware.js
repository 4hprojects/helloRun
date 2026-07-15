const { getRedisClient } = require('../config/redis');
const logger = require('../utils/logger');
const { sendHttpError } = require('../utils/http-error-response');

// In-memory fallback store (used when Redis is not configured or unavailable).
// Keys are path|user|ip, so under real traffic the Map accumulates one entry per
// unique visitor forever unless pruned — a slow leak and a cheap memory-exhaustion
// vector. Expired buckets are swept lazily; a hard cap evicts oldest-first
// (Map preserves insertion order) if the sweep alone can't hold the line.
const buckets = new Map();
const MAX_BUCKETS = 50_000;
const SWEEP_INTERVAL_MS = 60_000;
let nextSweepAt = Date.now() + SWEEP_INTERVAL_MS;

function sweepExpiredBuckets(now) {
  for (const [key, bucket] of buckets) {
    if (now - bucket.start > bucket.windowMs) {
      buckets.delete(key);
    }
  }
}

function inMemoryCheck(key, safeWindowMs, safeMaxRequests) {
  const now = Date.now();

  if (now >= nextSweepAt) {
    nextSweepAt = now + SWEEP_INTERVAL_MS;
    sweepExpiredBuckets(now);
  }

  const existing = buckets.get(key);

  if (!existing || now - existing.start > existing.windowMs) {
    if (!existing && buckets.size >= MAX_BUCKETS) {
      sweepExpiredBuckets(now);
      while (buckets.size >= MAX_BUCKETS) {
        const oldestKey = buckets.keys().next().value;
        buckets.delete(oldestKey);
      }
    }
    buckets.set(key, { start: now, count: 1, windowMs: safeWindowMs });
    return { allowed: true, count: 1 };
  }

  existing.count += 1;
  return { allowed: existing.count <= safeMaxRequests, count: existing.count };
}

async function redisCheck(redis, key, safeWindowMs, safeMaxRequests) {
  const count = await redis.incr(key);
  if (count === 1) {
    // Set the expiry only on the first request in the window so the window is fixed
    await redis.pexpire(key, safeWindowMs);
  }
  return { allowed: count <= safeMaxRequests, count };
}

function createRateLimiter({ windowMs, maxRequests, message, keyFn }) {
  const safeWindowMs = Number(windowMs) > 0 ? Number(windowMs) : 60_000;
  const safeMaxRequests = Number(maxRequests) > 0 ? Number(maxRequests) : 30;
  const safeMessage = message || 'Too many requests. Please try again later.';

  return async function rateLimitMiddleware(req, res, next) {
    let rawKey;
    if (typeof keyFn === 'function') {
      rawKey = String(keyFn(req));
    } else {
      const sessionPart = req.session?.userId ? String(req.session.userId) : 'anon';
      rawKey = `${req.path}|${sessionPart}|${req.ip || 'unknown-ip'}`;
    }

    let allowed = true;
    const redis = getRedisClient();

    if (redis && redis.status === 'ready') {
      try {
        const redisKey = `rl:${rawKey}`;
        ({ allowed } = await redisCheck(redis, redisKey, safeWindowMs, safeMaxRequests));
      } catch (err) {
        // Redis unavailable — fall back to in-memory silently
        logger.error('Rate limiter Redis error (falling back to in-memory):', err.message);
        ({ allowed } = inMemoryCheck(rawKey, safeWindowMs, safeMaxRequests));
      }
    } else {
      ({ allowed } = inMemoryCheck(rawKey, safeWindowMs, safeMaxRequests));
    }

    if (!allowed) {
      res.set('Retry-After', String(Math.max(1, Math.ceil(safeWindowMs / 1000))));
      return sendHttpError(req, res, {
        status: 429,
        message: safeMessage,
        detail: 'Wait a moment before trying again. If you submitted a form, check its current status before repeating the action.',
        retryable: true
      });
    }

    next();
  };
}

module.exports = {
  createRateLimiter,
  // Exposed for DB-free unit tests only
  _inMemory: { buckets, inMemoryCheck, sweepExpiredBuckets, MAX_BUCKETS }
};
