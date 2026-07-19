'use strict';

require('dotenv').config();

const mongoose = require('mongoose');
const Blog = require('../models/Blog');
const { getArticleModule, listArticleSlugs } = require('../content/adsense-blog-article-registry');

const EDITORIAL_FIELDS = Object.freeze([
  'title',
  'excerpt',
  'contentHtml',
  'contentText',
  'contentRaw',
  'category',
  'customCategory',
  'tags',
  'readingTime',
  'seoTitle',
  'seoDescription',
  'coverImageAlt',
  'ogImageUrl'
]);

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

function changedEditorialFields(post, payload) {
  return EDITORIAL_FIELDS.filter((field) => {
    const before = post[field];
    const after = payload[field];
    return JSON.stringify(before ?? null) !== JSON.stringify(after ?? null);
  });
}

async function updateAdsenseBlog({ slug, mode = 'dry-run' } = {}) {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required.');
  if (!['dry-run', 'apply'].includes(mode)) throw new Error(`Unsupported update mode: ${mode}`);

  const articleModule = getArticleModule(slug);
  if (!articleModule) throw new Error(`Unknown AdSense article slug: ${slug}`);

  await mongoose.connect(process.env.MONGODB_URI);
  try {
    const matchCount = await Blog.countDocuments({ slug });
    if (matchCount !== 1) {
      throw new Error(`Expected exactly one canonical blog record for ${slug}; found ${matchCount}.`);
    }

    const post = await Blog.findOne({ slug }).lean();
    if (!post) throw new Error(`Canonical blog record not found: ${slug}`);
    if (String(post.status || '') !== 'published' || post.isDeleted === true) {
      throw new Error('Canonical blog record must be published and not deleted before it can be updated.');
    }

    const payload = articleModule.buildArticlePayload(post);
    const changedFields = changedEditorialFields(post, payload);
    let legacyRecord = null;

    if (articleModule.LEGACY_SLUG) {
      const legacyPost = await Blog.findOne({ slug: articleModule.LEGACY_SLUG }).select('slug status isDeleted').lean();
      legacyRecord = legacyPost
        ? { slug: legacyPost.slug, status: legacyPost.status, isDeleted: Boolean(legacyPost.isDeleted) }
        : null;
    }

    if (mode === 'apply' && changedFields.length) {
      const result = await Blog.updateOne(
        { _id: post._id, slug },
        { $set: payload },
        { runValidators: true }
      );
      if (result.matchedCount !== 1 || result.modifiedCount !== 1) {
        throw new Error(`Canonical update did not modify exactly one record (matched=${result.matchedCount}, modified=${result.modifiedCount}).`);
      }
    }

    return {
      mode,
      slug,
      title: articleModule.ARTICLE.title,
      changedFields,
      wordCount: payload.contentText.split(/\s+/).filter(Boolean).length,
      readingTime: payload.readingTime,
      preservedFields: ['slug', 'authorId', 'publishedAt', 'featured', 'coverImageUrl', 'views', 'likesCount', 'commentsCount'],
      legacyRecord
    };
  } finally {
    await mongoose.disconnect();
  }
}

async function main() {
  const options = parseArguments();
  const result = await updateAdsenseBlog(options);
  console.log(JSON.stringify(result, null, 2));
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`${error.name}: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  EDITORIAL_FIELDS,
  changedEditorialFields,
  parseArguments,
  updateAdsenseBlog
};
