'use strict';

// The queue for a category that is full.
//
// The invariant under test throughout: an offer holds a real slot. Everything that can go
// wrong here goes wrong as either an oversold category or a slot nobody can ever use.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const mongoose = require('mongoose');

const {
  validateWaitlistForm,
  getWaitlistBlock,
  categoryIsFull,
  offerWindowMs,
  DEFAULT_OFFER_HOURS
} = require('../src/services/waitlist.service');
const WaitlistEntry = require('../src/models/WaitlistEntry');

const ROOT = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const service = read('src/services/waitlist.service.js');
const model = read('src/models/WaitlistEntry.js');
const routes = read('src/routes/waitlist.routes.js');
const organiserRoutes = read('src/routes/organiser/waitlist.js');
const worker = read('src/workers/waitlist-offer-worker.js');
const guest = read('src/services/guest-registration.service.js');
const cancellation = read('src/services/registration-cancellation.service.js');

const FULL = { categoryId: 'c1', name: '5K', slots: 10, reserved: 10 };
const OPEN = { categoryId: 'c2', name: '10K', slots: 10, reserved: 3 };
const UNCAPPED = { categoryId: 'c3', name: 'Fun run', slots: null, reserved: 40 };

// --- A waitlist entry is not a registration ----------------------------------------------

test('a waitlist entry is its own collection, not a registration status', () => {
  // 93 places query registrations and only 4 filter on status, so a `waitlisted` status
  // would have put non-registered people into rosters, exports, headcounts, the Postgres
  // shadow, bib assignment and check-in.
  assert.match(model, /only 4 of them filter on `status`/);
  const Registration = require('../src/models/Registration');
  const statuses = Registration.schema.path('status').enumValues;
  assert.ok(!statuses.includes('waitlisted'), 'the registration status enum must be untouched');
});

test('one live entry per person per category, and rejoining after leaving is allowed', () => {
  const indexes = WaitlistEntry.schema.indexes();
  const unique = indexes.find(([, options]) => options.name === 'waitlist_active_entry_unique');
  assert.ok(unique, 'the duplicate guard must be an index, not a pre-check');
  assert.deepEqual(unique[0], { eventId: 1, categoryId: 1, 'participant.email': 1 });
  assert.equal(unique[1].unique, true);
  // Partial on isActive: somebody who withdrew or let an offer lapse can join again.
  assert.deepEqual(unique[1].partialFilterExpression, { isActive: true });
  // Racing submissions must both hit the index rather than both passing a read check.
  assert.match(service, /error\?\.code === 11000/);
});

test('isActive is derived from status, so the index cannot drift', async () => {
  // validate() rather than validateSync(): the latter skips middleware, so it would pass
  // on the schema default and never exercise the hook that actually maintains this.
  const entry = new WaitlistEntry({
    eventId: new mongoose.Types.ObjectId(),
    participant: { firstName: 'A', lastName: 'B', email: 'A@B.com' },
    status: 'waiting'
  });
  await entry.validate();
  assert.equal(entry.isActive, true);
  assert.equal(entry.participant.email, 'a@b.com', 'email is lowercased for the unique index');

  entry.status = 'offered';
  await entry.validate();
  assert.equal(entry.isActive, true, 'an offer is still ahead of everyone behind it');

  for (const status of ['promoted', 'expired', 'withdrawn']) {
    entry.status = status;
    // A caller setting isActive by hand must not survive: the hook is the only writer.
    entry.isActive = true;
    await entry.validate();
    assert.equal(entry.isActive, false, `${status} must free the slot in the queue`);
  }
});

// --- Who may queue -----------------------------------------------------------------------

test('a category is only full when it is actually capped', () => {
  assert.equal(categoryIsFull(FULL), true);
  assert.equal(categoryIsFull(OPEN), false);
  // An uncapped category can never fill up, however many people are in it.
  assert.equal(categoryIsFull(UNCAPPED), false);
  assert.equal(categoryIsFull({ slots: 10 }), false, 'reserved absent reads as zero');
  assert.equal(categoryIsFull({ slots: 10, reserved: 11 }), true, 'over-reserved is still full');
});

test('queuing is refused for a category with slots left', () => {
  const event = { waitlistEnabled: true, status: 'published', raceCategories: [FULL, OPEN] };

  assert.equal(getWaitlistBlock(event, 'c1').allowed, true);

  const open = getWaitlistBlock(event, 'c2');
  assert.equal(open.allowed, false);
  assert.equal(open.reason, 'not_full');
  assert.match(open.message, /still has slots/, 'tell them to just register');

  assert.equal(getWaitlistBlock(event, 'nope').reason, 'unknown_category');
  assert.equal(getWaitlistBlock({ ...event, waitlistEnabled: false }, 'c1').reason, 'disabled');
  assert.equal(getWaitlistBlock({ ...event, status: 'draft' }, 'c1').reason, 'not_published');
  assert.equal(getWaitlistBlock(null, 'c1').reason, 'unknown_event');
});

test('joining asks for less than registering, because it might come to nothing', () => {
  // The waiver and emergency contact are collected at promotion, when a slot exists.
  const { form, errors } = validateWaitlistForm({
    firstName: ' Ana ',
    lastName: 'Reyes',
    email: '  ANA@Example.com ',
    mobile: '0917'
  });
  assert.deepEqual(errors, {});
  assert.equal(form.firstName, 'Ana');
  assert.equal(form.email, 'ana@example.com', 'normalised so a duplicate cannot hide');
  assert.equal(form.mobileNumber, '0917', 'the guest form calls this `mobile`');

  const bad = validateWaitlistForm({ firstName: 'A', email: 'not-an-email' });
  assert.ok(bad.errors.lastName && bad.errors.email && bad.errors.mobileNumber);
  assert.ok(!('waiverAccepted' in bad.errors), 'no waiver is demanded to stand in a queue');
});

// --- The slot-holding invariant -----------------------------------------------------------

test('an offer takes the slot, and claiming it must not take a second', () => {
  // Reserving again on claim would count one slot twice and close the category early.
  assert.match(service, /const reservation = await reserveCategorySlot\(event\._id, categoryId\)/);
  // Conditional, not unconditional: an entry with no category never reserved anything, so
  // skipping would have let it register with no capacity check at all.
  assert.match(routes, /skipCapacityReservation: Boolean\(resolved\.entry\.slotHeld\)/);
  assert.doesNotMatch(routes, /skipCapacityReservation: true/);
  assert.match(guest, /skipCapacityReservation = false/);
  assert.match(guest, /raceCategoryId && !skipCapacityReservation/);
  // And the failure paths must not hand back a slot the offer still owns.
  assert.match(guest, /must only ever release capacity it\n\s*\/\/ took itself/);
});

test('a failure after reserving gives the slot back rather than leaking it', () => {
  assert.match(service, /if \(slotHeld\) await releaseCategorySlot\(event\._id, categoryId\)/);
  // Releasing is guarded on slotHeld so the expiry sweep and an organiser cannot double-release.
  assert.match(service, /const heldCategoryId = entry\.slotHeld \? String\(entry\.categoryId \|\| ''\) : ''/);
  assert.match(service, /entry\.slotHeld = false/);
});

test('an offer nobody was told about is rolled back', () => {
  // Otherwise it holds a slot until it expires, for no reason at all.
  assert.match(service, /await releaseOffer\(result\.entry, 'expired'\)/);
  assert.match(service, /reason: 'notify_failed'/);
});

test('promotion keeps the slot, expiry returns it', () => {
  // markPromoted clears slotHeld so a later sweep cannot release occupied capacity.
  const promoted = service.slice(service.indexOf('async function markPromoted'));
  assert.match(promoted.slice(0, 400), /entry\.slotHeld = false/);
  assert.match(promoted.slice(0, 400), /entry\.offerTokenHash = ''/, 'the link is single use');
  assert.match(service, /releaseOffer cannot set status/, 'only expiry and withdrawal release');
});

test('the offer window is bounded at both ends', () => {
  // Unbounded would take capacity out of circulation indefinitely.
  assert.equal(offerWindowMs({ waitlistOfferHours: 24 }), 24 * 3600 * 1000);
  assert.equal(offerWindowMs({}), DEFAULT_OFFER_HOURS * 3600 * 1000);
  assert.equal(offerWindowMs({ waitlistOfferHours: 0 }), DEFAULT_OFFER_HOURS * 3600 * 1000);
  assert.equal(offerWindowMs({ waitlistOfferHours: 99999 }), DEFAULT_OFFER_HOURS * 3600 * 1000);
  assert.equal(offerWindowMs({ waitlistOfferHours: 'soon' }), DEFAULT_OFFER_HOURS * 3600 * 1000);
});

// --- Nothing stalls -----------------------------------------------------------------------

test('something actually expires offers, and passes the slot on', () => {
  // Without the worker an unclaimed offer holds its slot forever and the queue never moves.
  assert.match(read('src/server.js'), /startWaitlistOfferWorker\(\)/);
  assert.match(worker, /processExpiredOffers/);
  assert.match(service, /async function processExpiredOffers/);
  // Expiring without re-offering would return the slot to the general public, where the
  // next person in line has no better claim on it than a stranger refreshing the page.
  assert.match(service, /offerNextSlotAndNotify\(\{ event, categoryId: entry\.categoryId \|\| '' \}\)/);
  // One per category per pass, or a category that freed one slot would offer two.
  assert.match(service, /if \(handled\.has\(key\)\) continue/);
  // One bad entry must not strand every other held slot.
  assert.match(service, /Could not re-offer after expiry/);
});

test('a cancellation offers the freed slot to the next person', () => {
  assert.match(cancellation, /offerFreedSlotInBackground\(registration\.eventId, categoryId\)/);
  // Never allowed to fail the cancellation, which is already done and correct.
  assert.match(cancellation, /logger\.error\(`\[Waitlist\] Could not offer freed slot/);
  // Lazily required: a top-level require would close a cycle back through this file.
  assert.match(cancellation, /require\('\.\/waitlist\.service'\)/);
});

// --- The link is the credential ------------------------------------------------------------

test('only the hash of an offer token is stored, and the raw token is returned once', () => {
  assert.match(service, /offerTokenHash: hashToken\(token\)/);
  assert.doesNotMatch(model, /offerToken:\s*\{/, 'the raw token must never be a field');
  // Length-checked before hashing, so a malformed value is cheap to reject.
  assert.match(service, /\^\[a-f0-9\]\{64\}\$/);
});

test('an expired link and an invented one are answered the same way', () => {
  // A stranger guessing tokens must learn nothing from the difference. One helper now,
  // so the GET and the POST cannot drift apart.
  assert.match(routes, /function offerRejectionMessage/);
  assert.match(routes, /a stranger guessing tokens learns\n\/\/ nothing/);
  const uses = routes.match(/offerRejectionMessage\(resolved\.reason\)/g) || [];
  assert.equal(uses.length, 2, 'both the GET and the POST must answer alike');
});

test('the claim is bound to the category the offer was made for', () => {
  // The offer form used to be a free select over every distance, so somebody offered a
  // 10K slot could register into 21K: 21K oversold, and the 10K slot stranded for good
  // because markPromoted clears slotHeld.
  assert.match(routes, /function offeredRaceDistance/);
  assert.match(routes, /\.\.\.\(offeredDistance \? \{ raceDistance: offeredDistance \} : \{\}\)/);
  const view = read('src/views/pages/waitlist-offer.ejs');
  // Not [^>]* — the EJS tag in the value attribute contains a '>' of its own.
  assert.match(view, /id="offeredCategory"[\s\S]*?readonly/);
  // The free select survives only behind `entry.categoryId` being absent — an entry with a
  // category must never be offered a choice.
  const readonlyAt = view.indexOf('id="offeredCategory"');
  const selectAt = view.indexOf('<select id="raceDistance"');
  assert.ok(readonlyAt > -1 && selectAt > readonlyAt, 'the fixed category must come before the fallback select');
  assert.match(view, /<% if \(entry\.categoryId\) \{ %>/);
  // The free select survives only for legacy entries with no category, which hold no slot.
  assert.match(view, /\} else if \(\(event\.raceDistances \|\| \[\]\)\.length\) \{/);
});

test("the claim honours the event's own registration rules", () => {
  // An offer window runs up to 336 hours, so registration can close — or guest entry be
  // switched off — while the link sits unread. The waitlist was a way around both.
  assert.match(routes, /getGuestRegistrationBlock/);
  const uses = routes.match(/getGuestRegistrationBlock\(event\)/g) || [];
  assert.equal(uses.length, 2, 'the GET and the POST must both check');
});

test('a claim that cannot complete is answered, not 500d', () => {
  // Their offer is still live and on a clock, so a generic error page is the worst answer.
  assert.match(routes, /\['DUPLICATE_GUEST', 'CAPACITY', 'PRICING'\]\.includes\(error\.code\)/);
  // A failure to mark the entry promoted must not fail a completed registration.
  assert.match(routes, /not marked promoted/);
  // The claim limiter keys on the token, not on a :slug this route does not have.
  assert.match(routes, /waitlist-claim\|\$\{req\.ip \|\| 'unknown-ip'\}\|\$\{req\.params\.token/);
});

test('the offer belongs to one address and cannot be redirected', () => {
  // Otherwise anyone holding the link could register somebody else into the slot.
  assert.match(routes, /email: resolved\.entry\.participant\.email/);
  assert.match(routes, /the offer belongs to this address/);
  assert.match(read('src/views/pages/waitlist-offer.ejs'), /readonly/);
});

test('the public routes are rate limited and go through CSRF and Turnstile', () => {
  assert.match(routes, /waitlistJoinLimiter/);
  assert.match(routes, /waitlistLookupLimiter/);
  assert.match(routes, /requireCsrfProtection/);
  assert.match(routes, /verifyTurnstileToken/);
});

// --- The organiser's side -------------------------------------------------------------------

test('promoting is an organiser decision, not a race-day one', () => {
  // protectOnsiteMutation would let check-in staff hand out slots.
  assert.match(organiserRoutes, /protectEventMutation/);
  assert.doesNotMatch(organiserRoutes, /protectOnsiteMutation/);
  assert.match(organiserRoutes, /waitlistActionLimiter/);
});

test('each reason an offer cannot be made is a different thing to do about it', () => {
  assert.match(organiserRoutes, /empty: 'Nobody is waiting/);
  assert.match(organiserRoutes, /no_capacity: 'That category is full/);
  assert.match(organiserRoutes, /notify_failed: 'The offer email could not be sent/);
});

test('the offer email cannot be switched off, and has a sender', () => {
  // It is time-limited and acts on the participant's behalf; opting out would mean losing
  // a slot without ever being told it was there.
  const registry = read('src/services/communication-events.registry.js');
  assert.match(registry, /eventKey: 'registration\.waitlist_offer'/);
  assert.match(registry, /locked: true/);
  // The registry-vs-sender test elsewhere fails if this branch is missing; assert directly too.
  assert.match(read('src/services/communication.service.js'), /sendWaitlistOfferEmail/);
  assert.match(read('src/services/email.service.js'), /exports\.sendWaitlistOfferEmail/);
});

test('the organiser page reloads after acting rather than patching the table', () => {
  // A stale "taken" count is how somebody talks themselves into overselling.
  const script = read('src/public/js/organizer-waitlist.js');
  assert.match(script, /window\.location\.reload/);
  assert.match(script, /'x-csrf-token': csrfToken/);
  const view = read('src/views/organizer/event-waitlist.ejs');
  assert.match(view, /An offer holds a real slot/);
});

test('a full category offers the waitlist on the public page instead of a dead end', () => {
  const { buildPublicEventView } = require('../src/utils/event-public-view');
  const base = {
    slug: 'e', title: 'E', status: 'published',
    raceCategories: [FULL, OPEN, UNCAPPED]
  };

  const off = buildPublicEventView({ ...base, waitlistEnabled: false }, { registrationCount: 0 });
  assert.deepEqual(off.waitlistCategories, [], 'nothing offered unless the organiser opted in');

  const on = buildPublicEventView({ ...base, waitlistEnabled: true }, { registrationCount: 0 });
  assert.deepEqual(
    on.waitlistCategories.map((category) => category.categoryId),
    ['c1'],
    'only the full capped category'
  );
});

test('the settings are reachable, and the offer window is clamped rather than rejected', () => {
  const form = read('src/services/event-form.service.js');
  assert.match(form, /waitlistEnabled: normalizeBoolean\(body\.waitlistEnabled\)/);
  assert.match(form, /event\.waitlistEnabled = Boolean\(formData\.waitlistEnabled\)/);
  assert.match(form, /function parseWaitlistOfferHours/);
  for (const view of ['src/views/organizer/edit-event.ejs', 'src/views/organizer/create-event.ejs']) {
    assert.match(read(view), /name="waitlistEnabled"/, view);
    assert.match(read(view), /name="waitlistOfferHours"/, view);
  }
});
