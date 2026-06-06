const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const {
  AUTO_APPROVAL_RULE_VERSION,
  getAutoApprovalEligibility
} = require('../src/services/event-approval.service');
const { DEFAULT_WAIVER_TEMPLATE } = require('../src/utils/waiver');

test('free virtual publish-ready event is eligible for auto-approval', async () => {
  const eligibility = await getAutoApprovalEligibility(buildEvent(), {
    organizer: buildOrganizer()
  });

  assert.equal(eligibility.eligible, true);
  assert.equal(eligibility.ruleVersion, AUTO_APPROVAL_RULE_VERSION);
  assert.deepEqual(eligibility.reasons, []);
});

test('paid event remains manual review only', async () => {
  const eligibility = await getAutoApprovalEligibility(buildEvent({
    feeMode: 'paid',
    pricingMode: 'distance_based',
    feeAmount: 500,
    paymentQrImageUrl: 'https://example.com/payment-qr.png',
    paymentAccountName: 'HelloRun Payments'
  }), {
    organizer: buildOrganizer()
  });

  assert.equal(eligibility.eligible, false);
  assert.ok(eligibility.reasons.includes('event_not_free'));
  assert.ok(eligibility.reasons.includes('pricing_not_free'));
  assert.ok(eligibility.reasons.includes('payment_setup_present'));
});

test('onsite and hybrid events remain manual review only', async () => {
  const onsite = await getAutoApprovalEligibility(buildEvent({
    eventType: 'onsite',
    eventTypesAllowed: ['onsite'],
    venueName: 'Race Venue',
    venueAddress: 'Start Line',
    city: 'Manila',
    country: 'PH'
  }), {
    organizer: buildOrganizer()
  });

  const hybrid = await getAutoApprovalEligibility(buildEvent({
    eventType: 'hybrid',
    eventTypesAllowed: ['virtual', 'onsite'],
    venueName: 'Race Venue',
    venueAddress: 'Start Line',
    city: 'Manila',
    country: 'PH'
  }), {
    organizer: buildOrganizer()
  });

  assert.equal(onsite.eligible, false);
  assert.ok(onsite.reasons.includes('event_not_virtual_only'));
  assert.ok(onsite.reasons.includes('onsite_logistics_present'));
  assert.equal(hybrid.eligible, false);
  assert.ok(hybrid.reasons.includes('event_not_virtual_only'));
  assert.ok(hybrid.reasons.includes('event_types_allowed_not_virtual_only'));
  assert.ok(hybrid.reasons.includes('onsite_logistics_present'));
});

test('unapproved or unverified organisers are not eligible for auto-approval', async () => {
  const pending = await getAutoApprovalEligibility(buildEvent(), {
    organizer: buildOrganizer({ organizerStatus: 'pending' })
  });
  const unverified = await getAutoApprovalEligibility(buildEvent(), {
    organizer: buildOrganizer({ emailVerified: false })
  });

  assert.equal(pending.eligible, false);
  assert.ok(pending.reasons.includes('organizer_not_approved'));
  assert.equal(unverified.eligible, false);
  assert.ok(unverified.reasons.includes('organizer_email_not_verified'));
});

test('physical rewards and delivery keep event in manual review', async () => {
  const eligibility = await getAutoApprovalEligibility(buildEvent({
    physicalRewardsEnabled: true,
    physicalRewardMedalEnabled: true,
    physicalRewardsDescription: 'Medal package',
    deliveryFeeEnabled: true,
    deliveryFeeAmount: 100,
    requiresDeliveryAddress: true
  }), {
    organizer: buildOrganizer()
  });

  assert.equal(eligibility.eligible, false);
  assert.ok(eligibility.reasons.includes('physical_rewards_present'));
  assert.ok(eligibility.reasons.includes('delivery_setup_present'));
});

function buildOrganizer(overrides = {}) {
  return {
    _id: new mongoose.Types.ObjectId(),
    role: 'organiser',
    organizerStatus: 'approved',
    emailVerified: true,
    ...overrides
  };
}

function buildEvent(overrides = {}) {
  const now = Date.now();
  return {
    _id: new mongoose.Types.ObjectId(),
    status: 'pending_review',
    title: 'Auto Approval Test Event',
    organiserName: 'Auto Organizer',
    description: 'This event description is intentionally long enough for validation.',
    eventType: 'virtual',
    eventTypesAllowed: ['virtual'],
    raceDistances: ['5K'],
    registrationOpenAt: new Date(now + 60 * 60 * 1000),
    registrationCloseAt: new Date(now + 24 * 60 * 60 * 1000),
    eventStartAt: new Date(now + 2 * 24 * 60 * 60 * 1000),
    eventEndAt: new Date(now + 3 * 24 * 60 * 60 * 1000),
    virtualWindow: {
      startAt: new Date(now + 2 * 24 * 60 * 60 * 1000),
      endAt: new Date(now + 4 * 24 * 60 * 60 * 1000)
    },
    proofTypesAllowed: ['gps'],
    virtualCompletionMode: 'single_activity',
    feeMode: 'free',
    pricingMode: 'free',
    waiverTemplate: DEFAULT_WAIVER_TEMPLATE,
    waiverVersion: 1,
    ...overrides
  };
}
