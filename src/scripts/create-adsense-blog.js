'use strict';

require('dotenv').config();

const mongoose = require('mongoose');
const Blog = require('../models/Blog');
const User = require('../models/User');
const { POSTS } = require('./seed-adsense-blog-posts');
const { getArticleModule, listArticleSlugs } = require('../content/adsense-blog-article-registry');
const { EDITORIAL_TEAM_EMAIL } = require('../utils/blog-author');
const { buildTrustedEditorialReview } = require('../utils/blog-content-eligibility');

const GUIDE_AUTHOR_EMAIL = EDITORIAL_TEAM_EMAIL;

function parseArguments(argv = process.argv.slice(2)) {
  let slug = '';
  let apply = false;
  let dryRun = false;
  let publishAt = '';

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
    } else {
      throw new Error(`Unsupported argument: ${argument}`);
    }
  }

  if (!slug) throw new Error(`--slug is required. Available slugs: ${listArticleSlugs().join(', ')}`);
  if (apply && dryRun) throw new Error('Choose either --apply or --dry-run, not both.');
  if (!getArticleModule(slug)) throw new Error(`Unknown AdSense article slug: ${slug}. Available slugs: ${listArticleSlugs().join(', ')}`);
  if (publishAt && Number.isNaN(new Date(publishAt).getTime())) throw new Error('--publish-at must be a valid ISO timestamp.');

  const parsed = { slug, mode: apply ? 'apply' : 'dry-run' };
  if (publishAt) parsed.publishAt = publishAt;
  return parsed;
}

function getCanonicalSeed(slug) {
  const matches = POSTS.filter((post) => post.slug === slug);
  if (matches.length !== 1) {
    throw new Error(`Expected exactly one canonical seed entry for ${slug}; found ${matches.length}.`);
  }
  return matches[0];
}

function buildCreatePayload({ slug, authorId, now = new Date(), publishAt = null }) {
  const articleModule = getArticleModule(slug);
  if (!articleModule) throw new Error(`Unknown AdSense article slug: ${slug}`);
  if (!authorId) throw new Error('Existing guide author is required.');

  const seed = getCanonicalSeed(slug);
  const coverImageUrl = String(seed.coverImageUrl || '').trim();
  if (!/^https:\/\/cdn\.hellorun\.online\/blog\/covers\//i.test(coverImageUrl)) {
    throw new Error('A HelloRun CDN blog cover is required before creating the article.');
  }

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
  Object.assign(payload, buildTrustedEditorialReview(payload, authorId, reviewedAt));

  const validationError = new Blog(payload).validateSync();
  if (validationError) throw validationError;
  return payload;
}

async function createAdsenseBlog({ slug, mode = 'dry-run', now = new Date(), publishAt = null } = {}) {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required.');
  if (!['dry-run', 'apply'].includes(mode)) throw new Error(`Unsupported create mode: ${mode}`);
  if (!getArticleModule(slug)) throw new Error(`Unknown AdSense article slug: ${slug}`);

  await mongoose.connect(process.env.MONGODB_URI);
  try {
    const matchCount = await Blog.countDocuments({ slug });
    if (matchCount !== 0) {
      throw new Error(`Canonical blog record for ${slug} must be absent before creation; found ${matchCount}.`);
    }

    const author = await User.findOne({ email: GUIDE_AUTHOR_EMAIL, emailVerified: true, role: 'admin' }).select('_id email role').lean();
    if (!author) throw new Error(`Existing verified admin guide author not found: ${GUIDE_AUTHOR_EMAIL}`);

    const payload = buildCreatePayload({ slug, authorId: author._id, now, publishAt });
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
  parseArguments
};
