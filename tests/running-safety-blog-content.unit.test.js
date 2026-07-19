'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const packageJson = require('../package.json');

const { POSTS, buildContentHtml, htmlToText } = require('../src/scripts/seed-adsense-blog-posts');
const {
  ARTICLE,
  CANONICAL_SLUG,
  REQUIRED_HEADINGS,
  REQUIRED_LINKS,
  buildArticlePayload,
  validateArticlePayload
} = require('../src/content/running-safety-low-light');
const { getArticleModule, listArticleSlugs } = require('../src/content/adsense-blog-article-registry');
const { parseArguments } = require('../src/scripts/update-adsense-blog');

const COVER_IMAGE_URL = 'https://cdn.hellorun.online/running-safety-cover.webp';

test('running-safety article builds a complete, globally applicable payload', () => {
  const payload = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  const wordCount = payload.contentText.split(/\s+/).filter(Boolean).length;

  assert.equal(ARTICLE.slug, CANONICAL_SLUG);
  assert.equal(payload.title, 'Running Safety Tips for Early Morning and Night Runs');
  assert.equal(payload.category, 'Training');
  assert.equal(payload.tags.length, 8);
  assert.ok(payload.tags.every((tag) => tag.length <= 30));
  assert.ok(payload.excerpt.length <= 220);
  assert.ok(payload.seoTitle.length <= 160);
  assert.ok(payload.seoDescription.length <= 320);
  assert.ok(payload.coverImageAlt.length <= 180);
  assert.ok(payload.contentHtml.length <= 50000);
  assert.ok(wordCount >= 2000);
  assert.equal(payload.contentRaw, payload.contentText);
  assert.equal(payload.ogImageUrl, COVER_IMAGE_URL);
  assert.doesNotThrow(() => validateArticlePayload(payload));

  assert.match(payload.contentHtml, /not individualized medical, legal, security, or emergency advice/i);
  assert.match(payload.contentHtml, /follow local law/i);
  assert.match(payload.contentHtml, /cannot guarantee safety/i);
  assert.match(payload.contentHtml, /responsibility of the person causing harm, not the runner/i);
  assert.doesNotMatch(payload.contentHtml, /<h[12]>Running Safety Tips for Early Morning and Night Runs<\/h[12]>/i);
  assert.doesNotMatch(payload.contentText, /\b911\b/);

  for (const heading of REQUIRED_HEADINGS) {
    assert.ok(payload.contentHtml.includes(`<h2>${heading}</h2>`), `missing required heading: ${heading}`);
  }
  for (const link of REQUIRED_LINKS) {
    assert.ok(payload.contentHtml.includes(link), `missing required link: ${link}`);
  }
});

test('running-safety article is registered and stored as rich canonical seed content', () => {
  const articleModule = getArticleModule(CANONICAL_SLUG);
  const seededPost = POSTS.find((post) => post.slug === CANONICAL_SLUG);

  assert.equal(articleModule.ARTICLE, ARTICLE);
  assert.ok(listArticleSlugs().includes(CANONICAL_SLUG));
  assert.ok(seededPost);
  assert.equal(buildContentHtml(seededPost), seededPost.contentHtml);
  assert.equal(htmlToText(seededPost.contentHtml), buildArticlePayload({ coverImageUrl: seededPost.coverImageUrl }).contentText);
});

test('shared updater CLI and compatibility aliases target registered slugs', () => {
  assert.deepEqual(parseArguments(['--slug', CANONICAL_SLUG]), { slug: CANONICAL_SLUG, mode: 'dry-run' });
  assert.deepEqual(parseArguments(['--slug', CANONICAL_SLUG, '--apply']), { slug: CANONICAL_SLUG, mode: 'apply' });
  assert.match(packageJson.scripts['blog:update-adsense'], /update-adsense-blog\.js/);
  assert.match(packageJson.scripts['blog:update-best-apps'], /--slug best-apps-to-track-your-virtual-run/);
  assert.match(packageJson.scripts['blog:update-running-safety'], new RegExp(`--slug ${CANONICAL_SLUG}`));
});
