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
} = require('../src/content/schools-organizations-virtual-runs-guide');
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

const COVER_IMAGE_URL = 'https://cdn.hellorun.online/blog/covers/698f1cb67748262281092639/1785388535469-101481065-how-schools-and-organizations-can-use-virtual-runs.webp';
const BROKEN_DISTANCE_GUIDE_SLUG = 'how-to-choose-between-running-distances';
const DISTANCE_GUIDE_SLUG = 'how-to-choose-between-a-5k-10k-21k-or-distance-challenge';

test('schools and organizations guide builds a substantive, source-aware payload', () => {
  const payload = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  const wordCount = payload.contentText.split(/\s+/).filter(Boolean).length;

  assert.equal(ARTICLE.slug, CANONICAL_SLUG);
  assert.equal(payload.title, 'How Schools and Organizations Can Use Virtual Runs');
  assert.equal(payload.category, 'Organizer Guide');
  assert.deepEqual(payload.tags, [
    'school virtual run', 'organization event', 'community challenge', 'fundraising run',
    'employee wellbeing', 'student participation', 'group event planning', 'virtual run program'
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
    'A school participation or house challenge',
    'An employee wellbeing programme',
    'A nonprofit awareness or fundraising campaign',
    'Safeguarding is an organisational responsibility',
    'Collect the minimum useful data',
    'Single activity or accumulated distance',
    'HelloRun currently uses Asia/Manila for platform day-level activity alignment',
    'HelloRun does not directly process registration payments',
    'OCR is fallible'
  ]) {
    assert.match(payload.contentText, new RegExp(phrase, 'i'));
  }
  assert.doesNotMatch(payload.contentHtml, /<h[12]>How Schools and Organizations Can Use Virtual Runs<\/h[12]>/i);

  for (const heading of REQUIRED_HEADINGS) {
    assert.ok(payload.contentHtml.includes(`<h2>${heading}</h2>`), `missing required heading: ${heading}`);
  }
  for (const link of REQUIRED_LINKS) {
    assert.ok(payload.contentHtml.includes(link), `missing required link: ${link}`);
  }
  assert.match(payload.contentHtml, new RegExp(`/blog/${DISTANCE_GUIDE_SLUG}`));
  assert.doesNotMatch(payload.contentHtml, new RegExp(`/blog/${BROKEN_DISTANCE_GUIDE_SLUG}(?:["'#?]|$)`));
});

test('schools and organizations guide is registered, canonical, and seeded once', () => {
  const articleModule = getArticleModule(CANONICAL_SLUG);
  const seededPosts = POSTS.filter((post) => post.slug === CANONICAL_SLUG);
  const seededPost = seededPosts[0];

  assert.equal(articleModule.ARTICLE, ARTICLE);
  assert.ok(listArticleSlugs().includes(CANONICAL_SLUG));
  assert.equal(listArticleSlugs().length, 35);
  assert.equal(getCanonicalBlogSlug(CANONICAL_SLUG), '');
  assert.equal(seededPosts.length, 1);
  assert.equal(getCanonicalSeed(CANONICAL_SLUG), seededPost);
  assert.equal(buildContentHtml(seededPost), seededPost.contentHtml);
  assert.equal(htmlToText(seededPost.contentHtml), buildArticlePayload({ coverImageUrl: seededPost.coverImageUrl }).contentText);
  assert.equal(seededPost.coverImageUrl, COVER_IMAGE_URL);
  assert.equal(seededPost.ogImageUrl, COVER_IMAGE_URL);
  assert.equal(seededPost.publishedAt, '2026-07-30T05:20:44.385Z');
  assert.equal(seededPost.featured, false);
  assert.equal(seededPost.authorEmail, GUIDE_AUTHOR_EMAIL);
  assert.ok(seededPost.links.includes(`/blog/${DISTANCE_GUIDE_SLUG}`));
  assert.ok(!seededPost.links.includes(`/blog/${BROKEN_DISTANCE_GUIDE_SLUG}`));
  assert.equal(getCanonicalBlogSlug(BROKEN_DISTANCE_GUIDE_SLUG), DISTANCE_GUIDE_SLUG);
});

test('schools and organizations guide supports eligible isolated creation and updates', () => {
  const authorId = new mongoose.Types.ObjectId();
  const now = new Date('2026-07-30T05:00:00.000Z');
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
  assert.match(packageJson.scripts['blog:update-schools-organizations-guide'], new RegExp(`--slug ${CANONICAL_SLUG}`));
});

test('schools and organizations guide rejects missing cover and unsupported claims', () => {
  assert.throws(() => buildArticlePayload({}), /existing cover image is required/);

  const payload = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  const withClaim = (claim) => ({
    ...payload,
    contentText: `${payload.contentText} ${claim}`,
    contentRaw: `${payload.contentText} ${claim}`
  });

  assert.throws(
    () => validateArticlePayload(withClaim('HelloRun processes donations.')),
    /direct payment or donation processing/
  );
  assert.throws(
    () => validateArticlePayload(withClaim('A virtual run guarantees engagement.')),
    /guarantee participation or organizational outcomes/
  );
  assert.throws(
    () => validateArticlePayload(withClaim('OCR provides perfect verification.')),
    /OCR as proof or perfect verification/
  );
  assert.throws(
    () => validateArticlePayload(withClaim('Every school can require student participation.')),
    /universalize institutional authority/
  );
  assert.throws(
    () => validateArticlePayload(withClaim('A waiver removes organization responsibility.')),
    /absolve institutions/
  );
  assert.throws(
    () => validateArticlePayload(withClaim('HelloRun configuration guarantees safeguarding compliance.')),
    /automatic institutional compliance/
  );
});
