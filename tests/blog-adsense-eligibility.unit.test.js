'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  BLOG_CONTENT_POLICY_VERSION,
  buildTrustedEditorialReview,
  evaluateBlogContentEligibility,
  inspectBlogLinks,
  isCurrentEligibleBlog,
  requiresHealthReview,
  sanitizeUserBlogHtml
} = require('../src/utils/blog-content-eligibility');
const {
  buildPublicationReview,
  validateReadyForReview
} = require('../src/controllers/blog/_shared');
const {
  parseArguments: parseBackfillArguments
} = require('../src/scripts/backfill-blog-adsense-eligibility');

const root = path.join(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

function uniqueWords(count, offset = 0) {
  return Array.from({ length: count }, (_, index) => `runnerword${index + offset}`).join(' ');
}

function payloadWithWords(wordCount = 500, units = 3, overrides = {}) {
  const sizes = Array.from({ length: units }, (_, index) => (
    Math.floor(wordCount / units) + (index < wordCount % units ? 1 : 0)
  ));
  let offset = 0;
  const contentHtml = sizes.map((size) => {
    const text = uniqueWords(size, offset);
    offset += size;
    return `<p>${text}</p>`;
  }).join('');
  return {
    title: 'A substantive community running guide',
    excerpt: 'A useful summary for runners preparing for an event.',
    category: 'General',
    customCategory: '',
    coverImageUrl: '/images/cover.webp',
    coverImageAlt: 'Runner preparing for an event',
    galleryImageUrls: [],
    templateKey: 'custom',
    contentBlocks: [],
    contentHtml,
    contentText: uniqueWords(wordCount),
    contentRaw: uniqueWords(wordCount),
    tags: ['running guide'],
    seoTitle: '',
    seoDescription: '',
    ogImageUrl: '',
    status: 'published',
    isDeleted: false,
    ...overrides
  };
}

test('publication eligibility enforces 500 substantive words and three semantic units', () => {
  const below = evaluateBlogContentEligibility(payloadWithWords(499, 3));
  assert.equal(below.eligible, false);
  assert.ok(below.blockingReasons.includes('minimum_500_words'));

  const oneParagraph = evaluateBlogContentEligibility(payloadWithWords(500, 1));
  assert.equal(oneParagraph.eligible, false);
  assert.ok(oneParagraph.blockingReasons.includes('minimum_3_semantic_units'));

  const eligible = evaluateBlogContentEligibility(payloadWithWords(500, 3));
  assert.equal(eligible.eligible, true);
  assert.equal(eligible.wordCount, 500);
  assert.equal(eligible.semanticUnitCount, 3);

  const repeated = payloadWithWords(500, 3, {
    contentHtml: `<p>${'repeat '.repeat(170)}</p><p>${'repeat '.repeat(170)}</p><p>${'repeat '.repeat(160)}</p>`,
    contentText: 'repeat '.repeat(500)
  });
  const repeatedResult = evaluateBlogContentEligibility(repeated);
  assert.equal(repeatedResult.eligible, false);
  assert.ok(repeatedResult.blockingReasons.includes('insufficient_substantive_vocabulary'));
});

test('draft validation remains flexible while review submission uses the hard floor', () => {
  const short = payloadWithWords(120, 3);
  const errors = validateReadyForReview(short);
  assert.ok(errors.some((error) => /500 substantive words/i.test(error)));
  assert.equal(errors.some((error) => /50 characters/i.test(error)), false);
});

test('links allow internal and HTTPS sources while rejecting unsafe destinations', () => {
  const safe = '<p><a href="/events">Events</a> <a href="https://www.who.int/test">WHO</a></p>';
  const inspection = inspectBlogLinks(safe);
  assert.equal(inspection.externalLinks.length, 1);
  assert.deepEqual(inspection.issues, []);
  const sanitized = sanitizeUserBlogHtml(safe);
  assert.match(sanitized, /href="\/events"/);
  assert.match(sanitized, /rel="ugc nofollow noopener noreferrer"/);

  for (const [href, code] of [
    ['http://example.com', 'external_link_must_use_https'],
    ['https://user:pass@example.com', 'credential_bearing_link'],
    ['https://127.0.0.1/path', 'raw_ip_link'],
    ['https://bit.ly/example', 'blocked_shortener_link'],
    ['mailto:runner@example.com', 'external_link_must_use_https']
  ]) {
    assert.ok(inspectBlogLinks(`<a href="${href}">link</a>`).issues.some((issue) => issue.code === code));
  }
});

test('health content requires all conditional confirmations and flagged posts require an override', () => {
  const healthPost = payloadWithWords(500, 3, { category: 'Nutrition' });
  assert.equal(requiresHealthReview(healthPost), true);
  assert.throws(() => buildPublicationReview({
    reviewData: healthPost,
    reviewInput: { originalityConfirmed: true }
  }), /health-content safety confirmation/i);

  const completeReview = buildPublicationReview({
    reviewData: healthPost,
    moderationFlags: ['possible_plagiarism_high_similarity'],
    actorId: 'admin-id',
    reviewInput: {
      originalityConfirmed: true,
      healthExperienceConfirmed: true,
      healthSourcesConfirmed: true,
      healthSafetyConfirmed: true,
      healthCredentialsConfirmed: true,
      overrideReason: 'The matching wording is a correctly attributed event rule excerpt.'
    }
  });
  assert.equal(completeReview.review.healthSafetyConfirmed, true);
  assert.equal(completeReview.review.healthChecks.healthExperienceConfirmed, true);
  assert.deepEqual(completeReview.review.overrideFlags, ['possible_plagiarism_high_similarity']);

  const published = { ...healthPost, status: 'published', isDeleted: false };
  Object.assign(published, buildTrustedEditorialReview(published, 'admin-id'));
  delete published.publicationReview.healthChecks.healthSourcesConfirmed;
  assert.equal(isCurrentEligibleBlog(published), false);
});

test('eligible publication snapshots are hash-bound and include documented review', () => {
  const post = payloadWithWords(500, 3);
  Object.assign(post, buildTrustedEditorialReview(post, 'admin-id', new Date('2026-07-22T00:00:00Z')));
  assert.equal(post.contentEligibility.policyVersion, BLOG_CONTENT_POLICY_VERSION);
  assert.equal(isCurrentEligibleBlog(post), true);
  post.title = 'Content changed after approval';
  assert.equal(isCurrentEligibleBlog(post), false);
});

test('backfill and presentation layers are fail-closed by default', () => {
  assert.deepEqual(parseBackfillArguments([]), { mode: 'dry-run', approveFlaggedEditorial: false });
  assert.deepEqual(parseBackfillArguments(['--apply']), { mode: 'apply', approveFlaggedEditorial: false });
  assert.throws(() => parseBackfillArguments(['--apply', '--dry-run']), /either --apply or --dry-run/i);

  const canonical = read('src/utils/blog-canonical.js');
  const listing = read('src/services/public-blog-list.service.js');
  const publicController = read('src/controllers/page/blog-public.controller.js');
  const authorRoutes = read('src/routes/blog.routes.js');
  const sitemap = read('src/controllers/page/sitemap.controller.js');
  const adminReview = read('src/views/admin/blog-review.ejs');
  const scheduledPublisher = read('src/scripts/publish-scheduled-blogs.js');
  assert.match(canonical, /contentEligibility\.eligible/);
  assert.match(listing, /totalMatchingPosts < 3/);
  assert.match(publicController, /X-Robots-Tag', 'noindex, follow'/);
  assert.match(publicController, /disableAdLocals\(res\)/);
  assert.match(authorRoutes, /X-Robots-Tag', 'noindex, nofollow'/);
  assert.match(sitemap, /getEligiblePublicBlogQuery/);
  for (const field of [
    'originalityConfirmed',
    'externalLinksConfirmed',
    'healthExperienceConfirmed',
    'healthSourcesConfirmed',
    'healthSafetyConfirmed',
    'healthCredentialsConfirmed',
    'overrideReason'
  ]) assert.match(adminReview, new RegExp(`name="${field}"`));
  assert.match(scheduledPublisher, /hasCurrentEligibleContent/);
  assert.match(scheduledPublisher, /hasCurrentPublicationReview/);
});
