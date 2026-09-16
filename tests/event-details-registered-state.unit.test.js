'use strict';

// DB-free regression test for the "already registered" state on the public event page
// (`GET /events/:slug`).
//
// History: `primaryCta` was built from registration-window state alone. Accumulated
// challenges had a runner-progress card, but every other format (race-result, single
// activity, onsite) showed a registered runner a live "Register Now" button. Clicking it
// loaded the registration form, which then refused the duplicate — the runner only
// learned their real state one page too late.
//
// The barrel and DB-backed services are stubbed in the require cache BEFORE the
// controller loads, so nothing touches a database. `utils/event-public-view` stays REAL
// so the CTA asserted below is the one the page actually renders.

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildPublicEventView,
  buildPublicEventSeo,
  renderEventDetailsContent
} = require('../src/utils/event-public-view');

const stub = (relPath, exports) => {
  const filename = require.resolve(relPath);
  require.cache[filename] = { id: filename, filename, loaded: true, exports };
};

const emptyQuery = () => {
  const q = {};
  ['select', 'sort', 'limit'].forEach((m) => { q[m] = () => q; });
  q.lean = async () => [];
  return q;
};

// Dates are relative so the registration window stays open as the test ages.
const DAY_MS = 24 * 60 * 60 * 1000;
const daysFromNow = (days) => new Date(Date.now() + days * DAY_MS).toISOString();

function buildMockEvent() {
  return {
    _id: 'event-1',
    slug: 'september-active-run-2026',
    title: 'September Active Run 2026',
    organiserName: 'HelloRun',
    organizerId: 'organizer-9',
    eventType: 'virtual',
    virtualCompletionMode: 'single_activity',
    raceDistances: ['5K'],
    registrationOpenAt: daysFromNow(-30),
    registrationCloseAt: daysFromNow(30),
    eventStartAt: daysFromNow(-7),
    eventEndAt: daysFromNow(60),
    eventDetailsMarkdown: '## Welcome\nRun with us.'
  };
}

// Swapped per test to represent "this runner has / has not registered".
let registrationSummary = null;

stub('../src/controllers/page/_shared', {
  getPublishedEventBySlug: async () => buildMockEvent(),
  renderEventNotFound: (res) => res.status(404).render('error', {}),
  Registration: { countDocuments: async () => 0 },
  User: { findById: () => ({ select: () => ({ lean: async () => null }) }) },
  Event: { find: () => emptyQuery() },
  getEventBadgesByMongoEventId: async () => [],
  listProductsByMongoEventId: async () => [],
  getPublicEventVisibilityQuery: () => ({}),
  getEventCardDisplayState: () => ({}),
  getSitemapBaseUrl: () => 'https://hellorun.test',
  getCountryName: (code) => code,
  // Keep the view builders REAL — they produce the CTA under test.
  buildPublicEventView,
  buildPublicEventSeo,
  renderEventDetailsContent,
  logger: { warn() {}, error() {}, info() {} }
});
stub('../src/services/public-event-detail.service', {
  // Non-accumulated event: the accumulated runner card never applies here.
  getPublicEventRunnerState: async () => null,
  getPublicEventRegistrationSummary: async () => registrationSummary
});
stub('../src/services/event-contact-protection.service', {
  getContactCooldown: async () => null,
  startContactCooldown: async () => {},
  acquireContactSendLock: async () => ({ release: async () => {} })
});

const eventController = require('../src/controllers/page/event.controller');

const runnerLocals = () => ({
  isAuthenticated: true,
  canUseRunnerWorkspace: true,
  user: { _id: 'user-1', role: 'runner', emailVerified: true, accountStatus: 'active' }
});

async function renderFor(locals) {
  const captured = {};
  const req = { params: { slug: 'september-active-run-2026' }, session: { userId: 'user-1' }, get: () => '' };
  const res = {
    locals,
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    render(view, options) { captured.view = view; captured.options = options; return this; }
  };
  await eventController.getEventDetails(req, res);
  return { res, captured };
}

test('a registered runner sees their registration instead of a live Register CTA', async () => {
  registrationSummary = {
    registrationId: 'registration-1',
    confirmationCode: 'HR-ABC123',
    awaitingPayment: false,
    ctaLabel: 'You are registered',
    title: 'You are already registered',
    message: 'Your 5K place is saved.',
    actionLabel: 'View My Registration',
    actionHref: '/my-registrations'
  };

  const { res, captured } = await renderFor(runnerLocals());

  assert.equal(res.statusCode, 200);
  assert.equal(captured.view, 'pages/event-details');
  assert.equal(captured.options.publicEvent.primaryCta.disabled, true);
  assert.equal(captured.options.publicEvent.primaryCta.label, 'You are registered');
  // A disabled CTA also withdraws the guest-registration link, which would otherwise
  // offer a second, duplicate place on the same event.
  assert.equal(captured.options.publicEvent.primaryCta.href, '');
  assert.equal(captured.options.existingRegistration.confirmationCode, 'HR-ABC123');
  assert.equal(captured.options.existingRegistration.actionHref, '/my-registrations');
});

test('an unpaid registration surfaces payment rather than registration', async () => {
  registrationSummary = {
    registrationId: 'registration-1',
    confirmationCode: 'HR-ABC123',
    awaitingPayment: true,
    ctaLabel: 'Payment pending',
    title: 'Your registration needs payment',
    message: 'Complete payment to confirm your place.',
    actionLabel: 'Complete Payment',
    actionHref: '/my-registrations'
  };

  const { captured } = await renderFor(runnerLocals());

  assert.equal(captured.options.publicEvent.primaryCta.disabled, true);
  assert.equal(captured.options.publicEvent.primaryCta.label, 'Payment pending');
  assert.equal(captured.options.existingRegistration.actionLabel, 'Complete Payment');
});

test('a runner who has not registered keeps the working Register CTA', async () => {
  registrationSummary = null;

  const { captured } = await renderFor(runnerLocals());

  assert.equal(captured.options.existingRegistration, null);
  assert.equal(captured.options.publicEvent.primaryCta.disabled, false);
  assert.equal(captured.options.publicEvent.primaryCta.href, '/events/september-active-run-2026/register');
});

test('the restriction notice outranks a stale registration summary', async () => {
  registrationSummary = {
    confirmationCode: 'HR-ABC123',
    awaitingPayment: false,
    ctaLabel: 'You are registered',
    title: 'You are already registered',
    message: 'Your 5K place is saved.',
    actionLabel: 'View My Registration',
    actionHref: '/my-registrations'
  };

  const { captured } = await renderFor({
    isAuthenticated: true,
    canUseRunnerWorkspace: false,
    user: { _id: 'user-1', role: 'admin', emailVerified: true, accountStatus: 'active' }
  });

  assert.notEqual(captured.options.runnerAccessNotice, null);
  assert.equal(captured.options.existingRegistration, null);
  assert.equal(captured.options.publicEvent.primaryCta.label, 'Registration not available');
});
