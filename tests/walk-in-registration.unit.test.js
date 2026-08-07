'use strict';

// An organiser registering someone at the venue on race day.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const mongoose = require('mongoose');

const { applyDeskPayment } = require('../src/services/walk-in-registration.service');
const Registration = require('../src/models/Registration');

const ROOT = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const service = read('src/services/walk-in-registration.service.js');
const routes = read('src/routes/organiser/onsite-operations.js');
const shadow = read('src/services/registration-payment-shadow.service.js');
const guest = read('src/services/guest-registration.service.js');
const view = read('src/views/organizer/event-check-in.ejs');
const script = read('src/public/js/organizer-walk-in.js');

test('a registration records how it came about, and defaults to self-serve', () => {
  const registration = new Registration({
    eventId: new mongoose.Types.ObjectId(),
    userId: new mongoose.Types.ObjectId(),
    participant: { firstName: 'A', lastName: 'B', email: 'a@b.com' },
    participationMode: 'onsite',
    raceDistance: '5K',
    confirmationCode: 'HR-ABC123',
    waiver: { accepted: true, version: 1, signature: 's', templateSnapshot: 't', renderedSnapshot: 'r' }
  });
  assert.equal(registration.registrationSource, 'self_serve');
  assert.equal(registration.createdByUserId, null);
});

test('desk payment reuses the manual-approval convention rather than a new status', () => {
  // Inventing a "cash" status would strand every report that reads paymentStatus.
  const organiserId = new mongoose.Types.ObjectId();
  const registration = {};
  applyDeskPayment(registration, organiserId);

  assert.equal(registration.paymentStatus, 'paid');
  assert.equal(registration.paymentReviewedBy, organiserId);
  assert.match(registration.paymentReviewNotes, /walk-in/i);
  assert.ok(registration.paymentReviewedAt instanceof Date);
});

test('payment is opt-in, so a rushed desk cannot record money it did not take', () => {
  assert.match(service, /paymentCollected = false/);
  assert.match(view, /name="paymentCollected"/);
  // No `checked` on that box — the default must be off.
  assert.doesNotMatch(view, /name="paymentCollected"[^>]*checked/);
});

test('a duplicate is caught across guest and account registrations', () => {
  // The unique index is partial on userId being an ObjectId, so it never applies to
  // guests, and the guest check only looks at other guests. Without this, adding
  // someone who already registered with an account would create a second entry.
  assert.match(service, /findAnyExistingRegistration/);
  assert.match(service, /participantType: 'guest'/);
  assert.match(service, /Registration\.findOne\(\{ eventId, userId: account\._id \}\)/);
  assert.match(service, /ALREADY_REGISTERED/);
});

test('the walk-in path does not consult the public guest toggle', () => {
  // allowGuestRegistration governs public self-registration. An organiser adding
  // somebody standing in front of them is a different decision.
  assert.doesNotMatch(service, /allowGuestRegistration/);
  assert.match(routes, /does NOT consult event\.allowGuestRegistration/);
});

test('the shadow sync is awaited, so a bib can be assigned straight away', () => {
  // The post-save hook does not wait, and assignBib throws when the row is missing.
  assert.match(service, /await syncRegistrationPaymentShadow\(registration/);
  assert.match(service, /assignBib throws/);
  assert.match(service, /shadowReady/);
  // A failure here is not fatal — the retry worker catches up.
  assert.match(service, /Not fatal/);
});

test('the operation name is one the migration_records constraint accepts', () => {
  // backfill | live_sync | verify | repair. Anything else fails the whole sync.
  assert.match(service, /operation: 'live_sync'/);
  assert.doesNotMatch(service, /operation: 'walk_in'/);
});

test('a guest shadows with a NULL user, not an empty string', () => {
  // registrations_unique_mongo_event_user_idx is a plain UNIQUE (mongo_event_id,
  // mongo_user_id). Postgres treats NULLs as distinct but two empty strings collide,
  // which silently stopped the second guest on an event reaching the shadow at all.
  assert.match(shadow, /registration\.userId \? String\(registration\.userId\) : null/);
  assert.match(shadow, /two empty strings collide/);
});

test('the guest service uses the shared initial-payment helper', () => {
  // It previously inlined the same feeMode check, so the two could drift apart.
  assert.match(guest, /paymentStatus: getInitialRegistrationPaymentStatus\(event\)/);
  assert.doesNotMatch(guest, /feeMode \|\| ''\)\.toLowerCase\(\) === 'paid' \? 'unpaid'/);
});

test('the route is guarded, rate limited, and reports bib readiness', () => {
  assert.match(routes, /walk-ins', protectOnsiteMutation\('check_in'\), walkInLimiter/);
  assert.match(routes, /readyForBib: shadowReady/);
  assert.match(routes, /ALREADY_REGISTERED/);
});

test('the console panel stays collapsed and tells the desk what happened', () => {
  assert.match(view, /data-walkin-toggle/);
  assert.match(view, /data-walkin-form/);
  assert.doesNotMatch(view, /<%-\s*event\.raceDistances/);

  assert.match(script, /'x-csrf-token': csrfToken/);
  assert.match(script, /readyForBib/);
  assert.match(script, /Payment still outstanding/);
  // An unchecked box is simply absent from FormData, which is what "not collected" means.
  assert.match(script, /omits unchecked boxes/);
});
