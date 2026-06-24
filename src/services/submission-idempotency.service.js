const crypto = require('crypto');
const SubmissionIdempotencyKey = require('../models/SubmissionIdempotencyKey');

const DEFAULT_TTL_MS = 10 * 60 * 1000;
let disableSubmissionIdempotencyLocks = false;

function buildProofSubmissionIdempotencyKey({ runnerId, proofHash }) {
  return buildKey('proof', runnerId, proofHash);
}

function buildStravaSubmissionIdempotencyKey({ runnerId, eventId, stravaActivityId }) {
  return buildKey('strava', runnerId, eventId, stravaActivityId);
}

function buildPaymentProofIdempotencyKey({ runnerId, registrationId, proofHash }) {
  return buildKey('payment-proof', runnerId, registrationId, proofHash);
}

async function acquireSubmissionIdempotencyLock(key, options = {}) {
  if (disableSubmissionIdempotencyLocks) return buildNoopLock();

  const safeKey = String(key || '').trim();
  if (!safeKey) return buildNoopLock();

  const now = new Date();
  await SubmissionIdempotencyKey.deleteOne({
    key: safeKey,
    expiresAt: { $lte: now }
  });

  const ttlMs = Number(options.ttlMs || DEFAULT_TTL_MS);
  const expiresAt = new Date(now.getTime() + (Number.isFinite(ttlMs) && ttlMs > 0 ? ttlMs : DEFAULT_TTL_MS));
  try {
    await SubmissionIdempotencyKey.create({
      key: safeKey,
      scope: String(options.scope || '').trim().slice(0, 80),
      runnerId: options.runnerId || null,
      expiresAt
    });
  } catch (error) {
    if (error?.code === 11000) {
      const duplicateError = new Error(options.message || 'This submission is already being processed. Please wait a moment.');
      duplicateError.code = 'SUBMISSION_IDEMPOTENCY_CONFLICT';
      throw duplicateError;
    }
    throw error;
  }

  let released = false;
  return {
    async release() {
      if (released) return;
      released = true;
      await SubmissionIdempotencyKey.deleteOne({ key: safeKey });
    }
  };
}

function buildNoopLock() {
  return {
    async release() {}
  };
}

function buildKey(...parts) {
  const raw = parts.map((part) => String(part || '').trim()).join('|');
  return crypto.createHash('sha256').update(raw).digest('hex');
}

function __setDisableSubmissionIdempotencyLocks(value) {
  disableSubmissionIdempotencyLocks = Boolean(value);
}

module.exports = {
  acquireSubmissionIdempotencyLock,
  buildPaymentProofIdempotencyKey,
  buildProofSubmissionIdempotencyKey,
  buildStravaSubmissionIdempotencyKey,
  __setDisableSubmissionIdempotencyLocks
};
