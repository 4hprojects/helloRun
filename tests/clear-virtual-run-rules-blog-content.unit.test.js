'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const packageJson = require('../package.json');

const {
  POSTS,
  buildContentHtml,
  buildPostPayload,
  htmlToText,
  preservePublishedSeedState
} = require('../src/scripts/seed-adsense-blog-posts');
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
} = require('../src/content/clear-virtual-run-rules-guide');

const COVER_IMAGE_URL = 'https://cdn.hellorun.online/blog/covers/698f1cb67748262281092639/1785670404268-504104721-how-to-write-clear-virtual-run-rules-participants-can-follow.webp';
const PUBLISH_AT = '2026-08-03T11:00:00.000Z';

test('clear virtual run rules guide builds a substantive participant-facing payload', () => {
  const payload = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  const wordCount = payload.contentText.split(/\s+/).filter(Boolean).length;

  assert.equal(ARTICLE.slug, CANONICAL_SLUG);
  assert.equal(payload.title, 'How to Write Clear Virtual Run Rules Participants Can Follow');
  assert.equal(payload.category, 'Organizer Guide');
  assert.ok(BLOG_CATEGORIES.includes(payload.category));
  assert.deepEqual(payload.tags, [
    'virtual run rules', 'event organizer', 'event mechanics', 'participant guide',
    'proof requirements', 'event communication', 'runner support', 'organizer checklist'
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
  assert.doesNotMatch(payload.contentHtml, /<h[12]>How to Write Clear Virtual Run Rules Participants Can Follow<\/h[12]>/i);
  assert.match(payload.contentText, /one public event page as the authoritative version/i);
  assert.match(payload.contentText, /Registration window.*Activity window.*Submission window.*Review and correction window/is);
  assert.match(payload.contentText, /Pending or submitted evidence remains potential progress/i);
  assert.match(payload.contentText, /does not directly process the external transfer/i);
  assert.match(payload.contentText, /Copyable participant-rules template/i);
  assert.match(payload.contentText, /participant comprehension test/i);

  for (const heading of REQUIRED_HEADINGS) {
    assert.ok(payload.contentHtml.includes(`<h2>${heading}</h2>`), `missing required heading: ${heading}`);
  }
  for (const link of REQUIRED_LINKS) {
    assert.ok(payload.contentHtml.includes(link), `missing required link: ${link}`);
  }
});

test('clear virtual run rules guide sanitizes content and passes publication eligibility', () => {
  const payload = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  const eligibility = evaluateBlogContentEligibility({
    ...payload,
    coverImageUrl: COVER_IMAGE_URL
  }, { evaluatedAt: new Date('2026-08-02T12:00:00.000Z') });

  assert.equal(payload.contentHtml.includes('<script'), false);
  assert.equal(payload.contentHtml.includes('javascript:'), false);
  assert.notEqual(payload.contentHtml, RAW_CONTENT_HTML.trim());
  assert.equal(eligibility.eligible, true);
  assert.deepEqual(eligibility.blockingReasons, []);
  assert.equal(eligibility.healthReviewRequired, true);
  assert.ok(eligibility.wordCount >= 3200);
  assert.equal(eligibility.externalLinkCount, 1);
});

test('clear virtual run rules guide is registered and seeded once for August 3', () => {
  const articleModule = getArticleModule(CANONICAL_SLUG);
  const seededPosts = POSTS.filter((post) => post.slug === CANONICAL_SLUG);
  const seededPost = seededPosts[0];

  assert.equal(articleModule.ARTICLE, ARTICLE);
  assert.ok(listArticleSlugs().includes(CANONICAL_SLUG));
  assert.equal(listArticleSlugs().length, 29);
  assert.equal(seededPosts.length, 1);
  assert.equal(getCanonicalSeed(CANONICAL_SLUG), seededPost);
  assert.equal(buildContentHtml(seededPost), seededPost.contentHtml);
  assert.equal(htmlToText(seededPost.contentHtml), buildArticlePayload({ coverImageUrl: seededPost.coverImageUrl }).contentText);
  assert.equal(seededPost.coverImageUrl, COVER_IMAGE_URL);
  assert.equal(seededPost.ogImageUrl, COVER_IMAGE_URL);
  assert.equal(seededPost.status, 'scheduled');
  assert.equal(seededPost.publishedAt, PUBLISH_AT);
  assert.equal(seededPost.featured, false);
  assert.equal(seededPost.authorEmail, GUIDE_AUTHOR_EMAIL);
});

test('clear virtual run rules guide supports exact future scheduling and updates', () => {
  const authorId = new mongoose.Types.ObjectId();
  const reviewedAt = new Date('2026-08-02T12:00:00.000Z');
  const payload = buildCreatePayload({ slug: CANONICAL_SLUG, authorId, now: reviewedAt, publishAt: PUBLISH_AT });

  assert.deepEqual(parseCreateArguments(['--slug', CANONICAL_SLUG, '--publish-at', PUBLISH_AT]), {
    slug: CANONICAL_SLUG,
    mode: 'dry-run',
    publishAt: PUBLISH_AT
  });
  assert.deepEqual(parseCreateArguments(['--slug', CANONICAL_SLUG, '--apply', '--publish-at', PUBLISH_AT]), {
    slug: CANONICAL_SLUG,
    mode: 'apply',
    publishAt: PUBLISH_AT
  });
  assert.deepEqual(parseUpdateArguments(['--slug', CANONICAL_SLUG]), { slug: CANONICAL_SLUG, mode: 'dry-run' });
  assert.equal(String(payload.authorId), String(authorId));
  assert.equal(payload.status, 'scheduled');
  assert.equal(payload.publishedAt.toISOString(), PUBLISH_AT);
  assert.equal(payload.approvedAt, null);
  assert.equal(payload.coverImageUrl, COVER_IMAGE_URL);
  assert.equal(payload.ogImageUrl, COVER_IMAGE_URL);
  assert.equal(payload.contentEligibility.eligible, true);
  assert.equal(payload.publicationReview.originalityConfirmed, true);
  assert.match(packageJson.scripts['blog:update-clear-virtual-run-rules'], new RegExp(`--slug ${CANONICAL_SLUG}`));
  assert.throws(
    () => buildCreatePayload({ slug: CANONICAL_SLUG, authorId, now: reviewedAt, publishAt: reviewedAt }),
    /must be in the future/
  );
});

test('scheduled seed state cannot regress an existing published record', () => {
  const author = { _id: new mongoose.Types.ObjectId() };
  const seededPost = getCanonicalSeed(CANONICAL_SLUG);
  const payload = buildPostPayload(seededPost, author, 25);
  const approvedAt = new Date('2026-08-03T11:03:00.000Z');

  assert.equal(payload.status, 'scheduled');
  assert.equal(payload.approvedAt, null);
  preservePublishedSeedState(payload, {
    status: 'published',
    approvedAt,
    publishedAt: new Date(PUBLISH_AT)
  });
  assert.equal(payload.status, 'published');
  assert.equal(payload.approvedAt, approvedAt);
});

test('clear virtual run rules validator rejects unsupported claims and missing artwork', () => {
  const payload = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  const withClaim = (claim) => ({
    ...payload,
    contentText: `${payload.contentText} ${claim}`,
    contentRaw: `${payload.contentText} ${claim}`
  });

  assert.throws(() => validateArticlePayload(withClaim('Every virtual run accepts every activity.')), /universal activity acceptance/);
  assert.throws(() => validateArticlePayload(withClaim('Pending distance counts as approved progress.')), /pending progress/);
  assert.throws(() => validateArticlePayload(withClaim('Every submission is automatically approved.')), /automatic approval/);
  assert.throws(() => validateArticlePayload(withClaim('HelloRun directly processes the payment.')), /direct payment processing/);
  assert.throws(() => validateArticlePayload(withClaim('All registrants get a certificate.')), /automatic recognition/);
  assert.throws(() => buildArticlePayload(), /cover artwork/);
});
