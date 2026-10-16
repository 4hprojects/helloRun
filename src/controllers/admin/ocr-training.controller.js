'use strict';

/**
 * /admin/ocr-training — OCR Training Center (docs/improvement-plan/ocr-platform-aware).
 * Every handler is mounted behind requireAdmin; activation and rollback additionally
 * require the full admin tier (see src/routes/admin-ocr-training.routes.js).
 */

const mongoose = require('mongoose');
const logger = require('../../utils/logger');
const OcrJob = require('../../models/OcrJob');
const OcrExtraction = require('../../models/OcrExtraction');
const { getOcrLimits, OCR_FLAGS, readFlag } = require('../../services/ocr/ocr-config');
const { listProfiles, describeProfile, PROFILE_STATUSES } = require('../../services/ocr/ocr-profiles');
const { getEffectiveProfiles, setProfileStatus } = require('../../services/ocr/ocr-profile-settings.service');
const { getQueueSummary } = require('../../services/ocr/ocr-job.service');
const { runOcrPipeline } = require('../../services/ocr/ocr-pipeline.service');
const { getSharedEngine } = require('../../services/ocr/ocr-engine');
const { queueReprocess } = require('../../services/ocr/server-ocr.service');
const { recordOcrAudit, listOcrAudit } = require('../../services/ocr/ocr-audit.service');

function pageMessage(query = {}) {
  const type = String(query.type || '').trim();
  const text = String(query.msg || '').trim().slice(0, 300);
  if (!text || !['success', 'error', 'info', 'warning'].includes(type)) return null;
  return { type, text };
}

function redirectWith(res, pathname, type, message) {
  const params = new URLSearchParams({ type, msg: message });
  return res.redirect(`${pathname}?${params.toString()}`);
}

function formatDateTime(value) {
  if (!value) return 'N/A';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'N/A' : date.toLocaleString('en-US', { timeZone: 'Asia/Manila' });
}

function renderError(res, error, message) {
  logger.error(`[ocr-training] ${message}`, { error: error?.message || String(error) });
  return res.status(500).render('error', { title: '500 - Server Error', status: 500, message });
}

function baseLocals(req, section, title) {
  return {
    title: `${title} - OCR Training Center - HelloRun Admin`,
    section,
    message: pageMessage(req.query),
    formatDateTime,
    flags: OCR_FLAGS.map((name) => ({ name, enabled: readFlag(name) }))
  };
}

async function platformBreakdown(sinceDays = 30) {
  const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000);
  const rows = await OcrExtraction.aggregate([
    { $match: { createdAt: { $gte: since } } },
    {
      $group: {
        _id: { platform: '$detection.platform', status: '$detection.status' },
        count: { $sum: 1 },
        avgElapsedMs: { $avg: '$elapsedMs' }
      }
    },
    { $sort: { count: -1 } }
  ]);
  return rows.map((row) => ({
    platform: row._id.platform || 'unknown',
    detectionStatus: row._id.status || '',
    count: row.count,
    avgElapsedMs: row.avgElapsedMs === null ? null : Math.round(row.avgElapsedMs)
  }));
}

exports.renderOverview = async (req, res) => {
  try {
    const [queue, breakdown, profiles, recentJobs, extras] = await Promise.all([
      getQueueSummary(),
      platformBreakdown(30),
      getEffectiveProfiles(),
      OcrJob.find({}).sort({ createdAt: -1 }).limit(10).select('status errorCode attempts createdAt finishedAt elapsedMs options targets').lean(),
      exports._overviewExtras ? exports._overviewExtras() : {}
    ]);
    return res.render('admin/ocr-training/overview', {
      ...baseLocals(req, 'overview', 'Overview'),
      queue,
      breakdown,
      profiles: profiles.map((item) => ({ ...describeProfile(item.profile), status: item.status })),
      recentJobs,
      extras
    });
  } catch (error) {
    return renderError(res, error, 'Could not load the OCR Training Center.');
  }
};

exports.renderPlatforms = async (req, res) => {
  try {
    const profiles = await getEffectiveProfiles({ now: 0 });
    return res.render('admin/ocr-training/platforms', {
      ...baseLocals(req, 'platforms', 'Platforms'),
      profiles: profiles.map((item) => ({
        ...describeProfile(item.profile),
        status: item.status,
        history: (item.setting?.history || []).slice(-5).reverse()
      })),
      statuses: PROFILE_STATUSES,
      testResult: null,
      limits: getOcrLimits()
    });
  } catch (error) {
    return renderError(res, error, 'Could not load OCR platform profiles.');
  }
};

exports.updateProfileStatus = async (req, res) => {
  const profileId = String(req.params.profileId || '').trim();
  const status = String(req.body?.status || '').trim();
  const notes = String(req.body?.notes || '').trim();
  try {
    const before = (await getEffectiveProfiles({ now: 0 })).find((item) => item.profile.id === profileId);
    if (status === 'active' && notes.length < 10) {
      return redirectWith(res, '/admin/ocr-training/platforms', 'error', 'Enabling a profile needs a note (10+ characters) naming the regression check it passed.');
    }
    await setProfileStatus({ profileId, status, notes, actorId: req.session?.userId });
    await recordOcrAudit({
      action: 'ocr.profile_status_changed',
      targetType: 'ocr_profile',
      targetId: profileId,
      statusFrom: before?.status || '',
      statusTo: status,
      reason: notes,
      req
    });
    return redirectWith(res, '/admin/ocr-training/platforms', 'success', `Profile ${profileId} is now ${status}.`);
  } catch (error) {
    const known = ['profile_not_found', 'profile_locked', 'invalid_status'].includes(error?.code);
    if (!known) logger.error('[ocr-training] profile status update failed', { error: error?.message });
    return redirectWith(res, '/admin/ocr-training/platforms', 'error', known ? error.message : 'Could not update the profile.');
  }
};

/** Nonproduction Test OCR: runs the pipeline on an uploaded image and writes nothing. */
exports.testOcr = async (req, res) => {
  const wantsJson = String(req.get('accept') || '').includes('application/json');
  const fail = (status, code, message) => {
    if (wantsJson) return res.status(status).json({ success: false, code, message });
    return redirectWith(res, '/admin/ocr-training/platforms', 'error', message);
  };
  if (req.uploadError) return fail(req.uploadError.status || 400, req.uploadError.code || 'invalid_upload', req.uploadError.message);
  const file = req.file;
  if (!file?.buffer?.length) return fail(400, 'file_required', 'Choose a screenshot to test.');
  const engine = getSharedEngine();
  if (engine.isBusy()) return fail(503, 'worker_busy', 'The OCR engine is busy with queued work. Try again in a minute.');
  const profileOverride = String(req.body?.profileOverride || '').trim();
  const allowedOverride = listProfiles().some((profile) => profile.id === profileOverride) ? profileOverride : '';
  try {
    const profiles = await getEffectiveProfiles();
    const mode = String(req.body?.profileMode || 'production');
    const enabledProfileIds = mode === 'all_test'
      ? profiles.filter((item) => item.status !== 'retired').map((item) => item.profile.id)
      : profiles.filter((item) => item.status === 'active').map((item) => item.profile.id);
    const result = await runOcrPipeline(file.buffer, { engine, enabledProfileIds, profileOverride: allowedOverride });
    await recordOcrAudit({
      action: 'ocr.test_ocr_run',
      targetType: 'ocr_profile',
      targetId: result.profile?.id || '',
      reason: '',
      details: { status: result.status, platform: result.detection?.platform || '', mode, elapsedMs: result.elapsedMs },
      req
    });
    const testResult = sanitizeTestResult(result);
    if (wantsJson) return res.json({ success: true, result: testResult });
    const effective = await getEffectiveProfiles({ now: 0 });
    return res.render('admin/ocr-training/platforms', {
      ...baseLocals(req, 'platforms', 'Platforms'),
      profiles: effective.map((item) => ({
        ...describeProfile(item.profile),
        status: item.status,
        history: (item.setting?.history || []).slice(-5).reverse()
      })),
      statuses: PROFILE_STATUSES,
      testResult,
      testMode: mode,
      limits: getOcrLimits()
    });
  } catch (error) {
    logger.error('[ocr-training] test OCR failed', { error: error?.message || String(error) });
    return fail(500, 'test_failed', 'Test OCR failed. Check the server log for details.');
  }
};

/** Diagnostics for the admin who uploaded the image; no stack traces, no buffers. */
function sanitizeTestResult(result) {
  const fields = result.fields || {};
  const display = (field) => {
    const value = field?.value;
    if (value === null || value === undefined || value === '') return '';
    if (typeof value !== 'object') return String(value);
    if (value.valueKm !== undefined) return `${value.value} ${value.unit} (${Number(value.valueKm).toFixed(2)} km)`;
    if (value.totalMs !== undefined) return `${value.hours}h ${value.minutes}m ${value.seconds}s`;
    if (value.label) return value.label;
    if (value.value !== undefined) return `${value.value} ${value.unit || ''}`.trim();
    return JSON.stringify(value).slice(0, 80);
  };
  return {
    status: result.status,
    errorCode: result.errorCode,
    pipelineVersion: result.pipelineVersion,
    parserVersion: result.parserVersion,
    modelVersionId: result.modelVersionId,
    image: result.image,
    layoutId: result.layout?.id || '',
    detection: result.detection
      ? {
        status: result.detection.status,
        platform: result.detection.platform,
        platformCandidate: result.detection.platformCandidate,
        confidence: result.detection.confidence,
        candidates: result.detection.candidates,
        signals: result.detection.signals.map((signal) => ({ kind: signal.kind, evidence: signal.evidence }))
      }
      : null,
    profile: result.profile,
    fields: Object.keys(fields).map((key) => ({
      key,
      display: display(fields[key]),
      kind: fields[key]?.kind || '',
      sourcePass: fields[key]?.sourcePass || '',
      rawText: fields[key]?.location?.rawText || '',
      lineConfidence: fields[key]?.location?.confidence ?? null,
      boundingBox: fields[key]?.location?.boundingBox || null
    })),
    confidence: result.confidence,
    engineConfidence: result.engineConfidence,
    validationFlags: result.validationFlags,
    passes: result.passes,
    elapsedMs: result.elapsedMs,
    rawText: String(result.rawText || '').slice(0, 2000)
  };
}

exports.reprocessEntry = async (req, res) => {
  const kind = String(req.params.kind || '');
  const entryId = String(req.params.entryId || '');
  const back = String(req.body?.returnTo || '').startsWith('/admin/') ? req.body.returnTo : '/admin/ocr-training/jobs';
  if (!['run_submission', 'accumulated_activity'].includes(kind) || !mongoose.isValidObjectId(entryId)) {
    return res.status(404).json({ success: false, code: 'not_found', message: 'Entry not found.' });
  }
  try {
    const profileOverride = String(req.body?.profileOverride || '').trim();
    const allowed = listProfiles().some((profile) => profile.id === profileOverride) ? profileOverride : '';
    const result = await queueReprocess({ kind, entryId, requestedBy: req.session?.userId || null, profileOverride: allowed });
    if (!result) return res.status(404).json({ success: false, code: 'not_found', message: 'Entry or proof not found.' });
    await recordOcrAudit({ action: 'ocr.reprocess_queued', targetType: kind, targetId: entryId, details: { jobId: String(result.job._id), profileOverride: allowed }, req });
    if (String(req.get('accept') || '').includes('application/json')) {
      return res.status(202).json({ success: true, jobId: String(result.job._id) });
    }
    return redirectWith(res, back, 'success', 'OCR reprocessing queued.');
  } catch (error) {
    logger.error('[ocr-training] reprocess failed', { error: error?.message });
    return res.status(500).json({ success: false, code: 'reprocess_failed', message: 'Could not queue reprocessing.' });
  }
};

exports.renderAudit = async (req, res) => {
  try {
    const rows = await listOcrAudit({ limit: 100 });
    return res.render('admin/ocr-training/audit', { ...baseLocals(req, 'audit', 'Audit'), rows });
  } catch (error) {
    return renderError(res, error, 'Could not load the OCR audit trail.');
  }
};

exports._sanitizeTestResult = sanitizeTestResult;
exports._formatDateTime = formatDateTime;
exports._baseLocals = baseLocals;
exports._redirectWith = redirectWith;
exports._renderError = renderError;
