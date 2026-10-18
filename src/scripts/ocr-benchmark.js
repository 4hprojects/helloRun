'use strict';

/**
 * OCR baseline benchmark (Phase 0 of docs/improvement-plan/ocr-platform-aware).
 *
 * DB-free and network-free. Reads a local manifest of consented screenshots and
 * a separate labels file, runs tesseract.js in Node, scores the current browser
 * parser and prints a JSON report.
 *
 *   npm run ocr:benchmark -- [--manifest benchmarks/ocr/local/manifest.json]
 *                            [--labels benchmarks/ocr/local/labels.json]
 *                            [--out benchmarks/ocr/local/report.json]
 *
 * Condition A (doc 06): unmodified page OCR (eng, PSM 11) on the original image,
 * then the existing parser. The browser's canvas preprocessing passes are not
 * replicated here, so results describe the engine + parser, not the full
 * runner experience.
 * Condition B (`--condition B`): the server pipeline (sharp passes, platform
 * detection, profiles) as used by the OCR worker. `--profiles all` lets test
 * profiles confirm platforms; the default uses every non-retired profile.
 * Run A and B on the same manifest to compare them.
 *
 * Images and labels stay in the git-ignored benchmarks/ocr/local/ directory.
 * Samples without a recorded consentBasis are skipped, not scored.
 */

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const { loadBrowserOcrParser } = require('../utils/ocr/browser-parser-loader');
const { predictionFromParsed, scoreBenchmark } = require('../utils/ocr/benchmark-metrics');

/** Map a server pipeline result onto the same scored fields as condition A. */
function predictionFromPipeline(result = {}) {
  const fields = result.fields || {};
  return predictionFromParsed({
    detectedSource: result.detection?.platform,
    distance: fields.distance?.value,
    time: fields.time?.value,
    date: fields.date?.value,
    runType: fields.runType?.value
  });
}

const REPO_ROOT = path.resolve(__dirname, '../..');
const DEFAULT_MANIFEST = path.join(REPO_ROOT, 'benchmarks/ocr/local/manifest.json');
const TESSDATA_DIR = path.join(REPO_ROOT, 'src/public/assets/tessdata');
const CONDITIONS = Object.freeze({
  A: 'A-baseline-page-ocr',
  B: 'B-server-pipeline-profiles'
});
const PAGE_SEGMENTATION_SPARSE_TEXT = '11';
const PAGE_SEGMENTATION_SINGLE_LINE = '7';

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[index + 1];
    if (next === undefined || next.startsWith('--')) {
      args[key] = true;
    } else {
      args[key] = next;
      index += 1;
    }
  }
  return args;
}

function readJsonIfPresent(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return { exists: false, raw: '', data: null };
  const raw = fs.readFileSync(filePath, 'utf8');
  return { exists: true, raw, data: JSON.parse(raw) };
}

/** Resolve an image path and refuse anything outside the manifest directory. */
function resolveSampleImage(manifestDir, relativeImagePath) {
  const resolved = path.resolve(manifestDir, String(relativeImagePath || ''));
  const root = path.resolve(manifestDir) + path.sep;
  if (!resolved.startsWith(root)) return null;
  return resolved;
}

function countBy(samples, keyFn) {
  const counts = {};
  for (const sample of samples) {
    const key = keyFn(sample);
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

function createTesseractRecognizer() {
  const { createWorker } = require('tesseract.js');
  let workerPromise = null;

  function getWorker() {
    if (!workerPromise) {
      workerPromise = createWorker('eng', 1, { langPath: TESSDATA_DIR, gzip: true, cacheMethod: 'none', logger: () => {} });
    }
    return workerPromise;
  }

  return {
    async recognizePage(buffer) {
      const worker = await getWorker();
      await worker.setParameters({ tessedit_pageseg_mode: PAGE_SEGMENTATION_SPARSE_TEXT });
      const { data } = await worker.recognize(buffer);
      return { text: data?.text || '', confidence: Number(data?.confidence) || 0 };
    },
    async recognizeLine(buffer, bbox) {
      const sharp = require('sharp');
      const crop = await sharp(buffer)
        .extract({
          left: Math.max(0, Math.round(bbox.left)),
          top: Math.max(0, Math.round(bbox.top)),
          width: Math.max(1, Math.round(bbox.width)),
          height: Math.max(1, Math.round(bbox.height))
        })
        .png()
        .toBuffer();
      const worker = await getWorker();
      await worker.setParameters({ tessedit_pageseg_mode: PAGE_SEGMENTATION_SINGLE_LINE });
      const { data } = await worker.recognize(crop);
      return String(data?.text || '').trim();
    },
    async close() {
      if (!workerPromise) return;
      const worker = await workerPromise;
      await worker.terminate().catch(() => {});
    }
  };
}

/**
 * @param {{ manifest: object|null, labels: object|null, manifestDir: string,
 *           recognizer?: object, parser?: object, readFile?: Function, now?: Function }} input
 */
async function runBenchmark(input) {
  const {
    manifest,
    labels,
    manifestDir,
    recognizer,
    condition = 'A',
    pipelineRunner = null,
    parser = loadBrowserOcrParser(),
    readFile = fs.readFileSync,
    now = () => Date.now()
  } = input;

  const declared = Array.isArray(manifest?.samples) ? manifest.samples : [];
  const labelMap = labels?.labels && typeof labels.labels === 'object' ? labels.labels : {};
  const skipped = [];
  const eligible = [];

  for (const sample of declared) {
    const id = String(sample?.id || '').trim();
    if (!id) { skipped.push({ id: '', reason: 'missing_id' }); continue; }
    if (!String(sample.consentBasis || '').trim()) { skipped.push({ id, reason: 'missing_consent_basis' }); continue; }
    const imagePath = resolveSampleImage(manifestDir, sample.image);
    if (!imagePath) { skipped.push({ id, reason: 'image_outside_manifest_dir' }); continue; }
    eligible.push({ ...sample, id, imagePath });
  }

  const results = [];
  for (const sample of eligible) {
    // `verified: false` marks a suggestion from `npm run ocr:benchmark:init` that nobody has
    // checked yet; it is never scored.
    const candidate = labelMap[sample.id] || null;
    const label = candidate && candidate.verified !== false ? candidate : null;
    const result = {
      id: sample.id,
      platform: sample.platform || label?.platform || '',
      layout: sample.layout || '',
      label,
      prediction: {},
      lineHypotheses: {},
      elapsedMsProcessing: null,
      errorCode: ''
    };
    try {
      const buffer = readFile(sample.imagePath);
      const started = now();
      if (condition === 'B') {
        const pipelineResult = await pipelineRunner(buffer);
        result.elapsedMsProcessing = now() - started;
        if (pipelineResult.status === 'failed') result.errorCode = pipelineResult.errorCode || 'ocr_failed';
        result.prediction = predictionFromPipeline(pipelineResult);
      } else {
        const page = await recognizer.recognizePage(buffer);
        const parsed = parser._parseOcrText(page.text, page.confidence);
        result.elapsedMsProcessing = now() - started;
        result.prediction = predictionFromParsed(parsed);
      }
      for (const line of Array.isArray(label?.lines) ? label.lines : []) {
        if (!line?.id || !line?.bbox) continue;
        result.lineHypotheses[line.id] = await recognizer.recognizeLine(buffer, line.bbox);
      }
    } catch (error) {
      result.errorCode = error?.code === 'ENOENT' ? 'image_not_found' : 'ocr_failed';
    }
    results.push(result);
  }

  return {
    condition: CONDITIONS[condition] || CONDITIONS.A,
    parserVersion: parser._parseOcrText('', 0).parserVersion || '',
    sampleCount: results.length,
    labeledSampleCount: results.filter((r) => r.label).length,
    skipped,
    distribution: {
      byPlatform: countBy(results, (r) => r.platform || 'unlabeled'),
      byPlatformLayout: countBy(results, (r) => `${r.platform || 'unlabeled'}/${r.layout || 'unlabeled'}`),
      activityGroups: new Set(eligible.map((s) => s.activityGroupId || s.id)).size
    },
    metrics: scoreBenchmark(results),
    samples: results.map(({ id, platform, layout, prediction, errorCode, elapsedMsProcessing }) => ({
      id, platform, layout, prediction, errorCode, elapsedMsProcessing
    }))
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const manifestPath = path.resolve(args.manifest || DEFAULT_MANIFEST);
  const labelsPath = path.resolve(args.labels || path.join(path.dirname(manifestPath), 'labels.json'));
  const manifestFile = readJsonIfPresent(manifestPath);
  const labelsFile = readJsonIfPresent(labelsPath);

  const declaredSamples = Array.isArray(manifestFile.data?.samples) ? manifestFile.data.samples : [];
  const condition = String(args.condition || 'A').toUpperCase() === 'B' ? 'B' : 'A';
  const recognizer = declaredSamples.length ? createTesseractRecognizer() : null;
  let pipelineEngine = null;
  let pipelineRunner = null;
  if (condition === 'B' && declaredSamples.length) {
    const { createEngine } = require('../services/ocr/ocr-engine');
    const { runOcrPipeline } = require('../services/ocr/ocr-pipeline.service');
    const { listProfiles } = require('../services/ocr/ocr-profiles');
    pipelineEngine = createEngine();
    const enabledProfileIds = args.profiles === 'active'
      ? listProfiles().filter((profile) => profile.status === 'active').map((profile) => profile.id)
      : listProfiles().filter((profile) => profile.status !== 'retired').map((profile) => profile.id);
    pipelineRunner = (buffer) => runOcrPipeline(buffer, { engine: pipelineEngine, enabledProfileIds });
  }

  let report;
  try {
    report = await runBenchmark({
      manifest: manifestFile.data,
      labels: labelsFile.data,
      manifestDir: path.dirname(manifestPath),
      recognizer,
      condition,
      pipelineRunner
    });
  } finally {
    if (recognizer) await recognizer.close();
    if (pipelineEngine) await pipelineEngine.terminate();
  }

  const tesseractVersion = require('tesseract.js/package.json').version;
  const output = {
    generatedAt: new Date().toISOString(),
    environment: { node: process.version, tesseractJs: tesseractVersion, language: 'eng' },
    inputs: {
      manifestFound: manifestFile.exists,
      labelsFound: labelsFile.exists,
      inputHash: crypto.createHash('sha256').update(manifestFile.raw).update('\0').update(labelsFile.raw).digest('hex')
    },
    note: report.sampleCount
      ? 'Counts and rates are measured on the listed samples only; check distribution before generalising.'
      : 'No eligible samples. All metrics are N/A; no accuracy has been measured.',
    ...report
  };

  const json = JSON.stringify(output, null, 2);
  if (args.out) {
    fs.writeFileSync(path.resolve(args.out), json + '\n');
    console.log(`[ocr-benchmark] wrote ${args.out} (${report.sampleCount} samples)`);
  } else {
    console.log(json);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error('[ocr-benchmark] failed:', error?.message || error);
    process.exitCode = 1;
  });
}

module.exports = { CONDITIONS, parseArgs, resolveSampleImage, runBenchmark, predictionFromPipeline };
