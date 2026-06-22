/**
 * Postgres Sync Retry Worker
 *
 * Polls sync_failure_log for unresolved failures and retries the appropriate
 * sync function for each. Runs on a configurable interval (default 60s).
 *
 * retry_count < 3  → retryable
 * retry_count = -1 → dead-letter (permanently skipped)
 *
 * Skips entirely when NODE_ENV=test or DATABASE_URL is not set.
 */

const Event = require('../models/Event');
const Registration = require('../models/Registration');
const Submission = require('../models/Submission');
const User = require('../models/User');
const { syncEventShadow } = require('../services/event-shadow.service');
const { syncRegistrationPaymentShadow } = require('../services/registration-payment-shadow.service');
const { syncSubmissionShadow } = require('../services/submission-shadow.service');
const { syncPolicyConsentsForMongoUser } = require('../services/policy-consent.service');
const { getPostgresClient } = require('../db/postgres');
const logger = require('../utils/logger');

const MAX_RETRIES = 3;
const DEAD_LETTER = -1;
const BATCH_SIZE = 20;

async function retryFailure(failure) {
  const { id, sync_type, entity_id } = failure;
  const sql = getPostgresClient();

  try {
    switch (sync_type) {
      case 'event': {
        const doc = await Event.findById(entity_id).lean();
        if (!doc) throw new Error(`Event ${entity_id} not found — may have been deleted`);
        // findById returns lean; syncEventShadow expects mongoose doc or plain object
        const fullDoc = await Event.findById(entity_id);
        if (!fullDoc) throw new Error(`Event ${entity_id} not found`);
        await syncEventShadow(fullDoc, { operation: 'retry' });
        break;
      }
      case 'registration': {
        const doc = await Registration.findById(entity_id);
        if (!doc) throw new Error(`Registration ${entity_id} not found — may have been deleted`);
        await syncRegistrationPaymentShadow(doc, { operation: 'retry' });
        break;
      }
      case 'submission': {
        const doc = await Submission.findById(entity_id);
        if (!doc) throw new Error(`Submission ${entity_id} not found — may have been deleted`);
        await syncSubmissionShadow(doc, { operation: 'retry' });
        break;
      }
      case 'policy_consent':
      case 'user_compliance': {
        const doc = await User.findById(entity_id);
        if (!doc) throw new Error(`User ${entity_id} not found — may have been deleted`);
        await syncPolicyConsentsForMongoUser(doc, { source: 'retry' });
        break;
      }
      case 'critical_audit': {
        // Context is too sparse to reconstruct the full audit event safely.
        // Dead-letter immediately — the original was logged in sync_failure_log.
        await sql`
          UPDATE sync_failure_log
          SET retry_count = ${DEAD_LETTER},
              last_retry_at = now(),
              error_message = '[DEAD_LETTER] critical_audit events cannot be reconstructed for retry'
          WHERE id = ${id}
        `;
        logger.warn(`[pg-sync-worker] Dead-lettered critical_audit failure ${id} (not retryable)`);
        return;
      }
      default:
        throw new Error(`Unknown sync_type: ${sync_type}`);
    }

    // Success — mark resolved
    await sql`UPDATE sync_failure_log SET resolved_at = now() WHERE id = ${id}`;
    logger.info(`[pg-sync-worker] Resolved ${sync_type} failure for entity ${entity_id || 'unknown'}`);
  } catch (err) {
    const nextCount = (failure.retry_count || 0) + 1;
    const isDead = nextCount >= MAX_RETRIES;
    const msg = String(err?.message || 'Unknown error').slice(0, 2000);

    await sql`
      UPDATE sync_failure_log
      SET retry_count = ${isDead ? DEAD_LETTER : nextCount},
          last_retry_at = now(),
          error_message = ${isDead ? `[DEAD_LETTER after ${MAX_RETRIES} attempts] ${msg}` : msg}
      WHERE id = ${id}
    `;

    if (isDead) {
      logger.error(`[pg-sync-worker] Dead-lettered ${sync_type} failure ${id} after ${MAX_RETRIES} attempts: ${msg}`);
    } else {
      logger.warn(`[pg-sync-worker] Retry ${nextCount}/${MAX_RETRIES - 1} failed for ${sync_type} ${id}: ${msg}`);
    }
  }
}

async function runRetryBatch() {
  if (!process.env.DATABASE_URL) return;

  const sql = getPostgresClient();
  const failures = await sql`
    SELECT id, sync_type, entity_id, retry_count, context
    FROM sync_failure_log
    WHERE resolved_at IS NULL
      AND retry_count >= 0
      AND retry_count < ${MAX_RETRIES}
    ORDER BY created_at ASC
    LIMIT ${BATCH_SIZE}
  `;

  if (!failures.length) return;

  logger.info(`[pg-sync-worker] Processing ${failures.length} unresolved sync failure(s)`);
  for (const failure of failures) {
    await retryFailure(failure);
  }
}

let workerTimer = null;

function startSyncRetryWorker() {
  if (process.env.NODE_ENV === 'test' || !process.env.DATABASE_URL) {
    return;
  }

  const interval = Number(process.env.PG_SYNC_RETRY_INTERVAL_MS || 60000);

  workerTimer = setInterval(() => {
    runRetryBatch().catch((err) => {
      logger.error('[pg-sync-worker] Batch error:', err?.message || String(err));
    });
  }, interval);

  // Run once shortly after startup to catch any pre-existing failures
  setTimeout(() => {
    runRetryBatch().catch((err) => {
      logger.error('[pg-sync-worker] Startup batch error:', err?.message || String(err));
    });
  }, 5000);

  const cleanup = () => {
    if (workerTimer) {
      clearInterval(workerTimer);
      workerTimer = null;
    }
  };
  process.once('SIGTERM', cleanup);
  process.once('SIGINT', cleanup);

  logger.info(`[pg-sync-worker] Started — polling every ${interval}ms, max retries: ${MAX_RETRIES}`);
}

module.exports = { startSyncRetryWorker };
