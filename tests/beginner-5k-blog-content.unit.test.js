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
} = require('../src/content/beginner-5k-training-plan');
const { getArticleModule, listArticleSlugs } = require('../src/content/adsense-blog-article-registry');
const { EDITORIAL_FIELDS, parseArguments } = require('../src/scripts/update-adsense-blog');

const COVER_IMAGE_URL = 'https://cdn.hellorun.online/beginner-5k-cover.webp';

test('beginner 5K guide builds a substantive flexible training payload', () => {
  const payload = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  const wordCount = payload.contentText.split(/\s+/).filter(Boolean).length;

  assert.equal(ARTICLE.slug, CANONICAL_SLUG);
  assert.equal(payload.title, 'Beginner 5K Training Plan for New Runners');
  assert.equal(payload.category, 'Training');
  assert.deepEqual(payload.tags, [
    'beginner 5k',
    '5k training plan',
    'new runners',
    'walk run plan',
    'running basics',
    'race preparation',
    'easy running',
    'first 5k'
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

  assert.match(payload.contentText, /reviewed in July 2026 using public guidance/i);
  assert.match(payload.contentText, /three non-consecutive running days/i);
  assert.match(payload.contentText, /five-minute walk before it and another five-minute walk afterward/i);
  assert.match(payload.contentText, /A missed session is not training debt/i);
  assert.match(payload.contentText, /Walking is a legitimate way to build activity/i);
  assert.match(payload.contentText, /pending is not an approved result/i);
  assert.doesNotMatch(payload.contentHtml, /<h[12]>Beginner 5K Training Plan for New Runners<\/h[12]>/i);
  assert.doesNotMatch(payload.contentText, /you will complete (?:the )?5K|every event accepts walking|drink \d+\s*(?:ml|litres?) per hour/i);

  for (let week = 1; week <= 9; week += 1) {
    assert.ok(payload.contentHtml.includes(`<h3>Week ${week}:`), `missing plan week: ${week}`);
  }
  for (const heading of REQUIRED_HEADINGS) {
    assert.ok(payload.contentHtml.includes(`<h2>${heading}</h2>`), `missing required heading: ${heading}`);
  }
  for (const link of REQUIRED_LINKS) {
    assert.ok(payload.contentHtml.includes(link), `missing required link: ${link}`);
  }
});

test('nine-week schedule preserves the specified duration and interval progression', () => {
  const { contentText } = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });

  assert.match(contentText, /Week 1: learn the rhythm.*20–25 minutes using 1 minute of easy running followed by 2 minutes of walking/is);
  assert.match(contentText, /Week 2: small running increase.*22–28 minutes using 90 seconds of easy running followed by 2 minutes of walking/is);
  assert.match(contentText, /Week 3: equal run and walk intervals.*24–30 minutes using 2 minutes of easy running followed by 2 minutes of walking/is);
  assert.match(contentText, /Week 4: extend control.*25–32 minutes using 3 minutes of easy running followed by 2 minutes of walking/is);
  assert.match(contentText, /Week 5: five-minute blocks.*28–34 minutes using 5 minutes of easy running followed by 2 minutes of walking/is);
  assert.match(contentText, /Week 6: patient endurance.*30–35 minutes using 8 minutes of easy running followed by 2 minutes of walking/is);
  assert.match(contentText, /Week 7: longer easy sections.*30–38 minutes using 10–12 minutes of easy running followed by 2–3 minutes of walking/is);
  assert.match(contentText, /Week 8: rehearse your preferred strategy.*30–40 minutes.*continuous easy segment of 15–20 minutes/is);
  assert.match(contentText, /Week 9: reduce training and attempt 5K.*two shorter easy sessions.*planned walk breaks/is);
});

test('beginner 5K guide is registered and stored as canonical rich seed content', () => {
  const articleModule = getArticleModule(CANONICAL_SLUG);
  const seededPosts = POSTS.filter((post) => post.slug === CANONICAL_SLUG);
  const seededPost = seededPosts[0];

  assert.equal(articleModule.ARTICLE, ARTICLE);
  assert.ok(listArticleSlugs().includes(CANONICAL_SLUG));
  assert.equal(seededPosts.length, 1);
  assert.ok(seededPost);
  assert.equal(buildContentHtml(seededPost), seededPost.contentHtml);
  assert.equal(htmlToText(seededPost.contentHtml), buildArticlePayload({ coverImageUrl: seededPost.coverImageUrl }).contentText);
  assert.equal(seededPost.publishedAt, '2026-06-04T01:00:00.000Z');
  assert.equal(seededPost.coverImageUrl, 'https://cdn.hellorun.online/blog/covers/698f1cb67748262281092639/1784201268972-365051176-chatgpt_image_jul_16__2026__07_27_23_pm.webp');
});

test('beginner 5K updater alias targets the shared editorial-only updater', () => {
  assert.deepEqual(parseArguments(['--slug', CANONICAL_SLUG]), { slug: CANONICAL_SLUG, mode: 'dry-run' });
  assert.deepEqual(parseArguments(['--slug', CANONICAL_SLUG, '--dry-run']), { slug: CANONICAL_SLUG, mode: 'dry-run' });
  assert.deepEqual(parseArguments(['--slug', CANONICAL_SLUG, '--apply']), { slug: CANONICAL_SLUG, mode: 'apply' });
  assert.match(packageJson.scripts['blog:update-beginner-5k'], new RegExp(`--slug ${CANONICAL_SLUG}`));
  assert.deepEqual(EDITORIAL_FIELDS, [
    'title',
    'excerpt',
    'contentHtml',
    'contentText',
    'contentRaw',
    'category',
    'customCategory',
    'tags',
    'readingTime',
    'seoTitle',
    'seoDescription',
    'coverImageAlt',
    'ogImageUrl'
  ]);
  for (const alias of [
    'blog:update-best-apps',
    'blog:update-running-safety',
    'blog:update-organizer-guide',
    'blog:update-race-comparison',
    'blog:update-virtual-run-guide',
    'blog:update-leaderboards',
    'blog:update-valid-proof',
    'blog:update-accumulated-challenges'
  ]) assert.ok(packageJson.scripts[alias], `missing compatibility alias: ${alias}`);
});

test('beginner 5K payload rejects a missing existing cover image', () => {
  assert.throws(() => buildArticlePayload({}), /existing cover image is required/);
});
