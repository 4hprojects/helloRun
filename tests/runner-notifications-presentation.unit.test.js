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

  const terms = buildNotificationPresentation({ type: 'terms_policy_updated', message: 'Version 1.2 is effective.', href: '/terms#terms-changes' });
  assert.equal(terms.category, 'Account and policy');
  assert.equal(terms.actionLabel, 'Review terms');

  const privacy = buildNotificationPresentation({ type: 'privacy_policy_updated', message: 'Version 1.5 is effective.', href: '/privacy#policy-changes' });
  assert.equal(privacy.category, 'Account and policy');
  assert.equal(privacy.actionLabel, 'Review privacy policy');

  const dataUsage = buildNotificationPresentation({ type: 'data_usage_policy_updated', message: 'Version 1.2 is effective.', href: '/data-usage-policy#policy-changes' });
  assert.equal(dataUsage.category, 'Account and policy');
  assert.equal(dataUsage.actionLabel, 'Review data use');

  const acceptableUse = buildNotificationPresentation({ type: 'acceptable_use_policy_updated', message: 'Version 1.1 is effective.', href: '/acceptable-use-policy#policy-changes' });
  assert.equal(acceptableUse.category, 'Account and policy');
  assert.equal(acceptableUse.actionLabel, 'Review acceptable use');

  const organiserTerms = buildNotificationPresentation({ type: 'organiser_terms_updated', message: 'Version 1.1 is effective.', href: '/organiser-terms#policy-changes' });
  assert.equal(organiserTerms.category, 'Account and policy');
  assert.equal(organiserTerms.actionLabel, 'Review organiser terms');

  const communityGuidelines = buildNotificationPresentation({ type: 'community_guidelines_updated', message: 'Version 1.1 is effective.', href: '/community-guidelines#policy-changes' });
  assert.equal(communityGuidelines.category, 'Account and policy');
  assert.equal(communityGuidelines.actionLabel, 'Review community guidelines');

  const refundPolicy = buildNotificationPresentation({ type: 'refund_policy_updated', message: 'Version 1.1 is effective.', href: '/refund-and-cancellation-policy#policy-changes' });
  assert.equal(refundPolicy.category, 'Account and policy');
  assert.equal(refundPolicy.actionLabel, 'Review refund policy');

  const cookiePolicy = buildNotificationPresentation({ type: 'cookie_policy_updated', message: 'Version 1.1 is effective.', href: '/cookie-policy#policy-changes' });
  assert.equal(cookiePolicy.category, 'Account and policy');
  assert.equal(cookiePolicy.actionLabel, 'Review cookie policy');

  const deletedGroup = buildNotificationPresentation({
    type: 'running_group_deleted',
    message: 'A running group was permanently removed.',
    href: '/runner/groups'
  });
  assert.equal(deletedGroup.category, 'Community');
  assert.equal(deletedGroup.tone, 'attention');
  assert.equal(deletedGroup.actionLabel, 'Browse groups');

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
