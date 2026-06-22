const mongoose = require('mongoose');
const Submission = require('../models/Submission');
const AccumulatedActivitySubmission = require('../models/AccumulatedActivitySubmission');
const Event = require('../models/Event');
const { buildSubmissionReviewSignal } = require('../utils/submission-review-labels');

const VALID_STATUSES = new Set(['all', 'submitted', 'approved', 'rejected']);
const VALID_TYPES = new Set(['all', 'standard', 'accumulated']);
const VALID_SORTS = new Set(['newest', 'oldest']);
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

function normalizeSubmissionHubFilters(query = {}) {
  const status = VALID_STATUSES.has(String(query.status || '').trim())
    ? String(query.status).trim()
    : 'all';
  const type = VALID_TYPES.has(String(query.type || '').trim())
    ? String(query.type).trim()
    : 'all';
  const sort = VALID_SORTS.has(String(query.sort || '').trim())
    ? String(query.sort).trim()
    : 'newest';
  const q = typeof query.q === 'string' ? query.q.trim().slice(0, 120) : '';
  const eventId = mongoose.Types.ObjectId.isValid(String(query.eventId || ''))
    ? String(query.eventId)
    : '';
  const requestedPage = Number.parseInt(String(query.page || '1'), 10);
  const requestedPageSize = Number.parseInt(String(query.pageSize || DEFAULT_PAGE_SIZE), 10);

  return {
    status,
    type,
    sort,
    q,
    eventId,
    page: Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1,
    pageSize: clampInt(requestedPageSize, 1, MAX_PAGE_SIZE, DEFAULT_PAGE_SIZE)
  };
}

async function listSubmissionHub(options = {}) {
  const filters = normalizeSubmissionHubFilters(options.filters || {});
  const hasEventScope = Object.prototype.hasOwnProperty.call(options, 'eventIds');
  const eventIds = normalizeEventIds(options.eventIds || []);
  if (hasEventScope && eventIds.length === 0) {
    return {
      filters,
      items: [],
      counts: buildCounts([]),
      pagination: {
        page: 1,
        totalPages: 1,
        totalItems: 0,
        pageSize: filters.pageSize
      }
    };
  }
  const eventFilterIds = filters.eventId ? [filters.eventId] : eventIds;
  const eventIdQuery = eventFilterIds.length
    ? { eventId: { $in: eventFilterIds } }
    : {};
  const query = { ...eventIdQuery, status: { $in: ['submitted', 'approved', 'rejected'] } };
  const populate = [
    { path: 'eventId', select: 'title slug status organizerId' },
    { path: 'registrationId', select: 'participant confirmationCode raceDistance participationMode' },
    { path: 'reviewedBy', select: 'firstName lastName email' }
  ];

  const [standardDocs, accumulatedDocs] = await Promise.all([
    filters.type === 'accumulated'
      ? []
      : Submission.find(query).populate(populate).lean(),
    filters.type === 'standard'
      ? []
      : AccumulatedActivitySubmission.find(query).populate(populate).lean()
  ]);

  const accessibleSet = eventIds.length ? new Set(eventIds) : null;
  let scopedItems = standardDocs
    .map((submission) => normalizeSubmissionRow(submission, 'standard'))
    .concat(accumulatedDocs.map((submission) => normalizeSubmissionRow(submission, 'accumulated')))
    .filter((item) => (
      item.eventId &&
      item.registrationId &&
      (!accessibleSet || accessibleSet.has(item.eventId))
    ));

  if (filters.q) {
    const pattern = new RegExp(escapeRegex(filters.q), 'i');
    scopedItems = scopedItems.filter((item) => (
      pattern.test(item.eventTitle) ||
      pattern.test(item.participantName) ||
      pattern.test(item.participantEmail) ||
      pattern.test(item.confirmationCode)
    ));
  }

  const counts = buildCounts(scopedItems);
  let items = filters.status === 'all'
    ? scopedItems
    : scopedItems.filter((item) => item.status === filters.status);

  items.sort((a, b) => {
    const aTime = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
    const bTime = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
    return filters.sort === 'oldest' ? aTime - bTime : bTime - aTime;
  });

  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / filters.pageSize));
  const page = Math.min(filters.page, totalPages);
  const pageStart = (page - 1) * filters.pageSize;
  const pagedItems = items.slice(pageStart, pageStart + filters.pageSize);

  return {
    filters: { ...filters, page },
    items: pagedItems,
    counts,
    pagination: {
      page,
      totalPages,
      totalItems,
      pageSize: filters.pageSize
    }
  };
}

async function listSubmissionHubEvents(options = {}) {
  const eventIds = normalizeEventIds(options.eventIds || []);
  const query = { isDeleted: { $ne: true } };
  if (eventIds.length) {
    query._id = { $in: eventIds };
  }

  return Event.find(query)
    .select('title slug status')
    .sort({ title: 1, createdAt: -1 })
    .limit(500)
    .lean()
    .then((events) => events.map((event) => ({
      id: String(event._id),
      title: event.title || 'Untitled event',
      status: event.status || ''
    })));
}

function normalizeSubmissionRow(submission, submissionKind) {
  const event = submission.eventId || null;
  const registration = submission.registrationId || null;
  if (!event?._id || !registration?._id) {
    return {
      eventId: '',
      registrationId: ''
    };
  }

  const participant = registration.participant || {};
  const isAutoApproved = submission.status === 'approved' && !submission.reviewedBy;
  const statusLabel = submission.status === 'submitted'
    ? 'Pending Review'
    : isAutoApproved
      ? 'Auto-approved'
      : titleCase(submission.status || 'N/A');

  return {
    id: String(submission._id),
    submissionKind,
    submissionTypeLabel: submissionKind === 'accumulated' ? 'Accumulated Activity' : 'Run Result',
    eventId: String(event._id),
    eventTitle: event.title || 'Event unavailable',
    registrationId: String(registration._id),
    confirmationCode: registration.confirmationCode || 'N/A',
    participantName: [participant.firstName, participant.lastName].filter(Boolean).join(' ').trim() || 'N/A',
    participantEmail: participant.email || 'N/A',
    raceDistance: registration.raceDistance || submission.raceDistance || 'N/A',
    participationMode: registration.participationMode || submission.participationMode || 'N/A',
    status: submission.status || 'submitted',
    statusLabel,
    statusClass: isAutoApproved ? 'auto-approved' : (submission.status || 'submitted'),
    isAutoApproved,
    distanceLabel: `${Number(submission.distanceKm || 0).toFixed(2)} km`,
    elapsedLabel: formatElapsedMs(submission.elapsedMs),
    proofTypeLabel: String(submission.proofType || 'manual').toUpperCase(),
    sourceLabel: getSubmissionSourceLabel(submission),
    submittedAt: submission.submittedAt || submission.createdAt || null,
    submittedAtLabel: formatDateTime(submission.submittedAt || submission.createdAt),
    reviewedAtLabel: formatDateTime(submission.reviewedAt),
    suspiciousFlag: Boolean(submission.suspiciousFlag),
    suspiciousFlagReason: String(submission.suspiciousFlagReason || '').trim(),
    reviewSignal: buildSubmissionReviewSignal(submission),
    proofUrl: String(submission.proof?.url || '').trim(),
    proofMimeType: String(submission.proof?.mimeType || '').trim(),
    approveUrl: `/organizer/events/${String(event._id)}/submissions/${String(submission._id)}/approve`,
    rejectUrl: `/organizer/events/${String(event._id)}/submissions/${String(submission._id)}/reject`,
    actionHref: `/organizer/events/${String(event._id)}/submissions/${String(submission._id)}/review`,
    eventProofsHref: `/organizer/events/${String(event._id)}/run-proofs/review${buildStatusQuery(submission.status)}`
  };
}

function buildCounts(items) {
  return items.reduce((acc, item) => {
    acc.total += 1;
    if (item.status === 'submitted') acc.submitted += 1;
    if (item.status === 'approved') acc.approved += 1;
    if (item.status === 'rejected') acc.rejected += 1;
    if (item.submissionKind === 'standard') acc.standard += 1;
    if (item.submissionKind === 'accumulated') acc.accumulated += 1;
    return acc;
  }, {
    total: 0,
    submitted: 0,
    approved: 0,
    rejected: 0,
    standard: 0,
    accumulated: 0
  });
}

function buildSubmissionHubPath(basePath, filters = {}, overrides = {}) {
  const next = { ...filters, ...overrides };
  const params = new URLSearchParams();
  if (next.status && next.status !== 'all') params.set('status', next.status);
  if (next.type && next.type !== 'all') params.set('type', next.type);
  if (next.eventId) params.set('eventId', next.eventId);
  if (next.sort && next.sort !== 'newest') params.set('sort', next.sort);
  if (next.q) params.set('q', next.q);
  if (Number(next.page || 1) > 1) params.set('page', String(next.page));
  if (Number(next.pageSize || DEFAULT_PAGE_SIZE) !== DEFAULT_PAGE_SIZE) {
    params.set('pageSize', String(next.pageSize));
  }
  const query = params.toString();
  return `${basePath}${query ? `?${query}` : ''}`;
}

function getSubmissionSourceLabel(submission = {}) {
  const source = String(submission.source || '').trim().toLowerCase();
  if (source === 'strava') return 'Strava Activity';
  if (Number(submission.ocrData?.confidence || 0) > 0) return 'Activity Screenshot with OCR';
  return 'Activity Screenshot';
}

function buildStatusQuery(status) {
  if (status === 'submitted') return '';
  if (status === 'approved') return '?status=approved';
  if (status === 'rejected') return '?status=rejected';
  return '?status=all';
}

function formatDateTime(value) {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

function formatElapsedMs(value) {
  const totalMs = Number(value || 0);
  if (!Number.isFinite(totalMs) || totalMs <= 0) return 'N/A';
  const totalSeconds = Math.floor(totalMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, '0')).join(':');
}

function normalizeEventIds(values = []) {
  return Array.from(new Set((values || [])
    .map((value) => String(value || '').trim())
    .filter((value) => mongoose.Types.ObjectId.isValid(value))));
}

function clampInt(value, min, max, fallback) {
  const number = Number.parseInt(String(value), 10);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function titleCase(value) {
  return String(value || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

module.exports = {
  listSubmissionHub,
  listSubmissionHubEvents,
  normalizeSubmissionHubFilters,
  buildSubmissionHubPath
};
