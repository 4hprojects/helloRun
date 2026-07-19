'use strict';

const PrivacyPolicy = require('../models/PrivacyPolicy');
const Notification = require('../models/Notification');
const User = require('../models/User');

const TERMS_SLUG = 'terms-of-service';
const DATA_USAGE_SLUG = 'data-usage-policy';
const ACCEPTABLE_USE_SLUG = 'acceptable-use-policy';
const ORGANISER_TERMS_SLUG = 'organiser-terms';
const COMMUNITY_GUIDELINES_SLUG = 'community-guidelines';
const REFUND_POLICY_SLUG = 'refund-and-cancellation-policy';
const COOKIE_POLICY_SLUG = 'cookie-policy';
const PRIVACY_POLICY_SLUG = 'privacy-policy';
const BATCH_SIZE = 250;
const LOCK_MS = 5 * 60 * 1000;

const NOTICE_CONFIG = Object.freeze({
  [PRIVACY_POLICY_SLUG]: {
    type: 'privacy_policy_updated',
    title: 'HelloRun Privacy Policy has been updated',
    href: '/privacy#policy-changes',
    dedupePrefix: 'privacy-policy',
    fallback: (version) => `Version ${version} of the HelloRun Privacy Policy is now effective.`
  },
  [TERMS_SLUG]: {
    type: 'terms_policy_updated',
    title: 'HelloRun Terms have been updated',
    href: '/terms#terms-changes',
    dedupePrefix: 'terms-policy',
    fallback: (version) => `Version ${version} of the HelloRun Terms and Conditions is now effective.`
  },
  [DATA_USAGE_SLUG]: {
    type: 'data_usage_policy_updated',
    title: 'HelloRun data-use guidance has been updated',
    href: '/data-usage-policy#policy-changes',
    dedupePrefix: 'data-usage-policy',
    fallback: (version) => `Version ${version} of the HelloRun Data Usage Policy is now effective.`
  },
  [ACCEPTABLE_USE_SLUG]: {
    type: 'acceptable_use_policy_updated',
    title: 'HelloRun acceptable-use rules have been updated',
    href: '/acceptable-use-policy#policy-changes',
    dedupePrefix: 'acceptable-use-policy',
    fallback: (version) => `Version ${version} of the HelloRun Acceptable Use Policy is now effective.`
  },
  [ORGANISER_TERMS_SLUG]: {
    type: 'organiser_terms_updated',
    title: 'HelloRun Organiser Terms have been updated',
    href: '/organiser-terms#policy-changes',
    dedupePrefix: 'organiser-terms',
    audienceQuery: { role: 'organiser' },
    fallback: (version) => `Version ${version} of the HelloRun Organiser Terms is now effective.`
  },
  [COMMUNITY_GUIDELINES_SLUG]: {
    type: 'community_guidelines_updated',
    title: 'HelloRun Community Guidelines have been updated',
    href: '/community-guidelines#policy-changes',
    dedupePrefix: 'community-guidelines',
    fallback: (version) => `Version ${version} of the HelloRun Community Guidelines is now effective.`
  },
  [REFUND_POLICY_SLUG]: {
    type: 'refund_policy_updated',
    title: 'HelloRun Refund and Cancellation Policy has been updated',
    href: '/refund-and-cancellation-policy#policy-changes',
    dedupePrefix: 'refund-policy',
    fallback: (version) => `Version ${version} of the HelloRun Refund and Cancellation Policy is now effective.`
  },
  [COOKIE_POLICY_SLUG]: {
    type: 'cookie_policy_updated',
    title: 'HelloRun Cookie Policy has been updated',
    href: '/cookie-policy#policy-changes',
    dedupePrefix: 'cookie-policy',
    fallback: (version) => `Version ${version} of the HelloRun Cookie Policy is now effective.`
  }
});

function buildPolicyNotice(policy = {}) {
  const config = NOTICE_CONFIG[String(policy.slug || TERMS_SLUG)] || NOTICE_CONFIG[TERMS_SLUG];
  const version = String(policy.versionNumber || '').trim();
  const summary = String(policy.summaryOfChanges || '').trim();
  return {
    type: config.type,
    title: config.title,
    message: summary ? `Version ${version} is now effective. ${summary}`.slice(0, 600) : config.fallback(version),
    href: config.href,
    dedupeKey: `${config.dedupePrefix}:${String(policy._id || '')}`,
    metadata: { policyId: String(policy._id || ''), policyVersion: version, policySlug: String(policy.slug || TERMS_SLUG) }
  };
}

function buildTermsNotice(policy = {}) {
  return buildPolicyNotice({ ...policy, slug: TERMS_SLUG });
}

function buildDataUsageNotice(policy = {}) {
  return buildPolicyNotice({ ...policy, slug: DATA_USAGE_SLUG });
}

function buildAcceptableUseNotice(policy = {}) {
  return buildPolicyNotice({ ...policy, slug: ACCEPTABLE_USE_SLUG });
}

function buildOrganiserTermsNotice(policy = {}) {
  return buildPolicyNotice({ ...policy, slug: ORGANISER_TERMS_SLUG });
}

function buildCommunityGuidelinesNotice(policy = {}) {
  return buildPolicyNotice({ ...policy, slug: COMMUNITY_GUIDELINES_SLUG });
}

function buildRefundPolicyNotice(policy = {}) {
  return buildPolicyNotice({ ...policy, slug: REFUND_POLICY_SLUG });
}

function buildCookiePolicyNotice(policy = {}) {
  return buildPolicyNotice({ ...policy, slug: COOKIE_POLICY_SLUG });
}

function buildPrivacyPolicyNotice(policy = {}) {
  return buildPolicyNotice({ ...policy, slug: PRIVACY_POLICY_SLUG });
}

async function processPolicyNoticeBatch(options = {}) {
  const Policy = options.Policy || PrivacyPolicy;
  const Users = options.Users || User;
  const Notifications = options.Notifications || Notification;
  const now = options.now || new Date();
  const staleAt = new Date(now.getTime() - LOCK_MS);
  const policy = await Policy.findOneAndUpdate(
    {
      slug: { $in: Object.keys(NOTICE_CONFIG) },
      status: 'published',
      'noticeDispatch.status': { $in: ['pending', 'processing', 'failed'] },
      $or: [{ 'noticeDispatch.lockedAt': null }, { 'noticeDispatch.lockedAt': { $lt: staleAt } }]
    },
    { $set: { 'noticeDispatch.status': 'processing', 'noticeDispatch.lockedAt': now, 'noticeDispatch.lastError': '' }, $inc: { 'noticeDispatch.attemptCount': 1 } },
    { new: true, sort: { publishedAt: 1 } }
  ).lean();
  if (!policy) return { processed: 0, status: 'idle' };

  try {
    const config = NOTICE_CONFIG[String(policy.slug || TERMS_SLUG)] || NOTICE_CONFIG[TERMS_SLUG];
    const query = { accountStatus: { $ne: 'closed' }, createdAt: { $lte: policy.noticeDispatch.audienceBeforeAt || policy.publishedAt || now }, ...(config.audienceQuery || {}) };
    if (policy.noticeDispatch.lastUserId) query._id = { $gt: policy.noticeDispatch.lastUserId };
    const users = await Users.find(query).select('_id').sort({ _id: 1 }).limit(options.batchSize || BATCH_SIZE).lean();
    if (!users.length) {
      await Policy.updateOne({ _id: policy._id, 'noticeDispatch.lockedAt': now }, { $set: { 'noticeDispatch.status': 'completed', 'noticeDispatch.completedAt': new Date(), 'noticeDispatch.lockedAt': null } });
      return { processed: 0, status: 'completed' };
    }

    const notice = buildPolicyNotice(policy);
    await Notifications.bulkWrite(users.map((user) => ({
      updateOne: {
        filter: { userId: user._id, dedupeKey: notice.dedupeKey },
        update: { $setOnInsert: { userId: user._id, ...notice, readAt: null, archivedAt: null } },
        upsert: true
      }
    })), { ordered: false });

    await Policy.updateOne(
      { _id: policy._id, 'noticeDispatch.lockedAt': now },
      { $set: { 'noticeDispatch.status': 'pending', 'noticeDispatch.lastUserId': users[users.length - 1]._id, 'noticeDispatch.lockedAt': null }, $inc: { 'noticeDispatch.processedCount': users.length } }
    );
    return { processed: users.length, status: 'pending' };
  } catch (error) {
    await Policy.updateOne({ _id: policy._id }, { $set: { 'noticeDispatch.status': 'failed', 'noticeDispatch.lockedAt': null, 'noticeDispatch.lastError': String(error.message || error).slice(0, 500) } });
    throw error;
  }
}

const processTermsNoticeBatch = processPolicyNoticeBatch;

module.exports = {
  ACCEPTABLE_USE_SLUG,
  BATCH_SIZE,
  COMMUNITY_GUIDELINES_SLUG,
  COOKIE_POLICY_SLUG,
  DATA_USAGE_SLUG,
  LOCK_MS,
  NOTICE_CONFIG,
  ORGANISER_TERMS_SLUG,
  PRIVACY_POLICY_SLUG,
  REFUND_POLICY_SLUG,
  TERMS_SLUG,
  buildAcceptableUseNotice,
  buildCommunityGuidelinesNotice,
  buildCookiePolicyNotice,
  buildDataUsageNotice,
  buildOrganiserTermsNotice,
  buildPrivacyPolicyNotice,
  buildRefundPolicyNotice,
  buildPolicyNotice,
  buildTermsNotice,
  processPolicyNoticeBatch,
  processTermsNoticeBatch
};
