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

exports.getSitemapXml = async (req, res) => {
  try {
    const baseUrl = getSitemapBaseUrl(req);
    const staticPages = [
      '/',
      '/events',
      '/blog',
      '/about',
      '/how-it-works',
      '/contact',
      '/faq',
      ...listPolicyDocuments().map((policy) => policy.publicPath)
    ];

    const [events, blogPosts] = await Promise.all([
      Event.find({ ...getPublicEventVisibilityQuery(new Date()), excludeFromSitemap: { $ne: true } })
        .select('slug updatedAt createdAt')
        .sort({ updatedAt: -1 })
        .lean(),
      Blog.find(getPublicBlogQuery({
        status: 'published',
        isDeleted: { $ne: true }
      }))
        .select('slug publishedAt updatedAt createdAt')
        .sort({ publishedAt: -1, updatedAt: -1 })
        .lean()
    ]);

    const urls = [
      ...staticPages.map((path) => ({
        loc: `${baseUrl}${path}`,
        lastmod: formatSitemapDate(new Date())
      })),
      ...events
        .filter((event) => String(event.slug || '').trim())
        .map((event) => ({
          loc: `${baseUrl}/events/${encodeURIComponent(event.slug)}`,
          lastmod: formatSitemapDate(event.updatedAt || event.createdAt)
        })),
      ...blogPosts
        .filter((post) => String(post.slug || '').trim())
        .map((post) => ({
          loc: `${baseUrl}/blog/${encodeURIComponent(post.slug)}`,
          lastmod: formatSitemapDate(post.updatedAt || post.publishedAt || post.createdAt)
        }))
    ];

    const uniqueUrls = Array.from(
      new Map(urls.map((item) => [item.loc, item])).values()
    );

    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...uniqueUrls.map((item) => [
        '  <url>',
        `    <loc>${escapeXml(item.loc)}</loc>`,
        `    <lastmod>${escapeXml(item.lastmod)}</lastmod>`,
        '  </url>'
      ].join('\n')),
      '</urlset>'
    ].join('\n');

    return res
      .type('application/xml')
      .set('Cache-Control', 'public, max-age=3600')
      .send(xml);
  } catch (error) {
    logger.error('Error generating sitemap:', error);
    return res.status(500).render('error', {
      title: 'Server Error',
      status: 500,
      message: 'An error occurred while generating the sitemap.'
    });
  }
};

function formatSitemapDate(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }
  return date.toISOString().slice(0, 10);
}
