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

exports.getLeaderboard = async (req, res) => {
  try {
    const data = await getLeaderboardDiscoveryData({
      q: req.query.q,
      type: req.query.type,
      distance: req.query.distance,
      mode: req.query.mode,
      limit: req.query.limit
    });

    const activeFilterCount = Number(Boolean(data.filters.q))
      + Number(Boolean(data.filters.type))
      + Number(Boolean(data.filters.distance))
      + Number(Boolean(data.filters.mode));
    const hasActiveFilters = activeFilterCount > 0;

    return res.render('pages/leaderboard', {
      title: 'Find Event Leaderboards - HelloRun',
      leaderboard: data,
      filterMeta: {
        activeFilterCount,
        hasActiveFilters
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
          distance: data.activeDistance?.key,
          category: req.query.category,
          mode: req.query.mode,
          status: req.query.status
        })
      : null;

    return res.render('pages/event-leaderboard', {
      title: `${data.event.title} Leaderboard - HelloRun`,
      leaderboard: data,
      myStanding
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
