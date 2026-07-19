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
} = require('../src/content/accumulated-distance-challenges');
const { getArticleModule, listArticleSlugs } = require('../src/content/adsense-blog-article-registry');
const { parseArguments } = require('../src/scripts/update-adsense-blog');

const COVER_IMAGE_URL = 'https://cdn.hellorun.online/accumulated-cover.webp';
const TARGET_SOURCE = fs.readFileSync(path.join(__dirname, '../src/services/accumulated-target.service.js'), 'utf8');
const ACTIVITY_SOURCE = fs.readFileSync(path.join(__dirname, '../src/services/accumulated-activity.service.js'), 'utf8');
const FINALIZATION_SOURCE = fs.readFileSync(path.join(__dirname, '../src/services/accumulated-certificate-finalization.service.js'), 'utf8');
const LEADERBOARD_SOURCE = fs.readFileSync(path.join(__dirname, '../src/services/leaderboard.service.js'), 'utf8');

test('accumulated-distance guide builds a substantive progress-focused payload', () => {
  const payload = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  const wordCount = payload.contentText.split(/\s+/).filter(Boolean).length;

  assert.equal(ARTICLE.slug, CANONICAL_SLUG);
  assert.equal(payload.title, 'How Accumulated Distance Challenges Work');
  assert.equal(payload.category, 'Virtual Run Guide');
  assert.equal(payload.tags.length, 8);
  assert.ok(payload.tags.every((tag) => tag.length <= 30));
  assert.ok(payload.excerpt.length <= 220);
  assert.ok(payload.seoTitle.length <= 160);
  assert.ok(payload.seoDescription.length <= 320);
  assert.ok(payload.coverImageAlt.length <= 180);
  assert.ok(payload.contentHtml.length <= 50000);
  assert.ok(payload.contentText.length <= 50000);
  assert.ok(wordCount >= 3000);
  assert.equal(payload.contentRaw, payload.contentText);
  assert.equal(payload.ogImageUrl, COVER_IMAGE_URL);
  assert.doesNotThrow(() => validateArticlePayload(payload));

  assert.match(payload.contentText, /documents the HelloRun accumulated-distance implementation available in July 2026/i);
  assert.match(payload.contentText, /Official distance = sum of approved activity distance/i);
  assert.match(payload.contentText, /Potential distance = approved distance plus pending distance/i);
  assert.match(payload.contentText, /progress percentage can exceed 100%/i);
  assert.match(payload.contentText, /activities are grouped by registration/i);
  assert.match(payload.contentText, /ordered by highest verified total, not fastest pace/i);
  assert.match(payload.contentText, /If even one activity for that event still has submitted status, eligible certificates wait/i);
  assert.match(payload.contentText, /selected goal, final approved distance, approved activity count, and finalisation time/i);
  assert.doesNotMatch(payload.contentHtml, /<h[12]>How Accumulated Distance Challenges Work<\/h[12]>/i);
  assert.doesNotMatch(payload.contentText, /pending distance counts officially|guaranteed device accuracy|every activity is automatically approved/i);

  for (const heading of REQUIRED_HEADINGS) {
    assert.ok(payload.contentHtml.includes(`<h2>${heading}</h2>`), `missing required heading: ${heading}`);
  }
  for (const link of REQUIRED_LINKS) {
    assert.ok(payload.contentHtml.includes(link), `missing required link: ${link}`);
  }
});

test('documented target, progress, ranking, and finalization behavior remains grounded in services', () => {
  assert.match(TARGET_SOURCE, /raceCategoryId/);
  assert.match(TARGET_SOURCE, /registration\.pricingSnapshot\?\.raceDistance/);
  assert.match(TARGET_SOURCE, /registration\.raceDistance/);
  assert.match(TARGET_SOURCE, /event\?\.targetDistanceKm/);

  assert.match(ACTIVITY_SOURCE, /const approvedDistanceKm = sumDistance\(approved\)/);
  assert.match(ACTIVITY_SOURCE, /const pendingDistanceKm = sumDistance\(pending\)/);
  assert.match(ACTIVITY_SOURCE, /potentialDistanceKm = approvedDistanceKm \+ pendingDistanceKm/);
  assert.match(ACTIVITY_SOURCE, /Math\.max\(0, approvedDistanceKm - target\)/);
  assert.match(ACTIVITY_SOURCE, /Math\.max\(0, target - approvedDistanceKm\)/);
  assert.match(ACTIVITY_SOURCE, /minimumActivityDistanceKm/);
  assert.match(ACTIVITY_SOURCE, /acceptedRunTypes/);
  assert.match(ACTIVITY_SOURCE, /applyAccumulatedAutoApprovalIfEligible/);

  assert.match(LEADERBOARD_SOURCE, /totalDistanceKm:\s*\{\s*\$sum:\s*'\$distanceKm'\s*\}/);
  assert.match(LEADERBOARD_SOURCE, /\{ \$sort: \{ totalDistanceKm: -1, verifiedAt: 1, submittedAt: 1 \} \}/);

  assert.match(FINALIZATION_SOURCE, /event\.finalSubmissionDeadlineAt \|\|/);
  assert.match(FINALIZATION_SOURCE, /status: 'submitted'/);
  assert.match(FINALIZATION_SOURCE, /if \(pendingCount > 0\)/);
  assert.match(FINALIZATION_SOURCE, /goalDistanceKm: progress\.targetDistanceKm/);
  assert.match(FINALIZATION_SOURCE, /verifiedDistanceKm: progress\.approvedDistanceKm/);
  assert.match(FINALIZATION_SOURCE, /approvedActivityCount: progress\.approvedActivityCount/);
  assert.match(FINALIZATION_SOURCE, /finalizedAt: now/);
});

test('accumulated-distance guide is registered and stored as canonical rich seed content', () => {
  const articleModule = getArticleModule(CANONICAL_SLUG);
  const seededPosts = POSTS.filter((post) => post.slug === CANONICAL_SLUG);
  const seededPost = seededPosts[0];

  assert.equal(articleModule.ARTICLE, ARTICLE);
  assert.ok(listArticleSlugs().includes(CANONICAL_SLUG));
  assert.equal(seededPosts.length, 1);
  assert.ok(seededPost);
  assert.equal(buildContentHtml(seededPost), seededPost.contentHtml);
  assert.equal(htmlToText(seededPost.contentHtml), buildArticlePayload({ coverImageUrl: seededPost.coverImageUrl }).contentText);
  assert.equal(seededPost.publishedAt, '2026-06-05T01:00:00.000Z');
});

test('accumulated-distance updater alias targets the shared slug-based updater', () => {
  assert.deepEqual(parseArguments(['--slug', CANONICAL_SLUG]), { slug: CANONICAL_SLUG, mode: 'dry-run' });
  assert.deepEqual(parseArguments(['--slug', CANONICAL_SLUG, '--dry-run']), { slug: CANONICAL_SLUG, mode: 'dry-run' });
  assert.deepEqual(parseArguments(['--slug', CANONICAL_SLUG, '--apply']), { slug: CANONICAL_SLUG, mode: 'apply' });
  assert.match(packageJson.scripts['blog:update-accumulated-challenges'], new RegExp(`--slug ${CANONICAL_SLUG}`));
  for (const alias of [
    'blog:update-best-apps',
    'blog:update-running-safety',
    'blog:update-organizer-guide',
    'blog:update-race-comparison',
    'blog:update-virtual-run-guide',
    'blog:update-leaderboards',
    'blog:update-valid-proof'
  ]) assert.ok(packageJson.scripts[alias], `missing compatibility alias: ${alias}`);
});
