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
const thirtyDayChallenge = require('../src/content/thirty-day-running-challenge-beginners');
const beginner5kGuide = require('../src/content/beginner-5k-training-plan');
const {
  ARTICLE,
  CANONICAL_SLUG,
  RAW_CONTENT_HTML,
  REQUIRED_HEADINGS,
  REQUIRED_LINKS,
  buildArticlePayload,
  validateArticlePayload
} = require('../src/content/ten-k-training-plan-beginners');

const COVER_IMAGE_URL = '/images/blog/covers/10k-training-plan-for-beginners.webp';
const COVER_IMAGE_PATH = path.join(
  __dirname,
  '..',
  'src',
  'public',
  'images',
  'blog',
  'covers',
  '10k-training-plan-for-beginners.webp'
);

test('beginner 10K guide builds a substantive flexible progression payload', () => {
  const payload = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  const wordCount = payload.contentText.split(/\s+/).filter(Boolean).length;

  assert.equal(ARTICLE.slug, CANONICAL_SLUG);
  assert.equal(payload.title, '10K Training Plan for Beginners: Prepare for Your First 10K');
  assert.equal(payload.seoTitle, payload.title);
  assert.equal(payload.category, 'Training');
  assert.ok(BLOG_CATEGORIES.includes(payload.category));
  assert.deepEqual(payload.tags, [
    '10K training plan', 'beginner 10K', 'first 10K', '5K to 10K',
    'easy running', 'run walk training', 'long run', 'race preparation'
  ]);
  assert.ok(payload.tags.every((tag) => tag.length <= 30));
  assert.ok(payload.excerpt.length <= 220);
  assert.ok(payload.seoTitle.length <= 160);
  assert.ok(payload.seoDescription.length <= 320);
  assert.ok(payload.coverImageAlt.length <= 180);
  assert.ok(payload.contentHtml.length <= 50000);
  assert.ok(payload.contentText.length <= 50000);
  assert.ok(wordCount >= 2500);
  assert.ok(wordCount <= 3000);
  assert.equal(payload.contentRaw, payload.contentText);
  assert.equal(payload.readingTime, Math.ceil(wordCount / 180));
  assert.equal(payload.ogImageUrl, COVER_IMAGE_URL);
  assert.doesNotThrow(() => validateArticlePayload(payload));

  assert.doesNotMatch(payload.contentHtml, /<h1\b/i);
  assert.doesNotMatch(payload.contentHtml, /<h[12]>10K Training Plan for Beginners:/i);
  assert.match(payload.contentText, /extend a repeatable 5K foundation/i);
  assert.match(payload.contentText, /Eight weeks is an example, not a universal deadline/i);
  assert.match(payload.contentText, /Define E as a familiar easy session.*L as your current repeatable longer activity/is);
  assert.match(payload.contentText, /Mina has completed several comfortable 5K run-walk activities/i);
  assert.match(payload.contentText, /A missed session is information, not training debt/i);
  assert.match(payload.contentText, /Population recommendations describe activity associated with health benefits; they are not personal training plans/i);
  assert.match(payload.contentText, /A pending activity is potential progress, not official progress/i);

  for (const heading of REQUIRED_HEADINGS) {
    assert.ok(payload.contentHtml.includes(`<h2>${heading}</h2>`), `missing required heading: ${heading}`);
  }
  for (const link of REQUIRED_LINKS) {
    assert.ok(payload.contentHtml.includes(link), `missing required link: ${link}`);
  }
});

test('beginner 10K plan excludes links to unpublished September articles', () => {
  const payload = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  const unpublishedHrefs = [
    '/blog/can-you-walk-a-virtual-run',
    '/blog/how-to-run-your-first-10k-virtual-run',
    '/blog/21k-half-marathon-for-beginners',
    '/blog/how-to-set-running-goals-for-the-rest-of-the-year'
  ];
  const publishedHref = '/blog/how-to-breathe-while-running';

  assert.ok(REQUIRED_LINKS.some((link) => link.includes(publishedHref)));
  assert.ok(payload.contentHtml.includes(`href="${publishedHref}"`));
  assert.ok(POSTS.find((post) => post.slug === CANONICAL_SLUG).links.includes(publishedHref));

  for (const href of unpublishedHrefs) {
    assert.equal(REQUIRED_LINKS.some((link) => link.includes(href)), false);
    assert.equal(payload.contentHtml.includes(`href="${href}"`), false);
    assert.equal(POSTS.find((post) => post.slug === CANONICAL_SLUG).links.includes(href), false);
  }
});

test('beginner 10K guide preserves all eight framework weeks', () => {
  const { contentHtml, contentText } = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });

  for (let week = 1; week <= 8; week += 1) {
    assert.ok(contentHtml.includes(`<strong>Week ${week} —`), `missing framework list week: ${week}`);
    assert.ok(contentHtml.includes(`<h3>Week ${week}:`), `missing explanatory week: ${week}`);
  }
  assert.match(contentText, /Week 4: consolidate.*Hold or reduce/is);
  assert.match(contentText, /Week 7: rehearse decisions.*tests logistics and decisions, not maximum fitness/is);
  assert.match(contentText, /Week 8: reduce and attempt.*Do not add missed distance/is);
});

test('beginner 10K guide sanitizes official sources and passes health eligibility', () => {
  const payload = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  const eligibility = evaluateBlogContentEligibility({
    ...payload,
    contentRisk: 'health_safety',
    coverImageUrl: COVER_IMAGE_URL
  }, { evaluatedAt: new Date('2026-08-30T00:00:00.000Z') });

  assert.equal(payload.contentHtml.includes('<script'), false);
  assert.equal(payload.contentHtml.includes('javascript:'), false);
  assert.notEqual(payload.contentHtml, RAW_CONTENT_HTML.trim());
  assert.match(payload.contentHtml, /href="https:\/\/www\.who\.int\/publications\/i\/item\/9789240015128" rel="noopener noreferrer" target="_blank"/);
  assert.match(payload.contentHtml, /href="https:\/\/www\.cdc\.gov\/healthy-weight-growth\/physical-activity\/getting-started\.html" rel="noopener noreferrer" target="_blank"/);
  assert.match(payload.contentHtml, /href="https:\/\/www\.nhs\.uk\/better-health\/get-active\/get-running-with-couch-to-5k\/couch-to-5k-running-plan\/" rel="noopener noreferrer" target="_blank"/);
  assert.equal(eligibility.eligible, true);
  assert.deepEqual(eligibility.blockingReasons, []);
  assert.equal(eligibility.healthReviewRequired, true);
  assert.ok(eligibility.wordCount >= 2500);
  assert.ok(eligibility.wordCount <= 3000);
  assert.ok(eligibility.semanticUnitCount >= 3);
  assert.equal(eligibility.externalLinkCount, 5);
});

test('beginner 10K guide has a distinct 1600 by 900 repository cover', async () => {
  assert.equal(fs.existsSync(COVER_IMAGE_PATH), true);
  const metadata = await sharp(COVER_IMAGE_PATH).metadata();
  assert.equal(metadata.format, 'webp');
  assert.equal(metadata.width, 1600);
  assert.equal(metadata.height, 900);
});

test('beginner 10K guide is registered and seeded once for September 3', () => {
  const articleModule = getArticleModule(CANONICAL_SLUG);
  const seededPosts = POSTS.filter((post) => post.slug === CANONICAL_SLUG);
  const seededPost = seededPosts[0];

  assert.equal(articleModule.ARTICLE, ARTICLE);
  assert.ok(listArticleSlugs().includes(CANONICAL_SLUG));
  assert.equal(listArticleSlugs().length, 58);
  assert.equal(seededPosts.length, 1);
  assert.equal(getCanonicalSeed(CANONICAL_SLUG), seededPost);
  assert.equal(buildContentHtml(seededPost), seededPost.contentHtml);
  assert.equal(htmlToText(seededPost.contentHtml), buildArticlePayload({ coverImageUrl: seededPost.coverImageUrl }).contentText);
  assert.equal(seededPost.coverImageUrl, COVER_IMAGE_URL);
  assert.equal(seededPost.ogImageUrl, COVER_IMAGE_URL);
  assert.equal(seededPost.status, 'scheduled');
  assert.equal(seededPost.publishedAt, '2026-09-03T11:00:00.000Z');
  assert.equal(seededPost.featured, false);
  assert.equal(seededPost.links.includes('/blog/can-you-walk-a-virtual-run'), false);
});

test('beginner 10K guide is classified for health review and wired for create/update commands', () => {
  const classification = getInitialIndexingClassification(CANONICAL_SLUG);
  const publishAt = '2026-09-03T11:00:00.000Z';

  assert.deepEqual(
    parseCreateArguments(['--slug', CANONICAL_SLUG, '--apply', '--confirm-editorial-review', '--publish-at', publishAt]),
    { slug: CANONICAL_SLUG, mode: 'apply', confirmEditorialReview: true, publishAt }
  );
  assert.deepEqual(parseUpdateArguments(['--slug', CANONICAL_SLUG]), { slug: CANONICAL_SLUG, mode: 'dry-run' });
  assert.deepEqual(
    parseUpdateArguments(['--slug', CANONICAL_SLUG, '--apply', '--confirm-editorial-review']),
    { slug: CANONICAL_SLUG, mode: 'apply', confirmEditorialReview: true }
  );
  assert.equal(classification.contentRisk, 'health_safety');
  assert.equal(classification.plannedNoindex, true);
  assert.equal(classification.indexCandidate, false);
  assert.match(packageJson.scripts['blog:update-beginner-10k'], new RegExp(`--slug ${CANONICAL_SLUG}`));
});

test('beginner 10K creation payload uses its local cover and a hash-bound review', () => {
  const reviewedAt = new Date('2026-09-12T07:00:00.000Z');
  const payload = buildCreatePayload({
    slug: CANONICAL_SLUG,
    authorId: '507f1f77bcf86cd799439011',
    now: reviewedAt,
    confirmEditorialReview: true
  });

  assert.equal(payload.coverImageUrl, COVER_IMAGE_URL);
  assert.equal(payload.status, 'published');
  assert.equal(payload.publishedAt.toISOString(), reviewedAt.toISOString());
  assert.equal(payload.searchIndexingStatus, 'noindex');
  assert.equal(payload.searchIndexingReason, 'pending_expert_review');
  assert.equal(hasCurrentPublicationReview(payload), true);
});

test('beginner 10K guide has reciprocal links from the 30-day and beginner 5K guides', () => {
  const href = '/blog/10k-training-plan-for-beginners';
  const challengePayload = thirtyDayChallenge.buildArticlePayload({ coverImageUrl: 'https://cdn.example.com/cover.webp' });
  const beginner5kPayload = beginner5kGuide.buildArticlePayload({ coverImageUrl: 'https://cdn.example.com/cover.webp' });

  assert.ok(thirtyDayChallenge.REQUIRED_LINKS.includes(`href="${href}"`));
  assert.ok(challengePayload.contentHtml.includes(`href="${href}"`));
  assert.ok(beginner5kGuide.REQUIRED_LINKS.includes(href));
  assert.ok(beginner5kPayload.contentHtml.includes(`href="${href}"`));
});

test('beginner 10K guide rejects unsafe universal and event claims', () => {
  const payload = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  const withClaim = (claim) => ({
    ...payload,
    contentText: `${payload.contentText} ${claim}`,
    contentRaw: `${payload.contentText} ${claim}`
  });

  assert.throws(() => validateArticlePayload(withClaim('Every runner must train five days each week.')), /universal frequency/);
  assert.throws(() => validateArticlePayload(withClaim('The 10% rule guarantees safety.')), /10% rule/);
  assert.throws(() => validateArticlePayload(withClaim('This plan guarantees a 10K finish.')), /guarantee outcomes/);
  assert.throws(() => validateArticlePayload(withClaim('You should make up a missed day by doubling the next session.')), /catch-up activity/);
  assert.throws(() => validateArticlePayload(withClaim('Every event accepts walking.')), /event eligibility/);
  assert.throws(() => validateArticlePayload(withClaim('Pending activity counts as official completion.')), /pending progress/);
  assert.throws(() => validateArticlePayload(withClaim('Every submission is automatically approved.')), /automatic approval/);
  assert.throws(() => buildArticlePayload(), /cover artwork/);
});
