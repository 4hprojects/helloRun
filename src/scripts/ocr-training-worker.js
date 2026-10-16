'use strict';

/**
 * Separate OCR training worker (Phase 4). Run it on the training host as its own process:
 *
 *   OCR_TRAINING_ENABLED=true npm run ocr:training-worker
 *   pm2 start npm --name hellorun-ocr-training -- run ocr:training-worker
 *
 * It never runs inside the web app. It lowers its own CPU priority, runs at most one job,
 * reports a heartbeat + preflight every minute, and marks jobs abandoned by a previous
 * worker as `interrupted`. Required tools (tesseract, lstmtraining, make, tesstrain,
 * base eng.traineddata from tessdata_best) are checked by preflight, not assumed.
 */

require('dotenv').config();
const os = require('node:os');
const mongoose = require('mongoose');
const logger = require('../utils/logger');
const { isTrainingEnabled } = require('../services/ocr/ocr-config');
const runner = require('../services/ocr/training-runner.service');
const { expireSamples } = require('../services/ocr/training-sample.service');

const CYCLE_MS = 60 * 1000;
const PREFLIGHT_EVERY_MS = 10 * 60 * 1000;

let busy = false;
let lastPreflight = null;
let lastPreflightAt = 0;
let stopping = false;

async function cycle() {
  if (busy || stopping) return;
  busy = true;
  try {
    if (!lastPreflight || Date.now() - lastPreflightAt > PREFLIGHT_EVERY_MS) {
      lastPreflight = await runner.runPreflight();
      lastPreflightAt = Date.now();
    }
    await runner.reportWorkerStatus({ preflight: lastPreflight });
    const interrupted = await runner.recoverInterruptedJobs();
    if (interrupted) logger.warn(`[ocr-training-worker] marked ${interrupted} abandoned job(s) as interrupted`);
    await expireSamples().catch((error) => logger.warn('[ocr-training-worker] retention sweep failed', { error: error?.message }));
    if (!isTrainingEnabled()) return;
    const job = await runner.claimTrainingJob();
    if (!job) return;
    logger.info(`[ocr-training-worker] running job ${job._id}`);
    const finished = await runner.runTrainingJob(job, { preflight: lastPreflight });
    logger.info(`[ocr-training-worker] job ${job._id} finished: ${finished?.status}`);
    lastPreflight = null;
  } catch (error) {
    logger.error('[ocr-training-worker] cycle failed', { error: error?.message || String(error) });
  } finally {
    busy = false;
  }
}

async function main() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required.');
  try {
    os.setPriority(19);
  } catch (_) { /* not permitted: the trainer itself still runs under nice/ionice */ }
  await mongoose.connect(process.env.MONGODB_URI, { autoIndex: false });
  logger.info(`[ocr-training-worker] started on ${os.hostname()} (training ${isTrainingEnabled() ? 'enabled' : 'disabled'})`);
  await cycle();
  const timer = setInterval(cycle, CYCLE_MS);
  const shutdown = async (signal) => {
    stopping = true;
    clearInterval(timer);
    logger.info(`[ocr-training-worker] ${signal}: stopping${busy ? ' (a running job will be marked interrupted when its lease expires)' : ''}`);
    await mongoose.disconnect().catch(() => {});
    process.exit(0);
  };
  process.once('SIGTERM', () => shutdown('SIGTERM'));
  process.once('SIGINT', () => shutdown('SIGINT'));
}

main().catch((error) => {
  logger.error('[ocr-training-worker] failed to start:', error?.message || String(error));
  process.exit(1);
});
