const {
  processCommunicationRetryBatch,
  runCommunicationRetryHygiene
} = require('../services/reliable-communication.service');
const logger = require('../utils/logger');

let communicationRetryTimer = null;
let commConsecutiveErrors = 0;
const COMM_MAX_CONSECUTIVE_ERRORS = 5;

async function runCommunicationRetryCycleSafe() {
  try {
    await runCommunicationRetryCycle();
    commConsecutiveErrors = 0;
  } catch (error) {
    commConsecutiveErrors += 1;
    logger.error('[communication-retry-worker] Batch error:', {
      message: error?.message || String(error),
      consecutiveErrors: commConsecutiveErrors
    });
    if (commConsecutiveErrors >= COMM_MAX_CONSECUTIVE_ERRORS) {
      const backoff = Math.min(10000 * commConsecutiveErrors, 300000);
      logger.warn(`[communication-retry-worker] ${commConsecutiveErrors} consecutive errors — pausing ${backoff}ms`);
      await new Promise((resolve) => setTimeout(resolve, backoff));
    }
  }
}

function startCommunicationRetryWorker() {
  if (process.env.NODE_ENV === 'test') return;

  const interval = Number(process.env.COMMUNICATION_RETRY_INTERVAL_MS || 60000);

  setTimeout(() => { runCommunicationRetryCycleSafe(); }, 8000);

  communicationRetryTimer = setInterval(() => { runCommunicationRetryCycleSafe(); }, interval);

  const cleanup = () => {
    if (communicationRetryTimer) {
      clearInterval(communicationRetryTimer);
      communicationRetryTimer = null;
    }
  };
  process.once('SIGTERM', cleanup);
  process.once('SIGINT', cleanup);

  logger.info(`[communication-retry-worker] Started — interval: ${interval}ms`);
}

async function runCommunicationRetryCycle() {
  await runCommunicationRetryHygiene();
  return processCommunicationRetryBatch();
}

module.exports = {
  runCommunicationRetryCycle,
  startCommunicationRetryWorker
};
