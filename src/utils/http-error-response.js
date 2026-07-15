const STATUS_TITLES = Object.freeze({
  403: 'Access restricted',
  404: 'Page not found',
  429: 'Please slow down',
  500: 'Something went wrong',
  503: 'Service temporarily unavailable'
});

function prefersJson(req) {
  const accept = String(req?.get?.('accept') || req?.headers?.accept || '').toLowerCase();
  if (accept.includes('application/json') && !accept.includes('text/html')) return true;
  if (accept.includes('text/html')) return false;
  return Boolean(req?.xhr || String(req?.path || '').startsWith('/api/'));
}

function safeLocalPath(value, fallback = '/') {
  const candidate = String(value || '').trim();
  if (!candidate.startsWith('/') || candidate.startsWith('//') || candidate.includes('\\')) {
    return fallback;
  }
  return candidate;
}

function defaultRecovery(req, status) {
  const path = String(req?.path || req?.originalUrl || '');
  if (path.startsWith('/admin')) return { href: '/admin/dashboard', label: 'Return to Admin Dashboard' };
  if (path.startsWith('/organizer')) return { href: '/organizer/dashboard', label: 'Return to Organizer Dashboard' };
  if (path.startsWith('/runner') || path.startsWith('/my-')) return { href: '/runner/dashboard', label: 'Return to Dashboard' };
  if (status === 429 || status === 503) return { href: safeLocalPath(path, '/'), label: 'Try This Page Again' };
  return { href: '/', label: 'Go to Homepage' };
}

function sendHttpError(req, res, options = {}) {
  const status = Number(options.status) || 500;
  const message = options.message || 'An unexpected error occurred. Please try again.';
  const detail = options.detail || '';
  const recovery = defaultRecovery(req, status);
  const actionHref = safeLocalPath(options.actionHref, recovery.href);
  const actionLabel = options.actionLabel || recovery.label;
  const retryable = options.retryable === true;

  res.set('Cache-Control', 'no-store');

  if (prefersJson(req)) {
    return res.status(status).json({
      success: false,
      message,
      status,
      retryable
    });
  }

  return res.status(status).render('error', {
    title: options.title || `${status} - ${STATUS_TITLES[status] || 'Request Error'}`,
    status,
    heading: options.heading || STATUS_TITLES[status] || 'Request error',
    message,
    detail,
    actionHref,
    actionLabel,
    retryable
  });
}

module.exports = {
  sendHttpError,
  prefersJson,
  safeLocalPath,
  defaultRecovery
};
