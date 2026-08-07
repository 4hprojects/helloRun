// src/services/guest-registration-claim.service.js
// Moving a guest registration onto an account.
//
// The proof of ownership is a verified email. A guest registered with an address; if an
// account holder has proved they control that same address, they are the same person for
// this purpose. Nothing weaker will do — the registration reference is printed and spoken
// aloud, and the management link can be forwarded.
//
// Matching is never enough on its own to *act*. A match makes a registration claimable;
// the person still has to confirm each one, so nothing is silently merged into an account
// on the strength of an address alone.

const mongoose = require('mongoose');
const Registration = require('../models/Registration');
const Event = require('../models/Event');
const { revokeTokensForRegistration } = require('./guest-registration-token.service');
const { recordCriticalAuditEventInBackground } = require('./critical-audit.service');
const logger = require('../utils/logger');

/**
 * Why an account cannot claim anything at all.
 * Returns null when it can.
 */
function getClaimEligibilityError(user) {
  if (!user) return 'Sign in to claim a registration.';
  if (!user.emailVerified) {
    // Without this, registering an address you do not control would be enough to take
    // somebody else's registration.
    return 'Verify your email address before claiming a registration.';
  }
  if (['restricted', 'suspended', 'closed'].includes(String(user.accountStatus || ''))) {
    return 'This account cannot claim registrations.';
  }
  return null;
}

/**
 * Guest registrations that belong to this account's verified address.
 *
 * Cancelled ones are excluded: there is nothing to take ownership of, and surfacing them
 * would just invite a confusing failure.
 */
async function findClaimableRegistrations(user) {
  if (getClaimEligibilityError(user)) return [];

  const email = String(user.email || '').trim().toLowerCase();
  if (!email) return [];

  const registrations = await Registration.find({
    participantType: 'guest',
    userId: null,
    'participant.email': email,
    status: { $ne: 'cancelled' }
  })
    .select('eventId confirmationCode participant raceDistance participationMode paymentStatus registeredAt')
    .sort({ registeredAt: -1 })
    .lean();

  if (registrations.length === 0) return [];

  const events = await Event.find({ _id: { $in: registrations.map((r) => r.eventId) } })
    .select('title slug eventStartAt venueName')
    .lean();
  const eventsById = new Map(events.map((event) => [String(event._id), event]));

  // An account may already hold a registration for the same event, in which case
  // claiming would collide with the one-per-account index. Surface that as a reason
  // rather than letting the write fail.
  const existing = await Registration.find({
    userId: user._id,
    eventId: { $in: registrations.map((r) => r.eventId) }
  })
    .select('eventId')
    .lean();
  const alreadyRegistered = new Set(existing.map((r) => String(r.eventId)));

  return registrations.map((registration) => ({
    registrationId: String(registration._id),
    confirmationCode: registration.confirmationCode,
    raceDistance: registration.raceDistance,
    participationMode: registration.participationMode,
    paymentStatus: registration.paymentStatus,
    registeredAt: registration.registeredAt,
    event: eventsById.get(String(registration.eventId)) || null,
    blockedReason: alreadyRegistered.has(String(registration.eventId))
      ? 'You already have a registration for this event.'
      : null
  }));
}

/**
 * Move one guest registration onto an account.
 *
 * @param {Object} input
 * @param {string} input.registrationId
 * @param {Object} input.user - the signed-in account, with email and emailVerified
 */
async function claimRegistration({ registrationId, user }) {
  const eligibility = getClaimEligibilityError(user);
  if (eligibility) throw new Error(eligibility);

  if (!mongoose.Types.ObjectId.isValid(String(registrationId || ''))) {
    throw new Error('Invalid registration reference.');
  }

  const registration = await Registration.findById(registrationId);
  if (!registration) throw new Error('Registration not found.');

  if (registration.participantType !== 'guest' || registration.userId) {
    throw new Error('That registration already belongs to an account.');
  }
  if (registration.status === 'cancelled') {
    throw new Error('That registration was cancelled.');
  }

  // The check that actually matters. Everything else is bookkeeping.
  const claimantEmail = String(user.email || '').trim().toLowerCase();
  const registrationEmail = String(registration.participant?.email || '').trim().toLowerCase();
  if (!claimantEmail || claimantEmail !== registrationEmail) {
    throw new Error('This registration was made with a different email address.');
  }

  const duplicate = await Registration.findOne({
    userId: user._id,
    eventId: registration.eventId
  })
    .select('_id')
    .lean();
  if (duplicate) {
    throw new Error('You already have a registration for this event.');
  }

  registration.userId = user._id;
  registration.participantType = 'account';

  // save() rather than an atomic update, so the post-save hook re-syncs the Postgres
  // shadow — the row now has a user, and onsite operations resolve through it.
  await registration.save();

  // The guest links were the only way in while it had no owner. It has one now, so they
  // stop working; a forwarded link must not outlive the claim.
  await revokeTokensForRegistration(registration._id);

  recordCriticalAuditEventInBackground({
    actorMongoUserId: user._id,
    action: 'registration.claimed',
    targetType: 'registration',
    targetId: String(registration._id),
    statusFrom: 'guest',
    statusTo: 'account',
    notes: `Claimed by ${claimantEmail}`,
    occurredAt: new Date()
  });

  logger.debug(`[Claim] Registration ${registration._id} claimed by user ${user._id}`);
  return registration;
}

module.exports = {
  getClaimEligibilityError,
  findClaimableRegistrations,
  claimRegistration
};
