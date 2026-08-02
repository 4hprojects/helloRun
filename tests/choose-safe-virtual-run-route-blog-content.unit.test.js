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
  GUIDE_AUTHOR_EMAIL,
  buildCreatePayload,
  getCanonicalSeed,
  parseArguments: parseCreateArguments
} = require('../src/scripts/create-adsense-blog');
const { parseArguments: parseUpdateArguments } = require('../src/scripts/update-adsense-blog');
const {
  ARTICLE,
  CANONICAL_SLUG,
  RAW_CONTENT_HTML,
  REQUIRED_HEADINGS,
  REQUIRED_LINKS,
  buildArticlePayload,
  validateArticlePayload
} = require('../src/content/choose-safe-virtual-run-route-guide');

const COVER_IMAGE_URL = 'https://cdn.hellorun.online/blog/covers/698f1cb67748262281092639/1785678117646-898427735-how-to-choose-a-safe-route-for-your-virtual-run.webp';
const COVER_IMAGE_PATH = path.join(
  __dirname,
  '..',
  'src',
  'public',
  'images',
  'blog',
  'covers',
  'how-to-choose-a-safe-route-for-your-virtual-run.webp'
);

test('safe virtual-run route guide builds a substantive race-tips payload', () => {
  const payload = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  const wordCount = payload.contentText.split(/\s+/).filter(Boolean).length;

  assert.equal(ARTICLE.slug, CANONICAL_SLUG);
  assert.equal(payload.title, 'How to Choose a Safe Route for Your Virtual Run');
  assert.equal(payload.category, 'Race Tips');
  assert.ok(BLOG_CATEGORIES.includes(payload.category));
  assert.deepEqual(payload.tags, [
    'running route safety', 'virtual run route', 'runner safety', 'route planning',
    'Philippines running', 'weather awareness', 'pedestrian safety', 'virtual race tips'
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
  assert.doesNotMatch(payload.contentHtml, /<h[12]>How to Choose a Safe Route/i);
  assert.match(payload.contentText, /No public route is completely safe/i);
  assert.match(payload.contentText, /Pending evidence awaits the applicable checks/i);
  assert.match(payload.contentText, /reviewed in August 2026 using current Philippine Atmospheric/i);
  assert.match(payload.contentText, /Choose two candidate routes and complete the assessment/i);

  for (const heading of REQUIRED_HEADINGS) {
    assert.ok(payload.contentHtml.includes(`<h2>${heading}</h2>`), `missing required heading: ${heading}`);
  }
  for (const link of REQUIRED_LINKS) {
    assert.ok(payload.contentHtml.includes(link), `missing required link: ${link}`);
  }
});

test('safe virtual-run route guide sanitizes sources and passes publication eligibility', () => {
  const payload = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  const eligibility = evaluateBlogContentEligibility({
    ...payload,
    coverImageUrl: COVER_IMAGE_URL
  }, { evaluatedAt: new Date('2026-08-02T00:00:00.000Z') });

  assert.equal(payload.contentHtml.includes('<script'), false);
  assert.equal(payload.contentHtml.includes('javascript:'), false);
  assert.notEqual(payload.contentHtml, RAW_CONTENT_HTML.trim());
  assert.match(payload.contentHtml, /href="https:\/\/www\.pagasa\.dost\.gov\.ph\/products-and-services" rel="noopener noreferrer" target="_blank"/);
  assert.match(payload.contentHtml, /href="https:\/\/www\.pagasa\.dost\.gov\.ph\/learning-tools\/floods" rel="noopener noreferrer" target="_blank"/);
  assert.match(payload.contentHtml, /href="https:\/\/www\.nhtsa\.gov\/road-safety\/pedestrian-safety" rel="noopener noreferrer" target="_blank"/);
  assert.match(payload.contentHtml, /href="https:\/\/www\.dpwh\.gov\.ph\/dpwh\/sites\/default\/files\/issuances\/DO_062_S2011\.pdf" rel="noopener noreferrer" target="_blank"/);
  assert.equal(eligibility.eligible, true);
  assert.deepEqual(eligibility.blockingReasons, []);
  assert.equal(eligibility.healthReviewRequired, true);
  assert.ok(eligibility.wordCount >= 3200);
  assert.ok(eligibility.semanticUnitCount >= 3);
  assert.equal(eligibility.externalLinkCount, 4);
});

test('safe virtual-run route guide uses a 1600 by 900 isometric cover', async () => {
  assert.equal(fs.existsSync(COVER_IMAGE_PATH), true);
  const metadata = await sharp(COVER_IMAGE_PATH).metadata();
  assert.equal(metadata.format, 'webp');
  assert.equal(metadata.width, 1600);
  assert.equal(metadata.height, 900);
});

test('safe virtual-run route guide is registered and seeded once for August 10', () => {
  const articleModule = getArticleModule(CANONICAL_SLUG);
  const seededPosts = POSTS.filter((post) => post.slug === CANONICAL_SLUG);
  const seededPost = seededPosts[0];

  assert.equal(articleModule.ARTICLE, ARTICLE);
  assert.ok(listArticleSlugs().includes(CANONICAL_SLUG));
  assert.equal(listArticleSlugs().length, 34);
  assert.equal(seededPosts.length, 1);
  assert.equal(getCanonicalSeed(CANONICAL_SLUG), seededPost);
  assert.equal(buildContentHtml(seededPost), seededPost.contentHtml);
  assert.equal(htmlToText(seededPost.contentHtml), buildArticlePayload({ coverImageUrl: seededPost.coverImageUrl }).contentText);
  assert.equal(seededPost.coverImageUrl, COVER_IMAGE_URL);
  assert.equal(seededPost.ogImageUrl, COVER_IMAGE_URL);
  assert.equal(seededPost.status, 'scheduled');
  assert.equal(seededPost.publishedAt, '2026-08-10T11:00:00.000Z');
  assert.equal(seededPost.featured, false);
  assert.equal(seededPost.authorEmail, GUIDE_AUTHOR_EMAIL);
});

test('safe virtual-run route guide supports exact future scheduling and updates', () => {
  const authorId = new mongoose.Types.ObjectId();
  const reviewedAt = new Date('2026-08-02T14:00:00.000Z');
  const publishAt = '2026-08-10T11:00:00.000Z';
  const payload = buildCreatePayload({ slug: CANONICAL_SLUG, authorId, now: reviewedAt, publishAt });

  assert.deepEqual(
    parseCreateArguments(['--slug', CANONICAL_SLUG, '--apply', '--publish-at', publishAt]),
    { slug: CANONICAL_SLUG, mode: 'apply', publishAt }
  );
  assert.deepEqual(parseUpdateArguments(['--slug', CANONICAL_SLUG]), { slug: CANONICAL_SLUG, mode: 'dry-run' });
  assert.equal(String(payload.authorId), String(authorId));
  assert.equal(payload.status, 'scheduled');
  assert.equal(payload.publishedAt.toISOString(), publishAt);
  assert.equal(payload.approvedAt, null);
  assert.equal(payload.coverImageUrl, COVER_IMAGE_URL);
  assert.equal(payload.ogImageUrl, COVER_IMAGE_URL);
  assert.equal(payload.contentEligibility.eligible, true);
  assert.equal(payload.publicationReview.policyVersion, 'ugc-adsense-v1');
  assert.equal(payload.publicationReview.originalityConfirmed, true);
  assert.match(packageJson.scripts['blog:update-safe-virtual-run-route'], new RegExp(`--slug ${CANONICAL_SLUG}`));
});

test('safe virtual-run route guide rejects unsafe or unsupported claims', () => {
  const payload = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  const withClaim = (claim) => ({
    ...payload,
    contentText: `${payload.contentText} ${claim}`,
    contentRaw: `${payload.contentText} ${claim}`
  });

  assert.throws(() => validateArticlePayload(withClaim('This route is completely safe.')), /route safety/);
  assert.throws(() => validateArticlePayload(withClaim('A favorable forecast means safe weather.')), /forecasts/);
  assert.throws(() => validateArticlePayload(withClaim('Run through floodwater.')), /floodwater/);
  assert.throws(() => validateArticlePayload(withClaim('Visibility clothing makes a road safe.')), /visibility/);
  assert.throws(() => validateArticlePayload(withClaim('Every event accepts treadmill running.')), /event acceptance/);
  assert.throws(() => validateArticlePayload(withClaim('Pending evidence counts as official progress.')), /pending evidence/);
  assert.throws(() => validateArticlePayload(withClaim('Every submission is automatically approved.')), /automatic approval/);
  assert.throws(() => buildArticlePayload(), /cover artwork/);
});
