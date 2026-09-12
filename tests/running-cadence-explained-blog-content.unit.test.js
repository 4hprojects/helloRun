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
const breathingGuide = require('../src/content/how-to-breathe-while-running');
const {
  ARTICLE,
  CANONICAL_SLUG,
  RAW_CONTENT_HTML,
  REQUIRED_HEADINGS,
  REQUIRED_LINKS,
  buildArticlePayload,
  validateArticlePayload
} = require('../src/content/running-cadence-explained');

const COVER_IMAGE_URL = '/images/blog/covers/running-cadence-explained.webp';
const COVER_IMAGE_PATH = path.join(__dirname, '..', 'src', 'public', 'images', 'blog', 'covers', 'running-cadence-explained.webp');

test('running cadence guide builds a substantive beginner-friendly payload', () => {
  const payload = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  const wordCount = payload.contentText.split(/\s+/).filter(Boolean).length;
  assert.equal(ARTICLE.slug, CANONICAL_SLUG);
  assert.equal(payload.title, 'Running Cadence Explained: What Beginners Need to Know');
  assert.equal(payload.seoTitle, payload.title);
  assert.equal(payload.category, 'Training');
  assert.ok(BLOG_CATEGORIES.includes(payload.category));
  assert.deepEqual(payload.tags, [
    'running cadence', 'steps per minute', 'running step rate', 'stride length',
    'beginner running', 'running form', 'run tracking', 'easy running'
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
  assert.match(payload.contentText, /Running cadence means the total number of steps you take per minute/i);
  assert.match(payload.contentText, /You do not need to reach 180 steps per minute to count as a good runner/i);
  assert.match(payload.contentText, /observation of selected elite athletes during Olympic competition/i);
  assert.match(payload.contentText, /evidence was insufficient to determine the effects of altering step rate on injury and performance/i);
  assert.match(payload.contentText, /This article does not prescribe a universal 5%, 10%, or SPM increase/i);
  assert.match(payload.contentText, /general education, not personal coaching, gait analysis, injury prevention/i);
  for (const heading of REQUIRED_HEADINGS) assert.ok(payload.contentHtml.includes(`<h2>${heading}</h2>`), `missing heading: ${heading}`);
  for (const link of REQUIRED_LINKS) assert.ok(payload.contentHtml.includes(link), `missing link: ${link}`);
});

test('cadence guide omits links to later unpublished September guides', () => {
  const payload = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  assert.doesNotMatch(payload.contentHtml, /href="\/blog\/(?:gps-watch-vs-running-app|how-to-set-running-goals-for-the-rest-of-the-year)"/);
});

test('running cadence guide preserves measurement and interpretation guidance', () => {
  const { contentText } = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  assert.match(contentText, /count every foot contact for 30 seconds and multiply by two/i);
  assert.match(contentText, /count contacts of one foot for 30 seconds and multiply by four/i);
  assert.match(contentText, /one stride covers two steps/i);
  assert.match(contentText, /speed can be described approximately as step rate multiplied by average distance covered per step/i);
  assert.match(contentText, /whole-activity averages are lower because they include walking/i);
  assert.match(contentText, /compare cadence with pace and elevation at the same time/i);
});

test('running cadence guide sanitizes sources and passes health-sensitive eligibility', () => {
  const payload = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  const eligibility = evaluateBlogContentEligibility({ ...payload, contentRisk: 'health_safety', coverImageUrl: COVER_IMAGE_URL }, { evaluatedAt: new Date('2026-08-30T00:00:00.000Z') });
  assert.notEqual(payload.contentHtml, RAW_CONTENT_HTML.trim());
  assert.doesNotMatch(payload.contentHtml, /<script|javascript:/i);
  assert.match(payload.contentHtml, /href="https:\/\/support\.strava\.com\/en-us\/articles\/15401948-what-is-cadence-on-strava" rel="noopener noreferrer" target="_blank"/);
  assert.match(payload.contentHtml, /href="https:\/\/news\.vdoto2\.com\/2018\/11\/stride-rate\/" rel="noopener noreferrer" target="_blank"/);
  assert.match(payload.contentHtml, /href="https:\/\/pmc\.ncbi\.nlm\.nih\.gov\/articles\/PMC9441414\/" rel="noopener noreferrer" target="_blank"/);
  assert.match(payload.contentHtml, /href="https:\/\/pubmed\.ncbi\.nlm\.nih\.gov\/40620407\/" rel="noopener noreferrer" target="_blank"/);
  assert.match(payload.contentHtml, /href="https:\/\/pubmed\.ncbi\.nlm\.nih\.gov\/30862272\/" rel="noopener noreferrer" target="_blank"/);
  assert.match(payload.contentHtml, /href="https:\/\/pubmed\.ncbi\.nlm\.nih\.gov\/28886463\/" rel="noopener noreferrer" target="_blank"/);
  assert.equal(eligibility.eligible, true);
  assert.deepEqual(eligibility.blockingReasons, []);
  assert.equal(eligibility.healthReviewRequired, true);
  assert.equal(eligibility.externalLinkCount, 6);
});

test('running cadence guide has a distinct 1600 by 900 repository cover', async () => {
  assert.equal(fs.existsSync(COVER_IMAGE_PATH), true);
  const metadata = await sharp(COVER_IMAGE_PATH).metadata();
  assert.equal(metadata.format, 'webp');
  assert.equal(metadata.width, 1600);
  assert.equal(metadata.height, 900);
});

test('running cadence guide is registered and seeded once for September 12', () => {
  const articleModule = getArticleModule(CANONICAL_SLUG);
  const seededPosts = POSTS.filter((post) => post.slug === CANONICAL_SLUG);
  const seededPost = seededPosts[0];
  assert.equal(articleModule.ARTICLE, ARTICLE);
  assert.ok(listArticleSlugs().includes(CANONICAL_SLUG));
  assert.equal(listArticleSlugs().length, 55);
  assert.equal(seededPosts.length, 1);
  assert.equal(getCanonicalSeed(CANONICAL_SLUG), seededPost);
  assert.equal(buildContentHtml(seededPost), seededPost.contentHtml);
  assert.equal(htmlToText(seededPost.contentHtml), buildArticlePayload({ coverImageUrl: seededPost.coverImageUrl }).contentText);
  assert.equal(seededPost.coverImageUrl, COVER_IMAGE_URL);
  assert.equal(seededPost.ogImageUrl, COVER_IMAGE_URL);
  assert.equal(seededPost.status, 'scheduled');
  assert.equal(seededPost.publishedAt, '2026-09-12T11:00:00.000Z');
  assert.equal(seededPost.featured, false);
});

test('running cadence guide is noindex health content with create and update wiring', () => {
  const classification = getInitialIndexingClassification(CANONICAL_SLUG);
  const publishAt = '2026-09-12T11:00:00.000Z';
  assert.deepEqual(parseCreateArguments(['--slug', CANONICAL_SLUG, '--apply', '--confirm-editorial-review', '--publish-at', publishAt]), { slug: CANONICAL_SLUG, mode: 'apply', confirmEditorialReview: true, publishAt });
  assert.deepEqual(parseUpdateArguments(['--slug', CANONICAL_SLUG]), { slug: CANONICAL_SLUG, mode: 'dry-run' });
  assert.equal(classification.contentRisk, 'health_safety');
  assert.equal(classification.plannedNoindex, true);
  assert.equal(classification.indexCandidate, false);
  assert.match(packageJson.scripts['blog:update-running-cadence'], new RegExp(`--slug ${CANONICAL_SLUG}`));
});

test('running cadence creation payload uses its local cover and a current review', () => {
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

test('breathing guide reciprocally links to the running cadence guide', () => {
  const href = '/blog/running-cadence-explained';
  const payload = breathingGuide.buildArticlePayload({ coverImageUrl: 'https://cdn.example.com/cover.webp' });
  assert.ok(breathingGuide.REQUIRED_LINKS.includes(`href="${href}"`));
  assert.ok(payload.contentHtml.includes(`href="${href}"`));
  assert.ok(POSTS.find((post) => post.slug === breathingGuide.CANONICAL_SLUG).links.includes(href));
});

test('running cadence guide rejects universal and unsupported prescriptions', () => {
  const payload = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  const withClaim = (claim) => ({ ...payload, contentText: `${payload.contentText} ${claim}`, contentRaw: `${payload.contentText} ${claim}` });
  assert.throws(() => validateArticlePayload(withClaim('Every runner must reach 180 steps per minute.')), /180 universally/);
  assert.throws(() => validateArticlePayload(withClaim('Every beginner must increase cadence.')), /mandate a cadence increase/);
  assert.throws(() => validateArticlePayload(withClaim('Higher cadence guarantees injury prevention.')), /guarantee cadence outcomes/);
  assert.throws(() => validateArticlePayload(withClaim('All runners should increase cadence by 10%.')), /universal percentage change/);
  assert.throws(() => validateArticlePayload(withClaim('Every runner must use a metronome.')), /require a metronome/);
  assert.throws(() => validateArticlePayload(withClaim('Run through pain to raise cadence.')), /running through pain/);
  assert.throws(() => buildArticlePayload(), /cover artwork/);
});
