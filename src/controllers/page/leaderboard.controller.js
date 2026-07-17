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
  buildEventLeaderboardPresentation,
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

exports.getLeaderboard = async (req, res) => {
  try {
    const data = await getLeaderboardDiscoveryData({
      q: req.query.q,
      type: req.query.type,
      distance: req.query.distance,
      mode: req.query.mode,
      sort: req.query.sort,
      page: req.query.page,
      limit: req.query.limit,
      baseUrl: getAppBaseUrl()
    });

    return res.render('pages/leaderboard', {
      title: 'Find Event Leaderboards - HelloRun',
      leaderboard: data,
      filterMeta: data.filterMeta,
      seo: {
        canonicalUrl: data.seo.canonicalUrl,
        description: 'Find official HelloRun event standings, verified results, and your personal race position.'
      }
    });
  } catch (error) {
    logger.error('Error loading leaderboard:', error);
    return res.status(500).render('error', {
      title: 'Server Error',
      status: 500,
      message: 'An error occurred while loading leaderboard data.'
    });
  }
};

exports.getEventLeaderboardPage = async (req, res) => {
  try {
    const data = await getEventLeaderboard(req.params.slug, {
      distance: req.query.distance,
      category: req.query.category,
      mode: req.query.mode,
      status: req.query.status,
      search: req.query.search,
      page: req.query.page,
      limit: req.query.limit,
      currentUserId: req.session?.userId
    });

    if (!data) {
      return res.status(404).render('error', {
        title: '404 - Leaderboard Not Found',
        status: 404,
        message: 'Leaderboard is not available for this event.'
      });
    }

    const myStanding = req.session?.userId
      ? await getMyStanding(req.params.slug, req.session.userId, {
          distance: data.activeDistance?.key
        })
      : null;
    const presentation = buildEventLeaderboardPresentation(data, {
      isAuthenticated: Boolean(req.session?.userId),
      myStanding,
      baseUrl: getAppBaseUrl()
    });

    return res.render('pages/event-leaderboard', {
      title: `${data.event.title} Leaderboard - HelloRun`,
      leaderboard: data,
      myStanding,
      presentation,
      seo: {
        canonicalUrl: presentation.seo.canonicalUrl,
        description: `View official ${data.event.title} standings, verified results, and runner positions.`
      }
    });
  } catch (error) {
    logger.error('Error loading event leaderboard:', error);
    return res.status(500).render('error', {
      title: 'Server Error',
      status: 500,
      message: 'An error occurred while loading event leaderboard data.'
    });
  }
};

exports.getEventLeaderboardData = async (req, res) => {
  try {
    const data = await getEventLeaderboard(req.params.slug, {
      distance: req.query.distance,
      category: req.query.category,
      mode: req.query.mode,
      status: req.query.status,
      search: req.query.search,
      page: req.query.page,
      limit: req.query.limit,
      currentUserId: req.session?.userId
    });
    if (!data) {
      return res.status(404).json({ success: false, message: 'Leaderboard is not available for this event.' });
    }
    return res.json({ success: true, leaderboard: data });
  } catch (error) {
    logger.error('Error loading event leaderboard data:', error);
    return res.status(500).json({ success: false, message: 'Unable to load leaderboard data.' });
  }
};

exports.getEventLeaderboardMyStanding = async (req, res) => {
  try {
    if (!req.session?.userId) {
      return res.status(401).json({ success: false, message: 'Log in to view your standing.' });
    }
    const data = await getMyStanding(req.params.slug, req.session.userId, {
      distance: req.query.distance,
      category: req.query.category,
      mode: req.query.mode,
      status: req.query.status
    });
    if (!data) {
      return res.status(404).json({ success: false, message: 'Standing is not available for this event.' });
    }
    return res.json({ success: true, myStanding: data });
  } catch (error) {
    logger.error('Error loading my leaderboard standing:', error);
    return res.status(500).json({ success: false, message: 'Unable to load your standing.' });
  }
};
