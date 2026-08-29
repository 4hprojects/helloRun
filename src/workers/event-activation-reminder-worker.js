const { processEventActivationReminders } = require('../services/event-activation-reminder.service');
const logger = require('../utils/logger');

const DEFAULT_INTERVAL_MS = 5 * 60 * 1000;
let timer = null;

function startEventActivationReminderWorker() {
  if (process.env.NODE_ENV === 'test' || timer) return timer;
  const parsed = Number(process.env.EVENT_REMINDER_WORKER_INTERVAL_MS || DEFAULT_INTERVAL_MS);
  const interval = Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_INTERVAL_MS;
  const run = () => processEventActivationReminders().catch((error) => {
    logger.error('[event-reminder-worker] Cycle failed:', error.message);
  });
  setTimeout(run, 15000);
  timer = setInterval(run, interval);
  if (timer.unref) timer.unref();
  logger.info(`[event-reminder-worker] Started — interval: ${interval}ms`);
  return timer;
}

module.exports = { startEventActivationReminderWorker };
