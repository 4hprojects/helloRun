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
} = require('../src/content/treadmill-virtual-event-guide');
const { getArticleModule, listArticleSlugs } = require('../src/content/adsense-blog-article-registry');
const { parseArguments: parseUpdateArguments } = require('../src/scripts/update-adsense-blog');
const {
  GUIDE_AUTHOR_EMAIL,
  buildCreatePayload,
  getCanonicalSeed,
  parseArguments: parseCreateArguments
} = require('../src/scripts/create-adsense-blog');

const COVER_IMAGE_URL = 'https://cdn.hellorun.online/blog/covers/698f1cb67748262281092639/1785285476875-831938576-how-to-record-a-treadmill-run-for-a-virtual-event.webp';

test('treadmill virtual-event guide builds a substantive source-aware recording payload', () => {
  const payload = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  const wordCount = payload.contentText.split(/\s+/).filter(Boolean).length;

  assert.equal(ARTICLE.slug, CANONICAL_SLUG);
  assert.equal(payload.title, 'How to Record a Treadmill Run for a Virtual Event');
  assert.equal(payload.category, 'Virtual Run Guide');
  assert.deepEqual(payload.tags, [
    'treadmill run', 'indoor running', 'virtual run', 'activity proof',
    'run tracking', 'treadmill distance', 'fitness watch', 'result submission'
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

  assert.match(payload.contentText, /Treadmill recording in one minute/i);
  assert.match(payload.contentText, /Choose the primary evidence source before starting/i);
  assert.match(payload.contentText, /Calibration can improve consistency, but it does not prove/i);
  assert.match(payload.contentText, /Do not average the distances, add the difference, edit the wearable/i);
  assert.match(payload.contentText, /One mile equals approximately 1\.609344 kilometres/i);
  assert.match(payload.contentText, /Pending treadmill distance is not approved progress or an official rank/i);
  assert.match(payload.contentText, /phone app does not currently record indoor-run distance/i);
  assert.match(payload.contentText, /Correct submission improves reviewability but does not guarantee approval/i);
  assert.doesNotMatch(payload.contentHtml, /<h[12]>How to Record a Treadmill Run for a Virtual Event<\/h[12]>/i);

  for (const heading of REQUIRED_HEADINGS) {
    assert.ok(payload.contentHtml.includes(`<h2>${heading}</h2>`), `missing required heading: ${heading}`);
  }
  for (const link of REQUIRED_LINKS) {
    assert.ok(payload.contentHtml.includes(link), `missing required link: ${link}`);
  }
});

test('treadmill guide is registered and seeded once with its architectural CDN cover', () => {
  const articleModule = getArticleModule(CANONICAL_SLUG);
  const seededPosts = POSTS.filter((post) => post.slug === CANONICAL_SLUG);
  const seededPost = seededPosts[0];

  assert.equal(articleModule.ARTICLE, ARTICLE);
  assert.ok(listArticleSlugs().includes(CANONICAL_SLUG));
  assert.equal(listArticleSlugs().length, 28);
  assert.equal(seededPosts.length, 1);
  assert.equal(getCanonicalSeed(CANONICAL_SLUG), seededPost);
  assert.equal(buildContentHtml(seededPost), seededPost.contentHtml);
  assert.equal(htmlToText(seededPost.contentHtml), buildArticlePayload({ coverImageUrl: seededPost.coverImageUrl }).contentText);
  assert.equal(seededPost.coverImageUrl, COVER_IMAGE_URL);
  assert.equal(seededPost.ogImageUrl, COVER_IMAGE_URL);
  assert.equal(seededPost.featured, false);
  assert.equal(seededPost.authorEmail, GUIDE_AUTHOR_EMAIL);
});

test('treadmill guide supports isolated creation and ongoing updates', () => {
  const authorId = new mongoose.Types.ObjectId();
  const now = new Date('2026-07-29T00:42:00.000Z');
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
  assert.match(packageJson.scripts['blog:update-treadmill-run'], new RegExp(`--slug ${CANONICAL_SLUG}`));
});

test('treadmill guide rejects missing cover and unsupported claims', () => {
  assert.throws(() => buildArticlePayload({}), /existing cover image is required/);

  const payload = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  const withClaim = (claim) => ({
    ...payload,
    contentText: `${payload.contentText} ${claim}`,
    contentRaw: `${payload.contentText} ${claim}`
  });

  assert.throws(
    () => validateArticlePayload(withClaim('Every virtual event accepts treadmills.')),
    /universal treadmill acceptance/
  );
  assert.throws(
    () => validateArticlePayload(withClaim('Treadmill distance is always accurate.')),
    /guarantee device accuracy/
  );
  assert.throws(
    () => validateArticlePayload(withClaim('Choose the largest distance.')),
    /favorable-value selection/
  );
  assert.throws(
    () => validateArticlePayload(withClaim('Every submission will be automatically approved.')),
    /guarantee approval or OCR accuracy/
  );
  assert.throws(
    () => validateArticlePayload(withClaim('Pending distance counts as official completion.')),
    /pending evidence officially/
  );
  assert.throws(
    () => validateArticlePayload(withClaim('HelloRun directly tracks your treadmill.')),
    /platform tracking or certification/
  );
  assert.throws(
    () => validateArticlePayload(withClaim('Runners should jump onto the side rails.')),
    /unsafe treadmill use/
  );
});
