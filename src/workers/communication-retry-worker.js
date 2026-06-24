const { processCommunicationRetryBatch } = require('../services/reliable-communication.service');
const logger = require('../utils/logger');

let communicationRetryTimer = null;

function startCommunicationRetryWorker() {
  if (process.env.NODE_ENV === 'test') return;

  const interval = Number(process.env.COMMUNICATION_RETRY_INTERVAL_MS || 60000);

  setTimeout(() => {
    processCommunicationRetryBatch().catch((error) => {
      logger.error('[communication-retry-worker] Startup batch error:', error?.message || String(error));
    });
  }, 8000);

  communicationRetryTimer = setInterval(() => {
    processCommunicationRetryBatch().catch((error) => {
      logger.error('[communication-retry-worker] Batch error:', error?.message || String(error));
    });
  }, interval);

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

module.exports = {
  startCommunicationRetryWorker
};
