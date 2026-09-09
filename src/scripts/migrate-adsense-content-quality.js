'use strict';

require('dotenv').config();

const mongoose = require('mongoose');
const Blog = require('../models/Blog');
const User = require('../models/User');
const { EDITORIAL_TEAM_EMAIL } = require('../utils/blog-author');
const { evaluateBlogContentEligibility } = require('../utils/blog-content-eligibility');
const { INDEX_CANDIDATE_SLUGS, NOINDEX_SLUGS, getInitialIndexingClassification } = require('../content/adsense-content-indexing');

const OPERATOR_NAME = 'Henson M. Sagorsor';
const OPERATOR_SLUG = 'henson-m-sagorsor';
const OPERATOR_ROLE = 'HelloRun developer, operator, and editor';
const OPERATOR_BIO = 'Henson M. Sagorsor develops and operates HelloRun through 4HProjects in Benguet, Philippines, and edits platform guidance based on HelloRun event and submission workflows.';

function parseArguments(argv = process.argv.slice(2)) {
  const apply = argv.includes('--apply');
  const noteIndex = argv.indexOf('--evidence-note');
  const evidenceNote = noteIndex >= 0 ? String(argv[noteIndex + 1] || '').trim() : '';
  if (apply && evidenceNote.length < 40) throw new Error('--apply requires --evidence-note with at least 40 characters.');
  return { apply, evidenceNote };
}

function buildTarget(post, reviewer, evidenceNote, now) {
  const classification = getInitialIndexingClassification(post.slug);
  const indexCandidate = classification.indexCandidate;
  const contentEligibility = evaluateBlogContentEligibility({
    ...post.toObject?.() || post,
    contentRisk: classification.contentRisk
  }, { evaluatedAt: now });
  return {
    authorId: reviewer._id,
    contentRisk: classification.contentRisk,
    searchIndexingStatus: indexCandidate ? 'index' : 'noindex',
    searchIndexingReason: indexCandidate ? 'first_party_value' : (classification.contentRisk === 'health_safety' ? 'pending_expert_review' : 'pending_value_review'),
    contentEligibility,
    indexingReview: indexCandidate ? {
      sourceHash: contentEligibility.sourceHash,
      valueBasis: 'first_party_platform',
      evidenceNote,
      reviewedBy: reviewer._id,
      reviewedAt: now,
      expertReviewer: null
    } : null
  };
}

function sameReview(left, right) {
  if (!left && !right) return true;
  if (!left || !right) return false;
  return left.sourceHash === right.sourceHash
    && left.valueBasis === right.valueBasis
    && left.evidenceNote === right.evidenceNote
    && String(left.reviewedBy || '') === String(right.reviewedBy || '')
    && !left.expertReviewer && !right.expertReviewer;
}

async function migrateAdsenseContentQuality({ apply = false, evidenceNote = '', now = new Date() } = {}) {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required.');
  await mongoose.connect(process.env.MONGODB_URI);
  try {
    const reviewer = await User.findOne({ email: EDITORIAL_TEAM_EMAIL, role: 'admin', accountStatus: { $ne: 'suspended' } });
    if (!reviewer) throw new Error(`Active admin author not found: ${EDITORIAL_TEAM_EMAIL}`);
    const slugs = [...INDEX_CANDIDATE_SLUGS, ...NOINDEX_SLUGS];
    const posts = await Blog.find({ slug: { $in: slugs }, isDeleted: { $ne: true } });
    const bySlug = new Map(posts.map((post) => [post.slug, post]));
    const results = [];

    for (const slug of slugs) {
      const post = bySlug.get(slug);
      if (!post) {
        results.push({ slug, found: false, changed: false, missingReviewEvidence: INDEX_CANDIDATE_SLUGS.includes(slug) && evidenceNote.length < 40 });
        continue;
      }
      const target = buildTarget(post, reviewer, evidenceNote, now);
      if (target.searchIndexingStatus === 'index' && !target.indexingReview.sourceHash) {
        results.push({ slug, found: true, changed: false, blocked: 'missing_content_source_hash', missingReviewEvidence: true });
        continue;
      }
      const changed = post.contentRisk !== target.contentRisk
        || post.searchIndexingStatus !== target.searchIndexingStatus
        || post.searchIndexingReason !== target.searchIndexingReason
        || String(post.authorId || '') !== String(target.authorId)
        || post.contentEligibility?.sourceHash !== target.contentEligibility.sourceHash
        || post.contentEligibility?.healthReviewRequired !== target.contentEligibility.healthReviewRequired
        || !sameReview(post.indexingReview, target.indexingReview);
      results.push({
        slug,
        found: true,
        oldStatus: post.searchIndexingStatus || 'unset',
        newStatus: target.searchIndexingStatus,
        contentRisk: target.contentRisk,
        changed,
        missingReviewEvidence: target.searchIndexingStatus === 'index' && evidenceNote.length < 40
      });
      if (apply && changed) {
        if (sameReview(post.indexingReview, target.indexingReview)) target.indexingReview = post.indexingReview;
        Object.assign(post, target);
        await post.save();
      }
    }

    const authorChanged = reviewer.displayName !== OPERATOR_NAME
      || reviewer.authorSlug !== OPERATOR_SLUG
      || reviewer.authorRole !== OPERATOR_ROLE
      || reviewer.authorBio !== OPERATOR_BIO
      || reviewer.verifiedAuthor !== false
      || Number(reviewer.trustScore || 0) !== 0;
    if (apply && authorChanged) {
      reviewer.displayName = OPERATOR_NAME;
      reviewer.authorSlug = OPERATOR_SLUG;
      reviewer.authorRole = OPERATOR_ROLE;
      reviewer.authorBio = OPERATOR_BIO;
      reviewer.verifiedAuthor = false;
      reviewer.trustScore = 0;
      await reviewer.save();
    }
    return { apply, authorChanged, author: OPERATOR_NAME, expected: slugs.length, found: posts.length, results };
  } finally {
    await mongoose.disconnect();
  }
}

async function main() {
  const result = await migrateAdsenseContentQuality(parseArguments());
  console.log(JSON.stringify(result, null, 2));
}

if (require.main === module) main().catch((error) => { console.error(`${error.name}: ${error.message}`); process.exit(1); });

module.exports = { buildTarget, migrateAdsenseContentQuality, parseArguments, sameReview };
