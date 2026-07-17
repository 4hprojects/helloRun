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
const { getPublicEventRunnerState } = require('../../services/public-event-detail.service');
const {
  getContactCooldown,
  startContactCooldown,
  acquireContactSendLock
} = require('../../services/event-contact-protection.service');

exports.getEventDetails = async (req, res) => {
  try {
    const event = await getPublishedEventBySlug(req.params.slug);
    if (!event) {
      return renderEventNotFound(res);
    }

    const now = new Date();
    const [registrationCount, badges, eventShopProducts, relatedEvents, runnerEventState, contactCooldown] = await Promise.all([
      Registration.countDocuments({
        eventId: event._id,
        status: { $ne: 'cancelled' }
      }),
      getEventBadgesByMongoEventId(event._id, { visibleOnly: true }).catch(() => []),
      listProductsByMongoEventId(String(event._id), { limit: 4, publicOnly: true }).catch(() => []),
      getRelatedEvents(event, getPublicEventVisibilityQuery(now), now).catch(() => []),
      getPublicEventRunnerState({ event, userId: req.session.userId, now }).catch((error) => {
        logger.warn('Unable to load public event runner progress:', {
          eventId: String(event._id),
          userId: String(req.session.userId || ''),
          error: error.message
        });
        return null;
      }),
      getContactCooldown({ eventId: event._id, userId: req.session.userId, now }).catch((error) => {
        logger.warn('Unable to load event contact cooldown:', {
          eventId: String(event._id),
          userId: String(req.session.userId || ''),
          error: error.message
        });
        return null;
      })
    ]);
    const baseUrl = getSitemapBaseUrl(req);
    const publicEvent = buildPublicEventView(event, { registrationCount, eventBadges: badges });
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
      runnerEventState,
      contactCooldown: buildContactCooldownPresentation(contactCooldown),
      isSaved,
      relatedEvents,
      eventDetailsHtml: renderEventDetailsContent(event.eventDetailsMarkdown),
      countryName: getCountryName
    });
  } catch (error) {
    logger.error('Error loading public event details:', error);
    return res.status(500).render('error', {
      title: 'Server Error',
      status: 500,
      message: 'An error occurred while loading event details.'
    });
  }
};

exports.postContactOrganiser = async (req, res) => {
  let sendLock = null;
  try {
    const event = await getPublishedEventBySlug(req.params.slug);
    if (!event) return res.redirect('/events');

    const sender = await User.findById(req.session.userId).select('firstName lastName email').lean();
    if (!sender) return res.redirect('/login');

    const protectionScope = {
      eventId: event._id,
      userId: req.session.userId
    };
    const existingCooldown = await getContactCooldown(protectionScope);
    if (existingCooldown?.active) {
      res.set('Retry-After', String(existingCooldown.retryAfterSeconds));
      return res.redirect(buildContactRedirect(
        event.slug,
        'error',
        buildCooldownMessage(existingCooldown)
      ));
    }

    sendLock = await acquireContactSendLock(protectionScope);
    const cooldownAfterLock = await getContactCooldown(protectionScope);
    if (cooldownAfterLock?.active) {
      res.set('Retry-After', String(cooldownAfterLock.retryAfterSeconds));
      return res.redirect(buildContactRedirect(
        event.slug,
        'error',
        buildCooldownMessage(cooldownAfterLock)
      ));
    }

    const message = String(req.body.message || '').trim().slice(0, 1000);
    const subject = String(req.body.subject || '').trim().slice(0, 200) || `Question about ${event.title}`;
    if (message.length < 10) {
      return res.redirect(buildContactRedirect(event.slug, 'error', 'Your message to the organiser must be at least 10 characters.'));
    }

    // Fetch organiser's email via their user record — not exposed to the runner
    const organiser = await User.findById(event.organizerId).select('email firstName').lean();
    if (!organiser?.email) {
      return res.redirect(`/events/${event.slug}?type=error&msg=Unable+to+reach+the+organiser+right+now.#contact-organiser`);
    }

    const senderName = [sender.firstName, sender.lastName].filter(Boolean).join(' ') || 'A HelloRun runner';
    const result = await communicationService.notify('organiser.runner_contact', {
      email: {
        to: organiser.email,
        subject: `[HelloRun] ${subject}`,
        senderName,
        senderEmail: sender.email,
        eventTitle: event.title,
        message,
        replyTo: sender.email,
        recipientUserId: event.organizerId,
        metadata: { eventId: String(event._id), senderUserId: String(req.session.userId) }
      }
    });

    if (result?.email?.status !== 'sent') {
      return res.redirect(buildContactRedirect(
        event.slug,
        'error',
        'Your message to the organiser could not be sent right now. Please try again later.'
      ));
    }

    await startContactCooldown(protectionScope);

    return res.redirect(`/events/${event.slug}?type=success&msg=Your+message+has+been+sent+to+the+organiser.#contact-organiser`);
  } catch (error) {
    if (error?.code === 'CONTACT_SEND_IN_PROGRESS') {
      res.set('Retry-After', '60');
      return res.redirect(buildContactRedirect(
        req.params.slug,
        'error',
        'Your message to the organiser is already being sent. Please wait a moment before trying again.'
      ));
    }
    logger.error('Contact organiser error:', error);
    return res.redirect(buildContactRedirect(req.params.slug, 'error', 'The message to the organiser could not be sent. Please try again.'));
  } finally {
    if (sendLock) await sendLock.release().catch(() => {});
  }
};

function buildContactCooldownPresentation(cooldown) {
  if (!cooldown?.active || !cooldown.retryAt) return null;
  return {
    active: true,
    retryAtIso: cooldown.retryAt.toISOString(),
    retryAfterSeconds: cooldown.retryAfterSeconds,
    label: buildCooldownMessage(cooldown)
  };
}

function buildCooldownMessage(cooldown) {
  const minutes = Math.max(1, Math.ceil(Number(cooldown?.retryAfterSeconds || 0) / 60));
  return `Your last message was sent successfully. You can send another in ${minutes} minute${minutes === 1 ? '' : 's'}.`;
}

function buildContactRedirect(slug, type, message) {
  return `/events/${encodeURIComponent(String(slug || ''))}?type=${encodeURIComponent(type)}&msg=${encodeURIComponent(message)}#contact-organiser`;
}

async function getRelatedEvents(event, visibilityQuery, now) {
  const baseSelect = 'title slug bannerImageUrl eventStartAt registrationOpenAt registrationCloseAt eventType raceDistances organiserName';
  const seen = new Set([String(event._id)]);
  const related = [];

  // 1. Same organiser
  if (event.organizerId && related.length < 3) {
    const docs = await Event.find({ ...visibilityQuery, organizerId: event.organizerId, _id: { $ne: event._id } })
      .select(baseSelect).sort({ createdAt: -1 }).limit(3).lean();
    for (const d of docs) {
      if (related.length < 3 && !seen.has(String(d._id))) { seen.add(String(d._id)); related.push(d); }
    }
  }

  // 2. Same race distances
  if (event.raceDistances && event.raceDistances.length && related.length < 3) {
    const docs = await Event.find({ ...visibilityQuery, raceDistances: { $in: event.raceDistances }, _id: { $nin: [...seen] } })
      .select(baseSelect).sort({ createdAt: -1 }).limit(3 - related.length).lean();
    for (const d of docs) {
      if (related.length < 3) { seen.add(String(d._id)); related.push(d); }
    }
  }

  // 3. Fallback: any event with open registration
  if (related.length < 3) {
    const docs = await Event.find({
      ...visibilityQuery,
      registrationOpenAt: { $lte: now },
      registrationCloseAt: { $gte: now },
      _id: { $nin: [...seen] }
    }).select(baseSelect).sort({ createdAt: -1 }).limit(3 - related.length).lean();
    for (const d of docs) {
      if (related.length < 3) { seen.add(String(d._id)); related.push(d); }
    }
  }

  return related.map((ev) => ({ ...ev, displayState: getEventCardDisplayState(ev, now) }));
}
