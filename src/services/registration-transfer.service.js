// src/services/registration-transfer.service.js
// Handing a registration to somebody else.
//
// The policy this implements, stated plainly because it is a decision and not a default:
//
//   A transfer moves **who is running**, and nothing else. It does not move, refund or
//   re-charge money. Whatever was paid stays with the registration; the two people settle
//   between themselves, and any fee the organiser wants to charge is out of band.
//
// That is not timidity, it is the rule this codebase already follows: runner-initiated
// cancellation is a *request* rather than a cancellation precisely because deciding the
// refund "is not ours to decide". A transfer that quietly moved money would be making the
// same call, on somebody else's bank account.
//
// The recipient signs the waiver themselves. A waiver is a statement about a person's own
// health and risk, so inheriting one would make it worthless — which is the whole reason
// the swap cannot be a simple name edit.

const mongoose = require('mongoose');
const RegistrationTransfer = require('../models/RegistrationTransfer');
const Registration = require('../models/Registration');
const User = require('../models/User');
const { generateToken, hashToken } = require('./token.service');
const { issueToken, revokeTokensForRegistration } = require('./guest-registration-token.service');
const { revokeTokensForRegistration: revokeBibTokens } = require('./bib-qr-token.service');
const { renderWaiverTemplate } = require('../utils/waiver');
const { recordCriticalAuditEventInBackground } = require('./critical-audit.service');
const communicationService = require('./communication.service');
const logger = require('../utils/logger');

// Long enough to reach somebody who is not expecting the email, short enough that a
// registration is not left in limbo through race week.
const TRANSFER_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function normaliseEmail(value) {
  return String(value || '').trim().toLowerCase();
}

/**
 * The moment after which a transfer can no longer complete.
 *
 * Falls back rather than defaulting to "never": an unbounded window would let a
 * registration change hands after the results are in.
 */
function transferDeadline(event) {
  return (
    event?.transferDeadlineAt || event?.registrationCloseAt || event?.eventStartAt || null
  );
}

/**
 * Why this event will or will not take a transfer right now.
 */
function getTransferBlock(event, now = new Date()) {
  if (!event) return { allowed: false, reason: 'unknown_event', message: 'Event not found.' };
  if (!event.transfersEnabled) {
    return { allowed: false, reason: 'disabled', message: 'This event does not allow transfers.' };
  }

  const deadline = transferDeadline(event);
  if (deadline && new Date(deadline).getTime() < now.getTime()) {
    return {
      allowed: false,
      reason: 'past_deadline',
      message: 'The transfer deadline for this event has passed.'
    };
  }

  return { allowed: true, reason: '', message: '' };
}

/**
 * Start a transfer.
 *
 * @returns {Promise<{transfer: Object, token: string}>} the raw token, returned once
 */
async function initiateTransfer({ event, registration, toEmail, reason = '', initiatedByUserId = null }) {
  const block = getTransferBlock(event);
  if (!block.allowed) {
    const error = new Error(block.message);
    error.code = 'TRANSFER_UNAVAILABLE';
    error.reason = block.reason;
    throw error;
  }

  if (registration.status === 'cancelled') {
    const error = new Error('A cancelled registration cannot be transferred.');
    error.code = 'NOT_TRANSFERABLE';
    throw error;
  }

  const recipient = normaliseEmail(toEmail);
  if (!recipient || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
    const error = new Error('Enter a valid email address for the person taking this entry.');
    error.code = 'INVALID_RECIPIENT';
    throw error;
  }

  if (recipient === normaliseEmail(registration.participant?.email)) {
    const error = new Error('That is already the email on this registration.');
    error.code = 'INVALID_RECIPIENT';
    throw error;
  }

  // The recipient must not already be in this event, or completing the transfer would give
  // one person two entries and leave a slot that nobody can use.
  const account = await User.findOne({ email: recipient }).select('_id').lean();
  const existing = await Registration.findOne({
    eventId: registration.eventId,
    status: { $ne: 'cancelled' },
    _id: { $ne: registration._id },
    $or: [{ 'participant.email': recipient }, ...(account ? [{ userId: account._id }] : [])]
  })
    .select('confirmationCode')
    .lean();
  if (existing) {
    const error = new Error(`${recipient} is already registered for this event.`);
    error.code = 'RECIPIENT_REGISTERED';
    error.confirmationCode = existing.confirmationCode;
    throw error;
  }

  const token = generateToken(32);
  let transfer;
  try {
    transfer = await RegistrationTransfer.create({
      registrationId: registration._id,
      eventId: registration.eventId,
      fromParticipant: {
        firstName: registration.participant?.firstName || '',
        lastName: registration.participant?.lastName || '',
        email: registration.participant?.email || '',
        mobile: registration.participant?.mobile || ''
      },
      fromUserId: registration.userId || null,
      fromParticipantType: registration.participantType || '',
      toEmail: recipient,
      toUserId: account?._id || null,
      status: 'pending_recipient',
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + TRANSFER_TOKEN_TTL_MS),
      initiatedByUserId,
      reason: String(reason || '').slice(0, 500),
      // Not a blocker: the two of them can sort the shirt out. But no second kit is coming,
      // and the organiser has to be able to see that before approving.
      kitAlreadyReleased: Boolean(registration.kitSizeReleased)
    });
  } catch (error) {
    if (error?.code === 11000) {
      const duplicate = new Error('A transfer is already in progress for this registration.');
      duplicate.code = 'TRANSFER_IN_PROGRESS';
      throw duplicate;
    }
    throw error;
  }

  return { transfer, token };
}

/**
 * Resolve a transfer link.
 *
 * Reasons rather than throws, so a page can distinguish "ran out" from "never existed"
 * without telling a stranger which.
 */
async function resolveTransferToken(rawToken) {
  const token = String(rawToken || '').trim();
  if (!token) return { ok: false, reason: 'missing' };
  if (!/^[a-f0-9]{64}$/i.test(token)) return { ok: false, reason: 'malformed' };

  const transfer = await RegistrationTransfer.findOne({ tokenHash: hashToken(token) }).exec();
  if (!transfer) return { ok: false, reason: 'unknown' };
  if (transfer.status === 'completed') return { ok: false, reason: 'used', transfer };
  if (transfer.status !== 'pending_recipient') return { ok: false, reason: 'inactive', transfer };
  if (transfer.expiresAt && transfer.expiresAt.getTime() < Date.now()) {
    return { ok: false, reason: 'expired', transfer };
  }
  return { ok: true, transfer };
}

/**
 * The recipient has filled in their details and signed.
 *
 * Records what they gave but changes nothing on the registration yet: when the organiser
 * has to approve, the entry must not move until they do.
 */
async function acceptTransfer({ transfer, event, form, acceptedByUserId = null }) {
  transfer.toParticipant = {
    firstName: form.firstName,
    lastName: form.lastName,
    email: transfer.toEmail, // fixed at initiation; the link is bound to it
    mobile: form.mobile
  };
  // Everything else the recipient supplied. This is the only place it is captured, and
  // completeTransfer reads it back rather than being handed a form — approval can arrive
  // hours later, from an organiser who has none of this.
  transfer.acceptedDetails = {
    emergencyContactName: form.emergencyContactName || '',
    emergencyContactNumber: form.emergencyContactNumber || '',
    waiverSignature: form.waiverSignature || '',
    kitSize: form.kitSize || ''
  };
  transfer.toUserId = acceptedByUserId || transfer.toUserId || null;
  transfer.acceptedAt = new Date();
  // One status either way: completion has a single path, and auto-approval is an explicit
  // second step below rather than a different state to reason about.
  transfer.status = 'pending_approval';
  await transfer.save();

  // Auto-approve when the organiser has said they do not need to see these. Done as an
  // explicit second step rather than a different status, so completion has one path.
  if (!event?.transferRequiresApproval) {
    return completeTransfer({ transfer, event, approvedByUserId: null });
  }

  return { transfer, completed: false };
}

/**
 * Replace the participant.
 *
 * Everything that identifies the old person has to go at the same moment as everything
 * that identifies the new one arrives — a half-done swap is somebody running under another
 * person's name and waiver.
 */
async function completeTransfer({ transfer, event, approvedByUserId = null }) {
  // Read from the transfer, never from a caller-supplied form. The approval route used to
  // pass a synthesised one, which wiped the emergency contact, stored a signature the
  // recipient never typed, and kept the previous participant's kit size.
  const accepted = transfer.acceptedDetails || {};
  const registration = await Registration.findById(transfer.registrationId).exec();
  if (!registration) {
    const error = new Error('That registration no longer exists.');
    error.code = 'NOT_FOUND';
    throw error;
  }
  if (registration.status === 'cancelled') {
    const error = new Error('That registration has been cancelled.');
    error.code = 'NOT_TRANSFERABLE';
    throw error;
  }

  const block = getTransferBlock(event);
  if (!block.allowed) {
    const error = new Error(block.message);
    error.code = 'TRANSFER_UNAVAILABLE';
    error.reason = block.reason;
    throw error;
  }

  const previousEmail = registration.participant?.email || '';

  registration.participant.firstName = transfer.toParticipant.firstName;
  registration.participant.lastName = transfer.toParticipant.lastName;
  registration.participant.email = transfer.toEmail;
  registration.participant.mobile = transfer.toParticipant.mobile || '';
  // The old person's emergency contact is not the new person's.
  registration.participant.emergencyContactName = accepted.emergencyContactName || '';
  registration.participant.emergencyContactNumber = accepted.emergencyContactNumber || '';

  // A transferred entry becomes a guest entry unless the recipient already has an account.
  // Asserting an identity from an address typed into a form is the same thing the walk-in
  // flow refuses to do, and for the same reason.
  registration.userId = transfer.toUserId || null;
  registration.participantType = transfer.toUserId ? 'account' : 'guest';

  // A waiver is about a person's own health and risk, so it cannot be inherited.
  registration.waiver = {
    accepted: true,
    version: event?.waiverVersion || registration.waiver?.version || 1,
    signature: accepted.waiverSignature || '',
    acceptedAt: new Date(),
    templateSnapshot: String(event?.waiverTemplate || registration.waiver?.templateSnapshot || ''),
    renderedSnapshot: renderWaiverTemplate(event?.waiverTemplate || '', {
      organizerName: event?.organiserName || '',
      eventTitle: event?.title || ''
    })
  };

  // Their size, not the previous person's. The kit that already went out, if any, is
  // recorded on the transfer rather than pretended away.
  // Their size, not the previous person's — including when they chose not to give one.
  registration.kitSize = accepted.kitSize || '';

  await registration.save();

  // Every credential the previous person held has to stop working now. The bib number is
  // kept — it is the same slot on the same start list — but its QR is reissued, so a
  // screenshot the old participant kept cannot be scanned in.
  await revokeBibTokens(registration._id, 'Registration transferred').catch((error) => {
    logger.error(`[Transfer] Could not revoke bib tokens for ${registration._id}: ${error.message}`);
  });
  // No second argument: that parameter is a *purpose* filter, not a reason string, so
  // passing text here would have matched no purpose and revoked nothing at all. Every
  // live link for this registration has to go, whatever it was for.
  await revokeTokensForRegistration(registration._id).catch((error) => {
    logger.error(`[Transfer] Could not revoke guest tokens for ${registration._id}: ${error.message}`);
  });

  // A guest recipient needs a way back to their own registration.
  let manageToken = '';
  if (!registration.userId) {
    const issued = await issueToken(registration._id, registration.eventId, 'manage');
    manageToken = issued.token;
  }

  transfer.status = 'completed';
  transfer.approvedByUserId = approvedByUserId || null;
  transfer.approvedAt = approvedByUserId ? new Date() : transfer.approvedAt;
  transfer.completedAt = new Date();
  transfer.resolvedAt = new Date();
  transfer.tokenHash = ''; // single use
  await transfer.save();

  recordCriticalAuditEventInBackground({
    actorMongoUserId: approvedByUserId || transfer.initiatedByUserId,
    action: 'registration.transferred',
    targetType: 'registration',
    targetId: String(registration._id),
    statusFrom: previousEmail,
    statusTo: registration.participant.email,
    notes: `Transferred from ${previousEmail} to ${registration.participant.email}.${
      transfer.kitAlreadyReleased ? ' Kit had already been collected.' : ''
    }`,
    occurredAt: new Date()
  });

  return { transfer, registration, manageToken, completed: true };
}

/**
 * End a transfer without completing it.
 */
async function resolveWithout(transfer, status, { reason = '', actedByUserId = null } = {}) {
  if (!['declined', 'expired', 'cancelled'].includes(status)) {
    throw new Error(`resolveWithout cannot set status ${status}`);
  }
  transfer.status = status;
  transfer.declineReason = String(reason || '').slice(0, 500);
  transfer.approvedByUserId = actedByUserId || transfer.approvedByUserId || null;
  transfer.resolvedAt = new Date();
  transfer.tokenHash = '';
  await transfer.save();
  return transfer;
}

/**
 * Expire transfers whose link has run out.
 *
 * Nothing is held by a pending transfer — no slot, no stock — so this is housekeeping
 * rather than a correction. It still matters: the partial unique index means a stale
 * pending transfer blocks the registration from ever being transferred again.
 */
async function expireStaleTransfers({ now = new Date(), limit = 200 } = {}) {
  const stale = await RegistrationTransfer.find({
    status: { $in: ['pending_recipient', 'pending_approval'] },
    expiresAt: { $ne: null, $lt: now }
  })
    .sort({ expiresAt: 1 })
    .limit(limit)
    .exec();

  let expired = 0;
  for (const transfer of stale) {
    try {
      await resolveWithout(transfer, 'expired');
      expired += 1;
    } catch (error) {
      logger.error(`[Transfer] Could not expire ${transfer._id}: ${error.message}`);
    }
  }
  return { expired };
}

/**
 * Tell the recipient there is an entry waiting for them.
 *
 * Awaited, like the waitlist offer and for the same reason: the link is the only way to act
 * on it, and whoever started the transfer needs to know whether it actually went.
 */
async function sendTransferInvite({ event, transfer, token }) {
  const baseUrl = String(process.env.APP_URL || '').replace(/\/$/, '');
  await communicationService.notify('registration.transfer_invited', {
    email: {
      to: transfer.toEmail,
      firstName: transfer.toParticipant?.firstName || '',
      fromName: `${transfer.fromParticipant?.firstName || ''} ${transfer.fromParticipant?.lastName || ''}`.trim(),
      eventTitle: event?.title || 'an event',
      transferUrl: `${baseUrl}/transfers/${token}`,
      expiresAt: transfer.expiresAt
        ? new Date(transfer.expiresAt).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })
        : '',
      metadata: {
        transferId: String(transfer._id),
        eventId: String(transfer.eventId)
      }
    }
  });
}

async function listTransfersForEvent(eventId, { includeResolved = true } = {}) {
  const query = { eventId: new mongoose.Types.ObjectId(String(eventId)) };
  if (!includeResolved) query.status = { $in: ['pending_recipient', 'pending_approval'] };
  return RegistrationTransfer.find(query).sort({ createdAt: -1 }).lean();
}

module.exports = {
  initiateTransfer,
  resolveTransferToken,
  acceptTransfer,
  completeTransfer,
  resolveWithout,
  expireStaleTransfers,
  sendTransferInvite,
  listTransfersForEvent,
  getTransferBlock,
  transferDeadline,
  TRANSFER_TOKEN_TTL_MS
};
