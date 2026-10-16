'use strict';

/**
 * OCR benchmark metrics (docs/improvement-plan/ocr-platform-aware/06-TESTING-AND-RESEARCH.md).
 *
 * Pure functions only: no engine, no DB, no filesystem. Every rate returns the
 * string 'N/A' when its denominator is zero so a report can never imply an
 * accuracy figure that was not measured.
 */

const NOT_AVAILABLE = 'N/A';

// Canonical normalisation rules. Changing any of these changes every score, so
// the version is written into each report.
const METRIC_RULES_VERSION = 'ocr-metrics-v1';
const DISTANCE_TOLERANCE_KM = 0.01;
const TIME_TOLERANCE_MS = 1000;

const SCORED_FIELDS = Object.freeze(['platform', 'distanceKm', 'elapsedMs', 'runDate', 'runType']);
const REQUIRED_FIELDS = Object.freeze(['distanceKm', 'elapsedMs']);

function levenshtein(a, b) {
  const source = Array.from(String(a ?? ''));
  const target = Array.from(String(b ?? ''));
  if (!source.length) return target.length;
  if (!target.length) return source.length;

  let previous = Array.from({ length: target.length + 1 }, (_, index) => index);
  for (let i = 1; i <= source.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= target.length; j += 1) {
      const substitution = previous[j - 1] + (source[i - 1] === target[j - 1] ? 0 : 1);
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, substitution);
    }
    previous = current;
  }
  return previous[target.length];
}

/**
 * Character error rate against a literal reference transcription.
 * Returns null when the reference is empty (not evaluable).
 */
function characterErrorRate(hypothesis, reference) {
  const ref = String(reference ?? '');
  if (!ref.length) return null;
  return levenshtein(hypothesis, ref) / Array.from(ref).length;
}

function toFinite(value) {
  if (value === undefined || value === null || value === '') return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function normaliseText(value) {
  const text = String(value ?? '').trim().toLowerCase();
  return text || null;
}

/** Map the browser parser result onto the scored field vocabulary. */
function predictionFromParsed(parsed = {}) {
  return {
    platform: normaliseText(parsed.detectedSource),
    distanceKm: toFinite(parsed.distance?.valueKm),
    elapsedMs: toFinite(parsed.time?.totalMs),
    runDate: normaliseText(parsed.date),
    runType: normaliseText(parsed.runType)
  };
}

/**
 * Compare one field. Returns null when the label does not define the field
 * (not evaluable), otherwise true/false.
 */
function fieldMatches(field, predicted, expected) {
  if (expected === undefined || expected === null || expected === '') return null;
  if (field === 'distanceKm') {
    const p = toFinite(predicted);
    const e = toFinite(expected);
    if (e === null) return null;
    return p !== null && Math.abs(p - e) <= DISTANCE_TOLERANCE_KM + 1e-9;
  }
  if (field === 'elapsedMs') {
    const p = toFinite(predicted);
    const e = toFinite(expected);
    if (e === null) return null;
    return p !== null && Math.abs(p - e) < TIME_TOLERANCE_MS;
  }
  return normaliseText(predicted) === normaliseText(expected);
}

function rate(numerator, denominator) {
  if (!denominator) return NOT_AVAILABLE;
  return Number((numerator / denominator).toFixed(4));
}

function percentile(sortedValues, fraction) {
  if (!sortedValues.length) return NOT_AVAILABLE;
  const index = Math.min(sortedValues.length - 1, Math.ceil(fraction * sortedValues.length) - 1);
  return sortedValues[Math.max(0, index)];
}

function emptyBucket() {
  const fields = {};
  for (const field of SCORED_FIELDS) fields[field] = { evaluable: 0, correct: 0 };
  return {
    samples: 0,
    errors: 0,
    fields,
    required: { applicable: 0, extracted: 0 },
    cer: { lines: 0, editDistance: 0, referenceChars: 0 },
    latencies: []
  };
}

function addToBucket(bucket, result) {
  bucket.samples += 1;
  if (result.errorCode) bucket.errors += 1;
  if (toFinite(result.elapsedMsProcessing) !== null) bucket.latencies.push(Number(result.elapsedMsProcessing));

  const label = result.label || {};
  const prediction = result.prediction || {};
  for (const field of SCORED_FIELDS) {
    const outcome = fieldMatches(field, prediction[field], label[field]);
    if (outcome === null) continue;
    bucket.fields[field].evaluable += 1;
    if (outcome) bucket.fields[field].correct += 1;
  }
  for (const field of REQUIRED_FIELDS) {
    if (label[field] === undefined || label[field] === null || label[field] === '') continue;
    bucket.required.applicable += 1;
    if (prediction[field] !== null && prediction[field] !== undefined) bucket.required.extracted += 1;
  }
  for (const line of Array.isArray(label.lines) ? label.lines : []) {
    const reference = String(line?.text ?? '');
    if (!reference) continue;
    const hypothesis = String(result.lineHypotheses?.[line.id] ?? '');
    bucket.cer.lines += 1;
    bucket.cer.editDistance += levenshtein(hypothesis, reference);
    bucket.cer.referenceChars += Array.from(reference).length;
  }
}

function summariseBucket(bucket) {
  const sorted = [...bucket.latencies].sort((a, b) => a - b);
  const fields = {};
  for (const field of SCORED_FIELDS) {
    const { evaluable, correct } = bucket.fields[field];
    fields[field] = { evaluable, correct, exactAccuracy: rate(correct, evaluable) };
  }
  return {
    samples: bucket.samples,
    errors: bucket.errors,
    fields,
    requiredFieldCompleteness: rate(bucket.required.extracted, bucket.required.applicable),
    cer: {
      lines: bucket.cer.lines,
      value: rate(bucket.cer.editDistance, bucket.cer.referenceChars)
    },
    latencyMs: {
      count: sorted.length,
      median: percentile(sorted, 0.5),
      p95: percentile(sorted, 0.95)
    }
  };
}

/**
 * @param {Array<{ id, platform, layout, label, prediction, lineHypotheses?, elapsedMsProcessing?, errorCode? }>} results
 */
function scoreBenchmark(results = []) {
  const overall = emptyBucket();
  const byPlatformLayout = new Map();

  for (const result of results) {
    addToBucket(overall, result);
    const key = `${result.platform || 'unlabeled'}/${result.layout || 'unlabeled'}`;
    if (!byPlatformLayout.has(key)) byPlatformLayout.set(key, emptyBucket());
    addToBucket(byPlatformLayout.get(key), result);
  }

  const groups = {};
  for (const [key, bucket] of [...byPlatformLayout.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    groups[key] = summariseBucket(bucket);
  }

  return {
    metricRulesVersion: METRIC_RULES_VERSION,
    tolerances: { distanceKm: DISTANCE_TOLERANCE_KM, elapsedMs: TIME_TOLERANCE_MS },
    overall: summariseBucket(overall),
    byPlatformLayout: groups
  };
}

module.exports = {
  NOT_AVAILABLE,
  METRIC_RULES_VERSION,
  SCORED_FIELDS,
  REQUIRED_FIELDS,
  levenshtein,
  characterErrorRate,
  predictionFromParsed,
  fieldMatches,
  scoreBenchmark
};
