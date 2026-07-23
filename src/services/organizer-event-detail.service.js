'use strict';

const Registration = require('../models/Registration');
const Submission = require('../models/Submission');
const AccumulatedActivitySubmission = require('../models/AccumulatedActivitySubmission');
const { PLATFORM_TIME_ZONE, formatPlatformDate } = require('../utils/platform-date');

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
  const counts = await loadEventOperationalCounts(event._id, dependencies);
  const id = String(event._id);
  const formatLabel = resolveEventFormat(event);
  const listingAt = event.publicListingAvailableAt ? new Date(event.publicListingAvailableAt) : null;
  const hasListingAt = listingAt && !Number.isNaN(listingAt.getTime());
  const publicVisibleNow = event.status === 'published' && (!hasListingAt || listingAt <= now);
  const publicListingLabel = hasListingAt ? formatPlatformDateTime(listingAt) : 'immediately after approval';
  const readinessTasks = buildReadinessTasks({ event, hasActiveCertificate, eventBadgeCount, publishReadinessErrors });
  const lifecycle = buildLifecycle(event, publishReadinessErrors, publicVisibleNow, publicListingLabel);
  const canEdit = !['closed', 'archived'].includes(event.status);
  const mediaItems = [
    event.bannerImageUrl ? { kind: 'banner', label: 'Event banner', url: event.bannerImageUrl } : null,
    event.logoUrl ? { kind: 'logo', label: 'Event logo', url: event.logoUrl } : null,
    event.posterImageUrl ? { kind: 'poster', label: 'Promotional poster', url: event.posterImageUrl } : null
  ].filter(Boolean);
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
    metrics: [
      { key: 'registrations', label: 'Registrations', value: counts.registrations, href: `/organizer/events/${id}/registrants`, actionable: true },
      { key: 'payments', label: 'Payment Reviews', value: counts.pendingPayments, href: counts.pendingPayments ? `/organizer/events/${id}/payment-proofs/review` : '', actionable: counts.pendingPayments > 0 },
      { key: 'results', label: 'Result Reviews', value: counts.pendingResults, href: counts.pendingResults ? `/organizer/events/${id}/run-proofs/review` : '', actionable: counts.pendingResults > 0 },
      { key: 'approved', label: 'Approved Results', value: counts.approvedResults, href: `/organizer/events/${id}/run-proofs/review?status=approved`, actionable: true }
    ],
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
  resolveEventFormat,
  resolveLocation,
  categorySummary,
  buildReadinessTasks,
  buildLifecycle,
  getOrganizerEventDetailPresentation
};
