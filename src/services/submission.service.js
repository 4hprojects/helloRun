const mongoose = require('mongoose');
const Submission = require('../models/Submission');
const AccumulatedActivitySubmission = require('../models/AccumulatedActivitySubmission');
const Registration = require('../models/Registration');
const Event = require('../models/Event');
const User = require('../models/User');
const { issueSubmissionCertificate } = require('./certificate.service');
const communicationService = require('./communication.service');
const { isSubmissionWindowOpen } = require('../utils/submission-window');
const { resolveAccumulatedTargetDistanceKm } = require('./accumulated-target.service');
const { DEFAULT_WAIVER_TEMPLATE } = require('../utils/waiver');
const { detectSuspiciousActivity } = require('../utils/submission-integrity');
const { assertRunDateNotFuture } = require('../utils/platform-date');
const { recordCriticalAuditEventInBackground } = require('./critical-audit.service');

const APPROVABLE_STATUS = new Set(['submitted', 'rejected']);
const REJECTABLE_STATUS = new Set(['submitted']);
const FINAL_STATUSES = new Set(['approved']);
const PERSONAL_RECORD_REGISTRATION_ID = 'personal-record';
const AUTO_APPROVAL_CONFIDENCE_THRESHOLD = 0.7;
const AUTO_APPROVAL_REVIEW_NOTE = 'Auto-approved from OCR name match.';
const STRAVA_AUTO_APPROVAL_REVIEW_NOTE = 'Auto-approved from verified Strava activity.';

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
  stravaActivity
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
      stravaActivity
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
    stravaActivity
  }));
  return applyAutoApprovalIfEligible(submission);
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
  stravaActivity
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
    stravaActivity
  });

  existing.distanceKm = payload.distanceKm;
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
  rejectionReason
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
  const event = await Event.findById(submission.eventId).select('organizerId title').lean();
  if (!event) {
    throw new Error('Submission not found or inaccessible.');
  }
  if (!isAdminReviewer && String(event.organizerId || '') !== String(organizerId || '')) {
    throw new Error('Submission not found or inaccessible.');
  }

  const previousStatus = submission.status;
  submission.reviewedAt = new Date();
  submission.reviewedBy = organizerId;
  submission.reviewNotes = String(reviewNotes || '').trim().slice(0, 1200);
  submission.rejectionReason = '';

  if (safeAction === 'approve') {
    submission.status = 'approved';
    // Manual approval is the trusted reviewer decision, so clear automated suspicion metadata.
    submission.suspiciousFlag = false;
    submission.suspiciousFlagReason = '';
  } else {
    const reason = String(rejectionReason || '').trim().slice(0, 500);
    if (!reason) {
      throw new Error('Rejection reason is required.');
    }
    submission.status = 'rejected';
    submission.rejectionReason = reason;
  }

  const hadCertificate = Boolean(submission.certificate?.url);
  await submission.save();
  recordCriticalAuditEventInBackground({
    actorMongoUserId: organizerId,
    action: safeAction === 'approve' ? 'submission.approved' : 'submission.rejected',
    targetType: 'submission',
    targetId: String(submission._id),
    statusFrom: previousStatus,
    statusTo: submission.status,
    notes: safeAction === 'approve'
      ? submission.reviewNotes
      : (submission.rejectionReason || submission.reviewNotes),
    occurredAt: submission.reviewedAt
  });
  if (safeAction === 'approve') {
    await attachCertificateIfNeeded(submission);
    evaluateSubmissionAchievementsSafe(submission, {
      performedBy: organizerId
    });
    if (!submission.isPersonalRecord) {
      refreshGlobalDistanceMilestonesSafe(submission.runnerId, {
        performedBy: organizerId
      });
    }
  }
  await sendRunnerReviewNotifications({
    submission,
    eventTitle: event.title || 'Event',
    action: safeAction,
    certificateWasIssued: !hadCertificate && Boolean(submission.certificate?.url)
  });
  return submission;
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
      .select('status distanceKm elapsedMs runDate runLocation runType proofType submittedAt reviewedAt reviewNotes rejectionReason certificate eventId registrationId isPersonalRecord')
      .lean(),
    AccumulatedActivitySubmission.find(recentFilter)
      .sort({ submittedAt: -1 })
      .limit(recentLimit)
      .populate({ path: 'eventId', select: 'title slug virtualCompletionMode targetDistanceKm raceCategories' })
      .populate({ path: 'registrationId', select: 'confirmationCode raceDistance' })
      .select('status distanceKm elapsedMs runDate runLocation runType proofType submittedAt reviewedAt reviewNotes rejectionReason certificate eventId registrationId')
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
      select: 'title slug status eventType eventTypesAllowed eventStartAt eventEndAt virtualWindow onsiteCheckinWindows venueName city country virtualCompletionMode raceCategories targetDistanceKm minimumActivityDistanceKm'
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
        virtualCompletionMode: registration.eventId?.virtualCompletionMode || '',
        submissionMode: registration.eventId?.virtualCompletionMode === 'accumulated_distance'
          ? 'accumulated'
          : 'standard',
        minimumRequiredDistanceKm: minimumDistanceKm,
        minimumActivityDistanceKm: Number(registration.eventId?.minimumActivityDistanceKm || 0) || null,
        venueName: registration.eventId?.venueName || '',
        city: registration.eventId?.city || '',
        country: registration.eventId?.country || '',
        existingSubmissionStatus: submission?.status || '',
        canResubmit: submission?.status === 'rejected'
      };
    });

  if (eligibleRegistrations.length > 0) {
    return eligibleRegistrations;
  }

  return [buildPersonalRecordEligibleOption()];
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
  stravaActivity
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
    stravaActivity
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

function buildSubmissionPayload(registration, input) {
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
  const mergedOcrData = {
    ...ocrData,
    ...integrity.comparisons
  };
  const suspiciousFlag = integrity.suspicious || minimumDistanceCheck.belowMinimum;

  return {
    registrationId: registration._id,
    eventId: registration.eventId,
    runnerId: registration.userId,
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

function sanitizeOptionalNumber(value, min, max) {
  if (value === undefined || value === null || value === '') return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < min || numeric > max) return null;
  return numeric;
}

function sanitizeOptionalDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function sanitizeOcrData(value) {
  if (!value || typeof value !== 'object') {
    return {
      extractedDistanceKm: null,
      extractedTimeMs: null,
      extractedElevationGain: null,
      extractedSteps: null,
      extractedRunDate: '',
      extractedRunLocation: '',
      extractedRunType: '',
      rawText: '',
      confidence: 0,
      distanceMismatch: false,
      timeMismatch: false,
      elevationMismatch: false,
      stepsMismatch: false,
      dateMismatch: false,
      locationMismatch: false,
      runTypeMismatch: false,
      detectedSource: '',
      extractedName: '',
      nameMatchStatus: 'not_checked',
      nameMismatchAcknowledged: false
    };
  }

  const distKm = Number(value.extractedDistanceKm);
  const timeMs = Number(value.extractedTimeMs);
  const elevationGain = Number(value.extractedElevationGain);
  const steps = Number(value.extractedSteps);
  const ALLOWED_SOURCES = new Set(['strava', 'nike', 'garmin', 'apple', 'google', 'unknown', '']);
  const ALLOWED_NAME_STATUSES = new Set(['matched', 'mismatched', 'not_detected', 'not_checked']);
  const ALLOWED_RUN_TYPES = new Set(['run', 'walk', 'hike', 'trail_run', '']);
  const rawSource = String(value.detectedSource || '').trim().toLowerCase();
  const rawNameStatus = String(value.nameMatchStatus || '').trim().toLowerCase();
  const rawRunType = String(value.extractedRunType || '').trim().toLowerCase();

  return {
    extractedDistanceKm: Number.isFinite(distKm) && distKm > 0 && distKm <= 1000 ? distKm : null,
    extractedTimeMs: Number.isFinite(timeMs) && timeMs > 0 && timeMs <= 7 * 24 * 60 * 60 * 1000 ? timeMs : null,
    extractedElevationGain: Number.isFinite(elevationGain) && elevationGain >= 0 && elevationGain <= 20000 ? Math.round(elevationGain) : null,
    extractedSteps: Number.isFinite(steps) && steps >= 0 && steps <= 200000 ? Math.round(steps) : null,
    extractedRunDate: sanitizeOcrDate(value.extractedRunDate),
    extractedRunLocation: String(value.extractedRunLocation || '').trim().slice(0, 200),
    extractedRunType: ALLOWED_RUN_TYPES.has(rawRunType) ? rawRunType : '',
    rawText: String(value.rawText || '').slice(0, 2000),
    confidence: (() => {
      const c = Number(value.confidence);
      return Number.isFinite(c) && c >= 0 && c <= 1 ? Math.round(c * 100) / 100 : 0;
    })(),
    distanceMismatch: Boolean(value.distanceMismatch),
    timeMismatch: Boolean(value.timeMismatch),
    elevationMismatch: Boolean(value.elevationMismatch),
    stepsMismatch: Boolean(value.stepsMismatch),
    dateMismatch: Boolean(value.dateMismatch),
    locationMismatch: Boolean(value.locationMismatch),
    runTypeMismatch: Boolean(value.runTypeMismatch),
    detectedSource: ALLOWED_SOURCES.has(rawSource) ? rawSource : '',
    extractedName: cleanOcrNameCandidate(value.extractedName).slice(0, 120),
    nameMatchStatus: ALLOWED_NAME_STATUSES.has(rawNameStatus) ? rawNameStatus : 'not_checked',
    nameMismatchAcknowledged: Boolean(value.nameMismatchAcknowledged)
  };
}

function sanitizeOcrDate(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return '';
  const date = new Date(`${raw}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? '' : raw;
}

function cleanOcrNameCandidate(value) {
  const name = String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[^A-Za-z]+/, '')
    .replace(/^\d+\s*[%.)\]-]*\s*/, '')
    .replace(/\s+[A-Za-z]?[%=_~^`|]+$/g, '')
    .replace(/[|\\/,;:!?.\s]+$/g, '')
    .replace(/^[^A-Za-z]+/, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!name || /\d/.test(name)) return '';
  if (/\b(?:km|mi|mile|miles|meter|meters|ft|feet|bpm|cal|kcal|min|sec|pace)\b/i.test(name)) return '';
  if (/\b(?:distance|moving\s+time|elapsed\s+time|elevation|calories|heart\s+rate|relative\s+effort|segments?|kudos|weather|humidity|wind|cadence|steps)\b/i.test(name)) return '';
  const letters = (name.match(/[A-Za-z]/g) || []).length;
  const visible = name.replace(/\s/g, '').length;
  if (!visible || letters / visible < 0.65) return '';
  return name;
}

function getStandardSubmissionMinimumDistanceKm(registration, event) {
  if (!registration || !event || event.virtualCompletionMode === 'accumulated_distance') {
    return null;
  }

  const categories = Array.isArray(event.raceCategories) ? event.raceCategories : [];
  const snapshot = registration.pricingSnapshot || {};
  const categoryId = String(snapshot.raceCategoryId || '').trim();
  if (categoryId) {
    const matchedCategory = categories.find((category) => String(category.categoryId || '').trim() === categoryId);
    const categoryDistance = normalizePositiveDistance(matchedCategory?.distanceKm);
    if (categoryDistance !== null) return categoryDistance;
  }

  const distanceLabel = String(snapshot.raceDistance || registration.raceDistance || '').trim();
  if (distanceLabel) {
    const matchedCategory = categories.find((category) => {
      const labels = [
        category.distanceLabel,
        category.name
      ].map((value) => String(value || '').trim().toLowerCase()).filter(Boolean);
      return labels.includes(distanceLabel.toLowerCase());
    });
    const categoryDistance = normalizePositiveDistance(matchedCategory?.distanceKm);
    if (categoryDistance !== null) return categoryDistance;

    const parsedDistance = parseDistanceLabelKm(distanceLabel);
    if (parsedDistance !== null) return parsedDistance;
  }

  return normalizePositiveDistance(event.targetDistanceKm);
}

function detectBelowMinimumStandardSubmissionDistance({
  submittedDistanceKm,
  ocrData,
  minimumRequiredDistanceKm
}) {
  const minimum = normalizePositiveDistance(minimumRequiredDistanceKm);
  if (minimum === null) {
    return {
      belowMinimum: false,
      detectedDistanceKm: null,
      minimumRequiredDistanceKm: null
    };
  }

  const ocrDistance = normalizePositiveDistance(ocrData?.extractedDistanceKm);
  const submittedDistance = normalizePositiveDistance(submittedDistanceKm);
  const detectedDistance = ocrDistance !== null ? ocrDistance : submittedDistance;
  const belowMinimum = detectedDistance !== null && detectedDistance < minimum;

  return {
    belowMinimum,
    detectedDistanceKm: detectedDistance,
    minimumRequiredDistanceKm: minimum
  };
}

function parseDistanceLabelKm(value) {
  const safe = String(value || '').trim().toLowerCase();
  if (!safe) return null;

  const kmMatch = safe.match(/(\d+(?:\.\d+)?)\s*(?:k|km|kilometer|kilometers|kilometre|kilometres)\b/);
  if (kmMatch) return normalizePositiveDistance(kmMatch[1]);

  const plainMatch = safe.match(/^(\d+(?:\.\d+)?)$/);
  if (plainMatch) return normalizePositiveDistance(plainMatch[1]);

  return null;
}

function normalizePositiveDistance(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0 || numeric > 500) return null;
  return Math.round(numeric * 100) / 100;
}

function formatDistanceForMessage(value) {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric)) return '0';
  return Number(numeric.toFixed(2)).toString();
}

function buildSubmissionValidationMetadata({
  input,
  registration,
  ocrData,
  suspiciousFlag,
  minimumDistanceCheck
}) {
  const method = normalizeValidationMethod(input?.source, ocrData);
  const submissionMode = registration?.isPersonalRecord ? 'personal_record' : 'one_time';
  const autoApprovalEligible = isAutoApprovablePayload({
    source: input?.source,
    stravaActivity: input?.stravaActivity,
    ocrData,
    suspiciousFlag
  });
  return {
    method,
    autoApprovalEligible,
    reviewRequired: !autoApprovalEligible,
    reviewReason: autoApprovalEligible
      ? ''
      : getSubmissionReviewReason({
        method,
        ocrData,
        suspiciousFlag,
        minimumDistanceCheck
      }),
    submissionMode,
    detectedDistanceKm: minimumDistanceCheck.detectedDistanceKm,
    minimumRequiredDistanceKm: minimumDistanceCheck.minimumRequiredDistanceKm
  };
}

function normalizeValidationMethod(source, ocrData) {
  const safeSource = String(source || '').trim().toLowerCase();
  if (safeSource === 'strava') return 'strava';
  const hasOcrSignals = Boolean(
    ocrData &&
    (
      Number(ocrData.confidence || 0) > 0 ||
      ocrData.extractedDistanceKm !== null ||
      ocrData.extractedTimeMs !== null ||
      String(ocrData.rawText || '').trim()
    )
  );
  return hasOcrSignals ? 'ocr' : 'manual_upload';
}

function getSubmissionReviewReason({
  method,
  ocrData,
  suspiciousFlag,
  minimumDistanceCheck
}) {
  if (minimumDistanceCheck?.belowMinimum) {
    return 'below_minimum_distance_one_time_submission';
  }
  if (suspiciousFlag) {
    return 'suspicious_activity';
  }
  if (method === 'strava') {
    return 'strava_auto_approval_criteria_not_met';
  }
  if (method !== 'ocr') {
    return `${method}_review_required`;
  }
  if (ocrData?.nameMatchStatus !== 'matched') {
    return 'ocr_name_not_matched';
  }
  if (!normalizePositiveDistance(ocrData?.extractedDistanceKm)) {
    return 'ocr_distance_missing';
  }
  if (!normalizePositiveNumber(ocrData?.extractedTimeMs)) {
    return 'ocr_time_missing';
  }
  if (Number(ocrData?.confidence || 0) < AUTO_APPROVAL_CONFIDENCE_THRESHOLD) {
    return 'ocr_confidence_below_threshold';
  }
  return 'ocr_auto_approval_criteria_not_met';
}

function isAutoApprovableOcrPayload({ ocrData, suspiciousFlag }) {
  const extractedDistanceKm = Number(ocrData?.extractedDistanceKm);
  const extractedTimeMs = Number(ocrData?.extractedTimeMs);
  return (
    ocrData?.nameMatchStatus === 'matched' &&
    Number.isFinite(extractedDistanceKm) &&
    extractedDistanceKm > 0 &&
    Number.isFinite(extractedTimeMs) &&
    extractedTimeMs > 0 &&
    !ocrData.distanceMismatch &&
    !ocrData.timeMismatch &&
    !ocrData.elevationMismatch &&
    !ocrData.stepsMismatch &&
    !ocrData.dateMismatch &&
    !ocrData.locationMismatch &&
    !ocrData.runTypeMismatch &&
    !suspiciousFlag &&
    Number(ocrData.confidence || 0) >= AUTO_APPROVAL_CONFIDENCE_THRESHOLD
  );
}

function isAutoApprovableSyncedPayload({ source, stravaActivity, suspiciousFlag }) {
  const safeSource = String(source || '').trim().toLowerCase();
  if (safeSource !== 'strava') return false;
  if (suspiciousFlag) return false;
  const activityId = Number(stravaActivity?.id || 0);
  const athleteId = Number(stravaActivity?.athleteId || 0);
  const distanceKm = Number(stravaActivity?.distanceKm || 0);
  const elapsedSeconds = Number(stravaActivity?.elapsedTimeSeconds || stravaActivity?.movingTimeSeconds || 0);
  return (
    Number.isFinite(activityId) &&
    activityId > 0 &&
    Number.isFinite(athleteId) &&
    athleteId > 0 &&
    Number.isFinite(distanceKm) &&
    distanceKm > 0 &&
    Number.isFinite(elapsedSeconds) &&
    elapsedSeconds > 0
  );
}

function isAutoApprovablePayload({ source, stravaActivity, ocrData, suspiciousFlag }) {
  if (isAutoApprovableSyncedPayload({ source, stravaActivity, suspiciousFlag })) {
    return true;
  }
  return isAutoApprovableOcrPayload({ ocrData, suspiciousFlag });
}

function normalizePositiveNumber(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  return numeric;
}

function isAutoApprovableOcrSubmission(submission) {
  if (!submission) return false;
  const ocrData = submission.ocrData || {};
  const extractedDistanceKm = Number(ocrData.extractedDistanceKm);
  const extractedTimeMs = Number(ocrData.extractedTimeMs);
  return (
    String(submission.status || '') === 'submitted' &&
    ocrData.nameMatchStatus === 'matched' &&
    Number.isFinite(extractedDistanceKm) &&
    extractedDistanceKm > 0 &&
    Number.isFinite(extractedTimeMs) &&
    extractedTimeMs > 0 &&
    !ocrData.distanceMismatch &&
    !ocrData.timeMismatch &&
    !ocrData.elevationMismatch &&
    !ocrData.stepsMismatch &&
    !ocrData.dateMismatch &&
    !ocrData.locationMismatch &&
    !ocrData.runTypeMismatch &&
    !submission.suspiciousFlag &&
    Number(ocrData.confidence || 0) >= AUTO_APPROVAL_CONFIDENCE_THRESHOLD
  );
}

function isAutoApprovableSubmission(submission) {
  if (!submission || String(submission.status || '') !== 'submitted') return false;
  return isAutoApprovablePayload({
    source: submission.source,
    stravaActivity: submission.stravaActivity,
    ocrData: submission.ocrData || {},
    suspiciousFlag: submission.suspiciousFlag
  });
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
    'certificate.url': { $exists: true, $ne: '' }
  })
    .sort({ 'certificate.issuedAt': -1, reviewedAt: -1, submittedAt: -1 })
    .limit(limit)
    .populate({ path: 'eventId', select: 'title slug' })
    .populate({ path: 'registrationId', select: 'confirmationCode raceDistance' })
    .select('eventId registrationId certificate reviewedAt submittedAt distanceKm elapsedMs raceDistance')
    .lean();
}

function formatRecentCertificate(item) {
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
    console.error('Submission certificate generation failed:', error.message);
  }
}

async function applyAutoApprovalIfEligible(submission) {
  if (!isAutoApprovableSubmission(submission)) {
    return submission;
  }

  const autoApprovalReviewNote = getAutoApprovalReviewNote(submission);
  const hadCertificate = Boolean(submission.certificate?.url);
  submission.status = 'approved';
  submission.reviewedAt = new Date();
  submission.reviewedBy = null;
  submission.reviewNotes = autoApprovalReviewNote;
  submission.rejectionReason = '';
  await submission.save();
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

  await attachCertificateIfNeeded(submission);
  evaluateSubmissionAchievementsSafe(submission, {
    performedBy: ''
  });
  if (!submission.isPersonalRecord) {
    refreshGlobalDistanceMilestonesSafe(submission.runnerId, {
      performedBy: ''
    });
  }
  const event = await Event.findById(submission.eventId).select('title').lean();
  await sendRunnerReviewNotifications({
    submission,
    eventTitle: event?.title || (submission.isPersonalRecord ? 'Personal Record' : 'Event'),
    action: 'approve',
    certificateWasIssued: !hadCertificate && Boolean(submission.certificate?.url)
  });

  return submission;
}

function getAutoApprovalReviewNote(submission = {}) {
  const source = String(submission.source || '').trim().toLowerCase();
  return source === 'strava' ? STRAVA_AUTO_APPROVAL_REVIEW_NOTE : AUTO_APPROVAL_REVIEW_NOTE;
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
      await communicationService.notify('result.approved', {
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
      });

      if (certificateWasIssued && submission.certificate?.url) {
        await communicationService.notify('certificate.issued', {
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
        });
      }
      return;
    }

    if (action === 'reject') {
      await communicationService.notify('result.rejected', {
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
      });
    }
  } catch (error) {
    console.error('Submission review notification lookup failed:', {
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
    console.error('Submission achievement hook failed:', {
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
    console.error('Global distance badge progress hook failed:', {
      mongoUserId: String(mongoUserId || ''),
      error: error.message
    });
  }
}

module.exports = {
  createSubmission,
  resubmitSubmission,
  reviewSubmission,
  getRunnerSubmissions,
  getEventSubmissionQueue,
  getRunnerSubmissionSummary,
  getRunnerPerformanceSnapshot,
  getRunnerEligibleSubmissionRegistrations,
  PERSONAL_RECORD_REGISTRATION_ID,
  detectSuspiciousActivity,
  isAutoApprovableOcrSubmission,
  isAutoApprovableSubmission,
  getAutoApprovalReviewNote,
  buildSubmissionPayload,
  getEligibleRunnerRegistration
};
