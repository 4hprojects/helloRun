'use strict';

// Offers expire on a clock, and nothing else is watching it.
//
// An offer holds a real slot. Without this worker an unclaimed offer holds it forever, so
// the capacity an organiser thought they had quietly disappears one abandoned offer at a
// time — and the people still waiting are never told, because from their side nothing
// happened. This is the only thing that closes that loop.

const logger = require('../utils/logger');
const { processExpiredOffers } = require('../services/waitlist.service');

function startWaitlistOfferWorker(options = {}) {
  // Five minutes: offer windows are measured in hours, so a tighter loop would only add
  // queries. The cost of the delay is bounded by the interval, not by the offer length.
  const interval = Number(options.intervalMs || process.env.WAITLIST_OFFER_WORKER_INTERVAL_MS || 300000);

  const run = async () => {
    try {
      const { expired, reoffered } = await processExpiredOffers();
      // Silent when there is nothing to do, so the log stays readable.
      if (expired > 0) {
        logger.info(`[waitlist-offer-worker] Expired ${expired} offer(s), re-offered ${reoffered}`);
      }
    } catch (error) {
      logger.error('[waitlist-offer-worker] Batch failed:', error.message);
    }
  };

  const startup = setTimeout(run, 2000); if (startup.unref) startup.unref();
  const timer = setInterval(run, interval); if (timer.unref) timer.unref();
  logger.info(`[waitlist-offer-worker] Started — interval: ${interval}ms`);
  return timer;
}

module.exports = { startWaitlistOfferWorker };
