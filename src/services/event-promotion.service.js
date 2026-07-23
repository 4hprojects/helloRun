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

async function resolveAdminSelectedEmailRecipients(input, options = {}) {
  const parsed = await hydrateSelectedPromotionRecipients(input, options);
  return parsed.recipients;
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

async function dispatchEventPromotionCampaign({
  campaign,
  recipients,
  event,
  organiserName,
  source = 'event.promotion',
  adminTriggered = false,
  sendIntervalMs = SEND_INTERVAL_MS
} = {}) {
  const recipientList = Array.isArray(recipients) ? recipients.filter((runner) => runner && runner.email) : [];
  const appUrl = String(process.env.APP_URL || '').replace(/\/$/, '');
  const eventUrl = `${appUrl}/events/${event.slug}`;
  const posterUrl = event.posterImageUrl || event.bannerImageUrl || null;
  const summary = buildEmptyCampaignSummary(recipientList.length);

  for (let index = 0; index < recipientList.length; index += 1) {
    const runner = recipientList[index];
    if (index > 0) await sleep(sendIntervalMs);

    let value = null;
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
      summary.failedCount += 1;
      continue;
    }

    value = value || {};
    if (value.queued) {
      summary.queuedCount += 1;
      continue;
    }

    const status = value.email?.status;
    if (status === 'sent') {
      summary.sentCount += 1;
    } else if (status === 'suppressed') {
      summary.suppressedCount += 1;
    } else if (status === 'skipped') {
      summary.skippedCount += 1;
    } else if (status === 'failed') {
      summary.failedCount += 1;
    } else {
      summary.skippedCount += 1;
    }
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
    campaign.status = summary.status;
    await campaign.save();
    return summary;
  } catch (error) {
    campaign.status = 'failed';
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
  toObjectId,
  getParticipantIds,
  getOrganizerEventIds,
  filterEventPromotionOptOutRecipients,
  parseSelectedPromotionEmails,
  hydrateSelectedPromotionRecipients,
  resolveOrganizerPromotionRecipients,
  resolveAdminPromotionRecipients,
  resolveAutomaticPublishPromotionRecipients,
  resolveAdminSelectedEmailRecipients,
  dispatchEventPromotionCampaign,
  dispatchAndFinalizeEventPromotionCampaign,
  dispatchEventPromotionCampaignInBackground
};
