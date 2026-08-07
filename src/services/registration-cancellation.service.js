// src/services/registration-cancellation.service.js
// Organiser-initiated registration cancellation.
//
// `cancelled` and `refunded` were already valid Registration statuses and downstream code
// reacted to them — submissions are blocked, the runner dashboard buckets them into
// history — but nothing ever set them. The app's own policy copy said as much: "No general
// runner-facing cancellation endpoint currently exists."
//
// Cancelling has to reach more than the Mongo document: the slot must free up, the bib
// must become reusable, and any check-in must stop counting.

const mongoose = require('mongoose');
const Registration = require('../models/Registration');
const Event = require('../models/Event');
const User = require('../models/User');
const { getPostgresClient } = require('../db/postgres');
const communicationService = require('./communication.service');
const { recordCriticalAuditEventInBackground } = require('./critical-audit.service');
const { releaseCategorySlot } = require('./category-capacity.service');
const { revokeTokensForRegistration } = require('./bib-qr-token.service');
const logger = require('../utils/logger');

const CANCELLABLE_STATUSES = ['pending_payment', 'paid', 'confirmed'];

/**
 * Release the onsite artefacts a cancelled registration should no longer hold.
 *
 * Voiding the bib matters because the live-bib index is partial on
 * `assignment_status <> 'voided'` — voiding is what lets the organiser reissue that
 * number to somebody else. Best effort: the cancellation itself is already recorded in
 * Mongo, and failing here must not undo it.
 */
async function releaseOnsiteArtefacts(registrationId) {
  try {
    const sql = getPostgresClient();
    const rows = await sql`
      SELECT id FROM registrations WHERE mongo_registration_id = ${String(registrationId)} LIMIT 1
    `;
    if (rows.length === 0) return { released: false, reason: 'No onsite record for this registration.' };

    const registrationCoreId = rows[0].id;

    await sql`
      UPDATE bib_assignments
      SET assignment_status = 'voided', updated_at = CURRENT_TIMESTAMP
      WHERE registration_id = ${registrationCoreId} AND assignment_status <> 'voided'
    `;
    await sql`
      UPDATE check_ins
      SET check_in_status = 'cancelled', updated_at = CURRENT_TIMESTAMP
      WHERE registration_id = ${registrationCoreId}
    `;

    return { released: true };
  } catch (error) {
    logger.error(`[Cancellation] Could not release onsite artefacts for ${registrationId}: ${error.message}`);
    return { released: false, reason: error.message };
  }
}

/**
 * Cancel a registration on the organiser's behalf.
 *
 * @param {Object} input
 * @param {string} input.registrationId
 * @param {string} input.eventId - the event the caller is authorised for
 * @param {string} input.actorUserId
 * @param {string} [input.reason]
 * @returns {Promise<Object>} the cancelled registration plus onsite release outcome
 */
async function cancelRegistration({ registrationId, eventId, actorUserId, reason = '' }) {
  if (!mongoose.Types.ObjectId.isValid(String(registrationId || ''))) {
    throw new Error('Invalid registration reference.');
  }

  const registration = await Registration.findById(registrationId);
  if (!registration) {
    throw new Error('Registration not found.');
  }

  // The caller is authorised for one event; never let that authority reach another.
  if (String(registration.eventId) !== String(eventId)) {
    throw new Error('That registration does not belong to this event.');
  }

  if (registration.status === 'cancelled') {
    throw new Error('This registration is already cancelled.');
  }
  if (!CANCELLABLE_STATUSES.includes(registration.status)) {
    throw new Error(`A ${registration.status} registration cannot be cancelled.`);
  }

  const previousStatus = registration.status;
  registration.status = 'cancelled';
  registration.cancelledAt = new Date();
  registration.cancelledBy = actorUserId || null;
  registration.cancellationReason = String(reason || '').trim().slice(0, 500);

  // save() rather than an atomic update, so the post-save hook syncs the new status to
  // the Postgres shadow. The capacity check counts confirmed registrations, so the slot
  // frees up as a consequence of this write.
  await registration.save();

  const onsite = await releaseOnsiteArtefacts(registration._id);
  await revokeTokensForRegistration(registration._id, 'Registration cancelled');

  // Give the category slot back. The old count-based check did this implicitly by no
  // longer counting a cancelled row; with an explicit counter it has to be explicit too.
  const categoryId = registration.pricingSnapshot?.raceCategoryId;
  if (categoryId) {
    await releaseCategorySlot(registration.eventId, categoryId);
  }

  recordCriticalAuditEventInBackground({
    actorMongoUserId: actorUserId,
    action: 'registration.cancelled',
    targetType: 'registration',
    targetId: String(registration._id),
    statusFrom: previousStatus,
    statusTo: 'cancelled',
    notes: registration.cancellationReason,
    occurredAt: registration.cancelledAt
  });

  notifyRunnerInBackground(registration);

  return { registration, onsite };
}

/**
 * A runner asks to be cancelled.
 *
 * This records the ask and tells the organiser; it does not cancel. Cancelling a paid
 * registration decides what happens to the money, and that is the organiser's call, not
 * something to infer from a runner tapping a button.
 *
 * @param {Object} input
 * @param {string} input.registrationId
 * @param {string} input.userId - the signed-in runner; scopes the lookup to their own row
 * @param {string} [input.reason]
 */
async function requestCancellation({ registrationId, userId, reason = '' }) {
  if (!mongoose.Types.ObjectId.isValid(String(registrationId || ''))) {
    throw new Error('Invalid registration reference.');
  }

  const registration = await Registration.findOne({ _id: registrationId, userId });
  if (!registration) {
    throw new Error('Registration not found.');
  }

  if (registration.status === 'cancelled') {
    throw new Error('This registration is already cancelled.');
  }
  if (!CANCELLABLE_STATUSES.includes(registration.status)) {
    throw new Error(`A ${registration.status} registration cannot be cancelled.`);
  }
  if (registration.cancellationRequestedAt) {
    throw new Error('You have already asked to cancel this registration.');
  }

  registration.cancellationRequestedAt = new Date();
  registration.cancellationRequestReason = String(reason || '').trim().slice(0, 500);
  await registration.save();

  recordCriticalAuditEventInBackground({
    actorMongoUserId: userId,
    action: 'registration.cancellation_requested',
    targetType: 'registration',
    targetId: String(registration._id),
    statusFrom: registration.status,
    statusTo: registration.status,
    notes: registration.cancellationRequestReason,
    occurredAt: registration.cancellationRequestedAt
  });

  notifyOrganiserInBackground(registration);

  return registration;
}

function notifyOrganiserInBackground(registration) {
  (async () => {
    try {
      const event = await Event.findById(registration.eventId)
        .select('title organizerId')
        .lean();
      if (!event?.organizerId) return;

      const organiser = await User.findById(event.organizerId).select('email firstName').lean();
      if (!organiser?.email) return;

      const runnerName =
        [registration.participant?.firstName, registration.participant?.lastName]
          .filter(Boolean)
          .join(' ') || 'A runner';

      await communicationService.notify('registration.cancellation_requested', {
        notification: {
          userId: event.organizerId,
          type: 'registration_cancellation_requested',
          title: 'Cancellation requested',
          message: `${runnerName} asked to cancel their registration for ${event.title || 'your event'}.`,
          href: `/organizer/events/${registration.eventId}/registrants`,
          metadata: {
            registrationId: String(registration._id),
            eventId: String(registration.eventId)
          }
        },
        email: {
          to: organiser.email,
          firstName: organiser.firstName || '',
          eventTitle: event.title || 'your event',
          runnerName,
          confirmationCode: registration.confirmationCode || '',
          cancellationReason: registration.cancellationRequestReason || '',
          recipientUserId: event.organizerId,
          metadata: {
            registrationId: String(registration._id),
            eventId: String(registration.eventId)
          }
        }
      });
    } catch (error) {
      // A failed notification must not undo a recorded request.
      logger.error(`[Cancellation] Organiser notification failed: ${error.message}`);
    }
  })();
}

function notifyRunnerInBackground(registration) {
  (async () => {
    try {
      const event = await Event.findById(registration.eventId).select('title').lean();
      const eventTitle = event?.title || 'the event';
      const reasonSuffix = registration.cancellationReason
        ? ` Reason: ${registration.cancellationReason}`
        : '';

      await communicationService.notify('registration.cancelled', {
        notification: {
          userId: registration.userId,
          type: 'registration_cancelled',
          title: 'Registration cancelled',
          message: `Your registration for ${eventTitle} was cancelled.${reasonSuffix}`,
          href: '/my-registrations',
          metadata: {
            registrationId: String(registration._id),
            eventId: String(registration.eventId),
            eventTitle
          }
        },
        email: {
          to: registration.participant?.email || '',
          firstName: registration.participant?.firstName || '',
          eventTitle,
          confirmationCode: registration.confirmationCode || '',
          cancellationReason: registration.cancellationReason || '',
          recipientUserId: registration.userId,
          metadata: {
            registrationId: String(registration._id),
            eventId: String(registration.eventId)
          }
        }
      });
    } catch (error) {
      // A failed notification must not undo a recorded cancellation.
      logger.error(`[Cancellation] Runner notification failed: ${error.message}`);
    }
  })();
}

module.exports = {
  cancelRegistration,
  requestCancellation,
  releaseOnsiteArtefacts,
  CANCELLABLE_STATUSES
};
