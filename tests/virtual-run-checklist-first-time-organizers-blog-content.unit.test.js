'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const packageJson = require('../package.json');

const { POSTS, buildContentHtml, htmlToText } = require('../src/scripts/seed-adsense-blog-posts');
const {
  ARTICLE,
  CANONICAL_SLUG,
  REQUIRED_HEADINGS,
  REQUIRED_LINKS,
  buildArticlePayload,
  validateArticlePayload
} = require('../src/content/virtual-run-checklist-first-time-organizers');
const { getArticleModule, listArticleSlugs } = require('../src/content/adsense-blog-article-registry');
const { getCanonicalBlogSlug } = require('../src/utils/blog-canonical');
const { isCurrentEligibleBlog } = require('../src/utils/blog-content-eligibility');
const { parseArguments: parseUpdateArguments } = require('../src/scripts/update-adsense-blog');
const {
  GUIDE_AUTHOR_EMAIL,
  buildCreatePayload,
  getCanonicalSeed,
  parseArguments: parseCreateArguments
} = require('../src/scripts/create-adsense-blog');

const COVER_IMAGE_URL = 'https://cdn.hellorun.online/blog/covers/698f1cb67748262281092639/1785386059549-983600590-virtual-run-checklist-for-first-time-organizers.webp';

test('first-time organizer checklist builds a substantive stage-based payload', () => {
  const payload = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  const wordCount = payload.contentText.split(/\s+/).filter(Boolean).length;

  assert.equal(ARTICLE.slug, CANONICAL_SLUG);
  assert.equal(payload.title, 'Virtual Run Checklist for First-Time Organizers');
  assert.equal(payload.category, 'Organizer Guide');
  assert.deepEqual(payload.tags, [
    'virtual run checklist', 'first-time organizer', 'event planning', 'event rules',
    'runner registration', 'proof review', 'participant support', 'event closeout'
  ]);
  assert.ok(payload.tags.every((tag) => tag.length <= 30));
  assert.ok(payload.excerpt.length <= 220);
  assert.ok(payload.seoTitle.length <= 160);
  assert.ok(payload.seoDescription.length <= 320);
  assert.ok(payload.coverImageAlt.length <= 180);
  assert.ok(payload.contentHtml.length <= 50000);
  assert.ok(payload.contentText.length <= 50000);
  assert.ok(wordCount >= 3000);
  assert.equal(payload.contentRaw, payload.contentText);
  assert.equal(payload.readingTime, Math.ceil(wordCount / 180));
  assert.equal(payload.ogImageUrl, COVER_IMAGE_URL);
  assert.doesNotThrow(() => validateArticlePayload(payload));

  for (const phrase of [
    'Purpose and audience checklist',
    'Dates and timezone checklist',
    'Proof and correction checklist',
    'End-to-end test checklist',
    'Daily or scheduled operations checklist',
    'Review-queue checklist',
    'Results checklist',
    'Data and team closeout checklist',
    'HelloRun currently uses Asia/Manila for platform day-level activity alignment',
    'Do not describe HelloRun as a direct or integrated payment gateway',
    'OCR can propose fields and surface signals'
  ]) {
    assert.match(payload.contentText, new RegExp(phrase, 'i'));
  }
  assert.doesNotMatch(payload.contentHtml, /<h[12]>Virtual Run Checklist for First-Time Organizers<\/h[12]>/i);

  for (const heading of REQUIRED_HEADINGS) {
    assert.ok(payload.contentHtml.includes(`<h2>${heading}</h2>`), `missing required heading: ${heading}`);
  }
  for (const link of REQUIRED_LINKS) {
    assert.ok(payload.contentHtml.includes(link), `missing required link: ${link}`);
  }
});

test('first-time organizer checklist is registered, canonical, and seeded once', () => {
  const articleModule = getArticleModule(CANONICAL_SLUG);
  const seededPosts = POSTS.filter((post) => post.slug === CANONICAL_SLUG);
  const seededPost = seededPosts[0];

  assert.equal(articleModule.ARTICLE, ARTICLE);
  assert.ok(listArticleSlugs().includes(CANONICAL_SLUG));
  assert.equal(listArticleSlugs().length, 29);
  assert.equal(getCanonicalBlogSlug(CANONICAL_SLUG), '');
  assert.equal(seededPosts.length, 1);
  assert.equal(getCanonicalSeed(CANONICAL_SLUG), seededPost);
  assert.equal(buildContentHtml(seededPost), seededPost.contentHtml);
  assert.equal(htmlToText(seededPost.contentHtml), buildArticlePayload({ coverImageUrl: seededPost.coverImageUrl }).contentText);
  assert.equal(seededPost.coverImageUrl, COVER_IMAGE_URL);
  assert.equal(seededPost.ogImageUrl, COVER_IMAGE_URL);
  assert.equal(seededPost.publishedAt, '2026-07-30T04:39:41.000Z');
  assert.equal(seededPost.featured, false);
  assert.equal(seededPost.authorEmail, GUIDE_AUTHOR_EMAIL);
});

test('first-time organizer checklist supports eligible isolated creation and updates', () => {
  const authorId = new mongoose.Types.ObjectId();
  const now = new Date('2026-07-30T04:37:35.000Z');
  const payload = buildCreatePayload({ slug: CANONICAL_SLUG, authorId, now });

  assert.deepEqual(parseCreateArguments(['--slug', CANONICAL_SLUG]), { slug: CANONICAL_SLUG, mode: 'dry-run' });
  assert.deepEqual(parseCreateArguments(['--slug', CANONICAL_SLUG, '--apply']), { slug: CANONICAL_SLUG, mode: 'apply' });
  assert.deepEqual(parseUpdateArguments(['--slug', CANONICAL_SLUG]), { slug: CANONICAL_SLUG, mode: 'dry-run' });
  assert.equal(String(payload.authorId), String(authorId));
  assert.equal(payload.status, 'published');
  assert.equal(payload.featured, false);
  assert.equal(payload.publishedAt.toISOString(), now.toISOString());
  assert.equal(payload.coverImageUrl, COVER_IMAGE_URL);
  assert.equal(payload.ogImageUrl, COVER_IMAGE_URL);
  assert.equal(payload.views, 0);
  assert.equal(payload.likesCount, 0);
  assert.equal(payload.commentsCount, 0);
  assert.equal(isCurrentEligibleBlog(payload), true);
  assert.match(packageJson.scripts['blog:create-adsense'], /create-adsense-blog\.js/);
  assert.match(packageJson.scripts['blog:update-first-time-organizer-checklist'], new RegExp(`--slug ${CANONICAL_SLUG}`));
});

test('first-time organizer checklist rejects missing cover and unsupported claims', () => {
  assert.throws(() => buildArticlePayload({}), /existing cover image is required/);

  const payload = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  const withClaim = (claim) => ({
    ...payload,
    contentText: `${payload.contentText} ${claim}`,
    contentRaw: `${payload.contentText} ${claim}`
  });

  assert.throws(
    () => validateArticlePayload(withClaim('HelloRun is an integrated payment gateway.')),
    /direct payment processing/
  );
  assert.throws(
    () => validateArticlePayload(withClaim('HelloRun guarantees attendance.')),
    /guarantee approval, attendance, success, or compliance/
  );
  assert.throws(
    () => validateArticlePayload(withClaim('OCR is perfect.')),
    /perfect OCR/
  );
  assert.throws(
    () => validateArticlePayload(withClaim('Every virtual event accepts treadmills.')),
    /universal evidence acceptance/
  );
  assert.throws(
    () => validateArticlePayload(withClaim('Platform publication means the event is legally compliant.')),
    /automatic legal compliance/
  );
  assert.throws(
    () => validateArticlePayload(withClaim('A waiver removes organizer responsibility.')),
    /absolve organisers/
  );
});
