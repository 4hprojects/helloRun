const Event = require('../models/Event');
const EventPromotion = require('../models/EventPromotion');
const {
  resolveAutomaticPublishPromotionRecipients,
  dispatchAndFinalizeEventPromotionCampaign
} = require('../services/event-promotion.service');
const logger = require('../utils/logger');
const { generateDefaultEventBadges } = require('../services/event-badge.service');

const DEFAULT_INTERVAL_MS = 5 * 60 * 1000;
const STALE_CLAIM_MS = 2 * 60 * 60 * 1000;
const MAX_EVENTS_PER_CYCLE = 3;

function buildAutomaticPromotionKey(eventId) {
  return `event-publish:${String(eventId)}`;
}

function buildDateKey(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: process.env.PLATFORM_TIMEZONE || 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
}

async function claimDueEvent(now = new Date()) {
  const staleBefore = new Date(now.getTime() - STALE_CLAIM_MS);
  return Event.findOneAndUpdate(
    {
      status: 'published',
      isDeleted: { $ne: true },
      autoEmailPromotionEnabled: true,
      autoEmailPromotionScheduledAt: { $lte: now },
      $or: [
        { autoEmailPromotionStatus: 'pending' },
        { autoEmailPromotionStatus: 'sending', autoEmailPromotionClaimedAt: { $lte: staleBefore } }
      ]
    },
    {
      $set: {
        autoEmailPromotionStatus: 'sending',
        autoEmailPromotionClaimedAt: now,
        autoEmailPromotionLastError: ''
      },
      $inc: { autoEmailPromotionAttemptCount: 1 }
    },
    { new: true, sort: { autoEmailPromotionScheduledAt: 1, _id: 1 } }
  );
}

async function getOrCreateAutomaticCampaign(event, recipients, now = new Date()) {
  const automaticKey = buildAutomaticPromotionKey(event._id);
  const campaign = await EventPromotion.findOneAndUpdate(
    { automaticKey },
    {
      $setOnInsert: {
        organizerId: event.organizerId,
        eventId: event._id,
        audience: 'all_runners',
        recipientCount: recipients.length,
        selectedCount: recipients.length,
        dateKey: buildDateKey(now),
        status: 'sending',
        adminTriggered: false,
        source: 'automatic_publish',
        automaticKey,
        sentAt: now
      }
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  await Event.updateOne(
    { _id: event._id },
    { $set: { autoEmailPromotionCampaignId: campaign._id } }
  );
  return campaign;
}

async function finishEventPromotion(event, campaign, status, now = new Date(), errorMessage = '') {
  await Event.updateOne(
    { _id: event._id },
    {
      $set: {
        autoEmailPromotionStatus: status,
        autoEmailPromotionCampaignId: campaign?._id || event.autoEmailPromotionCampaignId || null,
        autoEmailPromotionCompletedAt: ['completed', 'partial'].includes(status) ? now : null,
        autoEmailPromotionLastError: String(errorMessage || '').slice(0, 500)
      }
    }
  );
}

async function processClaimedEvent(event, now = new Date()) {
  if (event.digitalBadgeEnabled) {
    await generateDefaultEventBadges(event, { performedBy: event.approvedBy || event.organizerId });
  }
  const recipients = await resolveAutomaticPublishPromotionRecipients();
  const campaign = await getOrCreateAutomaticCampaign(event, recipients, now);

  if (['completed', 'partial'].includes(campaign.status)) {
    await finishEventPromotion(event, campaign, campaign.status, now);
    return { eventId: event._id, campaignId: campaign._id, status: campaign.status, reused: true };
  }

  if (!recipients.length) {
    campaign.status = 'completed';
    campaign.recipientCount = 0;
    campaign.selectedCount = 0;
    await campaign.save();
    await finishEventPromotion(event, campaign, 'completed', now);
    return { eventId: event._id, campaignId: campaign._id, status: 'completed', selectedCount: 0 };
  }

  const summary = await dispatchAndFinalizeEventPromotionCampaign({
    campaign,
    recipients,
    event,
    organiserName: event.organiserName || 'HelloRun',
    source: 'event.promotion.automatic_publish',
    adminTriggered: false
  });
  const eventStatus = summary.status === 'completed' ? 'completed' : (summary.status === 'partial' ? 'partial' : 'failed');
  await finishEventPromotion(event, campaign, eventStatus, new Date());
  return { eventId: event._id, campaignId: campaign._id, ...summary };
}

async function processDueEventPromotions({ now = new Date(), limit = MAX_EVENTS_PER_CYCLE } = {}) {
  const results = [];
  for (let index = 0; index < limit; index += 1) {
    const event = await claimDueEvent(now);
    if (!event) break;
    try {
      results.push(await processClaimedEvent(event, now));
    } catch (error) {
      await finishEventPromotion(event, null, 'failed', new Date(), error?.message || String(error));
      logger.error('[event-promotion-worker] Automatic publish promotion failed:', {
        eventId: String(event._id),
        error: error?.message || String(error)
      });
      results.push({ eventId: event._id, status: 'failed', error: error?.message || String(error) });
    }
  }
  return results;
}

let timer = null;

function startEventPromotionWorker() {
  if (process.env.NODE_ENV === 'test') return;
  const interval = Number(process.env.EVENT_PROMOTION_WORKER_INTERVAL_MS || DEFAULT_INTERVAL_MS);
  const run = () => processDueEventPromotions().catch((error) => {
    logger.error('[event-promotion-worker] Cycle failed:', error?.message || String(error));
  });
  setTimeout(run, 15000);
  timer = setInterval(run, interval);
  if (timer.unref) timer.unref();
  logger.info(`[event-promotion-worker] Started — interval: ${interval}ms`);
}

module.exports = {
  buildAutomaticPromotionKey,
  buildDateKey,
  claimDueEvent,
  getOrCreateAutomaticCampaign,
  processClaimedEvent,
  processDueEventPromotions,
  startEventPromotionWorker
};
