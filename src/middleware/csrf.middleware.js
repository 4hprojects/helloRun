const crypto = require('crypto');

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
  const enforceCsrf = process.env.NODE_ENV === 'production' || process.env.CSRF_PROTECTION === '1';
  if (!enforceCsrf) {
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

  if (!sessionToken || !token || sessionToken !== token) {
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
  requireCsrfProtection
};
