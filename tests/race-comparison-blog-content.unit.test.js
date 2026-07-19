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
} = require('../src/content/virtual-vs-traditional-race');
const { getArticleModule, listArticleSlugs } = require('../src/content/adsense-blog-article-registry');
const { parseArguments } = require('../src/scripts/update-adsense-blog');
const { getCanonicalBlogSlug } = require('../src/utils/blog-canonical');

const COVER_IMAGE_URL = 'https://cdn.hellorun.online/race-comparison-cover.png';

test('race comparison builds a substantive runner-first decision guide', () => {
  const payload = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  const wordCount = payload.contentText.split(/\s+/).filter(Boolean).length;

  assert.equal(ARTICLE.slug, CANONICAL_SLUG);
  assert.equal(payload.title, 'Virtual Run vs Traditional Race: Which One Should You Join?');
  assert.equal(payload.category, 'Race Tips');
  assert.equal(payload.tags.length, 8);
  assert.ok(payload.tags.every((tag) => tag.length <= 30));
  assert.ok(payload.excerpt.length <= 220);
  assert.ok(payload.seoTitle.length <= 160);
  assert.ok(payload.seoDescription.length <= 320);
  assert.ok(payload.coverImageAlt.length <= 180);
  assert.ok(payload.contentHtml.length <= 50000);
  assert.ok(wordCount >= 2500);
  assert.equal(payload.contentRaw, payload.contentText);
  assert.equal(payload.ogImageUrl, COVER_IMAGE_URL);
  assert.doesNotThrow(() => validateArticlePayload(payload));

  assert.match(payload.contentText, /documented event-format comparison, not hands-on testing/i);
  assert.match(payload.contentText, /onsite course is not automatically certified/i);
  assert.match(payload.contentText, /Entry price alone cannot establish which format costs less/i);
  assert.match(payload.contentText, /neither format guarantees safety/i);
  assert.match(payload.contentText, /OCR may assist.+incomplete or wrong/i);
  assert.match(payload.contentText, /does not continuously monitor a runner's GPS location/i);
  assert.doesNotMatch(payload.contentHtml, /<h[12]>Virtual Run vs Traditional Race:/i);
  assert.doesNotMatch(payload.contentText, /automatically (?:approves?|verifies?)/i);
  assert.doesNotMatch(payload.contentText, /HelloRun (?:provides|supports|includes) (?:an? )?(?:integrated|direct) payment gateway/i);
  assert.doesNotMatch(payload.contentText, /(?:virtual runs?|onsite races?|traditional races?) (?:are|is) always (?:cheaper|safer|easier|more accessible)/i);

  for (const heading of REQUIRED_HEADINGS) {
    assert.ok(payload.contentHtml.includes(`<h2>${heading}</h2>`), `missing required heading: ${heading}`);
  }
  for (const link of REQUIRED_LINKS) {
    assert.ok(payload.contentHtml.includes(link), `missing required link: ${link}`);
  }
});

test('race comparison is registered and replaces the obsolete seeded slug', () => {
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

test('race-comparison updater alias targets the shared slug-based updater', () => {
  assert.deepEqual(parseArguments(['--slug', CANONICAL_SLUG]), { slug: CANONICAL_SLUG, mode: 'dry-run' });
  assert.deepEqual(parseArguments(['--slug', CANONICAL_SLUG, '--apply']), { slug: CANONICAL_SLUG, mode: 'apply' });
  assert.match(packageJson.scripts['blog:update-adsense'], /update-adsense-blog\.js/);
  assert.match(packageJson.scripts['blog:update-best-apps'], /--slug best-apps-to-track-your-virtual-run/);
  assert.match(packageJson.scripts['blog:update-running-safety'], /--slug running-safety-tips-early-morning-night-runs/);
  assert.match(packageJson.scripts['blog:update-organizer-guide'], /--slug how-to-organize-a-virtual-run-a-practical-guide-for-event-organizers/);
  assert.match(packageJson.scripts['blog:update-race-comparison'], new RegExp(`--slug ${CANONICAL_SLUG}`));
});
