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
  getHomepageLeaderboard,
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

exports.getHome = async (req, res) => {
  try {
    const now = new Date();
    const baseUrl = getAppBaseUrl();
    const canonicalUrl = baseUrl ? `${baseUrl}/` : '';
    const ogImage = baseUrl ? `${baseUrl}/images/helloRun-icon.webp` : '';

    const [activeEventsCount, approvedFinishersCount, approvedOrganizersCount, recentPostsRaw, carouselSettings, homeLeaderboard] = await Promise.all([
      Event.countDocuments({
        ...getPublicEventVisibilityQuery(now),
        $or: [
          { eventEndAt: { $gte: now } },
          { eventEndAt: null },
          { eventEndAt: { $exists: false } }
        ]
      }),
      Submission.countDocuments({ status: 'approved', isPersonalRecord: { $ne: true } }),
      User.countDocuments({
        role: 'organiser',
        organizerStatus: 'approved'
      }),
      Blog.find(getPublicBlogQuery({
        status: 'published',
        isDeleted: { $ne: true }
      }))
        .populate('authorId', 'firstName lastName')
        .sort({ publishedAt: -1, createdAt: -1 })
        .limit(3)
        .select('title slug excerpt category customCategory coverImageUrl readingTime publishedAt createdAt')
        .lean(),
      getHomepageCarouselSettings(),
      getHomepageLeaderboard().catch((error) => {
        logger.warn('Homepage leaderboard unavailable; rendering fallback hero.', {
          error: error?.message || String(error)
        });
        return null;
      })
    ]);
    const featuredEvents = carouselSettings.enabled
      ? await listHomepagePromotedEvents({ now, limit: carouselSettings.maxItems })
      : [];

    const stats = [
      {
        value: Number(activeEventsCount || 0).toLocaleString('en-US'),
        label: 'Active events',
        detail: 'Live races and challenges available to browse now',
        icon: 'calendar-days'
      },
      {
        value: Number(approvedFinishersCount || 0).toLocaleString('en-US'),
        label: 'Approved finishes',
        detail: 'Runner submissions already verified on the platform',
        icon: 'badge-check'
      },
      {
        value: Number(approvedOrganizersCount || 0).toLocaleString('en-US'),
        label: 'Approved organizers',
        detail: 'Approved organizer accounts currently active on HelloRun',
        icon: 'users'
      }
    ];

    const recentPosts = recentPostsRaw.map((post) => ({
      ...post,
      categoryLabel: post.category === 'Other' && post.customCategory ? post.customCategory : post.category,
      publishedLabel: formatDateOnly(post.publishedAt || post.createdAt),
      authorName: [post.authorId?.firstName, post.authorId?.lastName].filter(Boolean).join(' ').trim() || 'HelloRun'
    }));

    return res.render('pages/home', {
      title: 'HelloRun - Find virtual races, finish strong, stay connected',
      seo: {
        description: 'Discover virtual running events, track finishes, and stay connected with the HelloRun running community.',
        canonicalUrl,
        ogTitle: 'HelloRun - Virtual races and running community',
        twitterTitle: 'HelloRun - Virtual races and running community',
        ogImage
      },
      stats,
      recentPosts,
      featuredEvents,
      carouselSettings,
      homeLeaderboard
    });
  } catch (error) {
    logger.error('Error loading home page:', error);
    return res.status(500).render('error', {
      title: '500 - Server Error',
      status: 500,
      message: 'Unable to load the home page right now.'
    });
  }
};

exports.getEvents = async (req, res) => {
  try {
    const loginSuccess = req.session.loginSuccess || false;
    const userName = req.session.userName || null;

    delete req.session.loginSuccess;
    delete req.session.userName;

    const eventListPage = await buildPublicEventListPage(req.query);

    let savedEventIds = new Set();
    if (req.session.userId) {
      try {
        const u = await User.findById(req.session.userId).select('savedEvents').lean();
        if (u && u.savedEvents) savedEventIds = new Set(u.savedEvents.map(String));
      } catch (_) {}
    }

    return res.render('pages/events', {
      ...eventListPage,
      loginSuccess,
      userName,
      savedEventIds
    });
  } catch (error) {
    logger.error('Error loading public events:', error);
    return res.status(500).render('error', {
      title: 'Server Error',
      status: 500,
      message: 'An error occurred while loading events.'
    });
  }
};

exports.getAbout = async (req, res) => {
  try {
    const currentEvents = await listHomepagePromotedEvents({ limit: 3 });

    return res.render('pages/about', {
      title: 'About HelloRun | Running Event Platform for Virtual, On-Site, and Hybrid Events',
      seo: {
        description: 'Learn how HelloRun helps runners join events, submit results, track approvals, and keep achievements in one place while helping organisers manage registrations, proof review, leaderboards, and certificates.'
      },
      currentEvents
    });
  } catch (error) {
    logger.error('Error loading about page:', error);
    return res.status(500).render('error', {
      title: 'Server Error',
      status: 500,
      message: 'An error occurred while loading the about page.'
    });
  }
};
