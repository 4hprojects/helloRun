const logger = require('../utils/logger');
const { isRemindersEnabled } = require('../services/ocr/ocr-config');
const notifications = require('../services/ocr/ocr-notification.service');

// OCR administrator reminders (docs/improvement-plan/ocr-platform-aware, Phase 5).
// In-process and cheap: a few count queries every few minutes. Safe with several
// instances because every email row is unique per (eventKey, recipient) and claimed
// before delivery. Never starts training or changes models.

const DEFAULT_INTERVAL_MS = 5 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
let timer = null;
let running = false;
let lastDatasetCheckAt = 0;
let lastRegressionCheckAt = 0;

async function runOcrMaintenanceCycle({ now = new Date(), deps = null } = {}) {
  if (running) return { skipped: true };
  running = true;
  try {
    const result = {};
    result.retries = await notifications.processDueNotifications({ now, deps });
    result.digest = await notifications.runDigestCheck({ now, deps });
    if (now.getTime() - lastDatasetCheckAt >= HOUR_MS) {
      lastDatasetCheckAt = now.getTime();
      result.datasetReady = await notifications.runDatasetReadyCheck({ now, deps });
    }
    if (now.getTime() - lastRegressionCheckAt >= 24 * HOUR_MS) {
      lastRegressionCheckAt = now.getTime();
      result.regression = await notifications.runQualityRegressionCheck({ now, deps });
    }
    return result;
  } finally {
    running = false;
  }
}

function startOcrMaintenanceWorker() {
  if (process.env.NODE_ENV === 'test') return false;
  if (!isRemindersEnabled()) return false;
  if (timer) return true;
  const interval = Number(process.env.OCR_MAINTENANCE_INTERVAL_MS || DEFAULT_INTERVAL_MS);
  const run = () => runOcrMaintenanceCycle().catch((error) => {
    logger.error('[ocr-maintenance-worker] Cycle failed:', error?.message || String(error));
  });
  setTimeout(run, 30000).unref?.();
  timer = setInterval(run, interval);
  if (timer.unref) timer.unref();
  logger.info(`[ocr-maintenance-worker] Started — interval: ${interval}ms`);
  return true;
}

module.exports = { runOcrMaintenanceCycle, startOcrMaintenanceWorker };
