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
} = require('../src/content/post-run-recovery-basics-guide');

const COVER_IMAGE_URL = 'https://cdn.hellorun.online/blog/covers/698f1cb67748262281092639/1785684194043-524731892-post-run-recovery-basics-rest-hydration-when-to-ease-back.webp';
const COVER_IMAGE_PATH = path.join(
  __dirname,
  '..',
  'src',
  'public',
  'images',
  'blog',
  'covers',
  'post-run-recovery-basics-rest-hydration-when-to-ease-back.webp'
);

test('post-run recovery guide builds a substantive health-gated payload', () => {
  const payload = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  const wordCount = payload.contentText.split(/\s+/).filter(Boolean).length;

  assert.equal(ARTICLE.slug, CANONICAL_SLUG);
  assert.equal(payload.title, 'Post-Run Recovery Basics: Rest, Hydration, and When to Ease Back');
  assert.equal(payload.category, 'Injury Prevention');
  assert.ok(BLOG_CATEGORIES.includes(payload.category));
  assert.deepEqual(payload.tags, [
    'post-run recovery', 'recovery basics', 'runner hydration', 'rest after running',
    'muscle soreness', 'injury awareness', 'running safety', 'beginner runners'
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

  assert.doesNotMatch(payload.contentHtml, /<h1\b/i);
  assert.doesNotMatch(payload.contentHtml, /<h[12]>Post-Run Recovery Basics:/i);
  assert.match(payload.contentText, /reviewed in August 2026 using World Health Organization/i);
  assert.match(payload.contentText, /Approval means the evidence met the applicable platform and event review requirements/i);
  assert.match(payload.contentText, /Contact local emergency services or obtain immediate medical help/i);
  assert.match(payload.contentText, /After the next ordinary run, complete the worksheet once/i);

  for (const heading of REQUIRED_HEADINGS) {
    assert.ok(payload.contentHtml.includes(`<h2>${heading}</h2>`), `missing required heading: ${heading}`);
  }
  for (const link of REQUIRED_LINKS) {
    assert.ok(payload.contentHtml.includes(link), `missing required link: ${link}`);
  }
});

test('post-run recovery guide sanitizes official sources and passes health eligibility', () => {
  const payload = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  const eligibility = evaluateBlogContentEligibility({
    ...payload,
    coverImageUrl: COVER_IMAGE_URL
  }, { evaluatedAt: new Date('2026-08-02T00:00:00.000Z') });

  assert.equal(payload.contentHtml.includes('<script'), false);
  assert.equal(payload.contentHtml.includes('javascript:'), false);
  assert.notEqual(payload.contentHtml, RAW_CONTENT_HTML.trim());
  assert.match(payload.contentHtml, /href="https:\/\/www\.who\.int\/publications\/i\/item\/9789240015128" rel="noopener noreferrer" target="_blank"/);
  assert.match(payload.contentHtml, /href="https:\/\/www\.acsm\.org\/docs\/default-source\/nyshsi_resources\/resources\/sssi-nyshsi-recovery\.pdf" rel="noopener noreferrer" target="_blank"/);
  assert.match(payload.contentHtml, /href="https:\/\/www\.nhs\.uk\/better-health\/get-active\/get-running-with-couch-to-5k\/couch-to-5k-running-plan\/" rel="noopener noreferrer" target="_blank"/);
  assert.match(payload.contentHtml, /href="https:\/\/www\.nhs\.uk\/conditions\/sprains-and-strains\/" rel="noopener noreferrer" target="_blank"/);
  assert.match(payload.contentHtml, /href="https:\/\/www\.cdc\.gov\/heat-health\/risk-factors\/heat-and-athletes\.html" rel="noopener noreferrer" target="_blank"/);
  assert.equal(eligibility.eligible, true);
  assert.deepEqual(eligibility.blockingReasons, []);
  assert.equal(eligibility.healthReviewRequired, true);
  assert.ok(eligibility.wordCount >= 3200);
  assert.ok(eligibility.semanticUnitCount >= 3);
  assert.equal(eligibility.externalLinkCount, 5);
});

test('post-run recovery guide uses a 1600 by 900 quiet documentary cover', async () => {
  assert.equal(fs.existsSync(COVER_IMAGE_PATH), true);
  const metadata = await sharp(COVER_IMAGE_PATH).metadata();
  assert.equal(metadata.format, 'webp');
  assert.equal(metadata.width, 1600);
  assert.equal(metadata.height, 900);
});

test('post-run recovery guide is registered and seeded once for August 15', () => {
  const articleModule = getArticleModule(CANONICAL_SLUG);
  const seededPosts = POSTS.filter((post) => post.slug === CANONICAL_SLUG);
  const seededPost = seededPosts[0];

  assert.equal(articleModule.ARTICLE, ARTICLE);
  assert.ok(listArticleSlugs().includes(CANONICAL_SLUG));
  assert.equal(listArticleSlugs().length, 31);
  assert.equal(seededPosts.length, 1);
  assert.equal(getCanonicalSeed(CANONICAL_SLUG), seededPost);
  assert.equal(buildContentHtml(seededPost), seededPost.contentHtml);
  assert.equal(htmlToText(seededPost.contentHtml), buildArticlePayload({ coverImageUrl: seededPost.coverImageUrl }).contentText);
  assert.equal(seededPost.coverImageUrl, COVER_IMAGE_URL);
  assert.equal(seededPost.ogImageUrl, COVER_IMAGE_URL);
  assert.equal(seededPost.status, 'scheduled');
  assert.equal(seededPost.publishedAt, '2026-08-15T11:00:00.000Z');
  assert.equal(seededPost.featured, false);
  assert.equal(seededPost.authorEmail, GUIDE_AUTHOR_EMAIL);
});

test('post-run recovery guide supports exact health-reviewed scheduling and updates', () => {
  const authorId = new mongoose.Types.ObjectId();
  const reviewedAt = new Date('2026-08-02T16:00:00.000Z');
  const publishAt = '2026-08-15T11:00:00.000Z';
  const payload = buildCreatePayload({ slug: CANONICAL_SLUG, authorId, now: reviewedAt, publishAt });

  assert.deepEqual(
    parseCreateArguments(['--slug', CANONICAL_SLUG, '--apply', '--publish-at', publishAt]),
    { slug: CANONICAL_SLUG, mode: 'apply', publishAt }
  );
  assert.deepEqual(parseUpdateArguments(['--slug', CANONICAL_SLUG]), { slug: CANONICAL_SLUG, mode: 'dry-run' });
  assert.equal(String(payload.authorId), String(authorId));
  assert.equal(payload.status, 'scheduled');
  assert.equal(payload.publishedAt.toISOString(), publishAt);
  assert.equal(payload.approvedAt, null);
  assert.equal(payload.coverImageUrl, COVER_IMAGE_URL);
  assert.equal(payload.ogImageUrl, COVER_IMAGE_URL);
  assert.equal(payload.contentEligibility.eligible, true);
  assert.equal(payload.contentEligibility.healthReviewRequired, true);
  assert.equal(payload.publicationReview.healthSafetyConfirmed, true);
  assert.equal(payload.publicationReview.healthChecks.healthExperienceConfirmed, true);
  assert.equal(payload.publicationReview.healthChecks.healthSourcesConfirmed, true);
  assert.equal(payload.publicationReview.healthChecks.healthSafetyConfirmed, true);
  assert.equal(payload.publicationReview.healthChecks.healthCredentialsConfirmed, true);
  assert.match(packageJson.scripts['blog:update-post-run-recovery'], new RegExp(`--slug ${CANONICAL_SLUG}`));
});

test('post-run recovery guide rejects diagnosis, dosing, and unsafe return claims', () => {
  const payload = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  const withClaim = (claim) => ({
    ...payload,
    contentText: `${payload.contentText} ${claim}`,
    contentRaw: `${payload.contentText} ${claim}`
  });

  assert.throws(() => validateArticlePayload(withClaim('This is definitely a strain.')), /diagnose symptoms/);
  assert.throws(() => validateArticlePayload(withClaim('Everyone should drink exactly 500 ml.')), /universal hydration/);
  assert.throws(() => validateArticlePayload(withClaim('Take painkillers after every run.')), /medication/);
  assert.throws(() => validateArticlePayload(withClaim('Ignore the pain and continue.')), /continuing through pain/);
  assert.throws(() => validateArticlePayload(withClaim('This guarantees injury prevention.')), /guarantee prevention/);
  assert.throws(() => validateArticlePayload(withClaim('Approved evidence proves you are recovered.')), /health readiness/);
  assert.throws(() => validateArticlePayload(withClaim('You should make up the run by doubling.')), /catch-up activity/);
  assert.throws(() => buildArticlePayload(), /cover artwork/);
});
