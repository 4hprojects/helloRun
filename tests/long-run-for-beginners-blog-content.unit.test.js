'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');
const packageJson = require('../package.json');

const { POSTS, buildContentHtml, htmlToText } = require('../src/scripts/seed-adsense-blog-posts');
const { getArticleModule, listArticleSlugs } = require('../src/content/adsense-blog-article-registry');
const { getInitialIndexingClassification } = require('../src/content/adsense-content-indexing');
const { evaluateBlogContentEligibility, hasCurrentPublicationReview } = require('../src/utils/blog-content-eligibility');
const { BLOG_CATEGORIES } = require('../src/utils/blog');
const { buildCreatePayload, getCanonicalSeed, parseArguments, validateCoverImageUrl } = require('../src/scripts/create-adsense-blog');
const {
  ARTICLE, CANONICAL_SLUG, RAW_CONTENT_HTML, REQUIRED_HEADINGS, REQUIRED_LINKS,
  buildArticlePayload, validateArticlePayload
} = require('../src/content/long-run-for-beginners');

const COVER_IMAGE_URL = '/images/blog/covers/what-is-a-long-run-for-beginners.webp';
const COVER_IMAGE_PATH = path.join(__dirname, '..', 'src', 'public', 'images', 'blog', 'covers', 'what-is-a-long-run-for-beginners.webp');
const PUBLISH_AT = '2026-10-01T11:00:00.000Z';

test('beginner long-run guide builds the approved substantive payload', () => {
  const payload = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  const wordCount = payload.contentText.split(/\s+/).filter(Boolean).length;
  assert.equal(payload.title, 'What Is a Long Run? A Beginner’s Guide to Running Farther');
  assert.equal(payload.seoDescription, 'Learn what a long run means for beginners, why it is relative to your normal running, how it supports endurance, and how to add longer runs gradually.');
  assert.equal(payload.category, 'Training');
  assert.ok(BLOG_CATEGORIES.includes(payload.category));
  assert.equal(payload.tags[0], 'long run for beginners');
  assert.equal(payload.tags.length, 8);
  assert.ok(payload.tags.every((tag) => tag.length <= 30));
  assert.ok(wordCount >= 2500 && wordCount <= 3000);
  assert.equal(payload.readingTime, Math.ceil(wordCount / 180));
  assert.equal(payload.contentRaw, payload.contentText);
  assert.equal(payload.ogImageUrl, COVER_IMAGE_URL);
  assert.doesNotThrow(() => validateArticlePayload(payload));
  assert.doesNotMatch(payload.contentHtml, /<h1\b/i);
  assert.match(payload.contentText, /A long run for beginners is simply the longest planned easy/i);
  assert.match(payload.contentText, /relative to what you can already repeat/i);
  assert.match(payload.contentText, /A missed activity is not debt/i);
  for (const heading of REQUIRED_HEADINGS) assert.ok(payload.contentHtml.includes(`<h2>${heading}</h2>`));
  for (const link of REQUIRED_LINKS) assert.ok(payload.contentHtml.includes(link));
});

test('guide covers flexible distance, time, effort, walking, route, recovery, tracking, and progression', () => {
  const { contentText } = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  assert.match(contentText, /No universal kilometre mark counts as long/i);
  assert.match(contentText, /Distance or time/i);
  assert.match(contentText, /talk test/i);
  assert.match(contentText, /Walking breaks do not cancel a long run/i);
  assert.match(contentText, /DOST-PAGASA heat-index information/i);
  assert.match(contentText, /There is no universal volume of water/i);
  assert.match(contentText, /Phone and watch distance can vary/i);
  assert.match(contentText, /first 10K/i);
  assert.match(contentText, /first 21K/i);
});

test('guide sanitizes authoritative sources and passes health-sensitive eligibility', () => {
  const payload = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  const eligibility = evaluateBlogContentEligibility({ ...payload, contentRisk: 'health_safety', coverImageUrl: COVER_IMAGE_URL }, { evaluatedAt: new Date('2026-09-13T00:00:00.000Z') });
  assert.notEqual(payload.contentHtml, RAW_CONTENT_HTML.trim());
  assert.match(payload.contentHtml, /href="https:\/\/www\.who\.int\/news-room\/fact-sheets\/detail\/physical-activity" rel="noopener noreferrer" target="_blank"/);
  assert.match(payload.contentHtml, /href="https:\/\/www\.cdc\.gov\/physicalactivity\/basics\/measuring\/index\.html" rel="noopener noreferrer" target="_blank"/);
  assert.match(payload.contentHtml, /href="https:\/\/www\.nhs\.uk\/better-health\/get-active\/get-running-with-couch-to-5k\/couch-to-5k-running-plan\/" rel="noopener noreferrer" target="_blank"/);
  assert.match(payload.contentHtml, /href="https:\/\/pagasa\.dost\.gov\.ph\/weather\/heat-index" rel="noopener noreferrer" target="_blank"/);
  assert.equal(eligibility.eligible, true);
  assert.deepEqual(eligibility.blockingReasons, []);
  assert.equal(eligibility.healthReviewRequired, true);
  assert.equal(eligibility.externalLinkCount, 4);
});

test('guide has a distinct 1600 by 900 WebP repository cover', async () => {
  assert.equal(fs.existsSync(COVER_IMAGE_PATH), true);
  const metadata = await sharp(COVER_IMAGE_PATH).metadata();
  assert.deepEqual([metadata.format, metadata.width, metadata.height], ['webp', 1600, 900]);
  const coverHash = crypto.createHash('sha256').update(fs.readFileSync(COVER_IMAGE_PATH)).digest('hex');
  const duplicates = fs.readdirSync(path.dirname(COVER_IMAGE_PATH)).filter((name) => name.endsWith('.webp') && name !== path.basename(COVER_IMAGE_PATH) && crypto.createHash('sha256').update(fs.readFileSync(path.join(path.dirname(COVER_IMAGE_PATH), name))).digest('hex') === coverHash);
  assert.deepEqual(duplicates, []);
});

test('guide is registered and seeded exactly once for October 1', () => {
  const seededPosts = POSTS.filter((post) => post.slug === CANONICAL_SLUG);
  const seededPost = seededPosts[0];
  assert.equal(getArticleModule(CANONICAL_SLUG).ARTICLE, ARTICLE);
  assert.equal(listArticleSlugs().length, 58);
  assert.equal(POSTS.length, 58);
  assert.equal(seededPosts.length, 1);
  assert.equal(getCanonicalSeed(CANONICAL_SLUG), seededPost);
  assert.equal(buildContentHtml(seededPost), seededPost.contentHtml);
  assert.equal(htmlToText(seededPost.contentHtml), buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL }).contentText);
  assert.equal(seededPost.coverImageUrl, COVER_IMAGE_URL);
  assert.equal(seededPost.status, 'scheduled');
  assert.equal(seededPost.publishedAt, PUBLISH_AT);
});

test('guide omits links to later unpublished October articles', () => {
  const payload = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  for (const slug of ['how-to-increase-running-distance', 'what-is-an-easy-run', 'how-to-stay-hydrated-during-long-runs', 'how-to-prepare-for-a-long-run']) {
    assert.equal(payload.contentHtml.includes(`/blog/${slug}`), false);
    assert.equal(POSTS.find((post) => post.slug === CANONICAL_SLUG).links.includes(`/blog/${slug}`), false);
  }
});

test('creator schedules the local cover with a current health review and noindex', () => {
  assert.deepEqual(parseArguments(['--slug', CANONICAL_SLUG, '--apply', '--confirm-editorial-review', '--publish-at', PUBLISH_AT]), { slug: CANONICAL_SLUG, mode: 'apply', confirmEditorialReview: true, publishAt: PUBLISH_AT });
  assert.equal(validateCoverImageUrl(COVER_IMAGE_URL), COVER_IMAGE_URL);
  const classification = getInitialIndexingClassification(CANONICAL_SLUG);
  assert.deepEqual(classification, { contentRisk: 'health_safety', indexCandidate: false, plannedNoindex: true });
  const payload = buildCreatePayload({ slug: CANONICAL_SLUG, authorId: '507f1f77bcf86cd799439011', now: new Date('2026-09-13T01:00:00.000Z'), publishAt: new Date(PUBLISH_AT), confirmEditorialReview: true });
  assert.equal(payload.status, 'scheduled');
  assert.equal(payload.publishedAt.toISOString(), PUBLISH_AT);
  assert.equal(payload.searchIndexingStatus, 'noindex');
  assert.equal(payload.searchIndexingReason, 'pending_expert_review');
  assert.equal(hasCurrentPublicationReview(payload), true);
  assert.match(packageJson.scripts['blog:update-long-run-beginners'], new RegExp(`--slug ${CANONICAL_SLUG}`));
});

test('guide rejects unsafe universal, catch-up, event, and fueling claims', () => {
  const payload = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  const withClaim = (claim) => ({ ...payload, contentText: `${payload.contentText} ${claim}`, contentRaw: `${payload.contentText} ${claim}` });
  assert.throws(() => validateArticlePayload(withClaim('Every beginner must run 20 kilometres.')), /universal distance/);
  assert.throws(() => validateArticlePayload(withClaim('The 10 percent guarantees safe progress.')), /10 percent rule/);
  assert.throws(() => validateArticlePayload(withClaim('Never walk during a long run.')), /exclude walking/);
  assert.throws(() => validateArticlePayload(withClaim('Everyone needs the same gel.')), /fueling or hydration/);
  assert.throws(() => validateArticlePayload(withClaim('Every virtual event accepts walking.')), /event eligibility/);
  assert.throws(() => validateArticlePayload(withClaim('You should double the next run.')), /catch-up activity/);
  assert.throws(() => buildArticlePayload(), /cover artwork/);
});
