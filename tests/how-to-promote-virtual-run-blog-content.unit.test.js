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
  require('../src/content/what-is-virtual-run-guide'),
  require('../src/content/clear-virtual-run-rules-guide'),
  require('../src/content/fair-distance-categories-challenge-goals-guide')
];
const {
  ARTICLE,
  CANONICAL_SLUG,
  RAW_CONTENT_HTML,
  REQUIRED_HEADINGS,
  REQUIRED_LINKS,
  buildArticlePayload,
  validateArticlePayload
} = require('../src/content/how-to-promote-virtual-run');

const COVER_IMAGE_URL = '/images/blog/covers/how-to-promote-a-virtual-run.webp';
const COVER_IMAGE_PATH = path.join(__dirname, '..', 'src', 'public', 'images', 'blog', 'covers', 'how-to-promote-a-virtual-run.webp');
const PUBLISH_AT = '2026-09-24T11:00:00.000Z';

test('virtual-run promotion guide builds a substantive organizer acquisition guide', () => {
  const payload = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  const wordCount = payload.contentText.split(/\s+/).filter(Boolean).length;
  assert.equal(ARTICLE.slug, CANONICAL_SLUG);
  assert.equal(payload.title, 'How to Promote a Virtual Run and Get More Participants');
  assert.equal(payload.seoTitle, payload.title);
  assert.equal(payload.seoDescription, 'Learn how to promote a virtual run using clear event positioning, social media, participant communication, partnerships, reminders, and post-event content.');
  assert.equal(payload.category, 'Organizer Guide');
  assert.ok(BLOG_CATEGORIES.includes(payload.category));
  assert.deepEqual(payload.tags, [
    'how to promote a virtual run', 'virtual run marketing', 'promote running event', 'running event promotion',
    'increase race registration', 'virtual event promotion', 'social media marketing', 'organizer guide'
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
  assert.match(payload.contentText, /^To promote a virtual run, stop reposting the registration link by itself/i);
  assert.match(payload.contentText, /participant communication timeline focuses on registered participants/i);
  assert.match(payload.contentText, /promotion timeline focuses on acquiring suitable participants/i);
  for (const heading of REQUIRED_HEADINGS) assert.ok(payload.contentHtml.includes(`<h2>${heading}</h2>`), `missing heading: ${heading}`);
  for (const link of REQUIRED_LINKS) assert.ok(payload.contentHtml.includes(link), `missing link: ${link}`);
});

test('promotion guide covers positioning, conversion, channels, retention, and measurement', () => {
  const { contentText } = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  for (const phrase of [
    'positioning sentence', 'target participant', 'conversion-ready', 'registration friction',
    'promotion timeline', 'social media', 'participant stories', 'community partners',
    'without spamming', 'activity period', 'future participants', 'Measure which channels worked'
  ]) assert.match(contentText, new RegExp(phrase, 'i'));
  assert.match(contentText, /one complete event page/i);
  assert.match(contentText, /Do not record a real participant's account, receipt, route, contact details, proof, or rejection screen/i);
  assert.match(contentText, /UTM parameters such as source, medium, campaign, and content/i);
  assert.match(contentText, /Do not invent capacity, price increases, “last slots,” or social proof/i);
});

test('promotion guide sanitizes official sources and passes general-content eligibility', () => {
  const payload = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  const eligibility = evaluateBlogContentEligibility({ ...payload, contentRisk: 'general', coverImageUrl: COVER_IMAGE_URL }, { evaluatedAt: new Date('2026-08-31T00:00:00.000Z') });
  assert.notEqual(payload.contentHtml, RAW_CONTENT_HTML.trim());
  assert.doesNotMatch(payload.contentHtml, /<script|javascript:/i);
  assert.match(payload.contentHtml, /href="https:\/\/privacy\.gov\.ph\/wp-content\/uploads\/2023\/11\/NPC-Circular-No\.-2023-04_Guidelines-on-Consent_07Nov2023\.pdf" rel="noopener noreferrer" target="_blank"/);
  assert.match(payload.contentHtml, /href="https:\/\/www\.ftc\.gov\/business-guidance\/resources\/ftcs-endorsement-guides-what-people-are-asking" rel="noopener noreferrer" target="_blank"/);
  assert.match(payload.contentHtml, /href="https:\/\/www\.w3\.org\/WAI\/tutorials\/images\/" rel="noopener noreferrer" target="_blank"/);
  assert.match(payload.contentHtml, /href="https:\/\/support\.google\.com\/analytics\/answer\/10917952\?hl=en" rel="noopener noreferrer" target="_blank"/);
  assert.equal(eligibility.eligible, true);
  assert.deepEqual(eligibility.blockingReasons, []);
  assert.equal(eligibility.healthReviewRequired, false);
  assert.equal(eligibility.externalLinkCount, 4);
});

test('promotion guide has a distinct 1600 by 900 repository cover', async () => {
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

test('promotion guide is registered and seeded once for September 24', () => {
  const articleModule = getArticleModule(CANONICAL_SLUG);
  const seededPosts = POSTS.filter((post) => post.slug === CANONICAL_SLUG);
  const seededPost = seededPosts[0];
  assert.equal(articleModule.ARTICLE, ARTICLE);
  assert.ok(listArticleSlugs().includes(CANONICAL_SLUG));
  assert.equal(listArticleSlugs().length, 63);
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

test('promotion guide is scheduled noindex general content with update wiring', () => {
  const classification = getInitialIndexingClassification(CANONICAL_SLUG);
  assert.deepEqual(parseCreateArguments(['--slug', CANONICAL_SLUG, '--apply', '--confirm-editorial-review', '--publish-at', PUBLISH_AT]), { slug: CANONICAL_SLUG, mode: 'apply', confirmEditorialReview: true, publishAt: PUBLISH_AT });
  assert.deepEqual(parseUpdateArguments(['--slug', CANONICAL_SLUG]), { slug: CANONICAL_SLUG, mode: 'dry-run' });
  assert.equal(classification.contentRisk, 'general');
  assert.equal(classification.plannedNoindex, true);
  assert.equal(classification.indexCandidate, false);
  assert.match(packageJson.scripts['blog:update-promote-virtual-run'], new RegExp(`--slug ${CANONICAL_SLUG}`));
});

test('promotion creation payload schedules the local cover with a current review', () => {
  const reviewedAt = new Date('2026-09-13T08:00:00.000Z');
  const publishAt = new Date(PUBLISH_AT);
  const payload = buildCreatePayload({
    slug: CANONICAL_SLUG,
    authorId: '507f1f77bcf86cd799439011',
    now: reviewedAt,
    publishAt,
    confirmEditorialReview: true
  });
  assert.equal(payload.coverImageUrl, COVER_IMAGE_URL);
  assert.equal(payload.status, 'scheduled');
  assert.equal(payload.publishedAt.toISOString(), PUBLISH_AT);
  assert.equal(payload.searchIndexingStatus, 'noindex');
  assert.equal(payload.searchIndexingReason, 'pending_value_review');
  assert.equal(hasCurrentPublicationReview(payload), true);
});

test('four primary August guides reciprocally link to the promotion guide', () => {
  const href = '/blog/how-to-promote-a-virtual-run';
  for (const guide of supportingGuides) {
    const payload = guide.buildArticlePayload({ coverImageUrl: 'https://cdn.example.com/cover.webp' });
    assert.ok(guide.REQUIRED_LINKS.some((link) => link.includes(href)), `${guide.CANONICAL_SLUG} required links`);
    assert.ok(payload.contentHtml.includes(`href="${href}"`), `${guide.CANONICAL_SLUG} content`);
    assert.ok(POSTS.find((post) => post.slug === guide.CANONICAL_SLUG).links.includes(href), `${guide.CANONICAL_SLUG} seed links`);
  }
});

test('promotion guide omits the later unpublished pricing guide', () => {
  const payload = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  assert.doesNotMatch(payload.contentHtml, /href="\/blog\/virtual-run-registration-fee-pricing"/);
});

test('promotion guide rejects dishonest acquisition and private-proof claims', () => {
  const payload = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  const withClaim = (claim) => ({ ...payload, contentText: `${payload.contentText} ${claim}`, contentRaw: `${payload.contentText} ${claim}` });
  assert.throws(() => validateArticlePayload(withClaim('This strategy guarantees more registrations.')), /guarantee participant acquisition/);
  assert.throws(() => validateArticlePayload(withClaim('Buying followers is recommended.')), /artificial promotion/);
  assert.throws(() => validateArticlePayload(withClaim('Fake scarcity increases registrations.')), /false urgency/);
  assert.throws(() => validateArticlePayload(withClaim('Scrape emails for promotion.')), /spam or unlawful contact collection/);
  assert.throws(() => validateArticlePayload(withClaim('Hide a paid relationship.')), /material relationships/);
  assert.throws(() => validateArticlePayload(withClaim('Publish private proof without permission.')), /private evidence reuse/);
  assert.throws(() => validateArticlePayload(withClaim('HelloRun guarantees participants.')), /overstate HelloRun acquisition features/);
  assert.throws(() => buildArticlePayload(), /cover artwork/);
});
