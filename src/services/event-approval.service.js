const User = require('../models/User');
const Event = require('../models/Event');
const { recordCriticalAuditEventInBackground } = require('./critical-audit.service');
const { generateDefaultEventBadgesInBackground } = require('./event-badge.service');
const { evaluateOrganiserAchievementsInBackground } = require('./achievement.service');
const { getPublishReadinessErrors } = require('./event-form.service');

const AUTO_APPROVAL_RULE_VERSION = 'event_auto_approval_v1_free_virtual';
const TRUSTED_ORGANIZER_RULE_VERSION = 'event_auto_approval_v2_trusted_organizer';
const TRUSTED_MIN_COMPLETED_EVENTS = Number(process.env.EVENT_AUTO_APPROVAL_TRUSTED_MIN_COMPLETED_EVENTS || 3);

async function publishEvent(event, options = {}) {
  if (!event || !event._id) {
    throw new Error('Event is required for publication.');
  }
  if (event.status !== 'pending_review') {
    throw new Error('Only pending review events can be published.');
  }

  const readinessErrors = getPublishReadinessErrors(event);
  if (readinessErrors.length) {
    const error = new Error(readinessErrors[0]);
    error.readinessErrors = readinessErrors;
    throw error;
  }

  const approvedAt = options.approvedAt || new Date();
  const previousStatus = event.status;
  const approvalSource = options.approvalSource === 'auto' ? 'auto' : 'admin';
  const approvalNote = normalizeApprovalNote(options.approvalNote);

  event.status = 'published';
  event.approvedAt = approvedAt;
  event.approvalSource = approvalSource;

  if (approvalSource === 'auto') {
    event.approvedBy = null;
    event.autoApprovedAt = approvedAt;
    event.autoApprovalRuleVersion = options.ruleVersion || AUTO_APPROVAL_RULE_VERSION;
  } else {
    event.approvedBy = options.actorUserId || null;
    event.autoApprovedAt = null;
    event.autoApprovalRuleVersion = '';
    if (approvalNote) {
      const existingNotes = String(event.adminNotes || '').trim();
      const noteLine = `Approval note (${approvedAt.toISOString()}): ${approvalNote}`;
      event.adminNotes = existingNotes ? `${existingNotes}\n${noteLine}`.slice(0, 1000) : noteLine.slice(0, 1000);
    }
  }

  await event.save();

  const reference = event.referenceCode || event.slug || event._id;
  const auditNotes = approvalSource === 'auto'
    ? `Event ${reference} auto-approved and published by ${event.autoApprovalRuleVersion}.`
    : `Event ${reference} approved and published.${approvalNote ? ` Note: ${approvalNote}` : ''}`;

  recordCriticalAuditEventInBackground({
    actorMongoUserId: approvalSource === 'auto' ? null : options.actorUserId,
    action: 'event.published',
    targetType: 'event',
    targetId: String(event._id),
    statusFrom: previousStatus,
    statusTo: 'published',
    notes: auditNotes,
    ipAddress: options.ipAddress,
    userAgent: options.userAgent,
    occurredAt: approvedAt,
    metadata: approvalNote ? { approvalNote } : undefined
  });

  generateDefaultEventBadgesInBackground(event, {
    performedBy: options.actorUserId || null
  });
  evaluateOrganiserAchievementsInBackground(event.organizerId, {
    performedBy: options.actorUserId || null
  });

  return event;
}

function normalizeApprovalNote(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').slice(0, 500);
}

async function tryAutoApproveEvent(event, options = {}) {
  const eligibility = await getAutoApprovalEligibility(event, options);
  if (!eligibility.eligible) {
    return { approved: false, eligibility };
  }

  await publishEvent(event, {
    approvalSource: 'auto',
    ruleVersion: eligibility.ruleVersion
  });

  return { approved: true, eligibility, event };
}

async function getAutoApprovalEligibility(event, options = {}) {
  const reasons = [];
  const organizer = options.organizer || await resolveOrganizer(event);

  if (!event || !event._id) reasons.push('event_missing');
  if (event && event.status !== 'pending_review') reasons.push('event_not_pending_review');
  if (event && getPublishReadinessErrors(event).length) reasons.push('publish_readiness_errors');

  if (!organizer) {
    reasons.push('organizer_missing');
  } else {
    if (organizer.role !== 'organiser') reasons.push('organizer_role_not_organiser');
    if (organizer.organizerStatus !== 'approved') reasons.push('organizer_not_approved');
    if (organizer.emailVerified !== true) reasons.push('organizer_email_not_verified');
  }

  // Virtual-only applies to both rules: onsite/hybrid events always get manual review.
  const virtualReasons = [];
  const paidSetupReasons = [];
  if (event) {
    if (event.eventType !== 'virtual') virtualReasons.push('event_not_virtual_only');
    const eventTypesAllowed = Array.isArray(event.eventTypesAllowed) ? event.eventTypesAllowed : [];
    if (eventTypesAllowed.length && (eventTypesAllowed.length !== 1 || eventTypesAllowed[0] !== 'virtual')) {
      virtualReasons.push('event_types_allowed_not_virtual_only');
    }
    if (hasOnsiteLogistics(event)) virtualReasons.push('onsite_logistics_present');

    if (event.feeMode !== 'free') paidSetupReasons.push('event_not_free');
    if (event.pricingMode && event.pricingMode !== 'free') paidSetupReasons.push('pricing_not_free');
    if (hasPaymentSetup(event)) paidSetupReasons.push('payment_setup_present');
    if (hasPhysicalRewards(event)) paidSetupReasons.push('physical_rewards_present');
    if (hasDeliverySetup(event)) paidSetupReasons.push('delivery_setup_present');
  }

  if (reasons.length || virtualReasons.length) {
    return {
      eligible: false,
      ruleVersion: AUTO_APPROVAL_RULE_VERSION,
      reasons: [...reasons, ...virtualReasons, ...paidSetupReasons]
    };
  }

  if (!paidSetupReasons.length) {
    return { eligible: true, ruleVersion: AUTO_APPROVAL_RULE_VERSION, reasons: [] };
  }

  // Paid/physical setups: allowed for organizers with a proven track record (v2).
  const trust = await getTrustedOrganizerStatus(event, organizer, options);
  if (trust.trusted) {
    return {
      eligible: true,
      ruleVersion: TRUSTED_ORGANIZER_RULE_VERSION,
      reasons: [],
      completedEventCount: trust.completedEventCount
    };
  }

  return {
    eligible: false,
    ruleVersion: AUTO_APPROVAL_RULE_VERSION,
    reasons: [...paidSetupReasons, ...trust.reasons],
    completedEventCount: trust.completedEventCount
  };
}

async function getTrustedOrganizerStatus(event, organizer, options = {}) {
  const reasons = [];
  if (organizer?.accountStatus && organizer.accountStatus !== 'active') {
    reasons.push('organizer_account_not_active');
  }

  const completedEventCount = Number.isFinite(options.completedEventCount)
    ? options.completedEventCount
    : await countCompletedOrganizerEvents(event?.organizerId, event?._id);
  if (completedEventCount < TRUSTED_MIN_COMPLETED_EVENTS) {
    reasons.push('organizer_below_completed_event_threshold');
  }

  return { trusted: reasons.length === 0, reasons, completedEventCount };
}

// "Completed" = a real (non-test) event that ran to its end date while live.
async function countCompletedOrganizerEvents(organizerId, excludeEventId) {
  if (!organizerId) return 0;
  const query = {
    organizerId,
    status: { $in: ['published', 'closed'] },
    isDeleted: { $ne: true },
    isTestData: { $ne: true },
    eventEndAt: { $lt: new Date() }
  };
  if (excludeEventId) query._id = { $ne: excludeEventId };
  return Event.countDocuments(query);
}

async function resolveOrganizer(event) {
  if (!event?.organizerId) return null;
  return User.findById(event.organizerId)
    .select('_id role organizerStatus emailVerified accountStatus')
    .lean();
}

function hasPaymentSetup(event) {
  return Boolean(
    event.paymentQrImageUrl ||
    event.paymentQrImageKey ||
    event.paymentAccountName ||
    event.paymentInstructions ||
    Number(event.feeAmount || 0) > 0 ||
    hasEntries(event.distancePricing) ||
    hasEntries(event.pricingPeriods) ||
    hasEntries(event.customizedOptions) ||
    hasEntries(event.registrationPackages)
  );
}

function hasPhysicalRewards(event) {
  return Boolean(
    event.physicalRewardsEnabled ||
    event.physicalRewardMedalEnabled ||
    event.physicalRewardShirtEnabled ||
    event.physicalRewardPatchEnabled ||
    event.physicalRewardTowelEnabled ||
    event.physicalRewardFinisherKitEnabled ||
    hasEntries(event.physicalRewardOtherItems) ||
    event.physicalRewardsDescription ||
    event.physicalRewardsClaimingNotes ||
    hasEntries(event.specialRewardBenefits)
  );
}

function hasDeliverySetup(event) {
  return Boolean(
    event.deliveryFeeEnabled ||
    Number(event.deliveryFeeAmount || 0) > 0 ||
    event.deliveryFeeDescription ||
    event.requiresDeliveryAddress ||
    event.requiresPhilippineDeliveryAddress
  );
}

function hasOnsiteLogistics(event) {
  return Boolean(
    event.eventType === 'onsite' ||
    event.eventType === 'hybrid' ||
    event.venueName ||
    event.venueAddress ||
    event.city ||
    event.province ||
    event.country ||
    event.geo?.lat ||
    event.geo?.lng ||
    hasEntries(event.onsiteCheckinWindows)
  );
}

function hasEntries(value) {
  return Array.isArray(value) && value.length > 0;
}

// Setups a non-identity-verified organizer is not allowed to save. Mirrors the
// auto-approval risk boundary: anything beyond a free virtual run needs verification.
function getRestrictedSetupReasons(event) {
  const reasons = [];
  if (!event) return reasons;
  if (hasPaymentSetup(event)) reasons.push('payment_setup');
  if (hasPhysicalRewards(event)) reasons.push('physical_rewards');
  if (hasDeliverySetup(event)) reasons.push('delivery_setup');
  if (hasOnsiteLogistics(event)) reasons.push('onsite_logistics');
  if (event.feeMode === 'paid' || (event.pricingMode && event.pricingMode !== 'free')) {
    reasons.push('paid_fee_mode');
  }
  return reasons;
}

module.exports = {
  AUTO_APPROVAL_RULE_VERSION,
  TRUSTED_ORGANIZER_RULE_VERSION,
  TRUSTED_MIN_COMPLETED_EVENTS,
  getAutoApprovalEligibility,
  getRestrictedSetupReasons,
  hasPaymentSetup,
  hasPhysicalRewards,
  hasDeliverySetup,
  hasOnsiteLogistics,
  publishEvent,
  tryAutoApproveEvent
};
