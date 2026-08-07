'use strict';

// Registration cancellation.
//
// `cancelled` and `refunded` were already valid statuses and downstream code reacted to
// them — submissions blocked, dashboard bucketing — but nothing ever set them. The app's
// own policy copy admitted there was no cancellation endpoint.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  CANCELLABLE_STATUSES
} = require('../src/services/registration-cancellation.service');

const ROOT = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const service = read('src/services/registration-cancellation.service.js');
const routes = read('src/routes/organiser/registrants.js');
const model = read('src/models/Registration.js');
const registry = read('src/services/communication-events.registry.js');
const rosterView = read('src/views/organizer/event-registrants.ejs');

test('only live registrations can be cancelled', () => {
  assert.deepEqual(CANCELLABLE_STATUSES, ['pending_payment', 'paid', 'confirmed']);
  // Cancelling an already-cancelled or refunded record must be refused, not repeated.
  assert.ok(!CANCELLABLE_STATUSES.includes('cancelled'));
  assert.ok(!CANCELLABLE_STATUSES.includes('refunded'));
  assert.match(service, /already cancelled/);
});

test('cancellation is scoped to the event the caller is authorised for', () => {
  // Organiser authority covers one event; it must not reach a registration in another.
  assert.match(service, /does not belong to this event/);
  assert.match(service, /String\(registration\.eventId\) !== String\(eventId\)/);
});

test('cancellation records who, when, and why', () => {
  assert.match(model, /cancelledAt/);
  assert.match(model, /cancelledBy/);
  assert.match(model, /cancellationReason/);
  // Optional fields, so existing registrations need no backfill.
  assert.match(model, /cancelledAt: \{\s*type: Date,\s*default: null/);
  assert.match(service, /action: 'registration\.cancelled'/);
});

test('cancelling frees the slot and releases the bib', () => {
  // save() rather than an atomic update, so the post-save hook syncs the new status to
  // the Postgres shadow; the capacity check counts confirmed rows, so the slot frees up.
  assert.match(service, /await registration\.save\(\)/);
  // Voiding is what lets the number be reissued — the live-bib index is partial on it.
  assert.match(service, /assignment_status = 'voided'/);
  assert.match(service, /check_in_status = 'cancelled'/);
});

test('a failed notification or onsite release cannot undo a recorded cancellation', () => {
  assert.match(service, /must not undo a recorded cancellation/);
  assert.match(service, /Best effort/);
  assert.match(service, /notifyRunnerInBackground/);
});

test('the runner is told, through a registered communication event', () => {
  assert.match(registry, /eventKey: 'registration\.cancelled'/);
  assert.match(registry, /recipientRoles: \['runner'\]/);
  assert.match(service, /notify\('registration\.cancelled'/);
});

test('the cancellation event has an email sender and a subject', () => {
  // sendEventEmail throws "No email sender registered" for an unknown key. Registering
  // the event without wiring a sender would log an error on every cancellation while
  // the registry advertised email as enabled.
  const communication = read('src/services/communication.service.js');
  const emailService = read('src/services/email.service.js');

  assert.match(communication, /eventKey === 'registration\.cancelled'/);
  assert.match(communication, /'registration\.cancelled': `Registration Cancelled/);
  assert.match(emailService, /sendRegistrationCancelledEmailToRunner/);
});

test('the route is CSRF-protected, rate limited, and permission checked', () => {
  assert.match(routes, /registrants\/:registrationId\/cancel/);
  assert.match(routes, /requireCsrfProtection/);
  assert.match(routes, /registrantCancellationLimiter/);
  assert.match(routes, /canAccessRegistrantReview/);
  assert.match(routes, /getRegistrantAccessibleEventOrNull/);
});

test('a runner asks to cancel rather than cancelling outright', () => {
  // Cancelling a paid registration decides what happens to the money. That is the
  // organiser's call, not something to infer from a runner tapping a button.
  assert.match(service, /it does not cancel/);
  assert.match(service, /organiser's call/);
  assert.match(service, /cancellationRequestedAt = new Date\(\)/);
  assert.doesNotMatch(
    service.slice(service.indexOf('async function requestCancellation')),
    /status = 'cancelled'/,
    'requesting must never set the cancelled status'
  );
});

test('a request is refused when it makes no sense, and cannot be repeated', () => {
  assert.match(service, /already asked to cancel/);
  assert.match(service, /findOne\(\{ _id: registrationId, userId \}\)/);
});

test('the runner request route is CSRF-protected and scoped to the runner', () => {
  const pageRoutes = read('src/routes/pageRoutes.js');
  assert.match(pageRoutes, /request-cancellation/);
  assert.match(pageRoutes, /requireAuth, requireRunnerWorkspace, requireCsrfProtection/);

  const card = read('src/views/partials/my-registration-card.ejs');
  assert.match(card, /Ask to cancel/);
  assert.match(card, /no refund is issued automatically/);
  assert.match(card, /\['pending_payment','paid','confirmed'\]\.includes\(registration\.status\)/);
});

test('the organiser sees the request and is told nothing has happened yet', () => {
  assert.match(rosterView, /asked to cancel/);
  assert.match(rosterView, /Nothing is cancelled until you do it below/);
});

test('the cancellation-request event has an email sender and a subject', () => {
  const communication = read('src/services/communication.service.js');
  const emailService = read('src/services/email.service.js');
  assert.match(registry, /eventKey: 'registration\.cancellation_requested'/);
  assert.match(communication, /eventKey === 'registration\.cancellation_requested'/);
  assert.match(communication, /'registration\.cancellation_requested': `Cancellation Requested/);
  assert.match(emailService, /sendCancellationRequestedEmailToOrganizer/);
});

test('the roster offers cancelling only for live registrations, behind a confirmation', () => {
  assert.match(rosterView, /\['pending_payment', 'paid', 'confirmed'\]\.includes\(registration\.status\)/);
  assert.match(rosterView, /data-high-risk-confirm/);
  assert.match(rosterView, /name="_csrf"/);
  // Already-cancelled rows explain themselves rather than offering the action again.
  assert.match(rosterView, /organizer-roster-cancelled-note/);
});
