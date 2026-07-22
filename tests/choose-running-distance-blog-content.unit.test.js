'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const packageJson = require('../package.json');

const { POSTS, buildContentHtml, htmlToText } = require('../src/scripts/seed-adsense-blog-posts');
const {
  ARTICLE,
  CANONICAL_SLUG,
  LEGACY_SLUG,
  REQUIRED_HEADINGS,
  REQUIRED_LINKS,
  buildArticlePayload,
  validateArticlePayload
} = require('../src/content/choose-running-distance-guide');
const { getArticleModule, listArticleSlugs } = require('../src/content/adsense-blog-article-registry');
const { getCanonicalBlogSlug, DUPLICATE_BLOG_SLUGS } = require('../src/utils/blog-canonical');
const { parseArguments: parseUpdateArguments } = require('../src/scripts/update-adsense-blog');
const {
  GUIDE_AUTHOR_EMAIL,
  buildCreatePayload,
  getCanonicalSeed,
  parseArguments: parseCreateArguments
} = require('../src/scripts/create-adsense-blog');

const COVER_IMAGE_URL = 'https://cdn.hellorun.online/blog/covers/6994299f568d52730107dc23/1784690449454-621961560-how-to-choose-between-running-distances.webp';

test('distance choice guide builds a substantive runner decision payload', () => {
  const payload = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  const wordCount = payload.contentText.split(/\s+/).filter(Boolean).length;

  assert.equal(ARTICLE.slug, CANONICAL_SLUG);
  assert.equal(payload.title, 'How to Choose Between a 5K, 10K, 21K, or Distance Challenge');
  assert.equal(payload.category, 'Race Tips');
  assert.deepEqual(payload.tags, [
    'race distance', '5k run', '10k run', '21k run',
    'distance challenge', 'running goals', 'event selection', 'runner guide'
  ]);
  assert.ok(payload.tags.every((tag) => tag.length <= 30));
  assert.ok(payload.excerpt.length <= 220);
  assert.ok(payload.seoTitle.length <= 160);
  assert.ok(payload.seoDescription.length <= 320);
  assert.ok(payload.coverImageAlt.length <= 180);
  assert.ok(payload.contentHtml.length <= 50000);
  assert.ok(payload.contentText.length <= 50000);
  assert.ok(wordCount >= 3200);
  assert.equal(payload.contentRaw, payload.contentText);
  assert.equal(payload.readingTime, Math.ceil(wordCount / 180));
  assert.equal(payload.ogImageUrl, COVER_IMAGE_URL);
  assert.doesNotThrow(() => validateArticlePayload(payload));

  assert.match(payload.contentText, /reviewed in July 2026 using documented HelloRun/i);
  assert.match(payload.contentText, /standard half marathon as 21\.0975 kilometres/i);
  assert.match(payload.contentText, /A virtual “21K,”[\s\S]*is not automatically a certified half marathon/i);
  assert.match(payload.contentText, /Pending evidence is not an approved result/i);
  assert.match(payload.contentText, /An accumulated challenge is not automatically the easiest choice/i);
  assert.match(payload.contentText, /First-time walk-runner/i);
  assert.match(payload.contentText, /Regular 5K runner seeking a new goal/i);
  assert.match(payload.contentText, /Experienced endurance runner/i);
  assert.match(payload.contentText, /Runner with an unpredictable schedule/i);
  assert.match(payload.contentText, /Runner prioritizing accessibility/i);
  assert.doesNotMatch(payload.contentHtml, /<h[12]>How to Choose Between a 5K, 10K, 21K, or Distance Challenge<\/h[12]>/i);
  assert.doesNotMatch(payload.contentText, /10% rule|every 21K is certified|all events accept|perfect OCR/i);

  for (const heading of REQUIRED_HEADINGS) {
    assert.ok(payload.contentHtml.includes(`<h2>${heading}</h2>`), `missing required heading: ${heading}`);
  }
  for (const link of REQUIRED_LINKS) {
    assert.ok(payload.contentHtml.includes(link), `missing required link: ${link}`);
  }
});

test('distance choice guide replaces the obsolete seed and has a canonical redirect', () => {
  const articleModule = getArticleModule(CANONICAL_SLUG);
  const seededPosts = POSTS.filter((post) => post.slug === CANONICAL_SLUG);
  const seededPost = seededPosts[0];

  assert.equal(articleModule.ARTICLE, ARTICLE);
  assert.ok(listArticleSlugs().includes(CANONICAL_SLUG));
  assert.equal(listArticleSlugs().length, 14);
  assert.equal(seededPosts.length, 1);
  assert.equal(POSTS.some((post) => post.slug === LEGACY_SLUG), false);
  assert.equal(getCanonicalSeed(CANONICAL_SLUG), seededPost);
  assert.equal(buildContentHtml(seededPost), seededPost.contentHtml);
  assert.equal(htmlToText(seededPost.contentHtml), buildArticlePayload({ coverImageUrl: seededPost.coverImageUrl }).contentText);
  assert.equal(seededPost.coverImageUrl, COVER_IMAGE_URL);
  assert.equal(seededPost.ogImageUrl, COVER_IMAGE_URL);
  assert.equal(seededPost.featured, false);
  assert.equal(seededPost.authorEmail, GUIDE_AUTHOR_EMAIL);
  assert.equal(getCanonicalBlogSlug(LEGACY_SLUG), CANONICAL_SLUG);
  assert.ok(DUPLICATE_BLOG_SLUGS.includes(LEGACY_SLUG));
});

test('distance choice guide supports safe creation and ongoing editorial updates', () => {
  const authorId = new mongoose.Types.ObjectId();
  const now = new Date('2026-07-22T02:34:56.000Z');
  const payload = buildCreatePayload({ slug: CANONICAL_SLUG, authorId, now });

  assert.deepEqual(parseCreateArguments(['--slug', CANONICAL_SLUG]), { slug: CANONICAL_SLUG, mode: 'dry-run' });
  assert.deepEqual(parseCreateArguments(['--slug', CANONICAL_SLUG, '--apply']), { slug: CANONICAL_SLUG, mode: 'apply' });
  assert.deepEqual(parseUpdateArguments(['--slug', CANONICAL_SLUG]), { slug: CANONICAL_SLUG, mode: 'dry-run' });
  assert.equal(String(payload.authorId), String(authorId));
  assert.equal(payload.slug, CANONICAL_SLUG);
  assert.equal(payload.status, 'published');
  assert.equal(payload.featured, false);
  assert.equal(payload.isDeleted, false);
  assert.equal(payload.publishedAt.toISOString(), now.toISOString());
  assert.equal(payload.approvedAt.toISOString(), now.toISOString());
  assert.equal(payload.coverImageUrl, COVER_IMAGE_URL);
  assert.equal(payload.ogImageUrl, COVER_IMAGE_URL);
  assert.equal(payload.views, 0);
  assert.equal(payload.likesCount, 0);
  assert.equal(payload.commentsCount, 0);
  assert.match(packageJson.scripts['blog:create-adsense'], /create-adsense-blog\.js/);
  assert.match(packageJson.scripts['blog:update-distance-choice'], new RegExp(`--slug ${CANONICAL_SLUG}`));
});

test('distance choice payload rejects a missing cover image', () => {
  assert.throws(() => buildArticlePayload({}), /existing cover image is required/);
});
