// src/routes/organiser/event-management.js
const express = require('express');
const router = express.Router();
const CertificateTemplate = require('../../models/CertificateTemplate');
const {
  logger,
  User,
  Event,
  EventPromotion,
  Submission,
  AccumulatedActivitySubmission,
  requireAuth,
  requireApprovedOrganizer,
  requireCanCreateEvents,
  requireCsrfProtection,
  uploadService,
  eventFormService,
  countries,
  DEFAULT_WAIVER_TEMPLATE,
  MAX_GALLERY_IMAGES,
  generateDefaultEventBadgesInBackground,
  generateDefaultEventBadges,
  getEventBadgesByMongoEventId,
  updateEventBadgeDisplay,
  tryAutoApproveEvent,
  getRestrictedSetupReasons,
  VERIFY_TO_UNLOCK_MESSAGE,
  AUDIT_GROUP_OPTIONS,
  AUDIT_TARGET_TYPE_OPTIONS,
  buildCriticalAuditPath,
  listCriticalAuditEvents,
  listCriticalAuditSignals,
  normalizeCriticalAuditFilters,
  getPostgresClient,
  getCreateEventFormDataFromEvent,
  getEventReadinessChecklist,
  getEventReviewSummary,
  validateCreateEventForm,
  getEventTypesAllowed,
  parseDateSafe,
  resolveFinalSubmissionDeadline,
  mapUploadFieldToFormField,
  getOwnedEventOrNull,
  canAccessRegistrantReview,
  getRegistrantAccessibleEventOrNull,
  getStatusTransitionError,
  getPublishReadinessErrors,
  renderEventDetailsMarkdown,
  getPageMessage,
  escapeRegex,
  getEventAuditTargetIds,
  isChecked,
  acceptsJson,
  getCreateEventFormData
} = require('./_shared');
const {
  dispatchEventPromotionCampaignInBackground,
  resolveOrganizerPromotionRecipients,
  toObjectId
} = require('../../services/event-promotion.service');
const { synchronizeEventBadgeImages } = require('../../services/event-badge.service');

/* ==========================================
   GET: My Events
   ========================================== */

router.get('/events', requireCanCreateEvents, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);

    if (!user) {
      return res.status(404).render('error', {
        title: '404 - User Not Found',
        status: 404,
        message: 'User account not found.'
      });
    }

    const selectedStatus = ['draft', 'pending_review', 'published', 'closed', 'archived'].includes(req.query.status)
      ? req.query.status
      : '';
    const selectedSort = ['newest', 'oldest', 'start_asc', 'start_desc'].includes(req.query.sort)
      ? req.query.sort
      : 'newest';
    const searchQuery = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 80) : '';

    const query = { organizerId: user._id, isDeleted: { $ne: true } };
    if (selectedStatus) {
      query.status = selectedStatus;
    } else {
      query.status = { $ne: 'archived' };
    }
    if (searchQuery) {
      const safePattern = new RegExp(escapeRegex(searchQuery), 'i');
      query.$or = [
        { title: safePattern },
        { organiserName: safePattern },
        { slug: safePattern },
        { venueName: safePattern },
        { city: safePattern },
        { country: safePattern }
      ];
    }

    const sortMap = {
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      start_asc: { eventStartAt: 1, createdAt: -1 },
      start_desc: { eventStartAt: -1, createdAt: -1 }
    };

    const events = await Event.find(query).sort(sortMap[selectedSort]);

    return res.render('organizer/events', {
      title: 'My Events - HelloRun',
      user,
      events,
      selectedStatus,
      selectedSort,
      searchQuery,
      message: getPageMessage(req.query)
    });
  } catch (error) {
    logger.error('Error loading organizer events:', error);
    return res.status(500).render('error', {
      title: 'Server Error',
      status: 500,
      message: 'An error occurred while loading your events.'
    });
  }
});

/* ==========================================
   GET: Event Details
   ========================================== */

router.get('/events/:id', requireCanCreateEvents, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.status(404).render('error', {
        title: '404 - User Not Found',
        status: 404,
        message: 'User account not found.'
      });
    }

    const event = await getOwnedEventOrNull(req.params.id, user._id);
    if (!event) {
      return res.status(404).render('error', {
        title: '404 - Event Not Found',
        status: 404,
        message: 'Event not found or you do not have access.'
      });
    }
    const [activeCertificateTemplate, eventBadges] = await Promise.all([
      CertificateTemplate.findOne({ eventId: event._id, status: 'active' }).select('_id').lean(),
      event.digitalBadgeEnabled
        ? getEventBadgesByMongoEventId(event._id).catch(() => [])
        : Promise.resolve([])
    ]);
    const operationalReadiness = [];
    if (event.feeMode === 'paid' && (!event.paymentAccountName || !event.paymentInstructions)) {
      operationalReadiness.push({
        key: 'payment',
        title: 'Complete payment instructions',
        impact: 'Runners cannot confidently pay or submit a verifiable receipt until the payee and instructions are complete.',
        href: `/organizer/events/${event._id}/edit`,
        action: 'Edit payment setup'
      });
    }
    if (event.digitalCertificateEnabled && !activeCertificateTemplate) {
      operationalReadiness.push({
        key: 'certificate',
        title: 'Publish a certificate template',
        impact: 'Approved runners will not receive the intended event certificate until an active template is available.',
        href: `/organizer/events/${event._id}/certificate`,
        action: 'Set up certificate'
      });
    }
    if (event.digitalBadgeEnabled && !eventBadges.length) {
      operationalReadiness.push({
        key: 'badge',
        title: 'Generate event badges',
        impact: 'Badge awards cannot be displayed until event badge definitions exist.',
        href: `/organizer/events/${event._id}/badges/manage`,
        action: 'Manage badges'
      });
    }
    if (!['published', 'closed', 'archived'].includes(event.status)) {
      operationalReadiness.push({
        key: 'publication',
        title: 'Complete publication readiness',
        impact: 'The public event lifecycle and runner registration depend on a publish-ready event.',
        href: `/organizer/events/${event._id}/edit`,
        action: 'Review event setup'
      });
    }

    return res.render('organizer/event-details', {
      title: `Event Details - ${event.title}`,
      user,
      event,
      operationalReadiness,
      eventDetailsHtml: renderEventDetailsMarkdown(event.eventDetailsMarkdown),
      message: getPageMessage(req.query)
    });
  } catch (error) {
    logger.error('Error loading event details:', error);
    return res.status(500).render('error', {
      title: 'Server Error',
      status: 500,
      message: 'An error occurred while loading event details.'
    });
  }
});

/* ==========================================
   GET: Event Audit Trail
   ========================================== */

router.get('/events/:id/audit', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId).select('firstName lastName email role organizerStatus');
    if (!user) {
      return res.status(404).render('error', {
        title: '404 - User Not Found',
        status: 404,
        message: 'User account not found.'
      });
    }

    if (!canAccessRegistrantReview(user)) {
      return res.status(403).render('error', {
        title: '403 - Access Denied',
        status: 403,
        message: 'Only approved organizers or admins can view event audit logs.'
      });
    }

    const event = await getRegistrantAccessibleEventOrNull(req.params.id, user);
    if (!event) {
      return res.status(404).render('error', {
        title: '404 - Event Not Found',
        status: 404,
        message: 'Event not found or you do not have access.'
      });
    }

    const filters = normalizeCriticalAuditFilters(req.query);
    const targetIds = await getEventAuditTargetIds(event._id);
    const auditScope = {
      targetIds,
      targetTypes: ['event', 'registration', 'submission', 'accumulated_activity_submission']
    };
    const [result, signals] = await Promise.all([
      listCriticalAuditEvents({
        filters,
        ...auditScope
      }),
      listCriticalAuditSignals(auditScope)
    ]);

    return res.render('organizer/event-audit', {
      title: `Audit Trail - ${event.title}`,
      event,
      filters: result.filters,
      entries: result.entries,
      signals,
      unavailable: result.unavailable,
      groupOptions: AUDIT_GROUP_OPTIONS,
      targetTypeOptions: AUDIT_TARGET_TYPE_OPTIONS.filter((option) => ['', 'event', 'registration', 'submission', 'accumulated_activity_submission'].includes(option.value)),
      scopedTargetCount: targetIds.length,
      pagination: {
        page: result.page,
        totalPages: result.totalPages,
        totalItems: result.totalItems,
        pageSize: result.pageSize,
        prevHref: result.page > 1 ? buildCriticalAuditPath(`/organizer/events/${event._id}/audit`, result.filters, { page: result.page - 1 }) : '',
        nextHref: result.page < result.totalPages ? buildCriticalAuditPath(`/organizer/events/${event._id}/audit`, result.filters, { page: result.page + 1 }) : ''
      }
    });
  } catch (error) {
    logger.error('Error loading organizer event audit trail:', error);
    return res.status(500).render('error', {
      title: 'Server Error',
      status: 500,
      message: 'An error occurred while loading the event audit trail.'
    });
  }
});

/* ==========================================
   GET: Event Badges (JSON)
   ========================================== */

router.get('/events/:id/badges', requireCanCreateEvents, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    const event = await getOwnedEventOrNull(req.params.id, user?._id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found or inaccessible.' });
    }

    const badges = await getEventBadgesByMongoEventId(event._id);
    return res.json({ success: true, badges });
  } catch (error) {
    logger.error('Organizer event badges load error:', error);
    return res.status(500).json({ success: false, message: 'Unable to load event badges.' });
  }
});

/* ==========================================
   GET: Badge Manager
   ========================================== */

router.get('/events/:id/badges/manage', requireCanCreateEvents, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    const event = await getOwnedEventOrNull(req.params.id, user?._id);
    if (!event) {
      return res.status(404).render('error', {
        title: '404 - Event Not Found',
        status: 404,
        message: 'Event not found or you do not have access.'
      });
    }

    await generateDefaultEventBadges(event, { performedBy: user._id }).catch((error) => {
      logger.error('Organizer badge manager generation error:', error);
    });

    const badges = await getEventBadgesByMongoEventId(event._id, {
      includeHidden: true,
      includeInactive: true
    });

    let earnedCountByBadgeId = {};
    if (process.env.DATABASE_URL && badges.length) {
      try {
        const sql = getPostgresClient();
        const eventCoreRows = await sql`
          select id from events_core where mongo_event_id = ${String(event._id)} limit 1
        `;
        if (eventCoreRows[0]) {
          const counts = await sql`
            select badge_definition_id, count(*)::int as earned_count
            from user_badges
            where event_core_id = ${eventCoreRows[0].id}
              and verification_status = 'verified'
            group by badge_definition_id
          `;
          earnedCountByBadgeId = Object.fromEntries(counts.map((r) => [r.badge_definition_id, r.earned_count]));
        }
      } catch (_) {}
    }

    return res.render('organizer/event-badges', {
      title: `Badge Manager - ${event.title}`,
      user,
      event,
      badges,
      earnedCountByBadgeId,
      message: getPageMessage(req.query)
    });
  } catch (error) {
    logger.error('Organizer badge manager load error:', error);
    return res.status(500).render('error', {
      title: 'Server Error',
      status: 500,
      message: 'An error occurred while loading the badge manager.'
    });
  }
});

/* ==========================================
   POST: Update Badge Display
   ========================================== */

router.post('/events/:id/badges/:badgeId', requireCanCreateEvents, requireCsrfProtection, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    const event = await getOwnedEventOrNull(req.params.id, user?._id);
    const wantsJson = acceptsJson(req);
    if (!event) {
      if (!wantsJson) {
        return res.redirect(`/organizer/events/${req.params.id}/badges/manage?type=error&msg=Event%20not%20found%20or%20inaccessible.`);
      }
      return res.status(404).json({ success: false, message: 'Event not found or inaccessible.' });
    }

    const updated = await updateEventBadgeDisplay({
      mongoEventId: event._id,
      eventBadgeId: req.params.badgeId,
      updates: {
        name: req.body.name,
        description: req.body.description,
        imageUrl: req.body.imageUrl,
        isVisible: isChecked(req.body.isVisible),
        isActive: isChecked(req.body.isActive)
      }
    });

    if (!updated) {
      if (!wantsJson) {
        return res.redirect(`/organizer/events/${event._id}/badges/manage?type=error&msg=Badge%20not%20found.`);
      }
      return res.status(404).json({ success: false, message: 'Badge not found.' });
    }

    if (!wantsJson) {
      return res.redirect(`/organizer/events/${event._id}/badges/manage?type=success&msg=Badge%20updated.`);
    }
    return res.json({ success: true, badge: updated });
  } catch (error) {
    logger.error('Organizer event badge update error:', error);
    if (!acceptsJson(req)) {
      return res.redirect(`/organizer/events/${req.params.id}/badges/manage?type=error&msg=Unable%20to%20update%20event%20badge.`);
    }
    return res.status(500).json({ success: false, message: 'Unable to update event badge.' });
  }
});

/* ==========================================
   POST: Badge Image Upload
   ========================================== */

router.post('/events/:id/badges/:badgeId/image', requireCanCreateEvents, uploadService.uploadBadgeImage, requireCsrfProtection, async (req, res) => {
  try {
    if (req.uploadError) return res.status(400).json({ success: false, message: req.uploadError });
    if (!req.file) return res.status(400).json({ success: false, message: 'No image file provided.' });

    const user = await User.findById(req.session.userId);
    const event = await getOwnedEventOrNull(req.params.id, user?._id);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found or inaccessible.' });

    const uploaded = await uploadService.uploadBufferToR2({
      userId: String(user._id),
      buffer: req.file.buffer,
      contentType: req.file.mimetype,
      category: 'badge-images',
      fileName: req.file.originalname || 'badge.jpg'
    });

    const updated = await updateEventBadgeDisplay({
      mongoEventId: event._id,
      eventBadgeId: req.params.badgeId,
      updates: { imageUrl: uploaded.url }
    });

    if (!updated) return res.status(404).json({ success: false, message: 'Badge not found.' });
    return res.json({ success: true, imageUrl: uploaded.url });
  } catch (error) {
    logger.error('Badge image upload error:', error);
    return res.status(500).json({ success: false, message: 'Badge image upload failed.' });
  }
});

/* ==========================================
   GET: Edit Event
   ========================================== */

router.get('/events/:id/edit', requireCanCreateEvents, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.status(404).render('error', {
        title: '404 - User Not Found',
        status: 404,
        message: 'User account not found.'
      });
    }

    const event = await getOwnedEventOrNull(req.params.id, user._id);
    if (!event) {
      return res.status(404).render('error', {
        title: '404 - Event Not Found',
        status: 404,
        message: 'Event not found or you do not have access.'
      });
    }
    if (event.status === 'closed') {
      const query = new URLSearchParams({
        type: 'error',
        msg: 'Closed events cannot be edited.'
      });
      return res.redirect(`/organizer/events/${event._id}?${query.toString()}`);
    }

    const formData = getCreateEventFormDataFromEvent(event);
    const eventBadges = await getEventBadgesByMongoEventId(event._id).catch(() => []);
    return res.render('organizer/edit-event', {
      title: `Edit Event - ${event.title}`,
      user,
      event,
      errors: {},
      formData,
      readinessChecklist: getEventReadinessChecklist(formData),
      reviewSummary: getEventReviewSummary(formData),
      countries,
      defaultWaiverTemplate: DEFAULT_WAIVER_TEMPLATE,
      message: getPageMessage(req.query),
      eventBadges
    });
  } catch (error) {
    logger.error('Error loading event edit page:', error);
    return res.status(500).render('error', {
      title: 'Server Error',
      status: 500,
      message: 'An error occurred while loading event edit page.'
    });
  }
});

/* ==========================================
   POST: Update Event
   ========================================== */

router.post('/events/:id/edit', requireCanCreateEvents, uploadService.uploadEventBranding, requireCsrfProtection, async (req, res) => {
  const uploadedBrandingKeys = [];
  let brandingPersisted = false;
  try {
    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.status(404).render('error', {
        title: '404 - User Not Found',
        status: 404,
        message: 'User account not found.'
      });
    }

    const event = await getOwnedEventOrNull(req.params.id, user._id);
    if (!event) {
      return res.status(404).render('error', {
        title: '404 - Event Not Found',
        status: 404,
        message: 'Event not found or you do not have access.'
      });
    }
    if (event.status === 'closed') {
      const query = new URLSearchParams({
        type: 'error',
        msg: 'Closed events cannot be edited.'
      });
      return res.redirect(`/organizer/events/${event._id}?${query.toString()}`);
    }

    const formData = getCreateEventFormData(req.body);
    const incomingPaymentQrFile = req.files?.paymentQrImageFile?.[0] || null;
    if (incomingPaymentQrFile && formData.feeMode === 'paid' && !formData.paymentQrImageUrl) {
      formData.paymentQrImageUrl = 'https://pending-upload.local/payment-qr.png';
    }
    if (formData.removePaymentQrImage && !incomingPaymentQrFile) {
      formData.paymentQrImageUrl = '';
      formData.paymentQrImageKey = '';
    }
    const isDraftSubmitForReview = event.status === 'draft' && req.body.actionType === 'publish';
    formData.actionType = isDraftSubmitForReview || event.status === 'published' || event.status === 'pending_review'
      ? 'publish'
      : 'draft';
    if (
      (event.eventType === 'virtual' || event.eventType === 'hybrid') &&
      event.virtualCompletionMode === 'accumulated_distance' &&
      formData.virtualCompletionMode === 'accumulated_distance' &&
      (!Number.isFinite(formData.targetDistanceKm) || formData.targetDistanceKm <= 0) &&
      Number.isFinite(event.targetDistanceKm) &&
      event.targetDistanceKm > 0
    ) {
      formData.targetDistanceKm = event.targetDistanceKm;
    }
    if (req.uploadError) {
      const errorField = mapUploadFieldToFormField(req.uploadErrorField);
      return res.status(400).render('organizer/edit-event', {
        title: `Edit Event - ${event.title}`,
        user,
        event,
        errors: { [errorField]: req.uploadError },
        formData,
        readinessChecklist: getEventReadinessChecklist(formData),
        reviewSummary: getEventReviewSummary(formData),
        countries,
        defaultWaiverTemplate: DEFAULT_WAIVER_TEMPLATE,
        message: null
      });
    }
    const bannerImageFile = req.files?.bannerImageFile?.[0] || null;
    const logoFile = req.files?.logoFile?.[0] || null;
    const posterImageFile = req.files?.posterImageFile?.[0] || null;
    const paymentQrImageFile = incomingPaymentQrFile;
    const galleryImageFiles = req.files?.galleryImageFiles || [];
    const previousBannerUrl = event.bannerImageUrl || '';
    const previousLogoUrl = event.logoUrl || '';
    const previousBadgeImageUrl = event.badgeImageUrl || '';
    const previousPosterUrl = event.posterImageUrl || '';
    const previousPaymentQrUrl = event.paymentQrImageUrl || '';
    const previousGalleryUrls = Array.isArray(event.galleryImageUrls) ? event.galleryImageUrls : [];

    if (bannerImageFile || logoFile || posterImageFile || paymentQrImageFile || galleryImageFiles.length) {
      const uploadedBranding = await uploadService.uploadEventBrandingToR2({
        userId: user._id,
        slug: event.slug,
        bannerImageFile: bannerImageFile || undefined,
        logoFile: logoFile || undefined,
        posterImageFile: posterImageFile || undefined,
        paymentQrImageFile: paymentQrImageFile || undefined,
        galleryImageFiles: galleryImageFiles.length ? galleryImageFiles : undefined
      });

      if (uploadedBranding.banner) {
        uploadedBrandingKeys.push(uploadedBranding.banner.key);
        formData.bannerImageUrl = uploadedBranding.banner.url;
      }
      if (uploadedBranding.logo) {
        uploadedBrandingKeys.push(uploadedBranding.logo.key);
        formData.logoUrl = uploadedBranding.logo.url;
      }
      if (uploadedBranding.badgeImage) {
        uploadedBrandingKeys.push(uploadedBranding.badgeImage.key);
        formData.badgeImageUrl = uploadedBranding.badgeImage.url;
      }
      if (uploadedBranding.poster) {
        uploadedBrandingKeys.push(uploadedBranding.poster.key);
        formData.posterImageUrl = uploadedBranding.poster.url;
      }
      if (uploadedBranding.paymentQr) {
        uploadedBrandingKeys.push(uploadedBranding.paymentQr.key);
        formData.paymentQrImageUrl = uploadedBranding.paymentQr.url;
        formData.paymentQrImageKey = uploadedBranding.paymentQr.key;
      }
      if (Array.isArray(uploadedBranding.gallery) && uploadedBranding.gallery.length) {
        uploadedBrandingKeys.push(...uploadedBranding.gallery.map((item) => item.key));
        formData.galleryImageUrls = Array.from(
          new Set([...(formData.galleryImageUrls || []), ...uploadedBranding.gallery.map((item) => item.url)])
        );
        formData.galleryImageUrlsText = formData.galleryImageUrls.join('\n');
      }
    }

    // Explicit removals are applied only when no new file upload is provided.
    if (formData.removeBannerImage && !bannerImageFile) {
      formData.bannerImageUrl = '';
    }
    if (formData.removeLogoImage && !logoFile) {
      formData.logoUrl = '';
      formData.badgeImageUrl = '';
    } else if (!logoFile && formData.logoUrl !== previousLogoUrl) {
      // URL-only logos cannot be processed safely; use the original URL as the badge fallback.
      formData.badgeImageUrl = '';
    }
    if (formData.removePosterImage && !posterImageFile) {
      formData.posterImageUrl = '';
    }
    if (formData.removeGalleryImages && !galleryImageFiles.length) {
      formData.galleryImageUrls = [];
      formData.galleryImageUrlsText = '';
    }
    if (formData.removePaymentQrImage && !paymentQrImageFile) {
      formData.paymentQrImageUrl = '';
      formData.paymentQrImageKey = '';
    }

    if ((formData.galleryImageUrls || []).length > MAX_GALLERY_IMAGES) {
      if (uploadedBrandingKeys.length) await uploadService.deleteObjects(uploadedBrandingKeys);
      return res.status(400).render('organizer/edit-event', {
        title: `Edit Event - ${event.title}`,
        user,
        event,
        errors: { galleryImageUrls: `Gallery supports up to ${MAX_GALLERY_IMAGES} images.` },
        formData,
        readinessChecklist: getEventReadinessChecklist(formData),
        reviewSummary: getEventReviewSummary(formData),
        countries,
        defaultWaiverTemplate: DEFAULT_WAIVER_TEMPLATE,
        message: null
      });
    }

    const validationErrors = validateCreateEventForm(formData);

    if (Object.keys(validationErrors).length > 0) {
      if (uploadedBrandingKeys.length) await uploadService.deleteObjects(uploadedBrandingKeys);
      return res.status(400).render('organizer/edit-event', {
        title: `Edit Event - ${event.title}`,
        user,
        event,
        errors: validationErrors,
        formData,
        readinessChecklist: getEventReadinessChecklist(formData),
        reviewSummary: getEventReviewSummary(formData),
        countries,
        defaultWaiverTemplate: DEFAULT_WAIVER_TEMPLATE,
        message: null
      });
    }

    const organiserNameFromUser = `${user.firstName || ''} ${user.lastName || ''}`.trim();
    const organiserName = formData.organiserName || organiserNameFromUser || 'HelloRun Organizer';
    const eventTypesAllowed = getEventTypesAllowed(formData.eventType);

    event.title = formData.title;
    event.organiserName = organiserName;
    event.description = formData.description;
    event.eventType = formData.eventType || undefined;
    event.eventTypesAllowed = eventTypesAllowed;
    event.raceDistances = formData.raceDistances;
    event.registrationOpenAt = parseDateSafe(formData.registrationOpenAt);
    event.registrationCloseAt = parseDateSafe(formData.registrationCloseAt);
    event.publicListingAvailableAt = parseDateSafe(formData.publicListingAvailableAt);
    event.eventStartAt = parseDateSafe(formData.eventStartAt);
    event.eventEndAt = parseDateSafe(formData.eventEndAt);
    event.venueName = formData.venueName || '';
    event.venueAddress = formData.venueAddress || '';
    event.city = formData.city || '';
    event.province = formData.province || '';
    event.country = formData.country || '';
    event.geo = formData.geoLat && formData.geoLng
      ? { lat: Number(formData.geoLat), lng: Number(formData.geoLng) }
      : undefined;
    const isVirtualMode = formData.eventType === 'virtual' || formData.eventType === 'hybrid';

    event.virtualWindow = isVirtualMode && formData.virtualStartAt && formData.virtualEndAt
      ? {
          startAt: parseDateSafe(formData.virtualStartAt),
          endAt: parseDateSafe(formData.virtualEndAt)
        }
      : undefined;
    event.proofTypesAllowed = isVirtualMode ? formData.proofTypesAllowed : [];
    event.virtualCompletionMode = isVirtualMode ? formData.virtualCompletionMode : 'single_activity';
    event.targetDistanceKm = isVirtualMode && formData.virtualCompletionMode === 'accumulated_distance'
      ? formData.targetDistanceKm
      : null;
    event.minimumActivityDistanceKm = null;
    event.acceptedRunTypes = isVirtualMode && formData.virtualCompletionMode === 'accumulated_distance'
      ? formData.acceptedRunTypes
      : [];
    event.finalSubmissionDeadlineAt = isVirtualMode && formData.virtualCompletionMode === 'accumulated_distance'
      ? resolveFinalSubmissionDeadline(formData)
      : null;
    event.milestoneDistancesKm = [];
    event.recognitionMode = isVirtualMode && formData.virtualCompletionMode === 'accumulated_distance'
      ? formData.recognitionMode
      : 'completion_only';
    event.leaderboardMode = isVirtualMode && formData.virtualCompletionMode === 'accumulated_distance'
      ? formData.leaderboardMode
      : 'finishers';

    eventFormService.applyEventFormData(event, formData, user);
    if (logoFile || formData.removeLogoImage || formData.logoUrl !== previousLogoUrl) {
      event.badgeImageUrl = formData.badgeImageUrl || '';
    }
    if (isDraftSubmitForReview) {
      event.status = 'pending_review';
      event.submittedForReviewAt = new Date();
    }

    if (user.organizerStatus !== 'approved' && getRestrictedSetupReasons(event).length) {
      if (uploadedBrandingKeys.length) {
        await uploadService.deleteObjects(uploadedBrandingKeys);
      }
      return res.status(400).render('organizer/edit-event', {
        title: `Edit Event - ${event.title}`,
        user,
        event,
        errors: { feeMode: VERIFY_TO_UNLOCK_MESSAGE },
        formData,
        readinessChecklist: getEventReadinessChecklist(formData),
        reviewSummary: getEventReviewSummary(formData),
        countries,
        defaultWaiverTemplate: DEFAULT_WAIVER_TEMPLATE,
        message: { type: 'error', text: VERIFY_TO_UNLOCK_MESSAGE }
      });
    }

    await event.save();
    brandingPersisted = true;
    generateDefaultEventBadgesInBackground(event, { performedBy: user._id });

    const logoChanged = Boolean(logoFile || formData.removeLogoImage || event.logoUrl !== previousLogoUrl);
    let badgeSyncSucceeded = true;
    if (logoChanged) {
      try {
        await synchronizeEventBadgeImages(event._id, event.badgeImageUrl || event.logoUrl || '');
      } catch (syncError) {
        badgeSyncSucceeded = false;
        logger.error('Event badge image synchronization failed:', {
          eventId: String(event._id),
          targetImageUrl: event.badgeImageUrl || event.logoUrl || null,
          error: syncError.message
        });
      }
    }

    const autoApproval = isDraftSubmitForReview
      ? await tryAutoApproveEvent(event, { organizer: user })
      : { approved: false };

    const keysToDelete = [];
    if ((bannerImageFile || formData.removeBannerImage) && previousBannerUrl && previousBannerUrl !== event.bannerImageUrl) {
      const previousBannerKey = uploadService.extractObjectKeyFromPublicUrl(previousBannerUrl);
      if (previousBannerKey) keysToDelete.push(previousBannerKey);
    }
    if (badgeSyncSucceeded && logoChanged && previousLogoUrl && previousLogoUrl !== event.logoUrl) {
      const previousLogoKey = uploadService.extractObjectKeyFromPublicUrl(previousLogoUrl);
      if (previousLogoKey) keysToDelete.push(previousLogoKey);
    }
    if (logoChanged && badgeSyncSucceeded && previousBadgeImageUrl && previousBadgeImageUrl !== event.badgeImageUrl) {
      const previousBadgeImageKey = uploadService.extractObjectKeyFromPublicUrl(previousBadgeImageUrl);
      if (previousBadgeImageKey) keysToDelete.push(previousBadgeImageKey);
    }
    if ((posterImageFile || formData.removePosterImage) && previousPosterUrl && previousPosterUrl !== event.posterImageUrl) {
      const previousPosterKey = uploadService.extractObjectKeyFromPublicUrl(previousPosterUrl);
      if (previousPosterKey) keysToDelete.push(previousPosterKey);
    }
    if ((paymentQrImageFile || formData.removePaymentQrImage) && previousPaymentQrUrl && previousPaymentQrUrl !== event.paymentQrImageUrl) {
      const previousPaymentQrKey = event.paymentQrImageKey || uploadService.extractObjectKeyFromPublicUrl(previousPaymentQrUrl);
      if (previousPaymentQrKey) keysToDelete.push(previousPaymentQrKey);
    }
    const currentGalleryUrlSet = new Set(Array.isArray(event.galleryImageUrls) ? event.galleryImageUrls : []);
    for (const previousGalleryUrl of previousGalleryUrls) {
      if (!currentGalleryUrlSet.has(previousGalleryUrl)) {
        const previousGalleryKey = uploadService.extractObjectKeyFromPublicUrl(previousGalleryUrl);
        if (previousGalleryKey) keysToDelete.push(previousGalleryKey);
      }
    }
    if (keysToDelete.length) {
      await uploadService.deleteObjects(keysToDelete);
    }

    const query = new URLSearchParams({
      type: 'success',
      msg: autoApproval.approved
        ? 'Event updated and automatically published.'
        : (isDraftSubmitForReview ? 'Event updated and submitted for review.' : 'Event updated successfully.')
    });
    return res.redirect(`/organizer/events/${event._id}?${query.toString()}`);
  } catch (error) {
    logger.error('Error updating event:', error);
    if (!brandingPersisted && uploadedBrandingKeys.length) {
      await uploadService.deleteObjects(uploadedBrandingKeys);
    }
    return res.status(500).render('error', {
      title: 'Server Error',
      status: 500,
      message: 'An error occurred while updating event.'
    });
  }
});

/* ==========================================
   POST: Event Status Transition
   ========================================== */

router.post('/events/:id/status', requireCanCreateEvents, requireCsrfProtection, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.status(404).render('error', {
        title: '404 - User Not Found',
        status: 404,
        message: 'User account not found.'
      });
    }

    const event = await getOwnedEventOrNull(req.params.id, user._id);
    if (!event) {
      return res.status(404).render('error', {
        title: '404 - Event Not Found',
        status: 404,
        message: 'Event not found or you do not have access.'
      });
    }

    const nextStatus = typeof req.body.nextStatus === 'string' ? req.body.nextStatus.trim() : '';
    const transitionError = getStatusTransitionError(event.status, nextStatus);
    if (transitionError) {
      const q = new URLSearchParams({ type: 'error', msg: transitionError });
      return res.redirect(`/organizer/events/${event._id}?${q.toString()}`);
    }

    if (nextStatus === 'pending_review') {
      const readinessErrors = getPublishReadinessErrors(event);
      if (readinessErrors.length) {
        const q = new URLSearchParams({
          type: 'error',
          msg: `Cannot submit yet: ${readinessErrors[0]}`
        });
        return res.redirect(`/organizer/events/${event._id}?${q.toString()}`);
      }
    }

    event.status = nextStatus;
    if (nextStatus === 'pending_review') {
      event.submittedForReviewAt = new Date();
    }
    await event.save();
    generateDefaultEventBadgesInBackground(event, { performedBy: user._id });

    const autoApproval = nextStatus === 'pending_review'
      ? await tryAutoApproveEvent(event, { organizer: user })
      : { approved: false };

    const q = new URLSearchParams({
      type: 'success',
      msg: autoApproval.approved
        ? 'Event automatically published.'
        : `Event status updated to ${nextStatus}.`
    });
    return res.redirect(`/organizer/events/${event._id}?${q.toString()}`);
  } catch (error) {
    logger.error('Error updating event status:', error);
    return res.status(500).render('error', {
      title: 'Server Error',
      status: 500,
      message: 'An error occurred while updating event status.'
    });
  }
});

/* ==========================================
   POST: Remove Event Media
   ========================================== */

router.post('/events/:id/media/remove', requireCanCreateEvents, requireCsrfProtection, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User account not found.' });
    }

    const event = await getOwnedEventOrNull(req.params.id, user._id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found or you do not have access.' });
    }
    if (event.status === 'closed') {
      return res.status(400).json({ success: false, message: 'Closed events cannot be edited.' });
    }

    const mediaKind = String(req.body.kind || '').trim();
    const removeAll = String(req.body.all || '').trim() === '1';
    const targetUrl = String(req.body.url || '').trim();
    const keysToDelete = [];

    if (mediaKind === 'banner') {
      const previousBannerUrl = String(event.bannerImageUrl || '').trim();
      if (previousBannerUrl) {
        const previousBannerKey = uploadService.extractObjectKeyFromPublicUrl(previousBannerUrl);
        if (previousBannerKey) keysToDelete.push(previousBannerKey);
      }
      event.bannerImageUrl = '';
    } else if (mediaKind === 'logo') {
      const previousLogoUrl = String(event.logoUrl || '').trim();
      if (previousLogoUrl) {
        const previousLogoKey = uploadService.extractObjectKeyFromPublicUrl(previousLogoUrl);
        if (previousLogoKey) keysToDelete.push(previousLogoKey);
      }
      event.logoUrl = '';
    } else if (mediaKind === 'poster') {
      const previousPosterUrl = String(event.posterImageUrl || '').trim();
      if (previousPosterUrl) {
        const previousPosterKey = uploadService.extractObjectKeyFromPublicUrl(previousPosterUrl);
        if (previousPosterKey) keysToDelete.push(previousPosterKey);
      }
      event.posterImageUrl = '';
    } else if (mediaKind === 'paymentQr') {
      const previousPaymentQrUrl = String(event.paymentQrImageUrl || '').trim();
      const previousPaymentQrKey = String(event.paymentQrImageKey || '').trim() || uploadService.extractObjectKeyFromPublicUrl(previousPaymentQrUrl);
      if (previousPaymentQrKey) keysToDelete.push(previousPaymentQrKey);
      event.paymentQrImageUrl = '';
      event.paymentQrImageKey = '';
    } else if (mediaKind === 'gallery') {
      const currentGalleryUrls = Array.isArray(event.galleryImageUrls) ? event.galleryImageUrls : [];
      if (removeAll) {
        for (const galleryUrl of currentGalleryUrls) {
          const previousGalleryKey = uploadService.extractObjectKeyFromPublicUrl(galleryUrl);
          if (previousGalleryKey) keysToDelete.push(previousGalleryKey);
        }
        event.galleryImageUrls = [];
      } else {
        if (!targetUrl) {
          return res.status(400).json({ success: false, message: 'Gallery URL is required for single-item remove.' });
        }
        const hasTarget = currentGalleryUrls.includes(targetUrl);
        if (!hasTarget) {
          return res.status(400).json({ success: false, message: 'Gallery image not found on this event.' });
        }
        const previousGalleryKey = uploadService.extractObjectKeyFromPublicUrl(targetUrl);
        if (previousGalleryKey) keysToDelete.push(previousGalleryKey);
        event.galleryImageUrls = currentGalleryUrls.filter((item) => item !== targetUrl);
      }
    } else {
      return res.status(400).json({ success: false, message: 'Invalid media type.' });
    }

    await event.save();
    if (keysToDelete.length) {
      await uploadService.deleteObjects(keysToDelete);
    }

    return res.json({
      success: true,
      media: {
        bannerImageUrl: event.bannerImageUrl || '',
        logoUrl: event.logoUrl || '',
        posterImageUrl: event.posterImageUrl || '',
        galleryImageUrls: Array.isArray(event.galleryImageUrls) ? event.galleryImageUrls : []
      }
    });
  } catch (error) {
    logger.error('Error removing event media:', error);
    return res.status(500).json({ success: false, message: 'Failed to remove media. Please try again.' });
  }
});

/* ==========================================
   Event Promotion
   ========================================== */

const PROMO_DAILY_LIMIT = 25;

async function getQuotaUsed(organizerId) {
  const dateKey = new Date().toISOString().slice(0, 10);
  const agg = await EventPromotion.aggregate([
    { $match: { organizerId: toObjectId(organizerId), dateKey } },
    { $group: { _id: null, total: { $sum: '$recipientCount' } } }
  ]);
  return Number(agg[0]?.total || 0);
}

router.get('/promote', requireApprovedOrganizer, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId).select('firstName organizerStatus').lean();
    if (!user) return res.status(403).render('error', { title: '403', status: 403, message: 'Access denied.' });

    const [events, quotaUsed, recentCampaigns] = await Promise.all([
      Event.find({ organizerId: req.session.userId, isDeleted: { $ne: true }, status: { $ne: 'archived' } })
        .select('_id title slug status eventStartAt')
        .sort({ eventStartAt: -1 })
        .lean(),
      getQuotaUsed(req.session.userId),
      EventPromotion.find({ organizerId: req.session.userId })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('eventId', 'title')
        .lean()
    ]);

    const pageMessage = getPageMessage(req.query);
    return res.render('organizer/event-promote', {
      title: 'Promote Event',
      user,
      events,
      quotaUsed,
      quotaLimit: PROMO_DAILY_LIMIT,
      quotaRemaining: Math.max(0, PROMO_DAILY_LIMIT - quotaUsed),
      recentCampaigns,
      pageMessage,
      csrfToken: res.locals.csrfToken || ''
    });
  } catch (error) {
    logger.error('Promote page error:', error);
    return res.status(500).render('error', { title: '500', status: 500, message: 'Could not load promotion page.' });
  }
});

router.get('/promote/preview', requireApprovedOrganizer, async (req, res) => {
  try {
    const { eventId, audience } = req.query;
    if (!eventId || !['previous_participants', 'non_participants'].includes(audience)) {
      return res.json({ count: 0, quotaUsed: 0, quotaRemaining: PROMO_DAILY_LIMIT, quotaLimit: PROMO_DAILY_LIMIT });
    }

    const event = await getOwnedEventOrNull(eventId, req.session.userId);
    if (!event) return res.status(403).json({ error: 'Event not found.' });

    const [recipients, quotaUsed] = await Promise.all([
      resolveOrganizerPromotionRecipients({ organizerId: req.session.userId, audience }),
      getQuotaUsed(req.session.userId)
    ]);

    const quotaRemaining = Math.max(0, PROMO_DAILY_LIMIT - quotaUsed);
    return res.json({
      count: Math.min(recipients.length, quotaRemaining),
      rawCount: recipients.length,
      quotaUsed,
      quotaRemaining,
      quotaLimit: PROMO_DAILY_LIMIT
    });
  } catch (error) {
    logger.error('Promote preview error:', error);
    return res.status(500).json({ error: 'Preview failed.' });
  }
});

router.post('/promote', requireApprovedOrganizer, requireCsrfProtection, async (req, res) => {
  const redirectBase = '/organizer/promote';
  try {
    const { eventId, audience } = req.body;
    const validAudiences = ['previous_participants', 'non_participants'];
    if (!eventId || !validAudiences.includes(audience)) {
      const q = new URLSearchParams({ type: 'error', msg: 'Invalid promotion request.' });
      return res.redirect(`${redirectBase}?${q}`);
    }

    const event = await getOwnedEventOrNull(eventId, req.session.userId);
    if (!event) {
      const q = new URLSearchParams({ type: 'error', msg: 'Event not found.' });
      return res.redirect(`${redirectBase}?${q}`);
    }

    const quotaUsed = await getQuotaUsed(req.session.userId);
    const quotaRemaining = Math.max(0, PROMO_DAILY_LIMIT - quotaUsed);
    if (quotaRemaining <= 0) {
      const q = new URLSearchParams({ type: 'error', msg: `Daily promotion limit reached (${PROMO_DAILY_LIMIT}/day). Try again tomorrow.` });
      return res.redirect(`${redirectBase}?${q}`);
    }

    const allRecipients = await resolveOrganizerPromotionRecipients({ organizerId: req.session.userId, audience });
    const recipients = allRecipients.slice(0, quotaRemaining);

    if (!recipients.length) {
      const q = new URLSearchParams({ type: 'error', msg: 'No eligible recipients found for this audience.' });
      return res.redirect(`${redirectBase}?${q}`);
    }

    const dateKey = new Date().toISOString().slice(0, 10);
    // recipientCount is set up front so getQuotaUsed counts in-flight campaigns.
    const campaign = await EventPromotion.create({
      organizerId: req.session.userId,
      eventId: event._id,
      audience,
      recipientCount: recipients.length,
      selectedCount: recipients.length,
      dateKey,
      status: 'sending',
      sentAt: new Date()
    });

    const organiserName = event.organizerDisplayName || event.organizerFirstName || 'an organiser';

    const user = await User.findById(req.session.userId).select('firstName lastName').lean();
    const senderName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : organiserName;

    // Sends are throttled to respect the email provider's rate limit, so a large
    // campaign takes minutes — dispatch in the background and redirect immediately.
    dispatchEventPromotionCampaignInBackground({
      campaign,
      recipients,
      event,
      organiserName: senderName,
      source: 'event.promotion'
    });

    const resultText = `Promotion started for ${recipients.length} runner${recipients.length !== 1 ? 's' : ''}. Progress appears under Recent Campaigns.`;
    const q = new URLSearchParams({ type: 'success', msg: resultText });
    return res.redirect(`${redirectBase}?${q}`);
  } catch (error) {
    logger.error('Promote send error:', error);
    const q = new URLSearchParams({ type: 'error', msg: 'An error occurred while sending the promotion.' });
    return res.redirect(`${redirectBase}?${q}`);
  }
});

module.exports = router;
