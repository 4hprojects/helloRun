const crypto = require('crypto');
const logger = require('../utils/logger');

// The CSRF_PROTECTION=0 kill-switch exists for the local test harness only.
// In production it is ignored (fail-safe): one stray env value must not be able
// to disable CSRF site-wide.
const isProduction = process.env.NODE_ENV === 'production';
const killSwitchSet = process.env.CSRF_PROTECTION === '0';
if (killSwitchSet && isProduction) {
  logger.warn('CSRF_PROTECTION=0 is set but ignored because NODE_ENV=production. CSRF protection stays ON.');
} else if (killSwitchSet) {
  logger.warn('CSRF protection is DISABLED (CSRF_PROTECTION=0). Only acceptable in local test runs.');
}

function tokensMatch(sessionToken, requestToken) {
  const a = Buffer.from(String(sessionToken));
  const b = Buffer.from(String(requestToken));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function getOrCreateCsrfToken(req) {
  if (!req.session) return '';
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  }
  return req.session.csrfToken;
}

function attachCsrfToken(req, res, next) {
  res.locals.csrfToken = getOrCreateCsrfToken(req);
  next();
}

function requireCsrfProtection(req, res, next) {
  // Default ON — the CSRF_PROTECTION=0 kill-switch only works outside production
  const skipCsrf = process.env.CSRF_PROTECTION === '0' && process.env.NODE_ENV !== 'production';
  if (skipCsrf) {
    return next();
  }

  const method = String(req.method || '').toUpperCase();
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    return next();
  }

  const sessionToken = req.session ? req.session.csrfToken : '';
  const bodyToken = req.body && typeof req.body._csrf === 'string' ? req.body._csrf : '';
  const headerToken = req.get('x-csrf-token') || '';
  const token = bodyToken || headerToken;

  if (!sessionToken || !token || !tokensMatch(sessionToken, token)) {
    if (req.path === '/logout') {
      return res.redirect('/login?type=error&message=Invalid+or+expired+security+token');
    }
    return res.status(403).render('error', {
      title: 'Forbidden',
      status: 403,
      message: 'Invalid or missing security token. Please refresh the page and try again.'
    });
  }

  return next();
}

module.exports = {
  attachCsrfToken,
  requireCsrfProtection,
  // Exposed for DB-free unit tests only
  _tokensMatch: tokensMatch
};
