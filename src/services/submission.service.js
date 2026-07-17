const mongoose = require('mongoose');
const logger = require('../utils/logger');
const Submission = require('../models/Submission');
const AccumulatedActivitySubmission = require('../models/AccumulatedActivitySubmission');
const Registration = require('../models/Registration');
const Event = require('../models/Event');
const User = require('../models/User');
const { issueSubmissionCertificate } = require('./certificate.service');
const { buildVerificationUrl } = require('./certificateNumber.service');
const communicationService = require('./communication.service');
const { notifyWithRetry } = require('./reliable-communication.service');
const { isSubmissionWindowOpen } = require('../utils/submission-window');
const { resolveAccumulatedTargetDistanceKm } = require('./accumulated-target.service');
const { DEFAULT_WAIVER_TEMPLATE } = require('../utils/waiver');
const { detectSuspiciousActivity } = require('../utils/submission-integrity');
const { REVIEW_REASON_LABELS } = require('../utils/submission-review-labels');
const { resolveRejectionReason } = require('../utils/rejection-reasons');
const { assertRunDateNotFuture } = require('../utils/platform-date');
const { buildAuditIdempotencyKey, recordCriticalAuditEventInBackground } = require('./critical-audit.service');
const { invalidateLeaderboardCache } = require('./leaderboard.service');
const { normalizeSingleActivityRanking, syncRankingEntry } = require('./ranking.service');
const { evaluatePublishedRankingAchievements } = require('./achievement.service');
const { syncSubmissionShadow } = require('./submission-shadow.service');
const { recordSyncFailureInBackground } = require('./sync-failure.service');

const APPROVABLE_STATUS = new Set(['submitted', 'rejected']);
const REJECTABLE_STATUS = new Set(['submitted']);
const FINAL_STATUSES = new Set(['approved']);
const PERSONAL_RECORD_REGISTRATION_ID = 'personal-record';
const {
  sanitizeOptionalNumber,
  sanitizeOcrData,
  getStandardSubmissionMinimumDistanceKm,
  detectBelowMinimumStandardSubmissionDistance,
  detectImplausibleAccumulatedActivityDistance,
  formatDistanceForMessage,
  buildSubmissionValidationMetadata,
  isAutoApprovableOcrSubmission,
  isAutoApprovableSubmission,
  getAutoApprovalReviewNote
} = require('./submission-validation.service');
let runSubmissionBackgroundTasksInline = false;
let disableSubmissionSyncBackgroundTasks = false;

async function createSubmission({
  registrationId,
  runnerId,
  distanceKm,
  elapsedMs,
  runDate,
  runLocation,
  proofType,
  proof,
  proofNotes,
  runType,
  elevationGain,
  steps,
  ocrData,
  source,
  stravaActivity,
  submissionAttemptId
}) {
  if (String(registrationId || '').trim() === PERSONAL_RECORD_REGISTRATION_ID) {
    return createPersonalRecordSubmission({
      runnerId,
      distanceKm,
      elapsedMs,
      runDate,
      runLocation,
      proofType,
      proof,
      proofNotes,
      runType,
      elevationGain,
      steps,
      ocrData,
      source,
      stravaActivity,
      submissionAttemptId
    });
  }

  const registration = await getEligibleRunnerRegistration({ registrationId, runnerId });
  const existing = await Submission.findOne({ registrationId: registration._id }).select('status').lean();
  if (existing) {
    if (existing.status === 'rejected') {
      throw new Error('Submission was rejected. Use resubmit flow.');
    }
    throw new Error('Submission already exists for this registration.');
  }

  const submission = await Submission.create(buildSubmissionPayload(registration, {
    distanceKm,
    elapsedMs,
    runDate,
    runLocation,
    proofType,
    proof,
    proofNotes,
    submissionCount: 1,
    runType,
    elevationGain,
    steps,
    ocrData,
    source,
    stravaActivity,
    submissionAttemptId
  }));
  return applyAutoApprovalIfEligible(submission);
}

async function editRejectedSubmissionMetadata({ submissionId, runnerId, distanceKm, elapsedMs, runDate, runLocation, runType }) {
  const submission = await Submission.findOne({ _id: submissionId, runnerId });
  if (!submission) throw new Error('Submission not found or you do not have access.');
  if (submission.status !== 'rejected') throw new Error('Only rejected submissions can have their details updated.');
  if (String(submission.source || '') === 'strava') throw new Error('Strava submission metadata cannot be edited manually.');

  const parsedDistance = Number(distanceKm);
  if (!Number.isFinite(parsedDistance) || parsedDistance < 0.1 || parsedDistance > 500) {
    throw new Error('Distance must be between 0.1 and 500 km.');
  }
  if (elapsedMs !== undefined) {
    const parsedElapsed = Number(elapsedMs);
    if (!Number.isFinite(parsedElapsed) || parsedElapsed < 1000) {
      throw new Error('Elapsed time must be at least 1 second.');
    }
    submission.elapsedMs = parsedElapsed;
  }

  submission.distanceKm = parsedDistance;
  if (runDate) submission.runDate = new Date(runDate);
  if (runLocation) submission.runLocation = String(runLocation).trim().slice(0, 200);
  if (runType && ['run', 'walk', 'hike', 'trail_run'].includes(runType)) submission.runType = runType;

  submission.status = 'submitted';
  submission.rejectionReason = '';
  submission.rejectionCode = '';
  submission.reviewNotes = '';
  submission.reviewedAt = null;
  submission.reviewedBy = null;
  submission.submittedAt = new Date();
  submission.submissionCount = (submission.submissionCount || 1) + 1;

  await submission.save();
  return submission;
}

async function applyAdminSubmissionCorrection({
  submissionId,
  adminUserId,
  distanceKm,
  elapsedMs,
  runDate,
  runLocation,
  runType,
  reviewReason,
  autoApprovalEligible,
  correctionReason,
  ipAddress,
  userAgent
}) {
  if (!mongoose.Types.ObjectId.isValid(String(submissionId || ''))) {
    throw new Error('Submission not found.');
  }

  let submission = await Submission.findById(submissionId);
  let submissionKind = 'standard';
  if (!submission) {
    submission = await AccumulatedActivitySubmission.findById(submissionId);
    submissionKind = submission ? 'accumulated' : '';
  }
  if (!submission) throw new Error('Submission not found.');

  const safeCorrectionReason = String(correctionReason || '').trim().slice(0, 500);
  if (safeCorrectionReason.length < 10) {
    throw new Error('A correction reason of at least 10 characters is required.');
  }

  const changes = [];

  if (distanceKm !== undefined) {
    const before = submission.distanceKm;
    submission.distanceKm = sanitizeNumber(distanceKm, 0.1, 500, 'Distance must be between 0.1 and 500 km.');
    changes.push(`distanceKm ${before}->${submission.distanceKm}`);
  }
  if (elapsedMs !== undefined) {
    const before = submission.elapsedMs;
    submission.elapsedMs = sanitizeNumber(elapsedMs, 1, 7 * 24 * 60 * 60 * 1000, 'Elapsed time is invalid.');
    changes.push(`elapsedMs ${before}->${submission.elapsedMs}`);
  }
  if (runDate !== undefined) {
    const before = submission.runDate;
    submission.runDate = sanitizeRunDate(runDate);
    changes.push(`runDate ${before ? before.toISOString() : 'none'}->${submission.runDate.toISOString()}`);
  }
  if (runLocation !== undefined) {
    const before = submission.runLocation;
    submission.runLocation = sanitizeRunLocation(runLocation);
    changes.push(`runLocation "${before}"->"${submission.runLocation}"`);
  }
  if (runType !== undefined) {
    const before = submission.runType;
    submission.runType = sanitizeRunType(runType);
    changes.push(`runType ${before}->${submission.runType}`);
  }
  if (reviewReason !== undefined) {
    const safeReason = String(reviewReason || '').trim();
    if (safeReason && !Object.prototype.hasOwnProperty.call(REVIEW_REASON_LABELS, safeReason)) {
      throw new Error('Unrecognized review reason code.');
    }
    if (!submission.validation) submission.validation = {};
    const before = submission.validation.reviewReason || '';
    submission.validation.reviewReason = safeReason;
    changes.push(`validation.reviewReason "${before}"->"${safeReason}"`);
  }
  if (autoApprovalEligible !== undefined) {
    if (!submission.validation) submission.validation = {};
    const before = Boolean(submission.validation.autoApprovalEligible);
    const safeBool = autoApprovalEligible === true || autoApprovalEligible === 'true' || autoApprovalEligible === 'on';
    submission.validation.autoApprovalEligible = safeBool;
    changes.push(`validation.autoApprovalEligible ${before}->${safeBool}`);
  }

  if (!changes.length) {
    throw new Error('No changes were submitted.');
  }

  await submission.save();

  const auditOccurredAt = new Date();
  const auditInput = {
    actorMongoUserId: adminUserId,
    action: submissionKind === 'accumulated' ? 'accumulated_activity.corrected' : 'submission.corrected',
    targetType: submissionKind === 'accumulated' ? 'accumulated_activity_submission' : 'submission',
    targetId: String(submission._id),
    statusFrom: submission.status,
    statusTo: submission.status,
    notes: `Reason: ${safeCorrectionReason}. Admin data correction: ${changes.join('; ')}`,
    ipAddress,
    userAgent,
    occurredAt: auditOccurredAt
  };
  auditInput.idempotencyKey = buildAuditIdempotencyKey(auditInput);
  recordCriticalAuditEventInBackground(auditInput);

  return { submission, submissionKind, auditReference: auditInput.idempotencyKey };
}

async function resubmitSubmission({
  registrationId,
  runnerId,
  distanceKm,
  elapsedMs,
  runDate,
  runLocation,
  proofType,
  proof,
  proofNotes,
  runType,
  elevationGain,
  steps,
  ocrData,
  source,
  stravaActivity,
  submissionAttemptId
}) {
  if (String(registrationId || '').trim() === PERSONAL_RECORD_REGISTRATION_ID) {
    throw new Error('Personal record submissions create a new entry each time.');
  }

  const registration = await getEligibleRunnerRegistration({ registrationId, runnerId });
  const existing = await Submission.findOne({ registrationId: registration._id });
  if (!existing) {
    throw new Error('No existing submission found to resubmit.');
  }
  if (FINAL_STATUSES.has(existing.status)) {
    throw new Error('Approved submissions cannot be resubmitted.');
  }
  if (existing.status !== 'rejected') {
    throw new Error('Only rejected submissions can be resubmitted.');
  }

  const payload = buildSubmissionPayload(registration, {
    distanceKm,
    elapsedMs,
    runDate,
    runLocation,
    proofType,
    proof,
    proofNotes,
    submissionCount: Number(existing.submissionCount || 1) + 1,
    runType,
    elevationGain,
    steps,
    ocrData,
    source,
    stravaActivity,
    submissionAttemptId
  });

  existing.distanceKm = payload.distanceKm;
  existing.submissionAttemptId = payload.submissionAttemptId;
  existing.elapsedMs = payload.elapsedMs;
  existing.runDate = payload.runDate;
  existing.runLocation = payload.runLocation;
  existing.proofType = payload.proofType;
  existing.proof = payload.proof;
  existing.proofNotes = payload.proofNotes;
  existing.ocrData = payload.ocrData;
  existing.validation = payload.validation;
  existing.source = payload.source;
  existing.stravaActivity = payload.stravaActivity;
  existing.runType = payload.runType;
  existing.elevationGain = payload.elevationGain;
  existing.steps = payload.steps;
  existing.suspiciousFlag = payload.suspiciousFlag;
  existing.suspiciousFlagReason = payload.suspiciousFlagReason;
  existing.status = 'submitted';
  existing.submissionCount = payload.submissionCount;
  existing.submittedAt = payload.submittedAt;
  existing.reviewedAt = null;
  existing.reviewedBy = null;
  existing.reviewNotes = '';
  existing.rejectionReason = '';
  existing.rejectionCode = '';
  existing.certificate = {
    url: '',
    key: '',
    issuedAt: null,
    certificateNumber: '',
    verificationUrl: '',
    templateId: null,
    status: '',
    revokedAt: null,
    regeneratedAt: null,
    generationError: ''
  };
  await existing.save();
  return applyAutoApprovalIfEligible(existing);
}

async function reviewSubmission({
  submissionId,
  organizerId,
  reviewerRole,
  action,
  reviewNotes,
  rejectionReason,
  rejectionCode
}) {
  const safeAction = String(action || '').trim().toLowerCase();
  if (safeAction !== 'approve' && safeAction !== 'reject') {
    throw new Error('Invalid review action.');
  }

  const submission = await Submission.findById(submissionId);
  if (!submission) {
    throw new Error('Submission not found.');
  }
  if (safeAction === 'approve' && !APPROVABLE_STATUS.has(submission.status)) {
    throw new Error('Only submitted or rejected results can be approved.');
  }
  if (safeAction === 'reject' && !REJECTABLE_STATUS.has(submission.status)) {
    throw new Error('Only submitted results can be rejected.');
  }

  const normalizedReviewerRole = String(reviewerRole || '').trim().toLowerCase();
  const isAdminReviewer = normalizedReviewerRole === 'admin';
  const event = await Event.findById(submission.eventId).select('organizerId title slug').lean();
  if (!event) {
    throw new Error('Submission not found or inaccessible.');
  }
  if (!isAdminReviewer && String(event.organizerId || '') !== String(organizerId || '')) {
    throw new Error('Submission not found or inaccessible.');
  }

  const previousStatus = submission.status;
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
  } else {
    const reason = resolveRejectionReason('run', rejectionCode, rejectionReason, { allowLegacyDetail: true });
    update.status = 'rejected';
    update.rejectionCode = reason.code;
    update.rejectionReason = reason.runnerMessage;
  }

  const reviewedSubmission = await Submission.findOneAndUpdate(
    { _id: submission._id, status: previousStatus },
    { $set: update },
    { new: true, runValidators: true }
  );
  if (!reviewedSubmission) {
    throw new Error(
      safeAction === 'approve'
        ? 'Only submitted or rejected results can be approved.'
        : 'Only submitted results can be rejected.'
    );
  }

  syncSubmissionShadowInBackground(reviewedSubmission);
  if (safeAction === 'approve') {
    invalidateLeaderboardCache(event.slug);
  }
  recordCriticalAuditEventInBackground({
    actorMongoUserId: organizerId,
    action: safeAction === 'approve' ? 'submission.approved' : 'submission.rejected',
    targetType: 'submission',
    targetId: String(reviewedSubmission._id),
    statusFrom: previousStatus,
    statusTo: reviewedSubmission.status,
    notes: safeAction === 'approve'
      ? reviewedSubmission.reviewNotes
      : (reviewedSubmission.rejectionReason || reviewedSubmission.reviewNotes),
    occurredAt: reviewedSubmission.reviewedAt
  });
  const backgroundTask = attachCertAndNotifyInBackground(reviewedSubmission, safeAction, event.title || 'Event');
  if (runSubmissionBackgroundTasksInline) {
    await backgroundTask;
  }
  if (safeAction === 'approve') {
    evaluateSubmissionAchievementsSafe(reviewedSubmission, {
      performedBy: organizerId
    });
    if (!reviewedSubmission.isPersonalRecord) {
      refreshGlobalDistanceMilestonesSafe(reviewedSubmission.runnerId, {
        performedBy: organizerId
      });
      syncEventRankingsInBackground(reviewedSubmission, event.slug);
    }
  }
  return reviewedSubmission;
}

function syncSubmissionShadowInBackground(submission) {
  if (disableSubmissionSyncBackgroundTasks) return;
  if (!submission || !submission._id || !process.env.DATABASE_URL) return;
  syncSubmissionShadow(submission, { operation: 'live_sync' }).catch((error) => {
    logger.error('[Submission Shadow Sync] Failed to sync submission:', {
      submissionId: String(submission._id),
      error: error?.message || String(error)
    });
    recordSyncFailureInBackground('submission', String(submission._id), error, { operation: 'live_sync' });
  });
}

async function getRunnerSubmissions(runnerId, options = {}) {
  const limit = clampInt(options.limit, 1, 100, 20);
  return Submission.find({ runnerId })
    .sort({ submittedAt: -1 })
    .limit(limit)
    .populate({ path: 'eventId', select: 'title slug eventStartAt' })
    .populate({ path: 'registrationId', select: 'confirmationCode raceDistance participationMode' })
    .lean();
}

async function getEventSubmissionQueue(eventId, options = {}) {
  const limit = clampInt(options.limit, 1, 200, 50);
  const status = String(options.status || '').trim();
  const filter = { eventId };
  if (status) {
    filter.status = status;
  }
  return Submission.find(filter)
    .sort({ submittedAt: -1 })
    .limit(limit)
    .populate({ path: 'runnerId', select: 'firstName lastName email' })
    .populate({ path: 'registrationId', select: 'confirmationCode raceDistance participationMode' })
    .lean();
}

async function getRunnerSubmissionSummary(runnerId, options = {}) {
  const certificateLimit = clampInt(options.certificateLimit, 1, 20, 5);
  const [
    standardCounts,
    accumulatedCounts,
    standardCertificatesRaw,
    accumulatedCertificatesRaw
  ] = await Promise.all([
    getSubmissionCountsForModel(Submission, runnerId),
    getSubmissionCountsForModel(AccumulatedActivitySubmission, runnerId),
    getRecentCertificatesForModel(Submission, runnerId, certificateLimit),
    getRecentCertificatesForModel(AccumulatedActivitySubmission, runnerId, certificateLimit)
  ]);
  const counts = combineSubmissionCounts(standardCounts, accumulatedCounts);
  const recentCertificatesRaw = standardCertificatesRaw
    .map((item) => ({ ...item, submissionKind: 'standard' }))
    .concat(accumulatedCertificatesRaw.map((item) => ({ ...item, submissionKind: 'accumulated_activity' })))
    .sort((a, b) => compareDateDesc(
      a.certificate?.issuedAt || a.reviewedAt || a.submittedAt,
      b.certificate?.issuedAt || b.reviewedAt || b.submittedAt
    ))
    .slice(0, certificateLimit);

  return {
    counts,
    recentCertificates: recentCertificatesRaw.map(formatRecentCertificate)
  };
}

async function getRunnerPerformanceSnapshot(runnerId, options = {}) {
  const recentLimit = clampInt(options.recentLimit, 1, 20, 8);
  const resultStatus = normalizeResultStatus(options.resultStatus);
  const recentFilter = { runnerId };
  if (resultStatus) {
    recentFilter.status = resultStatus;
  }

  const [
    summary,
    standardRecent,
    accumulatedRecent,
    standardApproved,
    accumulatedApproved,
    personalBestRaw,
    standardActivity,
    accumulatedActivity
  ] = await Promise.all([
    getRunnerSubmissionSummary(runnerId, { certificateLimit: 5 }),
    Submission.find(recentFilter)
      .sort({ submittedAt: -1 })
      .limit(recentLimit)
      .populate({ path: 'eventId', select: 'title slug' })
      .populate({ path: 'registrationId', select: 'confirmationCode raceDistance' })
      .select('status distanceKm elapsedMs runDate runLocation runType proofType submittedAt reviewedAt reviewNotes rejectionReason rejectionCode certificate eventId registrationId isPersonalRecord')
      .lean(),
    AccumulatedActivitySubmission.find(recentFilter)
      .sort({ submittedAt: -1 })
      .limit(recentLimit)
      .populate({ path: 'eventId', select: 'title slug virtualCompletionMode targetDistanceKm raceCategories' })
      .populate({ path: 'registrationId', select: 'confirmationCode raceDistance' })
      .select('status distanceKm elapsedMs runDate runLocation runType proofType submittedAt reviewedAt reviewNotes rejectionReason rejectionCode certificate eventId registrationId')
      .lean(),
    Submission.find({ runnerId, status: 'approved' })
      .select('eventId distanceKm')
      .lean(),
    AccumulatedActivitySubmission.find({ runnerId, status: 'approved' })
      .populate({ path: 'eventId', select: 'virtualCompletionMode targetDistanceKm raceCategories' })
      .populate({ path: 'registrationId', select: 'raceDistance' })
      .select('eventId registrationId distanceKm')
      .lean(),
    Submission.findOne({ runnerId, status: 'approved' })
      .sort({ elapsedMs: 1, submittedAt: 1, createdAt: 1 })
      .populate({ path: 'eventId', select: 'title slug' })
      .populate({ path: 'registrationId', select: 'confirmationCode raceDistance' })
      .select('elapsedMs distanceKm submittedAt eventId registrationId')
      .lean(),
    Submission.find({ runnerId })
      .sort({ submittedAt: -1 })
      .limit(12)
      .populate({ path: 'eventId', select: 'title slug' })
      .select('status submittedAt reviewedAt certificate eventId')
      .lean(),
    AccumulatedActivitySubmission.find({ runnerId })
      .sort({ submittedAt: -1 })
      .limit(12)
      .populate({ path: 'eventId', select: 'title slug' })
      .select('status submittedAt reviewedAt certificate eventId')
      .lean()
  ]);

  const totalDistanceKm = standardApproved
    .concat(accumulatedApproved)
    .reduce((sum, item) => sum + Number(item.distanceKm || 0), 0);
  const completedEventIds = new Set(
    standardApproved.map((item) => String(item.eventId || '')).filter(Boolean)
  );
  for (const eventId of getCompletedAccumulatedEventIds(accumulatedApproved)) {
    completedEventIds.add(eventId);
  }
  const recentSubmissionsRaw = standardRecent
    .map((item) => ({ ...item, submissionKind: 'standard' }))
    .concat(accumulatedRecent.map((item) => ({ ...item, submissionKind: 'accumulated_activity' })))
    .sort((a, b) => compareDateDesc(a.submittedAt, b.submittedAt))
    .slice(0, recentLimit);
  const activitySource = standardActivity
    .map((item) => ({ ...item, submissionKind: 'standard' }))
    .concat(accumulatedActivity.map((item) => ({ ...item, submissionKind: 'accumulated_activity' })))
    .sort((a, b) => compareDateDesc(a.reviewedAt || a.submittedAt, b.reviewedAt || b.submittedAt))
    .slice(0, 12);

  return {
    counts: summary.counts,
    recentCertificates: summary.recentCertificates,
    metrics: {
      totalDistanceKm: Number(totalDistanceKm.toFixed(2)),
      completedEvents: completedEventIds.size,
      fastestElapsedMs: Number(personalBestRaw?.elapsedMs || 0),
      fastestElapsedLabel: personalBestRaw ? formatElapsedMs(personalBestRaw.elapsedMs) : ''
    },
    personalBest: personalBestRaw
      ? {
          eventTitle: personalBestRaw.eventId?.title || 'Event unavailable',
          eventSlug: personalBestRaw.eventId?.slug || '',
          raceDistance: personalBestRaw.registrationId?.raceDistance || '',
          confirmationCode: personalBestRaw.registrationId?.confirmationCode || '',
          elapsedMs: Number(personalBestRaw.elapsedMs || 0),
          elapsedLabel: formatElapsedMs(personalBestRaw.elapsedMs)
        }
      : null,
    recentSubmissions: recentSubmissionsRaw.map((item) => ({
      submissionId: String(item._id),
      registrationId: item.registrationId?._id ? String(item.registrationId._id) : String(item.registrationId || ''),
      status: item.status,
      distanceKm: Number(item.distanceKm || 0),
      elapsedMs: Number(item.elapsedMs || 0),
      elapsedLabel: formatElapsedMs(item.elapsedMs),
      runDate: item.runDate || null,
      runLocation: item.runLocation || '',
      proofType: item.proofType || 'manual',
      runType: item.runType || 'run',
      isPersonalRecord: Boolean(item.isPersonalRecord),
      eventTitle: item.eventId?.title || 'Event unavailable',
      eventSlug: item.eventId?.slug || '',
      confirmationCode: item.registrationId?.confirmationCode || '',
      submittedAt: item.submittedAt || null,
      reviewedAt: item.reviewedAt || null,
      rejectionReason: item.rejectionReason || '',
      rejectionCode: item.rejectionCode || '',
      certificateUrl: item.certificate?.url || '',
      isAccumulatedActivity: item.submissionKind === 'accumulated_activity',
      submissionKind: item.submissionKind || 'standard'
    })),
    recentActivity: buildRunnerSubmissionActivity(activitySource)
  };
}

function getCompletedAccumulatedEventIds(approvedActivities = []) {
  const grouped = new Map();
  for (const activity of approvedActivities) {
    const registrationId = String(activity.registrationId?._id || activity.registrationId || '');
    const eventId = String(activity.eventId?._id || activity.eventId || '');
    if (!registrationId || !eventId) continue;
    if (!grouped.has(registrationId)) {
      grouped.set(registrationId, {
        eventId,
        targetDistanceKm: resolveAccumulatedTargetDistanceKm(activity.registrationId, activity.eventId),
        approvedDistanceKm: 0
      });
    }
    grouped.get(registrationId).approvedDistanceKm += Number(activity.distanceKm || 0);
  }
  return Array.from(grouped.values())
    .filter((item) => item.targetDistanceKm > 0 && item.approvedDistanceKm >= item.targetDistanceKm)
    .map((item) => item.eventId);
}

async function getRunnerEligibleSubmissionRegistrations(runnerId, options = {}) {
  const state = await getRunnerEligibleSubmissionRegistrationState(runnerId, options);
  return state.items;
}

async function getRunnerEligibleSubmissionRegistrationState(runnerId, options = {}) {
  const limit = clampInt(options.limit, 1, 100, 30);
  const now = options.now instanceof Date ? options.now : new Date();

  const registrations = await Registration.find({
    userId: runnerId,
    paymentStatus: 'paid',
    status: 'confirmed'
  })
    .sort({ registeredAt: -1 })
    .populate({
      path: 'eventId',
      select: 'title slug status eventType eventTypesAllowed eventStartAt eventEndAt virtualWindow onsiteCheckinWindows venueName city country virtualCompletionMode raceCategories targetDistanceKm minimumActivityDistanceKm acceptedRunTypes finalSubmissionDeadlineAt'
    })
    .lean();

  const registrationIds = registrations.map((item) => item?._id).filter(Boolean);
  const submissions = registrationIds.length
    ? await Submission.find({ registrationId: { $in: registrationIds }, runnerId })
      .select('registrationId status submittedAt reviewedAt')
      .lean()
    : [];
  const submissionByRegistrationId = new Map(
    submissions.map((item) => [String(item.registrationId), item])
  );

  const eligibleRegistrations = registrations
    .filter((registration) => {
      if (!registration?.eventId) return false;
      if (!isSubmissionWindowOpen({ registration, event: registration.eventId, now })) return false;

      const submission = submissionByRegistrationId.get(String(registration._id));
      if (!submission) return true;
      return String(submission.status || '').trim().toLowerCase() === 'rejected';
    })
    .slice(0, limit)
    .map((registration) => {
      const submission = submissionByRegistrationId.get(String(registration._id)) || null;
      const minimumDistanceKm = getStandardSubmissionMinimumDistanceKm(registration, registration.eventId);
      return {
        registrationId: String(registration._id),
        eventId: String(registration.eventId?._id || ''),
        eventTitle: registration.eventId?.title || 'Event unavailable',
        eventSlug: registration.eventId?.slug || '',
        participationMode: registration.participationMode || '',
        raceDistance: registration.raceDistance || '',
        eventStartAt: registration.eventId?.eventStartAt || null,
        eventEndAt: registration.eventId?.eventEndAt || null,
        submissionDeadlineAt: getSubmissionDeadlineAtForOption(registration, registration.eventId),
        virtualCompletionMode: registration.eventId?.virtualCompletionMode || '',
        submissionMode: registration.eventId?.virtualCompletionMode === 'accumulated_distance'
          ? 'accumulated'
          : 'standard',
        minimumRequiredDistanceKm: minimumDistanceKm,
        minimumActivityDistanceKm: Number(registration.eventId?.minimumActivityDistanceKm || 0) || null,
        acceptedRunTypes: Array.isArray(registration.eventId?.acceptedRunTypes)
          ? registration.eventId.acceptedRunTypes
          : [],
        targetDistanceKm: registration.eventId?.virtualCompletionMode === 'accumulated_distance'
          ? resolveAccumulatedTargetDistanceKm(registration, registration.eventId)
          : null,
        venueName: registration.eventId?.venueName || '',
        city: registration.eventId?.city || '',
        country: registration.eventId?.country || '',
        existingSubmissionStatus: submission?.status || '',
        canResubmit: submission?.status === 'rejected'
      };
    });
  const context = buildSubmissionEligibilityContext(registrations, eligibleRegistrations, now);

  if (eligibleRegistrations.length > 0) {
    return {
      items: eligibleRegistrations,
      context
    };
  }

  return {
    items: [buildPersonalRecordEligibleOption()],
    context
  };
}

async function getEligibleRunnerRegistration({ registrationId, runnerId }) {
  const registration = await Registration.findOne({
    _id: registrationId,
    userId: runnerId
  }).lean();

  if (!registration) {
    throw new Error('Registration not found or inaccessible.');
  }
  if (registration.status !== 'confirmed') {
    throw new Error('Run result submission requires a confirmed registration.');
  }
  if (registration.paymentStatus !== 'paid') {
    throw new Error('Run result submission requires a paid registration.');
  }
  if (registration.status === 'cancelled' || registration.status === 'refunded') {
    throw new Error('Cannot submit results for cancelled or refunded registrations.');
  }

  const event = await Event.findById(registration.eventId)
    .select('status isDeleted eventStartAt eventEndAt virtualWindow onsiteCheckinWindows virtualCompletionMode finalSubmissionDeadlineAt raceCategories targetDistanceKm')
    .lean();
  if (!event || event.isDeleted || event.status !== 'published') {
    throw new Error('Event not found for this registration.');
  }
  if (!isSubmissionWindowOpen({ registration, event })) {
    throw new Error('Event is not currently accepting result submissions.');
  }

  return {
    ...registration,
    resultProofMinimumDistanceKm: getStandardSubmissionMinimumDistanceKm(registration, event)
  };
}

async function createPersonalRecordSubmission({
  runnerId,
  distanceKm,
  elapsedMs,
  runDate,
  runLocation,
  proofType,
  proof,
  proofNotes,
  runType,
  elevationGain,
  steps,
  ocrData,
  source,
  stravaActivity,
  submissionAttemptId
}) {
  const runner = await User.findById(runnerId)
    .select('firstName lastName email mobile country dateOfBirth gender emergencyContactName emergencyContactNumber runningGroup')
    .lean();
  if (!runner) {
    throw new Error('Runner not found.');
  }

  const personalRecordDistance = formatPersonalRecordRaceDistance(distanceKm);
  const event = await Event.create({
    slug: await generatePersonalRecordSlug(),
    title: 'Personal Record',
    organiserName: 'HelloRun',
    description: 'Hidden personal-record submission container.',
    status: 'published',
    eventType: 'virtual',
    eventTypesAllowed: ['virtual'],
    raceDistances: [personalRecordDistance],
    eventStartAt: runDate || new Date(),
    eventEndAt: runDate || new Date(),
    virtualWindow: {
      startAt: runDate || new Date(),
      endAt: runDate || new Date()
    },
    proofTypesAllowed: ['gps', 'photo', 'manual'],
    waiverTemplate: DEFAULT_WAIVER_TEMPLATE,
    waiverVersion: 1,
    isPersonalRecord: true
  });

  const registration = await Registration.create({
    eventId: event._id,
    userId: runnerId,
    participant: {
      firstName: String(runner.firstName || '').trim(),
      lastName: String(runner.lastName || '').trim(),
      email: String(runner.email || '').trim().toLowerCase(),
      mobile: String(runner.mobile || '').trim(),
      country: String(runner.country || '').trim(),
      dateOfBirth: runner.dateOfBirth || null,
      gender: String(runner.gender || '').trim(),
      emergencyContactName: String(runner.emergencyContactName || '').trim(),
      emergencyContactNumber: String(runner.emergencyContactNumber || '').trim(),
      runningGroup: String(runner.runningGroup || '').trim()
    },
    participationMode: 'virtual',
    raceDistance: personalRecordDistance,
    status: 'confirmed',
    paymentStatus: 'paid',
    waiver: {
      accepted: true,
      version: 1,
      signature: buildPersonalRecordSignature(runner),
      acceptedAt: new Date(),
      templateSnapshot: DEFAULT_WAIVER_TEMPLATE,
      renderedSnapshot: DEFAULT_WAIVER_TEMPLATE
    },
    confirmationCode: await generateConfirmationCode(),
    registeredAt: new Date()
  });

  const payload = buildSubmissionPayload(registration, {
    distanceKm,
    elapsedMs,
    runDate,
    runLocation,
    proofType,
    proof,
    proofNotes,
    submissionCount: 1,
    runType,
    elevationGain,
    steps,
    ocrData,
    source,
    stravaActivity,
    submissionAttemptId
  });
  payload.isPersonalRecord = true;
  payload.validation = {
    ...(payload.validation || {}),
    submissionMode: 'personal_record',
    minimumRequiredDistanceKm: null
  };

  const submission = await Submission.create(payload);

  return applyAutoApprovalIfEligible(submission);
}

function buildPersonalRecordEligibleOption() {
  return {
    registrationId: PERSONAL_RECORD_REGISTRATION_ID,
    eventId: '',
    eventTitle: 'Personal Record',
    eventSlug: '',
    participationMode: 'virtual',
    raceDistance: '',
    eventStartAt: null,
    eventEndAt: null,
    virtualCompletionMode: '',
    submissionMode: 'personal_record',
    venueName: '',
    city: '',
    country: '',
    existingSubmissionStatus: '',
    canResubmit: false,
    isPersonalRecord: true
  };
}

function buildSubmissionEligibilityContext(registrations, eligibleRegistrations, now) {
  const context = {
    eligibleEventCount: eligibleRegistrations.length,
    paidConfirmedRegistrationCount: 0,
    closedSubmissionWindowCount: 0,
    upcomingSubmissionWindowCount: 0,
    latestClosedSubmissionDeadlineAt: null,
    nextSubmissionWindowOpensAt: null,
    fallbackMessage: ''
  };

  for (const registration of registrations) {
    const event = registration?.eventId;
    if (!event) continue;
    context.paidConfirmedRegistrationCount += 1;
    if (eligibleRegistrations.some((item) => item.registrationId === String(registration._id))) {
      continue;
    }

    const deadlineAt = parseDateSafe(getSubmissionDeadlineAtForOption(registration, event));
    if (deadlineAt && now.getTime() > deadlineAt.getTime()) {
      context.closedSubmissionWindowCount += 1;
      if (!context.latestClosedSubmissionDeadlineAt || deadlineAt.getTime() > new Date(context.latestClosedSubmissionDeadlineAt).getTime()) {
        context.latestClosedSubmissionDeadlineAt = deadlineAt.toISOString();
      }
      continue;
    }

    const opensAt = parseDateSafe(getSubmissionWindowStartAtForOption(registration, event));
    if (opensAt && now.getTime() < opensAt.getTime()) {
      context.upcomingSubmissionWindowCount += 1;
      if (!context.nextSubmissionWindowOpensAt || opensAt.getTime() < new Date(context.nextSubmissionWindowOpensAt).getTime()) {
        context.nextSubmissionWindowOpensAt = opensAt.toISOString();
      }
    }
  }

  if (context.eligibleEventCount > 0) {
    return context;
  }

  if (context.closedSubmissionWindowCount > 0) {
    context.fallbackMessage = context.closedSubmissionWindowCount === 1
      ? 'Your paid event registration is no longer accepting run result uploads. You can still save this activity as a Personal Record.'
      : 'Your paid event registrations are no longer accepting run result uploads. You can still save this activity as a Personal Record.';
  } else if (context.upcomingSubmissionWindowCount > 0) {
    context.fallbackMessage = context.upcomingSubmissionWindowCount === 1
      ? 'Your paid event registration is not accepting run result uploads yet. You can save this activity as a Personal Record for now.'
      : 'Your paid event registrations are not accepting run result uploads yet. You can save this activity as a Personal Record for now.';
  } else {
    context.fallbackMessage = 'No eligible event is accepting submissions right now. You can still save this activity as a Personal Record.';
  }

  return context;
}

function buildSubmissionPayload(registration, input, context = {}) {
  const safeDistance = sanitizeNumber(input.distanceKm, 0.1, 500, 'Distance is invalid.');
  const safeElapsedMs = sanitizeNumber(input.elapsedMs, 1, 7 * 24 * 60 * 60 * 1000, 'Elapsed time is invalid.');
  const safeRunDate = sanitizeRunDate(input.runDate);
  const safeRunLocation = sanitizeRunLocation(input.runLocation);
  const safeRunType = sanitizeRunType(input.runType);
  const safeElevationGain = sanitizeElevationGain(input.elevationGain);
  const safeSteps = sanitizeSteps(input.steps);
  const ocrData = sanitizeOcrData(input.ocrData);
  const integrity = detectSuspiciousActivity({
    distanceKm: safeDistance,
    elapsedMs: safeElapsedMs,
    runDate: safeRunDate,
    runLocation: safeRunLocation,
    runType: safeRunType,
    elevationGain: safeElevationGain,
    steps: safeSteps,
    ocrData
  });
  const minimumDistanceCheck = detectBelowMinimumStandardSubmissionDistance({
    submittedDistanceKm: safeDistance,
    ocrData,
    minimumRequiredDistanceKm: registration.resultProofMinimumDistanceKm
  });
  const suspiciousReasons = integrity.reasons ? integrity.reasons.slice() : [];
  if (minimumDistanceCheck.belowMinimum) {
    suspiciousReasons.push(
      `Submitted distance is below the minimum required distance for this one-time result (${formatDistanceForMessage(minimumDistanceCheck.minimumRequiredDistanceKm)} km).`
    );
  }
  let implausibleAccumulatedCheck = { implausible: false, detectedDistanceKm: null, targetDistanceKm: null };
  if (context.event?.virtualCompletionMode === 'accumulated_distance') {
    implausibleAccumulatedCheck = detectImplausibleAccumulatedActivityDistance({
      submittedDistanceKm: safeDistance,
      ocrData,
      targetDistanceKm: context.targetDistanceKm ?? resolveAccumulatedTargetDistanceKm(registration, context.event)
    });
    if (implausibleAccumulatedCheck.implausible) {
      suspiciousReasons.push(
        `This looks unusually long for a single activity update (detected ${formatDistanceForMessage(implausibleAccumulatedCheck.detectedDistanceKm)} km). If this is a lifetime/monthly total from your app, please upload a screenshot of just this one activity.`
      );
    }
  }
  const mergedOcrData = {
    ...ocrData,
    ...integrity.comparisons
  };
  const suspiciousFlag = integrity.suspicious || minimumDistanceCheck.belowMinimum || implausibleAccumulatedCheck.implausible;

  return {
    registrationId: registration._id,
    eventId: registration.eventId,
    runnerId: registration.userId,
    submissionAttemptId: String(input.submissionAttemptId || '').trim().slice(0, 100),
    isPersonalRecord: false,
    participationMode: registration.participationMode || 'virtual',
    raceDistance: String(registration.raceDistance || '').trim(),
    distanceKm: safeDistance,
    elapsedMs: safeElapsedMs,
    runDate: safeRunDate,
    runLocation: safeRunLocation,
    proofType: sanitizeProofType(input.proofType),
    proof: sanitizeProof(input.proof),
    proofNotes: String(input.proofNotes || '').trim().slice(0, 1200),
    source: sanitizeSubmissionSource(input.source),
    stravaActivity: sanitizeStravaActivity(input.stravaActivity),
    runType: safeRunType,
    elevationGain: safeElevationGain,
    steps: safeSteps,
    ocrData: mergedOcrData,
    suspiciousFlag,
    suspiciousFlagReason: suspiciousReasons.join(' ').slice(0, 500),
    validation: buildSubmissionValidationMetadata({
      input,
      registration,
      ocrData: mergedOcrData,
      suspiciousFlag,
      minimumDistanceCheck
    }),
    status: 'submitted',
    submissionCount: Number(input.submissionCount || 1),
    submittedAt: new Date()
  };
}

function sanitizeProofType(value) {
  const safe = String(value || '').trim().toLowerCase();
  if (safe === 'gps' || safe === 'photo' || safe === 'manual') {
    return safe;
  }
  return 'manual';
}

function sanitizeSubmissionSource(value) {
  return String(value || '').trim().toLowerCase() === 'strava' ? 'strava' : 'manual_upload';
}

function sanitizeStravaActivity(value) {
  if (!value || typeof value !== 'object') {
    return {
      id: null,
      athleteId: null,
      name: '',
      type: '',
      sportType: '',
      distanceMeters: null,
      distanceKm: null,
      movingTimeSeconds: null,
      elapsedTimeSeconds: null,
      startDate: null,
      startDateLocal: null,
      timezone: '',
      elevationGain: null,
      averageSpeed: null,
      url: '',
      importedAt: null
    };
  }

  return {
    id: sanitizeOptionalNumber(value.id, 1, Number.MAX_SAFE_INTEGER),
    athleteId: sanitizeOptionalNumber(value.athleteId, 1, Number.MAX_SAFE_INTEGER),
    name: String(value.name || '').trim().slice(0, 200),
    type: String(value.type || '').trim().slice(0, 80),
    sportType: String(value.sportType || '').trim().slice(0, 80),
    distanceMeters: sanitizeOptionalNumber(value.distanceMeters, 0, 1000000),
    distanceKm: sanitizeOptionalNumber(value.distanceKm, 0, 1000),
    movingTimeSeconds: sanitizeOptionalNumber(value.movingTimeSeconds, 0, 7 * 24 * 60 * 60),
    elapsedTimeSeconds: sanitizeOptionalNumber(value.elapsedTimeSeconds, 0, 7 * 24 * 60 * 60),
    startDate: sanitizeOptionalDate(value.startDate),
    startDateLocal: sanitizeOptionalDate(value.startDateLocal),
    timezone: String(value.timezone || '').trim().slice(0, 120),
    elevationGain: sanitizeOptionalNumber(value.elevationGain, 0, 20000),
    averageSpeed: sanitizeOptionalNumber(value.averageSpeed, 0, 100),
    url: String(value.url || '').trim().slice(0, 500),
    importedAt: sanitizeOptionalDate(value.importedAt) || new Date()
  };
}

function sanitizeRunType(value) {
  const allowed = ['run', 'walk', 'hike', 'trail_run'];
  const safe = String(value || '').trim().toLowerCase();
  return allowed.includes(safe) ? safe : 'run';
}

function sanitizeElevationGain(value) {
  if (value === undefined || value === null || value === '') return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0 || numeric > 20000) return null;
  return Math.round(numeric);
}

function sanitizeSteps(value) {
  if (value === undefined || value === null || value === '') return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0 || numeric > 200000) return null;
  return Math.round(numeric);
}

function sanitizeProof(value) {
  if (!value || typeof value !== 'object') {
    throw new Error('Run result evidence is required.');
  }
  const url = String(value.url || '').trim();
  if (!url) {
    throw new Error('Run result evidence URL is required.');
  }
  return {
    url: url.slice(0, 2000),
    key: String(value.key || '').trim().slice(0, 400),
    mimeType: String(value.mimeType || '').trim().slice(0, 120),
    size: sanitizeNumber(value.size || 0, 0, 20 * 1024 * 1024, 'Proof size is invalid.'),
    hash: String(value.hash || '').trim().slice(0, 64)
  };
}

function sanitizeNumber(value, min, max, errorMessage) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < min || numeric > max) {
    throw new Error(errorMessage);
  }
  return numeric;
}

function sanitizeOptionalDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function sanitizeRunDate(value) {
  if (!value) return new Date();

  if (value instanceof Date) {
    return assertRunDateNotFuture(value);
  }

  const raw = String(value).trim();
  let date = null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    date = new Date(`${raw}T00:00:00.000Z`);
  } else {
    date = new Date(raw);
  }

  if (Number.isNaN(date.getTime())) {
    throw new Error('Run date is invalid.');
  }

  return assertRunDateNotFuture(date);
}

function sanitizeRunLocation(value) {
  const safe = String(value || '').trim();
  return safe.slice(0, 200);
}

function clampInt(value, min, max, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function normalizeResultStatus(value) {
  const safe = String(value || '').trim().toLowerCase();
  if (safe === 'submitted' || safe === 'approved' || safe === 'rejected') {
    return safe;
  }
  return '';
}

async function getSubmissionCountsForModel(Model, runnerId) {
  const [total, submitted, approved, rejected, certificates] = await Promise.all([
    Model.countDocuments({ runnerId }),
    Model.countDocuments({ runnerId, status: 'submitted' }),
    Model.countDocuments({ runnerId, status: 'approved' }),
    Model.countDocuments({ runnerId, status: 'rejected' }),
    Model.countDocuments({
      runnerId,
      status: 'approved',
      'certificate.url': { $exists: true, $ne: '' }
    })
  ]);
  return { total, submitted, approved, rejected, certificates };
}

function combineSubmissionCounts(...rows) {
  return rows.reduce((totals, row) => ({
    total: totals.total + Number(row?.total || 0),
    submitted: totals.submitted + Number(row?.submitted || 0),
    approved: totals.approved + Number(row?.approved || 0),
    rejected: totals.rejected + Number(row?.rejected || 0),
    certificates: totals.certificates + Number(row?.certificates || 0)
  }), {
    total: 0,
    submitted: 0,
    approved: 0,
    rejected: 0,
    certificates: 0
  });
}

function getRecentCertificatesForModel(Model, runnerId, limit) {
  return Model.find({
    runnerId,
    status: 'approved',
    'certificate.url': { $exists: true, $ne: '' },
    'certificate.status': { $nin: ['revoked', 'failed', 'pending'] },
    'certificate.revokedAt': null
  })
    .sort({ 'certificate.issuedAt': -1, reviewedAt: -1, submittedAt: -1 })
    .limit(limit)
    .populate({ path: 'eventId', select: 'title slug' })
    .populate({ path: 'registrationId', select: 'confirmationCode raceDistance' })
    .select('eventId registrationId certificate reviewedAt submittedAt distanceKm elapsedMs raceDistance')
    .lean();
}

function formatRecentCertificate(item) {
  const certNumber = String(item.certificate?.certificateNumber || '').trim();
  return {
    submissionId: String(item._id),
    submissionKind: item.submissionKind || 'standard',
    isAccumulatedActivity: item.submissionKind === 'accumulated_activity',
    eventTitle: item.eventId?.title || 'Event unavailable',
    eventSlug: item.eventId?.slug || '',
    confirmationCode: item.registrationId?.confirmationCode || '',
    raceDistance: item.registrationId?.raceDistance || item.raceDistance || '',
    distanceKm: Number(item.distanceKm || 0),
    elapsedLabel: formatElapsedMs(item.elapsedMs),
    certificateUrl: item.certificate?.url || '',
    certificateNumber: certNumber,
    verifyUrl: certNumber ? buildVerificationUrl(certNumber) : '',
    issuedAt: item.certificate?.issuedAt || item.reviewedAt || item.submittedAt || null
  };
}

function compareDateDesc(first, second) {
  const firstTime = new Date(first || 0).getTime();
  const secondTime = new Date(second || 0).getTime();
  const safeFirst = Number.isNaN(firstTime) ? 0 : firstTime;
  const safeSecond = Number.isNaN(secondTime) ? 0 : secondTime;
  return safeSecond - safeFirst;
}

function formatElapsedMs(value) {
  const totalMs = Number(value || 0);
  if (!Number.isFinite(totalMs) || totalMs <= 0) return '00:00:00';
  const totalSeconds = Math.floor(totalMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function buildRunnerSubmissionActivity(submissions = []) {
  const timeline = [];
  for (const item of submissions || []) {
    const eventTitle = item.eventId?.title || 'Event unavailable';
    if (item.submittedAt) {
      timeline.push({
        type: 'result_submitted',
        at: item.submittedAt,
        eventTitle,
        message: `Submitted result for ${eventTitle}.`
      });
    }
    if (item.reviewedAt && item.status === 'approved') {
      timeline.push({
        type: 'result_approved',
        at: item.reviewedAt,
        eventTitle,
        message: `Result approved for ${eventTitle}.`
      });
    }
    if (item.reviewedAt && item.status === 'rejected') {
      timeline.push({
        type: 'result_rejected',
        at: item.reviewedAt,
        eventTitle,
        message: `Result rejected for ${eventTitle}.`
      });
    }
    if (item.certificate?.issuedAt) {
      timeline.push({
        type: 'certificate_issued',
        at: item.certificate.issuedAt,
        eventTitle,
        message: `Certificate issued for ${eventTitle}.`
      });
    }
  }

  return timeline
    .sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0))
    .slice(0, 8);
}

async function attachCertificateIfNeeded(submission) {
  if (!submission || submission.status !== 'approved') return;
  if (submission.certificate && submission.certificate.url) return;
  if (submission.isPersonalRecord) return;

  try {
    const [registration, event, runner] = await Promise.all([
      Registration.findById(submission.registrationId).select('confirmationCode raceDistance').lean(),
      Event.findById(submission.eventId)
        .select('title organiserName logoUrl referenceCode slug eventStartAt eventEndAt raceDistances targetDistanceKm digitalCertificateEnabled organizerId')
        .lean(),
      User.findById(submission.runnerId).select('firstName lastName').lean()
    ]);
    if (!registration || !event || !runner) return;
    if (event.digitalCertificateEnabled === false) return;

    const certificate = await issueSubmissionCertificate({
      submission,
      registration,
      event,
      runner
    });
    submission.certificate = {
      url: certificate.url || '',
      key: certificate.key || '',
      issuedAt: certificate.issuedAt || new Date(),
      certificateNumber: certificate.certificateNumber || '',
      verificationUrl: certificate.verificationUrl || '',
      templateId: certificate.templateId || null,
      status: certificate.status || 'generated',
      revokedAt: null,
      regeneratedAt: null,
      generationError: ''
    };
    await submission.save();
    recordCriticalAuditEventInBackground({
      actorMongoUserId: submission.reviewedBy ? String(submission.reviewedBy) : '',
      action: 'certificate.issued',
      targetType: 'submission_certificate',
      targetId: String(submission._id),
      statusFrom: '',
      statusTo: 'issued',
      notes: `Certificate issued for submission ${String(submission._id)}`,
      occurredAt: submission.certificate.issuedAt
    });
  } catch (error) {
    // Certificate generation should not block review completion.
    logger.error('Submission certificate generation failed:', error.message);
  }
}

function attachCertAndNotifyInBackground(submission, action, knownEventTitle) {
  const task = (async () => {
    try {
      const hadCertificate = Boolean(submission.certificate?.url);
      if (action === 'approve') {
        await attachCertificateIfNeeded(submission);
      }
      const certificateWasIssued = !hadCertificate && Boolean(submission.certificate?.url);
      let eventTitle = knownEventTitle;
      if (!eventTitle) {
        const event = await Event.findById(submission.eventId).select('title').lean();
        eventTitle = event?.title || (submission.isPersonalRecord ? 'Personal Record' : 'Event');
      }
      await sendRunnerReviewNotifications({
        submission,
        eventTitle,
        action,
        certificateWasIssued
      });
    } catch (error) {
      logger.error('cert/notify background error:', {
        error: error.message,
        submissionId: String(submission?._id || '')
      });
    }
  })();
  return task;
}

async function applyAutoApprovalIfEligible(submission) {
  if (!isAutoApprovableSubmission(submission)) {
    return submission;
  }

  const autoApprovalReviewNote = getAutoApprovalReviewNote(submission);
  submission.status = 'approved';
  submission.reviewedAt = new Date();
  submission.reviewedBy = null;
  submission.reviewNotes = autoApprovalReviewNote;
  submission.rejectionReason = '';
  submission.rejectionCode = '';
  await submission.save();
  Event.findById(submission.eventId).select('slug').lean()
    .then((ev) => { if (ev?.slug) invalidateLeaderboardCache(ev.slug); })
    .catch(() => {});
  recordCriticalAuditEventInBackground({
    actorMongoUserId: '',
    action: 'submission.auto_approved',
    targetType: 'submission',
    targetId: String(submission._id),
    statusFrom: 'submitted',
    statusTo: 'approved',
    notes: autoApprovalReviewNote,
    occurredAt: submission.reviewedAt
  });

  const backgroundTask = attachCertAndNotifyInBackground(submission, 'approve');
  if (runSubmissionBackgroundTasksInline) {
    await backgroundTask;
  }
  evaluateSubmissionAchievementsSafe(submission, {
    performedBy: ''
  });
  if (!submission.isPersonalRecord) {
    refreshGlobalDistanceMilestonesSafe(submission.runnerId, {
      performedBy: ''
    });
    Event.findById(submission.eventId).select('slug').lean()
      .then((ev) => { if (ev?.slug) syncEventRankingsInBackground(submission, ev.slug); })
      .catch(() => {});
  }

  return submission;
}

async function sendRunnerReviewNotifications({
  submission,
  eventTitle,
  action,
  certificateWasIssued
}) {
  try {
    const [runner, registration] = await Promise.all([
      User.findById(submission.runnerId).select('email firstName').lean(),
      Registration.findById(submission.registrationId).select('confirmationCode').lean()
    ]);

    if (!runner) return;
    const runnerFirstName = runner.firstName || 'Runner';
    const confirmationCode = registration?.confirmationCode || '';

    if (action === 'approve') {
      const notifyTasks = [
        notifyWithRetry('result.approved', {
          notification: {
            userId: submission.runnerId,
            type: 'result_approved',
            title: 'Result Approved',
            message: `Your result for ${eventTitle} has been approved.`,
            href: `/runner/submissions/${String(submission._id)}`,
            metadata: {
              submissionId: String(submission._id),
              registrationId: String(submission.registrationId || ''),
              eventTitle
            }
          },
          email: runner.email ? {
            to: runner.email,
            runnerFirstName,
            firstName: runnerFirstName,
            eventTitle,
            confirmationCode,
            elapsedLabel: formatElapsedMs(submission.elapsedMs),
            recipientUserId: submission.runnerId,
            metadata: {
              submissionId: String(submission._id),
              registrationId: String(submission.registrationId || '')
            }
          } : null
        }, {
          source: 'submission.review_approve'
        })
      ];

      if (certificateWasIssued && submission.certificate?.url) {
        notifyTasks.push(
          communicationService.notify('certificate.issued', {
            notification: {
              userId: submission.runnerId,
              type: 'certificate_issued',
              title: 'Certificate Ready',
              message: `Your certificate for ${eventTitle} is now available.`,
              href: `/runner/submissions/${String(submission._id)}`,
              metadata: {
                submissionId: String(submission._id),
                registrationId: String(submission.registrationId || ''),
                eventTitle
              }
            },
            email: runner.email ? {
              to: runner.email,
              firstName: runnerFirstName,
              eventTitle,
              confirmationCode,
              certificateUrl: submission.certificate.url,
              recipientUserId: submission.runnerId,
              metadata: {
                submissionId: String(submission._id),
                registrationId: String(submission.registrationId || '')
              }
            } : null
          })
        );
      }
      await Promise.all(notifyTasks);
      return;
    }

    if (action === 'reject') {
      await notifyWithRetry('result.rejected', {
        notification: {
          userId: submission.runnerId,
          type: 'result_rejected',
          title: 'Result Needs Update',
          message: `Your result for ${eventTitle} was rejected. Review feedback and resubmit.`,
          href: `/runner/submissions/${String(submission._id)}`,
          metadata: {
            submissionId: String(submission._id),
            registrationId: String(submission.registrationId || ''),
            eventTitle
          }
        },
        email: runner.email ? {
          to: runner.email,
          firstName: runnerFirstName,
          eventTitle,
          confirmationCode,
          rejectionReason: submission.rejectionReason || '',
          reviewNotes: submission.reviewNotes || '',
          recipientUserId: submission.runnerId,
          metadata: {
            submissionId: String(submission._id),
            registrationId: String(submission.registrationId || '')
          }
        } : null
      }, {
        source: 'submission.review_reject'
      });
    }
  } catch (error) {
    logger.error('Submission review notification lookup failed:', {
      error: error.message,
      submissionId: String(submission?._id || '')
    });
  }
}

async function generatePersonalRecordSlug() {
  while (true) {
    const candidate = `personal-record-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const exists = await Event.exists({ slug: candidate });
    if (!exists) return candidate;
  }
}

async function generateConfirmationCode() {
  while (true) {
    const token = Math.random().toString(36).slice(2, 8).toUpperCase();
    const candidate = `HR-${token}`;
    const exists = await Registration.exists({ confirmationCode: candidate });
    if (!exists) return candidate;
  }
}

function formatPersonalRecordRaceDistance(distanceKm) {
  const numeric = Number(distanceKm || 0);
  if (!Number.isFinite(numeric) || numeric <= 0) return 'Personal Record';
  return `${numeric.toFixed(2)} KM`;
}

function buildPersonalRecordSignature(runner) {
  const fullName = `${String(runner?.firstName || '').trim()} ${String(runner?.lastName || '').trim()}`.trim();
  if (fullName) return fullName.slice(0, 160);
  return String(runner?.email || 'Runner').slice(0, 160);
}

function evaluateSubmissionAchievementsSafe(submission, options = {}) {
  try {
    const { evaluateSubmissionAchievementsInBackground } = require('./achievement.service');
    evaluateSubmissionAchievementsInBackground(submission, options);
  } catch (error) {
    logger.error('Submission achievement hook failed:', {
      submissionId: String(submission?._id || ''),
      error: error.message
    });
  }
}

function refreshGlobalDistanceMilestonesSafe(mongoUserId, options = {}) {
  try {
    const { refreshGlobalDistanceMilestoneProgressInBackground } = require('./badge-progress.service');
    refreshGlobalDistanceMilestoneProgressInBackground(mongoUserId, options);
  } catch (error) {
    logger.error('Global distance badge progress hook failed:', {
      mongoUserId: String(mongoUserId || ''),
      error: error.message
    });
  }
}

function syncEventRankingsInBackground(submission, eventSlug) {
  if (disableSubmissionSyncBackgroundTasks) return;
  if (!process.env.DATABASE_URL || !eventSlug || submission.isPersonalRecord) return;
  (async () => {
    try {
      const allApproved = await Submission.find({
        eventId: submission.eventId,
        status: 'approved',
        isPersonalRecord: { $ne: true }
      })
        .select('_id raceDistance participationMode elapsedMs submittedAt')
        .lean();

      const groups = new Map();
      for (const sub of allApproved) {
        const key = `${sub.raceDistance}|${sub.participationMode}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(sub);
      }

      for (const group of groups.values()) {
        group.sort((a, b) => (a.elapsedMs || 0) - (b.elapsedMs || 0));
        for (let i = 0; i < group.length; i++) {
          const sub = group[i];
          const entry = {
            submissionId: String(sub._id),
            leaderboardType: 'single_activity',
            rank: i + 1,
            raceDistance: sub.raceDistance || '',
            participationMode: sub.participationMode || 'virtual',
            elapsedMs: sub.elapsedMs || 0,
            submittedAt: sub.submittedAt
          };
          let lastErr;
          for (let attempt = 0; attempt < 3; attempt++) {
            try {
              await syncRankingEntry(entry, { eventSlug }, { runnerId: sub.runnerId || submission.runnerId });
              lastErr = null;
              break;
            } catch (err) {
              lastErr = err;
              await new Promise((resolve) => setTimeout(resolve, 500));
            }
          }
          if (lastErr) {
            logger.error('Ranking sync failed after retries:', {
              submissionId: String(sub._id),
              error: lastErr.message
            });
          }
        }
      }

      await evaluatePublishedRankingAchievements({ eventSlug });
    } catch (error) {
      logger.error('syncEventRankingsInBackground failed:', {
        eventId: String(submission.eventId || ''),
        error: error.message
      });
    }
  })();
}

function getSubmissionDeadlineAtForOption(registration, event) {
  if (!event) return null;
  const participationMode = String(registration?.participationMode || '').trim().toLowerCase();
  const completionMode = String(event.virtualCompletionMode || '').trim().toLowerCase();
  if (participationMode === 'virtual' && completionMode === 'accumulated_distance' && event.finalSubmissionDeadlineAt) {
    return event.finalSubmissionDeadlineAt;
  }
  if (participationMode === 'virtual' && event.virtualWindow?.endAt) {
    return event.virtualWindow.endAt;
  }
  return event.eventEndAt || null;
}

function getSubmissionWindowStartAtForOption(registration, event) {
  if (!event) return null;
  const participationMode = String(registration?.participationMode || '').trim().toLowerCase();
  if (participationMode === 'virtual' && event.virtualWindow?.startAt) {
    return event.virtualWindow.startAt;
  }
  if (participationMode === 'onsite') {
    const windows = Array.isArray(event.onsiteCheckinWindows) ? event.onsiteCheckinWindows : [];
    const starts = windows
      .map((windowItem) => parseDateSafe(windowItem?.startAt))
      .filter(Boolean)
      .sort((a, b) => a.getTime() - b.getTime());
    if (starts.length) return starts[0];
  }
  return event.eventStartAt || null;
}

function parseDateSafe(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function __setRunSubmissionBackgroundTasksInline(value) {
  runSubmissionBackgroundTasksInline = Boolean(value);
}

function __setDisableSubmissionSyncBackgroundTasks(value) {
  disableSubmissionSyncBackgroundTasks = Boolean(value);
}

module.exports = {
  createSubmission,
  editRejectedSubmissionMetadata,
  applyAdminSubmissionCorrection,
  resubmitSubmission,
  reviewSubmission,
  getRunnerSubmissions,
  getEventSubmissionQueue,
  getRunnerSubmissionSummary,
  getRunnerPerformanceSnapshot,
  getRunnerEligibleSubmissionRegistrations,
  getRunnerEligibleSubmissionRegistrationState,
  PERSONAL_RECORD_REGISTRATION_ID,
  detectSuspiciousActivity,
  isAutoApprovableOcrSubmission,
  isAutoApprovableSubmission,
  getAutoApprovalReviewNote,
  buildSubmissionPayload,
  getEligibleRunnerRegistration,
  __setRunSubmissionBackgroundTasksInline,
  __setDisableSubmissionSyncBackgroundTasks
};
