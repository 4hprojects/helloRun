'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const {
  NOT_AVAILABLE,
  levenshtein,
  characterErrorRate,
  predictionFromParsed,
  fieldMatches,
  scoreBenchmark
} = require('../src/utils/ocr/benchmark-metrics');
const { resolveSampleImage, runBenchmark } = require('../src/scripts/ocr-benchmark');

test('levenshtein counts insertions, deletions and substitutions', () => {
  assert.equal(levenshtein('', ''), 0);
  assert.equal(levenshtein('5.02 km', '5.02 km'), 0);
  assert.equal(levenshtein('5.O2 km', '5.02 km'), 1);
  assert.equal(levenshtein('502 km', '5.02 km'), 1);
  assert.equal(levenshtein('kitten', 'sitting'), 3);
});

test('character error rate is edits over reference length, null without a reference', () => {
  assert.equal(characterErrorRate('5.O2 km', '5.02 km'), 1 / 7);
  assert.equal(characterErrorRate('anything', ''), null);
});

test('predictionFromParsed maps parser output onto scored fields', () => {
  const prediction = predictionFromParsed({
    detectedSource: 'Strava',
    distance: { value: 5.02, unit: 'km', valueKm: 5.02 },
    time: { totalMs: 1_710_000 },
    date: '2026-10-01',
    runType: 'run'
  });
  assert.deepEqual(prediction, {
    platform: 'strava', distanceKm: 5.02, elapsedMs: 1_710_000, runDate: '2026-10-01', runType: 'run'
  });
  assert.deepEqual(predictionFromParsed({}), {
    platform: null, distanceKm: null, elapsedMs: null, runDate: null, runType: null
  });
});

test('fieldMatches applies documented tolerances and skips unlabeled fields', () => {
  assert.equal(fieldMatches('distanceKm', 5.01, 5.02), true);
  assert.equal(fieldMatches('distanceKm', 5.0, 5.02), false);
  assert.equal(fieldMatches('elapsedMs', 1_710_400, 1_710_000), true);
  assert.equal(fieldMatches('elapsedMs', 1_711_000, 1_710_000), false);
  assert.equal(fieldMatches('runType', 'RUN', 'run'), true);
  assert.equal(fieldMatches('runDate', null, '2026-10-01'), false);
  assert.equal(fieldMatches('runDate', '2026-10-01', undefined), null);
});

test('an empty benchmark reports N/A everywhere instead of a number', () => {
  const report = scoreBenchmark([]);
  assert.equal(report.overall.samples, 0);
  assert.equal(report.overall.requiredFieldCompleteness, NOT_AVAILABLE);
  assert.equal(report.overall.cer.value, NOT_AVAILABLE);
  assert.equal(report.overall.latencyMs.median, NOT_AVAILABLE);
  for (const field of Object.values(report.overall.fields)) {
    assert.equal(field.exactAccuracy, NOT_AVAILABLE);
  }
  assert.deepEqual(report.byPlatformLayout, {});
});

test('scoreBenchmark separates platforms and only scores labeled fields', () => {
  const report = scoreBenchmark([
    {
      platform: 'strava', layout: 'android', elapsedMsProcessing: 100,
      label: { platform: 'strava', distanceKm: 5.02, elapsedMs: 1_710_000, lines: [{ id: 'd', text: '5.02 km' }] },
      prediction: { platform: 'strava', distanceKm: 5.02, elapsedMs: null },
      lineHypotheses: { d: '5.O2 km' }
    },
    {
      platform: 'coros', layout: 'summary', elapsedMsProcessing: 300,
      label: { platform: 'coros', distanceKm: 10 },
      prediction: { platform: 'unknown', distanceKm: 10 }
    }
  ]);

  assert.equal(report.overall.samples, 2);
  assert.deepEqual(report.overall.fields.platform, { evaluable: 2, correct: 1, exactAccuracy: 0.5 });
  assert.deepEqual(report.overall.fields.runDate, { evaluable: 0, correct: 0, exactAccuracy: NOT_AVAILABLE });
  assert.equal(report.overall.requiredFieldCompleteness, Number((2 / 3).toFixed(4)));
  assert.equal(report.overall.cer.lines, 1);
  assert.equal(report.overall.cer.value, Number((1 / 7).toFixed(4)));
  assert.equal(report.byPlatformLayout['strava/android'].fields.elapsedMs.exactAccuracy, 0);
  assert.equal(report.byPlatformLayout['coros/summary'].fields.platform.exactAccuracy, 0);
  assert.equal(report.overall.latencyMs.median, 100);
  assert.equal(report.overall.latencyMs.p95, 300);
});

test('sample images must stay inside the manifest directory', () => {
  const dir = path.resolve('/bench/local');
  assert.equal(resolveSampleImage(dir, 'images/a.png'), path.join(dir, 'images/a.png'));
  assert.equal(resolveSampleImage(dir, '../../etc/passwd'), null);
  assert.equal(resolveSampleImage(dir, '/etc/passwd'), null);
});

test('runBenchmark skips unconsented samples and scores the real parser with an injected engine', async () => {
  const recognizer = {
    async recognizePage() {
      return { text: 'Morning Run\nStrava\nDistance 5.02 km\nMoving Time 28:30\nAvg Pace 5:41 /km', confidence: 88 };
    },
    async recognizeLine() { return '5.02 km'; }
  };
  let clock = 0;
  const report = await runBenchmark({
    manifestDir: path.resolve('/bench/local'),
    manifest: {
      samples: [
        { id: 's1', image: 'a.png', platform: 'strava', layout: 'android', consentBasis: 'owner-own-activity' },
        { id: 's2', image: 'b.png', platform: 'strava', layout: 'android' },
        { id: 's3', image: '../x.png', platform: 'strava', consentBasis: 'owner-own-activity' }
      ]
    },
    labels: {
      labels: {
        s1: {
          platform: 'strava', distanceKm: 5.02, elapsedMs: 1_710_000,
          lines: [{ id: 'distance', bbox: { left: 0, top: 0, width: 10, height: 10 }, text: '5.02 km' }]
        }
      }
    },
    recognizer,
    readFile: () => Buffer.from('fake'),
    now: () => (clock += 50)
  });

  assert.equal(report.sampleCount, 1);
  assert.deepEqual(report.skipped.map((s) => s.reason), ['missing_consent_basis', 'image_outside_manifest_dir']);
  assert.equal(report.metrics.overall.fields.distanceKm.exactAccuracy, 1);
  assert.equal(report.metrics.overall.fields.platform.exactAccuracy, 1);
  assert.equal(report.metrics.overall.cer.value, 0);
  assert.equal(report.samples[0].elapsedMsProcessing, 50);
  assert.match(report.parserVersion, /^\d{4}-/);
});

test('runBenchmark records engine failures without throwing', async () => {
  const report = await runBenchmark({
    manifestDir: path.resolve('/bench/local'),
    manifest: { samples: [{ id: 's1', image: 'missing.png', consentBasis: 'owner-own-activity' }] },
    labels: null,
    recognizer: { async recognizePage() { throw new Error('boom'); }, async recognizeLine() { return ''; } },
    readFile: () => Buffer.from('fake')
  });
  assert.equal(report.samples[0].errorCode, 'ocr_failed');
  assert.equal(report.metrics.overall.errors, 1);
});

test('condition B scores the server pipeline output on the same fields', async () => {
  const report = await runBenchmark({
    manifestDir: path.resolve('/bench/local'),
    manifest: { samples: [{ id: 's1', image: 'a.png', platform: 'strava', layout: 'android', consentBasis: 'owner-own-activity' }] },
    labels: { labels: { s1: { platform: 'strava', distanceKm: 5.02, elapsedMs: 1_710_000 } } },
    condition: 'B',
    pipelineRunner: async () => ({
      status: 'complete',
      detection: { platform: 'strava' },
      fields: { distance: { value: { valueKm: 5.02 } }, time: { value: { totalMs: 1_710_000 } }, date: { value: null }, runType: { value: 'run' } }
    }),
    readFile: () => Buffer.from('fake')
  });
  assert.equal(report.condition, 'B-server-pipeline-profiles');
  assert.equal(report.metrics.overall.fields.platform.exactAccuracy, 1);
  assert.equal(report.metrics.overall.fields.distanceKm.exactAccuracy, 1);
  assert.equal(report.metrics.overall.fields.elapsedMs.exactAccuracy, 1);
});
