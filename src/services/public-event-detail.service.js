'use strict';

const Registration = require('../models/Registration');
const AccumulatedActivitySubmission = require('../models/AccumulatedActivitySubmission');
const { buildAccumulatedProgress } = require('./accumulated-activity.service');
const { resolveAccumulatedTargetDistanceKm } = require('./accumulated-target.service');
const {
  buildChallengeTimingDisplay,
  buildSubmissionTimingDisplay
} = require('./runner-data.service');

async function getPublicEventRunnerState({ event, userId, now = new Date() }) {
  if (!event?._id || !userId || event.virtualCompletionMode !== 'accumulated_distance') return null;

  const registration = await Registration.findOne({
    eventId: event._id,
    userId,
    status: { $nin: ['cancelled', 'refunded'] }
  })
    .sort({ registeredAt: -1, _id: -1 })
    .select('status paymentStatus paymentRejectionReason raceDistance participationMode pricingSnapshot confirmationCode registeredAt')
    .lean();

  if (!registration) return null;

  const activities = event.virtualCompletionMode === 'accumulated_distance'
    ? await AccumulatedActivitySubmission.find({ registrationId: registration._id })
      .sort({ submittedAt: -1, createdAt: -1, _id: -1 })
      .select('status distanceKm submittedAt reviewedAt certificate.url certificate.status')
      .lean()
    : [];

  return buildPublicEventRunnerState({ event, registration, activities, now });
}

function buildPublicEventRunnerState({ event = {}, registration = {}, activities = [], now = new Date() }) {
  const isAccumulated = event.virtualCompletionMode === 'accumulated_distance';
  if (!isAccumulated) return null;
  const targetDistanceKm = isAccumulated
    ? resolveAccumulatedTargetDistanceKm(registration, event)
    : 0;
  const progress = isAccumulated
    ? buildAccumulatedProgress({ activities, targetDistanceKm })
    : null;
  const challengeTiming = buildChallengeTimingDisplay(registration, event, now);
  const submissionTiming = buildSubmissionTimingDisplay(registration, event, now);
  const latestActivity = activities[0] || null;
  const registrationReady = ['confirmed', 'paid'].includes(String(registration.status || ''));
  const paymentReady = String(event.feeMode || 'free') !== 'paid' || String(registration.paymentStatus || '') === 'paid';
  const eventStartAt = parseDate(event.virtualWindow?.startAt || event.eventStartAt);
  const beforeActivityWindow = Boolean(eventStartAt && eventStartAt > now);
  const progressPercentage = progress?.targetDistanceKm > 0
    ? roundOne((Number(progress.approvedDistanceKm || 0) / progress.targetDistanceKm) * 100)
    : null;
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
    challengeTiming,
    submissionTiming,
    targetDistanceKm,
    targetDistanceLabel: formatDistance(targetDistanceKm),
    approvedDistanceKm: Number(progress?.approvedDistanceKm || 0),
    approvedDistanceLabel: formatDistance(progress?.approvedDistanceKm || 0),
    pendingDistanceKm: Number(progress?.pendingDistanceKm || 0),
    pendingDistanceLabel: formatDistance(progress?.pendingDistanceKm || 0),
    remainingDistanceKm,
    remainingDistanceLabel: remainingDistanceKm === null ? 'Goal not listed' : formatDistance(remainingDistanceKm),
    progressPercentage,
    progressLabel: progressPercentage === null ? 'Progress unavailable' : `${formatNumber(progressPercentage)}% complete`,
    progressBarPercentage: progressPercentage === null ? 0 : Math.min(100, Math.max(0, progressPercentage)),
    approvedActivityCount: Number(progress?.approvedActivityCount || 0),
    pendingActivityCount: Number(progress?.pendingActivityCount || 0),
    totalActivityCount: Number(progress?.totalActivityCount || 0),
    completed: Boolean(progress?.completed),
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
    const certificateActivity = activities.find((activity) => activity.certificate?.url);
    return {
      ...base,
      state: 'completed',
      stateLabel: 'Goal completed',
      helperText: 'Your verified activities reached this challenge goal.',
      primaryAction: certificateActivity
        ? { type: 'link', label: 'View achievement', href: `/runner/submissions/${String(certificateActivity._id)}` }
        : { type: 'link', label: 'View standings', href: `/events/${event.slug}/leaderboard` },
      secondaryAction: { type: 'link', label: 'View submissions', href: '/runner/submissions' }
    };
  }

  if (submissionTiming.closed) {
    return {
      ...base,
      state: 'submission_closed',
      stateLabel: 'Submission closed',
      helperText: 'Your verified challenge progress remains available as a record.',
      primaryAction: null,
      secondaryAction: { type: 'link', label: 'View submissions', href: '/runner/submissions' }
    };
  }

  if (beforeActivityWindow) {
    return {
      ...base,
      state: 'registered',
      stateLabel: 'Ready for July',
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
      stateLabel: 'Activity under review',
      helperText: 'Pending distance is shown separately and does not count toward verified progress yet.',
      primaryAction: { type: 'link', label: 'View submissions', href: '/runner/submissions' },
      secondaryAction: { type: 'submit', label: 'Add another activity', registrationId: String(registration._id || '') }
    };
  }

  return {
    ...base,
    state: progress?.approvedActivityCount > 0 ? 'in_progress' : 'ready',
    stateLabel: progress?.approvedActivityCount > 0 ? 'Challenge in progress' : 'Ready to start',
    helperText: progress?.approvedActivityCount > 0
      ? 'Keep adding eligible activities until your verified total reaches the selected goal.'
      : 'Add your first eligible activity to begin verified progress.',
    primaryAction: { type: 'submit', label: 'Add activity', registrationId: String(registration._id || '') },
    secondaryAction: progress?.totalActivityCount > 0
      ? { type: 'link', label: 'View submissions', href: '/runner/submissions' }
      : { type: 'link', label: 'Registration details', href: '/my-registrations' }
  };
}

function formatDistance(value) {
  const number = Number(value || 0);
  return `${formatNumber(number)} km`;
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
  buildPublicEventRunnerState
};
