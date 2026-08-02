'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
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
} = require('../src/content/realistic-monthly-running-goal');

const COVER_IMAGE_URL = 'https://cdn.hellorun.online/blog/covers/698f1cb67748262281092639/1785668498609-628989328-how-to-set-a-realistic-monthly-running-goal.webp';

test('monthly running goal draft builds a substantive goal-calibration payload', () => {
  const payload = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  const wordCount = payload.contentText.split(/\s+/).filter(Boolean).length;

  assert.equal(ARTICLE.slug, CANONICAL_SLUG);
  assert.equal(payload.title, 'How to Set a Realistic Monthly Running Goal');
  assert.equal(payload.category, 'Motivation');
  assert.ok(BLOG_CATEGORIES.includes(payload.category));
  assert.deepEqual(payload.tags, [
    'monthly running goal', 'running motivation', 'goal setting', 'virtual run',
    'distance challenge', 'running routine', 'progress tracking', 'runner planning'
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
  assert.doesNotMatch(payload.contentHtml, /<h[12]>How to Set a Realistic Monthly Running Goal<\/h[12]>/i);
  assert.match(payload.contentText, /minimum success, a working range, and an optional stretch goal/i);
  assert.match(payload.contentText, /ordinary recent weeks/i);
  assert.match(payload.contentText, /Pending distance is potential progress, not official progress/i);
  for (const evidenceState of ['Recorded:', 'Submitted:', 'Pending:', 'Approved:', 'Rejected:']) {
    assert.match(payload.contentText, new RegExp(evidenceState, 'i'));
  }
  assert.match(payload.contentText, /reviewed in August 2026 using current public guidance/i);
  assert.match(payload.contentText, /population recommendations describe activity associated with health benefits; they are not race-readiness tests/i);
  assert.match(payload.contentText, /These examples demonstrate the decision process/i);

  for (const heading of REQUIRED_HEADINGS) {
    assert.ok(payload.contentHtml.includes(`<h2>${heading}</h2>`), `missing required heading: ${heading}`);
  }
  for (const link of REQUIRED_LINKS) {
    assert.ok(payload.contentHtml.includes(link), `missing required link: ${link}`);
  }
});

test('monthly running goal draft sanitizes content and passes publication eligibility', () => {
  const payload = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  const eligibility = evaluateBlogContentEligibility({
    ...payload,
    coverImageUrl: COVER_IMAGE_URL
  }, { evaluatedAt: new Date('2026-08-02T00:00:00.000Z') });

  assert.equal(payload.contentHtml.includes('<script'), false);
  assert.equal(payload.contentHtml.includes('javascript:'), false);
  assert.notEqual(payload.contentHtml, RAW_CONTENT_HTML.trim());
  assert.match(payload.contentHtml, /href="https:\/\/www\.who\.int\/publications\/i\/item\/9789240015128" rel="noopener noreferrer" target="_blank"/);
  assert.equal(eligibility.eligible, true);
  assert.deepEqual(eligibility.blockingReasons, []);
  assert.equal(eligibility.healthReviewRequired, true);
  assert.ok(eligibility.wordCount >= 3200);
  assert.ok(eligibility.semanticUnitCount >= 3);
  assert.equal(eligibility.externalLinkCount, 3);
});

test('monthly running goal is registered and seeded once with its CDN cover', () => {
  const articleModule = getArticleModule(CANONICAL_SLUG);
  const seededPosts = POSTS.filter((post) => post.slug === CANONICAL_SLUG);
  const seededPost = seededPosts[0];

  assert.equal(articleModule.ARTICLE, ARTICLE);
  assert.ok(listArticleSlugs().includes(CANONICAL_SLUG));
  assert.equal(listArticleSlugs().length, 33);
  assert.equal(seededPosts.length, 1);
  assert.equal(getCanonicalSeed(CANONICAL_SLUG), seededPost);
  assert.equal(buildContentHtml(seededPost), seededPost.contentHtml);
  assert.equal(htmlToText(seededPost.contentHtml), buildArticlePayload({ coverImageUrl: seededPost.coverImageUrl }).contentText);
  assert.equal(seededPost.coverImageUrl, COVER_IMAGE_URL);
  assert.equal(seededPost.ogImageUrl, COVER_IMAGE_URL);
  assert.equal(seededPost.featured, false);
  assert.equal(seededPost.authorEmail, GUIDE_AUTHOR_EMAIL);
  assert.equal(seededPost.publishedAt, '2026-08-02T11:04:09.434Z');
});

test('monthly running goal supports isolated publication and ongoing updates', () => {
  const authorId = new mongoose.Types.ObjectId();
  const publishedAt = new Date('2026-08-02T11:04:09.434Z');
  const payload = buildCreatePayload({ slug: CANONICAL_SLUG, authorId, now: publishedAt });

  assert.deepEqual(parseCreateArguments(['--slug', CANONICAL_SLUG]), { slug: CANONICAL_SLUG, mode: 'dry-run' });
  assert.deepEqual(parseCreateArguments(['--slug', CANONICAL_SLUG, '--apply']), { slug: CANONICAL_SLUG, mode: 'apply' });
  assert.deepEqual(parseUpdateArguments(['--slug', CANONICAL_SLUG]), { slug: CANONICAL_SLUG, mode: 'dry-run' });
  assert.equal(String(payload.authorId), String(authorId));
  assert.equal(payload.status, 'published');
  assert.equal(payload.publishedAt.toISOString(), publishedAt.toISOString());
  assert.equal(payload.approvedAt.toISOString(), publishedAt.toISOString());
  assert.equal(payload.coverImageUrl, COVER_IMAGE_URL);
  assert.equal(payload.ogImageUrl, COVER_IMAGE_URL);
  assert.match(packageJson.scripts['blog:update-realistic-monthly-running-goal'], new RegExp(`--slug ${CANONICAL_SLUG}`));
});

test('monthly running goal draft rejects unsafe or unsupported claims', () => {
  const payload = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  const withClaim = (claim) => ({
    ...payload,
    contentText: `${payload.contentText} ${claim}`,
    contentRaw: `${payload.contentText} ${claim}`
  });

  assert.throws(
    () => validateArticlePayload(withClaim('The 10% rule applies to every runner.')),
    /10% rule/
  );
  assert.throws(
    () => validateArticlePayload(withClaim('You must run every day.')),
    /daily running/
  );
  assert.throws(
    () => validateArticlePayload(withClaim('This framework guarantees completion.')),
    /guarantee outcomes/
  );
  assert.throws(
    () => validateArticlePayload(withClaim('Every event accepts treadmill activity.')),
    /universal event acceptance/
  );
  assert.throws(
    () => validateArticlePayload(withClaim('Pending distance counts as official completion.')),
    /pending progress/
  );
  assert.throws(
    () => validateArticlePayload(withClaim('Every submission is automatically approved.')),
    /automatic approval/
  );
  assert.throws(
    () => validateArticlePayload(withClaim('Exactly 100 km per month is realistic for everyone.')),
    /universal distance/
  );
  assert.throws(
    () => buildArticlePayload(),
    /cover artwork/
  );
});
