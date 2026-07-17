'use strict';

const mongoose = require('mongoose');
const { REJECTION_REASONS } = require('../utils/rejection-reasons');
const Submission = require('../models/Submission');
const AccumulatedActivitySubmission = require('../models/AccumulatedActivitySubmission');

// ─── Constants ────────────────────────────────────────────────────────────────

const VALID_STATUSES = new Set(['submitted', 'approved', 'rejected']);
const VALID_ACTIVITY_TYPES = new Set(['run', 'walk', 'hike', 'trail_run']);
const VALID_SORTS = new Set(['newest', 'oldest', 'eventDate', 'fastest', 'distance']);
const PAGE_SIZE = 10;
const STATUS_OPTIONS = Object.freeze([
  { value: '', label: 'All statuses' },
  { value: 'rejected', label: 'Needs correction' },
  { value: 'submitted', label: 'Awaiting review' },
  { value: 'approved', label: 'Approved' }
]);
const ACTIVITY_OPTIONS = Object.freeze([
  { value: '', label: 'All activities' },
  { value: 'run', label: 'Run' },
  { value: 'walk', label: 'Walk' },
  { value: 'hike', label: 'Hike' },
  { value: 'trail_run', label: 'Trail run' }
]);
const SORT_OPTIONS = Object.freeze([
  { value: 'newest', label: 'Newest submitted' },
  { value: 'oldest', label: 'Oldest submitted' },
  { value: 'eventDate', label: 'Activity date' },
  { value: 'distance', label: 'Longest distance' },
  { value: 'fastest', label: 'Shortest duration' }
]);

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

  const [standardDocs, accumulatedDocs] = await Promise.all([
    Submission.find(filter)
      .populate({ path: 'eventId', select: 'title slug referenceCode organiserName eventType eventStartAt' })
      .populate({ path: 'registrationId', select: 'raceDistance participationMode confirmationCode' })
      .lean(),
    AccumulatedActivitySubmission.find(filter)
      .populate({ path: 'eventId', select: 'title slug referenceCode organiserName eventType eventStartAt' })
      .populate({ path: 'registrationId', select: 'raceDistance participationMode confirmationCode' })
      .lean()
  ]);

  const rawDocs = [
    ...standardDocs.map((doc) => ({ ...doc, submissionKind: 'standard' })),
    ...accumulatedDocs.map((doc) => ({ ...doc, submissionKind: 'accumulated_activity' }))
  ].sort((a, b) => compareSubmissions(a, b, sort));

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

function buildRunnerSubmissionListPresentation(result = {}, counts = {}, options = {}) {
  const filters = normalizeListOptions(options);
  const hasActiveFilters = Boolean(filters.q || filters.status || filters.activityType);
  const chips = [];
  if (filters.q) chips.push({ key: 'q', label: `Search: ${filters.q}`, href: buildRunnerSubmissionListUrl(filters, { q: '', page: 1 }) });
  if (filters.status) chips.push({ key: 'status', label: getStatusPresentation(filters.status).label, href: buildRunnerSubmissionListUrl(filters, { status: '', page: 1 }) });
  if (filters.activityType) {
    const option = ACTIVITY_OPTIONS.find((item) => item.value === filters.activityType);
    chips.push({ key: 'activityType', label: option?.label || filters.activityType, href: buildRunnerSubmissionListUrl(filters, { activityType: '', page: 1 }) });
  }

  return {
    filters,
    chips,
    hasActiveFilters,
    filtersOpen: Boolean(filters.status || filters.activityType),
    statusOptions: STATUS_OPTIONS,
    activityOptions: ACTIVITY_OPTIONS,
    sortOptions: SORT_OPTIONS,
    clearFiltersUrl: buildRunnerSubmissionListUrl(filters, { q: '', status: '', activityType: '', page: 1 }),
    attentionUrl: buildRunnerSubmissionListUrl(filters, { q: '', status: 'rejected', activityType: '', page: 1 }),
    summaryUrls: {
      rejected: buildRunnerSubmissionListUrl(filters, { q: '', status: 'rejected', activityType: '', page: 1 }),
      submitted: buildRunnerSubmissionListUrl(filters, { q: '', status: 'submitted', activityType: '', page: 1 }),
      approved: buildRunnerSubmissionListUrl(filters, { q: '', status: 'approved', activityType: '', page: 1 })
    },
    showAttention: !hasActiveFilters && Number(counts.rejected || 0) > 0,
    resultLabel: `${Number(result.total || 0)} ${Number(result.total || 0) === 1 ? 'entry' : 'entries'}`,
    pagination: buildPaginationPresentation(result, filters)
  };
}

function buildRunnerSubmissionListUrl(current = {}, overrides = {}) {
  const filters = normalizeListOptions({ ...current, ...overrides });
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.status) params.set('status', filters.status);
  if (filters.activityType) params.set('activityType', filters.activityType);
  if (filters.sort !== 'newest') params.set('sort', filters.sort);
  if (filters.page > 1) params.set('page', String(filters.page));
  const query = params.toString();
  return `/runner/submissions${query ? `?${query}` : ''}`;
}

function buildPaginationPresentation(result = {}, filters = {}) {
  const page = Number(result.page || 1);
  const totalPages = Number(result.totalPages || 1);
  if (totalPages <= 1) return { page, totalPages, links: [], previousUrl: '', nextUrl: '' };
  const values = buildPageValues(page, totalPages);
  return {
    page,
    totalPages,
    previousUrl: page > 1 ? buildRunnerSubmissionListUrl(filters, { page: page - 1 }) : '',
    nextUrl: page < totalPages ? buildRunnerSubmissionListUrl(filters, { page: page + 1 }) : '',
    links: values.map((value) => value === 'ellipsis'
      ? { type: 'ellipsis' }
      : { type: 'page', page: value, current: value === page, href: buildRunnerSubmissionListUrl(filters, { page: value }) })
  };
}

function buildPageValues(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);
  const values = [1];
  if (current > 3) values.push('ellipsis');
  for (let page = Math.max(2, current - 1); page <= Math.min(total - 1, current + 1); page += 1) values.push(page);
  if (current < total - 2) values.push('ellipsis');
  values.push(total);
  return values;
}

async function findRunnerSubmissionRecord(submissionId) {
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

  if (doc) return { ...doc, submissionKind: 'standard' };

  try {
    doc = await AccumulatedActivitySubmission.findById(submissionId)
      .populate({ path: 'eventId', select: 'title slug referenceCode organiserName eventType eventStartAt raceDistances' })
      .populate({ path: 'registrationId', select: 'raceDistance participationMode confirmationCode' })
      .populate({ path: 'reviewedBy', select: 'firstName lastName' })
      .lean();
  } catch {
    const err = new Error('Submission not found.');
    err.statusCode = 404;
    throw err;
  }

  return doc ? { ...doc, submissionKind: 'accumulated_activity' } : null;
}

async function findRunnerSubmissionProofRecord(submissionId) {
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

  if (doc) return doc;

  try {
    doc = await AccumulatedActivitySubmission.findById(submissionId)
      .select('runnerId proof')
      .lean();
  } catch {
    const err = new Error('Submission not found.');
    err.statusCode = 404;
    throw err;
  }

  return doc;
}

/**
 * Returns a single submission detail for a runner, enforcing ownership.
 * Throws an Error with code 403 if the submission belongs to another runner.
 * Throws an Error with code 404 if not found.
 */
async function getRunnerSubmissionDetail(userId, submissionId) {
  const doc = await findRunnerSubmissionRecord(submissionId);
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
  const doc = await findRunnerSubmissionProofRecord(submissionId);
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
  const runnerId = new mongoose.Types.ObjectId(String(userId));
  const [standardResult, accumulatedResult] = await Promise.all([
    aggregateCounts(Submission, runnerId),
    aggregateCounts(AccumulatedActivitySubmission, runnerId)
  ]);
  const standardRow = standardResult[0] || {};
  const accumulatedRow = accumulatedResult[0] || {};
  return {
    total: extractFacetCount(standardRow.total) + extractFacetCount(accumulatedRow.total),
    submitted: extractFacetCount(standardRow.submitted) + extractFacetCount(accumulatedRow.submitted),
    approved: extractFacetCount(standardRow.approved) + extractFacetCount(accumulatedRow.approved),
    rejected: extractFacetCount(standardRow.rejected) + extractFacetCount(accumulatedRow.rejected),
    certificatesIssued: extractFacetCount(standardRow.certificatesIssued) + extractFacetCount(accumulatedRow.certificatesIssued)
  };
}

// ─── Formatters (exported for controller reuse) ──────────────────────────────

function formatSubmissionListItem(doc) {
  const distanceKm = Number(doc.distanceKm || 0);
  const elapsedMs = Number(doc.elapsedMs || 0);
  const isAccumulatedActivity = doc.submissionKind === 'accumulated_activity';
  const hasCertificate =
    doc.status === 'approved' &&
    Boolean(doc.certificate?.issuedAt) &&
    !['revoked', 'failed', 'pending'].includes(doc.certificate?.status) &&
    !doc.certificate?.revokedAt;

  const status = doc.status || 'submitted';
  const statusPresentation = getStatusPresentation(status);
  const typeLabel = doc.isPersonalRecord
    ? 'Personal record'
    : (isAccumulatedActivity ? 'Challenge activity' : 'Event result');
  const primaryAction = status === 'rejected'
    ? { type: 'detail', label: 'Fix entry', href: `/runner/submissions/${String(doc._id)}` }
    : status === 'submitted'
      ? { type: 'detail', label: 'View review status', href: `/runner/submissions/${String(doc._id)}` }
      : hasCertificate
        ? { type: 'certificate', label: 'Download certificate', href: `/my-submissions/${String(doc._id)}/certificate` }
        : { type: 'detail', label: 'View result', href: `/runner/submissions/${String(doc._id)}` };

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
    status,
    statusLabel: statusPresentation.label,
    statusHelper: statusPresentation.helper,
    typeLabel,
    submittedAt: doc.submittedAt || null,
    reviewedAt: doc.reviewedAt || null,
    rejectionReason: doc.rejectionReason || '',
    rejectionCode: doc.rejectionCode || '',
    rejectionGuidance: REJECTION_REASONS.run[doc.rejectionCode]?.guidance || '',
    hasProof: Boolean(doc.proof?.url),
    proofUrl: doc.proof?.url || '',
    hasCertificate,
    certificateUrl: hasCertificate ? `/my-submissions/${String(doc._id)}/certificate` : '',
    certVerificationUrl: hasCertificate ? (doc.certificate?.verificationUrl || '') : '',
    certificateNumber: hasCertificate ? (doc.certificate?.certificateNumber || '') : '',
    certificateIssuedAt: doc.certificate?.issuedAt || null,
    certificateGoalDistanceKm: hasCertificate ? finiteNumberOrNull(doc.certificate?.goalDistanceKm) : null,
    certificateVerifiedDistanceKm: hasCertificate ? finiteNumberOrNull(doc.certificate?.verifiedDistanceKm) : null,
    certificateApprovedActivityCount: hasCertificate ? finiteNumberOrNull(doc.certificate?.approvedActivityCount) : null,
    certificateFinalizedAt: hasCertificate ? (doc.certificate?.finalizedAt || null) : null,
    isPersonalRecord: Boolean(doc.isPersonalRecord),
    isAccumulatedActivity,
    submissionKind: doc.submissionKind || 'standard',
    primaryAction,
    detailUrl: `/runner/submissions/${String(doc._id)}`,
    // Formatted labels
    elapsedLabel: formatElapsedMs(elapsedMs),
    paceLabel: formatPace(calcPace(distanceKm, elapsedMs)),
    runDateLabel: formatDate(doc.runDate),
    submittedAtLabel: formatDateTime(doc.submittedAt),
    submittedAtRelativeLabel: formatRelativeTime(doc.submittedAt),
    reviewedAtLabel: formatDateTime(doc.reviewedAt),
    reviewedAtRelativeLabel: formatRelativeTime(doc.reviewedAt),
    certificateIssuedAtLabel: formatDateTime(doc.certificate?.issuedAt)
  };
}

function formatSubmissionDetail(doc) {
  const base = formatSubmissionListItem(doc);

  const reviewedByDoc = doc.reviewedBy;
  let reviewedByName = '';
  if (reviewedByDoc && typeof reviewedByDoc === 'object' && reviewedByDoc.firstName) {
    reviewedByName = `${reviewedByDoc.firstName} ${reviewedByDoc.lastName || ''}`.trim();
  }

  const detail = {
    ...base,
    source: String(doc.source || 'manual'),
    runType: doc.runType || 'run',
    reviewNotes: doc.reviewNotes || '',
    reviewedByName,
    elevationGain: doc.elevationGain !== null && doc.elevationGain !== undefined ? Number(doc.elevationGain) : null,
    steps: doc.steps !== null && doc.steps !== undefined ? Number(doc.steps) : null,
    submissionCount: Number(doc.submissionCount || 1),
    ocrData: doc.ocrData && (
      doc.ocrData.distanceMismatch ||
      doc.ocrData.timeMismatch ||
      (doc.ocrData.detectedSource && doc.ocrData.detectedSource !== 'unknown')
    )
      ? {
          extractedDistanceKm: doc.ocrData.extractedDistanceKm,
          extractedTimeMs: doc.ocrData.extractedTimeMs,
          distanceMismatch: Boolean(doc.ocrData.distanceMismatch),
          timeMismatch: Boolean(doc.ocrData.timeMismatch),
          detectedSource: doc.ocrData.detectedSource || '',
          extractedTimeMsLabel: formatElapsedMs(doc.ocrData.extractedTimeMs)
        }
      : null,
    actions: buildSubmissionActions(base)
  };
  return { ...detail, presentation: buildRunnerSubmissionDetailPresentation(detail) };
}

function getStatusPresentation(status) {
  if (status === 'approved') return { label: 'Approved', helper: 'This result has been reviewed and accepted.', tone: 'approved' };
  if (status === 'rejected') return { label: 'Needs correction', helper: 'Review the organizer feedback and correct this entry.', tone: 'rejected' };
  return { label: 'Awaiting review', helper: 'The organizer has received this entry for review.', tone: 'submitted' };
}

function buildRunnerSubmissionDetailPresentation(submission = {}) {
  const status = getStatusPresentation(submission.status);
  const correction = resolveCorrectionPresentation(submission);
  const metrics = [
    { label: 'Distance', value: submission.distanceKm > 0 ? `${submission.distanceKm.toFixed(2)} km` : '' },
    ...(!submission.isAccumulatedActivity && submission.elapsedMs > 0 ? [{ label: 'Duration', value: submission.elapsedLabel }] : []),
    ...(!submission.isAccumulatedActivity && submission.paceLabel !== '–' ? [{ label: 'Pace', value: submission.paceLabel }] : []),
    { label: 'Activity', value: formatActivityLabel(submission.activityType) },
    { label: 'Activity date', value: submission.runDateLabel !== '–' ? submission.runDateLabel : '' },
    ...(submission.runLocation ? [{ label: 'Location', value: submission.runLocation }] : [])
  ].filter((item) => item.value);

  let primaryAction;
  if (submission.status === 'rejected') {
    primaryAction = correction.canUploadProof
      ? { type: 'resubmit', label: 'Upload new proof', registrationId: submission.registrationObjectId }
      : { type: 'correction', label: 'Correct activity details', href: '#correctionTitle' };
  } else if (submission.hasCertificate) {
    primaryAction = submission.primaryAction;
  } else if (submission.status === 'approved' && submission.eventSlug) {
    primaryAction = { type: 'link', label: 'View standings', href: `/events/${submission.eventSlug}/leaderboard` };
  } else {
    primaryAction = { type: 'link', label: 'All submissions', href: '/runner/submissions' };
  }

  return {
    status,
    correction,
    metrics,
    primaryAction,
    outcomeTitle: status.label,
    outcomeText: submission.status === 'approved'
      ? (submission.hasCertificate ? 'Your result is approved and your certificate is ready.' : 'Your result was reviewed and accepted by the organizer.')
      : submission.status === 'rejected'
        ? 'This entry needs a correction before it can become an approved result.'
        : 'Your entry is in the organizer review queue. No action is needed right now.',
    showProofReadingDetails: Boolean(submission.ocrData),
    showLeaderboard: submission.status === 'approved' && Boolean(submission.eventSlug)
  };
}

function resolveCorrectionPresentation(submission = {}) {
  if (submission.status !== 'rejected') return { strategy: 'none', guidance: '', canEditMetadata: false, canUploadProof: false };
  if (submission.source === 'strava') {
    return { strategy: 'strava', guidance: 'This entry came from Strava. Sync a corrected eligible activity, then submit it again.', canEditMetadata: false, canUploadProof: true };
  }
  const code = String(submission.rejectionCode || '').trim();
  const metadataCodes = new Set(['distance_mismatch', 'incomplete_metrics']);
  const proofCodes = new Set(['unclear_proof', 'wrong_activity', 'identity_mismatch', 'date_outside_window', 'duplicate_activity']);
  const definition = REJECTION_REASONS.run[code];
  const guidance = submission.rejectionGuidance || definition?.guidance || 'Review the organizer feedback, correct the activity details or proof, and submit the entry again.';
  if (metadataCodes.has(code)) return { strategy: 'metadata', guidance, canEditMetadata: true, canUploadProof: false };
  if (proofCodes.has(code)) return { strategy: 'proof', guidance, canEditMetadata: false, canUploadProof: true };
  return { strategy: 'both', guidance, canEditMetadata: true, canUploadProof: true };
}

function formatActivityLabel(value) {
  return String(value || 'run').replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
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

function aggregateCounts(Model, runnerId) {
  return Model.aggregate([
    {
      $match: {
        runnerId
      }
    },
    {
      $facet: {
        total: [{ $count: 'count' }],
        submitted: [{ $match: { status: 'submitted' } }, { $count: 'count' }],
        approved: [{ $match: { status: 'approved' } }, { $count: 'count' }],
        rejected: [{ $match: { status: 'rejected' } }, { $count: 'count' }],
        certificatesIssued: [
          { $match: { status: 'approved', 'certificate.issuedAt': { $exists: true, $ne: null }, 'certificate.status': { $nin: ['revoked', 'failed', 'pending'] }, 'certificate.revokedAt': null } },
          { $count: 'count' }
        ]
      }
    }
  ]);
}

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

function compareSubmissions(a, b, sort) {
  let comparison = 0;
  switch (sort) {
    case 'oldest':
      comparison = compareDates(a.submittedAt, b.submittedAt, 1);
      break;
    case 'fastest': {
      const elapsedA = Number(a.elapsedMs) > 0 ? Number(a.elapsedMs) : Number.MAX_SAFE_INTEGER;
      const elapsedB = Number(b.elapsedMs) > 0 ? Number(b.elapsedMs) : Number.MAX_SAFE_INTEGER;
      comparison = elapsedA !== elapsedB ? elapsedA - elapsedB : compareDates(a.submittedAt, b.submittedAt, -1);
      break;
    }
    case 'distance': {
      const distanceA = Number(a.distanceKm || 0);
      const distanceB = Number(b.distanceKm || 0);
      comparison = distanceA !== distanceB ? distanceB - distanceA : compareDates(a.submittedAt, b.submittedAt, -1);
      break;
    }
    case 'eventDate':
      comparison = compareDates(a.runDate, b.runDate, -1) || compareDates(a.submittedAt, b.submittedAt, -1);
      break;
    case 'newest':
    default:
      comparison = compareDates(a.submittedAt, b.submittedAt, -1);
      break;
  }
  return comparison || String(a._id || '').localeCompare(String(b._id || ''));
}

function compareDates(first, second, direction) {
  const firstTime = new Date(first || 0).getTime();
  const secondTime = new Date(second || 0).getTime();
  const safeFirst = Number.isNaN(firstTime) ? 0 : firstTime;
  const safeSecond = Number.isNaN(secondTime) ? 0 : secondTime;
  if (safeFirst === safeSecond) return 0;
  return direction > 0 ? safeFirst - safeSecond : safeSecond - safeFirst;
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

function finiteNumberOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

module.exports = {
  listRunnerSubmissions,
  normalizeListOptions,
  buildRunnerSubmissionListUrl,
  buildRunnerSubmissionListPresentation,
  buildRunnerSubmissionDetailPresentation,
  resolveCorrectionPresentation,
  compareSubmissions,
  getRunnerSubmissionDetail,
  getRunnerSubmissionProof,
  getRunnerSubmissionCounts,
  formatSubmissionListItem,
  formatSubmissionDetail,
  buildSubmissionActions
};
