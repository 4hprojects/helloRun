'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  POSTS,
  buildContentHtml,
  htmlToText
} = require('../src/scripts/seed-adsense-blog-posts');
const {
  ARTICLE,
  CANONICAL_SLUG,
  LEGACY_SLUG,
  REQUIRED_APP_HEADINGS,
  REQUIRED_LINKS,
  buildArticlePayload,
  validateArticlePayload
} = require('../src/content/best-apps-virtual-run');
const {
  changedEditorialFields,
  parseArguments
} = require('../src/scripts/update-adsense-blog');

const COVER_IMAGE_URL = 'https://cdn.hellorun.online/example-cover.png';

test('best-apps article builds a complete canonical editorial payload', () => {
  const payload = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  const wordCount = payload.contentText.split(/\s+/).filter(Boolean).length;

  assert.equal(ARTICLE.slug, CANONICAL_SLUG);
  assert.equal(payload.title, 'Best Apps to Track Your Virtual Run: 6 Options Compared');
  assert.equal(payload.category, 'Virtual Run Guide');
  assert.equal(payload.tags.length, 8);
  assert.ok(payload.tags.every((tag) => tag.length <= 30));
  assert.ok(payload.excerpt.length <= 220);
  assert.ok(payload.seoTitle.length <= 160);
  assert.ok(payload.seoDescription.length <= 320);
  assert.ok(payload.coverImageAlt.length <= 180);
  assert.ok(payload.contentHtml.length <= 50000);
  assert.ok(wordCount >= 1500);
  assert.equal(payload.contentRaw, payload.contentText);
  assert.equal(payload.ogImageUrl, COVER_IMAGE_URL);
  assert.doesNotThrow(() => validateArticlePayload(payload));
  assert.match(payload.contentHtml, /researched guide, not a laboratory accuracy test/i);
  assert.doesNotMatch(payload.contentHtml, /<h[12]>Best Apps to Track Your Virtual Run(?:<|:)/i);
  assert.doesNotMatch(payload.contentHtml, /<em>Best for:<\/em>\s*\*/i);

  for (const heading of REQUIRED_APP_HEADINGS) {
    assert.match(payload.contentHtml, new RegExp(`<h2>${heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</h2>`));
  }
  for (const link of REQUIRED_LINKS) {
    assert.ok(payload.contentHtml.includes(link), `missing required link: ${link}`);
  }
});

test('AdSense seed uses the canonical rich article and no longer recreates the legacy slug', () => {
  const canonicalPost = POSTS.find((post) => post.slug === CANONICAL_SLUG);

  assert.ok(canonicalPost);
  assert.equal(POSTS.some((post) => post.slug === LEGACY_SLUG), false);
  assert.equal(buildContentHtml(canonicalPost), canonicalPost.contentHtml);
  assert.equal(htmlToText(canonicalPost.contentHtml), buildArticlePayload({ coverImageUrl: canonicalPost.coverImageUrl }).contentText);
});

test('single-article updater defaults to dry-run and detects editorial-only changes', () => {
  assert.deepEqual(parseArguments(['--slug', CANONICAL_SLUG]), { slug: CANONICAL_SLUG, mode: 'dry-run' });
  assert.deepEqual(parseArguments(['--slug', CANONICAL_SLUG, '--dry-run']), { slug: CANONICAL_SLUG, mode: 'dry-run' });
  assert.deepEqual(parseArguments(['--slug', CANONICAL_SLUG, '--apply']), { slug: CANONICAL_SLUG, mode: 'apply' });
  assert.throws(() => parseArguments(['--slug', CANONICAL_SLUG, '--apply', '--dry-run']), /either --apply or --dry-run/);
  assert.throws(() => parseArguments(['--unknown']), /Unsupported argument/);
  assert.throws(() => parseArguments([]), /--slug is required/);
  assert.throws(() => parseArguments(['--slug', 'unknown-post']), /Unknown AdSense article slug/);

  const payload = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  const post = { ...payload, title: 'Old title', views: 25, publishedAt: new Date() };
  assert.deepEqual(changedEditorialFields(post, payload), ['title']);
});
