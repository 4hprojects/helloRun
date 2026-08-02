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
} = require('../src/content/virtual-run-submission-rejection-guide');
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

const COVER_IMAGE_URL = 'https://cdn.hellorun.online/blog/covers/698f1cb67748262281092639/1785384120791-554479927-why-a-virtual-run-submission-may-be-rejected.webp';

test('submission-rejection guide builds a substantive source-aware correction payload', () => {
  const payload = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  const wordCount = payload.contentText.split(/\s+/).filter(Boolean).length;

  assert.equal(ARTICLE.slug, CANONICAL_SLUG);
  assert.equal(payload.title, 'Why a Virtual Run Submission May Be Rejected');
  assert.equal(payload.category, 'Virtual Run Guide');
  assert.deepEqual(payload.tags, [
    'virtual run', 'submission rejection', 'run proof', 'activity evidence',
    'proof review', 'result correction', 'GPS activity', 'event rules'
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

  assert.match(payload.contentText, /Blocked before submission/i);
  assert.match(payload.contentText, /Submitted and awaiting review/i);
  assert.match(payload.contentText, /Flagged for manual attention/i);
  assert.match(payload.contentText, /Rejected with a correction reason/i);
  assert.match(payload.contentText, /A review flag does not prove fraud or misconduct/i);
  assert.match(payload.contentText, /Pending distance is not approved completion/i);
  assert.match(payload.contentText, /Rejected distance does not count toward official completion/i);
  assert.match(payload.contentText, /correction action does not extend the event or submission window/i);
  assert.doesNotMatch(payload.contentHtml, /<h[12]>Why a Virtual Run Submission May Be Rejected<\/h[12]>/i);

  for (const reason of [
    'Activity proof is unclear',
    'Proof does not show the required activity',
    'Activity identity does not match',
    'Distance does not meet the event requirement',
    'Activity date is outside the event window',
    'Required activity details are missing',
    'Activity was already submitted',
    'Another activity issue needs correction'
  ]) {
    assert.match(payload.contentText, new RegExp(reason, 'i'));
  }
  for (const heading of REQUIRED_HEADINGS) {
    assert.ok(payload.contentHtml.includes(`<h2>${heading}</h2>`), `missing required heading: ${heading}`);
  }
  for (const link of REQUIRED_LINKS) {
    assert.ok(payload.contentHtml.includes(link), `missing required link: ${link}`);
  }
});

test('submission-rejection guide is registered, canonical, and seeded once with its CDN cover', () => {
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
  assert.equal(seededPost.publishedAt, '2026-07-30T04:06:41.345Z');
  assert.equal(seededPost.featured, false);
  assert.equal(seededPost.authorEmail, GUIDE_AUTHOR_EMAIL);
});

test('submission-rejection guide supports eligible isolated creation and ongoing updates', () => {
  const authorId = new mongoose.Types.ObjectId();
  const now = new Date('2026-07-30T04:05:01.000Z');
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
  assert.match(packageJson.scripts['blog:update-submission-rejection'], new RegExp(`--slug ${CANONICAL_SLUG}`));
});

test('submission-rejection guide rejects missing cover and unsupported claims', () => {
  assert.throws(() => buildArticlePayload({}), /existing cover image is required/);

  const payload = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  const withClaim = (claim) => ({
    ...payload,
    contentText: `${payload.contentText} ${claim}`,
    contentRaw: `${payload.contentText} ${claim}`
  });

  assert.throws(
    () => validateArticlePayload(withClaim('A review flag proves fraud.')),
    /review signals as misconduct/
  );
  assert.throws(
    () => validateArticlePayload(withClaim('OCR guarantees approval.')),
    /OCR or Strava approval/
  );
  assert.throws(
    () => validateArticlePayload(withClaim('Every virtual event uses the same rejection rules.')),
    /universal event rules/
  );
  assert.throws(
    () => validateArticlePayload(withClaim('Rejected distance counts toward official progress.')),
    /rejected evidence officially/
  );
  assert.throws(
    () => validateArticlePayload(withClaim('Every rejected submission can always be resubmitted after the deadline.')),
    /post-deadline correction/
  );
});
