'use strict';

const Registration = require('../models/Registration');
const AccumulatedActivitySubmission = require('../models/AccumulatedActivitySubmission');
const { buildAccumulatedProgress } = require('./accumulated-activity.service');
const { resolveAccumulatedTargetDistanceKm, resolveAccumulatedTargetSteps } = require('./accumulated-target.service');
const {
  buildChallengeTimingDisplay,
  buildSubmissionTimingDisplay
} = require('./runner-data.service');
const { isAccumulatedChallenge, resolveChallengeConfig } = require('../utils/challenge-metrics');

async function getPublicEventRunnerState({ event, userId, now = new Date() }) {
  if (!event?._id || !userId || !isAccumulatedChallenge(event)) return null;

  const registration = await Registration.findOne({
    eventId: event._id,
    userId,
    status: { $nin: ['cancelled', 'refunded'] }
  })
    .sort({ registeredAt: -1, _id: -1 })
    .select('status paymentStatus paymentRejectionReason raceDistance participationMode pricingSnapshot confirmationCode registeredAt accumulatedCertificateFinalization')
    .lean();

  if (!registration) return null;

  const [activities, eventPendingActivityCount] = await Promise.all([
    AccumulatedActivitySubmission.find({ registrationId: registration._id })
      .sort({ submittedAt: -1, createdAt: -1, _id: -1 })
      .select('status distanceKm steps submittedAt reviewedAt certificate.url certificate.status certificate.revokedAt certificate.finalizedAt')
      .lean(),
    AccumulatedActivitySubmission.countDocuments({ eventId: event._id, status: 'submitted' })
  ]);

  return buildPublicEventRunnerState({ event, registration, activities, eventPendingActivityCount, now });
}

/**
 * "Already registered" summary for the public event page.
 *
 * Accumulated challenges get the richer progress card from getPublicEventRunnerState, so
 * this covers every OTHER event format, where the page had no registered state at all: a
 * runner who was already in still saw a live Register CTA and only learned about the
 * duplicate after opening the registration form.
 */
async function getPublicEventRegistrationSummary({ event, userId }) {
  if (!event?._id || !userId || isAccumulatedChallenge(event)) return null;

  const registration = await Registration.findOne({
    eventId: event._id,
    userId,
    status: { $nin: ['cancelled', 'refunded'] }
  })
    .sort({ registeredAt: -1, _id: -1 })
    .select('status paymentStatus raceDistance participationMode confirmationCode registeredAt')
    .lean();

  return buildPublicEventRegistrationSummary({ event, registration });
}

function buildPublicEventRegistrationSummary({ event = {}, registration = null } = {}) {
  if (!registration) return null;

  const status = String(registration.status || '').trim().toLowerCase();
  const paymentStatus = String(registration.paymentStatus || '').trim().toLowerCase();
  const isPaidEvent = String(event.feeMode || 'free').trim().toLowerCase() === 'paid';
  const settled = ['paid', 'refunded'].includes(paymentStatus);
  const awaitingPayment = isPaidEvent && !settled && status !== 'confirmed';
  const proofUnderReview = awaitingPayment && paymentStatus === 'proof_submitted';

  const raceDistance = String(registration.raceDistance || '').trim();
  const confirmationCode = String(registration.confirmationCode || '').trim();
  const placeLine = raceDistance
    ? `Your ${raceDistance} place is saved.`
    : 'Your place is saved.';

  let title = 'You are already registered';
  let message = placeLine;
  if (proofUnderReview) {
    title = 'Your registration is awaiting payment review';
    message = `${placeLine} The organizer is reviewing your payment proof.`;
  } else if (awaitingPayment) {
    title = 'Your registration needs payment';
    message = `${placeLine} Complete payment to confirm your place.`;
  }

  return {
    registrationId: String(registration._id || ''),
    confirmationCode,
    raceDistance,
    participationMode: String(registration.participationMode || '').trim(),
    awaitingPayment,
    proofUnderReview,
    ctaLabel: awaitingPayment ? 'Payment pending' : 'You are registered',
    title,
    message,
    actionLabel: awaitingPayment ? 'Complete Payment' : 'View My Registration',
    actionHref: '/my-registrations'
  };
}

function buildPublicEventRunnerState({ event = {}, registration = {}, activities = [], eventPendingActivityCount = 0, now = new Date() }) {
  const isAccumulated = isAccumulatedChallenge(event);
  if (!isAccumulated) return null;
  const challengeConfig = resolveChallengeConfig(event);
  const targetDistanceKm = isAccumulated
    ? resolveAccumulatedTargetDistanceKm(registration, event)
    : 0;
  const targetSteps = isAccumulated
    ? resolveAccumulatedTargetSteps(registration, event)
    : null;
  const effectivePrimaryMetric = targetDistanceKm > 0
    ? 'distance'
    : (targetSteps > 0 ? 'steps' : challengeConfig.primaryMetric);
  const progress = isAccumulated
    ? buildAccumulatedProgress({
        activities,
        targetDistanceKm,
        targetSteps,
        primaryMetric: effectivePrimaryMetric
      })
    : null;
  const challengeTiming = buildChallengeTimingDisplay(registration, event, now);
  const submissionTiming = buildSubmissionTimingDisplay(registration, event, now);
  const latestActivity = activities[0] || null;
  const registrationReady = ['confirmed', 'paid'].includes(String(registration.status || ''));
  const paymentReady = String(event.feeMode || 'free') !== 'paid' || String(registration.paymentStatus || '') === 'paid';
  const eventStartAt = parseDate(event.virtualWindow?.startAt || event.eventStartAt);
  const beforeActivityWindow = Boolean(eventStartAt && eventStartAt > now);
  const progressPercentage = progress?.primaryTarget > 0 ? roundOne(progress.progressPercent) : null;
  const progressMetrics = buildProgressMetrics(progress);
  const primaryMetricLabel = effectivePrimaryMetric === 'steps' ? 'steps' : 'distance';
  const pendingPrimaryValue = effectivePrimaryMetric === 'steps'
    ? Number(progress?.pendingSteps || 0)
    : Number(progress?.pendingDistanceKm || 0);
  const overPrimaryGoal = effectivePrimaryMetric === 'steps'
    ? Number(progress?.overGoalSteps || 0) > 0
    : Number(progress?.overGoalDistanceKm || 0) > 0;
  const remainingDistanceKm = progress?.targetDistanceKm > 0
    ? Math.max(0, roundTwo(progress.targetDistanceKm - Number(progress.approvedDistanceKm || 0)))
    : null;

  const base = {
    registrationId: String(registration._id || ''),
    confirmationCode: String(registration.confirmationCode || ''),
    selectedQuest: String(
      registration.pricingSnapshot?.raceCategoryName ||
      registration.pricingSnapshot?.raceDistance ||
      registration.raceDistance ||
      'Selected challenge'
    ),
    participationMode: String(registration.participationMode || ''),
    registrationStatus: String(registration.status || ''),
    paymentStatus: String(registration.paymentStatus || ''),
    isAccumulated,
    challengeMetrics: challengeConfig.metrics,
    primaryChallengeMetric: effectivePrimaryMetric,
    rankingOnly: Boolean(progress?.rankingOnly),
    challengeTiming,
    submissionTiming,
    targetDistanceKm,
    targetDistanceLabel: formatDistance(targetDistanceKm),
    approvedDistanceKm: Number(progress?.approvedDistanceKm || 0),
    approvedDistanceLabel: formatDistance(progress?.approvedDistanceKm || 0),
    pendingDistanceKm: Number(progress?.pendingDistanceKm || 0),
    pendingDistanceLabel: formatDistance(progress?.pendingDistanceKm || 0),
    targetSteps: progress?.targetSteps || null,
    approvedSteps: Number(progress?.approvedSteps || 0),
    approvedStepsLabel: Number(progress?.approvedSteps || 0).toLocaleString('en-US'),
    pendingSteps: Number(progress?.pendingSteps || 0),
    pendingStepsLabel: Number(progress?.pendingSteps || 0).toLocaleString('en-US'),
    primaryProgressLabel: progress?.progressLabel || '',
    potentialDistanceKm: Number(progress?.potentialDistanceKm || 0),
    potentialDistanceLabel: formatDistance(progress?.potentialDistanceKm || 0),
    potentialProgressLabel: progress?.targetDistanceKm > 0
      ? `${formatDistance(progress?.potentialDistanceKm || 0)} / ${formatDistance(progress.targetDistanceKm)}`
      : '',
    overGoalDistanceKm: Number(progress?.overGoalDistanceKm || 0),
    overGoalDistanceLabel: formatDistance(progress?.overGoalDistanceKm || 0),
    remainingDistanceKm,
    remainingDistanceLabel: remainingDistanceKm === null ? 'Goal not listed' : formatDistance(remainingDistanceKm),
    progressMetrics,
    overallProgressLabel: buildOverallProgressLabel(progressMetrics),
    progressPercentage,
    progressLabel: progressPercentage === null ? 'Ranking only — no completion goal' : `${formatNumber(progressPercentage)}% complete`,
    progressBarPercentage: progressPercentage === null ? 0 : Math.min(100, Math.max(0, progressPercentage)),
    approvedActivityCount: Number(progress?.approvedActivityCount || 0),
    pendingActivityCount: Number(progress?.pendingActivityCount || 0),
    totalActivityCount: Number(progress?.totalActivityCount || 0),
    completed: Boolean(progress?.completed),
    certificateState: String(registration.accumulatedCertificateFinalization?.state || ''),
    state: 'registered',
    stateLabel: 'Registration confirmed',
    helperText: 'Your registration is ready.',
    primaryAction: null,
    secondaryAction: { type: 'link', label: 'Registration details', href: '/my-registrations' }
  };

  if (!registrationReady || !paymentReady) {
    return {
      ...base,
      state: 'registration_not_ready',
      stateLabel: paymentReady ? 'Registration pending' : 'Payment needed',
      helperText: paymentReady
        ? 'Review your registration status before submitting activity.'
        : 'Complete the payment step before submitting activity.',
      primaryAction: { type: 'link', label: 'View registration', href: '/my-registrations' },
      secondaryAction: null
    };
  }

  if (progress?.completed) {
    const certificateActivity = activities.find((activity) =>
      activity.certificate?.url &&
      !['revoked', 'failed', 'pending'].includes(activity.certificate?.status) &&
      !activity.certificate?.revokedAt
    );
    if (!submissionTiming.closed) {
      return {
        ...base,
        state: 'goal_reached',
        stateLabel: overPrimaryGoal ? `Goal reached · extra ${primaryMetricLabel} verified` : 'Goal reached',
        helperText: progress.pendingActivityCount > 0
          ? `Your completion is verified. Pending ${primaryMetricLabel} remains separate until approval, and you can keep adding eligible activities before the deadline.`
          : 'Your completion is verified. You can keep adding eligible activities before the deadline; your certificate will use the final verified total.',
        primaryAction: { type: 'submit', label: 'Add activity', registrationId: String(registration._id || '') },
        secondaryAction: { type: 'link', label: 'View achievements', href: '/runner/achievements' }
      };
    }
    if (eventPendingActivityCount > 0 || registration.accumulatedCertificateFinalization?.state === 'waiting_reviews') {
      return {
        ...base,
        state: 'final_reviews',
        stateLabel: 'Final reviews in progress',
        helperText: 'The submission deadline has passed. Certificates will be finalized after every pending activity for this event is reviewed.',
        primaryAction: { type: 'link', label: 'View submissions', href: '/runner/submissions' },
        secondaryAction: { type: 'link', label: 'View achievements', href: '/runner/achievements' }
      };
    }
    return {
      ...base,
      state: 'completed',
      stateLabel: certificateActivity ? 'Certificate ready' : 'Certificate finalizing',
      helperText: certificateActivity
        ? 'Your final verified total is recorded and your certificate is ready.'
        : 'Final reviews are complete. Your certificate is being prepared.',
      primaryAction: certificateActivity
        ? { type: 'link', label: 'View achievement', href: `/runner/submissions/${String(certificateActivity._id)}` }
        : { type: 'link', label: 'View standings', href: `/events/${event.slug}/leaderboard` },
      secondaryAction: { type: 'link', label: 'View submissions', href: '/runner/submissions' }
    };
  }

  if (submissionTiming.closed) {
    if (progress?.pendingActivityCount > 0) {
      return {
        ...base,
        state: 'pending',
        stateLabel: 'Awaiting final review',
        helperText: 'The challenge and submission windows have ended. Pending activities remain under organizer review.',
        primaryAction: { type: 'link', label: 'View submissions', href: '/runner/submissions' },
        secondaryAction: null
      };
    }
    return {
      ...base,
      state: 'submission_closed',
      stateLabel: 'Challenge ended',
      helperText: 'The activity and final submission windows have ended. Your verified progress remains available as a record.',
      primaryAction: null,
      secondaryAction: { type: 'link', label: 'View submissions', href: '/runner/submissions' }
    };
  }

  if (beforeActivityWindow) {
    return {
      ...base,
      state: 'registered',
      stateLabel: 'Ready to begin',
      helperText: 'Activity submission opens when the official challenge window begins.',
      primaryAction: { type: 'link', label: 'View registration', href: '/my-registrations' },
      secondaryAction: null
    };
  }

  if (latestActivity?.status === 'rejected') {
    return {
      ...base,
      state: 'rejected',
      stateLabel: 'Latest activity needs attention',
      helperText: 'Review the organizer decision and submit corrected proof.',
      primaryAction: { type: 'resubmit', label: 'Fix submission', registrationId: String(registration._id || '') },
      secondaryAction: { type: 'link', label: 'View submissions', href: '/runner/submissions' }
    };
  }

  if (progress?.pendingActivityCount > 0) {
    return {
      ...base,
      state: 'pending',
      stateLabel: challengeTiming.closed ? 'Awaiting final review' : 'Activity under review',
      helperText: challengeTiming.closed
        ? 'The activity window has ended. Pending activities are awaiting organizer review.'
        : (progressMetrics.length > 1
            ? `Progress from ${progress.pendingActivityCount} pending activit${progress.pendingActivityCount === 1 ? 'y is' : 'ies are'} shown separately and does not count toward either verified goal yet.`
            : `Pending ${primaryMetricLabel} (${pendingPrimaryValue.toLocaleString('en-US')}) is shown separately and does not count toward verified progress yet.`),
      primaryAction: { type: 'link', label: 'View submissions', href: '/runner/submissions' },
      secondaryAction: challengeTiming.closed
        ? null
        : { type: 'submit', label: 'Add another activity', registrationId: String(registration._id || '') }
    };
  }

  if (challengeTiming.closed) {
    return {
      ...base,
      state: 'final_submission_open',
      stateLabel: 'Final submissions open',
      helperText: 'The activity window has ended. Submit eligible activity proof before the final deadline.',
      primaryAction: { type: 'submit', label: progress?.totalActivityCount > 0 ? 'Add final activity' : 'Submit activity', registrationId: String(registration._id || '') },
      secondaryAction: progress?.totalActivityCount > 0
        ? { type: 'link', label: 'View submissions', href: '/runner/submissions' }
        : { type: 'link', label: 'Registration details', href: '/my-registrations' }
    };
  }

  return {
    ...base,
    state: progress?.approvedActivityCount > 0 ? 'in_progress' : 'ready',
    stateLabel: progress?.rankingOnly
      ? (progress?.approvedActivityCount > 0 ? 'Official total recorded' : 'Ready to compete')
      : (progress?.approvedActivityCount > 0 ? 'Challenge in progress' : 'Ready to start'),
    helperText: progress?.approvedActivityCount > 0
      ? (progress?.rankingOnly
          ? `Keep adding eligible activities to improve your official ${primaryMetricLabel} ranking.`
          : 'Keep adding eligible activities until your verified total reaches the selected goal.')
      : 'Add your first eligible activity to begin verified progress.',
    primaryAction: { type: 'submit', label: 'Add activity', registrationId: String(registration._id || '') },
    secondaryAction: progress?.totalActivityCount > 0
      ? { type: 'link', label: 'View submissions', href: '/runner/submissions' }
      : { type: 'link', label: 'Registration details', href: '/my-registrations' }
  };
}

function buildProgressMetrics(progress = {}) {
  const metrics = [];
  const distanceTarget = Number(progress?.targetDistanceKm || 0);
  const stepsTarget = Number(progress?.targetSteps || 0);

  if (distanceTarget > 0) {
    metrics.push(buildProgressMetric({
      key: 'distance',
      label: 'Distance',
      approved: Number(progress.approvedDistanceKm || 0),
      pending: Number(progress.pendingDistanceKm || 0),
      target: distanceTarget,
      formatter: formatDistance
    }));
  }

  if (stepsTarget > 0) {
    metrics.push(buildProgressMetric({
      key: 'steps',
      label: 'Steps',
      approved: Number(progress.approvedSteps || 0),
      pending: Number(progress.pendingSteps || 0),
      target: stepsTarget,
      formatter: formatSteps
    }));
  }

  return metrics;
}

function buildProgressMetric({ key, label, approved, pending, target, formatter }) {
  const remaining = Math.max(0, target - approved);
  const overGoal = Math.max(0, approved - target);
  const potential = approved + pending;
  const progressPercentage = target > 0 ? roundOne((approved / target) * 100) : null;
  const complete = target > 0 && approved >= target;
  const approvedLabel = formatter(approved);
  const targetLabel = formatter(target);
  const pendingLabel = formatter(pending);
  const remainingLabel = formatter(remaining);
  const overGoalLabel = formatter(overGoal);

  return {
    key,
    label,
    approved,
    approvedLabel,
    pending,
    pendingLabel,
    target,
    targetLabel,
    remaining,
    remainingLabel,
    overGoal,
    overGoalLabel,
    potential,
    potentialLabel: formatter(potential),
    complete,
    progressPercentage,
    progressBarPercentage: progressPercentage === null ? 0 : Math.min(100, Math.max(0, progressPercentage)),
    progressLabel: progressPercentage === null ? 'Goal not listed' : `${formatNumber(progressPercentage)}% complete`,
    statusLabel: overGoal > 0 ? `${overGoalLabel} over goal` : (complete ? 'Goal reached' : `${remainingLabel} remaining`),
    ariaValueText: `${approvedLabel} of ${targetLabel}; ${progressPercentage === null ? 'goal not listed' : `${formatNumber(progressPercentage)}% complete`}`
  };
}

function buildOverallProgressLabel(progressMetrics = []) {
  if (!progressMetrics.length) return 'Ranking only — no completion goal';
  if (progressMetrics.length === 1) return progressMetrics[0].progressLabel;
  const completedCount = progressMetrics.filter((metric) => metric.complete).length;
  return `${completedCount} of ${progressMetrics.length} goals reached`;
}

function formatDistance(value) {
  const number = Number(value || 0);
  return `${formatNumber(number)} km`;
}

function formatSteps(value) {
  return `${Math.max(0, Math.round(Number(value || 0))).toLocaleString('en-US')} steps`;
}

function formatNumber(value) {
  const number = Number(value || 0);
  return number.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

function roundOne(value) {
  return Math.round(Number(value || 0) * 10) / 10;
}

function roundTwo(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

module.exports = {
  getPublicEventRunnerState,
  buildPublicEventRunnerState,
  getPublicEventRegistrationSummary,
  buildPublicEventRegistrationSummary
};
