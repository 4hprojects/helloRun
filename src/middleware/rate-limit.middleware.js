const { getRedisClient } = require('../config/redis');

// In-memory fallback store (used when Redis is not configured or unavailable)
const buckets = new Map();

function inMemoryCheck(key, safeWindowMs, safeMaxRequests) {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || now - existing.start > safeWindowMs) {
    buckets.set(key, { start: now, count: 1 });
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
        console.error('Rate limiter Redis error (falling back to in-memory):', err.message);
        ({ allowed } = inMemoryCheck(rawKey, safeWindowMs, safeMaxRequests));
      }
    } else {
      ({ allowed } = inMemoryCheck(rawKey, safeWindowMs, safeMaxRequests));
    }

    if (!allowed) {
      if (req.headers.accept && req.headers.accept.includes('application/json')) {
        res.status(429).json({ success: false, message: safeMessage });
        return;
      }
      res.status(429).send(safeMessage);
      return;
    }

    next();
  };
}

module.exports = {
  createRateLimiter
};
