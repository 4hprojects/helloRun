'use strict';

/**
 * /admin/ocr-training/samples and dataset snapshots (Phase 3).
 * Mounted behind requireAdmin + CSRF in src/routes/admin-ocr-training.routes.js.
 */

const mongoose = require('mongoose');
const logger = require('../../utils/logger');
const TrainingSample = require('../../models/TrainingSample');
const OcrExtraction = require('../../models/OcrExtraction');
const DatasetVersion = require('../../models/DatasetVersion');
const { CONSENT_BASES } = require('../../models/TrainingSample');
const {
  listSamples, getSampleCounts, reviewSample, excludeSamplesForRunner, getCropReadUrl, createCandidatesFromExtraction, SampleError
} = require('../../services/ocr/training-sample.service');
const { createDatasetVersion, listDatasets, verifyDatasetIntegrity } = require('../../services/ocr/dataset.service');
const { recordOcrAudit } = require('../../services/ocr/ocr-audit.service');
const { runOcrPipeline } = require('../../services/ocr/ocr-pipeline.service');
const { getSharedEngine } = require('../../services/ocr/ocr-engine');
const { getEffectiveProfiles } = require('../../services/ocr/ocr-profile-settings.service');
const { buildExtractionDocument } = require('../../services/ocr/server-ocr.service');
const base = require('./ocr-training.controller');

const wantsJson = (req) => String(req.get('accept') || '').includes('application/json');

exports.renderSamples = async (req, res) => {
  try {
    const filters = {
      status: String(req.query.status || 'pending'),
      platform: String(req.query.platform || ''),
      fieldKey: String(req.query.fieldKey || ''),
      eligibility: String(req.query.eligibility || '')
    };
    const [page, counts, datasets] = await Promise.all([
      listSamples(filters, { page: req.query.page, pageSize: 12 }),
      getSampleCounts(),
      listDatasets(10)
    ]);
    const items = await Promise.all(page.items.map(async (sample) => {
      let cropUrl = '';
      if (!sample.cropDeletedAt) {
        try {
          cropUrl = await getCropReadUrl(sample);
        } catch (_) {
          cropUrl = '';
        }
      }
      return { ...sample, cropUrl };
    }));
    return res.render('admin/ocr-training/samples', {
      ...base._baseLocals(req, 'samples', 'Samples'),
      filters,
      counts,
      page: { ...page, items },
      datasets,
      consentBases: CONSENT_BASES
    });
  } catch (error) {
    return base._renderError(res, error, 'Could not load OCR samples.');
  }
};

exports.reviewSample = async (req, res) => {
  const back = String(req.body?.returnTo || '').startsWith('/admin/ocr-training/samples') ? req.body.returnTo : '/admin/ocr-training/samples';
  try {
    const { sample, statusFrom, statusTo } = await reviewSample({
      sampleId: req.params.sampleId,
      version: req.body?.version,
      action: String(req.body?.action || 'save'),
      transcribedText: req.body?.transcribedText,
      alignmentConfirmed: ['on', 'true', '1'].includes(String(req.body?.alignmentConfirmed || '')),
      reason: req.body?.reason,
      reviewerId: req.session?.userId
    });
    await recordOcrAudit({
      action: `ocr.sample_${String(req.body?.action || 'save')}`,
      targetType: 'training_sample',
      targetId: String(sample._id),
      statusFrom,
      statusTo,
      reason: String(req.body?.reason || '').slice(0, 300),
      details: { eligibility: sample.eligibility, fieldKey: sample.fieldKey },
      req
    });
    if (wantsJson(req)) return res.json({ success: true, sample: { id: String(sample._id), status: sample.status, eligibility: sample.eligibility, version: sample.__v } });
    return base._redirectWith(res, back, 'success', `Sample ${statusTo}.`);
  } catch (error) {
    if (error instanceof SampleError) {
      if (wantsJson(req)) return res.status(error.status).json({ success: false, code: error.code, message: error.message });
      return base._redirectWith(res, back, 'error', error.message);
    }
    logger.error('[ocr-training] sample review failed', { error: error?.message });
    if (wantsJson(req)) return res.status(500).json({ success: false, code: 'review_failed', message: 'Could not save the review.' });
    return base._redirectWith(res, back, 'error', 'Could not save the review.');
  }
};

exports.excludeRunnerSamples = async (req, res) => {
  const runnerId = String(req.params.runnerId || req.body?.runnerId || '');
  const reason = String(req.body?.reason || '').trim();
  if (!mongoose.isValidObjectId(runnerId) || reason.length < 5) {
    return base._redirectWith(res, '/admin/ocr-training/samples', 'error', 'A valid participant and a reason (5+ characters) are required.');
  }
  try {
    const count = await excludeSamplesForRunner(runnerId, reason);
    await recordOcrAudit({ action: 'ocr.samples_excluded_for_participant', targetType: 'user', targetId: runnerId, reason, details: { count }, req });
    return base._redirectWith(res, '/admin/ocr-training/samples', 'success', `${count} sample(s) excluded from future datasets.`);
  } catch (error) {
    logger.error('[ocr-training] participant exclusion failed', { error: error?.message });
    return base._redirectWith(res, '/admin/ocr-training/samples', 'error', 'Could not exclude the samples.');
  }
};

/**
 * Store candidates from an admin's own upload (e.g. the owner's own activities). Requires
 * an explicit consent basis and an attestation; the screenshot itself is not stored.
 */
exports.uploadTrainingScreenshot = async (req, res) => {
  const back = '/admin/ocr-training/samples';
  if (req.uploadError) return base._redirectWith(res, back, 'error', req.uploadError.message);
  const file = req.file;
  const consentBasis = String(req.body?.consentBasis || '');
  if (!file?.buffer?.length) return base._redirectWith(res, back, 'error', 'Choose a screenshot.');
  if (!['owner_own_activity', 'synthetic'].includes(consentBasis)) return base._redirectWith(res, back, 'error', 'Choose the consent basis for this screenshot.');
  if (!['on', 'true', '1'].includes(String(req.body?.attestation || ''))) {
    return base._redirectWith(res, back, 'error', 'Confirm that you are allowed to use this screenshot for model improvement.');
  }
  const engine = getSharedEngine();
  if (engine.isBusy()) return base._redirectWith(res, back, 'error', 'The OCR engine is busy. Try again in a minute.');
  try {
    const profiles = await getEffectiveProfiles();
    const result = await runOcrPipeline(file.buffer, {
      engine,
      enabledProfileIds: profiles.filter((item) => item.status !== 'retired').map((item) => item.profile.id)
    });
    if (result.status === 'failed') return base._redirectWith(res, back, 'error', `The screenshot could not be read (${result.errorCode}).`);
    const crypto = require('node:crypto');
    const proofHash = crypto.createHash('sha256').update(file.buffer).digest('hex');
    const extraction = await OcrExtraction.create({
      ...buildExtractionDocument(result, { _id: null, proofKey: '', proofHash, runnerId: null, targets: [], options: { reason: 'admin_test' } }),
      source: 'admin_test'
    });
    const candidates = await createCandidatesFromExtraction({
      extraction: extraction.toObject(),
      buffer: file.buffer,
      consentBasis,
      source: 'admin_upload'
    });
    await recordOcrAudit({
      action: 'ocr.training_upload',
      targetType: 'ocr_extraction',
      targetId: String(extraction._id),
      reason: consentBasis,
      details: { candidates: candidates.length, platform: result.detection?.platform || '' },
      req
    });
    const message = candidates.length
      ? `${candidates.length} line crop(s) added for review.`
      : 'No distance, time or pace line could be located in this screenshot; nothing was stored.';
    return base._redirectWith(res, back, candidates.length ? 'success' : 'warning', message);
  } catch (error) {
    logger.error('[ocr-training] training upload failed', { error: error?.message });
    return base._redirectWith(res, back, 'error', error instanceof SampleError ? error.message : 'Could not store the training crops. Check R2 configuration.');
  }
};

function datasetReturnPath(req) {
  return String(req.body?.returnTo || '') === '/admin/ocr-training/jobs' ? '/admin/ocr-training/jobs' : '/admin/ocr-training/samples';
}

exports.createDataset = async (req, res) => {
  try {
    const dataset = await createDatasetVersion({ name: req.body?.name, createdBy: req.session?.userId });
    await recordOcrAudit({
      action: 'ocr.dataset_created',
      targetType: 'dataset_version',
      targetId: String(dataset._id),
      statusTo: dataset.validationStatus,
      details: { manifestHash: dataset.manifestHash, counts: dataset.counts },
      req
    });
    if (wantsJson(req)) return res.status(201).json({ success: true, id: String(dataset._id), validationStatus: dataset.validationStatus, notReadyReasons: dataset.notReadyReasons });
    const message = dataset.validationStatus === 'ready'
      ? `Dataset ${dataset.name} created and ready (${dataset.counts.total} samples).`
      : `Dataset ${dataset.name} created but not ready: ${dataset.notReadyReasons.join('; ')}`;
    return base._redirectWith(res, datasetReturnPath(req), dataset.validationStatus === 'ready' ? 'success' : 'warning', message.slice(0, 280));
  } catch (error) {
    logger.error('[ocr-training] dataset creation failed', { error: error?.message });
    return base._redirectWith(res, datasetReturnPath(req), 'error', 'Could not create the dataset snapshot.');
  }
};

exports.downloadDatasetManifest = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.datasetId)) return res.status(404).json({ success: false, code: 'not_found' });
  try {
    const dataset = await DatasetVersion.findById(req.params.datasetId).lean();
    if (!dataset) return res.status(404).json({ success: false, code: 'not_found' });
    await recordOcrAudit({ action: 'ocr.dataset_manifest_downloaded', targetType: 'dataset_version', targetId: String(dataset._id), req });
    res.set('Content-Disposition', `attachment; filename="ocr-dataset-${String(dataset._id)}.json"`);
    return res.json({
      id: String(dataset._id),
      name: dataset.name,
      manifestHash: dataset.manifestHash,
      integrityVerified: verifyDatasetIntegrity(dataset),
      splitRule: dataset.splitRule,
      counts: dataset.counts,
      platformDistribution: dataset.platformDistribution,
      qualityReport: dataset.qualityReport,
      validationStatus: dataset.validationStatus,
      // Sample ids, splits, groups and literal line text only: no crop keys, no participants.
      manifest: dataset.manifest.map(({ sampleId, split, activityGroupId, cropChecksum, transcribedText, platform, layoutId, fieldKey }) => ({
        sampleId: String(sampleId), split, activityGroupId, cropChecksum, transcribedText, platform, layoutId, fieldKey
      }))
    });
  } catch (error) {
    logger.error('[ocr-training] manifest download failed', { error: error?.message });
    return res.status(500).json({ success: false, code: 'download_failed' });
  }
};

exports._listDatasets = listDatasets;
exports._sampleCounts = getSampleCounts;
exports._TrainingSample = TrainingSample;
