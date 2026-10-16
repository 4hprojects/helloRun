'use strict';

/**
 * Server OCR pipeline (doc 02 component 3, doc 07 "Image processing pipeline").
 *
 *   validate -> working copies -> OCR passes -> shared parser -> platform
 *   detection -> profile rules -> field location -> validation flags
 *
 * Field parsing reuses the browser parser (src/public/js/ocr-proof-reader.js)
 * so there is one set of extraction rules. The pipeline has no database or
 * storage side effects; callers decide what to persist. The engine is
 * injectable for DB-free tests.
 */

const { loadBrowserOcrParser } = require('../../utils/ocr/browser-parser-loader');
const { getOcrLimits } = require('./ocr-config');
const { getProfile, GENERIC_PROFILE_ID } = require('./ocr-profiles');
const { detectPlatform } = require('./platform-detector');
const {
  OcrImageError,
  inspectImage,
  shouldRunPass,
  buildPass,
  toOriginalBox,
  computeDifferenceHash
} = require('./ocr-preprocess');

const PIPELINE_VERSION = 'server-ocr-p1.1';
const RAW_TEXT_LIMIT = 4000;
const FIELD_KEYS = Object.freeze(['distance', 'time', 'pace', 'date', 'runType', 'elevationGain', 'steps', 'name', 'location']);

let cachedParser = null;
function getParser() {
  if (!cachedParser) cachedParser = loadBrowserOcrParser();
  return cachedParser;
}

function scoreParsed(parsed) {
  let score = 0;
  if (parsed.distance) score += 0.4;
  if (parsed.time) score += 0.4;
  if (parsed.date) score += 0.1;
  if (parsed.pace) score += 0.1;
  return score;
}

function formatClock(totalMs) {
  const totalSeconds = Math.round(Number(totalMs) / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  return hours > 0 ? [`${hours}:${mm}:${ss}`, `${hours}h ${minutes}m`] : [`${minutes}:${ss}`, `${minutes}m ${seconds}s`];
}

/** Strings that would appear on the screen line holding each parsed value. */
function fieldNeedles(field, value) {
  if (!value) return [];
  if (field === 'distance') {
    const shown = String(value.value);
    const fixed = Number(value.value).toFixed(2);
    return [...new Set([shown, fixed, shown.replace('.', ','), fixed.replace('.', ',')])];
  }
  if (field === 'time') return formatClock(value.totalMs);
  if (field === 'pace') return [`${value.minutes}:${String(value.seconds).padStart(2, '0')}`];
  return [];
}

function normaliseLine(text) {
  return String(text || '').replace(/\s+/g, ' ').replace(/(\d)\s+([.,:])\s*(\d)/g, '$1$2$3').toLowerCase();
}

/** Find the OCR line most likely holding a field; heuristic, recorded as such. */
function locateField(field, value, passResults) {
  const needles = fieldNeedles(field, value).map((needle) => needle.toLowerCase());
  if (!needles.length) return null;
  let best = null;
  for (const pass of passResults) {
    for (const line of pass.recognition.lines) {
      const text = normaliseLine(line.text);
      if (!needles.some((needle) => text.includes(needle))) continue;
      if (!best || line.confidence > best.line.confidence) best = { line, pass };
    }
  }
  if (!best) return null;
  return {
    rawText: best.line.text.slice(0, 200),
    confidence: Number((best.line.confidence / 100).toFixed(3)),
    boundingBox: toOriginalBox(best.line.bbox, best.pass),
    sourcePass: best.pass.name,
    locator: 'line-value-match-v1'
  };
}

function detectTimeKind(rawText, profile) {
  const labels = profile.timeLabels || {};
  const moving = labels.moving && labels.moving.test(rawText);
  const elapsed = labels.elapsed && labels.elapsed.test(rawText);
  if (moving && !elapsed) return 'moving';
  if (elapsed && !moving) return 'elapsed';
  if (moving && elapsed) return 'ambiguous';
  return 'unknown';
}

function buildValidationFlags({ fields, detection, info }) {
  const flags = [];
  if (!fields.distance.value) flags.push('distance_missing');
  if (!fields.time.value) flags.push('time_missing');
  if (detection.status !== 'confirmed') flags.push('platform_uncertain');
  if (detection.urlProviderMismatch) flags.push('url_provider_mismatch');
  if (fields.time.kind === 'ambiguous') flags.push('time_kind_ambiguous');

  const distanceKm = fields.distance.value?.valueKm;
  const totalMs = fields.time.value?.totalMs;
  if (distanceKm > 0 && totalMs > 0) {
    const secondsPerKm = totalMs / 1000 / distanceKm;
    if (secondsPerKm < 120) flags.push('implausible_fast_pace');
    if (secondsPerKm > 30 * 60) flags.push('implausible_slow_pace');
    const pace = fields.pace.value;
    if (pace && pace.unit === '/km') {
      const statedSecondsPerKm = pace.minutes * 60 + pace.seconds;
      const tolerance = Math.max(statedSecondsPerKm * 0.08, 15);
      // Pace is usually computed from moving time; elapsed time may legitimately be slower.
      if (Math.abs(statedSecondsPerKm - secondsPerKm) > tolerance && fields.time.kind !== 'elapsed') {
        flags.push('pace_inconsistent');
      }
    }
  }
  if (info && Math.min(info.width, info.height) < 400) flags.push('low_resolution');
  return flags;
}

/**
 * @param {Buffer} buffer original image bytes
 * @param {{ engine: { recognize: Function }, profileOverride?: string,
 *           enabledProfileIds?: string[], urlProvider?: string, now?: Function, limits?: object }} options
 */
async function runOcrPipeline(buffer, options = {}) {
  const limits = options.limits || getOcrLimits();
  const now = options.now || (() => Date.now());
  const engine = options.engine;
  const started = now();
  const parser = getParser();

  let info;
  try {
    info = await inspectImage(buffer, limits);
  } catch (error) {
    return failedResult(error instanceof OcrImageError ? error.code : 'image_undecodable', now() - started);
  }

  const passNames = getProfile(GENERIC_PROFILE_ID).passes.filter((name) => shouldRunPass(name, info)).slice(0, limits.maxPasses);
  const passResults = [];
  let lastEngineError = '';
  for (const passName of passNames) {
    if (now() - started > limits.jobTimeoutMs) {
      lastEngineError = 'ocr_job_timeout';
      break;
    }
    const pass = await buildPass(passName, buffer, info, limits);
    const passStarted = now();
    let recognition;
    try {
      recognition = await engine.recognize(pass.buffer, { pageSegMode: '11' });
    } catch (error) {
      lastEngineError = error?.code || 'ocr_engine_failed';
      continue;
    }
    const parsed = parser._parseOcrText(recognition.text, recognition.confidence);
    passResults.push({
      name: passName,
      offset: pass.offset,
      scale: pass.scale,
      recognition,
      parsed,
      score: scoreParsed(parsed),
      elapsedMs: now() - passStarted
    });
    if (parsed.distance && parsed.time && parsed.date) break;
  }

  if (!passResults.length) {
    return failedResult(lastEngineError || 'ocr_engine_failed', now() - started, info);
  }

  const ranked = passResults.slice().sort((a, b) => b.score - a.score);
  const best = ranked[0];
  const merged = {};
  const fieldPass = {};
  for (const key of FIELD_KEYS) {
    const source = ranked.find((pass) => pass.parsed[key] !== null && pass.parsed[key] !== undefined && pass.parsed[key] !== '');
    merged[key] = source ? source.parsed[key] : null;
    fieldPass[key] = source ? source.name : '';
  }
  const combinedRawText = passResults.map((pass) => pass.recognition.text).join('\n--- OCR PASS ---\n');

  const enabledProfileIds = options.enabledProfileIds;
  let detection = detectPlatform(combinedRawText, { enabledProfileIds, urlProvider: options.urlProvider });
  if (options.profileOverride && options.profileOverride !== detection.profileId) {
    const forced = getProfile(options.profileOverride);
    detection = {
      ...detection,
      status: 'overridden',
      platform: forced.platform,
      profileId: forced.id,
      signals: detection.signals.concat([{ kind: 'manual_override', confidence: 1, evidence: forced.id, pattern: '' }])
    };
  }
  const profile = getProfile(detection.profileId);

  const fields = {
    distance: { value: merged.distance, sourcePass: fieldPass.distance, location: locateField('distance', merged.distance, passResults) },
    time: { value: merged.time, kind: detectTimeKind(combinedRawText, profile), sourcePass: fieldPass.time, location: locateField('time', merged.time, passResults) },
    pace: { value: merged.pace, sourcePass: fieldPass.pace, location: locateField('pace', merged.pace, passResults) },
    date: { value: merged.date, sourcePass: fieldPass.date, location: null },
    runType: { value: merged.runType, sourcePass: fieldPass.runType, location: null },
    elevationGain: { value: merged.elevationGain, sourcePass: fieldPass.elevationGain, location: null },
    steps: { value: merged.steps, sourcePass: fieldPass.steps, location: null },
    name: { value: merged.name, sourcePass: fieldPass.name, location: null },
    location: { value: merged.location, sourcePass: fieldPass.location, location: null }
  };

  const maxEngineConfidence = Math.max(...passResults.map((pass) => pass.recognition.confidence));
  const confidence = computeParserConfidence({ ...merged, ocrConfidence: maxEngineConfidence });
  const validationFlags = buildValidationFlags({ fields, detection, info });
  const hasCore = Boolean(merged.distance || merged.time);

  let differenceHash = '';
  try {
    differenceHash = await computeDifferenceHash(buffer, limits);
  } catch (_) {
    differenceHash = '';
  }

  return {
    pipelineVersion: PIPELINE_VERSION,
    parserVersion: best.parsed.parserVersion || '',
    status: hasCore ? (merged.distance && merged.time ? 'complete' : 'partial') : 'partial',
    errorCode: hasCore ? '' : 'no_core_fields',
    image: info,
    layout: {
      id: `${profile.id}/${info.orientation}-${info.theme}`,
      orientation: info.orientation,
      theme: info.theme
    },
    detection,
    profile: { id: profile.id, version: profile.version, status: profile.status },
    fields,
    confidence,
    engineConfidence: Number((maxEngineConfidence / 100).toFixed(3)),
    modelVersionId: best.recognition.modelVersionId || '',
    rawText: combinedRawText.slice(0, RAW_TEXT_LIMIT),
    passes: passResults.map((pass) => ({
      name: pass.name,
      elapsedMs: pass.elapsedMs,
      engineConfidence: Number((pass.recognition.confidence / 100).toFixed(3)),
      score: pass.score
    })),
    validationFlags,
    differenceHash,
    elapsedMs: now() - started
  };
}

/** Same weights as src/public/js/ocr/ocr-confidence.js so thresholds keep their meaning. */
function computeParserConfidence(result) {
  let score = 0;
  if (result.distance) score += 0.4;
  if (result.time) score += 0.4;
  if (result.pace) score += 0.1;
  if (result.date) score += 0.05;
  if (Number(result.ocrConfidence) > 70) score += 0.05;
  return Number(Math.min(score, 1).toFixed(2));
}

function failedResult(errorCode, elapsedMs, info = null) {
  return {
    pipelineVersion: PIPELINE_VERSION,
    parserVersion: '',
    status: 'failed',
    errorCode,
    image: info,
    layout: null,
    detection: null,
    profile: null,
    fields: null,
    confidence: 0,
    engineConfidence: 0,
    modelVersionId: '',
    rawText: '',
    passes: [],
    validationFlags: [],
    differenceHash: '',
    elapsedMs
  };
}

module.exports = {
  PIPELINE_VERSION,
  runOcrPipeline,
  computeParserConfidence,
  fieldNeedles,
  locateField,
  detectTimeKind,
  buildValidationFlags
};
