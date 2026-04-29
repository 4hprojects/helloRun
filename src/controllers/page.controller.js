const crypto = require('crypto');
const Event = require('../models/Event');
const User = require('../models/User');
const Registration = require('../models/Registration');
const Submission = require('../models/Submission');
const OrganiserApplication = require('../models/OrganiserApplication');
const Blog = require('../models/Blog');
const BlogLike = require('../models/BlogLike');
const emailService = require('../services/email.service');
const { registerBlogView } = require('../services/blog-view.service');
const { getRunnerRegistrations } = require('../services/runner-data.service');
const uploadService = require('../services/upload.service');
const { createNotificationSafe } = require('../services/notification.service');
const { getCountries, isValidCountryCode, normalizeCountryCode, getCountryName } = require('../utils/country');
const { BLOG_CATEGORIES } = require('../utils/blog');
const { renderWaiverTemplate } = require('../utils/waiver');
const { canRunnerSubmitPaymentProof } = require('../utils/payment-workflow');
const {
  createSubmission,
  resubmitSubmission,
  getRunnerSubmissions,
  PERSONAL_RECORD_REGISTRATION_ID
} = require('../services/submission.service');
const { getLeaderboardData } = require('../services/leaderboard.service');

const countries = getCountries();

exports.getHome = async (req, res) => {
  try {
    const now = new Date();
    const baseUrl = getAppBaseUrl();
    const canonicalUrl = baseUrl ? `${baseUrl}/` : '';
    const ogImage = baseUrl ? `${baseUrl}/images/helloRun-icon.webp` : '';

    const [activeEventsCount, approvedFinishersCount, approvedOrganizersCount, recentPostsRaw] = await Promise.all([
      Event.countDocuments({
        isPersonalRecord: { $ne: true },
        status: 'published',
        $or: [
          { eventEndAt: { $gte: now } },
          { eventEndAt: null },
          { eventEndAt: { $exists: false } }
        ]
      }),
      Submission.countDocuments({ status: 'approved', isPersonalRecord: { $ne: true } }),
      OrganiserApplication.countDocuments({ status: 'approved' }),
      Blog.find({
        status: 'published',
        isDeleted: { $ne: true }
      })
        .populate('authorId', 'firstName lastName')
        .sort({ publishedAt: -1, createdAt: -1 })
        .limit(3)
        .select('title slug excerpt category customCategory coverImageUrl readingTime publishedAt createdAt')
        .lean()
    ]);

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
        detail: 'Organizers building virtual and hybrid events on helloRun',
        icon: 'users'
      }
    ];

    const recentPosts = recentPostsRaw.map((post) => ({
      ...post,
      categoryLabel: post.category === 'Other' && post.customCategory ? post.customCategory : post.category,
      publishedLabel: formatDateOnly(post.publishedAt || post.createdAt),
      authorName: [post.authorId?.firstName, post.authorId?.lastName].filter(Boolean).join(' ').trim() || 'helloRun'
    }));

    return res.render('pages/home', {
      title: 'helloRun - Find virtual races, finish strong, stay connected',
      seo: {
        description: 'Discover virtual running events, track finishes, and stay connected with the helloRun running community.',
        canonicalUrl,
        ogTitle: 'helloRun - Virtual races and running community',
        twitterTitle: 'helloRun - Virtual races and running community',
        ogImage
      },
      stats,
      recentPosts
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

    const filterValues = getEventsFilterValues(req.query);
    const now = new Date();
    const matchingCountryCodes = getMatchingCountryCodes(filterValues.q);
    const query = {
      status: 'published',
      isPersonalRecord: { $ne: true }
    };
    if (filterValues.eventType) {
      query.$or = [
        { eventType: filterValues.eventType },
        { eventTypesAllowed: filterValues.eventType }
      ];
    }
    if (filterValues.distance) {
      query.raceDistances = filterValues.distance;
    }
    if (filterValues.status === 'upcoming') {
      query.eventStartAt = { $gte: now };
    } else if (filterValues.status === 'open') {
      query.registrationOpenAt = { $lte: now };
      query.registrationCloseAt = { $gte: now };
    } else if (filterValues.status === 'closed') {
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { eventEndAt: { $lt: now } },
          { registrationCloseAt: { $lt: now } }
        ]
      });
    }
    if (filterValues.q) {
      const safePattern = new RegExp(escapeRegex(filterValues.q), 'i');
      query.$and = query.$and || [];
      const searchConditions = [
        { title: safePattern },
        { organiserName: safePattern },
        { description: safePattern },
        { venueName: safePattern },
        { city: safePattern },
        { country: safePattern }
      ];
      if (matchingCountryCodes.length) {
        searchConditions.push({ country: { $in: matchingCountryCodes } });
      }
      query.$and.push({
        $or: searchConditions
      });
    }

    const page = normalizePositiveInt(req.query.page, 1);
    const limit = 9;

    const [totalEvents, distanceOptions] = await Promise.all([
      Event.countDocuments(query),
      Event.distinct('raceDistances', { status: 'published' })
    ]);
    const totalPages = Math.max(1, Math.ceil(totalEvents / limit));
    const currentPage = Math.min(page, totalPages);
    const skip = (currentPage - 1) * limit;

    const eventSelect = 'title slug description organiserName eventType eventTypesAllowed raceDistances eventStartAt eventEndAt venueName city country bannerImageUrl registrationCloseAt registrationOpenAt createdAt';
    let events;
    if (filterValues.q) {
      const rankedEvents = await Event.find(query)
        .select(eventSelect)
        .lean();
      events = rankEventsForSearch(rankedEvents, filterValues.q)
        .sort((a, b) => compareEventsForSearch(a, b, filterValues.status))
        .slice(skip, skip + limit);
    } else {
      events = await Event.find(query)
        .sort(getEventsSort(filterValues.status))
        .skip(skip)
        .limit(limit)
        .select(eventSelect)
        .lean();
    }

    const normalizedDistanceOptions = distanceOptions
      .map((item) => String(item || '').trim().toUpperCase())
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    const activeFilterCount = Number(Boolean(filterValues.q))
      + Number(Boolean(filterValues.eventType))
      + Number(Boolean(filterValues.distance))
      + Number(filterValues.status !== 'all');

    const hasActiveFilters = activeFilterCount > 0;
    const activeFilters = getEventsActiveFilters(filterValues);
    const pageContent = getEventsPageContent(filterValues, {
      currentPage,
      totalPages
    });

    const eventsForRender = events.map((event) => {
      const raceDistances = Array.isArray(event.raceDistances)
        ? event.raceDistances.map((distanceItem) => String(distanceItem || '').trim().toUpperCase()).filter(Boolean)
        : [];
      const displayState = getEventCardDisplayState(event, now);
      return {
        ...event,
        raceDistances,
        countryLabel: getCountryName(event.country),
        displayState
      };
    });

    return res.render('pages/events', {
        title: pageContent.title,
        seo: {
          ...pageContent.seo,
          canonicalUrl: buildEventsCanonicalUrl(filterValues, currentPage)
        },
        loginSuccess,
        userName,
        events: eventsForRender,
      filters: filterValues,
      pageContent,
      filterMeta: {
        hasActiveFilters,
        activeFilterCount,
        resultsCount: totalEvents,
        distanceOptions: normalizedDistanceOptions,
        activeFilters,
        summary: buildEventsResultsSummary(filterValues, totalEvents)
      },
      pagination: {
        currentPage,
        totalPages,
        pageSize: limit,
        getPageUrl: (pageNumber) => buildEventsPageUrl(filterValues, pageNumber)
      }
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

exports.getEventDetails = async (req, res) => {
  try {
    const event = await getPublishedEventBySlug(req.params.slug);
    if (!event) {
      return renderEventNotFound(res);
    }

    return res.render('pages/event-details', {
      title: `${event.title} - helloRun`,
      event,
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
    const profileSnapshot = getRegistrationProfileSnapshot(user);
    const requiresEmergencyContact = !profileSnapshot.emergencyContactName || !profileSnapshot.emergencyContactNumber;
    const existing = await Registration.findOne({ eventId: event._id, userId: user._id })
      .select('confirmationCode participationMode raceDistance status paymentStatus registeredAt');

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
        participationMode: allowedModes[0] || '',
        raceDistance: allowedRaceDistances[0] || '',
        waiverAccepted: false,
        waiverSignature: ''
      }),
      requiresEmergencyContact,
      waiverHtml: renderWaiverTemplate(event.waiverTemplate, {
        organizerName: event.organiserName,
        eventTitle: event.title
      }),
      waiverVersion: Number(event.waiverVersion || 1),
      registrationWindowError,
      existingRegistration: existing || null,
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
    const profileSnapshot = getRegistrationProfileSnapshot(user);
    const requiresEmergencyContact = !profileSnapshot.emergencyContactName || !profileSnapshot.emergencyContactNumber;
    const emergencyContactName = profileSnapshot.emergencyContactName || String(req.body.emergencyContactName || '').trim();
    const emergencyContactNumber = profileSnapshot.emergencyContactNumber || String(req.body.emergencyContactNumber || '').trim();
    const formData = getRegistrationFormData({
      ...profileSnapshot,
      emergencyContactName,
      emergencyContactNumber,
      participationMode: req.body.participationMode,
      raceDistance: req.body.raceDistance,
      waiverAccepted: req.body.waiverAccepted,
      waiverSignature: req.body.waiverSignature
    });

    const existingRegistration = await Registration.findOne({ eventId: event._id, userId: user._id })
      .select('confirmationCode participationMode raceDistance status paymentStatus registeredAt');
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
        waiverHtml: renderWaiverTemplate(event.waiverTemplate, {
          organizerName: event.organiserName,
          eventTitle: event.title
        }),
        waiverVersion: Number(event.waiverVersion || 1),
        registrationWindowError,
        existingRegistration: null,
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
      paymentStatus: 'unpaid',
      confirmationCode,
      registeredAt: new Date()
    });

    await registration.save();

    await createNotificationSafe(
      {
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
      'registration confirmation notification'
    );

    try {
      await emailService.sendEventRegistrationConfirmationEmail(
        formData.email,
        formData.firstName,
        event.title,
        confirmationCode,
        formData.participationMode,
        event.eventStartAt,
        formData.raceDistance
      );
    } catch (emailError) {
      console.error('Registration confirmation email failed:', {
        error: emailError.message,
        eventId: String(event._id),
        userId: String(user._id)
      });
    }

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
    user.emergencyContactName = payload.emergencyContactName;
    user.emergencyContactNumber = payload.emergencyContactNumber;
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
        emergencyContactName: payload.emergencyContactName,
        emergencyContactNumber: payload.emergencyContactNumber,
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
    const submissionsByRegistrationId = new Map(
      submissions.map((item) => [String(item.registrationId?._id || item.registrationId), item])
    );
    const enrichedRegistrations = registrations.map((registration) => ({
      ...registration,
      submission: submissionsByRegistrationId.get(String(registration._id)) || null
    }));

    return res.render('pages/my-registrations', {
      title: 'My Registrations - helloRun',
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
      : 'Result submitted successfully. Await organizer review.'
  });
};

exports.postResubmitResult = async (req, res) => {
  return handleRunnerSubmissionWrite(req, res, {
    mode: 'resubmit',
    successMessage: 'Result resubmitted successfully. Await organizer review.'
  });
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

    if (!submission) {
      return redirectWithPageMessage(res, 'error', 'Submission not found or inaccessible.');
    }
    if (submission.status !== 'approved') {
      return redirectWithPageMessage(res, 'error', 'Certificate is available only for approved submissions.');
    }

    const certificateUrl = String(submission.certificate?.url || '').trim();
    if (!certificateUrl) {
      return redirectWithPageMessage(res, 'error', 'Certificate is not yet available. Please try again shortly.');
    }

    if (certificateUrl.startsWith('data:application/pdf;base64,')) {
      const base64 = certificateUrl.slice('data:application/pdf;base64,'.length);
      const pdfBuffer = Buffer.from(base64, 'base64');
      const safeEventTitle = String(submission.eventId?.title || 'helloRun')
        .replace(/[^a-z0-9-_]+/gi, '-')
        .replace(/^-+|-+$/g, '')
        .toLowerCase()
        .slice(0, 60) || 'hello-run';
      const confirmationCode = String(submission.registrationId?.confirmationCode || 'certificate')
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
        msg: 'Please select a payment proof file before submitting.'
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
        msg: 'Payment proof upload is only allowed for unpaid/rejected active registrations.'
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
    uploadedProofKey = '';

    await createNotificationSafe(
      {
        userId: user._id,
        type: 'payment_proof_submitted',
        title: 'Payment Proof Submitted',
        message: `Payment proof submitted for ${registration.eventId.title || 'your event registration'}.`,
        href: '/my-registrations',
        metadata: {
          registrationId: String(registration._id),
          eventId: String(registration.eventId._id || ''),
          eventTitle: registration.eventId.title || ''
        }
      },
      'payment proof submitted notification'
    );

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
      if (organizer?.email) {
        await emailService.sendPaymentProofSubmittedEmailToOrganizer(
          organizer.email,
          organizer.firstName || 'Organizer',
          `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
          registration.eventId.title || 'Event',
          registration.confirmationCode || ''
        );
      }
    } catch (emailError) {
      console.error('Payment proof submission organizer email failed:', {
        error: emailError.message,
        registrationId: String(registration._id)
      });
    }

    const query = new URLSearchParams({
      type: 'success',
      msg: 'Payment proof submitted successfully. Await organizer verification.'
    });
    return res.redirect(`/my-registrations?${query.toString()}`);
  } catch (error) {
    if (uploadedProofKey) {
      await uploadService.deleteObjects([uploadedProofKey]);
    }
    console.error('Error uploading payment proof:', error);
    const query = new URLSearchParams({
      type: 'error',
      msg: 'An error occurred while uploading payment proof. Please try again.'
    });
    return res.redirect(`/my-registrations?${query.toString()}`);
  }
};

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
      return redirectWithPageMessage(res, 'error', 'Please select a result proof file before submitting.');
    }

    const registrationId = String(req.params.registrationId || '').trim();
    const targetRegistrationIds = parseSelectedSubmissionRegistrationIds(req.body.selectedRegistrationIds, registrationId);
    if (!targetRegistrationIds.length) {
      return redirectWithPageMessage(res, 'error', 'Select at least one eligible event before submitting.');
    }

    const isPersonalRecordSubmission = registrationId === PERSONAL_RECORD_REGISTRATION_ID;
    const selectedHasPersonalRecord = targetRegistrationIds.includes(PERSONAL_RECORD_REGISTRATION_ID);
    const selectedEventRegistrationIds = targetRegistrationIds.filter((id) => id !== PERSONAL_RECORD_REGISTRATION_ID);
    const existingSubmissions = selectedEventRegistrationIds.length
      ? await Submission.find({
        registrationId: { $in: selectedEventRegistrationIds },
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

    if (targetRegistrationIds.length === 1 && options.mode === 'create' && existingSubmission) {
      return redirectWithPageMessage(res, 'error', 'Submission already exists. Use resubmit flow if rejected.');
    }
    if (targetRegistrationIds.length === 1 && options.mode === 'resubmit' && !existingSubmission) {
      return redirectWithPageMessage(res, 'error', 'No rejected submission found to resubmit.');
    }
    if (targetRegistrationIds.length === 1 && options.mode === 'resubmit' && existingSubmission.status !== 'rejected') {
      return redirectWithPageMessage(res, 'error', 'Only rejected submissions can be resubmitted.');
    }

    for (const targetId of targetRegistrationIds) {
      if (targetId === PERSONAL_RECORD_REGISTRATION_ID) continue;
      const existingForTarget = existingSubmissionByRegistrationId.get(targetId);
      if (existingForTarget && existingForTarget.status !== 'rejected') {
        return redirectWithPageMessage(res, 'error', 'One or more selected entries already has a submitted or approved result.');
      }
    }

    const distanceKm = parseDistanceKm(req.body.distanceKm);
    const elapsedMs = parseElapsedToMs(req.body.elapsedTime);
    const runDate = parseRunDate(req.body.runDate);
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
    if (duplicateSubmission) {
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
      ? `Result saved for ${savedCount} entries.`
      : (options.successMessage || 'Result saved.');
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
    const featuredPosts = shouldShowFeatured
      ? await Blog.find({ ...query, featured: true })
        .populate('authorId', 'firstName lastName')
        .sort({ views: -1, likesCount: -1, commentsCount: -1, publishedAt: -1 })
        .limit(3)
        .select('title slug excerpt category customCategory tags coverImageUrl readingTime views likesCount commentsCount featured publishedAt createdAt')
      : [];
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
      title: 'Blog - helloRun',
      posts,
      featuredPosts,
      categories: BLOG_CATEGORIES,
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
        description: 'Explore running tips, race recaps, and training stories from the helloRun community.',
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
      .slice(0, 280) || 'Read this helloRun community blog post.';
    const seoTitle = String(post.seoTitle || post.title || '').trim();
    const ogImage = String(post.ogImageUrl || post.coverImageUrl || '').trim();
    const likedByCurrentUser = currentUserId
      ? Boolean(await BlogLike.exists({ blogId: post._id, userId: currentUserId }))
      : false;

    return res.render('pages/blog-post', {
      title: `${post.title} - helloRun Blog`,
      post,
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
        ogTitle: seoTitle || `${post.title} - helloRun Blog`,
        twitterTitle: seoTitle || `${post.title} - helloRun Blog`,
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

exports.getLeaderboard = async (req, res) => {
  try {
    const data = await getLeaderboardData({
      eventId: req.query.event,
      distance: req.query.distance,
      mode: req.query.mode,
      period: req.query.period,
      limit: req.query.limit
    });

    const activeFilterCount = Number(Boolean(data.filters.eventId))
      + Number(Boolean(data.filters.distance))
      + Number(Boolean(data.filters.mode))
      + Number(data.filters.period !== 'all');
    const hasActiveFilters = activeFilterCount > 0;

    return res.render('pages/leaderboard', {
      title: 'Leaderboard - helloRun',
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
      '/privacy',
      '/terms',
      '/cookie-policy',
      '/leaderboard'
    ];

    const [events, blogPosts] = await Promise.all([
      Event.find({ status: 'published' })
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

  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    throw new Error('Run date must be in YYYY-MM-DD format.');
  }

  const parsed = new Date(`${raw}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Run date is invalid.');
  }

  const now = new Date();
  const tomorrowUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  if (parsed.getTime() >= tomorrowUtc) {
    throw new Error('Run date cannot be in the future.');
  }

  return parsed;
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
  const rawDistance = Number(body.ocrDistance);
  const rawTime = Number(body.ocrTime);
  const rawConfidence = Number(body.ocrConfidence);

  const extractedDistanceKm = Number.isFinite(rawDistance) && rawDistance > 0 && rawDistance <= 1000 ? rawDistance : null;
  const extractedTimeMs = Number.isFinite(rawTime) && rawTime > 0 && rawTime <= 7 * 24 * 60 * 60 * 1000 ? rawTime : null;
  const confidence = Number.isFinite(rawConfidence) && rawConfidence >= 0 && rawConfidence <= 1 ? Math.round(rawConfidence * 100) / 100 : 0;
  const rawText = String(body.ocrRawText || '').slice(0, 2000);
  const allowedSources = new Set(['strava', 'nike', 'garmin', 'apple', 'google', 'unknown', '']);
  const rawSource = String(body.ocrDetectedSource || '').trim().toLowerCase();
  const detectedSource = allowedSources.has(rawSource) ? rawSource : '';
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
    rawText,
    confidence,
    distanceMismatch,
    timeMismatch,
    detectedSource,
    extractedName,
    nameMatchStatus,
    nameMismatchAcknowledged
  };
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

function getEventsFilterValues(query) {
  const q = String(query?.q || '').trim().slice(0, 80);
  const rawType = String(query?.eventType || '').trim().toLowerCase();
  const rawDistance = String(query?.distance || '').trim().toUpperCase();
  const rawStatus = String(query?.status || '').trim().toLowerCase();

  const eventType = ['virtual', 'onsite', 'hybrid'].includes(rawType) ? rawType : '';
  const distance = rawDistance && rawDistance.length <= 30 ? rawDistance : '';
  const status = ['all', 'upcoming', 'open', 'closed'].includes(rawStatus) ? rawStatus : 'all';

  return {
    q,
    eventType,
    distance,
    status
  };
}

function getMatchingCountryCodes(searchQuery) {
  const safe = String(searchQuery || '').trim().toLowerCase();
  if (!safe) return [];
  return countries
    .filter((item) => item.name.toLowerCase().includes(safe))
    .map((item) => item.code);
}

function getEventsSort(status) {
  if (status === 'open') {
    return { registrationCloseAt: 1, eventStartAt: 1, createdAt: -1 };
  }
  if (status === 'closed') {
    return { eventEndAt: -1, registrationCloseAt: -1, createdAt: -1 };
  }
  return { eventStartAt: 1, createdAt: -1 };
}

function rankEventsForSearch(events, searchQuery) {
  return events.map((event) => ({
    ...event,
    searchRank: getEventSearchRank(event, searchQuery)
  }));
}

function getEventSearchRank(event, searchQuery) {
  const query = normalizeSearchValue(searchQuery);
  if (!query) return 0;

  const title = normalizeSearchValue(event.title);
  const organiserName = normalizeSearchValue(event.organiserName);
  const venueName = normalizeSearchValue(event.venueName);
  const city = normalizeSearchValue(event.city);
  const countryCode = normalizeSearchValue(event.country);
  const countryName = normalizeSearchValue(getCountryName(event.country));
  const description = normalizeSearchValue(event.description);

  if (title === query || organiserName === query) return 500;
  if ([venueName, city, countryCode, countryName].some((value) => value === query)) return 400;
  if ([title, organiserName].some((value) => value.includes(query))) return 300;
  if ([venueName, city, countryCode, countryName].some((value) => value.includes(query))) return 200;
  if (description.includes(query)) return 100;
  return 0;
}

function compareEventsForSearch(a, b, status) {
  const rankDiff = Number(b.searchRank || 0) - Number(a.searchRank || 0);
  if (rankDiff !== 0) return rankDiff;
  return compareEventsBySort(a, b, getEventsSort(status));
}

function compareEventsBySort(a, b, sortSpec) {
  for (const [field, direction] of Object.entries(sortSpec)) {
    const comparison = compareEventSortValue(a[field], b[field]);
    if (comparison !== 0) {
      return direction >= 0 ? comparison : -comparison;
    }
  }
  return 0;
}

function compareEventSortValue(left, right) {
  const leftValue = getSortableValue(left);
  const rightValue = getSortableValue(right);
  if (leftValue === rightValue) return 0;
  if (leftValue === null || leftValue === undefined) return 1;
  if (rightValue === null || rightValue === undefined) return -1;
  return leftValue < rightValue ? -1 : 1;
}

function getSortableValue(value) {
  if (value instanceof Date) return value.getTime();
  if (value && typeof value.getTime === 'function') return value.getTime();
  if (typeof value === 'string' || typeof value === 'number') return value;
  return value == null ? null : String(value);
}

function normalizeSearchValue(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function buildEventsCanonicalUrl(filterValues, currentPage) {
  const baseUrl = getAppBaseUrl();
  if (!baseUrl) return '';

  const path = buildEventsPageUrl(filterValues, currentPage);
  return `${baseUrl}${path}`;
}

function buildEventsPageUrl(filterValues, currentPage = 1) {
  const params = buildEventsQueryParams(filterValues, currentPage);
  return params.toString() ? `/events?${params.toString()}` : '/events';
}

function buildEventsQueryParams(filterValues, currentPage = 1) {
  const params = new URLSearchParams();
  if (filterValues.q) params.set('q', filterValues.q);
  if (filterValues.eventType) params.set('eventType', filterValues.eventType);
  if (filterValues.distance) params.set('distance', filterValues.distance);
  if (filterValues.status && filterValues.status !== 'all') params.set('status', filterValues.status);
  if (Number(currentPage || 1) > 1) params.set('page', String(currentPage));
  return params;
}

function getEventsActiveFilters(filterValues) {
  const activeFilters = [];

  if (filterValues.q) {
    activeFilters.push({
      key: 'q',
      label: 'Search',
      value: filterValues.q,
      clearUrl: buildEventsPageUrl({
        ...filterValues,
        q: ''
      })
    });
  }

  if (filterValues.eventType) {
    activeFilters.push({
      key: 'eventType',
      label: 'Mode',
      value: formatEventTypeLabel(filterValues.eventType),
      clearUrl: buildEventsPageUrl({
        ...filterValues,
        eventType: ''
      })
    });
  }

  if (filterValues.distance) {
    activeFilters.push({
      key: 'distance',
      label: 'Distance',
      value: filterValues.distance,
      clearUrl: buildEventsPageUrl({
        ...filterValues,
        distance: ''
      })
    });
  }

  if (filterValues.status && filterValues.status !== 'all') {
    activeFilters.push({
      key: 'status',
      label: 'Status',
      value: formatEventStatusLabel(filterValues.status),
      clearUrl: buildEventsPageUrl({
        ...filterValues,
        status: 'all'
      })
    });
  }

  return activeFilters;
}

function formatEventTypeLabel(value) {
  if (value === 'onsite') return 'On-site';
  if (value === 'virtual') return 'Virtual';
  if (value === 'hybrid') return 'Hybrid';
  return String(value || '').trim();
}

function formatEventStatusLabel(value) {
  if (value === 'upcoming') return 'Upcoming';
  if (value === 'open') return 'Open';
  if (value === 'closed') return 'Closed / Past';
  return 'All';
}

function getEventsPageContent(filterValues, pagination = {}) {
  const filterLabel = getEventsFilterNarrative(filterValues);
  const pageSuffix = Number(pagination.currentPage || 1) > 1
    ? ` - Page ${pagination.currentPage}`
    : '';
  const titlePrefix = filterLabel ? `${filterLabel} Events` : 'Running Events';
  const heroTitle = filterLabel ? `${filterLabel} Events` : 'Check Out Ongoing Events';
  const defaultDescription = 'Discover helloRun events, browse by mode and distance, and find your next race or virtual challenge.';
  const filteredDescription = filterLabel
    ? `Browse ${getEventsFilterNarrative(filterValues, { lowercaseBase: true })} on helloRun and find your next race or virtual challenge.`
    : defaultDescription;
  const heroDescription = filterLabel
    ? buildEventsHeroDescription(filterValues)
    : 'Explore active helloRun races and pick your next challenge.';

  return {
    title: `${titlePrefix}${pageSuffix} - helloRun`,
    heroTitle,
    heroDescription,
    seo: {
      description: filteredDescription,
      ogTitle: `${titlePrefix}${pageSuffix} - helloRun`,
      twitterTitle: `${titlePrefix}${pageSuffix} - helloRun`
    }
  };
}

function buildEventsResultsSummary(filterValues, totalEvents) {
  if (!hasAnyEventsFilters(filterValues)) {
    return 'Browse active helloRun races by mode, distance, and registration status.';
  }

  const filterLabel = getEventsFilterNarrative(filterValues);
  const verb = Number(totalEvents || 0) === 1 ? 'matches' : 'match';
  return `${Number(totalEvents || 0).toLocaleString('en-US')} event${Number(totalEvents || 0) === 1 ? '' : 's'} ${verb} ${getEventsFilterNarrative(filterValues, { lowercaseBase: true })}.`;
}

function buildEventsHeroDescription(filterValues) {
  const narrative = getEventsFilterNarrative(filterValues, { lowercaseBase: true });
  if (!narrative) {
    return 'Explore active helloRun races and pick your next challenge.';
  }

  if (filterValues.q) {
    return `Refine ${narrative.toLowerCase()} and compare the events that best fit your search.`;
  }

  return `Compare ${narrative.toLowerCase()} and choose the race that fits your next goal.`;
}

function getEventsFilterNarrative(filterValues, options = {}) {
  const lowercaseBase = !!options.lowercaseBase;
  const parts = [];
  if (filterValues.status && filterValues.status !== 'all') {
    parts.push(formatEventStatusLabel(filterValues.status));
  }
  if (filterValues.eventType) {
    parts.push(formatEventTypeLabel(filterValues.eventType));
  }
  if (filterValues.distance) {
    parts.push(filterValues.distance);
  }

  const base = parts.length
    ? parts.map((part) => (lowercaseBase ? String(part).toLowerCase() : part)).join(' ')
    : '';
  if (filterValues.q) {
    return base
      ? `${base} results for "${filterValues.q}"`
      : `results for "${filterValues.q}"`;
  }

  return base;
}

function hasAnyEventsFilters(filterValues) {
  return Boolean(
    filterValues.q
    || filterValues.eventType
    || filterValues.distance
    || (filterValues.status && filterValues.status !== 'all')
  );
}

function getEventCardDisplayState(event, now = new Date()) {
  const registrationOpenAt = event?.registrationOpenAt ? new Date(event.registrationOpenAt) : null;
  const registrationCloseAt = event?.registrationCloseAt ? new Date(event.registrationCloseAt) : null;
  const eventStartAt = event?.eventStartAt ? new Date(event.eventStartAt) : null;
  const eventEndAt = event?.eventEndAt ? new Date(event.eventEndAt) : null;

  const hasValidRegistrationOpen = registrationOpenAt && !Number.isNaN(registrationOpenAt.getTime());
  const hasValidRegistrationClose = registrationCloseAt && !Number.isNaN(registrationCloseAt.getTime());
  const hasValidEventStart = eventStartAt && !Number.isNaN(eventStartAt.getTime());
  const hasValidEventEnd = eventEndAt && !Number.isNaN(eventEndAt.getTime());

  const registrationIsOpen = hasValidRegistrationOpen && hasValidRegistrationClose
    ? registrationOpenAt <= now && registrationCloseAt >= now
    : false;
  const eventIsPast = hasValidEventEnd ? eventEndAt < now : false;
  const startsSoon = hasValidEventStart
    ? eventStartAt >= now && (eventStartAt.getTime() - now.getTime()) <= 3 * 24 * 60 * 60 * 1000
    : false;

  if (eventIsPast) {
    return {
      label: 'Past Event',
      tone: 'past',
      helper: hasValidEventEnd ? `Ended ${formatRelativeDayLabel(eventEndAt, now)}.` : 'Event already finished.'
    };
  }

  if (registrationIsOpen) {
    return {
      label: 'Open Registration',
      tone: 'open',
      helper: hasValidRegistrationClose
        ? `Registration closes ${formatRelativeDayLabel(registrationCloseAt, now)}.`
        : 'Registration is currently open.'
    };
  }

  if (startsSoon) {
    return {
      label: 'Starts Soon',
      tone: 'soon',
      helper: hasValidEventStart ? `Starts ${formatRelativeDayLabel(eventStartAt, now)}.` : 'Starting soon.'
    };
  }

  if (hasValidRegistrationClose && registrationCloseAt < now) {
    return {
      label: 'Registration Closed',
      tone: 'closed',
      helper: hasValidEventStart && eventStartAt >= now
        ? `Event starts ${formatRelativeDayLabel(eventStartAt, now)}.`
        : 'Registration window has closed.'
    };
  }

  return {
    label: 'Event Listing',
    tone: 'neutral',
    helper: hasValidEventStart ? `Starts ${formatRelativeDayLabel(eventStartAt, now)}.` : 'View details for timing and registration info.'
  };
}

function formatRelativeDayLabel(targetDate, now = new Date()) {
  const target = new Date(targetDate);
  if (Number.isNaN(target.getTime())) return '';

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTarget = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  const diffDays = Math.round((startOfTarget.getTime() - startOfToday.getTime()) / (24 * 60 * 60 * 1000));

  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'tomorrow';
  if (diffDays === -1) return 'yesterday';
  if (diffDays > 1 && diffDays <= 14) return `in ${diffDays} days`;
  if (diffDays < -1 && diffDays >= -14) return `${Math.abs(diffDays)} days ago`;

  return target.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
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
    waiverAccepted: body.waiverAccepted === '1' || body.waiverAccepted === 'true' || body.waiverAccepted === true || body.waiverAccepted === 'on',
    waiverSignature: String(body.waiverSignature || '').trim()
  };
}

function getQuickProfileUpdatePayload(body = {}) {
  const hasCountryInput = Object.prototype.hasOwnProperty.call(body, 'country');
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
    runningGroups: normalizeRunnerGroups(body.runningGroups || body.runningGroupsText || body.runningGroup),
    hasCountryInput,
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

  if (!payload.emergencyContactName) {
    errors.emergencyContactName = 'Emergency contact name is required.';
  } else if (payload.emergencyContactName.length > 120) {
    errors.emergencyContactName = 'Emergency contact name must be 120 characters or less.';
  }

  if (!payload.emergencyContactNumber) {
    errors.emergencyContactNumber = 'Emergency contact number is required.';
  } else if (!/^[\d\s\-()+]{7,25}$/.test(payload.emergencyContactNumber)) {
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
  const values = Array.isArray(event.raceDistances) ? event.raceDistances : [];
  return values
    .map((item) => String(item || '').trim().toUpperCase())
    .filter(Boolean);
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

function getRegistrationConfigurationError(event) {
  const allowedRaceDistances = getAllowedRaceDistances(event);
  if (!allowedRaceDistances.length) {
    return 'Registration is temporarily unavailable because this event has no configured race distances.';
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
    return 'Only registered helloRun accounts can register for events.';
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
  return Event.findOne({ slug, status: 'published', isPersonalRecord: { $ne: true } });
}

function renderEventNotFound(res) {
  return res.status(404).render('error', {
    title: '404 - Event Not Found',
    status: 404,
    message: 'This event is not available.'
  });
}
