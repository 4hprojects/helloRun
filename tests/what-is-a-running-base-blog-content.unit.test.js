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
const {
  ARTICLE,
  CANONICAL_SLUG,
  RAW_CONTENT_HTML,
  REQUIRED_HEADINGS,
  REQUIRED_LINKS,
  buildArticlePayload,
  validateArticlePayload
} = require('../src/content/what-is-a-running-base');

const COVER = '/images/blog/covers/what-is-a-running-base.webp';
const COVER_PATH = path.join(__dirname, '..', 'src', 'public', 'images', 'blog', 'covers', 'what-is-a-running-base.webp');
const PUBLISH_AT = '2026-11-01T11:00:00.000Z';

test('running-base guide builds the planned substantive beginner payload', () => {
  const payload = buildArticlePayload({ coverImageUrl: COVER });
  const wordCount = payload.contentText.split(/\s+/).filter(Boolean).length;
  assert.equal(payload.title, 'What Is a Running Base? How Beginners Build One');
  assert.equal(payload.seoDescription, 'Learn what runners mean by a running base, how regular easy running builds consistency, and why a stable routine matters before harder 5K, 10K, or 21K training.');
  assert.ok(wordCount >= 2500 && wordCount <= 3000);
  assert.equal(payload.readingTime, Math.ceil(wordCount / 180));
  assert.doesNotThrow(() => validateArticlePayload(payload));
  for (const heading of REQUIRED_HEADINGS) assert.ok(payload.contentHtml.includes(`<h2>${heading}</h2>`));
  for (const link of REQUIRED_LINKS) assert.ok(payload.contentHtml.includes(link));
});

test('guide covers the full flexible foundation without prescribing universal mileage', () => {
  const text = buildArticlePayload({ coverImageUrl: COVER }).contentText;
  for (const pattern of [/running base/i, /Consistency comes before complexity/i, /easy running/i, /Run-walk/i, /Long runs/i, /Strength training/i, /Rest and recovery/i, /one major demand at a time/i, /faster running/i, /5K/i, /10K/i, /21K/i, /Philippine conditions/i]) assert.match(text, pattern);
  assert.doesNotMatch(text, /every runner needs \d+ kilometres per week/i);
});

test('official activity sources sanitize and health eligibility passes', () => {
  const payload = buildArticlePayload({ coverImageUrl: COVER });
  const eligibility = evaluateBlogContentEligibility({ ...payload, contentRisk: 'health_safety', coverImageUrl: COVER }, { evaluatedAt: new Date('2026-09-13T00:00:00Z') });
  assert.notEqual(payload.contentHtml, RAW_CONTENT_HTML.trim());
  assert.match(payload.contentHtml, /odphp\.health\.gov\/our-work\/nutrition-physical-activity/);
  assert.match(payload.contentHtml, /cdc\.gov\/physical-activity-basics\/adding-adults\/what-counts\.html/);
  assert.match(payload.contentHtml, /nhs\.uk\/better-health\/get-active\/get-running-with-couch-to-5k/);
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

test('guide is registered and seeded exactly once for November 1', () => {
  const rows = POSTS.filter((post) => post.slug === CANONICAL_SLUG);
  const seed = rows[0];
  assert.equal(getArticleModule(CANONICAL_SLUG).ARTICLE, ARTICLE);
  assert.equal(listArticleSlugs().length, POSTS.length);
  assert.equal(rows.length, 1);
  assert.equal(getCanonicalSeed(CANONICAL_SLUG), seed);
  assert.equal(buildContentHtml(seed), seed.contentHtml);
  assert.equal(htmlToText(seed.contentHtml), buildArticlePayload({ coverImageUrl: COVER }).contentText);
  assert.equal(seed.status, 'scheduled');
  assert.equal(seed.publishedAt, PUBLISH_AT);
  assert.equal(seed.contentHtml.includes('/blog/running-form-for-beginners'), false);
});

test('creator produces a reviewed scheduled noindex health payload', () => {
  assert.deepEqual(parseArguments(['--slug', CANONICAL_SLUG, '--apply', '--confirm-editorial-review', '--publish-at', PUBLISH_AT]), { slug: CANONICAL_SLUG, mode: 'apply', confirmEditorialReview: true, publishAt: PUBLISH_AT });
  assert.deepEqual(getInitialIndexingClassification(CANONICAL_SLUG), { contentRisk: 'health_safety', indexCandidate: false, plannedNoindex: true });
  const payload = buildCreatePayload({ slug: CANONICAL_SLUG, authorId: '507f1f77bcf86cd799439011', now: new Date('2026-09-13T01:00:00Z'), publishAt: new Date(PUBLISH_AT), confirmEditorialReview: true });
  assert.equal(payload.status, 'scheduled');
  assert.equal(payload.searchIndexingReason, 'pending_expert_review');
  assert.equal(hasCurrentPublicationReview(payload), true);
  assert.match(packageJson.scripts['blog:update-running-base'], new RegExp(CANONICAL_SLUG));
});

test('validator rejects universal volume, guarantees, and unsafe symptom advice', () => {
  const payload = buildArticlePayload({ coverImageUrl: COVER });
  const changed = (text) => ({ ...payload, contentText: `${payload.contentText} ${text}`, contentRaw: `${payload.contentText} ${text}` });
  assert.throws(() => validateArticlePayload(changed('Every runner needs 50 kilometres per week.')), /universal mileage/);
  assert.throws(() => validateArticlePayload(changed('Base training prevents injury.')), /guarantee/);
  assert.throws(() => validateArticlePayload(changed('Ignore persistent pain.')), /unsafe symptoms/);
  assert.throws(() => buildArticlePayload(), /cover artwork/);
});
