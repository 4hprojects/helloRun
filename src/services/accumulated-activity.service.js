const AccumulatedActivitySubmission = require('../models/AccumulatedActivitySubmission');
const logger = require('../utils/logger');
const Registration = require('../models/Registration');
const Event = require('../models/Event');
const User = require('../models/User');
const communicationService = require('./communication.service');
const { notifyWithRetry } = require('./reliable-communication.service');
const { recordCriticalAuditEventInBackground } = require('./critical-audit.service');
const { resolveRejectionReason } = require('../utils/rejection-reasons');
const {
  refreshAccumulatedChallengeProgress,
  refreshGlobalDistanceMilestoneProgressInBackground
} = require('./badge-progress.service');
const { resolveAccumulatedTargetDistanceKm, resolveAccumulatedTargetSteps } = require('./accumulated-target.service');
const {
  isAccumulatedChallenge,
  resolveChallengeConfig
} = require('../utils/challenge-metrics');

const APPROVABLE_STATUS = new Set(['submitted', 'rejected', 'needs_clarification']);
const REJECTABLE_STATUS = new Set(['submitted', 'approved', 'needs_clarification']);
const CLARIFIABLE_STATUS = new Set(['submitted', 'rejected']);

async function createAccumulatedActivitySubmission(input) {
  const {
    buildSubmissionPayload,
    getEligibleRunnerRegistration
  } = getSubmissionServiceHelpers();
  const registration = await getEligibleRunnerRegistration({
    registrationId: input.registrationId,
    runnerId: input.runnerId
  });
  const event = await Event.findById(registration.eventId)
    .select('virtualCompletionMode challengeMetrics primaryChallengeMetric targetSteps targetDistanceKm minimumActivityDistanceKm acceptedRunTypes raceCategories title')
    .lean();

  assertAccumulatedEvent(event);
  validateActivityAgainstEvent(input, event);

  const payload = buildSubmissionPayload(registration, {
    ...input,
    submissionCount: 1
  }, { event });
  delete payload.isPersonalRecord;
  delete payload.submissionCount;
  payload.validation = {
    ...(payload.validation || {}),
    submissionMode: 'accumulated'
  };

  const activity = await AccumulatedActivitySubmission.create(payload);
  return applyAccumulatedAutoApprovalIfEligible(activity, event);
}

async function reviewAccumulatedActivitySubmission({
  activityId,
  organizerId,
  reviewerRole,
  action,
  reviewNotes,
  rejectionReason,
  rejectionCode
}) {
  const safeAction = String(action || '').trim().toLowerCase();
  if (safeAction !== 'approve' && safeAction !== 'reject' && safeAction !== 'clarify') {
    throw new Error('Invalid review action.');
  }

  const activity = await AccumulatedActivitySubmission.findById(activityId);
  if (!activity) {
    throw new Error('Activity submission not found.');
  }
  if (safeAction === 'approve' && !APPROVABLE_STATUS.has(activity.status)) {
    throw new Error('Only submitted, rejected, or needs-clarification activities can be approved.');
  }
  if (safeAction === 'reject' && !REJECTABLE_STATUS.has(activity.status)) {
    throw new Error('Only submitted, approved, or needs-clarification activities can be rejected.');
  }
  if (safeAction === 'clarify' && !CLARIFIABLE_STATUS.has(activity.status)) {
    throw new Error('Only submitted or rejected activities can be marked as needing clarification.');
  }

  const normalizedReviewerRole = String(reviewerRole || '').trim().toLowerCase();
  const isAdminReviewer = normalizedReviewerRole === 'admin';
  const event = await Event.findById(activity.eventId)
    .select('organizerId title targetDistanceKm targetSteps challengeMetrics primaryChallengeMetric virtualCompletionMode')
    .lean();
  if (!event || !isAccumulatedChallenge(event)) {
    throw new Error('Activity submission not found or inaccessible.');
  }
  if (!isAdminReviewer && String(event.organizerId || '') !== String(organizerId || '')) {
    throw new Error('Activity submission not found or inaccessible.');
  }

  const previousStatus = activity.status;
  const reviewedAt = new Date();
  const safeReviewNotes = String(reviewNotes || '').trim().slice(0, 1200);
  const update = {
    reviewedAt,
    reviewedBy: organizerId,
    reviewNotes: safeReviewNotes,
    rejectionReason: '',
    rejectionCode: ''
  };

  if (safeAction === 'approve') {
    update.status = 'approved';
    // Manual approval is the trusted reviewer decision, so clear automated suspicion metadata.
    update.suspiciousFlag = false;
    update.suspiciousFlagReason = '';
  } else if (safeAction === 'reject') {
    const reason = resolveRejectionReason('run', rejectionCode, rejectionReason, { allowLegacyDetail: true });
    update.status = 'rejected';
    update.rejectionCode = reason.code;
    update.rejectionReason = reason.runnerMessage;
  } else {
    if (!safeReviewNotes) {
      throw new Error('Explain what needs clarification so the runner knows what to fix.');
    }
    update.status = 'needs_clarification';
  }

  const reviewedActivity = await AccumulatedActivitySubmission.findOneAndUpdate(
    { _id: activity._id, status: previousStatus },
    { $set: update },
    { new: true, runValidators: true }
  );
  if (!reviewedActivity) {
    throw new Error('This submission was already reviewed by someone else. Refresh and try again.');
  }

  const auditActionByAction = {
    approve: 'submission.approved',
    reject: 'submission.rejected',
    clarify: 'submission.needs_clarification'
  };
  recordCriticalAuditEventInBackground({
    actorMongoUserId: organizerId,
    action: auditActionByAction[safeAction],
    targetType: 'accumulated_activity_submission',
    targetId: String(reviewedActivity._id),
    statusFrom: previousStatus,
    statusTo: reviewedActivity.status,
    notes: safeAction === 'reject'
      ? (reviewedActivity.rejectionReason || reviewedActivity.reviewNotes)
      : reviewedActivity.reviewNotes,
    occurredAt: reviewedActivity.reviewedAt
  });

  refreshAccumulatedChallengeProgress(reviewedActivity.registrationId, {
    performedBy: organizerId
  }).catch((error) => {
    logger.error('Accumulated challenge badge progress refresh failed:', {
      activityId: String(reviewedActivity._id || ''),
      registrationId: String(reviewedActivity.registrationId || ''),
      error: error.message
    });
  });

  if (safeAction === 'approve') {
    refreshGlobalDistanceMilestoneProgressInBackground(reviewedActivity.runnerId, {
      performedBy: organizerId
    });
  }

  reconcileAccumulatedCertificateAfterReview(reviewedActivity.registrationId, event).catch((error) => {
    logger.error('Accumulated challenge certificate reconciliation failed:', {
      activityId: String(reviewedActivity._id || ''),
      registrationId: String(reviewedActivity.registrationId || ''),
      error: error.message
    });
  });

  await sendActivityReviewNotifications({
    activity: reviewedActivity,
    eventTitle: event.title || 'Event',
    action: safeAction,
    certificateWasIssued: false
  });

  return reviewedActivity;
}

async function reconcileAccumulatedCertificateAfterReview(registrationId, event) {
  const registration = await Registration.findById(registrationId);
  if (!registration) return;
  const { finalizeRegistrationCertificate } = require('./accumulated-certificate-finalization.service');
  await finalizeRegistrationCertificate({ registration, event, now: new Date() });
}

async function getRegistrationAccumulatedProgress(registrationId) {
  const registration = await Registration.findById(registrationId).lean();
  if (!registration) return buildEmptyProgress();
  const event = await Event.findById(registration.eventId)
    .select('targetDistanceKm targetSteps challengeMetrics primaryChallengeMetric raceCategories virtualCompletionMode')
    .lean();
  if (!event || !isAccumulatedChallenge(event)) {
    return buildEmptyProgress();
  }
  const activities = await AccumulatedActivitySubmission.find({ registrationId })
    .sort({ submittedAt: 1, createdAt: 1 })
    .lean();
  return buildAccumulatedProgress({
    activities,
    targetDistanceKm: resolveAccumulatedTargetDistanceKm(registration, event),
    targetSteps: resolveAccumulatedTargetSteps(registration, event),
    primaryMetric: resolveChallengeConfig(event).primaryMetric
  });
}

async function getRunnerAccumulatedActivities(runnerId, options = {}) {
  const limit = clampInt(options.limit, 1, 500, 100);
  return AccumulatedActivitySubmission.find({ runnerId })
    .sort({ submittedAt: -1 })
    .limit(limit)
    .populate({ path: 'eventId', select: 'title slug eventStartAt targetDistanceKm targetSteps challengeMetrics primaryChallengeMetric virtualCompletionMode' })
    .populate({ path: 'registrationId', select: 'confirmationCode raceDistance participationMode' })
    .lean();
}

async function getAccumulatedActivitiesForRegistrations(registrationIds = [], options = {}) {
  const ids = registrationIds.map((item) => String(item || '').trim()).filter(Boolean);
  if (!ids.length) return [];
  const filter = { registrationId: { $in: ids } };
  if (options.status) filter.status = options.status;
  return AccumulatedActivitySubmission.find(filter)
    .sort({ submittedAt: -1, createdAt: -1 })
    .populate('reviewedBy', 'firstName lastName')
    .lean();
}

async function getEventAccumulatedActivityCounts(eventId) {
  const [submitted, approved, rejected] = await Promise.all([
    AccumulatedActivitySubmission.countDocuments({ eventId, status: 'submitted' }),
    AccumulatedActivitySubmission.countDocuments({ eventId, status: 'approved' }),
    AccumulatedActivitySubmission.countDocuments({ eventId, status: 'rejected' })
  ]);
  return { submitted, approved, rejected };
}

async function getAccumulatedLeaderboardRows(filters = {}) {
  const match = { status: 'approved' };
  if (filters.eventId) match.eventId = filters.eventId;
  if (filters.mode) match.participationMode = filters.mode;
  if (filters.distance) match.raceDistance = filters.distance;
  if (filters.submittedAt) match.submittedAt = filters.submittedAt;

  return AccumulatedActivitySubmission.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$registrationId',
        eventId: { $first: '$eventId' },
        runnerId: { $first: '$runnerId' },
        raceDistance: { $first: '$raceDistance' },
        participationMode: { $first: '$participationMode' },
        approvedDistanceKm: { $sum: '$distanceKm' },
        approvedSteps: { $sum: { $ifNull: ['$steps', 0] } },
        approvedActivityCount: { $sum: 1 },
        lastApprovedAt: { $max: '$reviewedAt' },
        firstSubmittedAt: { $min: '$submittedAt' }
      }
    },
    { $sort: { approvedDistanceKm: -1, lastApprovedAt: 1, firstSubmittedAt: 1 } },
    { $limit: clampInt(filters.limit, 1, 200, 100) }
  ]);
}

function buildAccumulatedProgress({ activities = [], targetDistanceKm, targetSteps, primaryMetric = 'distance' }) {
  const distanceTarget = Number(targetDistanceKm || 0);
  const stepsTarget = Number(targetSteps || 0);
  const safePrimaryMetric = primaryMetric === 'steps' ? 'steps' : 'distance';
  const primaryTarget = safePrimaryMetric === 'steps' ? stepsTarget : distanceTarget;
  const approved = activities.filter((item) => item.status === 'approved');
  const pending = activities.filter((item) => item.status === 'submitted');
  const rejected = activities.filter((item) => item.status === 'rejected');
  const needsClarification = activities.filter((item) => item.status === 'needs_clarification');
  const approvedDistanceKm = sumDistance(approved);
  const pendingDistanceKm = sumDistance(pending);
  const rejectedDistanceKm = sumDistance(rejected);
  const approvedSteps = sumSteps(approved);
  const pendingSteps = sumSteps(pending);
  const rejectedSteps = sumSteps(rejected);
  const approvedPrimaryValue = safePrimaryMetric === 'steps' ? approvedSteps : approvedDistanceKm;
  const pendingPrimaryValue = safePrimaryMetric === 'steps' ? pendingSteps : pendingDistanceKm;
  // A registration may carry both a distance goal and a steps goal at once
  // (a "dual challenge" category) — completion requires every goal that is
  // actually set to be met, not just the primary/ranking metric.
  const completed = (distanceTarget > 0 || stepsTarget > 0) &&
    (distanceTarget <= 0 || approvedDistanceKm >= distanceTarget) &&
    (stepsTarget <= 0 || approvedSteps >= stepsTarget);
  const progressPercent = primaryTarget > 0 ? (approvedPrimaryValue / primaryTarget) * 100 : 0;
  const potentialDistanceKm = approvedDistanceKm + pendingDistanceKm;
  const potentialSteps = approvedSteps + pendingSteps;
  const potentialPrimaryValue = approvedPrimaryValue + pendingPrimaryValue;
  const potentialProgressPercent = primaryTarget > 0 ? (potentialPrimaryValue / primaryTarget) * 100 : 0;
  const overGoalDistanceKm = distanceTarget > 0 ? Math.max(0, approvedDistanceKm - distanceTarget) : 0;
  const overGoalSteps = stepsTarget > 0 ? Math.max(0, approvedSteps - stepsTarget) : 0;
  const certificateActivity = approved.find((item) =>
    item.certificate?.url &&
    !['revoked', 'failed', 'pending'].includes(item.certificate?.status) &&
    !item.certificate?.revokedAt
  );

  let completionTimestamp = null;
  if (completed) {
    let total = 0;
    const orderedApproved = approved
      .slice()
      .sort((a, b) => new Date(a.reviewedAt || a.submittedAt || 0) - new Date(b.reviewedAt || b.submittedAt || 0));
    for (const activity of orderedApproved) {
      total += safePrimaryMetric === 'steps' ? Number(activity.steps || 0) : Number(activity.distanceKm || 0);
      if (total >= primaryTarget) {
        completionTimestamp = activity.reviewedAt || activity.submittedAt || null;
        break;
      }
    }
  }

  return {
    primaryMetric: safePrimaryMetric,
    primaryTarget: primaryTarget > 0 ? primaryTarget : null,
    rankingOnly: !(primaryTarget > 0),
    targetDistanceKm: distanceTarget,
    targetSteps: stepsTarget > 0 ? stepsTarget : null,
    approvedDistanceKm,
    pendingDistanceKm,
    rejectedDistanceKm,
    approvedSteps,
    pendingSteps,
    rejectedSteps,
    approvedActivityCount: approved.length,
    pendingActivityCount: pending.length,
    rejectedActivityCount: rejected.length,
    needsClarificationActivityCount: needsClarification.length,
    totalActivityCount: activities.length,
    completed,
    progressPercent,
    progressBarPercent: Math.min(100, Math.max(0, progressPercent)),
    potentialDistanceKm,
    potentialSteps,
    potentialProgressPercent,
    overGoalDistanceKm,
    overGoalSteps,
    remainingDistanceKm: distanceTarget > 0 ? Math.max(0, distanceTarget - approvedDistanceKm) : 0,
    remainingSteps: stepsTarget > 0 ? Math.max(0, stepsTarget - approvedSteps) : 0,
    completionTimestamp,
    certificateEligible: completed,
    certificateActivityId: certificateActivity ? String(certificateActivity._id) : '',
    certificateUrl: certificateActivity?.certificate?.url || '',
    progressLabel: safePrimaryMetric === 'steps'
      ? (stepsTarget > 0
          ? `${formatSteps(approvedSteps)} / ${formatSteps(stepsTarget)} steps`
          : `${formatSteps(approvedSteps)} steps`)
      : (distanceTarget > 0
          ? `${formatDistance(approvedDistanceKm)} km / ${formatDistance(distanceTarget)} km`
          : `${formatDistance(approvedDistanceKm)} km`)
  };
}

function buildEmptyProgress() {
  return buildAccumulatedProgress({ activities: [], targetDistanceKm: 0, targetSteps: null });
}

async function applyAccumulatedAutoApprovalIfEligible(activity, event = null) {
  const {
    isAutoApprovableSubmission,
    getAutoApprovalReviewNote
  } = getSubmissionServiceHelpers();
  if (!isAutoApprovableSubmission(activity)) {
    return activity;
  }

  const eventDoc = event || await Event.findById(activity.eventId)
    .select('title targetDistanceKm targetSteps challengeMetrics primaryChallengeMetric virtualCompletionMode')
    .lean();
  if (!eventDoc || !isAccumulatedChallenge(eventDoc)) {
    return activity;
  }
  const challengeConfig = resolveChallengeConfig(eventDoc);
  if (challengeConfig.tracksSteps) {
    const extractedSteps = Number(activity.ocrData?.extractedSteps || 0);
    if (!(extractedSteps > 0) || activity.ocrData?.stepsMismatch) {
      return activity;
    }
  }

  const autoApprovalReviewNote = getAutoApprovalReviewNote(activity);
  activity.status = 'approved';
  activity.reviewedAt = new Date();
  activity.reviewedBy = null;
  activity.reviewNotes = autoApprovalReviewNote;
  activity.rejectionReason = '';
  activity.rejectionCode = '';
  await activity.save();

  recordCriticalAuditEventInBackground({
    actorMongoUserId: '',
    action: 'submission.auto_approved',
    targetType: 'accumulated_activity_submission',
    targetId: String(activity._id),
    statusFrom: 'submitted',
    statusTo: 'approved',
    notes: autoApprovalReviewNote,
    occurredAt: activity.reviewedAt
  });

  refreshAccumulatedChallengeProgress(activity.registrationId, {
    performedBy: ''
  }).catch((error) => {
    logger.error('Accumulated challenge badge progress refresh failed:', {
      activityId: String(activity._id || ''),
      registrationId: String(activity.registrationId || ''),
      error: error.message
    });
  });
  refreshGlobalDistanceMilestoneProgressInBackground(activity.runnerId, {
    performedBy: ''
  });

  await sendActivityReviewNotifications({
    activity,
    eventTitle: eventDoc.title || 'Event',
    action: 'approve',
    certificateWasIssued: false
  });

  return activity;
}

function assertAccumulatedEvent(event) {
  if (!event || !isAccumulatedChallenge(event)) {
    throw new Error('This registration is not for an accumulated challenge.');
  }
}

function validateActivityAgainstEvent(input, event) {
  const config = resolveChallengeConfig(event);
  const distance = Number(input.distanceKm || 0);
  const steps = Number(input.steps || 0);
  if (config.tracksDistance && (!(distance > 0) || distance > 500)) {
    throw new Error('Distance is required for this competition and must be between 0.1 and 500 km.');
  }
  if (config.tracksSteps && (!Number.isInteger(steps) || steps < 1 || steps > 200000)) {
    throw new Error('Steps are required for this competition and must be between 1 and 200,000.');
  }
  if (config.tracksSteps && String(input.source || '').trim().toLowerCase() === 'strava') {
    throw new Error('Strava-only activities cannot enter a steps competition. Upload tracker proof with verified steps.');
  }
  const minimum = Number(event.minimumActivityDistanceKm || 0);
  if (config.tracksDistance && minimum > 0 && distance < minimum) {
    throw new Error(`Activity distance must be at least ${formatDistance(minimum)} km.`);
  }

  const acceptedRunTypes = Array.isArray(event.acceptedRunTypes) ? event.acceptedRunTypes : [];
  if (acceptedRunTypes.length) {
    const runType = String(input.runType || 'run').trim().toLowerCase();
    if (!acceptedRunTypes.includes(runType)) {
      throw new Error('Activity type is not accepted for this event.');
    }
  }
}

function sumSteps(items = []) {
  return items.reduce((sum, item) => sum + Number(item.steps || 0), 0);
}

function formatSteps(value) {
  return Math.max(0, Number(value || 0)).toLocaleString('en-US');
}

async function sendActivityReviewNotifications({ activity, eventTitle, action, certificateWasIssued }) {
  try {
    const runner = await User.findById(activity.runnerId).select('firstName email').lean();
    if (!runner) return;

    const approved = action === 'approve';
    const needsClarification = action === 'clarify';
    const notificationTitle = approved
      ? 'Activity Approved'
      : (needsClarification ? 'Activity Needs Clarification' : 'Activity Needs Update');
    const notificationMessage = approved
      ? `Your activity for ${eventTitle} was approved.`
      : (needsClarification
        ? `An organizer needs more information about your activity for ${eventTitle}. ${activity.reviewNotes || ''}`.trim()
        : `Your activity for ${eventTitle} was rejected. Please review and submit another activity.`);
    // Needs-clarification does not yet have a dedicated email template, so it
    // sends the in-app notification only until one is built.
    await notifyWithRetry(approved ? 'result.approved' : 'result.rejected', {
      notification: {
        userId: activity.runnerId,
        type: approved ? 'result_approved' : (needsClarification ? 'result_needs_clarification' : 'result_rejected'),
        title: notificationTitle,
        message: notificationMessage,
        href: '/my-registrations',
        metadata: {
          activityId: String(activity._id),
          registrationId: String(activity.registrationId),
          eventId: String(activity.eventId),
          eventTitle
        }
      },
      email: (runner.email && !needsClarification) ? {
        to: runner.email,
        firstName: runner.firstName || 'Runner',
        eventTitle,
        confirmationCode: '',
        elapsedLabel: '',
        rejectionReason: activity.rejectionReason || '',
        reviewNotes: activity.reviewNotes || '',
        recipientUserId: activity.runnerId,
        metadata: {
          activityId: String(activity._id),
          registrationId: String(activity.registrationId),
          eventId: String(activity.eventId)
        }
      } : null
    }, {
      source: approved
        ? 'accumulated_activity.review_approve'
        : (needsClarification ? 'accumulated_activity.review_clarify' : 'accumulated_activity.review_reject')
    });

    if (certificateWasIssued) {
      await communicationService.notify('certificate.issued', {
        notification: {
          userId: activity.runnerId,
          type: 'certificate_issued',
          title: 'Certificate Available',
          message: `Your certificate for ${eventTitle} is now available.`,
          href: '/my-registrations',
          metadata: {
            activityId: String(activity._id),
            registrationId: String(activity.registrationId),
            eventId: String(activity.eventId),
            eventTitle
          }
        },
        email: runner.email ? {
          to: runner.email,
          firstName: runner.firstName || 'Runner',
          eventTitle,
          confirmationCode: '',
          certificateUrl: activity.certificate?.url || '',
          recipientUserId: activity.runnerId,
          metadata: {
            activityId: String(activity._id),
            registrationId: String(activity.registrationId),
            eventId: String(activity.eventId)
          }
        } : null
      });
    }
  } catch (error) {
    logger.error('Accumulated activity review notification failed:', {
      error: error.message,
      activityId: String(activity?._id || '')
    });
  }
}

function sumDistance(items) {
  return items.reduce((sum, item) => sum + Number(item.distanceKm || 0), 0);
}

function formatDistance(value) {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric)) return '0';
  return Number(numeric.toFixed(2)).toString();
}

function clampInt(value, min, max, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function getSubmissionServiceHelpers() {
  return require('./submission.service');
}

module.exports = {
  createAccumulatedActivitySubmission,
  reviewAccumulatedActivitySubmission,
  getRegistrationAccumulatedProgress,
  getRunnerAccumulatedActivities,
  getAccumulatedActivitiesForRegistrations,
  getEventAccumulatedActivityCounts,
  getAccumulatedLeaderboardRows,
  buildAccumulatedProgress
};
