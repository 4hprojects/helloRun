const test = require('node:test');
const assert = require('node:assert/strict');

const {
  AUTO_APPROVAL_RULE_VERSION,
  TRUSTED_ORGANIZER_RULE_VERSION,
  TRUSTED_MIN_COMPLETED_EVENTS,
  getAutoApprovalEligibility
} = require('../src/services/event-approval.service');

// Passes getPublishReadinessErrors — keep in sync with validateCreateEventForm.
function buildReadyVirtualEvent(overrides = {}) {
  return {
    _id: 'event-1',
    organizerId: 'organizer-1',
    title: 'Test Virtual Run',
    description: 'A great community virtual run for everyone joining this month.',
    eventType: 'virtual',
    eventTypesAllowed: ['virtual'],
    raceDistances: ['5K'],
    registrationOpenAt: new Date('2026-08-01'),
    registrationCloseAt: new Date('2026-08-20'),
    eventStartAt: new Date('2026-09-01'),
    eventEndAt: new Date('2026-09-30'),
    virtualWindow: { startAt: new Date('2026-09-01'), endAt: new Date('2026-09-30') },
    proofTypesAllowed: ['photo'],
    virtualCompletionMode: 'single_activity',
    feeMode: 'free',
    pricingMode: 'free',
    status: 'pending_review',
    ...overrides
  };
}

const PAID_SETUP = {
  feeMode: 'paid',
  feeAmount: 350,
  pricingMode: 'distance_based',
  distancePricing: [{ distance: '5K', amount: 350 }],
  paymentAccountName: 'Juan dela Cruz',
  paymentQrImageUrl: 'https://r2.example/qr.png'
};

const approvedOrganizer = {
  _id: 'organizer-1',
  role: 'organiser',
  organizerStatus: 'approved',
  emailVerified: true,
  accountStatus: 'active'
};

test('free virtual event from approved organizer auto-approves under v1', async () => {
  const result = await getAutoApprovalEligibility(buildReadyVirtualEvent(), {
    organizer: approvedOrganizer,
    completedEventCount: 0
  });
  assert.equal(result.eligible, true);
  assert.equal(result.ruleVersion, AUTO_APPROVAL_RULE_VERSION);
});

test('paid virtual event auto-approves under v2 for trusted organizers', async () => {
  const paidEvent = buildReadyVirtualEvent(PAID_SETUP);
  const result = await getAutoApprovalEligibility(paidEvent, {
    organizer: approvedOrganizer,
    completedEventCount: TRUSTED_MIN_COMPLETED_EVENTS
  });
  assert.equal(result.eligible, true, JSON.stringify(result.reasons));
  assert.equal(result.ruleVersion, TRUSTED_ORGANIZER_RULE_VERSION);
});

test('paid event stays manual below the completed-event threshold', async () => {
  const paidEvent = buildReadyVirtualEvent(PAID_SETUP);
  const result = await getAutoApprovalEligibility(paidEvent, {
    organizer: approvedOrganizer,
    completedEventCount: TRUSTED_MIN_COMPLETED_EVENTS - 1
  });
  assert.equal(result.eligible, false);
  assert.ok(result.reasons.includes('organizer_below_completed_event_threshold'));
});

test('paid event stays manual when the organizer account is not active', async () => {
  const paidEvent = buildReadyVirtualEvent(PAID_SETUP);
  const result = await getAutoApprovalEligibility(paidEvent, {
    organizer: { ...approvedOrganizer, accountStatus: 'restricted' },
    completedEventCount: 10
  });
  assert.equal(result.eligible, false);
  assert.ok(result.reasons.includes('organizer_account_not_active'));
});

test('onsite and hybrid events never auto-approve, even for trusted organizers', async () => {
  for (const overrides of [
    { eventType: 'onsite', eventTypesAllowed: ['onsite'] },
    { eventType: 'hybrid', eventTypesAllowed: ['virtual', 'onsite'] },
    { venueName: 'Track Oval' }
  ]) {
    const result = await getAutoApprovalEligibility(buildReadyVirtualEvent(overrides), {
      organizer: approvedOrganizer,
      completedEventCount: 10
    });
    assert.equal(result.eligible, false, `expected manual review for ${JSON.stringify(overrides)}`);
  }
});

test('non-approved organizer never auto-approves regardless of track record', async () => {
  const result = await getAutoApprovalEligibility(buildReadyVirtualEvent(), {
    organizer: { ...approvedOrganizer, organizerStatus: 'pending' },
    completedEventCount: 10
  });
  assert.equal(result.eligible, false);
  assert.ok(result.reasons.includes('organizer_not_approved'));
});
