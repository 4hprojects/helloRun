'use strict';

// DB-free regression test for the public event-details page (`GET /events/:slug`).
//
// History: a signed-out visitor has `res.locals.user === null`. getEventDetails
// calls `isOwnOrganizerEvent(res.locals.user, event)`, and the util's default
// parameter only guarded `undefined`, so `null` reached `user.role` and threw —
// 500ing the page for every guest on every event (fixed in b70b50d).
//
// This test drives the real controller with a guest request. The heavy barrel
// (`_shared`, Mongo models, DB-backed services) is stubbed in the require cache
// BEFORE the controller loads, so nothing touches a database. The pieces central
// to the bug stay REAL: `utils/workspace` (isOwnOrganizerEvent) and
// `utils/event-public-view` (buildPublicEventView). Before the fix this test
// throws inside getEventDetails and the assertions below fail.

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

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

function buildMockEvent() {
  return {
    _id: 'event-1',
    slug: 'move-more-challenge-2026',
    title: 'Move More Challenge 2026',
    organiserName: 'CNS',
    organizerId: 'organizer-9',
    eventType: 'virtual',
    virtualCompletionMode: 'single_activity',
    raceDistances: ['5K'],
    registrationOpenAt: '2026-01-01T00:00:00.000Z',
    registrationCloseAt: '2026-12-31T00:00:00.000Z',
    eventStartAt: '2026-02-01T00:00:00.000Z',
    eventEndAt: '2026-02-28T00:00:00.000Z',
    eventDetailsMarkdown: '## Welcome\nRun with us.'
  };
}

// --- Stub the barrel and DB-backed services (must happen before the require) ---
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
  // Keep the view builders REAL — they are part of the render path under test.
  buildPublicEventView,
  buildPublicEventSeo,
  renderEventDetailsContent,
  logger: { warn() {}, error() {}, info() {} }
});
stub('../src/services/public-event-detail.service', {
  getPublicEventRunnerState: async () => null
});
stub('../src/services/event-contact-protection.service', {
  getContactCooldown: async () => null,
  startContactCooldown: async () => {},
  acquireContactSendLock: async () => ({ release: async () => {} })
});

const eventController = require('../src/controllers/page/event.controller');

function createGuestReqRes() {
  const captured = {};
  const req = { params: { slug: 'move-more-challenge-2026' }, session: {}, get: () => '' };
  const res = {
    locals: { user: null }, // signed-out visitor
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    render(view, options) { captured.view = view; captured.options = options; return this; }
  };
  return { req, res, captured };
}

test('getEventDetails renders the event page for a signed-out visitor without throwing', async () => {
  const { req, res, captured } = createGuestReqRes();

  await assert.doesNotReject(() => eventController.getEventDetails(req, res));

  assert.equal(res.statusCode, 200);
  assert.equal(captured.view, 'pages/event-details');
  assert.equal(captured.options.ownEventParticipationConflict, false);
  assert.equal(captured.options.event.slug, 'move-more-challenge-2026');
  // Runner-specific state must be absent for a guest.
  assert.equal(captured.options.runnerEventState, null);
});
