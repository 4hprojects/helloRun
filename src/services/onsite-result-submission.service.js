// src/services/onsite-result-submission.service.js
// Bridges an approved onsite result into the submission pipeline.
//
// Rankings, leaderboards and certificates all key off Mongo `Submission` /
// `submissions_core`. Onsite results live in Postgres `onsite_results` and previously
// reached none of it — an onsite finisher got a badge and nothing else. Rather than
// teaching ranking, leaderboard and certificate code to read a second source, an
// approved onsite result is materialised as a Submission so every existing consumer
// works unchanged. `Submission.participationMode` already carries 'onsite', and
// `leaderboard.service.js` already filters on it; it was waiting for rows that never came.

const mongoose = require('mongoose');
const Submission = require('../models/Submission');
const Registration = require('../models/Registration');
const Event = require('../models/Event');
const { getPostgresClient } = require('../db/postgres');
const logger = require('../utils/logger');

/**
 * Best-effort distance in km for a race-distance label such as "10K" or "21.1 km".
 * Returns null when nothing sensible can be read, so the caller can refuse rather
 * than invent a distance that would feed a ranking.
 */
function parseDistanceLabelKm(label) {
  const text = String(label || '').trim().toLowerCase();
  if (!text) return null;

  // A signed number is not a distance. Without this the sign is skipped and "-5K"
  // would read as 5 km.
  if (/-\s*\d/.test(text)) return null;

  const match = text.match(/(\d+(?:\.\d+)?)\s*(k|km|kilometer|kilometre)?/);
  if (!match) return null;

  const value = Number.parseFloat(match[1]);
  if (!Number.isFinite(value) || value <= 0) return null;
  return value;
}

/**
 * Resolve the distance to record, preferring the most specific source available.
 */
function resolveDistanceKm({ resultDistanceKm, event, registration }) {
  const fromResult = Number.parseFloat(resultDistanceKm);
  if (Number.isFinite(fromResult) && fromResult > 0) return fromResult;

  const categoryId = registration?.pricingSnapshot?.raceCategoryId;
  if (categoryId) {
    const category = (event?.raceCategories || []).find(
      (item) => String(item.categoryId || '') === String(categoryId)
    );
    const fromCategory = Number.parseFloat(category?.distanceKm);
    if (Number.isFinite(fromCategory) && fromCategory > 0) return fromCategory;
    const fromCategoryLabel = parseDistanceLabelKm(category?.distanceLabel || category?.name);
    if (fromCategoryLabel) return fromCategoryLabel;
  }

  return parseDistanceLabelKm(registration?.raceDistance);
}

function buildSubmissionUpdate({ registration, event, elapsedMs, distanceKm, performedBy }) {
  return {
    eventId: registration.eventId,
    runnerId: registration.userId,
    participationMode: 'onsite',
    raceDistance: registration.raceDistance || '',
    distanceKm,
    elapsedMs,
    // A marshal-recorded finish has no uploaded evidence. Saying so plainly is more
    // honest than fabricating proof metadata.
    proofType: 'manual',
    proofNotes: 'Recorded onsite by event staff.',
    runDate: event?.startDate || new Date(),
    runType: 'run',
    status: 'approved',
    reviewedAt: new Date(),
    reviewedBy: performedBy && mongoose.Types.ObjectId.isValid(String(performedBy))
      ? new mongoose.Types.ObjectId(String(performedBy))
      : null,
    reviewNotes: 'Approved from an onsite result.'
  };
}

/**
 * Materialise an approved onsite result as an approved Submission and run the shared
 * post-approval pipeline.
 *
 * @param {Object} input
 * @param {string} input.mongoEventId
 * @param {string} input.mongoRegistrationId
 * @param {number} input.elapsedMs
 * @param {number|string|null} [input.distanceKm] - distance from the onsite result row
 * @param {string|null} [input.performedBy] - Mongo user id of the approving staff member
 * @returns {Promise<Object|null>} the submission, or null when it could not be created
 */
async function materialiseApprovedOnsiteResult(input) {
  const {
    mongoEventId,
    mongoRegistrationId,
    elapsedMs,
    distanceKm: resultDistanceKm = null,
    performedBy = null
  } = input || {};

  if (!mongoose.Types.ObjectId.isValid(String(mongoRegistrationId || ''))) {
    throw new Error(`Invalid registration id: ${mongoRegistrationId}`);
  }

  const elapsed = Number.parseInt(elapsedMs, 10);
  if (!Number.isFinite(elapsed) || elapsed < 1) {
    throw new Error('An onsite result needs a finish time before it can count towards results.');
  }

  const registration = await Registration.findById(mongoRegistrationId)
    .select('eventId userId raceDistance pricingSnapshot participationMode')
    .lean();
  if (!registration) {
    throw new Error(`Registration not found: ${mongoRegistrationId}`);
  }
  // No account is not a reason to lose a finish time. This used to throw, under a comment
  // predicting the problem it would cause once guest registration existed — and five of the
  // six ways to register now produce a guest. The submission is created and ranks; the
  // certificate and badges are the parts that genuinely need an account, and they are
  // issued when the registration is claimed with a verified email.
  const hasAccount = Boolean(registration.userId);

  const event = await Event.findById(mongoEventId || registration.eventId)
    .select('slug title startDate raceCategories')
    .lean();
  if (!event) {
    throw new Error(`Event not found: ${mongoEventId || registration.eventId}`);
  }

  const distance = resolveDistanceKm({ resultDistanceKm, event, registration });
  if (!Number.isFinite(distance) || distance < 0.1) {
    throw new Error(
      'Could not determine a race distance for this result. Set the category distance, then approve again.'
    );
  }

  // One submission per registration is enforced by a unique index, so re-approving
  // updates the existing row rather than failing.
  const submission = await Submission.findOneAndUpdate(
    { registrationId: registration._id },
    { $set: buildSubmissionUpdate({ registration, event, elapsedMs: elapsed, distanceKm: distance, performedBy }) },
    { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
  );

  const {
    applyApprovedSubmissionEffects,
    syncSubmissionShadowInBackground
  } = require('./submission.service');

  syncSubmissionShadowInBackground(submission);
  await applyApprovedSubmissionEffects(submission, event, { performedBy });

  logger.debug(
    `[Onsite] Approved result materialised as submission ${submission._id} for registration ${mongoRegistrationId}` +
      (hasAccount ? '' : ' (no account yet — certificate and badges wait for a claim)')
  );
  // `hasAccount` travels with the submission so the organiser can be told what did and did
  // not happen, rather than the difference being silent.
  submission.hasAccount = hasAccount;
  return submission;
}

/**
 * Give a newly claimed registration everything its guest self could not have.
 *
 * An onsite result approved before the claim ranks but stops short of a certificate and
 * badges, because those name a person and this codebase does not treat an email typed at a
 * desk as proof of identity. Claiming with a verified email is that proof, so this is where
 * the rest arrives.
 *
 * Never throws: the claim is already recorded and correct, and failing it because a
 * certificate could not be drawn would be the wrong trade.
 */
async function materialiseClaimedRegistration({ registration, user }) {
  try {
    const { syncRegistrationPaymentShadow } = require('./registration-payment-shadow.service');
    // Awaited on purpose. The post-save hook does not, and the Postgres row must already
    // carry the app user before the onsite backfill below can resolve it — the same reason
    // walk-in registration awaits it before offering a bib.
    await syncRegistrationPaymentShadow(registration, { operation: 'live_sync' });

    const submission = await Submission.findOneAndUpdate(
      { registrationId: registration._id, runnerId: null },
      { $set: { runnerId: user._id } },
      { new: true }
    );

    // The onsite rows were written with a null runner because there was none. Left alone
    // they stay null for good, and every report keyed on the runner would miss this person.
    const sql = getPostgresClient();
    if (sql) {
      await sql`
        UPDATE onsite_results ores
        SET runner_user_id = r.app_user_id
        FROM registrations r
        WHERE ores.registration_id = r.id
          AND r.mongo_registration_id = ${String(registration._id)}
          AND ores.runner_user_id IS NULL
          AND r.app_user_id IS NOT NULL
      `;
      await sql`
        UPDATE check_ins ci
        SET runner_user_id = r.app_user_id
        FROM registrations r
        WHERE ci.registration_id = r.id
          AND r.mongo_registration_id = ${String(registration._id)}
          AND ci.runner_user_id IS NULL
          AND r.app_user_id IS NOT NULL
      `;
      await sql`
        UPDATE bib_assignments ba
        SET runner_user_id = r.app_user_id
        FROM registrations r
        WHERE ba.registration_id = r.id
          AND r.mongo_registration_id = ${String(registration._id)}
          AND ba.runner_user_id IS NULL
          AND r.app_user_id IS NOT NULL
      `;
    }

    if (!submission) return { materialised: false, reason: 'no_pending_result' };

    const { applyApprovedSubmissionEffects, syncSubmissionShadowInBackground } = require('./submission.service');
    const event = await Event.findById(registration.eventId).select('slug title').lean();
    syncSubmissionShadowInBackground(submission);
    await applyApprovedSubmissionEffects(submission, event, { performedBy: user._id });

    logger.debug(`[Claim] Materialised submission ${submission._id} for newly claimed registration ${registration._id}`);
    return { materialised: true, submissionId: String(submission._id) };
  } catch (error) {
    logger.error(`[Claim] Could not materialise result for ${registration._id}: ${error.message}`);
    return { materialised: false, reason: 'error' };
  }
}

module.exports = {
  materialiseClaimedRegistration,
  materialiseApprovedOnsiteResult,
  // exported for unit tests
  parseDistanceLabelKm,
  resolveDistanceKm,
  buildSubmissionUpdate
};
