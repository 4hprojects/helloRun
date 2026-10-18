'use strict';

/**
 * OCR analytics and research export (Phase 5, doc 06).
 *
 * Every figure is computed from stored records; a rate without a denominator is 'N/A'.
 * Accuracy is only reported where reviewed ground truth exists (approved TrainingSample
 * lines: engine text vs literal transcription). Platform detection is reported as a
 * distribution, not as accuracy, because production entries carry no platform labels;
 * labelled accuracy comes from `npm run ocr:benchmark`.
 */

const OcrExtraction = require('../../models/OcrExtraction');
const OcrJob = require('../../models/OcrJob');
const TrainingJob = require('../../models/TrainingJob');
const TrainingSample = require('../../models/TrainingSample');
const OcrModelVersion = require('../../models/OcrModelVersion');
const Submission = require('../../models/Submission');
const AccumulatedActivitySubmission = require('../../models/AccumulatedActivitySubmission');
const { levenshtein, NOT_AVAILABLE, METRIC_RULES_VERSION } = require('../../utils/ocr/benchmark-metrics');

const DAY_MS = 24 * 60 * 60 * 1000;
const ALLOWED_WINDOWS = Object.freeze([7, 30, 90, 365]);

function windowDays(value) {
  const days = Number.parseInt(value, 10);
  return ALLOWED_WINDOWS.includes(days) ? days : 30;
}

function rate(numerator, denominator) {
  return denominator ? Number((numerator / denominator).toFixed(4)) : NOT_AVAILABLE;
}

function percentile(values, fraction) {
  if (!values.length) return NOT_AVAILABLE;
  const sorted = values.slice().sort((a, b) => a - b);
  return sorted[Math.max(0, Math.min(sorted.length - 1, Math.ceil(fraction * sorted.length) - 1))];
}

async function extractionStats(since) {
  const rows = await OcrExtraction.find({ createdAt: { $gte: since }, source: { $ne: 'admin_test' } })
    .select('detection.platform detection.status status elapsedMs modelVersionId profile.version layout.id')
    .limit(20000)
    .lean();
  const groups = new Map();
  for (const row of rows) {
    const key = row.detection?.platform || 'unknown';
    if (!groups.has(key)) groups.set(key, { platform: key, total: 0, complete: 0, partial: 0, failed: 0, confirmed: 0, uncertain: 0, unknown: 0, latencies: [] });
    const group = groups.get(key);
    group.total += 1;
    group[row.status] = (group[row.status] || 0) + 1;
    const detection = row.detection?.status || 'unknown';
    if (detection in group) group[detection] += 1;
    if (Number.isFinite(row.elapsedMs)) group.latencies.push(row.elapsedMs);
  }
  return [...groups.values()].map((group) => ({
    platform: group.platform,
    total: group.total,
    completeRate: rate(group.complete, group.total),
    failedRate: rate(group.failed, group.total),
    confirmed: group.confirmed,
    uncertain: group.uncertain,
    unknown: group.unknown,
    latencyMedianMs: percentile(group.latencies, 0.5),
    latencyP95Ms: percentile(group.latencies, 0.95)
  })).sort((a, b) => b.total - a.total);
}

async function entryStats(since) {
  const fields = 'serverOcr.platform serverOcr.status serverOcr.autoApproval.distanceMismatch serverOcr.autoApproval.timeMismatch status reviewedBy reviewedAt submittedAt organizerCorrections.changes.field';
  const rows = [];
  for (const Model of [Submission, AccumulatedActivitySubmission]) {
    rows.push(...await Model.find({ 'serverOcr.status': { $in: ['complete', 'partial', 'failed'] }, 'serverOcr.completedAt': { $gte: since } })
      .select(fields).limit(20000).lean());
  }
  const groups = new Map();
  for (const row of rows) {
    const key = row.serverOcr?.platform || 'unknown';
    if (!groups.has(key)) groups.set(key, { platform: key, readings: 0, disagreements: 0, reviewed: 0, corrected: 0, autoApproved: 0, reviewMinutes: [] });
    const group = groups.get(key);
    if (row.serverOcr?.status === 'complete') {
      group.readings += 1;
      if (row.serverOcr.autoApproval?.distanceMismatch || row.serverOcr.autoApproval?.timeMismatch) group.disagreements += 1;
    }
    if (['approved', 'rejected'].includes(row.status) && row.reviewedAt) {
      if (row.reviewedBy) {
        group.reviewed += 1;
        const changed = (row.organizerCorrections || []).some((correction) => (correction.changes || []).some((change) => ['distanceKm', 'elapsedMs'].includes(change.field)));
        if (changed) group.corrected += 1;
        if (row.submittedAt) group.reviewMinutes.push((new Date(row.reviewedAt) - new Date(row.submittedAt)) / 60000);
      } else if (row.status === 'approved') {
        group.autoApproved += 1;
      }
    }
  }
  return [...groups.values()].map((group) => ({
    platform: group.platform,
    readings: group.readings,
    disagreementRate: rate(group.disagreements, group.readings),
    reviewedManually: group.reviewed,
    correctionRate: rate(group.corrected, group.reviewed),
    autoApproved: group.autoApproved,
    reviewMinutesMedian: percentile(group.reviewMinutes, 0.5) === NOT_AVAILABLE ? NOT_AVAILABLE : Math.round(percentile(group.reviewMinutes, 0.5)),
    reviewMinutesP95: percentile(group.reviewMinutes, 0.95) === NOT_AVAILABLE ? NOT_AVAILABLE : Math.round(percentile(group.reviewMinutes, 0.95))
  })).sort((a, b) => b.readings - a.readings);
}

/** Production OCR on reviewed lines: engine text vs the literal transcription. */
async function groundTruthStats(since) {
  const rows = await TrainingSample.find({ status: 'approved', reviewedAt: { $gte: since }, transcribedText: { $gt: '' } })
    .select('platform layoutId fieldKey ocrText transcribedText modelVersionId')
    .limit(20000)
    .lean();
  const groups = new Map();
  for (const row of rows) {
    const key = `${row.platform || 'unknown'}|${row.fieldKey || ''}`;
    if (!groups.has(key)) groups.set(key, { platform: row.platform || 'unknown', fieldKey: row.fieldKey || '', lines: 0, edits: 0, chars: 0, exact: 0 });
    const group = groups.get(key);
    const reference = String(row.transcribedText).trim();
    const hypothesis = String(row.ocrText || '').trim();
    group.lines += 1;
    group.edits += levenshtein(hypothesis, reference);
    group.chars += Array.from(reference).length;
    if (hypothesis === reference) group.exact += 1;
  }
  return [...groups.values()].map((group) => ({
    platform: group.platform,
    fieldKey: group.fieldKey,
    lines: group.lines,
    cer: rate(group.edits, group.chars),
    exactLineAccuracy: rate(group.exact, group.lines)
  })).sort((a, b) => b.lines - a.lines);
}

async function jobStats(since) {
  const failures = await OcrJob.aggregate([
    { $match: { createdAt: { $gte: since }, status: 'failed' } },
    { $group: { _id: '$errorCode', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
  const totals = await OcrJob.aggregate([{ $match: { createdAt: { $gte: since } } }, { $group: { _id: '$status', count: { $sum: 1 } } }]);
  const training = await TrainingJob.find({ createdAt: { $gte: since } }).sort({ createdAt: -1 }).limit(20)
    .select('status createdAt finishedAt resources errorCode datasetManifestHash').lean();
  return {
    extractionByStatus: Object.fromEntries(totals.map((row) => [row._id, row.count])),
    extractionFailures: failures.map((row) => ({ errorCode: row._id || 'unknown', count: row.count })),
    training
  };
}

async function getOcrAnalytics({ days } = {}, { now = new Date() } = {}) {
  const span = windowDays(days);
  const since = new Date(now.getTime() - span * DAY_MS);
  const [extraction, entries, groundTruth, jobs, models] = await Promise.all([
    extractionStats(since),
    entryStats(since),
    groundTruthStats(since),
    jobStats(since),
    OcrModelVersion.find({ 'evaluation.evaluatedAt': { $ne: null } }).sort({ createdAt: -1 }).limit(10)
      .select('label status datasetManifestHash evaluation.testSampleCount evaluation.overall evaluation.byPlatformLayout createdAt').lean()
  ]);
  return { windowDays: span, since, generatedAt: now, metricRulesVersion: METRIC_RULES_VERSION, extraction, entries, groundTruth, jobs, models };
}

function csvCell(value) {
  let text = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * Privacy-minimised research export: aggregates only — no user, entry, event, URL, name,
 * location or image identifiers. Model and dataset ids are replaced by short hashes.
 */
async function buildResearchExportCsv({ days, experimentId }, { now = new Date() } = {}) {
  const analytics = await getOcrAnalytics({ days }, { now });
  const experiment = String(experimentId || 'unspecified').replace(/[^A-Za-z0-9_.-]/g, '').slice(0, 60) || 'unspecified';
  const header = ['experiment_id', 'generated_at', 'window_days', 'metric_rules_version', 'section', 'platform', 'segment', 'n', 'metric', 'value'];
  const rows = [header];
  const push = (section, platform, segment, n, metric, value) => rows.push([experiment, analytics.generatedAt.toISOString(), analytics.windowDays, analytics.metricRulesVersion, section, platform, segment, n, metric, value]);
  for (const row of analytics.extraction) {
    push('extraction', row.platform, '', row.total, 'complete_rate', row.completeRate);
    push('extraction', row.platform, '', row.total, 'failed_rate', row.failedRate);
    push('extraction', row.platform, '', row.total, 'latency_median_ms', row.latencyMedianMs);
    push('extraction', row.platform, '', row.total, 'latency_p95_ms', row.latencyP95Ms);
    push('detection', row.platform, 'confirmed', row.total, 'count', row.confirmed);
    push('detection', row.platform, 'uncertain', row.total, 'count', row.uncertain);
  }
  for (const row of analytics.entries) {
    push('verification', row.platform, '', row.readings, 'server_vs_entry_disagreement_rate', row.disagreementRate);
    push('review', row.platform, '', row.reviewedManually, 'correction_rate', row.correctionRate);
    push('review', row.platform, '', row.reviewedManually, 'review_minutes_median', row.reviewMinutesMedian);
    push('review', row.platform, '', row.reviewedManually, 'review_minutes_p95', row.reviewMinutesP95);
  }
  for (const row of analytics.groundTruth) {
    push('ground_truth', row.platform, row.fieldKey, row.lines, 'cer', row.cer);
    push('ground_truth', row.platform, row.fieldKey, row.lines, 'exact_line_accuracy', row.exactLineAccuracy);
  }
  const shortHash = (value) => require('node:crypto').createHash('sha256').update(String(value)).digest('hex').slice(0, 12);
  for (const model of analytics.models) {
    const segment = `model:${shortHash(model._id)} dataset:${String(model.datasetManifestHash || '').slice(0, 12)}`;
    for (const [key, result] of Object.entries(model.evaluation?.byPlatformLayout || {})) {
      push('model_evaluation', key.split('/')[0], `${segment} layout:${key.split('/')[1] || ''}`, result.candidate?.lines, 'candidate_cer', result.candidate?.cer);
      push('model_evaluation', key.split('/')[0], `${segment} layout:${key.split('/')[1] || ''}`, result.baseline?.lines, 'baseline_cer', result.baseline?.cer);
    }
  }
  return rows.map((row) => row.map(csvCell).join(',')).join('\n') + '\n';
}

module.exports = {
  ALLOWED_WINDOWS,
  windowDays,
  getOcrAnalytics,
  buildResearchExportCsv,
  csvCell
};
