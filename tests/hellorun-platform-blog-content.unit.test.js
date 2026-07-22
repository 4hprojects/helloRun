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
} = require('../src/content/hellorun-platform-guide');
const { getArticleModule, listArticleSlugs } = require('../src/content/adsense-blog-article-registry');
const { EDITORIAL_FIELDS, parseArguments } = require('../src/scripts/update-adsense-blog');

const COVER_IMAGE_URL = 'https://cdn.hellorun.online/hellorun-platform-cover.webp';
const LIVE_COVER_IMAGE_URL = 'https://cdn.hellorun.online/blog/covers/698f1cb67748262281092639/1784201019285-302671518-chatgpt_image_jul_16__2026__07_23_15_pm.webp';
const readSource = (relativePath) => fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
const APPLICATION_SOURCE = readSource('src/routes/organiser/profile.js');
const CREATION_SOURCE = readSource('src/routes/organiser/event-creation.js');
const EVENT_DETAILS_SOURCE = readSource('src/views/organizer/event-details.ejs');
const PRICE_SOURCE = readSource('src/services/registration-price.service.js');
const PAYMENT_SOURCE = readSource('src/views/partials/my-registration-card.ejs');
const PROOF_SOURCE = readSource('src/views/partials/run-proof-modal.ejs');
const DASHBOARD_SOURCE = readSource('src/routes/organiser/dashboard.js');
const EXPORT_SOURCE = readSource('src/routes/organiser/registrants.js');
const AUDIT_SOURCE = readSource('src/routes/organiser/event-management.js');
const ONSITE_SOURCE = readSource('src/routes/organiser/onsite-operations.js');

test('HelloRun platform guide builds a substantive organiser-first payload', () => {
  const payload = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  const wordCount = payload.contentText.split(/\s+/).filter(Boolean).length;

  assert.equal(ARTICLE.slug, CANONICAL_SLUG);
  assert.equal(payload.title, 'HelloRun: A Smarter Way to Manage Running Events');
  assert.equal(payload.category, 'Organizer Guide');
  assert.deepEqual(payload.tags, [
    'running event management', 'event organizer', 'event registration', 'payment review',
    'result review', 'virtual events', 'onsite events', 'hybrid events'
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

  assert.match(payload.contentText, /documents the HelloRun implementation available in July 2026/i);
  assert.match(payload.contentText, /does not directly process event registration funds/i);
  assert.match(payload.contentText, /Dashboard summaries and registrant exports are not complete accounting statements/i);
  assert.match(payload.contentText, /does not guarantee event legitimacy, registrations, participant numbers, revenue/i);
  assert.match(payload.contentText, /not based on personal testing/i);
  assert.doesNotMatch(payload.contentHtml, /<h[12]>HelloRun: A Smarter Way to Manage Running Events<\/h[12]>/i);
  assert.doesNotMatch(payload.contentText, /participate anywhere, anytime|perfect OCR|instant approval|HelloRun processes payments|guaranteed revenue/i);

  for (const heading of REQUIRED_HEADINGS) {
    assert.ok(payload.contentHtml.includes(`<h2>${heading}</h2>`), `missing required heading: ${heading}`);
  }
  for (const link of REQUIRED_LINKS) {
    assert.ok(payload.contentHtml.includes(link), `missing required link: ${link}`);
  }
});

test('platform capability claims remain grounded in current organiser workflows', () => {
  assert.match(APPLICATION_SOURCE, /\['pending', 'under_review', 'rejected'\]\.includes\(application\.status\)/);
  assert.match(APPLICATION_SOURCE, /organizerStatus = 'pending'/);
  assert.match(CREATION_SOURCE, /router\.post\('\/preview-event'/);
  assert.match(CREATION_SOURCE, /router\.post\('\/event-readiness'/);
  assert.match(CREATION_SOURCE, /getConsistencyWarnings/);
  assert.match(EVENT_DETAILS_SOURCE, /Draft -> Pending Review -> Published -> Closed/);

  assert.match(PRICE_SOURCE, /customized_options/);
  assert.match(PRICE_SOURCE, /distance_based_period/);
  assert.match(PRICE_SOURCE, /package_period/);
  assert.match(PAYMENT_SOURCE, /Payment receipts and activity proof are reviewed separately/);
  assert.match(PROOF_SOURCE, /Strava submissions target one event or Personal Record/);
  assert.match(PROOF_SOURCE, /OCR-assisted reading/);

  assert.match(DASHBOARD_SOURCE, /registrationsInRange/);
  assert.match(DASHBOARD_SOURCE, /submissionsInRange/);
  assert.match(DASHBOARD_SOURCE, /approvalsInRange/);
  assert.match(DASHBOARD_SOURCE, /pendingPaymentReviews/);
  assert.match(EXPORT_SOURCE, /Content-Type', 'text\/csv/);
  assert.match(EXPORT_SOURCE, /export-xlsx/);
  assert.match(EXPORT_SOURCE, /organiser\.registrants_exported/);
  assert.match(AUDIT_SOURCE, /events\/:id\/audit/);

  assert.match(ONSITE_SOURCE, /events\/:eventId\/bibs\/assign/);
  assert.match(ONSITE_SOURCE, /events\/:eventId\/check-ins/);
  assert.match(ONSITE_SOURCE, /Log a result import file/);
  assert.match(ONSITE_SOURCE, /Record an onsite result/);
});

test('HelloRun platform guide is registered and stored once as canonical rich seed content', () => {
  const articleModule = getArticleModule(CANONICAL_SLUG);
  const seededPosts = POSTS.filter((post) => post.slug === CANONICAL_SLUG);
  const seededPost = seededPosts[0];

  assert.equal(articleModule.ARTICLE, ARTICLE);
  assert.ok(listArticleSlugs().includes(CANONICAL_SLUG));
  assert.equal(listArticleSlugs().length, 14);
  assert.equal(seededPosts.length, 1);
  assert.equal(buildContentHtml(seededPost), seededPost.contentHtml);
  assert.equal(htmlToText(seededPost.contentHtml), buildArticlePayload({ coverImageUrl: seededPost.coverImageUrl }).contentText);
  assert.equal(seededPost.publishedAt, '2026-05-28T12:33:45.937Z');
  assert.equal(seededPost.coverImageUrl, LIVE_COVER_IMAGE_URL);
});

test('HelloRun platform alias uses the shared editorial-only updater', () => {
  assert.deepEqual(parseArguments(['--slug', CANONICAL_SLUG]), { slug: CANONICAL_SLUG, mode: 'dry-run' });
  assert.deepEqual(parseArguments(['--slug', CANONICAL_SLUG, '--dry-run']), { slug: CANONICAL_SLUG, mode: 'dry-run' });
  assert.deepEqual(parseArguments(['--slug', CANONICAL_SLUG, '--apply']), { slug: CANONICAL_SLUG, mode: 'apply' });
  assert.match(packageJson.scripts['blog:update-hellorun-platform'], new RegExp(`--slug ${CANONICAL_SLUG}`));
  assert.deepEqual(EDITORIAL_FIELDS, [
    'title', 'excerpt', 'contentHtml', 'contentText', 'contentRaw', 'category', 'customCategory',
    'tags', 'readingTime', 'seoTitle', 'seoDescription', 'coverImageAlt', 'ogImageUrl'
  ]);
  for (const alias of [
    'blog:update-best-apps', 'blog:update-running-safety', 'blog:update-organizer-guide',
    'blog:update-race-comparison', 'blog:update-virtual-run-guide', 'blog:update-leaderboards',
    'blog:update-valid-proof', 'blog:update-accumulated-challenges', 'blog:update-beginner-5k',
    'blog:update-proof-submission', 'blog:update-join-philippines'
  ]) assert.ok(packageJson.scripts[alias], `missing compatibility alias: ${alias}`);
});

test('HelloRun platform payload rejects a missing existing cover image', () => {
  assert.throws(() => buildArticlePayload({}), /existing cover image is required/);
});
