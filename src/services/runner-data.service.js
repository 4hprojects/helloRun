const Registration = require('../models/Registration');
const Submission = require('../models/Submission');
const AccumulatedActivitySubmission = require('../models/AccumulatedActivitySubmission');
const { buildAccumulatedProgress } = require('./accumulated-activity.service');
const { resolveAccumulatedTargetDistanceKm } = require('./accumulated-target.service');
const { getPlatformDateKey } = require('../utils/platform-date');

async function getRunnerRegistrations(userId) {
  return Registration.find({ userId })
    .populate({
      path: 'eventId',
      select: 'title slug status logoUrl bannerImageUrl eventStartAt eventEndAt city country venueName virtualCompletionMode targetDistanceKm raceCategories minimumActivityDistanceKm acceptedRunTypes finalSubmissionDeadlineAt virtualWindow onsiteCheckinWindows feeMode feeAmount feeCurrency paymentAccountName paymentInstructions paymentQrImageUrl',
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

async function getRunnerEventProgressCards(registrations = [], options = {}) {
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
  }, options);
}

function buildRunnerEventProgressCards(registrations = [], sources = {}, options = {}) {
  const standardByRegistration = groupFirstByRegistrationId(sources.standardSubmissions || []);
  const accumulatedByRegistration = groupManyByRegistrationId(sources.accumulatedActivities || []);
  const now = options.now || new Date();

  return registrations
    .filter((registration) => registration && registration.eventId)
    .map((registration) => {
      const registrationId = String(registration._id || '');
      const event = registration.eventId || {};
      const isAccumulated = event.virtualCompletionMode === 'accumulated_distance';
      const paymentStatus = String(registration.paymentStatus || '').trim() || 'unpaid';
      const registrationStatus = String(registration.status || '').trim() || 'confirmed';
      const paymentReady = paymentStatus === 'paid';
      const registrationReady = (registrationStatus === 'confirmed' || registrationStatus === 'paid') && String(event.status || 'published') === 'published';
      const challengeTiming = buildChallengeTimingDisplay(registration, event, now);
      const submissionTiming = buildSubmissionTimingDisplay(registration, event, now);
      const pricingSnapshot = registration.pricingSnapshot || {};
      const amountDue = firstFiniteNumber(registration.paymentAmountDue, pricingSnapshot.amount, 0);
      const base = {
        registrationId,
        eventId: String(event._id || ''),
        eventTitle: event.title || 'Event unavailable',
        eventSlug: event.slug || '',
        eventImageUrl: event.logoUrl || event.bannerImageUrl || '/images/helloRun-icon.webp',
        confirmationCode: registration.confirmationCode || '',
        raceDistance: registration.raceDistance || '',
        participationMode: registration.participationMode || '',
        eventType: isAccumulated ? 'Accumulated challenge' : 'Run result',
        eventStartAt: event.eventStartAt || null,
        eventEndAt: event.eventEndAt || null,
        challengeEndAt: challengeTiming.at,
        challengeDaysRemaining: challengeTiming.daysRemaining,
        challengeTone: challengeTiming.tone,
        challengeLabel: challengeTiming.label,
        challengeClosed: challengeTiming.closed,
        submissionDeadlineAt: submissionTiming.at,
        submissionDaysRemaining: submissionTiming.daysRemaining,
        submissionDeadlineTone: submissionTiming.tone,
        submissionDeadlineStatusLabel: submissionTiming.label,
        submissionClosed: submissionTiming.closed,
        // Compatibility aliases used by the existing cards now represent challenge time.
        daysRemaining: challengeTiming.daysRemaining,
        deadlineTone: challengeTiming.tone,
        deadlineLabel: challengeTiming.label,
        eventStartAtLabel: '',
        registeredAt: registration.registeredAt || null,
        registrationUpdatedAt: registration.updatedAt || null,
        paymentStatus,
        registrationStatus,
        paymentLabel: getPaymentStatusLabel(paymentStatus),
        payment: {
          required: !paymentReady,
          amount: amountDue,
          currency: registration.paymentCurrency || pricingSnapshot.currency || 'PHP',
          packageName: pricingSnapshot.packageName || pricingSnapshot.optionDescription || '',
          categoryName: pricingSnapshot.raceCategoryName || '',
          addOnsTotal: Number(registration.addOnsSubtotal || 0),
          status: paymentStatus,
          statusLabel: getPaymentStatusLabel(paymentStatus),
          rejectionReason: registration.paymentRejectionReason || '',
          proofSubmittedAt: registration.paymentProof?.uploadedAt || null
        },
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
          stateLabel: paymentStatus === 'proof_submitted' ? 'Payment Under Review' : paymentStatus === 'proof_rejected' ? 'Payment Changes Needed' : 'Payment Needed',
          stateTone: paymentStatus === 'proof_submitted' ? 'submitted' : paymentStatus === 'proof_rejected' ? 'rejected' : 'warning',
          helperText: paymentStatus === 'proof_submitted'
            ? 'Your payment proof is waiting for review before run proof can be submitted.'
            : paymentStatus === 'proof_rejected'
              ? (registration.paymentRejectionReason || 'Your payment proof needs an update before registration can continue.')
              : 'Complete payment to unlock activity submission for this event.',
          nextAction: { href: '/my-registrations', label: paymentStatus === 'proof_submitted' ? 'View Registration' : paymentStatus === 'proof_rejected' ? 'Fix Payment Proof' : 'Pay or Upload Proof' }
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

      const accumulatedActivities = accumulatedByRegistration.get(registrationId) || [];
      const standardSubmission = standardByRegistration.get(registrationId) || null;
      const hasNonRejectedSubmission = isAccumulated
        ? accumulatedActivities.some((activity) => activity.status !== 'rejected')
        : Boolean(standardSubmission && standardSubmission.status !== 'rejected');

      if (!hasNonRejectedSubmission && submissionTiming.closed) {
        return {
          ...base,
          state: 'missed',
          stateLabel: 'Submission Closed',
          stateTone: 'missed',
          helperText: 'The submission window for this event has closed and no run proof was submitted. This event has been moved to Missed.',
          nextAction: null
        };
      }

      if (!hasNonRejectedSubmission && parseDateSafe(event.eventStartAt)?.getTime() > now.getTime()) {
        return {
          ...base,
          state: 'registration_ready',
          stateLabel: 'Registration Ready',
          stateTone: 'approved',
          helperText: 'You are registered. Check the event details while you wait for the activity window to open.',
          nextAction: { href: event.slug ? `/events/${event.slug}` : '/my-registrations', label: 'View Event' }
        };
      }

      if (isAccumulated) {
        return buildAccumulatedProgressCard(base, accumulatedActivities, registration, event);
      }

      return buildStandardProgressCard(base, standardSubmission);
    })
    .sort((a, b) => sortProgressCards(a, b));
}

function splitEventProgressCards(cards = []) {
  return {
    active: cards.filter((card) => card.state !== 'missed'),
    missed: cards.filter((card) => card.state === 'missed')
  };
}

function buildStandardProgressCard(base, submission) {
  if (!submission) {
    return {
      ...base,
      state: 'not_submitted',
      stateLabel: 'Ready for Activity',
      stateTone: 'warning',
      helperText: 'Submit your run proof when you are ready.',
      nextAction: { type: 'submit', label: 'Submit Run' }
    };
  }

  const status = String(submission.status || '').trim();
  if (status === 'approved') {
    return {
      ...base,
      state: submission.certificate?.url ? 'certificate_ready' : 'approved',
      stateLabel: submission.certificate?.url ? 'Certificate Ready' : 'Approved',
      stateTone: 'approved',
      helperText: submission.certificate?.url
        ? 'Your result was approved and your certificate is ready.'
        : 'Your submitted run proof was approved.',
      submittedAt: submission.submittedAt || null,
      reviewedAt: submission.reviewedAt || null,
      latestSubmission: buildLatestSubmission(submission),
      nextAction: submission.certificate?.url
        ? { type: 'download_certificate', href: `/my-submissions/${String(submission._id)}/certificate`, label: 'Download Certificate' }
        : { href: `/runner/submissions/${String(submission._id)}`, label: 'View Result' }
    };
  }

  if (status === 'rejected') {
    return {
      ...base,
      state: 'rejected',
      stateLabel: 'Changes Needed',
      stateTone: 'rejected',
      helperText: submission.rejectionReason
        ? submission.rejectionReason
        : 'Your proof needs an update. Review it and submit a corrected version.',
      submittedAt: submission.submittedAt || null,
      reviewedAt: submission.reviewedAt || null,
      latestSubmission: buildLatestSubmission(submission),
      nextAction: { type: 'resubmit', label: 'Fix Submission' }
    };
  }

  return {
    ...base,
    state: 'submitted',
    stateLabel: 'Under Review',
    stateTone: 'submitted',
    helperText: 'Your run proof was received and is waiting for review.',
    submittedAt: submission.submittedAt || null,
    reviewedAt: submission.reviewedAt || null,
    latestSubmission: buildLatestSubmission(submission),
    nextAction: { href: `/runner/submissions/${String(submission._id)}`, label: 'View Submission' }
  };
}

function buildAccumulatedProgressCard(base, activities, registration, event) {
  const progress = buildAccumulatedProgress({
    activities,
    targetDistanceKm: resolveAccumulatedTargetDistanceKm(registration, event)
  });
  const percent = progress.targetDistanceKm > 0
    ? Math.min(100, Math.max(0, (Number(progress.approvedDistanceKm || 0) / Number(progress.targetDistanceKm || 1)) * 100))
    : 0;
  const latestActivity = activities[0] || null;
  const remainingDistanceKm = Math.max(0, Number(progress.targetDistanceKm || 0) - Number(progress.approvedDistanceKm || 0));
  const potentialDistanceKm = Number(progress.approvedDistanceKm || 0) + Number(progress.pendingDistanceKm || 0);
  const guidanceDays = base.challengeDaysRemaining > 0 ? base.challengeDaysRemaining : 0;
  const displayProgress = {
    ...progress,
    percent,
    remainingDistanceKm,
    potentialDistanceKm,
    suggestedDailyDistanceKm: guidanceDays && remainingDistanceKm > 0 ? remainingDistanceKm / guidanceDays : null,
    suggestedWeeklyDistanceKm: guidanceDays && remainingDistanceKm > 0 ? (remainingDistanceKm / guidanceDays) * 7 : null
  };

  if (progress.completed) {
    return {
      ...base,
      state: 'completed',
      stateLabel: progress.certificateActivityId ? 'Completed' : 'Goal Reached',
      stateTone: 'approved',
      helperText: progress.certificateActivityId
        ? 'Your approved distance reached the goal and your certificate is ready.'
        : 'Your approved distance reached the goal.',
      progress: displayProgress,
      submittedAt: latestActivity?.submittedAt || null,
      reviewedAt: progress.completionTimestamp || latestActivity?.reviewedAt || null,
      nextAction: progress.certificateActivityId
        ? { type: 'download_certificate', href: `/my-submissions/${progress.certificateActivityId}/certificate`, label: 'Download Certificate' }
        : { href: base.eventSlug ? `/events/${base.eventSlug}` : '/my-registrations', label: 'View Achievement' }
    };
  }

  if (latestActivity?.status === 'rejected') {
    return {
      ...base,
      state: 'rejected',
      stateLabel: 'Changes Needed',
      stateTone: 'rejected',
      helperText: latestActivity.rejectionReason || 'Your latest activity needs an update. Review the proof and submit a corrected activity.',
      progress: displayProgress,
      submittedAt: latestActivity.submittedAt || null,
      reviewedAt: latestActivity.reviewedAt || null,
      latestSubmission: buildLatestSubmission(latestActivity),
      nextAction: { type: 'resubmit', label: 'Fix Submission' }
    };
  }

  return {
    ...base,
    state: progress.totalActivityCount > 0 ? 'in_progress' : 'not_submitted',
    stateLabel: progress.pendingActivityCount > 0 ? 'Under Review' : progress.totalActivityCount > 0 ? 'Challenge in Progress' : 'Ready for Activity',
    stateTone: progress.pendingActivityCount > 0 ? 'submitted' : 'warning',
    helperText: progress.totalActivityCount > 0
      ? 'Only approved activity distance counts toward the official goal.'
      : 'Submit activities and build approved distance toward this challenge.',
    progress: displayProgress,
    submittedAt: latestActivity?.submittedAt || null,
    reviewedAt: latestActivity?.reviewedAt || null,
    nextAction: { type: 'submit', label: 'Add Activity' }
  };
}

function buildLatestSubmission(submission) {
  if (!submission) return null;
  return {
    id: String(submission._id || ''),
    status: submission.status || '',
    statusLabel: submission.status === 'rejected' ? 'Changes Needed' : submission.status === 'approved' ? 'Approved' : 'Under Review',
    submittedAt: submission.submittedAt || null,
    reviewedAt: submission.reviewedAt || null,
    reviewerFeedback: submission.rejectionReason || ''
  };
}

function buildChallengeTimingDisplay(registration, event, now) {
  const mode = String(registration.participationMode || '').toLowerCase();
  const challengeEndAt = parseDateSafe(
    (mode === 'virtual' ? event.virtualWindow?.endAt : null) ||
    event.eventEndAt
  );
  return buildCalendarTimingDisplay(challengeEndAt, now, {
    missingLabel: 'End date TBA',
    dueTodayLabel: 'Last challenge day',
    closedLabel: 'Challenge ended'
  });
}

function buildSubmissionTimingDisplay(registration, event, now) {
  const mode = String(registration.participationMode || '').toLowerCase();
  const submissionDeadlineAt = parseDateSafe(
    event.finalSubmissionDeadlineAt ||
    (mode === 'virtual' ? event.virtualWindow?.endAt : null) ||
    event.eventEndAt
  );
  return buildCalendarTimingDisplay(submissionDeadlineAt, now, {
    missingLabel: 'Deadline TBA',
    dueTodayLabel: 'Submission due today',
    closedLabel: 'Submission closed'
  });
}

function buildDeadlineDisplay(registration, event, now) {
  return buildSubmissionTimingDisplay(registration, event, now);
}

function buildCalendarTimingDisplay(date, now, labels) {
  if (!date) return { at: null, daysRemaining: null, tone: 'normal', label: labels.missingLabel, closed: false };
  const endKey = getCountdownDateKey(date);
  const nowKey = getCountdownDateKey(now);
  const daysRemaining = calendarDayDifference(nowKey, endKey);
  if (daysRemaining < 0) return { at: date, daysRemaining: -1, tone: 'closed', label: labels.closedLabel, closed: true };
  if (daysRemaining === 0) return { at: date, daysRemaining: 0, tone: 'urgent', label: labels.dueTodayLabel, closed: false };
  if (daysRemaining <= 2) return { at: date, daysRemaining, tone: 'warning', label: `${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'} left`, closed: false };
  if (daysRemaining <= 7) return { at: date, daysRemaining, tone: 'approaching', label: `${daysRemaining} days left`, closed: false };
  return { at: date, daysRemaining, tone: 'normal', label: `${daysRemaining} days left`, closed: false };
}

function getCountdownDateKey(date) {
  if (date.getUTCHours() === 23 && date.getUTCMinutes() >= 55) {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
  }
  return getPlatformDateKey(date);
}

function calendarDayDifference(startKey, endKey) {
  const start = Date.parse(`${startKey}T00:00:00.000Z`);
  const end = Date.parse(`${endKey}T00:00:00.000Z`);
  return Math.round((end - start) / (24 * 60 * 60 * 1000));
}

function firstFiniteNumber(...values) {
  for (const value of values) {
    const number = Number(value);
    if (Number.isFinite(number) && number >= 0) return number;
  }
  return 0;
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

function sortProgressCards(a, b, options = {}) {
  if (options.sortMode === 'recent_activity') {
    return getMostRecentActivityTimestamp(b) - getMostRecentActivityTimestamp(a);
  }

  const priority = {
    rejected: 0,
    payment_required: 1,
    registration_not_ready: 2,
    not_submitted: 3,
    in_progress: 4,
    registration_ready: 5,
    submitted: 6,
    certificate_ready: 7,
    completed: 8,
    approved: 9
  };
  const firstPriority = priority[a.state] ?? 9;
  const secondPriority = priority[b.state] ?? 9;
  if (firstPriority !== secondPriority) return firstPriority - secondPriority;
  return new Date(b.submittedAt || b.eventStartAt || 0) - new Date(a.submittedAt || a.eventStartAt || 0);
}

function getMostRecentActivityTimestamp(card) {
  const candidates = [
    card.submittedAt,
    card.reviewedAt,
    card.registeredAt,
    card.registrationUpdatedAt,
    card.eventStartAt
  ]
    .map((value) => (value ? new Date(value).getTime() : NaN))
    .filter(Number.isFinite);
  return candidates.length ? Math.max(...candidates) : 0;
}

function sortEventProgressCardsByRecency(cards = []) {
  return [...cards].sort((a, b) => sortProgressCards(a, b, { sortMode: 'recent_activity' }));
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
  buildRunnerEventProgressCards,
  splitEventProgressCards,
  sortEventProgressCardsByRecency
  ,
  buildDeadlineDisplay,
  buildChallengeTimingDisplay,
  buildSubmissionTimingDisplay
};
