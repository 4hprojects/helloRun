'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const Blog = require('../src/models/Blog');
const { INDEX_CANDIDATE_SLUGS, NOINDEX_SLUGS, HEALTH_SAFETY_SLUGS } = require('../src/content/adsense-content-indexing');
const { evaluateBlogContentEligibility, buildTrustedEditorialReview } = require('../src/utils/blog-content-eligibility');
const {
  buildIndexingDecision,
  hasCompleteExpertReviewer,
  hasCurrentIndexingReview,
  isSearchIndexableBlog
} = require('../src/utils/blog-indexing');

test('missing indexing review has no expert reviewer', () => {
  assert.equal(hasCompleteExpertReviewer(null), false);
});

function substantivePost(overrides = {}) {
  const words = Array.from({ length: 520 }, (_, index) => `platformword${index}`).join(' ');
  return {
    title: 'A first-party HelloRun workflow guide',
    excerpt: 'A documented guide to a first-party HelloRun event workflow.',
    category: 'Organizer Guide',
    customCategory: '',
    coverImageUrl: 'https://cdn.hellorun.online/guide.webp',
    contentHtml: `<p>${words}</p><p>${words}</p><p>${words}</p>`,
    contentText: words,
    status: 'published',
    isDeleted: false,
    ...overrides
  };
}

test('Blog defaults new content to general risk and noindex', () => {
  const post = new Blog({ title: 'Draft', slug: 'draft', contentHtml: '<p>Draft</p>', contentText: 'Draft', authorId: new mongoose.Types.ObjectId() });
  assert.equal(post.contentRisk, 'general');
  assert.equal(post.searchIndexingStatus, 'noindex');
  assert.equal(post.searchIndexingReason, 'pending_value_review');
  assert.equal(post.indexingReview, null);
});

test('general indexing requires a completed human review bound to the source hash', () => {
  const actorId = new mongoose.Types.ObjectId();
  const post = substantivePost({ contentRisk: 'general' });
  Object.assign(post, buildTrustedEditorialReview(post, actorId));
  const decision = buildIndexingDecision({
    reviewData: post,
    actorId,
    reviewInput: {
      contentRisk: 'general',
      searchIndexingApproved: 'on',
      valueBasis: 'first_party_platform',
      evidenceNote: 'This guide documents the actual HelloRun organizer workflow and its review controls.'
    }
  });
  Object.assign(post, decision);
  assert.equal(hasCurrentIndexingReview(post), true);
  assert.equal(isSearchIndexableBlog(post), true);

  post.title = 'Changed after indexing approval';
  assert.equal(hasCurrentIndexingReview(post), false);
  assert.equal(isSearchIndexableBlog(post), false);
});

test('health and safety indexing requires publicly displayable qualified reviewer details', () => {
  const actorId = new mongoose.Types.ObjectId();
  const post = substantivePost({ contentRisk: 'health_safety' });
  const eligibility = evaluateBlogContentEligibility(post);
  assert.equal(eligibility.healthReviewRequired, true);
  assert.throws(() => buildIndexingDecision({
    reviewData: { ...post, contentEligibility: eligibility },
    actorId,
    reviewInput: {
      contentRisk: 'health_safety',
      searchIndexingApproved: true,
      valueBasis: 'qualified_expert_review',
      evidenceNote: 'A qualified reviewer checked the safety claims and limitations in this article.'
    }
  }), /named qualified reviewer/i);

  const decision = buildIndexingDecision({
    reviewData: { ...post, contentEligibility: eligibility },
    actorId,
    reviewInput: {
      contentRisk: 'health_safety',
      searchIndexingApproved: true,
      valueBasis: 'qualified_expert_review',
      evidenceNote: 'A qualified reviewer checked the safety claims and limitations in this article.',
      expertReviewerName: 'Qualified Reviewer',
      expertReviewerCredentials: 'Licensed physician',
      expertReviewerOrganization: 'Example Clinic',
      expertReviewerProfileUrl: 'https://example.com/reviewer',
      expertReviewedAt: '2026-08-29'
    }
  });
  assert.equal(decision.searchIndexingStatus, 'index');
  assert.equal(decision.indexingReview.expertReviewer.name, 'Qualified Reviewer');
});

test('initial migration manifest contains exactly the approved 22 indexed and 45 noindex guides', () => {
  assert.equal(INDEX_CANDIDATE_SLUGS.length, 22);
  assert.equal(NOINDEX_SLUGS.length, 45);
  assert.equal(new Set([...INDEX_CANDIDATE_SLUGS, ...NOINDEX_SLUGS]).size, 67);
  assert.ok(HEALTH_SAFETY_SLUGS.every((slug) => NOINDEX_SLUGS.includes(slug)));
});
