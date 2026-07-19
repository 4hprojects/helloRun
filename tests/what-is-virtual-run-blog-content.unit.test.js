'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const packageJson = require('../package.json');

const { POSTS, buildContentHtml, htmlToText } = require('../src/scripts/seed-adsense-blog-posts');
const {
  ARTICLE,
  CANONICAL_SLUG,
  LEGACY_SLUG,
  REQUIRED_HEADINGS,
  REQUIRED_LINKS,
  buildArticlePayload,
  validateArticlePayload
} = require('../src/content/what-is-virtual-run-guide');
const { getArticleModule, listArticleSlugs } = require('../src/content/adsense-blog-article-registry');
const { parseArguments } = require('../src/scripts/update-adsense-blog');
const { getCanonicalBlogSlug } = require('../src/utils/blog-canonical');

const COVER_IMAGE_URL = 'https://cdn.hellorun.online/what-is-virtual-run-cover.png';

test('foundational virtual-run guide builds a substantive runner-led payload', () => {
  const payload = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  const wordCount = payload.contentText.split(/\s+/).filter(Boolean).length;

  assert.equal(ARTICLE.slug, CANONICAL_SLUG);
  assert.equal(payload.title, 'What is Virtual Run? A Simple Guide for Runners and Event Organizers');
  assert.equal(payload.category, 'Virtual Run Guide');
  assert.equal(payload.tags.length, 8);
  assert.ok(payload.tags.every((tag) => tag.length <= 30));
  assert.ok(payload.excerpt.length <= 220);
  assert.ok(payload.seoTitle.length <= 160);
  assert.ok(payload.seoDescription.length <= 320);
  assert.ok(payload.coverImageAlt.length <= 180);
  assert.ok(payload.contentHtml.length <= 50000);
  assert.ok(wordCount >= 2800);
  assert.equal(payload.contentRaw, payload.contentText);
  assert.equal(payload.ogImageUrl, COVER_IMAGE_URL);
  assert.doesNotThrow(() => validateArticlePayload(payload));

  assert.match(payload.contentText, /researched explanation based on documented event practices/i);
  assert.match(payload.contentText, /does not necessarily mean any location, any time/i);
  assert.match(payload.contentText, /manual organiser review/i);
  assert.match(payload.contentText, /OCR may assist.+not perfect/i);
  assert.match(payload.contentText, /does not continuously track the runner's GPS location/i);
  assert.match(payload.contentText, /Virtual participation should not be assumed to replace a certified qualifying performance/i);
  assert.doesNotMatch(payload.contentHtml, /<h[12]>What is Virtual Run\?/i);
  assert.doesNotMatch(payload.contentHtml, /<em>[^<]+<\/em>\s*\*/i);
  assert.doesNotMatch(payload.contentText, /automatically (?:approves?|verifies?|issues? certificates?)/i);
  assert.doesNotMatch(payload.contentText, /HelloRun (?:provides|supports|includes) (?:an? )?(?:integrated|direct) payment gateway/i);
  assert.doesNotMatch(payload.contentText, /HelloRun (?:provides|supports|includes) live GPS (?:monitoring|tracking)/i);
  assert.doesNotMatch(payload.contentText, /virtual runs? (?:are|is) always (?:legitimate|cheaper|safer|accessible)/i);

  for (const heading of REQUIRED_HEADINGS) {
    assert.ok(payload.contentHtml.includes(`<h2>${heading}</h2>`), `missing required heading: ${heading}`);
  }
  for (const link of REQUIRED_LINKS) {
    assert.ok(payload.contentHtml.includes(link), `missing required link: ${link}`);
  }
});

test('foundational guide is registered, seeded canonically, and maps its historical slug', () => {
  const articleModule = getArticleModule(CANONICAL_SLUG);
  const seededPost = POSTS.find((post) => post.slug === CANONICAL_SLUG);

  assert.equal(articleModule.ARTICLE, ARTICLE);
  assert.ok(listArticleSlugs().includes(CANONICAL_SLUG));
  assert.ok(seededPost);
  assert.equal(POSTS.some((post) => post.slug === LEGACY_SLUG), false);
  assert.equal(getCanonicalBlogSlug(LEGACY_SLUG), CANONICAL_SLUG);
  assert.equal(buildContentHtml(seededPost), seededPost.contentHtml);
  assert.equal(htmlToText(seededPost.contentHtml), buildArticlePayload({ coverImageUrl: seededPost.coverImageUrl }).contentText);
});

test('virtual-run-guide updater alias targets the shared slug-based updater', () => {
  assert.deepEqual(parseArguments(['--slug', CANONICAL_SLUG]), { slug: CANONICAL_SLUG, mode: 'dry-run' });
  assert.deepEqual(parseArguments(['--slug', CANONICAL_SLUG, '--apply']), { slug: CANONICAL_SLUG, mode: 'apply' });
  assert.match(packageJson.scripts['blog:update-adsense'], /update-adsense-blog\.js/);
  assert.match(packageJson.scripts['blog:update-best-apps'], /--slug best-apps-to-track-your-virtual-run/);
  assert.match(packageJson.scripts['blog:update-running-safety'], /--slug running-safety-tips-early-morning-night-runs/);
  assert.match(packageJson.scripts['blog:update-organizer-guide'], /--slug how-to-organize-a-virtual-run-a-practical-guide-for-event-organizers/);
  assert.match(packageJson.scripts['blog:update-race-comparison'], /--slug virtual-run-vs-traditional-race-which-one-should-you-join/);
  assert.match(packageJson.scripts['blog:update-virtual-run-guide'], new RegExp(`--slug ${CANONICAL_SLUG}`));
});
