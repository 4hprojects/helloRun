const CANONICAL_BLOG_REDIRECTS = Object.freeze({
  'virtual-run-vs-traditional-race': 'virtual-run-vs-traditional-race-which-one-should-you-join',
  'best-running-apps-for-virtual-runs': 'best-apps-to-track-your-virtual-run',
  'how-to-organize-community-virtual-run': 'how-to-organize-a-virtual-run-a-practical-guide-for-event-organizers'
});

const DUPLICATE_BLOG_SLUGS = Object.freeze(Object.keys(CANONICAL_BLOG_REDIRECTS));

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

module.exports = {
  CANONICAL_BLOG_REDIRECTS,
  DUPLICATE_BLOG_SLUGS,
  getCanonicalBlogSlug,
  getPublicBlogQuery
};
