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
const runWalkGuide = require('../src/content/run-walk-method-beginner-guide');
const weeklyScheduleGuide = require('../src/content/weekly-running-schedule-work-school-guide');
const returningGuide = require('../src/content/returning-to-running-after-break-guide');
const {
  ARTICLE,
  CANONICAL_SLUG,
  RAW_CONTENT_HTML,
  REQUIRED_HEADINGS,
  REQUIRED_LINKS,
  buildArticlePayload,
  validateArticlePayload
} = require('../src/content/thirty-day-running-challenge-beginners');

const COVER_IMAGE_URL = '/images/blog/covers/30-day-running-challenge-for-beginners.webp';
const COVER_IMAGE_PATH = path.join(
  __dirname,
  '..',
  'src',
  'public',
  'images',
  'blog',
  'covers',
  '30-day-running-challenge-for-beginners.webp'
);

test('30-day running challenge builds a substantive flexible beginner payload', () => {
  const payload = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  const wordCount = payload.contentText.split(/\s+/).filter(Boolean).length;

  assert.equal(ARTICLE.slug, CANONICAL_SLUG);
  assert.equal(payload.title, '30-Day Running Challenge for Beginners: A Flexible Running Reset');
  assert.equal(payload.seoTitle, payload.title);
  assert.equal(payload.category, 'Training');
  assert.ok(BLOG_CATEGORIES.includes(payload.category));
  assert.deepEqual(payload.tags, [
    '30 day running challenge', 'beginner running', 'running challenge', 'run walk challenge',
    'running consistency', 'running reset', 'recovery days', 'monthly challenge'
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
  assert.doesNotMatch(payload.contentHtml, /<h[12]>30-Day Running Challenge for Beginners:/i);
  assert.match(payload.contentText, /does not need 30 straight days of running/i);
  assert.match(payload.contentText, /walking-first, run-walk, or easy-running/i);
  assert.match(payload.contentText, /Days 29 and 30/i);
  assert.match(payload.contentText, /Missing a day does not restart the challenge/i);
  assert.match(payload.contentText, /Population recommendations describe activity associated with health benefits; they are not personal training plans/i);
  assert.match(payload.contentText, /A pending activity is potential progress, not official progress/i);

  for (const heading of REQUIRED_HEADINGS) {
    assert.ok(payload.contentHtml.includes(`<h2>${heading}</h2>`), `missing required heading: ${heading}`);
  }
  for (const link of REQUIRED_LINKS) {
    assert.ok(payload.contentHtml.includes(link), `missing required link: ${link}`);
  }
});

test('30-day challenge links readers to the year-end running-goals hub', () => {
  const href = '/blog/how-to-set-running-goals-for-the-rest-of-the-year';
  const payload = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });

  assert.ok(REQUIRED_LINKS.some((link) => link.includes(href)));
  assert.ok(payload.contentHtml.includes(`href="${href}"`));
  assert.ok(POSTS.find((post) => post.slug === CANONICAL_SLUG).links.includes(href));
});

test('30-day challenge sanitizes sources and passes health-safety eligibility', () => {
  const payload = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  const eligibility = evaluateBlogContentEligibility({
    ...payload,
    contentRisk: 'health_safety',
    coverImageUrl: COVER_IMAGE_URL
  }, { evaluatedAt: new Date('2026-08-30T00:00:00.000Z') });

  assert.equal(payload.contentHtml.includes('<script'), false);
  assert.equal(payload.contentHtml.includes('javascript:'), false);
  assert.notEqual(payload.contentHtml, RAW_CONTENT_HTML.trim());
  assert.match(payload.contentHtml, /href="https:\/\/www\.who\.int\/news-room\/fact-sheets\/detail\/physical-activity" rel="noopener noreferrer" target="_blank"/);
  assert.match(payload.contentHtml, /href="https:\/\/www\.cdc\.gov\/healthy-weight-growth\/physical-activity\/getting-started\.html" rel="noopener noreferrer" target="_blank"/);
  assert.match(payload.contentHtml, /href="https:\/\/www\.nhs\.uk\/better-health\/get-active\/get-running-with-couch-to-5k\/couch-to-5k-running-plan\/" rel="noopener noreferrer" target="_blank"/);
  assert.equal(eligibility.eligible, true);
  assert.deepEqual(eligibility.blockingReasons, []);
  assert.equal(eligibility.healthReviewRequired, true);
  assert.ok(eligibility.wordCount >= 3200);
  assert.ok(eligibility.semanticUnitCount >= 3);
  assert.equal(eligibility.externalLinkCount, 4);
});

test('30-day challenge has a distinct 1600 by 900 repository cover', async () => {
  assert.equal(fs.existsSync(COVER_IMAGE_PATH), true);
  const metadata = await sharp(COVER_IMAGE_PATH).metadata();
  assert.equal(metadata.format, 'webp');
  assert.equal(metadata.width, 1600);
  assert.equal(metadata.height, 900);
});

test('30-day challenge is registered and seeded once for September 1', () => {
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
  assert.equal(seededPost.publishedAt, '2026-09-01T11:00:00.000Z');
  assert.equal(seededPost.featured, false);
});

test('30-day challenge is classified for health review and wired for create/update commands', () => {
  const classification = getInitialIndexingClassification(CANONICAL_SLUG);
  const publishAt = '2026-09-01T11:00:00.000Z';

  assert.deepEqual(
    parseCreateArguments(['--slug', CANONICAL_SLUG, '--apply', '--publish-at', publishAt]),
    { slug: CANONICAL_SLUG, mode: 'apply', publishAt }
  );
  assert.deepEqual(parseUpdateArguments(['--slug', CANONICAL_SLUG]), { slug: CANONICAL_SLUG, mode: 'dry-run' });
  assert.equal(classification.contentRisk, 'health_safety');
  assert.equal(classification.plannedNoindex, true);
  assert.equal(classification.indexCandidate, false);
  assert.match(packageJson.scripts['blog:update-30-day-running-challenge'], new RegExp(`--slug ${CANONICAL_SLUG}`));
});

test('30-day challenge has reciprocal links from its three primary August guides', () => {
  const href = 'href="/blog/30-day-running-challenge-for-beginners"';

  for (const module of [runWalkGuide, weeklyScheduleGuide, returningGuide]) {
    const payload = module.buildArticlePayload({ coverImageUrl: 'https://cdn.example.com/cover.webp' });
    assert.ok(module.REQUIRED_LINKS.includes(href));
    assert.ok(payload.contentHtml.includes(href));
  }
});

test('30-day challenge rejects unsafe universal and event claims', () => {
  const payload = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  const withClaim = (claim) => ({
    ...payload,
    contentText: `${payload.contentText} ${claim}`,
    contentRaw: `${payload.contentText} ${claim}`
  });

  assert.throws(() => validateArticlePayload(withClaim('You must run every day.')), /daily running/);
  assert.throws(() => validateArticlePayload(withClaim('This challenge guarantees fitness.')), /guarantee outcomes/);
  assert.throws(() => validateArticlePayload(withClaim('You should make up a missed day by doubling the next session.')), /catch-up activity/);
  assert.throws(() => validateArticlePayload(withClaim('Every runner must start with one-minute run intervals.')), /universal track/);
  assert.throws(() => validateArticlePayload(withClaim('Walking is always accepted.')), /universal track/);
  assert.throws(() => validateArticlePayload(withClaim('Pending activity counts as official completion.')), /pending progress/);
  assert.throws(() => validateArticlePayload(withClaim('Every submission is automatically approved.')), /automatic approval/);
  assert.throws(() => buildArticlePayload(), /cover artwork/);
});
