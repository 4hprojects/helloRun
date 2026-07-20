'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const packageJson = require('../package.json');

const { POSTS, buildContentHtml, htmlToText } = require('../src/scripts/seed-adsense-blog-posts');
const {
  ARTICLE,
  CANONICAL_SLUG,
  REQUIRED_HEADINGS,
  REQUIRED_LINKS,
  buildArticlePayload,
  validateArticlePayload
} = require('../src/content/join-virtual-run-philippines');
const { getArticleModule, listArticleSlugs } = require('../src/content/adsense-blog-article-registry');
const { EDITORIAL_FIELDS, parseArguments } = require('../src/scripts/update-adsense-blog');

const COVER_IMAGE_URL = 'https://cdn.hellorun.online/join-philippines-cover.webp';
const LIVE_COVER_IMAGE_URL = 'https://cdn.hellorun.online/blog/covers/698f1cb67748262281092639/1784200739553-127393422-chatgpt_image_jul_16__2026__06_51_47_pm.webp';
const readSource = (relativePath) => fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
const FORM_SOURCE = readSource('src/views/pages/event-register.ejs');
const REGISTRATION_SOURCE = readSource('src/controllers/page/registration.controller.js');
const PRICE_SOURCE = readSource('src/services/registration-price.service.js');
const EVENT_SOURCE = readSource('src/models/Event.js');
const PAYMENT_SOURCE = readSource('src/views/partials/my-registration-card.ejs');
const PLATFORM_DATE_SOURCE = readSource('src/utils/platform-date.js');
const SUBMISSION_WINDOW_SOURCE = readSource('src/utils/submission-window.js');

test('Philippine joining guide builds a substantive canonical payload', () => {
  const payload = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  const wordCount = payload.contentText.split(/\s+/).filter(Boolean).length;

  assert.equal(ARTICLE.slug, CANONICAL_SLUG);
  assert.equal(payload.title, 'How to Join a Virtual Run in the Philippines');
  assert.equal(payload.category, 'Virtual Run Guide');
  assert.deepEqual(payload.tags, [
    'virtual run philippines', 'join virtual run', 'runner registration', 'payment receipt',
    'run proof', 'online running event', 'philippine runners', 'first virtual run'
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

  assert.match(payload.contentText, /documents HelloRun's joining workflow available in July 2026/i);
  assert.match(payload.contentText, /Asia\/Manila timezone/i);
  assert.match(payload.contentText, /accepts JPEG, PNG, or PDF receipts up to 5 MB/i);
  assert.match(payload.contentText, /does not directly charge the runner or move money between accounts/i);
  assert.match(payload.contentText, /Payment receipt review and activity-proof review are separate decisions/i);
  assert.match(payload.contentText, /transparency, legitimate purpose, and proportionality/i);
  assert.doesNotMatch(payload.contentHtml, /<h[12]>How to Join a Virtual Run in the Philippines<\/h[12]>/i);
  assert.doesNotMatch(payload.contentText, /every event accepts GCash|government-approved event|payments are instantly approved|guaranteed delivery/i);

  for (const heading of REQUIRED_HEADINGS) {
    assert.ok(payload.contentHtml.includes(`<h2>${heading}</h2>`), `missing required heading: ${heading}`);
  }
  for (const link of REQUIRED_LINKS) {
    assert.ok(payload.contentHtml.includes(link), `missing required link: ${link}`);
  }
});

test('joining guidance remains grounded in current registration, pricing, payment, and date behavior', () => {
  assert.match(FORM_SOURCE, /name="participationMode"/);
  assert.match(FORM_SOURCE, /name="raceDistance"/);
  assert.match(FORM_SOURCE, /name="registrationPackageId"/);
  assert.doesNotMatch(FORM_SOURCE, /registrationProfile|Update profile/);
  assert.match(REGISTRATION_SOURCE, /getRegistrationProfileSnapshot\(user\)/);
  assert.match(FORM_SOURCE, /Digital Signature \(full account name\)/);
  assert.match(REGISTRATION_SOURCE, /Signature must exactly match your account full name/);
  assert.match(PRICE_SOURCE, /customized_options/);
  assert.match(PRICE_SOURCE, /distance_based_period/);
  assert.match(PRICE_SOURCE, /package_period/);
  assert.match(EVENT_SOURCE, /default: 'PHP'/);
  assert.match(EVENT_SOURCE, /deliveryFeeEnabled/);
  assert.match(EVENT_SOURCE, /deliveryFeeAmount/);
  assert.match(PAYMENT_SOURCE, /JPG, PNG, or PDF up to 5MB/);
  assert.match(PAYMENT_SOURCE, /Payment receipts and activity proof are reviewed separately/);
  assert.match(PLATFORM_DATE_SOURCE, /PLATFORM_TIME_ZONE = 'Asia\/Manila'/);
  assert.match(SUBMISSION_WINDOW_SOURCE, /Day-level \(Asia\/Manila\) check/);
});

test('Philippine joining guide is registered and stored once as rich canonical seed content', () => {
  const articleModule = getArticleModule(CANONICAL_SLUG);
  const seededPosts = POSTS.filter((post) => post.slug === CANONICAL_SLUG);
  const seededPost = seededPosts[0];

  assert.equal(articleModule.ARTICLE, ARTICLE);
  assert.ok(listArticleSlugs().includes(CANONICAL_SLUG));
  assert.equal(listArticleSlugs().length, 13);
  assert.equal(seededPosts.length, 1);
  assert.equal(buildContentHtml(seededPost), seededPost.contentHtml);
  assert.equal(htmlToText(seededPost.contentHtml), buildArticlePayload({ coverImageUrl: seededPost.coverImageUrl }).contentText);
  assert.equal(seededPost.publishedAt, '2026-06-01T01:00:00.000Z');
  assert.equal(seededPost.coverImageUrl, LIVE_COVER_IMAGE_URL);
});

test('Philippine joining alias uses the shared editorial-only updater', () => {
  assert.deepEqual(parseArguments(['--slug', CANONICAL_SLUG]), { slug: CANONICAL_SLUG, mode: 'dry-run' });
  assert.deepEqual(parseArguments(['--slug', CANONICAL_SLUG, '--dry-run']), { slug: CANONICAL_SLUG, mode: 'dry-run' });
  assert.deepEqual(parseArguments(['--slug', CANONICAL_SLUG, '--apply']), { slug: CANONICAL_SLUG, mode: 'apply' });
  assert.match(packageJson.scripts['blog:update-join-philippines'], new RegExp(`--slug ${CANONICAL_SLUG}`));
  assert.deepEqual(EDITORIAL_FIELDS, [
    'title', 'excerpt', 'contentHtml', 'contentText', 'contentRaw', 'category', 'customCategory',
    'tags', 'readingTime', 'seoTitle', 'seoDescription', 'coverImageAlt', 'ogImageUrl'
  ]);
  for (const alias of [
    'blog:update-best-apps', 'blog:update-running-safety', 'blog:update-organizer-guide',
    'blog:update-race-comparison', 'blog:update-virtual-run-guide', 'blog:update-leaderboards',
    'blog:update-valid-proof', 'blog:update-accumulated-challenges', 'blog:update-beginner-5k',
    'blog:update-proof-submission'
  ]) assert.ok(packageJson.scripts[alias], `missing compatibility alias: ${alias}`);
});

test('Philippine joining payload rejects a missing existing cover image', () => {
  assert.throws(() => buildArticlePayload({}), /existing cover image is required/);
});
