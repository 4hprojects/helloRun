'use strict';

const ADMIN_EVENTS_ORIGIN = 'http://hellorun.local';
const ADMIN_EVENT_QUEUE_PARAMS = new Set([
  'q', 'status', 'eventType', 'perPage', 'page', 'testData', 'deleted', 'needsReview'
]);

function normalizeAdminEventsReturnTo(value) {
  const path = String(value || '').trim();
  if (!path || path.length > 1200 || path.startsWith('//') || /[\r\n#]/.test(path)) return '';
  if (!/^\/admin\/events(?:\?[^#]*)?$/.test(path)) return '';

  try {
    const parsed = new URL(path, ADMIN_EVENTS_ORIGIN);
    if (parsed.origin !== ADMIN_EVENTS_ORIGIN || parsed.pathname !== '/admin/events') return '';

    const queueParams = new URLSearchParams();
    parsed.searchParams.forEach((paramValue, paramName) => {
      if (ADMIN_EVENT_QUEUE_PARAMS.has(paramName)) queueParams.append(paramName, paramValue);
    });
    const query = queueParams.toString();
    return parsed.pathname + (query ? `?${query}` : '');
  } catch (_error) {
    return '';
  }
}

function appendAdminEditMessage(pathname, type, message) {
  const safePath = normalizeAdminEventsReturnTo(pathname) || '/admin/events';
  const parsed = new URL(safePath, ADMIN_EVENTS_ORIGIN);
  parsed.searchParams.set('type', String(type || 'info'));
  parsed.searchParams.set('msg', String(message || ''));
  return parsed.pathname + `?${parsed.searchParams.toString()}`;
}

module.exports = {
  normalizeAdminEventsReturnTo,
  appendAdminEditMessage
};
