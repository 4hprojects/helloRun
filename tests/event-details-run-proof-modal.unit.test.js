'use strict';

// DB-free test that the run-proof modal is loaded on the public event page exactly when the
// viewer can actually submit.
//
// History: event-details.ejs renders "Add activity" buttons carrying
// data-open-run-proof-modal (one even tagged data-run-proof-surface="event-detail"), but
// shouldRenderRunProofModal only matched /my-registrations and /runner/*, so neither the
// modal partial nor run-proof-modal.js ever loaded there. The buttons did nothing, for every
// role. Loading it by path would pull the modal, a stylesheet, Tesseract and six OCR scripts
// onto every public, SEO-indexed event page, so the controller sets it per viewer instead.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
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

const emptyQuery = () => {
  const q = {};
  ['select', 'sort', 'limit'].forEach((m) => { q[m] = () => q; });
  q.lean = async () => [];
  return q;
};

const buildMockEvent = () => ({
  _id: 'event-1',
  slug: 'move-more-challenge-2026',
  title: 'Move More Challenge 2026',
  organiserName: 'CNS',
  organizerId: 'organizer-9',
  eventType: 'virtual',
  virtualCompletionMode: 'accumulated_activity',
  raceDistances: ['50K'],
  registrationOpenAt: '2026-01-01T00:00:00.000Z',
  registrationCloseAt: '2026-12-31T00:00:00.000Z',
  eventStartAt: '2026-02-01T00:00:00.000Z',
  eventEndAt: '2026-12-28T00:00:00.000Z',
  eventDetailsMarkdown: '## Welcome'
});

let runnerStateToReturn = null;

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
  buildPublicEventView,
  buildPublicEventSeo,
  renderEventDetailsContent,
  logger: { warn() {}, error() {}, info() {} }
});
stub('../src/services/public-event-detail.service', {
  getPublicEventRunnerState: async () => runnerStateToReturn,
  getPublicEventRegistrationSummary: async () => null
});
stub('../src/services/event-contact-protection.service', {
  getContactCooldown: async () => null,
  startContactCooldown: async () => {},
  acquireContactSendLock: async () => ({ release: async () => {} })
});

const eventController = require('../src/controllers/page/event.controller');

function createReqRes(locals = {}) {
  const captured = {};
  const req = { params: { slug: 'move-more-challenge-2026' }, session: {}, get: () => '' };
  const res = {
    // renderRunProofModal defaults to false from the server middleware.
    locals: { user: null, renderRunProofModal: false, ...locals },
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    render(view, options) { captured.view = view; captured.options = options; return this; }
  };
  return { req, res, captured };
}

const participantLocals = {
  user: { _id: 'organizer-9', role: 'organiser', emailVerified: true },
  isAuthenticated: true,
  canUseRunnerWorkspace: true
};

test('a viewer with a submit action gets the modal loaded', async () => {
  runnerStateToReturn = {
    primaryAction: { type: 'submit', label: 'Add activity', registrationId: 'reg-1' },
    secondaryAction: { type: 'link', label: 'View achievements', href: '/runner/achievements' }
  };
  const { req, res } = createReqRes(participantLocals);
  await eventController.getEventDetails(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.locals.renderRunProofModal, true);
});

test('a resubmit action also loads the modal', async () => {
  runnerStateToReturn = {
    primaryAction: { type: 'link', label: 'View submissions', href: '/runner/submissions' },
    secondaryAction: { type: 'resubmit', label: 'Resubmit', registrationId: 'reg-1' }
  };
  const { req, res } = createReqRes(participantLocals);
  await eventController.getEventDetails(req, res);

  assert.equal(res.locals.renderRunProofModal, true);
});

test('a signed-out visitor never pays for the modal or the OCR bundle', async () => {
  runnerStateToReturn = null;
  const { req, res, captured } = createReqRes();
  await eventController.getEventDetails(req, res);

  assert.equal(res.locals.renderRunProofModal, false);
  assert.equal(captured.options.runnerEventState, null);
});

test('a participant with no submit action does not load the modal', async () => {
  runnerStateToReturn = {
    primaryAction: { type: 'link', label: 'View registration', href: '/my-registrations' },
    secondaryAction: null
  };
  const { req, res } = createReqRes(participantLocals);
  await eventController.getEventDetails(req, res);

  assert.equal(res.locals.renderRunProofModal, false);
});

test('a viewer who cannot use the runner workspace gets neither state nor modal', async () => {
  // An admin, or an unverified/restricted organiser: buildRunnerAccessNotice nulls the
  // runner state, so there is no submit action to load the modal for.
  runnerStateToReturn = {
    primaryAction: { type: 'submit', label: 'Add activity', registrationId: 'reg-1' },
    secondaryAction: null
  };
  const { req, res, captured } = createReqRes({
    user: { _id: 'admin-1', role: 'admin', emailVerified: true },
    isAuthenticated: true,
    canUseRunnerWorkspace: false
  });
  await eventController.getEventDetails(req, res);

  assert.equal(res.locals.renderRunProofModal, false);
  assert.equal(captured.options.runnerEventState, null);
  assert.match(captured.options.runnerAccessNotice.title, /signed in as an admin/i);
});

test('the modal treats runner-workspace eligibility, not the forced workspace flag, as auth', () => {
  // /events/:slug does not run requireRunnerWorkspace, so isRunnerWorkspace is false there.
  // Keying on it alone would bounce a signed-in participant to login.
  const modal = fs.readFileSync(path.join(__dirname, '..', 'src/views/partials/run-proof-modal.ejs'), 'utf8');
  assert.match(modal, /locals\.canUseRunnerWorkspace \|\| locals\.isRunnerWorkspace/);
});

test('the modal is still not loaded by path for public event pages', () => {
  // Loading it by path would put the OCR bundle on every indexed event page.
  const server = fs.readFileSync(path.join(__dirname, '..', 'src/server.js'), 'utf8');
  const fn = server.slice(server.indexOf('function shouldRenderRunProofModal'), server.indexOf('function shouldNoindexPath'));
  assert.doesNotMatch(fn, /events/);
  assert.match(fn, /\/my-registrations/);
});
