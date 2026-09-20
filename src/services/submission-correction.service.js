'use strict';

// Organizer / co-organizer corrections to the values of a submitted entry.
//
// Status changes stay with the review services. This only fixes the recorded values
// (distance, elapsed time, run date, location, run type) and, for an entry that is
// already approved, re-runs everything derived from them: the published ranking, the
// leaderboard cache, accumulated progress, the certificate and value-dependent badges. Every correction is
// audit-logged, stored as structured before/after pairs for the runner-facing history,
// and announced to the runner.

const mongoose = require('mongoose');
const Submission = require('../models/Submission');
const AccumulatedActivitySubmission = require('../models/AccumulatedActivitySubmission');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const User = require('../models/User');
const logger = require('../utils/logger');
const { assertRunDateNotFuture } = require('../utils/platform-date');
const { resolveChallengeConfig } = require('../utils/challenge-metrics');
const { compareSubmissionWithOcr } = require('../utils/submission-integrity');
const { resolveEventAccess } = require('./event-access.service');
const { syncEventRankingsInBackground } = require('./submission.service');
const {
  refreshAccumulatedChallengeProgress,
  refreshGlobalDistanceMilestoneProgress
} = require('./badge-progress.service');
const { reconcileRankBadgesForRunner } = require('./achievement.service');
const { reconcileAccumulatedCertificateAfterReview } = require('./accumulated-activity.service');
const { issueSubmissionCertificate } = require('./certificate.service');
const { invalidateLeaderboardCache } = require('./leaderboard.service');
const { notifyWithRetry } = require('./reliable-communication.service');
const { recordCriticalAuditEventInBackground } = require('./critical-audit.service');

const MIN_REASON_LENGTH = 5;
const MAX_REASON_LENGTH = 500;
const MIN_DISTANCE_KM = 0.1;
const MAX_DISTANCE_KM = 500;
const MAX_ELAPSED_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_ELEVATION_M = 20000;
const MAX_STEPS = 200000;
const MAX_DEVICE_LENGTH = 120;
const RUN_TYPES = Object.freeze(['run', 'walk', 'hike', 'trail_run', 'treadmill']);

const FIELD_LABELS = Object.freeze({
  distanceKm: 'Distance',
  elapsedMs: 'Elapsed time',
  runDate: 'Run date',
  runLocation: 'Location',
  runType: 'Activity type',
  elevationGain: 'Elevation gain',
  steps: 'Steps',
  trackingAppDevice: 'Tracking app or device'
});

// The values the OCR comparison looks at. Correcting any of them can make an OCR warning true or
// false, so it is the trigger for refreshing those warnings; nothing else is ever touched.
const OCR_COMPARED_FIELDS = Object.freeze(['distanceKm', 'elapsedMs', 'runDate', 'runLocation', 'runType', 'elevationGain', 'steps']);
const OCR_MISMATCH_KEYS = Object.freeze([
  'distanceMismatch', 'timeMismatch', 'elevationMismatch', 'stepsMismatch', 'dateMismatch', 'locationMismatch', 'runTypeMismatch'
]);

function normalizeCorrectionReason(value) {
  return String(value || '').trim().slice(0, MAX_REASON_LENGTH);
}

function isProvided(value) {
  return value !== undefined && value !== null && String(value).trim() !== '';
}

function formatElapsed(ms) {
  const totalSeconds = Math.max(0, Math.floor(Number(ms || 0) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, '0')).join(':');
}

function toDateKey(value) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
}

function parseRunDate(value) {
  const raw = String(value).trim();
  const date = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? new Date(`${raw}T00:00:00.000Z`) : new Date(raw);
  if (Number.isNaN(date.getTime())) throw new Error('Run date is invalid.');
  return assertRunDateNotFuture(date);
}

/**
 * Validates the submitted values against the record and works out what actually changes.
 * Pure: touches no database, so the rules are unit-testable.
 *
 * Blank distance / time / date / type mean "leave as is"; the form pre-fills them. A blank
 * location is a real value (clearing it), so it is only skipped when the field is absent.
 * Elapsed time compares at whole-second precision, because the form cannot express
 * milliseconds and would otherwise report a phantom change on untouched entries.
 *
 * Elevation, steps and the tracking app or device are optional details the form pre-fills, so
 * for them an absent field is left alone and a blank one means "clear". `context` says which of
 * them the event requires: `tracksSteps` (steps competitions) and `requireTrackingAppDevice`.
 *
 * @returns {{ changes: Array<{field: string, from: *, to: *}>, values: object }}
 */
function buildCorrection(record, input = {}, context = {}) {
  const changes = [];
  const values = {};

  if (isProvided(input.distanceKm)) {
    const numeric = Number(input.distanceKm);
    if (!Number.isFinite(numeric) || numeric < MIN_DISTANCE_KM || numeric > MAX_DISTANCE_KM) {
      throw new Error(`Distance must be between ${MIN_DISTANCE_KM} and ${MAX_DISTANCE_KM} km.`);
    }
    const next = Math.round(numeric * 100) / 100;
    const before = record.distanceKm === null || record.distanceKm === undefined ? null : Number(record.distanceKm);
    if (before === null || Math.round(before * 100) / 100 !== next) {
      changes.push({ field: 'distanceKm', from: before, to: next });
      values.distanceKm = next;
    }
  }

  if (isProvided(input.elapsedMs)) {
    const numeric = Number(input.elapsedMs);
    if (!Number.isFinite(numeric) || numeric < 1000 || numeric > MAX_ELAPSED_MS) {
      throw new Error('Elapsed time must be between 00:00:01 and 168 hours.');
    }
    const next = Math.round(numeric);
    if (Math.floor(Number(record.elapsedMs || 0) / 1000) !== Math.floor(next / 1000)) {
      changes.push({ field: 'elapsedMs', from: Number(record.elapsedMs || 0), to: next });
      values.elapsedMs = next;
    }
  }

  if (isProvided(input.runDate)) {
    const next = parseRunDate(input.runDate);
    if (toDateKey(record.runDate) !== toDateKey(next)) {
      changes.push({
        field: 'runDate',
        from: record.runDate ? toDateKey(record.runDate) : null,
        to: toDateKey(next)
      });
      values.runDate = next;
    }
  }

  if (input.runLocation !== undefined && input.runLocation !== null) {
    const next = String(input.runLocation).trim().slice(0, 200);
    const before = String(record.runLocation || '');
    if (before !== next) {
      changes.push({ field: 'runLocation', from: before, to: next });
      values.runLocation = next;
    }
  }

  if (isProvided(input.runType)) {
    const next = String(input.runType).trim().toLowerCase();
    if (!RUN_TYPES.includes(next)) throw new Error('Activity type is not recognized.');
    if (String(record.runType || 'run') !== next) {
      changes.push({ field: 'runType', from: String(record.runType || 'run'), to: next });
      values.runType = next;
    }
  }

  if (input.elevationGain !== undefined && input.elevationGain !== null) {
    const raw = String(input.elevationGain).trim();
    let next = null;
    if (raw !== '') {
      const numeric = Number(raw);
      if (!Number.isFinite(numeric) || numeric < 0 || numeric > MAX_ELEVATION_M) {
        throw new Error(`Elevation gain must be between 0 and ${MAX_ELEVATION_M.toLocaleString('en-US')} m.`);
      }
      next = Math.round(numeric);
    }
    const before = record.elevationGain === null || record.elevationGain === undefined ? null : Math.round(Number(record.elevationGain));
    if (before !== next) {
      changes.push({ field: 'elevationGain', from: before, to: next });
      values.elevationGain = next;
    }
  }

  if (input.steps !== undefined && input.steps !== null) {
    const raw = String(input.steps).trim();
    let next = null;
    if (raw === '') {
      if (context.tracksSteps) {
        throw new Error(`Steps are required for this event and must be between 1 and ${MAX_STEPS.toLocaleString('en-US')}.`);
      }
    } else {
      const numeric = Number(raw);
      if (!Number.isInteger(numeric) || numeric < 1 || numeric > MAX_STEPS) {
        throw new Error(`Steps must be a whole number between 1 and ${MAX_STEPS.toLocaleString('en-US')}.`);
      }
      next = numeric;
    }
    const before = record.steps === null || record.steps === undefined ? null : Number(record.steps);
    if (before !== next) {
      changes.push({ field: 'steps', from: before, to: next });
      values.steps = next;
    }
  }

  if (input.trackingAppDevice !== undefined && input.trackingAppDevice !== null) {
    const next = String(input.trackingAppDevice).trim().slice(0, MAX_DEVICE_LENGTH);
    if (!next && context.requireTrackingAppDevice) {
      throw new Error('Tracking app or device is required for this event.');
    }
    const before = String(record.trackingAppDevice || '');
    if (before !== next) {
      changes.push({ field: 'trackingAppDevice', from: before, to: next });
      values.trackingAppDevice = next;
    }
  }

  if (!changes.length) throw new Error('No changes were made to this entry.');
  return { changes, values };
}

/**
 * Recompute the OCR mismatch warnings from the entry's current (corrected) values and the OCR
 * extraction stored at submission, so fixing a value to match the proof clears its warning and
 * moving away from it raises one. Only the seven `*Mismatch` flags are ever written:
 * `suspiciousFlag`, `validation` and `status` are the organizer's call and stay as they were.
 * Pure apart from writing those flags onto `record.ocrData`.
 *
 * @returns {string[]} the flags whose value changed
 */
function refreshOcrComparisons(record) {
  if (!record.ocrData) record.ocrData = {};
  const stored = typeof record.ocrData.toObject === 'function' ? record.ocrData.toObject() : record.ocrData;
  const comparisons = compareSubmissionWithOcr({
    distanceKm: record.distanceKm,
    elapsedMs: record.elapsedMs,
    runDate: record.runDate,
    runLocation: record.runLocation,
    runType: record.runType,
    elevationGain: record.elevationGain,
    steps: record.steps,
    ocrData: stored
  });
  const changed = OCR_MISMATCH_KEYS.filter((key) => Boolean(stored[key]) !== Boolean(comparisons[key]));
  changed.forEach((key) => { record.ocrData[key] = Boolean(comparisons[key]); });
  return changed;
}

function formatChangeValue(field, value) {
  if (value === null || value === undefined || value === '') return 'not set';
  if (field === 'distanceKm') return `${Number(value).toFixed(2)} km`;
  if (field === 'elapsedMs') return formatElapsed(value);
  if (field === 'elevationGain') return `${Number(value)} m`;
  if (field === 'steps') return Number(value).toLocaleString('en-US');
  return String(value);
}

/** Human-readable "Field: old -> new" lines for the runner notification and audit notes. */
function describeChanges(changes = []) {
  return changes.map((change) => (
    `${FIELD_LABELS[change.field] || change.field}: ${formatChangeValue(change.field, change.from)} to ${formatChangeValue(change.field, change.to)}`
  ));
}

async function findEntry(submissionId) {
  if (!mongoose.Types.ObjectId.isValid(String(submissionId || ''))) return null;
  const submission = await Submission.findById(submissionId);
  if (submission) return { record: submission, submissionKind: 'standard' };
  const activity = await AccumulatedActivitySubmission.findById(submissionId);
  if (activity) return { record: activity, submissionKind: 'accumulated' };
  return null;
}

async function regenerateStandardCertificate({ record, event, actorUserId }) {
  const certificate = record.certificate || {};
  if (!certificate.url || certificate.status === 'revoked') return false;

  const [registration, runner] = await Promise.all([
    Registration.findById(record.registrationId).lean(),
    User.findById(record.runnerId).select('firstName lastName email').lean()
  ]);
  if (!registration || !runner) return false;

  const issued = await issueSubmissionCertificate({
    submission: record,
    registration,
    event,
    runner,
    certificateNumber: certificate.certificateNumber || ''
  });

  record.certificate = {
    url: issued.url || '',
    key: issued.key || '',
    issuedAt: certificate.issuedAt || issued.issuedAt || new Date(),
    certificateNumber: issued.certificateNumber || '',
    verificationUrl: issued.verificationUrl || '',
    templateId: issued.templateId || null,
    status: 'regenerated',
    revokedAt: null,
    regeneratedAt: new Date(),
    generationError: ''
  };
  await record.save();

  recordCriticalAuditEventInBackground({
    actorMongoUserId: actorUserId,
    action: 'certificate.regenerated',
    targetType: 'submission_certificate',
    targetId: String(record._id),
    statusFrom: '',
    statusTo: 'regenerated',
    notes: 'Certificate regenerated after an organizer corrected the entry values.',
    occurredAt: record.certificate.regeneratedAt
  });
  return true;
}

/**
 * Badges that depend on the corrected values, in the direction the values moved.
 *
 * Per-entry badges (result approved, distance completed, mode completed) depend on the
 * entry's status and category, never on its distance, time or date, so a correction cannot
 * change them. Three kinds are value-sensitive:
 * - accumulated challenge badges, handled by refreshAccumulatedChallengeProgress, which
 *   already awards and revokes;
 * - lifetime distance milestones, revoked or restored here when the distance changed;
 * - rank badges, reconciled for this runner once the re-rank has finished, when the time
 *   changed. Both revoke paths are scoped to the corrected runner.
 */
function reevaluateBadgesInBackground({ record, submissionKind, event, actorUserId, changes, ranking }) {
  if (!record.runnerId) return;
  const runnerId = String(record.runnerId);
  const changed = (field) => changes.some((change) => change.field === field);
  const logFailure = (kind) => (error) => {
    logger.error(`Correction could not re-evaluate ${kind} badges:`, {
      submissionId: String(record._id),
      error: error.message
    });
  };

  if (changed('distanceKm') && !record.isPersonalRecord) {
    refreshGlobalDistanceMilestoneProgress(runnerId, { performedBy: actorUserId, revokeUnmet: true })
      .catch(logFailure('distance milestone'));
  }

  if (submissionKind === 'standard' && changed('elapsedMs')) {
    // The ranking table must be re-ranked first, or the reconcile would judge stale ranks.
    Promise.resolve(ranking)
      .then(() => reconcileRankBadgesForRunner({
        mongoUserId: runnerId,
        mongoEventId: String(event._id),
        performedBy: actorUserId
      }))
      .catch(logFailure('rank'));
  }
}

async function applyApprovedEntryEffects({ record, submissionKind, event, actorUserId, changes }) {
  let certificateRegenerated = false;
  // Steps only matter to a certificate for accumulated entries, where steps competitions finalize
  // it from the summed steps.
  const affectsCertificate = changes.some((change) => (
    ['distanceKm', 'elapsedMs', 'runDate'].includes(change.field)
    || (submissionKind === 'accumulated' && change.field === 'steps')
  ));
  let ranking = null;

  if (submissionKind === 'standard') {
    if (affectsCertificate) {
      try {
        certificateRegenerated = await regenerateStandardCertificate({ record, event, actorUserId });
      } catch (error) {
        logger.error('Correction could not regenerate the certificate:', {
          submissionId: String(record._id),
          error: error.message
        });
      }
    }
    ranking = syncEventRankingsInBackground(record, event.slug);
  } else {
    refreshAccumulatedChallengeProgress(record.registrationId, { performedBy: actorUserId }).catch((error) => {
      logger.error('Correction could not refresh accumulated progress:', {
        activityId: String(record._id),
        error: error.message
      });
    });
    if (affectsCertificate) {
      try {
        // Accumulated certificates are finalized per registration from the approved totals,
        // so reconciling is what refreshes them. It is not reported to the runner as a
        // regeneration because the finalization service decides whether one is due.
        await reconcileAccumulatedCertificateAfterReview(record.registrationId, event);
      } catch (error) {
        logger.error('Correction could not reconcile the accumulated certificate:', {
          activityId: String(record._id),
          error: error.message
        });
      }
    }
  }

  reevaluateBadgesInBackground({ record, submissionKind, event, actorUserId, changes, ranking });

  invalidateLeaderboardCache(event.slug);
  return certificateRegenerated;
}

async function notifyRunnerOfCorrection({ record, submissionKind, event, changes, reason, certificateRegenerated }) {
  if (!record.runnerId) return;
  try {
    const [runner, registration] = await Promise.all([
      User.findById(record.runnerId).select('email firstName').lean(),
      Registration.findById(record.registrationId).select('confirmationCode').lean()
    ]);
    if (!runner) return;

    const changeLines = describeChanges(changes);
    await notifyWithRetry('result.corrected', {
      notification: {
        userId: record.runnerId,
        type: 'result_corrected',
        title: 'Entry corrected by organizer',
        message: `An organizer corrected your ${submissionKind === 'accumulated' ? 'activity' : 'result'} for ${event.title}. ${changeLines.join('; ')}.`.slice(0, 600),
        href: submissionKind === 'accumulated' ? '/my-registrations' : `/runner/submissions/${String(record._id)}`,
        metadata: {
          submissionId: String(record._id),
          registrationId: String(record.registrationId || ''),
          eventId: String(event._id),
          eventTitle: event.title
        }
      },
      email: runner.email ? {
        to: runner.email,
        firstName: runner.firstName || 'Runner',
        eventTitle: event.title,
        confirmationCode: registration?.confirmationCode || '',
        changeLines,
        reason,
        certificateRegenerated,
        recipientUserId: record.runnerId,
        metadata: {
          submissionId: String(record._id),
          registrationId: String(record.registrationId || '')
        }
      } : null
    }, {
      source: 'submission.values_corrected'
    });
  } catch (error) {
    // The correction is already saved and audited; a failed notice must not undo it.
    logger.error('Correction saved but the runner notification failed:', {
      submissionId: String(record._id),
      error: error.message
    });
  }
}

/**
 * @returns {Promise<{
 *   submissionKind: string,
 *   changes: Array<{field: string, from: *, to: *}>,
 *   certificateRegenerated: boolean,
 *   ocrWarningsChanged: string[]
 * }>}
 */
async function correctSubmissionValues({
  submissionId,
  actorUserId,
  actorRole,
  changes: input,
  reason,
  ipAddress,
  userAgent
}) {
  const safeReason = normalizeCorrectionReason(reason);
  if (safeReason.length < MIN_REASON_LENGTH) {
    throw new Error('Give a reason of at least 5 characters for this correction.');
  }

  const found = await findEntry(submissionId);
  if (!found) throw new Error('Entry not found.');
  const { record, submissionKind } = found;

  const normalizedRole = String(actorRole || '').trim().toLowerCase();
  const event = await Event.findById(record.eventId);
  if (!event) throw new Error('Entry not found or inaccessible.');
  if (normalizedRole !== 'admin' && !await resolveEventAccess({
    eventId: event._id,
    userId: actorUserId,
    userRole: normalizedRole
  })) {
    throw new Error('Entry not found or inaccessible.');
  }

  const challengeConfig = resolveChallengeConfig(typeof event.toObject === 'function' ? event.toObject() : event);
  const { changes, values } = buildCorrection(record, input, {
    tracksSteps: challengeConfig.tracksSteps,
    requireTrackingAppDevice: Boolean(event.requireTrackingAppDevice)
  });
  Object.assign(record, values);
  // Warnings must follow the corrected values (see refreshOcrComparisons); done before save so the
  // flags are stored with the correction.
  const ocrWarningsChanged = changes.some((change) => OCR_COMPARED_FIELDS.includes(change.field))
    ? refreshOcrComparisons(record)
    : [];
  const editedAt = new Date();
  record.organizerCorrections.push({ editedBy: actorUserId, editedAt, reason: safeReason, changes });
  await record.save();

  const targetType = submissionKind === 'accumulated' ? 'accumulated_activity_submission' : 'submission';
  // Self-correction is allowed (a sole organizer must be able to fix their own entry) but
  // recorded, as the review services do.
  if (record.runnerId && String(record.runnerId) === String(actorUserId || '')) {
    recordCriticalAuditEventInBackground({
      actorMongoUserId: actorUserId,
      action: 'submission.self_reviewed',
      targetType,
      targetId: String(record._id),
      statusFrom: record.status,
      statusTo: record.status,
      notes: 'Reviewer is the runner on this entry (values corrected).',
      ipAddress,
      userAgent,
      occurredAt: editedAt
    });
  }
  recordCriticalAuditEventInBackground({
    actorMongoUserId: actorUserId,
    action: 'submission.values_corrected',
    targetType,
    targetId: String(record._id),
    statusFrom: record.status,
    statusTo: record.status,
    notes: `Reason: ${safeReason}. Values corrected: ${describeChanges(changes).join('; ')}${ocrWarningsChanged.length ? `. OCR warnings refreshed: ${ocrWarningsChanged.join(', ')}` : ''}`.slice(0, 1000),
    ipAddress,
    userAgent,
    occurredAt: editedAt
  });

  let certificateRegenerated = false;
  if (record.status === 'approved') {
    certificateRegenerated = await applyApprovedEntryEffects({
      record,
      submissionKind,
      event,
      actorUserId,
      changes
    });
  }

  await notifyRunnerOfCorrection({
    record,
    submissionKind,
    event,
    changes,
    reason: safeReason,
    certificateRegenerated
  });

  return { submissionKind, changes, certificateRegenerated, ocrWarningsChanged };
}

module.exports = {
  correctSubmissionValues,
  buildCorrection,
  refreshOcrComparisons,
  describeChanges,
  normalizeCorrectionReason,
  MIN_REASON_LENGTH,
  MAX_REASON_LENGTH,
  MAX_ELEVATION_M,
  MAX_STEPS,
  MAX_DEVICE_LENGTH,
  OCR_COMPARED_FIELDS,
  OCR_MISMATCH_KEYS,
  RUN_TYPES
};
