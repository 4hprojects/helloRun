'use strict';

const {
  crypto,
  Event,
  User,
  Registration,
  Submission,
  OrganiserApplication,
  Blog,
  BlogLike,
  communicationService,
  registerBlogView,
  getRunnerRegistrations,
  listPolicyDocuments,
  uploadService,
  getCountries,
  isValidCountryCode,
  normalizeCountryCode,
  getCountryName,
  BLOG_CATEGORIES,
  renderWaiverTemplate,
  assertRunDateNotFuture,
  parseRunDateOnly,
  isRunDateAlignedWithEvent,
  canRunnerSubmitPaymentProof,
  getInitialRegistrationPaymentStatus,
  createSubmission,
  editRejectedSubmissionMetadata,
  resubmitSubmission,
  getRunnerSubmissions,
  getRunnerPerformanceSnapshot,
  PERSONAL_RECORD_REGISTRATION_ID,
  AccumulatedActivitySubmission,
  createAccumulatedActivitySubmission,
  getAccumulatedActivitiesForRegistrations,
  buildAccumulatedProgress,
  acquireSubmissionIdempotencyLock,
  buildPaymentProofIdempotencyKey,
  buildProofSubmissionIdempotencyKey,
  resolveAccumulatedTargetDistanceKm,
  evaluateRegistrationAchievementsInBackground,
  getRunnerEarnedBadges,
  loadPublicBadgeVerification,
  getLeaderboardDiscoveryData,
  getEventLeaderboard,
  getMyStanding,
  buildPublicEventSeo,
  buildPublicEventView,
  renderEventDetailsContent,
  getCustomizedRegistrationOptions,
  getRegistrationPackageOptions,
  getRaceCategoryOptions,
  resolveRegistrationPrice,
  getEventBadgesByMongoEventId,
  listProductsByMongoEventId,
  recalculateOrderTotals,
  buildPublicEventListPage,
  listHomepagePromotedEvents,
  getEventCardDisplayState,
  getHomepageCarouselSettings,
  getPostgresClient,
  getPublicEventVisibilityQuery,
  logger,
  recordSyncFailureInBackground,
  recordCriticalAuditEventInBackground,
  countries,
  getAppBaseUrl,
  getSitemapBaseUrl,
  escapeXml,
  buildRegistrationOrderNote,
  formatDateOnly,
  getPublishedEventBySlug,
  renderEventNotFound
} = require('./_shared');

// Blog category page
exports.getBlogCategoryPage = async (req, res) => {
  const categorySlug = String(req.params.categorySlug || '').trim().toLowerCase();
  const categoryMap = (BLOG_CATEGORIES || []).reduce((acc, cat) => {
    acc[(cat.slug || cat.toLowerCase().replace(/\s+/g, '-'))] = cat;
    return acc;
  }, {});
  const category = categoryMap[categorySlug] || null;
  if (!category) {
    return res.status(404).render('error', {
      title: '404 - Category Not Found',
      status: 404,
      message: 'This blog category does not exist.'
    });
  }
  req.query.category = category;
  req.blogListingKind = 'category';
  return exports.getBlogList(req, res);
};

// Blog tag page
exports.getBlogTagPage = async (req, res) => {
  const tagSlug = String(req.params.tagSlug || '').trim().toLowerCase();
  if (!tagSlug) {
    return res.status(404).render('error', {
      title: '404 - Tag Not Found',
      status: 404,
      message: 'This blog tag does not exist.'
    });
  }
  // Add tag filter to query
  req.query.q = tagSlug;
  req.blogListingKind = 'tag';
  return exports.getBlogList(req, res);
};

exports.getBlogList = async (req, res) => {
  try {
    const query = {
      status: 'published',
      isDeleted: { $ne: true }
    };
    const searchQuery = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 80) : '';
    const selectedCategory = normalizeBlogCategory(req.query.category);
    const selectedAuthor = normalizeObjectIdString(req.query.author);
    const selectedSort = normalizeBlogSort(req.query.sort);
    const page = normalizePositiveInt(req.query.page, 1);
    const limit = 12;

    if (selectedCategory) {
      query.category = selectedCategory;
    }
    if (selectedAuthor) {
      query.authorId = selectedAuthor;
    }
    if (searchQuery) {
      const safePattern = new RegExp(escapeRegex(searchQuery), 'i');
      query.$or = [
        { title: safePattern },
        { excerpt: safePattern },
        { contentText: safePattern },
        { tags: safePattern },
        { category: safePattern },
        { customCategory: safePattern }
      ];
    }

    const sortMap = {
      latest: { publishedAt: -1, createdAt: -1 },
      oldest: { publishedAt: 1, createdAt: 1 },
      popular: { views: -1, publishedAt: -1 }
    };
    const shouldShowFeatured = page === 1;
    const [featuredPostsRaw, availableCategoriesRaw] = await Promise.all([
      shouldShowFeatured
        ? Blog.find({ ...query, featured: true })
        .populate('authorId', 'firstName lastName')
        .sort({ views: -1, likesCount: -1, commentsCount: -1, publishedAt: -1 })
        .limit(3)
        .select('title slug excerpt category customCategory tags coverImageUrl readingTime views likesCount commentsCount featured publishedAt createdAt')
        : Promise.resolve([]),
      Blog.distinct('category', {
        status: 'published',
        isDeleted: { $ne: true }
      })
    ]);
    const featuredPosts = featuredPostsRaw;
    const featuredIds = featuredPosts.map((post) => post._id);
    const postsQuery = featuredIds.length ? { ...query, _id: { $nin: featuredIds } } : query;
    const totalPosts = await Blog.countDocuments(postsQuery);
    const totalPages = Math.max(1, Math.ceil(totalPosts / limit));
    const currentPage = Math.min(page, totalPages);
    const skip = (currentPage - 1) * limit;

    const posts = await Blog.find(postsQuery)
      .populate('authorId', 'firstName lastName')
      .sort(sortMap[selectedSort])
      .skip(skip)
      .limit(limit)
      .select('title slug excerpt category customCategory tags coverImageUrl readingTime views likesCount commentsCount featured publishedAt createdAt');

    const baseUrl = getAppBaseUrl();
    const canonicalQuery = new URLSearchParams();
    if (searchQuery) canonicalQuery.set('q', searchQuery);
    if (selectedCategory) canonicalQuery.set('category', selectedCategory);
    if (selectedAuthor) canonicalQuery.set('author', selectedAuthor);
    if (selectedSort !== 'latest') canonicalQuery.set('sort', selectedSort);
    if (currentPage > 1) canonicalQuery.set('page', String(currentPage));
    const canonicalPath = canonicalQuery.toString() ? `/blog?${canonicalQuery.toString()}` : '/blog';
    const canonicalUrl = baseUrl ? `${baseUrl}${canonicalPath}` : '';

    const selectedAuthorUser = selectedAuthor
      ? await User.findById(selectedAuthor).select('firstName lastName').lean()
      : null;
    const hasActiveFilters = Boolean(searchQuery || selectedCategory || selectedAuthor || selectedSort !== 'latest' || currentPage > 1);
    const isThinFilteredListing = Boolean(req.blogListingKind && totalPosts < 3);
    if (isThinFilteredListing) {
      res.setHeader('X-Robots-Tag', 'noindex, follow');
      disableAdLocals(res);
    }

    return res.render('pages/blog', {
      title: 'Blog - HelloRun',
      posts,
      featuredPosts,
      categories: BLOG_CATEGORIES.filter((category) => availableCategoriesRaw.includes(category)),
      filters: {
        q: searchQuery,
        category: selectedCategory,
        author: selectedAuthor,
        sort: selectedSort
      },
      filterMeta: {
        hasActiveFilters,
        totalPosts,
        adSafe: !isThinFilteredListing,
        authorName: selectedAuthorUser ? `${selectedAuthorUser.firstName || ''} ${selectedAuthorUser.lastName || ''}`.trim() : ''
      },
      pagination: {
        currentPage,
        totalPages,
        totalPosts
      },
      seo: {
        description: 'Explore running tips, race recaps, and training stories from the HelloRun community.',
        canonicalUrl,
        robots: isThinFilteredListing ? 'noindex, follow' : ''
      }
    });
  } catch (error) {
    logger.error('Error loading blog list:', error);
    return res.status(500).render('error', {
      title: 'Server Error',
      status: 500,
      message: 'An error occurred while loading blog posts.'
    });
  }
};

function disableAdLocals(res) {
  const ads = res.locals.ads || {};
  res.locals.ads = {
    ...ads,
    renderScript: false,
    canRender: () => false
  };
}

exports.getBlogPost = async (req, res) => {
  try {
    const slug = String(req.params.slug || '').trim();
    if (!slug) {
      return res.status(404).render('error', {
        title: '404 - Post Not Found',
        status: 404,
        message: 'This blog post is not available.'
      });
    }

    const post = await Blog.findOne({
      slug,
      status: 'published',
      isDeleted: { $ne: true }
    })
      .populate('authorId', 'firstName lastName');

    if (!post) {
      return res.status(404).render('error', {
        title: '404 - Post Not Found',
        status: 404,
        message: 'This blog post is not available.'
      });
    }

    const currentUser = res.locals.user || null;
    const currentUserId = currentUser?._id || null;
    const shouldTrackView = shouldTrackBlogView({
      currentUser,
      postAuthorId: post.authorId?._id || post.authorId
    });
    if (shouldTrackView) {
      const requestIp = getRequestIp(req);
      try {
        const didCount = await registerBlogView({
          blogId: post._id,
          userId: currentUser?._id || null,
          ipAddress: requestIp
        });
        if (didCount) {
          post.views = Number(post.views || 0) + 1;
        }
      } catch (viewError) {
        logger.error('Blog view tracking failed:', viewError.message);
      }
    }

    const relatedPosts = await Blog.find({
      _id: { $ne: post._id },
      status: 'published',
      isDeleted: { $ne: true },
      $or: [
        { category: post.category },
        { tags: { $in: post.tags || [] } }
      ]
    })
      .sort({ publishedAt: -1 })
      .limit(4)
      .select('title slug category customCategory coverImageUrl publishedAt');

    const baseUrl = getAppBaseUrl();
    const canonicalUrl = baseUrl ? `${baseUrl}/blog/${post.slug}` : '';
    const metaDescription = String(post.seoDescription || post.excerpt || '')
      .trim()
      .slice(0, 280) || 'Read this HelloRun community blog post.';
    const seoTitle = String(post.seoTitle || post.title || '').trim();
    const ogImage = String(post.ogImageUrl || post.coverImageUrl || '').trim();
    const likedByCurrentUser = currentUserId
      ? Boolean(await BlogLike.exists({ blogId: post._id, userId: currentUserId }))
      : false;
    const authorName = [post.authorId?.firstName, post.authorId?.lastName].filter(Boolean).join(' ').trim() || 'HelloRun';
    const authorBio = authorName.toLowerCase().includes('henz')
      ? 'Henz writes HelloRun guides for runners and event organizers, focusing on virtual race setup, proof submission, beginner-friendly running, and community fitness events in the Philippines.'
      : 'HelloRun publishes practical guides for runners and event organizers, with a focus on virtual runs, proof submission, leaderboards, and community fitness events.';

    return res.render('pages/blog-post', {
      title: `${post.title} - HelloRun Blog`,
      post,
      authorDisplay: {
        name: authorName,
        bio: authorBio
      },
      blogContentParts: splitBlogContentForAd(post.contentHtml || ''),
      relatedPosts,
      interactionState: {
        likedByCurrentUser,
        isAuthenticated: Boolean(currentUserId),
        currentUserId: currentUserId ? String(currentUserId) : '',
        reportReasons: ['spam', 'plagiarism', 'promotion', 'unsafe_medical', 'abuse', 'other']
      },
      seo: {
        ogType: 'article',
        description: metaDescription,
        canonicalUrl,
        ogTitle: seoTitle || `${post.title} - HelloRun Blog`,
        twitterTitle: seoTitle || `${post.title} - HelloRun Blog`,
        ogImage: ogImage || ''
      }
    });
  } catch (error) {
    logger.error('Error loading blog post:', error);
    return res.status(500).render('error', {
      title: 'Server Error',
      status: 500,
      message: 'An error occurred while loading the blog post.'
    });
  }
};

function splitBlogContentForAd(contentHtml = '') {
  const html = String(contentHtml || '');
  if (html.length < 900) {
    return { beforeAd: html, afterAd: '' };
  }

  const paragraphMatches = Array.from(html.matchAll(/<\/p>/gi));
  if (paragraphMatches.length < 3) {
    return { beforeAd: html, afterAd: '' };
  }

  const targetOffset = Math.floor(html.length / 3);
  const targetMatch = paragraphMatches.find((match) => match.index >= targetOffset) || paragraphMatches[Math.floor(paragraphMatches.length / 3)];
  const splitIndex = targetMatch.index + targetMatch[0].length;
  return {
    beforeAd: html.slice(0, splitIndex),
    afterAd: html.slice(splitIndex)
  };
}

function normalizeBlogCategory(input) {
  const value = String(input || '').trim();
  return BLOG_CATEGORIES.includes(value) ? value : '';
}

function normalizeBlogSort(input) {
  const value = String(input || '').trim().toLowerCase();
  if (value === 'oldest') return 'oldest';
  if (value === 'popular') return 'popular';
  return 'latest';
}

function normalizeObjectIdString(input) {
  const value = String(input || '').trim();
  if (!value) return '';
  return /^[a-f\d]{24}$/i.test(value) ? value : '';
}

function normalizePositiveInt(input, fallback) {
  const value = Number.parseInt(input, 10);
  if (Number.isInteger(value) && value > 0) return value;
  return fallback;
}

function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getRequestIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  return String(req.ip || req.socket?.remoteAddress || '').trim();
}

function shouldTrackBlogView({ currentUser, postAuthorId }) {
  if (!currentUser) return true;
  if (currentUser.role === 'admin') return false;

  const currentUserId = String(currentUser._id || '');
  const authorId = String(postAuthorId || '');
  if (currentUserId && authorId && currentUserId === authorId) {
    return false;
  }
  return true;
}
