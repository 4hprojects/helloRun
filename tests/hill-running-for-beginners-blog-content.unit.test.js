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
const { ARTICLE, CANONICAL_SLUG, RAW_CONTENT_HTML, REQUIRED_HEADINGS, REQUIRED_LINKS, buildArticlePayload, validateArticlePayload } = require('../src/content/hill-running-for-beginners');

const COVER = '/images/blog/covers/hill-running-for-beginners.webp';
const COVER_PATH = path.join(__dirname, '..', 'src', 'public', 'images', 'blog', 'covers', 'hill-running-for-beginners.webp');
const PUBLISH_AT = '2026-10-07T11:00:00.000Z';

test('hill-running guide builds the planned substantive beginner payload', () => {
  const payload = buildArticlePayload({ coverImageUrl: COVER });
  const wordCount = payload.contentText.split(/\s+/).filter(Boolean).length;
  assert.equal(payload.title, 'Hill Running for Beginners: How to Handle Uphills and Downhills');
  assert.equal(payload.seoDescription, 'Learn practical hill-running basics for beginners, including effort, pacing, uphill and downhill technique, route choice, and how hills affect your recorded pace.');
  assert.ok(wordCount >= 2500 && wordCount <= 3000);
  assert.equal(payload.readingTime, Math.ceil(wordCount / 180));
  assert.doesNotThrow(() => validateArticlePayload(payload));
  for (const heading of REQUIRED_HEADINGS) assert.ok(payload.contentHtml.includes('<h2>' + heading + '</h2>'));
  for (const link of REQUIRED_LINKS) assert.ok(payload.contentHtml.includes(link));
});

test('guide covers controlled climbs, descents, elevation estimates, and local safety', () => {
  const { contentText } = buildArticlePayload({ coverImageUrl: COVER });
  for (const pattern of [/effort instead of flat-route pace/i, /Walking steep climbs is a valid choice/i, /Avoid overstriding downhill/i, /Sensors, signal, maps, weather, and processing/i, /DOST-PAGASA/i, /Hills in 10K and 21K preparation/i]) assert.match(contentText, pattern);
  assert.doesNotMatch(contentText, /180 steps per minute is required/i);
});

test('official sources sanitize and health-content eligibility passes', () => {
  const payload = buildArticlePayload({ coverImageUrl: COVER });
  const eligibility = evaluateBlogContentEligibility({ ...payload, contentRisk: 'health_safety', coverImageUrl: COVER }, { evaluatedAt: new Date('2026-09-13T00:00:00Z') });
  assert.notEqual(payload.contentHtml, RAW_CONTENT_HTML.trim());
  assert.match(payload.contentHtml, /pubmed\.ncbi\.nlm\.nih\.gov\/32396672\/" rel="noopener noreferrer" target="_blank"/);
  assert.match(payload.contentHtml, /pubmed\.ncbi\.nlm\.nih\.gov\/15652542\/" rel="noopener noreferrer" target="_blank"/);
  assert.match(payload.contentHtml, /cdc\.gov\/healthy-weight-growth\/physical-activity\/getting-started\.html" rel="noopener noreferrer" target="_blank"/);
  assert.match(payload.contentHtml, /pagasa\.dost\.gov\.ph\/weather\/heat-index" rel="noopener noreferrer" target="_blank"/);
  assert.equal(eligibility.eligible, true);
  assert.equal(eligibility.healthReviewRequired, true);
  assert.equal(eligibility.externalLinkCount, 4);
});

test('guide has a distinct 1600 by 900 WebP cover', async () => {
  const metadata = await sharp(COVER_PATH).metadata();
  assert.deepEqual([metadata.format, metadata.width, metadata.height], ['webp', 1600, 900]);
  const hash = crypto.createHash('sha256').update(fs.readFileSync(COVER_PATH)).digest('hex');
  assert.equal(fs.readdirSync(path.dirname(COVER_PATH)).some((name) => name.endsWith('.webp') && name !== path.basename(COVER_PATH) && crypto.createHash('sha256').update(fs.readFileSync(path.join(path.dirname(COVER_PATH), name))).digest('hex') === hash), false);
});

test('guide is registered and seeded exactly once for October 7', () => {
  const rows = POSTS.filter((post) => post.slug === CANONICAL_SLUG);
  const seed = rows[0];
  assert.equal(getArticleModule(CANONICAL_SLUG).ARTICLE, ARTICLE);
  assert.equal(listArticleSlugs().length, 66);
  assert.equal(POSTS.length, 66);
  assert.equal(rows.length, 1);
  assert.equal(getCanonicalSeed(CANONICAL_SLUG), seed);
  assert.equal(buildContentHtml(seed), seed.contentHtml);
  assert.equal(htmlToText(seed.contentHtml), buildArticlePayload({ coverImageUrl: COVER }).contentText);
  assert.equal(seed.status, 'scheduled');
  assert.equal(seed.publishedAt, PUBLISH_AT);
});

test('guide links earlier live material and omits later October topics', () => {
  const payload = buildArticlePayload({ coverImageUrl: COVER });
  assert.match(payload.contentHtml, /href="\/blog\/how-to-increase-running-distance"/);
  assert.match(payload.contentHtml, /href="\/blog\/how-to-run-with-a-busy-schedule"/);
  for (const slug of ['what-to-eat-before-running', 'what-is-an-easy-run', 'strength-training-for-runners']) assert.equal(payload.contentHtml.includes('/blog/' + slug), false);
});

test('creator produces a reviewed scheduled noindex health payload', () => {
  assert.deepEqual(parseArguments(['--slug', CANONICAL_SLUG, '--apply', '--confirm-editorial-review', '--publish-at', PUBLISH_AT]), { slug: CANONICAL_SLUG, mode: 'apply', confirmEditorialReview: true, publishAt: PUBLISH_AT });
  assert.deepEqual(getInitialIndexingClassification(CANONICAL_SLUG), { contentRisk: 'health_safety', indexCandidate: false, plannedNoindex: true });
  const payload = buildCreatePayload({ slug: CANONICAL_SLUG, authorId: '507f1f77bcf86cd799439011', now: new Date('2026-09-13T01:00:00Z'), publishAt: new Date(PUBLISH_AT), confirmEditorialReview: true });
  assert.equal(payload.status, 'scheduled');
  assert.equal(payload.searchIndexingReason, 'pending_expert_review');
  assert.equal(hasCurrentPublicationReview(payload), true);
  assert.match(packageJson.scripts['blog:update-hill-running'], new RegExp(CANONICAL_SLUG));
});

test('validator rejects unsafe pace, cadence, descent, and event claims', () => {
  const payload = buildArticlePayload({ coverImageUrl: COVER });
  const changed = (claim) => ({ ...payload, contentText: payload.contentText + ' ' + claim, contentRaw: payload.contentText + ' ' + claim });
  assert.throws(() => validateArticlePayload(changed('Always maintain flat pace.')), /pace or walking/);
  assert.throws(() => validateArticlePayload(changed('180 steps per minute is required.')), /cadence/);
  assert.throws(() => validateArticlePayload(changed('Downhill running is safe for everyone.')), /safety/);
  assert.throws(() => validateArticlePayload(changed('Every event accepts walking.')), /event/);
  assert.throws(() => buildArticlePayload(), /cover artwork/);
});
