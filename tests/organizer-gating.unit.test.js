const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { canCreateEventsFromLeanUser } = require('../src/middleware/auth.middleware');
const { getRestrictedSetupReasons } = require('../src/services/event-approval.service');

function read(relativePath) {
  return fs.readFileSync(path.resolve(__dirname, '..', relativePath), 'utf8');
}

const ACK = { agreedAt: new Date('2026-07-05T00:00:00Z') };

test('event-creation capability truth table', () => {
  const cases = [
    // approved organizer: always allowed
    [{ role: 'organiser', emailVerified: true, organizerStatus: 'approved' }, true],
    // acknowledgement path works regardless of application status
    [{ role: 'organiser', emailVerified: true, organizerStatus: 'not_applied', organizerEventCreationAcknowledgement: ACK }, true],
    [{ role: 'organiser', emailVerified: true, organizerStatus: 'pending', organizerEventCreationAcknowledgement: ACK }, true],
    [{ role: 'organiser', emailVerified: true, organizerStatus: 'rejected', organizerEventCreationAcknowledgement: ACK }, true],
    // no acknowledgement, not approved: blocked
    [{ role: 'organiser', emailVerified: true, organizerStatus: 'not_applied' }, false],
    [{ role: 'organiser', emailVerified: true, organizerStatus: 'pending' }, false],
    // unverified email: blocked even with acknowledgement
    [{ role: 'organiser', emailVerified: false, organizerStatus: 'pending', organizerEventCreationAcknowledgement: ACK }, false],
    // restricted account: blocked even when approved
    [{ role: 'organiser', emailVerified: true, accountStatus: 'restricted', organizerStatus: 'approved' }, false],
    // wrong role: blocked
    [{ role: 'runner', emailVerified: true, organizerStatus: 'approved' }, false]
  ];

  for (const [user, expected] of cases) {
    assert.equal(
      canCreateEventsFromLeanUser(user),
      expected,
      `expected ${expected} for ${JSON.stringify(user)}`
    );
  }
});

test('restricted setup detection catches every paid/physical/onsite signal', () => {
  const freeVirtual = {
    eventType: 'virtual',
    feeMode: 'free',
    pricingMode: 'free'
  };
  assert.deepEqual(getRestrictedSetupReasons(freeVirtual), []);

  assert.ok(getRestrictedSetupReasons({ ...freeVirtual, feeMode: 'paid' }).includes('paid_fee_mode'));
  assert.ok(getRestrictedSetupReasons({ ...freeVirtual, feeAmount: 500 }).includes('payment_setup'));
  assert.ok(getRestrictedSetupReasons({ ...freeVirtual, paymentQrImageUrl: 'https://r2/qr.png' }).includes('payment_setup'));
  assert.ok(getRestrictedSetupReasons({ ...freeVirtual, physicalRewardsEnabled: true }).includes('physical_rewards'));
  assert.ok(getRestrictedSetupReasons({ ...freeVirtual, deliveryFeeEnabled: true }).includes('delivery_setup'));
  assert.ok(getRestrictedSetupReasons({ ...freeVirtual, eventType: 'onsite' }).includes('onsite_logistics'));
  assert.ok(getRestrictedSetupReasons({ ...freeVirtual, venueName: 'Track Oval' }).includes('onsite_logistics'));
});

test('event create and edit routes enforce the verify-to-unlock gate before save', () => {
  const shared = read('src/routes/organiser/_shared.js');
  const creation = read('src/routes/organiser/event-creation.js');
  const management = read('src/routes/organiser/event-management.js');

  assert.match(shared, /VERIFY_TO_UNLOCK_MESSAGE/);
  assert.match(creation, /organizerStatus !== 'approved' && getRestrictedSetupReasons\(event\)\.length/);
  assert.match(management, /organizerStatus !== 'approved' && getRestrictedSetupReasons\(event\)\.length/);
});

test('event management routes accept acknowledged organizers, promotion stays approved-only', () => {
  const management = read('src/routes/organiser/event-management.js');

  assert.match(management, /router\.get\('\/events', requireCanCreateEvents/);
  assert.match(management, /router\.get\('\/events\/:id', requireCanCreateEvents/);
  assert.match(management, /router\.get\('\/events\/:id\/edit', requireCanCreateEvents/);
  assert.match(management, /router\.post\('\/events\/:id\/edit', requireCanCreateEvents/);
  assert.match(management, /router\.post\('\/events\/:id\/status', requireCanCreateEvents/);
  assert.match(management, /router\.get\('\/promote', requireApprovedOrganizer/);
  assert.match(management, /router\.post\('\/promote', requireApprovedOrganizer/);
});

test('acknowledgement route accepts any verified non-approved organiser', () => {
  const dashboard = read('src/routes/organiser/dashboard.js');
  assert.doesNotMatch(dashboard, /ack_error=not_pending/);
  assert.match(dashboard, /ack_error=email_unverified/);
});

test('application form applies per-type requirements', () => {
  const profile = read('src/routes/organiser/profile.js');
  const view = read('src/views/organizer/complete-profile.ejs');
  const clientJs = read('src/public/js/complete-profile.js');

  assert.match(profile, /isIndividual/);
  assert.match(profile, /resolvedBusinessName/);
  assert.match(profile, /Registration number is required for companies, NGOs, and sports clubs/);
  assert.match(profile, /Business proof document is required for companies, NGOs, and sports clubs/);
  assert.match(view, /businessOrgRow/);
  assert.match(view, /businessProofGroup/);
  assert.match(view, /maxlength="500"[^>]*autocomplete="street-address"/);
  assert.match(clientJs, /applyBusinessTypeRules/);
  assert.match(clientJs, /isIndividualType/);
});

test('application status page tells non-approved organizers what they can already do', () => {
  const statusView = read('src/views/organizer/application-status.ejs');
  const profileView = read('src/views/organizer/complete-profile.ejs');
  const profile = read('src/routes/organiser/profile.js');

  assert.match(statusView, /What You Can Do Right Now/);
  assert.match(statusView, /free virtual events/);
  assert.match(profileView, /You can already create free virtual events/);
  // Server-side requiredness matches the client per-type rules.
  assert.match(profile, /Business address is required for companies, NGOs, and sports clubs/);
});

test('event wizards nudge unverified organizers about locked paid features', () => {
  const createView = read('src/views/organizer/create-event.ejs');
  const editView = read('src/views/organizer/edit-event.ejs');

  assert.match(createView, /Paid events are locked until your identity is verified/);
  assert.match(editView, /Paid events are locked until your identity is verified/);
});
