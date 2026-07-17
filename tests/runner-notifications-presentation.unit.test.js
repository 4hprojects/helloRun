const test = require('node:test');
const assert = require('node:assert/strict');

const {
  normalizeNotificationView,
  buildNotificationListUrl,
  buildNotificationPresentation,
  sanitizeNotificationHref
} = require('../src/services/notification.service');

test('notification views normalize legacy and invalid values deterministically', () => {
  assert.equal(normalizeNotificationView('unread'), 'unread');
  assert.equal(normalizeNotificationView('archived'), 'archived');
  assert.equal(normalizeNotificationView('nonsense'), 'all');
  assert.equal(normalizeNotificationView('archived', '1'), 'unread');
  assert.equal(buildNotificationListUrl('all', 1), '/runner/notifications');
  assert.equal(buildNotificationListUrl('unread', 3), '/runner/notifications?view=unread&page=3');
  assert.equal(buildNotificationListUrl('invalid', -2), '/runner/notifications');
});

test('runner-facing notification presentation maps actions without exposing raw types', () => {
  const rejectedPayment = buildNotificationPresentation({
    type: 'payment_rejected',
    message: 'Your receipt needs a clearer image.',
    href: '/my-registrations?focus=payment'
  });
  assert.equal(rejectedPayment.category, 'Payment');
  assert.equal(rejectedPayment.actionLabel, 'Fix payment');
  assert.equal(rejectedPayment.tone, 'attention');

  const certificate = buildNotificationPresentation({
    type: 'certificate_issued',
    message: 'Your certificate is ready.',
    href: '/runner/submissions/abc'
  });
  assert.equal(certificate.category, 'Recognition');
  assert.equal(certificate.actionLabel, 'Download certificate');

  const unknown = buildNotificationPresentation({
    type: 'future_notification_type',
    message: `${'A'.repeat(170)}   with spacing`,
    href: '/runner/dashboard'
  });
  assert.equal(unknown.category, 'HelloRun update');
  assert.equal(unknown.actionLabel, 'View update');
  assert.ok(unknown.preview.length <= 150);
  assert.match(unknown.preview, /…$/);
});

test('notification destinations accept only same-site relative paths', () => {
  assert.equal(sanitizeNotificationHref('/events/summer-run?tab=details#rules'), '/events/summer-run?tab=details#rules');
  assert.equal(sanitizeNotificationHref('https://evil.example/phish'), '');
  assert.equal(sanitizeNotificationHref('//evil.example/phish'), '');
  assert.equal(sanitizeNotificationHref('/\\evil.example'), '');
  assert.equal(sanitizeNotificationHref('/runner/dashboard\nLocation: https://evil.example'), '');

  const unsafe = buildNotificationPresentation({
    type: 'result_rejected',
    message: 'Review this update.',
    href: 'javascript:alert(1)'
  });
  assert.equal(unsafe.href, '');
  assert.equal(unsafe.actionLabel, '');
});
