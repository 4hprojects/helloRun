const Registration = require('../models/Registration');
const Submission = require('../models/Submission');
const AccumulatedActivitySubmission = require('../models/AccumulatedActivitySubmission');
const { buildAccumulatedProgress } = require('./accumulated-activity.service');

async function getRunnerRegistrations(userId) {
  return Registration.find({ userId })
    .populate({
      path: 'eventId',
      select: 'title slug status eventStartAt eventEndAt city country venueName virtualCompletionMode targetDistanceKm minimumActivityDistanceKm acceptedRunTypes finalSubmissionDeadlineAt feeMode feeAmount feeCurrency paymentAccountName paymentInstructions paymentQrImageUrl',
      match: { isPersonalRecord: { $ne: true } }
    })
    .sort({ registeredAt: -1 })
    .lean();
}

function buildRunnerDashboardData(registrations = [], now = new Date()) {
  const validRegistrations = registrations.filter((item) => item && item.eventId);
  const upcoming = [];
  const past = [];
  const unpaid = [];

  for (const registration of validRegistrations) {
    const startAt = parseDateSafe(registration.eventId?.eventStartAt);
    const isUpcoming = startAt && startAt >= now;

    if (isUpcoming) {
      upcoming.push(registration);
    } else {
      past.push(registration);
    }

    if (registration.paymentStatus === 'unpaid' || registration.paymentStatus === 'proof_rejected') {
      unpaid.push(registration);
    }
  }

  const activity = validRegistrations
    .slice()
    .sort((a, b) => new Date(b.registeredAt || 0) - new Date(a.registeredAt || 0))
    .slice(0, 8)
    .map((registration) => ({
      type: 'registered',
      at: registration.registeredAt || null,
      eventTitle: registration.eventId?.title || 'Event unavailable',
      confirmationCode: registration.confirmationCode || ''
    }));

  return {
    all: validRegistrations,
    upcoming,
    past,
    unpaid,
    activity,
    stats: {
      total: validRegistrations.length,
      upcoming: upcoming.length,
      past: past.length,
      unpaid: unpaid.length,
      paid: validRegistrations.filter((item) => item.paymentStatus === 'paid').length
    }
  };
}

async function getRunnerEventProgressCards(registrations = []) {
  const validRegistrations = registrations.filter((item) => item && item.eventId);
  const registrationIds = validRegistrations.map((item) => item._id).filter(Boolean);
  if (!registrationIds.length) return [];

  const [standardSubmissions, accumulatedActivities] = await Promise.all([
    Submission.find({ registrationId: { $in: registrationIds } })
      .sort({ submittedAt: -1, createdAt: -1 })
      .select('registrationId status submittedAt reviewedAt rejectionReason certificate distanceKm elapsedMs runType proofType')
      .lean(),
    AccumulatedActivitySubmission.find({ registrationId: { $in: registrationIds } })
      .sort({ submittedAt: -1, createdAt: -1 })
      .select('registrationId status submittedAt reviewedAt rejectionReason certificate distanceKm elapsedMs runType proofType')
      .lean()
  ]);

  return buildRunnerEventProgressCards(validRegistrations, {
    standardSubmissions,
    accumulatedActivities
  });
}

function buildRunnerEventProgressCards(registrations = [], sources = {}) {
  const standardByRegistration = groupFirstByRegistrationId(sources.standardSubmissions || []);
  const accumulatedByRegistration = groupManyByRegistrationId(sources.accumulatedActivities || []);

  return registrations
    .filter((registration) => registration && registration.eventId)
    .map((registration) => {
      const registrationId = String(registration._id || '');
      const event = registration.eventId || {};
      const isAccumulated = event.virtualCompletionMode === 'accumulated_distance';
      const paymentStatus = String(registration.paymentStatus || '').trim() || 'unpaid';
      const registrationStatus = String(registration.status || '').trim() || 'confirmed';
      const paymentReady = paymentStatus === 'paid';
      const registrationReady = registrationStatus === 'confirmed' || registrationStatus === 'paid';
      const base = {
        registrationId,
        eventTitle: event.title || 'Event unavailable',
        eventSlug: event.slug || '',
        confirmationCode: registration.confirmationCode || '',
        raceDistance: registration.raceDistance || '',
        participationMode: registration.participationMode || '',
        eventStartAt: event.eventStartAt || null,
        eventStartAtLabel: '',
        paymentStatus,
        registrationStatus,
        paymentLabel: getPaymentStatusLabel(paymentStatus),
        registrationLabel: getRegistrationStatusLabel(registrationStatus),
        isAccumulated,
        state: '',
        stateLabel: '',
        stateTone: '',
        nextAction: null,
        helperText: ''
      };

      if (!paymentReady) {
        return {
          ...base,
          state: 'payment_required',
          stateLabel: paymentStatus === 'proof_submitted' ? 'Payment Review' : 'Payment Needed',
          stateTone: paymentStatus === 'proof_submitted' ? 'submitted' : 'warning',
          helperText: paymentStatus === 'proof_submitted'
            ? 'Your payment proof is waiting for review before run proof can be submitted.'
            : 'Complete payment to unlock run proof submission for this event.',
          nextAction: { href: '/my-registrations', label: paymentStatus === 'proof_submitted' ? 'View Payment' : 'Pay Now' }
        };
      }

      if (!registrationReady) {
        return {
          ...base,
          state: 'registration_not_ready',
          stateLabel: 'Registration Not Ready',
          stateTone: 'warning',
          helperText: 'This registration is not confirmed yet.',
          nextAction: { href: '/my-registrations', label: 'View Registration' }
        };
      }

      if (isAccumulated) {
        return buildAccumulatedProgressCard(base, accumulatedByRegistration.get(registrationId) || [], event);
      }

      return buildStandardProgressCard(base, standardByRegistration.get(registrationId) || null);
    })
    .sort((a, b) => sortProgressCards(a, b));
}

function buildStandardProgressCard(base, submission) {
  if (!submission) {
    return {
      ...base,
      state: 'not_submitted',
      stateLabel: 'Run Proof Needed',
      stateTone: 'warning',
      helperText: 'Submit your run proof when you are ready.',
      nextAction: { type: 'submit', label: 'Submit Proof' }
    };
  }

  const status = String(submission.status || '').trim();
  if (status === 'approved') {
    return {
      ...base,
      state: 'approved',
      stateLabel: submission.certificate?.url ? 'Certificate Ready' : 'Approved',
      stateTone: 'approved',
      helperText: submission.certificate?.url
        ? 'Your result was approved and your certificate is ready.'
        : 'Your submitted run proof was approved.',
      submittedAt: submission.submittedAt || null,
      reviewedAt: submission.reviewedAt || null,
      nextAction: submission.certificate?.url
        ? { href: `/my-submissions/${String(submission._id)}/certificate`, label: 'Download Certificate' }
        : { href: `/runner/submissions/${String(submission._id)}`, label: 'View Result' }
    };
  }

  if (status === 'rejected') {
    return {
      ...base,
      state: 'rejected',
      stateLabel: 'Needs Update',
      stateTone: 'rejected',
      helperText: submission.rejectionReason
        ? `Rejected: ${submission.rejectionReason}`
        : 'Your proof needs an update. Please review and resubmit.',
      submittedAt: submission.submittedAt || null,
      reviewedAt: submission.reviewedAt || null,
      nextAction: { type: 'resubmit', label: 'Resubmit Proof' }
    };
  }

  return {
    ...base,
    state: 'submitted',
    stateLabel: 'Pending Review',
    stateTone: 'submitted',
    helperText: 'Your run proof was received and is waiting for review.',
    submittedAt: submission.submittedAt || null,
    reviewedAt: submission.reviewedAt || null,
    nextAction: { href: `/runner/submissions/${String(submission._id)}`, label: 'View Submission' }
  };
}

function buildAccumulatedProgressCard(base, activities, event) {
  const progress = buildAccumulatedProgress({
    activities,
    targetDistanceKm: event.targetDistanceKm
  });
  const percent = progress.targetDistanceKm > 0
    ? Math.min(100, Math.max(0, (Number(progress.approvedDistanceKm || 0) / Number(progress.targetDistanceKm || 1)) * 100))
    : 0;
  const latestActivity = activities[0] || null;

  if (progress.completed) {
    return {
      ...base,
      state: 'completed',
      stateLabel: progress.certificateActivityId ? 'Completed' : 'Goal Reached',
      stateTone: 'approved',
      helperText: progress.certificateActivityId
        ? 'Your approved distance reached the goal and your certificate is ready.'
        : 'Your approved distance reached the goal.',
      progress: { ...progress, percent },
      submittedAt: latestActivity?.submittedAt || null,
      reviewedAt: progress.completionTimestamp || latestActivity?.reviewedAt || null,
      nextAction: progress.certificateActivityId
        ? { href: `/my-submissions/${progress.certificateActivityId}/certificate`, label: 'Download Certificate' }
        : { type: 'submit', label: 'Add Activity' }
    };
  }

  return {
    ...base,
    state: progress.totalActivityCount > 0 ? 'in_progress' : 'not_submitted',
    stateLabel: progress.pendingActivityCount > 0 ? 'Activity Pending' : 'In Progress',
    stateTone: progress.pendingActivityCount > 0 ? 'submitted' : 'warning',
    helperText: progress.totalActivityCount > 0
      ? 'Only approved activity distance counts toward the official goal.'
      : 'Submit activities and build approved distance toward this challenge.',
    progress: { ...progress, percent },
    submittedAt: latestActivity?.submittedAt || null,
    reviewedAt: latestActivity?.reviewedAt || null,
    nextAction: { type: 'submit', label: 'Add Activity' }
  };
}

function groupFirstByRegistrationId(items = []) {
  const grouped = new Map();
  for (const item of items) {
    const key = String(item.registrationId || '');
    if (key && !grouped.has(key)) grouped.set(key, item);
  }
  return grouped;
}

function groupManyByRegistrationId(items = []) {
  const grouped = new Map();
  for (const item of items) {
    const key = String(item.registrationId || '');
    if (!key) continue;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(item);
  }
  return grouped;
}

function getPaymentStatusLabel(status) {
  const labels = {
    unpaid: 'Unpaid',
    proof_submitted: 'Payment Submitted',
    proof_rejected: 'Payment Rejected',
    paid: 'Paid',
    failed: 'Failed',
    refunded: 'Refunded'
  };
  return labels[status] || status || 'Unpaid';
}

function getRegistrationStatusLabel(status) {
  const labels = {
    pending_payment: 'Pending Payment',
    paid: 'Paid',
    confirmed: 'Confirmed',
    cancelled: 'Cancelled',
    refunded: 'Refunded'
  };
  return labels[status] || status || 'Confirmed';
}

function sortProgressCards(a, b) {
  const priority = {
    rejected: 0,
    payment_required: 1,
    submitted: 2,
    in_progress: 3,
    not_submitted: 4,
    completed: 5,
    approved: 6
  };
  const firstPriority = priority[a.state] ?? 9;
  const secondPriority = priority[b.state] ?? 9;
  if (firstPriority !== secondPriority) return firstPriority - secondPriority;
  return new Date(b.submittedAt || b.eventStartAt || 0) - new Date(a.submittedAt || a.eventStartAt || 0);
}

function parseDateSafe(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

module.exports = {
  getRunnerRegistrations,
  getRunnerEventProgressCards,
  buildRunnerDashboardData,
  buildRunnerEventProgressCards
};
