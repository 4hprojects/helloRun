'use strict';

const { buildBlogContentSourceHash, hasCurrentEligibleContent, hasCurrentPublicationReview } = require('./blog-content-eligibility');

const CONTENT_RISKS = Object.freeze(['general', 'health_safety']);
const SEARCH_INDEXING_STATUSES = Object.freeze(['index', 'noindex']);
const SEARCH_INDEXING_REASONS = Object.freeze([
  'first_party_value',
  'pending_value_review',
  'pending_expert_review',
  'consolidated'
]);
const VALUE_BASES = Object.freeze([
  'first_party_platform',
  'original_reporting',
  'documented_experience',
  'qualified_expert_review'
]);
const MIN_EVIDENCE_NOTE_LENGTH = 40;

function isAffirmative(value) {
  return value === true || value === 'true' || value === '1' || value === 'on';
}

function normalizeContentRisk(value) {
  return CONTENT_RISKS.includes(String(value || '').trim()) ? String(value).trim() : 'general';
}

function hasCompleteExpertReviewer(review = {}) {
  const expert = review.expertReviewer || {};
  return Boolean(
    String(expert.name || '').trim()
    && String(expert.credentials || '').trim()
    && expert.reviewedAt
    && Number.isFinite(new Date(expert.reviewedAt).getTime())
  );
}

function hasCurrentIndexingReview(post = {}) {
  const review = post.indexingReview || {};
  const risk = normalizeContentRisk(post.contentRisk);
  const sourceHash = buildBlogContentSourceHash(post);
  if (
    post.searchIndexingStatus !== 'index'
    || post.searchIndexingReason !== 'first_party_value'
    || !VALUE_BASES.includes(String(review.valueBasis || ''))
    || String(review.evidenceNote || '').trim().length < MIN_EVIDENCE_NOTE_LENGTH
    || !review.reviewedBy
    || !review.reviewedAt
    || !review.sourceHash
    || post.contentEligibility?.sourceHash !== sourceHash
    || review.sourceHash !== sourceHash
  ) return false;
  if (risk === 'health_safety') return hasCompleteExpertReviewer(review);
  return true;
}

function isSearchIndexableBlog(post = {}) {
  return Boolean(
    post.status === 'published'
    && post.isDeleted !== true
    && hasCurrentEligibleContent(post)
    && hasCurrentPublicationReview(post)
    && hasCurrentIndexingReview(post)
  );
}

function buildIndexingDecision({ reviewData = {}, reviewInput = {}, actorId = null, reviewedAt = new Date() } = {}) {
  const contentRisk = normalizeContentRisk(reviewInput.contentRisk || reviewData.contentRisk);
  const requested = isAffirmative(reviewInput.searchIndexingApproved);
  if (!requested) {
    return {
      contentRisk,
      searchIndexingStatus: 'noindex',
      searchIndexingReason: contentRisk === 'health_safety' ? 'pending_expert_review' : 'pending_value_review',
      indexingReview: null
    };
  }

  const valueBasis = String(reviewInput.valueBasis || '').trim();
  const evidenceNote = String(reviewInput.evidenceNote || '').trim();
  const errors = [];
  if (!VALUE_BASES.includes(valueBasis)) errors.push('Choose a valid content-value basis before approving search indexing.');
  if (evidenceNote.length < MIN_EVIDENCE_NOTE_LENGTH || evidenceNote.length > 1000) {
    errors.push(`Indexing evidence must be ${MIN_EVIDENCE_NOTE_LENGTH}–1000 characters.`);
  }

  const expertReviewer = {
    name: String(reviewInput.expertReviewerName || '').trim(),
    credentials: String(reviewInput.expertReviewerCredentials || '').trim(),
    organization: String(reviewInput.expertReviewerOrganization || '').trim(),
    profileUrl: String(reviewInput.expertReviewerProfileUrl || '').trim(),
    reviewedAt: reviewInput.expertReviewedAt ? new Date(reviewInput.expertReviewedAt) : null
  };
  if (expertReviewer.profileUrl) {
    try {
      if (new URL(expertReviewer.profileUrl).protocol !== 'https:') errors.push('Expert reviewer profile URL must use HTTPS.');
    } catch (_) {
      errors.push('Expert reviewer profile URL must be a valid HTTPS URL.');
    }
  }
  if (contentRisk === 'health_safety' && !hasCompleteExpertReviewer({ expertReviewer })) {
    errors.push('Health and safety content requires a named qualified reviewer, credentials, and review date before indexing.');
  }
  if (errors.length) {
    const error = new Error(errors.join(' '));
    error.name = 'BlogIndexingReviewError';
    error.status = 400;
    error.validationErrors = errors;
    throw error;
  }

  return {
    contentRisk,
    searchIndexingStatus: 'index',
    searchIndexingReason: 'first_party_value',
    indexingReview: {
      sourceHash: reviewData.contentEligibility?.sourceHash || buildBlogContentSourceHash(reviewData),
      valueBasis,
      evidenceNote,
      reviewedBy: actorId || null,
      reviewedAt: new Date(reviewedAt),
      expertReviewer: contentRisk === 'health_safety' ? expertReviewer : null
    }
  };
}

function invalidateIndexingReview(post, reason) {
  const risk = normalizeContentRisk(post?.contentRisk);
  post.searchIndexingStatus = 'noindex';
  post.searchIndexingReason = reason || (risk === 'health_safety' ? 'pending_expert_review' : 'pending_value_review');
  post.indexingReview = null;
  return post;
}

function getSearchIndexingQuery() {
  return {
    searchIndexingStatus: 'index',
    searchIndexingReason: 'first_party_value',
    'indexingReview.valueBasis': { $in: VALUE_BASES },
    'indexingReview.evidenceNote': { $type: 'string', $regex: /\S/ },
    'indexingReview.reviewedBy': { $ne: null },
    'indexingReview.reviewedAt': { $ne: null },
    $and: [
      { $expr: { $eq: ['$contentEligibility.sourceHash', '$indexingReview.sourceHash'] } },
      {
        $expr: {
          $gte: [
            { $strLenCP: { $convert: { input: '$indexingReview.evidenceNote', to: 'string', onError: '', onNull: '' } } },
            MIN_EVIDENCE_NOTE_LENGTH
          ]
        }
      }
    ],
    $or: [
      { contentRisk: { $ne: 'health_safety' } },
      {
        contentRisk: 'health_safety',
        'indexingReview.expertReviewer.name': { $type: 'string', $regex: /\S/ },
        'indexingReview.expertReviewer.credentials': { $type: 'string', $regex: /\S/ },
        'indexingReview.expertReviewer.reviewedAt': { $ne: null }
      }
    ]
  };
}

module.exports = {
  CONTENT_RISKS,
  SEARCH_INDEXING_REASONS,
  SEARCH_INDEXING_STATUSES,
  VALUE_BASES,
  MIN_EVIDENCE_NOTE_LENGTH,
  buildIndexingDecision,
  getSearchIndexingQuery,
  hasCompleteExpertReviewer,
  hasCurrentIndexingReview,
  invalidateIndexingReview,
  isSearchIndexableBlog,
  normalizeContentRisk
};
