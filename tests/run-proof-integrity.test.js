const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadModule() {
  const src = fs.readFileSync(path.join(__dirname, '../src/public/js/run-proof-integrity.js'), 'utf8');
  const ctx = { window: {} };
  vm.createContext(ctx);
  vm.runInContext(src, ctx, { filename: 'run-proof-integrity.js' });
  return ctx.window.RunProofIntegrity;
}

const integrity = loadModule();

test('run-proof integrity flags edited OCR values and returns warnings', () => {
  const result = integrity.compareWithForm({
    confidence: 0.9,
    distance: { valueKm: 10 },
    time: { totalMs: 3600000 },
    elevationGain: { value: 200 },
    steps: 12000,
    date: '2026-04-20',
    location: 'Baguio',
    runType: 'walk'
  }, {
    distanceKm: 12,
    elapsedMs: 3900000,
    elevationGain: 2000,
    steps: 20000,
    runDate: '2026-04-22',
    runLocation: 'Manila',
    runType: 'run'
  });

  assert.equal(result.distanceMismatch, true);
  assert.equal(result.timeMismatch, true);
  assert.equal(result.elevationMismatch, true);
  assert.equal(result.stepsMismatch, true);
  assert.equal(result.dateMismatch, true);
  assert.equal(result.locationMismatch, true);
  assert.equal(result.runTypeMismatch, true);
  assert.ok(result.warnings.length >= 7);
});

test('run-proof integrity returns no warnings for normal reviewed values', () => {
  const result = integrity.compareWithForm({
    confidence: 0.9,
    distance: { valueKm: 10 },
    time: { totalMs: 3600000 },
    elevationGain: { value: 200 },
    steps: 12000,
    date: '2026-04-20',
    location: 'Baguio City',
    runType: 'run'
  }, {
    distanceKm: 10.05,
    elapsedMs: 3630000,
    elevationGain: 230,
    steps: 12400,
    runDate: '2026-04-20',
    runLocation: 'Baguio',
    runType: 'run'
  });

  assert.equal(result.distanceMismatch, false);
  assert.equal(result.timeMismatch, false);
  assert.equal(result.elevationMismatch, false);
  assert.equal(result.stepsMismatch, false);
  assert.equal(result.dateMismatch, false);
  assert.equal(result.locationMismatch, false);
  assert.equal(result.runTypeMismatch, false);
  assert.equal(result.warnings.length, 0);
});
