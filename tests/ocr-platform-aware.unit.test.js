'use strict';

// Phase 1 of docs/improvement-plan/ocr-platform-aware — server OCR, platform detection,
// auto-approval gating and admin surfaces. DB-free: no MongoDB, no R2, no network.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ejs = require('ejs');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..');
const { detectPlatform } = require('../src/services/ocr/platform-detector');
const { listProfiles, getProfile, GENERIC_PROFILE_ID } = require('../src/services/ocr/ocr-profiles');
const preprocess = require('../src/services/ocr/ocr-preprocess');
const { runOcrPipeline, fieldNeedles, detectTimeKind, buildValidationFlags, computeParserConfidence } = require('../src/services/ocr/ocr-pipeline.service');
const { createEngine } = require('../src/services/ocr/ocr-engine');
const config = require('../src/services/ocr/ocr-config');
const validation = require('../src/services/submission-validation.service');
const { buildAutoApprovalProjection, queueProofExtraction, buildExtractionDocument } = require('../src/services/ocr/server-ocr.service');
const { namesMatch } = require('../src/utils/ocr/name-match');

function withEnv(values, fn) {
  const previous = {};
  for (const key of Object.keys(values)) {
    previous[key] = process.env[key];
    if (values[key] === undefined) delete process.env[key];
    else process.env[key] = values[key];
  }
  const restore = () => {
    for (const key of Object.keys(values)) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  };
  try {
    const result = fn();
    if (result && typeof result.then === 'function') return result.finally(restore);
    restore();
    return result;
  } catch (error) {
    restore();
    throw error;
  }
}

async function makeImage({ width = 600, height = 1000, background = '#ffffff' } = {}) {
  return sharp({ create: { width, height, channels: 3, background } }).png().toBuffer();
}

// ---------------------------------------------------------------------------
// Platform detection
// ---------------------------------------------------------------------------

test('generic metric labels alone are not platform evidence (Phase 0 finding C8)', () => {
  const result = detectPlatform('Morning Run\nDistance 5.02 km\nMoving Time 28:30\nAvg Pace 5:41 /km\nElevation Gain 12 m');
  assert.equal(result.status, 'unknown');
  assert.equal(result.platform, 'unknown');
  assert.equal(result.profileId, GENERIC_PROFILE_ID);
});

test('brand text confirms a platform; anchors add supporting evidence', () => {
  const result = detectPlatform('STRAVA\nMorning Run\nRelative Effort 34\nKudos from 3 athletes\n5.02 km');
  assert.equal(result.status, 'confirmed');
  assert.equal(result.platform, 'strava');
  assert.equal(result.profileId, 'strava');
  assert.ok(result.signals.some((signal) => signal.kind === 'brand_text'));
  assert.ok(result.signals.some((signal) => signal.kind === 'layout_anchor'));
});

test('anchors without brand text stay uncertain', () => {
  const result = detectPlatform('Relative Effort 34\nSegments 2\nDistance 5.02 km');
  assert.equal(result.status, 'uncertain');
  assert.equal(result.platformCandidate, 'strava');
  assert.equal(result.platform, 'unknown');
  assert.equal(result.profileId, GENERIC_PROFILE_ID);
});

test('two brands with no clear lead abstain', () => {
  const result = detectPlatform('Synced from Garmin to Strava\n10.00 km');
  assert.equal(result.status, 'uncertain');
  assert.equal(result.platform, 'unknown');
});

test('a profile that is not enabled cannot confirm', () => {
  const text = 'COROS\nTraining Load 88\n10.00 km';
  assert.equal(detectPlatform(text).platform, 'coros');
  const restricted = detectPlatform(text, { enabledProfileIds: ['generic', 'strava'] });
  assert.equal(restricted.platform, 'unknown');
  assert.equal(restricted.status, 'unknown');
});

test('URL provider is a separate signal and a mismatch is flagged, not decided', () => {
  const result = detectPlatform('Garmin Connect\nTraining Effect 3.1\n10 km', { urlProvider: 'strava' });
  assert.equal(result.platform, 'garmin');
  assert.equal(result.urlProviderMismatch, true);
  assert.ok(result.signals.some((signal) => signal.kind === 'url_provider'));
});

test('every non-generic profile ships as test, never active by default', () => {
  for (const profile of listProfiles()) {
    if (profile.id === GENERIC_PROFILE_ID) assert.equal(profile.status, 'active');
    else assert.equal(profile.status, 'test', profile.id);
    assert.ok(profile.version);
  }
  assert.equal(getProfile('nope').id, GENERIC_PROFILE_ID);
});

// ---------------------------------------------------------------------------
// Image validation and working copies
// ---------------------------------------------------------------------------

test('inspectImage reports geometry and theme and rejects unsafe input', async () => {
  const tallDark = await makeImage({ width: 400, height: 900, background: '#101010' });
  const info = await preprocess.inspectImage(tallDark);
  assert.equal(info.orientation, 'tall');
  assert.equal(info.theme, 'dark');
  assert.equal(info.format, 'png');

  await assert.rejects(preprocess.inspectImage(Buffer.from('not an image at all')), { code: 'image_undecodable' });
  await assert.rejects(preprocess.inspectImage(Buffer.alloc(0)), { code: 'image_empty' });
  const tiny = await makeImage({ width: 10, height: 10 });
  await assert.rejects(preprocess.inspectImage(tiny), { code: 'image_too_small' });
  const big = await makeImage({ width: 1200, height: 1200 });
  await assert.rejects(
    preprocess.inspectImage(big, { ...config.getOcrLimits(), maxInputPixels: 1_000_000 }),
    { code: 'image_too_many_pixels' }
  );
  const gif = await sharp({ create: { width: 64, height: 64, channels: 3, background: '#fff' } }).gif().toBuffer();
  await assert.rejects(preprocess.inspectImage(gif), { code: 'image_unsupported_format' });
});

test('passes run only where geometry calls for them and boxes map back to the original', async () => {
  const info = { width: 1000, height: 2000, aspectRatio: 2, theme: 'light' };
  assert.equal(preprocess.shouldRunPass('metric_crop', info), true);
  assert.equal(preprocess.shouldRunPass('dark_enhanced', info), false);
  const image = await makeImage({ width: 1000, height: 2000 });
  const crop = await preprocess.buildPass('metric_crop', image, info);
  assert.equal(crop.offset.top, Math.floor(2000 * (1 - 0.58)));
  const box = preprocess.toOriginalBox({ x0: 100, y0: 50, x1: 300, y1: 90 }, crop);
  assert.equal(box.top, crop.offset.top + Math.round(50 / crop.scale));
  assert.ok(box.width > 0 && box.height > 0);
  const processed = await preprocess.buildPass('processed', image, info);
  const meta = await sharp(processed.buffer).metadata();
  assert.ok(Math.max(meta.width, meta.height) <= config.getOcrLimits().workingMaxDimension);
});

test('difference hash is stable and near-identical images are close', async () => {
  const a = await sharp({ create: { width: 300, height: 300, channels: 3, background: '#ffffff' } })
    .composite([{ input: await makeImage({ width: 150, height: 300, background: '#000000' }), left: 0, top: 0 }])
    .png().toBuffer();
  const b = await sharp(a).jpeg({ quality: 60 }).toBuffer();
  const hashA = await preprocess.computeDifferenceHash(a);
  const hashB = await preprocess.computeDifferenceHash(b);
  assert.match(hashA, /^[0-9a-f]{16}$/);
  assert.ok(preprocess.hammingDistanceHex(hashA, hashB) <= 4);
  assert.equal(preprocess.hammingDistanceHex(hashA, 'zz'), 64);
});

// ---------------------------------------------------------------------------
// Pipeline with an injected engine
// ---------------------------------------------------------------------------

function fakeEngine(texts, { lines = [], confidence = 85, failOn = [] } = {}) {
  let call = 0;
  return {
    calls: () => call,
    async recognize() {
      const index = call;
      call += 1;
      if (failOn.includes(index)) {
        const error = new Error('timeout');
        error.code = 'ocr_timeout';
        throw error;
      }
      return { text: texts[Math.min(index, texts.length - 1)], confidence, lines, modelVersionId: 'base-eng' };
    }
  };
}

test('pipeline extracts fields, records provenance and stops early when complete', async () => {
  const image = await makeImage({ width: 600, height: 1000 });
  const text = 'STRAVA\nMorning Run\nApr 25, 2026\nDistance 5.02 km\nMoving Time 28:30\nAvg Pace 5:41 /km\nRelative Effort 20';
  const engine = fakeEngine([text], {
    lines: [{ text: 'Distance 5.02 km', confidence: 91, bbox: { x0: 10, y0: 100, x1: 300, y1: 140 } }]
  });
  const result = await runOcrPipeline(image, { engine, enabledProfileIds: ['generic', 'strava'] });
  assert.equal(result.status, 'complete');
  assert.equal(engine.calls(), 1, 'distance, time and date found on the first pass');
  assert.equal(result.detection.platform, 'strava');
  assert.equal(result.profile.id, 'strava');
  assert.equal(result.fields.distance.value.valueKm, 5.02);
  assert.equal(result.fields.time.value.totalMs, 1_710_000);
  assert.equal(result.fields.time.kind, 'moving');
  assert.equal(result.fields.distance.location.rawText, 'Distance 5.02 km');
  assert.ok(result.fields.distance.location.boundingBox.width > 0);
  assert.equal(result.layout.id, 'strava/tall-light');
  assert.match(result.differenceHash, /^[0-9a-f]{16}$/);
  assert.ok(result.confidence >= 0.9);
  assert.deepEqual(result.validationFlags, []);
});

test('pipeline fills missing fields from later passes and survives a failed pass', async () => {
  const image = await makeImage({ width: 500, height: 1000, background: '#0a0a0a' });
  const engine = fakeEngine(['ignored', 'Distance 10.00 km', 'Elapsed Time 1:02:03'], { failOn: [0] });
  const result = await runOcrPipeline(image, { engine });
  assert.equal(result.fields.distance.value.valueKm, 10);
  assert.equal(result.fields.time.value.totalMs, 3_723_000);
  assert.equal(result.fields.time.kind, 'elapsed');
  assert.ok(result.validationFlags.includes('platform_uncertain'));
  assert.equal(result.passes.length, 2);
});

test('pipeline returns a failed result, not an exception, for bad images or a dead engine', async () => {
  const bad = await runOcrPipeline(Buffer.from('nope'), { engine: fakeEngine(['x']) });
  assert.equal(bad.status, 'failed');
  assert.equal(bad.errorCode, 'image_undecodable');
  const image = await makeImage();
  const dead = await runOcrPipeline(image, { engine: fakeEngine(['x'], { failOn: [0, 1, 2, 3] }) });
  assert.equal(dead.status, 'failed');
  assert.equal(dead.errorCode, 'ocr_timeout');
});

test('profile override is recorded as manual evidence', async () => {
  const image = await makeImage();
  const result = await runOcrPipeline(image, { engine: fakeEngine(['Distance 5 km\nTime 25:00']), profileOverride: 'coros' });
  assert.equal(result.detection.status, 'overridden');
  assert.equal(result.profile.id, 'coros');
  assert.ok(result.detection.signals.some((signal) => signal.kind === 'manual_override'));
});

test('validation flags catch implausible and inconsistent values', () => {
  const flags = buildValidationFlags({
    fields: {
      distance: { value: { valueKm: 10 } },
      time: { value: { totalMs: 10 * 60 * 1000 }, kind: 'moving' },
      pace: { value: { minutes: 5, seconds: 0, unit: '/km' } }
    },
    detection: { status: 'confirmed', urlProviderMismatch: true },
    info: { width: 300, height: 600 }
  });
  assert.ok(flags.includes('implausible_fast_pace'));
  assert.ok(flags.includes('pace_inconsistent'));
  assert.ok(flags.includes('url_provider_mismatch'));
  assert.ok(flags.includes('low_resolution'));
  assert.equal(detectTimeKind('Moving Time 1:00 Elapsed Time 1:10', getProfile('strava')), 'ambiguous');
  assert.deepEqual(fieldNeedles('time', { totalMs: 1_710_000 }), ['28:30', '28m 30s']);
  assert.equal(computeParserConfidence({ distance: {}, time: {}, ocrConfidence: 90 }), 0.85);
});

// ---------------------------------------------------------------------------
// Engine lifecycle with a fake tesseract worker
// ---------------------------------------------------------------------------

function fakeCreateWorker(log, { delayMs = 0, hang = false } = {}) {
  return async (lang, oem, options) => {
    log.push({ event: 'create', lang, langPath: options.langPath, cacheMethod: options.cacheMethod });
    return {
      async setParameters() {},
      async recognize() {
        log.push({ event: 'recognize' });
        if (hang) return new Promise(() => {});
        if (delayMs) await new Promise((resolve) => setTimeout(resolve, delayMs));
        return { data: { text: 'x', confidence: 80, lines: [{ text: 'x', confidence: 80, bbox: { x0: 0, y0: 0, x1: 1, y1: 1 } }] } };
      },
      async terminate() { log.push({ event: 'terminate' }); }
    };
  };
}

test('engine serialises calls, never writes a language cache and recycles after N jobs', async () => {
  const log = [];
  const limits = { ...config.getOcrLimits(), workerRecycleAfterJobs: 2, workerIdleTerminateMs: 60_000 };
  const engine = createEngine({ createWorker: fakeCreateWorker(log, { delayMs: 5 }), limits });
  const results = await Promise.all([engine.recognize(Buffer.from('a')), engine.recognize(Buffer.from('b')), engine.recognize(Buffer.from('c'))]);
  assert.equal(results.length, 3);
  assert.equal(log.filter((entry) => entry.event === 'create').length, 2, 'recycled after two jobs');
  assert.ok(log.filter((entry) => entry.event === 'create').every((entry) => entry.cacheMethod === 'none'));
  assert.equal(results[0].lines[0].bbox.x1, 1);
  await engine.terminate();
});

test('a hung recognition times out and the worker is discarded', async () => {
  const log = [];
  const limits = { ...config.getOcrLimits(), recognitionTimeoutMs: 20, workerIdleTerminateMs: 60_000 };
  const engine = createEngine({ createWorker: fakeCreateWorker(log, { hang: true }), limits });
  await assert.rejects(engine.recognize(Buffer.from('a')), { code: 'ocr_timeout' });
  assert.ok(log.some((entry) => entry.event === 'terminate'));
  assert.equal(engine.isBusy(), false);
  await engine.terminate();
});

// ---------------------------------------------------------------------------
// Auto-approval gate (Phase 0 finding C1)
// ---------------------------------------------------------------------------

function ocrEntry(overrides = {}) {
  return {
    status: 'submitted',
    source: 'manual_upload',
    proof: { key: 'results/proofs/u1/proof-a.webp' },
    suspiciousFlag: false,
    ocrData: {
      extractedDistanceKm: 5,
      extractedTimeMs: 1_500_000,
      confidence: 0.95,
      nameMatchStatus: 'matched'
    },
    ...overrides
  };
}

const serverReading = (overrides = {}) => ({
  status: 'complete',
  proofKey: 'results/proofs/u1/proof-a.webp',
  suspicious: false,
  autoApproval: {
    extractedDistanceKm: 5,
    extractedTimeMs: 1_500_000,
    confidence: 0.9,
    nameMatchStatus: 'not_detected',
    distanceMismatch: false,
    timeMismatch: false,
    elevationMismatch: false,
    stepsMismatch: false,
    dateMismatch: false,
    locationMismatch: false,
    runTypeMismatch: false
  },
  ...overrides
});

test('with flags off, auto-approval behaves exactly as before', () => {
  withEnv({ OCR_SERVER_PIPELINE_ENABLED: undefined, OCR_SERVER_AUTO_APPROVAL_ENABLED: undefined }, () => {
    assert.equal(validation.isAutoApprovableSubmission(ocrEntry()), true);
    assert.equal(validation.isAutoApprovableSubmission(ocrEntry({ ocrData: { ...ocrEntry().ocrData, confidence: 0.2 } })), false);
  });
});

test('with server auto-approval on, browser-posted values alone never approve', () => {
  withEnv({ OCR_SERVER_PIPELINE_ENABLED: 'true', OCR_SERVER_AUTO_APPROVAL_ENABLED: 'true' }, () => {
    assert.equal(validation.isAutoApprovableSubmission(ocrEntry()), false, 'forged client confidence is ignored');
    assert.equal(validation.isAutoApprovableSubmission(ocrEntry({ serverOcr: serverReading() })), true);
    assert.equal(
      validation.isAutoApprovableSubmission(ocrEntry({ serverOcr: serverReading({ proofKey: 'results/proofs/u1/old.webp' }) })),
      false,
      'a reading of a previous proof is stale'
    );
    assert.equal(validation.isAutoApprovableSubmission(ocrEntry({ serverOcr: serverReading({ status: 'partial' }) })), false);
    assert.equal(validation.isAutoApprovableSubmission(ocrEntry({ serverOcr: serverReading({ suspicious: true }) })), false);
    const lowConfidence = serverReading();
    lowConfidence.autoApproval.confidence = 0.5;
    assert.equal(validation.isAutoApprovableSubmission(ocrEntry({ serverOcr: lowConfidence })), false);
    const mismatch = serverReading();
    mismatch.autoApproval.distanceMismatch = true;
    assert.equal(validation.isAutoApprovableSubmission(ocrEntry({ serverOcr: mismatch })), false);
  });
});

test('server auto-approval requires the pipeline flag too', () => {
  withEnv({ OCR_SERVER_PIPELINE_ENABLED: undefined, OCR_SERVER_AUTO_APPROVAL_ENABLED: 'true' }, () => {
    assert.equal(config.isServerOcrAutoApprovalEnabled(), false);
    assert.equal(validation.isAutoApprovableSubmission(ocrEntry()), true);
  });
});

test('validation metadata marks OCR entries as waiting for the server reading', () => {
  withEnv({ OCR_SERVER_PIPELINE_ENABLED: 'true', OCR_SERVER_AUTO_APPROVAL_ENABLED: 'true' }, () => {
    const metadata = validation.buildSubmissionValidationMetadata({
      input: { source: 'manual_upload' },
      registration: {},
      ocrData: ocrEntry().ocrData,
      suspiciousFlag: false,
      minimumDistanceCheck: { belowMinimum: false, detectedDistanceKm: 5, minimumRequiredDistanceKm: 5 }
    });
    assert.equal(metadata.autoApprovalEligible, false);
    assert.equal(metadata.reviewReason, 'server_ocr_pending');
  });
});

test('the server projection recomputes mismatches and name match against the entry', () => {
  const result = {
    rawText: 'Juan Dela Cruz\nDistance 10.00 km\nMoving Time 50:00',
    confidence: 0.9,
    parserVersion: 'p',
    detection: { platform: 'unknown' },
    fields: {
      distance: { value: { valueKm: 10 } },
      time: { value: { totalMs: 3_000_000 } },
      date: { value: null },
      runType: { value: 'run' },
      elevationGain: { value: null },
      steps: { value: null },
      name: { value: 'Juan Dela Cruz' },
      location: { value: null }
    }
  };
  const entry = { distanceKm: 5, elapsedMs: 3_000_000, runType: 'run' };
  const projection = buildAutoApprovalProjection(result, entry, 'Juan Dela Cruz');
  assert.equal(projection.autoApproval.distanceMismatch, true);
  assert.equal(projection.autoApproval.timeMismatch, false);
  assert.equal(projection.autoApproval.nameMatchStatus, 'matched');
  assert.equal(projection.suspicious, true, 'high-confidence distance mismatch is suspicious');
  const other = buildAutoApprovalProjection(result, { distanceKm: 10, elapsedMs: 3_000_000 }, 'Maria Santos');
  assert.equal(other.autoApproval.nameMatchStatus, 'mismatched');
});

test('queueing is a no-op while the pipeline flag is off', async () => {
  await withEnv({ OCR_SERVER_PIPELINE_ENABLED: undefined }, async () => {
    let called = false;
    const result = await queueProofExtraction({ entries: [{ kind: 'run_submission', submission: { _id: 'x', proof: { key: 'k' } } }] }, {
      enqueueExtraction: async () => { called = true; }
    });
    assert.deepEqual(result, { queued: false, reason: 'disabled' });
    assert.equal(called, false);
  });
});

test('queueing failures never throw into the submission request', async () => {
  await withEnv({ OCR_SERVER_PIPELINE_ENABLED: 'true' }, async () => {
    const result = await queueProofExtraction({ entries: [{ kind: 'run_submission', submission: { _id: 'x', proof: { key: 'k' } } }] }, {
      enqueueExtraction: async () => { throw new Error('mongo down'); }
    });
    assert.deepEqual(result, { queued: false, reason: 'queue_failed' });
  });
});

test('extraction documents keep provenance and no image bytes', () => {
  const doc = buildExtractionDocument({
    status: 'complete', errorCode: '', pipelineVersion: 'v', parserVersion: 'p', modelVersionId: 'base-eng',
    profile: { id: 'strava', version: '1', status: 'test' }, detection: { platform: 'strava', signals: [] },
    layout: { id: 'strava/tall-dark' }, image: { format: 'png', width: 1, height: 2, meanBrightness: 3 },
    fields: { distance: { value: { valueKm: 5, unit: 'km' }, sourcePass: 'processed', location: null }, time: { value: null, kind: 'unknown' } },
    confidence: 0.8, engineConfidence: 0.7, rawText: 't', passes: [], validationFlags: [], elapsedMs: 10, differenceHash: 'a'.repeat(16)
  }, { _id: 'job', proofKey: 'k', proofHash: 'h', runnerId: null, targets: [], options: { reason: 'submission' } });
  assert.equal(doc.source, 'submission');
  assert.equal(doc.fields.distance.unit, 'km');
  assert.equal(doc.modelVersionId, 'base-eng');
  assert.ok(!JSON.stringify(doc).includes('buffer'));
});

test('shared name matching keeps the controller behaviour', () => {
  assert.equal(namesMatch('JUAN DELA CRUZ', 'Juan Dela Cruz'), true);
  assert.equal(namesMatch('Juan M. Dela Cruz', 'Juan Dela Cruz'), true);
  assert.equal(namesMatch('Maria', 'Juan Dela Cruz'), false);
  assert.equal(namesMatch('', 'Juan'), false);
});

// ---------------------------------------------------------------------------
// Routes, wiring and views
// ---------------------------------------------------------------------------

test('OCR admin routes require admin, CSRF, rate limits and are mounted before /admin', () => {
  const routes = fs.readFileSync(path.join(ROOT, 'src/routes/admin-ocr-training.routes.js'), 'utf8');
  assert.match(routes, /router\.use\(requireAdmin\)/);
  assert.match(routes, /requireCsrfProtection\(req, res, next\)/);
  assert.match(routes, /'\/platforms\/test', ocrTestLimiter, uploadService\.uploadOcrTestImage, requireCsrfProtection/);
  const server = fs.readFileSync(path.join(ROOT, 'src/server.js'), 'utf8');
  assert.ok(server.indexOf("app.use('/admin/ocr-training'") < server.indexOf("app.use('/admin', adminRoutes)"));
  assert.match(server, /startOcrExtractionWorker\(\)/);
  assert.match(server, /stopOcrExtractionWorker\(\)/);
});

test('submission controller queues server OCR after writes and keeps its name matcher', () => {
  const controller = fs.readFileSync(path.join(ROOT, 'src/controllers/page/submission.controller.js'), 'utf8');
  assert.match(controller, /await queueProofExtraction\(\{/);
  assert.ok(controller.indexOf('await queueProofExtraction({') > controller.indexOf('throw writeError;'));
  assert.match(controller, /require\('\.\.\/\.\.\/utils\/ocr\/name-match'\)/);
});

function renderAdminView(name, locals) {
  const file = path.join(ROOT, 'src/views/admin/ocr-training', `${name}.ejs`);
  const source = fs.readFileSync(file, 'utf8').replace(/<%-\s*include\('\.\.\/\.\.\/layouts\/[^%]+%>/g, '');
  return ejs.render(source, { csrfToken: 'tok', ...locals }, { filename: file });
}

const commonLocals = {
  title: 't', section: 'platforms', message: null,
  formatDateTime: (value) => String(value), flags: [{ name: 'OCR_SERVER_PIPELINE_ENABLED', enabled: false }]
};

test('overview and platforms render empty and populated states', () => {
  const overview = renderAdminView('overview', {
    ...commonLocals, section: 'overview',
    queue: { queued: 1, running: 0, completed: 2, failed: 0 }, breakdown: [], profiles: [], recentJobs: [], extras: {}
  });
  assert.match(overview, /No server extractions yet/);
  assert.match(overview, /aria-current=page/);
  const profiles = listProfiles().map((profile) => ({
    id: profile.id, version: profile.version, status: profile.status,
    brandPatterns: profile.brand.map((p) => p.source), anchorPatterns: profile.anchors.map((p) => p.source), passes: [], history: []
  }));
  const platforms = renderAdminView('platforms', {
    ...commonLocals, profiles, statuses: ['draft', 'test', 'active', 'retired'], limits: config.getOcrLimits(),
    testResult: {
      status: 'complete', errorCode: '', detection: { status: 'confirmed', platform: 'strava', platformCandidate: 'strava', confidence: 0.8, candidates: [], signals: [{ kind: 'brand_text', evidence: '<script>x</script>' }] },
      profile: { id: 'strava', version: '1' }, layoutId: 'strava/tall-dark', fields: [{ key: 'distance', display: '5 km', kind: '', sourcePass: 'processed', rawText: '5 km', lineConfidence: 0.9 }],
      confidence: 0.9, engineConfidence: 0.8, elapsedMs: 10, modelVersionId: 'base-eng', parserVersion: 'p', validationFlags: [], passes: [{ name: 'processed', elapsedMs: 5 }], rawText: '<b>raw</b>'
    }
  });
  assert.match(platforms, /Always active/);
  assert.match(platforms, /name="_csrf" value="tok"/);
  assert.doesNotMatch(platforms, /platforms\/test\?_csrf/);
  assert.doesNotMatch(platforms, /<script>x<\/script>/, 'OCR evidence is escaped');
  assert.match(platforms, /&lt;b&gt;raw&lt;\/b&gt;/);
});

test('server OCR review panel renders and escapes', () => {
  const file = path.join(ROOT, 'src/views/organizer/partials/server-ocr-panel.ejs');
  const html = ejs.render(fs.readFileSync(file, 'utf8'), {
    serverOcr: {
      status: 'complete', platform: 'strava', platformStatus: 'confirmed', profileId: 'strava', profileVersion: '1', timeKind: 'moving',
      validationFlags: ['pace_inconsistent'], suspicious: true, suspiciousReasons: '<img src=x>',
      autoApproval: { extractedDistanceKm: 5, extractedTimeMs: 1_710_000, extractedRunDate: '', extractedName: '', nameMatchStatus: 'not_detected', confidence: 0.9, distanceMismatch: true }
    }
  }, { filename: file });
  assert.match(html, /HelloRun server reading/);
  assert.match(html, /5\.00 km/);
  assert.match(html, /28m 30s/);
  assert.match(html, /differs from entry/);
  assert.doesNotMatch(html, /<img src=x>/);
  const empty = ejs.render(fs.readFileSync(file, 'utf8'), { serverOcr: null }, { filename: file });
  assert.equal(empty.trim(), '');
});
