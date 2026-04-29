'use strict';

const mongoose = require('mongoose');
const Submission = require('../models/Submission');

// ─── Constants ────────────────────────────────────────────────────────────────

const VALID_STATUSES = new Set(['submitted', 'approved', 'rejected']);
const VALID_ACTIVITY_TYPES = new Set(['run', 'walk', 'hike', 'trail_run']);
const VALID_SORTS = new Set(['newest', 'oldest', 'eventDate', 'fastest', 'distance']);
const PAGE_SIZE = 10;

// ─── Public functions ──────────────────────────────────────────────────────────

/**
 * Returns a paginated, filtered list of submissions for a runner.
 */
async function listRunnerSubmissions(userId, options = {}) {
  const { status, activityType, q, sort, page } = normalizeListOptions(options);

  const filter = {
    runnerId: new mongoose.Types.ObjectId(String(userId))
  };
  if (status) {
    filter.status = status;
  }
  if (activityType) {
    filter.runType = activityType;
  }

  const sortObj = buildSortObj(sort);

  const rawDocs = await Submission.find(filter)
    .sort(sortObj)
    .populate({ path: 'eventId', select: 'title slug referenceCode organiserName eventType eventStartAt' })
    .populate({ path: 'registrationId', select: 'raceDistance participationMode confirmationCode' })
    .lean();

  // JS-side search on event metadata (max ~50 docs/runner so this is acceptable)
  const searched = q ? applySearch(rawDocs, q) : rawDocs;
  const total = searched.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const sliced = searched.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return {
    items: sliced.map(formatSubmissionListItem),
    total,
    page: safePage,
    totalPages
  };
}

/**
 * Returns a single submission detail for a runner, enforcing ownership.
 * Throws an Error with code 403 if the submission belongs to another runner.
 * Throws an Error with code 404 if not found.
 */
async function getRunnerSubmissionDetail(userId, submissionId) {
  let doc;
  try {
    doc = await Submission.findById(submissionId)
      .populate({ path: 'eventId', select: 'title slug referenceCode organiserName eventType eventStartAt raceDistances' })
      .populate({ path: 'registrationId', select: 'raceDistance participationMode confirmationCode' })
      .populate({ path: 'reviewedBy', select: 'firstName lastName' })
      .lean();
  } catch {
    const err = new Error('Submission not found.');
    err.statusCode = 404;
    throw err;
  }

  if (!doc) {
    const err = new Error('Submission not found.');
    err.statusCode = 404;
    throw err;
  }

  if (String(doc.runnerId) !== String(userId)) {
    const err = new Error('You do not have access to this submission.');
    err.statusCode = 403;
    throw err;
  }

  return formatSubmissionDetail(doc);
}

/**
 * Returns proof access metadata for a single runner-owned submission.
 */
async function getRunnerSubmissionProof(userId, submissionId) {
  let doc;
  try {
    doc = await Submission.findById(submissionId)
      .select('runnerId proof')
      .lean();
  } catch {
    const err = new Error('Submission not found.');
    err.statusCode = 404;
    throw err;
  }

  if (!doc) {
    const err = new Error('Submission not found.');
    err.statusCode = 404;
    throw err;
  }

  if (String(doc.runnerId) !== String(userId)) {
    const err = new Error('You do not have access to this submission.');
    err.statusCode = 403;
    throw err;
  }

  const url = String(doc.proof?.url || '').trim();
  const key = String(doc.proof?.key || '').trim();
  if (!url && !key) {
    const err = new Error('Proof not found.');
    err.statusCode = 404;
    throw err;
  }

  return {
    url,
    key,
    mimeType: String(doc.proof?.mimeType || '').trim()
  };
}

/**
 * Returns summary counts for a runner's submissions using a single $facet aggregate.
 */
async function getRunnerSubmissionCounts(userId) {
  const result = await Submission.aggregate([
    {
      $match: {
        runnerId: new mongoose.Types.ObjectId(String(userId))
      }
    },
    {
      $facet: {
        total: [{ $count: 'count' }],
        submitted: [{ $match: { status: 'submitted' } }, { $count: 'count' }],
        approved: [{ $match: { status: 'approved' } }, { $count: 'count' }],
        rejected: [{ $match: { status: 'rejected' } }, { $count: 'count' }],
        certificatesIssued: [
          { $match: { status: 'approved', 'certificate.issuedAt': { $exists: true, $ne: null } } },
          { $count: 'count' }
        ]
      }
    }
  ]);

  const row = result[0] || {};
  return {
    total: extractFacetCount(row.total),
    submitted: extractFacetCount(row.submitted),
    approved: extractFacetCount(row.approved),
    rejected: extractFacetCount(row.rejected),
    certificatesIssued: extractFacetCount(row.certificatesIssued)
  };
}

// ─── Formatters (exported for controller reuse) ──────────────────────────────

function formatSubmissionListItem(doc) {
  const distanceKm = Number(doc.distanceKm || 0);
  const elapsedMs = Number(doc.elapsedMs || 0);
  const ocrConfidence = Number(doc.ocrData?.confidence || 0);
  const hasCertificate =
    doc.status === 'approved' &&
    Boolean(doc.certificate?.issuedAt);

  return {
    submissionId: String(doc._id),
    eventTitle: doc.eventId?.title || 'Event unavailable',
    eventSlug: doc.eventId?.slug || '',
    eventReferenceCode: doc.eventId?.referenceCode || '',
    organiserName: doc.eventId?.organiserName || '',
    activityType: doc.runType || 'run',
    raceDistance: doc.registrationId?.raceDistance || doc.raceDistance || '',
    participationMode: doc.registrationId?.participationMode || doc.participationMode || '',
    confirmationCode: doc.registrationId?.confirmationCode || '',
    registrationObjectId: doc.registrationId?._id ? String(doc.registrationId._id) : '',
    distanceKm,
    elapsedMs,
    pace: calcPace(distanceKm, elapsedMs),
    runDate: doc.runDate || null,
    runLocation: doc.runLocation || '',
    proofType: doc.proofType || 'manual',
    status: doc.status || 'submitted',
    submittedAt: doc.submittedAt || null,
    reviewedAt: doc.reviewedAt || null,
    rejectionReason: doc.rejectionReason || '',
    hasProof: Boolean(doc.proof?.url),
    proofUrl: doc.proof?.url || '',
    hasCertificate,
    certificateUrl: hasCertificate ? `/my-submissions/${String(doc._id)}/certificate` : '',
    isPersonalRecord: Boolean(doc.isPersonalRecord),
    needsAdditionalReview: Boolean(doc.suspiciousFlag),
    ocrSource: doc.ocrData?.detectedSource || '',
    ocrConfidence,
    hasOcrData: ocrConfidence > 0,
    // Formatted labels
    elapsedLabel: formatElapsedMs(elapsedMs),
    paceLabel: formatPace(calcPace(distanceKm, elapsedMs)),
    runDateLabel: formatDate(doc.runDate),
    submittedAtLabel: formatDateTime(doc.submittedAt),
    submittedAtRelativeLabel: formatRelativeTime(doc.submittedAt),
    reviewedAtLabel: formatDateTime(doc.reviewedAt),
    reviewedAtRelativeLabel: formatRelativeTime(doc.reviewedAt)
  };
}

function formatSubmissionDetail(doc) {
  const base = formatSubmissionListItem(doc);

  const reviewedByDoc = doc.reviewedBy;
  let reviewedByName = '';
  if (reviewedByDoc && typeof reviewedByDoc === 'object' && reviewedByDoc.firstName) {
    reviewedByName = `${reviewedByDoc.firstName} ${reviewedByDoc.lastName || ''}`.trim();
  }

  return {
    ...base,
    reviewNotes: doc.reviewNotes || '',
    reviewedByName,
    elevationGain: doc.elevationGain !== null && doc.elevationGain !== undefined ? Number(doc.elevationGain) : null,
    steps: doc.steps !== null && doc.steps !== undefined ? Number(doc.steps) : null,
    submissionCount: Number(doc.submissionCount || 1),
    certificateIssuedAtLabel: formatDateTime(doc.certificate?.issuedAt),
    ocrData: doc.ocrData
      ? {
          extractedDistanceKm: doc.ocrData.extractedDistanceKm,
          extractedTimeMs: doc.ocrData.extractedTimeMs,
          rawText: doc.ocrData.rawText || '',
          confidence: Number(doc.ocrData.confidence || 0),
          distanceMismatch: Boolean(doc.ocrData.distanceMismatch),
          timeMismatch: Boolean(doc.ocrData.timeMismatch),
          detectedSource: doc.ocrData.detectedSource || '',
          extractedName: doc.ocrData.extractedName || '',
          nameMatchStatus: doc.ocrData.nameMatchStatus || 'not_checked',
          nameMismatchAcknowledged: Boolean(doc.ocrData.nameMismatchAcknowledged),
          extractedTimeMsLabel: formatElapsedMs(doc.ocrData.extractedTimeMs),
          confidencePercent: Math.round(Number(doc.ocrData.confidence || 0) * 100)
        }
      : null,
    actions: buildSubmissionActions(base)
  };
}

function buildSubmissionActions(item) {
  return {
    canResubmit: item.status === 'rejected',
    canDownloadCertificate: item.hasCertificate,
    canViewProof: item.hasProof,
    canViewLeaderboard: item.status === 'approved' && Boolean(item.eventSlug)
  };
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function normalizeListOptions(options) {
  const rawStatus = String(options.status || '').trim().toLowerCase();
  const rawActivity = String(options.activityType || '').trim().toLowerCase();
  const rawSort = String(options.sort || '').trim().toLowerCase();
  const rawPage = Number.parseInt(String(options.page || '1'), 10);

  return {
    status: VALID_STATUSES.has(rawStatus) ? rawStatus : '',
    activityType: VALID_ACTIVITY_TYPES.has(rawActivity) ? rawActivity : '',
    q: String(options.q || '').trim().slice(0, 100),
    sort: VALID_SORTS.has(rawSort) ? rawSort : 'newest',
    page: Number.isInteger(rawPage) && rawPage >= 1 ? rawPage : 1
  };
}

function buildSortObj(sort) {
  switch (sort) {
    case 'oldest':
      return { submittedAt: 1 };
    case 'fastest':
      return { elapsedMs: 1, submittedAt: -1 };
    case 'distance':
      return { distanceKm: -1, submittedAt: -1 };
    case 'eventDate':
      return { runDate: -1, submittedAt: -1 };
    case 'newest':
    default:
      return { submittedAt: -1 };
  }
}

function applySearch(docs, q) {
  const lower = q.toLowerCase();
  return docs.filter((doc) => {
    const title = String(doc.eventId?.title || '').toLowerCase();
    const organiser = String(doc.eventId?.organiserName || '').toLowerCase();
    const ref = String(doc.eventId?.referenceCode || '').toLowerCase();
    const code = String(doc.registrationId?.confirmationCode || '').toLowerCase();
    return title.includes(lower) || organiser.includes(lower) || ref.includes(lower) || code.includes(lower);
  });
}

function calcPace(distanceKm, elapsedMs) {
  if (!distanceKm || distanceKm <= 0 || !elapsedMs || elapsedMs <= 0) return 0;
  return elapsedMs / distanceKm; // ms per km
}

function extractFacetCount(facetArr) {
  return Array.isArray(facetArr) && facetArr.length > 0 ? (facetArr[0].count || 0) : 0;
}

function formatElapsedMs(value) {
  const totalMs = Number(value || 0);
  if (!Number.isFinite(totalMs) || totalMs <= 0) return '–';
  const totalSeconds = Math.floor(totalMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function formatPace(paceMs) {
  // paceMs = ms per km
  if (!paceMs || !Number.isFinite(paceMs) || paceMs <= 0) return '–';
  const totalSeconds = Math.floor(paceMs / 1000);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')} /km`;
}

function formatDate(value) {
  if (!value) return '–';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '–';
  try {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  } catch {
    return date.toDateString();
  }
}

function formatDateTime(value) {
  if (!value) return '–';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '–';
  try {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    }).format(date);
  } catch {
    return date.toLocaleString('en-US');
  }
}

function formatRelativeTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const diffMs = Date.now() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  if (diffSecs < 60) return 'just now';
  const diffMins = Math.floor(diffSecs / 60);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths}mo ago`;
  return `${Math.floor(diffMonths / 12)}y ago`;
}

module.exports = {
  listRunnerSubmissions,
  getRunnerSubmissionDetail,
  getRunnerSubmissionProof,
  getRunnerSubmissionCounts,
  formatSubmissionListItem,
  formatSubmissionDetail,
  buildSubmissionActions
};
