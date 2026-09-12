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
const tenKGuide = require('../src/content/ten-k-training-plan-beginners');
const {
  ARTICLE,
  CANONICAL_SLUG,
  RAW_CONTENT_HTML,
  REQUIRED_HEADINGS,
  REQUIRED_LINKS,
  buildArticlePayload,
  validateArticlePayload
} = require('../src/content/how-to-breathe-while-running');

const COVER_IMAGE_URL = '/images/blog/covers/how-to-breathe-while-running.webp';
const COVER_IMAGE_PATH = path.join(__dirname, '..', 'src', 'public', 'images', 'blog', 'covers', 'how-to-breathe-while-running.webp');

test('running breathing guide builds a substantive beginner-friendly payload', () => {
  const payload = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  const wordCount = payload.contentText.split(/\s+/).filter(Boolean).length;

  assert.equal(ARTICLE.slug, CANONICAL_SLUG);
  assert.equal(payload.title, 'How to Breathe While Running');
  assert.equal(payload.seoTitle, 'How to Breathe While Running: A Beginner-Friendly Guide');
  assert.equal(payload.category, 'Training');
  assert.ok(BLOG_CATEGORIES.includes(payload.category));
  assert.equal(payload.tags.length, 8);
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
  assert.doesNotMatch(payload.contentHtml, /<h1\b/i);
  assert.match(payload.contentText, /adjust effort before trying to perfect a technique/i);
  assert.match(payload.contentText, /There is no single nose-versus-mouth rule or step-count rhythm/i);
  assert.match(payload.contentText, /A missed portion is not training debt/i);
  assert.match(payload.contentText, /symptoms are not specific enough to diagnose it/i);
  assert.match(payload.contentText, /Population guidance and research summaries are not personal training plans, medical advice, diagnosis/i);

  for (const heading of REQUIRED_HEADINGS) assert.ok(payload.contentHtml.includes(`<h2>${heading}</h2>`), `missing heading: ${heading}`);
  for (const link of REQUIRED_LINKS) assert.ok(payload.contentHtml.includes(link), `missing link: ${link}`);
});

test('running breathing guide sanitizes authoritative sources and passes health eligibility', () => {
  const payload = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  const eligibility = evaluateBlogContentEligibility({
    ...payload,
    contentRisk: 'health_safety',
    coverImageUrl: COVER_IMAGE_URL
  }, { evaluatedAt: new Date('2026-08-30T00:00:00.000Z') });

  assert.notEqual(payload.contentHtml, RAW_CONTENT_HTML.trim());
  assert.doesNotMatch(payload.contentHtml, /<script|javascript:/i);
  assert.match(payload.contentHtml, /href="https:\/\/www\.cdc\.gov\/physical-activity-basics\/measuring\/index\.html" rel="noopener noreferrer" target="_blank"/);
  assert.match(payload.contentHtml, /href="https:\/\/www\.nhs\.uk\/better-health\/get-active\/get-running-with-couch-to-5k\/couch-to-5k-running-plan\/" rel="noopener noreferrer" target="_blank"/);
  assert.match(payload.contentHtml, /href="https:\/\/pmc\.ncbi\.nlm\.nih\.gov\/articles\/PMC8967998\/" rel="noopener noreferrer" target="_blank"/);
  assert.match(payload.contentHtml, /href="https:\/\/www\.thoracic\.org\/statements\/resources\/allergy-asthma\/exercise-induced-bronchoconstriction\.pdf" rel="noopener noreferrer" target="_blank"/);
  assert.equal(eligibility.eligible, true);
  assert.deepEqual(eligibility.blockingReasons, []);
  assert.equal(eligibility.healthReviewRequired, true);
  assert.equal(eligibility.externalLinkCount, 4);
});

test('running breathing guide links to the now-published cadence guide', () => {
  const href = '/blog/running-cadence-explained';
  const payload = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  assert.equal(REQUIRED_LINKS.some((link) => link.includes(href)), true);
  assert.equal(payload.contentHtml.includes(`href="${href}"`), true);
  assert.equal(POSTS.find((post) => post.slug === CANONICAL_SLUG).links.includes(href), true);
});

test('running breathing guide has a distinct 1600 by 900 repository cover', async () => {
  assert.equal(fs.existsSync(COVER_IMAGE_PATH), true);
  const metadata = await sharp(COVER_IMAGE_PATH).metadata();
  assert.equal(metadata.format, 'webp');
  assert.equal(metadata.width, 1600);
  assert.equal(metadata.height, 900);
});

test('running breathing guide is registered and seeded once for September 5', () => {
  const articleModule = getArticleModule(CANONICAL_SLUG);
  const seededPosts = POSTS.filter((post) => post.slug === CANONICAL_SLUG);
  const seededPost = seededPosts[0];

  assert.equal(articleModule.ARTICLE, ARTICLE);
  assert.ok(listArticleSlugs().includes(CANONICAL_SLUG));
  assert.equal(listArticleSlugs().length, 57);
  assert.equal(seededPosts.length, 1);
  assert.equal(getCanonicalSeed(CANONICAL_SLUG), seededPost);
  assert.equal(buildContentHtml(seededPost), seededPost.contentHtml);
  assert.equal(htmlToText(seededPost.contentHtml), buildArticlePayload({ coverImageUrl: seededPost.coverImageUrl }).contentText);
  assert.equal(seededPost.coverImageUrl, COVER_IMAGE_URL);
  assert.equal(seededPost.status, 'scheduled');
  assert.equal(seededPost.publishedAt, '2026-09-05T11:00:00.000Z');
  assert.equal(seededPost.featured, false);
});

test('running breathing guide is noindex health content with create and update wiring', () => {
  const classification = getInitialIndexingClassification(CANONICAL_SLUG);
  const publishAt = '2026-09-05T11:00:00.000Z';
  assert.deepEqual(parseCreateArguments(['--slug', CANONICAL_SLUG, '--apply', '--confirm-editorial-review', '--publish-at', publishAt]), { slug: CANONICAL_SLUG, mode: 'apply', confirmEditorialReview: true, publishAt });
  assert.deepEqual(parseUpdateArguments(['--slug', CANONICAL_SLUG]), { slug: CANONICAL_SLUG, mode: 'dry-run' });
  assert.equal(classification.contentRisk, 'health_safety');
  assert.equal(classification.plannedNoindex, true);
  assert.equal(classification.indexCandidate, false);
  assert.match(packageJson.scripts['blog:update-running-breathing'], new RegExp(`--slug ${CANONICAL_SLUG}`));
});

test('running breathing creation payload uses its cover and a current review', () => {
  const reviewedAt = new Date('2026-09-12T08:00:00.000Z');
  const payload = buildCreatePayload({
    slug: CANONICAL_SLUG,
    authorId: '507f1f77bcf86cd799439011',
    now: reviewedAt,
    confirmEditorialReview: true
  });
  assert.equal(payload.coverImageUrl, COVER_IMAGE_URL);
  assert.equal(payload.status, 'published');
  assert.equal(payload.searchIndexingStatus, 'noindex');
  assert.equal(payload.searchIndexingReason, 'pending_expert_review');
  assert.equal(hasCurrentPublicationReview(payload), true);
});

test('beginner 10K guide reciprocally links to the breathing guide', () => {
  const href = '/blog/how-to-breathe-while-running';
  const payload = tenKGuide.buildArticlePayload({ coverImageUrl: 'https://cdn.example.com/cover.webp' });
  assert.ok(tenKGuide.REQUIRED_LINKS.includes(`href="${href}"`));
  assert.ok(payload.contentHtml.includes(`href="${href}"`));
  assert.ok(POSTS.find((post) => post.slug === tenKGuide.CANONICAL_SLUG).links.includes(href));
});

test('running breathing guide rejects unsafe universal and diagnostic claims', () => {
  const payload = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  const withClaim = (claim) => ({ ...payload, contentText: `${payload.contentText} ${claim}`, contentRaw: `${payload.contentText} ${claim}` });
  assert.throws(() => validateArticlePayload(withClaim('Every runner must breathe only through the nose.')), /nasal breathing/);
  assert.throws(() => validateArticlePayload(withClaim('Every runner must use a 2:2 step rhythm.')), /universal breathing rhythm/);
  assert.throws(() => validateArticlePayload(withClaim('This technique guarantees faster running.')), /guarantee breathing outcomes/);
  assert.throws(() => validateArticlePayload(withClaim('Wheezing definitely means asthma.')), /diagnose breathing conditions/);
  assert.throws(() => validateArticlePayload(withClaim('You should keep running through wheezing.')), /concerning symptoms/);
  assert.throws(() => validateArticlePayload(withClaim('You should make up a missed run by sprinting.')), /catch-up activity/);
  assert.throws(() => buildArticlePayload(), /cover artwork/);
});
