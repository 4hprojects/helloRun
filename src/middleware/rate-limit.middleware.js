const buckets = new Map();

function createRateLimiter({ windowMs, maxRequests, message }) {
  const safeWindowMs = Number(windowMs) > 0 ? Number(windowMs) : 60_000;
  const safeMaxRequests = Number(maxRequests) > 0 ? Number(maxRequests) : 30;
  const safeMessage = message || 'Too many requests. Please try again later.';

  return function rateLimitMiddleware(req, res, next) {
    const sessionPart = req.session?.userId ? String(req.session.userId) : 'anon';
    const key = `${req.path}|${sessionPart}|${req.ip || 'unknown-ip'}`;
    const now = Date.now();
    const existing = buckets.get(key);

    if (!existing || now - existing.start > safeWindowMs) {
      buckets.set(key, { start: now, count: 1 });
      next();
      return;
    }

    existing.count += 1;
    if (existing.count > safeMaxRequests) {
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
