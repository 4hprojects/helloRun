const ReviewDecision = require('../models/ReviewDecision');
const logger = require('../utils/logger');

// Fields copied from an entry into the decision's evidence snapshot, per kind. A whitelist
// rather than the whole document, so certificate state, waiver text and other data unrelated
// to the decision stay out of the history.
const RUN_EVIDENCE_FIELDS = [
  'participationMode',
  'raceDistance',
  'distanceKm',
  'elapsedMs',
  'runDate',
  'runLocation',
  'runType',
  'trackingAppDevice',
  'elevationGain',
  'steps',
  'proofType',
  'proof',
  'proofNotes',
  'honorSystemConfirmed',
  'source',
  'stravaActivity',
  'submittedAt',
  'submissionCount',
  'ocrData',
  'validation',
  'suspiciousFlag',
  'suspiciousFlagReason',
  'isPersonalRecord'
];

// No paymentStatus: decisions are recorded after the update, and statusFrom already holds it.
const PAYMENT_EVIDENCE_FIELDS = [
  'paymentProof',
  'paymentAmountDue',
  'paymentCurrency',
  'paymentSubmissionCount',
  'pricingSnapshot',
  'addOnsSubtotal',
  'addOnsCurrency',
  'raceDistance',
  'participationMode'
];

const EVENT_RULE_FIELDS = [
  'virtualCompletionMode',
  'challengeMetrics',
  'primaryChallengeMetric',
  'targetDistanceKm',
  'targetSteps',
  'minimumActivityDistanceKm',
  'acceptedRunTypes',
  'requireActivityScreenshot',
  'requireTrackingAppDevice',
  'submissionReviewMode'
];

function toPlain(doc) {
  if (!doc) return {};
  if (typeof doc.toObject === 'function') return doc.toObject({ depopulate: true });
  return doc;
}

function pickDefined(source, fields) {
  const plain = toPlain(source);
  const picked = {};
  for (const field of fields) {
    if (plain[field] !== undefined) picked[field] = plain[field];
  }
  // A JSON round trip detaches the snapshot from the live document, so later mutations
  // of the entry (resubmission, approval clearing flags) cannot leak into it.
  return JSON.parse(JSON.stringify(picked));
}

function buildEvidenceSnapshot(entry, kind) {
  const evidence = pickDefined(entry, kind === 'payment_proof' ? PAYMENT_EVIDENCE_FIELDS : RUN_EVIDENCE_FIELDS);
  if (kind !== 'payment_proof') {
    const corrections = toPlain(entry).organizerCorrections;
    evidence.organizerCorrectionCount = Array.isArray(corrections) ? corrections.length : 0;
  }
  return evidence;
}

function buildEventRulesSnapshot(event) {
  return pickDefined(event, EVENT_RULE_FIELDS);
}

function resolveAttemptNumber(entry, kind) {
  const value = kind === 'payment_proof' ? entry?.paymentSubmissionCount : entry?.submissionCount;
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function buildReviewDecisionRecord({
  kind,
  entry,
  event = null,
  decision,
  statusFrom = '',
  statusTo = '',
  decidedBy = null,
  reviewerRole = '',
  isSelfReview = false,
  decidedAt = new Date(),
  rejectionCode = '',
  rejectionReason = '',
  reviewNotes = '',
  manualReviewChecklist = null
}) {
  const isPayment = kind === 'payment_proof';
  return {
    kind,
    targetId: entry._id,
    registrationId: isPayment ? entry._id : (entry.registrationId || null),
    eventId: entry.eventId || null,
    runnerId: (isPayment ? entry.userId : entry.runnerId) || null,
    attemptNumber: resolveAttemptNumber(entry, kind),
    decision,
    statusFrom: String(statusFrom || ''),
    statusTo: String(statusTo || ''),
    decidedBy: decidedBy || null,
    reviewerRole: String(reviewerRole || '').trim().toLowerCase(),
    isSelfReview: Boolean(isSelfReview),
    decidedAt: decidedAt || new Date(),
    rejectionCode: String(rejectionCode || ''),
    rejectionReason: String(rejectionReason || ''),
    reviewNotes: String(reviewNotes || ''),
    manualReviewChecklist: manualReviewChecklist
      ? JSON.parse(JSON.stringify(toPlain(manualReviewChecklist)))
      : null,
    evidence: buildEvidenceSnapshot(entry, kind),
    eventRules: buildEventRulesSnapshot(event)
  };
}

async function recordReviewDecision(input) {
  return ReviewDecision.create(buildReviewDecisionRecord(input));
}

// Build the record now, synchronously, so the snapshot reflects the entry as it is at the
// call site even if the caller mutates it straight after. Only the write is deferred, and a
// failure is logged rather than thrown: losing a history row must never fail a review.
function recordReviewDecisionInBackground(input) {
  let record;
  try {
    record = buildReviewDecisionRecord(input);
  } catch (error) {
    logger.error('Review decision snapshot failed:', {
      kind: input?.kind,
      targetId: String(input?.entry?._id || ''),
      error: error.message
    });
    return Promise.resolve(null);
  }
  return ReviewDecision.create(record).catch((error) => {
    logger.error('Review decision write failed:', {
      kind: record.kind,
      targetId: String(record.targetId || ''),
      decision: record.decision,
      error: error.message
    });
    return null;
  });
}

// Resubmission cleans up the replaced proof file. A file a recorded decision was made on is
// kept, so the history still points at the image the reviewer actually saw.
async function isProofReferencedByReviewDecision(proofKey) {
  const safeKey = String(proofKey || '').trim();
  if (!safeKey) return false;
  try {
    const referenced = await ReviewDecision.exists({
      $or: [{ 'evidence.proof.key': safeKey }, { 'evidence.paymentProof.key': safeKey }]
    });
    return Boolean(referenced);
  } catch (error) {
    // Unsure means keep: an orphaned file is cheap, a deleted proof cannot come back. The
    // caller has already saved the resubmission, so this must not throw either.
    logger.error('Review decision proof lookup failed; keeping the file:', {
      proofKey: safeKey,
      error: error.message
    });
    return true;
  }
}

module.exports = {
  isProofReferencedByReviewDecision,
  buildEvidenceSnapshot,
  buildEventRulesSnapshot,
  buildReviewDecisionRecord,
  recordReviewDecision,
  recordReviewDecisionInBackground
};
