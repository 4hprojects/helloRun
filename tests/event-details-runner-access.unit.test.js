'use strict';

// DB-free regression test for runner-access gating on the public event-details page.
//
// History: `/events/:slug/register` is behind `requireRunnerWorkspace`, which admits
// only runners and verified, unrestricted organisers. Admin accounts are excluded by
// design, but the event page built `primaryCta` from registration state alone, so an
// admin saw a live "Register Now" button and landed on a hard 403 error page.
//
// This test drives the real controller with signed-in viewers of each kind. The heavy
// barrel (`_shared`, Mongo models, DB-backed services) is stubbed in the require cache
// BEFORE the controller loads, so nothing touches a database. `utils/event-public-view`
// stays REAL so the CTA under test is the one the page actually renders.

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

// Chainable Mongoose-style query stub that always resolves to an empty list.
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
    slug: 'cns-move-more-challenge-2026',
    title: 'CNS Move More Challenge 2026',
    organiserName: 'CNS',
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
  getPublicEventRunnerState: async () => ({ primaryAction: { label: 'Submit proof', href: '/runner/submissions' } }),
  getPublicEventRegistrationSummary: async () => null
});
stub('../src/services/event-contact-protection.service', {
  getContactCooldown: async () => null,
  startContactCooldown: async () => {},
  acquireContactSendLock: async () => ({ release: async () => {} })
});

const eventController = require('../src/controllers/page/event.controller');

// Mirrors what populateAuthLocals puts on res.locals for a signed-in viewer.
async function renderFor(locals) {
  const captured = {};
  const req = { params: { slug: 'cns-move-more-challenge-2026' }, session: { userId: 'user-1' }, get: () => '' };
  const res = {
    locals,
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    render(view, options) { captured.view = view; captured.options = options; return this; }
  };
  await eventController.getEventDetails(req, res);
  return { res, captured };
}

const adminLocals = () => ({
  isAuthenticated: true,
  canUseRunnerWorkspace: false,
  user: { _id: 'user-1', role: 'admin', emailVerified: true, accountStatus: 'active' }
});

test('admin viewers get a disabled CTA and an explanation instead of a 403 dead end', async () => {
  const { res, captured } = await renderFor(adminLocals());

  assert.equal(res.statusCode, 200);
  assert.equal(captured.view, 'pages/event-details');
  assert.equal(captured.options.publicEvent.primaryCta.disabled, true);
  assert.equal(captured.options.publicEvent.primaryCta.href, '');
  assert.match(captured.options.runnerAccessNotice.title, /admin/i);
  assert.equal(captured.options.runnerAccessNotice.actionHref, '/admin/dashboard');
  // Runner-workspace actions all 403 for this account, so the runner card stays hidden.
  assert.equal(captured.options.runnerEventState, null);
});

test('unverified organizers are pointed at email verification', async () => {
  const { captured } = await renderFor({
    isAuthenticated: true,
    canUseRunnerWorkspace: false,
    user: { _id: 'user-1', role: 'organiser', emailVerified: false, accountStatus: 'active' }
  });

  assert.equal(captured.options.publicEvent.primaryCta.disabled, true);
  assert.equal(captured.options.runnerAccessNotice.actionHref, '/resend-verification');
});

test('restricted accounts are pointed at support', async () => {
  const { captured } = await renderFor({
    isAuthenticated: true,
    canUseRunnerWorkspace: false,
    user: { _id: 'user-1', role: 'organiser', emailVerified: true, accountStatus: 'restricted' }
  });

  assert.equal(captured.options.publicEvent.primaryCta.disabled, true);
  assert.equal(captured.options.runnerAccessNotice.actionHref, '/contact');
});

test('runner-capable viewers keep the working register CTA', async () => {
  const { captured } = await renderFor({
    isAuthenticated: true,
    canUseRunnerWorkspace: true,
    user: { _id: 'user-1', role: 'runner', emailVerified: true, accountStatus: 'active' }
  });

  assert.equal(captured.options.runnerAccessNotice, null);
  assert.equal(captured.options.publicEvent.primaryCta.disabled, false);
  assert.equal(captured.options.publicEvent.primaryCta.href, '/events/cns-move-more-challenge-2026/register');
  assert.notEqual(captured.options.runnerEventState, null);
});

test('signed-out visitors are never shown the restriction notice', async () => {
  const captured = {};
  const req = { params: { slug: 'cns-move-more-challenge-2026' }, session: {}, get: () => '' };
  const res = {
    locals: { user: null },
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    render(view, options) { captured.view = view; captured.options = options; return this; }
  };

  await eventController.getEventDetails(req, res);

  assert.equal(captured.options.runnerAccessNotice, null);
  assert.equal(captured.options.publicEvent.primaryCta.disabled, false);
});
