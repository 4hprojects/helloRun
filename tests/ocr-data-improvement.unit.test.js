'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const OcrJob = require('../src/models/OcrJob');
const TrainingJob = require('../src/models/TrainingJob');
const OcrProductEvent = require('../src/models/OcrProductEvent');
const { sanitizeOcrProductEvent, RETENTION_MS } = require('../src/controllers/runner-ocr-events.controller');
const {
  ROW_LIMIT,
  boundedFind,
  jobStats,
  browserOcrStats,
  entryStats,
  formatResearchExportCsv
} = require('../src/services/ocr/ocr-analytics.service');
const { buildOcrVerification, resolveOcrSource } = require('../src/utils/ocr/reviewer-verification');

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function query(rows, observed = {}) {
  return {
    select(value) { observed.select = value; return this; },
    sort(value) { observed.sort = value; return this; },
    limit(value) { observed.limit = value; return this; },
    lean() { return Promise.resolve(rows); }
  };
}

test('workflow telemetry keeps only allowlisted aggregate fields for 90 days', () => {
  const now = new Date('2026-11-16T00:00:00.000Z');
  const payload = sanitizeOcrProductEvent({
    flowId: 'random_flow_1234567890',
    event: 'analysis_completed',
    latencyMs: 999999,
    targetKind: 'standard',
    deviceClass: 'mobile',
    resultStatus: 'complete',
    detectedPlatform: 'strava',
    fieldsDetected: ['distance', 'distance', 'duration', 'raw_text'],
    userId: 'must-not-survive',
    imageHash: 'must-not-survive',
    rawText: 'must-not-survive',
    location: 'must-not-survive',
    url: 'must-not-survive'
  }, now);

  assert.deepEqual(Object.keys(payload).sort(), [
    'detectedPlatform', 'deviceClass', 'event', 'expiresAt', 'fieldsDetected',
    'flowId', 'latencyMs', 'occurredAt', 'resultStatus', 'targetKind'
  ]);
  assert.equal(payload.latencyMs, 300000);
  assert.deepEqual(payload.fieldsDetected, ['distance', 'duration']);
  assert.equal(payload.expiresAt.getTime() - now.getTime(), RETENTION_MS);
  assert.equal(sanitizeOcrProductEvent({ flowId: 'short', event: 'modal_opened' }, now), null);
  assert.equal(sanitizeOcrProductEvent({ flowId: 'random_flow_1234567890', event: 'not_allowed' }, now), null);
  assert.ok(OcrProductEvent.schema.indexes().some(([keys, options]) => keys.expiresAt === 1 && options.expireAfterSeconds === 0));
});

test('bounded analytics queries sort, cap at 20,001, and report truncation', async () => {
  const observed = {};
  const rows = Array.from({ length: ROW_LIMIT + 1 }, (_, index) => ({ index }));
  const result = await boundedFind({ find: () => query(rows, observed) }, {}, 'status', { createdAt: -1 });
  assert.equal(result.rows.length, ROW_LIMIT);
  assert.equal(result.truncated, true);
  assert.deepEqual(observed.sort, { createdAt: -1 });
  assert.equal(observed.limit, ROW_LIMIT + 1);
});

test('failed and timed-out pipelines come from OCR jobs', async () => {
  const originalOcrFind = OcrJob.find;
  const originalTrainingFind = TrainingJob.find;
  OcrJob.find = () => query([
    { status: 'completed', elapsedMs: 1000, createdAt: new Date() },
    { status: 'failed', errorCode: 'recognition_timeout', createdAt: new Date() },
    { status: 'failed', errorCode: 'proof_missing', createdAt: new Date() }
  ]);
  TrainingJob.find = () => query([]);
  try {
    const stats = await jobStats(new Date(0), new Date());
    assert.equal(stats.total, 3);
    assert.equal(stats.failed, 2);
    assert.equal(stats.timedOut, 1);
    assert.equal(stats.failureRate, 0.6667);
    assert.deepEqual(stats.extractionFailures, [
      { errorCode: 'recognition_timeout', count: 1 },
      { errorCode: 'proof_missing', count: 1 }
    ]);
  } finally {
    OcrJob.find = originalOcrFind;
    TrainingJob.find = originalTrainingFind;
  }
});

test('analytics covers browser OCR, all correction fields, and proven server approvals only', () => {
  const submittedAt = new Date('2026-11-16T00:00:00.000Z');
  const reviewedAt = new Date('2026-11-16T00:10:00.000Z');
  const base = {
    submittedAt,
    reviewedAt,
    reviewedBy: 'reviewer',
    status: 'approved',
    proof: { key: 'proof/current.webp' },
    validation: { method: 'ocr' },
    ocrData: {
      detectedSource: 'strava', confidence: 0.92, extractedDistanceKm: 5,
      extractedTimeMs: 1800000, distanceMismatch: true
    },
    organizerCorrections: [{ changes: [
      { field: 'distanceKm' }, { field: 'elapsedMs' }, { field: 'runDate' },
      { field: 'runType' }, { field: 'elevationGain' }, { field: 'steps' }, { field: 'runLocation' }
    ] }],
    serverOcr: {
      platform: 'strava', status: 'complete', proofKey: 'proof/current.webp', decision: 'auto_approved',
      autoApproval: { distanceMismatch: true }
    }
  };
  const browser = browserOcrStats([base])[0];
  assert.equal(browser.submissions, 1);
  assert.equal(browser.confidenceBands.high, 1);
  assert.equal(browser.correctionRate, 1);
  assert.equal(browser.reviewMinutesMedian, 10);

  const unreviewed = { ...base, reviewedAt: null, reviewedBy: null, organizerCorrections: [] };
  const proven = entryStats([unreviewed])[0];
  assert.equal(proven.autoApproved, 1);
  assert.deepEqual(Object.keys(entryStats([base])[0].correctionsByField).sort(), [
    'distanceKm', 'elapsedMs', 'elevationGain', 'runDate', 'runLocation', 'runType', 'steps'
  ]);
  assert.equal(entryStats([{ ...unreviewed, serverOcr: { ...unreviewed.serverOcr, decision: 'review' } }])[0].autoApproved, 0);
  assert.equal(entryStats([{ ...unreviewed, serverOcr: { ...unreviewed.serverOcr, proofKey: 'proof/old.webp' } }])[0].autoApproved, 0);
});

test('zero-data research export keeps columns and emits every aggregate section', () => {
  const analytics = {
    generatedAt: new Date('2026-11-16T00:00:00.000Z'), windowDays: 365, metricRulesVersion: 'v1',
    coverage: {
      submissionsObserved: 0, browserOcrObserved: 0, serverOcrObserved: 0,
      extractionsObserved: 0, jobsObserved: 0, reviewedObserved: 0,
      trainingLinesObserved: 0, telemetryEventsObserved: 0,
      submissionsTruncated: false, extractionsTruncated: false, jobsTruncated: false,
      trainingLinesTruncated: false, telemetryEventsTruncated: false
    },
    browserOcr: [], extraction: [], entries: [], groundTruth: [], models: [],
    jobs: { total: 0, failed: 0, timedOut: 0, stuck: 0, failureRate: 'N/A', extractionByStatus: {} },
    consent: { shown: 0, granted: 0, withdrawn: 0, grantRate: 'N/A' },
    funnel: { events: {}, observed: 0, completionRate: 'N/A', analysisFailureRate: 'N/A', completionTimeP95Ms: 'N/A' }
  };
  const csv = formatResearchExportCsv(analytics, 'zero');
  const lines = csv.trim().split('\n');
  assert.equal(lines[0], 'experiment_id,generated_at,window_days,metric_rules_version,section,platform,segment,n,metric,value');
  assert.ok(lines.length > 10);
  for (const section of ['coverage', 'browser_ocr', 'server_ocr', 'review', 'consent', 'funnel']) {
    assert.match(csv, new RegExp(',' + section + ','));
  }
});

test('reviewers must adjudicate current OCR evidence; stale server readings fall back to browser context', () => {
  const entry = {
    proof: { key: 'proof/current.webp' }, distanceKm: 5,
    ocrData: { confidence: 0.8, extractedDistanceKm: 5 },
    serverOcr: {
      status: 'complete', proofKey: 'proof/current.webp',
      autoApproval: { extractedDistanceKm: 5, distanceMismatch: false }
    }
  };
  assert.equal(resolveOcrSource(entry).source, 'server_ocr');
  assert.throws(() => buildOcrVerification(entry, '', '507f1f77bcf86cd799439011'), { code: 'ocr_verification_required' });
  const evidence = buildOcrVerification(entry, 'confirmed', '507f1f77bcf86cd799439011');
  assert.equal(evidence.status, 'confirmed');
  assert.equal(evidence.fields[0].runnerValue, '5');
  const unreadable = buildOcrVerification({
    proof: { key: 'proof/current.webp' },
    serverOcr: { status: 'failed', proofKey: 'proof/current.webp' }
  }, 'unreadable', '507f1f77bcf86cd799439011');
  assert.equal(unreadable.source, 'server_ocr');
  assert.equal(unreadable.fields.length, 0);
  assert.equal(resolveOcrSource({ ...entry, serverOcr: { ...entry.serverOcr, proofKey: 'proof/old.webp' } }).source, 'browser_ocr');
});

test('runner workflow lazy-loads OCR, preserves chosen dates, and clears stale verification on resubmission', () => {
  const footer = read('src/views/layouts/footer.ejs');
  const modal = read('src/public/js/run-proof-modal.js');
  const submissionService = read('src/services/submission.service.js');
  assert.doesNotMatch(footer, /tesseract\.min\.js|ocr-proof-reader\.js/);
  assert.match(modal, /const ensureOcrScriptsLoaded/);
  assert.match(modal, /if \(!chosenDate\)[\s\S]*runDateInput\.value = result\.date[\s\S]*else if \(chosenDate !== result\.date\)/);
  assert.match(modal, /Use detected date|ocrDateSuggestion/);
  assert.match(submissionService, /existing\.ocrVerification = undefined/);
});
