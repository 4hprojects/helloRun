'use strict';

/**
 * Standalone server OCR worker for OCR_WORKER_MODE=separate.
 *
 *   OCR_SERVER_PIPELINE_ENABLED=true OCR_WORKER_MODE=separate npm run ocr:worker
 *
 * Run it as its own PM2 process (e.g. `pm2 start npm --name hellorun-ocr -- run ocr:worker`)
 * so OCR CPU and memory can be limited and restarted independently of the web app.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const logger = require('../utils/logger');
const { isServerOcrPipelineEnabled } = require('../services/ocr/ocr-config');
const { startOcrExtractionWorker, stopOcrExtractionWorker } = require('../workers/ocr-extraction-worker');

async function main() {
  if (!isServerOcrPipelineEnabled()) {
    logger.info('[ocr-worker] OCR_SERVER_PIPELINE_ENABLED is off; exiting.');
    return;
  }
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required.');
  await mongoose.connect(process.env.MONGODB_URI, { autoIndex: false });
  require('../services/ocr/ocr-engine').setLanguageResolver(require('../services/ocr/model-registry.service').resolveLanguage);
  startOcrExtractionWorker({ force: true });
  // Interval timers are unref'd for the web process; keep this process alive explicitly.
  const keepAlive = setInterval(() => {}, 60 * 60 * 1000);

  const shutdown = async (signal) => {
    logger.info(`[ocr-worker] ${signal} received; stopping.`);
    clearInterval(keepAlive);
    await stopOcrExtractionWorker().catch(() => {});
    await mongoose.disconnect().catch(() => {});
    process.exit(0);
  };
  process.once('SIGTERM', () => shutdown('SIGTERM'));
  process.once('SIGINT', () => shutdown('SIGINT'));
}

main().catch((error) => {
  logger.error('[ocr-worker] failed to start:', error?.message || String(error));
  process.exit(1);
});
