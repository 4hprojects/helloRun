'use strict';

/**
 * Duplicate review signals (doc 03 "Duplicate detection"). Conservative by design:
 * matches are flagged for a person, never rejected automatically. Entries submitted
 * together (same runner, same submissionAttemptId) share one proof and one activity by
 * design and are never flagged against each other.
 */

const Submission = require('../../models/Submission');
const AccumulatedActivitySubmission = require('../../models/AccumulatedActivitySubmission');
const { hammingDistanceHex } = require('./ocr-preprocess');

const NEAR_DUPLICATE_MAX_DISTANCE = 6;
const NEAR_DUPLICATE_LOOKBACK_DAYS = 180;
const NEAR_DUPLICATE_SCAN_LIMIT = 2000;
const SOURCES = [
  { kind: 'run_submission', Model: Submission },
  { kind: 'accumulated_activity', Model: AccumulatedActivitySubmission }
];

function isLinkedSibling(entry, { runnerId, submissionAttemptId }) {
  return Boolean(
    submissionAttemptId &&
    String(entry.runnerId || '') === String(runnerId || '') &&
    String(entry.submissionAttemptId || '') === String(submissionAttemptId)
  );
}

function toSignal(kind, entry, sourceKind, { runnerId, eventIds }, distance = null) {
  const eventSet = new Set((eventIds || []).map(String));
  return {
    kind,
    otherEntryKind: sourceKind,
    otherEntryId: entry._id,
    sameRunner: String(entry.runnerId || '') === String(runnerId || ''),
    sameEvent: eventSet.has(String(entry.eventId || '')),
    distance,
    detectedAt: new Date()
  };
}

/** Same provider activity already attached to another entry. */
async function findProviderActivityDuplicates({ provider, providerActivityId, runnerId, submissionAttemptId = '', eventIds = [], excludeIds = [] }) {
  if (!provider || !providerActivityId) return [];
  const exclude = new Set(excludeIds.map(String));
  const signals = [];
  for (const { kind, Model } of SOURCES) {
    const rows = await Model.find({ 'activityUrl.provider': provider, 'activityUrl.providerActivityId': String(providerActivityId) })
      .select('_id runnerId eventId submissionAttemptId')
      .limit(20)
      .lean();
    for (const row of rows) {
      if (exclude.has(String(row._id))) continue;
      if (isLinkedSibling(row, { runnerId, submissionAttemptId })) continue;
      signals.push(toSignal('provider_activity_id', row, kind, { runnerId, eventIds }));
    }
  }
  return signals.slice(0, 10);
}

/** Visually near-identical screenshots: same event (bounded scan) or exact hash anywhere. */
async function findNearDuplicateScreenshots({ differenceHash, runnerId, submissionAttemptId = '', eventIds = [], excludeIds = [], now = new Date() }) {
  if (!/^[0-9a-f]{16}$/.test(String(differenceHash || ''))) return [];
  const exclude = new Set(excludeIds.map(String));
  const since = new Date(now.getTime() - NEAR_DUPLICATE_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
  const signals = [];
  const seen = new Set();
  for (const { kind, Model } of SOURCES) {
    const exact = await Model.find({ proofDifferenceHash: differenceHash })
      .select('_id runnerId eventId submissionAttemptId proofDifferenceHash')
      .limit(20)
      .lean();
    const sameEvent = eventIds.length
      ? await Model.find({ eventId: { $in: eventIds }, proofDifferenceHash: { $gt: '' }, createdAt: { $gte: since } })
        .select('_id runnerId eventId submissionAttemptId proofDifferenceHash')
        .sort({ createdAt: -1 })
        .limit(NEAR_DUPLICATE_SCAN_LIMIT)
        .lean()
      : [];
    for (const row of [...exact, ...sameEvent]) {
      const id = String(row._id);
      if (seen.has(id) || exclude.has(id)) continue;
      seen.add(id);
      if (isLinkedSibling(row, { runnerId, submissionAttemptId })) continue;
      const distance = hammingDistanceHex(differenceHash, row.proofDifferenceHash);
      if (distance > NEAR_DUPLICATE_MAX_DISTANCE) continue;
      signals.push(toSignal('near_duplicate_screenshot', row, kind, { runnerId, eventIds }, distance));
    }
  }
  return signals.slice(0, 10);
}

module.exports = {
  NEAR_DUPLICATE_MAX_DISTANCE,
  findProviderActivityDuplicates,
  findNearDuplicateScreenshots
};
