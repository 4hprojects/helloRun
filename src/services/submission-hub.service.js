const mongoose = require('mongoose');
const Submission = require('../models/Submission');
const AccumulatedActivitySubmission = require('../models/AccumulatedActivitySubmission');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const { buildSubmissionReviewSignal } = require('../utils/submission-review-labels');

const VALID_STATUSES = new Set(['all', 'submitted', 'approved', 'rejected']);
const VALID_TYPES = new Set(['all', 'standard', 'accumulated']);
const VALID_SORTS = new Set(['newest', 'oldest']);
const VALID_PAGE_SIZES = new Set([25, 50, 100]);
const DEFAULT_PAGE_SIZE = 50;

function normalizeSubmissionHubFilters(query = {}, defaults = {}) {
  const defaultStatus = VALID_STATUSES.has(defaults.status) ? defaults.status : 'all';
  const defaultSort = VALID_SORTS.has(defaults.sort) ? defaults.sort : 'newest';
  const defaultPageSize = VALID_PAGE_SIZES.has(Number(defaults.pageSize))
    ? Number(defaults.pageSize)
    : DEFAULT_PAGE_SIZE;
  const status = VALID_STATUSES.has(String(query.status || '').trim())
    ? String(query.status).trim()
    : defaultStatus;
  const type = VALID_TYPES.has(String(query.type || '').trim())
    ? String(query.type).trim()
    : 'all';
  const sort = VALID_SORTS.has(String(query.sort || '').trim())
    ? String(query.sort).trim()
    : defaultSort;
  const q = typeof query.q === 'string' ? query.q.trim().slice(0, 120) : '';
  const eventId = mongoose.Types.ObjectId.isValid(String(query.eventId || ''))
    ? String(query.eventId)
    : '';
  const requestedPage = Number.parseInt(String(query.page || '1'), 10);
  const requestedPageSize = Number.parseInt(String(query.pageSize || defaultPageSize), 10);

  return {
    status,
    type,
    sort,
    q,
    eventId,
    page: Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1,
    pageSize: VALID_PAGE_SIZES.has(requestedPageSize) ? requestedPageSize : defaultPageSize
  };
}

async function listSubmissionHub(options = {}) {
  const filters = normalizeSubmissionHubFilters(options.filters || {}, options.defaults || {});
  const hasEventScope = Object.prototype.hasOwnProperty.call(options, 'eventIds');
  const eventIds = normalizeEventIds(options.eventIds || []);
  if (hasEventScope && eventIds.length === 0) {
    return {
      filters,
      items: [],
      counts: normalizeCounts(),
      pagination: {
        page: 1,
        totalPages: 1,
        totalItems: 0,
        pageSize: filters.pageSize
      }
    };
  }
  const eventFilterIds = filters.eventId ? [filters.eventId] : eventIds;
  const accessibleSet = eventIds.length ? new Set(eventIds) : null;
  if (filters.eventId && accessibleSet && !accessibleSet.has(filters.eventId)) {
    return emptyHubResult(filters);
  }

  const basePipeline = buildSubmissionHubPipeline({ filters, eventFilterIds });
  const countRows = await Submission.aggregate([
    ...basePipeline,
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        submitted: { $sum: { $cond: [{ $eq: ['$status', 'submitted'] }, 1, 0] } },
        approved: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } },
        rejected: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } },
        standard: { $sum: { $cond: [{ $eq: ['$submissionKind', 'standard'] }, 1, 0] } },
        accumulated: { $sum: { $cond: [{ $eq: ['$submissionKind', 'accumulated'] }, 1, 0] } }
      }
    }
  ]).allowDiskUse(true);
  const counts = normalizeCounts(countRows[0]);
  const totalItems = filters.status === 'all' ? counts.total : counts[filters.status] || 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / filters.pageSize));
  const page = Math.min(filters.page, totalPages);
  const pageStart = (page - 1) * filters.pageSize;
  const direction = filters.sort === 'oldest' ? 1 : -1;
  const statusStage = filters.status === 'all' ? [] : [{ $match: { status: filters.status } }];
  const docs = totalItems
    ? await Submission.aggregate([
      ...basePipeline,
      ...statusStage,
      { $addFields: { _hubSortAt: { $ifNull: ['$submittedAt', '$createdAt'] } } },
      { $sort: { _hubSortAt: direction, _id: direction } },
      { $skip: pageStart },
      { $limit: filters.pageSize },
      { $project: { _hubSortAt: 0 } }
    ]).allowDiskUse(true)
    : [];
  const pagedItems = docs.map((submission) => normalizeSubmissionRow(submission, submission.submissionKind));

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

function buildSubmissionHubPipeline({ filters, eventFilterIds }) {
  const eventObjectIds = eventFilterIds.map((id) => new mongoose.Types.ObjectId(id));
  const match = {
    status: { $in: ['submitted', 'approved', 'rejected'] },
    ...(eventObjectIds.length ? { eventId: { $in: eventObjectIds } } : {})
  };
  const pipeline = filters.type === 'accumulated'
    ? [{ $match: { _id: { $exists: false } } }]
    : [{ $match: match }, { $addFields: { submissionKind: 'standard' } }];

  if (filters.type !== 'standard') {
    pipeline.push({
      $unionWith: {
        coll: AccumulatedActivitySubmission.collection.name,
        pipeline: [{ $match: match }, { $addFields: { submissionKind: 'accumulated' } }]
      }
    });
  }

  pipeline.push(
    {
      $lookup: {
        from: Event.collection.name,
        localField: 'eventId',
        foreignField: '_id',
        as: '_hubEvent'
      }
    },
    { $unwind: '$_hubEvent' },
    { $match: { '_hubEvent.isDeleted': { $ne: true } } },
    {
      $lookup: {
        from: Registration.collection.name,
        localField: 'registrationId',
        foreignField: '_id',
        as: '_hubRegistration'
      }
    },
    { $unwind: '$_hubRegistration' },
    {
      $set: {
        _hubParticipantName: {
          $trim: {
            input: {
              $concat: [
                { $ifNull: ['$_hubRegistration.participant.firstName', ''] },
                ' ',
                { $ifNull: ['$_hubRegistration.participant.lastName', ''] }
              ]
            }
          }
        }
      }
    }
  );

  if (filters.q) {
    const pattern = new RegExp(escapeRegex(filters.q), 'i');
    pipeline.push({
      $match: {
        $or: [
          { '_hubEvent.title': pattern },
          { _hubParticipantName: pattern },
          { '_hubRegistration.participant.email': pattern },
          { '_hubRegistration.confirmationCode': pattern }
        ]
      }
    });
  }

  pipeline.push({
    $set: {
      eventId: '$_hubEvent',
      registrationId: '$_hubRegistration'
    }
  });
  return pipeline;
}

function emptyHubResult(filters) {
  return {
    filters: { ...filters, page: 1 },
    items: [],
    counts: normalizeCounts(),
    pagination: { page: 1, totalPages: 1, totalItems: 0, pageSize: filters.pageSize }
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

  const reviewSignal = buildSubmissionReviewSignal(submission);
  const submittedAt = submission.submittedAt || submission.createdAt || null;
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
    submittedAt,
    submittedAtLabel: formatDateTime(submittedAt),
    waitingLabel: formatWaitingLabel(submittedAt, submission.status),
    reviewedAtLabel: formatDateTime(submission.reviewedAt),
    suspiciousFlag: Boolean(submission.suspiciousFlag),
    suspiciousFlagReason: String(submission.suspiciousFlagReason || '').trim(),
    reviewSignal,
    quickApprovalEligible: submission.status === 'submitted' && !submission.suspiciousFlag && !reviewSignal.label,
    proofUrl: String(submission.proof?.url || '').trim(),
    proofMimeType: String(submission.proof?.mimeType || '').trim(),
    approveUrl: `/organizer/events/${String(event._id)}/submissions/${String(submission._id)}/approve`,
    rejectUrl: `/organizer/events/${String(event._id)}/submissions/${String(submission._id)}/reject`,
    actionHref: `/organizer/events/${String(event._id)}/submissions/${String(submission._id)}/review`,
    eventQueueHref: `/organizer/events/${String(event._id)}/run-proofs/review${buildStatusQuery(submission.status)}`
  };
}

function normalizeCounts(value = {}) {
  return {
    total: Number(value?.total || 0),
    submitted: Number(value?.submitted || 0),
    approved: Number(value?.approved || 0),
    rejected: Number(value?.rejected || 0),
    standard: Number(value?.standard || 0),
    accumulated: Number(value?.accumulated || 0)
  };
}

function buildSubmissionHubPath(basePath, filters = {}, overrides = {}, defaults = {}) {
  const next = { ...filters, ...overrides };
  const defaultStatus = VALID_STATUSES.has(defaults.status) ? defaults.status : 'all';
  const defaultSort = VALID_SORTS.has(defaults.sort) ? defaults.sort : 'newest';
  const defaultPageSize = VALID_PAGE_SIZES.has(Number(defaults.pageSize)) ? Number(defaults.pageSize) : DEFAULT_PAGE_SIZE;
  const params = new URLSearchParams();
  if (next.status && next.status !== defaultStatus) params.set('status', next.status);
  if (next.type && next.type !== 'all') params.set('type', next.type);
  if (next.eventId) params.set('eventId', next.eventId);
  if (next.sort && next.sort !== defaultSort) params.set('sort', next.sort);
  if (next.q) params.set('q', next.q);
  if (Number(next.page || 1) > 1) params.set('page', String(next.page));
  if (Number(next.pageSize || defaultPageSize) !== defaultPageSize) {
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
  const label = date.toLocaleString('en-US', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
  return `${label} PHT`;
}

function formatWaitingLabel(value, status) {
  if (!value || status !== 'submitted') return '';
  const elapsed = Math.max(0, Date.now() - new Date(value).getTime());
  const days = Math.floor(elapsed / 86400000);
  if (days === 0) return 'Today';
  return days === 1 ? 'Waiting 1 day' : `Waiting ${days} days`;
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
