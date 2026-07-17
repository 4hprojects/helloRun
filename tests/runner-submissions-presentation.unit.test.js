'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeListOptions,
  buildRunnerSubmissionListUrl,
  buildRunnerSubmissionListPresentation,
  formatSubmissionListItem,
  formatSubmissionDetail,
  resolveCorrectionPresentation,
  compareSubmissions
} = require('../src/services/runner-submissions.service');

function doc(overrides = {}) {
  return {
    _id: '000000000000000000000001',
    status: 'submitted',
    distanceKm: 10,
    elapsedMs: 3600000,
    runType: 'run',
    runDate: '2026-07-10T00:00:00.000Z',
    submittedAt: '2026-07-11T00:00:00.000Z',
    eventId: { title: 'Community Run', slug: 'community-run', organiserName: 'HelloRun' },
    registrationId: { _id: 'registration-1', raceDistance: '10K', confirmationCode: 'HR-001' },
    proof: { url: 'https://example.com/proof.png' },
    ...overrides
  };
}

test('normalizes filters and generates clean compatible URLs', () => {
  assert.deepEqual(normalizeListOptions({ status: 'INVALID', activityType: 'bike', sort: 'bad', page: '-2', q: '  July  ' }), {
    status: '', activityType: '', q: 'July', sort: 'newest', page: 1
  });
  assert.equal(buildRunnerSubmissionListUrl({ q: 'July', status: 'approved', activityType: 'run', sort: 'distance', page: 2 }), '/runner/submissions?q=July&status=approved&activityType=run&sort=distance&page=2');
  assert.equal(buildRunnerSubmissionListUrl({ sort: 'newest', page: 1 }), '/runner/submissions');
});

test('builds chips, attention state, filter clearing, and pagination while retaining sort', () => {
  const presentation = buildRunnerSubmissionListPresentation(
    { total: 22, page: 2, totalPages: 3 },
    { rejected: 2 },
    { q: 'Quest', status: 'approved', activityType: 'hike', sort: 'distance', page: 2 }
  );
  assert.equal(presentation.chips.length, 3);
  assert.equal(presentation.filtersOpen, true);
  assert.equal(presentation.showAttention, false);
  assert.equal(presentation.clearFiltersUrl, '/runner/submissions?sort=distance');
  assert.match(presentation.chips[0].href, /status=approved/);
  assert.match(presentation.pagination.nextUrl, /sort=distance&page=3/);
  assert.match(presentation.summaryUrls.rejected, /status=rejected/);

  const defaultPresentation = buildRunnerSubmissionListPresentation({ total: 4, page: 1, totalPages: 1 }, { rejected: 1 }, {});
  assert.equal(defaultPresentation.showAttention, true);
});

test('pagination exposes stable first, middle, and final navigation URLs', () => {
  const options = { q: 'Quest', status: 'approved', activityType: 'hike', sort: 'distance' };
  const first = buildRunnerSubmissionListPresentation({ total: 60, page: 1, totalPages: 3 }, {}, { ...options, page: 1 }).pagination;
  assert.equal(first.previousUrl, '');
  assert.equal(first.nextUrl, '/runner/submissions?q=Quest&status=approved&activityType=hike&sort=distance&page=2');

  const middle = buildRunnerSubmissionListPresentation({ total: 60, page: 2, totalPages: 3 }, {}, { ...options, page: 2 }).pagination;
  assert.match(middle.previousUrl, /q=Quest/);
  assert.doesNotMatch(middle.previousUrl, /page=/);
  assert.match(middle.nextUrl, /page=3/);

  const last = buildRunnerSubmissionListPresentation({ total: 60, page: 3, totalPages: 3 }, {}, { ...options, page: 3 }).pagination;
  assert.match(last.previousUrl, /page=2/);
  assert.equal(last.nextUrl, '');
});

test('list items expose runner-facing actions without internal review metadata', () => {
  const rejected = formatSubmissionListItem(doc({ status: 'rejected', suspiciousFlag: true, ocrData: { confidence: .99, rawText: 'private' } }));
  assert.equal(rejected.statusLabel, 'Needs correction');
  assert.equal(rejected.primaryAction.label, 'Fix entry');
  assert.equal(Object.hasOwn(rejected, 'needsAdditionalReview'), false);
  assert.equal(Object.hasOwn(rejected, 'ocrData'), false);

  const certified = formatSubmissionListItem(doc({ status: 'approved', certificate: { issuedAt: '2026-07-12T00:00:00.000Z' } }));
  assert.equal(certified.primaryAction.type, 'certificate');
  assert.equal(certified.primaryAction.label, 'Download certificate');
});

test('sorting handles missing duration last and uses stable IDs for ties', () => {
  const missing = doc({ _id: 'b', elapsedMs: 0 });
  const timed = doc({ _id: 'a', elapsedMs: 5000 });
  assert.ok(compareSubmissions(missing, timed, 'fastest') > 0);
  assert.ok(compareSubmissions(doc({ _id: 'b' }), doc({ _id: 'a' }), 'newest') > 0);
});

test('correction resolver uses rejection codes and respects Strava locking', () => {
  assert.deepEqual(resolveCorrectionPresentation({ status: 'rejected', rejectionCode: 'distance_mismatch' }).strategy, 'metadata');
  assert.deepEqual(resolveCorrectionPresentation({ status: 'rejected', rejectionCode: 'unclear_proof' }).strategy, 'proof');
  assert.deepEqual(resolveCorrectionPresentation({ status: 'rejected', rejectionCode: 'other' }).strategy, 'both');
  const strava = resolveCorrectionPresentation({ status: 'rejected', source: 'strava' });
  assert.equal(strava.strategy, 'strava');
  assert.equal(strava.canEditMetadata, false);
});

test('detail presentation omits race timing for accumulated activities and raw OCR internals', () => {
  const detail = formatSubmissionDetail(doc({
    submissionKind: 'accumulated_activity',
    status: 'rejected',
    rejectionCode: 'distance_mismatch',
    rejectionReason: 'Distance differs.',
    ocrData: { distanceMismatch: true, extractedDistanceKm: 8, confidence: .97, rawText: 'private text' }
  }));
  assert.equal(detail.presentation.metrics.some((metric) => metric.label === 'Duration'), false);
  assert.equal(detail.presentation.correction.canEditMetadata, true);
  assert.equal(detail.presentation.primaryAction.label, 'Correct activity details');
  assert.equal(Object.hasOwn(detail.ocrData, 'rawText'), false);
  assert.equal(Object.hasOwn(detail.ocrData, 'confidence'), false);
});
