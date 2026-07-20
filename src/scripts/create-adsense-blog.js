'use strict';

require('dotenv').config();

const mongoose = require('mongoose');
const Blog = require('../models/Blog');
const User = require('../models/User');
const { POSTS } = require('./seed-adsense-blog-posts');
const { getArticleModule, listArticleSlugs } = require('../content/adsense-blog-article-registry');

const GUIDE_AUTHOR_EMAIL = String(process.env.ADSENSE_GUIDE_AUTHOR_EMAIL || 'hensonsagorsor@gmail.com').trim().toLowerCase();

function parseArguments(argv = process.argv.slice(2)) {
  let slug = '';
  let apply = false;
  let dryRun = false;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--slug') {
      slug = String(argv[index + 1] || '').trim();
      index += 1;
    } else if (argument === '--apply') {
      apply = true;
    } else if (argument === '--dry-run') {
      dryRun = true;
    } else {
      throw new Error(`Unsupported argument: ${argument}`);
    }
  }

  if (!slug) throw new Error(`--slug is required. Available slugs: ${listArticleSlugs().join(', ')}`);
  if (apply && dryRun) throw new Error('Choose either --apply or --dry-run, not both.');
  if (!getArticleModule(slug)) throw new Error(`Unknown AdSense article slug: ${slug}. Available slugs: ${listArticleSlugs().join(', ')}`);

  return { slug, mode: apply ? 'apply' : 'dry-run' };
}

function getCanonicalSeed(slug) {
  const matches = POSTS.filter((post) => post.slug === slug);
  if (matches.length !== 1) {
    throw new Error(`Expected exactly one canonical seed entry for ${slug}; found ${matches.length}.`);
  }
  return matches[0];
}

function buildCreatePayload({ slug, authorId, now = new Date() }) {
  const articleModule = getArticleModule(slug);
  if (!articleModule) throw new Error(`Unknown AdSense article slug: ${slug}`);
  if (!authorId) throw new Error('Existing guide author is required.');

  const seed = getCanonicalSeed(slug);
  const coverImageUrl = String(seed.coverImageUrl || '').trim();
  if (!/^https:\/\/cdn\.hellorun\.online\/blog\/covers\//i.test(coverImageUrl)) {
    throw new Error('A HelloRun CDN blog cover is required before creating the article.');
  }

  const editorialPayload = articleModule.buildArticlePayload({ coverImageUrl });
  const publishedAt = new Date(now);
  if (Number.isNaN(publishedAt.getTime())) throw new Error('A valid publication timestamp is required.');

  const payload = {
    authorId,
    slug,
    ...editorialPayload,
    templateKey: 'custom',
    coverImageUrl,
    galleryImageUrls: [],
    status: 'published',
    featured: false,
    views: 0,
    likesCount: 0,
    commentsCount: 0,
    isDeleted: false,
    publishedAt,
    approvedAt: publishedAt,
    rejectionReason: '',
    moderationNotes: '',
    moderationFlags: [],
    moderationFlagSummary: ''
  };

  const validationError = new Blog(payload).validateSync();
  if (validationError) throw validationError;
  return payload;
}

async function createAdsenseBlog({ slug, mode = 'dry-run', now = new Date() } = {}) {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required.');
  if (!['dry-run', 'apply'].includes(mode)) throw new Error(`Unsupported create mode: ${mode}`);
  if (!getArticleModule(slug)) throw new Error(`Unknown AdSense article slug: ${slug}`);

  await mongoose.connect(process.env.MONGODB_URI);
  try {
    const matchCount = await Blog.countDocuments({ slug });
    if (matchCount !== 0) {
      throw new Error(`Canonical blog record for ${slug} must be absent before creation; found ${matchCount}.`);
    }

    const author = await User.findOne({ email: GUIDE_AUTHOR_EMAIL, emailVerified: true }).select('_id email').lean();
    if (!author) throw new Error(`Existing verified guide author not found: ${GUIDE_AUTHOR_EMAIL}`);

    const payload = buildCreatePayload({ slug, authorId: author._id, now });
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
