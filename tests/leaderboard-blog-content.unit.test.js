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
} = require('../src/content/virtual-running-leaderboards');
const { getArticleModule, listArticleSlugs } = require('../src/content/adsense-blog-article-registry');
const { parseArguments } = require('../src/scripts/update-adsense-blog');

const COVER_IMAGE_URL = 'https://cdn.hellorun.online/leaderboard-cover.webp';
const SERVICE_SOURCE = fs.readFileSync(path.join(__dirname, '../src/services/leaderboard.service.js'), 'utf8');

test('leaderboard guide builds a substantive HelloRun-grounded payload', () => {
  const payload = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  const wordCount = payload.contentText.split(/\s+/).filter(Boolean).length;

  assert.equal(ARTICLE.slug, CANONICAL_SLUG);
  assert.equal(payload.title, 'How Leaderboards Work in Virtual Running Events');
  assert.equal(payload.category, 'Race Tips');
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

  assert.match(payload.contentText, /documents the HelloRun leaderboard implementation available in July 2026/i);
  assert.match(payload.contentText, /event submissions with an approved status/i);
  assert.match(payload.contentText, /primary ordering value is the approved submission's elapsed time, shortest first/i);
  assert.match(payload.contentText, /adds the distances of approved activities belonging to the same event registration/i);
  assert.match(payload.contentText, /assigns sequential ordinal ranks rather than shared tie positions/i);
  assert.match(payload.contentText, /Pending entries.+receive no rank/i);
  assert.match(payload.contentText, /up to approximately 60 seconds/i);
  assert.match(payload.contentText, /Proof files, OCR output, email addresses.+are not returned as public leaderboard fields/i);
  assert.doesNotMatch(payload.contentHtml, /<h[12]>How Leaderboards Work in Virtual Running Events<\/h[12]>/i);
  assert.doesNotMatch(payload.contentText, /automatically (?:approves?|verifies?|ranks?)/i);
  assert.doesNotMatch(payload.contentText, /live (?:GPS )?(?:timing|leaderboard updates?)/i);
  assert.doesNotMatch(payload.contentText, /registered.only|private.until.published/i);

  for (const heading of REQUIRED_HEADINGS) {
    assert.ok(payload.contentHtml.includes(`<h2>${heading}</h2>`), `missing required heading: ${heading}`);
  }
  for (const link of REQUIRED_LINKS) {
    assert.ok(payload.contentHtml.includes(link), `missing required link: ${link}`);
  }
});

test('documented ranking and privacy behavior remains grounded in the service', () => {
  assert.match(SERVICE_SOURCE, /status:\s*'approved'/);
  assert.match(SERVICE_SOURCE, /isPersonalRecord:\s*\{\s*\$ne:\s*true\s*\}/);
  assert.match(SERVICE_SOURCE, /\.sort\(\{ elapsedMs: 1, reviewedAt: 1, submittedAt: 1, createdAt: 1 \}\)/);
  assert.match(SERVICE_SOURCE, /totalDistanceKm:\s*\{\s*\$sum:\s*'\$distanceKm'\s*\}/);
  assert.match(SERVICE_SOURCE, /\{ \$sort: \{ totalDistanceKm: -1, verifiedAt: 1, submittedAt: 1 \} \}/);
  assert.match(SERVICE_SOURCE, /LEADERBOARD_CACHE_TTL_SECONDS = 60/);
  assert.match(SERVICE_SOURCE, /const \{ searchableText, \.\.\.publicEntry \} = entry/);
});

test('leaderboard guide is registered and stored as canonical rich seed content', () => {
  const articleModule = getArticleModule(CANONICAL_SLUG);
  const seededPost = POSTS.find((post) => post.slug === CANONICAL_SLUG);

  assert.equal(articleModule.ARTICLE, ARTICLE);
  assert.ok(listArticleSlugs().includes(CANONICAL_SLUG));
  assert.ok(seededPost);
  assert.equal(buildContentHtml(seededPost), seededPost.contentHtml);
  assert.equal(htmlToText(seededPost.contentHtml), buildArticlePayload({ coverImageUrl: seededPost.coverImageUrl }).contentText);
});

test('leaderboard updater alias targets the shared slug-based updater', () => {
  assert.deepEqual(parseArguments(['--slug', CANONICAL_SLUG]), { slug: CANONICAL_SLUG, mode: 'dry-run' });
  assert.deepEqual(parseArguments(['--slug', CANONICAL_SLUG, '--apply']), { slug: CANONICAL_SLUG, mode: 'apply' });
  assert.match(packageJson.scripts['blog:update-adsense'], /update-adsense-blog\.js/);
  assert.match(packageJson.scripts['blog:update-leaderboards'], new RegExp(`--slug ${CANONICAL_SLUG}`));
  assert.ok(packageJson.scripts['blog:update-best-apps']);
  assert.ok(packageJson.scripts['blog:update-running-safety']);
  assert.ok(packageJson.scripts['blog:update-organizer-guide']);
  assert.ok(packageJson.scripts['blog:update-race-comparison']);
  assert.ok(packageJson.scripts['blog:update-virtual-run-guide']);
});
