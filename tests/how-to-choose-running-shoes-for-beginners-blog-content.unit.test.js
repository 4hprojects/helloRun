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
const safeRouteGuide = require('../src/content/choose-safe-virtual-run-route-guide');
const {
  ARTICLE,
  CANONICAL_SLUG,
  RAW_CONTENT_HTML,
  REQUIRED_HEADINGS,
  REQUIRED_LINKS,
  buildArticlePayload,
  validateArticlePayload
} = require('../src/content/how-to-choose-running-shoes-for-beginners');

const COVER_IMAGE_URL = '/images/blog/covers/how-to-choose-running-shoes-for-beginners.webp';
const COVER_IMAGE_PATH = path.join(__dirname, '..', 'src', 'public', 'images', 'blog', 'covers', 'how-to-choose-running-shoes-for-beginners.webp');

test('beginner running-shoe guide builds a substantive selection payload', () => {
  const payload = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  const wordCount = payload.contentText.split(/\s+/).filter(Boolean).length;

  assert.equal(ARTICLE.slug, CANONICAL_SLUG);
  assert.equal(payload.title, 'How to Choose Running Shoes for Beginners');
  assert.equal(payload.seoTitle, payload.title);
  assert.equal(payload.category, 'Training');
  assert.ok(BLOG_CATEGORIES.includes(payload.category));
  assert.deepEqual(payload.tags, [
    'running shoes', 'beginner running', 'running shoe fit', 'shoe buying guide',
    'road running shoes', 'trail running shoes', 'running gear', 'runner comfort'
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
  assert.match(payload.contentText, /best running shoes for beginners are the pair that fits both feet comfortably/i);
  assert.match(payload.contentText, /One suitable pair is enough for many beginners/i);
  assert.match(payload.contentText, /There is no exact universal replacement mileage/i);
  assert.match(payload.contentText, /contains no affiliate recommendation/i);
  assert.match(payload.contentText, /Footwear information is not personal medical advice, diagnosis, treatment/i);

  for (const heading of REQUIRED_HEADINGS) assert.ok(payload.contentHtml.includes(`<h2>${heading}</h2>`), `missing heading: ${heading}`);
  for (const link of REQUIRED_LINKS) assert.ok(payload.contentHtml.includes(link), `missing link: ${link}`);
});

test('beginner running-shoe guide preserves practical fit and buying guidance', () => {
  const { contentText } = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  assert.match(contentText, /one-half inch—or roughly a thumb's width—between the longest toe and the front/i);
  assert.match(contentText, /Length:.*Width:.*Depth or volume:.*Midfoot:.*Heel:/is);
  assert.match(contentText, /Road and paved-path use.*Trail use.*Treadmill use.*Mixed use/is);
  assert.match(contentText, /Measure both feet.*Try more than one option.*Confirm terms/is);
  assert.match(contentText, /Read return deadlines, fees, packaging requirements/is);
  assert.match(contentText, /Heat, humidity, sudden rain, wet pavement/is);
});

test('beginner running-shoe guide sanitizes sources and passes health-sensitive eligibility', () => {
  const payload = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  const eligibility = evaluateBlogContentEligibility({ ...payload, contentRisk: 'health_safety', coverImageUrl: COVER_IMAGE_URL }, { evaluatedAt: new Date('2026-08-30T00:00:00.000Z') });

  assert.notEqual(payload.contentHtml, RAW_CONTENT_HTML.trim());
  assert.doesNotMatch(payload.contentHtml, /<script|javascript:/i);
  assert.match(payload.contentHtml, /href="https:\/\/www\.orthoinfo\.org\/staying-healthy\/athletic-shoes\/" rel="noopener noreferrer" target="_blank"/);
  assert.match(payload.contentHtml, /href="https:\/\/www\.guysandstthomas\.nhs\.uk\/health-information\/choosing-athletic-footwear" rel="noopener noreferrer" target="_blank"/);
  assert.match(payload.contentHtml, /href="https:\/\/pubmed\.ncbi\.nlm\.nih\.gov\/35993829\/" rel="noopener noreferrer" target="_blank"/);
  assert.equal(eligibility.eligible, true);
  assert.deepEqual(eligibility.blockingReasons, []);
  assert.equal(eligibility.healthReviewRequired, true);
  assert.equal(eligibility.externalLinkCount, 3);
});

test('beginner running-shoe guide has a distinct 1600 by 900 repository cover', async () => {
  assert.equal(fs.existsSync(COVER_IMAGE_PATH), true);
  const metadata = await sharp(COVER_IMAGE_PATH).metadata();
  assert.equal(metadata.format, 'webp');
  assert.equal(metadata.width, 1600);
  assert.equal(metadata.height, 900);
});

test('beginner running-shoe guide is registered and seeded once for September 10', () => {
  const articleModule = getArticleModule(CANONICAL_SLUG);
  const seededPosts = POSTS.filter((post) => post.slug === CANONICAL_SLUG);
  const seededPost = seededPosts[0];
  assert.equal(articleModule.ARTICLE, ARTICLE);
  assert.ok(listArticleSlugs().includes(CANONICAL_SLUG));
  assert.equal(listArticleSlugs().length, 61);
  assert.equal(seededPosts.length, 1);
  assert.equal(getCanonicalSeed(CANONICAL_SLUG), seededPost);
  assert.equal(buildContentHtml(seededPost), seededPost.contentHtml);
  assert.equal(htmlToText(seededPost.contentHtml), buildArticlePayload({ coverImageUrl: seededPost.coverImageUrl }).contentText);
  assert.equal(seededPost.coverImageUrl, COVER_IMAGE_URL);
  assert.equal(seededPost.ogImageUrl, COVER_IMAGE_URL);
  assert.equal(seededPost.status, 'scheduled');
  assert.equal(seededPost.publishedAt, '2026-09-10T11:00:00.000Z');
  assert.equal(seededPost.featured, false);
});

test('beginner running-shoe guide is noindex health content with create and update wiring', () => {
  const classification = getInitialIndexingClassification(CANONICAL_SLUG);
  const publishAt = '2026-09-10T11:00:00.000Z';
  assert.deepEqual(parseCreateArguments(['--slug', CANONICAL_SLUG, '--apply', '--confirm-editorial-review', '--publish-at', publishAt]), { slug: CANONICAL_SLUG, mode: 'apply', confirmEditorialReview: true, publishAt });
  assert.deepEqual(parseUpdateArguments(['--slug', CANONICAL_SLUG]), { slug: CANONICAL_SLUG, mode: 'dry-run' });
  assert.equal(classification.contentRisk, 'health_safety');
  assert.equal(classification.plannedNoindex, true);
  assert.equal(classification.indexCandidate, false);
  assert.match(packageJson.scripts['blog:update-beginner-running-shoes'], new RegExp(`--slug ${CANONICAL_SLUG}`));
});

test('beginner running-shoe creation payload uses its local cover and a current review', () => {
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

test('safe-route guide reciprocally links to the beginner shoe guide', () => {
  const href = '/blog/how-to-choose-running-shoes-for-beginners';
  const payload = safeRouteGuide.buildArticlePayload({ coverImageUrl: 'https://cdn.example.com/cover.webp' });
  assert.ok(safeRouteGuide.REQUIRED_LINKS.includes(`href="${href}"`));
  assert.ok(payload.contentHtml.includes(`href="${href}"`));
  assert.ok(POSTS.find((post) => post.slug === safeRouteGuide.CANONICAL_SLUG).links.includes(href));
});

test('beginner running-shoe guide rejects universal, medical, and commercial claims', () => {
  const payload = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  const withClaim = (claim) => ({ ...payload, contentText: `${payload.contentText} ${claim}`, contentRaw: `${payload.contentText} ${claim}` });
  assert.throws(() => validateArticlePayload(withClaim('This is the perfect running shoe for everyone.')), /universal shoe/);
  assert.throws(() => validateArticlePayload(withClaim('These shoes guarantee injury prevention.')), /injury prevention/);
  assert.throws(() => validateArticlePayload(withClaim('Flat feet always require stability shoes.')), /arch shape alone/);
  assert.throws(() => validateArticlePayload(withClaim('Every beginner must get a gait analysis.')), /mandate gait analysis/);
  assert.throws(() => validateArticlePayload(withClaim('All running shoes must be replaced after 500 miles.')), /replacement mileage/);
  assert.throws(() => validateArticlePayload(withClaim('Every beginner must own two pairs.')), /multiple pairs/);
  assert.throws(() => validateArticlePayload(withClaim('The most expensive shoe is always safest.')), /price with suitability/);
  assert.throws(() => buildArticlePayload(), /cover artwork/);
});
