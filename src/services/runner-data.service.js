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
        eventImageUrl: String(event.logoUrl || '').trim() || '/images/helloRun-icon.webp',
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
        certificateFinalizationState: String(registration.accumulatedCertificateFinalization?.state || ''),
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

function buildMyRegistrationsPresentation(registrations = [], sources = {}, options = {}) {
  const now = options.now || new Date();
  const progressCards = buildRunnerEventProgressCards(registrations, sources, { now });
  const progressByRegistrationId = new Map(progressCards.map((card) => [card.registrationId, card]));
  const items = registrations.map((registration) => {
    const registrationId = String(registration?._id || '');
    const progressCard = progressByRegistrationId.get(registrationId) || buildUnavailableRegistrationCard(registration);
    return buildMyRegistrationItem(registration, progressCard, now);
  });
  const groups = {
    nextActions: items.filter((item) => item.group === 'next_actions').sort(compareNextActionItems),
    active: items.filter((item) => item.group === 'active').sort(compareActiveItems),
    history: items.filter((item) => item.group === 'history').sort(compareHistoryItems)
  };

  return {
    groups,
    counts: {
      total: items.length,
      nextActions: groups.nextActions.length,
      active: groups.active.length,
      history: groups.history.length,
      underReview: items.filter((item) => item.isUnderReview).length
    }
  };
}

function buildMyRegistrationItem(registration = {}, card = {}, now = new Date()) {
  const event = registration.eventId || null;
  const registrationStatus = String(registration.status || 'confirmed');
  const paymentStatus = String(registration.paymentStatus || 'unpaid');
  const state = card.state || 'unavailable';
  const group = resolveMyRegistrationGroup({ state, registrationStatus, paymentStatus, card, event });
  const action = resolveMyRegistrationAction({ registration, card, event, paymentStatus, registrationStatus });
  const eventDate = parseDateSafe(event?.eventStartAt);
  const submissionDeadline = parseDateSafe(card.submissionDeadlineAt);
  const eventFeeMode = String(event?.feeMode || 'free').toLowerCase();
  const selectedCategory = registration.pricingSnapshot?.raceCategoryName || registration.raceDistance || 'Category not listed';
  const imageUrl = String(card.eventImageUrl || event?.logoUrl || '').trim() || '/images/helloRun-icon.webp';
  const fallbackImageUrl = '/images/helloRun-icon.webp';
  const isUnderReview = paymentStatus === 'proof_submitted' || state === 'submitted' || Number(card.progress?.pendingActivityCount || 0) > 0;

  return {
    registration,
    card,
    registrationId: String(registration._id || ''),
    group,
    action,
    actionPriority: getMyRegistrationActionPriority({ state, paymentStatus, card }),
    eventTitle: event?.title || 'Event unavailable',
    eventSlug: event?.slug || '',
    eventHref: event?.slug ? `/events/${event.slug}` : '',
    imageUrl,
    fallbackImageUrl,
    confirmationCode: registration.confirmationCode || 'Not available',
    selectedCategory,
    modeLabel: formatParticipationMode(registration.participationMode),
    eventDate,
    eventDateLabel: formatRegistrationDate(eventDate, 'Date not listed'),
    submissionDeadline,
    submissionDeadlineLabel: formatRegistrationDate(submissionDeadline, card.submissionDeadlineStatusLabel || 'Deadline not listed'),
    registeredAtLabel: formatRegistrationDate(registration.registeredAt, 'Date not listed'),
    state,
    stateLabel: card.stateLabel || (event ? 'Registration received' : 'Event unavailable'),
    stateTone: card.stateTone || (event ? 'neutral' : 'missed'),
    helperText: card.helperText || (event ? 'Review this registration for current details.' : 'The event is no longer publicly available. Your registration record remains here.'),
    paymentStatus,
    paymentStatusLabel: card.payment?.statusLabel || getPaymentStatusLabel(paymentStatus),
    activityStatusLabel: state === 'payment_required' ? 'Waiting for payment' : (card.stateLabel || 'Not submitted'),
    paymentRequired: eventFeeMode === 'paid' || ['unpaid', 'proof_submitted', 'proof_rejected', 'failed', 'refunded'].includes(paymentStatus),
    paymentDisclosureOpen: false,
    isUnderReview,
    isUnavailable: !event,
    isHistorical: group === 'history',
    sortAt: getMostRecentActivityTimestamp(card) || new Date(registration.registeredAt || 0).getTime(),
    eventSortAt: eventDate?.getTime() || Number.MAX_SAFE_INTEGER,
    deadlineSortAt: submissionDeadline?.getTime() || Number.MAX_SAFE_INTEGER,
    now
  };
}

function resolveMyRegistrationGroup({ state, registrationStatus, paymentStatus, card, event }) {
  if (!event || ['cancelled', 'refunded'].includes(registrationStatus) || paymentStatus === 'refunded') return 'history';
  if (['missed', 'approved', 'completed', 'ended'].includes(state)) return 'history';
  if (card.submissionClosed && ['not_submitted', 'in_progress', 'registration_ready'].includes(state)) return 'history';
  if (paymentStatus === 'proof_rejected' || state === 'rejected') return 'next_actions';
  if (paymentStatus === 'unpaid' || ['not_submitted', 'final_submission_open', 'certificate_ready'].includes(state)) return 'next_actions';
  if (['urgent', 'warning'].includes(card.submissionDeadlineTone) && card.nextAction?.type === 'submit') return 'next_actions';
  return 'active';
}

function resolveMyRegistrationAction({ registration, card, event, paymentStatus, registrationStatus }) {
  if (!event) return { type: 'link', label: 'Contact Support', href: '/contact' };
  if (['cancelled', 'refunded'].includes(registrationStatus)) {
    return { type: 'link', label: 'View Event', href: event.slug ? `/events/${event.slug}` : '/events' };
  }
  if (paymentStatus === 'unpaid' || paymentStatus === 'proof_rejected') {
    return {
      type: 'payment_disclosure',
      label: paymentStatus === 'proof_rejected' ? 'Fix Payment Proof' : 'Pay or Upload Proof',
      targetId: `payment-${String(registration._id || '')}`
    };
  }
  if (paymentStatus === 'proof_submitted') {
    return { type: 'details_disclosure', label: 'View Payment Status', targetId: `payment-${String(registration._id || '')}` };
  }
  if (card.submissionClosed && (card.nextAction?.type === 'submit' || card.nextAction?.type === 'resubmit')) {
    return { type: 'link', label: 'Submission Closed', href: event.slug ? `/events/${event.slug}` : '/events' };
  }
  if (card.nextAction?.type === 'submit' || card.nextAction?.type === 'resubmit') {
    return {
      type: card.nextAction.type,
      label: card.nextAction.label,
      registrationId: String(registration._id || '')
    };
  }
  if (card.nextAction?.href) {
    return {
      type: card.nextAction.type || 'link',
      label: card.nextAction.label || 'View Details',
      href: card.nextAction.href
    };
  }
  return { type: 'link', label: 'View Event', href: event.slug ? `/events/${event.slug}` : '/events' };
}

function getMyRegistrationActionPriority({ state, paymentStatus, card }) {
  if (paymentStatus === 'proof_rejected') return 0;
  if (state === 'rejected') return 1;
  if (paymentStatus === 'unpaid') return 2;
  if (card.submissionDeadlineTone === 'urgent') return 3;
  if (card.submissionDeadlineTone === 'warning') return 4;
  if (state === 'not_submitted') return 5;
  if (state === 'certificate_ready') return 6;
  return 9;
}

function compareNextActionItems(a, b) {
  if (a.actionPriority !== b.actionPriority) return a.actionPriority - b.actionPriority;
  if (a.deadlineSortAt !== b.deadlineSortAt) return a.deadlineSortAt - b.deadlineSortAt;
  if (a.eventSortAt !== b.eventSortAt) return a.eventSortAt - b.eventSortAt;
  return a.registrationId.localeCompare(b.registrationId);
}

function compareActiveItems(a, b) {
  const firstDate = Math.min(a.eventSortAt, a.deadlineSortAt);
  const secondDate = Math.min(b.eventSortAt, b.deadlineSortAt);
  if (firstDate !== secondDate) return firstDate - secondDate;
  if (a.sortAt !== b.sortAt) return b.sortAt - a.sortAt;
  return a.registrationId.localeCompare(b.registrationId);
}

function compareHistoryItems(a, b) {
  if (a.sortAt !== b.sortAt) return b.sortAt - a.sortAt;
  return a.registrationId.localeCompare(b.registrationId);
}

function buildUnavailableRegistrationCard(registration = {}) {
  return {
    registrationId: String(registration._id || ''),
    eventTitle: 'Event unavailable',
    state: 'unavailable',
    stateLabel: 'Event unavailable',
    stateTone: 'missed',
    helperText: 'The event is no longer publicly available. Your registration record remains here.',
    payment: { statusLabel: getPaymentStatusLabel(registration.paymentStatus) },
    nextAction: null
  };
}

function formatRegistrationDate(value, fallback) {
  const date = parseDateSafe(value);
  if (!date) return fallback;
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatParticipationMode(value) {
  const normalized = String(value || '').trim();
  if (!normalized) return 'Mode not listed';
  return normalized.replace(/[_-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function splitEventProgressCards(cards = []) {
  return {
    active: cards.filter((card) => !['missed', 'ended'].includes(card.state)),
    missed: cards.filter((card) => card.state === 'missed')
  };
}

function buildRunnerDashboardPresentation(options = {}) {
  const cards = Array.isArray(options.cards) ? options.cards.filter(Boolean) : [];
  const activeCards = cards.filter((card) => !isDashboardHistoryCard(card));
  const sortedActive = activeCards.slice().sort(compareDashboardJourneyCards);
  const primaryJourney = sortedActive[0] || null;
  const secondaryJourneys = primaryJourney
    ? sortedActive.filter((card) => String(card.registrationId || '') !== String(primaryJourney.registrationId || ''))
    : sortedActive;
  const profileCompleteness = options.profileCompleteness || { missingFields: [] };
  const isRestricted = options.user?.accountStatus === 'restricted';
  const setup = primaryJourney || secondaryJourneys.length
    ? null
    : buildDashboardSetupState({ profileCompleteness });
  const historyCount = cards.filter(isDashboardHistoryCard).length + Number(options.unavailableHistoryCount || 0);

  return {
    primaryJourney,
    secondaryJourneys,
    setup,
    accountAlert: isRestricted
      ? {
          tone: 'warning',
          text: 'Your account is restricted. Submissions and registrations are unavailable until support restores access.',
          href: '/contact',
          label: 'Contact Support'
        }
      : null,
    subtitle: primaryJourney
      ? `${primaryJourney.stateLabel} for ${primaryJourney.eventTitle}. ${primaryJourney.deadlineLabel || ''}`.trim()
      : setup?.description || 'Your event tasks, verified progress, and recognition in one place.',
    historyCount,
    snapshot: options.snapshot || {},
    recentActivity: Array.isArray(options.recentActivity) ? options.recentActivity : [],
    latestAchievement: options.latestAchievement || null,
    toolCounts: {
      submissions: Number(options.toolCounts?.submissions || 0),
      achievements: Number(options.toolCounts?.achievements || 0),
      groups: Number(options.toolCounts?.groups || 0),
      savedEvents: Number(options.toolCounts?.savedEvents || 0),
      history: historyCount
    }
  };
}

function compareDashboardJourneyCards(a, b) {
  const priorityDifference = getDashboardJourneyPriority(a) - getDashboardJourneyPriority(b);
  if (priorityDifference) return priorityDifference;

  const firstDeadline = getDashboardActionDate(a);
  const secondDeadline = getDashboardActionDate(b);
  if (firstDeadline !== secondDeadline) return firstDeadline - secondDeadline;

  const firstActivity = getDashboardRecentActivityTimestamp(a);
  const secondActivity = getDashboardRecentActivityTimestamp(b);
  if (firstActivity !== secondActivity) return secondActivity - firstActivity;
  return String(a.registrationId || '').localeCompare(String(b.registrationId || ''));
}

function getDashboardRecentActivityTimestamp(card = {}) {
  const values = [card.submittedAt, card.reviewedAt, card.registeredAt, card.registrationUpdatedAt]
    .map((value) => parseDateSafe(value)?.getTime())
    .filter(Number.isFinite);
  return values.length ? Math.max(...values) : 0;
}

function getDashboardJourneyPriority(card = {}) {
  const paymentStatus = String(card.payment?.status || card.paymentStatus || '');
  const state = String(card.state || '');
  if (paymentStatus === 'proof_rejected') return 0;
  if (state === 'rejected') return 1;
  if (paymentStatus === 'unpaid' || (state === 'payment_required' && paymentStatus !== 'proof_submitted')) return 2;
  if (isDashboardUrgentAction(card)) return 3;
  if (state === 'not_submitted' || state === 'final_submission_open') return 4;
  if (state === 'certificate_ready' || card.nextAction?.type === 'download_certificate') return 5;
  if (['goal_reached', 'in_progress'].includes(state) && card.isAccumulated) return 6;
  if (paymentStatus === 'proof_submitted' || ['submitted', 'final_reviews', 'certificate_finalizing', 'registration_not_ready', 'in_progress'].includes(state)) return 7;
  if (state === 'registration_ready') return 8;
  return 9;
}

function isDashboardUrgentAction(card = {}) {
  const tone = String(card.submissionDeadlineTone || card.deadlineTone || '');
  return tone === 'urgent' && ['not_submitted', 'in_progress', 'final_submission_open'].includes(String(card.state || ''));
}

function getDashboardActionDate(card = {}) {
  const values = [card.submissionDeadlineAt, card.eventStartAt]
    .map((value) => parseDateSafe(value)?.getTime())
    .filter(Number.isFinite);
  return values.length ? Math.min(...values) : Number.MAX_SAFE_INTEGER;
}

function isDashboardHistoryCard(card = {}) {
  const state = String(card.state || '');
  if (['certificate_ready', 'certificate_finalizing'].includes(state)) return false;
  if (String(card.paymentStatus || card.payment?.status || '') === 'refunded') return true;
  if (['cancelled', 'refunded'].includes(String(card.registrationStatus || ''))) return true;
  return ['approved', 'completed', 'ended', 'missed', 'cancelled', 'refunded', 'unavailable'].includes(state);
}

function buildDashboardSetupState({ profileCompleteness }) {
  if (profileCompleteness?.missingFields?.length) {
    return {
      type: 'profile',
      title: 'Complete your runner profile',
      description: `Add ${profileCompleteness.missingFields.slice(0, 3).join(', ')}${profileCompleteness.missingFields.length > 3 ? ', and the remaining details' : ''} before your first registration.`,
      action: { type: 'link', label: 'Complete Profile', href: '/runner/profile' }
    };
  }
  return { type: 'discover', title: 'Find your first event', description: 'Choose an event and distance to start your runner journey.', action: { type: 'link', label: 'Browse Events', href: '/events' } };
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
  const percent = progress.targetDistanceKm > 0 ? progress.progressPercent : 0;
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
    if (!base.submissionClosed) {
      return {
        ...base,
        state: 'goal_reached',
        stateLabel: progress.overGoalDistanceKm > 0 ? 'Goal Reached · Extra Distance Verified' : 'Goal Reached',
        stateTone: 'approved',
        helperText: progress.pendingActivityCount > 0
          ? 'Your badge is earned. Pending distance remains separate until approval, and submissions stay open until the deadline.'
          : 'Your badge is earned. Keep adding eligible activities until the submission deadline.',
        progress: displayProgress,
        submittedAt: latestActivity?.submittedAt || null,
        reviewedAt: progress.completionTimestamp || latestActivity?.reviewedAt || null,
        nextAction: { type: 'submit', label: 'Add Activity' }
      };
    }
    if (base.certificateFinalizationState === 'waiting_reviews' || progress.pendingActivityCount > 0) {
      return {
        ...base,
        state: 'final_reviews',
        stateLabel: 'Final Reviews in Progress',
        stateTone: 'submitted',
        helperText: 'The deadline has passed. Certificates will be finalized after every pending activity for this event is reviewed.',
        progress: displayProgress,
        submittedAt: latestActivity?.submittedAt || null,
        reviewedAt: progress.completionTimestamp || latestActivity?.reviewedAt || null,
        nextAction: { href: '/runner/submissions', label: 'View Submissions' }
      };
    }
    return {
      ...base,
      state: progress.certificateActivityId ? 'certificate_ready' : 'certificate_finalizing',
      stateLabel: progress.certificateActivityId ? 'Certificate Ready' : 'Certificate Finalizing',
      stateTone: 'approved',
      helperText: progress.certificateActivityId
        ? 'Your final approved distance is recorded and your certificate is ready.'
        : 'Final reviews are complete and your certificate is being prepared.',
      progress: displayProgress,
      submittedAt: latestActivity?.submittedAt || null,
      reviewedAt: progress.completionTimestamp || latestActivity?.reviewedAt || null,
      nextAction: progress.certificateActivityId
        ? { type: 'download_certificate', href: `/my-submissions/${progress.certificateActivityId}/certificate`, label: 'Download Certificate' }
        : { href: base.eventSlug ? `/events/${base.eventSlug}` : '/my-registrations', label: 'View Achievement' }
    };
  }

  if (base.submissionClosed) {
    if (progress.pendingActivityCount > 0) {
      return {
        ...base,
        state: 'submitted',
        stateLabel: 'Awaiting Final Review',
        stateTone: 'submitted',
        helperText: 'The challenge and submission windows have ended. Pending activities remain under organizer review.',
        progress: displayProgress,
        submittedAt: latestActivity?.submittedAt || null,
        reviewedAt: latestActivity?.reviewedAt || null,
        latestSubmission: buildLatestSubmission(latestActivity),
        nextAction: latestActivity?._id
          ? { href: `/runner/submissions/${String(latestActivity._id)}`, label: 'View Review Status' }
          : { href: '/runner/submissions', label: 'View Submissions' }
      };
    }
    return {
      ...base,
      state: 'ended',
      stateLabel: 'Challenge Ended',
      stateTone: 'missed',
      helperText: 'The activity and final submission windows have ended. Your verified progress remains in registration history.',
      progress: displayProgress,
      submittedAt: latestActivity?.submittedAt || null,
      reviewedAt: latestActivity?.reviewedAt || null,
      nextAction: { href: base.eventSlug ? `/events/${base.eventSlug}` : '/my-registrations', label: 'View Event' }
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

  if (base.challengeClosed) {
    return {
      ...base,
      state: progress.pendingActivityCount > 0 ? 'submitted' : 'final_submission_open',
      stateLabel: progress.pendingActivityCount > 0 ? 'Awaiting Final Review' : 'Final Submissions Open',
      stateTone: progress.pendingActivityCount > 0 ? 'submitted' : 'warning',
      helperText: progress.pendingActivityCount > 0
        ? 'The activity window has ended. Pending activities are awaiting organizer review.'
        : 'The activity window has ended. Submit eligible activity proof before the final deadline.',
      progress: displayProgress,
      submittedAt: latestActivity?.submittedAt || null,
      reviewedAt: latestActivity?.reviewedAt || null,
      latestSubmission: buildLatestSubmission(latestActivity),
      nextAction: progress.pendingActivityCount > 0
        ? (latestActivity?._id
            ? { href: `/runner/submissions/${String(latestActivity._id)}`, label: 'View Review Status' }
            : { href: '/runner/submissions', label: 'View Submissions' })
        : { type: 'submit', label: progress.totalActivityCount > 0 ? 'Add Final Activity' : 'Submit Activity' }
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
    const key = String(item.registrationId?._id || item.registrationId || '');
    if (key && !grouped.has(key)) grouped.set(key, item);
  }
  return grouped;
}

function groupManyByRegistrationId(items = []) {
  const grouped = new Map();
  for (const item of items) {
    const key = String(item.registrationId?._id || item.registrationId || '');
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

function buildCertificateShareUrls(verificationUrl, eventTitle) {
  const url = String(verificationUrl || '').trim();
  if (!url) return null;
  const title = String(eventTitle || 'my HelloRun event').trim() || 'my HelloRun event';
  const text = `I completed ${title} and earned a verified certificate! 🏃 #HelloRun`;
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(text);
  return {
    text,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    x: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`
  };
}

module.exports = {
  getRunnerRegistrations,
  getRunnerEventProgressCards,
  buildRunnerDashboardData,
  buildRunnerEventProgressCards,
  buildMyRegistrationsPresentation,
  buildRunnerDashboardPresentation,
  compareDashboardJourneyCards,
  getDashboardJourneyPriority,
  isDashboardHistoryCard,
  splitEventProgressCards,
  sortEventProgressCardsByRecency,
  buildDeadlineDisplay,
  buildChallengeTimingDisplay,
  buildSubmissionTimingDisplay,
  buildCertificateShareUrls
};
