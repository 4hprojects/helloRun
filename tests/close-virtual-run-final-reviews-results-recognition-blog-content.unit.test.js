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
  GUIDE_AUTHOR_EMAIL, buildCreatePayload, getCanonicalSeed,
  parseArguments: parseCreateArguments
} = require('../src/scripts/create-adsense-blog');
const { parseArguments: parseUpdateArguments } = require('../src/scripts/update-adsense-blog');
const {
  ARTICLE, CANONICAL_SLUG, RAW_CONTENT_HTML, REQUIRED_HEADINGS, REQUIRED_LINKS,
  buildArticlePayload, validateArticlePayload
} = require('../src/content/close-virtual-run-final-reviews-results-recognition-guide');

const ROOT = path.join(__dirname, '..');
const COVER_IMAGE_URL = 'https://cdn.hellorun.online/blog/covers/698f1cb67748262281092639/1785690759825-213037969-close-virtual-run-final-reviews-results-recognition.webp';
const COVER_IMAGE_PATH = path.join(
  ROOT, 'src', 'public', 'images', 'blog', 'covers',
  'close-virtual-run-final-reviews-results-recognition.webp'
);

test('virtual-run closeout guide builds a substantive Organizer Guide payload', () => {
  const payload = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  const wordCount = payload.contentText.split(/\s+/).filter(Boolean).length;

  assert.equal(ARTICLE.slug, CANONICAL_SLUG);
  assert.equal(payload.title, 'How to Close a Virtual Run: Final Reviews, Results, and Recognition');
  assert.equal(payload.category, 'Organizer Guide');
  assert.ok(BLOG_CATEGORIES.includes(payload.category));
  assert.equal(payload.tags.length, 8);
  assert.deepEqual(payload.tags, [
    'virtual run closeout', 'final result review', 'event results', 'runner recognition',
    'organizer checklist', 'event certificates', 'event recordkeeping', 'virtual run operations'
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
  assert.match(payload.contentText, /reviewed in August 2026 against current HelloRun event lifecycle/i);
  assert.match(payload.contentText, /pending and rejected distance must not be described as official progress/i);
  assert.match(payload.contentText, /Once closed, ordinary organizer editing is blocked/i);
  assert.match(payload.contentText, /Search Console validation of the working title remains pending/i);
  for (const heading of REQUIRED_HEADINGS) assert.ok(payload.contentHtml.includes(`<h2>${heading}</h2>`));
  for (const link of REQUIRED_LINKS) assert.ok(payload.contentHtml.includes(link));
});

test('virtual-run closeout guide sanitizes official sources and passes eligibility', () => {
  const payload = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  const eligibility = evaluateBlogContentEligibility(payload, {
    evaluatedAt: new Date('2026-08-03T00:00:00.000Z')
  });

  assert.equal(payload.contentHtml.includes('<script'), false);
  assert.equal(payload.contentHtml.includes('javascript:'), false);
  assert.notEqual(payload.contentHtml, RAW_CONTENT_HTML.trim());
  assert.match(payload.contentHtml, /href="https:\/\/www\.rrca\.org\/programs\/race-director-certification\/race-director-code-of-ethics\/" rel="noopener noreferrer" target="_blank"/);
  assert.match(payload.contentHtml, /href="https:\/\/privacy\.gov\.ph\/data-privacy-act\/" rel="noopener noreferrer" target="_blank"/);
  assert.match(payload.contentHtml, /href="https:\/\/www\.w3\.org\/WAI\/tutorials\/forms\/notifications\/" rel="noopener noreferrer" target="_blank"/);
  assert.equal(eligibility.eligible, true);
  assert.deepEqual(eligibility.blockingReasons, []);
  assert.equal(eligibility.healthReviewRequired, true);
  assert.ok(eligibility.wordCount >= 3200);
  assert.equal(eligibility.externalLinkCount, 5);
});

test('virtual-run closeout claims remain grounded in current HelloRun sources', () => {
  const organizerDetail = fs.readFileSync(path.join(ROOT, 'src/services/organizer-event-detail.service.js'), 'utf8');
  const finalizer = fs.readFileSync(path.join(ROOT, 'src/services/accumulated-certificate-finalization.service.js'), 'utf8');
  const leaderboard = fs.readFileSync(path.join(ROOT, 'src/services/leaderboard.service.js'), 'utf8');
  const submission = fs.readFileSync(path.join(ROOT, 'src/services/submission.service.js'), 'utf8');
  const organizerShared = fs.readFileSync(path.join(ROOT, 'src/routes/organiser/_shared.js'), 'utf8');

  assert.match(organizerDetail, /key: 'final_review', label: 'Final review in progress'/);
  assert.match(organizerDetail, /key: 'completed', label: 'Operational closeout'/);
  assert.match(finalizer, /status: 'submitted'/);
  assert.match(finalizer, /verifiedDistanceKm: progress\.approvedDistanceKm/);
  assert.match(finalizer, /approvedActivityCount: progress\.approvedActivityCount/);
  assert.match(leaderboard, /status: 'approved'/);
  assert.match(submission, /Certificate generation should not block review completion/);
  assert.match(organizerShared, /published: \['closed'\]/);
  assert.match(organizerShared, /closed: \[\]/);
});

test('virtual-run closeout guide uses a distinct 1600 by 900 cyanotype cover', async () => {
  assert.equal(fs.existsSync(COVER_IMAGE_PATH), true);
  const metadata = await sharp(COVER_IMAGE_PATH).metadata();
  assert.equal(metadata.format, 'webp');
  assert.equal(metadata.width, 1600);
  assert.equal(metadata.height, 900);
});

test('virtual-run closeout guide is registered and seeded once for August 31', () => {
  const articleModule = getArticleModule(CANONICAL_SLUG);
  const seededPosts = POSTS.filter((post) => post.slug === CANONICAL_SLUG);
  const seededPost = seededPosts[0];

  assert.equal(articleModule.ARTICLE, ARTICLE);
  assert.ok(listArticleSlugs().includes(CANONICAL_SLUG));
  assert.equal(listArticleSlugs().length, 38);
  assert.equal(seededPosts.length, 1);
  assert.equal(getCanonicalSeed(CANONICAL_SLUG), seededPost);
  assert.equal(buildContentHtml(seededPost), seededPost.contentHtml);
  assert.equal(htmlToText(seededPost.contentHtml), buildArticlePayload({ coverImageUrl: seededPost.coverImageUrl }).contentText);
  assert.equal(seededPost.coverImageUrl, COVER_IMAGE_URL);
  assert.equal(seededPost.ogImageUrl, COVER_IMAGE_URL);
  assert.equal(seededPost.status, 'scheduled');
  assert.equal(seededPost.publishedAt, '2026-08-31T11:00:00.000Z');
  assert.equal(seededPost.featured, false);
  assert.equal(seededPost.authorEmail, GUIDE_AUTHOR_EMAIL);
});

test('virtual-run closeout guide supports exact eligible scheduling and updates', () => {
  const authorId = new mongoose.Types.ObjectId();
  const publishAt = '2026-08-31T11:00:00.000Z';
  const payload = buildCreatePayload({
    slug: CANONICAL_SLUG, authorId,
    now: new Date('2026-08-03T10:00:00.000Z'), publishAt
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
  assert.equal(payload.coverImageUrl, COVER_IMAGE_URL);
  assert.equal(payload.contentEligibility.eligible, true);
  assert.equal(payload.contentEligibility.healthReviewRequired, true);
  assert.equal(payload.publicationReview.originalityConfirmed, true);
  assert.equal(payload.publicationReview.externalLinksConfirmed, true);
  assert.equal(payload.publicationReview.healthSafetyConfirmed, true);
  assert.equal(payload.publicationReview.healthChecks.healthExperienceConfirmed, true);
  assert.equal(payload.publicationReview.healthChecks.healthSourcesConfirmed, true);
  assert.equal(payload.publicationReview.healthChecks.healthSafetyConfirmed, true);
  assert.equal(payload.publicationReview.healthChecks.healthCredentialsConfirmed, true);
  assert.match(packageJson.scripts['blog:update-virtual-run-closeout'], new RegExp(`--slug ${CANONICAL_SLUG}`));
});

test('virtual-run closeout guide rejects unsafe or unsupported closing claims', () => {
  const payload = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  const withClaim = (claim) => ({
    ...payload,
    contentText: `${payload.contentText} ${claim}`,
    contentRaw: `${payload.contentText} ${claim}`
  });

  assert.throws(() => validateArticlePayload(withClaim('Every submission will be approved.')), /universal approval/);
  assert.throws(() => validateArticlePayload(withClaim('Pending distance counts as official.')), /approved-only results/);
  assert.throws(() => validateArticlePayload(withClaim('An integrity flag proves fraud.')), /misconduct proof/);
  assert.throws(() => validateArticlePayload(withClaim('Every runner receives a certificate.')), /guarantee recognition/);
  assert.throws(() => validateArticlePayload(withClaim('Accumulated certificates issue immediately on threshold.')), /certificate lifecycle/);
  assert.throws(() => validateArticlePayload(withClaim('Closing the event deletes all records.')), /misstate event closure/);
  assert.throws(() => validateArticlePayload(withClaim('Organizers can reopen a closed event.')), /reopen transition/);
  assert.throws(() => validateArticlePayload(withClaim('Publish proof images in the results.')), /expose private records/);
  assert.throws(() => validateArticlePayload(withClaim('Keep all personal data forever.')), /indiscriminate retention/);
  assert.throws(() => validateArticlePayload(withClaim('This checklist guarantees an error-free closeout.')), /guarantee closeout outcomes/);
  assert.throws(() => buildArticlePayload(), /cover artwork/);
});
