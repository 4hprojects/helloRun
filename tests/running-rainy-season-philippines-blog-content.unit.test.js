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
} = require('../src/content/running-rainy-season-philippines');
const { getArticleModule, listArticleSlugs } = require('../src/content/adsense-blog-article-registry');
const { parseArguments: parseUpdateArguments } = require('../src/scripts/update-adsense-blog');
const {
  GUIDE_AUTHOR_EMAIL,
  buildCreatePayload,
  getCanonicalSeed,
  parseArguments: parseCreateArguments
} = require('../src/scripts/create-adsense-blog');

const COVER_IMAGE_URL = 'https://cdn.hellorun.online/blog/covers/698f1cb67748262281092639/1785245902469-81172053-running-during-rainy-season-philippines.webp';

test('rainy-season guide builds a substantive Philippine safety and preparation guide', () => {
  const payload = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  const wordCount = payload.contentText.split(/\s+/).filter(Boolean).length;

  assert.equal(ARTICLE.slug, CANONICAL_SLUG);
  assert.equal(payload.title, 'Running During the Rainy Season in the Philippines');
  assert.equal(payload.category, 'Training');
  assert.deepEqual(payload.tags, [
    'rainy season running', 'running in rain', 'philippine runners', 'weather safety',
    'flood safety', 'lightning safety', 'wet weather running', 'virtual running'
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

  assert.match(payload.contentText, /go, change, or stop decision/i);
  assert.match(payload.contentText, /PAGASA's current weather services/i);
  assert.match(payload.contentText, /wait at least 30 minutes after the last thunder/i);
  assert.match(payload.contentText, /do not enter floodwater/i);
  assert.match(payload.contentText, /retroreflective material/i);
  assert.match(payload.contentText, /manufacturer's current rating and limitations/i);
  assert.match(payload.contentText, /Four practical rainy-season scenarios/i);
  assert.match(payload.contentText, /Pending is not approved progress/i);
  assert.match(payload.contentText, /does not directly process the external payment transfer/i);
  assert.doesNotMatch(payload.contentHtml, /<h[12]>Running During the Rainy Season in the Philippines<\/h[12]>/i);
  assert.doesNotMatch(payload.contentText, /safe floodwater depth|every device is waterproof|perfect OCR/i);

  for (const heading of REQUIRED_HEADINGS) {
    assert.ok(payload.contentHtml.includes(`<h2>${heading}</h2>`), `missing required heading: ${heading}`);
  }
  for (const link of REQUIRED_LINKS) {
    assert.ok(payload.contentHtml.includes(link), `missing required link: ${link}`);
  }
});

test('rainy-season guide is registered and seeded once with its CDN cover', () => {
  const articleModule = getArticleModule(CANONICAL_SLUG);
  const seededPosts = POSTS.filter((post) => post.slug === CANONICAL_SLUG);
  const seededPost = seededPosts[0];

  assert.equal(articleModule.ARTICLE, ARTICLE);
  assert.ok(listArticleSlugs().includes(CANONICAL_SLUG));
  assert.equal(listArticleSlugs().length, 29);
  assert.equal(seededPosts.length, 1);
  assert.equal(getCanonicalSeed(CANONICAL_SLUG), seededPost);
  assert.equal(buildContentHtml(seededPost), seededPost.contentHtml);
  assert.equal(htmlToText(seededPost.contentHtml), buildArticlePayload({ coverImageUrl: seededPost.coverImageUrl }).contentText);
  assert.equal(seededPost.coverImageUrl, COVER_IMAGE_URL);
  assert.equal(seededPost.ogImageUrl, COVER_IMAGE_URL);
  assert.equal(seededPost.featured, false);
  assert.equal(seededPost.authorEmail, GUIDE_AUTHOR_EMAIL);
});

test('rainy-season guide supports safe creation and ongoing updates', () => {
  const authorId = new mongoose.Types.ObjectId();
  const now = new Date('2026-07-28T08:00:00.000Z');
  const payload = buildCreatePayload({ slug: CANONICAL_SLUG, authorId, now });

  assert.deepEqual(parseCreateArguments(['--slug', CANONICAL_SLUG]), { slug: CANONICAL_SLUG, mode: 'dry-run' });
  assert.deepEqual(parseCreateArguments(['--slug', CANONICAL_SLUG, '--apply']), { slug: CANONICAL_SLUG, mode: 'apply' });
  assert.deepEqual(parseUpdateArguments(['--slug', CANONICAL_SLUG]), { slug: CANONICAL_SLUG, mode: 'dry-run' });
  assert.equal(String(payload.authorId), String(authorId));
  assert.equal(payload.status, 'published');
  assert.equal(payload.featured, false);
  assert.equal(payload.publishedAt.toISOString(), now.toISOString());
  assert.equal(payload.approvedAt.toISOString(), now.toISOString());
  assert.equal(payload.coverImageUrl, COVER_IMAGE_URL);
  assert.equal(payload.ogImageUrl, COVER_IMAGE_URL);
  assert.equal(payload.views, 0);
  assert.equal(payload.likesCount, 0);
  assert.equal(payload.commentsCount, 0);
  assert.match(packageJson.scripts['blog:create-adsense'], /create-adsense-blog\.js/);
  assert.match(packageJson.scripts['blog:update-rainy-season-running'], new RegExp(`--slug ${CANONICAL_SLUG}`));
});

test('rainy-season payload rejects a missing cover image', () => {
  assert.throws(() => buildArticlePayload({}), /existing cover image is required/);
});

test('rainy-season validator rejects unsafe or unsupported claims', () => {
  const payload = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  assert.throws(
    () => validateArticlePayload({ ...payload, contentText: `${payload.contentText} Every device is waterproof.` }),
    /universal weather or device claims/
  );
  assert.throws(
    () => validateArticlePayload({ ...payload, contentText: `${payload.contentText} Take doxycycline after the run.` }),
    /prescribe medication/
  );
  assert.throws(
    () => validateArticlePayload({ ...payload, contentText: `${payload.contentText} Every event accepts treadmill runs.` }),
    /universal event acceptance/
  );
});
