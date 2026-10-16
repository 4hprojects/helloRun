'use strict';

// Runs the real tesseract.js engine and server pipeline on synthetic, rendered text
// (no personal screenshots, no DB, no network). Skips when the bundled tessdata is
// missing (it is downloaded on npm install). This checks the code path end to end; it
// is not an accuracy measurement — see docs/improvement-plan/ocr-platform-aware.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');
const { createEngine, BASE_TESSDATA_DIR } = require('../src/services/ocr/ocr-engine');
const { runOcrPipeline } = require('../src/services/ocr/ocr-pipeline.service');

const hasTessdata = fs.existsSync(path.join(BASE_TESSDATA_DIR, 'eng.traineddata.gz'));

function renderCard(lines, { width = 900, height = 1500, dark = false } = {}) {
  const fg = dark ? '#f5f5f5' : '#111111';
  const bg = dark ? '#121212' : '#ffffff';
  const text = lines.map((line, index) =>
    `<text x="60" y="${140 + index * 110}" font-size="56" font-family="DejaVu Sans, sans-serif" fill="${fg}">${line}</text>`).join('');
  return sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="${bg}"/>${text}</svg>`))
    .png()
    .toBuffer();
}

test('real engine reads a synthetic Strava-style card and confirms the brand', { skip: !hasTessdata, timeout: 120000 }, async () => {
  const engine = createEngine();
  try {
    const image = await renderCard(['STRAVA', 'Morning Run', 'Distance 5.02 km', 'Moving Time 28:30', 'Avg Pace 5:41 /km']);
    const result = await runOcrPipeline(image, { engine, enabledProfileIds: ['generic', 'strava'] });
    assert.notEqual(result.status, 'failed', result.errorCode);
    assert.equal(result.fields.distance.value?.valueKm, 5.02);
    assert.equal(result.fields.time.value?.totalMs, 1_710_000);
    assert.equal(result.detection.platform, 'strava');
    assert.ok(result.fields.distance.location?.boundingBox, 'distance line located for cropping');
    assert.equal(result.modelVersionId, 'base-eng');
  } finally {
    await engine.terminate();
  }
});

test('real engine leaves an unbranded dark card unconfirmed', { skip: !hasTessdata, timeout: 120000 }, async () => {
  const engine = createEngine();
  const cwdCache = path.join(process.cwd(), 'eng.traineddata');
  const hadCache = fs.existsSync(cwdCache);
  try {
    const image = await renderCard(['Evening Walk', 'Distance 3.10 km', 'Elapsed Time 41:05'], { dark: true });
    const result = await runOcrPipeline(image, { engine, enabledProfileIds: ['generic', 'strava', 'coros', 'garmin'] });
    assert.equal(result.detection.platform, 'unknown');
    assert.equal(result.layout.theme, 'dark');
    assert.equal(result.fields.distance.value?.valueKm, 3.1);
    assert.equal(result.fields.time.kind, 'elapsed');
    assert.equal(fs.existsSync(cwdCache), hadCache, 'no language cache written into the working directory');
  } finally {
    await engine.terminate();
  }
});
