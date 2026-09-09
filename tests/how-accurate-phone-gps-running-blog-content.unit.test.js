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
const { evaluateBlogContentEligibility } = require('../src/utils/blog-content-eligibility');
const { BLOG_CATEGORIES } = require('../src/utils/blog');
const { getCanonicalSeed, parseArguments: parseCreateArguments } = require('../src/scripts/create-adsense-blog');
const { parseArguments: parseUpdateArguments } = require('../src/scripts/update-adsense-blog');
const bestAppsGuide = require('../src/content/best-apps-virtual-run');
const safeRouteGuide = require('../src/content/choose-safe-virtual-run-route-guide');
const proofSubmissionGuide = require('../src/content/how-to-submit-run-proof');
const {
  ARTICLE,
  CANONICAL_SLUG,
  RAW_CONTENT_HTML,
  REQUIRED_HEADINGS,
  REQUIRED_LINKS,
  buildArticlePayload,
  validateArticlePayload
} = require('../src/content/how-accurate-phone-gps-running');

const COVER_IMAGE_URL = '/images/blog/covers/how-accurate-is-phone-gps-for-running.webp';
const COVER_IMAGE_PATH = path.join(__dirname, '..', 'src', 'public', 'images', 'blog', 'covers', 'how-accurate-is-phone-gps-for-running.webp');

test('phone GPS accuracy guide builds a substantive troubleshooting payload', () => {
  const payload = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  const wordCount = payload.contentText.split(/\s+/).filter(Boolean).length;
  assert.equal(ARTICLE.slug, CANONICAL_SLUG);
  assert.equal(payload.title, 'How Accurate Is Phone GPS for Running?');
  assert.equal(payload.seoTitle, payload.title);
  assert.equal(payload.category, 'Virtual Run Guide');
  assert.ok(BLOG_CATEGORIES.includes(payload.category));
  assert.deepEqual(payload.tags, [
    'phone GPS accuracy', 'running GPS accuracy', 'smartphone GPS', 'Strava GPS accuracy',
    'GPS drift running', 'running distance', 'run tracking', 'virtual run proof'
  ]);
  assert.ok(payload.tags.every((tag) => tag.length <= 30));
  assert.ok(payload.excerpt.length <= 220);
  assert.ok(payload.seoDescription.length <= 320);
  assert.ok(payload.coverImageAlt.length <= 180);
  assert.ok(wordCount >= 3000);
  assert.equal(payload.contentRaw, payload.contentText);
  assert.equal(payload.readingTime, Math.ceil(wordCount / 180));
  assert.equal(payload.ogImageUrl, COVER_IMAGE_URL);
  assert.doesNotThrow(() => validateArticlePayload(payload));
  assert.doesNotMatch(payload.contentHtml, /<h1\b/i);
  assert.match(payload.contentText, /Phone GPS is often accurate enough to record a recreational run/i);
  assert.match(payload.contentText, /phone GPS is a useful consumer measurement, not perfect ground truth/i);
  assert.match(payload.contentText, /A location accuracy radius is not the same thing as distance accuracy/i);
  assert.match(payload.contentText, /There is no universal distance percentage/i);
  assert.match(payload.contentText, /Submission or pending status is not the same as approved progress/i);
  for (const heading of REQUIRED_HEADINGS) assert.ok(payload.contentHtml.includes(`<h2>${heading}</h2>`), `missing heading: ${heading}`);
  for (const link of REQUIRED_LINKS) assert.ok(payload.contentHtml.includes(link), `missing link: ${link}`);
});

test('phone GPS accuracy guide explains error directions and practical setup checks', () => {
  const { contentText } = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  assert.match(contentText, /Small sideways errors can add zigzags and make a route long/i);
  assert.match(contentText, /Missing points can cut corners or bridge a gap with a straight segment and make it short/i);
  assert.match(contentText, /starting before a reliable initial position/i);
  assert.match(contentText, /approximate rather than precise access/i);
  assert.match(contentText, /Test your setup on a familiar route/i);
  assert.match(contentText, /Do not add points, draw a cleaner route, splice files/i);
});

test('phone GPS accuracy guide sanitizes primary sources and passes health-sensitive eligibility', () => {
  const payload = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  const eligibility = evaluateBlogContentEligibility({ ...payload, contentRisk: 'health_safety', coverImageUrl: COVER_IMAGE_URL }, { evaluatedAt: new Date('2026-08-30T00:00:00.000Z') });
  assert.notEqual(payload.contentHtml, RAW_CONTENT_HTML.trim());
  assert.doesNotMatch(payload.contentHtml, /<script|javascript:/i);
  assert.match(payload.contentHtml, /href="https:\/\/archive\.gps\.gov\/systems\/gps\/performance\/accuracy\/" rel="noopener noreferrer" target="_blank"/);
  assert.match(payload.contentHtml, /href="https:\/\/developer\.android\.com\/develop\/sensors-and-location\/location\/permissions" rel="noopener noreferrer" target="_blank"/);
  assert.match(payload.contentHtml, /href="https:\/\/developer\.android\.com\/develop\/sensors-and-location\/location\/battery" rel="noopener noreferrer" target="_blank"/);
  assert.match(payload.contentHtml, /href="https:\/\/support\.strava\.com\/en-us\/articles\/15402181-bad-gps-data" rel="noopener noreferrer" target="_blank"/);
  assert.match(payload.contentHtml, /href="https:\/\/gruppe\.wst\.univie\.ac\.at\/.+bauer2013_momm_inaccuracy_gps\.pdf" rel="noopener noreferrer" target="_blank"/);
  assert.equal(eligibility.eligible, true);
  assert.deepEqual(eligibility.blockingReasons, []);
  assert.equal(eligibility.healthReviewRequired, true);
  assert.equal(eligibility.externalLinkCount, 5);
});

test('phone GPS accuracy guide has a distinct 1600 by 900 repository cover', async () => {
  assert.equal(fs.existsSync(COVER_IMAGE_PATH), true);
  const metadata = await sharp(COVER_IMAGE_PATH).metadata();
  assert.equal(metadata.format, 'webp');
  assert.equal(metadata.width, 1600);
  assert.equal(metadata.height, 900);
});

test('phone GPS accuracy guide is registered and seeded once for September 15', () => {
  const articleModule = getArticleModule(CANONICAL_SLUG);
  const seededPosts = POSTS.filter((post) => post.slug === CANONICAL_SLUG);
  const seededPost = seededPosts[0];
  assert.equal(articleModule.ARTICLE, ARTICLE);
  assert.ok(listArticleSlugs().includes(CANONICAL_SLUG));
  assert.equal(listArticleSlugs().length, 52);
  assert.equal(seededPosts.length, 1);
  assert.equal(getCanonicalSeed(CANONICAL_SLUG), seededPost);
  assert.equal(buildContentHtml(seededPost), seededPost.contentHtml);
  assert.equal(htmlToText(seededPost.contentHtml), buildArticlePayload({ coverImageUrl: seededPost.coverImageUrl }).contentText);
  assert.equal(seededPost.coverImageUrl, COVER_IMAGE_URL);
  assert.equal(seededPost.ogImageUrl, COVER_IMAGE_URL);
  assert.equal(seededPost.status, 'scheduled');
  assert.equal(seededPost.publishedAt, '2026-09-15T11:00:00.000Z');
  assert.equal(seededPost.featured, false);
});

test('phone GPS accuracy guide is noindex health content with create and update wiring', () => {
  const classification = getInitialIndexingClassification(CANONICAL_SLUG);
  const publishAt = '2026-09-15T11:00:00.000Z';
  assert.deepEqual(parseCreateArguments(['--slug', CANONICAL_SLUG, '--apply', '--publish-at', publishAt]), { slug: CANONICAL_SLUG, mode: 'apply', publishAt });
  assert.deepEqual(parseUpdateArguments(['--slug', CANONICAL_SLUG]), { slug: CANONICAL_SLUG, mode: 'dry-run' });
  assert.equal(classification.contentRisk, 'health_safety');
  assert.equal(classification.plannedNoindex, true);
  assert.equal(classification.indexCandidate, false);
  assert.match(packageJson.scripts['blog:update-phone-gps-accuracy'], new RegExp(`--slug ${CANONICAL_SLUG}`));
});

test('the three primary existing guides reciprocally link to phone GPS accuracy', () => {
  const href = '/blog/how-accurate-is-phone-gps-for-running';
  for (const guide of [bestAppsGuide, safeRouteGuide, proofSubmissionGuide]) {
    const payload = guide.buildArticlePayload({ coverImageUrl: 'https://cdn.example.com/cover.webp' });
    assert.ok(guide.REQUIRED_LINKS.some((link) => link.includes(href)), `${guide.CANONICAL_SLUG} required links`);
    assert.ok(payload.contentHtml.includes(`href="${href}"`), `${guide.CANONICAL_SLUG} content`);
    assert.ok(POSTS.find((post) => post.slug === guide.CANONICAL_SLUG).links.includes(href), `${guide.CANONICAL_SLUG} seed links`);
  }
});

test('phone GPS accuracy guide rejects guarantees, invented proof, and rigid buffers', () => {
  const comparisonHref = '/blog/gps-watch-vs-running-app';
  assert.ok(REQUIRED_LINKS.includes(`href="${comparisonHref}"`));
  assert.ok(POSTS.find((post) => post.slug === CANONICAL_SLUG).links.includes(comparisonHref));
  const href = '/blog/how-to-run-your-first-10k-virtual-run';
  assert.ok(REQUIRED_LINKS.includes(`href="${href}"`));
  assert.ok(POSTS.find((post) => post.slug === CANONICAL_SLUG).links.includes(href));
  const payload = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  const withClaim = (claim) => ({ ...payload, contentText: `${payload.contentText} ${claim}`, contentRaw: `${payload.contentText} ${claim}` });
  assert.throws(() => validateArticlePayload(withClaim('Phone GPS is always accurate.')), /guarantee GPS accuracy/);
  assert.throws(() => validateArticlePayload(withClaim('All phones are accurate within 2%.')), /universal accuracy percentage/);
  assert.throws(() => validateArticlePayload(withClaim('Strava always fixes bad GPS.')), /promise GPS repair/);
  assert.throws(() => validateArticlePayload(withClaim('Every virtual event accepts phone GPS.')), /universal event acceptance/);
  assert.throws(() => validateArticlePayload(withClaim('Draw GPS points to fix the route.')), /manufactured GPS evidence/);
  assert.throws(() => validateArticlePayload(withClaim('You must run an extra 10%.')), /universal distance buffer/);
  assert.throws(() => buildArticlePayload(), /cover artwork/);
});
