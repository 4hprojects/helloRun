'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');

const packageJson = require('../package.json');
const article = require('../src/content/common-gps-screenshot-problems-virtual-run');
const { POSTS, buildPostPayload } = require('../src/scripts/seed-adsense-blog-posts');
const { getArticleModule, listArticleSlugs } = require('../src/content/adsense-blog-article-registry');
const { getInitialIndexingClassification } = require('../src/content/adsense-content-indexing');
const { buildCreatePayload } = require('../src/scripts/create-adsense-blog');

const COVER = '/images/blog/covers/common-gps-screenshot-problems-virtual-run.webp';
const AUTHOR_ID = '507f1f77bcf86cd799439011';

test('GPS screenshot problems article meets metadata, scope, and word requirements', () => {
  const payload = article.buildArticlePayload({ coverImageUrl: COVER });
  const wordCount = payload.contentText.split(/\s+/).filter(Boolean).length;

  assert.equal(payload.slug, article.CANONICAL_SLUG);
  assert.equal(payload.category, 'Virtual Run Guide');
  assert.ok(payload.title.length <= 120);
  assert.ok(payload.excerpt.length <= 220);
  assert.ok(payload.seoTitle.length <= 70);
  assert.ok(payload.seoDescription.length <= 160);
  assert.ok(payload.tags.length >= 5 && payload.tags.length <= 8);
  assert.ok(wordCount >= 1400 && wordCount <= 2000);
  assert.equal(payload.readingTime, Math.ceil(wordCount / 180));
  assert.equal(article.TARGET_PUBLICATION_AT, '2026-09-27T11:00:00.000Z');

  for (const heading of article.REQUIRED_HEADINGS) assert.match(payload.contentHtml, new RegExp(`>${heading}</h`));
  for (const link of article.REQUIRED_LINKS) assert.ok(payload.contentHtml.includes(link));
  for (const phrase of ['individual activity detail screen', 'distance and unit', 'duration with pace', 'activity date', 'upload preview']) {
    assert.match(payload.contentText, new RegExp(phrase, 'i'));
  }
  assert.match(payload.contentText, /A 30-second screenshot check/i);
});

test('screenshot evidence is semantic, lazy, captioned, and privacy-clean', () => {
  const payload = article.buildArticlePayload({ coverImageUrl: COVER });
  const standaloneImages = payload.contentBlocks.filter((block) => block.type === 'image');
  const galleries = payload.contentBlocks.filter((block) => block.type === 'imageGallery');
  const images = [
    ...standaloneImages.map((block) => block.content),
    ...galleries.flatMap((block) => block.content.images)
  ];
  const alts = images.map((image) => image.alt);
  const captions = images.map((image) => image.caption);

  assert.equal(standaloneImages.length, 3);
  assert.equal(galleries.length, 1);
  assert.equal(images.length, 5);
  assert.equal(new Set(alts).size, 5);
  assert.ok(alts.every(Boolean));
  assert.ok(captions.every(Boolean));
  assert.equal((payload.contentHtml.match(/<figure\b/g) || []).length, 5);
  assert.equal((payload.contentHtml.match(/loading="lazy"/g) || []).length, 5);
  assert.equal((payload.contentHtml.match(/<figcaption>/g) || []).length, 5);
  assert.match(payload.contentHtml, /class="blog-image-gallery"/);
  assert.match(payload.contentHtml, /blog-proof-outcome--accepted/);
  assert.match(payload.contentHtml, /blog-proof-outcome--clarification/);
  assert.doesNotMatch(payload.contentHtml, /blog-proof-outcome--rejected/);
  assert.doesNotMatch(payload.contentHtml, /Menilyn|Zapanta|Janice|Balangen|Grail|Bacasen|Rodolfo|Tabangin|Swayam|Hendre|@|NEEDS HELLO RUN DATA/i);
});

test('cover and evidence copies are readable WebP assets', async () => {
  const root = path.join(__dirname, '..', 'src', 'public');
  const cover = await sharp(path.join(root, COVER)).metadata();
  assert.deepEqual([cover.format, cover.width, cover.height], ['webp', 1600, 900]);

  for (const url of Object.values(article.EVIDENCE_IMAGES)) {
    const metadata = await sharp(path.join(root, url)).metadata();
    assert.equal(metadata.format, 'webp');
    assert.ok(metadata.width >= 699);
    assert.ok(metadata.height >= 300);
  }
});

test('article is registered once as an unscheduled noindex draft', () => {
  const seeds = POSTS.filter((post) => post.slug === article.CANONICAL_SLUG);
  assert.equal(seeds.length, 1);
  assert.equal(listArticleSlugs().length, POSTS.length);
  assert.equal(getArticleModule(article.CANONICAL_SLUG).ARTICLE, article.ARTICLE);
  assert.equal(seeds[0].status, 'draft');
  assert.equal(seeds[0].publishedAt, undefined);
  assert.equal(article.PUBLICATION_READY, false);
  assert.deepEqual(article.MISSING_PUBLICATION_EVIDENCE, [
    'Final editorial and privacy approval of the completed article and evidence gallery'
  ]);

  const payload = buildPostPayload(seeds[0], { _id: AUTHOR_ID }, 100);
  assert.equal(payload.status, 'draft');
  assert.equal(payload.scheduledFor, null);
  assert.equal(payload.publishedAt, null);
  assert.equal(payload.approvedAt, null);
  assert.equal(payload.searchIndexingStatus, 'noindex');
  assert.equal(payload.searchIndexingReason, 'pending_value_review');
  assert.equal(payload.contentBlocks.length, article.CONTENT_BLOCKS.length);
});

test('publication guard, indexing classification, update command, and BlogPosting output are present', () => {
  assert.deepEqual(getInitialIndexingClassification(article.CANONICAL_SLUG), {
    contentRisk: 'general',
    indexCandidate: true,
    plannedNoindex: false
  });
  assert.match(packageJson.scripts['blog:update-gps-screenshot-problems'], new RegExp(article.CANONICAL_SLUG));
  assert.throws(
    () => buildCreatePayload({ slug: article.CANONICAL_SLUG, authorId: AUTHOR_ID }),
    /Final editorial and privacy approval/
  );
  const blogPostView = fs.readFileSync(path.join(__dirname, '..', 'src', 'views', 'pages', 'blog-post.ejs'), 'utf8');
  assert.match(blogPostView, /"@type": "BlogPosting"/);
});
