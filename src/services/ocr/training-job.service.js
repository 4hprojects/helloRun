'use strict';

/**
 * Manual training jobs, web side (Phase 4). An admin starts each run; nothing else does.
 * Error statuses follow doc 03: 409 duplicate/active job, 422 invalid dataset or failed
 * preflight, 503 training disabled or no worker online.
 */

const crypto = require('node:crypto');
const mongoose = require('mongoose');
const TrainingJob = require('../../models/TrainingJob');
const { ACTIVE_TRAINING_STATUSES } = require('../../models/TrainingJob');
const DatasetVersion = require('../../models/DatasetVersion');
const OcrTrainingWorkerStatus = require('../../models/OcrTrainingWorkerStatus');
const { isTrainingEnabled } = require('./ocr-config');
const { getOcrSettings } = require('./ocr-settings.service');
const { verifyDatasetIntegrity } = require('./dataset.service');
const { getRegistry } = require('./model-registry.service');

const WORKER_STALE_MS = 3 * 60 * 1000;

class TrainingJobError extends Error {
  constructor(code, message, status) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

async function getWorkerStatus(now = new Date()) {
  const row = await OcrTrainingWorkerStatus.findOne({ key: 'training-worker' }).lean();
  const online = Boolean(row?.lastSeenAt && now.getTime() - new Date(row.lastSeenAt).getTime() < WORKER_STALE_MS);
  return { online, row, preflightPassed: Boolean(row?.preflight?.passed) };
}

function buildTrainingConfig(settings) {
  const training = settings.training || {};
  const config = {
    maxIterations: Number(training.maxIterations || 2000),
    timeoutMinutes: Number(training.timeoutMinutes || 240),
    cpuQuotaPercent: Number(training.cpuQuotaPercent || 100),
    memoryMaxMb: Number(training.memoryMaxMb || 2048),
    minFreeDiskMb: Number(training.minFreeDiskMb || 5120)
  };
  const configHash = crypto.createHash('sha256').update(JSON.stringify(config)).digest('hex');
  return { config, configHash };
}

async function getActiveTrainingJob() {
  return TrainingJob.findOne({ status: { $in: ACTIVE_TRAINING_STATUSES } }).sort({ createdAt: -1 }).lean();
}

/**
 * Queue one training run. A repeated idempotency key returns the same job (double-click safe).
 * @returns {{ job, created: boolean }}
 */
async function startTrainingJob({ datasetVersionId, idempotencyKey, actorId }, { now = new Date() } = {}) {
  const key = String(idempotencyKey || '').trim();
  if (!/^[A-Za-z0-9_-]{16,100}$/.test(key)) throw new TrainingJobError('idempotency_key_required', 'A valid idempotency key is required.', 400);
  const existing = await TrainingJob.findOne({ idempotencyKey: key }).lean();
  if (existing) return { job: existing, created: false };

  if (!isTrainingEnabled()) throw new TrainingJobError('training_disabled', 'Training is disabled (OCR_TRAINING_ENABLED is off).', 503);
  if (!mongoose.isValidObjectId(datasetVersionId)) throw new TrainingJobError('dataset_not_found', 'Choose a dataset version.', 422);
  const dataset = await DatasetVersion.findById(datasetVersionId).lean();
  if (!dataset) throw new TrainingJobError('dataset_not_found', 'Dataset version not found.', 422);
  if (dataset.validationStatus !== 'ready') throw new TrainingJobError('dataset_not_ready', `Dataset is not ready: ${(dataset.notReadyReasons || []).join('; ')}`, 422);
  if (!verifyDatasetIntegrity(dataset)) throw new TrainingJobError('dataset_tampered', 'Dataset manifest no longer matches its hash.', 422);

  const worker = await getWorkerStatus(now);
  if (!worker.online) throw new TrainingJobError('worker_unavailable', 'No training worker has reported in. Start `npm run ocr:training-worker` on the training host.', 503);
  if (!worker.preflightPassed) throw new TrainingJobError('preflight_failed', 'The training worker preflight is failing. See the Jobs page for details.', 422);

  const settings = await getOcrSettings({ fresh: true });
  const { config, configHash } = buildTrainingConfig(settings);
  const registry = await getRegistry({ fresh: true });
  try {
    const job = await TrainingJob.create({
      requestedBy: actorId,
      idempotencyKey: key,
      datasetVersionId: dataset._id,
      datasetManifestHash: dataset.manifestHash,
      startModelVersionId: String(registry.activeModelId || 'base-eng'),
      config,
      configHash,
      status: 'queued',
      activeLock: 'active'
    });
    return { job: job.toObject(), created: true };
  } catch (error) {
    if (error?.code === 11000) {
      const sameKey = await TrainingJob.findOne({ idempotencyKey: key }).lean();
      if (sameKey) return { job: sameKey, created: false };
      throw new TrainingJobError('training_in_progress', 'A training job is already queued or running. Only one may run at a time.', 409);
    }
    throw error;
  }
}

/** Request cancellation. A queued job is cancelled at once; a running one at the next heartbeat. */
async function cancelTrainingJob({ jobId, actorId }) {
  if (!mongoose.isValidObjectId(jobId)) throw new TrainingJobError('not_found', 'Training job not found.', 404);
  const queued = await TrainingJob.findOneAndUpdate(
    { _id: jobId, status: 'queued' },
    { $set: { status: 'cancelled', cancelRequested: true, cancelRequestedBy: actorId || null, finishedAt: new Date() }, $unset: { activeLock: 1 } },
    { new: true }
  ).lean();
  if (queued) return queued;
  const running = await TrainingJob.findOneAndUpdate(
    { _id: jobId, status: { $in: ['preparing', 'training', 'evaluating'] } },
    { $set: { cancelRequested: true, cancelRequestedBy: actorId || null } },
    { new: true }
  ).lean();
  if (running) return running;
  const exists = await TrainingJob.findById(jobId).select('status').lean();
  if (!exists) throw new TrainingJobError('not_found', 'Training job not found.', 404);
  throw new TrainingJobError('not_cancellable', `A ${exists.status} job cannot be cancelled.`, 409);
}

async function listTrainingJobs(limit = 20) {
  return TrainingJob.find({}).sort({ createdAt: -1 }).limit(limit).lean();
}

module.exports = {
  WORKER_STALE_MS,
  TrainingJobError,
  getWorkerStatus,
  buildTrainingConfig,
  getActiveTrainingJob,
  startTrainingJob,
  cancelTrainingJob,
  listTrainingJobs
};
