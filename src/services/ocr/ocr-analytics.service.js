'use strict';

const crypto = require('node:crypto');
const OcrExtraction = require('../../models/OcrExtraction');
const OcrJob = require('../../models/OcrJob');
const OcrProductEvent = require('../../models/OcrProductEvent');
const TrainingJob = require('../../models/TrainingJob');
const TrainingSample = require('../../models/TrainingSample');
const OcrModelVersion = require('../../models/OcrModelVersion');
const Submission = require('../../models/Submission');
const AccumulatedActivitySubmission = require('../../models/AccumulatedActivitySubmission');
const { levenshtein, NOT_AVAILABLE, METRIC_RULES_VERSION } = require('../../utils/ocr/benchmark-metrics');

const DAY_MS = 24 * 60 * 60 * 1000;
const ROW_LIMIT = 20000;
const ALLOWED_WINDOWS = Object.freeze([7, 30, 90, 365]);
const CORRECTABLE_FIELDS = new Set(['distanceKm', 'elapsedMs', 'runDate', 'runType', 'elevationGain', 'steps', 'runLocation']);
const OCR_FIELD_KEYS = Object.freeze([
  ['distance', 'extractedDistanceKm'], ['duration', 'extractedTimeMs'], ['date', 'extractedRunDate'],
  ['type', 'extractedRunType'], ['elevation', 'extractedElevationGain'], ['steps', 'extractedSteps'],
  ['location', 'extractedRunLocation'], ['name', 'extractedName']
]);

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

async function boundedFind(Model, filter, fields, sort = { createdAt: -1 }) {
  const found = await Model.find(filter).select(fields).sort(sort).limit(ROW_LIMIT + 1).lean();
  return { rows: found.slice(0, ROW_LIMIT), truncated: found.length > ROW_LIMIT };
}

function hasBrowserOcr(row) {
  const value = row?.ocrData || {};
  return row?.validation?.method === 'ocr' || Number(value.confidence || 0) > 0 || OCR_FIELD_KEYS.some(([, key]) => {
    const field = value[key];
    return field !== null && field !== undefined && String(field).trim() !== '';
  });
}

function correctionFields(row) {
  const fields = new Set();
  for (const correction of row.organizerCorrections || []) {
    for (const change of correction.changes || []) {
      if (CORRECTABLE_FIELDS.has(change.field)) fields.add(change.field);
    }
  }
  return fields;
}

async function extractionStats(since) {
  const result = await boundedFind(
    OcrExtraction,
    { createdAt: { $gte: since }, source: { $ne: 'admin_test' } },
    'detection.platform detection.status status elapsedMs modelVersionId profile.version layout.id createdAt'
  );
  const groups = new Map();
  for (const row of result.rows) {
    const key = row.detection?.platform || 'unknown';
    if (!groups.has(key)) groups.set(key, {
      platform: key, total: 0, complete: 0, partial: 0, failed: 0,
      confirmed: 0, uncertain: 0, unknown: 0, latencies: []
    });
    const group = groups.get(key);
    group.total += 1;
    group[row.status] = (group[row.status] || 0) + 1;
    const detection = row.detection?.status || 'unknown';
    group[detection] = (group[detection] || 0) + 1;
    if (Number.isFinite(row.elapsedMs)) group.latencies.push(row.elapsedMs);
  }
  return {
    rows: [...groups.values()].map((group) => ({
      platform: group.platform,
      total: group.total,
      complete: group.complete,
      partial: group.partial,
      failed: group.failed,
      completeRate: rate(group.complete, group.total),
      failedRate: rate(group.failed, group.total),
      confirmed: group.confirmed,
      uncertain: group.uncertain,
      unknown: group.unknown,
      latencyMedianMs: percentile(group.latencies, 0.5),
      latencyP95Ms: percentile(group.latencies, 0.95)
    })).sort((a, b) => b.total - a.total),
    observed: result.rows.length,
    truncated: result.truncated
  };
}

async function loadEntryRows(since) {
  const fields = [
    'createdAt submittedAt status reviewedBy reviewedAt proof.key',
    'ocrData.detectedSource ocrData.confidence ocrData.extractedDistanceKm ocrData.extractedTimeMs',
    'ocrData.extractedRunDate ocrData.extractedRunType ocrData.extractedElevationGain',
    'ocrData.extractedSteps ocrData.extractedRunLocation ocrData.extractedName',
    'ocrData.distanceMismatch ocrData.timeMismatch ocrData.dateMismatch ocrData.runTypeMismatch',
    'ocrData.elevationMismatch ocrData.stepsMismatch ocrData.locationMismatch',
    'validation.method organizerCorrections ocrTrainingConsent',
    'serverOcr.platform serverOcr.status serverOcr.proofKey serverOcr.completedAt serverOcr.decision',
    'serverOcr.autoApproval.distanceMismatch serverOcr.autoApproval.timeMismatch',
    'serverOcr.autoApproval.dateMismatch serverOcr.autoApproval.runTypeMismatch',
    'serverOcr.autoApproval.elevationMismatch serverOcr.autoApproval.stepsMismatch',
    'serverOcr.autoApproval.locationMismatch'
  ].join(' ');
  const results = await Promise.all([Submission, AccumulatedActivitySubmission].map((Model) => (
    boundedFind(Model, { submittedAt: { $gte: since } }, fields, { submittedAt: -1 })
  )));
  return {
    rows: results.flatMap((result) => result.rows),
    truncated: results.some((result) => result.truncated)
  };
}

function browserOcrStats(rows) {
  const groups = new Map();
  for (const row of rows.filter(hasBrowserOcr)) {
    const key = row.ocrData?.detectedSource || 'unknown';
    if (!groups.has(key)) groups.set(key, {
      platform: key, submissions: 0, low: 0, medium: 0, high: 0,
      mismatches: 0, reviewed: 0, corrected: 0, autoApprovedLegacy: 0,
      reviewMinutes: [], fields: Object.fromEntries(OCR_FIELD_KEYS.map(([field]) => [field, 0]))
    });
    const group = groups.get(key);
    group.submissions += 1;
    const confidence = Number(row.ocrData?.confidence || 0);
    if (confidence >= 0.9) group.high += 1;
    else if (confidence >= 0.7) group.medium += 1;
    else group.low += 1;
    for (const [field, keyName] of OCR_FIELD_KEYS) {
      const value = row.ocrData?.[keyName];
      if (value !== null && value !== undefined && String(value).trim() !== '') group.fields[field] += 1;
    }
    if (['distanceMismatch', 'timeMismatch', 'elevationMismatch', 'stepsMismatch', 'dateMismatch', 'locationMismatch', 'runTypeMismatch']
      .some((field) => row.ocrData?.[field])) group.mismatches += 1;
    if (row.reviewedBy && row.reviewedAt) {
      group.reviewed += 1;
      if (correctionFields(row).size) group.corrected += 1;
      if (row.submittedAt) group.reviewMinutes.push((new Date(row.reviewedAt) - new Date(row.submittedAt)) / 60000);
    }
    if (row.status === 'approved' && !row.reviewedBy && row.validation?.method === 'ocr' && row.serverOcr?.status !== 'complete') {
      group.autoApprovedLegacy += 1;
    }
  }
  return [...groups.values()].map((group) => ({
    platform: group.platform,
    submissions: group.submissions,
    confidenceBands: { low: group.low, medium: group.medium, high: group.high },
    fieldCompleteness: Object.fromEntries(Object.entries(group.fields).map(([field, count]) => [field, rate(count, group.submissions)])),
    mismatchRate: rate(group.mismatches, group.submissions),
    reviewedManually: group.reviewed,
    correctionRate: rate(group.corrected, group.reviewed),
    autoApprovedLegacy: group.autoApprovedLegacy,
    reviewMinutesMedian: percentile(group.reviewMinutes, 0.5),
    reviewMinutesP95: percentile(group.reviewMinutes, 0.95)
  })).sort((a, b) => b.submissions - a.submissions);
}

function entryStats(rows) {
  const groups = new Map();
  for (const row of rows.filter((entry) => entry.serverOcr?.status)) {
    const key = row.serverOcr?.platform || 'unknown';
    if (!groups.has(key)) groups.set(key, {
      platform: key, readings: 0, complete: 0, partial: 0, failed: 0,
      staleProof: 0, disagreements: 0, reviewed: 0, corrected: 0,
      autoApproved: 0, correctionFields: {}, reviewMinutes: []
    });
    const group = groups.get(key);
    group.readings += 1;
    const currentProof = String(row.serverOcr.proofKey || '') === String(row.proof?.key || '');
    if (!currentProof) group.staleProof += 1;
    else group[row.serverOcr.status] = (group[row.serverOcr.status] || 0) + 1;
    const auto = row.serverOcr.autoApproval || {};
    if (currentProof && ['distanceMismatch', 'timeMismatch', 'dateMismatch', 'runTypeMismatch', 'elevationMismatch', 'stepsMismatch', 'locationMismatch']
      .some((field) => auto[field])) group.disagreements += 1;
    if (row.reviewedBy && row.reviewedAt) {
      group.reviewed += 1;
      const changed = correctionFields(row);
      if (changed.size) group.corrected += 1;
      for (const field of changed) group.correctionFields[field] = (group.correctionFields[field] || 0) + 1;
      if (row.submittedAt) group.reviewMinutes.push((new Date(row.reviewedAt) - new Date(row.submittedAt)) / 60000);
    }
    if (row.status === 'approved' && !row.reviewedBy && row.validation?.method === 'ocr'
      && row.serverOcr.status === 'complete' && row.serverOcr.decision === 'auto_approved' && currentProof) {
      group.autoApproved += 1;
    }
  }
  return [...groups.values()].map((group) => ({
    platform: group.platform,
    readings: group.readings,
    complete: group.complete,
    partial: group.partial,
    failed: group.failed,
    staleProof: group.staleProof,
    disagreementRate: rate(group.disagreements, group.complete),
    reviewedManually: group.reviewed,
    correctionRate: rate(group.corrected, group.reviewed),
    correctionsByField: group.correctionFields,
    autoApproved: group.autoApproved,
    reviewMinutesMedian: percentile(group.reviewMinutes, 0.5),
    reviewMinutesP95: percentile(group.reviewMinutes, 0.95)
  })).sort((a, b) => b.readings - a.readings);
}

async function groundTruthStats(since) {
  const result = await boundedFind(
    TrainingSample,
    { status: 'approved', reviewedAt: { $gte: since }, transcribedText: { $gt: '' } },
    'verifiedPlatform verifiedLayoutId fieldKey ocrPass ocrErrorCode ocrText transcribedText reviewedAt',
    { reviewedAt: -1 }
  );
  const groups = new Map();
  for (const row of result.rows) {
    const platform = row.verifiedPlatform || 'unknown';
    const layoutId = row.verifiedLayoutId || 'unknown';
    const ocrPass = row.ocrPass || 'unknown';
    const errorCode = row.ocrErrorCode || 'none';
    const key = `${platform}|${layoutId}|${row.fieldKey || ''}|${ocrPass}|${errorCode}`;
    if (!groups.has(key)) groups.set(key, { platform, layoutId, fieldKey: row.fieldKey || '', ocrPass, errorCode, lines: 0, edits: 0, chars: 0, exact: 0 });
    const group = groups.get(key);
    const reference = String(row.transcribedText).trim();
    const hypothesis = String(row.ocrText || '').trim();
    group.lines += 1;
    group.edits += levenshtein(hypothesis, reference);
    group.chars += Array.from(reference).length;
    if (hypothesis === reference) group.exact += 1;
  }
  return {
    rows: [...groups.values()].map((group) => ({
      platform: group.platform,
      layoutId: group.layoutId,
      fieldKey: group.fieldKey,
      ocrPass: group.ocrPass,
      errorCode: group.errorCode,
      lines: group.lines,
      cer: rate(group.edits, group.chars),
      exactLineAccuracy: rate(group.exact, group.lines)
    })).sort((a, b) => b.lines - a.lines),
    observed: result.rows.length,
    truncated: result.truncated
  };
}

async function jobStats(since, now) {
  const result = await boundedFind(OcrJob, { createdAt: { $gte: since } }, 'status errorCode elapsedMs createdAt startedAt finishedAt');
  const byStatus = {};
  const failures = {};
  const latencies = [];
  let timedOut = 0;
  let stuck = 0;
  for (const job of result.rows) {
    byStatus[job.status] = (byStatus[job.status] || 0) + 1;
    const queueToCompletionMs = job.createdAt && job.finishedAt
      ? new Date(job.finishedAt) - new Date(job.createdAt)
      : Number(job.elapsedMs);
    if (Number.isFinite(queueToCompletionMs) && queueToCompletionMs >= 0) latencies.push(queueToCompletionMs);
    if (job.status === 'failed') {
      const code = job.errorCode || 'unknown';
      failures[code] = (failures[code] || 0) + 1;
      if (/timeout/i.test(code)) timedOut += 1;
    }
    if (['queued', 'running'].includes(job.status) && now - new Date(job.createdAt) > 2 * 60 * 1000) stuck += 1;
  }
  const training = await TrainingJob.find({ createdAt: { $gte: since } }).sort({ createdAt: -1 }).limit(20)
    .select('status createdAt finishedAt resources errorCode datasetManifestHash').lean();
  return {
    extractionByStatus: byStatus,
    extractionFailures: Object.entries(failures).map(([errorCode, count]) => ({ errorCode, count })).sort((a, b) => b.count - a.count),
    total: result.rows.length,
    failed: byStatus.failed || 0,
    timedOut,
    stuck,
    failureRate: rate(byStatus.failed || 0, result.rows.length),
    latencyMedianMs: percentile(latencies, 0.5),
    latencyP95Ms: percentile(latencies, 0.95),
    truncated: result.truncated,
    training
  };
}

async function funnelStats(since) {
  const result = await boundedFind(OcrProductEvent, { occurredAt: { $gte: since } }, 'event detectedPlatform resultStatus latencyMs occurredAt', { occurredAt: -1 });
  const events = {};
  const platforms = {};
  const completionTimes = [];
  for (const row of result.rows) {
    events[row.event] = (events[row.event] || 0) + 1;
    platforms[row.detectedPlatform || 'unknown'] = (platforms[row.detectedPlatform || 'unknown'] || 0) + 1;
    if (row.event === 'flow_completed' && Number.isFinite(row.latencyMs)) completionTimes.push(row.latencyMs);
  }
  return {
    events,
    platforms,
    observed: result.rows.length,
    truncated: result.truncated,
    completionRate: rate(events.submission_succeeded || 0, events.modal_opened || 0),
    analysisFailureRate: rate(events.analysis_failed || 0, events.analysis_started || 0),
    consentGrantRate: rate(events.consent_granted || 0, events.consent_shown || 0),
    completionTimeMedianMs: percentile(completionTimes, 0.5),
    completionTimeP95Ms: percentile(completionTimes, 0.95)
  };
}

function consentStats(rows) {
  const shown = rows.filter((row) => row.ocrTrainingConsent !== undefined && row.ocrTrainingConsent !== null).length;
  const granted = rows.filter((row) => row.ocrTrainingConsent?.granted && !row.ocrTrainingConsent?.withdrawnAt).length;
  const withdrawn = rows.filter((row) => row.ocrTrainingConsent?.withdrawnAt).length;
  return { shown, granted, withdrawn, grantRate: rate(granted, shown) };
}

async function getOcrAnalytics({ days } = {}, { now = new Date() } = {}) {
  const span = windowDays(days);
  const since = new Date(now.getTime() - span * DAY_MS);
  const [extractions, entryResult, groundTruthResult, jobs, funnel, models] = await Promise.all([
    extractionStats(since),
    loadEntryRows(since),
    groundTruthStats(since),
    jobStats(since, now),
    funnelStats(since),
    OcrModelVersion.find({ 'evaluation.evaluatedAt': { $ne: null } }).sort({ createdAt: -1 }).limit(10)
      .select('label status datasetManifestHash evaluation.testSampleCount evaluation.overall evaluation.byPlatformLayout createdAt').lean()
  ]);
  const browserOcr = browserOcrStats(entryResult.rows);
  const entries = entryStats(entryResult.rows);
  const consent = consentStats(entryResult.rows);
  const coverage = {
    submissionsObserved: entryResult.rows.length,
    browserOcrObserved: browserOcr.reduce((sum, row) => sum + row.submissions, 0),
    serverOcrObserved: entries.reduce((sum, row) => sum + row.readings, 0),
    extractionsObserved: extractions.observed,
    jobsObserved: jobs.total,
    reviewedObserved: entryResult.rows.filter((row) => Boolean(row.reviewedBy && row.reviewedAt)).length,
    trainingLinesObserved: groundTruthResult.observed,
    telemetryEventsObserved: funnel.observed,
    submissionsTruncated: entryResult.truncated,
    extractionsTruncated: extractions.truncated,
    jobsTruncated: jobs.truncated,
    trainingLinesTruncated: groundTruthResult.truncated,
    telemetryEventsTruncated: funnel.truncated
  };
  return {
    windowDays: span, since, generatedAt: now, metricRulesVersion: METRIC_RULES_VERSION,
    coverage, extraction: extractions.rows, browserOcr, entries,
    groundTruth: groundTruthResult.rows, jobs, consent, funnel, models
  };
}

function csvCell(value) {
  let text = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function formatResearchExportCsv(analytics, experimentId) {
  const experiment = String(experimentId || 'unspecified').replace(/[^A-Za-z0-9_.-]/g, '').slice(0, 60) || 'unspecified';
  const header = ['experiment_id', 'generated_at', 'window_days', 'metric_rules_version', 'section', 'platform', 'segment', 'n', 'metric', 'value'];
  const rows = [header];
  const push = (section, platform, segment, n, metric, value) => rows.push([
    experiment, analytics.generatedAt.toISOString(), analytics.windowDays,
    analytics.metricRulesVersion, section, platform, segment, n, metric, value
  ]);

  for (const [metric, value] of Object.entries(analytics.coverage)) {
    push('coverage', 'all', '', analytics.coverage.submissionsObserved, metric.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`), value);
  }
  for (const row of analytics.browserOcr) {
    push('browser_ocr', row.platform, 'confidence_low', row.submissions, 'count', row.confidenceBands.low);
    push('browser_ocr', row.platform, 'confidence_medium', row.submissions, 'count', row.confidenceBands.medium);
    push('browser_ocr', row.platform, 'confidence_high', row.submissions, 'count', row.confidenceBands.high);
    push('browser_ocr', row.platform, '', row.submissions, 'mismatch_rate', row.mismatchRate);
    push('browser_ocr', row.platform, '', row.submissions, 'legacy_auto_approval_count', row.autoApprovedLegacy);
    for (const [field, completeness] of Object.entries(row.fieldCompleteness)) {
      push('browser_ocr', row.platform, field, row.submissions, 'field_completeness', completeness);
    }
  }
  push('browser_ocr', 'all', '', analytics.coverage.browserOcrObserved, 'submission_count', analytics.coverage.browserOcrObserved);
  for (const row of analytics.extraction) {
    push('server_ocr', row.platform, '', row.total, 'complete_rate', row.completeRate);
    push('server_ocr', row.platform, '', row.total, 'partial_count', row.partial);
    push('server_ocr', row.platform, '', row.total, 'latency_median_ms', row.latencyMedianMs);
    push('server_ocr', row.platform, '', row.total, 'latency_p95_ms', row.latencyP95Ms);
  }
  push('server_ocr', 'all', 'jobs', analytics.jobs.total, 'failure_rate', analytics.jobs.failureRate);
  push('server_ocr', 'all', 'jobs', analytics.jobs.total, 'complete_count', analytics.jobs.extractionByStatus.completed || 0);
  push('server_ocr', 'all', 'jobs', analytics.jobs.total, 'failed_count', analytics.jobs.failed);
  push('server_ocr', 'all', 'jobs', analytics.jobs.total, 'timed_out_count', analytics.jobs.timedOut);
  push('server_ocr', 'all', 'jobs', analytics.jobs.total, 'stuck_count', analytics.jobs.stuck);
  push('server_ocr', 'all', 'jobs', analytics.jobs.total, 'queue_to_completion_median_ms', analytics.jobs.latencyMedianMs);
  push('server_ocr', 'all', 'jobs', analytics.jobs.total, 'queue_to_completion_p95_ms', analytics.jobs.latencyP95Ms);
  for (const row of analytics.entries) {
    push('server_ocr', row.platform, 'entry', row.readings, 'stale_proof_count', row.staleProof);
    push('server_ocr', row.platform, 'entry', row.readings, 'disagreement_rate', row.disagreementRate);
    push('review', row.platform, '', row.reviewedManually, 'correction_rate', row.correctionRate);
    push('review', row.platform, '', row.reviewedManually, 'ocr_auto_approval_count', row.autoApproved);
    push('review', row.platform, '', row.reviewedManually, 'review_minutes_median', row.reviewMinutesMedian);
    push('review', row.platform, '', row.reviewedManually, 'review_minutes_p95', row.reviewMinutesP95);
    for (const [field, count] of Object.entries(row.correctionsByField)) push('review', row.platform, field, row.reviewedManually, 'correction_count', count);
  }
  const serverEntryTotals = analytics.entries.reduce((totals, row) => ({
    complete: totals.complete + row.complete,
    partial: totals.partial + row.partial,
    failed: totals.failed + row.failed,
    staleProof: totals.staleProof + row.staleProof
  }), { complete: 0, partial: 0, failed: 0, staleProof: 0 });
  push('server_ocr', 'all', 'entries', analytics.coverage.serverOcrObserved, 'complete_count', serverEntryTotals.complete);
  push('server_ocr', 'all', 'entries', analytics.coverage.serverOcrObserved, 'partial_count', serverEntryTotals.partial);
  push('server_ocr', 'all', 'entries', analytics.coverage.serverOcrObserved, 'failed_count', serverEntryTotals.failed);
  push('server_ocr', 'all', 'entries', analytics.coverage.serverOcrObserved, 'stale_proof_count', serverEntryTotals.staleProof);
  push('review', 'all', '', analytics.coverage.reviewedObserved, 'reviewed_count', analytics.coverage.reviewedObserved);
  push('consent', 'all', '', analytics.consent.shown, 'shown_count', analytics.consent.shown);
  push('consent', 'all', '', analytics.consent.shown, 'granted_count', analytics.consent.granted);
  push('consent', 'all', '', analytics.consent.shown, 'withdrawn_count', analytics.consent.withdrawn);
  push('consent', 'all', '', analytics.consent.shown, 'grant_rate', analytics.consent.grantRate);
  for (const [event, count] of Object.entries(analytics.funnel.events)) push('funnel', 'all', event, analytics.funnel.observed, 'count', count);
  push('funnel', 'all', '', analytics.funnel.observed, 'completion_rate', analytics.funnel.completionRate);
  push('funnel', 'all', '', analytics.funnel.observed, 'analysis_failure_rate', analytics.funnel.analysisFailureRate);
  push('funnel', 'all', '', analytics.funnel.observed, 'completion_time_p95_ms', analytics.funnel.completionTimeP95Ms);
  for (const row of analytics.groundTruth) {
    const segment = `${row.fieldKey}|layout:${row.layoutId}|pass:${row.ocrPass}|error:${row.errorCode}`;
    push('ground_truth', row.platform, segment, row.lines, 'cer', row.cer);
    push('ground_truth', row.platform, segment, row.lines, 'exact_line_accuracy', row.exactLineAccuracy);
  }
  const shortHash = (value) => crypto.createHash('sha256').update(String(value)).digest('hex').slice(0, 12);
  for (const model of analytics.models) {
    const segment = `model:${shortHash(model._id)} dataset:${String(model.datasetManifestHash || '').slice(0, 12)}`;
    for (const [key, result] of Object.entries(model.evaluation?.byPlatformLayout || {})) {
      push('model_evaluation', key.split('/')[0], `${segment} layout:${key.split('/')[1] || ''}`, result.candidate?.lines, 'candidate_cer', result.candidate?.cer);
      push('model_evaluation', key.split('/')[0], `${segment} layout:${key.split('/')[1] || ''}`, result.baseline?.lines, 'baseline_cer', result.baseline?.cer);
    }
  }
  return rows.map((row) => row.map(csvCell).join(',')).join('\n') + '\n';
}

async function buildResearchExportCsv({ days, experimentId }, { now = new Date() } = {}) {
  const analytics = await getOcrAnalytics({ days }, { now });
  return formatResearchExportCsv(analytics, experimentId);
}

module.exports = {
  ALLOWED_WINDOWS,
  ROW_LIMIT,
  windowDays,
  rate,
  percentile,
  boundedFind,
  jobStats,
  browserOcrStats,
  entryStats,
  getOcrAnalytics,
  buildResearchExportCsv,
  formatResearchExportCsv,
  csvCell
};
