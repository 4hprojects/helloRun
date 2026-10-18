'use strict';

/**
 * Prepare benchmark inputs from consented screenshots you placed in
 * benchmarks/ocr/local/images/ (git-ignored).
 *
 *   npm run ocr:benchmark:init
 *
 * - Adds every new JPEG/PNG/WebP to benchmarks/ocr/local/manifest.json with an EMPTY
 *   consentBasis: fill it in (e.g. "owner-own-activity") or the sample is skipped.
 * - Adds a labels entry with `verified: false` and a `suggested` block from the server OCR
 *   pipeline. Suggestions are a typing aid only. Check each value against the screenshot,
 *   copy the correct ones into the top-level fields (platform, distanceKm, elapsedMs, timeKind,
 *   runDate, runType, lines[].text), then set `verified: true`. Unverified labels are never scored.
 * - Never overwrites existing manifest or label entries. No network, no database.
 */

const fs = require('node:fs');
const path = require('node:path');

const LOCAL_DIR = path.resolve(__dirname, '../../benchmarks/ocr/local');
const IMAGE_DIR = path.join(LOCAL_DIR, 'images');
const MANIFEST = path.join(LOCAL_DIR, 'manifest.json');
const LABELS = path.join(LOCAL_DIR, 'labels.json');
const IMAGE_PATTERN = /\.(jpe?g|png|webp)$/i;

function readJson(file, fallback) {
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : fallback;
}

function sampleIdFor(fileName) {
  return path.basename(fileName, path.extname(fileName)).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || 'sample';
}

function suggestionFrom(result) {
  const fields = result.fields || {};
  const lines = [];
  for (const key of ['distance', 'time', 'pace']) {
    const location = fields[key]?.location;
    if (location?.boundingBox) lines.push({ id: key, bbox: location.boundingBox, text: location.rawText || '' });
  }
  return {
    platform: result.detection?.platformCandidate || 'unknown',
    distanceKm: fields.distance?.value?.valueKm ?? null,
    elapsedMs: fields.time?.value?.totalMs ?? null,
    timeKind: fields.time?.kind || 'unknown',
    runDate: fields.date?.value || null,
    runType: fields.runType?.value || null,
    lines,
    status: result.status,
    errorCode: result.errorCode || ''
  };
}

async function main() {
  fs.mkdirSync(IMAGE_DIR, { recursive: true });
  const images = fs.readdirSync(IMAGE_DIR).filter((file) => IMAGE_PATTERN.test(file)).sort();
  if (!images.length) {
    console.log(`No images yet. Put consented screenshots in ${IMAGE_DIR} and run this again.`);
    return;
  }
  const manifest = readJson(MANIFEST, { schemaVersion: 1, samples: [] });
  const labels = readJson(LABELS, { schemaVersion: 1, labels: {} });
  const known = new Set(manifest.samples.map((sample) => sample.image));
  const usedIds = new Set(manifest.samples.map((sample) => sample.id));
  const fresh = images.filter((file) => !known.has(`images/${file}`));
  if (!fresh.length) {
    console.log('Manifest already lists every image. Nothing to add.');
    return;
  }

  const { createEngine } = require('../services/ocr/ocr-engine');
  const { runOcrPipeline } = require('../services/ocr/ocr-pipeline.service');
  const { listProfiles } = require('../services/ocr/ocr-profiles');
  const engine = createEngine();
  const enabledProfileIds = listProfiles().map((profile) => profile.id);
  try {
    for (const file of fresh) {
      let id = sampleIdFor(file);
      for (let n = 2; usedIds.has(id); n += 1) id = `${sampleIdFor(file)}-${n}`;
      usedIds.add(id);
      manifest.samples.push({ id, image: `images/${file}`, platform: '', layout: '', activityGroupId: id, consentBasis: '' });
      const result = await runOcrPipeline(fs.readFileSync(path.join(IMAGE_DIR, file)), { engine, enabledProfileIds });
      if (!labels.labels[id]) {
        labels.labels[id] = {
          verified: false,
          platform: '',
          distanceKm: null,
          elapsedMs: null,
          timeKind: '',
          runDate: null,
          runType: null,
          lines: [],
          suggested: suggestionFrom(result)
        };
      }
      console.log(`added ${id} (${result.status}${result.errorCode ? `, ${result.errorCode}` : ''})`);
    }
  } finally {
    await engine.terminate();
  }
  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
  fs.writeFileSync(LABELS, JSON.stringify(labels, null, 2) + '\n');
  console.log(`\nUpdated ${path.relative(process.cwd(), MANIFEST)} and ${path.relative(process.cwd(), LABELS)}.`);
  console.log('Next: set consentBasis for each sample, verify labels against the screenshots, set verified: true,');
  console.log('then run `npm run ocr:benchmark -- --condition A` and `--condition B`.');
}

if (require.main === module) {
  main().catch((error) => {
    console.error('[ocr-benchmark-init] failed:', error?.message || error);
    process.exitCode = 1;
  });
}

module.exports = { sampleIdFor, suggestionFrom };
