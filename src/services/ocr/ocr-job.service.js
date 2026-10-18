'use strict';

/**
 * OcrJob queue operations. Atomic claim + lease, bounded retries with backoff,
 * idempotent enqueue. Safe with several web/worker processes against one
 * MongoDB: two workers can never hold the same job, and a crashed worker's
 * job is reclaimed once its lease expires.
 */

const crypto = require('node:crypto');
const os = require('node:os');
const OcrJob = require('../../models/OcrJob');
const { getOcrLimits } = require('./ocr-config');

const RETRY_DELAYS_MS = Object.freeze([60_000, 5 * 60_000, 30 * 60_000]);
const WORKER_ID = `${os.hostname()}:${process.pid}`;

function buildExtractionIdempotencyKey({ proofHash, submissionAttemptId, targets, reason = 'submission' }) {
  const targetPart = (targets || []).map((target) => `${target.kind}:${String(target.id)}`).sort().join(',');
  const digest = crypto.createHash('sha256')
    .update(JSON.stringify({ proofHash: String(proofHash || ''), attempt: String(submissionAttemptId || ''), targets: targetPart, reason }))
    .digest('hex');
  return `extract_proof:${digest}`;
}

/**
 * Queue one extraction for one stored proof shared by one or more entries.
 * Returns { job, created }. A repeat call with the same key returns the existing job.
 */
async function enqueueExtraction({
  proofKey,
  proofHash = '',
  runnerId = null,
  targets,
  submissionAttemptId = '',
  priority = 10,
  reason = 'submission',
  profileOverride = '',
  requestedBy = null,
  idempotencyKey = ''
}) {
  if (!proofKey) throw new Error('proofKey is required to queue OCR.');
  if (!Array.isArray(targets) || !targets.length) throw new Error('At least one OCR target is required.');
  const limits = getOcrLimits();
  const key = idempotencyKey || buildExtractionIdempotencyKey({ proofHash, submissionAttemptId, targets, reason });
  const now = new Date();
  const result = await OcrJob.findOneAndUpdate(
    { idempotencyKey: key },
    {
      $setOnInsert: {
        type: 'extract_proof',
        status: 'queued',
        priority,
        idempotencyKey: key,
        proofKey,
        proofHash,
        runnerId,
        targets,
        options: { profileOverride, reason },
        requestedBy,
        attempts: 0,
        maxAttempts: limits.maxJobAttempts,
        nextAttemptAt: now
      }
    },
    { upsert: true, new: true, includeResultMetadata: true }
  );
  const job = result.value || result;
  const created = Boolean(result.lastErrorObject && result.lastErrorObject.upserted);
  return { job, created };
}

/**
 * Claim the next due job: queued and due, or running with an expired lease.
 * Increments attempts on claim so a job that kills its worker still runs out.
 */
async function claimNextJob({ now = new Date(), workerId = WORKER_ID } = {}) {
  const limits = getOcrLimits();
  return OcrJob.findOneAndUpdate(
    {
      $or: [
        { status: 'queued', nextAttemptAt: { $lte: now } },
        { status: 'running', leaseExpiresAt: { $lte: now } }
      ],
      $expr: { $lt: ['$attempts', '$maxAttempts'] }
    },
    {
      $set: {
        status: 'running',
        claimedBy: workerId,
        leaseExpiresAt: new Date(now.getTime() + limits.jobLeaseMs),
        startedAt: now
      },
      $inc: { attempts: 1 }
    },
    { new: true, sort: { priority: 1, nextAttemptAt: 1, createdAt: 1 } }
  );
}

/** Jobs whose lease expired on their final attempt are closed, not left running forever. */
async function failExhaustedJobs({ now = new Date() } = {}) {
  const result = await OcrJob.updateMany(
    {
      status: 'running',
      leaseExpiresAt: { $lte: now },
      $expr: { $gte: ['$attempts', '$maxAttempts'] }
    },
    { $set: { status: 'failed', errorCode: 'lease_expired_after_max_attempts', finishedAt: now, leaseExpiresAt: null } }
  );
  return Number(result.modifiedCount || 0);
}

async function completeJob(job, { extractionId = null, elapsedMs = null, now = new Date() } = {}) {
  return OcrJob.findOneAndUpdate(
    { _id: job._id, status: 'running', claimedBy: job.claimedBy },
    { $set: { status: 'completed', extractionId, elapsedMs, finishedAt: now, leaseExpiresAt: null, errorCode: '' } },
    { new: true }
  );
}

/**
 * Record a failure. Retryable failures go back to the queue with backoff until
 * attempts run out; permanent ones (bad image, missing proof) close immediately.
 */
async function failJob(job, { errorCode = 'ocr_failed', retryable = true, now = new Date() } = {}) {
  const attempts = Number(job.attempts || 0);
  const exhausted = attempts >= Number(job.maxAttempts || 1);
  if (!retryable || exhausted) {
    return OcrJob.findOneAndUpdate(
      { _id: job._id, status: 'running', claimedBy: job.claimedBy },
      { $set: { status: 'failed', errorCode, finishedAt: now, leaseExpiresAt: null } },
      { new: true }
    );
  }
  const delay = RETRY_DELAYS_MS[Math.min(attempts - 1, RETRY_DELAYS_MS.length - 1)] || RETRY_DELAYS_MS[0];
  return OcrJob.findOneAndUpdate(
    { _id: job._id, status: 'running', claimedBy: job.claimedBy },
    { $set: { status: 'queued', errorCode, nextAttemptAt: new Date(now.getTime() + delay), leaseExpiresAt: null, claimedBy: '' } },
    { new: true }
  );
}

async function getQueueSummary() {
  const rows = await OcrJob.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]);
  const summary = { queued: 0, running: 0, completed: 0, failed: 0, cancelled: 0 };
  for (const row of rows) summary[row._id] = row.count;
  return summary;
}

module.exports = {
  WORKER_ID,
  RETRY_DELAYS_MS,
  buildExtractionIdempotencyKey,
  enqueueExtraction,
  claimNextJob,
  failExhaustedJobs,
  completeJob,
  failJob,
  getQueueSummary
};
