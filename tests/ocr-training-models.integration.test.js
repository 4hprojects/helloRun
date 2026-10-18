'use strict';

// Phase 4 against a disposable LOCAL MongoDB. The trainer process, object storage and line
// recognisers are injected stand-ins: this proves job control, registry and rollback logic,
// not that tesstrain produces a better model (see IMPLEMENTATION-PROGRESS.md, Phase 4).

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const mongoose = require('mongoose');

const TEST_URI = String(process.env.OCR_TEST_MONGODB_URI || '');
const skip = !/^mongodb:\/\/(127\.0\.0\.1|localhost)(:\d+)?\//.test(TEST_URI) || String(process.env.DATABASE_URL || '').trim()
  ? 'set OCR_TEST_MONGODB_URI to a local mongodb:// URI and leave DATABASE_URL empty'
  : false;

const CACHE_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'ocr-model-cache-'));
process.env.OCR_MODEL_CACHE_DIR = CACHE_DIR;

const TrainingJob = require('../src/models/TrainingJob');
const DatasetVersion = require('../src/models/DatasetVersion');
const OcrModelVersion = require('../src/models/OcrModelVersion');
const OcrModelRegistry = require('../src/models/OcrModelRegistry');
const OcrDeploymentEvent = require('../src/models/OcrDeploymentEvent');
const OcrTrainingWorkerStatus = require('../src/models/OcrTrainingWorkerStatus');
const OcrSettings = require('../src/models/OcrSettings');
const training = require('../src/services/ocr/training-job.service');
const runner = require('../src/services/ocr/training-runner.service');
const registry = require('../src/services/ocr/model-registry.service');
const { buildDatasetPlan } = require('../src/services/ocr/dataset.service');
const { clearOcrSettingsCache, updateOcrSettings } = require('../src/services/ocr/ocr-settings.service');
const { BASE_LANGUAGE } = require('../src/services/ocr/ocr-engine');

const objects = new Map();
const storage = {
  put: async ({ key, body }) => { objects.set(key, Buffer.from(body)); return { key }; },
  read: async (key) => {
    if (!objects.has(key)) throw Object.assign(new Error('NoSuchKey'), { name: 'NoSuchKey' });
    return objects.get(key);
  }
};
const readArtifact = (key) => storage.read(key);
const actorId = new mongoose.Types.ObjectId();
const WORK_ROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'ocr-training-work-'));
const PATHS = { tesstrainDir: '/opt/tesstrain', tessdataDir: '/opt/tessdata_best', workRoot: WORK_ROOT };
const PREFLIGHT_OK = { passed: true, checks: [], checkedAt: new Date(), tools: { nice: 'x' } };

async function makeDataset(name) {
  const manifestRows = [];
  for (let i = 0; i < 40; i += 1) {
    const crop = Buffer.from(`crop-${name}-${i}`);
    const key = `ocr-training/crops/${name}-${i}.png`;
    objects.set(key, crop);
    manifestRows.push({
      _id: new mongoose.Types.ObjectId(),
      activityGroupId: `${name}-group-${i}`,
      cropKey: key,
      cropChecksum: crypto.createHash('sha256').update(crop).digest('hex'),
      transcribedText: `${i}.00 km`,
      platform: i % 2 ? 'strava' : 'garmin',
      layoutId: 'card',
      fieldKey: 'distance'
    });
  }
  const plan = buildDatasetPlan(manifestRows, { minApprovedSamples: 1, minTestSamples: 1, minValidationSamples: 0, minSamplesPerPlatform: 0, thresholdsApprovedByOwner: true });
  return DatasetVersion.create({
    name, manifestHash: plan.manifestHash, splitRule: 'group-sha256-v1', manifest: plan.manifest, counts: plan.counts,
    platformDistribution: plan.platformDistribution, qualityReport: { checks: plan.checks }, consentCheck: { allConsented: true },
    validationStatus: plan.validationStatus, notReadyReasons: plan.notReadyReasons
  });
}

function fakeTrainer({ exitCode = 0, writeModel = true } = {}) {
  return async ({ args }) => {
    const dataDir = args.find((arg) => arg.startsWith('DATA_DIR=')).slice('DATA_DIR='.length);
    const modelName = args.find((arg) => arg.startsWith('MODEL_NAME=')).slice('MODEL_NAME='.length);
    if (writeModel) fs.writeFileSync(path.join(dataDir, `${modelName}.traineddata`), `fake-model-${modelName}`);
    return { exitCode, signal: null, cancelled: false, timedOut: false, durationSeconds: 3, peakRssMb: 120 };
  };
}

// Candidate reads every held-out line correctly; the baseline drops the decimals.
const recognizers = async (language) => ({
  recognize: async (image) => {
    const text = String(image).match(/crop-[^-]+-(\d+)/);
    const index = text ? Number(text[1]) : 0;
    return language.modelVersionId === 'base-eng' ? `${index} km` : `${index}.00 km`;
  },
  close: async () => {}
});

test.describe('training jobs and model registry against local MongoDB', { skip }, () => {
  let dataset;

  test.before(async () => {
    await mongoose.connect(TEST_URI, { autoIndex: true });
    await mongoose.connection.db.dropDatabase();
    await Promise.all([TrainingJob, DatasetVersion, OcrModelVersion, OcrModelRegistry, OcrDeploymentEvent, OcrTrainingWorkerStatus, OcrSettings].map((Model) => Model.syncIndexes()));
    clearOcrSettingsCache();
    registry.clearRegistryCache();
    await updateOcrSettings({ 'evaluation.gatesApprovedByOwner': true, 'evaluation.minEvaluationSamplesPerPlatform': 1 });
    dataset = await makeDataset('ds1');
  });

  test.after(async () => {
    await mongoose.connection.db.dropDatabase().catch(() => {});
    await mongoose.disconnect();
    fs.rmSync(CACHE_DIR, { recursive: true, force: true });
    fs.rmSync(WORK_ROOT, { recursive: true, force: true });
  });

  test('start is refused while disabled, without a worker, or with a failing preflight', async () => {
    const key = crypto.randomBytes(18).toString('base64url');
    delete process.env.OCR_TRAINING_ENABLED;
    await assert.rejects(training.startTrainingJob({ datasetVersionId: dataset._id, idempotencyKey: key, actorId }), (error) => error.status === 503 && error.code === 'training_disabled');
    process.env.OCR_TRAINING_ENABLED = 'true';
    await assert.rejects(training.startTrainingJob({ datasetVersionId: dataset._id, idempotencyKey: key, actorId }), (error) => error.status === 503 && error.code === 'worker_unavailable');
    await OcrTrainingWorkerStatus.create({ key: 'training-worker', hostname: 'test', lastSeenAt: new Date(), preflight: { passed: false, checks: [] } });
    await assert.rejects(training.startTrainingJob({ datasetVersionId: dataset._id, idempotencyKey: key, actorId }), (error) => error.status === 422 && error.code === 'preflight_failed');
    await OcrTrainingWorkerStatus.updateOne({ key: 'training-worker' }, { $set: { 'preflight.passed': true } });
    await assert.rejects(training.startTrainingJob({ datasetVersionId: new mongoose.Types.ObjectId(), idempotencyKey: key, actorId }), (error) => error.status === 422);
    await assert.rejects(training.startTrainingJob({ datasetVersionId: dataset._id, idempotencyKey: 'short', actorId }), { code: 'idempotency_key_required' });
  });

  test('a double-click starts one job, and a second job is refused while one is active', async () => {
    const key = crypto.randomBytes(18).toString('base64url');
    const [first, second] = await Promise.all([
      training.startTrainingJob({ datasetVersionId: dataset._id, idempotencyKey: key, actorId }),
      training.startTrainingJob({ datasetVersionId: dataset._id, idempotencyKey: key, actorId })
    ]);
    assert.equal(String(first.job._id), String(second.job._id));
    assert.equal([first.created, second.created].filter(Boolean).length, 1);
    await assert.rejects(
      training.startTrainingJob({ datasetVersionId: dataset._id, idempotencyKey: crypto.randomBytes(18).toString('base64url'), actorId }),
      (error) => error.status === 409 && error.code === 'training_in_progress'
    );
    const cancelled = await training.cancelTrainingJob({ jobId: first.job._id, actorId });
    assert.equal(cancelled.status, 'cancelled');
    const next = await training.startTrainingJob({ datasetVersionId: dataset._id, idempotencyKey: crypto.randomBytes(18).toString('base64url'), actorId });
    assert.equal(next.created, true, 'cancelling releases the single-job lock');
    await training.cancelTrainingJob({ jobId: next.job._id, actorId });
  });

  test('a failed trainer leaves production untouched and releases the lock', async () => {
    await training.startTrainingJob({ datasetVersionId: dataset._id, idempotencyKey: crypto.randomBytes(18).toString('base64url'), actorId });
    const job = await runner.claimTrainingJob({ workerId: 'w-test' });
    const finished = await runner.runTrainingJob(job, { paths: PATHS, storage, preflight: PREFLIGHT_OK, runProcess: fakeTrainer({ exitCode: 2 }), createLineRecognizer: recognizers, notify: async () => {} });
    assert.equal(finished.status, 'failed');
    assert.equal(finished.errorCode, 'trainer_failed');
    assert.equal((await TrainingJob.findById(job._id).lean()).activeLock, undefined);
    assert.equal((await registry.getRegistry({ fresh: true })).activeModelId, 'base-eng');
    assert.equal(await OcrModelVersion.countDocuments({}), 0);
  });

  test('a worker that dies mid-job leaves an interrupted job, not a stuck lock', async () => {
    await training.startTrainingJob({ datasetVersionId: dataset._id, idempotencyKey: crypto.randomBytes(18).toString('base64url'), actorId });
    const job = await runner.claimTrainingJob({ workerId: 'w-dead' });
    assert.equal(job.status, 'preparing');
    const recovered = await runner.recoverInterruptedJobs({ now: new Date(Date.now() + 10 * 60 * 1000) });
    assert.equal(recovered, 1);
    const after = await TrainingJob.findById(job._id).lean();
    assert.equal(after.status, 'interrupted');
    assert.equal(after.activeLock, undefined);
  });

  test('a completed job yields a gated candidate that only an approved activation can deploy, with rollback', async () => {
    const notifications = [];
    await training.startTrainingJob({ datasetVersionId: dataset._id, idempotencyKey: crypto.randomBytes(18).toString('base64url'), actorId });
    const job = await runner.claimTrainingJob({ workerId: 'w-ok' });
    const finished = await runner.runTrainingJob(job, {
      paths: PATHS, storage, preflight: PREFLIGHT_OK, runProcess: fakeTrainer(), createLineRecognizer: recognizers,
      notify: async (type, payload) => notifications.push({ type, payload })
    });
    assert.equal(finished.status, 'completed');
    const model = await OcrModelVersion.findById(finished.resultModelVersionId).lean();
    assert.equal(model.status, 'passed_gates');
    assert.ok(model.evaluation.testSampleCount > 0);
    assert.equal(model.evaluation.overall.candidate.cer, 0);
    assert.ok(model.evaluation.overall.baseline.cer > 0);
    assert.equal(model.checksum, crypto.createHash('sha256').update(objects.get(model.artifactKey)).digest('hex'));
    assert.deepEqual(notifications.map((n) => n.type), ['ocr.training_completed', 'ocr.model_approval_needed']);
    assert.equal((await registry.getRegistry({ fresh: true })).activeModelId, 'base-eng', 'training never deploys');

    const state = await registry.getRegistry({ fresh: true });
    await assert.rejects(registry.activateModel({ modelId: model._id, actorId, reason: 'Better on held-out set', expectedVersion: state.version }, { readArtifact }), { code: 'not_approved' });
    await assert.rejects(registry.approveModel({ modelId: model._id, actorId, reason: 'short' }), { code: 'reason_required' });
    await registry.approveModel({ modelId: model._id, actorId, reason: 'Passed every per-platform gate' });
    await assert.rejects(registry.activateModel({ modelId: model._id, actorId, reason: 'Better on held-out set', expectedVersion: state.version + 7 }, { readArtifact }), { code: 'registry_changed' });

    const activated = await registry.activateModel({ modelId: model._id, actorId, reason: 'Better on held-out set', expectedVersion: state.version }, { readArtifact });
    assert.equal(activated.registry.activeModelId, String(model._id));
    assert.equal(activated.registry.previousModelId, 'base-eng');
    const language = await registry.resolveLanguage({ readArtifact });
    assert.equal(language.modelVersionId, String(model._id));
    assert.ok(fs.existsSync(path.join(language.langPath, `${model.langCode}.traineddata`)));

    // A corrupted local copy and a corrupted stored artifact: OCR falls back to the base model.
    fs.writeFileSync(path.join(language.langPath, `${model.langCode}.traineddata`), 'tampered');
    objects.set(model.artifactKey, Buffer.from('tampered'));
    registry.clearRegistryCache();
    const before = registry.getModelLoadFailures().count;
    assert.deepEqual(await registry.resolveLanguage({ readArtifact }), BASE_LANGUAGE);
    assert.equal(registry.getModelLoadFailures().count, before + 1);

    const current = await registry.getRegistry({ fresh: true });
    const rolled = await registry.rollbackModel({ actorId, reason: 'Artifact failed verification', expectedVersion: current.version });
    assert.equal(rolled.registry.activeModelId, 'base-eng');
    const events = await OcrDeploymentEvent.find({}).sort({ createdAt: 1 }).lean();
    assert.deepEqual(events.map((event) => `${event.action}:${event.outcome}`), ['activate:succeeded', 'rollback:succeeded']);
    await assert.rejects(OcrDeploymentEvent.updateOne({ _id: events[0]._id }, { $set: { reason: 'x' } }), /append-only/);
  });

  test('activation refuses an artifact that fails verification and records the failure', async () => {
    const artifactKey = 'ocr-models/manual/broken.traineddata';
    objects.set(artifactKey, Buffer.from('real bytes'));
    const model = await OcrModelVersion.create({ label: 'broken', langCode: 'broken', artifactKey, checksum: 'f'.repeat(64), status: 'approved' });
    const state = await registry.getRegistry({ fresh: true });
    await assert.rejects(registry.activateModel({ modelId: model._id, actorId, reason: 'Trying a broken artifact', expectedVersion: state.version }, { readArtifact }), { code: 'checksum_mismatch' });
    assert.equal((await registry.getRegistry({ fresh: true })).activeModelId, 'base-eng');
    const failed = await OcrDeploymentEvent.findOne({ outcome: 'failed' }).lean();
    assert.equal(failed.errorCode, 'checksum_mismatch');
  });

  test('two concurrent activations cannot both win', async () => {
    const makeApproved = async (label) => {
      const key = `ocr-models/${label}/m.traineddata`;
      const bytes = Buffer.from(`model-${label}`);
      objects.set(key, bytes);
      return OcrModelVersion.create({ label, langCode: label, artifactKey: key, checksum: crypto.createHash('sha256').update(bytes).digest('hex'), status: 'approved' });
    };
    const [a, b] = await Promise.all([makeApproved('race_a'), makeApproved('race_b')]);
    const state = await registry.getRegistry({ fresh: true });
    const results = await Promise.allSettled([
      registry.activateModel({ modelId: a._id, actorId, reason: 'Concurrent activation A', expectedVersion: state.version }, { readArtifact }),
      registry.activateModel({ modelId: b._id, actorId, reason: 'Concurrent activation B', expectedVersion: state.version }, { readArtifact })
    ]);
    assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
    assert.equal(results.find((result) => result.status === 'rejected').reason.code, 'registry_changed');
  });
});
