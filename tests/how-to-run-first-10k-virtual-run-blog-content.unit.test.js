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
} = require('../src/content/how-to-run-first-10k-virtual-run');

const COVER_IMAGE_URL = '/images/blog/covers/how-to-run-your-first-10k-virtual-run.webp';
const COVER_IMAGE_PATH = path.join(__dirname, '..', 'src', 'public', 'images', 'blog', 'covers', 'how-to-run-your-first-10k-virtual-run.webp');

test('first virtual 10K guide builds a substantive event-execution payload', () => {
  const payload = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  const wordCount = payload.contentText.split(/\s+/).filter(Boolean).length;
  assert.equal(ARTICLE.slug, CANONICAL_SLUG);
  assert.equal(payload.title, 'How to Run Your First 10K Virtual Run');
  assert.equal(payload.seoTitle, 'How to Complete Your First 10K Virtual Run');
  assert.equal(payload.category, 'Virtual Run Guide');
  assert.ok(BLOG_CATEGORIES.includes(payload.category));
  assert.deepEqual(payload.tags, [
    'virtual 10K', '10K virtual run', 'first 10K run', 'beginner virtual run',
    'online 10K challenge', '10K pacing', 'virtual run proof', '10K preparation'
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
  assert.match(payload.contentText, /^To complete your first 10K virtual run, choose an event/i);
  assert.match(payload.contentText, /executing one first 10K opportunity after preparation; it is not another week-by-week training programme/i);
  for (const heading of REQUIRED_HEADINGS) assert.ok(payload.contentHtml.includes(`<h2>${heading}</h2>`), `missing heading: ${heading}`);
  for (const link of REQUIRED_LINKS) assert.ok(payload.contentHtml.includes(link), `missing link: ${link}`);
});

test('first virtual 10K guide omits links to later September articles', () => {
  const payload = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  assert.doesNotMatch(payload.contentHtml, /href="\/blog\/(?:gps-watch-vs-running-app|21k-half-marathon-for-beginners|how-to-set-running-goals-for-the-rest-of-the-year)"/);
});

test('first virtual 10K guide covers rules, preparation, execution, proof, and recovery', () => {
  const { contentText } = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  assert.match(contentText, /A seven-day readiness review/i);
  assert.match(contentText, /route has been inspected at a comparable time and has a backup/i);
  assert.match(contentText, /Use a pattern already practised during longer activity/i);
  assert.match(contentText, /exact phone, watch, app, activity profile, permissions, carrying position/i);
  assert.match(contentText, /Start more conservatively than the excitement of the first kilometre suggests/i);
  assert.match(contentText, /Do not chase GPS distance/i);
  assert.match(contentText, /Save and review your activity/i);
  assert.match(contentText, /Submitted or pending means the evidence exists for applicable checks; it is not yet approved completion/i);
  assert.match(contentText, /One first 10K is not a demand to repeat the distance immediately/i);
  assert.match(contentText, /Finishing one 10K—especially if it was a maximum effort—does not establish half-marathon readiness/i);
});

test('first virtual 10K guide sanitizes authoritative sources and requires health review', () => {
  const payload = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  const eligibility = evaluateBlogContentEligibility({ ...payload, contentRisk: 'health_safety', coverImageUrl: COVER_IMAGE_URL }, { evaluatedAt: new Date('2026-08-30T00:00:00.000Z') });
  assert.notEqual(payload.contentHtml, RAW_CONTENT_HTML.trim());
  assert.doesNotMatch(payload.contentHtml, /<script|javascript:/i);
  assert.match(payload.contentHtml, /href="https:\/\/www\.who\.int\/publications\/i\/item\/9789240015128" rel="noopener noreferrer" target="_blank"/);
  assert.match(payload.contentHtml, /href="https:\/\/www\.cdc\.gov\/healthy-weight-growth\/physical-activity\/getting-started\.html" rel="noopener noreferrer" target="_blank"/);
  assert.match(payload.contentHtml, /href="https:\/\/www\.nhs\.uk\/better-health\/get-active\/get-running-with-couch-to-5k\/couch-to-5k-running-plan\/" rel="noopener noreferrer" target="_blank"/);
  assert.match(payload.contentHtml, /href="https:\/\/worldathletics\.org\/personal-best\/performance\/how-run-best-virtual-race-advice" rel="noopener noreferrer" target="_blank"/);
  assert.equal(eligibility.eligible, true);
  assert.deepEqual(eligibility.blockingReasons, []);
  assert.equal(eligibility.healthReviewRequired, true);
  assert.equal(eligibility.externalLinkCount, 4);
});

test('first virtual 10K guide has a distinct 1600 by 900 repository cover', async () => {
  assert.equal(fs.existsSync(COVER_IMAGE_PATH), true);
  const metadata = await sharp(COVER_IMAGE_PATH).metadata();
  assert.equal(metadata.format, 'webp');
  assert.equal(metadata.width, 1600);
  assert.equal(metadata.height, 900);
});

test('first virtual 10K guide is registered and seeded once for September 19', () => {
  const articleModule = getArticleModule(CANONICAL_SLUG);
  const seededPosts = POSTS.filter((post) => post.slug === CANONICAL_SLUG);
  const seededPost = seededPosts[0];
  assert.equal(articleModule.ARTICLE, ARTICLE);
  assert.ok(listArticleSlugs().includes(CANONICAL_SLUG));
  assert.equal(listArticleSlugs().length, 68);
  assert.equal(seededPosts.length, 1);
  assert.equal(getCanonicalSeed(CANONICAL_SLUG), seededPost);
  assert.equal(buildContentHtml(seededPost), seededPost.contentHtml);
  assert.equal(htmlToText(seededPost.contentHtml), buildArticlePayload({ coverImageUrl: seededPost.coverImageUrl }).contentText);
  assert.equal(seededPost.coverImageUrl, COVER_IMAGE_URL);
  assert.equal(seededPost.ogImageUrl, COVER_IMAGE_URL);
  assert.equal(seededPost.status, 'scheduled');
  assert.equal(seededPost.publishedAt, '2026-09-19T11:00:00.000Z');
  assert.equal(seededPost.featured, false);
});

test('first virtual 10K guide is noindex health content with create and update wiring', () => {
  const classification = getInitialIndexingClassification(CANONICAL_SLUG);
  const publishAt = '2026-09-19T11:00:00.000Z';
  assert.deepEqual(parseCreateArguments(['--slug', CANONICAL_SLUG, '--apply', '--confirm-editorial-review', '--publish-at', publishAt]), { slug: CANONICAL_SLUG, mode: 'apply', confirmEditorialReview: true, publishAt });
  assert.deepEqual(parseUpdateArguments(['--slug', CANONICAL_SLUG]), { slug: CANONICAL_SLUG, mode: 'dry-run' });
  assert.equal(classification.contentRisk, 'health_safety');
  assert.equal(classification.plannedNoindex, true);
  assert.equal(classification.indexCandidate, false);
  assert.match(packageJson.scripts['blog:update-first-virtual-10k'], new RegExp(`--slug ${CANONICAL_SLUG}`));
});

test('first virtual 10K creation payload schedules the local cover with a current review', () => {
  const reviewedAt = new Date('2026-09-13T08:00:00.000Z');
  const publishAt = new Date('2026-09-19T11:00:00.000Z');
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

test('first virtual 10K guide rejects unsafe, dishonest, and universal claims', () => {
  const payload = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  const withClaim = (claim) => ({ ...payload, contentText: `${payload.contentText} ${claim}`, contentRaw: `${payload.contentText} ${claim}` });
  assert.throws(() => validateArticlePayload(withClaim('Every beginner can safely complete 10K.')), /universal readiness or safety/);
  assert.throws(() => validateArticlePayload(withClaim('Completing this plan guarantees a 10K.')), /guarantee completion/);
  assert.throws(() => validateArticlePayload(withClaim('You should make up missed training.')), /catch-up training/);
  assert.throws(() => validateArticlePayload(withClaim('Every virtual 10K accepts walking.')), /universal event acceptance/);
  assert.throws(() => validateArticlePayload(withClaim('Always run an extra 10%.')), /universal GPS buffer/);
  assert.throws(() => validateArticlePayload(withClaim('Edit GPS points to reach 10K.')), /manufactured evidence/);
  assert.throws(() => validateArticlePayload(withClaim('Pending evidence counts as official completion.')), /pending evidence officially/);
  assert.throws(() => validateArticlePayload(withClaim('21K is the automatic next step.')), /automatic 21K readiness/);
  assert.throws(() => buildArticlePayload(), /cover artwork/);
});
