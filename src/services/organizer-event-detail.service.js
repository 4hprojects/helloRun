'use strict';

const Registration = require('../models/Registration');
const Submission = require('../models/Submission');
const AccumulatedActivitySubmission = require('../models/AccumulatedActivitySubmission');
const { PLATFORM_TIME_ZONE, formatPlatformDate } = require('../utils/platform-date');
const { resolveAccumulatedTargetDistanceKm } = require('./accumulated-target.service');
const { isAccumulatedChallenge, resolveChallengeConfig } = require('../utils/challenge-metrics');

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('en-US', {
  timeZone: PLATFORM_TIME_ZONE,
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZoneName: 'short'
});

const STATUS_LABELS = Object.freeze({
  draft: 'Draft',
  pending_review: 'Pending Review',
  published: 'Published',
  closed: 'Closed',
  archived: 'Archived'
});

function formatPlatformDateTime(value, fallback = 'Not configured') {
  if (!value) return fallback;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : DATE_TIME_FORMATTER.format(date);
}

function normalizeCountRows(rows = []) {
  const result = { total: 0, submitted: 0, approved: 0, rejected: 0, proof_submitted: 0 };
  for (const row of rows) {
    const key = String(row?._id || '');
    if (Object.hasOwn(result, key)) result[key] = Number(row?.count || 0);
  }
  return result;
}

function roundDistance(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? Number(number.toFixed(2)) : 0;
}

function formatDistance(value) {
  return `${roundDistance(value).toLocaleString('en-US', { maximumFractionDigits: 2 })} km`;
}

async function loadEventOperationalCounts(eventId, dependencies = {}) {
  const RegistrationModel = dependencies.RegistrationModel || Registration;
  const SubmissionModel = dependencies.SubmissionModel || Submission;
  const AccumulatedModel = dependencies.AccumulatedModel || AccumulatedActivitySubmission;
  const [registrationRows, standardRows, accumulatedRows] = await Promise.all([
    RegistrationModel.aggregate([
      { $match: { eventId } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          proofSubmitted: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'proof_submitted'] }, 1, 0] } }
        }
      }
    ]),
    SubmissionModel.aggregate([
      { $match: { eventId } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]),
    AccumulatedModel.aggregate([
      { $match: { eventId } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ])
  ]);
  const registrations = {
    total: Number(registrationRows[0]?.total || 0),
    proof_submitted: Number(registrationRows[0]?.proofSubmitted || 0)
  };
  const standard = normalizeCountRows(standardRows);
  const accumulated = normalizeCountRows(accumulatedRows);
  return {
    registrations: registrations.total,
    pendingPayments: registrations.proof_submitted,
    pendingStandardResults: standard.submitted,
    pendingAccumulatedResults: accumulated.submitted,
    pendingResults: standard.submitted + accumulated.submitted,
    approvedStandardResults: standard.approved,
    approvedAccumulatedResults: accumulated.approved,
    approvedResults: standard.approved + accumulated.approved
  };
}

async function loadAccumulatedOperations(event, dependencies = {}) {
  if (!isAccumulatedChallenge(event)) return null;
  const challengeConfig = resolveChallengeConfig(event);
  const RegistrationModel = dependencies.RegistrationModel || Registration;
  const AccumulatedModel = dependencies.AccumulatedModel || AccumulatedActivitySubmission;
  const [registrations, activityGroups] = await Promise.all([
    RegistrationModel.aggregate([
      { $match: { eventId: event._id } },
      { $project: { raceDistance: 1, pricingSnapshot: 1 } }
    ]),
    AccumulatedModel.aggregate([
      { $match: { eventId: event._id } },
      {
        $group: {
          _id: { registrationId: '$registrationId', status: '$status' },
          activityCount: { $sum: 1 },
          distanceKm: { $sum: { $ifNull: ['$distanceKm', 0] } },
          steps: { $sum: { $ifNull: ['$steps', 0] } }
        }
      }
    ])
  ]);
  const progressByRegistration = new Map();
  const statusTotals = {
    approved: { activityCount: 0, distanceKm: 0, steps: 0 },
    submitted: { activityCount: 0, distanceKm: 0, steps: 0 },
    rejected: { activityCount: 0, distanceKm: 0, steps: 0 }
  };
  for (const row of activityGroups) {
    const registrationId = String(row?._id?.registrationId || '');
    const status = String(row?._id?.status || '');
    if (!registrationId || !Object.hasOwn(statusTotals, status)) continue;
    const activityCount = Number(row.activityCount || 0);
    const distanceKm = Number(row.distanceKm || 0);
    const steps = Number(row.steps || 0);
    statusTotals[status].activityCount += activityCount;
    statusTotals[status].distanceKm += distanceKm;
    statusTotals[status].steps += steps;
    const progress = progressByRegistration.get(registrationId) || {
      approvedDistanceKm: 0,
      pendingDistanceKm: 0,
      approvedSteps: 0,
      pendingSteps: 0
    };
    if (status === 'approved') progress.approvedDistanceKm += distanceKm;
    if (status === 'submitted') progress.pendingDistanceKm += distanceKm;
    if (status === 'approved') progress.approvedSteps += steps;
    if (status === 'submitted') progress.pendingSteps += steps;
    progressByRegistration.set(registrationId, progress);
  }

  let participantsStarted = 0;
  let goalsReached = 0;
  let missingGoalCount = 0;
  for (const registration of registrations) {
    const progress = progressByRegistration.get(String(registration._id)) || {
      approvedDistanceKm: 0,
      pendingDistanceKm: 0,
      approvedSteps: 0,
      pendingSteps: 0
    };
    const targetDistanceKm = resolveAccumulatedTargetDistanceKm(registration, event);
    const target = challengeConfig.primaryMetric === 'steps' ? challengeConfig.targetSteps : targetDistanceKm;
    const approved = challengeConfig.primaryMetric === 'steps' ? progress.approvedSteps : progress.approvedDistanceKm;
    if (approved > 0) participantsStarted += 1;
    if (target > 0 && approved >= target) goalsReached += 1;
    if (!(target > 0)) missingGoalCount += 1;
  }

  return {
    registrationCount: registrations.length,
    participantsStarted,
    goalsReached,
    missingGoalCount,
    approvedActivityCount: statusTotals.approved.activityCount,
    pendingActivityCount: statusTotals.submitted.activityCount,
    rejectedActivityCount: statusTotals.rejected.activityCount,
    approvedDistanceKm: roundDistance(statusTotals.approved.distanceKm),
    pendingDistanceKm: roundDistance(statusTotals.submitted.distanceKm),
    rejectedDistanceKm: roundDistance(statusTotals.rejected.distanceKm),
    approvedSteps: statusTotals.approved.steps,
    pendingSteps: statusTotals.submitted.steps,
    rejectedSteps: statusTotals.rejected.steps,
    primaryMetric: challengeConfig.primaryMetric,
    trackedMetrics: challengeConfig.metrics,
    targetSteps: challengeConfig.targetSteps,
    approvedDistanceLabel: formatDistance(statusTotals.approved.distanceKm),
    pendingDistanceLabel: formatDistance(statusTotals.submitted.distanceKm),
    rejectedDistanceLabel: formatDistance(statusTotals.rejected.distanceKm)
  };
}

function toValidDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function resolveMilestoneState(now, start, end) {
  if (end && now > end) return 'complete';
  if (start && now < start) return 'upcoming';
  if (start || end) return 'current';
  return 'missing';
}

function buildOperationalPhase(event, counts = {}, now = new Date()) {
  const current = toValidDate(now) || new Date();
  const registrationOpen = toValidDate(event.registrationOpenAt);
  const registrationClose = toValidDate(event.registrationCloseAt);
  const activityStart = toValidDate(event.eventStartAt);
  const activityEnd = toValidDate(event.eventEndAt);
  const submissionDeadline = toValidDate(event.finalSubmissionDeadlineAt || event.eventEndAt);
  const milestones = [
    {
      key: 'registration',
      label: 'Registration',
      value: `${formatPlatformDate(registrationOpen, 'Not configured')} – ${formatPlatformDate(registrationClose, 'Not configured')}`,
      state: resolveMilestoneState(current, registrationOpen, registrationClose)
    },
    {
      key: 'activity',
      label: 'Activity',
      value: `${formatPlatformDate(activityStart, 'Not configured')} – ${formatPlatformDate(activityEnd, 'Not configured')}`,
      state: resolveMilestoneState(current, activityStart, activityEnd)
    },
    {
      key: 'submission',
      label: 'Final submission',
      value: formatPlatformDate(submissionDeadline, 'Not configured'),
      state: submissionDeadline
        ? (current > submissionDeadline ? 'complete' : (activityEnd && current > activityEnd ? 'current' : 'upcoming'))
        : 'missing'
    },
    {
      key: 'closeout',
      label: 'Closeout',
      value: submissionDeadline ? `After ${formatPlatformDate(submissionDeadline)}` : 'After final reviews',
      state: submissionDeadline && current > submissionDeadline
        ? (Number(counts.pendingResults || 0) > 0 ? 'current' : 'complete')
        : 'upcoming'
    }
  ];

  if (event.status === 'draft') return {
    key: 'setup', label: 'Event setup', detail: 'Complete required event settings before submitting for review.',
    tone: 'attention', milestones
  };
  if (event.status === 'pending_review') return {
    key: 'pending_review', label: 'Awaiting admin review', detail: 'The event is waiting for an administrator decision.',
    tone: 'attention', milestones
  };
  if (event.status === 'closed' || event.status === 'archived') return {
    key: 'completed', label: event.status === 'archived' ? 'Event archived' : 'Event closed',
    detail: 'Operational records remain available for review.', tone: 'neutral', milestones
  };
  if (!activityStart && !activityEnd) return {
    key: 'scheduled', label: 'Activity dates not configured',
    detail: 'Set the structured activity period before relying on live operational timing.',
    tone: 'attention', milestones
  };
  if (activityStart && current < activityStart) {
    if (registrationOpen && current >= registrationOpen && (!registrationClose || current <= registrationClose)) {
      return {
        key: 'registration_open', label: 'Registration open',
        detail: registrationClose ? `Registration closes ${formatPlatformDate(registrationClose)}.` : 'Registration is currently open.',
        tone: 'active', milestones
      };
    }
    return {
      key: 'scheduled', label: 'Activity period upcoming',
      detail: `Activity begins ${formatPlatformDate(activityStart)}.`, tone: 'neutral', milestones
    };
  }
  if ((!activityStart || current >= activityStart) && (!activityEnd || current <= activityEnd)) {
    const registrationNote = registrationClose && current > registrationClose ? ' Registration is closed.' : '';
    return {
      key: 'activity_underway', label: 'Activity underway',
      detail: `${activityEnd ? `Eligible activity continues through ${formatPlatformDate(activityEnd)}.` : 'The activity period is open.'}${registrationNote}`,
      tone: 'active', milestones
    };
  }
  if (submissionDeadline && current <= submissionDeadline) return {
    key: 'final_submissions', label: 'Final submissions open',
    detail: `The activity period has ended. Eligible proof is due by ${formatPlatformDate(submissionDeadline)}.`,
    tone: 'attention', milestones
  };
  if (Number(counts.pendingResults || 0) > 0) return {
    key: 'final_review', label: 'Final review in progress',
    detail: `${Number(counts.pendingResults)} result${Number(counts.pendingResults) === 1 ? '' : 's'} still await review.`,
    tone: 'attention', milestones
  };
  return {
    key: 'completed', label: 'Operational closeout',
    detail: 'Submission and review windows are complete. Final results and recognition can be checked.',
    tone: 'neutral', milestones
  };
}

function buildContextualAction({ event, counts, phase, readinessTasks = [] }) {
  const id = String(event._id);
  if (event.status === 'draft') {
    if (readinessTasks.length) {
      return { label: readinessTasks[0].action, href: readinessTasks[0].href, icon: 'pencil' };
    }
    return { label: 'Edit Event', href: `/organizer/events/${id}/edit`, icon: 'pencil' };
  }
  if (event.status === 'pending_review') {
    return { label: 'Preview Event', href: `/organizer/preview-event?eventId=${id}&previewSource=edit`, icon: 'eye' };
  }
  if (Number(counts.pendingResults || 0) > 0) {
    return { label: 'Review Results', href: `/organizer/events/${id}/run-proofs/review`, icon: 'flag' };
  }
  if (event.feeMode === 'paid' && Number(counts.pendingPayments || 0) > 0) {
    return { label: 'Review Payments', href: `/organizer/events/${id}/payment-proofs/review`, icon: 'receipt' };
  }
  if (['registration_open', 'activity_underway', 'final_submissions'].includes(phase.key)) {
    return { label: 'View Registrants', href: `/organizer/events/${id}/registrants`, icon: 'users' };
  }
  if (readinessTasks.length) {
    return { label: readinessTasks[0].action, href: readinessTasks[0].href, icon: 'sparkles' };
  }
  if (Number(counts.approvedResults || 0) > 0) {
    return { label: 'View Final Results', href: `/organizer/events/${id}/run-proofs/review?status=approved`, icon: 'trophy' };
  }
  return { label: 'View Registrants', href: `/organizer/events/${id}/registrants`, icon: 'users' };
}

function resolveEventFormat(event = {}) {
  const allowed = Array.isArray(event.eventTypesAllowed) ? event.eventTypesAllowed.filter(Boolean) : [];
  const formats = allowed.length ? allowed : [event.eventType].filter(Boolean);
  if (formats.length > 1 || formats.includes('hybrid')) return 'Hybrid';
  if (formats.includes('onsite')) return 'Onsite';
  return 'Virtual';
}

function resolveLocation(event = {}, formatLabel = resolveEventFormat(event)) {
  const place = [event.venueName, event.city, event.province, event.country].filter(Boolean).join(', ');
  if (place) return place;
  return formatLabel === 'Virtual' ? 'Virtual event' : `${formatLabel} location not configured`;
}

function categorySummary(category = {}) {
  return [
    category.distanceLabel,
    Number(category.distanceKm || 0) > 0 ? `${Number(category.distanceKm).toLocaleString('en-US')} km` : '',
    Number(category.slots || 0) > 0 ? `${Number(category.slots).toLocaleString('en-US')} slots` : '',
    category.cutoffTime,
    category.ageGroup
  ].filter(Boolean).join(' · ') || ({ distance: 'Distance', challenge: 'Challenge', open: 'Open', other: 'Other' }[category.type] || 'Category');
}

function buildReadinessTasks({ event, hasActiveCertificate, eventBadgeCount, publishReadinessErrors = [] }) {
  const eventId = String(event._id);
  const tasks = [];
  const pushUnique = (task) => {
    if (!tasks.some((item) => item.key === task.key || item.title === task.title)) tasks.push(task);
  };
  publishReadinessErrors.forEach((message, index) => pushUnique({
    key: `publish-${index}`,
    title: String(message),
    impact: 'Resolve this publishing requirement before submitting the event for review.',
    href: `/organizer/events/${eventId}/edit`,
    action: 'Fix in editor'
  }));
  if (event.feeMode === 'paid' && (!event.paymentAccountName || !event.paymentInstructions)) {
    pushUnique({
      key: 'payment', title: 'Complete payment instructions',
      impact: 'Runners need a clear payee and external payment instructions before submitting receipts.',
      href: `/organizer/events/${eventId}/edit`, action: 'Edit payment setup'
    });
  }
  if (event.digitalCertificateEnabled !== false && !hasActiveCertificate) {
    pushUnique({
      key: 'certificate', title: 'Publish a certificate template',
      impact: 'Configured certificates cannot be issued until an active template is available.',
      href: `/organizer/events/${eventId}/certificate`, action: 'Set up certificate'
    });
  }
  if (event.digitalBadgeEnabled && !eventBadgeCount) {
    pushUnique({
      key: 'badge', title: 'Generate event badges',
      impact: 'Badge recognition cannot appear until badge definitions exist.',
      href: `/organizer/events/${eventId}/badges/manage`, action: 'Manage badges'
    });
  }
  return tasks;
}

function buildLifecycle(event, publishReadinessErrors, publicVisibleNow, publicListingLabel) {
  const id = String(event._id);
  if (event.status === 'draft') {
    if (publishReadinessErrors.length) return {
      eyebrow: 'Next action', title: 'Complete event setup',
      description: `${publishReadinessErrors.length} publishing requirement${publishReadinessErrors.length === 1 ? '' : 's'} must be resolved before review.`,
      action: { label: 'Continue editing', href: `/organizer/events/${id}/edit`, method: 'get' }
    };
    return {
      eyebrow: 'Next action', title: 'Ready for review',
      description: 'The event passes current publication-readiness checks. Submit it for admin review.',
      action: { label: 'Submit for Review', href: `/organizer/events/${id}/status`, method: 'post', nextStatus: 'pending_review' }
    };
  }
  if (event.status === 'pending_review') return {
    eyebrow: 'Current state', title: 'Awaiting admin review',
    description: 'The event is locked in the review queue until an administrator publishes it or requests corrections.',
    action: null
  };
  if (event.status === 'published' && !publicVisibleNow) return {
    eyebrow: 'Current state', title: 'Publication scheduled',
    description: `The event is published and will become publicly visible ${publicListingLabel}.`,
    action: { label: 'Preview saved event', href: `/organizer/preview-event?eventId=${id}&previewSource=edit`, method: 'get' }
  };
  if (event.status === 'published') return {
    eyebrow: 'Current state', title: 'Event is live',
    description: 'Registration and participant operations are available according to the configured event dates.',
    action: { label: 'View public page', href: `/events/${event.slug}`, method: 'get' }
  };
  if (event.status === 'closed') return {
    eyebrow: 'Current state', title: 'Event is closed',
    description: 'The event can no longer transition status here. Existing participant records remain available.',
    action: null
  };
  return {
    eyebrow: 'Current state', title: 'Event is archived',
    description: 'The event is outside active use. Existing operational records remain available.',
    action: null
  };
}

async function getOrganizerEventDetailPresentation({
  event,
  hasActiveCertificate = false,
  eventBadgeCount = 0,
  publishReadinessErrors = [],
  now = new Date()
}, dependencies = {}) {
  const [counts, accumulatedOperations] = await Promise.all([
    loadEventOperationalCounts(event._id, dependencies),
    loadAccumulatedOperations(event, dependencies)
  ]);
  const id = String(event._id);
  const formatLabel = resolveEventFormat(event);
  const listingAt = event.publicListingAvailableAt ? new Date(event.publicListingAvailableAt) : null;
  const hasListingAt = listingAt && !Number.isNaN(listingAt.getTime());
  const publicVisibleNow = event.status === 'published' && (!hasListingAt || listingAt <= now);
  const publicListingLabel = hasListingAt ? formatPlatformDateTime(listingAt) : 'immediately after approval';
  const readinessTasks = buildReadinessTasks({ event, hasActiveCertificate, eventBadgeCount, publishReadinessErrors });
  const recognitionTasks = readinessTasks.filter((item) => ['certificate', 'badge'].includes(item.key));
  const setupTasks = event.status === 'published'
    ? readinessTasks.filter((item) => !['certificate', 'badge'].includes(item.key))
    : readinessTasks;
  const lifecycle = buildLifecycle(event, publishReadinessErrors, publicVisibleNow, publicListingLabel);
  const operationalPhase = buildOperationalPhase(event, counts, now);
  const contextualAction = buildContextualAction({
    event,
    counts,
    phase: operationalPhase,
    readinessTasks: event.status === 'published' && recognitionTasks.length ? recognitionTasks : readinessTasks
  });
  const canEdit = !['closed', 'archived'].includes(event.status);
  const mediaItems = [
    event.bannerImageUrl ? { kind: 'banner', label: 'Event banner', url: event.bannerImageUrl } : null,
    event.logoUrl ? { kind: 'logo', label: 'Event logo', url: event.logoUrl } : null,
    event.posterImageUrl ? { kind: 'poster', label: 'Promotional poster', url: event.posterImageUrl } : null
  ].filter(Boolean);
  const standardMetrics = [
    { key: 'registrations', label: 'Registrations', value: counts.registrations, href: `/organizer/events/${id}/registrants`, actionable: true, helper: 'Open roster', icon: 'users-round', tone: 'neutral' },
    ...(event.feeMode === 'paid' ? [{
      key: 'payments',
      label: 'Payment Reviews',
      value: counts.pendingPayments,
      href: counts.pendingPayments ? `/organizer/events/${id}/payment-proofs/review` : '',
      actionable: counts.pendingPayments > 0,
      helper: counts.pendingPayments ? 'Needs review' : 'Queue clear',
      icon: 'receipt-text',
      tone: counts.pendingPayments ? 'attention' : 'clear'
    }] : []),
    {
      key: 'results',
      label: 'Result Reviews',
      value: counts.pendingResults,
      href: counts.pendingResults ? `/organizer/events/${id}/run-proofs/review` : '',
      actionable: counts.pendingResults > 0,
      helper: counts.pendingResults ? 'Needs review' : 'Queue clear',
      icon: 'clipboard-check',
      tone: counts.pendingResults ? 'attention' : 'clear'
    },
    { key: 'approved', label: 'Approved Results', value: counts.approvedResults, href: `/organizer/events/${id}/run-proofs/review?status=approved`, actionable: true, helper: 'View results', icon: 'badge-check', tone: 'positive' }
  ];
  const accumulatedMetrics = accumulatedOperations ? [
    { key: 'registrations', label: 'Registrations', value: counts.registrations, href: `/organizer/events/${id}/registrants`, actionable: true, helper: 'Open roster', icon: 'users-round', tone: 'neutral' },
    { key: 'started', label: 'Approved Progress', value: accumulatedOperations.participantsStarted, href: `/organizer/events/${id}/registrants?result=approved`, actionable: accumulatedOperations.participantsStarted > 0, helper: 'View runners', icon: 'activity', tone: 'positive' },
    { key: 'goals', label: 'Goals Reached', value: accumulatedOperations.goalsReached, href: `/organizer/events/${id}/registrants`, actionable: accumulatedOperations.goalsReached > 0, helper: 'View progress', icon: 'target', tone: 'positive' },
    { key: 'distance', label: 'Approved Distance', value: accumulatedOperations.approvedDistanceLabel, href: `/events/${event.slug}/leaderboard`, actionable: event.leaderboardRecognitionEnabled !== false, helper: 'View standings', icon: 'route', tone: 'positive' },
    {
      key: 'results',
      label: 'Pending Review',
      value: accumulatedOperations.pendingActivityCount,
      href: accumulatedOperations.pendingActivityCount ? `/organizer/events/${id}/run-proofs/review` : '',
      actionable: accumulatedOperations.pendingActivityCount > 0,
      helper: accumulatedOperations.pendingActivityCount ? 'Review activities' : 'Queue clear',
      icon: 'clipboard-clock',
      tone: accumulatedOperations.pendingActivityCount ? 'attention' : 'clear'
    }
  ] : null;
  return {
    eventId: id,
    referenceCode: event.referenceCode || `EVT-${id.slice(0, 8).toUpperCase()}`,
    statusLabel: STATUS_LABELS[event.status] || 'Draft',
    formatLabel,
    locationLabel: resolveLocation(event, formatLabel),
    canEdit,
    publicVisibleNow,
    publicListingLabel,
    publicHref: `/events/${event.slug}`,
    previewHref: `/organizer/preview-event?eventId=${id}&previewSource=edit`,
    counts,
    metrics: accumulatedMetrics || standardMetrics,
    schedule: [
      { label: 'Public listing', value: publicListingLabel },
      { label: 'Registration', value: `${formatPlatformDate(event.registrationOpenAt, 'Not configured')} – ${formatPlatformDate(event.registrationCloseAt, 'Not configured')}` },
      { label: 'Event period', value: `${formatPlatformDate(event.eventStartAt, 'Not configured')} – ${formatPlatformDate(event.eventEndAt, 'Not configured')}` },
      { label: 'Submission deadline', value: formatPlatformDate(event.finalSubmissionDeadlineAt || event.eventEndAt, 'Not configured') }
    ],
    categories: (Array.isArray(event.raceCategories) ? event.raceCategories : []).map((category) => ({
      name: category.name || category.distanceLabel || 'Unnamed category',
      summary: categorySummary(category),
      rewards: category.rewardsDescription || ''
    })),
    pricing: {
      feeLabel: event.feeMode === 'paid' ? `${event.feeCurrency || 'PHP'} ${Number(event.feeAmount || 0).toFixed(2)}` : 'Free',
      modeLabel: String(event.pricingMode || 'free').replaceAll('_', ' '),
      paymentAccount: event.feeMode === 'paid' ? (event.paymentAccountName || 'Not configured') : 'Not required'
    },
    runnerExperience: {
      proofTypes: (event.proofTypesAllowed || []).join(', ') || 'Not configured',
      digitalBadge: event.digitalBadgeEnabled ? 'Enabled' : 'Disabled',
      digitalCertificate: event.digitalCertificateEnabled === false ? 'Disabled' : (hasActiveCertificate ? 'Enabled · template active' : 'Enabled · template needed'),
      leaderboard: event.leaderboardRecognitionEnabled === false ? 'Disabled' : 'Enabled',
      physicalRewards: event.physicalRewardsEnabled ? 'Enabled' : 'Disabled',
      waiver: event.waiverTemplate ? `Version ${event.waiverVersion || 1} configured` : 'Missing'
    },
    readinessTasks,
    setupTasks,
    recognitionTasks,
    accumulatedOperations,
    operationalPhase,
    contextualAction,
    lifecycle,
    mediaItems,
    galleryItems: (event.galleryImageUrls || []).map((url, index) => ({ url, label: `Gallery image ${index + 1}` })),
    tools: [
      { group: 'Recognition', items: [
        { label: 'Certificates', href: `/organizer/events/${id}/certificate`, icon: 'award' },
        { label: 'Badges', href: `/organizer/events/${id}/badges/manage`, icon: 'badge-check' }
      ] },
      { group: 'Commerce', items: [
        { label: 'Shop', href: `/organizer/events/${id}/shop`, icon: 'shopping-bag' },
        ...(canEdit ? [{ label: 'Payment setup', href: `/organizer/events/${id}/edit#payment-setup-step`, icon: 'wallet-cards' }] : [])
      ] },
      { group: 'Publishing', items: [
        { label: 'Promote events', href: '/organizer/promote', icon: 'megaphone' },
        { label: 'Saved preview', href: `/organizer/preview-event?eventId=${id}&previewSource=edit`, icon: 'eye' },
        ...(publicVisibleNow ? [{ label: 'Public page', href: `/events/${event.slug}`, icon: 'globe' }] : [])
      ] },
      { group: 'Records', items: [
        { label: 'Audit trail', href: `/organizer/events/${id}/audit`, icon: 'scroll-text' },
        { label: 'Clone event', href: `/organizer/events/${id}/clone`, icon: 'copy-plus' }
      ] }
    ]
  };
}

module.exports = {
  formatPlatformDateTime,
  normalizeCountRows,
  loadEventOperationalCounts,
  loadAccumulatedOperations,
  buildOperationalPhase,
  buildContextualAction,
  resolveEventFormat,
  resolveLocation,
  categorySummary,
  buildReadinessTasks,
  buildLifecycle,
  getOrganizerEventDetailPresentation
};
