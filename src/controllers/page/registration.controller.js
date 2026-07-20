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
  buildMyRegistrationsPresentation,
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

const { buildRegistrationPagePresentation } = require('../../services/registration-page-presentation.service');
const { getRunnerProfileCompleteness } = require('../../services/profile-completion.service');

exports.getEventRegistrationForm = async (req, res) => {
  try {
    const [event, user] = await Promise.all([
      getPublishedEventBySlug(req.params.slug),
      User.findById(req.session.userId).select(
        'firstName lastName email mobile country timezone dateOfBirth gender emergencyContactName emergencyContactNumber runningGroup runningGroups role organizerStatus emailVerified'
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
      .select('confirmationCode participationMode raceDistance status paymentStatus pricingSnapshot paymentAmountDue paymentCurrency addOns addOnsSubtotal addOnsCurrency registeredAt');

    const formData = getRegistrationFormData({
      ...profileSnapshot,
      participationMode: defaultParticipationMode,
      raceDistance: '',
      customizedOptionId: customizedRegistrationOptions[0]?.id || '',
      registrationPackageId: defaultRegistrationPackage?.id || '',
      waiverAccepted: false,
      waiverSignature: ''
    });
    const registrationPresentation = buildRegistrationPagePresentation({
      event,
      formData,
      profileSnapshot,
      allowedModes,
      allowedRaceDistances,
      raceCategoryOptions,
      raceDistancePricingPreview,
      customizedRegistrationOptions,
      registrationPackageOptions,
      registrationAddOns,
      profileCompleteness: getRunnerProfileCompleteness(user),
      existingRegistration: existing
    });

    return res.render('pages/event-register', {
      title: `Register - ${event.title}`,
      event,
      allowedModes,
      allowedRaceDistances,
      countries,
      errors: {},
      message: getPageMessage(req.query),
      formData,
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
      registrationPresentation,
      justRegistered: req.query.registered === '1'
    });
  } catch (error) {
    logger.error('Error loading event registration form:', error);
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
        'firstName lastName email mobile country timezone dateOfBirth gender emergencyContactName emergencyContactNumber runningGroup runningGroups role organizerStatus emailVerified'
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
      .select('confirmationCode participationMode raceDistance status paymentStatus pricingSnapshot paymentAmountDue paymentCurrency addOns addOnsSubtotal addOnsCurrency registeredAt');
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

    // Capacity check: enforce race category slots if configured
    if (Object.keys(validationErrors).length === 0 && resolvedPrice.raceCategoryId) {
      const selectedCategory = (event.raceCategories || []).find(
        (cat) => String(cat.categoryId || '') === String(resolvedPrice.raceCategoryId)
      );
      if (selectedCategory && Number.isFinite(selectedCategory.slots) && selectedCategory.slots > 0) {
        const filledSlots = await Registration.countDocuments({
          eventId: event._id,
          'pricingSnapshot.raceCategoryId': resolvedPrice.raceCategoryId,
          status: { $in: ['confirmed'] },
          paymentStatus: { $nin: ['refunded'] }
        });
        if (filledSlots >= selectedCategory.slots) {
          validationErrors.raceDistance = `The ${selectedCategory.distanceLabel || selectedCategory.name || 'selected'} category is now full (${selectedCategory.slots} slots). Please choose a different distance.`;
        }
      }
    }

    if (Object.keys(validationErrors).length > 0) {
      const registrationPresentation = buildRegistrationPagePresentation({
        event,
        formData,
        profileSnapshot: formData,
        allowedModes,
        allowedRaceDistances,
        raceCategoryOptions,
        raceDistancePricingPreview,
        customizedRegistrationOptions,
        registrationPackageOptions,
        registrationAddOns,
        profileCompleteness: getRunnerProfileCompleteness(user),
        existingRegistration: null
      });
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
        registrationPresentation,
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
        waiverVersion: Number(event.waiverVersion || 1),
        renderedWaiver,
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

    logger.error('Error submitting event registration:', error);
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
    logger.error('Quick profile update error:', error);
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
    const registrationPresentation = buildMyRegistrationsPresentation(enrichedRegistrations, {
      standardSubmissions: submissions,
      accumulatedActivities
    });

    return res.render('pages/my-registrations', {
      title: 'My Registrations - HelloRun',
      registrations: enrichedRegistrations,
      registrationGroups: registrationPresentation.groups,
      registrationCounts: registrationPresentation.counts,
      message: getPageMessage(req.query),
      countryName: getCountryName,
      genderLabel: formatGenderLabel,
      ageLabel: formatAgeFromDob
    });
  } catch (error) {
    logger.error('Error loading my registrations:', error);
    return res.status(500).render('error', {
      title: 'Server Error',
      status: 500,
      message: 'An error occurred while loading your registrations.'
    });
  }
};

exports.__testCreateRegistrationAddOnOrderIfNeeded = createRegistrationCheckoutOrderIfNeeded;

exports.__testCreateRegistrationCheckoutOrderIfNeeded = createRegistrationCheckoutOrderIfNeeded;

function getPageMessage(query) {
  const msg = typeof query.msg === 'string' ? query.msg.trim() : '';
  if (!msg) return null;
  const type = query.type === 'error' ? 'error' : 'success';
  return { type, text: msg.slice(0, 220) };
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
    logger.warn('Registration add-ons unavailable:', error.message || error);
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
    logger.error('Registration add-on order bridge failed:', {
      registrationId: String(registration._id || ''),
      eventId: String(event._id || ''),
      userId: String(user._id || ''),
      error: error?.message || String(error)
    });
  }
}

function buildRegistrationOrderNumber() {
  const dateToken = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomToken = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `HR-REG-${dateToken}-${randomToken}`;
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
  if (user.accountStatus === 'restricted') {
    return 'Your account is currently restricted. Please contact support.';
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
