'use strict';

const { buildContactPresentation } = require('../../services/contact-page-presentation.service');
const { buildFaqPresentation } = require('../../services/faq-page-presentation.service');

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
    const aboutActions = buildAboutActions(res.locals);

    return res.render('pages/about', {
      title: 'About HelloRun | Running Event Platform for Virtual, On-Site, and Hybrid Events',
      seo: {
        description: 'Learn how HelloRun helps runners join events, submit results, track approvals, and keep achievements in one place while helping organisers manage registrations, proof review, leaderboards, and certificates.'
      },
      currentEvents,
      aboutActions
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

function buildAboutActions(locals = {}) {
  const isAuthenticated = Boolean(locals.isAuthenticated);
  const isOrganizer = Boolean(locals.isOrganizer || locals.isApprovedOrganizer);
  const isAdmin = Boolean(locals.isAdmin);

  let accountAction = {
    label: 'How It Works',
    href: '/how-it-works',
    icon: 'route'
  };

  if (isOrganizer) {
    accountAction = {
      label: 'Organizer Dashboard',
      href: '/organizer/dashboard',
      icon: 'layout-dashboard'
    };
  } else if (isAdmin) {
    accountAction = {
      label: 'Admin Dashboard',
      href: '/admin/dashboard',
      icon: 'shield-check'
    };
  } else if (isAuthenticated) {
    accountAction = {
      label: 'My Registrations',
      href: '/my-registrations',
      icon: 'clipboard-list'
    };
  }

  return {
    primary: {
      label: 'Browse Events',
      href: '/events',
      icon: 'calendar-search'
    },
    account: accountAction,
    organizer: isOrganizer
      ? {
          label: 'Manage Your Events',
          href: '/organizer/dashboard'
        }
      : {
          label: 'Organize an Event',
          href: '/signup'
        }
  };
}

exports.buildAboutActions = buildAboutActions;

exports.getHowItWorks = (req, res) => {
  const howItWorksActions = buildHowItWorksActions(res.locals);

  return res.render('pages/how-it-works', {
    title: 'How HelloRun Events Work for Runners and Organizers',
    seo: {
      description: 'Follow the connected HelloRun journey for virtual, on-site, and hybrid events—from runner registration and proof submission to organizer review, standings, and recognition.'
    },
    howItWorksActions
  });
};

function buildHowItWorksActions(locals = {}) {
  const isAuthenticated = Boolean(locals.isAuthenticated);
  const isOrganizer = Boolean(locals.isOrganizer || locals.isApprovedOrganizer);
  const isAdmin = Boolean(locals.isAdmin);

  const runner = isAuthenticated
    ? {
        label: 'My Registrations',
        href: '/my-registrations',
        icon: 'clipboard-list'
      }
    : {
        label: 'Browse Events',
        href: '/events',
        icon: 'calendar-search'
      };

  let organizer = {
    label: 'Start Organizing',
    href: '/signup?role=organiser',
    icon: 'calendar-plus'
  };

  if (isOrganizer) {
    organizer = {
      label: 'Organizer Dashboard',
      href: '/organizer/dashboard',
      icon: 'layout-dashboard'
    };
  } else if (isAdmin) {
    organizer = {
      label: 'Admin Dashboard',
      href: '/admin/dashboard',
      icon: 'shield-check'
    };
  }

  return { runner, organizer };
}

exports.buildHowItWorksActions = buildHowItWorksActions;

exports.getContact = (req, res) => {
  const contactPresentation = buildContactPresentation({
    locals: res.locals,
    source: req.query.source,
    topic: req.query.topic,
    supportEmail: process.env.ADMIN_EMAIL
  });

  return res.render('pages/contact', {
    title: 'Contact HelloRun Support | Runner and Organizer Help',
    seo: {
      description: 'Prepare a complete HelloRun support request for account, registration, payment, activity review, organizer, privacy, safety, or partnership questions.'
    },
    contactPresentation
  });
};

exports.getFaq = (req, res) => {
  const faqPresentation = buildFaqPresentation({ locals: res.locals });
  const baseUrl = getAppBaseUrl();

  return res.render('pages/faq', {
    title: 'HelloRun FAQ | Events, Activity Review, Progress and Support',
    seo: {
      description: 'Find practical HelloRun answers about event registration, payment and activity review, accumulated challenges, leaderboards, certificates, privacy, organizers, and runner support.',
      canonicalUrl: baseUrl ? `${baseUrl}/faq` : ''
    },
    faqPresentation
  });
};
