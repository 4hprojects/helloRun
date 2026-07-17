'use strict';

const Event = require('../models/Event');
const Registration = require('../models/Registration');
const User = require('../models/User');
const AccumulatedActivitySubmission = require('../models/AccumulatedActivitySubmission');
const { buildAccumulatedProgress } = require('./accumulated-activity.service');
const { resolveAccumulatedTargetDistanceKm } = require('./accumulated-target.service');
const { issueSubmissionCertificate } = require('./certificate.service');
const uploadService = require('./upload.service');
const { syncSubmissionShadow } = require('./submission-shadow.service');
const communicationService = require('./communication.service');
const { recordCriticalAuditEventInBackground } = require('./critical-audit.service');
const logger = require('../utils/logger');

const LOCK_TIMEOUT_MS = 15 * 60 * 1000;

function resolveAccumulatedCertificateDeadline(event = {}) {
  return parseDate(
    event.finalSubmissionDeadlineAt ||
    event.virtualWindow?.endAt ||
    event.eventEndAt
  );
}

function isAccumulatedCertificateFinalizationDue(event, now = new Date()) {
  const deadline = resolveAccumulatedCertificateDeadline(event);
  return Boolean(
    event?.virtualCompletionMode === 'accumulated_distance' &&
    deadline &&
    now.getTime() > deadline.getTime()
  );
}

async function finalizeDueAccumulatedCertificates(options = {}) {
  const now = options.now instanceof Date ? options.now : new Date();
  const events = await findDueEvents(now, options.eventLimit || 50);
  const summary = { eventsChecked: events.length, blockedByReviews: 0, issued: 0, skipped: 0, failed: 0 };

  for (const event of events) {
    const pendingCount = await AccumulatedActivitySubmission.countDocuments({
      eventId: event._id,
      status: 'submitted'
    });
    if (pendingCount > 0) {
      summary.blockedByReviews += 1;
      await Registration.updateMany(
        {
          eventId: event._id,
          status: 'confirmed',
          paymentStatus: 'paid',
          'accumulatedCertificateFinalization.state': { $ne: 'generated' }
        },
        { $set: { 'accumulatedCertificateFinalization.state': 'waiting_reviews' } }
      );
      continue;
    }

    const registrations = await Registration.find({
      eventId: event._id,
      status: 'confirmed',
      paymentStatus: 'paid'
    }).limit(Math.max(1, Math.min(1000, Number(options.registrationLimit || 500))));

    for (const registration of registrations) {
      try {
        const result = await finalizeRegistrationCertificate({ registration, event, now });
        summary[result] += 1;
      } catch (error) {
        summary.failed += 1;
        logger.error('[accumulated-certificate] Registration finalization failed:', {
          eventId: String(event._id),
          registrationId: String(registration._id),
          error: error.message
        });
      }
    }
  }

  return summary;
}

async function finalizeRegistrationCertificate({ registration, event, now = new Date() }) {
  if (!isAccumulatedCertificateFinalizationDue(event, now)) return 'skipped';

  const activities = await AccumulatedActivitySubmission.find({ registrationId: registration._id })
    .sort({ reviewedAt: 1, submittedAt: 1, createdAt: 1, _id: 1 });
  const targetDistanceKm = resolveAccumulatedTargetDistanceKm(registration, event);
  const progress = buildAccumulatedProgress({ activities, targetDistanceKm });
  if (!progress.completed) return 'skipped';

  const existingCertificateActivity = activities.find((activity) => activity.certificate?.certificateNumber);
  const existingSnapshotMatches = Boolean(
    existingCertificateActivity?.certificate?.finalizedAt &&
    ['generated', 'regenerated'].includes(existingCertificateActivity.certificate.status) &&
    Number(existingCertificateActivity.certificate.goalDistanceKm || 0) === Number(progress.targetDistanceKm || 0) &&
    Number(existingCertificateActivity.certificate.verifiedDistanceKm || 0) === Number(progress.approvedDistanceKm || 0) &&
    Number(existingCertificateActivity.certificate.approvedActivityCount || 0) === Number(progress.approvedActivityCount || 0)
  );
  if (existingSnapshotMatches) {
    await markRegistrationGenerated(registration._id, existingCertificateActivity, now);
    return 'skipped';
  }

  const certificateActivity = existingCertificateActivity || findThresholdCrossingActivity(activities, targetDistanceKm);
  if (!certificateActivity) return 'skipped';

  if (registration.accumulatedCertificateFinalization?.state === 'generated') {
    await Registration.updateOne(
      { _id: registration._id, 'accumulatedCertificateFinalization.state': 'generated' },
      { $set: { 'accumulatedCertificateFinalization.state': '' } }
    );
  }

  const staleBefore = new Date(now.getTime() - LOCK_TIMEOUT_MS);
  const locked = await Registration.findOneAndUpdate(
    {
      _id: registration._id,
      $or: [
        { 'accumulatedCertificateFinalization.state': { $nin: ['generating', 'generated'] } },
        { 'accumulatedCertificateFinalization.state': { $exists: false } },
        {
          'accumulatedCertificateFinalization.state': 'generating',
          'accumulatedCertificateFinalization.lockedAt': { $lte: staleBefore }
        }
      ]
    },
    {
      $set: {
        'accumulatedCertificateFinalization.state': 'generating',
        'accumulatedCertificateFinalization.activityId': certificateActivity._id,
        'accumulatedCertificateFinalization.certificateNumber': certificateActivity.certificate?.certificateNumber || '',
        'accumulatedCertificateFinalization.lockedAt': now,
        'accumulatedCertificateFinalization.lastAttemptAt': now,
        'accumulatedCertificateFinalization.error': ''
      }
    },
    { new: true }
  );
  if (!locked) return 'skipped';

  const runner = await User.findById(registration.userId).select('firstName lastName email').lean();
  if (!runner) {
    await markRegistrationFailed(registration._id, 'Runner not found.', now);
    return 'failed';
  }

  const priorNumber = String(certificateActivity.certificate?.certificateNumber || '').trim();
  const wasRevoked = certificateActivity.certificate?.status === 'revoked' || Boolean(certificateActivity.certificate?.revokedAt);
  try {
    const certificate = await issueSubmissionCertificate({
      submission: certificateActivity,
      registration,
      event,
      runner,
      certificateNumber: priorNumber,
      accumulatedSnapshot: {
        goalDistanceKm: progress.targetDistanceKm,
        verifiedDistanceKm: progress.approvedDistanceKm,
        approvedActivityCount: progress.approvedActivityCount,
        finalizedAt: now
      }
    });

    certificateActivity.certificate = {
      url: certificate.url || '',
      key: certificate.key || '',
      issuedAt: certificate.issuedAt || now,
      certificateNumber: certificate.certificateNumber || priorNumber,
      verificationUrl: certificate.verificationUrl || '',
      templateId: certificate.templateId || null,
      status: wasRevoked || priorNumber ? 'regenerated' : (certificate.status || 'generated'),
      revokedAt: null,
      regeneratedAt: wasRevoked || priorNumber ? now : null,
      generationError: '',
      goalDistanceKm: progress.targetDistanceKm,
      verifiedDistanceKm: progress.approvedDistanceKm,
      approvedActivityCount: progress.approvedActivityCount,
      finalizedAt: now
    };
    await certificateActivity.save();
    await markRegistrationGenerated(registration._id, certificateActivity, now);
    await syncSubmissionShadow(certificateActivity, { operation: 'live_sync' }).catch((error) => {
      logger.error('[accumulated-certificate] Shadow sync failed:', {
        activityId: String(certificateActivity._id),
        error: error.message
      });
    });
    recordCriticalAuditEventInBackground({
      actorMongoUserId: '',
      action: wasRevoked || priorNumber ? 'certificate.regenerated' : 'certificate.issued',
      targetType: 'accumulated_activity_certificate',
      targetId: String(certificateActivity._id),
      statusFrom: wasRevoked ? 'revoked' : '',
      statusTo: 'issued',
      notes: `Finalized accumulated certificate at ${progress.approvedDistanceKm} km for a ${progress.targetDistanceKm} km goal.`,
      occurredAt: now
    });
    await notifyCertificateReady({ runner, registration, event, certificateActivity }).catch((error) => {
      logger.error('[accumulated-certificate] Certificate notification failed:', {
        activityId: String(certificateActivity._id),
        error: error.message
      });
    });
    return 'issued';
  } catch (error) {
    certificateActivity.certificate.generationError = String(error.message || error).slice(0, 1000);
    if (!wasRevoked) certificateActivity.certificate.status = 'failed';
    await certificateActivity.save().catch(() => {});
    await markRegistrationFailed(registration._id, error.message, now);
    throw error;
  }
}

async function reconcilePrematureAccumulatedCertificates(options = {}) {
  const now = options.now instanceof Date ? options.now : new Date();
  const records = await AccumulatedActivitySubmission.find({
    'certificate.certificateNumber': { $ne: '' },
    'certificate.finalizedAt': null
  }).limit(Math.max(1, Math.min(2000, Number(options.limit || 500))));
  const summary = { checked: records.length, revoked: 0, skipped: 0 };

  for (const activity of records) {
    const event = await Event.findById(activity.eventId).lean();
    if (!event || event.virtualCompletionMode !== 'accumulated_distance') {
      summary.skipped += 1;
      continue;
    }
    if (activity.certificate.status !== 'revoked' || !activity.certificate.revokedAt) {
      const obsoleteKey = String(activity.certificate.key || '').trim();
      activity.certificate.status = 'revoked';
      activity.certificate.revokedAt = now;
      activity.certificate.generationError = 'Awaiting accumulated challenge finalization.';
      await activity.save();
      if (obsoleteKey && obsoleteKey !== 'inline') {
        await uploadService.deleteObjects([obsoleteKey]).catch((error) => {
          logger.warn('[accumulated-certificate] Could not remove revoked certificate object:', {
            activityId: String(activity._id),
            error: error.message
          });
        });
      }
      await syncSubmissionShadow(activity, { operation: 'live_sync' }).catch(() => {});
      recordCriticalAuditEventInBackground({
        actorMongoUserId: '',
        action: 'certificate.revoked',
        targetType: 'accumulated_activity_certificate',
        targetId: String(activity._id),
        statusFrom: 'generated',
        statusTo: 'revoked',
        notes: 'Premature accumulated certificate revoked pending deadline and final review completion.',
        occurredAt: now
      });
      summary.revoked += 1;
    }

    const pendingCount = await AccumulatedActivitySubmission.countDocuments({ eventId: event._id, status: 'submitted' });
    const state = isAccumulatedCertificateFinalizationDue(event, now)
      ? (pendingCount > 0 ? 'waiting_reviews' : '')
      : 'waiting_deadline';
    await Registration.updateOne(
      { _id: activity.registrationId },
      {
        $set: {
          'accumulatedCertificateFinalization.state': state,
          'accumulatedCertificateFinalization.activityId': activity._id,
          'accumulatedCertificateFinalization.certificateNumber': activity.certificate.certificateNumber,
          'accumulatedCertificateFinalization.lockedAt': null,
          'accumulatedCertificateFinalization.finalizedAt': null
        }
      }
    );
  }
  return summary;
}

function findThresholdCrossingActivity(activities, targetDistanceKm) {
  let total = 0;
  for (const activity of activities) {
    if (activity.status !== 'approved') continue;
    total += Number(activity.distanceKm || 0);
    if (total >= targetDistanceKm) return activity;
  }
  return null;
}

async function markRegistrationGenerated(registrationId, activity, now) {
  return Registration.updateOne(
    { _id: registrationId },
    {
      $set: {
        'accumulatedCertificateFinalization.state': 'generated',
        'accumulatedCertificateFinalization.activityId': activity._id,
        'accumulatedCertificateFinalization.certificateNumber': activity.certificate?.certificateNumber || '',
        'accumulatedCertificateFinalization.lockedAt': null,
        'accumulatedCertificateFinalization.finalizedAt': activity.certificate?.finalizedAt || now,
        'accumulatedCertificateFinalization.error': ''
      }
    }
  );
}

async function markRegistrationFailed(registrationId, message, now) {
  return Registration.updateOne(
    { _id: registrationId },
    {
      $set: {
        'accumulatedCertificateFinalization.state': 'failed',
        'accumulatedCertificateFinalization.lockedAt': null,
        'accumulatedCertificateFinalization.lastAttemptAt': now,
        'accumulatedCertificateFinalization.error': String(message || 'Certificate generation failed.').slice(0, 1000)
      }
    }
  );
}

async function notifyCertificateReady({ runner, registration, event, certificateActivity }) {
  return communicationService.notify('certificate.issued', {
    notification: {
      userId: runner._id,
      type: 'certificate_issued',
      title: 'Certificate Available',
      message: `Your final certificate for ${event.title || 'your challenge'} is now available.`,
      href: `/runner/submissions/${String(certificateActivity._id)}`,
      metadata: {
        activityId: String(certificateActivity._id),
        registrationId: String(registration._id),
        eventId: String(event._id),
        eventTitle: event.title || ''
      }
    },
    email: runner.email ? {
      to: runner.email,
      firstName: runner.firstName || 'Runner',
      eventTitle: event.title || 'Challenge',
      confirmationCode: registration.confirmationCode || '',
      certificateUrl: certificateActivity.certificate?.url || '',
      recipientUserId: runner._id,
      metadata: { registrationId: String(registration._id), eventId: String(event._id) }
    } : null
  });
}

async function findDueEvents(now, limit) {
  const candidates = await Event.find({
    virtualCompletionMode: 'accumulated_distance',
    digitalCertificateEnabled: { $ne: false },
    status: 'published',
    isDeleted: { $ne: true },
    $or: [
      { finalSubmissionDeadlineAt: { $lte: now } },
      { finalSubmissionDeadlineAt: null, 'virtualWindow.endAt': { $lte: now } },
      { finalSubmissionDeadlineAt: null, 'virtualWindow.endAt': null, eventEndAt: { $lte: now } }
    ]
  }).sort({ finalSubmissionDeadlineAt: 1, eventEndAt: 1 }).limit(Math.max(1, Math.min(200, Number(limit || 50))));
  return candidates.filter((event) => isAccumulatedCertificateFinalizationDue(event, now));
}

function parseDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

module.exports = {
  resolveAccumulatedCertificateDeadline,
  isAccumulatedCertificateFinalizationDue,
  finalizeDueAccumulatedCertificates,
  finalizeRegistrationCertificate,
  reconcilePrematureAccumulatedCertificates,
  findThresholdCrossingActivity
};
