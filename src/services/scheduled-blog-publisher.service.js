'use strict';

const crypto = require('crypto');
const Blog = require('../models/Blog');
const {
  hasCurrentEligibleContent,
  hasCurrentPublicationReview
} = require('../utils/blog-content-eligibility');

const DEFAULT_LEASE_MS = 10 * 60 * 1000;
const DEFAULT_BATCH_SIZE = 20;

function buildDueQuery(now, staleBefore, excludeIds = []) {
  const query = {
    status: 'scheduled',
    isDeleted: { $ne: true },
    $and: [
      {
        $or: [
          { scheduledFor: { $lte: now } },
          { scheduledFor: null, publishedAt: { $lte: now } }
        ]
      },
      {
        $or: [
          { scheduledPublishClaimedAt: null },
          { scheduledPublishClaimedAt: { $exists: false } },
          { scheduledPublishClaimedAt: { $lte: staleBefore } }
        ]
      }
    ]
  };
  if (excludeIds.length) query._id = { $nin: excludeIds };
  return query;
}

async function claimDueScheduledPost({
  BlogModel = Blog,
  now = new Date(),
  workerId = `blog-publisher-${process.pid}`,
  leaseMs = DEFAULT_LEASE_MS,
  excludeIds = []
} = {}) {
  const staleBefore = new Date(now.getTime() - leaseMs);
  const claimToken = `${workerId}:${crypto.randomUUID()}`.slice(0, 120);
  return BlogModel.findOneAndUpdate(
    buildDueQuery(now, staleBefore, excludeIds),
    {
      $set: {
        scheduledPublishClaimedAt: now,
        scheduledPublishClaimedBy: claimToken,
        scheduledPublishLastAttemptAt: now,
        scheduledPublishLastError: ''
      }
    },
    { new: true, sort: { scheduledFor: 1, publishedAt: 1, _id: 1 } }
  );
}

async function publishDueScheduledPosts({
  BlogModel = Blog,
  now = new Date(),
  workerId,
  limit = DEFAULT_BATCH_SIZE,
  onPublished,
  onSkipped,
  onError
} = {}) {
  const summary = { claimed: 0, eligible: 0, published: 0, skipped: 0, failed: 0, titles: [] };
  const batchLimit = Math.max(1, Math.min(Number(limit) || DEFAULT_BATCH_SIZE, 100));
  const processedIds = [];

  for (let index = 0; index < batchLimit; index += 1) {
    const post = await claimDueScheduledPost({ BlogModel, now, workerId, excludeIds: processedIds });
    if (!post) break;
    processedIds.push(post._id);
    summary.claimed += 1;
    const claimFilter = {
      _id: post._id,
      status: 'scheduled',
      scheduledPublishClaimedBy: post.scheduledPublishClaimedBy
    };

    if (!hasCurrentEligibleContent(post) || !hasCurrentPublicationReview(post)) {
      summary.skipped += 1;
      const message = 'Content eligibility or publication review is no longer current.';
      await BlogModel.updateOne(claimFilter, {
        $inc: { scheduledPublishFailures: 1 },
        $set: { scheduledPublishLastAttemptAt: now, scheduledPublishLastError: message },
        $unset: { scheduledPublishClaimedAt: '', scheduledPublishClaimedBy: '' }
      });
      onSkipped?.(post, message);
      continue;
    }

    summary.eligible += 1;
    summary.titles.push(post.title);
    try {
      const result = await BlogModel.findOneAndUpdate(claimFilter, {
        $set: {
          status: 'published',
          publishedAt: now,
          scheduledFor: null,
          approvedAt: post.approvedAt || post.publicationReview?.reviewedAt || now,
          approvedBy: post.approvedBy || null,
          scheduledPublishFailures: 0,
          scheduledPublishLastAttemptAt: now,
          scheduledPublishLastError: ''
        },
        $unset: { scheduledPublishClaimedAt: '', scheduledPublishClaimedBy: '' }
      }, { new: true });
      if (!result) throw new Error('Scheduled post claim was lost before publication.');
      summary.published += 1;
      onPublished?.(result);
    } catch (error) {
      summary.failed += 1;
      await BlogModel.updateOne(claimFilter, {
        $inc: { scheduledPublishFailures: 1 },
        $set: {
          scheduledPublishLastAttemptAt: now,
          scheduledPublishLastError: String(error?.message || error).slice(0, 500)
        },
        $unset: { scheduledPublishClaimedAt: '', scheduledPublishClaimedBy: '' }
      }).catch(() => {});
      onError?.(post, error);
    }
  }

  return summary;
}

module.exports = {
  DEFAULT_LEASE_MS,
  buildDueQuery,
  claimDueScheduledPost,
  publishDueScheduledPosts
};
