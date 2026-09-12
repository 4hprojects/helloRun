'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');
const packageJson = require('../package.json');

const { POSTS, buildContentHtml, htmlToText } = require('../src/scripts/seed-adsense-blog-posts');
const { getArticleModule, listArticleSlugs } = require('../src/content/adsense-blog-article-registry');
const { getInitialIndexingClassification } = require('../src/content/adsense-content-indexing');
const { evaluateBlogContentEligibility, hasCurrentPublicationReview } = require('../src/utils/blog-content-eligibility');
const { BLOG_CATEGORIES } = require('../src/utils/blog');
const { buildCreatePayload, getCanonicalSeed, parseArguments: parseCreateArguments } = require('../src/scripts/create-adsense-blog');
const { parseArguments: parseUpdateArguments } = require('../src/scripts/update-adsense-blog');
const {
  ARTICLE,
  CANONICAL_SLUG,
  RAW_CONTENT_HTML,
  REQUIRED_HEADINGS,
  REQUIRED_LINKS,
  buildArticlePayload,
  validateArticlePayload
} = require('../src/content/gps-watch-vs-running-app');

const COVER_IMAGE_URL = '/images/blog/covers/gps-watch-vs-running-app.webp';
const COVER_IMAGE_PATH = path.join(__dirname, '..', 'src', 'public', 'images', 'blog', 'covers', 'gps-watch-vs-running-app.webp');

test('GPS watch versus running app guide builds a substantive commercial comparison', () => {
  const payload = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  const wordCount = payload.contentText.split(/\s+/).filter(Boolean).length;
  assert.equal(ARTICLE.slug, CANONICAL_SLUG);
  assert.equal(payload.title, 'GPS Watch vs Running App: Which Should Beginners Use?');
  assert.equal(payload.seoTitle, payload.title);
  assert.equal(payload.category, 'Gear');
  assert.ok(BLOG_CATEGORIES.includes(payload.category));
  assert.deepEqual(payload.tags, [
    'GPS watch', 'running app', 'running watch', 'phone GPS',
    'beginner running gear', 'fitness watch', 'run tracking', 'virtual run proof'
  ]);
  assert.ok(payload.tags.every((tag) => tag.length <= 30));
  assert.ok(payload.excerpt.length <= 220);
  assert.ok(payload.seoDescription.length <= 320);
  assert.ok(payload.coverImageAlt.length <= 180);
  assert.ok(wordCount >= 2500);
  assert.ok(wordCount <= 3000);
  assert.equal(payload.contentRaw, payload.contentText);
  assert.equal(payload.readingTime, Math.ceil(wordCount / 180));
  assert.equal(payload.ogImageUrl, COVER_IMAGE_URL);
  assert.doesNotThrow(() => validateArticlePayload(payload));
  assert.doesNotMatch(payload.contentHtml, /<h1\b|<table\b/i);
  assert.match(payload.contentText, /^No, a beginner does not need a GPS watch to start running/i);
  assert.match(payload.contentText, /upgrade only when you can name the limitation the purchase should fix/i);
  for (const heading of REQUIRED_HEADINGS) assert.ok(payload.contentHtml.includes(`<h2>${heading}</h2>`), `missing heading: ${heading}`);
  for (const link of REQUIRED_LINKS) assert.ok(payload.contentHtml.includes(link), `missing link: ${link}`);
});

test('comparison covers every requested factor without declaring a universal winner', () => {
  const { contentText } = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  for (const phrase of ['Initial cost', 'GPS tracking', 'Battery', 'Screen access while running', 'Heart-rate and training data', 'Convenience', 'Virtual-run proof', 'Beginner suitability']) {
    assert.match(contentText, new RegExp(phrase, 'i'));
  }
  assert.match(contentText, /Neither category is universally more accurate/i);
  assert.match(contentText, /More expensive does not mean more appropriate/i);
  assert.match(contentText, /more data is not automatically better/i);
  assert.match(contentText, /Do not buy on a race-week deadline/i);
  assert.match(contentText, /Nothing by default\. Test what you own/i);
});

test('comparison sanitizes official sources and requires health review', () => {
  const payload = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  const eligibility = evaluateBlogContentEligibility({ ...payload, contentRisk: 'health_safety', coverImageUrl: COVER_IMAGE_URL }, { evaluatedAt: new Date('2026-08-30T00:00:00.000Z') });
  assert.notEqual(payload.contentHtml, RAW_CONTENT_HTML.trim());
  assert.doesNotMatch(payload.contentHtml, /<script|javascript:/i);
  assert.match(payload.contentHtml, /href="https:\/\/archive\.gps\.gov\/systems\/gps\/performance\/accuracy\/" rel="noopener noreferrer" target="_blank"/);
  assert.match(payload.contentHtml, /href="https:\/\/developer\.android\.com\/develop\/sensors-and-location\/location\/permissions\/runtime" rel="noopener noreferrer" target="_blank"/);
  assert.match(payload.contentHtml, /href="https:\/\/support\.apple\.com\/en-ie\/105048" rel="noopener noreferrer" target="_blank"/);
  assert.match(payload.contentHtml, /href="https:\/\/support\.garmin\.com\/en-HK\/\?faq=Te47runiFR93oKcUAItwU7" rel="noopener noreferrer" target="_blank"/);
  assert.match(payload.contentHtml, /href="https:\/\/support\.strava\.com\/en-us\/articles\/15402137-how-do-i-record-an-activity-on-strava" rel="noopener noreferrer" target="_blank"/);
  assert.equal(eligibility.eligible, true);
  assert.deepEqual(eligibility.blockingReasons, []);
  assert.equal(eligibility.healthReviewRequired, true);
  assert.equal(eligibility.externalLinkCount, 7);
});

test('comparison has a distinct 1600 by 900 repository cover', async () => {
  assert.equal(fs.existsSync(COVER_IMAGE_PATH), true);
  const metadata = await sharp(COVER_IMAGE_PATH).metadata();
  assert.equal(metadata.format, 'webp');
  assert.equal(metadata.width, 1600);
  assert.equal(metadata.height, 900);
});

test('comparison is registered and seeded once for September 22', () => {
  const articleModule = getArticleModule(CANONICAL_SLUG);
  const seededPosts = POSTS.filter((post) => post.slug === CANONICAL_SLUG);
  const seededPost = seededPosts[0];
  assert.equal(articleModule.ARTICLE, ARTICLE);
  assert.ok(listArticleSlugs().includes(CANONICAL_SLUG));
  assert.equal(listArticleSlugs().length, 55);
  assert.equal(seededPosts.length, 1);
  assert.equal(getCanonicalSeed(CANONICAL_SLUG), seededPost);
  assert.equal(buildContentHtml(seededPost), seededPost.contentHtml);
  assert.equal(htmlToText(seededPost.contentHtml), buildArticlePayload({ coverImageUrl: seededPost.coverImageUrl }).contentText);
  assert.equal(seededPost.coverImageUrl, COVER_IMAGE_URL);
  assert.equal(seededPost.ogImageUrl, COVER_IMAGE_URL);
  assert.equal(seededPost.status, 'scheduled');
  assert.equal(seededPost.publishedAt, '2026-09-22T11:00:00.000Z');
  assert.equal(seededPost.featured, false);
});

test('comparison is noindex health content with create and update wiring', () => {
  const classification = getInitialIndexingClassification(CANONICAL_SLUG);
  const publishAt = '2026-09-22T11:00:00.000Z';
  assert.deepEqual(parseCreateArguments(['--slug', CANONICAL_SLUG, '--apply', '--confirm-editorial-review', '--publish-at', publishAt]), { slug: CANONICAL_SLUG, mode: 'apply', confirmEditorialReview: true, publishAt });
  assert.deepEqual(parseUpdateArguments(['--slug', CANONICAL_SLUG]), { slug: CANONICAL_SLUG, mode: 'dry-run' });
  assert.equal(classification.contentRisk, 'health_safety');
  assert.equal(classification.plannedNoindex, true);
  assert.equal(classification.indexCandidate, false);
  assert.match(packageJson.scripts['blog:update-gps-watch-vs-running-app'], new RegExp(`--slug ${CANONICAL_SLUG}`));
});

test('comparison creation payload schedules the local cover with a current review', () => {
  const reviewedAt = new Date('2026-09-13T08:00:00.000Z');
  const publishAt = new Date('2026-09-22T11:00:00.000Z');
  const payload = buildCreatePayload({
    slug: CANONICAL_SLUG,
    authorId: '507f1f77bcf86cd799439011',
    now: reviewedAt,
    publishAt,
    confirmEditorialReview: true
  });
  assert.equal(payload.coverImageUrl, COVER_IMAGE_URL);
  assert.equal(payload.status, 'scheduled');
  assert.equal(payload.publishedAt.toISOString(), publishAt.toISOString());
  assert.equal(payload.searchIndexingStatus, 'noindex');
  assert.equal(payload.searchIndexingReason, 'pending_expert_review');
  assert.equal(hasCurrentPublicationReview(payload), true);
});

test('comparison rejects purchase pressure, guarantees, and dishonest proof claims', () => {
  const payload = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  const withClaim = (claim) => ({ ...payload, contentText: `${payload.contentText} ${claim}`, contentRaw: `${payload.contentText} ${claim}` });
  assert.throws(() => validateArticlePayload(withClaim('Every beginner must buy a GPS watch.')), /require a watch universally/);
  assert.throws(() => validateArticlePayload(withClaim('GPS watches are always more accurate.')), /universal accuracy winner/);
  assert.throws(() => validateArticlePayload(withClaim('More expensive always means more accurate.')), /equate price with accuracy/);
  assert.throws(() => validateArticlePayload(withClaim('A normal watch reading means you are safe.')), /medicalize wearable metrics/);
  assert.throws(() => validateArticlePayload(withClaim('Every virtual run accepts any watch.')), /universal event acceptance/);
  assert.throws(() => validateArticlePayload(withClaim('Choose whichever device shows more distance.')), /cherry-picked evidence/);
  assert.throws(() => validateArticlePayload(withClaim('Dual recording guarantees a backup.')), /dual-recording recovery/);
  assert.throws(() => buildArticlePayload(), /cover artwork/);
});
