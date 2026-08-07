// src/services/walk-in-registration.service.js
// An organiser registering someone at the venue on race day.
//
// A thin layer over the guest flow, which already does the hard parts: validation, atomic
// capacity, pricing, the waiver snapshot, the management link, and giving a slot back when
// a write fails. What a walk-in adds is everything that comes from an organiser standing at
// a desk rather than a visitor filling in a form.

const Registration = require('../models/Registration');
const User = require('../models/User');
const { createGuestRegistration } = require('./guest-registration.service');
const { syncRegistrationPaymentShadow } = require('./registration-payment-shadow.service');
const { recordCriticalAuditEventInBackground } = require('./critical-audit.service');
const logger = require('../utils/logger');

/**
 * Is this person already registered for this event, by any route?
 *
 * The unique index is partial on `userId` being an ObjectId, so it never applies to guest
 * rows — and the guest duplicate check only looks at other guests. Without this, an
 * organiser adding somebody who already registered with an account would quietly create a
 * second, unlinked entry, and only find out when two people arrived for one bib.
 */
async function findAnyExistingRegistration(eventId, email) {
  const normalised = String(email || '').trim().toLowerCase();
  if (!normalised) return null;

  const asGuest = await Registration.findOne({
    eventId,
    participantType: 'guest',
    'participant.email': normalised
  })
    .select('confirmationCode participantType')
    .lean();
  if (asGuest) return { ...asGuest, matchedOn: 'guest' };

  const account = await User.findOne({ email: normalised }).select('_id').lean();
  if (!account) return null;

  const asAccount = await Registration.findOne({ eventId, userId: account._id })
    .select('confirmationCode participantType')
    .lean();
  return asAccount ? { ...asAccount, matchedOn: 'account' } : null;
}

/**
 * Record that money changed hands at the desk.
 *
 * There is no cash status in the payment enum, and inventing one would strand every report
 * that reads it. This mirrors what an organiser approving a payment proof already does —
 * mark it paid, record who decided, say why — so a walk-in payment reconciles the same way
 * as every other manual approval.
 */
function applyDeskPayment(registration, organiserId) {
  registration.paymentStatus = 'paid';
  registration.paymentReviewedAt = new Date();
  registration.paymentReviewedBy = organiserId || null;
  registration.paymentReviewNotes = 'Payment collected at the venue (walk-in).';
}

/**
 * Register a walk-in.
 *
 * @param {Object} input
 * @param {Object} input.event
 * @param {Object} input.form - already through validateGuestForm
 * @param {Object} input.organiser - the signed-in organiser or staff member
 * @param {boolean} [input.paymentCollected]
 * @returns {Promise<{registration: Object, manageToken: string, shadowReady: boolean}>}
 */
async function createWalkInRegistration({ event, form, organiser, paymentCollected = false }) {
  const existing = await findAnyExistingRegistration(event._id, form.email);
  if (existing) {
    const error = new Error(
      `${form.email} is already registered for this event (${existing.confirmationCode}).`
    );
    error.code = 'ALREADY_REGISTERED';
    error.confirmationCode = existing.confirmationCode;
    throw error;
  }

  // Guest registration on purpose, even when the email has an account: the claim flow lets
  // the account holder take it with a verified email, rather than an organiser asserting
  // someone's identity from an address typed at a desk.
  const result = await createGuestRegistration({ event, form });
  const { registration } = result;

  registration.registrationSource = 'organiser_walk_in';
  registration.createdByUserId = organiser?._id || organiser?.mongoUserId || null;
  if (paymentCollected) {
    applyDeskPayment(registration, registration.createdByUserId);
  }
  await registration.save();

  // The post-save hook syncs the Postgres shadow without awaiting, and assignBib throws
  // when that row is missing. An organiser hands over a bib seconds after registering
  // someone, so wait for it here rather than leaving them to hit a race.
  let shadowReady = false;
  try {
    // 'live_sync' rather than anything walk-in specific: migration_records constrains
    // operation to backfill | live_sync | verify | repair, and this is an ordinary
    // live write that merely happens not to wait.
    await syncRegistrationPaymentShadow(registration, { operation: 'live_sync' });
    shadowReady = true;
  } catch (error) {
    // Not fatal: the registration exists, the retry worker will catch up, and the console
    // already shows unsynced entries as such. It just means no bib yet.
    logger.error(`[WalkIn] Shadow sync failed for ${registration._id}: ${error.message}`);
  }

  recordCriticalAuditEventInBackground({
    actorMongoUserId: registration.createdByUserId,
    action: 'registration.walk_in_created',
    targetType: 'registration',
    targetId: String(registration._id),
    statusFrom: '',
    statusTo: registration.paymentStatus,
    notes: `Walk-in for ${form.email}${paymentCollected ? ', payment collected' : ''}.`,
    occurredAt: new Date()
  });

  return { registration, manageToken: result.manageToken, shadowReady };
}

module.exports = {
  createWalkInRegistration,
  findAnyExistingRegistration,
  applyDeskPayment
};
