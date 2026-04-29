const test = require('node:test');
const assert = require('node:assert/strict');

const {
  compareSubmissionWithOcr,
  detectSuspiciousActivity
} = require('../src/utils/submission-integrity');

test('detectSuspiciousActivity flags OCR elevation changed from 200m to 2000m', () => {
  const result = detectSuspiciousActivity({
    distanceKm: 10,
    elapsedMs: 60 * 60 * 1000,
    runType: 'trail_run',
    elevationGain: 2000,
    ocrData: {
      confidence: 0.9,
      extractedElevationGain: 200
    }
  });

  assert.equal(result.suspicious, true);
  assert.equal(result.comparisons.elevationMismatch, true);
  assert.match(result.reason, /elevation mismatch/i);
});

test('detectSuspiciousActivity does not flag normal elevation variation', () => {
  const result = detectSuspiciousActivity({
    distanceKm: 10,
    elapsedMs: 60 * 60 * 1000,
    runType: 'trail_run',
    elevationGain: 240,
    ocrData: {
      confidence: 0.9,
      extractedElevationGain: 200
    }
  });

  assert.equal(result.suspicious, false);
  assert.equal(result.comparisons.elevationMismatch, false);
});

test('detectSuspiciousActivity flags extreme elevation density', () => {
  const result = detectSuspiciousActivity({
    distanceKm: 5,
    elapsedMs: 60 * 60 * 1000,
    runType: 'run',
    elevationGain: 1500,
    ocrData: {}
  });

  assert.equal(result.suspicious, true);
  assert.match(result.reason, /m\/km/i);
});

test('detectSuspiciousActivity flags implausible steps and cadence', () => {
  const result = detectSuspiciousActivity({
    distanceKm: 5,
    elapsedMs: 10 * 60 * 1000,
    runType: 'run',
    steps: 30000,
    ocrData: {}
  });

  assert.equal(result.suspicious, true);
  assert.match(result.reason, /steps per kilometer/i);
  assert.match(result.reason, /cadence/i);
});

test('compareSubmissionWithOcr detects date, run type, and location mismatches', () => {
  const result = compareSubmissionWithOcr({
    distanceKm: 5,
    elapsedMs: 30 * 60 * 1000,
    runDate: '2026-04-20',
    runLocation: 'Manila',
    runType: 'run',
    ocrData: {
      confidence: 0.9,
      extractedRunDate: '2026-04-18',
      extractedRunLocation: 'Baguio',
      extractedRunType: 'walk'
    }
  });

  assert.equal(result.dateMismatch, true);
  assert.equal(result.runTypeMismatch, true);
  assert.equal(result.locationMismatch, true);
});
