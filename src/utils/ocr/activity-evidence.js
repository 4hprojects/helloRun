'use strict';

/**
 * Shapes the optional activity link and duplicate signals stored on an entry.
 * Pure: the controller resolves duplicates before the write and passes them in.
 */

const URL_VERIFICATION_STATUSES = Object.freeze([
  'not_provided', 'unchecked', 'inaccessible', 'matched', 'mismatched', 'authorized_verified', 'needs_review'
]);
const URL_VERIFICATION_METHODS = Object.freeze(['format_only', 'manual_open', 'authorized_api']);
const DUPLICATE_SIGNAL_KINDS = Object.freeze(['provider_activity_id', 'near_duplicate_screenshot']);
const ALLOWED_PROVIDERS = new Set(['strava', 'garmin', 'coros']);

function sanitizeDuplicateSignals(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((signal) => signal && DUPLICATE_SIGNAL_KINDS.includes(signal.kind))
    .slice(0, 10)
    .map((signal) => ({
      kind: signal.kind,
      otherEntryKind: String(signal.otherEntryKind || '').slice(0, 40),
      otherEntryId: signal.otherEntryId || null,
      sameRunner: Boolean(signal.sameRunner),
      sameEvent: Boolean(signal.sameEvent),
      distance: Number.isFinite(Number(signal.distance)) ? Number(signal.distance) : null,
      detectedAt: signal.detectedAt ? new Date(signal.detectedAt) : new Date()
    }));
}

/**
 * @param {{ parsed?: object, duplicateSignals?: object[] }|null|undefined} evidence
 */
function sanitizeActivityEvidence(evidence) {
  // Feature off (or caller passed nothing): add no fields, so entries look exactly as before.
  if (!evidence) return {};
  const parsed = evidence.parsed;
  const provided = Boolean(parsed?.ok && parsed.provided && ALLOWED_PROVIDERS.has(parsed.provider));
  return {
    activityUrl: provided
      ? {
        normalizedUrl: String(parsed.normalizedUrl).slice(0, 300),
        provider: parsed.provider,
        providerActivityId: String(parsed.providerActivityId).slice(0, 64),
        patternStatus: String(parsed.patternStatus || '').slice(0, 30),
        submittedAt: new Date()
      }
      : undefined,
    activityUrlVerification: {
      status: provided ? 'unchecked' : 'not_provided',
      method: provided ? 'format_only' : '',
      checkedAt: null,
      checkedBy: null,
      notes: ''
    },
    duplicateSignals: sanitizeDuplicateSignals(evidence?.duplicateSignals)
  };
}

module.exports = {
  URL_VERIFICATION_STATUSES,
  URL_VERIFICATION_METHODS,
  DUPLICATE_SIGNAL_KINDS,
  sanitizeActivityEvidence,
  sanitizeDuplicateSignals
};
