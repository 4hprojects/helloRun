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
const paceGuide = require('../src/content/beginner-running-pace-guide');
const tenKGuide = require('../src/content/ten-k-training-plan-beginners');
const {
  ARTICLE,
  CANONICAL_SLUG,
  RAW_CONTENT_HTML,
  REQUIRED_HEADINGS,
  REQUIRED_LINKS,
  buildArticlePayload,
  validateArticlePayload
} = require('../src/content/how-long-to-run-5k-10k-21k');

const COVER_IMAGE_URL = '/images/blog/covers/how-long-to-run-5k-10k-21k.webp';
const COVER_IMAGE_PATH = path.join(__dirname, '..', 'src', 'public', 'images', 'blog', 'covers', 'how-long-to-run-5k-10k-21k.webp');

test('distance finish-time guide builds a substantive contextual comparison payload', () => {
  const payload = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  const wordCount = payload.contentText.split(/\s+/).filter(Boolean).length;

  assert.equal(ARTICLE.slug, CANONICAL_SLUG);
  assert.equal(payload.title, 'How Long Does It Take to Run 5K, 10K, and 21K?');
  assert.equal(payload.seoTitle, payload.title);
  assert.equal(payload.category, 'Training');
  assert.ok(BLOG_CATEGORIES.includes(payload.category));
  assert.deepEqual(payload.tags, [
    'average running time', '5K finish time', '10K finish time', 'half marathon time',
    'beginner pace', 'run walk time', 'race planning', 'distance goals'
  ]);
  assert.ok(payload.tags.every((tag) => tag.length <= 30));
  assert.ok(payload.excerpt.length <= 220);
  assert.ok(payload.seoTitle.length <= 160);
  assert.ok(payload.seoDescription.length <= 320);
  assert.ok(payload.coverImageAlt.length <= 180);
  assert.ok(wordCount >= 2500);
  assert.ok(wordCount <= 3000);
  assert.equal(payload.contentRaw, payload.contentText);
  assert.equal(payload.readingTime, Math.ceil(wordCount / 180));
  assert.equal(payload.ogImageUrl, COVER_IMAGE_URL);
  assert.doesNotThrow(() => validateArticlePayload(payload));
  assert.doesNotMatch(payload.contentHtml, /<h1\b|<table\b/i);
  assert.match(payload.contentText, /There is no single correct average running time that every beginner should match/i);
  assert.match(payload.contentText, /historical race-finisher context, not a current population average/i);
  assert.match(payload.contentText, /A pending submission is potential progress, not an approved result/i);
  assert.match(payload.contentText, /Walking does not automatically qualify for every event/i);

  for (const heading of REQUIRED_HEADINGS) assert.ok(payload.contentHtml.includes(`<h2>${heading}</h2>`), `missing heading: ${heading}`);
  for (const link of REQUIRED_LINKS) assert.ok(payload.contentHtml.includes(link), `missing link: ${link}`);
});

test('finish-time guide excludes links to unpublished September articles', () => {
  const payload = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  for (const href of [
    '/blog/how-to-run-your-first-10k-virtual-run',
    '/blog/21k-half-marathon-for-beginners',
    '/blog/how-to-set-running-goals-for-the-rest-of-the-year'
  ]) {
    assert.equal(REQUIRED_LINKS.some((link) => link.includes(href)), false);
    assert.equal(payload.contentHtml.includes(`href="${href}"`), false);
    assert.equal(POSTS.find((post) => post.slug === CANONICAL_SLUG).links.includes(href), false);
  }
});

test('pace reference preserves exact 5K, 10K, and half-marathon calculations', () => {
  const { contentText } = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  const expected = [
    ['5:00', '25:00', '50:00', '1:45:29'],
    ['6:00', '30:00', '1:00:00', '2:06:35'],
    ['7:00', '35:00', '1:10:00', '2:27:41'],
    ['8:00', '40:00', '1:20:00', '2:48:47'],
    ['9:00', '45:00', '1:30:00', '3:09:53'],
    ['10:00', '50:00', '1:40:00', '3:30:59'],
    ['12:00', '1:00:00', '2:00:00', '4:13:10'],
    ['15:00', '1:15:00', '2:30:00', '5:16:28']
  ];
  for (const [pace, fiveK, tenK, half] of expected) {
    assert.match(contentText, new RegExp(`${pace} min/km: 5K — ${fiveK}; 10K — ${tenK}; half marathon — ${half}`));
  }
  assert.match(contentText, /officially 21\.0975 kilometres/i);
});

test('finish-time guide sanitizes sources and passes health-sensitive eligibility', () => {
  const payload = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  const eligibility = evaluateBlogContentEligibility({ ...payload, contentRisk: 'health_safety', coverImageUrl: COVER_IMAGE_URL }, { evaluatedAt: new Date('2026-08-30T00:00:00.000Z') });

  assert.notEqual(payload.contentHtml, RAW_CONTENT_HTML.trim());
  assert.doesNotMatch(payload.contentHtml, /<script|javascript:/i);
  assert.match(payload.contentHtml, /href="https:\/\/worldathletics\.org\/disciplines\/road-running\/half-marathon" rel="noopener noreferrer" target="_blank"/);
  assert.match(payload.contentHtml, /href="https:\/\/worldathletics\.org\/records\/certified-roadevents" rel="noopener noreferrer" target="_blank"/);
  assert.match(payload.contentHtml, /href="https:\/\/runrepeat\.com\/uk\/how-do-you-masure-up-the-runners-percentile-calculator" rel="noopener noreferrer" target="_blank"/);
  assert.equal(eligibility.eligible, true);
  assert.deepEqual(eligibility.blockingReasons, []);
  assert.equal(eligibility.healthReviewRequired, true);
  assert.equal(eligibility.externalLinkCount, 3);
});

test('finish-time guide has a distinct 1600 by 900 repository cover', async () => {
  assert.equal(fs.existsSync(COVER_IMAGE_PATH), true);
  const metadata = await sharp(COVER_IMAGE_PATH).metadata();
  assert.equal(metadata.format, 'webp');
  assert.equal(metadata.width, 1600);
  assert.equal(metadata.height, 900);
});

test('finish-time guide is registered and seeded once for September 8', () => {
  const articleModule = getArticleModule(CANONICAL_SLUG);
  const seededPosts = POSTS.filter((post) => post.slug === CANONICAL_SLUG);
  const seededPost = seededPosts[0];
  assert.equal(articleModule.ARTICLE, ARTICLE);
  assert.ok(listArticleSlugs().includes(CANONICAL_SLUG));
  assert.equal(listArticleSlugs().length, 64);
  assert.equal(seededPosts.length, 1);
  assert.equal(getCanonicalSeed(CANONICAL_SLUG), seededPost);
  assert.equal(buildContentHtml(seededPost), seededPost.contentHtml);
  assert.equal(htmlToText(seededPost.contentHtml), buildArticlePayload({ coverImageUrl: seededPost.coverImageUrl }).contentText);
  assert.equal(seededPost.coverImageUrl, COVER_IMAGE_URL);
  assert.equal(seededPost.ogImageUrl, COVER_IMAGE_URL);
  assert.equal(seededPost.status, 'scheduled');
  assert.equal(seededPost.publishedAt, '2026-09-08T11:00:00.000Z');
  assert.equal(seededPost.featured, false);
});

test('finish-time guide is noindex health content with create and update wiring', () => {
  const classification = getInitialIndexingClassification(CANONICAL_SLUG);
  const publishAt = '2026-09-08T11:00:00.000Z';
  assert.deepEqual(parseCreateArguments(['--slug', CANONICAL_SLUG, '--apply', '--confirm-editorial-review', '--publish-at', publishAt]), { slug: CANONICAL_SLUG, mode: 'apply', confirmEditorialReview: true, publishAt });
  assert.deepEqual(parseUpdateArguments(['--slug', CANONICAL_SLUG]), { slug: CANONICAL_SLUG, mode: 'dry-run' });
  assert.equal(classification.contentRisk, 'health_safety');
  assert.equal(classification.plannedNoindex, true);
  assert.equal(classification.indexCandidate, false);
  assert.match(packageJson.scripts['blog:update-running-finish-times'], new RegExp(`--slug ${CANONICAL_SLUG}`));
});

test('finish-time creation payload uses its cover and a current review', () => {
  const payload = buildCreatePayload({
    slug: CANONICAL_SLUG,
    authorId: '507f1f77bcf86cd799439011',
    now: new Date('2026-09-12T09:00:00.000Z'),
    confirmEditorialReview: true
  });
  assert.equal(payload.coverImageUrl, COVER_IMAGE_URL);
  assert.equal(payload.status, 'published');
  assert.equal(payload.searchIndexingStatus, 'noindex');
  assert.equal(payload.searchIndexingReason, 'pending_expert_review');
  assert.equal(hasCurrentPublicationReview(payload), true);
});

test('beginner pace guide reciprocally links to the finish-time guide', () => {
  const href = '/blog/how-long-to-run-5k-10k-21k';
  const payload = paceGuide.buildArticlePayload({ coverImageUrl: 'https://cdn.example.com/cover.webp' });
  assert.ok(paceGuide.REQUIRED_LINKS.includes(href));
  assert.ok(payload.contentHtml.includes(`href="${href}"`));
  assert.ok(POSTS.find((post) => post.slug === paceGuide.CANONICAL_SLUG).links.includes(href));
});

test('beginner 10K guide reciprocally links to the finish-time guide', () => {
  const href = '/blog/how-long-to-run-5k-10k-21k';
  const payload = tenKGuide.buildArticlePayload({ coverImageUrl: 'https://cdn.example.com/cover.webp' });
  assert.ok(tenKGuide.REQUIRED_LINKS.includes(`href="${href}"`));
  assert.ok(payload.contentHtml.includes(`href="${href}"`));
  assert.ok(POSTS.find((post) => post.slug === tenKGuide.CANONICAL_SLUG).links.includes(href));
});

test('finish-time guide rejects universal, guaranteed, and unsupported claims', () => {
  const payload = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  const withClaim = (claim) => ({ ...payload, contentText: `${payload.contentText} ${claim}`, contentRaw: `${payload.contentText} ${claim}` });
  assert.throws(() => validateArticlePayload(withClaim('Every beginner must finish 5K in 30 minutes.')), /universal finish time/);
  assert.throws(() => validateArticlePayload(withClaim('34:37 is the ideal beginner time.')), /dataset midpoints/);
  assert.throws(() => validateArticlePayload(withClaim('The pace chart guarantees a finish.')), /guarantee calculated outcomes/);
  assert.throws(() => validateArticlePayload(withClaim('Doubling your 5K time will predict your 10K.')), /doubled 5K prediction/);
  assert.throws(() => validateArticlePayload(withClaim('Walking always counts.')), /walking eligibility/);
  assert.throws(() => validateArticlePayload(withClaim('You should make up a missed day by doubling the next run.')), /catch-up activity/);
  assert.throws(() => validateArticlePayload(withClaim('A pending submission is approved.')), /pending progress/);
  assert.throws(() => buildArticlePayload(), /cover artwork/);
});
