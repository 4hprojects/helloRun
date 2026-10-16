'use strict';

/**
 * /admin/ocr-training/jobs and /models (Phase 4). Starting/cancelling training is for any
 * admin; approving, activating and rolling back a model require the full admin tier
 * (enforced in the router) and a typed confirmation.
 */

const crypto = require('node:crypto');
const mongoose = require('mongoose');
const logger = require('../../utils/logger');
const TrainingJob = require('../../models/TrainingJob');
const DatasetVersion = require('../../models/DatasetVersion');
const training = require('../../services/ocr/training-job.service');
const registry = require('../../services/ocr/model-registry.service');
const { listDatasets } = require('../../services/ocr/dataset.service');
const { recordOcrAudit } = require('../../services/ocr/ocr-audit.service');
const { isTrainingEnabled } = require('../../services/ocr/ocr-config');
const base = require('./ocr-training.controller');

const wantsJson = (req) => String(req.get('accept') || '').includes('application/json');

async function emit(eventType, payload) {
  try {
    await require('../../services/ocr/ocr-notification.service').emitOcrEvent(eventType, payload);
  } catch (error) {
    logger.warn('[ocr-training] notification failed (action unaffected)', { eventType, error: error?.message });
  }
}

function sendError(req, res, error, back) {
  const status = Number(error?.status) || 500;
  const known = Boolean(error?.code && error?.status);
  if (!known) logger.error('[ocr-training] action failed', { error: error?.message });
  const message = known ? error.message : 'The action failed. Check the server log.';
  if (wantsJson(req)) return res.status(status).json({ success: false, code: known ? error.code : 'internal_error', message });
  return base._redirectWith(res, back, 'error', message);
}

exports.renderJobs = async (req, res) => {
  try {
    const [worker, datasets, jobs, active] = await Promise.all([
      training.getWorkerStatus(),
      listDatasets(20),
      training.listTrainingJobs(20),
      training.getActiveTrainingJob()
    ]);
    return res.render('admin/ocr-training/jobs', {
      ...base._baseLocals(req, 'jobs', 'Training jobs'),
      worker,
      datasets,
      readyDatasets: datasets.filter((dataset) => dataset.validationStatus === 'ready'),
      jobs,
      active,
      trainingEnabled: isTrainingEnabled(),
      idempotencyKey: crypto.randomBytes(18).toString('base64url')
    });
  } catch (error) {
    return base._renderError(res, error, 'Could not load training jobs.');
  }
};

exports.startJob = async (req, res) => {
  const back = '/admin/ocr-training/jobs';
  try {
    const { job, created } = await training.startTrainingJob({
      datasetVersionId: req.body?.datasetVersionId,
      idempotencyKey: req.body?.idempotencyKey || req.get('idempotency-key'),
      actorId: req.session?.userId
    });
    if (created) {
      await recordOcrAudit({ action: 'ocr.training_started', targetType: 'training_job', targetId: String(job._id), statusTo: 'queued', details: { datasetVersionId: String(job.datasetVersionId), configHash: job.configHash }, req });
    }
    if (wantsJson(req)) return res.status(created ? 202 : 200).json({ success: true, jobId: String(job._id), status: job.status, created });
    return base._redirectWith(res, back, 'success', created ? 'Training job queued. The training worker will pick it up.' : 'That training request was already received.');
  } catch (error) {
    return sendError(req, res, error, back);
  }
};

exports.cancelJob = async (req, res) => {
  const back = '/admin/ocr-training/jobs';
  try {
    const job = await training.cancelTrainingJob({ jobId: req.params.jobId, actorId: req.session?.userId });
    await recordOcrAudit({ action: 'ocr.training_cancel_requested', targetType: 'training_job', targetId: String(job._id), statusFrom: job.status, statusTo: job.status === 'cancelled' ? 'cancelled' : 'cancel_requested', reason: String(req.body?.reason || '').slice(0, 300), req });
    if (wantsJson(req)) return res.json({ success: true, status: job.status, cancelRequested: true });
    return base._redirectWith(res, back, 'success', job.status === 'cancelled' ? 'Training job cancelled.' : 'Cancellation requested; the worker stops the job at its next check.');
  } catch (error) {
    return sendError(req, res, error, back);
  }
};

exports.getJob = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.jobId)) return res.status(404).json({ success: false, code: 'not_found' });
  const job = await TrainingJob.findById(req.params.jobId).lean();
  if (!job) return res.status(404).json({ success: false, code: 'not_found' });
  return res.json({
    success: true,
    job: {
      id: String(job._id), status: job.status, progress: job.progress, cancelRequested: job.cancelRequested,
      datasetVersionId: String(job.datasetVersionId), resultModelVersionId: job.resultModelVersionId ? String(job.resultModelVersionId) : null,
      resources: job.resources, errorCode: job.errorCode, errorSummary: job.errorSummary,
      createdAt: job.createdAt, startedAt: job.startedAt, finishedAt: job.finishedAt, hasLog: Boolean(job.logsKey)
    }
  });
};

exports.downloadJobLog = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.jobId)) return res.status(404).send('Not found');
  try {
    const job = await TrainingJob.findById(req.params.jobId).select('logsKey').lean();
    if (!job?.logsKey) return res.status(404).send('No log for this job.');
    const upload = require('../../services/upload.service');
    const url = await upload.getSignedReadUrlFromR2(job.logsKey, { bucket: upload.getPrivateBucketName(), expiresIn: 120, contentType: 'text/plain', contentDisposition: `attachment; filename="training-${req.params.jobId}.log"` });
    await recordOcrAudit({ action: 'ocr.training_log_downloaded', targetType: 'training_job', targetId: String(req.params.jobId), req });
    return res.redirect(url);
  } catch (error) {
    logger.error('[ocr-training] log download failed', { error: error?.message });
    return res.status(500).send('Could not open the log.');
  }
};

exports.renderModels = async (req, res) => {
  try {
    const [state, models, deployments] = await Promise.all([
      registry.getRegistry({ fresh: true }),
      registry.listModels(30),
      registry.listDeployments(20)
    ]);
    return res.render('admin/ocr-training/models', {
      ...base._baseLocals(req, 'models', 'Models'),
      registry: state,
      models,
      deployments,
      loadFailures: registry.getModelLoadFailures(),
      canDeploy: Boolean(res.locals?.isFullAdmin)
    });
  } catch (error) {
    return base._renderError(res, error, 'Could not load OCR models.');
  }
};

function requireTypedConfirmation(req, expected) {
  return String(req.body?.confirmation || '').trim() === expected;
}

exports.approveModel = async (req, res) => {
  const back = '/admin/ocr-training/models';
  try {
    if (!requireTypedConfirmation(req, 'APPROVE')) return base._redirectWith(res, back, 'error', 'Type APPROVE to confirm.');
    const model = await registry.approveModel({ modelId: req.params.modelId, actorId: req.session?.userId, reason: req.body?.reason });
    await recordOcrAudit({ action: 'ocr.model_approved', targetType: 'ocr_model', targetId: String(model._id), statusFrom: 'passed_gates', statusTo: 'approved', reason: req.body?.reason, req });
    return base._redirectWith(res, back, 'success', 'Model approved. It is not active until you activate it.');
  } catch (error) {
    return sendError(req, res, error, back);
  }
};

exports.activateModel = async (req, res) => {
  const back = '/admin/ocr-training/models';
  try {
    if (!requireTypedConfirmation(req, 'ACTIVATE')) return base._redirectWith(res, back, 'error', 'Type ACTIVATE to confirm.');
    const result = await registry.activateModel({
      modelId: req.params.modelId,
      actorId: req.session?.userId,
      reason: req.body?.reason,
      expectedVersion: req.body?.registryVersion
    });
    const audit = await recordOcrAudit({ action: 'ocr.model_activated', targetType: 'ocr_model', targetId: String(result.model._id), statusFrom: String(result.event.oldModelId), statusTo: String(result.event.newModelId), reason: req.body?.reason, req });
    await emit('ocr.model_activated', { registryVersion: result.registry.version, oldModelId: result.event.oldModelId, newModelId: result.event.newModelId, auditId: String(audit._id) });
    return base._redirectWith(res, back, 'success', 'Model activated. Running OCR workers switch within a minute.');
  } catch (error) {
    await recordOcrAudit({ action: 'ocr.model_activation_failed', targetType: 'ocr_model', targetId: String(req.params.modelId || ''), reason: String(error?.code || 'failed'), req }).catch(() => {});
    return sendError(req, res, error, back);
  }
};

exports.rollbackModel = async (req, res) => {
  const back = '/admin/ocr-training/models';
  try {
    if (!requireTypedConfirmation(req, 'ROLLBACK')) return base._redirectWith(res, back, 'error', 'Type ROLLBACK to confirm.');
    const result = await registry.rollbackModel({
      actorId: req.session?.userId,
      reason: req.body?.reason,
      expectedVersion: req.body?.registryVersion,
      targetModelId: String(req.body?.targetModelId || '')
    });
    const audit = await recordOcrAudit({ action: 'ocr.model_rolled_back', targetType: 'ocr_model', targetId: String(result.event.newModelId), statusFrom: String(result.event.oldModelId), statusTo: String(result.event.newModelId), reason: req.body?.reason, req });
    await emit('ocr.model_activated', { registryVersion: result.registry.version, oldModelId: result.event.oldModelId, newModelId: result.event.newModelId, rollback: true, auditId: String(audit._id) });
    return base._redirectWith(res, back, 'success', 'Rollback complete.');
  } catch (error) {
    return sendError(req, res, error, back);
  }
};

exports._DatasetVersion = DatasetVersion;
