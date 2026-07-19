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
} = require('../src/content/how-to-submit-run-proof');
const { getArticleModule, listArticleSlugs } = require('../src/content/adsense-blog-article-registry');
const { EDITORIAL_FIELDS, parseArguments } = require('../src/scripts/update-adsense-blog');

const COVER_IMAGE_URL = 'https://cdn.hellorun.online/proof-submission-cover.webp';
const MODAL_SOURCE = fs.readFileSync(path.join(__dirname, '../src/views/partials/run-proof-modal.ejs'), 'utf8');
const UPLOAD_SOURCE = fs.readFileSync(path.join(__dirname, '../src/services/upload.service.js'), 'utf8');
const CONTROLLER_SOURCE = fs.readFileSync(path.join(__dirname, '../src/controllers/page/submission.controller.js'), 'utf8');
const SUBMISSION_SOURCE = fs.readFileSync(path.join(__dirname, '../src/services/submission.service.js'), 'utf8');
const STRAVA_SOURCE = fs.readFileSync(path.join(__dirname, '../src/services/strava-submission.service.js'), 'utf8');
const PRESENTATION_SOURCE = fs.readFileSync(path.join(__dirname, '../src/services/runner-submissions.service.js'), 'utf8');

test('proof-submission guide builds a substantive procedural payload', () => {
  const payload = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  const wordCount = payload.contentText.split(/\s+/).filter(Boolean).length;

  assert.equal(ARTICLE.slug, CANONICAL_SLUG);
  assert.equal(payload.title, 'How to Submit Run Proof Correctly on HelloRun');
  assert.equal(payload.category, 'Virtual Run Guide');
  assert.deepEqual(payload.tags, [
    'run proof',
    'proof submission',
    'activity screenshot',
    'strava import',
    'ocr review',
    'result review',
    'virtual run',
    'runner guide'
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

  assert.match(payload.contentText, /documents the HelloRun proof-submission implementation available in July 2026/i);
  assert.match(payload.contentText, /current run-result form accepts JPEG, PNG, and WebP images/i);
  assert.match(payload.contentText, /maximum of 5 MB/i);
  assert.match(payload.contentText, /Strava submission currently targets one HelloRun event or Personal Record at a time/i);
  assert.match(payload.contentText, /uploaded proof image is deliberately not restored from that draft/i);
  assert.match(payload.contentText, /ordinary correction path applies to rejected results/i);
  assert.match(payload.contentText, /Pending distance is not approved completion/i);
  assert.match(payload.contentText, /payment receipt and submitting activity proof are separate actions/i);
  assert.doesNotMatch(payload.contentHtml, /<h[12]>How to Submit Run Proof Correctly on HelloRun<\/h[12]>/i);
  assert.doesNotMatch(payload.contentText, /guaranteed approval|perfect OCR|every event accepts treadmills|public leaderboard shows proof files/i);

  for (const heading of REQUIRED_HEADINGS) {
    assert.ok(payload.contentHtml.includes(`<h2>${heading}</h2>`), `missing required heading: ${heading}`);
  }
  for (const link of REQUIRED_LINKS) {
    assert.ok(payload.contentHtml.includes(link), `missing required link: ${link}`);
  }
});

test('documented three-stage workflow remains grounded in the current form and services', () => {
  assert.match(MODAL_SOURCE, /Step 1 of 3.*Choose run date/);
  assert.match(MODAL_SOURCE, /accept="image\/jpeg,image\/png,image\/webp"/);
  assert.match(MODAL_SOURCE, /JPG, PNG, or WebP up to 5MB/);
  assert.match(MODAL_SOURCE, /For screenshots, select each eligible event this activity should count toward/);
  assert.match(MODAL_SOURCE, /Strava submissions target one event or Personal Record/);
  assert.match(MODAL_SOURCE, /data-run-type="run"/);
  assert.match(MODAL_SOURCE, /data-run-type="walk"/);
  assert.match(MODAL_SOURCE, /data-run-type="hike"/);
  assert.match(MODAL_SOURCE, /data-run-type="trail_run"/);
  assert.match(MODAL_SOURCE, /name="distanceKm"[^>]+required/);
  assert.match(MODAL_SOURCE, /name="runLocation"[^>]+required/);
  assert.match(MODAL_SOURCE, /Elevation Gain \(m\)/);
  assert.match(MODAL_SOURCE, /<label for="runProofSteps">Steps<\/label>/);
  assert.match(MODAL_SOURCE, /For privacy, choose the proof again after resuming/);
  assert.match(MODAL_SOURCE, /Review before submitting/);

  assert.match(UPLOAD_SOURCE, /const MAX_UPLOAD_BYTES = .+\|\| 5242880/);
  assert.match(UPLOAD_SOURCE, /Only JPEG, PNG, and WebP files are allowed/);
  assert.match(CONTROLLER_SOURCE, /run date is outside the event window/);
  assert.match(CONTROLLER_SOURCE, /This screenshot has already been submitted/);
  assert.match(CONTROLLER_SOURCE, /Submission already exists\. Use resubmit flow if rejected/);
  assert.match(CONTROLLER_SOURCE, /Only rejected submissions can be resubmitted/);
  assert.match(SUBMISSION_SOURCE, /Only rejected submissions can be resubmitted/);
  assert.match(STRAVA_SOURCE, /does not belong to your connected account/);
  assert.match(STRAVA_SOURCE, /already been submitted for this event/);
  assert.match(PRESENTATION_SOURCE, /label: 'Fix entry'/);
  assert.match(PRESENTATION_SOURCE, /strategy: 'strava'/);
});

test('proof-submission guide is registered and stored as canonical rich seed content', () => {
  const articleModule = getArticleModule(CANONICAL_SLUG);
  const seededPosts = POSTS.filter((post) => post.slug === CANONICAL_SLUG);
  const seededPost = seededPosts[0];

  assert.equal(articleModule.ARTICLE, ARTICLE);
  assert.ok(listArticleSlugs().includes(CANONICAL_SLUG));
  assert.equal(seededPosts.length, 1);
  assert.ok(seededPost);
  assert.equal(buildContentHtml(seededPost), seededPost.contentHtml);
  assert.equal(htmlToText(seededPost.contentHtml), buildArticlePayload({ coverImageUrl: seededPost.coverImageUrl }).contentText);
  assert.equal(seededPost.publishedAt, '2026-06-02T01:00:00.000Z');
  assert.equal(seededPost.coverImageUrl, 'https://cdn.hellorun.online/blog/covers/698f1cb67748262281092639/1784201986565-267859622-chatgpt_image_jul_16__2026__07_39_09_pm.webp');
});

test('proof-submission updater alias targets the shared editorial-only updater', () => {
  assert.deepEqual(parseArguments(['--slug', CANONICAL_SLUG]), { slug: CANONICAL_SLUG, mode: 'dry-run' });
  assert.deepEqual(parseArguments(['--slug', CANONICAL_SLUG, '--dry-run']), { slug: CANONICAL_SLUG, mode: 'dry-run' });
  assert.deepEqual(parseArguments(['--slug', CANONICAL_SLUG, '--apply']), { slug: CANONICAL_SLUG, mode: 'apply' });
  assert.match(packageJson.scripts['blog:update-proof-submission'], new RegExp(`--slug ${CANONICAL_SLUG}`));
  assert.deepEqual(EDITORIAL_FIELDS, [
    'title', 'excerpt', 'contentHtml', 'contentText', 'contentRaw', 'category', 'customCategory',
    'tags', 'readingTime', 'seoTitle', 'seoDescription', 'coverImageAlt', 'ogImageUrl'
  ]);
  for (const alias of [
    'blog:update-best-apps',
    'blog:update-running-safety',
    'blog:update-organizer-guide',
    'blog:update-race-comparison',
    'blog:update-virtual-run-guide',
    'blog:update-leaderboards',
    'blog:update-valid-proof',
    'blog:update-accumulated-challenges',
    'blog:update-beginner-5k'
  ]) assert.ok(packageJson.scripts[alias], `missing compatibility alias: ${alias}`);
});

test('proof-submission payload rejects a missing existing cover image', () => {
  assert.throws(() => buildArticlePayload({}), /existing cover image is required/);
});
