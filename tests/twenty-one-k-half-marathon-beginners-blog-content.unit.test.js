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
const beginner10k = require('../src/content/ten-k-training-plan-beginners');
const finishTimes = require('../src/content/how-long-to-run-5k-10k-21k');
const firstVirtual10k = require('../src/content/how-to-run-first-10k-virtual-run');
const weeklySchedule = require('../src/content/weekly-running-schedule-work-school-guide');
const runWalk = require('../src/content/run-walk-method-beginner-guide');
const beginnerPace = require('../src/content/beginner-running-pace-guide');
const {
  ARTICLE,
  CANONICAL_SLUG,
  RAW_CONTENT_HTML,
  REQUIRED_HEADINGS,
  REQUIRED_LINKS,
  buildArticlePayload,
  validateArticlePayload
} = require('../src/content/twenty-one-k-half-marathon-beginners');

const COVER_IMAGE_URL = '/images/blog/covers/21k-half-marathon-for-beginners.webp';
const COVER_IMAGE_PATH = path.join(
  __dirname,
  '..',
  'src',
  'public',
  'images',
  'blog',
  'covers',
  '21k-half-marathon-for-beginners.webp'
);

test('beginner 21K guide builds a substantive flexible half-marathon payload', () => {
  const payload = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  const wordCount = payload.contentText.split(/\s+/).filter(Boolean).length;

  assert.equal(ARTICLE.slug, CANONICAL_SLUG);
  assert.equal(payload.title, '21K for Beginners: How to Prepare for Your First Half Marathon');
  assert.equal(payload.seoTitle, payload.title);
  assert.equal(payload.seoDescription, 'Thinking about your first 21K? Learn how beginners can build from shorter distances, structure training, manage pacing, recovery, and prepare for a half marathon.');
  assert.equal(payload.category, 'Training');
  assert.ok(BLOG_CATEGORIES.includes(payload.category));
  assert.deepEqual(payload.tags, [
    'half marathon beginners', '21K training plan', 'beginner half marathon', 'first half marathon',
    'first 21K', 'long run training', 'run walk 21K', '21K Philippines'
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
  assert.doesNotMatch(payload.contentHtml, /<h[12]>21K for Beginners:/i);
  assert.match(payload.contentText, /should begin with a repeatable shorter-distance base/i);
  assert.match(payload.contentText, /illustrative 12-week bridge/i);
  assert.match(payload.contentText, /official half marathon is 21\.0975 kilometres/i);
  assert.match(payload.contentText, /A missed activity is not debt/i);
  assert.match(payload.contentText, /Pending is not approved/i);

  for (const heading of REQUIRED_HEADINGS) {
    assert.ok(payload.contentHtml.includes(`<h2>${heading}</h2>`), `missing required heading: ${heading}`);
  }
  for (const link of REQUIRED_LINKS) {
    assert.ok(payload.contentHtml.includes(link), `missing required link: ${link}`);
  }
});

test('beginner 21K guide preserves all twelve conditional framework weeks', () => {
  const { contentHtml, contentText } = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });

  for (let week = 1; week <= 12; week += 1) {
    assert.ok(contentHtml.includes(`<strong>Week ${week} —`), `missing framework week: ${week}`);
  }
  assert.match(contentText, /Week 4 — Consolidate.*Shorten or repeat/is);
  assert.match(contentText, /Week 8 — Step back.*Reduce or hold/is);
  assert.match(contentText, /Week 10 — Longest supported rehearsal.*need not equal 21K/is);
  assert.match(contentText, /Week 12 — Recover and attempt.*only when health, conditions, route, event window, and recovery are suitable/is);
});

test('beginner 21K guide covers pacing, run-walk, hydration, route, tracking, safety, FAQ, and next-goal decisions', () => {
  const { contentText } = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });

  assert.match(contentText, /Use a practised run-walk pattern from the start/i);
  assert.match(contentText, /There is no universal volume of water, electrolyte amount, food, gel schedule, or carbohydrate target/i);
  assert.match(contentText, /Consult current DOST-PAGASA forecasts, warnings, and heat-index information/i);
  assert.match(contentText, /A phone or GPS watch can record.*but neither makes the activity safe or the measurement exact/is);
  assert.match(contentText, /Virtual participation can offer date and route flexibility, but it does not automatically supply closed roads/is);
  assert.match(contentText, /A marathon is not an automatic or required next step/i);
  assert.match(contentText, /Frequently asked questions/i);
});

test('beginner 21K guide sanitizes official sources and passes health-sensitive eligibility', () => {
  const payload = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  const eligibility = evaluateBlogContentEligibility({
    ...payload,
    contentRisk: 'health_safety',
    coverImageUrl: COVER_IMAGE_URL
  }, { evaluatedAt: new Date('2026-09-01T00:00:00.000Z') });

  assert.equal(payload.contentHtml.includes('<script'), false);
  assert.equal(payload.contentHtml.includes('javascript:'), false);
  assert.notEqual(payload.contentHtml, RAW_CONTENT_HTML.trim());
  assert.match(payload.contentHtml, /href="https:\/\/www\.who\.int\/news-room\/fact-sheets\/detail\/physical-activity" rel="noopener noreferrer" target="_blank"/);
  assert.match(payload.contentHtml, /href="https:\/\/www\.cdc\.gov\/healthy-weight-growth\/physical-activity\/getting-started\.html" rel="noopener noreferrer" target="_blank"/);
  assert.match(payload.contentHtml, /href="https:\/\/www\.nhs\.uk\/better-health\/get-active\/get-running-with-couch-to-5k\/couch-to-5k-running-plan\/" rel="noopener noreferrer" target="_blank"/);
  assert.match(payload.contentHtml, /href="https:\/\/www\.usada\.org\/athletes\/substances\/nutrition-guide\/" rel="noopener noreferrer" target="_blank"/);
  assert.match(payload.contentHtml, /href="https:\/\/pagasa\.dost\.gov\.ph\/weather\/heat-index" rel="noopener noreferrer" target="_blank"/);
  assert.equal(eligibility.eligible, true);
  assert.deepEqual(eligibility.blockingReasons, []);
  assert.equal(eligibility.healthReviewRequired, true);
  assert.ok(eligibility.wordCount >= 2500);
  assert.ok(eligibility.wordCount <= 3000);
  assert.equal(eligibility.externalLinkCount, 6);
});

test('beginner 21K guide has a distinct 1600 by 900 repository cover', async () => {
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

test('beginner 21K guide is registered and seeded once for September 28', () => {
  const articleModule = getArticleModule(CANONICAL_SLUG);
  const seededPosts = POSTS.filter((post) => post.slug === CANONICAL_SLUG);
  const seededPost = seededPosts[0];

  assert.equal(articleModule.ARTICLE, ARTICLE);
  assert.ok(listArticleSlugs().includes(CANONICAL_SLUG));
  assert.equal(listArticleSlugs().length, 59);
  assert.equal(POSTS.length, 59);
  assert.equal(seededPosts.length, 1);
  assert.equal(getCanonicalSeed(CANONICAL_SLUG), seededPost);
  assert.equal(buildContentHtml(seededPost), seededPost.contentHtml);
  assert.equal(htmlToText(seededPost.contentHtml), buildArticlePayload({ coverImageUrl: seededPost.coverImageUrl }).contentText);
  assert.equal(seededPost.coverImageUrl, COVER_IMAGE_URL);
  assert.equal(seededPost.ogImageUrl, COVER_IMAGE_URL);
  assert.equal(seededPost.status, 'scheduled');
  assert.equal(seededPost.publishedAt, '2026-09-28T11:00:00.000Z');
  assert.equal(seededPost.featured, false);
  assert.ok(seededPost.links.includes('/blog/gps-watch-vs-running-app'));
  assert.equal(seededPost.links.some((href) => href.includes('how-to-set-running-goals-for-the-rest-of-the-year')), false);
});

test('beginner 21K guide omits the later unpublished year-end running-goals hub', () => {
  const href = '/blog/how-to-set-running-goals-for-the-rest-of-the-year';
  const payload = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });

  assert.ok(!REQUIRED_LINKS.some((link) => link.includes(href)));
  assert.ok(!payload.contentHtml.includes(`href="${href}"`));
  assert.ok(!POSTS.find((post) => post.slug === CANONICAL_SLUG).links.includes(href));
});

test('beginner 21K guide is scheduled noindex health content with create and update wiring', () => {
  const classification = getInitialIndexingClassification(CANONICAL_SLUG);
  const publishAt = '2026-09-28T11:00:00.000Z';

  assert.deepEqual(
    parseCreateArguments(['--slug', CANONICAL_SLUG, '--apply', '--confirm-editorial-review', '--publish-at', publishAt]),
    { slug: CANONICAL_SLUG, mode: 'apply', confirmEditorialReview: true, publishAt }
  );
  assert.deepEqual(parseUpdateArguments(['--slug', CANONICAL_SLUG]), { slug: CANONICAL_SLUG, mode: 'dry-run' });
  assert.equal(classification.contentRisk, 'health_safety');
  assert.equal(classification.plannedNoindex, true);
  assert.equal(classification.indexCandidate, false);
  assert.match(packageJson.scripts['blog:update-beginner-21k'], new RegExp(`--slug ${CANONICAL_SLUG}`));
});

test('beginner 21K creation payload schedules the local cover with a current review', () => {
  const publishAt = '2026-09-28T11:00:00.000Z';
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

test('three established progression guides reciprocally link to the beginner 21K guide', () => {
  const href = `/blog/${CANONICAL_SLUG}`;
  const guides = [weeklySchedule, runWalk, beginnerPace];

  for (const guide of guides) {
    const payload = guide.buildArticlePayload({ coverImageUrl: 'https://cdn.example.com/cover.webp' });
    assert.ok(guide.REQUIRED_LINKS.some((link) => link.includes(href)), `${guide.ARTICLE.slug} required link missing`);
    assert.ok(payload.contentHtml.includes(`href="${href}"`), `${guide.ARTICLE.slug} content link missing`);
    assert.ok(POSTS.find((post) => post.slug === guide.ARTICLE.slug).links.includes(href), `${guide.ARTICLE.slug} seed link missing`);
  }
});

test('earlier September guides omit the later unpublished beginner 21K guide', () => {
  const href = `/blog/${CANONICAL_SLUG}`;
  const guides = [beginner10k, finishTimes, firstVirtual10k];

  for (const guide of guides) {
    const payload = guide.buildArticlePayload({ coverImageUrl: 'https://cdn.example.com/cover.webp' });
    assert.ok(!guide.REQUIRED_LINKS.some((link) => link.includes(href)), `${guide.ARTICLE.slug} required link`);
    assert.ok(!payload.contentHtml.includes(`href="${href}"`), `${guide.ARTICLE.slug} content link`);
    assert.ok(!POSTS.find((post) => post.slug === guide.ARTICLE.slug).links.includes(href), `${guide.ARTICLE.slug} seed link`);
  }
});

test('beginner 21K guide rejects unsafe universal, catch-up, event, and outcome claims', () => {
  const payload = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  const withClaim = (claim) => ({
    ...payload,
    contentText: `${payload.contentText} ${claim}`,
    contentRaw: `${payload.contentText} ${claim}`
  });

  assert.throws(() => validateArticlePayload(withClaim('Every beginner must start with 21K.')), /starting distance/);
  assert.throws(() => validateArticlePayload(withClaim('Every runner must train five days.')), /universal training frequency/);
  assert.throws(() => validateArticlePayload(withClaim('12 weeks is enough for everyone.')), /universal timeline/);
  assert.throws(() => validateArticlePayload(withClaim('The 10% rule guarantees safety.')), /10% rule/);
  assert.throws(() => validateArticlePayload(withClaim('This plan guarantees a 21K finish.')), /guarantee outcomes/);
  assert.throws(() => validateArticlePayload(withClaim('Make up a missed session by doubling the next run.')), /catch-up activity/);
  assert.throws(() => validateArticlePayload(withClaim('Everyone needs the same gel.')), /universal fueling or hydration/);
  assert.throws(() => validateArticlePayload(withClaim('Every virtual event accepts walking.')), /event eligibility/);
  assert.throws(() => validateArticlePayload(withClaim('Pending activity counts as official.')), /approval/);
  assert.throws(() => buildArticlePayload(), /cover artwork/);
});
