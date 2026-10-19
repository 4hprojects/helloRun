'use strict';

/**
 * Server OCR for stored run proofs (Phase 1; closes Phase 0 finding C1).
 *
 * - queueProofExtraction: called after a proof is saved; one job per stored proof.
 * - processExtractionJob: worker side. Reads the proof back from R2, runs the
 *   pipeline, writes an immutable OcrExtraction, projects a summary onto every
 *   entry that shares the proof, and re-evaluates auto-approval from the
 *   server's own reading when OCR_SERVER_AUTO_APPROVAL_ENABLED is on.
 *
 * Never throws into the submission request: queueing failures are logged and
 * the entry simply stays on manual review.
 */

const mongoose = require('mongoose');
const logger = require('../../utils/logger');
const OcrExtraction = require('../../models/OcrExtraction');
const Submission = require('../../models/Submission');
const AccumulatedActivitySubmission = require('../../models/AccumulatedActivitySubmission');
const User = require('../../models/User');
const { detectSuspiciousActivity } = require('../../utils/submission-integrity');
const { namesMatch } = require('../../utils/ocr/name-match');
const { sanitizeOcrData, cleanOcrNameCandidate, getSubmissionReviewReason } = require('../submission-validation.service');
const { getOcrLimits, isServerOcrPipelineEnabled, isServerOcrAutoApprovalEnabled } = require('./ocr-config');
const { runOcrPipeline } = require('./ocr-pipeline.service');
const { getSharedEngine } = require('./ocr-engine');
const { getEnabledProfileIds } = require('./ocr-profile-settings.service');
const jobs = require('./ocr-job.service');
const { findNearDuplicateScreenshots } = require('./activity-duplicate.service');
const { sanitizeDuplicateSignals } = require('../../utils/ocr/activity-evidence');

const PERMANENT_ERROR_CODES = new Set([
  'proof_missing',
  'object_too_large',
  'image_empty',
  'image_too_large',
  'image_too_many_pixels',
  'image_undecodable',
  'image_unsupported_format',
  'image_too_small',
  'targets_missing'
]);

function modelForKind(kind) {
  return kind === 'accumulated_activity' ? AccumulatedActivitySubmission : Submission;
}

/**
 * Queue extraction for entries that share one stored proof.
 * @param {{ entries: Array<{ kind, submission }> , submissionAttemptId?: string }} input
 */
async function queueProofExtraction({ entries, submissionAttemptId = '' }, deps = {}) {
  if (!isServerOcrPipelineEnabled()) return { queued: false, reason: 'disabled' };
  const enqueue = deps.enqueueExtraction || jobs.enqueueExtraction;
  try {
    const usable = (entries || []).filter((entry) => entry?.submission?._id && entry.submission.proof?.key);
    if (!usable.length) return { queued: false, reason: 'no_proof' };
    const byProof = new Map();
    for (const entry of usable) {
      const key = entry.submission.proof.key;
      if (!byProof.has(key)) byProof.set(key, []);
      byProof.get(key).push(entry);
    }
    const queuedJobs = [];
    for (const [proofKey, group] of byProof) {
      const first = group[0].submission;
      const targets = group.map((entry) => ({ kind: entry.kind, id: entry.submission._id }));
      const { job } = await enqueue({
        proofKey,
        proofHash: String(first.proof?.hash || ''),
        runnerId: first.runnerId || null,
        targets,
        submissionAttemptId
      });
      queuedJobs.push(job);
      const now = new Date();
      for (const entry of group) {
        await modelForKind(entry.kind).updateOne(
          { _id: entry.submission._id },
          { $set: { serverOcr: { status: 'queued', jobId: job._id, proofKey, queuedAt: now } } }
        );
      }
    }
    return { queued: true, jobs: queuedJobs };
  } catch (error) {
    logger.error('[server-ocr] Failed to queue proof extraction (submission unaffected):', {
      error: error?.message || String(error)
    });
    return { queued: false, reason: 'queue_failed' };
  }
}

function toServerOcrData(result) {
  const fields = result.fields || {};
  return sanitizeOcrData({
    extractedDistanceKm: fields.distance?.value?.valueKm ?? null,
    extractedTimeMs: fields.time?.value?.totalMs ?? null,
    extractedElevationGain: fields.elevationGain?.value?.value ?? null,
    extractedSteps: fields.steps?.value ?? null,
    extractedRunDate: fields.date?.value || '',
    extractedRunLocation: fields.location?.value || '',
    extractedRunType: fields.runType?.value || '',
    rawText: result.rawText,
    confidence: result.confidence,
    detectedSource: result.detection?.platform || 'unknown',
    parserVersion: result.parserVersion,
    extractedName: fields.name?.value || ''
  });
}

/** Compare the server's reading with what the runner entered on this entry. */
function buildAutoApprovalProjection(result, entry, accountName) {
  const ocrData = toServerOcrData(result);
  const extractedName = cleanOcrNameCandidate(ocrData.extractedName);
  let nameMatchStatus = 'not_detected';
  if (extractedName) nameMatchStatus = namesMatch(extractedName, accountName) ? 'matched' : 'mismatched';
  const integrity = detectSuspiciousActivity({
    distanceKm: entry.distanceKm,
    elapsedMs: entry.elapsedMs,
    runDate: entry.runDate,
    runLocation: entry.runLocation,
    runType: entry.runType,
    elevationGain: entry.elevationGain,
    steps: entry.steps,
    ocrData: { ...ocrData, extractedName, nameMatchStatus }
  });
  const comparisons = integrity.comparisons || {};
  return {
    autoApproval: {
      extractedDistanceKm: ocrData.extractedDistanceKm,
      extractedTimeMs: ocrData.extractedTimeMs,
      extractedRunDate: ocrData.extractedRunDate,
      extractedRunType: ocrData.extractedRunType,
      extractedElevationGain: ocrData.extractedElevationGain,
      extractedSteps: ocrData.extractedSteps,
      extractedName,
      confidence: ocrData.confidence,
      nameMatchStatus,
      distanceMismatch: Boolean(comparisons.distanceMismatch),
      timeMismatch: Boolean(comparisons.timeMismatch),
      elevationMismatch: Boolean(comparisons.elevationMismatch),
      stepsMismatch: Boolean(comparisons.stepsMismatch),
      dateMismatch: Boolean(comparisons.dateMismatch),
      locationMismatch: Boolean(comparisons.locationMismatch),
      runTypeMismatch: Boolean(comparisons.runTypeMismatch)
    },
    suspicious: Boolean(integrity.suspicious),
    suspiciousReasons: String(integrity.reason || '').slice(0, 500)
  };
}

function buildExtractionDocument(result, job) {
  const fields = result.fields || {};
  const asField = (field, extra = {}) => (field ? {
    value: field.value ?? null,
    sourcePass: field.sourcePass || '',
    location: field.location || null,
    ...extra
  } : null);
  return {
    source: ['reprocess', 'backfill'].includes(job.options?.reason) ? job.options.reason : 'submission',
    jobId: job._id,
    proofKey: job.proofKey,
    proofHash: job.proofHash,
    differenceHash: result.differenceHash || '',
    runnerId: job.runnerId || null,
    targets: job.targets,
    status: result.status,
    errorCode: result.errorCode || '',
    pipelineVersion: result.pipelineVersion,
    parserVersion: result.parserVersion,
    modelVersionId: result.modelVersionId,
    profile: result.profile || {},
    detection: result.detection || {},
    layout: result.layout || {},
    image: result.image
      ? { format: result.image.format, width: result.image.width, height: result.image.height, meanBrightness: result.image.meanBrightness }
      : {},
    fields: result.fields
      ? {
        distance: asField(fields.distance, { unit: fields.distance?.value?.unit || '' }),
        time: asField(fields.time, { kind: fields.time?.kind || '' }),
        pace: asField(fields.pace, { unit: fields.pace?.value?.unit || '' }),
        date: asField(fields.date),
        runType: asField(fields.runType),
        elevationGain: asField(fields.elevationGain, { unit: 'm' }),
        steps: asField(fields.steps),
        name: asField(fields.name),
        location: asField(fields.location)
      }
      : {},
    confidence: result.confidence,
    engineConfidence: result.engineConfidence,
    rawText: result.rawText,
    passes: result.passes,
    validationFlags: result.validationFlags,
    elapsedMs: result.elapsedMs
  };
}

async function nextRevisionFor(job) {
  const latest = await OcrExtraction.findOne({ proofHash: job.proofHash, 'targets.id': job.targets[0]?.id })
    .sort({ createdAt: -1 })
    .select('_id revision')
    .lean();
  return latest ? { revision: Number(latest.revision || 1) + 1, supersedesId: latest._id } : { revision: 1, supersedesId: null };
}

async function reevaluateAutoApproval(kind, entryId, deps) {
  if (!isServerOcrAutoApprovalEnabled()) return 'disabled';
  const Model = modelForKind(kind);
  const entry = await Model.findById(entryId);
  if (!entry || entry.status !== 'submitted') return 'not_pending';
  if (kind === 'accumulated_activity') {
    const { applyAccumulatedAutoApprovalIfEligible } = deps.accumulatedService || require('../accumulated-activity.service');
    const saved = await applyAccumulatedAutoApprovalIfEligible(entry);
    return saved?.status === 'approved' ? 'auto_approved' : 'review';
  }
  const { applyAutoApprovalIfEligible } = deps.submissionService || require('../submission.service');
  const saved = await applyAutoApprovalIfEligible(entry);
  return saved?.status === 'approved' ? 'auto_approved' : 'review';
}

/**
 * Worker entry point for one claimed job.
 * @param {object} job claimed OcrJob document
 * @param {{ readProof?: Function, engine?: object, now?: Function }} deps
 */
async function processExtractionJob(job, deps = {}) {
  const limits = getOcrLimits();
  const readProof = deps.readProof || ((key) => require('../upload.service').getObjectBufferFromR2(key, { maxBytes: limits.maxProofBytes }));
  const engine = deps.engine || getSharedEngine();
  const outcome = { jobId: String(job._id), status: 'failed', errorCode: '', targets: [] };

  if (!Array.isArray(job.targets) || !job.targets.length) {
    await jobs.failJob(job, { errorCode: 'targets_missing', retryable: false });
    return { ...outcome, errorCode: 'targets_missing' };
  }

  let buffer;
  try {
    buffer = await readProof(job.proofKey);
  } catch (error) {
    const missing = error?.name === 'NoSuchKey' || error?.Code === 'NoSuchKey' || error?.$metadata?.httpStatusCode === 404;
    const errorCode = missing ? 'proof_missing' : (error?.code === 'object_too_large' ? 'object_too_large' : 'proof_read_failed');
    await finishWithFailure(job, errorCode);
    return { ...outcome, errorCode };
  }

  let result;
  try {
    const enabledProfileIds = deps.enabledProfileIds || await getEnabledProfileIds();
    // The runner's optional link is a separate provider signal; a disagreement is a flag only.
    const firstTarget = job.targets[0];
    const linked = await modelForKind(firstTarget.kind).findById(firstTarget.id).select('activityUrl.provider').lean().catch(() => null);
    result = await runOcrPipeline(buffer, {
      engine,
      limits,
      enabledProfileIds,
      urlProvider: linked?.activityUrl?.provider || '',
      profileOverride: job.options?.profileOverride || ''
    });
  } catch (error) {
    logger.error('[server-ocr] Pipeline crashed', { jobId: String(job._id), error: error?.message || String(error) });
    await finishWithFailure(job, 'pipeline_crashed');
    return { ...outcome, errorCode: 'pipeline_crashed' };
  }

  if (result.status === 'failed') {
    await finishWithFailure(job, result.errorCode || 'ocr_failed');
    return { ...outcome, errorCode: result.errorCode };
  }

  const { revision, supersedesId } = await nextRevisionFor(job);
  const extraction = await OcrExtraction.create({ ...buildExtractionDocument(result, job), revision, supersedesId });

  const runner = job.runnerId
    ? await User.findById(job.runnerId).select('firstName lastName accountStatus dateOfBirth ocrTrainingOptOut').lean()
    : null;
  const accountName = `${String(runner?.firstName || '').trim()} ${String(runner?.lastName || '').trim()}`.trim();
  const completedAt = new Date();
  let consentingEntry = null;
  const trainingSettings = deps.settings || await require('./ocr-settings.service').getOcrSettings().catch(() => null);
  const { isEntryUsableForTraining } = require('./training-sample.service');

  for (const target of job.targets) {
    const Model = modelForKind(target.kind);
    const entry = await Model.findById(target.id)
      .select('distanceKm elapsedMs runDate runLocation runType elevationGain steps status proof.key proof.mimeType runnerId eventId submissionAttemptId ocrTrainingConsent')
      .lean();
    if (!entry) {
      outcome.targets.push({ id: String(target.id), result: 'missing' });
      continue;
    }
    if (String(entry.proof?.key || '') !== String(job.proofKey)) {
      // The runner resubmitted a different proof meanwhile; this reading is stale for it.
      outcome.targets.push({ id: String(target.id), result: 'stale_proof' });
      continue;
    }
    const projection = buildAutoApprovalProjection(result, entry, accountName);
    let nearDuplicates = [];
    if (result.differenceHash) {
      try {
        nearDuplicates = await findNearDuplicateScreenshots({
          differenceHash: result.differenceHash,
          runnerId: entry.runnerId,
          submissionAttemptId: entry.submissionAttemptId,
          eventIds: entry.eventId ? [entry.eventId] : [],
          excludeIds: job.targets.map((item) => item.id)
        });
      } catch (error) {
        logger.warn('[server-ocr] near-duplicate lookup failed', { error: error?.message });
      }
    }
    await Model.updateOne(
      { _id: target.id, 'proof.key': job.proofKey },
      {
        $set: {
          serverOcr: {
            status: result.status,
            jobId: job._id,
            extractionId: extraction._id,
            proofKey: job.proofKey,
            platform: result.detection?.platform || 'unknown',
            platformStatus: result.detection?.status || '',
            profileId: result.profile?.id || '',
            profileVersion: result.profile?.version || '',
            modelVersionId: result.modelVersionId || '',
            layoutId: result.layout?.id || '',
            timeKind: result.fields?.time?.kind || '',
            validationFlags: result.validationFlags,
            suspicious: projection.suspicious,
            suspiciousReasons: projection.suspiciousReasons,
            autoApproval: projection.autoApproval,
            errorCode: result.errorCode || '',
            queuedAt: job.createdAt || null,
            completedAt
          },
          proofDifferenceHash: result.differenceHash || ''
        },
        ...(nearDuplicates.length ? { $push: { duplicateSignals: { $each: sanitizeDuplicateSignals(nearDuplicates) } } } : {})
      }
    );
    let decision = 'recorded';
    try {
      decision = await reevaluateAutoApproval(target.kind, target.id, deps);
    } catch (error) {
      logger.error('[server-ocr] Auto-approval re-evaluation failed (entry stays on review):', {
        entryId: String(target.id),
        error: error?.message || String(error)
      });
      decision = 'reevaluation_failed';
    }
    if (decision !== 'auto_approved') {
      await Model.updateOne(
        { _id: target.id, 'validation.reviewReason': 'server_ocr_pending' },
        {
          $set: {
            'validation.reviewReason': getSubmissionReviewReason({
              method: 'ocr',
              ocrData: projection.autoApproval,
              suspiciousFlag: projection.suspicious,
              minimumDistanceCheck: null
            })
          }
        }
      ).catch(() => {});
    }
    outcome.targets.push({ id: String(target.id), result: decision });
    if (!consentingEntry) {
      const eligibility = isEntryUsableForTraining(entry, runner, trainingSettings);
      if (eligibility.usable) consentingEntry = { kind: target.kind, entry, consentBasis: eligibility.consentBasis };
    }
  }

  // Entry usable for training (runner opted in, or the published notice basis applies and the
  // runner has not objected): cut pending ground-truth candidates. They still need an OCR admin's
  // literal transcription and approval before any dataset can use them. Never blocks the job.
  if (consentingEntry && result.status !== 'failed') {
    try {
      const createCandidates = deps.createTrainingCandidates || require('./training-sample.service').createCandidatesFromExtraction;
      const candidates = await createCandidates({
        extraction: extraction.toObject ? extraction.toObject() : extraction,
        buffer,
        consentBasis: consentingEntry.consentBasis,
        consentRecordedAt: consentingEntry.consentBasis === 'participant_opt_in'
          ? consentingEntry.entry.ocrTrainingConsent?.recordedAt
          : trainingSettings?.training?.noticePublishedAt,
        consentNoticeVersion: consentingEntry.consentBasis === 'participant_opt_in'
          ? consentingEntry.entry.ocrTrainingConsent?.noticeVersion
          : trainingSettings?.training?.noticePolicyVersion,
        source: consentingEntry.consentBasis === 'participant_opt_in'
          ? 'submission_opt_in'
          : (job.options?.reason === 'backfill' ? 'backfill' : 'submission_notice'),
        sourceEntry: { kind: consentingEntry.kind, id: consentingEntry.entry._id },
        eventId: consentingEntry.entry.eventId || null,
        runnerId: consentingEntry.entry.runnerId || null
      });
      outcome.trainingCandidates = candidates.length;
    } catch (error) {
      logger.warn('[server-ocr] training candidate creation failed (entry unaffected)', { error: error?.message });
      outcome.trainingCandidates = 0;
    }
  }

  await jobs.completeJob(job, { extractionId: extraction._id, elapsedMs: result.elapsedMs });
  return { ...outcome, status: result.status, extractionId: String(extraction._id) };
}

async function finishWithFailure(job, errorCode) {
  const retryable = !PERMANENT_ERROR_CODES.has(errorCode);
  const updated = await jobs.failJob(job, { errorCode, retryable });
  if (updated && updated.status === 'failed') {
    for (const target of job.targets || []) {
      await modelForKind(target.kind).updateOne(
        { _id: target.id, 'proof.key': job.proofKey },
        { $set: { 'serverOcr.status': 'failed', 'serverOcr.errorCode': errorCode, 'serverOcr.completedAt': new Date() } }
      ).catch(() => {});
      await modelForKind(target.kind).updateOne(
        { _id: target.id, 'validation.reviewReason': 'server_ocr_pending' },
        { $set: { 'validation.reviewReason': 'server_ocr_failed' } }
      ).catch(() => {});
    }
  }
}

/** Admin "reprocess": a new revision for the entry's current proof. */
async function queueReprocess({ kind, entryId, requestedBy, profileOverride = '' }) {
  const Model = modelForKind(kind);
  if (!mongoose.isValidObjectId(entryId)) return null;
  const entry = await Model.findById(entryId).select('proof runnerId').lean();
  if (!entry?.proof?.key) return null;
  return jobs.enqueueExtraction({
    proofKey: entry.proof.key,
    proofHash: String(entry.proof.hash || ''),
    runnerId: entry.runnerId || null,
    targets: [{ kind, id: entry._id }],
    priority: 20,
    reason: 'reprocess',
    profileOverride,
    requestedBy,
    idempotencyKey: `reprocess:${kind}:${String(entry._id)}:${Date.now()}`
  });
}

module.exports = {
  PERMANENT_ERROR_CODES,
  queueProofExtraction,
  processExtractionJob,
  buildAutoApprovalProjection,
  buildExtractionDocument,
  toServerOcrData,
  queueReprocess
};
