'use strict';

const OcrSettings = require('../../models/OcrSettings');

const CACHE_TTL_MS = 30_000;
let cache = { at: 0, value: null };

function clearOcrSettingsCache() {
  cache = { at: 0, value: null };
}

async function getOcrSettings({ fresh = false } = {}) {
  if (!fresh && cache.value && Date.now() - cache.at < CACHE_TTL_MS) return cache.value;
  const value = await OcrSettings.findOneAndUpdate(
    { key: 'global' },
    { $setOnInsert: { key: 'global' } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();
  cache = { at: Date.now(), value };
  return value;
}

function toInt(value, { min, max }) {
  const numeric = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(numeric) || numeric < min || numeric > max) return null;
  return numeric;
}

function toNumber(value, { min, max }) {
  const numeric = Number(String(value ?? '').trim());
  if (String(value ?? '').trim() === '' || !Number.isFinite(numeric) || numeric < min || numeric > max) return null;
  return numeric;
}

function isValidTimezone(timezone) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone });
    return true;
  } catch (_) {
    return false;
  }
}

const NUMERIC_FIELDS = {
  'dataset.minApprovedSamples': { min: 1, max: 1_000_000, int: true },
  'dataset.minTestSamples': { min: 1, max: 100_000, int: true },
  'dataset.minValidationSamples': { min: 0, max: 100_000, int: true },
  'dataset.minSamplesPerPlatform': { min: 0, max: 100_000, int: true },
  'evaluation.maxPlatformCerRegression': { min: 0, max: 1 },
  'evaluation.minEvaluationSamplesPerPlatform': { min: 1, max: 100_000, int: true },
  'retention.sampleRetentionDays': { min: 30, max: 3650, int: true },
  'training.maxIterations': { min: 100, max: 100_000, int: true },
  'training.timeoutMinutes': { min: 10, max: 1440, int: true },
  'training.cpuQuotaPercent': { min: 10, max: 400, int: true },
  'training.memoryMaxMb': { min: 256, max: 16384, int: true },
  'training.minFreeDiskMb': { min: 512, max: 1_000_000, int: true },
  'notifications.minimumNewSamples': { min: 1, max: 100_000, int: true }
};

/**
 * Validate a flat form body ("dataset.minTestSamples": "10", ...) into a $set.
 * Unknown keys are ignored; invalid values produce errors and nothing is saved.
 */
function buildSettingsUpdate(body = {}) {
  const set = {};
  const errors = [];
  for (const [path, rule] of Object.entries(NUMERIC_FIELDS)) {
    if (body[path] === undefined) continue;
    const value = rule.int ? toInt(body[path], rule) : toNumber(body[path], rule);
    if (value === null) errors.push(`${path} must be between ${rule.min} and ${rule.max}.`);
    else set[path] = value;
  }
  for (const flag of ['dataset.thresholdsApprovedByOwner', 'evaluation.gatesApprovedByOwner', 'notifications.enabled']) {
    if (body[`${flag}__present`] !== undefined || body[flag] !== undefined) set[flag] = ['on', 'true', '1'].includes(String(body[flag] || ''));
  }
  if (body['notifications.frequency'] !== undefined) {
    const frequency = String(body['notifications.frequency']);
    if (!['off', 'weekly', 'biweekly', 'monthly'].includes(frequency)) errors.push('Choose a valid reminder frequency.');
    else set['notifications.frequency'] = frequency;
  }
  if (body['notifications.dayOfWeek'] !== undefined) {
    const raw = String(body['notifications.dayOfWeek']).trim();
    const day = raw === '' ? null : toInt(raw, { min: 0, max: 6 });
    if (raw !== '' && day === null) errors.push('Choose a valid day of the week.');
    else set['notifications.dayOfWeek'] = day;
  }
  if (body['notifications.hour'] !== undefined) {
    const raw = String(body['notifications.hour']).trim();
    const hour = raw === '' ? null : toInt(raw, { min: 0, max: 23 });
    if (raw !== '' && hour === null) errors.push('Choose an hour from 0 to 23.');
    else set['notifications.hour'] = hour;
  }
  if (body['notifications.timezone'] !== undefined) {
    const timezone = String(body['notifications.timezone']).trim();
    if (!isValidTimezone(timezone)) errors.push('Choose a valid IANA timezone, for example Asia/Manila.');
    else set['notifications.timezone'] = timezone;
  }
  if (body['notifications.recipientMode'] !== undefined) {
    const mode = String(body['notifications.recipientMode']);
    if (!['all_admins', 'selected'].includes(mode)) errors.push('Choose a valid recipient mode.');
    else set['notifications.recipientMode'] = mode;
  }
  if (body['notifications.eventTypes__present'] !== undefined) {
    const allowed = new Set(['ocr.review_digest', 'ocr.dataset_ready', 'ocr.training_completed', 'ocr.training_failed', 'ocr.model_approval_needed', 'ocr.model_activated', 'ocr.quality_regression']);
    const raw = body['notifications.eventTypes'];
    const list = (Array.isArray(raw) ? raw : (raw ? [raw] : [])).map(String).filter((item) => allowed.has(item));
    set['notifications.eventTypes'] = [...new Set(list)];
  }
  if (body['retention.consentNoticeVersion'] !== undefined) {
    set['retention.consentNoticeVersion'] = String(body['retention.consentNoticeVersion']).trim().slice(0, 40);
  }
  return { set, errors };
}

async function updateOcrSettings(set, actorId) {
  const updated = await OcrSettings.findOneAndUpdate(
    { key: 'global' },
    { $set: { ...set, updatedBy: actorId || null } },
    { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
  ).lean();
  clearOcrSettingsCache();
  return updated;
}

module.exports = {
  getOcrSettings,
  updateOcrSettings,
  buildSettingsUpdate,
  clearOcrSettingsCache,
  isValidTimezone
};
