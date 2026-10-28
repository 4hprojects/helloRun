'use strict';

const { runActiveQuestSchedulerCycle } = require('../services/active-quest-scheduler.service');
const logger = require('../utils/logger');

const DEFAULT_INTERVAL_MS = 24 * 60 * 60 * 1000;
let timer = null;
let running = false;

async function runActiveQuestSchedulerWorkerCycle() {
  if (running) return { status: 'already_running' };
  running = true;
  try {
    return await runActiveQuestSchedulerCycle();
  } finally {
    running = false;
  }
}

function startActiveQuestSchedulerWorker() {
  if (process.env.NODE_ENV === 'test' || timer) return timer;
  const configured = Number(process.env.ACTIVE_QUEST_SCHEDULER_INTERVAL_MS || DEFAULT_INTERVAL_MS);
  const interval = Number.isFinite(configured) && configured >= 60000 ? configured : DEFAULT_INTERVAL_MS;
  const run = () => runActiveQuestSchedulerWorkerCycle().catch((error) => {
    logger.error('[active-quest-scheduler] Cycle failed:', error.message);
  });
  setTimeout(run, 30000);
  timer = setInterval(run, interval);
  if (timer.unref) timer.unref();
  logger.info(`[active-quest-scheduler] Started — interval: ${interval}ms`);
  return timer;
}

module.exports = { runActiveQuestSchedulerWorkerCycle, startActiveQuestSchedulerWorker };
