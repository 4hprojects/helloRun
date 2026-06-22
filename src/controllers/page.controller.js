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
  return exports.getBlogList(req, res);
};
const crypto = require('crypto');
const Event = require('../models/Event');
const User = require('../models/User');
const Registration = require('../models/Registration');
const Submission = require('../models/Submission');
const OrganiserApplication = require('../models/OrganiserApplication');
const Blog = require('../models/Blog');
const BlogLike = require('../models/BlogLike');
const communicationService = require('../services/communication.service');
const { registerBlogView } = require('../services/blog-view.service');
const { getRunnerRegistrations } = require('../services/runner-data.service');
const { listPolicyDocuments } = require('../services/policy-registry.service');
const uploadService = require('../services/upload.service');
const { getCountries, isValidCountryCode, normalizeCountryCode, getCountryName } = require('../utils/country');
const { BLOG_CATEGORIES } = require('../utils/blog');
const { renderWaiverTemplate } = require('../utils/waiver');
const { assertRunDateNotFuture, parseRunDateOnly } = require('../utils/platform-date');
const { isRunDateAlignedWithEvent } = require('../utils/submission-window');
const {
  canRunnerSubmitPaymentProof,
  getInitialRegistrationPaymentStatus
} = require('../utils/payment-workflow');
const {
  createSubmission,
  editRejectedSubmissionMetadata,
  resubmitSubmission,
  getRunnerSubmissions,
  PERSONAL_RECORD_REGISTRATION_ID
} = require('../services/submission.service');
let { syncRegistrationPaymentShadow } = require('../services/registration-payment-shadow.service');
const AccumulatedActivitySubmission = require('../models/AccumulatedActivitySubmission');
const {
  createAccumulatedActivitySubmission,
  getAccumulatedActivitiesForRegistrations,
  buildAccumulatedProgress
} = require('../services/accumulated-activity.service');
const { resolveAccumulatedTargetDistanceKm } = require('../services/accumulated-target.service');
const {
  evaluateRegistrationAchievementsInBackground,
  getRunnerEarnedBadges,
  getPublicBadgeVerification: loadPublicBadgeVerification
} = require('../services/achievement.service');
const {
  getLeaderboardDiscoveryData,
  getEventLeaderboard,
  getMyStanding
} = require('../services/leaderboard.service');
const {
  buildPublicEventSeo,
  buildPublicEventView,
  renderEventDetailsContent
} = require('../utils/event-public-view');
const {
  getCustomizedRegistrationOptions,
  getRegistrationPackageOptions,
  getRaceCategoryOptions,
  resolveRegistrationPrice
} = require('../services/registration-price.service');
const { getEventBadgesByMongoEventId } = require('../services/event-badge.service');
const { listProductsByMongoEventId } = require('../services/shop/product.service');
const { recalculateOrderTotals } = require('../services/shop/order.service');
const { buildPublicEventListPage, listHomepagePromotedEvents } = require('../services/public-event-list.service');
const { getHomepageCarouselSettings } = require('../services/homepage-carousel-setting.service');
const { getPostgresClient } = require('../db/postgres');
const { getPublicEventVisibilityQuery } = require('../utils/public-event-visibility');
const logger = require('../utils/logger');
const { recordSyncFailureInBackground } = require('../services/sync-failure.service');

const countries = getCountries();
exports.getHome = async (req, res) => {
  try {
    const now = new Date();
    const baseUrl = getAppBaseUrl();
    const canonicalUrl = baseUrl ? `${baseUrl}/` : '';
    const ogImage = baseUrl ? `${baseUrl}/images/helloRun-icon.webp` : '';

    const [activeEventsCount, approvedFinishersCount, approvedOrganizersCount, recentPostsRaw, carouselSettings] = await Promise.all([
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
      Blog.find({
        status: 'published',
        isDeleted: { $ne: true }
      })
        .populate('authorId', 'firstName lastName')
        .sort({ publishedAt: -1, createdAt: -1 })
        .limit(3)
        .select('title slug excerpt category customCategory coverImageUrl readingTime publishedAt createdAt')
        .lean(),
      getHomepageCarouselSettings()
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
      carouselSettings
    });
  } catch (error) {
    console.error('Error loading home page:', error);
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
    console.error('Error loading public events:', error);
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
    console.error('Error loading about page:', error);
    return res.status(500).render('error', {
      title: 'Server Error',
      status: 500,
      message: 'An error occurred while loading the about page.'
    });
  }
};

exports.getEventDetails = async (req, res) => {
  try {
    const event = await getPublishedEventBySlug(req.params.slug);
    if (!event) {
      return renderEventNotFound(res);
    }

    const [registrationCount, badges, eventShopProducts] = await Promise.all([
      Registration.countDocuments({
        eventId: event._id,
        status: { $ne: 'cancelled' }
      }),
      getEventBadgesByMongoEventId(event._id).catch(() => []),
      listProductsByMongoEventId(String(event._id), { limit: 4, publicOnly: true }).catch(() => [])
    ]);
    const baseUrl = getSitemapBaseUrl(req);
    const publicEvent = buildPublicEventView(event, { registrationCount });
    const eventShop = {
      href: `/events/${event.slug}/shop`,
      products: eventShopProducts,
      count: eventShopProducts.length
    };

    let isSaved = false;
    if (req.session.userId) {
      try {
        const u = await User.findById(req.session.userId).select('savedEvents').lean();
        if (u && u.savedEvents) isSaved = u.savedEvents.some((id) => String(id) === String(event._id));
      } catch (_) {}
    }

    return res.render('pages/event-details', {
      title: `${event.title} - HelloRun`,
      seo: buildPublicEventSeo(event, baseUrl),
      event,
      publicEvent,
      badges,
      eventShop,
      isSaved,
      eventDetailsHtml: renderEventDetailsContent(event.eventDetailsMarkdown),
      countryName: getCountryName
    });
  } catch (error) {
    console.error('Error loading public event details:', error);
    return res.status(500).render('error', {
      title: 'Server Error',
      status: 500,
      message: 'An error occurred while loading event details.'
    });
  }
};

exports.getEventBadges = async (req, res) => {
  try {
    const event = await getPublishedEventBySlug(req.params.slug);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }

    const badges = await getEventBadgesByMongoEventId(event._id);
    return res.json({ success: true, badges });
  } catch (error) {
    console.error('Event badges load error:', error);
    return res.status(500).json({ success: false, message: 'Unable to load event badges.' });
  }
};

exports.getPublicBadgePage = async (req, res) => {
  try {
    const badge = await loadPublicBadgeVerification(req.params.userBadgeId);
    if (!badge) {
      return res.status(404).render('error', {
        title: 'Badge Not Found - HelloRun',
        status: 404,
        message: 'This badge could not be verified. It may have been revoked or the link may be incorrect.'
      });
    }

    const baseUrl = getSitemapBaseUrl(req);
    const badgeUrl = `${baseUrl}/badges/${badge.userBadgeId}`;
    const badgeShareImageUrl = `${baseUrl}/badges/${badge.userBadgeId}/share-image.svg`;
    const openBadgeUrl = `${baseUrl}/badges/${badge.userBadgeId}/open-badge.json`;
    const shareText = `${badge.runnerName} earned the ${badge.name} badge on HelloRun.`;
    const openBadgeMetadata = buildOpenBadgeMetadata(badge, { baseUrl, badgeUrl, badgeShareImageUrl, openBadgeUrl });
    return res.render('pages/badge-verification', {
      title: `${badge.name} - Verified Badge - HelloRun`,
      additionalCSS: ['/css/badge-verification.css'],
      seo: {
        description: `${badge.runnerName} earned the ${badge.name} badge on HelloRun.`,
        canonicalUrl: badgeUrl,
        ogType: 'article',
        ogTitle: `${badge.name} - Verified HelloRun Badge`,
        twitterTitle: `${badge.name} - Verified HelloRun Badge`,
        ogImage: badgeShareImageUrl
      },
      badge,
      badgeUrl,
      openBadgeUrl,
      openBadgeMetadata,
      shareText,
      facebookShareUrl: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(badgeUrl)}`,
      xShareUrl: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(badgeUrl)}`,
      linkedInShareUrl: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(badgeUrl)}`,
      mailShareUrl: `mailto:?subject=${encodeURIComponent(`${badge.name} - Verified HelloRun Badge`)}&body=${encodeURIComponent(`${shareText}\n\n${badgeUrl}`)}`,
      formatDateOnly
    });
  } catch (error) {
    console.error('Public badge verification page error:', error);
    return res.status(500).render('error', {
      title: 'Server Error',
      status: 500,
      message: 'Unable to verify this badge right now.'
    });
  }
};

exports.getPublicOpenBadgeMetadata = async (req, res) => {
  try {
    const badge = await loadPublicBadgeVerification(req.params.userBadgeId);
    if (!badge) {
      return res.status(404).json({ success: false, message: 'Badge not found or not verified.' });
    }

    const baseUrl = getSitemapBaseUrl(req);
    const badgeUrl = `${baseUrl}/badges/${badge.userBadgeId}`;
    const badgeShareImageUrl = `${baseUrl}/badges/${badge.userBadgeId}/share-image.svg`;
    const openBadgeUrl = `${baseUrl}/badges/${badge.userBadgeId}/open-badge.json`;
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.json(buildOpenBadgeMetadata(badge, { baseUrl, badgeUrl, badgeShareImageUrl, openBadgeUrl }));
  } catch (error) {
    console.error('Public Open Badge metadata error:', error);
    return res.status(500).json({ success: false, message: 'Unable to load badge metadata.' });
  }
};

exports.getPublicBadgeShareImage = async (req, res) => {
  try {
    const badge = await loadPublicBadgeVerification(req.params.userBadgeId);
    if (!badge) {
      return res.status(404).type('image/svg+xml').send(buildShareImageSvg({
        title: 'Badge Not Found',
        subtitle: 'This HelloRun badge could not be verified.',
        kicker: 'HelloRun',
        statLabel: 'Verification',
        statValue: 'Unavailable'
      }));
    }

    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.type('image/svg+xml').send(buildShareImageSvg({
      title: badge.name,
      subtitle: `${badge.runnerName} earned this verified HelloRun badge.`,
      kicker: 'Verified Badge',
      statLabel: badge.eventTitle ? 'Event' : 'Scope',
      statValue: badge.eventTitle || formatBadgeScopeLabel(badge.badgeScope),
      footer: `Verification ID ${badge.verificationCode}`
    }));
  } catch (error) {
    console.error('Public badge share image error:', error);
    return res.status(500).type('image/svg+xml').send(buildShareImageSvg({
      title: 'HelloRun Badge',
      subtitle: 'Verified achievement preview is unavailable right now.',
      kicker: 'HelloRun',
      statLabel: 'Status',
      statValue: 'Unavailable'
    }));
  }
};

exports.getPublicBadgeVerification = async (req, res) => {
  try {
    const badge = await loadPublicBadgeVerification(req.params.userBadgeId);
    if (!badge) {
      return res.status(404).json({ success: false, message: 'Badge not found or not verified.' });
    }
    return res.json({
      success: true,
      badge: {
        userBadgeId: badge.userBadgeId,
        badgeCode: badge.badgeCode,
        name: badge.name,
        description: badge.description,
        badgeScope: badge.badgeScope,
        badgeType: badge.badgeType,
        requirementType: badge.requirementType,
        runnerName: badge.runnerName,
        eventTitle: badge.eventTitle,
        eventSlug: badge.eventSlug,
        earnedAt: badge.earnedAt,
        verificationStatus: badge.verificationStatus,
        verificationCode: badge.verificationCode,
        evidenceLabel: badge.evidenceLabel
      }
    });
  } catch (error) {
    console.error('Public badge verification API error:', error);
    return res.status(500).json({ success: false, message: 'Unable to verify badge.' });
  }
};

exports.getPublicRunnerBadgeCollection = async (req, res) => {
  try {
    const publicUserId = String(req.params.userId || '').trim();
    const runner = await User.findOne({
      userId: publicUserId,
      role: 'runner'
    }).select('_id userId firstName lastName createdAt').lean();

    if (!runner) {
      return res.status(404).render('error', {
        title: 'Badge Collection Not Found - HelloRun',
        status: 404,
        message: 'This public badge collection could not be found.'
      });
    }

    const badges = await getRunnerEarnedBadges(runner._id, { limit: 100 });
    const totalPoints = badges.reduce((sum, b) => sum + (b.points || 0), 0);
    const baseUrl = getSitemapBaseUrl(req);
    const collectionUrl = `${baseUrl}/runners/${encodeURIComponent(runner.userId)}/badges`;
    const collectionShareImageUrl = `${baseUrl}/runners/${encodeURIComponent(runner.userId)}/badges/share-image.svg`;
    const runnerName = [runner.firstName, runner.lastName].filter(Boolean).join(' ') || 'HelloRun Runner';
    const featuredBadge = badges.find((badge) => badge.isFeatured) || badges[0] || null;
    const badgesByScope = buildBadgeCollectionScopeSummary(badges);

    return res.render('pages/runner-badge-collection', {
      title: `${runnerName} - Badge Collection - HelloRun`,
      additionalCSS: ['/css/badge-verification.css'],
      seo: {
        description: `${runnerName}'s verified HelloRun badge collection.`,
        canonicalUrl: collectionUrl,
        ogType: 'profile',
        ogTitle: `${runnerName} - Verified HelloRun Badge Collection`,
        twitterTitle: `${runnerName} - Verified HelloRun Badge Collection`,
        ogImage: collectionShareImageUrl
      },
      runner: {
        userId: runner.userId,
        name: runnerName,
        joinedAt: runner.createdAt || null
      },
      badges,
      totalPoints,
      featuredBadge,
      badgesByScope,
      collectionUrl,
      shareText: `${runnerName}'s verified HelloRun badge collection.`,
      facebookShareUrl: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(collectionUrl)}`,
      xShareUrl: `https://twitter.com/intent/tweet?text=${encodeURIComponent(`${runnerName}'s verified HelloRun badge collection.`)}&url=${encodeURIComponent(collectionUrl)}`,
      linkedInShareUrl: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(collectionUrl)}`,
      mailShareUrl: `mailto:?subject=${encodeURIComponent(`${runnerName} - HelloRun Badge Collection`)}&body=${encodeURIComponent(`${runnerName}'s verified HelloRun badge collection.\n\n${collectionUrl}`)}`,
      formatDateOnly
    });
  } catch (error) {
    console.error('Public runner badge collection error:', error);
    return res.status(500).render('error', {
      title: 'Server Error',
      status: 500,
      message: 'Unable to load this badge collection right now.'
    });
  }
};

exports.getPublicRunnerBadgeCollectionShareImage = async (req, res) => {
  try {
    const publicUserId = String(req.params.userId || '').trim();
    const runner = await User.findOne({
      userId: publicUserId,
      role: 'runner'
    }).select('_id userId firstName lastName').lean();

    if (!runner) {
      return res.status(404).type('image/svg+xml').send(buildShareImageSvg({
        title: 'Collection Not Found',
        subtitle: 'This HelloRun badge collection could not be found.',
        kicker: 'HelloRun',
        statLabel: 'Collection',
        statValue: 'Unavailable'
      }));
    }

    const badges = await getRunnerEarnedBadges(runner._id, { limit: 100 });
    const runnerName = [runner.firstName, runner.lastName].filter(Boolean).join(' ') || 'HelloRun Runner';
    const featuredBadge = badges.find((badge) => badge.isFeatured) || badges[0] || null;

    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.type('image/svg+xml').send(buildShareImageSvg({
      title: runnerName,
      subtitle: featuredBadge
        ? `Featured badge: ${featuredBadge.name}`
        : 'Verified HelloRun badge collection.',
      kicker: 'Verified Collection',
      statLabel: 'Badges',
      statValue: String(badges.length),
      footer: `Runner ID ${runner.userId}`
    }));
  } catch (error) {
    console.error('Public runner badge collection share image error:', error);
    return res.status(500).type('image/svg+xml').send(buildShareImageSvg({
      title: 'HelloRun Collection',
      subtitle: 'Verified collection preview is unavailable right now.',
      kicker: 'HelloRun',
      statLabel: 'Status',
      statValue: 'Unavailable'
    }));
  }
};

exports.getEventRegistrationForm = async (req, res) => {
  try {
    const [event, user] = await Promise.all([
      getPublishedEventBySlug(req.params.slug),
      User.findById(req.session.userId).select(
        'firstName lastName email mobile country dateOfBirth gender emergencyContactName emergencyContactNumber runningGroup runningGroups role organizerStatus emailVerified'
      )
    ]);

    if (!event) {
      return renderEventNotFound(res);
    }
    if (!user) {
      return res.redirect('/login');
    }
    const eligibilityError = getUserRegistrationEligibilityError(user);
    if (eligibilityError) {
      return res.status(403).render('error', {
        title: '403 - Registration Not Allowed',
        status: 403,
        message: eligibilityError
      });
    }

    const registrationWindowError = getRegistrationWindowError(event) || getRegistrationConfigurationError(event);
    const allowedModes = getAllowedParticipationModes(event);
    const allowedRaceDistances = getAllowedRaceDistances(event);
    const raceCategoryOptions = getRaceCategoryOptions(event);
    const raceDistancePricingPreview = buildRaceDistancePricingPreview(event, allowedRaceDistances);
    const profileSnapshot = getRegistrationProfileSnapshot(user);
    const defaultParticipationMode = allowedModes[0] || '';
    const requiresEmergencyContact = shouldRequireEmergencyContactForRegistration(profileSnapshot, defaultParticipationMode);
    const collectEmergencyContact = shouldCollectEmergencyContactForRegistration(profileSnapshot, allowedModes);
    const registrationAddOns = await loadRegistrationAddOns(event._id);
    const customizedRegistrationOptions = getCustomizedRegistrationOptions(event);
    const registrationPackageOptions = buildRegistrationPackageDisplayOptions(event, getRegistrationPackageOptions(event));
    const defaultRegistrationPackage = registrationPackageOptions.find((packageOption) => packageOption.isAvailableNow) || registrationPackageOptions[0] || null;
    const existing = await Registration.findOne({ eventId: event._id, userId: user._id })
      .select('confirmationCode participationMode raceDistance status paymentStatus pricingSnapshot paymentAmountDue paymentCurrency registeredAt');

    return res.render('pages/event-register', {
      title: `Register - ${event.title}`,
      event,
      allowedModes,
      allowedRaceDistances,
      countries,
      errors: {},
      message: getPageMessage(req.query),
      formData: getRegistrationFormData({
        ...profileSnapshot,
        participationMode: defaultParticipationMode,
      raceDistance: allowedRaceDistances[0] || '',
      customizedOptionId: customizedRegistrationOptions[0]?.id || '',
      registrationPackageId: defaultRegistrationPackage?.id || '',
        waiverAccepted: false,
        waiverSignature: ''
      }),
      requiresEmergencyContact,
      collectEmergencyContact,
      waiverHtml: renderWaiverTemplate(event.waiverTemplate, {
        organizerName: event.organiserName,
        eventTitle: event.title
      }),
      waiverVersion: Number(event.waiverVersion || 1),
      registrationWindowError,
      existingRegistration: existing || null,
      registrationAddOns,
      raceCategoryOptions,
      raceDistancePricingPreview,
      showRaceDistancePricePreview: isDistancePricingMode(event),
      customizedRegistrationOptions,
      registrationPackageOptions,
      justRegistered: req.query.registered === '1'
    });
  } catch (error) {
    console.error('Error loading event registration form:', error);
    return res.status(500).render('error', {
      title: 'Server Error',
      status: 500,
      message: 'An error occurred while loading the registration form.'
    });
  }
};

exports.postEventRegistration = async (req, res) => {
  try {
    const [event, user] = await Promise.all([
      getPublishedEventBySlug(req.params.slug),
      User.findById(req.session.userId).select(
        'firstName lastName email mobile country dateOfBirth gender emergencyContactName emergencyContactNumber runningGroup runningGroups role organizerStatus emailVerified'
      )
    ]);

    if (!event) {
      return renderEventNotFound(res);
    }
    if (!user) {
      return res.redirect('/login');
    }
    const eligibilityError = getUserRegistrationEligibilityError(user);
    if (eligibilityError) {
      return res.status(403).render('error', {
        title: '403 - Registration Not Allowed',
        status: 403,
        message: eligibilityError
      });
    }

    const allowedModes = getAllowedParticipationModes(event);
    const allowedRaceDistances = getAllowedRaceDistances(event);
    const raceCategoryOptions = getRaceCategoryOptions(event);
    const raceDistancePricingPreview = buildRaceDistancePricingPreview(event, allowedRaceDistances);
    const profileSnapshot = getRegistrationProfileSnapshot(user);
    const selectedParticipationMode = String(req.body.participationMode || '').trim();
    const requiresEmergencyContact = shouldRequireEmergencyContactForRegistration(profileSnapshot, selectedParticipationMode);
    const collectEmergencyContact = shouldCollectEmergencyContactForRegistration(profileSnapshot, allowedModes);
    const emergencyContactName = profileSnapshot.emergencyContactName || String(req.body.emergencyContactName || '').trim();
    const emergencyContactNumber = profileSnapshot.emergencyContactNumber || String(req.body.emergencyContactNumber || '').trim();
    const registrationAddOns = await loadRegistrationAddOns(event._id);
    const customizedRegistrationOptions = getCustomizedRegistrationOptions(event);
    const registrationPackageOptions = buildRegistrationPackageDisplayOptions(event, getRegistrationPackageOptions(event));
    const defaultRegistrationPackage = registrationPackageOptions.find((packageOption) => packageOption.isAvailableNow) || registrationPackageOptions[0] || null;
    const formData = getRegistrationFormData({
      ...profileSnapshot,
      emergencyContactName,
      emergencyContactNumber,
      participationMode: req.body.participationMode,
      raceDistance: req.body.raceDistance,
      customizedOptionId: req.body.customizedOptionId,
      registrationPackageId: req.body.registrationPackageId || defaultRegistrationPackage?.id || '',
      addOnProductIds: req.body.addOnProductIds,
      waiverAccepted: req.body.waiverAccepted,
      waiverSignature: req.body.waiverSignature
    });

    const existingRegistration = await Registration.findOne({ eventId: event._id, userId: user._id })
      .select('confirmationCode participationMode raceDistance status paymentStatus pricingSnapshot paymentAmountDue paymentCurrency registeredAt');
    if (existingRegistration) {
      const query = new URLSearchParams({
        type: 'error',
        msg: 'You are already registered for this event.'
      });
      return res.redirect(`/events/${event.slug}/register?${query.toString()}`);
    }

    const registrationWindowError = getRegistrationWindowError(event) || getRegistrationConfigurationError(event);
    const validationErrors = validateRegistrationForm(
      formData,
      allowedModes,
      allowedRaceDistances,
      registrationWindowError,
      {
        requiresEmergencyContact,
        expectedSignatureName: `${profileSnapshot.firstName} ${profileSnapshot.lastName}`
      }
    );

    const selectedAddOnsResult = resolveSelectedRegistrationAddOns(formData.addOnProductIds, registrationAddOns);
    if (selectedAddOnsResult.invalidIds.length > 0) {
      validationErrors.addOnProductIds = 'One or more selected add-ons are no longer available.';
    }
    const resolvedPrice = resolveRegistrationPrice(event, formData);
    if (!resolvedPrice.ok) {
      if (
        resolvedPrice.errorField === 'registrationPackageId'
        && !registrationPackageOptions.some((packageOption) => packageOption.isAvailableNow)
      ) {
        validationErrors.registrationPackageId = 'No registration package is currently open for pricing dates. Please try again later.';
      } else {
        validationErrors[resolvedPrice.errorField || 'pricing'] = resolvedPrice.error || 'Select a valid registration price option.';
      }
    }

    if (Object.keys(validationErrors).length > 0) {
      return res.status(400).render('pages/event-register', {
        title: `Register - ${event.title}`,
        event,
        allowedModes,
        allowedRaceDistances,
        countries,
        errors: validationErrors,
        message: null,
        formData,
        requiresEmergencyContact,
        collectEmergencyContact,
        waiverHtml: renderWaiverTemplate(event.waiverTemplate, {
          organizerName: event.organiserName,
          eventTitle: event.title
        }),
        waiverVersion: Number(event.waiverVersion || 1),
        registrationWindowError,
        existingRegistration: null,
        registrationAddOns,
        raceCategoryOptions,
        raceDistancePricingPreview,
        showRaceDistancePricePreview: isDistancePricingMode(event),
        customizedRegistrationOptions,
        registrationPackageOptions,
        justRegistered: false
      });
    }

    const confirmationCode = await generateConfirmationCode();
    const renderedWaiver = renderWaiverTemplate(event.waiverTemplate, {
      organizerName: event.organiserName,
      eventTitle: event.title
    });

    const registration = new Registration({
      eventId: event._id,
      userId: user._id,
      participant: {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        mobile: formData.mobile,
        country: formData.country,
        dateOfBirth: formData.dateOfBirth ? new Date(`${formData.dateOfBirth}T00:00:00.000Z`) : null,
        gender: formData.gender,
        emergencyContactName: formData.emergencyContactName,
        emergencyContactNumber: formData.emergencyContactNumber,
        runningGroup: formData.runningGroup
      },
      waiver: {
        accepted: true,
        version: Number(event.waiverVersion || 1),
        signature: formData.waiverSignature,
        acceptedAt: new Date(),
        templateSnapshot: String(event.waiverTemplate || ''),
        renderedSnapshot: renderedWaiver
      },
      participationMode: formData.participationMode,
      raceDistance: formData.raceDistance,
      status: 'confirmed',
      paymentStatus: getInitialRegistrationPaymentStatus(event),
      pricingSnapshot: {
        pricingMode: resolvedPrice.pricingMode,
        source: resolvedPrice.source,
        selectedOptionId: resolvedPrice.selectedOptionId || '',
        optionDescription: resolvedPrice.source === 'customized_option' ? resolvedPrice.label : '',
        raceCategoryId: resolvedPrice.raceCategoryId || '',
        raceCategoryName: resolvedPrice.raceCategoryName || '',
        raceCategoryType: resolvedPrice.raceCategoryType || '',
        raceDistance: resolvedPrice.raceDistance || formData.raceDistance,
        packageId: resolvedPrice.packageId || '',
        packageName: resolvedPrice.packageName || '',
        packagePeriodCode: resolvedPrice.source === 'registration_package' ? resolvedPrice.pricingPeriodCode || '' : '',
        packagePeriodLabel: resolvedPrice.source === 'registration_package' ? resolvedPrice.pricingPeriodLabel || '' : '',
        packageIncludedItems: resolvedPrice.packageIncludedItems || [],
        pricingPeriodCode: resolvedPrice.pricingPeriodCode || '',
        pricingPeriodLabel: resolvedPrice.pricingPeriodLabel || '',
        amount: resolvedPrice.amount,
        currency: resolvedPrice.currency
      },
      paymentAmountDue: resolvedPrice.amount,
      paymentCurrency: resolvedPrice.currency,
      confirmationCode,
      registeredAt: new Date()
    });

    registration.addOns = selectedAddOnsResult.selected;
    registration.addOnsSubtotal = selectedAddOnsResult.subtotal;
    registration.addOnsCurrency = selectedAddOnsResult.currency;

    await registration.save();
    await createRegistrationCheckoutOrderIfNeeded({
      registration,
      event,
      user,
      selectedAddOns: selectedAddOnsResult.selected,
      addOnsSubtotal: selectedAddOnsResult.subtotal,
      currency: selectedAddOnsResult.currency
    });
    evaluateRegistrationAchievementsInBackground(registration, {
      performedBy: user._id
    });

    await communicationService.notify('registration.confirmed', {
      notification: {
        userId: user._id,
        type: 'registration_confirmed',
        title: 'Registration Confirmed',
        message: `You are registered for ${event.title || 'an event'}.`,
        href: '/my-registrations',
        metadata: {
          registrationId: String(registration._id),
          eventId: String(event._id),
          eventTitle: event.title || ''
        }
      },
      email: {
        to: formData.email,
        firstName: formData.firstName,
        eventTitle: event.title,
        confirmationCode,
        participationMode: formData.participationMode,
        eventStartAt: event.eventStartAt,
        raceDistance: formData.raceDistance,
        recipientUserId: user._id,
        metadata: {
          registrationId: String(registration._id),
          eventId: String(event._id),
          userId: String(user._id)
        }
      }
    });

    const query = new URLSearchParams({
      type: 'success',
      msg: `Registration completed. Confirmation code: ${confirmationCode}`,
      registered: '1'
    });
    return res.redirect(`/events/${event.slug}/register?${query.toString()}`);
  } catch (error) {
    // Handle duplicate key race safely
    if (error && error.code === 11000) {
      const event = await getPublishedEventBySlug(req.params.slug);
      if (event) {
        const query = new URLSearchParams({
          type: 'error',
          msg: 'You are already registered for this event.'
        });
        return res.redirect(`/events/${event.slug}/register?${query.toString()}`);
      }
    }

    console.error('Error submitting event registration:', error);
    return res.status(500).render('error', {
      title: 'Server Error',
      status: 500,
      message: 'An error occurred while submitting your registration.'
    });
  }
};

exports.postQuickProfileUpdate = async (req, res) => {
  try {
    const user = await User.findById(req.session.userId).select(
      'firstName lastName email mobile country dateOfBirth gender emergencyContactName emergencyContactNumber runningGroup runningGroups'
    );
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
    }

    const payload = getQuickProfileUpdatePayload(req.body);
    const errors = validateQuickProfileUpdatePayload(payload);
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        errors
      });
    }

    user.mobile = payload.mobile;
    if (payload.hasCountryInput) {
      user.country = payload.country;
    }
    if (payload.dateOfBirth) {
      user.dateOfBirth = new Date(`${payload.dateOfBirth}T00:00:00.000Z`);
    }
    if (payload.gender) {
      user.gender = payload.gender;
    }
    if (payload.hasEmergencyContactInput) {
      user.emergencyContactName = payload.emergencyContactName;
      user.emergencyContactNumber = payload.emergencyContactNumber;
    }
    if (payload.hasRunningGroupsInput) {
      user.runningGroups = payload.runningGroups;
      user.runningGroup = payload.runningGroups[0] || '';
    }
    await user.save();

    return res.json({
      success: true,
      profile: {
        firstName: String(user.firstName || '').trim(),
        lastName: String(user.lastName || '').trim(),
        email: String(user.email || '').trim().toLowerCase(),
        mobile: payload.mobile,
        country: String(user.country || '').trim(),
        countryName: getCountryName(user.country) || user.country,
        dateOfBirth: formatDateForInput(user.dateOfBirth),
        gender: String(user.gender || '').trim(),
        emergencyContactName: String(user.emergencyContactName || '').trim(),
        emergencyContactNumber: String(user.emergencyContactNumber || '').trim(),
        runningGroups: normalizeRunnerGroups(user.runningGroups || user.runningGroup)
      }
    });
  } catch (error) {
    console.error('Quick profile update error:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to update profile right now.'
    });
  }
};

exports.getMyRegistrations = async (req, res) => {
  try {
    const user = await User.findById(req.session.userId).select('firstName');
    if (!user) {
      return res.redirect('/login');
    }

    const [registrations, submissions] = await Promise.all([
      getRunnerRegistrations(user._id),
      getRunnerSubmissions(user._id, { limit: 300 })
    ]);
    const accumulatedRegistrationIds = registrations
      .filter((registration) => registration.eventId?.virtualCompletionMode === 'accumulated_distance')
      .map((registration) => registration._id);
    const accumulatedActivities = await getAccumulatedActivitiesForRegistrations(accumulatedRegistrationIds);
    const accumulatedActivitiesByRegistrationId = new Map();
    for (const activity of accumulatedActivities) {
      const key = String(activity.registrationId);
      const current = accumulatedActivitiesByRegistrationId.get(key) || [];
      current.push(activity);
      accumulatedActivitiesByRegistrationId.set(key, current);
    }
    const submissionsByRegistrationId = new Map(
      submissions.map((item) => [String(item.registrationId?._id || item.registrationId), item])
    );
    const enrichedRegistrations = registrations.map((registration) => {
      const isAccumulated = registration.eventId?.virtualCompletionMode === 'accumulated_distance';
      const activities = accumulatedActivitiesByRegistrationId.get(String(registration._id)) || [];
      return {
        ...registration,
        isAccumulatedChallenge: isAccumulated,
        accumulatedActivities: activities,
        accumulatedProgress: isAccumulated
          ? buildAccumulatedProgress({
            activities,
            targetDistanceKm: resolveAccumulatedTargetDistanceKm(registration, registration.eventId)
          })
          : null,
        submission: submissionsByRegistrationId.get(String(registration._id)) || null
      };
    });

    return res.render('pages/my-registrations', {
      title: 'My Registrations - HelloRun',
      registrations: enrichedRegistrations,
      message: getPageMessage(req.query),
      countryName: getCountryName,
      genderLabel: formatGenderLabel,
      ageLabel: formatAgeFromDob
    });
  } catch (error) {
    console.error('Error loading my registrations:', error);
    return res.status(500).render('error', {
      title: 'Server Error',
      status: 500,
      message: 'An error occurred while loading your registrations.'
    });
  }
};

exports.postSubmitResult = async (req, res) => {
  const isPersonalRecordSubmission = String(req.params.registrationId || '').trim() === PERSONAL_RECORD_REGISTRATION_ID;
  return handleRunnerSubmissionWrite(req, res, {
    mode: 'create',
    successMessage: isPersonalRecordSubmission
      ? 'Personal record saved successfully.'
      : 'Run result submitted successfully. Await organizer review.'
  });
};

exports.postResubmitResult = async (req, res) => {
  return handleRunnerSubmissionWrite(req, res, {
    mode: 'resubmit',
    successMessage: 'Run result resubmitted successfully. Await organizer review.'
  });
};

exports.postEditSubmissionMetadata = async (req, res) => {
  try {
    const user = await User.findById(req.session.userId).select('_id');
    if (!user) return res.redirect('/login');

    const submissionId = String(req.params.submissionId || '').trim();
    if (!submissionId) return redirectWithPageMessage(res, 'error', 'Invalid submission.');

    const rawDistance = req.body.distanceKm;
    const distanceKm = Number(rawDistance);

    const rawTime = String(req.body.elapsedTime || '').trim();
    const timeParts = rawTime.split(':').map(Number);
    let elapsedMs;
    if (timeParts.length === 3 && timeParts.every((p) => Number.isFinite(p))) {
      const [h, m, s] = timeParts;
      elapsedMs = ((h * 3600) + (m * 60) + s) * 1000;
    }

    const runDate = String(req.body.runDate || '').trim();
    const runType = String(req.body.runType || '').trim();
    const runLocation = String(req.body.runLocation || '').trim();

    await editRejectedSubmissionMetadata({
      submissionId,
      runnerId: user._id,
      distanceKm,
      elapsedMs,
      runDate: runDate || undefined,
      runType: runType || undefined,
      runLocation: runLocation || undefined
    });

    return res.redirect(`/runner/submissions/${submissionId}?type=success&msg=Details+updated.+Awaiting+organiser+review.`);
  } catch (error) {
    const submissionId = String(req.params.submissionId || '').trim();
    const msg = encodeURIComponent(error.message || 'An error occurred while updating your submission.');
    return res.redirect(`/runner/submissions/${submissionId}?type=error&msg=${msg}`);
  }
};

exports.getSubmissionCertificateDownload = async (req, res) => {
  try {
    const user = await User.findById(req.session.userId).select('email');
    if (!user) {
      return res.redirect('/login');
    }

    const submission = await Submission.findOne({
      _id: req.params.submissionId,
      runnerId: user._id
    })
      .populate({ path: 'eventId', select: 'title' })
      .populate({ path: 'registrationId', select: 'confirmationCode' })
      .lean();

    let certificateRecord = submission;
    if (!certificateRecord) {
      certificateRecord = await AccumulatedActivitySubmission.findOne({
        _id: req.params.submissionId,
        runnerId: user._id
      })
        .populate({ path: 'eventId', select: 'title' })
        .populate({ path: 'registrationId', select: 'confirmationCode' })
        .lean();
    }

    if (!certificateRecord) {
      return redirectWithPageMessage(res, 'error', 'Submission not found or inaccessible.');
    }
    if (certificateRecord.status !== 'approved') {
      return redirectWithPageMessage(res, 'error', 'Certificate is available only for approved submissions.');
    }
    if (certificateRecord.certificate?.status === 'revoked' || certificateRecord.certificate?.revokedAt) {
      return redirectWithPageMessage(res, 'error', 'This certificate is no longer valid.');
    }

    const certificateUrl = String(certificateRecord.certificate?.url || '').trim();
    if (!certificateUrl) {
      return redirectWithPageMessage(res, 'error', 'Certificate is not yet available. Please try again shortly.');
    }

    if (certificateUrl.startsWith('data:application/pdf;base64,')) {
      const base64 = certificateUrl.slice('data:application/pdf;base64,'.length);
      const pdfBuffer = Buffer.from(base64, 'base64');
      const safeEventTitle = String(certificateRecord.eventId?.title || 'HelloRun')
        .replace(/[^a-z0-9-_]+/gi, '-')
        .replace(/^-+|-+$/g, '')
        .toLowerCase()
        .slice(0, 60) || 'hello-run';
      const confirmationCode = String(certificateRecord.registrationId?.confirmationCode || 'certificate')
        .replace(/[^a-z0-9-]/gi, '')
        .toUpperCase();
      const fileName = `${safeEventTitle}-${confirmationCode}-certificate.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      return res.status(200).send(pdfBuffer);
    }

    return res.redirect(certificateUrl);
  } catch (error) {
    console.error('Error downloading submission certificate:', error);
    return redirectWithPageMessage(res, 'error', 'Unable to download certificate at this time.');
  }
};

exports.postUploadPaymentProof = async (req, res) => {
  let uploadedProofKey = '';
  try {
    const user = await User.findById(req.session.userId).select('firstName lastName email role');
    if (!user) {
      return res.redirect('/login');
    }

    if (req.uploadError) {
      const query = new URLSearchParams({
        type: 'error',
        msg: req.uploadError
      });
      return res.redirect(`/my-registrations?${query.toString()}`);
    }

    const proofFile = req.file;
    if (!proofFile) {
      const query = new URLSearchParams({
        type: 'error',
        msg: 'Please select a payment receipt file before submitting.'
      });
      return res.redirect(`/my-registrations?${query.toString()}`);
    }

    const registrationId = String(req.params.registrationId || '').trim();
    const registration = await Registration.findOne({
      _id: registrationId,
      userId: user._id
    }).populate('eventId', 'title slug organizerId');

    if (!registration || !registration.eventId) {
      const query = new URLSearchParams({
        type: 'error',
        msg: 'Registration not found or inaccessible.'
      });
      return res.redirect(`/my-registrations?${query.toString()}`);
    }

    if (!canRunnerSubmitPaymentProof(registration)) {
      const query = new URLSearchParams({
        type: 'error',
        msg: 'Payment receipt upload is only allowed for unpaid/rejected active registrations.'
      });
      return res.redirect(`/my-registrations?${query.toString()}`);
    }

    const previousProofKey = String(registration.paymentProof?.key || '').trim();
    const previousProofUrl = String(registration.paymentProof?.url || '').trim();
    const uploadedProof = await uploadService.uploadPaymentProofToR2({
      userId: user._id,
      paymentProofFile: proofFile
    });
    uploadedProofKey = uploadedProof.key;

    const nextPaymentProof = {
      url: uploadedProof.url,
      key: uploadedProof.key,
      mimeType: proofFile.mimetype || '',
      size: Number(proofFile.size || 0),
      uploadedAt: new Date(),
      submittedBy: user._id
    };
    await Registration.updateOne(
      { _id: registration._id, userId: user._id },
      {
        $set: {
          paymentProof: nextPaymentProof,
          paymentStatus: 'proof_submitted',
          paymentReviewedAt: null,
          paymentReviewedBy: null,
          paymentReviewNotes: '',
          paymentRejectionReason: ''
        },
        $inc: {
          paymentSubmissionCount: 1
        }
      }
    );

    const updatedRegistration = await Registration.findById(registration._id);
    if (updatedRegistration) {
      syncRegistrationPaymentShadow(updatedRegistration, { operation: 'live_sync' }).catch((error) => {
        logger.error('Supabase registration/payment shadow sync failed:', {
          registrationId: String(registration._id),
          error: error?.message || String(error)
        });
        recordSyncFailureInBackground('registration', String(registration._id), error, { operation: 'live_sync' });
      });

      await upsertShopPaymentForRegistrationProof({
        registration: updatedRegistration,
        proof: nextPaymentProof
      });
    }

    uploadedProofKey = '';

    const cleanupKeys = [];
    if (previousProofKey && previousProofKey !== uploadedProof.key) {
      cleanupKeys.push(previousProofKey);
    } else if (previousProofUrl && previousProofUrl !== uploadedProof.url) {
      const derivedKey = uploadService.extractObjectKeyFromPublicUrl(previousProofUrl);
      if (derivedKey && derivedKey !== uploadedProof.key) {
        cleanupKeys.push(derivedKey);
      }
    }
    if (cleanupKeys.length) {
      await uploadService.deleteObjects(cleanupKeys);
    }

    try {
      const organizer = await User.findById(registration.eventId.organizerId).select('firstName email');
      await communicationService.notify('payment.receipt_submitted', {
        notification: {
          userId: user._id,
          type: 'payment_proof_submitted',
          title: 'Payment Receipt Submitted',
          message: `Payment receipt submitted for ${registration.eventId.title || 'your event registration'}.`,
          href: '/my-registrations',
          metadata: {
            registrationId: String(registration._id),
            eventId: String(registration.eventId._id || ''),
            eventTitle: registration.eventId.title || ''
          }
        },
        email: organizer?.email ? {
          to: organizer.email,
          organizerFirstName: organizer.firstName || 'Organizer',
          runnerName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
          eventTitle: registration.eventId.title || 'Event',
          confirmationCode: registration.confirmationCode || '',
          recipientUserId: organizer._id,
          metadata: {
            registrationId: String(registration._id),
            eventId: String(registration.eventId._id || ''),
            runnerId: String(user._id)
          }
        } : null
      });
    } catch (communicationError) {
      console.error('Payment receipt submission communication failed:', {
        error: communicationError.message,
        registrationId: String(registration._id)
      });
    }

    const query = new URLSearchParams({
      type: 'success',
      msg: 'Payment receipt submitted successfully. Await organizer verification.'
    });
    return res.redirect(`/my-registrations?${query.toString()}`);
  } catch (error) {
    if (uploadedProofKey) {
      await uploadService.deleteObjects([uploadedProofKey]);
    }
    console.error('Error uploading payment receipt:', error);
    const query = new URLSearchParams({
      type: 'error',
      msg: 'An error occurred while uploading payment receipt. Please try again.'
    });
    return res.redirect(`/my-registrations?${query.toString()}`);
  }
};

exports.__setSyncRegistrationPaymentShadow = (fn) => {
  syncRegistrationPaymentShadow = fn;
};

exports.__resetSyncRegistrationPaymentShadow = () => {
  syncRegistrationPaymentShadow = require('../services/registration-payment-shadow.service').syncRegistrationPaymentShadow;
};

exports.__testCreateRegistrationAddOnOrderIfNeeded = createRegistrationCheckoutOrderIfNeeded;
exports.__testCreateRegistrationCheckoutOrderIfNeeded = createRegistrationCheckoutOrderIfNeeded;

async function handleRunnerSubmissionWrite(req, res, options = {}) {
  let uploadedProofKey = '';
  try {
    const user = await User.findById(req.session.userId).select('email role firstName lastName');
    if (!user) {
      return res.redirect('/login');
    }

    if (req.uploadError) {
      return redirectWithPageMessage(res, 'error', req.uploadError);
    }

    const resultProofFile = req.file;
    if (!resultProofFile) {
      return redirectWithPageMessage(res, 'error', 'Please select run result evidence before submitting.');
    }

    const registrationId = String(req.params.registrationId || '').trim();
    const targetRegistrationIds = parseSelectedSubmissionRegistrationIds(req.body.selectedRegistrationIds, registrationId);
    if (!targetRegistrationIds.length) {
      return redirectWithPageMessage(res, 'error', 'Select at least one eligible event before submitting.');
    }

    const isPersonalRecordSubmission = registrationId === PERSONAL_RECORD_REGISTRATION_ID;
    const selectedHasPersonalRecord = targetRegistrationIds.includes(PERSONAL_RECORD_REGISTRATION_ID);
    const selectedEventRegistrationIds = targetRegistrationIds.filter((id) => id !== PERSONAL_RECORD_REGISTRATION_ID);
    const selectedRegistrations = selectedEventRegistrationIds.length
      ? await Registration.find({
        _id: { $in: selectedEventRegistrationIds },
        userId: user._id
      })
        .populate('eventId', 'virtualCompletionMode title targetDistanceKm eventStartAt eventEndAt')
        .select('_id eventId')
        .lean()
      : [];
    const eventByRegistrationId = new Map(
      selectedRegistrations
        .filter((item) => item.eventId)
        .map((item) => [String(item._id), item.eventId])
    );
    const accumulatedTargetIds = new Set(
      selectedRegistrations
        .filter((item) => item.eventId?.virtualCompletionMode === 'accumulated_distance')
        .map((item) => String(item._id))
    );
    const regularEventRegistrationIds = selectedEventRegistrationIds.filter((id) => !accumulatedTargetIds.has(String(id)));
    const existingSubmissions = selectedEventRegistrationIds.length
      ? await Submission.find({
        registrationId: { $in: regularEventRegistrationIds },
        runnerId: user._id
      })
        .select('_id status proof registrationId')
        .lean()
      : [];
    const existingSubmissionByRegistrationId = new Map(
      existingSubmissions.map((item) => [String(item.registrationId), item])
    );
    const existingSubmission = isPersonalRecordSubmission
      ? null
      : existingSubmissionByRegistrationId.get(registrationId) || null;

    if (selectedHasPersonalRecord && options.mode === 'resubmit' && targetRegistrationIds.length === 1) {
      return redirectWithPageMessage(res, 'error', 'Personal record submissions create a new entry each time.');
    }

    if (!accumulatedTargetIds.has(registrationId) && targetRegistrationIds.length === 1 && options.mode === 'create' && existingSubmission) {
      return redirectWithPageMessage(res, 'error', 'Submission already exists. Use resubmit flow if rejected.');
    }
    if (!accumulatedTargetIds.has(registrationId) && targetRegistrationIds.length === 1 && options.mode === 'resubmit' && !existingSubmission) {
      return redirectWithPageMessage(res, 'error', 'No rejected submission found to resubmit.');
    }
    if (!accumulatedTargetIds.has(registrationId) && targetRegistrationIds.length === 1 && options.mode === 'resubmit' && existingSubmission.status !== 'rejected') {
      return redirectWithPageMessage(res, 'error', 'Only rejected submissions can be resubmitted.');
    }

    const runDate = parseRunDate(req.body.runDate);

    for (const targetId of targetRegistrationIds) {
      if (targetId === PERSONAL_RECORD_REGISTRATION_ID) continue;
      const targetEvent = eventByRegistrationId.get(String(targetId));
      if (targetEvent && !isRunDateAlignedWithEvent({ event: targetEvent, runDate })) {
        return redirectWithPageMessage(res, 'error', `${targetEvent.title || 'This event'}: run date is outside the event window.`);
      }
      if (accumulatedTargetIds.has(String(targetId))) continue;
      const existingForTarget = existingSubmissionByRegistrationId.get(targetId);
      if (existingForTarget && existingForTarget.status !== 'rejected') {
        return redirectWithPageMessage(res, 'error', 'One or more selected entries already has a submitted or approved result.');
      }
    }

    const distanceKm = parseDistanceKm(req.body.distanceKm);
    const elapsedMs = parseElapsedToMs(req.body.elapsedTime);
    const runLocation = parseRunLocation(req.body.runLocation);
    const proofType = normalizeProofType(req.body.proofType);
    const proofNotes = String(req.body.proofNotes || '').trim().slice(0, 1200);
    const runType = parseRunType(req.body.runType);
    const elevationGain = parseElevationGain(req.body.elevationGain);
    const steps = parseSteps(req.body.steps);

    const ocrData = parseOcrData(req.body, distanceKm, elapsedMs, user);

    const proofHash = crypto.createHash('sha256').update(resultProofFile.buffer).digest('hex');

    const targetExistingSubmissionIds = existingSubmissions.map((item) => item._id).filter(Boolean);
    const duplicateQuery = {
      runnerId: user._id,
      'proof.hash': proofHash
    };
    if (targetExistingSubmissionIds.length) {
      duplicateQuery._id = { $nin: targetExistingSubmissionIds };
    }
    const duplicateSubmission = await Submission.findOne(duplicateQuery).select('_id').lean();
    const duplicateActivity = await AccumulatedActivitySubmission.findOne({
      runnerId: user._id,
      'proof.hash': proofHash
    }).select('_id').lean();
    if (duplicateSubmission || duplicateActivity) {
      await uploadService.deleteObjects([uploadedProofKey]).catch(() => {});
      uploadedProofKey = '';
      return redirectWithPageMessage(res, 'error', 'This screenshot has already been submitted.');
    }

    const uploadedProof = await uploadService.uploadResultProofToR2({
      userId: user._id,
      resultProofFile
    });
    uploadedProofKey = uploadedProof.key;

    const previousProofKeys = new Set();
    let savedCount = 0;
    for (const targetId of targetRegistrationIds) {
      const existingForTarget = targetId === PERSONAL_RECORD_REGISTRATION_ID
        ? null
        : existingSubmissionByRegistrationId.get(targetId) || null;
      const payload = {
        registrationId: targetId,
        runnerId: user._id,
        distanceKm,
        elapsedMs,
        runDate,
        runLocation,
        proofType,
        proof: {
          url: uploadedProof.url,
          key: uploadedProof.key,
          mimeType: resultProofFile.mimetype || '',
          size: Number(resultProofFile.size || 0),
          hash: proofHash
        },
        proofNotes,
        runType,
        elevationGain,
        steps,
        ocrData
      };

      if (existingForTarget && existingForTarget.status === 'rejected') {
        await resubmitSubmission(payload);
        const previousKey = String(existingForTarget.proof?.key || '').trim();
        if (previousKey && previousKey !== uploadedProof.key) previousProofKeys.add(previousKey);
      } else if (accumulatedTargetIds.has(String(targetId))) {
        await createAccumulatedActivitySubmission(payload);
      } else {
        await createSubmission(payload);
      }
      savedCount += 1;
    }

    uploadedProofKey = '';
    for (const previousProofKey of previousProofKeys) {
      await deleteProofObjectIfUnused(previousProofKey);
    }

    const successMessage = savedCount > 1
      ? `Run result saved for ${savedCount} entries.`
      : (options.successMessage || 'Run result saved.');
    return redirectWithPageMessage(res, 'success', successMessage);
  } catch (error) {
    if (uploadedProofKey) {
      await uploadService.deleteObjects([uploadedProofKey]);
    }
    console.error('Error submitting runner result:', error);
    return redirectWithPageMessage(
      res,
      'error',
      String(error?.message || 'An error occurred while saving your result. Please try again.')
    );
  }
}

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
        authorName: selectedAuthorUser ? `${selectedAuthorUser.firstName || ''} ${selectedAuthorUser.lastName || ''}`.trim() : ''
      },
      pagination: {
        currentPage,
        totalPages,
        totalPosts
      },
      seo: {
        description: 'Explore running tips, race recaps, and training stories from the HelloRun community.',
        canonicalUrl
      }
    });
  } catch (error) {
    console.error('Error loading blog list:', error);
    return res.status(500).render('error', {
      title: 'Server Error',
      status: 500,
      message: 'An error occurred while loading blog posts.'
    });
  }
};

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
        console.error('Blog view tracking failed:', viewError.message);
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
    console.error('Error loading blog post:', error);
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
    console.error('Error loading leaderboard:', error);
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
    console.error('Error loading event leaderboard:', error);
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
    console.error('Error loading event leaderboard data:', error);
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
    console.error('Error loading my leaderboard standing:', error);
    return res.status(500).json({ success: false, message: 'Unable to load your standing.' });
  }
};

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
      Event.find(getPublicEventVisibilityQuery(new Date()))
        .select('slug updatedAt createdAt')
        .sort({ updatedAt: -1 })
        .lean(),
      Blog.find({
        status: 'published',
        isDeleted: { $ne: true }
      })
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
    console.error('Error generating sitemap:', error);
    return res.status(500).render('error', {
      title: 'Server Error',
      status: 500,
      message: 'An error occurred while generating the sitemap.'
    });
  }
};

function getPageMessage(query) {
  const msg = typeof query.msg === 'string' ? query.msg.trim() : '';
  if (!msg) return null;
  const type = query.type === 'error' ? 'error' : 'success';
  return { type, text: msg.slice(0, 220) };
}

function redirectWithPageMessage(res, type, message) {
  const query = new URLSearchParams({
    type: type === 'error' ? 'error' : 'success',
    msg: String(message || '').slice(0, 220)
  });
  return res.redirect(`/my-registrations?${query.toString()}`);
}

function parseDistanceKm(value) {
  const numeric = Number(String(value || '').trim());
  if (!Number.isFinite(numeric) || numeric <= 0 || numeric > 500) {
    throw new Error('Distance must be a valid number between 0.1 and 500 km.');
  }
  return Number(numeric.toFixed(3));
}

function parseElapsedToMs(value) {
  const raw = String(value || '').trim();
  const match = raw.match(/^(\d{1,2}):([0-5]\d):([0-5]\d)$/);
  if (!match) {
    throw new Error('Elapsed time must be in HH:MM:SS format.');
  }
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3]);
  const totalMs = ((hours * 60 * 60) + (minutes * 60) + seconds) * 1000;
  if (totalMs <= 0 || totalMs > 7 * 24 * 60 * 60 * 1000) {
    throw new Error('Elapsed time is out of allowed range.');
  }
  return totalMs;
}

function normalizeProofType(value) {
  const safe = String(value || '').trim().toLowerCase();
  if (safe === 'gps' || safe === 'photo' || safe === 'manual') {
    return safe;
  }
  return 'manual';
}

function parseRunDate(value) {
  const raw = String(value || '').trim();
  if (!raw) return new Date();
  return assertRunDateNotFuture(parseRunDateOnly(raw));
}

function parseRunLocation(value) {
  const safe = String(value || '').trim();
  if (safe.length > 200) {
    throw new Error('Run location must be 200 characters or less.');
  }
  return safe;
}

function parseSelectedSubmissionRegistrationIds(rawValue, fallbackRegistrationId) {
  const rawItems = String(rawValue || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  const fallback = String(fallbackRegistrationId || '').trim();
  const sourceItems = rawItems.length ? rawItems : [fallback];
  const selected = [];
  const seen = new Set();

  for (const item of sourceItems) {
    const safe = item === PERSONAL_RECORD_REGISTRATION_ID || /^[a-f0-9]{24}$/i.test(item)
      ? item
      : '';
    if (!safe || seen.has(safe)) continue;
    seen.add(safe);
    selected.push(safe);
    if (selected.length >= 10) break;
  }

  return selected;
}

async function deleteProofObjectIfUnused(proofKey) {
  const safeKey = String(proofKey || '').trim();
  if (!safeKey) return;
  const stillUsed = await Submission.exists({ 'proof.key': safeKey });
  if (stillUsed) return;
  await uploadService.deleteObjects([safeKey]).catch(() => {});
}

function parseOcrData(body, formDistanceKm, formElapsedMs, user = null) {
  const rawDistance = parseOptionalNumber(body.ocrDistance);
  const rawTime = parseOptionalNumber(body.ocrTime);
  const rawElevation = parseOptionalNumber(body.ocrElevation);
  const rawSteps = parseOptionalNumber(body.ocrSteps);
  const rawConfidence = parseOptionalNumber(body.ocrConfidence);

  const extractedDistanceKm = rawDistance !== null && rawDistance > 0 && rawDistance <= 1000 ? rawDistance : null;
  const extractedTimeMs = rawTime !== null && rawTime > 0 && rawTime <= 7 * 24 * 60 * 60 * 1000 ? rawTime : null;
  const extractedElevationGain = rawElevation !== null && rawElevation >= 0 && rawElevation <= 20000 ? Math.round(rawElevation) : null;
  const extractedSteps = rawSteps !== null && rawSteps >= 0 && rawSteps <= 200000 ? Math.round(rawSteps) : null;
  const extractedRunDate = parseOcrDate(body.ocrDate);
  const extractedRunLocation = String(body.ocrLocation || '').trim().slice(0, 200);
  const extractedRunType = parseRunTypeOrBlank(body.ocrRunType);
  const confidence = rawConfidence !== null && rawConfidence >= 0 && rawConfidence <= 1 ? Math.round(rawConfidence * 100) / 100 : 0;
  const rawText = String(body.ocrRawText || '').slice(0, 2000);
  const allowedSources = new Set(['strava', 'nike', 'garmin', 'apple', 'google', 'coros', 'unknown', '']);
  const rawSource = String(body.ocrDetectedSource || '').trim().toLowerCase();
  const detectedSource = allowedSources.has(rawSource) ? rawSource : '';
  const parserVersion = String(body.ocrParserVersion || '').trim().slice(0, 40);
  const ocrPass = String(body.ocrPass || '').trim().slice(0, 40);
  const qualityFlags = String(body.ocrQualityFlags || '')
    .split(',')
    .map((item) => item.trim().toLowerCase().replace(/[^a-z0-9_-]/g, ''))
    .filter(Boolean)
    .slice(0, 10);
  const extractedName = cleanOcrNameCandidate(body.ocrExtractedName).slice(0, 120);
  const allowedNameStatuses = new Set(['matched', 'mismatched', 'not_detected', 'not_checked']);
  const rawNameStatus = String(body.ocrNameMatchStatus || '').trim().toLowerCase();
  // Only trust this flag when the user explicitly acknowledged the mismatch via the dialog
  const nameMismatchAcknowledged = String(body.ocrNameMismatch || '').trim() === '1';
  const accountName = `${String(user?.firstName || '').trim()} ${String(user?.lastName || '').trim()}`.trim();
  let nameMatchStatus = allowedNameStatuses.has(rawNameStatus) ? rawNameStatus : 'not_checked';
  if (extractedName) {
    nameMatchStatus = namesMatch(extractedName, accountName) ? 'matched' : 'mismatched';
  } else if (rawText || confidence > 0 || extractedDistanceKm !== null || extractedTimeMs !== null) {
    nameMatchStatus = 'not_detected';
  }

  // Recompute mismatch flags server-side (don't trust client values)
  let distanceMismatch = false;
  let timeMismatch = false;
  const elevationMismatch = String(body.ocrElevationMismatch || '').trim() === '1';
  const stepsMismatch = String(body.ocrStepsMismatch || '').trim() === '1';
  const dateMismatch = String(body.ocrDateMismatch || '').trim() === '1';
  const locationMismatch = String(body.ocrLocationMismatch || '').trim() === '1';
  const runTypeMismatch = String(body.ocrRunTypeMismatch || '').trim() === '1';

  if (extractedDistanceKm !== null && Number.isFinite(formDistanceKm) && formDistanceKm > 0) {
    const distDiff = Math.abs(extractedDistanceKm - formDistanceKm);
    const threshold = Math.max(formDistanceKm * 0.1, 0.5);
    distanceMismatch = distDiff > threshold;
  }

  if (extractedTimeMs !== null && Number.isFinite(formElapsedMs) && formElapsedMs > 0) {
    const timeDiff = Math.abs(extractedTimeMs - formElapsedMs);
    timeMismatch = timeDiff > 60000;
  }

  return {
    extractedDistanceKm,
    extractedTimeMs,
    extractedElevationGain,
    extractedSteps,
    extractedRunDate,
    extractedRunLocation,
    extractedRunType,
    rawText,
    confidence,
    distanceMismatch,
    timeMismatch,
    elevationMismatch,
    stepsMismatch,
    dateMismatch,
    locationMismatch,
    runTypeMismatch,
    detectedSource,
    parserVersion,
    ocrPass,
    qualityFlags,
    extractedName,
    nameMatchStatus,
    nameMismatchAcknowledged
  };
}

function parseOptionalNumber(value) {
  const safe = String(value ?? '').trim();
  if (!safe) return null;
  const numeric = Number(safe);
  return Number.isFinite(numeric) ? numeric : null;
}

function parseOcrDate(value) {
  const safe = String(value || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(safe)) return '';
  const parsed = new Date(`${safe}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? '' : safe;
}

function parseRunTypeOrBlank(value) {
  const safe = String(value || '').trim().toLowerCase();
  return ['run', 'walk', 'hike', 'trail_run'].includes(safe) ? safe : '';
}

function namesMatch(ocrName, accountName) {
  const ocrNameLower = String(ocrName || '').trim().toLowerCase();
  const accountNameLower = String(accountName || '').trim().toLowerCase();
  if (!ocrNameLower || !accountNameLower) return false;
  if (
    ocrNameLower === accountNameLower ||
    ocrNameLower.includes(accountNameLower) ||
    accountNameLower.includes(ocrNameLower)
  ) {
    return true;
  }
  const parts = accountNameLower.split(/\s+/).filter(Boolean);
  if (parts.length < 2) return false;
  return ocrNameLower.includes(parts[0]) && ocrNameLower.includes(parts[parts.length - 1]);
}

function cleanOcrNameCandidate(value) {
  const name = String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[^A-Za-z]+/, '')
    .replace(/^\d+\s*[%.)\]-]*\s*/, '')
    .replace(/\s+[A-Za-z]?[%=_~^`|]+$/g, '')
    .replace(/[|\\/,;:!?.\s]+$/g, '')
    .replace(/^[^A-Za-z]+/, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!name || /\d/.test(name)) return '';
  if (/\b(?:km|mi|mile|miles|meter|meters|ft|feet|bpm|cal|kcal|min|sec|pace)\b/i.test(name)) return '';
  if (/\b(?:distance|moving\s+time|elapsed\s+time|elevation|calories|heart\s+rate|relative\s+effort|segments?|kudos|weather|humidity|wind|cadence|steps)\b/i.test(name)) return '';
  const letters = (name.match(/[A-Za-z]/g) || []).length;
  const visible = name.replace(/\s/g, '').length;
  if (!visible || letters / visible < 0.65) return '';
  return name;
}

function parseRunType(value) {
  const safe = String(value || '').trim().toLowerCase();
  const allowed = ['run', 'walk', 'hike', 'trail_run'];
  return allowed.includes(safe) ? safe : 'run';
}

function parseElevationGain(value) {
  if (value === undefined || value === null || value === '') return null;
  const numeric = Number(String(value).trim());
  if (!Number.isFinite(numeric) || numeric < 0 || numeric > 20000) return null;
  return Math.round(numeric);
}

function parseSteps(value) {
  if (value === undefined || value === null || value === '') return null;
  const numeric = Number(String(value).trim());
  if (!Number.isFinite(numeric) || numeric < 0 || numeric > 200000) return null;
  return Math.round(numeric);
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

function getAppBaseUrl() {
  return String(process.env.APP_URL || '').trim().replace(/\/+$/, '');
}

function getSitemapBaseUrl(req) {
  const configured = getAppBaseUrl();
  if (configured) return configured;

  const forwardedProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  const protocol = forwardedProto || req.protocol || 'http';
  const host = String(req.get('host') || '').trim();
  return host ? `${protocol}://${host}` : 'https://hellorun.online';
}

function formatSitemapDate(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }
  return date.toISOString().slice(0, 10);
}

function escapeXml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
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

function getRegistrationFormData(body = {}) {
  const runningGroups = normalizeRunnerGroups(body.runningGroups || body.runningGroup);
  return {
    firstName: String(body.firstName || '').trim(),
    lastName: String(body.lastName || '').trim(),
    email: String(body.email || '').trim().toLowerCase(),
    mobile: String(body.mobile || '').trim(),
    country: normalizeCountryCode(body.country),
    dateOfBirth: formatDateForInput(body.dateOfBirth),
    gender: String(body.gender || '').trim(),
    emergencyContactName: String(body.emergencyContactName || '').trim(),
    emergencyContactNumber: String(body.emergencyContactNumber || '').trim(),
    runningGroups,
    runningGroup: runningGroups[0] || '',
    participationMode: String(body.participationMode || '').trim(),
    raceDistance: String(body.raceDistance || '').trim().toUpperCase(),
    customizedOptionId: String(body.customizedOptionId || '').trim(),
    registrationPackageId: String(body.registrationPackageId || '').trim(),
    addOnProductIds: normalizeRegistrationAddOnIds(body.addOnProductIds),
    waiverAccepted: body.waiverAccepted === '1' || body.waiverAccepted === 'true' || body.waiverAccepted === true || body.waiverAccepted === 'on',
    waiverSignature: String(body.waiverSignature || '').trim()
  };
}

function normalizeRegistrationAddOnIds(value) {
  const values = Array.isArray(value) ? value : [value];
  return Array.from(
    new Set(
      values
        .map((item) => String(item || '').trim())
        .filter(Boolean)
    )
  ).slice(0, 25);
}

function getQuickProfileUpdatePayload(body = {}) {
  const hasCountryInput = Object.prototype.hasOwnProperty.call(body, 'country');
  const hasEmergencyContactInput = Object.prototype.hasOwnProperty.call(body, 'emergencyContactName')
    || Object.prototype.hasOwnProperty.call(body, 'emergencyContactNumber');
  const hasRunningGroupsInput = Object.prototype.hasOwnProperty.call(body, 'runningGroups')
    || Object.prototype.hasOwnProperty.call(body, 'runningGroupsText')
    || Object.prototype.hasOwnProperty.call(body, 'runningGroup');
  return {
    mobile: String(body.mobile || '').trim(),
    country: normalizeCountryCode(body.country),
    dateOfBirth: formatDateForInput(body.dateOfBirth),
    gender: String(body.gender || '').trim(),
    emergencyContactName: String(body.emergencyContactName || '').trim(),
    emergencyContactNumber: String(body.emergencyContactNumber || '').trim(),
    requiresEmergencyContact: body.requiresEmergencyContact === '1'
      || body.requiresEmergencyContact === 'true'
      || body.requiresEmergencyContact === true
      || body.requiresEmergencyContact === 'on',
    runningGroups: normalizeRunnerGroups(body.runningGroups || body.runningGroupsText || body.runningGroup),
    hasCountryInput,
    hasEmergencyContactInput,
    hasRunningGroupsInput
  };
}

function validateQuickProfileUpdatePayload(payload) {
  const errors = {};
  const allowedGenderValues = new Set(['male', 'female', 'non_binary', 'prefer_not_to_say']);

  if (!payload.mobile) {
    errors.mobile = 'Mobile is required.';
  } else if (!/^[\d\s\-()+]{7,25}$/.test(payload.mobile)) {
    errors.mobile = 'Enter a valid mobile number.';
  }

  if (payload.hasCountryInput) {
    if (!payload.country) {
      errors.country = 'Country is required.';
    } else if (!isValidCountryCode(payload.country)) {
      errors.country = 'Select a valid country.';
    }
  }

  if (payload.dateOfBirth) {
    const dobDate = new Date(`${payload.dateOfBirth}T00:00:00.000Z`);
    if (Number.isNaN(dobDate.getTime())) {
      errors.dateOfBirth = 'Enter a valid date of birth.';
    } else if (dobDate > new Date()) {
      errors.dateOfBirth = 'Date of birth cannot be in the future.';
    }
  }

  if (payload.gender && !allowedGenderValues.has(payload.gender)) {
    errors.gender = 'Select a valid gender option.';
  }

  if (payload.requiresEmergencyContact && !payload.emergencyContactName) {
    errors.emergencyContactName = 'Emergency contact name is required.';
  } else if (payload.emergencyContactName.length > 120) {
    errors.emergencyContactName = 'Emergency contact name must be 120 characters or less.';
  }

  if (payload.requiresEmergencyContact && !payload.emergencyContactNumber) {
    errors.emergencyContactNumber = 'Emergency contact number is required.';
  } else if (payload.emergencyContactNumber && !/^[\d\s\-()+]{7,25}$/.test(payload.emergencyContactNumber)) {
    errors.emergencyContactNumber = 'Enter a valid emergency contact number.';
  }

  if (payload.runningGroups.length > 10) {
    errors.runningGroups = 'You can add up to 10 running groups.';
  } else if (payload.runningGroups.some((item) => item.length > 120)) {
    errors.runningGroups = 'Each running group must be 120 characters or less.';
  }

  return errors;
}

function getAllowedParticipationModes(event) {
  const allowed = Array.isArray(event.eventTypesAllowed) ? event.eventTypesAllowed : [];
  const normalized = new Set();

  if (allowed.includes('virtual')) normalized.add('virtual');
  if (allowed.includes('onsite')) normalized.add('onsite');

  // Backward safety for events that only have eventType
  if (!normalized.size) {
    if (event.eventType === 'virtual') normalized.add('virtual');
    if (event.eventType === 'onsite') normalized.add('onsite');
    if (event.eventType === 'hybrid') {
      normalized.add('virtual');
      normalized.add('onsite');
    }
  }

  return Array.from(normalized);
}

function getAllowedRaceDistances(event) {
  const categories = getRaceCategoryOptions(event);
  if (categories.length) {
    return Array.from(new Set(
      categories
        .map((category) => String(category.distanceLabel || category.name || '').trim().toUpperCase())
        .filter(Boolean)
    ));
  }
  const values = Array.isArray(event.raceDistances) ? event.raceDistances : [];
  return values
    .map((item) => String(item || '').trim().toUpperCase())
    .filter(Boolean);
}

async function loadRegistrationAddOns(eventId) {
  try {
    const products = await listProductsByMongoEventId(String(eventId || ''), { limit: 150 });
    return products
      .filter((item) => item
        && item.status === 'active'
        && item.is_visible !== false
        && item.show_during_registration === true)
      .map((item) => ({
        id: String(item.id || ''),
        name: String(item.name || '').trim(),
        slug: String(item.slug || '').trim(),
        productType: String(item.product_type || '').trim() || 'event_shop_item',
        currency: String(item.currency || 'PHP').trim().toUpperCase(),
        basePrice: Math.max(0, Number(item.base_price || 0))
      }))
      .filter((item) => item.name.length > 0)
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  } catch (error) {
    console.warn('Registration add-ons unavailable:', error.message || error);
    return [];
  }
}

function resolveSelectedRegistrationAddOns(selectedIds = [], availableAddOns = []) {
  const byId = new Map(availableAddOns.map((item) => [String(item.id || ''), item]));
  const selected = [];
  const invalidIds = [];

  for (const id of selectedIds) {
    const key = String(id || '').trim();
    if (!key) continue;
    const match = byId.get(key);
    if (!match) {
      invalidIds.push(key);
      continue;
    }

    const unitPrice = Math.max(0, Number(match.basePrice || 0));
    selected.push({
      productId: key,
      name: match.name,
      productType: match.productType || 'event_shop_item',
      currency: match.currency || 'PHP',
      unitPrice,
      quantity: 1,
      lineTotal: unitPrice
    });
  }

  const subtotal = selected.reduce((sum, item) => sum + Number(item.lineTotal || 0), 0);
  const currency = selected[0]?.currency || 'PHP';

  return {
    selected,
    invalidIds,
    subtotal,
    currency
  };
}

async function createRegistrationCheckoutOrderIfNeeded({
  registration,
  event,
  user,
  selectedAddOns = [],
  addOnsSubtotal = 0,
  currency = 'PHP'
} = {}) {
  if (!process.env.DATABASE_URL) return;
  if (!registration || !event || !user) return;

  const registrationFeeAmount = Math.max(0, Number(registration.paymentAmountDue || registration.pricingSnapshot?.amount || 0));
  const addOnsAmount = Math.max(0, Number(addOnsSubtotal || 0));
  const checkoutSubtotal = registrationFeeAmount + addOnsAmount;
  if (!Number.isFinite(checkoutSubtotal) || checkoutSubtotal <= 0) return;

  const orderCurrency = String(registration.paymentCurrency || registration.pricingSnapshot?.currency || currency || 'PHP')
    .trim()
    .toUpperCase() || 'PHP';

  const sql = getPostgresClient();
  const totals = recalculateOrderTotals({
    subtotal: checkoutSubtotal,
    deliveryFee: 0,
    platformFee: 0
  });
  const orderNote = buildRegistrationOrderNote(registration._id);

  try {
    const existingOrderRows = await sql`
      select id
      from orders
      where order_source = 'registration_checkout'
        and customer_note = ${orderNote}
      limit 1
    `;
    if (existingOrderRows.length > 0) return;

    const appUserRows = await sql`
      insert into app_users (mongo_user_id, email, role_snapshot, display_name)
      values (
        ${String(user._id)},
        ${String(user.email || '').trim().toLowerCase()},
        'runner',
        ${`${String(user.firstName || '').trim()} ${String(user.lastName || '').trim()}`.trim()}
      )
      on conflict (mongo_user_id)
      do update set
        email = excluded.email,
        role_snapshot = excluded.role_snapshot,
        display_name = excluded.display_name
      returning id
    `;
    const appUserId = appUserRows[0]?.id;
    if (!appUserId) return;

    const eventCoreRows = await sql`
      insert into events_core (
        mongo_event_id,
        mongo_organizer_user_id,
        slug,
        title,
        organiser_name,
        status,
        event_type
      )
      values (
        ${String(event._id)},
        ${String(event.organizerId || '')},
        ${String(event.slug || '')},
        ${String(event.title || '')},
        ${String(event.organiserName || '')},
        ${String(event.status || 'published')},
        ${String(event.eventType || 'virtual')}
      )
      on conflict (mongo_event_id)
      do update set
        slug = excluded.slug,
        title = excluded.title,
        organiser_name = excluded.organiser_name,
        status = excluded.status,
        event_type = excluded.event_type,
        mongo_organizer_user_id = excluded.mongo_organizer_user_id
      returning id, organiser_id
    `;
    const eventCore = eventCoreRows[0];
    if (!eventCore?.id) return;

    const orderNumber = buildRegistrationOrderNumber();
    const createdOrders = await sql`
      insert into orders (
        order_number,
        buyer_user_id,
        event_id,
        organiser_id,
        subtotal,
        total_amount,
        payment_status,
        order_status,
        order_source,
        fulfilment_status,
        delivery_fee,
        platform_fee,
        currency,
        customer_note
      )
      values (
        ${orderNumber},
        ${appUserId},
        ${eventCore.id},
        ${eventCore.organiser_id || null},
        ${totals.subtotal},
        ${totals.totalAmount},
        'unpaid',
        'pending',
        'registration_checkout',
        'not_started',
        ${totals.deliveryFee},
        ${totals.platformFee},
        ${orderCurrency},
        ${orderNote}
      )
      returning id
    `;
    const orderId = createdOrders[0]?.id;
    if (!orderId) return;

    if (registrationFeeAmount > 0) {
      const pricingSnapshot = registration.pricingSnapshot || {};
      const feeLabel = String(pricingSnapshot.packageName || pricingSnapshot.optionDescription || pricingSnapshot.raceDistance || registration.raceDistance || 'Registration fee').trim();
      await sql`
        insert into order_items (
          order_id,
          product_id,
          variant_id,
          name_snapshot,
          variant_snapshot,
          quantity,
          unit_price,
          line_total
        )
        values (
          ${orderId},
          null,
          null,
          ${feeLabel},
          ${sql.json({
            source: 'registration_fee',
            pricingMode: pricingSnapshot.pricingMode || '',
            pricingSource: pricingSnapshot.source || '',
            selectedOptionId: pricingSnapshot.selectedOptionId || '',
            packageId: pricingSnapshot.packageId || '',
            packageName: pricingSnapshot.packageName || '',
            pricingPeriodCode: pricingSnapshot.pricingPeriodCode || '',
            pricingPeriodLabel: pricingSnapshot.pricingPeriodLabel || '',
            currency: orderCurrency
          })},
          1,
          ${registrationFeeAmount},
          ${registrationFeeAmount}
        )
      `;
    }

    for (const item of Array.isArray(selectedAddOns) ? selectedAddOns : []) {
      const lineTotal = Number(item.lineTotal || 0);
      const unitPrice = Number(item.unitPrice || 0);
      await sql`
        insert into order_items (
          order_id,
          product_id,
          variant_id,
          name_snapshot,
          variant_snapshot,
          quantity,
          unit_price,
          line_total
        )
        values (
          ${orderId},
          ${String(item.productId || '') || null},
          null,
          ${String(item.name || '').trim() || 'Registration add-on'},
          ${sql.json({
            productType: item.productType || 'event_shop_item',
            currency: item.currency || orderCurrency,
            source: 'registration_addon'
          })},
          ${Number(item.quantity || 1)},
          ${unitPrice},
          ${lineTotal}
        )
      `;
    }
  } catch (error) {
    console.error('Registration add-on order bridge failed:', {
      registrationId: String(registration._id || ''),
      eventId: String(event._id || ''),
      userId: String(user._id || ''),
      error: error?.message || String(error)
    });
  }
}

async function upsertShopPaymentForRegistrationProof({ registration, proof } = {}) {
  if (!process.env.DATABASE_URL) return;
  if (!registration?._id) return;

  const sql = getPostgresClient();
  const orderNote = buildRegistrationOrderNote(registration._id);
  const proofUrl = String(proof?.url || '').trim();
  const paymentReference = String(registration.confirmationCode || '').trim();

  try {
    const orderRows = await sql`
      select id, total_amount
      from orders
      where order_source = 'registration_checkout'
        and customer_note = ${orderNote}
      order by created_at desc
      limit 1
    `;
    const order = orderRows[0];
    if (!order?.id) return;

    const existingRows = await sql`
      select id
      from shop_payments
      where order_id = ${order.id}
      order by created_at desc
      limit 1
    `;

    if (existingRows[0]?.id) {
      await sql`
        update shop_payments
        set payment_method = 'manual_receipt',
            payment_reference = ${paymentReference || null},
            proof_image_url = ${proofUrl || null},
            amount_paid = ${Number(order.total_amount || 0)},
            status = 'pending_review',
            reviewed_by = null,
            reviewed_at = null,
            rejection_reason = null,
            review_note = null
        where id = ${existingRows[0].id}
      `;
    } else {
      await sql`
        insert into shop_payments (
          order_id,
          payment_method,
          payment_reference,
          proof_image_url,
          amount_paid,
          status
        )
        values (
          ${order.id},
          'manual_receipt',
          ${paymentReference || null},
          ${proofUrl || null},
          ${Number(order.total_amount || 0)},
          'pending_review'
        )
      `;
    }

    await sql`
      update orders
      set payment_status = 'proof_submitted'
      where id = ${order.id}
    `;
  } catch (error) {
    console.error('Registration payment review bridge failed:', {
      registrationId: String(registration._id || ''),
      error: error?.message || String(error)
    });
  }
}

function buildRegistrationOrderNumber() {
  const dateToken = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomToken = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `HR-REG-${dateToken}-${randomToken}`;
}

function buildRegistrationOrderNote(registrationId) {
  return `registration:${String(registrationId || '').trim()}`;
}

function getRegistrationWindowError(event) {
  const now = new Date();
  if (event.registrationOpenAt && now < new Date(event.registrationOpenAt)) {
    return 'Registration is not open yet for this event.';
  }
  if (event.registrationCloseAt && now > new Date(event.registrationCloseAt)) {
    return 'Registration for this event is already closed.';
  }
  return null;
}

function formatRegistrationCurrency(amount, currency = 'PHP') {
  const parsed = Number(amount);
  if (!Number.isFinite(parsed) || parsed < 0) return '';
  const safeCurrency = String(currency || 'PHP').trim().toUpperCase() || 'PHP';
  return `${safeCurrency} ${parsed.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function isDistancePricingMode(event = {}) {
  if (String(event.feeMode || '').trim() !== 'paid') return false;
  const mode = String(event.pricingMode || '').trim();
  return ['distance_based', 'distance_based_period', 'per_distance', 'per_distance_period'].includes(mode);
}

function buildRaceDistancePricingPreview(event, distances = [], now = new Date()) {
  if (!isDistancePricingMode(event)) return {};
  const preview = {};
  (Array.isArray(distances) ? distances : []).forEach((distance) => {
    const normalizedDistance = String(distance || '').trim().toUpperCase();
    if (!normalizedDistance) return;
    const resolved = resolveRegistrationPrice(event, { raceDistance: normalizedDistance }, { now });
    if (!resolved.ok) {
      preview[normalizedDistance] = {
        ok: false,
        amountLabel: '',
        pricingPeriodLabel: '',
        helper: resolved.error || 'Pricing unavailable for this distance right now.'
      };
      return;
    }
    preview[normalizedDistance] = {
      ok: true,
      amountLabel: formatRegistrationCurrency(resolved.amount, resolved.currency || event.feeCurrency || 'PHP'),
      pricingPeriodLabel: String(resolved.pricingPeriodLabel || '').trim(),
      helper: resolved.pricingPeriodLabel
        ? 'Current active period'
        : 'Current registration amount'
    };
  });
  return preview;
}

function buildRegistrationPackageDisplayOptions(event, packageOptions = [], now = new Date()) {
  return (Array.isArray(packageOptions) ? packageOptions : []).map((packageOption) => {
    const resolved = resolveRegistrationPrice(event, { registrationPackageId: packageOption.id }, { now });
    if (!resolved.ok) {
      return {
        ...packageOption,
        isAvailableNow: false,
        currentAmount: null,
        currentAmountLabel: '',
        currentPricingPeriodLabel: '',
        availabilityMessage: resolved.error || 'Pricing is not available for this package right now.'
      };
    }
    return {
      ...packageOption,
      isAvailableNow: true,
      currentAmount: resolved.amount,
      currentAmountLabel: formatRegistrationCurrency(resolved.amount, resolved.currency || event.feeCurrency || 'PHP'),
      currentPricingPeriodLabel: String(resolved.pricingPeriodLabel || '').trim(),
      availabilityMessage: ''
    };
  });
}

function getRegistrationConfigurationError(event) {
  const allowedRaceDistances = getAllowedRaceDistances(event);
  if (!allowedRaceDistances.length) {
    return 'Registration is temporarily unavailable because this event has no configured race distances.';
  }
  if (String(event.feeMode || '').trim() === 'paid' && String(event.pricingMode || '').trim() === 'package_period') {
    const registrationPackageOptions = buildRegistrationPackageDisplayOptions(event, getRegistrationPackageOptions(event));
    if (!registrationPackageOptions.length) {
      return 'Registration is temporarily unavailable because no registration packages are configured.';
    }
    if (!registrationPackageOptions.some((packageOption) => packageOption.isAvailableNow)) {
      return 'Registration is temporarily unavailable because no package pricing window is active right now.';
    }
  }
  return null;
}

function validateRegistrationForm(
  formData,
  allowedModes,
  allowedRaceDistances,
  registrationWindowError,
  options = {}
) {
  const errors = {};
  const requiresEmergencyContact = !!options.requiresEmergencyContact;
  const expectedSignatureName = String(options.expectedSignatureName || '').trim();
  const allowedGenderValues = new Set(['', 'male', 'female', 'non_binary', 'prefer_not_to_say']);

  if (registrationWindowError) {
    errors.base = registrationWindowError;
    return errors;
  }

  const missingProfileFields = [];
  if (!formData.firstName || formData.firstName.length < 2 || formData.firstName.length > 60) {
    missingProfileFields.push('first name');
  }
  if (!formData.lastName || formData.lastName.length < 2 || formData.lastName.length > 60) {
    missingProfileFields.push('last name');
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!formData.email || !emailRegex.test(formData.email)) {
    missingProfileFields.push('email');
  }
  if (missingProfileFields.length > 0) {
    errors.base = `Your profile is missing valid ${missingProfileFields.join(', ')}. Update your dashboard profile, then try again.`;
  }

  if (formData.mobile && !/^[\d\s\-()+]{7,25}$/.test(formData.mobile)) {
    errors.mobile = 'Enter a valid mobile number.';
  }

  if (formData.country && formData.country.length > 100) {
    errors.country = 'Country must be 100 characters or less.';
  } else if (formData.country && !isValidCountryCode(formData.country)) {
    errors.country = 'Select a valid country.';
  }
  if (formData.dateOfBirth) {
    const dateOfBirth = new Date(`${formData.dateOfBirth}T00:00:00.000Z`);
    if (Number.isNaN(dateOfBirth.getTime())) {
      errors.dateOfBirth = 'Enter a valid date of birth.';
    } else if (dateOfBirth > new Date()) {
      errors.dateOfBirth = 'Date of birth cannot be in the future.';
    }
  }
  if (!allowedGenderValues.has(formData.gender)) {
    errors.gender = 'Select a valid gender option.';
  }
  if (formData.runningGroup.length > 120) {
    errors.runningGroup = 'Running group must be 120 characters or less.';
  }
  if (formData.emergencyContactName && formData.emergencyContactName.length > 120) {
    errors.emergencyContactName = 'Emergency contact name must be 120 characters or less.';
  }
  if (requiresEmergencyContact && !formData.emergencyContactName) {
    errors.emergencyContactName = 'Emergency contact name is required. Update it on your dashboard or add it here.';
  }
  if (formData.emergencyContactNumber && !/^[\d\s\-()+]{7,25}$/.test(formData.emergencyContactNumber)) {
    errors.emergencyContactNumber = 'Enter a valid emergency contact number.';
  }
  if (requiresEmergencyContact && !formData.emergencyContactNumber) {
    errors.emergencyContactNumber = 'Emergency contact number is required. Update it on your dashboard or add it here.';
  }
  if (!formData.waiverAccepted) {
    errors.waiverAccepted = 'You must agree to the waiver before registering.';
  }
  if (!formData.waiverSignature) {
    errors.waiverSignature = 'Digital signature is required.';
  } else if (
    expectedSignatureName &&
    normalizePersonName(formData.waiverSignature) !== normalizePersonName(expectedSignatureName)
  ) {
    errors.waiverSignature = 'Signature must exactly match your account full name.';
  }

  if (!allowedModes.includes(formData.participationMode)) {
    errors.participationMode = 'Select a valid participation mode for this event.';
  }
  if (!allowedRaceDistances.includes(formData.raceDistance)) {
    errors.raceDistance = 'Select a valid race distance for this event.';
  }

  return errors;
}

function formatDateForInput(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const utcYear = date.getUTCFullYear();
  const utcMonth = String(date.getUTCMonth() + 1).padStart(2, '0');
  const utcDay = String(date.getUTCDate()).padStart(2, '0');
  return `${utcYear}-${utcMonth}-${utcDay}`;
}

function getRegistrationProfileSnapshot(user) {
  const runningGroups = normalizeRunnerGroups(user.runningGroups || user.runningGroup);
  return {
    firstName: String(user.firstName || '').trim(),
    lastName: String(user.lastName || '').trim(),
    email: String(user.email || '').trim().toLowerCase(),
    mobile: String(user.mobile || '').trim(),
    country: normalizeCountryCode(user.country),
    dateOfBirth: formatDateForInput(user.dateOfBirth),
    gender: String(user.gender || '').trim(),
    emergencyContactName: String(user.emergencyContactName || '').trim(),
    emergencyContactNumber: String(user.emergencyContactNumber || '').trim(),
    runningGroups,
    runningGroup: runningGroups[0] || ''
  };
}

function isMissingEmergencyContact(profileSnapshot) {
  return !profileSnapshot.emergencyContactName || !profileSnapshot.emergencyContactNumber;
}

function shouldRequireEmergencyContactForRegistration(profileSnapshot, participationMode) {
  return String(participationMode || '').trim().toLowerCase() !== 'virtual'
    && isMissingEmergencyContact(profileSnapshot);
}

function shouldCollectEmergencyContactForRegistration(profileSnapshot, allowedModes = []) {
  return isMissingEmergencyContact(profileSnapshot)
    && allowedModes.some((mode) => String(mode || '').trim().toLowerCase() !== 'virtual');
}

function normalizeRunnerGroups(value) {
  const values = Array.isArray(value) ? value : String(value || '').split(',');
  return Array.from(
    new Set(
      values
        .map((item) => String(item || '').trim())
        .filter(Boolean)
    )
  ).slice(0, 10);
}

function normalizePersonName(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function formatGenderLabel(value) {
  const normalized = String(value || '').trim();
  if (!normalized) return 'N/A';
  if (normalized === 'prefer_not_to_say') return 'Prefer not to say';
  if (normalized === 'non_binary') return 'Non-binary';
  if (normalized === 'male') return 'Male';
  if (normalized === 'female') return 'Female';
  return normalized;
}

function formatDateOnly(value) {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function buildBadgeCollectionScopeSummary(badges = []) {
  const order = ['event', 'challenge', 'global', 'organiser'];
  const labels = {
    event: 'Event',
    challenge: 'Challenge',
    global: 'Global',
    organiser: 'Organiser'
  };
  const counts = new Map();
  for (const badge of badges) {
    const scope = String(badge.badgeScope || 'event').trim() || 'event';
    counts.set(scope, (counts.get(scope) || 0) + 1);
  }

  return Array.from(new Set(order.concat(Array.from(counts.keys()))))
    .filter((scope) => counts.has(scope))
    .map((scope) => ({
      scope,
      label: labels[scope] || scope,
      count: counts.get(scope) || 0
    }));
}

function buildOpenBadgeMetadata(badge = {}, options = {}) {
  const baseUrl = String(options.baseUrl || '').replace(/\/$/, '');
  const badgeUrl = options.badgeUrl || `${baseUrl}/badges/${badge.userBadgeId}`;
  const openBadgeUrl = options.openBadgeUrl || `${badgeUrl}/open-badge.json`;
  const badgeShareImageUrl = options.badgeShareImageUrl || `${badgeUrl}/share-image.svg`;
  const achievementId = `${baseUrl}/badge-definitions/${encodeURIComponent(badge.badgeCode || badge.badgeDefinitionId || badge.userBadgeId)}`;
  const criteriaNarrative = badge.evidenceLabel || getBadgeCriteriaNarrative(badge.requirementType);

  return {
    '@context': [
      'https://www.w3.org/ns/credentials/v2',
      'https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json'
    ],
    id: openBadgeUrl,
    type: ['VerifiableCredential', 'OpenBadgeCredential'],
    name: `${badge.name} - HelloRun Badge`,
    description: badge.description || 'Verified HelloRun achievement.',
    issuer: {
      id: `${baseUrl}/`,
      type: ['Profile'],
      name: 'HelloRun',
      url: `${baseUrl}/`
    },
    issuanceDate: formatIsoDate(badge.earnedAt),
    validFrom: formatIsoDate(badge.earnedAt),
    credentialSubject: {
      type: ['AchievementSubject'],
      name: badge.runnerName || 'HelloRun Runner',
      achievement: {
        id: achievementId,
        type: ['Achievement'],
        achievementType: formatBadgeScopeLabel(badge.badgeScope),
        name: badge.name || 'HelloRun Badge',
        description: badge.description || 'Verified HelloRun achievement.',
        criteria: {
          narrative: criteriaNarrative
        },
        image: {
          id: badgeShareImageUrl,
          type: 'Image'
        },
        tags: [
          badge.badgeScope,
          badge.badgeType,
          badge.requirementType
        ].filter(Boolean)
      }
    },
    evidence: [{
      id: badgeUrl,
      type: ['Evidence'],
      name: badge.evidenceLabel || 'Verified HelloRun evidence',
      narrative: criteriaNarrative
    }],
    verification: {
      type: 'HostedBadge',
      verificationProperty: 'id'
    },
    image: {
      id: badgeShareImageUrl,
      type: 'Image'
    },
    url: badgeUrl,
    helloRun: {
      userBadgeId: badge.userBadgeId,
      badgeCode: badge.badgeCode,
      verificationCode: badge.verificationCode,
      verificationStatus: badge.verificationStatus,
      eventTitle: badge.eventTitle || '',
      eventUrl: badge.eventSlug ? `${baseUrl}/events/${badge.eventSlug}` : ''
    }
  };
}

function buildShareImageSvg(input = {}) {
  const titleLines = splitSvgText(input.title || 'HelloRun Badge', 26, 2);
  const subtitleLines = splitSvgText(input.subtitle || 'Verified HelloRun achievement.', 54, 2);
  const footer = String(input.footer || 'hellorun.ph').trim();
  const statLabel = String(input.statLabel || 'Verified').trim();
  const statValue = String(input.statValue || 'HelloRun').trim();
  const kicker = String(input.kicker || 'HelloRun').trim();
  const titleY = titleLines.length === 1 ? 365 : 330;
  const subtitleY = titleY + (titleLines.length * 76) + 28;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-label="${escapeXml(input.title || 'HelloRun Badge')}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="55%" stop-color="#eef7fb"/>
      <stop offset="100%" stop-color="#fff7ed"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#FA9A4B"/>
      <stop offset="100%" stop-color="#1495d1"/>
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="18" stdDeviation="22" flood-color="#0f172a" flood-opacity="0.14"/>
    </filter>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect x="64" y="56" width="1072" height="518" rx="28" fill="#ffffff" filter="url(#shadow)"/>
  <circle cx="988" cy="168" r="92" fill="#ecfdf5"/>
  <circle cx="1018" cy="140" r="38" fill="#dbeafe"/>
  <rect x="96" y="90" width="196" height="48" rx="24" fill="#ecfdf5"/>
  <text x="126" y="122" font-family="Inter, Arial, sans-serif" font-size="22" font-weight="800" fill="#047857">${escapeXml(kicker)}</text>
  <g transform="translate(96 176)">
    <rect width="132" height="132" rx="28" fill="url(#accent)"/>
    <circle cx="66" cy="52" r="24" fill="#ffffff" opacity="0.95"/>
    <path d="M44 92h44l12 20H32l12-20Z" fill="#ffffff" opacity="0.95"/>
    <path d="M42 34l12 10 14-22 14 22 12-10-10 34H52L42 34Z" fill="#ffffff" opacity="0.9"/>
  </g>
  ${titleLines.map((line, index) => `<text x="260" y="${titleY + (index * 76)}" font-family="Poppins, Arial, sans-serif" font-size="62" font-weight="800" fill="#0f172a">${escapeXml(line)}</text>`).join('\n  ')}
  ${subtitleLines.map((line, index) => `<text x="260" y="${subtitleY + (index * 34)}" font-family="Inter, Arial, sans-serif" font-size="28" font-weight="600" fill="#475569">${escapeXml(line)}</text>`).join('\n  ')}
  <rect x="96" y="458" width="332" height="78" rx="18" fill="#f8fafc" stroke="#e2e8f0"/>
  <text x="122" y="488" font-family="Inter, Arial, sans-serif" font-size="18" font-weight="800" fill="#64748b">${escapeXml(statLabel.toUpperCase())}</text>
  <text x="122" y="522" font-family="Inter, Arial, sans-serif" font-size="28" font-weight="800" fill="#0f172a">${escapeXml(truncateText(statValue, 22))}</text>
  <text x="96" y="604" font-family="Inter, Arial, sans-serif" font-size="22" font-weight="700" fill="#64748b">${escapeXml(footer)}</text>
  <text x="1000" y="604" text-anchor="end" font-family="Poppins, Arial, sans-serif" font-size="28" font-weight="900" fill="#0f172a">HelloRun</text>
</svg>`;
}

function splitSvgText(value, maxLength, maxLines) {
  const words = String(value || '').trim().replace(/\s+/g, ' ').split(' ').filter(Boolean);
  const lines = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxLength && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
    if (lines.length === maxLines) break;
  }
  if (current && lines.length < maxLines) lines.push(current);
  if (!lines.length) lines.push('HelloRun');
  if (words.join(' ').length > lines.join(' ').length) {
    lines[lines.length - 1] = `${truncateText(lines[lines.length - 1], Math.max(8, maxLength - 1))}...`;
  }
  return lines;
}

function truncateText(value, maxLength) {
  const safe = String(value || '').trim();
  if (safe.length <= maxLength) return safe;
  return safe.slice(0, Math.max(0, maxLength - 3)).trimEnd() + '...';
}

function escapeXml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatBadgeScopeLabel(value) {
  const scope = String(value || '').trim();
  if (scope === 'organiser') return 'Organiser achievement';
  if (scope === 'challenge') return 'Challenge achievement';
  if (scope === 'global') return 'Global achievement';
  return 'Event achievement';
}

function getBadgeCriteriaNarrative(requirementType) {
  const type = String(requirementType || '').trim();
  if (type === 'registration_confirmed') return 'Registration was confirmed in HelloRun.';
  if (type === 'result_approved') return 'A submitted result was reviewed and approved in HelloRun.';
  if (type === 'distance_completed') return 'The runner completed the required distance with an approved result.';
  if (type === 'mode_completed') return 'The runner completed the required participation mode with an approved result.';
  if (type === 'challenge_progress') return 'The runner reached the required verified challenge progress.';
  if (type === 'global_distance') return 'The runner reached the required verified lifetime distance.';
  if (type === 'rank_achieved') return 'The runner achieved the required rank on a published leaderboard.';
  if (type === 'organiser_activity') return 'The organiser completed the required verified platform activity.';
  return 'The achievement was verified by HelloRun.';
}

function formatIsoDate(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return new Date().toISOString();
  return date.toISOString();
}

function formatAgeFromDob(value) {
  if (!value) return 'N/A';
  const dob = new Date(value);
  if (Number.isNaN(dob.getTime())) return 'N/A';

  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  const dayDiff = today.getDate() - dob.getDate();

  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    age -= 1;
  }

  if (!Number.isInteger(age) || age < 0 || age > 120) {
    return 'N/A';
  }

  return `${age} years old`;
}

function getUserRegistrationEligibilityError(user) {
  if (!user || typeof user.canParticipateInEvents !== 'function') {
    return 'Only registered HelloRun accounts can register for events.';
  }
  if (!user.canParticipateInEvents()) {
    return 'Your account is not eligible to register for events. Please verify your email first.';
  }
  return null;
}

async function generateConfirmationCode() {
  const prefix = 'HR';

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const token = Math.random().toString(36).slice(2, 8).toUpperCase();
    const candidate = `${prefix}-${token}`;
    const exists = await Registration.exists({ confirmationCode: candidate });
    if (!exists) return candidate;
  }
}

async function getPublishedEventBySlug(slugInput) {
  const slug = typeof slugInput === 'string' ? slugInput.trim() : '';
  if (!slug) return null;
  return Event.findOne({ slug, ...getPublicEventVisibilityQuery(new Date()) });
}

function renderEventNotFound(res) {
  return res.status(404).render('error', {
    title: '404 - Event Not Found',
    status: 404,
    message: 'This event is not available.'
  });
}
