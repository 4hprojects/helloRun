const mongoose = require('mongoose');
const Submission = require('../models/Submission');
const Registration = require('../models/Registration');
const Event = require('../models/Event');
const User = require('../models/User');
const { issueSubmissionCertificate } = require('./certificate.service');
const emailService = require('./email.service');
const { createNotificationSafe } = require('./notification.service');

const REVIEWABLE_STATUS = new Set(['submitted']);
const FINAL_STATUSES = new Set(['approved']);

async function createSubmission({
  registrationId,
  runnerId,
  distanceKm,
  elapsedMs,
  proofType,
  proof,
  proofNotes
}) {
  const registration = await getEligibleRunnerRegistration({ registrationId, runnerId });
  const existing = await Submission.findOne({ registrationId: registration._id }).select('status').lean();
  if (existing) {
    if (existing.status === 'rejected') {
      throw new Error('Submission was rejected. Use resubmit flow.');
    }
    throw new Error('Submission already exists for this registration.');
  }

  return Submission.create(buildSubmissionPayload(registration, {
    distanceKm,
    elapsedMs,
    proofType,
    proof,
    proofNotes,
    submissionCount: 1
  }));
}

async function resubmitSubmission({
  registrationId,
  runnerId,
  distanceKm,
  elapsedMs,
  proofType,
  proof,
  proofNotes
}) {
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
    proofType,
    proof,
    proofNotes,
    submissionCount: Number(existing.submissionCount || 1) + 1
  });

  existing.distanceKm = payload.distanceKm;
  existing.elapsedMs = payload.elapsedMs;
  existing.proofType = payload.proofType;
  existing.proof = payload.proof;
  existing.proofNotes = payload.proofNotes;
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
    issuedAt: null
  };
  await existing.save();
  return existing;
}

async function reviewSubmission({
  submissionId,
  organizerId,
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
  if (!REVIEWABLE_STATUS.has(submission.status)) {
    throw new Error('Only submitted results can be reviewed.');
  }

  const event = await Event.findById(submission.eventId).select('organizerId title').lean();
  if (!event || String(event.organizerId || '') !== String(organizerId || '')) {
    throw new Error('Submission not found or inaccessible.');
  }

  submission.reviewedAt = new Date();
  submission.reviewedBy = organizerId;
  submission.reviewNotes = String(reviewNotes || '').trim().slice(0, 1200);
  submission.rejectionReason = '';

  if (safeAction === 'approve') {
    submission.status = 'approved';
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
  if (safeAction === 'approve') {
    await attachCertificateIfNeeded(submission);
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
  const [total, submitted, approved, rejected, certificates, recentCertificatesRaw] = await Promise.all([
    Submission.countDocuments({ runnerId }),
    Submission.countDocuments({ runnerId, status: 'submitted' }),
    Submission.countDocuments({ runnerId, status: 'approved' }),
    Submission.countDocuments({ runnerId, status: 'rejected' }),
    Submission.countDocuments({
      runnerId,
      status: 'approved',
      'certificate.url': { $exists: true, $ne: '' }
    }),
    Submission.find({
      runnerId,
      status: 'approved',
      'certificate.url': { $exists: true, $ne: '' }
    })
      .sort({ 'certificate.issuedAt': -1, reviewedAt: -1, submittedAt: -1 })
      .limit(certificateLimit)
      .populate({ path: 'eventId', select: 'title slug' })
      .populate({ path: 'registrationId', select: 'confirmationCode' })
      .select('eventId registrationId certificate reviewedAt submittedAt')
      .lean()
  ]);

  return {
    counts: { total, submitted, approved, rejected, certificates },
    recentCertificates: recentCertificatesRaw.map((item) => ({
      submissionId: String(item._id),
      eventTitle: item.eventId?.title || 'Event unavailable',
      eventSlug: item.eventId?.slug || '',
      confirmationCode: item.registrationId?.confirmationCode || '',
      certificateUrl: item.certificate?.url || '',
      issuedAt: item.certificate?.issuedAt || item.reviewedAt || item.submittedAt || null
    }))
  };
}

async function getRunnerPerformanceSnapshot(runnerId, options = {}) {
  const recentLimit = clampInt(options.recentLimit, 1, 20, 8);
  const resultStatus = normalizeResultStatus(options.resultStatus);
  const recentFilter = { runnerId };
  if (resultStatus) {
    recentFilter.status = resultStatus;
  }

  const [summary, recentSubmissionsRaw, approvedAggregate, personalBestRaw, activitySource] = await Promise.all([
    getRunnerSubmissionSummary(runnerId, { certificateLimit: 5 }),
    Submission.find(recentFilter)
      .sort({ submittedAt: -1 })
      .limit(recentLimit)
      .populate({ path: 'eventId', select: 'title slug' })
      .populate({ path: 'registrationId', select: 'confirmationCode' })
      .select('status distanceKm elapsedMs proofType submittedAt reviewedAt reviewNotes rejectionReason certificate eventId registrationId')
      .lean(),
    Submission.aggregate([
      { $match: { runnerId: new mongoose.Types.ObjectId(String(runnerId)), status: 'approved' } },
      {
        $group: {
          _id: null,
          totalDistanceKm: { $sum: '$distanceKm' },
          completedEventIds: { $addToSet: '$eventId' }
        }
      }
    ]),
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
      .lean()
  ]);

  const aggregateRow = approvedAggregate[0] || {};
  const totalDistanceKm = Number(aggregateRow.totalDistanceKm || 0);
  const completedEvents = Array.isArray(aggregateRow.completedEventIds) ? aggregateRow.completedEventIds.length : 0;

  return {
    counts: summary.counts,
    metrics: {
      totalDistanceKm: Number(totalDistanceKm.toFixed(2)),
      completedEvents,
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
      status: item.status,
      distanceKm: Number(item.distanceKm || 0),
      elapsedMs: Number(item.elapsedMs || 0),
      elapsedLabel: formatElapsedMs(item.elapsedMs),
      proofType: item.proofType || 'manual',
      eventTitle: item.eventId?.title || 'Event unavailable',
      eventSlug: item.eventId?.slug || '',
      confirmationCode: item.registrationId?.confirmationCode || '',
      submittedAt: item.submittedAt || null,
      reviewedAt: item.reviewedAt || null,
      rejectionReason: item.rejectionReason || '',
      certificateUrl: item.certificate?.url || ''
    })),
    recentActivity: buildRunnerSubmissionActivity(activitySource)
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
  if (registration.paymentStatus !== 'paid') {
    throw new Error('Result submission requires a paid registration.');
  }
  if (registration.status === 'cancelled' || registration.status === 'refunded') {
    throw new Error('Cannot submit results for cancelled or refunded registrations.');
  }
  return registration;
}

function buildSubmissionPayload(registration, input) {
  const safeDistance = sanitizeNumber(input.distanceKm, 0.1, 500, 'Distance is invalid.');
  const safeElapsedMs = sanitizeNumber(input.elapsedMs, 1, 7 * 24 * 60 * 60 * 1000, 'Elapsed time is invalid.');

  return {
    registrationId: registration._id,
    eventId: registration.eventId,
    runnerId: registration.userId,
    participationMode: registration.participationMode || 'virtual',
    raceDistance: String(registration.raceDistance || '').trim(),
    distanceKm: safeDistance,
    elapsedMs: safeElapsedMs,
    proofType: sanitizeProofType(input.proofType),
    proof: sanitizeProof(input.proof),
    proofNotes: String(input.proofNotes || '').trim().slice(0, 1200),
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

function sanitizeProof(value) {
  if (!value || typeof value !== 'object') {
    throw new Error('Result proof is required.');
  }
  const url = String(value.url || '').trim();
  if (!url) {
    throw new Error('Result proof URL is required.');
  }
  return {
    url: url.slice(0, 2000),
    key: String(value.key || '').trim().slice(0, 400),
    mimeType: String(value.mimeType || '').trim().slice(0, 120),
    size: sanitizeNumber(value.size || 0, 0, 20 * 1024 * 1024, 'Proof size is invalid.')
  };
}

function sanitizeNumber(value, min, max, errorMessage) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < min || numeric > max) {
    throw new Error(errorMessage);
  }
  return numeric;
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

  try {
    const [registration, event, runner] = await Promise.all([
      Registration.findById(submission.registrationId).select('confirmationCode raceDistance').lean(),
      Event.findById(submission.eventId).select('title').lean(),
      User.findById(submission.runnerId).select('firstName lastName').lean()
    ]);
    if (!registration || !event || !runner) return;

    const certificate = await issueSubmissionCertificate({
      submission,
      registration,
      event,
      runner
    });
    submission.certificate = {
      url: certificate.url || '',
      key: certificate.key || '',
      issuedAt: certificate.issuedAt || new Date()
    };
    await submission.save();
  } catch (error) {
    // Certificate generation should not block review completion.
    console.error('Submission certificate generation failed:', error.message);
  }
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

    if (!runner?.email) return;
    const runnerEmail = runner.email;
    const runnerFirstName = runner.firstName || 'Runner';
    const confirmationCode = registration?.confirmationCode || '';

    if (action === 'approve') {
      await createNotificationSafe(
        {
          userId: submission.runnerId,
          type: 'result_approved',
          title: 'Result Approved',
          message: `Your result for ${eventTitle} has been approved.`,
          href: '/my-registrations',
          metadata: {
            submissionId: String(submission._id),
            registrationId: String(submission.registrationId || ''),
            eventTitle
          }
        },
        'result approved notification'
      );

      try {
        await emailService.sendResultApprovedEmailToRunner(
          runnerEmail,
          runnerFirstName,
          eventTitle,
          confirmationCode,
          formatElapsedMs(submission.elapsedMs)
        );
      } catch (error) {
        console.error('Result approved email failed:', {
          error: error.message,
          submissionId: String(submission._id)
        });
      }

      if (certificateWasIssued && submission.certificate?.url) {
        await createNotificationSafe(
          {
            userId: submission.runnerId,
            type: 'certificate_issued',
            title: 'Certificate Ready',
            message: `Your certificate for ${eventTitle} is now available.`,
            href: `/my-submissions/${String(submission._id)}/certificate`,
            metadata: {
              submissionId: String(submission._id),
              registrationId: String(submission.registrationId || ''),
              eventTitle
            }
          },
          'certificate issued notification'
        );

        try {
          await emailService.sendCertificateIssuedEmailToRunner(
            runnerEmail,
            runnerFirstName,
            eventTitle,
            confirmationCode,
            submission.certificate.url
          );
        } catch (error) {
          console.error('Certificate issued email failed:', {
            error: error.message,
            submissionId: String(submission._id)
          });
        }
      }
      return;
    }

    if (action === 'reject') {
      await createNotificationSafe(
        {
          userId: submission.runnerId,
          type: 'result_rejected',
          title: 'Result Needs Update',
          message: `Your result for ${eventTitle} was rejected. Review feedback and resubmit.`,
          href: '/my-registrations',
          metadata: {
            submissionId: String(submission._id),
            registrationId: String(submission.registrationId || ''),
            eventTitle
          }
        },
        'result rejected notification'
      );

      try {
        await emailService.sendResultRejectedEmailToRunner(
          runnerEmail,
          runnerFirstName,
          eventTitle,
          confirmationCode,
          submission.rejectionReason || '',
          submission.reviewNotes || ''
        );
      } catch (error) {
        console.error('Result rejected email failed:', {
          error: error.message,
          submissionId: String(submission._id)
        });
      }
    }
  } catch (error) {
    console.error('Submission review notification lookup failed:', {
      error: error.message,
      submissionId: String(submission?._id || '')
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
  getRunnerPerformanceSnapshot
};
