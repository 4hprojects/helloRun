'use strict';

require('dotenv').config();

const mongoose = require('mongoose');
const Blog = require('../models/Blog');
const User = require('../models/User');
const { EDITORIAL_TEAM_EMAIL } = require('../utils/blog-author');
const {
  BLOG_CONTENT_POLICY_VERSION,
  buildTrustedEditorialReview,
  evaluateBlogContentEligibility,
  isCurrentEligibleBlog
} = require('../utils/blog-content-eligibility');

function parseArguments(argv = process.argv.slice(2)) {
  let apply = false;
  let dryRun = false;
  let approveFlaggedEditorial = false;
  for (const argument of argv) {
    if (argument === '--apply') apply = true;
    else if (argument === '--dry-run') dryRun = true;
    else if (argument === '--approve-flagged-editorial') approveFlaggedEditorial = true;
    else throw new Error(`Unsupported argument: ${argument}`);
  }
  if (apply && dryRun) throw new Error('Choose either --apply or --dry-run, not both.');
  return { mode: apply ? 'apply' : 'dry-run', approveFlaggedEditorial };
}

function getBlockingStoredFlags(flags = []) {
  return (Array.isArray(flags) ? flags : []).filter((flag) => (
    String(flag).startsWith('possible_plagiarism_') || String(flag).startsWith('post_')
  ));
}

async function backfillBlogAdsenseEligibility({ mode = 'dry-run', now = new Date(), approveFlaggedEditorial = false } = {}) {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required.');
  if (!['dry-run', 'apply'].includes(mode)) throw new Error(`Unsupported mode: ${mode}`);

  await mongoose.connect(process.env.MONGODB_URI);
  try {
    const reviewer = await User.findOne({
      email: EDITORIAL_TEAM_EMAIL,
      role: 'admin',
      emailVerified: true,
      accountStatus: { $nin: ['suspended', 'closed'] }
    }).select('_id email role').lean();
    if (!reviewer) throw new Error(`Verified active admin reviewer not found: ${EDITORIAL_TEAM_EMAIL}`);

    const posts = await Blog.find({ status: 'published', isDeleted: { $ne: true } })
      .sort({ publishedAt: 1, _id: 1 });
    const results = [];

    for (const post of posts) {
      const eligibility = evaluateBlogContentEligibility(post, { evaluatedAt: now });
      const blockingFlags = Array.from(new Set([
        ...getBlockingStoredFlags(post.moderationFlags || []).filter((flag) => String(flag).startsWith('possible_plagiarism_')),
        ...(eligibility.moderationFlags || []).filter((flag) => String(flag).startsWith('post_'))
      ]));
      const alreadyEligible = isCurrentEligibleBlog(post);
      const isEditorialPost = String(post.authorId || '') === String(reviewer._id);
      const editorialOverride = Boolean(approveFlaggedEditorial && isEditorialPost && blockingFlags.length);
      const canApply = eligibility.eligible && (blockingFlags.length === 0 || editorialOverride);
      const action = alreadyEligible ? 'unchanged' : (canApply ? (mode === 'apply' ? 'updated' : 'would-update') : 'manual-review');

      if (mode === 'apply' && canApply && !alreadyEligible) {
        const metadata = buildTrustedEditorialReview(post, reviewer._id, now);
        metadata.publicationReview.reviewSource = 'backfill_review';
        if (editorialOverride) {
          metadata.publicationReview.overrideFlags = blockingFlags;
          metadata.publicationReview.overrideReason = 'Repository-backed HelloRun editorial guide reviewed during the AdSense eligibility backfill; promotional terms are descriptive platform context, not spam.';
        }
        const update = await Blog.updateOne(
          { _id: post._id, status: 'published', isDeleted: { $ne: true } },
          { $set: metadata },
          { runValidators: true }
        );
        if (update.matchedCount !== 1) throw new Error(`Backfill lost the published record for ${post.slug}.`);
      }

      results.push({
        slug: post.slug,
        action,
        wordCount: eligibility.wordCount,
        semanticUnitCount: eligibility.semanticUnitCount,
        externalLinkCount: eligibility.externalLinkCount,
        healthReviewRequired: eligibility.healthReviewRequired,
        blockingReasons: eligibility.blockingReasons,
        moderationFlags: blockingFlags,
        editorialOverride
      });
    }

    return {
      mode,
      policyVersion: BLOG_CONTENT_POLICY_VERSION,
      reviewerEmail: reviewer.email,
      approveFlaggedEditorial,
      publishedPosts: posts.length,
      eligiblePosts: results.filter((item) => item.action !== 'manual-review').length,
      manualReviewPosts: results.filter((item) => item.action === 'manual-review').length,
      changedPosts: results.filter((item) => ['updated', 'would-update'].includes(item.action)).length,
      results
    };
  } finally {
    await mongoose.disconnect();
  }
}

async function main() {
  const result = await backfillBlogAdsenseEligibility(parseArguments());
  console.log(JSON.stringify(result, null, 2));
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`${error.name}: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  backfillBlogAdsenseEligibility,
  getBlockingStoredFlags,
  parseArguments
};
