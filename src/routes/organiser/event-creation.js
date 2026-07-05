// src/routes/organiser/event-creation.js
const express = require('express');
const router = express.Router();
const {
  logger,
  mongoose,
  crypto,
  User,
  Event,
  requireCanCreateEvents,
  requireCsrfProtection,
  getCountryName,
  DEFAULT_WAIVER_TEMPLATE,
  uploadService,
  eventFormService,
  buildPublicEventView,
  renderEventDetailsContent,
  countries,
  MAX_GALLERY_IMAGES,
  getPreviewSessionStore,
  savePreviewSession,
  buildPreviewBackHref,
  PREVIEW_SESSION_TTL_MS,
  getCreateEventFormData,
  getCreateEventFormDataFromEvent,
  getEventReadinessChecklist,
  getEventReviewSummary,
  getConsistencyWarnings,
  validateCreateEventForm,
  getEventTypesAllowed,
  generateUniqueSlug,
  generateUniqueReferenceCode,
  parseDateSafe,
  resolveFinalSubmissionDeadline,
  sanitizeWaiverTemplate,
  tryAutoApproveEvent,
  getRestrictedSetupReasons,
  VERIFY_TO_UNLOCK_MESSAGE,
  generateDefaultEventBadgesInBackground,
  mapUploadFieldToFormField,
  getOwnedEventOrNull,
  getPageMessage
} = require('./_shared');

/* ==========================================
   GET: Clone Event
   ========================================== */

router.get('/events/:id/clone', requireCanCreateEvents, async (req, res) => {
  try {
    const [user, sourceEvent] = await Promise.all([
      User.findById(req.session.userId),
      getOwnedEventOrNull(req.params.id, req.session.userId)
    ]);

    if (!user) return res.status(404).render('error', { title: '404', status: 404, message: 'User not found.' });
    if (!sourceEvent) return res.status(404).render('error', { title: '404', status: 404, message: 'Event not found or you do not have access.' });

    // Build form data from the source event then reset fields that must be unique or are event-instance-specific
    const formData = getCreateEventFormDataFromEvent(sourceEvent);
    formData.slug = '';
    formData.eventStartAt = '';
    formData.eventEndAt = '';
    formData.registrationOpenAt = '';
    formData.registrationCloseAt = '';
    formData.publicListingAvailableAt = '';
    formData.virtualWindow = { startAt: '', endAt: '' };
    formData.finalSubmissionDeadlineAt = '';
    formData.actionType = 'draft';

    return res.render('organizer/create-event', {
      title: `Clone Event - ${sourceEvent.title} - HelloRun`,
      user,
      errors: {},
      formData,
      readinessChecklist: getEventReadinessChecklist(formData),
      reviewSummary: getEventReviewSummary(formData),
      consistencyWarnings: getConsistencyWarnings(formData),
      countries,
      defaultWaiverTemplate: DEFAULT_WAIVER_TEMPLATE,
      message: null,
      cloneSourceName: sourceEvent.title
    });
  } catch (error) {
    logger.error('Error loading event clone page:', error);
    return res.status(500).render('error', { title: 'Server Error', status: 500, message: 'An error occurred while loading the clone page.' });
  }
});

/* ==========================================
   GET: Create Event Page
   ========================================== */

router.get('/create-event', requireCanCreateEvents, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);

    if (!user) {
      return res.status(404).render('error', {
        title: '404 - User Not Found',
        status: 404,
        message: 'User account not found.'
      });
    }

    const formData = getCreateEventFormData();
    const accountOwnerName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
    if (!formData.organiserName && accountOwnerName) {
      formData.organiserName = accountOwnerName;
    }

    return res.render('organizer/create-event', {
      title: 'Create Event - HelloRun',
      user,
      errors: {},
      formData,
      readinessChecklist: getEventReadinessChecklist(formData),
      reviewSummary: getEventReviewSummary(formData),
      consistencyWarnings: getConsistencyWarnings(formData),
      countries,
      defaultWaiverTemplate: DEFAULT_WAIVER_TEMPLATE,
      message: getPageMessage(req.query),
      cloneSourceName: null
    });
  } catch (error) {
    logger.error('Error loading create-event page:', error);
    return res.status(500).render('error', {
      title: 'Server Error',
      status: 500,
      message: 'An error occurred while loading the event creation page.'
    });
  }
});

/* ==========================================
   POST: Save Preview Session
   ========================================== */

router.post('/preview-event', requireCanCreateEvents, requireCsrfProtection, async (req, res) => {
  try {
    const previewId = crypto.randomBytes(16).toString('hex');
    const now = Date.now();
    const payload = { ...req.body };
    delete payload._csrf;

    const store = getPreviewSessionStore(req);
    store[previewId] = {
      payload,
      createdAt: now,
      expiresAt: now + PREVIEW_SESSION_TTL_MS
    };

    await savePreviewSession(req);

    return res.json({
      ok: true,
      previewId,
      previewUrl: `/organizer/preview-event?previewId=${encodeURIComponent(previewId)}`
    });
  } catch (error) {
    logger.error('Error creating event preview session:', error);
    return res.status(500).json({ ok: false, message: 'An error occurred while preparing the event preview.' });
  }
});

/* ==========================================
   POST: Event Readiness Check (AJAX)
   ========================================== */

router.post('/event-readiness', requireCanCreateEvents, requireCsrfProtection, async (req, res) => {
  try {
    const payload = { ...req.body };
    delete payload._csrf;
    const formData = getCreateEventFormData(payload);

    return res.json({
      ok: true,
      readinessChecklist: getEventReadinessChecklist(formData),
      reviewSummary: getEventReviewSummary(formData),
      consistencyWarnings: getConsistencyWarnings(formData)
    });
  } catch (error) {
    logger.error('Error refreshing event readiness:', error);
    return res.status(500).json({ ok: false, message: 'An error occurred while refreshing event readiness.' });
  }
});

/* ==========================================
   GET: Event Preview
   ========================================== */

router.get('/preview-event', requireCanCreateEvents, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);

    if (!user) {
      return res.status(404).render('error', {
        title: '404 - User Not Found',
        status: 404,
        message: 'User account not found.'
      });
    }

    const previewId = String(req.query.previewId || '').trim();
    const previewStore = getPreviewSessionStore(req);
    const previewSession = previewId ? previewStore[previewId] : null;
    const previewSource = previewSession?.payload?.previewSource || req.query.previewSource;
    const previewEventId = previewSession?.payload?.eventId || req.query.eventId;

    if (!previewSession && previewEventId) {
      const savedEvent = await getOwnedEventOrNull(previewEventId, user._id);
      if (!savedEvent) {
        return res.status(404).render('error', {
          title: '404 - Event Not Found',
          status: 404,
          message: 'Event not found or you do not have access.'
        });
      }

      const publicEvent = buildPublicEventView(savedEvent, { registrationCount: 0 });
      publicEvent.registrationState = {
        label: 'Saved Preview',
        tone: 'upcoming',
        canRegisterNow: false,
        helper: 'This preview is generated from the saved event draft and is not a public listing.'
      };
      publicEvent.primaryCta = { label: 'Preview Only', href: '', disabled: true };
      publicEvent.secondaryCtas = [];

      return res.render('pages/event-details', {
        title: `Preview Event - ${savedEvent.title || 'HelloRun'}`,
        seo: null,
        user,
        event: savedEvent,
        publicEvent,
        badges: [],
        eventDetailsHtml: renderEventDetailsContent(savedEvent.eventDetailsMarkdown),
        countryName: getCountryName,
        previewMode: true,
        previewBackHref: buildPreviewBackHref('edit', savedEvent._id),
        previewErrors: []
      });
    }

    const previewPayload = previewSession ? previewSession.payload : req.query;
    const formData = getCreateEventFormData(previewPayload);
    const errors = validateCreateEventForm(formData);
    const previewEvent = new Event({
      _id: new mongoose.Types.ObjectId(),
      organizerId: user._id,
      slug: 'preview-event',
      status: 'draft',
      referenceCode: 'PREVIEW',
      waiverVersion: 1
    });
    eventFormService.applyEventFormData(previewEvent, formData, user);
    previewEvent.slug = 'preview-event';
    previewEvent.status = 'draft';
    previewEvent.referenceCode = 'PREVIEW';

    const publicEvent = buildPublicEventView(previewEvent, { registrationCount: 0 });
    publicEvent.registrationState = {
      label: Object.keys(errors).length ? 'Preview Has Issues' : 'Preview Mode',
      tone: Object.keys(errors).length ? 'closed' : 'upcoming',
      canRegisterNow: false,
      helper: 'This preview is generated from the current editor values and has not been published.'
    };
    publicEvent.primaryCta = { label: 'Preview Only', href: '', disabled: true };
    publicEvent.secondaryCtas = [];

    const previewBackHref = buildPreviewBackHref(previewSource, previewEventId);

    return res.render('pages/event-details', {
      title: `Preview Event - ${previewEvent.title || 'HelloRun'}`,
      seo: null,
      user,
      event: previewEvent,
      publicEvent,
      badges: [],
      eventDetailsHtml: renderEventDetailsContent(previewEvent.eventDetailsMarkdown),
      countryName: getCountryName,
      previewMode: true,
      previewBackHref,
      previewErrors: Object.values(errors)
    });
  } catch (error) {
    logger.error('Error loading event preview page:', error);
    return res.status(500).render('error', {
      title: 'Server Error',
      status: 500,
      message: 'An error occurred while loading the event preview page.'
    });
  }
});

/* ==========================================
   POST: Create Event
   ========================================== */

router.post('/create-event', requireCanCreateEvents, uploadService.uploadEventBranding, requireCsrfProtection, async (req, res) => {
  const uploadedBrandingKeys = [];
  try {
    const user = await User.findById(req.session.userId);

    if (!user) {
      return res.status(404).render('error', {
        title: '404 - User Not Found',
        status: 404,
        message: 'User account not found.'
      });
    }

    const formData = getCreateEventFormData(req.body);
    const incomingPaymentQrFile = req.files?.paymentQrImageFile?.[0] || null;
    if (incomingPaymentQrFile && formData.feeMode === 'paid' && !formData.paymentQrImageUrl) {
      formData.paymentQrImageUrl = 'https://pending-upload.local/payment-qr.png';
    }
    if (req.uploadError) {
      const errorField = mapUploadFieldToFormField(req.uploadErrorField);
      return res.status(400).render('organizer/create-event', {
        title: 'Create Event - HelloRun',
        user,
        errors: { [errorField]: req.uploadError },
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
    const status = formData.actionType === 'publish' ? 'pending_review' : 'draft';
    let slug = null;
    const eventTypesAllowed = getEventTypesAllowed(formData.eventType);
    const isVirtualMode = formData.eventType === 'virtual' || formData.eventType === 'hybrid';
    const finalSubmissionDeadlineAt = isVirtualMode && formData.virtualCompletionMode === 'accumulated_distance'
      ? resolveFinalSubmissionDeadline(formData)
      : null;

    const bannerImageFile = req.files?.bannerImageFile?.[0] || null;
    const logoFile = req.files?.logoFile?.[0] || null;
    const posterImageFile = req.files?.posterImageFile?.[0] || null;
    const paymentQrImageFile = incomingPaymentQrFile;
    const galleryImageFiles = req.files?.galleryImageFiles || [];
    if (bannerImageFile || logoFile || posterImageFile || paymentQrImageFile || galleryImageFiles.length) {
      slug = await generateUniqueSlug(formData.title || `event-upload-${Date.now()}`);
      const uploadedBranding = await uploadService.uploadEventBrandingToR2({
        userId: user._id,
        slug,
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

    if ((formData.galleryImageUrls || []).length > MAX_GALLERY_IMAGES) {
      return res.status(400).render('organizer/create-event', {
        title: 'Create Event - HelloRun',
        user,
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
      return res.status(400).render('organizer/create-event', {
        title: 'Create Event - HelloRun',
        user,
        errors: validationErrors,
        formData,
        readinessChecklist: getEventReadinessChecklist(formData),
        reviewSummary: getEventReviewSummary(formData),
        countries,
        defaultWaiverTemplate: DEFAULT_WAIVER_TEMPLATE,
        message: null
      });
    }

    slug = slug || await generateUniqueSlug(formData.title);

    const referenceCode = await generateUniqueReferenceCode({
      title: formData.title,
      date: new Date(),
      existsFn: async (candidate) => Event.exists({ referenceCode: candidate })
    });

    const event = new Event({
      organizerId: user._id,
      slug,
      referenceCode,
      title: formData.title,
      organiserName,
      description: formData.description,
      eventDetailsMarkdown: formData.eventDetailsMarkdown || '',
      status,
      eventType: formData.eventType || undefined,
      eventTypesAllowed,
      raceDistances: formData.raceDistances,
      registrationOpenAt: parseDateSafe(formData.registrationOpenAt),
      registrationCloseAt: parseDateSafe(formData.registrationCloseAt),
      publicListingAvailableAt: parseDateSafe(formData.publicListingAvailableAt),
      eventStartAt: parseDateSafe(formData.eventStartAt),
      eventEndAt: parseDateSafe(formData.eventEndAt),
      venueName: formData.venueName || '',
      venueAddress: formData.venueAddress || '',
      city: formData.city || '',
      province: formData.province || '',
      country: formData.country || '',
      geo: formData.geoLat && formData.geoLng
        ? { lat: Number(formData.geoLat), lng: Number(formData.geoLng) }
        : undefined,
      virtualWindow: (formData.eventType === 'virtual' || formData.eventType === 'hybrid') && formData.virtualStartAt && formData.virtualEndAt
        ? {
            startAt: parseDateSafe(formData.virtualStartAt),
            endAt: parseDateSafe(formData.virtualEndAt)
          }
        : undefined,
      proofTypesAllowed: formData.eventType === 'virtual' || formData.eventType === 'hybrid'
        ? formData.proofTypesAllowed
        : [],
      virtualCompletionMode: isVirtualMode ? formData.virtualCompletionMode : 'single_activity',
      targetDistanceKm: isVirtualMode && formData.virtualCompletionMode === 'accumulated_distance'
        ? formData.targetDistanceKm
        : null,
      minimumActivityDistanceKm: null,
      acceptedRunTypes: isVirtualMode && formData.virtualCompletionMode === 'accumulated_distance'
        ? formData.acceptedRunTypes
        : [],
      finalSubmissionDeadlineAt: isVirtualMode && formData.virtualCompletionMode === 'accumulated_distance'
        ? finalSubmissionDeadlineAt
        : null,
      milestoneDistancesKm: [],
      recognitionMode: isVirtualMode && formData.virtualCompletionMode === 'accumulated_distance'
        ? formData.recognitionMode
        : 'completion_only',
      leaderboardMode: isVirtualMode && formData.virtualCompletionMode === 'accumulated_distance'
        ? formData.leaderboardMode
        : 'finishers',
      feeMode: formData.feeMode === 'paid' ? 'paid' : 'free',
      feeAmount: formData.feeMode === 'paid' ? formData.feeAmount : null,
      feeCurrency: formData.feeCurrency || 'PHP',
      paymentQrImageUrl: formData.paymentQrImageUrl || '',
      paymentQrImageKey: formData.paymentQrImageKey || '',
      paymentAccountName: formData.paymentAccountName || '',
      paymentInstructions: formData.paymentInstructions || '',
      digitalBadgeEnabled: Boolean(formData.digitalBadgeEnabled),
      digitalCertificateEnabled: formData.digitalCertificateEnabled !== false,
      leaderboardRecognitionEnabled: formData.leaderboardRecognitionEnabled !== false,
      physicalRewardsEnabled: Boolean(formData.physicalRewardsEnabled),
      physicalRewardMedalEnabled: formData.physicalRewardsEnabled ? Boolean(formData.physicalRewardMedalEnabled) : false,
      physicalRewardShirtEnabled: formData.physicalRewardsEnabled ? Boolean(formData.physicalRewardShirtEnabled) : false,
      physicalRewardPatchEnabled: formData.physicalRewardsEnabled ? Boolean(formData.physicalRewardPatchEnabled) : false,
      physicalRewardFinisherKitEnabled: formData.physicalRewardsEnabled ? Boolean(formData.physicalRewardFinisherKitEnabled) : false,
      physicalRewardsDescription: formData.physicalRewardsEnabled ? formData.physicalRewardsDescription || '' : '',
      bannerImageUrl: formData.bannerImageUrl || '',
      logoUrl: formData.logoUrl || '',
      posterImageUrl: formData.posterImageUrl || '',
      galleryImageUrls: formData.galleryImageUrls || [],
      waiverTemplate: sanitizeWaiverTemplate(formData.waiverTemplate),
      waiverVersion: 1,
      submittedForReviewAt: status === 'pending_review' ? new Date() : null
    });

    eventFormService.applyEventFormData(event, formData, user);
    event.status = status;
    event.submittedForReviewAt = status === 'pending_review' ? new Date() : null;

    if (user.organizerStatus !== 'approved' && getRestrictedSetupReasons(event).length) {
      if (uploadedBrandingKeys.length) {
        await uploadService.deleteObjects(uploadedBrandingKeys);
      }
      return res.status(400).render('organizer/create-event', {
        title: 'Create Event - HelloRun',
        user,
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

    const autoApproval = status === 'pending_review'
      ? await tryAutoApproveEvent(event, { organizer: user })
      : { approved: false };

    const successText = status === 'pending_review'
      ? (autoApproval.approved ? 'Event submitted and automatically published.' : 'Event submitted for admin review.')
      : 'Event saved as draft successfully.';

    const query = new URLSearchParams({ type: 'success', msg: successText });
    return res.redirect(`/organizer/events?${query.toString()}`);
  } catch (error) {
    logger.error('Error creating event:', error);
    if (uploadedBrandingKeys.length) {
      await uploadService.deleteObjects(uploadedBrandingKeys);
    }
    return res.status(500).render('error', {
      title: 'Server Error',
      status: 500,
      message: 'An error occurred while creating the event.'
    });
  }
});

module.exports = router;
