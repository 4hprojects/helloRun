// publish-scheduled-blogs.js
// Script to auto-publish scheduled blog posts whose scheduledFor <= now.
// The publishedAt fallback supports records created before scheduledFor existed.

require('dotenv').config();

const mongoose = require('mongoose');
const Blog = require('../models/Blog');
const {
  hasCurrentEligibleContent,
  hasCurrentPublicationReview,
} = require('../utils/blog-content-eligibility');
const { publishDueScheduledPosts } = require('../services/scheduled-blog-publisher.service');
const MONGODB_URI = process.env.MONGODB_URI;

async function publishEligibleScheduledPosts({ BlogModel = Blog, now = new Date(), dryRun = false } = {}) {
  if (!dryRun) {
    return publishDueScheduledPosts({
      BlogModel,
      now,
      workerId: `cron-${process.pid}`,
      onPublished: (post) => console.log(`Published scheduled post: ${post.title} (${post._id})`),
      onSkipped: (post) => console.error(`Skipped ineligible scheduled post: ${post.title} (${post._id})`),
      onError: (post, error) => console.error(`Failed scheduled post: ${post.title} (${post._id}): ${error.message}`)
    });
  }
  const scheduledPosts = await BlogModel.find({
    status: 'scheduled',
    $or: [
      { scheduledFor: { $lte: now } },
      { scheduledFor: null, publishedAt: { $lte: now } }
    ],
    isDeleted: { $ne: true }
  });
  const summary = { eligible: 0, published: 0, skipped: 0, titles: [] };
  for (const post of scheduledPosts) {
    if (!hasCurrentEligibleContent(post) || !hasCurrentPublicationReview(post)) {
      console.error(`Skipped ineligible scheduled post: ${post.title} (${post._id})`);
      summary.skipped += 1;
      continue;
    }
    summary.eligible += 1;
    summary.titles.push(post.title);
    if (dryRun) continue;
  }
  return summary;
}

async function main() {
  if (!MONGODB_URI) throw new Error('MONGODB_URI is required.');
  const dryRun = process.argv.includes('--dry-run');
  await mongoose.connect(MONGODB_URI);
  try {
    const summary = await publishEligibleScheduledPosts({ now: new Date(), dryRun });
    if (!summary.eligible && !summary.skipped) console.log('No scheduled posts to publish.');
    console.log(JSON.stringify({ dryRun, ...summary }, null, 2));
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  main().catch(err => {
    console.error('Error publishing scheduled blogs:', err);
    process.exit(1);
  });
}

module.exports = {
  main,
  publishEligibleScheduledPosts
};
