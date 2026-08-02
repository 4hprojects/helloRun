'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const mongoose = require('mongoose');
const sharp = require('sharp');
const packageJson = require('../package.json');

const { POSTS, buildContentHtml, htmlToText } = require('../src/scripts/seed-adsense-blog-posts');
const { getArticleModule, listArticleSlugs } = require('../src/content/adsense-blog-article-registry');
const { evaluateBlogContentEligibility } = require('../src/utils/blog-content-eligibility');
const { BLOG_CATEGORIES } = require('../src/utils/blog');
const {
  GUIDE_AUTHOR_EMAIL,
  buildCreatePayload,
  getCanonicalSeed,
  parseArguments: parseCreateArguments
} = require('../src/scripts/create-adsense-blog');
const { parseArguments: parseUpdateArguments } = require('../src/scripts/update-adsense-blog');
const {
  ARTICLE,
  CANONICAL_SLUG,
  RAW_CONTENT_HTML,
  REQUIRED_HEADINGS,
  REQUIRED_LINKS,
  buildArticlePayload,
  validateArticlePayload
} = require('../src/content/data-privacy-checklist-running-event-organizers-guide');

const COVER_IMAGE_URL = 'https://cdn.hellorun.online/blog/covers/698f1cb67748262281092639/1785687764281-767893634-data-privacy-checklist-running-event-organizers.webp';
const COVER_IMAGE_PATH = path.join(
  __dirname, '..', 'src', 'public', 'images', 'blog', 'covers',
  'data-privacy-checklist-running-event-organizers.webp'
);

test('organizer data privacy checklist builds a substantive source-grounded payload', () => {
  const payload = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  const wordCount = payload.contentText.split(/\s+/).filter(Boolean).length;

  assert.equal(ARTICLE.slug, CANONICAL_SLUG);
  assert.equal(payload.title, 'Data Privacy Checklist for Running Event Organizers');
  assert.equal(payload.category, 'Organizer Guide');
  assert.ok(BLOG_CATEGORIES.includes(payload.category));
  assert.equal(payload.tags.length, 8);
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
  assert.doesNotMatch(payload.contentHtml, /<h1\b/i);
  assert.match(payload.contentText, /reviewed in August 2026 against the Philippine Data Privacy Act/i);
  assert.match(payload.contentText, /operational education, not legal advice/i);
  assert.match(payload.contentText, /Treat every export as a controlled new copy/i);

  for (const heading of REQUIRED_HEADINGS) {
    assert.ok(payload.contentHtml.includes(`<h2>${heading}</h2>`), `missing required heading: ${heading}`);
  }
  for (const link of REQUIRED_LINKS) {
    assert.ok(payload.contentHtml.includes(link), `missing required link: ${link}`);
  }
});

test('organizer data privacy checklist sanitizes official sources and passes eligibility', () => {
  const payload = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  const eligibility = evaluateBlogContentEligibility(payload, {
    evaluatedAt: new Date('2026-08-03T00:00:00.000Z')
  });

  assert.equal(payload.contentHtml.includes('<script'), false);
  assert.equal(payload.contentHtml.includes('javascript:'), false);
  assert.notEqual(payload.contentHtml, RAW_CONTENT_HTML.trim());
  assert.match(payload.contentHtml, /href="https:\/\/privacy\.gov\.ph\/data-privacy-act\/" rel="noopener noreferrer" target="_blank"/);
  assert.match(payload.contentHtml, /href="https:\/\/privacy\.gov\.ph\/implementing-rules-regulations-data-privacy-act-2012\/" rel="noopener noreferrer" target="_blank"/);
  assert.match(payload.contentHtml, /href="https:\/\/privacy\.gov\.ph\/data-subject-rights\/" rel="noopener noreferrer" target="_blank"/);
  assert.equal(eligibility.eligible, true);
  assert.deepEqual(eligibility.blockingReasons, []);
  assert.equal(eligibility.healthReviewRequired, true);
  assert.ok(eligibility.wordCount >= 3200);
  assert.equal(eligibility.externalLinkCount, 4);
});

test('organizer data privacy checklist uses a distinct 1600 by 900 paper-theatre cover', async () => {
  assert.equal(fs.existsSync(COVER_IMAGE_PATH), true);
  const metadata = await sharp(COVER_IMAGE_PATH).metadata();
  assert.equal(metadata.format, 'webp');
  assert.equal(metadata.width, 1600);
  assert.equal(metadata.height, 900);
});

test('organizer data privacy checklist is registered and seeded once for August 22', () => {
  const articleModule = getArticleModule(CANONICAL_SLUG);
  const seededPosts = POSTS.filter((post) => post.slug === CANONICAL_SLUG);
  const seededPost = seededPosts[0];

  assert.equal(articleModule.ARTICLE, ARTICLE);
  assert.ok(listArticleSlugs().includes(CANONICAL_SLUG));
  assert.equal(listArticleSlugs().length, 34);
  assert.equal(seededPosts.length, 1);
  assert.equal(getCanonicalSeed(CANONICAL_SLUG), seededPost);
  assert.equal(buildContentHtml(seededPost), seededPost.contentHtml);
  assert.equal(htmlToText(seededPost.contentHtml), buildArticlePayload({ coverImageUrl: seededPost.coverImageUrl }).contentText);
  assert.equal(seededPost.coverImageUrl, COVER_IMAGE_URL);
  assert.equal(seededPost.ogImageUrl, COVER_IMAGE_URL);
  assert.equal(seededPost.status, 'scheduled');
  assert.equal(seededPost.publishedAt, '2026-08-22T11:00:00.000Z');
  assert.equal(seededPost.featured, false);
  assert.equal(seededPost.authorEmail, GUIDE_AUTHOR_EMAIL);
});

test('organizer data privacy checklist supports exact eligible scheduling and updates', () => {
  const authorId = new mongoose.Types.ObjectId();
  const publishAt = '2026-08-22T11:00:00.000Z';
  const payload = buildCreatePayload({
    slug: CANONICAL_SLUG,
    authorId,
    now: new Date('2026-08-03T10:00:00.000Z'),
    publishAt
  });

  assert.deepEqual(
    parseCreateArguments(['--slug', CANONICAL_SLUG, '--apply', '--publish-at', publishAt]),
    { slug: CANONICAL_SLUG, mode: 'apply', publishAt }
  );
  assert.deepEqual(parseUpdateArguments(['--slug', CANONICAL_SLUG]), { slug: CANONICAL_SLUG, mode: 'dry-run' });
  assert.equal(payload.status, 'scheduled');
  assert.equal(payload.publishedAt.toISOString(), publishAt);
  assert.equal(payload.approvedAt, null);
  assert.equal(payload.featured, false);
  assert.equal(payload.contentEligibility.eligible, true);
  assert.equal(payload.contentEligibility.healthReviewRequired, true);
  assert.equal(payload.publicationReview.originalityConfirmed, true);
  assert.equal(payload.publicationReview.externalLinksConfirmed, true);
  assert.equal(payload.publicationReview.healthChecks.healthExperienceConfirmed, true);
  assert.equal(payload.publicationReview.healthChecks.healthSourcesConfirmed, true);
  assert.equal(payload.publicationReview.healthChecks.healthSafetyConfirmed, true);
  assert.equal(payload.publicationReview.healthChecks.healthCredentialsConfirmed, true);
  assert.match(packageJson.scripts['blog:update-organizer-data-privacy'], new RegExp(`--slug ${CANONICAL_SLUG}`));
});

test('organizer data privacy checklist rejects unsafe or unsupported privacy claims', () => {
  const payload = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  const withClaim = (claim) => ({
    ...payload,
    contentText: `${payload.contentText} ${claim}`,
    contentRaw: `${payload.contentText} ${claim}`
  });

  assert.throws(() => validateArticlePayload(withClaim('This checklist guarantees compliance.')), /certify compliance/);
  assert.throws(() => validateArticlePayload(withClaim('Consent is always the lawful basis.')), /oversimplify lawful basis/);
  assert.throws(() => validateArticlePayload(withClaim('All personal data must be deleted immediately.')), /universal retention/);
  assert.throws(() => validateArticlePayload(withClaim('Every incident must trigger notification.')), /predetermine notification/);
  assert.throws(() => validateArticlePayload(withClaim('Proof images are public.')), /private review material/);
  assert.throws(() => validateArticlePayload(withClaim('Organizers may collect any data.')), /excessive collection/);
  assert.throws(() => validateArticlePayload(withClaim('Approved results prove identity.')), /overstate approval/);
  assert.throws(() => validateArticlePayload(withClaim('Downloaded exports remain protected automatically.')), /export protection/);
  assert.throws(() => buildArticlePayload(), /cover artwork/);
});
