'use strict';

const {
  finalizeDueAccumulatedCertificates
} = require('../services/accumulated-certificate-finalization.service');
const logger = require('../utils/logger');

let timer = null;
let running = false;

async function runAccumulatedCertificateFinalizationCycle() {
  if (running) return null;
  running = true;
  try {
    return await finalizeDueAccumulatedCertificates();
  } finally {
    running = false;
  }
}

function startAccumulatedCertificateWorker() {
  if (process.env.NODE_ENV === 'test') return;
  const interval = Number(process.env.ACCUMULATED_CERTIFICATE_INTERVAL_MS || 300000);

  setTimeout(() => {
    runAccumulatedCertificateFinalizationCycle().catch((error) => {
      logger.error('[accumulated-certificate-worker] Startup cycle failed:', error.message);
    });
  }, 12000);

  timer = setInterval(() => {
    runAccumulatedCertificateFinalizationCycle().catch((error) => {
      logger.error('[accumulated-certificate-worker] Cycle failed:', error.message);
    });
  }, interval);

  const cleanup = () => {
    if (timer) clearInterval(timer);
    timer = null;
  };
  process.once('SIGTERM', cleanup);
  process.once('SIGINT', cleanup);
  logger.info(`[accumulated-certificate-worker] Started — interval: ${interval}ms`);
}

module.exports = {
  runAccumulatedCertificateFinalizationCycle,
  startAccumulatedCertificateWorker
};
