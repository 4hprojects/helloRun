'use strict';
const logger = require('../utils/logger');
const { processPolicyNoticeBatch } = require('../services/policy-notice.service');

function startPolicyNoticeWorker(options = {}) {
  const interval = Number(options.intervalMs || process.env.POLICY_NOTICE_WORKER_INTERVAL_MS || 60000);
  const run = async () => { try { await processPolicyNoticeBatch(); } catch (error) { logger.error('[policy-notice-worker] Batch failed:', error.message); } };
  const startup = setTimeout(run, 1500); if (startup.unref) startup.unref();
  const timer = setInterval(run, interval); if (timer.unref) timer.unref();
  logger.info(`[policy-notice-worker] Started — interval: ${interval}ms`);
  return timer;
}
module.exports = { startPolicyNoticeWorker };
