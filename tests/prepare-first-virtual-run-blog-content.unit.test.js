'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const packageJson = require('../package.json');

const { POSTS, buildContentHtml, htmlToText } = require('../src/scripts/seed-adsense-blog-posts');
const {
  ARTICLE,
  CANONICAL_SLUG,
  REQUIRED_HEADINGS,
  REQUIRED_LINKS,
  buildArticlePayload,
  validateArticlePayload
} = require('../src/content/prepare-first-virtual-run');
const { getArticleModule, listArticleSlugs } = require('../src/content/adsense-blog-article-registry');
const { parseArguments: parseUpdateArguments } = require('../src/scripts/update-adsense-blog');
const {
  GUIDE_AUTHOR_EMAIL,
  buildCreatePayload,
  getCanonicalSeed,
  parseArguments: parseCreateArguments
} = require('../src/scripts/create-adsense-blog');

const COVER_IMAGE_URL = 'https://cdn.hellorun.online/blog/covers/6994299f568d52730107dc23/1784555622021-237177645-how-to-prepare-for-your-first-virtual-run.webp';

test('first virtual run guide builds a substantive preparation payload', () => {
  const payload = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  const wordCount = payload.contentText.split(/\s+/).filter(Boolean).length;

  assert.equal(ARTICLE.slug, CANONICAL_SLUG);
  assert.equal(payload.title, 'How to Prepare for Your First Virtual Run');
  assert.equal(payload.category, 'Virtual Run Guide');
  assert.deepEqual(payload.tags, [
    'first virtual run', 'virtual run prep', 'runner checklist', 'run tracking',
    'activity proof', 'route planning', 'event rules', 'race preparation'
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
  assert.match(payload.contentText, /one activity versus accumulated distance/i);
  assert.match(payload.contentText, /OCR may help extract screenshot fields, but extraction is fallible/i);
  assert.match(payload.contentText, /A deadline does not make unsafe conditions acceptable/i);
  assert.match(payload.contentText, /Pending distance does not become official progress or a ranked result/i);
  assert.match(payload.contentText, /Example 1: one outdoor 5K/i);
  assert.match(payload.contentText, /Example 2: an accumulated 25K/i);
  assert.match(payload.contentText, /Example 3: an allowed treadmill run/i);
  assert.match(payload.contentText, /Example 4: weather changes the plan/i);
  assert.doesNotMatch(payload.contentHtml, /<h[12]>How to Prepare for Your First Virtual Run<\/h[12]>/i);
  assert.doesNotMatch(payload.contentText, /participate anywhere, anytime|perfect OCR|HelloRun processes payments|automatic approval is guaranteed/i);

  for (const heading of REQUIRED_HEADINGS) {
    assert.ok(payload.contentHtml.includes(`<h2>${heading}</h2>`), `missing required heading: ${heading}`);
  }
  for (const link of REQUIRED_LINKS) {
    assert.ok(payload.contentHtml.includes(link), `missing required link: ${link}`);
  }
});

test('first virtual run guide is registered and stored once as canonical rich seed content', () => {
  const articleModule = getArticleModule(CANONICAL_SLUG);
  const seededPosts = POSTS.filter((post) => post.slug === CANONICAL_SLUG);
  const seededPost = seededPosts[0];

  assert.equal(articleModule.ARTICLE, ARTICLE);
  assert.ok(listArticleSlugs().includes(CANONICAL_SLUG));
  assert.equal(listArticleSlugs().length, 13);
  assert.equal(seededPosts.length, 1);
  assert.equal(getCanonicalSeed(CANONICAL_SLUG), seededPost);
  assert.equal(buildContentHtml(seededPost), seededPost.contentHtml);
  assert.equal(htmlToText(seededPost.contentHtml), buildArticlePayload({ coverImageUrl: seededPost.coverImageUrl }).contentText);
  assert.equal(seededPost.coverImageUrl, COVER_IMAGE_URL);
  assert.equal(seededPost.ogImageUrl, COVER_IMAGE_URL);
  assert.equal(seededPost.featured, false);
  assert.equal(seededPost.authorEmail, GUIDE_AUTHOR_EMAIL);
  assert.equal(seededPost.publishedAt, '2026-07-20T14:00:53.532Z');
});

test('safe creator defaults to dry-run and builds an isolated published record', () => {
  const authorId = new mongoose.Types.ObjectId();
  const now = new Date('2026-07-20T12:34:56.000Z');
  const payload = buildCreatePayload({ slug: CANONICAL_SLUG, authorId, now });

  assert.deepEqual(parseCreateArguments(['--slug', CANONICAL_SLUG]), { slug: CANONICAL_SLUG, mode: 'dry-run' });
  assert.deepEqual(parseCreateArguments(['--slug', CANONICAL_SLUG, '--dry-run']), { slug: CANONICAL_SLUG, mode: 'dry-run' });
  assert.deepEqual(parseCreateArguments(['--slug', CANONICAL_SLUG, '--apply']), { slug: CANONICAL_SLUG, mode: 'apply' });
  assert.throws(() => parseCreateArguments(['--slug', CANONICAL_SLUG, '--apply', '--dry-run']), /either --apply or --dry-run/);
  assert.throws(() => parseCreateArguments(['--slug', 'unknown-guide']), /Unknown AdSense article slug/);
  assert.equal(GUIDE_AUTHOR_EMAIL, 'hensonsagorsor@gmail.com');
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
});

test('first virtual run guide keeps the shared editorial updater and convenience alias', () => {
  assert.deepEqual(parseUpdateArguments(['--slug', CANONICAL_SLUG]), { slug: CANONICAL_SLUG, mode: 'dry-run' });
  assert.match(packageJson.scripts['blog:create-adsense'], /create-adsense-blog\.js/);
  assert.match(packageJson.scripts['blog:update-first-virtual-run'], new RegExp(`--slug ${CANONICAL_SLUG}`));
});

test('first virtual run payload rejects a missing cover image', () => {
  assert.throws(() => buildArticlePayload({}), /existing cover image is required/);
});
