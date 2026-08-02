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
} = require('../src/content/month-long-virtual-run-consistency');
const { getArticleModule, listArticleSlugs } = require('../src/content/adsense-blog-article-registry');
const { parseArguments: parseUpdateArguments } = require('../src/scripts/update-adsense-blog');
const {
  GUIDE_AUTHOR_EMAIL,
  buildCreatePayload,
  getCanonicalSeed,
  parseArguments: parseCreateArguments
} = require('../src/scripts/create-adsense-blog');

const COVER_IMAGE_URL = 'https://cdn.hellorun.online/blog/covers/698f1cb67748262281092639/1785283544392-252140112-how-to-stay-consistent-month-long-virtual-run.webp';

test('month-long consistency guide builds a substantive flexible-routine payload', () => {
  const payload = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  const wordCount = payload.contentText.split(/\s+/).filter(Boolean).length;

  assert.equal(ARTICLE.slug, CANONICAL_SLUG);
  assert.equal(payload.title, 'How to Stay Consistent During a Month-Long Virtual Run');
  assert.equal(payload.category, 'Training');
  assert.deepEqual(payload.tags, [
    'running consistency', 'monthly challenge', 'virtual run', 'running routine',
    'activity planning', 'recovery days', 'motivation tips', 'progress tracking'
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

  assert.match(payload.contentText, /Consistency does not mean running every day/i);
  assert.match(payload.contentText, /Build a flexible four-part month/i);
  assert.match(payload.contentText, /Use one weekly review instead of daily judgment/i);
  assert.match(payload.contentText, /Do not compensate for a missed session by doubling/i);
  assert.match(payload.contentText, /Pending is not approved progress/i);
  assert.match(payload.contentText, /Conditional automatic approval may apply/i);
  assert.match(payload.contentText, /Accumulated standings rank approved distance, not speed/i);
  assert.match(payload.contentText, /certificates are configured features, not automatic entitlements/i);
  assert.match(payload.contentText, /does not directly process an external payment transfer/i);
  assert.doesNotMatch(payload.contentHtml, /<h[12]>How to Stay Consistent During a Month-Long Virtual Run<\/h[12]>/i);

  for (const heading of REQUIRED_HEADINGS) {
    assert.ok(payload.contentHtml.includes(`<h2>${heading}</h2>`), `missing required heading: ${heading}`);
  }
  for (const link of REQUIRED_LINKS) {
    assert.ok(payload.contentHtml.includes(link), `missing required link: ${link}`);
  }
});

test('month-long consistency guide is registered and seeded once with its CDN cover', () => {
  const articleModule = getArticleModule(CANONICAL_SLUG);
  const seededPosts = POSTS.filter((post) => post.slug === CANONICAL_SLUG);
  const seededPost = seededPosts[0];

  assert.equal(articleModule.ARTICLE, ARTICLE);
  assert.ok(listArticleSlugs().includes(CANONICAL_SLUG));
  assert.equal(listArticleSlugs().length, 26);
  assert.equal(seededPosts.length, 1);
  assert.equal(getCanonicalSeed(CANONICAL_SLUG), seededPost);
  assert.equal(buildContentHtml(seededPost), seededPost.contentHtml);
  assert.equal(htmlToText(seededPost.contentHtml), buildArticlePayload({ coverImageUrl: seededPost.coverImageUrl }).contentText);
  assert.equal(seededPost.coverImageUrl, COVER_IMAGE_URL);
  assert.equal(seededPost.ogImageUrl, COVER_IMAGE_URL);
  assert.equal(seededPost.featured, false);
  assert.equal(seededPost.authorEmail, GUIDE_AUTHOR_EMAIL);
});

test('month-long consistency guide supports isolated creation and ongoing updates', () => {
  const authorId = new mongoose.Types.ObjectId();
  const now = new Date('2026-07-29T00:15:00.000Z');
  const payload = buildCreatePayload({ slug: CANONICAL_SLUG, authorId, now });

  assert.deepEqual(parseCreateArguments(['--slug', CANONICAL_SLUG]), { slug: CANONICAL_SLUG, mode: 'dry-run' });
  assert.deepEqual(parseCreateArguments(['--slug', CANONICAL_SLUG, '--apply']), { slug: CANONICAL_SLUG, mode: 'apply' });
  assert.deepEqual(parseUpdateArguments(['--slug', CANONICAL_SLUG]), { slug: CANONICAL_SLUG, mode: 'dry-run' });
  assert.equal(String(payload.authorId), String(authorId));
  assert.equal(payload.status, 'published');
  assert.equal(payload.featured, false);
  assert.equal(payload.publishedAt.toISOString(), now.toISOString());
  assert.equal(payload.approvedAt.toISOString(), now.toISOString());
  assert.equal(payload.coverImageUrl, COVER_IMAGE_URL);
  assert.equal(payload.ogImageUrl, COVER_IMAGE_URL);
  assert.equal(payload.views, 0);
  assert.equal(payload.likesCount, 0);
  assert.equal(payload.commentsCount, 0);
  assert.match(packageJson.scripts['blog:create-adsense'], /create-adsense-blog\.js/);
  assert.match(packageJson.scripts['blog:update-month-long-consistency'], new RegExp(`--slug ${CANONICAL_SLUG}`));
});

test('month-long consistency payload rejects missing cover and unsupported claims', () => {
  assert.throws(() => buildArticlePayload({}), /existing cover image is required/);

  const payload = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  const withClaim = (claim) => ({
    ...payload,
    contentText: `${payload.contentText} ${claim}`,
    contentRaw: `${payload.contentText} ${claim}`
  });

  assert.throws(
    () => validateArticlePayload(withClaim('Runners must run every day.')),
    /universal daily streak/
  );
  assert.throws(
    () => validateArticlePayload(withClaim('You should make up a missed session by doubling.')),
    /unsafe catch-up activity/
  );
  assert.throws(
    () => validateArticlePayload(withClaim('Pending distance counts as official completion.')),
    /pending progress/
  );
  assert.throws(
    () => validateArticlePayload(withClaim('Every event accepts treadmill activities.')),
    /universal activity acceptance/
  );
  assert.throws(
    () => validateArticlePayload(withClaim('Every submission is automatically approved.')),
    /unsupported HelloRun behavior/
  );
  assert.throws(
    () => validateArticlePayload(withClaim('You automatically receive a certificate.')),
    /automatic recognition/
  );
});
