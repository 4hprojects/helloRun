// src/routes/organiser/_shared.js
// Shared imports, constants, utilities, and helpers for all organiser sub-routers

const logger = require('../../utils/logger');
const mongoose = require('mongoose');
const crypto = require('crypto');
const ExcelJS = require('exceljs');
const User = require('../../models/User');
const Event = require('../../models/Event');
const Registration = require('../../models/Registration');
const Submission = require('../../models/Submission');
const AccumulatedActivitySubmission = require('../../models/AccumulatedActivitySubmission');
const OrganiserApplication = require('../../models/OrganiserApplication');
const EventPromotion = require('../../models/EventPromotion');
const uploadService = require('../../services/upload.service');
const communicationService = require('../../services/communication.service');
const {
  notifyWithRetry,
  notifyWithRetryInBackground
} = require('../../services/reliable-communication.service');
const { createRateLimiter } = require('../../middleware/rate-limit.middleware');
const { requireAuth, requireApprovedOrganizer, requireCanCreateEvents, isFullAdminTier } = require('../../middleware/auth.middleware');
const { requireCsrfProtection } = require('../../middleware/csrf.middleware');
const { getCountries, isValidCountryCode, normalizeCountryCode, getCountryName } = require('../../utils/country');
const { DEFAULT_WAIVER_TEMPLATE, normalizeWaiverTemplate } = require('../../utils/waiver');
const { sanitizeHtml, htmlToPlainText } = require('../../utils/sanitize');
const { markdownToHtml } = require('../../utils/markdown');
const { generateUniqueReferenceCode } = require('../../utils/referenceCode');
const { canOrganizerReviewPaymentProof } = require('../../utils/payment-workflow');
const { buildSubmissionReviewSignal, REVIEW_REASON_LABELS } = require('../../utils/submission-review-labels');
const {
  buildPublicEventView,
  renderEventDetailsContent
} = require('../../utils/event-public-view');
const { reviewSubmission } = require('../../services/submission.service');
const { recordCriticalAuditEventInBackground } = require('../../services/critical-audit.service');
const { syncRegistrationPaymentShadow } = require('../../services/registration-payment-shadow.service');
const { recordSyncFailureInBackground } = require('../../services/sync-failure.service');
const {
  evaluateRegistrationAchievementsInBackground,
  getRunnerEarnedBadges
} = require('../../services/achievement.service');
const {
  generateDefaultEventBadges,
  generateDefaultEventBadgesInBackground,
  getEventBadgesByMongoEventId,
  updateEventBadgeDisplay
} = require('../../services/event-badge.service');
const eventFormService = require('../../services/event-form.service');
const { tryAutoApproveEvent } = require('../../services/event-approval.service');
const {
  reviewAccumulatedActivitySubmission,
  getAccumulatedActivitiesForRegistrations,
  buildAccumulatedProgress
} = require('../../services/accumulated-activity.service');
const {
  buildSubmissionHubPath,
  listSubmissionHub,
  listSubmissionHubEvents
} = require('../../services/submission-hub.service');
const {
  AUDIT_GROUP_OPTIONS,
  AUDIT_TARGET_TYPE_OPTIONS,
  buildCriticalAuditPath,
  listCriticalAuditEvents,
  listCriticalAuditSignals,
  normalizeCriticalAuditFilters
} = require('../../services/critical-audit-query.service');
const { getPostgresClient } = require('../../db/postgres');

// ==========================================
// Constants
// ==========================================
const countries = getCountries();
const RACE_DISTANCE_PRESETS = new Set(['3K', '5K', '10K', '21K']);
const MAX_GALLERY_IMAGES = 12;
const PREVIEW_SESSION_TTL_MS = 30 * 60 * 1000;
const MAX_PREVIEW_SESSION_ENTRIES = 5;
const RUN_PROOF_REVIEW_PAGE_SIZE = 50;
const PAYMENT_PROOF_REVIEW_PAGE_SIZE = 50;
const REGISTRANTS_PAGE_SIZE = 100;
const VIRTUAL_COMPLETION_MODES = new Set(['single_activity', 'accumulated_distance']);
const ACCEPTED_RUN_TYPES = new Set(['run', 'walk', 'hike', 'trail_run']);
const RECOGNITION_MODES = new Set(['completion_only', 'completion_with_optional_ranking']);
const LEADERBOARD_MODES = new Set(['finishers', 'top_distance', 'finishers_and_top_distance']);
const FEE_MODES = new Set(['free', 'paid']);
const WAIVER_SANITIZE_OPTIONS = Object.freeze({
  allowedTags: ['div', 'p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'blockquote', 'a'],
  allowedAttributes: {
    a: ['href', 'rel', 'target'],
    div: ['class']
  }
});
const EVENT_DETAILS_SANITIZE_OPTIONS = Object.freeze({
  allowedTags: ['p', 'br', 'strong', 'em', 'u', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'blockquote', 'a', 'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'code'],
  allowedAttributes: {
    a: ['href', 'rel', 'target']
  }
});

// ==========================================
// Rate Limiters
// ==========================================
const paymentReviewActionLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000,
  maxRequests: 60,
  message: 'Too many payment review actions. Please wait before trying again.'
});
const submissionReviewActionLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000,
  maxRequests: 60,
  message: 'Too many submission review actions. Please wait before trying again.'
});
const registrantExportLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  maxRequests: 10,
  message: 'Too many registrant exports. Please wait a few minutes and try again.'
});
const directMessageLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  maxRequests: 20,
  message: 'Too many messages sent. Please wait before messaging more runners.',
  keyFn: (req) => `org-dm|${String(req.session?.userId || req.ip || 'anon')}`
});

// ==========================================
// Sync utilities
// ==========================================
function syncRegistrationPaymentShadowInBackground(registration, context = {}) {
  if (!registration || !registration._id || !process.env.DATABASE_URL) return;
  syncRegistrationPaymentShadow(registration, { operation: 'live_sync' }).catch((error) => {
    logger.error('Supabase registration/payment shadow sync failed:', {
      registrationId: String(registration._id),
      error: error?.message || String(error),
      ...context
    });
    recordSyncFailureInBackground('registration', String(registration._id), error, {
      operation: 'live_sync',
      ...context
    });
  });
}

// ==========================================
// Preview session utilities
// ==========================================
function getPreviewSessionStore(req) {
  if (!req.session) return {};
  const now = Date.now();
  const existing = req.session.eventPreviewDrafts && typeof req.session.eventPreviewDrafts === 'object'
    ? req.session.eventPreviewDrafts
    : {};
  const validEntries = Object.entries(existing)
    .filter(([, entry]) => entry && Number(entry.expiresAt || 0) > now)
    .sort((a, b) => Number(b[1].createdAt || 0) - Number(a[1].createdAt || 0))
    .slice(0, MAX_PREVIEW_SESSION_ENTRIES);
  req.session.eventPreviewDrafts = Object.fromEntries(validEntries);
  return req.session.eventPreviewDrafts;
}

function savePreviewSession(req) {
  return new Promise((resolve, reject) => {
    if (!req.session || typeof req.session.save !== 'function') return resolve();
    req.session.save((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

function buildPreviewBackHref(source, eventId) {
  return source === 'edit' && mongoose.Types.ObjectId.isValid(eventId)
    ? `/organizer/events/${eventId}/edit`
    : '/organizer/create-event';
}

// ==========================================
// Utility functions
// ==========================================
function getRequestIpAddress(req) {
  const forwardedFor = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const directIp = String(req.ip || '').trim();
  return (forwardedFor || directIp).slice(0, 120);
}

function getRequestUserAgent(req) {
  return String(req.get('user-agent') || '').trim().slice(0, 500);
}

// ==========================================
// Helper methods
// ==========================================

function isValidPhone(phone) {
  if (!phone || typeof phone !== 'string') {
    return false;
  }
  const phoneRegex = /^[\d\s\-\+\(\)]+$/;
  const digitsOnly = phone.replace(/\D/g, '');
  return phoneRegex.test(phone) && digitsOnly.length >= 7;
}

function validateFiles(files) {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  const maxSize = parseInt(process.env.UPLOAD_MAX_SIZE) || 5242880; // 5MB

  for (const file of files) {
    if (!allowedTypes.includes(file.mimetype)) {
      return {
        valid: false,
        error: `Invalid file type: ${file.originalname}. Please upload PDF, JPG, PNG, or WebP files only.`
      };
    }
    if (file.size > maxSize) {
      const maxSizeMB = Math.round(maxSize / 1024 / 1024);
      return {
        valid: false,
        error: `File ${file.originalname} exceeds ${maxSizeMB}MB limit.`
      };
    }
  }

  return { valid: true };
}

function wantsJsonResponse(req) {
  const accept = String(req.get('accept') || '');
  const requestedWith = String(req.get('x-requested-with') || '').toLowerCase();
  return requestedWith === 'xmlhttprequest' || accept.includes('application/json');
}

function getPageMessage(query) {
  const msg = typeof query.msg === 'string' ? query.msg.trim() : '';
  if (!msg) return null;
  const type = query.type === 'error' ? 'error' : 'success';
  return { type, text: msg.slice(0, 200) };
}

function normalizeArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return [value];
}

function normalizeProofTypes(value) {
  const allowed = new Set(['gps', 'photo', 'manual']);
  return normalizeArray(value)
    .map((item) => String(item || '').trim())
    .filter((item) => allowed.has(item));
}

function normalizeVirtualCompletionMode(value) {
  const safeValue = String(value || '').trim();
  return VIRTUAL_COMPLETION_MODES.has(safeValue) ? safeValue : 'single_activity';
}

function normalizeRunTypes(value) {
  return normalizeArray(value)
    .map((item) => String(item || '').trim())
    .filter((item) => ACCEPTED_RUN_TYPES.has(item));
}

function normalizeModeValue(value, allowedValues, fallback) {
  const safeValue = String(value || '').trim();
  return allowedValues.has(safeValue) ? safeValue : fallback;
}

function parseOptionalPositiveNumber(value) {
  const safeValue = String(value ?? '').trim();
  if (!safeValue) return null;
  const parsed = Number(safeValue);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeMilestoneDistances(value) {
  const rawValues = normalizeArray(value).join(',');
  const distances = rawValues
    .split(',')
    .map((item) => parseOptionalPositiveNumber(item))
    .filter((item) => Number.isFinite(item) && item > 0);
  return Array.from(new Set(distances)).sort((a, b) => a - b);
}

function normalizeRaceDistanceLabel(value) {
  if (!value) return '';
  const compact = String(value)
    .trim()
    .replace(/\s+/g, '')
    .toUpperCase()
    .replace(/[^0-9A-Z.]/g, '');
  if (!compact || compact.length > 30) return '';
  const numericOnly = compact.match(/^(\d+(?:\.\d+)?)$/);
  if (numericOnly) return `${numericOnly[1]}K`;
  const kmValue = compact.match(/^(\d+(?:\.\d+)?)(KM|K)$/);
  if (kmValue) return `${kmValue[1]}K`;
  return compact;
}

function normalizeRaceDistances(presetValues, customDistancesRaw) {
  const presetDistances = normalizeArray(presetValues).map(normalizeRaceDistanceLabel);
  const customDistances = String(customDistancesRaw || '')
    .split(',')
    .map((item) => normalizeRaceDistanceLabel(item));
  return sortRaceDistancesDesc(Array.from(new Set([...presetDistances, ...customDistances].filter(Boolean))));
}

function sortRaceDistancesDesc(values = []) {
  const toNumericDistance = (value) => {
    const match = String(value || '').toUpperCase().match(/^(\d+(?:\.\d+)?)(K|KM|MI|M)?$/);
    if (!match) return Number.NEGATIVE_INFINITY;
    const amount = Number.parseFloat(match[1]);
    if (!Number.isFinite(amount)) return Number.NEGATIVE_INFINITY;
    const unit = match[2] || 'K';
    if (unit === 'MI' || unit === 'M') {
      return amount * 1.60934;
    }
    return amount;
  };

  return values
    .slice()
    .sort((a, b) => {
      const diff = toNumericDistance(b) - toNumericDistance(a);
      if (diff !== 0) return diff;
      return String(b || '').localeCompare(String(a || ''), undefined, { numeric: true, sensitivity: 'base' });
    });
}

function normalizeGalleryImageUrls(rawValue) {
  const combined = normalizeArray(rawValue).join('\n');
  const normalized = combined
    .split(/\r?\n|,/)
    .map((item) => String(item || '').trim())
    .filter(Boolean);
  return Array.from(new Set(normalized));
}

function getRegistrantFilterContext(event, queryParams = {}) {
  const selectedMode = ['virtual', 'onsite'].includes(queryParams.mode)
    ? queryParams.mode
    : '';
  const eventRaceDistances = Array.isArray(event.raceDistances) ? event.raceDistances : [];
  const selectedDistance = eventRaceDistances.includes(queryParams.distance)
    ? queryParams.distance
    : '';
  const searchQuery = typeof queryParams.q === 'string' ? queryParams.q.trim().slice(0, 80) : '';
  const selectedPaymentStatus = ['unpaid', 'proof_submitted', 'proof_rejected', 'paid', 'failed', 'refunded'].includes(queryParams.payment)
    ? queryParams.payment
    : '';
  const selectedResultStatus = ['submitted', 'approved', 'rejected'].includes(queryParams.result)
    ? queryParams.result
    : '';
  const requestedPageValue = Number.parseInt(String(queryParams.page || '1'), 10);
  const requestedPage = Number.isFinite(requestedPageValue) && requestedPageValue > 0 ? requestedPageValue : 1;

  const query = { eventId: event._id };
  if (selectedMode) {
    query.participationMode = selectedMode;
  }
  if (selectedDistance) {
    query.raceDistance = selectedDistance;
  }
  if (selectedPaymentStatus) {
    query.paymentStatus = selectedPaymentStatus;
  }
  if (searchQuery) {
    const safePattern = new RegExp(escapeRegex(searchQuery), 'i');
    query.$or = [
      { confirmationCode: safePattern },
      { 'participant.firstName': safePattern },
      { 'participant.lastName': safePattern },
      { 'participant.email': safePattern },
      { 'participant.emergencyContactName': safePattern },
      { 'participant.emergencyContactNumber': safePattern },
      { 'participant.runningGroup': safePattern },
      { raceDistance: safePattern }
    ];
  }

  return {
    query,
    selectedMode,
    selectedDistance,
    selectedPaymentStatus,
    selectedResultStatus,
    eventRaceDistances,
    searchQuery,
    requestedPage
  };
}

async function getEventRegistrationSummaryCounts(eventId) {
  const [summary = {}] = await Registration.aggregate([
    { $match: { eventId } },
    {
      $group: {
        _id: null,
        totalRegistrants: { $sum: 1 },
        virtualCount: {
          $sum: { $cond: [{ $eq: ['$participationMode', 'virtual'] }, 1, 0] }
        },
        onsiteCount: {
          $sum: { $cond: [{ $eq: ['$participationMode', 'onsite'] }, 1, 0] }
        },
        proofSubmittedCount: {
          $sum: { $cond: [{ $eq: ['$paymentStatus', 'proof_submitted'] }, 1, 0] }
        },
        paidCount: {
          $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, 1, 0] }
        },
        proofRejectedCount: {
          $sum: { $cond: [{ $eq: ['$paymentStatus', 'proof_rejected'] }, 1, 0] }
        },
        unpaidCount: {
          $sum: {
            $cond: [
              { $and: [{ $eq: ['$status', 'confirmed'] }, { $eq: ['$paymentStatus', 'unpaid'] }] },
              1,
              0
            ]
          }
        }
      }
    }
  ]);

  return {
    totalRegistrants: Number(summary.totalRegistrants || 0),
    virtualCount: Number(summary.virtualCount || 0),
    onsiteCount: Number(summary.onsiteCount || 0),
    proofSubmittedCount: Number(summary.proofSubmittedCount || 0),
    paidCount: Number(summary.paidCount || 0),
    proofRejectedCount: Number(summary.proofRejectedCount || 0),
    unpaidCount: Number(summary.unpaidCount || 0)
  };
}

async function getEventSubmissionSummaryCounts(Model, eventId) {
  const [summary = {}] = await Model.aggregate([
    { $match: { eventId } },
    {
      $group: {
        _id: null,
        submitted: {
          $sum: { $cond: [{ $eq: ['$status', 'submitted'] }, 1, 0] }
        },
        approved: {
          $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
        },
        rejected: {
          $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] }
        }
      }
    }
  ]);

  return {
    submitted: Number(summary.submitted || 0),
    approved: Number(summary.approved || 0),
    rejected: Number(summary.rejected || 0)
  };
}

async function getRegistrationIdsWithSubmissionStatus(eventId, status) {
  const [standardRows, accumulatedRows] = await Promise.all([
    Submission.find({ eventId, status }).select('registrationId').lean(),
    AccumulatedActivitySubmission.find({ eventId, status }).select('registrationId').lean()
  ]);
  const ids = new Set();
  standardRows.forEach((item) => {
    if (item.registrationId) ids.add(String(item.registrationId));
  });
  accumulatedRows.forEach((item) => {
    if (item.registrationId) ids.add(String(item.registrationId));
  });
  return Array.from(ids);
}

function buildRegistrantListPath(eventId, filterContext = {}, overrides = {}) {
  const next = {
    mode: filterContext.selectedMode,
    distance: filterContext.selectedDistance,
    payment: filterContext.selectedPaymentStatus,
    result: filterContext.selectedResultStatus,
    q: filterContext.searchQuery,
    page: filterContext.requestedPage,
    ...overrides
  };
  const params = new URLSearchParams();
  if (next.mode) params.set('mode', next.mode);
  if (next.distance) params.set('distance', next.distance);
  if (next.payment) params.set('payment', next.payment);
  if (next.result) params.set('result', next.result);
  if (next.q) params.set('q', next.q);
  if (Number(next.page || 1) > 1) params.set('page', String(next.page));
  const query = params.toString();
  return `/organizer/events/${String(eventId)}/registrants${query ? `?${query}` : ''}`;
}

function normalizePaymentProofReviewFilters(queryParams = {}) {
  const status = ['pending', 'approved', 'rejected', 'all'].includes(String(queryParams.status || '').trim())
    ? String(queryParams.status).trim()
    : 'pending';
  const q = typeof queryParams.q === 'string' ? queryParams.q.trim().slice(0, 80) : '';
  const requestedPage = Number.parseInt(String(queryParams.page || '1'), 10);
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  return { status, q, page };
}

function getPaymentProofReviewStatusQuery(status) {
  if (status === 'approved') return 'paid';
  if (status === 'rejected') return 'proof_rejected';
  if (status === 'all') return { $in: ['proof_submitted', 'paid', 'proof_rejected'] };
  return 'proof_submitted';
}

async function getEventAuditTargetIds(eventId) {
  const eventIdString = String(eventId || '');
  const [registrations, submissions, accumulatedActivities] = await Promise.all([
    Registration.find({ eventId }).select('_id').limit(5000).lean(),
    Submission.find({ eventId }).select('_id').limit(5000).lean(),
    AccumulatedActivitySubmission.find({ eventId }).select('_id').limit(5000).lean()
  ]);

  return Array.from(new Set([
    eventIdString,
    ...registrations.map((item) => String(item._id)),
    ...submissions.map((item) => String(item._id)),
    ...accumulatedActivities.map((item) => String(item._id))
  ].filter(Boolean)));
}

function buildPaymentProofReviewPath(eventId, filters = {}, overrides = {}) {
  const next = { ...filters, ...overrides };
  const params = new URLSearchParams();
  if (next.status && next.status !== 'pending') params.set('status', next.status);
  if (next.q) params.set('q', next.q);
  if (Number(next.page || 1) > 1) params.set('page', String(next.page));
  const query = params.toString();
  return `/organizer/events/${String(eventId)}/payment-proofs/review${query ? `?${query}` : ''}`;
}

function buildPaymentProofReviewRow(registration, event) {
  const participant = registration.participant || {};
  const reviewer = registration.paymentReviewedBy || null;
  const reviewerName = reviewer
    ? [reviewer.firstName, reviewer.lastName].filter(Boolean).join(' ').trim() || reviewer.email || ''
    : '';
  const paymentStatus = registration.paymentStatus || '';

  return {
    id: String(registration._id),
    confirmationCode: registration.confirmationCode || 'N/A',
    participantName: [participant.firstName, participant.lastName].filter(Boolean).join(' ').trim() || 'N/A',
    participantEmail: participant.email || 'N/A',
    participantMobile: participant.mobile || '',
    raceDistance: registration.raceDistance || 'N/A',
    participationMode: registration.participationMode || 'N/A',
    paymentStatus,
    paymentStatusLabel: formatPaymentProofStatusLabel(paymentStatus),
    isPending: paymentStatus === 'proof_submitted',
    proofUrl: registration.paymentProof?.url || '',
    proofUploadedAt: registration.paymentProof?.uploadedAt || null,
    proofUploadedAtLabel: formatDateTime(registration.paymentProof?.uploadedAt),
    proofMimeType: registration.paymentProof?.mimeType || '',
    expectedPaymentLabel: formatExpectedPaymentLabel(registration, event),
    payeeName: event.paymentAccountName || '',
    paymentInstructions: event.paymentInstructions || '',
    reviewedAtLabel: formatDateTime(registration.paymentReviewedAt),
    reviewerName,
    reviewerEmail: reviewer?.email || '',
    rejectionReason: registration.paymentRejectionReason || '',
    reviewNotes: registration.paymentReviewNotes || ''
  };
}

function formatPaymentProofStatusLabel(value) {
  if (value === 'proof_submitted') return 'Pending Review';
  if (value === 'proof_rejected') return 'Rejected';
  if (value === 'paid') return 'Approved';
  return String(value || 'N/A').replace(/_/g, ' ');
}

function normalizeRunProofReviewFilters(queryParams = {}) {
  const status = ['pending', 'approved', 'auto-approved', 'rejected', 'all'].includes(String(queryParams.status || '').trim())
    ? String(queryParams.status).trim()
    : 'pending';
  const hasSort = ['oldest', 'newest'].includes(String(queryParams.sort || '').trim());
  const sort = hasSort
    ? String(queryParams.sort).trim()
    : status === 'pending' ? 'oldest' : 'newest';
  const q = typeof queryParams.q === 'string' ? queryParams.q.trim().slice(0, 120) : '';
  const requestedPage = Number.parseInt(String(queryParams.page || '1'), 10);
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  return { status, sort, q, page };
}

function getRunProofReviewStatusQuery(status) {
  if (status === 'approved') return { status: 'approved' };
  if (status === 'auto-approved') {
    return {
      status: 'approved',
      $or: [{ reviewedBy: null }, { reviewedBy: { $exists: false } }]
    };
  }
  if (status === 'rejected') return { status: 'rejected' };
  if (status === 'all') return { status: { $in: ['submitted', 'approved', 'rejected'] } };
  return { status: 'submitted' };
}

async function buildRunProofReviewQuery(eventId, filters = {}) {
  const query = { eventId, ...getRunProofReviewStatusQuery(filters.status) };
  if (!filters.q) return query;

  const searchPattern = new RegExp(escapeRegex(filters.q), 'i');
  const matchingRegistrations = await Registration.find({
    eventId,
    $or: [
      { confirmationCode: searchPattern },
      { 'participant.firstName': searchPattern },
      { 'participant.lastName': searchPattern },
      { 'participant.email': searchPattern }
    ]
  })
    .select('_id')
    .lean();

  return {
    ...query,
    registrationId: { $in: matchingRegistrations.map((item) => item._id) }
  };
}

function getRunProofReviewSortSpec(sort) {
  const direction = sort === 'newest' ? -1 : 1;
  return { submittedAt: direction, _id: direction };
}

function mergeRunProofReviewDocs(standardDocs = [], accumulatedDocs = [], sort = 'oldest') {
  const merged = [];
  let standardIndex = 0;
  let accumulatedIndex = 0;

  while (standardIndex < standardDocs.length || accumulatedIndex < accumulatedDocs.length) {
    const standard = standardDocs[standardIndex];
    const accumulated = accumulatedDocs[accumulatedIndex];
    if (!accumulated || (standard && compareRunProofReviewDocs(standard, accumulated, sort) <= 0)) {
      merged.push({ submission: standard, submissionKind: 'standard' });
      standardIndex += 1;
    } else {
      merged.push({ submission: accumulated, submissionKind: 'accumulated' });
      accumulatedIndex += 1;
    }
  }

  return merged;
}

function compareRunProofReviewDocs(a, b, sort = 'oldest') {
  const direction = sort === 'newest' ? -1 : 1;
  const aTime = getRunProofReviewSortTime(a);
  const bTime = getRunProofReviewSortTime(b);
  if (aTime !== bTime) return (aTime - bTime) * direction;
  return String(a?._id || '').localeCompare(String(b?._id || '')) * direction;
}

function getRunProofReviewSortTime(submission) {
  const value = submission?.submittedAt || submission?.createdAt || 0;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function buildRunProofReviewPath(eventId, filters = {}, overrides = {}) {
  const next = { ...filters, ...overrides };
  const params = new URLSearchParams();
  if (next.status && next.status !== 'pending') params.set('status', next.status);
  if (next.sort && next.sort !== (next.status === 'pending' || !next.status ? 'oldest' : 'newest')) {
    params.set('sort', next.sort);
  }
  if (next.q) params.set('q', next.q);
  if (Number(next.page || 1) > 1) params.set('page', String(next.page));
  const query = params.toString();
  return `/organizer/events/${String(eventId)}/run-proofs/review${query ? `?${query}` : ''}`;
}

function buildRunProofQueueContextParams(filters = {}) {
  const params = new URLSearchParams();
  params.set('queueStatus', filters.status || 'pending');
  params.set('queueSort', filters.sort || ((filters.status || 'pending') === 'pending' ? 'oldest' : 'newest'));
  if (filters.q) params.set('queueQ', filters.q);
  if (Number(filters.page || 1) > 1) params.set('queuePage', String(filters.page));
  return params;
}

function buildSubmissionReviewPath(eventId, submissionId, queryParams = {}, message = {}) {
  const queueContext = normalizeRunProofQueueContext(queryParams);
  const params = buildRunProofQueueContextParams(queueContext);
  if (message.type) params.set('type', message.type);
  if (message.msg) params.set('msg', message.msg);
  const query = params.toString();
  return `/organizer/events/${String(eventId)}/submissions/${String(submissionId)}/review${query ? `?${query}` : ''}`;
}

function normalizeRunProofQueueContext(queryParams = {}) {
  return normalizeRunProofReviewFilters({
    status: queryParams.queueStatus,
    sort: queryParams.queueSort,
    q: queryParams.queueQ,
    page: queryParams.queuePage
  });
}

function buildRunProofReviewRow(submission, event, filters, submissionKind) {
  const registration = submission.registrationId || {};
  const participant = registration.participant || {};
  const reviewer = submission.reviewedBy || null;
  const reviewerName = reviewer
    ? [reviewer.firstName, reviewer.lastName].filter(Boolean).join(' ').trim() || reviewer.email || ''
    : '';
  const mappedSubmission = mapSubmissionForRegistrant(submission, {
    isAccumulatedActivity: submissionKind === 'accumulated'
  });
  const proofUrl = submission.proof?.url || '';
  const proofMimeType = String(submission.proof?.mimeType || '');
  const proofPath = String(proofUrl).split('?')[0];
  const isImageProof = Boolean(proofUrl && (proofMimeType.startsWith('image/') || /\.(png|jpe?g|gif|webp)$/i.test(proofPath)));
  const hasOcrMismatch = Boolean(
    submission.ocrData?.distanceMismatch ||
    submission.ocrData?.timeMismatch ||
    submission.ocrData?.elevationMismatch ||
    submission.ocrData?.stepsMismatch ||
    submission.ocrData?.dateMismatch ||
    submission.ocrData?.locationMismatch ||
    submission.ocrData?.runTypeMismatch ||
    submission.ocrData?.nameMatchStatus === 'mismatched'
  );
  const queueContext = buildRunProofQueueContextParams(filters).toString();
  const isAutoApproved = submission.status === 'approved' && !submission.reviewedBy;
  const statusLabel = submission.status === 'submitted'
    ? 'Pending Review'
    : isAutoApproved
      ? 'Auto-approved'
      : String(submission.status || 'N/A');

  return {
    id: String(submission._id),
    submissionKind,
    submissionTypeLabel: submissionKind === 'accumulated' ? 'Accumulated Activity' : 'Run Result',
    participantName: [participant.firstName, participant.lastName].filter(Boolean).join(' ').trim() || 'N/A',
    participantEmail: participant.email || 'N/A',
    confirmationCode: registration.confirmationCode || 'N/A',
    raceDistance: registration.raceDistance || submission.raceDistance || 'N/A',
    participationMode: registration.participationMode || submission.participationMode || 'N/A',
    status: submission.status || 'submitted',
    statusLabel,
    statusClass: isAutoApproved ? 'auto-approved' : (submission.status || 'submitted'),
    isAutoApproved,
    submittedAt: submission.submittedAt || submission.createdAt || null,
    submittedAtLabel: mappedSubmission.submittedAtLabel,
    runDateLabel: mappedSubmission.runDateLabel,
    distanceLabel: `${Number(submission.distanceKm || 0).toFixed(2)} km`,
    elapsedLabel: mappedSubmission.elapsedLabel || 'N/A',
    proofTypeLabel: String(submission.proofType || 'manual').toUpperCase(),
    sourceLabel: submission.source === 'strava' ? 'Strava' : 'Manual upload',
    reviewSourceLabel: isAutoApproved ? 'Auto-approved by validation' : (submission.status === 'submitted' ? 'Awaiting organizer review' : 'Organizer reviewed'),
    proofUrl,
    isImageProof,
    suspiciousFlag: mappedSubmission.suspiciousFlag,
    suspiciousFlagReason: mappedSubmission.suspiciousFlagReason,
    reviewSignal: mappedSubmission.reviewSignal,
    hasOcrMismatch,
    reviewedAtLabel: mappedSubmission.reviewedAtLabel,
    reviewerName,
    reviewerEmail: reviewer?.email || '',
    rejectionReason: submission.rejectionReason || '',
    reviewNotes: submission.reviewNotes || '',
    actionHref: `/organizer/events/${String(event._id)}/submissions/${String(submission._id)}/review${queueContext ? `?${queueContext}` : ''}`,
    approveActionHref: `/organizer/events/${String(event._id)}/submissions/${String(submission._id)}/approve`
  };
}

function formatExpectedPaymentLabel(registration, event) {
  const currency = registration.paymentCurrency || event.feeCurrency || registration.addOnsCurrency || 'PHP';
  const savedPaymentAmount = Number(registration.paymentAmountDue);
  const snapshotAmount = Number(registration.pricingSnapshot?.amount);
  const eventFee = Number.isFinite(savedPaymentAmount) && savedPaymentAmount > 0
    ? savedPaymentAmount
    : Number.isFinite(snapshotAmount) && snapshotAmount > 0
      ? snapshotAmount
      : Number(event.feeAmount || 0);
  const addOnsSubtotal = Number(registration.addOnsSubtotal || 0);
  const total = Math.max(0, eventFee) + Math.max(0, addOnsSubtotal);
  if (Number.isFinite(total) && total > 0) {
    return `${currency} ${total.toFixed(2)}`;
  }
  if (event.feeMode === 'paid') {
    return `${currency} ${Math.max(0, eventFee || 0).toFixed(2)}`;
  }
  return 'No payment required';
}

function buildRegistrantExportQuery(filterContext) {
  const params = new URLSearchParams();
  if (filterContext.selectedMode) params.set('mode', filterContext.selectedMode);
  if (filterContext.selectedDistance) params.set('distance', filterContext.selectedDistance);
  if (filterContext.selectedPaymentStatus) params.set('payment', filterContext.selectedPaymentStatus);
  if (filterContext.selectedResultStatus) params.set('result', filterContext.selectedResultStatus);
  if (filterContext.searchQuery) params.set('q', filterContext.searchQuery);
  return params.toString();
}

async function getSubmissionReviewContext(event, submissionId, queryParams = {}) {
  if (!event || !mongoose.Types.ObjectId.isValid(submissionId)) return null;
  const eventId = event._id;
  const basePopulate = [
    { path: 'reviewedBy', select: 'firstName lastName email' },
    { path: 'runnerId', select: 'firstName lastName email mobile country gender' },
    { path: 'registrationId', select: 'participant confirmationCode raceDistance participationMode status paymentStatus registeredAt' }
  ];

  let submission = await Submission.findOne({ _id: submissionId, eventId })
    .populate(basePopulate)
    .lean();
  let submissionKind = 'standard';

  if (!submission) {
    submission = await AccumulatedActivitySubmission.findOne({ _id: submissionId, eventId })
      .populate(basePopulate)
      .lean();
    submissionKind = submission ? 'accumulated' : '';
  }
  if (!submission) return null;

  const registration = submission.registrationId || null;
  const participant = registration?.participant || {};
  const runner = submission.runnerId || {};
  const mappedSubmission = mapSubmissionForRegistrant(submission, {
    isAccumulatedActivity: submissionKind === 'accumulated'
  });

  const accumulatedActivities = submissionKind === 'accumulated' && registration?._id
    ? await AccumulatedActivitySubmission.find({ registrationId: registration._id })
      .sort({ submittedAt: -1, createdAt: -1 })
      .lean()
    : [];

  const queueContext = normalizeRunProofQueueContext(queryParams);
  const queueContextParams = buildRunProofQueueContextParams(queueContext);

  return {
    submission: mappedSubmission,
    submissionKind,
    participant: {
      name: [participant.firstName, participant.lastName].filter(Boolean).join(' ').trim() ||
        [runner.firstName, runner.lastName].filter(Boolean).join(' ').trim() ||
        'N/A',
      email: participant.email || runner.email || 'N/A',
      mobile: participant.mobile || runner.mobile || 'N/A',
      countryLabel: getCountryName(participant.country || runner.country) || participant.country || runner.country || 'N/A',
      genderLabel: formatGenderLabel(participant.gender || runner.gender) || 'N/A'
    },
    registration: registration ? {
      id: String(registration._id),
      confirmationCode: registration.confirmationCode || 'N/A',
      raceDistance: registration.raceDistance || submission.raceDistance || 'N/A',
      participationMode: registration.participationMode || submission.participationMode || 'N/A',
      status: registration.status || 'N/A',
      paymentStatus: registration.paymentStatus || 'N/A',
      registeredAtLabel: formatDateTime(registration.registeredAt)
    } : {
      id: '',
      confirmationCode: 'N/A',
      raceDistance: submission.raceDistance || 'N/A',
      participationMode: submission.participationMode || 'N/A',
      status: 'N/A',
      paymentStatus: 'N/A',
      registeredAtLabel: ''
    },
    accumulatedProgress: submissionKind === 'accumulated'
      ? buildAccumulatedProgress({
        activities: accumulatedActivities,
        targetDistanceKm: event.targetDistanceKm
      })
      : null,
    backHref: buildRunProofReviewPath(event._id, queueContext),
    queueContext: Object.fromEntries(queueContextParams.entries()),
    reviewActionBase: `/organizer/events/${String(event._id)}/submissions/${String(submission._id)}`
  };
}

function mapSubmissionForRegistrant(submission, options = {}) {
  if (!submission) return null;

  const ocrData = submission.ocrData || {};
  const ocrTimeMs = Number(ocrData.extractedTimeMs);
  let ocrTimeLabel = '';
  if (Number.isFinite(ocrTimeMs) && ocrTimeMs > 0) {
    const ocrH = Math.floor(ocrTimeMs / 3600000);
    const ocrM = Math.floor((ocrTimeMs % 3600000) / 60000);
    const ocrS = Math.floor((ocrTimeMs % 60000) / 1000);
    ocrTimeLabel = (ocrH > 0 ? String(ocrH) + 'h ' : '') +
      String(ocrM).padStart(2, '0') + 'm ' +
      String(ocrS).padStart(2, '0') + 's';
  }

  const reviewedBy = submission.reviewedBy;
  const reviewerName = reviewedBy
    ? String(reviewedBy.firstName || '').trim() + ' ' + String(reviewedBy.lastName || '').trim()
    : '';

  return {
    ...submission,
    isAccumulatedActivity: Boolean(options.isAccumulatedActivity),
    targetTypeLabel: options.isAccumulatedActivity ? 'Challenge Activity (Accumulated Activity)' : 'Event Result',
    sourceLabel: getSubmissionSourceLabel(submission),
    autoApprovalSourceLabel: getAutoApprovalSourceLabel(submission),
    elapsedLabel: formatElapsedMs(submission.elapsedMs),
    runDateLabel: formatDateOnly(submission.runDate),
    runLocation: String(submission.runLocation || '').trim(),
    submittedAtLabel: formatDateTime(submission.submittedAt),
    reviewedAtLabel: formatDateTime(submission.reviewedAt),
    reviewerName: reviewerName.trim(),
    ocrTimeLabel,
    runType: submission.runType || 'run',
    elevationGain: submission.elevationGain != null ? submission.elevationGain : null,
    suspiciousFlag: Boolean(submission.suspiciousFlag),
    suspiciousFlagReason: String(submission.suspiciousFlagReason || '').trim(),
    reviewSignal: buildSubmissionReviewSignal(submission)
  };
}

function getSubmissionSourceLabel(submission = {}) {
  const source = String(submission.source || '').trim().toLowerCase();
  if (source === 'strava') return 'Strava Activity';
  if (Number(submission.ocrData?.confidence || 0) > 0) return 'Activity Screenshot with OCR';
  return 'Activity Screenshot';
}

function getAutoApprovalSourceLabel(submission = {}) {
  const source = String(submission.source || '').trim().toLowerCase();
  if (source === 'strava') return 'Verified synced-source validation';
  if (Number(submission.ocrData?.confidence || 0) > 0) return 'OCR and name-match validation';
  return 'Manual review validation';
}

function getRegistrantExportData(registrations = []) {
  const headers = [
    'Confirmation Code',
    'First Name',
    'Last Name',
    'Email',
    'Mobile',
    'Country',
    'Date of Birth',
    'Gender',
    'Emergency Contact Name',
    'Emergency Contact Number',
    'Running Group',
    'Waiver Version',
    'Waiver Signature',
    'Waiver Accepted At',
    'Participation Mode',
    'Race Distance',
    'Race Category ID',
    'Race Category Name',
    'Race Category Type',
    'Status',
    'Payment Status',
    'Expected Payment',
    'Signup Option',
    'Registration Package',
    'Pricing Period',
    'Payment Receipt URL',
    'Payment Receipt Uploaded At',
    'Payment Reviewed At',
    'Payment Rejection Reason',
    'Payment Review Notes',
    'Registered At'
  ];

  const rows = registrations.map((registration) => {
    const participant = registration.participant || {};
    return [
      registration.confirmationCode || '',
      participant.firstName || '',
      participant.lastName || '',
      participant.email || '',
      participant.mobile || '',
      getCountryName(participant.country) || participant.country || '',
      formatDateOnly(participant.dateOfBirth) || '',
      formatGenderLabel(participant.gender) || '',
      participant.emergencyContactName || '',
      participant.emergencyContactNumber || '',
      participant.runningGroup || '',
      registration.waiver?.version || '',
      registration.waiver?.signature || '',
      registration.waiver?.acceptedAt ? new Date(registration.waiver.acceptedAt).toISOString() : '',
      registration.participationMode || '',
      registration.raceDistance || '',
      registration.pricingSnapshot?.raceCategoryId || '',
      registration.pricingSnapshot?.raceCategoryName || '',
      registration.pricingSnapshot?.raceCategoryType || '',
      registration.status || '',
      registration.paymentStatus || '',
      formatRegistrationExpectedPayment(registration),
      registration.pricingSnapshot?.optionDescription || '',
      registration.pricingSnapshot?.packageName || '',
      registration.pricingSnapshot?.pricingPeriodLabel || '',
      registration.paymentProof?.url || '',
      registration.paymentProof?.uploadedAt ? new Date(registration.paymentProof.uploadedAt).toISOString() : '',
      registration.paymentReviewedAt ? new Date(registration.paymentReviewedAt).toISOString() : '',
      registration.paymentRejectionReason || '',
      registration.paymentReviewNotes || '',
      registration.registeredAt ? new Date(registration.registeredAt).toISOString() : ''
    ];
  });

  return { headers, rows };
}

function formatRegistrationExpectedPayment(registration) {
  const currency = registration.paymentCurrency || registration.pricingSnapshot?.currency || registration.addOnsCurrency || 'PHP';
  const registrationFee = Number.isFinite(Number(registration.paymentAmountDue))
    ? Number(registration.paymentAmountDue)
    : Number(registration.pricingSnapshot?.amount || 0);
  const addOnsSubtotal = Number(registration.addOnsSubtotal || 0);
  const total = Math.max(0, registrationFee) + Math.max(0, addOnsSubtotal);
  return total > 0 ? `${currency} ${total.toFixed(2)}` : '';
}

function csvEscape(value) {
  const raw = String(value ?? '');
  const escaped = raw.replace(/"/g, '""');
  return `"${escaped}"`;
}

function escapeRegex(input) {
  return String(input || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getCreateEventFormData(body = {}) {
  return eventFormService.getCreateEventFormData(body);
}

function formatDateForInput(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function getCreateEventFormDataFromEvent(event) {
  return eventFormService.getCreateEventFormDataFromEvent(event);
}

function parseDateSafe(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function addDays(date, days) {
  if (!date) return null;
  const copy = new Date(date.getTime());
  copy.setDate(copy.getDate() + days);
  return copy;
}

function resolveFinalSubmissionDeadline(formData) {
  return parseDateSafe(formData.finalSubmissionDeadlineAt) || addDays(parseDateSafe(formData.eventEndAt), 14);
}

function formatDateOnly(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function formatDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-US');
}

function formatElapsedMs(value) {
  const totalMs = Number(value || 0);
  if (!Number.isFinite(totalMs) || totalMs <= 0) return '';
  const totalSeconds = Math.floor(totalMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function formatGenderLabel(value) {
  const normalized = String(value || '').trim();
  if (!normalized) return '';
  if (normalized === 'prefer_not_to_say') return 'Prefer not to say';
  if (normalized === 'non_binary') return 'Non-binary';
  if (normalized === 'male') return 'Male';
  if (normalized === 'female') return 'Female';
  return normalized;
}

function formatAgeFromDateOfBirth(value) {
  if (!value) return '';
  const birthDate = new Date(value);
  if (Number.isNaN(birthDate.getTime())) return '';

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  const dayDiff = today.getDate() - birthDate.getDate();

  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    age -= 1;
  }

  if (age < 0 || age > 130) return '';
  return String(age);
}

function isValidUrl(url) {
  if (!url) return true;
  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
}

function sanitizeWaiverTemplate(value) {
  const normalizedTemplate = normalizeWaiverTemplate(value);
  if (!normalizedTemplate) return '';
  return normalizeWaiverTemplate(sanitizeHtml(normalizedTemplate, WAIVER_SANITIZE_OPTIONS));
}

function renderEventDetailsMarkdown(value) {
  const markdown = String(value || '').trim();
  if (!markdown) return '';
  return sanitizeHtml(markdownToHtml(markdown), EVENT_DETAILS_SANITIZE_OPTIONS);
}

function hasOwnValue(body, key) {
  return Object.prototype.hasOwnProperty.call(body || {}, key);
}

function normalizeBoolean(value) {
  return value === true || value === 'true' || value === '1' || value === 'on';
}

function normalizeCurrency(value) {
  const normalized = String(value || 'PHP').trim().toUpperCase().replace(/[^A-Z]/g, '');
  return normalized.slice(0, 3) || 'PHP';
}

function getDefaultedCreateEventBody(body = {}) {
  return Object.keys(body || {}).length ? body : {
    feeMode: 'free',
    feeCurrency: 'PHP',
    pricingMode: 'free',
    virtualCompletionMode: 'accumulated_distance',
    acceptedRunTypes: ['run', 'walk', 'hike', 'trail_run'],
    recognitionMode: 'completion_with_optional_ranking',
    leaderboardMode: 'finishers_and_top_distance'
  };
}

function normalizeOrganizerDashboardRange(value) {
  const safe = String(value || '').trim().toLowerCase();
  if (safe === '7d' || safe === '30d' || safe === 'all') {
    return safe;
  }
  return '30d';
}

function getOrganizerDashboardRangeStart(range, now = new Date()) {
  if (range === 'all') return null;
  const days = range === '7d' ? 7 : 30;
  const start = new Date(now);
  start.setDate(start.getDate() - days);
  return start;
}

function getOrganizerDashboardRangeLabel(range) {
  if (range === '7d') return 'Last 7 days';
  if (range === 'all') return 'All time';
  return 'Last 30 days';
}

function getOrganizerDashboardRangeWindow(range, now = new Date()) {
  const currentEndAt = new Date(now);
  const currentStartAt = getOrganizerDashboardRangeStart(range, currentEndAt);
  if (!currentStartAt) {
    return {
      currentStartAt: null,
      currentEndAt: null,
      previousStartAt: null,
      previousEndAt: null,
      previousLabel: 'Previous period'
    };
  }

  const durationMs = currentEndAt.getTime() - currentStartAt.getTime();
  const previousEndAt = new Date(currentStartAt);
  const previousStartAt = new Date(previousEndAt.getTime() - durationMs);

  return {
    currentStartAt,
    currentEndAt,
    previousStartAt,
    previousEndAt,
    previousLabel: range === '7d' ? 'Previous 7 days' : 'Previous 30 days'
  };
}

function buildDateBoundFilter(baseFilter, field, startAt, endAt) {
  const filter = { ...baseFilter };
  if (!field || (!startAt && !endAt)) {
    return filter;
  }

  const bounds = {};
  if (startAt) bounds.$gte = startAt;
  if (endAt) bounds.$lt = endAt;
  if (Object.keys(bounds).length) {
    filter[field] = bounds;
  }

  return filter;
}

async function getOrganizerDashboardRegistrationMetrics(eventIds = [], recentEventIds = [], rangeWindow = {}) {
  if (!eventIds.length) {
    return {
      totalRegistrations: 0,
      pendingPaymentReviews: 0,
      registrationsInRange: 0,
      registrationsInPreviousRange: 0,
      recentRegistrationCounts: [],
      paymentQueueCounts: [],
      topRegistrationsRaw: []
    };
  }

  const currentRangeExpr = buildAggregationDateRangeExpression('registeredAt', rangeWindow.currentStartAt, rangeWindow.currentEndAt, true);
  const previousRangeExpr = buildAggregationDateRangeExpression('registeredAt', rangeWindow.previousStartAt, rangeWindow.previousEndAt, false);
  const topRegistrationsMatch = {
    eventId: { $in: eventIds },
    ...buildAggregationDateRangeMatch('registeredAt', rangeWindow.currentStartAt, rangeWindow.currentEndAt)
  };

  const [metrics = {}] = await Registration.aggregate([
    { $match: { eventId: { $in: eventIds } } },
    {
      $facet: {
        summary: [
          {
            $group: {
              _id: null,
              totalRegistrations: { $sum: 1 },
              pendingPaymentReviews: {
                $sum: { $cond: [{ $eq: ['$paymentStatus', 'proof_submitted'] }, 1, 0] }
              },
              registrationsInRange: { $sum: { $cond: [currentRangeExpr, 1, 0] } },
              registrationsInPreviousRange: { $sum: { $cond: [previousRangeExpr, 1, 0] } }
            }
          }
        ],
        recentRegistrationCounts: [
          { $match: recentEventIds.length ? { eventId: { $in: recentEventIds } } : { _id: { $exists: false } } },
          { $group: { _id: '$eventId', count: { $sum: 1 } } }
        ],
        paymentQueueCounts: [
          { $match: { paymentStatus: 'proof_submitted' } },
          { $group: { _id: '$eventId', paymentPending: { $sum: 1 } } },
          { $sort: { paymentPending: -1 } }
        ],
        topRegistrationsRaw: [
          { $match: topRegistrationsMatch },
          { $group: { _id: '$eventId', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 3 }
        ]
      }
    }
  ]);
  const summary = metrics.summary?.[0] || {};

  return {
    totalRegistrations: Number(summary.totalRegistrations || 0),
    pendingPaymentReviews: Number(summary.pendingPaymentReviews || 0),
    registrationsInRange: Number(summary.registrationsInRange || 0),
    registrationsInPreviousRange: Number(summary.registrationsInPreviousRange || 0),
    recentRegistrationCounts: metrics.recentRegistrationCounts || [],
    paymentQueueCounts: metrics.paymentQueueCounts || [],
    topRegistrationsRaw: metrics.topRegistrationsRaw || []
  };
}

async function getOrganizerDashboardSubmissionMetrics(Model, eventIds = [], rangeWindow = {}) {
  if (!eventIds.length) {
    return {
      pendingResultReviews: 0,
      submissionsInRange: 0,
      approvalsInRange: 0,
      submissionsInPreviousRange: 0,
      approvalsInPreviousRange: 0,
      resultQueueCounts: [],
      topApprovalsRaw: []
    };
  }

  const currentRangeExpr = buildAggregationDateRangeExpression('submittedAt', rangeWindow.currentStartAt, rangeWindow.currentEndAt, true);
  const previousRangeExpr = buildAggregationDateRangeExpression('submittedAt', rangeWindow.previousStartAt, rangeWindow.previousEndAt, false);
  const approvedCurrentExpr = { $and: [{ $eq: ['$status', 'approved'] }, currentRangeExpr] };
  const approvedPreviousExpr = { $and: [{ $eq: ['$status', 'approved'] }, previousRangeExpr] };
  const topApprovalsMatch = {
    eventId: { $in: eventIds },
    status: 'approved',
    ...buildAggregationDateRangeMatch('submittedAt', rangeWindow.currentStartAt, rangeWindow.currentEndAt)
  };

  const [metrics = {}] = await Model.aggregate([
    { $match: { eventId: { $in: eventIds } } },
    {
      $facet: {
        summary: [
          {
            $group: {
              _id: null,
              pendingResultReviews: {
                $sum: { $cond: [{ $eq: ['$status', 'submitted'] }, 1, 0] }
              },
              submissionsInRange: { $sum: { $cond: [currentRangeExpr, 1, 0] } },
              approvalsInRange: { $sum: { $cond: [approvedCurrentExpr, 1, 0] } },
              submissionsInPreviousRange: { $sum: { $cond: [previousRangeExpr, 1, 0] } },
              approvalsInPreviousRange: { $sum: { $cond: [approvedPreviousExpr, 1, 0] } }
            }
          }
        ],
        resultQueueCounts: [
          { $match: { status: 'submitted' } },
          { $group: { _id: '$eventId', resultPending: { $sum: 1 } } },
          { $sort: { resultPending: -1 } }
        ],
        topApprovalsRaw: [
          { $match: topApprovalsMatch },
          { $group: { _id: '$eventId', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 3 }
        ]
      }
    }
  ]);
  const summary = metrics.summary?.[0] || {};

  return {
    pendingResultReviews: Number(summary.pendingResultReviews || 0),
    submissionsInRange: Number(summary.submissionsInRange || 0),
    approvalsInRange: Number(summary.approvalsInRange || 0),
    submissionsInPreviousRange: Number(summary.submissionsInPreviousRange || 0),
    approvalsInPreviousRange: Number(summary.approvalsInPreviousRange || 0),
    resultQueueCounts: metrics.resultQueueCounts || [],
    topApprovalsRaw: metrics.topApprovalsRaw || []
  };
}

function buildAggregationDateRangeExpression(field, startAt, endAt, defaultValue) {
  const checks = [];
  if (startAt) checks.push({ $gte: [`$${field}`, startAt] });
  if (endAt) checks.push({ $lt: [`$${field}`, endAt] });
  if (!checks.length) return Boolean(defaultValue);
  return checks.length === 1 ? checks[0] : { $and: checks };
}

function buildAggregationDateRangeMatch(field, startAt, endAt) {
  const bounds = {};
  if (startAt) bounds.$gte = startAt;
  if (endAt) bounds.$lt = endAt;
  return Object.keys(bounds).length ? { [field]: bounds } : {};
}

function buildOrganizerTrendMetric(currentValue, previousValue, previousLabel) {
  const current = Number(currentValue || 0);
  const previous = Number(previousValue || 0);
  const delta = current - previous;
  const direction = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
  const sign = delta > 0 ? '+' : '';

  return {
    current,
    previous,
    delta,
    direction,
    label: `${sign}${delta} vs ${previousLabel || 'previous period'}`
  };
}

function validateCreateEventForm(formData) {
  return eventFormService.validateCreateEventForm(formData);
}

function validateOptionalCreateEventFields(formData, errors) {
  if (!isValidUrl(formData.bannerImageUrl)) {
    errors.bannerImageUrl = 'Banner URL must be a valid URL.';
  }
  if (!isValidUrl(formData.logoUrl)) {
    errors.logoUrl = 'Logo URL must be a valid URL.';
  }
  if (!isValidUrl(formData.posterImageUrl)) {
    errors.posterImageUrl = 'Poster URL must be a valid URL.';
  }
  if (!isValidUrl(formData.paymentQrImageUrl)) {
    errors.paymentQrImageUrl = 'Payment QR URL must be a valid URL.';
  }
  if (Array.isArray(formData.galleryImageUrls) && formData.galleryImageUrls.length > MAX_GALLERY_IMAGES) {
    errors.galleryImageUrls = `Gallery supports up to ${MAX_GALLERY_IMAGES} images.`;
  }
  if (Array.isArray(formData.galleryImageUrls)) {
    const invalidGalleryUrl = formData.galleryImageUrls.find((galleryUrl) => !isValidUrl(galleryUrl));
    if (invalidGalleryUrl) {
      errors.galleryImageUrls = 'Each gallery URL must be a valid URL.';
    }
  }

  const optionalDateFields = [
    'registrationOpenAt',
    'registrationCloseAt',
    'eventStartAt',
    'eventEndAt',
    'virtualStartAt',
    'virtualEndAt',
    'finalSubmissionDeadlineAt'
  ];
  for (const field of optionalDateFields) {
    if (formData[field] && !parseDateSafe(formData[field])) {
      errors[field] = 'Invalid date format.';
    }
  }

  const hasGeoLat = !!formData.geoLat;
  const hasGeoLng = !!formData.geoLng;
  if (hasGeoLat !== hasGeoLng) {
    errors.geo = 'Provide both latitude and longitude, or leave both empty.';
  }
  if (hasGeoLat && hasGeoLng) {
    const lat = Number(formData.geoLat);
    const lng = Number(formData.geoLng);
    if (Number.isNaN(lat) || lat < -90 || lat > 90) {
      errors.geoLat = 'Latitude must be between -90 and 90.';
    }
    if (Number.isNaN(lng) || lng < -180 || lng > 180) {
      errors.geoLng = 'Longitude must be between -180 and 180.';
    }
  }

  if (formData.minimumActivityDistanceKm !== null && (!Number.isFinite(formData.minimumActivityDistanceKm) || formData.minimumActivityDistanceKm <= 0)) {
    errors.minimumActivityDistanceKm = 'Minimum activity distance must be greater than 0.';
  }
  if (formData.feeMode === 'paid') {
    if (formData.feeAmount !== null && (!Number.isFinite(formData.feeAmount) || formData.feeAmount < 0)) {
      errors.feeAmount = 'Paid event amount must be zero or higher.';
    }
    if (!/^[A-Z]{3}$/.test(formData.feeCurrency || '')) {
      errors.feeCurrency = 'Currency must be a 3-letter code.';
    }
  }
  if ((formData.eventDetailsMarkdown || '').length > 20000) {
    errors.eventDetailsMarkdown = 'Event details must be 20,000 characters or less.';
  }
}

function slugify(input) {
  return String(input || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function getEventTypesAllowed(eventType) {
  if (eventType === 'virtual') return ['virtual'];
  if (eventType === 'onsite') return ['onsite'];
  if (eventType === 'hybrid') return ['virtual', 'onsite'];
  return [];
}

async function generateUniqueSlug(title) {
  const base = slugify(title) || 'event';
  let candidate = base;
  let counter = 2;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const exists = await Event.exists({ slug: candidate });
    if (!exists) return candidate;
    candidate = `${base}-${counter}`;
    counter += 1;
  }
}

async function getOwnedEventOrNull(eventId, userId) {
  if (!mongoose.Types.ObjectId.isValid(eventId)) {
    return null;
  }
  return Event.findOne({ _id: eventId, organizerId: userId, isDeleted: { $ne: true } });
}

function canAccessRegistrantReview(user) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return user.role === 'organiser' && user.organizerStatus === 'approved';
}

async function getRegistrantAccessibleEventOrNull(eventId, user) {
  if (!user || !mongoose.Types.ObjectId.isValid(eventId)) {
    return null;
  }
  if (user.role === 'admin') {
    return Event.findById(eventId);
  }
  return getOwnedEventOrNull(eventId, user._id);
}

function getStatusTransitionError(currentStatus, nextStatus) {
  const validStatuses = ['draft', 'pending_review', 'published', 'closed', 'archived'];
  if (!validStatuses.includes(nextStatus)) {
    return 'Invalid target status.';
  }
  if (currentStatus === nextStatus) {
    return `Event is already ${currentStatus}.`;
  }

  const allowed = {
    draft: ['pending_review'],
    pending_review: [],
    published: ['closed'],
    closed: [],
    archived: []
  };

  if (!allowed[currentStatus] || !allowed[currentStatus].includes(nextStatus)) {
    return `Cannot move event from ${currentStatus} to ${nextStatus}.`;
  }

  return null;
}

function mapUploadFieldToFormField(fieldName) {
  const normalizedField = String(fieldName || '').trim();
  if (normalizedField === 'logoFile') return 'logoUrl';
  if (normalizedField === 'posterImageFile') return 'posterImageUrl';
  if (normalizedField === 'paymentQrImageFile') return 'paymentQrImageUrl';
  if (normalizedField === 'galleryImageFiles') return 'galleryImageUrls';
  return 'bannerImageUrl';
}

function acceptsJson(req) {
  const accept = String(req.get('accept') || '').toLowerCase();
  if (accept.includes('text/html') && !accept.includes('application/json')) {
    return false;
  }
  return true;
}

function isChecked(value) {
  if (Array.isArray(value)) {
    return value.some((item) => item === '1' || item === 'true' || item === 'on');
  }
  return value === '1' || value === 'true' || value === 'on';
}

function getPublishReadinessErrors(event) {
  return eventFormService.getPublishReadinessErrors(event);
}

function getEventReadinessChecklist(formData) {
  return eventFormService.getEventReadinessChecklist(formData);
}

function getEventReviewSummary(formData) {
  return eventFormService.getEventReviewSummary(formData);
}

function getConsistencyWarnings(formData) {
  return eventFormService.validateRewardPricingConsistency(formData).warnings;
}

module.exports = {
  // External module imports
  logger,
  mongoose,
  crypto,
  ExcelJS,
  User,
  Event,
  Registration,
  Submission,
  AccumulatedActivitySubmission,
  OrganiserApplication,
  EventPromotion,
  uploadService,
  communicationService,
  notifyWithRetry,
  notifyWithRetryInBackground,
  createRateLimiter,
  requireAuth,
  requireApprovedOrganizer,
  requireCanCreateEvents,
  requireCsrfProtection,
  isFullAdminTier,
  REVIEW_REASON_LABELS,
  getCountries,
  isValidCountryCode,
  normalizeCountryCode,
  getCountryName,
  DEFAULT_WAIVER_TEMPLATE,
  normalizeWaiverTemplate,
  sanitizeHtml,
  htmlToPlainText,
  markdownToHtml,
  generateUniqueReferenceCode,
  canOrganizerReviewPaymentProof,
  buildSubmissionReviewSignal,
  buildPublicEventView,
  renderEventDetailsContent,
  reviewSubmission,
  recordCriticalAuditEventInBackground,
  syncRegistrationPaymentShadow,
  recordSyncFailureInBackground,
  evaluateRegistrationAchievementsInBackground,
  getRunnerEarnedBadges,
  generateDefaultEventBadges,
  generateDefaultEventBadgesInBackground,
  getEventBadgesByMongoEventId,
  updateEventBadgeDisplay,
  eventFormService,
  tryAutoApproveEvent,
  reviewAccumulatedActivitySubmission,
  getAccumulatedActivitiesForRegistrations,
  buildAccumulatedProgress,
  buildSubmissionHubPath,
  listSubmissionHub,
  listSubmissionHubEvents,
  AUDIT_GROUP_OPTIONS,
  AUDIT_TARGET_TYPE_OPTIONS,
  buildCriticalAuditPath,
  listCriticalAuditEvents,
  listCriticalAuditSignals,
  normalizeCriticalAuditFilters,
  getPostgresClient,
  // Constants
  countries,
  RACE_DISTANCE_PRESETS,
  MAX_GALLERY_IMAGES,
  PREVIEW_SESSION_TTL_MS,
  MAX_PREVIEW_SESSION_ENTRIES,
  RUN_PROOF_REVIEW_PAGE_SIZE,
  PAYMENT_PROOF_REVIEW_PAGE_SIZE,
  REGISTRANTS_PAGE_SIZE,
  VIRTUAL_COMPLETION_MODES,
  ACCEPTED_RUN_TYPES,
  RECOGNITION_MODES,
  LEADERBOARD_MODES,
  FEE_MODES,
  WAIVER_SANITIZE_OPTIONS,
  EVENT_DETAILS_SANITIZE_OPTIONS,
  // Rate limiters
  paymentReviewActionLimiter,
  submissionReviewActionLimiter,
  registrantExportLimiter,
  directMessageLimiter,
  // Sync utilities
  syncRegistrationPaymentShadowInBackground,
  // Preview session utilities
  getPreviewSessionStore,
  savePreviewSession,
  buildPreviewBackHref,
  // Utility functions
  getRequestIpAddress,
  getRequestUserAgent,
  // Helper functions
  isValidPhone,
  validateFiles,
  wantsJsonResponse,
  getPageMessage,
  normalizeArray,
  normalizeProofTypes,
  normalizeVirtualCompletionMode,
  normalizeRunTypes,
  normalizeModeValue,
  parseOptionalPositiveNumber,
  normalizeMilestoneDistances,
  normalizeRaceDistanceLabel,
  normalizeRaceDistances,
  sortRaceDistancesDesc,
  normalizeGalleryImageUrls,
  getRegistrantFilterContext,
  getEventRegistrationSummaryCounts,
  getEventSubmissionSummaryCounts,
  getRegistrationIdsWithSubmissionStatus,
  buildRegistrantListPath,
  normalizePaymentProofReviewFilters,
  getPaymentProofReviewStatusQuery,
  getEventAuditTargetIds,
  buildPaymentProofReviewPath,
  buildPaymentProofReviewRow,
  formatPaymentProofStatusLabel,
  normalizeRunProofReviewFilters,
  getRunProofReviewStatusQuery,
  buildRunProofReviewQuery,
  getRunProofReviewSortSpec,
  mergeRunProofReviewDocs,
  compareRunProofReviewDocs,
  getRunProofReviewSortTime,
  buildRunProofReviewPath,
  buildRunProofQueueContextParams,
  buildSubmissionReviewPath,
  normalizeRunProofQueueContext,
  buildRunProofReviewRow,
  formatExpectedPaymentLabel,
  buildRegistrantExportQuery,
  getSubmissionReviewContext,
  mapSubmissionForRegistrant,
  getSubmissionSourceLabel,
  getAutoApprovalSourceLabel,
  getRegistrantExportData,
  formatRegistrationExpectedPayment,
  csvEscape,
  escapeRegex,
  getCreateEventFormData,
  formatDateForInput,
  getCreateEventFormDataFromEvent,
  parseDateSafe,
  addDays,
  resolveFinalSubmissionDeadline,
  formatDateOnly,
  formatDateTime,
  formatElapsedMs,
  formatGenderLabel,
  formatAgeFromDateOfBirth,
  isValidUrl,
  sanitizeWaiverTemplate,
  renderEventDetailsMarkdown,
  hasOwnValue,
  normalizeBoolean,
  normalizeCurrency,
  getDefaultedCreateEventBody,
  normalizeOrganizerDashboardRange,
  getOrganizerDashboardRangeStart,
  getOrganizerDashboardRangeLabel,
  getOrganizerDashboardRangeWindow,
  buildDateBoundFilter,
  getOrganizerDashboardRegistrationMetrics,
  getOrganizerDashboardSubmissionMetrics,
  buildAggregationDateRangeExpression,
  buildAggregationDateRangeMatch,
  buildOrganizerTrendMetric,
  validateCreateEventForm,
  validateOptionalCreateEventFields,
  slugify,
  getEventTypesAllowed,
  generateUniqueSlug,
  getOwnedEventOrNull,
  canAccessRegistrantReview,
  getRegistrantAccessibleEventOrNull,
  getStatusTransitionError,
  mapUploadFieldToFormField,
  acceptsJson,
  isChecked,
  getPublishReadinessErrors,
  getEventReadinessChecklist,
  getEventReviewSummary,
  getConsistencyWarnings
};
