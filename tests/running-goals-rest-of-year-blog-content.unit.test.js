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
const { buildCreatePayload, getCanonicalSeed, parseArguments: parseCreateArguments } = require('../src/scripts/create-adsense-blog');
const { parseArguments: parseUpdateArguments } = require('../src/scripts/update-adsense-blog');
const realisticMonthlyGoal = require('../src/content/realistic-monthly-running-goal');
const weeklySchedule = require('../src/content/weekly-running-schedule-work-school-guide');
const returningToRunning = require('../src/content/returning-to-running-after-break-guide');
const runWalk = require('../src/content/run-walk-method-beginner-guide');
const thirtyDayChallenge = require('../src/content/thirty-day-running-challenge-beginners');
const beginner10k = require('../src/content/ten-k-training-plan-beginners');
const finishTimes = require('../src/content/how-long-to-run-5k-10k-21k');
const firstVirtual10k = require('../src/content/how-to-run-first-10k-virtual-run');
const beginner21k = require('../src/content/twenty-one-k-half-marathon-beginners');
const cadenceGuide = require('../src/content/running-cadence-explained');
const {
  ARTICLE,
  CANONICAL_SLUG,
  RAW_CONTENT_HTML,
  REQUIRED_HEADINGS,
  REQUIRED_LINKS,
  buildArticlePayload,
  validateArticlePayload
} = require('../src/content/running-goals-rest-of-year');

const COVER_IMAGE_URL = '/images/blog/covers/how-to-set-running-goals-for-the-rest-of-the-year.webp';
const COVER_IMAGE_PATH = path.join(
  __dirname,
  '..',
  'src',
  'public',
  'images',
  'blog',
  'covers',
  'how-to-set-running-goals-for-the-rest-of-the-year.webp'
);

test('year-end running-goals guide builds a substantive September-to-December hub', () => {
  const payload = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  const wordCount = payload.contentText.split(/\s+/).filter(Boolean).length;

  assert.equal(ARTICLE.slug, CANONICAL_SLUG);
  assert.equal(payload.title, 'How to Set a Running Goal for the Last Four Months of the Year');
  assert.equal(payload.seoTitle, payload.title);
  assert.equal(payload.seoDescription, 'Set a realistic running goal for September through December using distance, consistency, event, or habit targets that fit your schedule and current ability.');
  assert.equal(payload.category, 'Motivation');
  assert.ok(BLOG_CATEGORIES.includes(payload.category));
  assert.deepEqual(payload.tags, [
    'running goals', 'running goals beginners', 'year end running goal', 'running goal ideas',
    'running motivation', 'monthly checkpoints', 'distance running goals', 'running plan 2026'
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
  assert.doesNotMatch(payload.contentHtml, /<h[12]>How to Set a Running Goal for the Last Four Months/i);
  assert.match(payload.contentText, /starts with one main outcome/i);
  assert.match(payload.contentText, /one meaningful outcome \+ one repeatable process \+ four adjustable checkpoints \+ one clear change rule/i);
  assert.match(payload.contentText, /do not create activity debt for a month that has already passed/i);
  assert.doesNotMatch(payload.contentHtml, /September Active Run/i);

  for (const heading of REQUIRED_HEADINGS) {
    assert.ok(payload.contentHtml.includes(`<h2>${heading}</h2>`), `missing required heading: ${heading}`);
  }
  for (const link of REQUIRED_LINKS) {
    assert.ok(payload.contentHtml.includes(link), `missing required link: ${link}`);
  }
});

test('year-end guide preserves four adjustable checkpoints and four decision examples', () => {
  const { contentHtml, contentText } = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });

  for (const checkpoint of [
    'September — Establish',
    'October — Build',
    'November — Consolidate',
    'December — Complete, continue, or revise'
  ]) {
    assert.ok(contentHtml.includes(`<h3>${checkpoint}</h3>`), `missing checkpoint: ${checkpoint}`);
  }
  for (let example = 1; example <= 4; example += 1) {
    assert.ok(contentHtml.includes(`<h3>Example ${example}:`), `missing example: ${example}`);
  }
  assert.match(contentText, /If starting on September 30, this phase can be one planning session/i);
  assert.match(contentText, /Not every month needs a larger distance total/i);
  assert.match(contentText, /These fictional examples demonstrate decisions, not recommended schedules/i);
});

test('year-end guide stays distinct from monthly targeting and the 30-day challenge', () => {
  const payload = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });

  assert.match(payload.contentText, /This article stays at the four-month level: one destination, a process, checkpoints, and permission to revise the route/i);
  assert.match(payload.contentText, /A monthly challenge can serve the four-month goal without four maximum efforts/i);
  assert.match(payload.contentHtml, /href="\/blog\/how-to-set-a-realistic-monthly-running-goal"/);
  assert.match(payload.contentHtml, /href="\/blog\/30-day-running-challenge-for-beginners"/);
  assert.notEqual(payload.title, realisticMonthlyGoal.ARTICLE.title);
  assert.notEqual(payload.title, thirtyDayChallenge.ARTICLE.title);
});

test('year-end guide sanitizes official sources and passes health-sensitive eligibility', () => {
  const payload = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  const eligibility = evaluateBlogContentEligibility({
    ...payload,
    contentRisk: 'health_safety',
    coverImageUrl: COVER_IMAGE_URL
  }, { evaluatedAt: new Date('2026-09-02T00:00:00.000Z') });

  assert.equal(payload.contentHtml.includes('<script'), false);
  assert.equal(payload.contentHtml.includes('javascript:'), false);
  assert.notEqual(payload.contentHtml, RAW_CONTENT_HTML.trim());
  assert.match(payload.contentHtml, /href="https:\/\/www\.who\.int\/news-room\/fact-sheets\/detail\/physical-activity" rel="noopener noreferrer" target="_blank"/);
  assert.match(payload.contentHtml, /href="https:\/\/www\.cdc\.gov\/healthy-weight-growth\/physical-activity\/getting-started\.html" rel="noopener noreferrer" target="_blank"/);
  assert.match(payload.contentHtml, /href="https:\/\/www\.cdc\.gov\/youth-advisory-councils\/action-plans\/smart-framework\.html" rel="noopener noreferrer" target="_blank"/);
  assert.match(payload.contentHtml, /href="https:\/\/www\.nhs\.uk\/better-health\/get-active\/how-to-be-more-active\/" rel="noopener noreferrer" target="_blank"/);
  assert.match(payload.contentHtml, /href="https:\/\/odphp\.health\.gov\/moveyourway\/activity-planner\/activities" rel="noopener noreferrer" target="_blank"/);
  assert.equal(eligibility.eligible, true);
  assert.deepEqual(eligibility.blockingReasons, []);
  assert.equal(eligibility.healthReviewRequired, true);
  assert.ok(eligibility.wordCount >= 2500);
  assert.ok(eligibility.wordCount <= 3000);
  assert.equal(eligibility.externalLinkCount, 5);
});

test('year-end running-goals guide has a distinct 1600 by 900 repository cover', async () => {
  assert.equal(fs.existsSync(COVER_IMAGE_PATH), true);
  const metadata = await sharp(COVER_IMAGE_PATH).metadata();
  assert.equal(metadata.format, 'webp');
  assert.equal(metadata.width, 1600);
  assert.equal(metadata.height, 900);

  const coverHash = crypto.createHash('sha256').update(fs.readFileSync(COVER_IMAGE_PATH)).digest('hex');
  const coverDirectory = path.dirname(COVER_IMAGE_PATH);
  const duplicateNames = fs.readdirSync(coverDirectory).filter((name) => {
    if (!name.endsWith('.webp') || name === path.basename(COVER_IMAGE_PATH)) return false;
    const hash = crypto.createHash('sha256').update(fs.readFileSync(path.join(coverDirectory, name))).digest('hex');
    return hash === coverHash;
  });
  assert.deepEqual(duplicateNames, []);
});

test('year-end running-goals guide is registered and seeded once for September 30', () => {
  const articleModule = getArticleModule(CANONICAL_SLUG);
  const seededPosts = POSTS.filter((post) => post.slug === CANONICAL_SLUG);
  const seededPost = seededPosts[0];

  assert.equal(articleModule.ARTICLE, ARTICLE);
  assert.ok(listArticleSlugs().includes(CANONICAL_SLUG));
  assert.equal(listArticleSlugs().length, 65);
  assert.equal(POSTS.length, 65);
  assert.equal(seededPosts.length, 1);
  assert.equal(getCanonicalSeed(CANONICAL_SLUG), seededPost);
  assert.equal(buildContentHtml(seededPost), seededPost.contentHtml);
  assert.equal(htmlToText(seededPost.contentHtml), buildArticlePayload({ coverImageUrl: seededPost.coverImageUrl }).contentText);
  assert.equal(seededPost.coverImageUrl, COVER_IMAGE_URL);
  assert.equal(seededPost.ogImageUrl, COVER_IMAGE_URL);
  assert.equal(seededPost.status, 'scheduled');
  assert.equal(seededPost.publishedAt, '2026-09-30T11:00:00.000Z');
  assert.equal(seededPost.featured, false);
  assert.deepEqual(seededPost.links, [
    '/events',
    '/blog/how-to-build-a-weekly-running-schedule-around-work-or-school',
    '/blog/returning-to-running-after-a-break-gradual-restart-plan',
    '/blog/run-walk-method-beginner-friendly-way-build-endurance',
    '/blog/how-to-set-a-realistic-monthly-running-goal',
    '/blog/30-day-running-challenge-for-beginners',
    '/blog/10k-training-plan-for-beginners',
    '/blog/how-long-to-run-5k-10k-21k',
    '/blog/how-to-run-your-first-10k-virtual-run',
    '/blog/21k-half-marathon-for-beginners'
  ]);
});

test('year-end running-goals guide is scheduled noindex health content with update wiring', () => {
  const classification = getInitialIndexingClassification(CANONICAL_SLUG);
  const publishAt = '2026-09-30T11:00:00.000Z';

  assert.deepEqual(
    parseCreateArguments(['--slug', CANONICAL_SLUG, '--apply', '--confirm-editorial-review', '--publish-at', publishAt]),
    { slug: CANONICAL_SLUG, mode: 'apply', confirmEditorialReview: true, publishAt }
  );
  assert.deepEqual(parseUpdateArguments(['--slug', CANONICAL_SLUG]), { slug: CANONICAL_SLUG, mode: 'dry-run' });
  assert.equal(classification.contentRisk, 'health_safety');
  assert.equal(classification.plannedNoindex, true);
  assert.equal(classification.indexCandidate, false);
  assert.match(packageJson.scripts['blog:update-year-end-running-goals'], new RegExp(`--slug ${CANONICAL_SLUG}`));
});

test('year-end running-goals creation payload schedules the local cover with a current review', () => {
  const publishAt = '2026-09-30T11:00:00.000Z';
  const payload = buildCreatePayload({
    slug: CANONICAL_SLUG,
    authorId: '507f1f77bcf86cd799439011',
    now: new Date('2026-09-13T08:00:00.000Z'),
    publishAt: new Date(publishAt),
    confirmEditorialReview: true
  });
  assert.equal(payload.coverImageUrl, COVER_IMAGE_URL);
  assert.equal(payload.status, 'scheduled');
  assert.equal(payload.publishedAt.toISOString(), publishAt);
  assert.equal(payload.searchIndexingStatus, 'noindex');
  assert.equal(payload.searchIndexingReason, 'pending_expert_review');
  assert.equal(hasCurrentPublicationReview(payload), true);
});

test('four established goal and progression guides reciprocally link to the year-end hub', () => {
  const href = `/blog/${CANONICAL_SLUG}`;
  const guides = [
    realisticMonthlyGoal,
    weeklySchedule,
    returningToRunning,
    runWalk
  ];

  for (const guide of guides) {
    const payload = guide.buildArticlePayload({ coverImageUrl: 'https://cdn.example.com/cover.webp' });
    assert.ok(guide.REQUIRED_LINKS.some((link) => link.includes(href)), `${guide.ARTICLE.slug} required link missing`);
    assert.ok(payload.contentHtml.includes(`href="${href}"`), `${guide.ARTICLE.slug} content link missing`);
    assert.ok(POSTS.find((post) => post.slug === guide.ARTICLE.slug).links.includes(href), `${guide.ARTICLE.slug} seed link missing`);
  }
});

test('earlier September guides omit the later unpublished year-end hub', () => {
  const href = `/blog/${CANONICAL_SLUG}`;
  const guides = [
    thirtyDayChallenge,
    beginner10k,
    finishTimes,
    firstVirtual10k,
    beginner21k,
    cadenceGuide
  ];

  for (const guide of guides) {
    const payload = guide.buildArticlePayload({ coverImageUrl: 'https://cdn.example.com/cover.webp' });
    assert.ok(!guide.REQUIRED_LINKS.some((link) => link.includes(href)), `${guide.ARTICLE.slug} required link`);
    assert.ok(!payload.contentHtml.includes(`href="${href}"`), `${guide.ARTICLE.slug} content link`);
    assert.ok(!POSTS.find((post) => post.slug === guide.ARTICLE.slug).links.includes(href), `${guide.ARTICLE.slug} seed link`);
  }
});

test('all fourteen September articles retain their exact publication order and timestamps', () => {
  const expected = [
    ['30-day-running-challenge-for-beginners', '2026-09-01T11:00:00.000Z'],
    ['10k-training-plan-for-beginners', '2026-09-03T11:00:00.000Z'],
    ['how-to-breathe-while-running', '2026-09-05T11:00:00.000Z'],
    ['how-long-to-run-5k-10k-21k', '2026-09-08T11:00:00.000Z'],
    ['how-to-choose-running-shoes-for-beginners', '2026-09-10T11:00:00.000Z'],
    ['running-cadence-explained', '2026-09-12T11:00:00.000Z'],
    ['how-accurate-is-phone-gps-for-running', '2026-09-15T11:00:00.000Z'],
    ['can-you-walk-a-virtual-run', '2026-09-17T11:00:00.000Z'],
    ['how-to-run-your-first-10k-virtual-run', '2026-09-19T11:00:00.000Z'],
    ['gps-watch-vs-running-app', '2026-09-22T11:00:00.000Z'],
    ['how-to-promote-a-virtual-run', '2026-09-24T11:00:00.000Z'],
    ['virtual-run-registration-fee-pricing', '2026-09-26T11:00:00.000Z'],
    ['21k-half-marathon-for-beginners', '2026-09-28T11:00:00.000Z'],
    ['how-to-set-running-goals-for-the-rest-of-the-year', '2026-09-30T11:00:00.000Z']
  ];

  for (const [slug, publishedAt] of expected) {
    const post = POSTS.find((candidate) => candidate.slug === slug);
    assert.ok(post, `missing September post: ${slug}`);
    assert.equal(post.status, 'scheduled');
    assert.equal(post.publishedAt, publishedAt);
  }
  assert.deepEqual(
    expected.map(([slug]) => POSTS.findIndex((post) => post.slug === slug)),
    [...expected.map(([slug]) => POSTS.findIndex((post) => post.slug === slug))].sort((a, b) => a - b)
  );
});

test('year-end guide rejects unsafe universal, catch-up, event, and guarantee claims', () => {
  const payload = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  const withClaim = (claim) => ({
    ...payload,
    contentText: `${payload.contentText} ${claim}`,
    contentRaw: `${payload.contentText} ${claim}`
  });

  assert.throws(() => validateArticlePayload(withClaim('You must run every day.')), /daily running/);
  assert.throws(() => validateArticlePayload(withClaim('Exactly 100 km is realistic for everyone.')), /universal distance/);
  assert.throws(() => validateArticlePayload(withClaim('Every month must increase mileage.')), /monthly escalation/);
  assert.throws(() => validateArticlePayload(withClaim('This framework guarantees success.')), /guarantee outcomes/);
  assert.throws(() => validateArticlePayload(withClaim('Make up a missed week by doubling the next session.')), /catch-up activity/);
  assert.throws(() => validateArticlePayload(withClaim('Every event accepts walking.')), /event eligibility/);
  assert.throws(() => validateArticlePayload(withClaim('Pending activity counts as official.')), /approval/);
  assert.throws(() => validateArticlePayload(withClaim('SMART goals make every deadline achievable.')), /SMART framing/);
  assert.throws(() => buildArticlePayload(), /cover artwork/);
});
