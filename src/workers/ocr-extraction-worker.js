const logger = require('../utils/logger');
const { getOcrLimits, isServerOcrPipelineEnabled, getOcrWorkerMode } = require('../services/ocr/ocr-config');
const { claimNextJob, failExhaustedJobs } = require('../services/ocr/ocr-job.service');
const { processExtractionJob } = require('../services/ocr/server-ocr.service');
const { shutdownSharedEngine } = require('../services/ocr/ocr-engine');

// Server OCR extraction worker (docs/improvement-plan/ocr-platform-aware, Phase 1).
// One job at a time per process: the shared tesseract.js engine is single-threaded by
// design so OCR cannot crowd out request handling or other apps on the host.

let timer = null;
let running = false;
let lastRetentionSweepAt = 0;
const RETENTION_SWEEP_EVERY_MS = 60 * 60 * 1000;

async function processOcrJobBatch({ maxJobs, deps = {} } = {}) {
  if (running) return { skipped: true, processed: 0 };
  running = true;
  const results = [];
  try {
    await failExhaustedJobs();
    if (Date.now() - lastRetentionSweepAt > RETENTION_SWEEP_EVERY_MS) {
      lastRetentionSweepAt = Date.now();
      // Training-sample retention: exclude expired samples and delete their crops.
      await require('../services/ocr/training-sample.service').expireSamples().catch((error) => {
        logger.warn('[ocr-extraction-worker] retention sweep failed', { error: error?.message });
      });
    }
    const limit = Number(maxJobs || getOcrLimits().jobsPerCycle);
    for (let index = 0; index < limit; index += 1) {
      const job = await claimNextJob();
      if (!job) break;
      try {
        results.push(await processExtractionJob(job, deps));
      } catch (error) {
        // processExtractionJob records its own failures; this is a last resort. The lease
        // expires and the job is retried or closed by failExhaustedJobs.
        logger.error('[ocr-extraction-worker] Job crashed:', { jobId: String(job._id), error: error?.message || String(error) });
        results.push({ jobId: String(job._id), status: 'crashed' });
      }
    }
    // Backfill of existing entries runs only after normal submission jobs; it yields on its own.
    if (results.length < limit) {
      await require('../services/ocr/ocr-backfill.service').stepBackfill({ deps }).catch((error) => {
        logger.warn('[ocr-extraction-worker] backfill step failed', { error: error?.message });
      });
    }
  } finally {
    running = false;
  }
  return { skipped: false, processed: results.length, results };
}

function stopOcrExtractionWorker() {
  if (timer) clearInterval(timer);
  timer = null;
  return shutdownSharedEngine();
}

/**
 * @param {{ force?: boolean }} options force=true is used by the standalone worker process.
 */
function startOcrExtractionWorker({ force = false } = {}) {
  if (process.env.NODE_ENV === 'test') return false;
  if (!isServerOcrPipelineEnabled()) return false;
  if (!force && getOcrWorkerMode() === 'separate') {
    logger.info('[ocr-extraction-worker] OCR_WORKER_MODE=separate — not started in the web process');
    return false;
  }
  if (timer) return true;
  const interval = getOcrLimits().pollIntervalMs;
  const run = () => processOcrJobBatch().catch((error) => {
    logger.error('[ocr-extraction-worker] Cycle failed:', error?.message || String(error));
  });
  setTimeout(run, 20000).unref?.();
  timer = setInterval(run, interval);
  if (timer.unref) timer.unref();
  logger.info(`[ocr-extraction-worker] Started — interval: ${interval}ms`);
  return true;
}

module.exports = {
  processOcrJobBatch,
  startOcrExtractionWorker,
  stopOcrExtractionWorker
};
