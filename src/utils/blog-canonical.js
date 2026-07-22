const CANONICAL_BLOG_REDIRECTS = Object.freeze({
  'virtual-run-vs-traditional-race': 'virtual-run-vs-traditional-race-which-one-should-you-join',
  'best-running-apps-for-virtual-runs': 'best-apps-to-track-your-virtual-run',
  'how-to-organize-community-virtual-run': 'how-to-organize-a-virtual-run-a-practical-guide-for-event-organizers',
  'what-is-virtual-run-philippines': 'what-is-virtual-run-a-simple-guide-for-runners-and-event-organizers',
  '5k-vs-10k-vs-21k-which-distance-should-you-choose': 'how-to-choose-between-a-5k-10k-21k-or-distance-challenge'
});

const DUPLICATE_BLOG_SLUGS = Object.freeze(Object.keys(CANONICAL_BLOG_REDIRECTS));
const { BLOG_CONTENT_POLICY_VERSION } = require('./blog-content-eligibility');

function normalizeBlogSlug(value) {
  return String(value || '').trim().toLowerCase();
}

function getCanonicalBlogSlug(slug) {
  return CANONICAL_BLOG_REDIRECTS[normalizeBlogSlug(slug)] || '';
}

function getPublicBlogQuery(baseQuery = {}) {
  const query = { ...baseQuery };
  if (!query.slug) {
    query.slug = { $nin: DUPLICATE_BLOG_SLUGS };
    return query;
  }
  if (typeof query.slug === 'object' && !Array.isArray(query.slug)) {
    query.slug = { ...query.slug, $nin: DUPLICATE_BLOG_SLUGS };
  }
  return query;
}

function getEligiblePublicBlogQuery(baseQuery = {}) {
  return getPublicBlogQuery({
    ...baseQuery,
    'contentEligibility.eligible': true,
    'contentEligibility.policyVersion': BLOG_CONTENT_POLICY_VERSION,
    'publicationReview.policyVersion': BLOG_CONTENT_POLICY_VERSION,
    'publicationReview.originalityConfirmed': true,
    $and: [
      ...(Array.isArray(baseQuery.$and) ? baseQuery.$and : []),
      { $expr: { $eq: ['$contentEligibility.sourceHash', '$publicationReview.sourceHash'] } },
      {
        $or: [
          { 'contentEligibility.externalLinkCount': { $lte: 0 } },
          { 'publicationReview.externalLinksConfirmed': true }
        ]
      },
      {
        $or: [
          { 'contentEligibility.healthReviewRequired': { $ne: true } },
          {
            'publicationReview.healthSafetyConfirmed': true,
            'publicationReview.healthChecks.healthExperienceConfirmed': true,
            'publicationReview.healthChecks.healthSourcesConfirmed': true,
            'publicationReview.healthChecks.healthSafetyConfirmed': true,
            'publicationReview.healthChecks.healthCredentialsConfirmed': true
          }
        ]
      }
    ]
  });
}

module.exports = {
  CANONICAL_BLOG_REDIRECTS,
  DUPLICATE_BLOG_SLUGS,
  getCanonicalBlogSlug,
  getEligiblePublicBlogQuery,
  getPublicBlogQuery
};
