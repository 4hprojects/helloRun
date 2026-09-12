'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require('sharp');
const packageJson = require('../package.json');

const { POSTS, buildContentHtml, htmlToText } = require('../src/scripts/seed-adsense-blog-posts');
const { getArticleModule, listArticleSlugs } = require('../src/content/adsense-blog-article-registry');
const { getInitialIndexingClassification } = require('../src/content/adsense-content-indexing');
const { evaluateBlogContentEligibility, hasCurrentPublicationReview } = require('../src/utils/blog-content-eligibility');
const { BLOG_CATEGORIES } = require('../src/utils/blog');
const { buildCreatePayload, getCanonicalSeed, parseArguments: parseCreateArguments } = require('../src/scripts/create-adsense-blog');
const { parseArguments: parseUpdateArguments } = require('../src/scripts/update-adsense-blog');
const supportingGuides = [
  require('../src/content/participant-communication-timeline-guide'),
  require('../src/content/fair-distance-categories-challenge-goals-guide'),
  require('../src/content/clear-virtual-run-rules-guide')
];
const promotionGuide = require('../src/content/how-to-promote-virtual-run');
const {
  ARTICLE,
  CANONICAL_SLUG,
  RAW_CONTENT_HTML,
  REQUIRED_HEADINGS,
  REQUIRED_LINKS,
  buildArticlePayload,
  validateArticlePayload
} = require('../src/content/virtual-run-registration-fee-pricing');

const COVER_IMAGE_URL = '/images/blog/covers/virtual-run-registration-fee-pricing.webp';
const COVER_IMAGE_PATH = path.join(__dirname, '..', 'src', 'public', 'images', 'blog', 'covers', 'virtual-run-registration-fee-pricing.webp');
const PUBLISH_AT = '2026-09-26T11:00:00.000Z';

test('virtual-run pricing guide builds a substantive commercial organizer guide', () => {
  const payload = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  const wordCount = payload.contentText.split(/\s+/).filter(Boolean).length;
  assert.equal(ARTICLE.slug, CANONICAL_SLUG);
  assert.equal(payload.title, 'How Much Should You Charge for a Virtual Run?');
  assert.equal(payload.seoTitle, payload.title);
  assert.equal(payload.seoDescription, 'Learn how organizers can set a virtual run registration fee based on event costs, participant value, inclusions, payment fees, rewards, and target audience.');
  assert.equal(payload.category, 'Organizer Guide');
  assert.ok(BLOG_CATEGORIES.includes(payload.category));
  assert.deepEqual(payload.tags, [
    'virtual run registration fee', 'virtual race pricing', 'virtual run price', 'race registration fee',
    'virtual event pricing', 'running event registration', 'event cost worksheet', 'organizer guide'
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
  assert.doesNotMatch(payload.contentHtml, /<h1\b|<table\b/i);
  assert.match(payload.contentText, /^There is no universal virtual run registration fee/i);
  assert.match(payload.contentText, /total projected event costs ÷ expected paid participants = estimated base cost per participant/i);
  for (const heading of REQUIRED_HEADINGS) assert.ok(payload.contentHtml.includes(`<h2>${heading}</h2>`), `missing heading: ${heading}`);
  for (const link of REQUIRED_LINKS) assert.ok(payload.contentHtml.includes(link), `missing link: ${link}`);
});

test('pricing guide covers all cost, value, fulfilment, and disclosure decisions', () => {
  const { contentText } = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  for (const phrase of [
    'fixed', 'variable', 'digital-only', 'medals and physical kits', 'payment and transfer costs',
    'shipping and fulfilment', 'organizer time', 'distance categories', 'early-bird',
    'hidden fees', 'cash flow', 'margin, contingency, and fundraising', 'event page'
  ]) assert.match(contentText, new RegExp(phrase, 'i'));
  assert.match(contentText, /Scenario A: 100 paid participants/i);
  assert.match(contentText, /Scenario B: only 75 paid participants/i);
  assert.match(contentText, /₱24,000 ÷ 100 = ₱240/i);
  assert.match(contentText, /at least 67 paid registrations/i);
  assert.match(contentText, /numbers below are fictional Philippine-peso planning examples/i);
  assert.match(contentText, /Expected attendance is an assumption, not a promise/i);
});

test('pricing guide accurately limits HelloRun payment and pricing claims', () => {
  const { contentText } = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  assert.match(contentText, /HelloRun currently does not directly process the external transfer/i);
  assert.match(contentText, /participant can upload a receipt, and the organizer reviews it/i);
  assert.match(contentText, /paid distance-based pricing, customized signup options, and dated registration packages/i);
  assert.match(contentText, /Dated pricing periods must fit within registration, not overlap/i);
  assert.match(contentText, /selected amount is stored with the registration/i);
  assert.match(contentText, /delivery settings and a delivery fee for configured paid events/i);
});

test('pricing guide sanitizes official sources and passes general-content eligibility', () => {
  const payload = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  const eligibility = evaluateBlogContentEligibility({ ...payload, contentRisk: 'general', coverImageUrl: COVER_IMAGE_URL }, { evaluatedAt: new Date('2026-09-01T00:00:00.000Z') });
  assert.notEqual(payload.contentHtml, RAW_CONTENT_HTML.trim());
  assert.doesNotMatch(payload.contentHtml, /<script|javascript:/i);
  for (const href of [
    'https://legacy.sba.gov/business-guide/plan-your-business/calculate-your-startup-costs/break-even-point',
    'https://ecommerce.dti.gov.ph/wp-content/uploads/2024/06/Joint-Administrative-Order-No.-24-03-1.pdf',
    'https://www.bsp.gov.ph/Pages/PAYMENTS%20AND%20SETTLEMENTS/National%20Retail%20Payment%20System/The-Regulatory-Framework.aspx',
    'https://privacy.gov.ph/data-privacy-act/',
    'https://fairtrade.dti.gov.ph/about/business-regulations/sales-promotion-division/',
    'https://bir-cdn.bir.gov.ph/BIR/pdf/RR%20No.%207-%202024.pdf'
  ]) assert.ok(payload.contentHtml.includes(`href="${href}" rel="noopener noreferrer" target="_blank"`), href);
  assert.equal(eligibility.eligible, true);
  assert.deepEqual(eligibility.blockingReasons, []);
  assert.equal(eligibility.healthReviewRequired, false);
  assert.equal(eligibility.externalLinkCount, 6);
});

test('pricing guide has a distinct 1600 by 900 repository cover', async () => {
  assert.equal(fs.existsSync(COVER_IMAGE_PATH), true);
  const metadata = await sharp(COVER_IMAGE_PATH).metadata();
  assert.equal(metadata.format, 'webp');
  assert.equal(metadata.width, 1600);
  assert.equal(metadata.height, 900);
  const coverHash = crypto.createHash('sha256').update(fs.readFileSync(COVER_IMAGE_PATH)).digest('hex');
  const otherHashes = fs.readdirSync(path.dirname(COVER_IMAGE_PATH))
    .filter((name) => name.endsWith('.webp') && name !== path.basename(COVER_IMAGE_PATH))
    .map((name) => crypto.createHash('sha256').update(fs.readFileSync(path.join(path.dirname(COVER_IMAGE_PATH), name))).digest('hex'));
  assert.equal(otherHashes.includes(coverHash), false);
});

test('pricing guide is registered and seeded once for September 26', () => {
  const articleModule = getArticleModule(CANONICAL_SLUG);
  const seededPosts = POSTS.filter((post) => post.slug === CANONICAL_SLUG);
  const seededPost = seededPosts[0];
  assert.equal(articleModule.ARTICLE, ARTICLE);
  assert.ok(listArticleSlugs().includes(CANONICAL_SLUG));
  assert.equal(listArticleSlugs().length, 53);
  assert.equal(seededPosts.length, 1);
  assert.equal(getCanonicalSeed(CANONICAL_SLUG), seededPost);
  assert.equal(buildContentHtml(seededPost), seededPost.contentHtml);
  assert.equal(htmlToText(seededPost.contentHtml), buildArticlePayload({ coverImageUrl: seededPost.coverImageUrl }).contentText);
  assert.equal(seededPost.coverImageUrl, COVER_IMAGE_URL);
  assert.equal(seededPost.ogImageUrl, COVER_IMAGE_URL);
  assert.equal(seededPost.status, 'scheduled');
  assert.equal(seededPost.publishedAt, PUBLISH_AT);
  assert.equal(seededPost.featured, false);
});

test('pricing guide is scheduled noindex general content with update wiring', () => {
  const classification = getInitialIndexingClassification(CANONICAL_SLUG);
  assert.deepEqual(parseCreateArguments(['--slug', CANONICAL_SLUG, '--apply', '--confirm-editorial-review', '--publish-at', PUBLISH_AT]), { slug: CANONICAL_SLUG, mode: 'apply', confirmEditorialReview: true, publishAt: PUBLISH_AT });
  assert.deepEqual(parseUpdateArguments(['--slug', CANONICAL_SLUG]), { slug: CANONICAL_SLUG, mode: 'dry-run' });
  assert.equal(classification.contentRisk, 'general');
  assert.equal(classification.plannedNoindex, true);
  assert.equal(classification.indexCandidate, false);
  assert.match(packageJson.scripts['blog:update-virtual-run-pricing'], new RegExp(`--slug ${CANONICAL_SLUG}`));
});

test('pricing creation payload schedules the local cover with a current review', () => {
  const reviewedAt = new Date('2026-09-13T08:00:00.000Z');
  const payload = buildCreatePayload({
    slug: CANONICAL_SLUG,
    authorId: '507f1f77bcf86cd799439011',
    now: reviewedAt,
    publishAt: new Date(PUBLISH_AT),
    confirmEditorialReview: true
  });
  assert.equal(payload.coverImageUrl, COVER_IMAGE_URL);
  assert.equal(payload.status, 'scheduled');
  assert.equal(payload.publishedAt.toISOString(), PUBLISH_AT);
  assert.equal(payload.searchIndexingStatus, 'noindex');
  assert.equal(payload.searchIndexingReason, 'pending_value_review');
  assert.equal(hasCurrentPublicationReview(payload), true);
});

test('three existing organizer guides reciprocally link to the pricing guide', () => {
  const href = '/blog/virtual-run-registration-fee-pricing';
  for (const guide of supportingGuides) {
    const payload = guide.buildArticlePayload({ coverImageUrl: 'https://cdn.example.com/cover.webp' });
    assert.ok(guide.REQUIRED_LINKS.some((link) => link.includes(href)), `${guide.CANONICAL_SLUG} required links`);
    assert.ok(payload.contentHtml.includes(`href="${href}"`), `${guide.CANONICAL_SLUG} content`);
    assert.ok(POSTS.find((post) => post.slug === guide.CANONICAL_SLUG).links.includes(href), `${guide.CANONICAL_SLUG} seed links`);
  }
});

test('the September 24 promotion guide omits the later unpublished pricing guide', () => {
  const href = '/blog/virtual-run-registration-fee-pricing';
  const payload = promotionGuide.buildArticlePayload({ coverImageUrl: 'https://cdn.example.com/cover.webp' });
  assert.ok(!promotionGuide.REQUIRED_LINKS.some((link) => link.includes(href)));
  assert.ok(!payload.contentHtml.includes(`href="${href}"`));
  assert.ok(!POSTS.find((post) => post.slug === promotionGuide.CANONICAL_SLUG).links.includes(href));
});

test('pricing guide rejects universal, hidden-fee, and guarantee claims', () => {
  const payload = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  const withClaim = (claim) => ({ ...payload, contentText: `${payload.contentText} ${claim}`, contentRaw: `${payload.contentText} ${claim}` });
  assert.throws(() => validateArticlePayload(withClaim('Every virtual run should cost ₱500.')), /universal registration fee/);
  assert.throws(() => validateArticlePayload(withClaim('This formula is the only valid pricing method.')), /one formula as universal/);
  assert.throws(() => validateArticlePayload(withClaim('Hide the shipping fee.')), /hidden fees/);
  assert.throws(() => validateArticlePayload(withClaim('This worksheet guarantees a profit.')), /financial outcomes/);
  assert.throws(() => validateArticlePayload(withClaim('Shipping is always included.')), /universal shipping treatment/);
  assert.throws(() => validateArticlePayload(withClaim('Longer distances should always cost more.')), /higher distance pricing/);
  assert.throws(() => validateArticlePayload(withClaim('Every event must use early-bird pricing.')), /promotional pricing/);
  assert.throws(() => validateArticlePayload(withClaim('HelloRun directly processes the payment.')), /payment processing/);
  assert.throws(() => validateArticlePayload(withClaim('Follower count guarantees paid registrations.')), /demand assumptions/);
  assert.throws(() => buildArticlePayload(), /cover artwork/);
});
