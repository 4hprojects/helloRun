'use strict';

require('dotenv').config();

const fs = require('node:fs');
const path = require('node:path');
const mongoose = require('mongoose');
const Blog = require('../models/Blog');
const User = require('../models/User');
const { POSTS } = require('./seed-adsense-blog-posts');
const { getArticleModule, listArticleSlugs } = require('../content/adsense-blog-article-registry');
const { EDITORIAL_TEAM_EMAIL } = require('../utils/blog-author');
const { buildTrustedEditorialReview, evaluateBlogContentEligibility } = require('../utils/blog-content-eligibility');
const { getInitialIndexingClassification } = require('../content/adsense-content-indexing');

const GUIDE_AUTHOR_EMAIL = EDITORIAL_TEAM_EMAIL;

function parseArguments(argv = process.argv.slice(2)) {
  let slug = '';
  let apply = false;
  let dryRun = false;
  let publishAt = '';
  let confirmEditorialReview = false;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--slug') {
      slug = String(argv[index + 1] || '').trim();
      index += 1;
    } else if (argument === '--apply') {
      apply = true;
    } else if (argument === '--dry-run') {
      dryRun = true;
    } else if (argument === '--publish-at') {
      publishAt = String(argv[index + 1] || '').trim();
      index += 1;
    } else if (argument === '--confirm-editorial-review') {
      confirmEditorialReview = true;
    } else {
      throw new Error(`Unsupported argument: ${argument}`);
    }
  }

  if (!slug) throw new Error(`--slug is required. Available slugs: ${listArticleSlugs().join(', ')}`);
  if (apply && dryRun) throw new Error('Choose either --apply or --dry-run, not both.');
  if (!getArticleModule(slug)) throw new Error(`Unknown AdSense article slug: ${slug}. Available slugs: ${listArticleSlugs().join(', ')}`);
  if (publishAt && Number.isNaN(new Date(publishAt).getTime())) throw new Error('--publish-at must be a valid ISO timestamp.');

  const parsed = { slug, mode: apply ? 'apply' : 'dry-run' };
  if (confirmEditorialReview) parsed.confirmEditorialReview = true;
  if (publishAt) parsed.publishAt = publishAt;
  return parsed;
}

function validateCoverImageUrl(coverImageUrl) {
  const value = String(coverImageUrl || '').trim();
  if (/^https:\/\/cdn\.hellorun\.online\/blog\/covers\/[a-z0-9-]+\.webp$/i.test(value)) return value;
  if (!/^\/images\/blog\/covers\/[a-z0-9-]+\.webp$/.test(value)) {
    throw new Error('Cover must be a HelloRun CDN asset or a safe repository-local /images/blog/covers/*.webp asset.');
  }

  const coversRoot = fs.realpathSync(path.join(__dirname, '..', 'public', 'images', 'blog', 'covers'));
  const assetPath = path.join(__dirname, '..', 'public', value.slice(1));
  if (!fs.existsSync(assetPath)) throw new Error(`Repository-local blog cover does not exist: ${value}`);
  const resolvedAssetPath = fs.realpathSync(assetPath);
  if (!resolvedAssetPath.startsWith(`${coversRoot}${path.sep}`) || !fs.statSync(resolvedAssetPath).isFile()) {
    throw new Error(`Unsafe repository-local blog cover: ${value}`);
  }
  return value;
}

function getCanonicalSeed(slug) {
  const matches = POSTS.filter((post) => post.slug === slug);
  if (matches.length !== 1) {
    throw new Error(`Expected exactly one canonical seed entry for ${slug}; found ${matches.length}.`);
  }
  return matches[0];
}

function buildCreatePayload({ slug, authorId, now = new Date(), publishAt = null, confirmEditorialReview = false }) {
  const articleModule = getArticleModule(slug);
  if (!articleModule) throw new Error(`Unknown AdSense article slug: ${slug}`);
  if (!authorId) throw new Error('Existing guide author is required.');

  const seed = getCanonicalSeed(slug);
  const coverImageUrl = validateCoverImageUrl(seed.coverImageUrl);

  const editorialPayload = articleModule.buildArticlePayload({ coverImageUrl });
  const reviewedAt = new Date(now);
  if (Number.isNaN(reviewedAt.getTime())) throw new Error('A valid review timestamp is required.');
  const scheduledAt = publishAt ? new Date(publishAt) : null;
  if (scheduledAt && Number.isNaN(scheduledAt.getTime())) throw new Error('A valid scheduled publication timestamp is required.');
  if (scheduledAt && scheduledAt <= reviewedAt) throw new Error('Scheduled publication timestamp must be in the future.');
  const publishedAt = scheduledAt || reviewedAt;
  const status = scheduledAt ? 'scheduled' : 'published';

  const payload = {
    authorId,
    slug,
    ...editorialPayload,
    templateKey: 'custom',
    coverImageUrl,
    galleryImageUrls: [],
    status,
    featured: false,
    views: 0,
    likesCount: 0,
    commentsCount: 0,
    isDeleted: false,
    publishedAt,
    approvedAt: status === 'published' ? reviewedAt : null,
    rejectionReason: '',
    moderationNotes: '',
    moderationFlags: [],
    moderationFlagSummary: ''
  };
  const classification = getInitialIndexingClassification(slug);
  payload.contentRisk = classification.contentRisk;
  if (confirmEditorialReview) {
    Object.assign(payload, buildTrustedEditorialReview(payload, authorId, reviewedAt));
  } else {
    payload.contentEligibility = evaluateBlogContentEligibility(payload, { evaluatedAt: reviewedAt });
    payload.publicationReview = null;
  }
  payload.searchIndexingStatus = 'noindex';
  payload.searchIndexingReason = classification.contentRisk === 'health_safety' ? 'pending_expert_review' : 'pending_value_review';
  payload.indexingReview = null;

  const validationError = new Blog(payload).validateSync();
  if (validationError) throw validationError;
  return payload;
}

async function createAdsenseBlog({ slug, mode = 'dry-run', now = new Date(), publishAt = null, confirmEditorialReview = false } = {}) {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required.');
  if (!['dry-run', 'apply'].includes(mode)) throw new Error(`Unsupported create mode: ${mode}`);
  if (mode === 'apply' && !confirmEditorialReview) throw new Error('Apply mode requires confirmed editorial review.');
  if (!getArticleModule(slug)) throw new Error(`Unknown AdSense article slug: ${slug}`);

  await mongoose.connect(process.env.MONGODB_URI);
  try {
    const matchCount = await Blog.countDocuments({ slug });
    if (matchCount !== 0) {
      throw new Error(`Canonical blog record for ${slug} must be absent before creation; found ${matchCount}.`);
    }

    const author = await User.findOne({ email: GUIDE_AUTHOR_EMAIL, emailVerified: true, role: 'admin' }).select('_id email role').lean();
    if (!author) throw new Error(`Existing verified admin guide author not found: ${GUIDE_AUTHOR_EMAIL}`);

    const payload = buildCreatePayload({ slug, authorId: author._id, now, publishAt, confirmEditorialReview });
    let createdId = null;

    if (mode === 'apply') {
      const created = await Blog.create(payload);
      createdId = String(created._id);
    }

    return {
      mode,
      action: mode === 'apply' ? 'created' : 'would-create',
      slug,
      title: payload.title,
      authorEmail: author.email,
      authorId: String(author._id),
      createdId,
      publishedAt: payload.publishedAt.toISOString(),
      status: payload.status,
      featured: payload.featured,
      coverImageUrl: payload.coverImageUrl,
      wordCount: payload.contentText.split(/\s+/).filter(Boolean).length,
      readingTime: payload.readingTime,
      publicationReviewRecorded: Boolean(payload.publicationReview),
      searchIndexingStatus: payload.searchIndexingStatus,
      initialEngagement: {
        views: payload.views,
        likesCount: payload.likesCount,
        commentsCount: payload.commentsCount
      }
    };
  } finally {
    await mongoose.disconnect();
  }
}

async function main() {
  const options = parseArguments();
  const result = await createAdsenseBlog(options);
  console.log(JSON.stringify(result, null, 2));
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`${error.name}: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  GUIDE_AUTHOR_EMAIL,
  buildCreatePayload,
  createAdsenseBlog,
  getCanonicalSeed,
  parseArguments,
  validateCoverImageUrl
};
