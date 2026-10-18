'use strict';

/**
 * Build the optional activity evidence for a submission request (Phase 2).
 * Returns { ok: true, evidence } or { ok: false, errorCode, message } for a link the runner
 * must fix or remove. Returns { ok: true, evidence: undefined } while ACTIVITY_URL_ENABLED is
 * off, which leaves the stored entry exactly as before.
 */

const { isActivityUrlEnabled } = require('./ocr-config');
const { parseActivityUrl } = require('../../utils/ocr/activity-url');
const { findProviderActivityDuplicates } = require('./activity-duplicate.service');
const logger = require('../../utils/logger');

async function buildActivityEvidence({ rawUrl, runnerId, submissionAttemptId = '', eventIds = [], excludeIds = [] }, deps = {}) {
  if (!isActivityUrlEnabled()) return { ok: true, evidence: undefined };
  const parsed = parseActivityUrl(rawUrl);
  if (!parsed.ok) return { ok: false, errorCode: parsed.errorCode, message: parsed.message };
  if (!parsed.provided) return { ok: true, evidence: { parsed, duplicateSignals: [] } };
  const findDuplicates = deps.findProviderActivityDuplicates || findProviderActivityDuplicates;
  let duplicateSignals = [];
  try {
    duplicateSignals = await findDuplicates({
      provider: parsed.provider,
      providerActivityId: parsed.providerActivityId,
      runnerId,
      submissionAttemptId,
      eventIds,
      excludeIds
    });
  } catch (error) {
    // A failed lookup must not block the runner; the link is still stored for review.
    logger.warn('[activity-evidence] duplicate lookup failed', { error: error?.message || String(error) });
  }
  return { ok: true, evidence: { parsed, duplicateSignals } };
}

module.exports = { buildActivityEvidence };
