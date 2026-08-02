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
} = require('../src/content/run-walk-method-beginner-guide');

const COVER_IMAGE_URL = 'https://cdn.hellorun.online/blog/covers/698f1cb67748262281092639/1785671459612-580542686-run-walk-method-beginner-friendly-way-build-endurance.webp';
const COVER_IMAGE_PATH = path.join(
  __dirname,
  '..',
  'src',
  'public',
  'images',
  'blog',
  'covers',
  'run-walk-method-beginner-friendly-way-build-endurance.webp'
);

test('run-walk guide builds a substantive beginner-friendly payload', () => {
  const payload = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  const wordCount = payload.contentText.split(/\s+/).filter(Boolean).length;

  assert.equal(ARTICLE.slug, CANONICAL_SLUG);
  assert.equal(payload.title, 'The Run-Walk Method: A Beginner-Friendly Way to Build Endurance');
  assert.equal(payload.category, 'Training');
  assert.ok(BLOG_CATEGORIES.includes(payload.category));
  assert.deepEqual(payload.tags, [
    'run walk method', 'beginner running', 'running endurance', 'walk breaks',
    'easy running', 'running intervals', '5K preparation', 'training guide'
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
  assert.doesNotMatch(payload.contentHtml, /<h[12]>The Run-Walk Method:/i);
  assert.match(payload.contentText, /walk is part of the session from the beginning/i);
  assert.match(payload.contentText, /not the one with the most running/i);
  assert.match(payload.contentText, /There is no universal deadline for removing walk breaks/i);
  assert.match(payload.contentText, /Population recommendations describe activity associated with health benefits; they are not personal training plans/i);
  assert.match(payload.contentText, /A pending activity is potential progress, not official progress/i);
  assert.match(payload.contentText, /reviewed in August 2026 using current public guidance/i);
  assert.match(payload.contentText, /These scenarios illustrate decisions, not predicted outcomes/i);

  for (const heading of REQUIRED_HEADINGS) {
    assert.ok(payload.contentHtml.includes(`<h2>${heading}</h2>`), `missing required heading: ${heading}`);
  }
  for (const link of REQUIRED_LINKS) {
    assert.ok(payload.contentHtml.includes(link), `missing required link: ${link}`);
  }
});

test('run-walk guide sanitizes sources and passes publication eligibility', () => {
  const payload = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  const eligibility = evaluateBlogContentEligibility({
    ...payload,
    coverImageUrl: COVER_IMAGE_URL
  }, { evaluatedAt: new Date('2026-08-02T00:00:00.000Z') });

  assert.equal(payload.contentHtml.includes('<script'), false);
  assert.equal(payload.contentHtml.includes('javascript:'), false);
  assert.notEqual(payload.contentHtml, RAW_CONTENT_HTML.trim());
  assert.match(payload.contentHtml, /href="https:\/\/www\.who\.int\/publications\/i\/item\/9789240015128" rel="noopener noreferrer" target="_blank"/);
  assert.match(payload.contentHtml, /href="https:\/\/www\.cdc\.gov\/physical-activity-basics\/measuring\/index\.html" rel="noopener noreferrer" target="_blank"/);
  assert.match(payload.contentHtml, /href="https:\/\/www\.nhs\.uk\/better-health\/get-active\/get-running-with-couch-to-5k\/couch-to-5k-running-plan\/" rel="noopener noreferrer" target="_blank"/);
  assert.equal(eligibility.eligible, true);
  assert.deepEqual(eligibility.blockingReasons, []);
  assert.equal(eligibility.healthReviewRequired, true);
  assert.ok(eligibility.wordCount >= 3200);
  assert.ok(eligibility.semanticUnitCount >= 3);
  assert.equal(eligibility.externalLinkCount, 3);
});

test('run-walk guide has a distinct 1600 by 900 repository cover', async () => {
  assert.equal(fs.existsSync(COVER_IMAGE_PATH), true);
  const metadata = await sharp(COVER_IMAGE_PATH).metadata();
  assert.equal(metadata.format, 'webp');
  assert.equal(metadata.width, 1600);
  assert.equal(metadata.height, 900);
});

test('run-walk guide is registered and seeded once for August 6', () => {
  const articleModule = getArticleModule(CANONICAL_SLUG);
  const seededPosts = POSTS.filter((post) => post.slug === CANONICAL_SLUG);
  const seededPost = seededPosts[0];

  assert.equal(articleModule.ARTICLE, ARTICLE);
  assert.ok(listArticleSlugs().includes(CANONICAL_SLUG));
  assert.equal(listArticleSlugs().length, 27);
  assert.equal(seededPosts.length, 1);
  assert.equal(getCanonicalSeed(CANONICAL_SLUG), seededPost);
  assert.equal(buildContentHtml(seededPost), seededPost.contentHtml);
  assert.equal(htmlToText(seededPost.contentHtml), buildArticlePayload({ coverImageUrl: seededPost.coverImageUrl }).contentText);
  assert.equal(seededPost.coverImageUrl, COVER_IMAGE_URL);
  assert.equal(seededPost.ogImageUrl, COVER_IMAGE_URL);
  assert.equal(seededPost.status, 'scheduled');
  assert.equal(seededPost.publishedAt, '2026-08-06T11:00:00.000Z');
  assert.equal(seededPost.featured, false);
  assert.equal(seededPost.authorEmail, GUIDE_AUTHOR_EMAIL);
});

test('run-walk guide supports exact future scheduling and updates', () => {
  const authorId = new mongoose.Types.ObjectId();
  const reviewedAt = new Date('2026-08-02T12:00:00.000Z');
  const publishAt = '2026-08-06T11:00:00.000Z';
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
  assert.match(packageJson.scripts['blog:update-run-walk-method'], new RegExp(`--slug ${CANONICAL_SLUG}`));
});

test('run-walk guide rejects unsafe, universal, and unsupported claims', () => {
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
    () => validateArticlePayload(withClaim('This method guarantees endurance.')),
    /guarantee outcomes/
  );
  assert.throws(
    () => validateArticlePayload(withClaim('Every runner must start with one minute running.')),
    /universal interval/
  );
  assert.throws(
    () => validateArticlePayload(withClaim('Walking is always accepted.')),
    /universal interval/
  );
  assert.throws(
    () => validateArticlePayload(withClaim('Pending activity counts as official completion.')),
    /pending progress/
  );
  assert.throws(
    () => validateArticlePayload(withClaim('Every submission is automatically approved.')),
    /automatic approval/
  );
  assert.throws(
    () => buildArticlePayload(),
    /cover artwork/
  );
});
