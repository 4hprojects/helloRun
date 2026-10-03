const mongoose = require('mongoose');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const User = require('../models/User');
const { notifyWithRetry } = require('./reliable-communication.service');
const logger = require('../utils/logger');

const EVENT_PROMOTION_KEY = 'event.promotion';
// Resend allows ~2 requests/second; concurrent dispatch 429s everything past the first burst.
const SEND_INTERVAL_MS = Number(process.env.EVENT_PROMOTION_SEND_INTERVAL_MS || 600);
const ORGANIZER_PROMO_NON_PARTICIPANT_CAP = 200;
const ADMIN_PROMO_NON_PARTICIPANT_CAP = 200;
const ADMIN_PROMO_ALL_RUNNERS_CAP = 500;
const ADMIN_SELECTED_EMAILS_CAP = 500;
// Counters stay exact beyond this cap; only the per-recipient tracking list is truncated.
const PROMOTION_DELIVERY_TRACKING_CAP = 1000;
const PROMOTION_STALL_THRESHOLD_MS = 2 * 60 * 1000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function toObjectId(value) {
  const id = String(value || '').trim();
  return mongoose.Types.ObjectId.createFromHexString
    ? mongoose.Types.ObjectId.createFromHexString(id)
    : new mongoose.Types.ObjectId(id);
}

async function getParticipantIds(eventIds) {
  const ids = (eventIds || []).filter(Boolean);
  if (!ids.length) return [];
  const rows = await Registration.aggregate([
    { $match: { eventId: { $in: ids } } },
    { $group: { _id: '$userId' } }
  ]);
  return rows.map((row) => row._id).filter(Boolean);
}

async function getOrganizerEventIds(organizerId) {
  const events = await Event.find({ organizerId, isDeleted: { $ne: true } }).select('_id').lean();
  return events.map((event) => event._id);
}

async function filterEventPromotionOptOutRecipients(recipients) {
  const list = Array.isArray(recipients) ? recipients.filter((recipient) => recipient && recipient.email) : [];
  if (!list.length) return [];

  const userIds = list.map((recipient) => recipient._id).filter(Boolean);
  const optedOutRows = await User.find({
    _id: { $in: userIds },
    'notificationPreferences.emailOptOut': EVENT_PROMOTION_KEY
  }).select('_id').lean();
  const optedOutIds = new Set(optedOutRows.map((row) => String(row._id)));
  return list.filter((recipient) => !optedOutIds.has(String(recipient._id)));
}

function parseSelectedPromotionEmails(input, { limit = ADMIN_SELECTED_EMAILS_CAP } = {}) {
  const raw = String(input || '').split(/[\s,;]+/);
  const seen = new Set();
  const recipients = [];
  const invalid = [];

  for (const item of raw) {
    const email = String(item || '').trim().toLowerCase();
    if (!email) continue;
    if (!EMAIL_PATTERN.test(email)) {
      invalid.push(email);
      continue;
    }
    if (seen.has(email)) continue;
    seen.add(email);
    recipients.push({ email, firstName: 'Runner', manual: true });
    if (recipients.length >= limit) break;
  }

  return {
    recipients,
    invalid,
    capped: seen.size >= limit,
    limit
  };
}

async function hydrateSelectedPromotionRecipients(input, options = {}) {
  const parsed = parseSelectedPromotionEmails(input, options);
  if (!parsed.recipients.length) return parsed;

  const emails = parsed.recipients.map((recipient) => recipient.email);
  const users = await User.find({ email: { $in: emails } })
    .select('_id email firstName notificationPreferences')
    .lean();
  const userByEmail = new Map(users.map((user) => [String(user.email || '').toLowerCase(), user]));
  const recipients = [];
  let optedOutCount = 0;

  for (const recipient of parsed.recipients) {
    const user = userByEmail.get(recipient.email);
    if (Array.isArray(user?.notificationPreferences?.emailOptOut)
      && user.notificationPreferences.emailOptOut.includes(EVENT_PROMOTION_KEY)) {
      optedOutCount += 1;
      continue;
    }
    recipients.push(user
      ? { _id: user._id, email: recipient.email, firstName: user.firstName || 'Runner', manual: true }
      : recipient);
  }

  return {
    ...parsed,
    recipients,
    optedOutCount
  };
}

async function resolveOrganizerPromotionRecipients({ organizerId, audience }) {
  const orgEventIds = await getOrganizerEventIds(organizerId);
  if (audience === 'previous_participants') {
    const participantIds = await getParticipantIds(orgEventIds);
    if (!participantIds.length) return [];
    const recipients = await User.find({ _id: { $in: participantIds } }).select('_id email firstName').lean();
    return filterEventPromotionOptOutRecipients(recipients);
  }

  if (audience === 'non_participants') {
    const participantIds = await getParticipantIds(orgEventIds);
    const recipients = await User.find({ role: 'runner', _id: { $nin: participantIds } })
      .select('_id email firstName')
      .limit(ORGANIZER_PROMO_NON_PARTICIPANT_CAP)
      .lean();
    return filterEventPromotionOptOutRecipients(recipients);
  }

  return [];
}

async function resolveAdminPromotionRecipients({ event, audience }) {
  if (!event) return [];

  if (audience === 'previous_participants') {
    const participantIds = await getParticipantIds([event._id]);
    if (!participantIds.length) return [];
    const recipients = await User.find({ _id: { $in: participantIds } }).select('_id email firstName').lean();
    return filterEventPromotionOptOutRecipients(recipients);
  }

  if (audience === 'non_participants') {
    const orgEventIds = await getOrganizerEventIds(event.organizerId);
    const participantIds = await getParticipantIds(orgEventIds);
    const recipients = await User.find({ role: 'runner', _id: { $nin: participantIds } })
      .select('_id email firstName')
      .limit(ADMIN_PROMO_NON_PARTICIPANT_CAP)
      .lean();
    return filterEventPromotionOptOutRecipients(recipients);
  }

  if (audience === 'all_runners') {
    const recipients = await User.find({ role: 'runner' })
      .select('_id email firstName')
      .limit(ADMIN_PROMO_ALL_RUNNERS_CAP)
      .lean();
    return filterEventPromotionOptOutRecipients(recipients);
  }

  return [];
}

async function resolveAutomaticPublishPromotionRecipients() {
  const recipients = await User.find({
    role: 'runner',
    emailVerified: true,
    accountStatus: 'active',
    email: { $type: 'string', $ne: '' }
  })
    .select('_id email firstName')
    .sort({ _id: 1 })
    .lean();
  return filterEventPromotionOptOutRecipients(recipients);
}

function getCampaignStatus(summary) {
  const selectedCount = Number(summary.selectedCount || 0);
  if (selectedCount <= 0) return 'failed';
  const nonSent = Number(summary.skippedCount || 0)
    + Number(summary.suppressedCount || 0)
    + Number(summary.failedCount || 0)
    + Number(summary.queuedCount || 0);
  if (Number(summary.sentCount || 0) <= 0 && nonSent > 0) return 'failed';
  return nonSent > 0 ? 'partial' : 'completed';
}

function buildEmptyCampaignSummary(selectedCount) {
  return {
    selectedCount,
    sentCount: 0,
    skippedCount: 0,
    suppressedCount: 0,
    failedCount: 0,
    queuedCount: 0
  };
}

function sleep(ms) {
  return ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve();
}

function buildDeliveryEntries(recipients, cap = PROMOTION_DELIVERY_TRACKING_CAP) {
  const list = Array.isArray(recipients) ? recipients : [];
  const limit = Math.max(0, Number(cap) || 0);
  return {
    deliveries: list.slice(0, limit).map((recipient) => ({
      email: String(recipient?.email || '').trim().toLowerCase(),
      status: 'pending',
      reason: '',
      updatedAt: null
    })),
    truncated: list.length > limit
  };
}

function resolveDeliveryOutcome(value, error = null) {
  if (error) {
    return { status: 'failed', reason: String(error?.message || error).slice(0, 200) };
  }
  const result = value || {};
  if (result.queued) return { status: 'queued', reason: 'Queued for retry' };

  const status = result.email?.status;
  const reason = String(result.email?.reason || result.email?.error?.message || '').slice(0, 200);
  if (['sent', 'suppressed', 'skipped', 'failed'].includes(status)) return { status, reason };
  return { status: 'skipped', reason: reason || 'No delivery status returned' };
}

function isCampaignStalled(campaign, now = new Date()) {
  if (!campaign || campaign.status !== 'sending') return false;
  const lastProgress = campaign.lastProgressAt || campaign.updatedAt || campaign.createdAt;
  if (!lastProgress) return false;
  return now.getTime() - new Date(lastProgress).getTime() > PROMOTION_STALL_THRESHOLD_MS;
}

const SUMMARY_COUNTER_FIELDS = ['sentCount', 'skippedCount', 'suppressedCount', 'failedCount', 'queuedCount'];

// Progress writes are best-effort: a tracking failure must never interrupt the send loop.
function createCampaignProgressTracker(campaign) {
  const campaignId = campaign?._id;
  let trackedCount = 0;

  async function write(update) {
    if (!campaignId) return;
    try {
      const EventPromotion = require('../models/EventPromotion');
      await EventPromotion.updateOne({ _id: campaignId }, update);
    } catch (error) {
      logger.warn('[event-promotion] Progress tracking write failed:', {
        campaignId: String(campaignId),
        error: error?.message || String(error)
      });
    }
  }

  return {
    async start(recipients) {
      const { deliveries, truncated } = buildDeliveryEntries(recipients);
      trackedCount = deliveries.length;
      if (deliveries.length) deliveries[0].status = 'sending';
      await write({
        $set: {
          deliveries,
          deliveryListTruncated: truncated,
          processedCount: 0,
          lastProgressAt: new Date()
        }
      });
    },
    async record(index, outcome, summary) {
      const now = new Date();
      const set = {
        processedCount: index + 1,
        lastProgressAt: now
      };
      SUMMARY_COUNTER_FIELDS.forEach((field) => { set[field] = Number(summary[field] || 0); });
      if (index < trackedCount) {
        set[`deliveries.${index}.status`] = outcome.status;
        set[`deliveries.${index}.reason`] = outcome.reason || '';
        set[`deliveries.${index}.updatedAt`] = now;
      }
      if (index + 1 < trackedCount) {
        set[`deliveries.${index + 1}.status`] = 'sending';
      }
      await write({ $set: set });
    }
  };
}

async function dispatchEventPromotionCampaign({
  campaign,
  recipients,
  event,
  organiserName,
  source = 'event.promotion',
  adminTriggered = false,
  sendIntervalMs = SEND_INTERVAL_MS,
  progressTracker = createCampaignProgressTracker(campaign)
} = {}) {
  const recipientList = Array.isArray(recipients) ? recipients.filter((runner) => runner && runner.email) : [];
  const appUrl = String(process.env.APP_URL || '').replace(/\/$/, '');
  const eventUrl = `${appUrl}/events/${event.slug}`;
  const posterUrl = event.posterImageUrl || event.bannerImageUrl || null;
  const summary = buildEmptyCampaignSummary(recipientList.length);
  const counterByStatus = {
    sent: 'sentCount',
    suppressed: 'suppressedCount',
    skipped: 'skippedCount',
    failed: 'failedCount',
    queued: 'queuedCount'
  };

  await progressTracker.start(recipientList);

  for (let index = 0; index < recipientList.length; index += 1) {
    const runner = recipientList[index];
    if (index > 0) await sleep(sendIntervalMs);

    let value = null;
    let sendError = null;
    try {
      value = await notifyWithRetry(EVENT_PROMOTION_KEY, {
        email: {
          to: runner.email,
          firstName: runner.firstName || 'Runner',
          eventTitle: event.title || 'Event',
          posterUrl,
          eventUrl,
          organiserName,
          recipientUserId: runner._id,
          metadata: {
            campaignId: String(campaign._id),
            eventId: String(event._id),
            adminTriggered
          }
        }
      }, { source });
    } catch (error) {
      sendError = error || new Error('Send failed');
    }

    const outcome = resolveDeliveryOutcome(value, sendError);
    summary[counterByStatus[outcome.status]] += 1;
    await progressTracker.record(index, outcome, summary);
  }

  return {
    ...summary,
    status: getCampaignStatus(summary)
  };
}

async function dispatchAndFinalizeEventPromotionCampaign(options = {}) {
  const { campaign } = options;
  try {
    const summary = await dispatchEventPromotionCampaign(options);
    campaign.recipientCount = summary.selectedCount;
    campaign.selectedCount = summary.selectedCount;
    campaign.sentCount = summary.sentCount;
    campaign.skippedCount = summary.skippedCount;
    campaign.suppressedCount = summary.suppressedCount;
    campaign.failedCount = summary.failedCount;
    campaign.queuedCount = summary.queuedCount;
    campaign.processedCount = summary.selectedCount;
    campaign.status = summary.status;
    campaign.completedAt = new Date();
    await campaign.save();
    return summary;
  } catch (error) {
    campaign.status = 'failed';
    campaign.completedAt = new Date();
    await campaign.save().catch(() => {});
    throw error;
  }
}

function dispatchEventPromotionCampaignInBackground(options = {}) {
  dispatchAndFinalizeEventPromotionCampaign(options).catch((error) => {
    logger.error('[event-promotion] Background campaign dispatch failed:', {
      campaignId: String(options.campaign?._id || ''),
      error: error?.message || String(error)
    });
  });
}

module.exports = {
  EVENT_PROMOTION_KEY,
  PROMOTION_DELIVERY_TRACKING_CAP,
  PROMOTION_STALL_THRESHOLD_MS,
  toObjectId,
  getParticipantIds,
  getOrganizerEventIds,
  filterEventPromotionOptOutRecipients,
  parseSelectedPromotionEmails,
  hydrateSelectedPromotionRecipients,
  resolveOrganizerPromotionRecipients,
  resolveAdminPromotionRecipients,
  resolveAutomaticPublishPromotionRecipients,
  buildDeliveryEntries,
  resolveDeliveryOutcome,
  isCampaignStalled,
  createCampaignProgressTracker,
  dispatchEventPromotionCampaign,
  dispatchAndFinalizeEventPromotionCampaign,
  dispatchEventPromotionCampaignInBackground
};
