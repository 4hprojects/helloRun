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
const { buildFaqPresentation } = require('../src/services/faq-page-presentation.service');
const runWalkGuide = require('../src/content/run-walk-method-beginner-guide');
const virtualRunGuide = require('../src/content/what-is-virtual-run-guide');
const tenKGuide = require('../src/content/ten-k-training-plan-beginners');
const {
  ARTICLE,
  CANONICAL_SLUG,
  RAW_CONTENT_HTML,
  REQUIRED_HEADINGS,
  REQUIRED_LINKS,
  buildArticlePayload,
  validateArticlePayload
} = require('../src/content/can-you-walk-virtual-run');

const COVER_IMAGE_URL = '/images/blog/covers/can-you-walk-a-virtual-run.webp';
const COVER_IMAGE_PATH = path.join(__dirname, '..', 'src', 'public', 'images', 'blog', 'covers', 'can-you-walk-a-virtual-run.webp');

test('virtual-run walking guide builds a substantive rules-first payload', () => {
  const payload = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  const wordCount = payload.contentText.split(/\s+/).filter(Boolean).length;
  assert.equal(ARTICLE.slug, CANONICAL_SLUG);
  assert.equal(payload.title, 'Can You Walk a Virtual Run? What Participants Should Check');
  assert.equal(payload.seoTitle, payload.title);
  assert.equal(payload.category, 'Virtual Run Guide');
  assert.ok(BLOG_CATEGORIES.includes(payload.category));
  assert.deepEqual(payload.tags, [
    'virtual run walking', 'walk virtual race', 'walking challenge', 'walk-run challenge',
    'walking virtual 5k', 'walking virtual 10k', 'beginner walking', 'virtual run rules'
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
  assert.doesNotMatch(payload.contentHtml, /<h1\b/i);
  assert.match(payload.contentText, /Yes, you can walk some virtual runs—but not all of them/i);
  assert.match(payload.contentText, /Check the activity types and rules published on the specific event page/i);
  assert.match(payload.contentText, /Platform support for a label is not a statement that every event accepts it/i);
  assert.match(payload.contentText, /Walking speed is not a measure of commitment/i);
  assert.match(payload.contentText, /submitted or pending is not approved/i);
  for (const heading of REQUIRED_HEADINGS) assert.ok(payload.contentHtml.includes(`<h2>${heading}</h2>`), `missing heading: ${heading}`);
  for (const link of REQUIRED_LINKS) assert.ok(payload.contentHtml.includes(link), `missing link: ${link}`);
});

test('virtual-run walking guide distinguishes formats, activity types, and proof', () => {
  const { contentText } = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  assert.match(contentText, /Two 2\.5K walks do not automatically equal one qualifying 5K/i);
  assert.match(contentText, /An accumulated challenge allows multiple approved activities/i);
  assert.match(contentText, /supports separate run, walk, hike, and trail run activity labels/i);
  assert.match(contentText, /Importing an activity does not transform an ineligible walk into a run/i);
  assert.match(contentText, /A person who can comfortably walk 5K is not automatically prepared to double the distance/i);
  assert.match(contentText, /ordinary daily steps do not universally qualify/i);
});

test('virtual-run walking guide sanitizes official sources and passes health eligibility', () => {
  const payload = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  const eligibility = evaluateBlogContentEligibility({ ...payload, contentRisk: 'health_safety', coverImageUrl: COVER_IMAGE_URL }, { evaluatedAt: new Date('2026-08-30T00:00:00.000Z') });
  assert.notEqual(payload.contentHtml, RAW_CONTENT_HTML.trim());
  assert.doesNotMatch(payload.contentHtml, /<script|javascript:/i);
  assert.match(payload.contentHtml, /href="https:\/\/www\.who\.int\/news-room\/fact-sheets\/detail\/physical-activity" rel="noopener noreferrer" target="_blank"/);
  assert.match(payload.contentHtml, /href="https:\/\/www\.cdc\.gov\/physical-activity-basics\/adding-adults\/what-counts\.html" rel="noopener noreferrer" target="_blank"/);
  assert.match(payload.contentHtml, /href="https:\/\/www\.nhs\.uk\/live-well\/exercise\/walking-for-health\/" rel="noopener noreferrer" target="_blank"/);
  assert.equal(eligibility.eligible, true);
  assert.deepEqual(eligibility.blockingReasons, []);
  assert.equal(eligibility.healthReviewRequired, true);
  assert.equal(eligibility.externalLinkCount, 3);
});

test('virtual-run walking guide has a distinct 1600 by 900 repository cover', async () => {
  assert.equal(fs.existsSync(COVER_IMAGE_PATH), true);
  const metadata = await sharp(COVER_IMAGE_PATH).metadata();
  assert.equal(metadata.format, 'webp');
  assert.equal(metadata.width, 1600);
  assert.equal(metadata.height, 900);
});

test('virtual-run walking guide is registered and seeded once for September 17', () => {
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
  assert.equal(seededPost.ogImageUrl, COVER_IMAGE_URL);
  assert.equal(seededPost.status, 'scheduled');
  assert.equal(seededPost.publishedAt, '2026-09-17T11:00:00.000Z');
  assert.equal(seededPost.featured, false);
});

test('virtual-run walking guide is noindex health content with create and update wiring', () => {
  const classification = getInitialIndexingClassification(CANONICAL_SLUG);
  const publishAt = '2026-09-17T11:00:00.000Z';
  assert.deepEqual(parseCreateArguments(['--slug', CANONICAL_SLUG, '--apply', '--confirm-editorial-review', '--publish-at', publishAt]), { slug: CANONICAL_SLUG, mode: 'apply', confirmEditorialReview: true, publishAt });
  assert.deepEqual(parseUpdateArguments(['--slug', CANONICAL_SLUG]), { slug: CANONICAL_SLUG, mode: 'dry-run' });
  assert.equal(classification.contentRisk, 'health_safety');
  assert.equal(classification.plannedNoindex, true);
  assert.equal(classification.indexCandidate, false);
  assert.match(packageJson.scripts['blog:update-virtual-run-walking'], new RegExp(`--slug ${CANONICAL_SLUG}`));
});

test('virtual-run walking creation payload schedules the local cover with a current review', () => {
  const reviewedAt = new Date('2026-09-13T08:00:00.000Z');
  const publishAt = new Date('2026-09-17T11:00:00.000Z');
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

test('existing evergreen guides and FAQ are prepared to link to virtual-run walking', () => {
  const href = '/blog/can-you-walk-a-virtual-run';
  for (const guide of [runWalkGuide, virtualRunGuide]) {
    const payload = guide.buildArticlePayload({ coverImageUrl: 'https://cdn.example.com/cover.webp' });
    assert.ok(guide.REQUIRED_LINKS.some((link) => link.includes(href)), `${guide.CANONICAL_SLUG} required links`);
    assert.ok(payload.contentHtml.includes(`href="${href}"`), `${guide.CANONICAL_SLUG} content`);
    assert.ok(POSTS.find((post) => post.slug === guide.CANONICAL_SLUG).links.includes(href), `${guide.CANONICAL_SLUG} seed links`);
  }
  const faq = buildFaqPresentation();
  const walkEntry = faq.categories.flatMap((category) => category.questions).find((entry) => entry.id === 'walk-or-other-activity');
  assert.ok(walkEntry.links.some((link) => link.href === href));
  assert.equal(tenKGuide.REQUIRED_LINKS.includes(`href="${href}"`), false);
});

test('virtual-run walking guide rejects universal acceptance and unsafe claims', () => {
  const payload = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  assert.doesNotMatch(payload.contentHtml, /href="\/blog\/how-to-run-your-first-10k-virtual-run"/);
  const withClaim = (claim) => ({ ...payload, contentText: `${payload.contentText} ${claim}`, contentRaw: `${payload.contentText} ${claim}` });
  assert.throws(() => validateArticlePayload(withClaim('All virtual runs allow walking.')), /universal walking acceptance/);
  assert.throws(() => validateArticlePayload(withClaim('Selecting the Walk option guarantees approval.')), /label with acceptance/);
  assert.throws(() => validateArticlePayload(withClaim('All daily steps count toward every virtual run.')), /universal step eligibility/);
  assert.throws(() => validateArticlePayload(withClaim('Two walks automatically become one 5K single activity.')), /combine sessions universally/);
  assert.throws(() => validateArticlePayload(withClaim('Relabel a walk as a run to qualify.')), /mislabeling/);
  assert.throws(() => validateArticlePayload(withClaim('Walking is safe for everyone.')), /guarantee walking safety/);
  assert.throws(() => buildArticlePayload(), /cover artwork/);
});
