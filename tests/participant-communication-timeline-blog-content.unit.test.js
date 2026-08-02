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
} = require('../src/content/participant-communication-timeline-guide');

const COVER_IMAGE_URL = 'https://cdn.hellorun.online/blog/covers/698f1cb67748262281092639/1785672741077-79846788-participant-communication-timeline-virtual-running-events.webp';
const COVER_IMAGE_PATH = path.join(
  __dirname,
  '..',
  'src',
  'public',
  'images',
  'blog',
  'covers',
  'participant-communication-timeline-virtual-running-events.webp'
);

test('participant communication timeline builds a substantive organizer payload', () => {
  const payload = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  const wordCount = payload.contentText.split(/\s+/).filter(Boolean).length;

  assert.equal(ARTICLE.slug, CANONICAL_SLUG);
  assert.equal(payload.title, 'A Participant Communication Timeline for Virtual Running Events');
  assert.equal(payload.category, 'Organizer Guide');
  assert.ok(BLOG_CATEGORIES.includes(payload.category));
  assert.deepEqual(payload.tags, [
    'event communication', 'virtual run organizer', 'participant updates', 'event timeline',
    'registration messages', 'submission reminders', 'runner support', 'organizer guide'
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
  assert.doesNotMatch(payload.contentHtml, /<h[12]>A Participant Communication Timeline/i);
  assert.match(payload.contentText, /small set of timely, consistent, accessible messages tied to real event states/i);
  assert.match(payload.contentText, /A sent message is evidence of an attempted communication, not proof of comprehension or acceptance/i);
  assert.match(payload.contentText, /Pending evidence is not yet official/i);
  assert.match(payload.contentText, /transactional status message .* is different from promotional communication/i);
  assert.match(payload.contentText, /reviewed in August 2026 against current HelloRun/i);
  assert.match(payload.contentText, /Copy each line into the team’s planning document/i);

  for (const heading of REQUIRED_HEADINGS) {
    assert.ok(payload.contentHtml.includes(`<h2>${heading}</h2>`), `missing required heading: ${heading}`);
  }
  for (const link of REQUIRED_LINKS) {
    assert.ok(payload.contentHtml.includes(link), `missing required link: ${link}`);
  }
});

test('participant communication timeline sanitizes sources and passes publication eligibility', () => {
  const payload = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  const eligibility = evaluateBlogContentEligibility({
    ...payload,
    coverImageUrl: COVER_IMAGE_URL
  }, { evaluatedAt: new Date('2026-08-02T00:00:00.000Z') });

  assert.equal(payload.contentHtml.includes('<script'), false);
  assert.equal(payload.contentHtml.includes('javascript:'), false);
  assert.notEqual(payload.contentHtml, RAW_CONTENT_HTML.trim());
  assert.match(payload.contentHtml, /href="https:\/\/www\.w3\.org\/WAI\/tips\/writing\/" rel="noopener noreferrer" target="_blank"/);
  assert.match(payload.contentHtml, /href="https:\/\/www\.w3\.org\/WAI\/curricula\/content-author-modules\/clear-content\/" rel="noopener noreferrer" target="_blank"/);
  assert.match(payload.contentHtml, /href="https:\/\/www\.w3\.org\/WAI\/tutorials\/forms\/notifications\/" rel="noopener noreferrer" target="_blank"/);
  assert.match(payload.contentHtml, /href="https:\/\/privacy\.gov\.ph\/wp-content\/uploads\/2022\/01\/DPO18-DPA_PCREL\.pdf" rel="noopener noreferrer" target="_blank"/);
  assert.equal(eligibility.eligible, true);
  assert.deepEqual(eligibility.blockingReasons, []);
  assert.equal(eligibility.healthReviewRequired, true);
  assert.ok(eligibility.wordCount >= 3200);
  assert.ok(eligibility.semanticUnitCount >= 3);
  assert.equal(eligibility.externalLinkCount, 4);
});

test('participant communication timeline uses a 1600 by 900 early-series cover', async () => {
  assert.equal(fs.existsSync(COVER_IMAGE_PATH), true);
  const metadata = await sharp(COVER_IMAGE_PATH).metadata();
  assert.equal(metadata.format, 'webp');
  assert.equal(metadata.width, 1600);
  assert.equal(metadata.height, 900);
});

test('participant communication timeline is registered and seeded once for August 8', () => {
  const articleModule = getArticleModule(CANONICAL_SLUG);
  const seededPosts = POSTS.filter((post) => post.slug === CANONICAL_SLUG);
  const seededPost = seededPosts[0];

  assert.equal(articleModule.ARTICLE, ARTICLE);
  assert.ok(listArticleSlugs().includes(CANONICAL_SLUG));
  assert.equal(listArticleSlugs().length, 28);
  assert.equal(seededPosts.length, 1);
  assert.equal(getCanonicalSeed(CANONICAL_SLUG), seededPost);
  assert.equal(buildContentHtml(seededPost), seededPost.contentHtml);
  assert.equal(htmlToText(seededPost.contentHtml), buildArticlePayload({ coverImageUrl: seededPost.coverImageUrl }).contentText);
  assert.equal(seededPost.coverImageUrl, COVER_IMAGE_URL);
  assert.equal(seededPost.ogImageUrl, COVER_IMAGE_URL);
  assert.equal(seededPost.status, 'scheduled');
  assert.equal(seededPost.publishedAt, '2026-08-08T11:00:00.000Z');
  assert.equal(seededPost.featured, false);
  assert.equal(seededPost.authorEmail, GUIDE_AUTHOR_EMAIL);
});

test('participant communication timeline supports exact future scheduling and updates', () => {
  const authorId = new mongoose.Types.ObjectId();
  const reviewedAt = new Date('2026-08-02T13:00:00.000Z');
  const publishAt = '2026-08-08T11:00:00.000Z';
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
  assert.equal(payload.publicationReview.policyVersion, 'ugc-adsense-v1');
  assert.equal(payload.publicationReview.originalityConfirmed, true);
  assert.match(packageJson.scripts['blog:update-participant-communication-timeline'], new RegExp(`--slug ${CANONICAL_SLUG}`));
});

test('participant communication timeline rejects unsupported operational claims', () => {
  const payload = buildArticlePayload({ coverImageUrl: COVER_IMAGE_URL });
  const withClaim = (claim) => ({
    ...payload,
    contentText: `${payload.contentText} ${claim}`,
    contentRaw: `${payload.contentText} ${claim}`
  });

  assert.throws(
    () => validateArticlePayload(withClaim('Every email is delivered.')),
    /message delivery/
  );
  assert.throws(
    () => validateArticlePayload(withClaim('Every participant has read the message.')),
    /comprehension/
  );
  assert.throws(
    () => validateArticlePayload(withClaim('Every submission is automatically approved.')),
    /automatic approval/
  );
  assert.throws(
    () => validateArticlePayload(withClaim('Pending evidence counts as official progress.')),
    /pending evidence/
  );
  assert.throws(
    () => validateArticlePayload(withClaim('Every participant gets a medal.')),
    /recognition/
  );
  assert.throws(
    () => validateArticlePayload(withClaim('Joining the event automatically means marketing consent.')),
    /marketing consent/
  );
  assert.throws(
    () => buildArticlePayload(),
    /cover artwork/
  );
});
