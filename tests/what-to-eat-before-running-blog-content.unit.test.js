'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');
const packageJson = require('../package.json');
const { POSTS, buildContentHtml, htmlToText } = require('../src/scripts/seed-adsense-blog-posts');
const { getArticleModule, listArticleSlugs } = require('../src/content/adsense-blog-article-registry');
const { getInitialIndexingClassification } = require('../src/content/adsense-content-indexing');
const { evaluateBlogContentEligibility, hasCurrentPublicationReview } = require('../src/utils/blog-content-eligibility');
const { buildCreatePayload, getCanonicalSeed, parseArguments } = require('../src/scripts/create-adsense-blog');
const { ARTICLE, CANONICAL_SLUG, RAW_CONTENT_HTML, REQUIRED_HEADINGS, REQUIRED_LINKS, buildArticlePayload, validateArticlePayload } = require('../src/content/what-to-eat-before-running');

const COVER = '/images/blog/covers/what-to-eat-before-running.webp';
const COVER_PATH = path.join(__dirname, '..', 'src', 'public', 'images', 'blog', 'covers', 'what-to-eat-before-running.webp');
const PUBLISH_AT = '2026-10-09T11:00:00.000Z';

test('pre-run food guide builds the planned substantive beginner payload', () => {
  const payload = buildArticlePayload({ coverImageUrl: COVER });
  const wordCount = payload.contentText.split(/\s+/).filter(Boolean).length;
  assert.equal(payload.title, 'What Should You Eat Before a Run? A Beginner’s Guide');
  assert.equal(payload.seoDescription, 'Learn practical pre-run food basics for beginners, including meal timing, easy-to-digest options, short vs long runs, and familiar Filipino food examples.');
  assert.ok(wordCount >= 2500 && wordCount <= 3000);
  assert.equal(payload.readingTime, Math.ceil(wordCount / 180));
  assert.doesNotThrow(() => validateArticlePayload(payload));
  for (const heading of REQUIRED_HEADINGS) assert.ok(payload.contentHtml.includes('<h2>' + heading + '</h2>'));
  for (const link of REQUIRED_LINKS) assert.ok(payload.contentHtml.includes(link));
});

test('guide answers timing and distance questions with flexible Filipino examples', () => {
  const { contentText } = buildArticlePayload({ coverImageUrl: COVER });
  for (const pattern of [/Short easy run versus a longer session/i, /Larger meal versus small snack/i, /lower-fiber and lower-fat/i, /What to eat before running in the morning/i, /Pandesal, rice, lugaw/i, /What to eat before a 5K/i, /What to eat before a 10K/i, /Avoid unfamiliar food/i]) assert.match(contentText, pattern);
  assert.doesNotMatch(contentText, /everyone must eat before running/i);
});

test('credible nutrition sources sanitize and health eligibility passes', () => {
  const payload = buildArticlePayload({ coverImageUrl: COVER });
  const eligibility = evaluateBlogContentEligibility({ ...payload, contentRisk: 'health_safety', coverImageUrl: COVER }, { evaluatedAt: new Date('2026-09-13T00:00:00Z') });
  assert.notEqual(payload.contentHtml, RAW_CONTENT_HTML.trim());
  assert.match(payload.contentHtml, /pubmed\.ncbi\.nlm\.nih\.gov\/33198277\/" rel="noopener noreferrer" target="_blank"/);
  assert.match(payload.contentHtml, /sportsdietitians\.com\.au\/factsheets\/pre-exercise-fuelling\/" rel="noopener noreferrer" target="_blank"/);
  assert.match(payload.contentHtml, /pubmed\.ncbi\.nlm\.nih\.gov\/26891166\/" rel="noopener noreferrer" target="_blank"/);
  assert.equal(eligibility.eligible, true);
  assert.equal(eligibility.healthReviewRequired, true);
  assert.equal(eligibility.externalLinkCount, 3);
});

test('guide has a distinct 1600 by 900 WebP cover', async () => {
  const metadata = await sharp(COVER_PATH).metadata();
  assert.deepEqual([metadata.format, metadata.width, metadata.height], ['webp', 1600, 900]);
  const hash = crypto.createHash('sha256').update(fs.readFileSync(COVER_PATH)).digest('hex');
  assert.equal(fs.readdirSync(path.dirname(COVER_PATH)).some((name) => name.endsWith('.webp') && name !== path.basename(COVER_PATH) && crypto.createHash('sha256').update(fs.readFileSync(path.join(path.dirname(COVER_PATH), name))).digest('hex') === hash), false);
});

test('guide is registered and seeded exactly once for October 9', () => {
  const rows = POSTS.filter((post) => post.slug === CANONICAL_SLUG);
  const seed = rows[0];
  assert.equal(getArticleModule(CANONICAL_SLUG).ARTICLE, ARTICLE);
  assert.equal(listArticleSlugs().length, 67);
  assert.equal(POSTS.length, 67);
  assert.equal(rows.length, 1);
  assert.equal(getCanonicalSeed(CANONICAL_SLUG), seed);
  assert.equal(buildContentHtml(seed), seed.contentHtml);
  assert.equal(htmlToText(seed.contentHtml), buildArticlePayload({ coverImageUrl: COVER }).contentText);
  assert.equal(seed.status, 'scheduled');
  assert.equal(seed.publishedAt, PUBLISH_AT);
});

test('guide links earlier material and omits later October nutrition topics', () => {
  const payload = buildArticlePayload({ coverImageUrl: COVER });
  assert.match(payload.contentHtml, /href="\/blog\/10k-training-plan-for-beginners"/);
  assert.match(payload.contentHtml, /href="\/blog\/21k-half-marathon-for-beginners"/);
  for (const slug of ['what-to-eat-after-running', 'hydration-for-runners', 'what-is-an-easy-run']) assert.equal(payload.contentHtml.includes('/blog/' + slug), false);
});

test('creator produces a reviewed scheduled noindex health payload', () => {
  assert.deepEqual(parseArguments(['--slug', CANONICAL_SLUG, '--apply', '--confirm-editorial-review', '--publish-at', PUBLISH_AT]), { slug: CANONICAL_SLUG, mode: 'apply', confirmEditorialReview: true, publishAt: PUBLISH_AT });
  assert.deepEqual(getInitialIndexingClassification(CANONICAL_SLUG), { contentRisk: 'health_safety', indexCandidate: false, plannedNoindex: true });
  const payload = buildCreatePayload({ slug: CANONICAL_SLUG, authorId: '507f1f77bcf86cd799439011', now: new Date('2026-09-13T01:00:00Z'), publishAt: new Date(PUBLISH_AT), confirmEditorialReview: true });
  assert.equal(payload.status, 'scheduled');
  assert.equal(payload.searchIndexingReason, 'pending_expert_review');
  assert.equal(hasCurrentPublicationReview(payload), true);
  assert.match(packageJson.scripts['blog:update-pre-run-food'], new RegExp(CANONICAL_SLUG));
});

test('validator rejects universal meals, calorie prescriptions, fasting guarantees, and event claims', () => {
  const payload = buildArticlePayload({ coverImageUrl: COVER });
  const changed = (claim) => ({ ...payload, contentText: payload.contentText + ' ' + claim, contentRaw: payload.contentText + ' ' + claim });
  assert.throws(() => validateArticlePayload(changed('Everyone must eat before running.')), /universal meal/);
  assert.throws(() => validateArticlePayload(changed('You must eat 500 calories.')), /calorie prescription/);
  assert.throws(() => validateArticlePayload(changed('Fasted running guarantees fat loss.')), /fasting claim/);
  assert.throws(() => validateArticlePayload(changed('Every event provides food.')), /event claim/);
  assert.throws(() => buildArticlePayload(), /cover artwork/);
});
