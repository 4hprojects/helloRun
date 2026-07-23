'use strict';

const mongoose = require('mongoose');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const Submission = require('../models/Submission');
const AccumulatedActivitySubmission = require('../models/AccumulatedActivitySubmission');

const EVENT_LIST_STATUSES = Object.freeze(['draft', 'pending_review', 'published', 'closed', 'archived']);
const EVENT_LIST_SORTS = Object.freeze(['attention', 'newest', 'oldest', 'start_asc', 'start_desc']);
const EVENT_LIST_PAGE_SIZES = Object.freeze([25, 50, 100]);

function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizePositiveInt(value, fallback = 1) {
  const parsed = Number.parseInt(String(value || ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeOrganizerEventListFilters(query = {}) {
  const status = EVENT_LIST_STATUSES.includes(String(query.status || '')) ? String(query.status) : '';
  const sort = EVENT_LIST_SORTS.includes(String(query.sort || '')) ? String(query.sort) : 'attention';
  const requestedPageSize = normalizePositiveInt(query.perPage, 25);
  const perPage = EVENT_LIST_PAGE_SIZES.includes(requestedPageSize) ? requestedPageSize : 25;
  return {
    q: typeof query.q === 'string' ? query.q.trim().slice(0, 80) : '',
    status,
    sort,
    perPage,
    page: normalizePositiveInt(query.page, 1)
  };
}

function buildOrganizerEventListPath(filters = {}, overrides = {}) {
  const next = { ...filters, ...overrides };
  const params = new URLSearchParams();
  if (next.q) params.set('q', String(next.q));
  if (next.status) params.set('status', String(next.status));
  if (next.sort && next.sort !== 'attention') params.set('sort', String(next.sort));
  if (Number(next.perPage || 25) !== 25) params.set('perPage', String(next.perPage));
  if (Number(next.page || 1) > 1) params.set('page', String(next.page));
  const query = params.toString();
  return `/organizer/events${query ? `?${query}` : ''}`;
}

function getEventListSort(sort) {
  const stable = { _id: 1 };
  if (sort === 'newest') return { createdAt: -1, ...stable };
  if (sort === 'oldest') return { createdAt: 1, ...stable };
  if (sort === 'start_asc') return { eventStartAt: 1, createdAt: -1, ...stable };
  if (sort === 'start_desc') return { eventStartAt: -1, createdAt: -1, ...stable };
  return { attentionRank: 1, totalPendingWork: -1, updatedAt: -1, ...stable };
}

function buildEventRowsPipeline({ organizerId, filters, skip = 0, limit = 25, collections = {} }) {
  const match = {
    organizerId,
    isDeleted: { $ne: true },
    status: filters.status ? filters.status : { $ne: 'archived' }
  };
  if (filters.q) {
    const search = new RegExp(escapeRegex(filters.q), 'i');
    match.$or = [
      { title: search }, { organiserName: search }, { slug: search },
      { referenceCode: search }, { venueName: search }, { city: search }, { country: search }
    ];
  }

  const registrationCollection = collections.registrations || Registration.collection.name;
  const submissionCollection = collections.submissions || Submission.collection.name;
  const accumulatedCollection = collections.accumulated || AccumulatedActivitySubmission.collection.name;

  return [
    { $match: match },
    {
      $lookup: {
        from: registrationCollection,
        let: { eventId: '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$eventId', '$$eventId'] } } },
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              pendingPayments: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'proof_submitted'] }, 1, 0] } }
            }
          }
        ],
        as: 'registrationMetrics'
      }
    },
    {
      $lookup: {
        from: submissionCollection,
        let: { eventId: '$_id' },
        pipeline: [
          { $match: { $expr: { $and: [{ $eq: ['$eventId', '$$eventId'] }, { $eq: ['$status', 'submitted'] }] } } },
          { $count: 'total' }
        ],
        as: 'standardPendingMetrics'
      }
    },
    {
      $lookup: {
        from: accumulatedCollection,
        let: { eventId: '$_id' },
        pipeline: [
          { $match: { $expr: { $and: [{ $eq: ['$eventId', '$$eventId'] }, { $eq: ['$status', 'submitted'] }] } } },
          { $count: 'total' }
        ],
        as: 'accumulatedPendingMetrics'
      }
    },
    {
      $set: {
        registrationCount: { $ifNull: [{ $arrayElemAt: ['$registrationMetrics.total', 0] }, 0] },
        pendingPaymentCount: { $ifNull: [{ $arrayElemAt: ['$registrationMetrics.pendingPayments', 0] }, 0] },
        standardPendingResultCount: { $ifNull: [{ $arrayElemAt: ['$standardPendingMetrics.total', 0] }, 0] },
        accumulatedPendingResultCount: { $ifNull: [{ $arrayElemAt: ['$accumulatedPendingMetrics.total', 0] }, 0] }
      }
    },
    { $set: { pendingResultCount: { $add: ['$standardPendingResultCount', '$accumulatedPendingResultCount'] } } },
    { $set: { totalPendingWork: { $add: ['$pendingPaymentCount', '$pendingResultCount'] } } },
    {
      $set: {
        attentionRank: {
          $switch: {
            branches: [
              { case: { $gt: ['$totalPendingWork', 0] }, then: 0 },
              { case: { $eq: ['$status', 'draft'] }, then: 1 },
              { case: { $eq: ['$status', 'pending_review'] }, then: 2 },
              { case: { $eq: ['$status', 'published'] }, then: 3 },
              { case: { $eq: ['$status', 'closed'] }, then: 4 },
              { case: { $eq: ['$status', 'archived'] }, then: 5 }
            ],
            default: 6
          }
        }
      }
    },
    { $unset: ['registrationMetrics', 'standardPendingMetrics', 'accumulatedPendingMetrics'] },
    { $sort: getEventListSort(filters.sort) },
    { $skip: Math.max(0, Number(skip) || 0) },
    { $limit: Math.max(1, Number(limit) || 25) }
  ];
}

function mapPortfolioCounts(rows = []) {
  const counts = { total: 0, draft: 0, pending_review: 0, published: 0, closed: 0, archived: 0 };
  for (const row of rows) {
    const key = String(row?._id || '');
    const count = Number(row?.count || 0);
    if (Object.hasOwn(counts, key)) counts[key] = count;
  }
  // "Total" is the default operational portfolio and intentionally excludes
  // archived events. Archived records remain available through their own filter.
  counts.total = counts.draft + counts.pending_review + counts.published + counts.closed;
  return counts;
}

function resolveEventFormat(event = {}) {
  const allowed = Array.isArray(event.eventTypesAllowed) ? event.eventTypesAllowed.filter(Boolean) : [];
  const formats = allowed.length ? allowed : [event.eventType].filter(Boolean);
  if (formats.length > 1 || formats.includes('hybrid')) return 'Hybrid';
  if (formats.includes('onsite')) return 'Onsite';
  return 'Virtual';
}

function mapOrganizerEventListItem(event = {}) {
  const status = String(event.status || 'draft');
  const registrationCount = Number(event.registrationCount || 0);
  const pendingPaymentCount = Number(event.pendingPaymentCount || 0);
  const pendingResultCount = Number(event.pendingResultCount || 0);
  const attention = [];
  if (pendingPaymentCount > 0) attention.push(`${pendingPaymentCount} payment review${pendingPaymentCount === 1 ? '' : 's'} needed`);
  if (pendingResultCount > 0) attention.push(`${pendingResultCount} result review${pendingResultCount === 1 ? '' : 's'} needed`);
  if (!attention.length && status === 'draft') attention.push('Continue draft');
  if (!attention.length && status === 'pending_review') attention.push('Awaiting admin review');

  const formatLabel = resolveEventFormat(event);
  const place = [event.venueName, event.city, event.country].filter(Boolean).join(', ');
  const locationLabel = formatLabel === 'Virtual' && !place ? 'Virtual event' : (place || `${formatLabel} event`);
  const id = String(event._id || '');
  return {
    ...event,
    id,
    status,
    statusLabel: status === 'pending_review' ? 'Pending Review' : status.charAt(0).toUpperCase() + status.slice(1),
    formatLabel,
    locationLabel,
    registrationCount,
    pendingPaymentCount,
    pendingResultCount,
    totalPendingWork: pendingPaymentCount + pendingResultCount,
    actionCount: 1 + Number(pendingPaymentCount > 0) + Number(pendingResultCount > 0),
    attention,
    manageHref: `/organizer/events/${id}`,
    registrantsHref: `/organizer/events/${id}/registrants`,
    paymentReviewHref: `/organizer/events/${id}/payment-proofs/review`,
    resultReviewHref: `/organizer/events/${id}/run-proofs/review`
  };
}

async function listOrganizerEvents(organizerId, rawFilters = {}, dependencies = {}) {
  const EventModel = dependencies.EventModel || Event;
  const filters = normalizeOrganizerEventListFilters(rawFilters);
  const normalizedOrganizerId = mongoose.Types.ObjectId.isValid(organizerId)
    ? new mongoose.Types.ObjectId(String(organizerId))
    : organizerId;
  const baseMatch = { organizerId: normalizedOrganizerId, isDeleted: { $ne: true } };
  const filteredMatch = {
    ...baseMatch,
    status: filters.status ? filters.status : { $ne: 'archived' }
  };
  if (filters.q) {
    const search = new RegExp(escapeRegex(filters.q), 'i');
    filteredMatch.$or = [
      { title: search }, { organiserName: search }, { slug: search }, { referenceCode: search },
      { venueName: search }, { city: search }, { country: search }
    ];
  }

  const [totalItems, portfolioRows] = await Promise.all([
    EventModel.countDocuments(filteredMatch),
    EventModel.aggregate([
      { $match: baseMatch },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ])
  ]);
  const totalPages = Math.max(1, Math.ceil(totalItems / filters.perPage));
  const page = Math.min(filters.page, totalPages);
  const skip = (page - 1) * filters.perPage;
  const pipeline = buildEventRowsPipeline({
    organizerId: normalizedOrganizerId,
    filters,
    skip,
    limit: filters.perPage,
    collections: dependencies.collections
  });
  const rows = totalItems ? await EventModel.aggregate(pipeline) : [];
  const paginationFilters = { ...filters, page };
  return {
    filters: paginationFilters,
    events: rows.map(mapOrganizerEventListItem),
    portfolioCounts: mapPortfolioCounts(portfolioRows),
    pagination: {
      page,
      perPage: filters.perPage,
      totalItems,
      totalPages,
      start: totalItems ? skip + 1 : 0,
      end: totalItems ? Math.min(skip + rows.length, totalItems) : 0,
      prevHref: page > 1 ? buildOrganizerEventListPath(paginationFilters, { page: page - 1 }) : '',
      nextHref: page < totalPages ? buildOrganizerEventListPath(paginationFilters, { page: page + 1 }) : ''
    },
    statusLinks: {
      total: buildOrganizerEventListPath(paginationFilters, { status: '', page: 1 }),
      ...Object.fromEntries(EVENT_LIST_STATUSES.map((status) => [
        status,
        buildOrganizerEventListPath(paginationFilters, { status, page: 1 })
      ]))
    },
    clearHref: '/organizer/events',
    filtersOpen: Boolean(filters.status || filters.sort !== 'attention' || filters.perPage !== 25)
  };
}

module.exports = {
  EVENT_LIST_STATUSES,
  EVENT_LIST_SORTS,
  EVENT_LIST_PAGE_SIZES,
  normalizeOrganizerEventListFilters,
  buildOrganizerEventListPath,
  getEventListSort,
  buildEventRowsPipeline,
  mapPortfolioCounts,
  mapOrganizerEventListItem,
  listOrganizerEvents
};
