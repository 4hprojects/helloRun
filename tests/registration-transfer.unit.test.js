'use strict';

// Handing a registration to somebody else.
//
// Two things make this dangerous rather than fiddly: it decides who is allowed on a start
// line, and it is one careless line away from moving somebody else's money.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const mongoose = require('mongoose');

const {
  getTransferBlock,
  transferDeadline,
  TRANSFER_TOKEN_TTL_MS
} = require('../src/services/registration-transfer.service');
const RegistrationTransfer = require('../src/models/RegistrationTransfer');

const ROOT = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const service = read('src/services/registration-transfer.service.js');
const model = read('src/models/RegistrationTransfer.js');
const routes = read('src/routes/transfer.routes.js');
const organiserRoutes = read('src/routes/organiser/transfers.js');
const eventModel = read('src/models/Event.js');

// --- The policy, which is a decision rather than a default -----------------------------------

test('a transfer moves the person and never the money', () => {
  // The codebase already refuses to decide a refund on the organiser's behalf — runner
  // cancellation is a *request* for exactly that reason. Moving money here would be making
  // the same call on somebody else's bank account.
  assert.match(service, /It does not move, refund or\n\/\/   re-charge money/);
  assert.match(eventModel, /it\n    \/\/ never moves, refunds or re-charges money/);

  // Nothing in the swap may touch a payment field.
  const swap = service.slice(service.indexOf('async function completeTransfer'));
  for (const field of ['paymentStatus', 'paymentAmountDue', 'paymentCurrency', 'pricingSnapshot', 'paymentReview']) {
    assert.doesNotMatch(swap, new RegExp(`registration\\.${field}\\s*=`), `${field} must be left alone`);
  }

  // And both people are told, rather than left to assume.
  assert.match(read('src/views/pages/transfer-accept.ejs'), /does not move any payment/);
  assert.match(read('src/views/organizer/event-transfers.ejs'), /not move, refund or re-charge/);
});

test('transfers are off until an organiser turns them on, and always have a deadline', () => {
  assert.match(eventModel, /transfersEnabled: \{ type: Boolean, default: false \}/);
  // Approval on by default: handing over a paid entry is something organisers want to see.
  assert.match(eventModel, /transferRequiresApproval: \{ type: Boolean, default: true \}/);

  assert.equal(getTransferBlock({ transfersEnabled: false }).reason, 'disabled');
  assert.equal(getTransferBlock(null).reason, 'unknown_event');

  // An unbounded window would let an entry change hands after the results are in.
  const past = new Date(Date.now() - 60000);
  assert.equal(getTransferBlock({ transfersEnabled: true, transferDeadlineAt: past }).reason, 'past_deadline');
  assert.equal(getTransferBlock({ transfersEnabled: true, registrationCloseAt: past }).reason, 'past_deadline');
  assert.equal(getTransferBlock({ transfersEnabled: true, eventStartAt: past }).reason, 'past_deadline');

  const future = new Date(Date.now() + 86400000);
  assert.equal(getTransferBlock({ transfersEnabled: true, transferDeadlineAt: future }).allowed, true);
});

test('the deadline falls back rather than defaulting to never', () => {
  const explicit = new Date('2026-09-01T00:00:00Z');
  const close = new Date('2026-08-20T00:00:00Z');
  const start = new Date('2026-08-25T00:00:00Z');
  assert.equal(transferDeadline({ transferDeadlineAt: explicit, registrationCloseAt: close }), explicit);
  assert.equal(transferDeadline({ registrationCloseAt: close, eventStartAt: start }), close);
  assert.equal(transferDeadline({ eventStartAt: start }), start);
  assert.equal(transferDeadline({}), null);
});

// --- One at a time ---------------------------------------------------------------------------

test('only one transfer per registration can be live at once', () => {
  // Two in flight would race to replace the same participant, and the loser's recipient
  // would have signed a waiver for nothing.
  const indexes = RegistrationTransfer.schema.indexes();
  const unique = indexes.find(([, options]) => options.name === 'registration_transfer_active_unique');
  assert.ok(unique);
  assert.deepEqual(unique[0], { registrationId: 1 });
  assert.equal(unique[1].unique, true);
  assert.deepEqual(unique[1].partialFilterExpression, { isActive: true });
  assert.match(service, /error\?\.code === 11000/);
});

test('isActive is derived from status, so the index cannot drift', async () => {
  const transfer = new RegistrationTransfer({
    registrationId: new mongoose.Types.ObjectId(),
    eventId: new mongoose.Types.ObjectId(),
    toEmail: 'B@Example.com',
    status: 'pending_recipient'
  });
  await transfer.validate();
  assert.equal(transfer.isActive, true);
  assert.equal(transfer.toEmail, 'b@example.com', 'lowercased, so a duplicate cannot hide');

  transfer.status = 'pending_approval';
  await transfer.validate();
  assert.equal(transfer.isActive, true);

  for (const status of ['completed', 'declined', 'expired', 'cancelled']) {
    transfer.status = status;
    transfer.isActive = true; // a caller setting this by hand must not survive
    await transfer.validate();
    assert.equal(transfer.isActive, false, `${status} must free the registration`);
  }
});

test('a stale pending transfer is expired, because it blocks its registration forever', () => {
  // Nothing is held by a pending transfer — no slot, no stock — but the unique index means
  // it would stop that registration ever being transferred again.
  assert.match(service, /async function expireStaleTransfers/);
  assert.match(service, /a stale\n \* pending transfer blocks the registration/);
  assert.match(read('src/workers/waitlist-offer-worker.js'), /expireStaleTransfers/);
  assert.ok(TRANSFER_TOKEN_TTL_MS > 0);
});

// --- Who may end up with the entry --------------------------------------------------------------

test('the recipient cannot already be in the event', () => {
  // Completing would give one person two entries and leave a slot nobody can use.
  assert.match(service, /RECIPIENT_REGISTERED/);
  assert.match(service, /status: \{ \$ne: 'cancelled' \}/);
  // Checked by account as well as by participant email.
  assert.match(service, /\.\.\.\(account \? \[\{ userId: account\._id \}\] : \[\]\)/);
});

test('a cancelled registration cannot be transferred, at either end of the flow', () => {
  const initiate = service.slice(service.indexOf('async function initiateTransfer'), service.indexOf('async function resolveTransferToken'));
  const complete = service.slice(service.indexOf('async function completeTransfer'));
  assert.match(initiate, /NOT_TRANSFERABLE/);
  // Re-checked at completion: a registration can be cancelled while the link sits unread.
  assert.match(complete.slice(0, 900), /registration\.status === 'cancelled'/);
  assert.match(complete.slice(0, 1400), /getTransferBlock\(event\)/);
});

test('the entry becomes a guest entry unless the recipient already has an account', () => {
  // Asserting an identity from an address typed into a form is what the walk-in flow
  // refuses to do, and for the same reason.
  assert.match(service, /registration\.participantType = transfer\.toUserId \? 'account' : 'guest'/);
  assert.match(service, /same thing the walk-in\n  \/\/ flow refuses to do/);
});

// --- The swap itself --------------------------------------------------------------------------

test('the recipient signs their own waiver', () => {
  // A waiver is a statement about a person's own health and risk; inheriting one makes it
  // worthless, which is the whole reason this cannot be a name edit.
  assert.match(service, /cannot be inherited/);
  assert.match(service, /registration\.waiver = \{/);
  assert.match(service, /acceptedAt: new Date\(\)/);
  assert.match(routes, /errors\.waiverAccepted = 'You must accept the waiver/);
  assert.match(read('src/views/pages/transfer-accept.ejs'), /cannot be handed on/);
});

test("the previous person's emergency contact does not carry over", () => {
  assert.match(service, /The old person's emergency contact is not the new person's/);
  assert.match(service, /registration\.participant\.emergencyContactName = form\?\.emergencyContactName \|\| ''/);
});

test('every credential the previous participant held stops working', () => {
  // The bib number stays — same slot, same start list — but a screenshot of the old QR
  // must not scan in.
  assert.match(service, /revokeBibTokens\(registration\._id, 'Registration transferred'\)/);
  assert.match(service, /its QR is reissued/);
  // The guest-token revoke takes a *purpose* filter, not a reason: passing text there
  // would have matched no purpose and revoked nothing at all.
  assert.match(service, /await revokeTokensForRegistration\(registration\._id\)\.catch/);
  assert.match(service, /that parameter is a \*purpose\* filter, not a reason string/);
});

test('a guest recipient gets a way back to their own registration', () => {
  assert.match(service, /issueToken\(registration\._id, registration\.eventId, 'manage'\)/);
  assert.match(read('src/views/pages/transfer-result.ejs'), /Keep this link/);
});

test('who it was survives the swap', () => {
  // The registration stops being able to answer this the moment it completes, and it is
  // exactly what an organiser asks when two people turn up for one bib.
  assert.match(model, /Snapshotted at initiation/);
  assert.match(service, /action: 'registration\.transferred'/);
  assert.match(service, /statusFrom: previousEmail/);
});

test('a collected kit is surfaced rather than pretended away', () => {
  // No second kit is coming; the organiser has to see that before approving.
  assert.match(service, /kitAlreadyReleased: Boolean\(registration\.kitSizeReleased\)/);
  assert.match(read('src/views/organizer/event-transfers.ejs'), /Kit already collected/);
  assert.match(read('src/views/pages/transfer-accept.ejs'), /no second kit/);
});

// --- The link is the credential -------------------------------------------------------------------

test('only the hash is stored, the link is single use, and it is bound to one address', () => {
  assert.match(service, /tokenHash: hashToken\(token\)/);
  assert.doesNotMatch(model, /\btoken:\s*\{/, 'the raw token must never be a field');
  assert.match(service, /transfer\.tokenHash = ''; \/\/ single use/);
  // A transfer that could be redirected after the fact would hand a paid entry to a stranger.
  assert.match(service, /email: transfer\.toEmail, \/\/ fixed at initiation/);
  assert.match(read('src/views/pages/transfer-accept.ejs'), /readonly/);
});

test('an expired link and an invented one are answered the same way', () => {
  assert.match(routes, /a stranger guessing tokens learns nothing/);
  assert.match(routes, /function rejectionMessage/);
  assert.match(service, /\^\[a-f0-9\]\{64\}\$/);
});

test('the public route is rate limited and CSRF-protected', () => {
  assert.match(routes, /transferLimiter/);
  assert.match(routes, /requireCsrfProtection/);
});

// --- The organiser's side ---------------------------------------------------------------------------

test('approving is an organiser decision, and only of something actually accepted', () => {
  assert.match(organiserRoutes, /protectEventMutation/);
  assert.doesNotMatch(organiserRoutes, /protectOnsiteMutation/);
  // Approving a transfer the recipient never accepted would move the entry to somebody
  // who never signed.
  assert.match(organiserRoutes, /transfer\.status !== 'pending_approval'/);
  assert.match(organiserRoutes, /never signed/);
});

test('an invite nobody received is undone rather than left pending', () => {
  // Otherwise the unique index blocks the registration with no way for anyone to act.
  assert.match(organiserRoutes, /resolveWithout\(transfer, 'cancelled'/);
  assert.match(organiserRoutes, /with no way for anyone to act/);
});

test('declining is a first-class outcome for the recipient too', () => {
  // An entry nobody wanted must not sit pending until it expires, blocking the owner from
  // offering it to somebody else.
  assert.match(routes, /req\.body\.decline === '1'/);
  assert.match(routes, /blocking the owner from transferring it/);
});

test('the invite email cannot be switched off, and has a sender', () => {
  const registry = read('src/services/communication-events.registry.js');
  assert.match(registry, /eventKey: 'registration\.transfer_invited'/);
  assert.match(registry, /locked: true/);
  assert.match(read('src/services/communication.service.js'), /sendRegistrationTransferInviteEmail/);
  const email = read('src/services/email.service.js');
  assert.match(email, /exports\.sendRegistrationTransferInviteEmail/);
  // The email says what a transfer does not do, so neither person assumes money moved.
  assert.match(email, /does not move any payment/);
});

test('the settings are reachable and the page is linked', () => {
  const form = read('src/services/event-form.service.js');
  assert.match(form, /transfersEnabled: normalizeBoolean\(body\.transfersEnabled\)/);
  assert.match(form, /event\.transfersEnabled = Boolean\(formData\.transfersEnabled\)/);
  // `!== false` so an existing event with the field absent still defaults to requiring it.
  assert.match(form, /transferRequiresApproval: event\.transferRequiresApproval !== false/);
  for (const view of ['src/views/organizer/edit-event.ejs', 'src/views/organizer/create-event.ejs']) {
    assert.match(read(view), /name="transfersEnabled"/, view);
    assert.match(read(view), /name="transferDeadlineAt"/, view);
  }
  assert.match(read('src/services/organizer-event-detail.service.js'), /label: 'Transfers'/);
});
