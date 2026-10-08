'use strict';

const logger = require('../utils/logger');
const { processRevocationJobs } = require('../services/strava.service');
const { processWebhookEvents } = require('../services/strava-webhook.service');

let timer = null;

async function runStravaLifecycleCycle() {
  const [revocations, webhooks] = await Promise.all([
    processRevocationJobs(),
    processWebhookEvents()
  ]);
  return { revocations, webhooks };
}

function startStravaLifecycleWorker(options = {}) {
  if (process.env.NODE_ENV === 'test') return null;
  const interval = Number(options.intervalMs || process.env.STRAVA_LIFECYCLE_WORKER_INTERVAL_MS || 60_000);
  const run = () => runStravaLifecycleCycle().catch((error) => {
    logger.error('[strava-lifecycle-worker] Cycle failed:', error.message);
  });
  const startup = setTimeout(run, 3000);
  if (startup.unref) startup.unref();
  timer = setInterval(run, interval);
  if (timer.unref) timer.unref();
  const cleanup = () => { if (timer) clearInterval(timer); timer = null; };
  process.once('SIGTERM', cleanup);
  process.once('SIGINT', cleanup);
  return timer;
}

module.exports = { runStravaLifecycleCycle, startStravaLifecycleWorker };
