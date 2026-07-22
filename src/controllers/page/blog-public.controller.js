'use strict';

const { buildPublicBlogListPage } = require('../../services/public-blog-list.service');
const { getBlogArticlePresentation } = require('../../services/public-blog-presentation.service');
const { EDITORIAL_TEAM_NAME, formatBlogAuthorName } = require('../../utils/blog-author');
const { isCurrentEligibleBlog } = require('../../utils/blog-content-eligibility');

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
  getCanonicalBlogSlug,
  getEligiblePublicBlogQuery,
  getPublicBlogQuery,
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
    const pageData = await buildPublicBlogListPage(req.query, {
      listingKind: req.blogListingKind,
      baseUrl: getAppBaseUrl()
    });
    if (pageData.isThinFilteredListing) {
      res.setHeader('X-Robots-Tag', 'noindex, follow');
      disableAdLocals(res);
    }
    return res.render('pages/blog', pageData);
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
    loadConsentScript: false,
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
    const canonicalSlug = getCanonicalBlogSlug(slug);
    if (canonicalSlug) return res.redirect(301, `/blog/${canonicalSlug}`);

    const post = await Blog.findOne({
      slug,
      status: 'published',
      isDeleted: { $ne: true },
      publishedAt: { $lte: new Date() }
    })
      .populate('authorId', 'displayName firstName lastName avatarUrl verifiedAuthor trustScore');

    if (!post) {
      return res.status(404).render('error', {
        title: '404 - Post Not Found',
        status: 404,
        message: 'This blog post is not available.'
      });
    }
    const adsenseEligible = isCurrentEligibleBlog(post);
    if (!adsenseEligible) {
      res.setHeader('X-Robots-Tag', 'noindex, follow');
      disableAdLocals(res);
    }

    const currentUser = res.locals.user || null;
    const currentUserId = currentUser?._id || null;
    if (currentUserId) {
      res.set('Cache-Control', 'private, no-store, max-age=0, must-revalidate');
      res.set('Pragma', 'no-cache');
    }
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

    const relatedPosts = await Blog.find(getEligiblePublicBlogQuery({
      _id: { $ne: post._id },
      status: 'published',
      isDeleted: { $ne: true },
      $or: [
        { category: post.category },
        { tags: { $in: post.tags || [] } }
      ]
    }))
      .sort({ publishedAt: -1 })
      .limit(4)
      .select('title slug excerpt category customCategory coverImageUrl readingTime views likesCount commentsCount publishedAt');

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
    const authorName = formatBlogAuthorName(post.authorId || {}, 'HelloRun');
    const isEditorialTeam = authorName === EDITORIAL_TEAM_NAME;
    const authorBio = isEditorialTeam
      ? 'The HelloRun Editorial Team publishes researched, practical guidance for runners and event organisers, with transparent sourcing and event-specific limitations.'
      : 'HelloRun publishes practical guides for runners and event organizers, with a focus on virtual runs, proof submission, leaderboards, and community fitness events.';

    return res.render('pages/blog-post', {
      title: `${post.title} - HelloRun Blog`,
      post,
      authorDisplay: {
        name: authorName,
        bio: authorBio,
        schemaType: isEditorialTeam ? 'Organization' : 'Person'
      },
      blogContentParts: splitBlogContentForAd(post.contentHtml || ''),
      relatedPosts,
      interactionState: {
        likedByCurrentUser,
        isAuthenticated: Boolean(currentUserId),
        currentUserId: currentUserId ? String(currentUserId) : '',
        reportReasons: ['spam', 'plagiarism', 'promotion', 'unsafe_medical', 'abuse', 'other']
      },
      articlePresentation: getBlogArticlePresentation(post),
      seo: {
        ogType: 'article',
        description: metaDescription,
        canonicalUrl,
        ogTitle: seoTitle || `${post.title} - HelloRun Blog`,
        twitterTitle: seoTitle || `${post.title} - HelloRun Blog`,
        ogImage: ogImage || '',
        robots: adsenseEligible ? '' : 'noindex, follow'
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
