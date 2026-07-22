const Blog = require('../models/Blog');
const User = require('../models/User');
const { BLOG_CATEGORIES } = require('../utils/blog');
const { getEligiblePublicBlogQuery } = require('../utils/blog-canonical');
const { getTopWriters } = require('./blog-top-writers.service');
const { formatBlogAuthorName } = require('../utils/blog-author');

const BLOG_PAGE_SIZE = 12;
const BLOG_SORTS = new Set(['latest', 'oldest', 'popular']);
const BLOG_AUTHOR_FIELDS = 'displayName firstName lastName avatarUrl verifiedAuthor trustScore';
const BLOG_CARD_FIELDS = 'title slug excerpt category customCategory tags coverImageUrl readingTime views trendingScore likesCount commentsCount featured publishedAt createdAt';

async function buildPublicBlogListPage(queryParams = {}, options = {}) {
  const filters = getBlogFilterValues(queryParams);
  const listingKind = String(options.listingKind || '').trim();
  const baseUrl = String(options.baseUrl || '').trim().replace(/\/+$/, '');
  const query = getEligiblePublicBlogQuery({ status: 'published', isDeleted: { $ne: true } });

  if (filters.category) query.category = filters.category;
  if (filters.author) query.authorId = filters.author;
  if (filters.q) {
    const safePattern = new RegExp(escapeRegex(filters.q), 'i');
    query.$or = [
      { title: safePattern },
      { excerpt: safePattern },
      { contentText: safePattern },
      { tags: safePattern },
      { category: safePattern },
      { customCategory: safePattern }
    ];
  }

  const requestedPage = normalizePositiveInt(queryParams.page, 1);
  const hasDiscoveryFilters = Boolean(filters.q || filters.category || filters.author);
  const spotlightQuery = hasDiscoveryFilters
    ? null
    : Blog.findOne({ ...query, featured: true })
      .populate('authorId', BLOG_AUTHOR_FIELDS)
      .sort({ trendingScore: -1, likesCount: -1, commentsCount: -1, views: -1, publishedAt: -1, _id: -1 })
      .select(BLOG_CARD_FIELDS)
      .lean();

  const [spotlightCandidate, availableCategoriesRaw, selectedAuthorUser] = await Promise.all([
    spotlightQuery || Promise.resolve(null),
    Blog.distinct('category', getEligiblePublicBlogQuery({ status: 'published', isDeleted: { $ne: true } })),
    filters.author
      ? User.findById(filters.author).select(BLOG_AUTHOR_FIELDS).lean()
      : Promise.resolve(null)
  ]);

  const feedQuery = spotlightCandidate
    ? { ...query, _id: { $ne: spotlightCandidate._id } }
    : query;
  const [totalMatchingPosts, totalFeedPosts] = await Promise.all([
    Blog.countDocuments(query),
    Blog.countDocuments(feedQuery)
  ]);
  const totalPages = Math.max(1, Math.ceil(totalFeedPosts / BLOG_PAGE_SIZE));
  const currentPage = Math.min(requestedPage, totalPages);
  const skip = (currentPage - 1) * BLOG_PAGE_SIZE;

  const posts = await Blog.find(feedQuery)
    .populate('authorId', BLOG_AUTHOR_FIELDS)
    .sort(getBlogSortDefinition(filters.sort))
    .skip(skip)
    .limit(BLOG_PAGE_SIZE)
    .select(BLOG_CARD_FIELDS)
    .lean();

  const showCommunityModules = !hasDiscoveryFilters && currentPage === 1;
  const topWriters = showCommunityModules
    ? await getTopWriters({ limit: 5 })
    : [];
  const authorName = selectedAuthorUser
    ? formatAuthorName(selectedAuthorUser)
    : '';
  const normalizedFilters = { ...filters, authorName };
  const activeFilters = getBlogActiveFilters(normalizedFilters);
  const hasActiveFilters = activeFilters.length > 0;
  const isThinFilteredListing = totalMatchingPosts < 3;
  const spotlight = showCommunityModules && spotlightCandidate
    ? normalizeBlogCard(spotlightCandidate)
    : null;
  const pageContent = getBlogPageContent(normalizedFilters, { currentPage });

  return {
    title: pageContent.documentTitle,
    pageContent,
    posts: posts.map(normalizeBlogCard),
    spotlight,
    topWriters: topWriters.map(normalizeTopWriter),
    categories: BLOG_CATEGORIES.filter((category) => availableCategoriesRaw.includes(category)),
    filters: normalizedFilters,
    filterMeta: {
      hasActiveFilters,
      activeFilterCount: activeFilters.length,
      activeFilters,
      totalPosts: totalMatchingPosts,
      adSafe: !isThinFilteredListing,
      authorName,
      clearFiltersUrl: buildBlogPageUrl(getClearedBlogFilters(filters), 1),
      summary: buildBlogResultsSummary(normalizedFilters, totalMatchingPosts)
    },
    pagination: {
      currentPage,
      totalPages,
      totalPosts: totalFeedPosts,
      resultStart: totalFeedPosts ? skip + 1 : 0,
      resultEnd: totalFeedPosts ? Math.min(skip + posts.length, totalFeedPosts) : 0,
      getPageUrl: (pageNumber) => `${buildBlogPageUrl(filters, pageNumber)}#blog-results`
    },
    seo: {
      description: pageContent.description,
      canonicalUrl: buildBlogCanonicalUrl(filters, currentPage, baseUrl),
      robots: isThinFilteredListing ? 'noindex, follow' : ''
    },
    isThinFilteredListing
  };
}

function getBlogFilterValues(query = {}) {
  const q = String(query.q || '').trim().slice(0, 80);
  const categoryValue = String(query.category || '').trim();
  const authorValue = String(query.author || '').trim();
  return {
    q,
    category: BLOG_CATEGORIES.includes(categoryValue) ? categoryValue : '',
    author: /^[a-f\d]{24}$/i.test(authorValue) ? authorValue : '',
    sort: normalizeBlogSort(query.sort)
  };
}

function normalizeBlogSort(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return BLOG_SORTS.has(normalized) ? normalized : 'latest';
}

function getBlogSortDefinition(sort) {
  if (sort === 'oldest') return { publishedAt: 1, createdAt: 1, _id: 1 };
  if (sort === 'popular') {
    return {
      trendingScore: -1,
      likesCount: -1,
      commentsCount: -1,
      views: -1,
      publishedAt: -1,
      _id: -1
    };
  }
  return { publishedAt: -1, createdAt: -1, _id: -1 };
}

function normalizeBlogCard(post = {}) {
  const author = post.authorId || {};
  const categoryLabel = post.category === 'Other' && post.customCategory
    ? post.customCategory
    : post.category || 'Community';
  return {
    ...post,
    href: `/blog/${post.slug}`,
    categoryLabel,
    author: {
      id: String(author._id || ''),
      name: formatAuthorName(author),
      avatarUrl: String(author.avatarUrl || ''),
      verified: Boolean(author.verifiedAuthor),
      trustScore: typeof author.trustScore === 'number' ? author.trustScore : null
    },
    readingTimeLabel: `${Math.max(1, Number(post.readingTime || 1))} min read`,
    viewsLabel: formatCount(post.views),
    likesLabel: formatCount(post.likesCount),
    commentsLabel: formatCount(post.commentsCount)
  };
}

function normalizeTopWriter(writer = {}) {
  return {
    authorId: String(writer.authorId || ''),
    name: formatAuthorName(writer),
    avatarUrl: String(writer.avatarUrl || ''),
    verified: Boolean(writer.verifiedAuthor),
    publishedCount: Number(writer.publishedCount || 0),
    totalLikes: Number(writer.totalLikes || 0),
    href: buildBlogPageUrl({ author: String(writer.authorId || ''), sort: 'latest' }, 1)
  };
}

function getBlogActiveFilters(filters = {}) {
  const active = [];
  if (filters.q) {
    active.push({ key: 'q', label: 'Search', value: filters.q, removeUrl: buildBlogPageUrl({ ...filters, q: '' }, 1) });
  }
  if (filters.category) {
    active.push({ key: 'category', label: 'Topic', value: filters.category, removeUrl: buildBlogPageUrl({ ...filters, category: '' }, 1) });
  }
  if (filters.author) {
    active.push({ key: 'author', label: 'Writer', value: filters.authorName || 'Selected writer', removeUrl: buildBlogPageUrl({ ...filters, author: '' }, 1) });
  }
  return active;
}

function getClearedBlogFilters(filters = {}) {
  return { q: '', category: '', author: '', sort: normalizeBlogSort(filters.sort) };
}

function buildBlogPageUrl(filters = {}, page = 1) {
  const normalized = {
    q: String(filters.q || '').trim(),
    category: String(filters.category || '').trim(),
    author: String(filters.author || '').trim(),
    sort: normalizeBlogSort(filters.sort)
  };
  const params = new URLSearchParams();
  if (normalized.q) params.set('q', normalized.q);
  if (normalized.category) params.set('category', normalized.category);
  if (normalized.author) params.set('author', normalized.author);
  if (normalized.sort !== 'latest') params.set('sort', normalized.sort);
  const normalizedPage = normalizePositiveInt(page, 1);
  if (normalizedPage > 1) params.set('page', String(normalizedPage));
  const query = params.toString();
  return query ? `/blog?${query}` : '/blog';
}

function buildBlogCanonicalUrl(filters = {}, page = 1, baseUrl = '') {
  const canonicalFilters = { ...filters, sort: 'latest' };
  const path = buildBlogPageUrl(canonicalFilters, page);
  return baseUrl ? `${String(baseUrl).replace(/\/+$/, '')}${path}` : '';
}

function getBlogPageContent(filters = {}, pagination = {}) {
  const pageSuffix = pagination.currentPage > 1 ? ` — Page ${pagination.currentPage}` : '';
  if (filters.q) {
    return {
      heading: `Stories matching “${filters.q}”`,
      supportCopy: 'Fresh perspectives and practical ideas from the HelloRun community.',
      documentTitle: `Search: ${filters.q}${pageSuffix} - HelloRun Community`,
      description: `Read HelloRun community posts matching ${filters.q}.`
    };
  }
  if (filters.category) {
    return {
      heading: `${filters.category} stories`,
      supportCopy: 'Experiences, advice, and conversations shared by runners and organisers.',
      documentTitle: `${filters.category}${pageSuffix} - HelloRun Community`,
      description: `Explore ${filters.category} stories from the HelloRun community.`
    };
  }
  if (filters.author) {
    const authorName = filters.authorName || 'Community writer';
    return {
      heading: `Stories by ${authorName}`,
      supportCopy: 'Follow this writer’s experiences, advice, and running perspective.',
      documentTitle: `${authorName}${pageSuffix} - HelloRun Community`,
      description: `Read community stories by ${authorName} on HelloRun.`
    };
  }
  return {
    heading: 'Stories from the running community',
    supportCopy: 'Read real experiences, practical advice, and fresh perspectives—or share your own.',
    documentTitle: `Runner Stories & Guides${pageSuffix} - HelloRun`,
    description: 'Read running stories, practical guides, and community perspectives from HelloRun runners and organisers.'
  };
}

function buildBlogResultsSummary(filters = {}, total = 0) {
  const count = Number(total || 0);
  if (filters.q) return `${count} ${count === 1 ? 'story' : 'stories'} matching “${filters.q}”`;
  if (filters.category) return `${count} ${filters.category} ${count === 1 ? 'story' : 'stories'}`;
  if (filters.authorName) return `${count} ${count === 1 ? 'story' : 'stories'} by ${filters.authorName}`;
  return `${count} community ${count === 1 ? 'story' : 'stories'}`;
}

function formatAuthorName(author = {}) {
  return formatBlogAuthorName(author);
}

function formatCount(value) {
  return Math.max(0, Number(value || 0)).toLocaleString('en-US');
}

function normalizePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = {
  BLOG_PAGE_SIZE,
  buildPublicBlogListPage,
  getBlogFilterValues,
  normalizeBlogSort,
  getBlogSortDefinition,
  normalizeBlogCard,
  normalizeTopWriter,
  getBlogActiveFilters,
  getClearedBlogFilters,
  buildBlogPageUrl,
  buildBlogCanonicalUrl,
  getBlogPageContent,
  buildBlogResultsSummary
};
