'use strict';

require('dotenv').config();

const mongoose = require('mongoose');
const Blog = require('../models/Blog');
const {
  BLOG_CONTENT_POLICY_VERSION,
  evaluateBlogContentEligibility
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
    const posts = await Blog.find({ status: 'published', isDeleted: { $ne: true } })
      .sort({ publishedAt: 1, _id: 1 });
    const results = [];

    for (const post of posts) {
      const eligibility = evaluateBlogContentEligibility(post, { evaluatedAt: now });
      const blockingFlags = Array.from(new Set([
        ...getBlockingStoredFlags(post.moderationFlags || []).filter((flag) => String(flag).startsWith('possible_plagiarism_')),
        ...(eligibility.moderationFlags || []).filter((flag) => String(flag).startsWith('post_'))
      ]));
      const sameEligibility = post.contentEligibility?.sourceHash === eligibility.sourceHash
        && post.contentEligibility?.policyVersion === eligibility.policyVersion;
      const canApply = eligibility.eligible && blockingFlags.length === 0;
      const action = sameEligibility ? 'unchanged' : (canApply ? (mode === 'apply' ? 'updated-eligibility-only' : 'would-update-eligibility-only') : 'manual-review');

      if (mode === 'apply' && canApply && !sameEligibility) {
        const update = await Blog.updateOne(
          { _id: post._id, status: 'published', isDeleted: { $ne: true } },
          { $set: { contentEligibility: eligibility, publicationReview: null, searchIndexingStatus: 'noindex', searchIndexingReason: 'pending_value_review', indexingReview: null } },
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
        editorialOverride: false
      });
    }

    return {
      mode,
      policyVersion: BLOG_CONTENT_POLICY_VERSION,
      approveFlaggedEditorial,
      publishedPosts: posts.length,
      eligiblePosts: results.filter((item) => item.action !== 'manual-review').length,
      manualReviewPosts: results.filter((item) => item.action === 'manual-review').length,
      changedPosts: results.filter((item) => item.action.includes('update')).length,
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
