'use strict';

const { OCR_VERIFICATION_STATUSES } = require('../../models/ocr-verification.schema');

const FIELD_MAP = Object.freeze([
  ['distance', 'distanceKm', 'extractedDistanceKm', 'distanceMismatch'],
  ['duration', 'elapsedMs', 'extractedTimeMs', 'timeMismatch'],
  ['date', 'runDate', 'extractedRunDate', 'dateMismatch'],
  ['type', 'runType', 'extractedRunType', 'runTypeMismatch'],
  ['elevation', 'elevationGain', 'extractedElevationGain', 'elevationMismatch'],
  ['steps', 'steps', 'extractedSteps', 'stepsMismatch'],
  ['location', 'runLocation', 'extractedRunLocation', 'locationMismatch']
]);

function valueText(value) {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString();
  return String(value).trim().slice(0, 200);
}

function resolveOcrSource(entry) {
  const currentServer = ['complete', 'partial', 'failed'].includes(entry?.serverOcr?.status)
    && String(entry.serverOcr.proofKey || '') === String(entry.proof?.key || '')
    && entry.serverOcr.proofKey;
  if (currentServer) return { source: 'server_ocr', values: entry.serverOcr.autoApproval || {} };
  const browser = entry?.ocrData || {};
  const hasBrowser = Number(browser.confidence || 0) > 0
    || FIELD_MAP.some(([, , extracted]) => valueText(browser[extracted]))
    || valueText(browser.rawText);
  return hasBrowser ? { source: 'browser_ocr', values: browser } : null;
}

function buildOcrVerification(entry, status, reviewerId, now = new Date()) {
  const reading = resolveOcrSource(entry);
  if (!reading) return undefined;
  const safeStatus = String(status || '').trim().toLowerCase();
  if (!OCR_VERIFICATION_STATUSES.includes(safeStatus)) {
    const error = new Error('Mark the OCR reading as confirmed, corrected, or unreadable.');
    error.code = 'ocr_verification_required';
    throw error;
  }
  return {
    status: safeStatus,
    source: reading.source,
    verifiedAt: now,
    verifiedBy: reviewerId,
    fields: FIELD_MAP.map(([field, runnerKey, extractedKey, mismatchKey]) => {
      const runnerValue = valueText(entry?.[runnerKey]);
      const serverValue = valueText(reading.values?.[extractedKey]);
      if (!runnerValue && !serverValue) return null;
      const differs = Boolean(reading.values?.[mismatchKey]);
      return {
        field,
        outcome: safeStatus === 'unreadable' ? 'unreadable' : safeStatus === 'corrected' && differs ? 'corrected' : 'confirmed',
        runnerValue,
        serverValue,
        finalValue: runnerValue,
        differs
      };
    }).filter(Boolean)
  };
}

module.exports = { FIELD_MAP, resolveOcrSource, buildOcrVerification };
