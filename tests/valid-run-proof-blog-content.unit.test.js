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
} = require('../src/content/valid-run-proof-guide');
const { getArticleModule, listArticleSlugs } = require('../src/content/adsense-blog-article-registry');
const { parseArguments } = require('../src/scripts/update-adsense-blog');

const COVER_IMAGE_URL = 'https://cdn.hellorun.online/valid-proof-cover.webp';
const UPLOAD_SOURCE = fs.readFileSync(path.join(__dirname, '../src/services/upload.service.js'), 'utf8');
const SUBMISSION_CONTROLLER_SOURCE = fs.readFileSync(path.join(__dirname, '../src/controllers/page/submission.controller.js'), 'utf8');
const VALIDATION_SOURCE = fs.readFileSync(path.join(__dirname, '../src/services/submission-validation.service.js'), 'utf8');
const STRAVA_SOURCE = fs.readFileSync(path.join(__dirname, '../src/services/strava-submission.service.js'), 'utf8');
const LEADERBOARD_SOURCE = fs.readFileSync(path.join(__dirname, '../src/services/leaderboard.service.js'), 'utf8');

test('valid-run-proof guide builds a substantive evidence-focused payload', () => {
  const payload = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  const wordCount = payload.contentText.split(/\s+/).filter(Boolean).length;

  assert.equal(ARTICLE.slug, CANONICAL_SLUG);
  assert.equal(payload.title, 'What Counts as Valid Run Proof?');
  assert.equal(payload.category, 'Virtual Run Guide');
  assert.equal(payload.tags.length, 8);
  assert.ok(payload.tags.every((tag) => tag.length <= 30));
  assert.ok(payload.excerpt.length <= 220);
  assert.ok(payload.seoTitle.length <= 160);
  assert.ok(payload.seoDescription.length <= 320);
  assert.ok(payload.coverImageAlt.length <= 180);
  assert.ok(payload.contentHtml.length <= 50000);
  assert.ok(payload.contentText.length <= 50000);
  assert.ok(wordCount >= 2800);
  assert.equal(payload.contentRaw, payload.contentText);
  assert.equal(payload.ogImageUrl, COVER_IMAGE_URL);
  assert.doesNotThrow(() => validateArticlePayload(payload));

  assert.match(payload.contentText, /documents the HelloRun proof-submission implementation available in July 2026/i);
  assert.match(payload.contentText, /current HelloRun result form accepts JPEG, PNG, and WebP/i);
  assert.match(payload.contentText, /automatically approve an eligible clean OCR or validated Strava submission/i);
  assert.match(payload.contentText, /same runner's matching proof across standard and accumulated submissions/i);
  assert.match(payload.contentText, /pending evidence is not yet approved progress or an official ranked result/i);
  assert.match(payload.contentText, /Public leaderboard rows do not return proof files, raw OCR text, email addresses, suspicious flags, or private review notes/i);
  assert.match(payload.contentText, /payment receipt review and run-proof review are separate decisions/i);
  assert.doesNotMatch(payload.contentHtml, /<h[12]>What Counts as Valid Run Proof\?<\/h[12]>/i);
  assert.doesNotMatch(payload.contentText, /guaranteed approval|perfect OCR|every treadmill record is accepted/i);
  assert.doesNotMatch(payload.contentText, /approved proof (?:is|provides|creates) (?:certified|qualifying|official race timing)/i);

  for (const heading of REQUIRED_HEADINGS) {
    assert.ok(payload.contentHtml.includes(`<h2>${heading}</h2>`), `missing required heading: ${heading}`);
  }
  for (const link of REQUIRED_LINKS) {
    assert.ok(payload.contentHtml.includes(link), `missing required link: ${link}`);
  }
});

test('documented proof behavior remains grounded in current implementation sources', () => {
  assert.match(UPLOAD_SOURCE, /DEFAULT_RESULT_ALLOWED_MIMES = \['image\/jpeg', 'image\/png', 'image\/webp'\]/);
  assert.match(UPLOAD_SOURCE, /MAX_UPLOAD_BYTES = parseInt\(process\.env\.UPLOAD_MAX_SIZE, 10\) \|\| 5242880/);
  assert.match(SUBMISSION_CONTROLLER_SOURCE, /crypto\.createHash\('sha256'\).*resultProofFile\.buffer/);
  assert.match(SUBMISSION_CONTROLLER_SOURCE, /This screenshot has already been submitted\./);
  assert.match(SUBMISSION_CONTROLLER_SOURCE, /Only rejected submissions can be resubmitted\./);
  assert.match(VALIDATION_SOURCE, /function isAutoApprovableOcrPayload/);
  assert.match(VALIDATION_SOURCE, /function isAutoApprovableSyncedPayload/);
  assert.match(STRAVA_SOURCE, /This Strava activity does not belong to your connected account\./);
  assert.match(STRAVA_SOURCE, /This Strava activity has already been submitted for this event\./);
  assert.match(STRAVA_SOURCE, /STRAVA_TYPE_TO_RUN_TYPE/);
  assert.match(LEADERBOARD_SOURCE, /const \{ searchableText, \.\.\.publicEntry \} = entry/);
});

test('valid-run-proof guide is registered and stored as canonical rich seed content', () => {
  const articleModule = getArticleModule(CANONICAL_SLUG);
  const seededPosts = POSTS.filter((post) => post.slug === CANONICAL_SLUG);
  const seededPost = seededPosts[0];

  assert.equal(articleModule.ARTICLE, ARTICLE);
  assert.ok(listArticleSlugs().includes(CANONICAL_SLUG));
  assert.equal(seededPosts.length, 1);
  assert.ok(seededPost);
  assert.equal(buildContentHtml(seededPost), seededPost.contentHtml);
  assert.equal(htmlToText(seededPost.contentHtml), buildArticlePayload({ coverImageUrl: seededPost.coverImageUrl }).contentText);
  assert.equal(seededPost.publishedAt, '2026-06-06T01:00:00.000Z');
});

test('valid-run-proof updater alias targets the shared slug-based updater', () => {
  assert.deepEqual(parseArguments(['--slug', CANONICAL_SLUG]), { slug: CANONICAL_SLUG, mode: 'dry-run' });
  assert.deepEqual(parseArguments(['--slug', CANONICAL_SLUG, '--dry-run']), { slug: CANONICAL_SLUG, mode: 'dry-run' });
  assert.deepEqual(parseArguments(['--slug', CANONICAL_SLUG, '--apply']), { slug: CANONICAL_SLUG, mode: 'apply' });
  assert.match(packageJson.scripts['blog:update-valid-proof'], new RegExp(`--slug ${CANONICAL_SLUG}`));
  assert.ok(packageJson.scripts['blog:update-best-apps']);
  assert.ok(packageJson.scripts['blog:update-running-safety']);
  assert.ok(packageJson.scripts['blog:update-organizer-guide']);
  assert.ok(packageJson.scripts['blog:update-race-comparison']);
  assert.ok(packageJson.scripts['blog:update-virtual-run-guide']);
  assert.ok(packageJson.scripts['blog:update-leaderboards']);
});
