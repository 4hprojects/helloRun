'use strict';

// Reversing an approved run entry back to rejected.
//
// Approval is not just a status: it issues a certificate, awards badges and publishes a
// ranking. Reversing it has to unwind all three, or the runner keeps a verifiable
// certificate and a leaderboard position for an entry that no longer counts. This is the
// single orchestrator both the organiser and admin pages call, so the two cannot drift.

const Submission = require('../models/Submission');
const AccumulatedActivitySubmission = require('../models/AccumulatedActivitySubmission');
const Event = require('../models/Event');
const logger = require('../utils/logger');
const { resolveEventAccess } = require('./event-access.service');
const { reviewSubmission, syncEventRankingsInBackground } = require('./submission.service');
const { reviewAccumulatedActivitySubmission } = require('./accumulated-activity.service');
const { revokeIssuedCertificate, getCertificateSourceType } = require('./certificate-revocation.service');
const { revokeBadgesForSubmission } = require('./achievement.service');
const { deleteRankingEntry } = require('./ranking.service');
const { invalidateLeaderboardCache } = require('./leaderboard.service');
const { recordCriticalAuditEventInBackground } = require('./critical-audit.service');

const MAX_REASON_LENGTH = 500;
const MIN_REASON_LENGTH = 5;

function normalizeReversalReason(value) {
  return String(value || '').trim().slice(0, MAX_REASON_LENGTH);
}

async function findApprovedEntry(submissionId) {
  const submission = await Submission.findById(submissionId);
  if (submission) return { record: submission, submissionKind: 'standard' };
  const activity = await AccumulatedActivitySubmission.findById(submissionId);
  if (activity) return { record: activity, submissionKind: 'accumulated' };
  return null;
}

/**
 * @returns {Promise<{
 *   submissionKind: string,
 *   certificateRevoked: boolean,
 *   badgesRevoked: number,
 *   rankingRemoved: boolean
 * }>}
 */
async function reverseSubmissionApproval({
  submissionId,
  actorUserId,
  actorRole,
  reason
}) {
  const safeReason = normalizeReversalReason(reason);
  if (safeReason.length < MIN_REASON_LENGTH) {
    throw new Error('Give a reason of at least 5 characters for reversing this approval.');
  }

  const found = await findApprovedEntry(submissionId);
  if (!found) throw new Error('Entry not found.');
  const { record, submissionKind } = found;

  if (String(record.status || '') !== 'approved') {
    throw new Error('Only approved entries can be reversed.');
  }

  const normalizedRole = String(actorRole || '').trim().toLowerCase();
  const isAdminActor = normalizedRole === 'admin';
  const event = await Event.findById(record.eventId).select('_id slug title organizerId').lean();
  if (!event) throw new Error('Entry not found or inaccessible.');
  if (!isAdminActor && !await resolveEventAccess({
    eventId: event._id,
    userId: actorUserId,
    userRole: normalizedRole
  })) {
    throw new Error('Entry not found or inaccessible.');
  }
  // Self-review is allowed and recorded rather than blocked, matching the review services.
  // A sole organiser with no co-organiser would otherwise be unable to correct their own
  // entry at all.
  const isSelfReview = Boolean(record.runnerId)
    && String(record.runnerId) === String(actorUserId || '');

  // 1. Flip the status through the existing review services, so shadow sync, the
  //    reversal-worded runner notification and progress recalculation all still happen.
  if (submissionKind === 'accumulated') {
    await reviewAccumulatedActivitySubmission({
      activityId: record._id,
      organizerId: actorUserId,
      reviewerRole: normalizedRole,
      action: 'reject',
      reviewNotes: safeReason,
      rejectionReason: safeReason,
      rejectionCode: 'other'
    });
  } else {
    await reviewSubmission({
      submissionId: record._id,
      organizerId: actorUserId,
      reviewerRole: normalizedRole,
      action: 'reject',
      reviewNotes: safeReason,
      rejectionReason: safeReason,
      rejectionCode: 'other',
      allowApprovedReversal: true
    });
  }

  // 2. Withdraw the certificate. Re-read so the status change above is not clobbered by
  //    saving a stale document.
  const fresh = submissionKind === 'accumulated'
    ? await AccumulatedActivitySubmission.findById(record._id)
    : await Submission.findById(record._id);
  let certificateRevoked = false;
  try {
    const result = await revokeIssuedCertificate({
      record: fresh,
      sourceType: getCertificateSourceType(submissionKind),
      actorUserId,
      reason: `Approval reversed: ${safeReason}`
    });
    certificateRevoked = result.revoked;
  } catch (error) {
    logger.error('Approval reversal could not revoke the certificate:', {
      submissionId: String(record._id),
      error: error.message
    });
  }

  // 3. Withdraw badges earned off this entry. Accumulated badges are progress-derived and
  //    already recomputed by the review call above, so this normally matches nothing there.
  let badgesRevoked = 0;
  try {
    const revoked = await revokeBadgesForSubmission({
      mongoSubmissionId: String(record._id),
      performedBy: actorUserId,
      reason: safeReason
    });
    badgesRevoked = revoked.length;
  } catch (error) {
    logger.error('Approval reversal could not withdraw badges:', {
      submissionId: String(record._id),
      error: error.message
    });
  }

  // 4. Drop this entry's published ranking row, then recompute the rest of the event.
  //    The recompute alone would leave this row behind: it only ever writes.
  let rankingRemoved = false;
  if (submissionKind === 'standard') {
    try {
      rankingRemoved = Boolean(await deleteRankingEntry(String(record._id)));
    } catch (error) {
      logger.error('Approval reversal could not remove the ranking row:', {
        submissionId: String(record._id),
        error: error.message
      });
    }
    syncEventRankingsInBackground(fresh, event.slug);
  }

  // 5. The cached leaderboard holds rendered rows, so it has to be dropped explicitly.
  invalidateLeaderboardCache(event.slug);

  if (isSelfReview) {
    recordCriticalAuditEventInBackground({
      actorMongoUserId: actorUserId,
      action: 'submission.self_reviewed',
      targetType: submissionKind === 'accumulated' ? 'accumulated_activity_submission' : 'submission',
      targetId: String(record._id),
      statusFrom: 'approved',
      statusTo: 'rejected',
      notes: 'Reviewer is the runner on this entry (approval reversed).',
      occurredAt: new Date()
    });
  }

  recordCriticalAuditEventInBackground({
    actorMongoUserId: actorUserId,
    action: 'submission.approval_reversed',
    targetType: submissionKind === 'accumulated' ? 'accumulated_activity_submission' : 'submission',
    targetId: String(record._id),
    statusFrom: 'approved',
    statusTo: 'rejected',
    notes: `Approval reversed. Reason: ${safeReason}. Certificate revoked: ${certificateRevoked ? 'yes' : 'no'}. Badges withdrawn: ${badgesRevoked}.`,
    occurredAt: new Date()
  });

  return { submissionKind, certificateRevoked, badgesRevoked, rankingRemoved };
}

module.exports = {
  reverseSubmissionApproval,
  normalizeReversalReason,
  MAX_REASON_LENGTH,
  MIN_REASON_LENGTH
};
