'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const mongoose = require('mongoose');
const sharp = require('sharp');
const packageJson = require('../package.json');

const { POSTS, buildContentHtml, htmlToText } = require('../src/scripts/seed-adsense-blog-posts');
const { getArticleModule, listArticleSlugs } = require('../src/content/adsense-blog-article-registry');
const { evaluateBlogContentEligibility } = require('../src/utils/blog-content-eligibility');
const { BLOG_CATEGORIES } = require('../src/utils/blog');
const {
  GUIDE_AUTHOR_EMAIL, buildCreatePayload, getCanonicalSeed,
  parseArguments: parseCreateArguments
} = require('../src/scripts/create-adsense-blog');
const { parseArguments: parseUpdateArguments } = require('../src/scripts/update-adsense-blog');
const {
  ARTICLE, CANONICAL_SLUG, RAW_CONTENT_HTML, REQUIRED_HEADINGS, REQUIRED_LINKS,
  buildArticlePayload, validateArticlePayload
} = require('../src/content/returning-to-running-after-break-guide');

const COVER_IMAGE_URL = 'https://cdn.hellorun.online/blog/covers/698f1cb67748262281092639/1785689975436-85185858-returning-to-running-after-a-break-gradual-restart.webp';
const COVER_IMAGE_PATH = path.join(
  __dirname, '..', 'src', 'public', 'images', 'blog', 'covers',
  'returning-to-running-after-a-break-gradual-restart.webp'
);

test('gradual running restart builds a substantive, flexible Training payload', () => {
  const payload = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  const wordCount = payload.contentText.split(/\s+/).filter(Boolean).length;

  assert.equal(ARTICLE.slug, CANONICAL_SLUG);
  assert.equal(payload.title, 'Returning to Running After a Break: A Gradual Restart Plan');
  assert.equal(payload.category, 'Training');
  assert.ok(BLOG_CATEGORIES.includes(payload.category));
  assert.equal(payload.tags.length, 8);
  assert.deepEqual(payload.tags, [
    'return to running', 'running restart', 'gradual running plan', 'beginner running',
    'run walk method', 'runner recovery', 'training after a break', 'virtual run planning'
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
  assert.doesNotMatch(payload.contentHtml, /<h1\b/i);
  assert.match(payload.contentText, /reviewed in August 2026 using current World Health Organization/i);
  assert.match(payload.contentText, /Platform approval is not a health or training-readiness assessment/i);
  assert.match(payload.contentText, /Search Console validation of the working title remains pending/i);
  for (const heading of REQUIRED_HEADINGS) assert.ok(payload.contentHtml.includes(`<h2>${heading}</h2>`));
  for (const link of REQUIRED_LINKS) assert.ok(payload.contentHtml.includes(link));
});

test('gradual running restart sanitizes official sources and passes health eligibility', () => {
  const payload = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  const eligibility = evaluateBlogContentEligibility(payload, {
    evaluatedAt: new Date('2026-08-03T00:00:00.000Z')
  });

  assert.equal(payload.contentHtml.includes('<script'), false);
  assert.equal(payload.contentHtml.includes('javascript:'), false);
  assert.notEqual(payload.contentHtml, RAW_CONTENT_HTML.trim());
  assert.match(payload.contentHtml, /href="https:\/\/www\.who\.int\/health-topics\/noncommunicable-diseases\/physical-activity" rel="noopener noreferrer" target="_blank"/);
  assert.match(payload.contentHtml, /href="https:\/\/www\.cdc\.gov\/physical-activity-basics\/adding-adults\/index\.html" rel="noopener noreferrer" target="_blank"/);
  assert.match(payload.contentHtml, /href="https:\/\/www\.nhs\.uk\/better-health\/get-active\/get-running-with-couch-to-5k\/couch-to-5k-running-plan\/" rel="noopener noreferrer" target="_blank"/);
  assert.match(payload.contentHtml, /href="https:\/\/www\.pagasa\.dost\.gov\.ph\/products-and-services" rel="noopener noreferrer" target="_blank"/);
  assert.equal(eligibility.eligible, true);
  assert.deepEqual(eligibility.blockingReasons, []);
  assert.equal(eligibility.healthReviewRequired, true);
  assert.ok(eligibility.wordCount >= 3200);
  assert.equal(eligibility.externalLinkCount, 6);
});

test('gradual running restart uses a distinct 1600 by 900 claymation cover', async () => {
  assert.equal(fs.existsSync(COVER_IMAGE_PATH), true);
  const metadata = await sharp(COVER_IMAGE_PATH).metadata();
  assert.equal(metadata.format, 'webp');
  assert.equal(metadata.width, 1600);
  assert.equal(metadata.height, 900);
});

test('gradual running restart is registered and seeded once for August 29', () => {
  const articleModule = getArticleModule(CANONICAL_SLUG);
  const seededPosts = POSTS.filter((post) => post.slug === CANONICAL_SLUG);
  const seededPost = seededPosts[0];

  assert.equal(articleModule.ARTICLE, ARTICLE);
  assert.ok(listArticleSlugs().includes(CANONICAL_SLUG));
  assert.equal(listArticleSlugs().length, 38);
  assert.equal(seededPosts.length, 1);
  assert.equal(getCanonicalSeed(CANONICAL_SLUG), seededPost);
  assert.equal(buildContentHtml(seededPost), seededPost.contentHtml);
  assert.equal(htmlToText(seededPost.contentHtml), buildArticlePayload({ coverImageUrl: seededPost.coverImageUrl }).contentText);
  assert.equal(seededPost.coverImageUrl, COVER_IMAGE_URL);
  assert.equal(seededPost.ogImageUrl, COVER_IMAGE_URL);
  assert.equal(seededPost.status, 'scheduled');
  assert.equal(seededPost.publishedAt, '2026-08-29T11:00:00.000Z');
  assert.equal(seededPost.featured, false);
  assert.equal(seededPost.authorEmail, GUIDE_AUTHOR_EMAIL);
});

test('gradual running restart supports exact health-reviewed scheduling and updates', () => {
  const authorId = new mongoose.Types.ObjectId();
  const publishAt = '2026-08-29T11:00:00.000Z';
  const payload = buildCreatePayload({
    slug: CANONICAL_SLUG, authorId,
    now: new Date('2026-08-03T10:00:00.000Z'), publishAt
  });

  assert.deepEqual(
    parseCreateArguments(['--slug', CANONICAL_SLUG, '--apply', '--publish-at', publishAt]),
    { slug: CANONICAL_SLUG, mode: 'apply', publishAt }
  );
  assert.deepEqual(parseUpdateArguments(['--slug', CANONICAL_SLUG]), { slug: CANONICAL_SLUG, mode: 'dry-run' });
  assert.equal(payload.status, 'scheduled');
  assert.equal(payload.publishedAt.toISOString(), publishAt);
  assert.equal(payload.approvedAt, null);
  assert.equal(payload.featured, false);
  assert.equal(payload.coverImageUrl, COVER_IMAGE_URL);
  assert.equal(payload.contentEligibility.eligible, true);
  assert.equal(payload.contentEligibility.healthReviewRequired, true);
  assert.equal(payload.publicationReview.originalityConfirmed, true);
  assert.equal(payload.publicationReview.externalLinksConfirmed, true);
  assert.equal(payload.publicationReview.healthSafetyConfirmed, true);
  assert.equal(payload.publicationReview.healthChecks.healthExperienceConfirmed, true);
  assert.equal(payload.publicationReview.healthChecks.healthSourcesConfirmed, true);
  assert.equal(payload.publicationReview.healthChecks.healthSafetyConfirmed, true);
  assert.equal(payload.publicationReview.healthChecks.healthCredentialsConfirmed, true);
  assert.match(packageJson.scripts['blog:update-returning-to-running'], new RegExp(`--slug ${CANONICAL_SLUG}`));
});

test('gradual running restart rejects unsafe or unsupported return claims', () => {
  const payload = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  const withClaim = (claim) => ({
    ...payload,
    contentText: `${payload.contentText} ${claim}`,
    contentRaw: `${payload.contentText} ${claim}`
  });

  assert.throws(() => validateArticlePayload(withClaim('Everyone should start with a 10-minute run.')), /universal starting amount/);
  assert.throws(() => validateArticlePayload(withClaim('You should increase distance by exactly 10%.')), /rigid progression/);
  assert.throws(() => validateArticlePayload(withClaim('This plan guarantees a safe return.')), /guarantee restart outcomes/);
  assert.throws(() => validateArticlePayload(withClaim('You should double the next run.')), /unsafe catch-up/);
  assert.throws(() => validateArticlePayload(withClaim('Continue running through severe fatigue.')), /unsafe continuation/);
  assert.throws(() => validateArticlePayload(withClaim('Walking is failure.')), /shame lower-impact choices/);
  assert.throws(() => validateArticlePayload(withClaim('WHO guidance is your individualized training plan.')), /individualize population guidance/);
  assert.throws(() => validateArticlePayload(withClaim('Absence of pain proves readiness.')), /diagnose readiness/);
  assert.throws(() => validateArticlePayload(withClaim('Pending distance counts as approved progress.')), /unapproved distance/);
  assert.throws(() => validateArticlePayload(withClaim('Platform approval proves physical readiness.')), /physical readiness/);
  assert.throws(() => buildArticlePayload(), /cover artwork/);
});
