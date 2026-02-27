const Event = require('../models/Event');
const User = require('../models/User');
const Registration = require('../models/Registration');
const Blog = require('../models/Blog');
const emailService = require('../services/email.service');
const { registerBlogView } = require('../services/blog-view.service');
const { getRunnerRegistrations } = require('../services/runner-data.service');
const { getCountries, isValidCountryCode, normalizeCountryCode, getCountryName } = require('../utils/country');
const { BLOG_CATEGORIES } = require('../utils/blog');
const { renderWaiverTemplate } = require('../utils/waiver');

const countries = getCountries();

exports.getHome = (req, res) => {
  res.render('pages/index', { title: 'helloRun - Virtual Running Events', user: req.user });
};

exports.getEvents = async (req, res) => {
  try {
    const loginSuccess = req.session.loginSuccess || false;
    const userName = req.session.userName || null;

    delete req.session.loginSuccess;
    delete req.session.userName;

    const events = await Event.find({ status: 'published' })
      .sort({ eventStartAt: 1, createdAt: -1 })
      .select('title slug description eventType eventTypesAllowed raceDistances eventStartAt eventEndAt venueName city country bannerImageUrl registrationCloseAt')
      .lean();

    const normalizedEvents = events.map((event) => ({
      ...event,
      countryLabel: getCountryName(event.country)
    }));

    return res.render('pages/events', {
      title: 'Running Events - helloRun',
      loginSuccess,
      userName,
      events: normalizedEvents
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
        'firstName lastName email mobile country dateOfBirth gender emergencyContactName emergencyContactNumber runningGroup role organizerStatus emailVerified'
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
        'firstName lastName email mobile country dateOfBirth gender emergencyContactName emergencyContactNumber runningGroup role organizerStatus emailVerified'
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

exports.getMyRegistrations = async (req, res) => {
  try {
    const user = await User.findById(req.session.userId).select('firstName');
    if (!user) {
      return res.redirect('/login');
    }

    const registrations = await getRunnerRegistrations(user._id);

    return res.render('pages/my-registrations', {
      title: 'My Registrations - helloRun',
      registrations,
      countryName: getCountryName,
      genderLabel: formatGenderLabel,
      dateLabel: formatDateOnly
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

exports.getBlogList = async (req, res) => {
  try {
    const query = {
      status: 'published',
      isDeleted: { $ne: true }
    };
    const searchQuery = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 80) : '';
    const selectedCategory = normalizeBlogCategory(req.query.category);
    const selectedSort = normalizeBlogSort(req.query.sort);
    const page = normalizePositiveInt(req.query.page, 1);
    const limit = 12;

    if (selectedCategory) {
      query.category = selectedCategory;
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

    const totalPosts = await Blog.countDocuments(query);
    const totalPages = Math.max(1, Math.ceil(totalPosts / limit));
    const currentPage = Math.min(page, totalPages);
    const skip = (currentPage - 1) * limit;

    const posts = await Blog.find(query)
      .populate('authorId', 'firstName lastName')
      .sort(sortMap[selectedSort])
      .skip(skip)
      .limit(limit)
      .select('title slug excerpt category customCategory tags coverImageUrl readingTime views publishedAt createdAt');

    const baseUrl = getAppBaseUrl();
    const canonicalQuery = new URLSearchParams();
    if (searchQuery) canonicalQuery.set('q', searchQuery);
    if (selectedCategory) canonicalQuery.set('category', selectedCategory);
    if (selectedSort !== 'latest') canonicalQuery.set('sort', selectedSort);
    if (currentPage > 1) canonicalQuery.set('page', String(currentPage));
    const canonicalPath = canonicalQuery.toString() ? `/blog?${canonicalQuery.toString()}` : '/blog';
    const canonicalUrl = baseUrl ? `${baseUrl}${canonicalPath}` : '';

    return res.render('pages/blog', {
      title: 'Blog - helloRun',
      posts,
      categories: BLOG_CATEGORIES,
      filters: {
        q: searchQuery,
        category: selectedCategory,
        sort: selectedSort
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

    return res.render('pages/blog-post', {
      title: `${post.title} - helloRun Blog`,
      post,
      relatedPosts,
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

function getPageMessage(query) {
  const msg = typeof query.msg === 'string' ? query.msg.trim() : '';
  if (!msg) return null;
  const type = query.type === 'error' ? 'error' : 'success';
  return { type, text: msg.slice(0, 220) };
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
    runningGroup: String(body.runningGroup || '').trim(),
    participationMode: String(body.participationMode || '').trim(),
    raceDistance: String(body.raceDistance || '').trim().toUpperCase(),
    waiverAccepted: body.waiverAccepted === '1' || body.waiverAccepted === 'true' || body.waiverAccepted === true || body.waiverAccepted === 'on',
    waiverSignature: String(body.waiverSignature || '').trim()
  };
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
    runningGroup: String(user.runningGroup || '').trim()
  };
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
  return Event.findOne({ slug, status: 'published' });
}

function renderEventNotFound(res) {
  return res.status(404).render('error', {
    title: '404 - Event Not Found',
    status: 404,
    message: 'This event is not available.'
  });
}
