'use strict';

/**
 * Server OCR model registry (Phase 4, doc 07 "Model evaluation and release").
 *
 * - Candidates are registered by the training worker; they never become active by
 *   themselves.
 * - approve: full admin, only for a candidate that passed its evaluation gates.
 * - activate / rollback: full admin, compare-and-set on the registry version, artifact
 *   checksum verified first. If verification fails nothing changes.
 * - resolveLanguage: what the OCR engine loads. Any problem with an activated model falls
 *   back to the bundled base model, so a bad artifact can never stop proof processing.
 */

const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const mongoose = require('mongoose');
const logger = require('../../utils/logger');
const OcrModelVersion = require('../../models/OcrModelVersion');
const OcrModelRegistry = require('../../models/OcrModelRegistry');
const OcrDeploymentEvent = require('../../models/OcrDeploymentEvent');
const { BASE_LANGUAGE } = require('./ocr-engine');

const BASE_MODEL_ID = 'base-eng';
const REGISTRY_KEY = 'server-ocr';
const CACHE_TTL_MS = 60_000;
const MAX_MODEL_BYTES = 200 * 1024 * 1024;

class ModelError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

let registryCache = { at: 0, value: null };
const loadFailures = { count: 0, lastAt: null, lastModelId: '' };

function getModelCacheDir() {
  return path.resolve(process.env.OCR_MODEL_CACHE_DIR || path.join(os.tmpdir(), 'hellorun-ocr-models'));
}

function clearRegistryCache() {
  registryCache = { at: 0, value: null };
}

async function getRegistry({ fresh = false } = {}) {
  if (!fresh && registryCache.value && Date.now() - registryCache.at < CACHE_TTL_MS) return registryCache.value;
  const value = await OcrModelRegistry.findOneAndUpdate(
    { key: REGISTRY_KEY },
    { $setOnInsert: { key: REGISTRY_KEY, activeModelId: BASE_MODEL_ID, version: 0 } },
    { upsert: true, new: true }
  ).lean();
  registryCache = { at: Date.now(), value };
  return value;
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function defaultReadArtifact(key) {
  const upload = require('../upload.service');
  return upload.getObjectBufferFromR2(key, { bucket: upload.getPrivateBucketName(), maxBytes: MAX_MODEL_BYTES });
}

/**
 * Make sure the model's artifact is on local disk and matches its checksum.
 * Writes atomically (temp file + rename) and re-verifies an existing cached copy.
 */
async function ensureLocalArtifact(model, { readArtifact = defaultReadArtifact } = {}) {
  const dir = path.join(getModelCacheDir(), String(model._id));
  const file = path.join(dir, `${model.langCode}.traineddata`);
  if (fs.existsSync(file) && sha256(fs.readFileSync(file)) === model.checksum) return { dir, file };
  const buffer = await readArtifact(model.artifactKey);
  if (sha256(buffer) !== model.checksum) {
    throw new ModelError('checksum_mismatch', 'The stored model artifact does not match its recorded checksum.', 409);
  }
  fs.mkdirSync(dir, { recursive: true });
  const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(temp, buffer);
  fs.renameSync(temp, file);
  return { dir, file };
}

/** Engine language resolver. Never throws; falls back to the base model. */
async function resolveLanguage(deps = {}) {
  let registry;
  try {
    registry = await getRegistry();
  } catch (error) {
    logger.warn('[model-registry] registry unavailable; using base model', { error: error?.message });
    return BASE_LANGUAGE;
  }
  if (!registry || registry.activeModelId === BASE_MODEL_ID || !mongoose.isValidObjectId(registry.activeModelId)) return BASE_LANGUAGE;
  try {
    const model = await OcrModelVersion.findById(registry.activeModelId).lean();
    if (!model) throw new ModelError('model_missing', 'Active model record not found.');
    const { dir } = await ensureLocalArtifact(model, deps);
    return { lang: model.langCode, langPath: dir, gzip: false, modelVersionId: String(model._id) };
  } catch (error) {
    loadFailures.count += 1;
    loadFailures.lastAt = new Date();
    loadFailures.lastModelId = String(registry.activeModelId);
    logger.error('[model-registry] Active model could not be loaded; using base model', {
      modelId: String(registry.activeModelId),
      error: error?.message || String(error)
    });
    return BASE_LANGUAGE;
  }
}

function getModelLoadFailures() {
  return { ...loadFailures };
}

async function registerCandidate({ label, langCode, artifactKey, checksum, sizeBytes, parentModelId, datasetVersionId, datasetManifestHash, trainingJobId, toolVersions }) {
  return OcrModelVersion.create({
    label, langCode, artifactKey, checksum, sizeBytes, parentModelId, datasetVersionId, datasetManifestHash, trainingJobId, toolVersions, status: 'candidate'
  });
}

async function recordEvaluation(modelId, evaluation) {
  const status = evaluation.passed ? 'passed_gates' : 'failed_gates';
  return OcrModelVersion.findOneAndUpdate(
    { _id: modelId, status: { $in: ['candidate', 'evaluated'] } },
    { $set: { status, evaluation: { ...evaluation.record, evaluatedAt: new Date() } } },
    { new: true }
  );
}

async function approveModel({ modelId, actorId, reason }) {
  if (!mongoose.isValidObjectId(modelId)) throw new ModelError('not_found', 'Model not found.', 404);
  const safeReason = String(reason || '').trim();
  if (safeReason.length < 10) throw new ModelError('reason_required', 'Give a reason (10+ characters) for approving this model.');
  const updated = await OcrModelVersion.findOneAndUpdate(
    { _id: modelId, status: 'passed_gates' },
    { $set: { status: 'approved', approvedBy: actorId || null, approvedAt: new Date(), approvalReason: safeReason.slice(0, 500) } },
    { new: true }
  );
  if (updated) return updated;
  const existing = await OcrModelVersion.findById(modelId).select('status').lean();
  if (!existing) throw new ModelError('not_found', 'Model not found.', 404);
  throw new ModelError('gates_not_passed', `Only a model that passed its evaluation gates can be approved (this one is ${existing.status}).`, 409);
}

async function recordDeployment(fields) {
  return OcrDeploymentEvent.create(fields);
}

async function compareAndSetActive({ expectedVersion, activeModelId, previousModelId, actorId }) {
  const updated = await OcrModelRegistry.findOneAndUpdate(
    { key: REGISTRY_KEY, version: Number(expectedVersion) },
    { $set: { activeModelId, previousModelId, activatedAt: new Date(), activatedBy: actorId || null }, $inc: { version: 1 } },
    { new: true }
  ).lean();
  clearRegistryCache();
  return updated;
}

/**
 * Activate an approved model. `expectedVersion` is the registry version the admin saw,
 * so a stale page cannot overwrite a newer activation.
 */
async function activateModel({ modelId, actorId, reason, expectedVersion }, deps = {}) {
  if (!mongoose.isValidObjectId(modelId)) throw new ModelError('not_found', 'Model not found.', 404);
  const safeReason = String(reason || '').trim();
  if (safeReason.length < 10) throw new ModelError('reason_required', 'Give a reason (10+ characters) for activating this model.');
  const registry = await getRegistry({ fresh: true });
  if (Number(expectedVersion) !== Number(registry.version)) {
    throw new ModelError('registry_changed', 'The active model changed since this page loaded. Reload and try again.', 409);
  }
  const model = await OcrModelVersion.findById(modelId).lean();
  if (!model) throw new ModelError('not_found', 'Model not found.', 404);
  if (model.status !== 'approved') throw new ModelError('not_approved', 'Only an approved model can be activated.', 409);
  if (String(registry.activeModelId) === String(model._id)) throw new ModelError('already_active', 'This model is already active.', 409);

  try {
    await ensureLocalArtifact(model, deps);
  } catch (error) {
    await recordDeployment({
      action: 'activate', outcome: 'failed', oldModelId: registry.activeModelId, newModelId: String(model._id),
      approvedBy: model.approvedBy, approvedAt: model.approvedAt, actorId, reason: safeReason, errorCode: error?.code || 'artifact_unavailable'
    });
    throw new ModelError(error?.code || 'artifact_unavailable', 'The model artifact could not be verified; the current model stays active.', 409);
  }

  const updated = await compareAndSetActive({
    expectedVersion: registry.version,
    activeModelId: String(model._id),
    previousModelId: String(registry.activeModelId),
    actorId
  });
  if (!updated) throw new ModelError('registry_changed', 'The active model changed while activating. Reload and try again.', 409);
  const event = await recordDeployment({
    action: 'activate', outcome: 'succeeded', oldModelId: registry.activeModelId, newModelId: String(model._id),
    approvedBy: model.approvedBy, approvedAt: model.approvedAt, actorId, reason: safeReason
  });
  return { registry: updated, event, model };
}

/** Restore the previous model (or a named approved model / the base model). */
async function rollbackModel({ actorId, reason, expectedVersion, targetModelId = '' }, deps = {}) {
  const safeReason = String(reason || '').trim();
  if (safeReason.length < 10) throw new ModelError('reason_required', 'Give a reason (10+ characters) for the rollback.');
  const registry = await getRegistry({ fresh: true });
  if (Number(expectedVersion) !== Number(registry.version)) {
    throw new ModelError('registry_changed', 'The active model changed since this page loaded. Reload and try again.', 409);
  }
  const target = String(targetModelId || registry.previousModelId || BASE_MODEL_ID);
  if (target === String(registry.activeModelId)) throw new ModelError('nothing_to_roll_back', 'That model is already active.', 409);
  if (target !== BASE_MODEL_ID) {
    if (!mongoose.isValidObjectId(target)) throw new ModelError('not_found', 'Rollback target not found.', 404);
    const model = await OcrModelVersion.findById(target).lean();
    if (!model || model.status !== 'approved') throw new ModelError('not_approved', 'Rollback target must be an approved model or the base model.', 409);
    try {
      await ensureLocalArtifact(model, deps);
    } catch (error) {
      await recordDeployment({ action: 'rollback', outcome: 'failed', oldModelId: registry.activeModelId, newModelId: target, actorId, reason: safeReason, errorCode: error?.code || 'artifact_unavailable' });
      throw new ModelError(error?.code || 'artifact_unavailable', 'The rollback target could not be verified; nothing changed.', 409);
    }
  }
  const updated = await compareAndSetActive({ expectedVersion: registry.version, activeModelId: target, previousModelId: String(registry.activeModelId), actorId });
  if (!updated) throw new ModelError('registry_changed', 'The active model changed during rollback. Reload and try again.', 409);
  const event = await recordDeployment({ action: 'rollback', outcome: 'succeeded', oldModelId: registry.activeModelId, newModelId: target, actorId, reason: safeReason });
  return { registry: updated, event };
}

async function listModels(limit = 30) {
  return OcrModelVersion.find({}).sort({ createdAt: -1 }).limit(limit).lean();
}

async function listDeployments(limit = 20) {
  return OcrDeploymentEvent.find({}).sort({ createdAt: -1 }).limit(limit).lean();
}

module.exports = {
  BASE_MODEL_ID,
  ModelError,
  getModelCacheDir,
  getRegistry,
  clearRegistryCache,
  ensureLocalArtifact,
  resolveLanguage,
  getModelLoadFailures,
  registerCandidate,
  recordEvaluation,
  approveModel,
  activateModel,
  rollbackModel,
  listModels,
  listDeployments
};
