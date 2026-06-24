const AccumulatedActivitySubmission = require('../models/AccumulatedActivitySubmission');
const Registration = require('../models/Registration');
const Event = require('../models/Event');
const User = require('../models/User');
const { issueSubmissionCertificate } = require('./certificate.service');
const communicationService = require('./communication.service');
const {
  buildSubmissionPayload,
  getEligibleRunnerRegistration,
  isAutoApprovableSubmission,
  getAutoApprovalReviewNote
} = require('./submission.service');
const { recordCriticalAuditEventInBackground } = require('./critical-audit.service');
const {
  refreshAccumulatedChallengeProgress,
  refreshGlobalDistanceMilestoneProgressInBackground
} = require('./badge-progress.service');
const { resolveAccumulatedTargetDistanceKm } = require('./accumulated-target.service');

const APPROVABLE_STATUS = new Set(['submitted', 'rejected']);
const REJECTABLE_STATUS = new Set(['submitted']);

async function createAccumulatedActivitySubmission(input) {
  const registration = await getEligibleRunnerRegistration({
    registrationId: input.registrationId,
    runnerId: input.runnerId
  });
  const event = await Event.findById(registration.eventId)
    .select('virtualCompletionMode targetDistanceKm minimumActivityDistanceKm acceptedRunTypes title')
    .lean();

  assertAccumulatedEvent(event);
  validateActivityAgainstEvent(input, event);

  const payload = buildSubmissionPayload(registration, {
    ...input,
    submissionCount: 1
  });
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
  rejectionReason
}) {
  const safeAction = String(action || '').trim().toLowerCase();
  if (safeAction !== 'approve' && safeAction !== 'reject') {
    throw new Error('Invalid review action.');
  }

  const activity = await AccumulatedActivitySubmission.findById(activityId);
  if (!activity) {
    throw new Error('Activity submission not found.');
  }
  if (safeAction === 'approve' && !APPROVABLE_STATUS.has(activity.status)) {
    throw new Error('Only submitted or rejected activities can be approved.');
  }
  if (safeAction === 'reject' && !REJECTABLE_STATUS.has(activity.status)) {
    throw new Error('Only submitted activities can be rejected.');
  }

  const normalizedReviewerRole = String(reviewerRole || '').trim().toLowerCase();
  const isAdminReviewer = normalizedReviewerRole === 'admin';
  const event = await Event.findById(activity.eventId)
    .select('organizerId title targetDistanceKm virtualCompletionMode')
    .lean();
  if (!event || event.virtualCompletionMode !== 'accumulated_distance') {
    throw new Error('Activity submission not found or inaccessible.');
  }
  if (!isAdminReviewer && String(event.organizerId || '') !== String(organizerId || '')) {
    throw new Error('Activity submission not found or inaccessible.');
  }

  const previousStatus = activity.status;
  activity.reviewedAt = new Date();
  activity.reviewedBy = organizerId;
  activity.reviewNotes = String(reviewNotes || '').trim().slice(0, 1200);
  activity.rejectionReason = '';

  if (safeAction === 'approve') {
    activity.status = 'approved';
    // Manual approval is the trusted reviewer decision, so clear automated suspicion metadata.
    activity.suspiciousFlag = false;
    activity.suspiciousFlagReason = '';
  } else {
    const reason = String(rejectionReason || '').trim().slice(0, 500);
    if (!reason) {
      throw new Error('Rejection reason is required.');
    }
    activity.status = 'rejected';
    activity.rejectionReason = reason;
  }

  await activity.save();
  recordCriticalAuditEventInBackground({
    actorMongoUserId: organizerId,
    action: safeAction === 'approve' ? 'submission.approved' : 'submission.rejected',
    targetType: 'accumulated_activity_submission',
    targetId: String(activity._id),
    statusFrom: previousStatus,
    statusTo: activity.status,
    notes: safeAction === 'approve'
      ? activity.reviewNotes
      : (activity.rejectionReason || activity.reviewNotes),
    occurredAt: activity.reviewedAt
  });

  let certificateWasIssued = false;
  if (safeAction === 'approve') {
    certificateWasIssued = await attachCompletionCertificateIfNeeded(activity);
    refreshAccumulatedChallengeProgress(activity.registrationId, {
      performedBy: organizerId
    }).catch((error) => {
      console.error('Accumulated challenge badge progress refresh failed:', {
        activityId: String(activity._id || ''),
        registrationId: String(activity.registrationId || ''),
        error: error.message
      });
    });
    refreshGlobalDistanceMilestoneProgressInBackground(activity.runnerId, {
      performedBy: organizerId
    });
  }

  await sendActivityReviewNotifications({
    activity,
    eventTitle: event.title || 'Event',
    action: safeAction,
    certificateWasIssued
  });

  return activity;
}

async function getRegistrationAccumulatedProgress(registrationId) {
  const registration = await Registration.findById(registrationId).lean();
  if (!registration) return buildEmptyProgress();
  const event = await Event.findById(registration.eventId)
    .select('targetDistanceKm raceCategories virtualCompletionMode')
    .lean();
  if (!event || event.virtualCompletionMode !== 'accumulated_distance') {
    return buildEmptyProgress();
  }
  const activities = await AccumulatedActivitySubmission.find({ registrationId })
    .sort({ submittedAt: 1, createdAt: 1 })
    .lean();
  return buildAccumulatedProgress({
    activities,
    targetDistanceKm: resolveAccumulatedTargetDistanceKm(registration, event)
  });
}

async function getRunnerAccumulatedActivities(runnerId, options = {}) {
  const limit = clampInt(options.limit, 1, 500, 100);
  return AccumulatedActivitySubmission.find({ runnerId })
    .sort({ submittedAt: -1 })
    .limit(limit)
    .populate({ path: 'eventId', select: 'title slug eventStartAt targetDistanceKm virtualCompletionMode' })
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
        approvedActivityCount: { $sum: 1 },
        lastApprovedAt: { $max: '$reviewedAt' },
        firstSubmittedAt: { $min: '$submittedAt' }
      }
    },
    { $sort: { approvedDistanceKm: -1, lastApprovedAt: 1, firstSubmittedAt: 1 } },
    { $limit: clampInt(filters.limit, 1, 200, 100) }
  ]);
}

function buildAccumulatedProgress({ activities = [], targetDistanceKm }) {
  const target = Number(targetDistanceKm || 0);
  const approved = activities.filter((item) => item.status === 'approved');
  const pending = activities.filter((item) => item.status === 'submitted');
  const rejected = activities.filter((item) => item.status === 'rejected');
  const approvedDistanceKm = sumDistance(approved);
  const pendingDistanceKm = sumDistance(pending);
  const rejectedDistanceKm = sumDistance(rejected);
  const completed = target > 0 && approvedDistanceKm >= target;
  const certificateActivity = approved.find((item) => item.certificate?.url);

  let completionTimestamp = null;
  if (completed) {
    let total = 0;
    const orderedApproved = approved
      .slice()
      .sort((a, b) => new Date(a.reviewedAt || a.submittedAt || 0) - new Date(b.reviewedAt || b.submittedAt || 0));
    for (const activity of orderedApproved) {
      total += Number(activity.distanceKm || 0);
      if (total >= target) {
        completionTimestamp = activity.reviewedAt || activity.submittedAt || null;
        break;
      }
    }
  }

  return {
    targetDistanceKm: target,
    approvedDistanceKm,
    pendingDistanceKm,
    rejectedDistanceKm,
    approvedActivityCount: approved.length,
    pendingActivityCount: pending.length,
    rejectedActivityCount: rejected.length,
    totalActivityCount: activities.length,
    completed,
    completionTimestamp,
    certificateEligible: completed,
    certificateActivityId: certificateActivity ? String(certificateActivity._id) : '',
    certificateUrl: certificateActivity?.certificate?.url || '',
    progressLabel: target > 0
      ? `${formatDistance(approvedDistanceKm)} km / ${formatDistance(target)} km`
      : `${formatDistance(approvedDistanceKm)} km`
  };
}

function buildEmptyProgress() {
  return buildAccumulatedProgress({ activities: [], targetDistanceKm: 0 });
}

async function attachCompletionCertificateIfNeeded(activity) {
  // Atomically claim the certificate slot to prevent duplicate issuance under concurrent approvals.
  const claimed = await AccumulatedActivitySubmission.findOneAndUpdate(
    {
      registrationId: activity.registrationId,
      'certificate.url': '',
      'certificate.status': { $nin: ['pending', 'generated', 'regenerated'] }
    },
    { $set: { 'certificate.status': 'pending' } },
    { new: false }
  ).lean();
  if (!claimed) return false;

  const releaseLock = () => AccumulatedActivitySubmission.updateOne(
    { registrationId: activity.registrationId, 'certificate.status': 'pending' },
    { $set: { 'certificate.status': '' } }
  ).catch(() => {});

  try {
    const [registration, event, runner, activities] = await Promise.all([
      Registration.findById(activity.registrationId).lean(),
      Event.findById(activity.eventId).lean(),
      User.findById(activity.runnerId).select('firstName lastName email').lean(),
      AccumulatedActivitySubmission.find({ registrationId: activity.registrationId }).lean()
    ]);
    if (!registration || !event || !runner) {
      await releaseLock();
      return false;
    }
    if (event.digitalCertificateEnabled === false) {
      await releaseLock();
      return false;
    }
    const progress = buildAccumulatedProgress({
      activities,
      targetDistanceKm: resolveAccumulatedTargetDistanceKm(registration, event)
    });
    if (!progress.completed) {
      await releaseLock();
      return false;
    }

    const certificate = await issueSubmissionCertificate({
      submission: activity,
      registration,
      event,
      runner
    });
    activity.certificate = {
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
    await activity.save();
    recordCriticalAuditEventInBackground({
      actorMongoUserId: activity.reviewedBy ? String(activity.reviewedBy) : '',
      action: 'certificate.issued',
      targetType: 'accumulated_activity_certificate',
      targetId: String(activity._id),
      statusFrom: '',
      statusTo: 'issued',
      notes: `Certificate issued for accumulated activity ${String(activity._id)}`,
      occurredAt: activity.certificate?.issuedAt || new Date()
    });
    return Boolean(certificate?.url);
  } catch (error) {
    await releaseLock();
    throw error;
  }
}

async function applyAccumulatedAutoApprovalIfEligible(activity, event = null) {
  if (!isAutoApprovableSubmission(activity)) {
    return activity;
  }

  const eventDoc = event || await Event.findById(activity.eventId)
    .select('title targetDistanceKm virtualCompletionMode')
    .lean();
  if (!eventDoc || eventDoc.virtualCompletionMode !== 'accumulated_distance') {
    return activity;
  }

  const hadCertificate = Boolean(activity.certificate?.url);
  const autoApprovalReviewNote = getAutoApprovalReviewNote(activity);
  activity.status = 'approved';
  activity.reviewedAt = new Date();
  activity.reviewedBy = null;
  activity.reviewNotes = autoApprovalReviewNote;
  activity.rejectionReason = '';
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

  const certificateWasIssued = !hadCertificate && await attachCompletionCertificateIfNeeded(activity);
  refreshAccumulatedChallengeProgress(activity.registrationId, {
    performedBy: ''
  }).catch((error) => {
    console.error('Accumulated challenge badge progress refresh failed:', {
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
    certificateWasIssued
  });

  return activity;
}

function assertAccumulatedEvent(event) {
  if (!event || event.virtualCompletionMode !== 'accumulated_distance') {
    throw new Error('This registration is not for an accumulated-distance event.');
  }
}

function validateActivityAgainstEvent(input, event) {
  const distance = Number(input.distanceKm || 0);
  const minimum = Number(event.minimumActivityDistanceKm || 0);
  if (minimum > 0 && distance < minimum) {
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

async function sendActivityReviewNotifications({ activity, eventTitle, action, certificateWasIssued }) {
  try {
    const runner = await User.findById(activity.runnerId).select('firstName email').lean();
    if (!runner) return;

    const approved = action === 'approve';
    await communicationService.notify(approved ? 'result.approved' : 'result.rejected', {
      notification: {
        userId: activity.runnerId,
        type: approved ? 'result_approved' : 'result_rejected',
        title: approved ? 'Activity Approved' : 'Activity Needs Update',
        message: approved
          ? `Your activity for ${eventTitle} was approved.`
          : `Your activity for ${eventTitle} was rejected. Please review and submit another activity.`,
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
    console.error('Accumulated activity review notification failed:', {
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
