const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const XLSX = require('xlsx');
const User = require('../models/User');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const Submission = require('../models/Submission');
const OrganiserApplication = require('../models/OrganiserApplication');
const uploadService = require('../services/upload.service');
const emailService = require('../services/email.service');
const { createNotificationSafe } = require('../services/notification.service');
const { createRateLimiter } = require('../middleware/rate-limit.middleware');
const { requireAuth, requireApprovedOrganizer, requireCanCreateEvents } = require('../middleware/auth.middleware');
const { requireCsrfProtection } = require('../middleware/csrf.middleware');
const { getCountries, isValidCountryCode, normalizeCountryCode, getCountryName } = require('../utils/country');
const { DEFAULT_WAIVER_TEMPLATE, normalizeWaiverTemplate } = require('../utils/waiver');
const { sanitizeHtml, htmlToPlainText } = require('../utils/sanitize');
const { generateUniqueReferenceCode } = require('../utils/referenceCode');
const { canOrganizerReviewPaymentProof } = require('../utils/payment-workflow');
const { reviewSubmission } = require('../services/submission.service');

const countries = getCountries();
const RACE_DISTANCE_PRESETS = new Set(['3K', '5K', '10K', '21K']);
const MAX_GALLERY_IMAGES = 12;
const VIRTUAL_COMPLETION_MODES = new Set(['single_activity', 'accumulated_distance']);
const ACCEPTED_RUN_TYPES = new Set(['run', 'walk', 'hike', 'trail_run']);
const RECOGNITION_MODES = new Set(['completion_only', 'completion_with_optional_ranking']);
const LEADERBOARD_MODES = new Set(['finishers', 'top_distance', 'finishers_and_top_distance']);
const WAIVER_SANITIZE_OPTIONS = Object.freeze({
  allowedTags: ['div', 'p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'blockquote', 'a'],
  allowedAttributes: {
    a: ['href', 'rel', 'target'],
    div: ['class']
  }
});
const paymentReviewActionLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000,
  maxRequests: 60,
  message: 'Too many payment review actions. Please wait before trying again.'
});

/* ==========================================
   GET: Organizer Dashboard
   ========================================== */

router.get('/dashboard', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);

    if (!user) {
      return res.status(404).render('error', {
        title: '404 - User Not Found',
        status: 404,
        message: 'User account not found.'
      });
    }

    // Only organiser role can access
    if (user.role !== 'organiser') {
      return res.status(403).render('error', {
        title: '403 - Access Denied',
        status: 403,
        message: 'Only organizers can access this page.'
      });
    }

    // Get application info (may be null)
    const application = await OrganiserApplication.findOne({
      userId: req.session.userId
    });

    const now = new Date();
    const dashboardRange = normalizeOrganizerDashboardRange(req.query.range);
    const rangeLabel = getOrganizerDashboardRangeLabel(dashboardRange);
    const rangeWindow = getOrganizerDashboardRangeWindow(dashboardRange, now);
    const eventQuery = { organizerId: user._id };

    const [totalEvents, activeEvents, upcomingEvents, recentEventDocs, draftEventDocs, organizerEventIdDocs] = await Promise.all([
      Event.countDocuments(eventQuery),
      Event.countDocuments({ ...eventQuery, status: 'published', eventEndAt: { $gte: now } }),
      Event.countDocuments({ ...eventQuery, status: 'published', eventStartAt: { $gt: now } }),
      Event.find(eventQuery).sort({ createdAt: -1 }).limit(5),
      Event.find({ ...eventQuery, status: 'draft' }).sort({ updatedAt: -1, createdAt: -1 }).limit(5).lean(),
      Event.find(eventQuery).select('_id').lean()
    ]);

    const organizerEventIds = organizerEventIdDocs.map((eventDoc) => eventDoc._id);
    const recentEventIds = recentEventDocs.map((eventDoc) => eventDoc._id);

    const baseEventFilter = organizerEventIds.length ? { eventId: { $in: organizerEventIds } } : null;
    const registrationRangeFilter = baseEventFilter
      ? buildDateBoundFilter(baseEventFilter, 'registeredAt', rangeWindow.currentStartAt, rangeWindow.currentEndAt)
      : null;
    const submissionRangeFilter = baseEventFilter
      ? buildDateBoundFilter(baseEventFilter, 'submittedAt', rangeWindow.currentStartAt, rangeWindow.currentEndAt)
      : null;
    const previousRegistrationRangeFilter = baseEventFilter && rangeWindow.previousStartAt && rangeWindow.previousEndAt
      ? buildDateBoundFilter(baseEventFilter, 'registeredAt', rangeWindow.previousStartAt, rangeWindow.previousEndAt)
      : null;
    const previousSubmissionRangeFilter = baseEventFilter && rangeWindow.previousStartAt && rangeWindow.previousEndAt
      ? buildDateBoundFilter(baseEventFilter, 'submittedAt', rangeWindow.previousStartAt, rangeWindow.previousEndAt)
      : null;

    const [
      totalRegistrations,
      recentRegistrationCounts,
      pendingPaymentReviews,
      pendingResultReviews,
      nextPaymentReview,
      nextResultReview,
      registrationsInRange,
      submissionsInRange,
      approvalsInRange,
      registrationsInPreviousRange,
      submissionsInPreviousRange,
      approvalsInPreviousRange,
      paymentQueueCounts,
      resultQueueCounts,
      topRegistrationsRaw,
      topApprovalsRaw
    ] = await Promise.all([
      organizerEventIds.length
        ? Registration.countDocuments({ eventId: { $in: organizerEventIds } })
        : 0,
      recentEventIds.length
        ? Registration.aggregate([
            { $match: { eventId: { $in: recentEventIds } } },
            { $group: { _id: '$eventId', count: { $sum: 1 } } }
          ])
        : [],
      organizerEventIds.length
        ? Registration.countDocuments({ eventId: { $in: organizerEventIds }, paymentStatus: 'proof_submitted' })
        : 0,
      organizerEventIds.length
        ? Submission.countDocuments({ eventId: { $in: organizerEventIds }, status: 'submitted' })
        : 0,
      organizerEventIds.length
        ? Registration.findOne({ eventId: { $in: organizerEventIds }, paymentStatus: 'proof_submitted' })
          .sort({ 'paymentProof.uploadedAt': -1, updatedAt: -1, createdAt: -1 })
          .select('eventId')
          .lean()
        : null,
      organizerEventIds.length
        ? Submission.findOne({ eventId: { $in: organizerEventIds }, status: 'submitted' })
          .sort({ submittedAt: -1, updatedAt: -1, createdAt: -1 })
          .select('eventId')
          .lean()
        : null,
      registrationRangeFilter
        ? Registration.countDocuments(registrationRangeFilter)
        : 0,
      submissionRangeFilter
        ? Submission.countDocuments(submissionRangeFilter)
        : 0,
      submissionRangeFilter
        ? Submission.countDocuments({ ...submissionRangeFilter, status: 'approved' })
        : 0,
      previousRegistrationRangeFilter
        ? Registration.countDocuments(previousRegistrationRangeFilter)
        : 0,
      previousSubmissionRangeFilter
        ? Submission.countDocuments(previousSubmissionRangeFilter)
        : 0,
      previousSubmissionRangeFilter
        ? Submission.countDocuments({ ...previousSubmissionRangeFilter, status: 'approved' })
        : 0,
      organizerEventIds.length
        ? Registration.aggregate([
            { $match: { eventId: { $in: organizerEventIds }, paymentStatus: 'proof_submitted' } },
            { $group: { _id: '$eventId', paymentPending: { $sum: 1 } } },
            { $sort: { paymentPending: -1 } }
          ])
        : [],
      organizerEventIds.length
        ? Submission.aggregate([
            { $match: { eventId: { $in: organizerEventIds }, status: 'submitted' } },
            { $group: { _id: '$eventId', resultPending: { $sum: 1 } } },
            { $sort: { resultPending: -1 } }
          ])
        : [],
      registrationRangeFilter
        ? Registration.aggregate([
            { $match: registrationRangeFilter },
            { $group: { _id: '$eventId', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 3 }
          ])
        : [],
      submissionRangeFilter
        ? Submission.aggregate([
            { $match: { ...submissionRangeFilter, status: 'approved' } },
            { $group: { _id: '$eventId', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 3 }
          ])
        : []
    ]);

    const recentRegistrationsByEventId = new Map(
      recentRegistrationCounts.map((item) => [String(item._id), item.count])
    );

    const recentEvents = recentEventDocs.map((event) => ({
      id: event._id,
      name: event.title,
      date: event.eventStartAt || event.createdAt,
      location: [event.venueName, event.city, event.country].filter(Boolean).join(', ') || 'TBA',
      status: event.status,
      registrations: recentRegistrationsByEventId.get(String(event._id)) || 0,
      bannerImageUrl: event.bannerImageUrl || '',
      logoUrl: event.logoUrl || ''
    }));
    const draftEvents = draftEventDocs.map((event) => ({
      id: String(event._id),
      name: event.title || 'Untitled event',
      updatedAt: event.updatedAt || event.createdAt || null,
      eventStartAt: event.eventStartAt || null
    }));

    const queueByEventId = new Map();
    for (const item of paymentQueueCounts) {
      queueByEventId.set(String(item._id), {
        eventId: String(item._id),
        paymentPending: Number(item.paymentPending || 0),
        resultPending: 0
      });
    }
    for (const item of resultQueueCounts) {
      const key = String(item._id);
      const existing = queueByEventId.get(key) || { eventId: key, paymentPending: 0, resultPending: 0 };
      existing.resultPending = Number(item.resultPending || 0);
      queueByEventId.set(key, existing);
    }

    const topRegistrationEventIds = topRegistrationsRaw.map((item) => String(item._id));
    const topApprovalEventIds = topApprovalsRaw.map((item) => String(item._id));
    const queueEventIds = Array.from(new Set(
      Array.from(queueByEventId.keys()).concat(topRegistrationEventIds, topApprovalEventIds)
    ))
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));
    const queueEventTitleDocs = queueEventIds.length
      ? await Event.find({ _id: { $in: queueEventIds } }).select('_id title').lean()
      : [];
    const queueTitlesByEventId = new Map(
      queueEventTitleDocs.map((item) => [String(item._id), item.title || 'Event unavailable'])
    );

    const queueBreakdown = Array.from(queueByEventId.values())
      .map((item) => ({
        ...item,
        eventTitle: queueTitlesByEventId.get(item.eventId) || 'Event unavailable',
        totalPending: Number(item.paymentPending || 0) + Number(item.resultPending || 0),
        paymentHref: `/organizer/events/${item.eventId}/registrants?payment=proof_submitted`,
        resultHref: `/organizer/events/${item.eventId}/registrants?result=submitted`
      }))
      .sort((a, b) => b.totalPending - a.totalPending || a.eventTitle.localeCompare(b.eventTitle))
      .slice(0, 8);

    const topRegistrations = topRegistrationsRaw.map((item) => ({
      eventId: String(item._id),
      eventTitle: queueTitlesByEventId.get(String(item._id)) || 'Event unavailable',
      count: Number(item.count || 0),
      href: `/organizer/events/${String(item._id)}/registrants`
    }));
    const topApprovals = topApprovalsRaw.map((item) => ({
      eventId: String(item._id),
      eventTitle: queueTitlesByEventId.get(String(item._id)) || 'Event unavailable',
      count: Number(item.count || 0),
      href: `/organizer/events/${String(item._id)}/registrants?result=approved`
    }));
    const topPendingQueue = queueBreakdown.slice(0, 3).map((item) => ({
      eventId: item.eventId,
      eventTitle: item.eventTitle,
      count: item.totalPending,
      href: `/organizer/events/${item.eventId}/registrants`
    }));

    // Build dashboard data
    const dashboardData = {
      title: 'Organizer Dashboard - helloRun',
      user: user,
      application: application || null,
      adminEmail: process.env.ADMIN_EMAIL || 'hellorunonline@gmail.com',
      stats: {
        totalEvents,
        activeEvents,
        totalRegistrations,
        upcomingEvents,
        pendingPaymentReviews,
        pendingResultReviews
      },
      analytics: {
        range: dashboardRange,
        rangeLabel,
        registrationsInRange,
        submissionsInRange,
        approvalsInRange,
        trends: {
          registrations: buildOrganizerTrendMetric(
            registrationsInRange,
            registrationsInPreviousRange,
            rangeWindow.previousLabel
          ),
          submissions: buildOrganizerTrendMetric(
            submissionsInRange,
            submissionsInPreviousRange,
            rangeWindow.previousLabel
          ),
          approvals: buildOrganizerTrendMetric(
            approvalsInRange,
            approvalsInPreviousRange,
            rangeWindow.previousLabel
          )
        }
      },
      reviewQueue: {
        pendingPaymentReviews,
        pendingResultReviews,
        paymentReviewHref: nextPaymentReview?.eventId
          ? `/organizer/events/${String(nextPaymentReview.eventId)}/registrants?payment=proof_submitted`
          : '/organizer/events',
        resultReviewHref: nextResultReview?.eventId
          ? `/organizer/events/${String(nextResultReview.eventId)}/registrants?result=submitted`
          : '/organizer/events',
        byEvent: queueBreakdown,
        topEvents: {
          registrations: topRegistrations,
          approvals: topApprovals,
          pending: topPendingQueue
        }
      },
      draftEvents,
      recentEvents,
      quickActions: [
        {
          icon: 'plus-circle',
          label: 'Create Event',
          href: '/organizer/create-event',
          description: 'Set up a new running event'
        },
        {
          icon: 'calendar',
          label: 'My Events',
          href: '/organizer/events',
          description: 'Manage your events'
        },
        {
          icon: 'users',
          label: 'Participants',
          href: '/organizer/events',
          description: 'View registrations'
        },
        {
          icon: 'settings',
          label: 'Settings',
          href: '/organizer/application-status',
          description: 'Application status'
        }
      ],
      approvedDate: application && application.reviewedAt
        ? new Date(application.reviewedAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })
        : application && application.submittedAt
        ? new Date(application.submittedAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })
        : null
    };

    res.render('organizer/dashboard', dashboardData);
  } catch (error) {
    console.error('Error loading organizer dashboard:', error);
    res.status(500).render('error', {
      title: 'Server Error',
      status: 500,
      message: 'An error occurred while loading the dashboard.'
    });
  }
});

/* ==========================================
   GET: Create Event Page (Approved Organizers)
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

    return res.render('organizer/create-event', {
      title: 'Create Event - helloRun',
      user,
      errors: {},
      formData: getCreateEventFormData(),
      countries,
      defaultWaiverTemplate: DEFAULT_WAIVER_TEMPLATE,
      message: getPageMessage(req.query)
    });
  } catch (error) {
    console.error('Error loading create-event page:', error);
    return res.status(500).render('error', {
      title: 'Server Error',
      status: 500,
      message: 'An error occurred while loading the event creation page.'
    });
  }
});

/* ==========================================
   GET: Event Preview (Approved Organizers)
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

    const formData = getCreateEventFormData(req.query);
    const errors = validateCreateEventForm(formData);
    const eventTypesAllowed = getEventTypesAllowed(formData.eventType);

    const previewEvent = {
      ...formData,
      eventTypesAllowed,
      registrationOpenAt: parseDateSafe(formData.registrationOpenAt),
      registrationCloseAt: parseDateSafe(formData.registrationCloseAt),
      eventStartAt: parseDateSafe(formData.eventStartAt),
      eventEndAt: parseDateSafe(formData.eventEndAt),
      virtualWindow: {
        startAt: parseDateSafe(formData.virtualStartAt),
        endAt: parseDateSafe(formData.virtualEndAt)
      },
      finalSubmissionDeadlineAt: parseDateSafe(formData.finalSubmissionDeadlineAt),
      geo: formData.geoLat && formData.geoLng
        ? { lat: Number(formData.geoLat), lng: Number(formData.geoLng) }
        : null
    };

    return res.render('organizer/event-preview', {
      title: 'Preview Event - helloRun',
      user,
      previewEvent,
      errors
    });
  } catch (error) {
    console.error('Error loading event preview page:', error);
    return res.status(500).render('error', {
      title: 'Server Error',
      status: 500,
      message: 'An error occurred while loading the event preview page.'
    });
  }
});

/* ==========================================
   GET: My Events (Approved Organizers)
   ========================================== */

router.get('/events', requireApprovedOrganizer, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);

    if (!user) {
      return res.status(404).render('error', {
        title: '404 - User Not Found',
        status: 404,
        message: 'User account not found.'
      });
    }

    const selectedStatus = ['draft', 'published', 'closed'].includes(req.query.status)
      ? req.query.status
      : '';
    const selectedSort = ['newest', 'oldest', 'start_asc', 'start_desc'].includes(req.query.sort)
      ? req.query.sort
      : 'newest';
    const searchQuery = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 80) : '';

    const query = { organizerId: user._id };
    if (selectedStatus) {
      query.status = selectedStatus;
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
      title: 'My Events - helloRun',
      user,
      events,
      selectedStatus,
      selectedSort,
      searchQuery,
      message: getPageMessage(req.query)
    });
  } catch (error) {
    console.error('Error loading organizer events:', error);
    return res.status(500).render('error', {
      title: 'Server Error',
      status: 500,
      message: 'An error occurred while loading your events.'
    });
  }
});

/* ==========================================
   GET: Event Details (Owner Only)
   ========================================== */

router.get('/events/:id', requireApprovedOrganizer, async (req, res) => {
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
    return res.render('organizer/event-details', {
      title: `Event Details - ${event.title}`,
      user,
      event,
      message: getPageMessage(req.query)
    });
  } catch (error) {
    console.error('Error loading event details:', error);
    return res.status(500).render('error', {
      title: 'Server Error',
      status: 500,
      message: 'An error occurred while loading event details.'
    });
  }
});

/* ==========================================
   GET: Event Registrants (Owner/Admin)
   ========================================== */

router.get('/events/:id/registrants', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
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
        message: 'Only approved organizers or admins can access this page.'
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
    const filterContext = getRegistrantFilterContext(event, req.query);
    const {
      query,
      selectedMode,
      selectedDistance,
      eventRaceDistances,
      searchQuery,
      selectedResultStatus
    } = filterContext;

    const registrationsRaw = await Registration.find(query)
      .sort({ registeredAt: -1 })
      .lean();

    const registrationIds = registrationsRaw.map((item) => item._id);
    const submissionFilter = {
      eventId: event._id,
      registrationId: { $in: registrationIds }
    };
    if (selectedResultStatus) {
      submissionFilter.status = selectedResultStatus;
    }
    const submissions = registrationIds.length
      ? await Submission.find(submissionFilter)
        .select('registrationId status distanceKm elapsedMs runDate runLocation proofType proof submittedAt reviewedAt reviewedBy reviewNotes rejectionReason ocrData runType elevationGain steps suspiciousFlag suspiciousFlagReason')
        .populate('reviewedBy', 'firstName lastName')
        .lean()
      : [];
    const submissionsByRegistrationId = new Map(
      submissions.map((item) => [String(item.registrationId), item])
    );

    const registrations = registrationsRaw
      .filter((item) => {
        if (!selectedResultStatus) return true;
        return submissionsByRegistrationId.has(String(item._id));
      })
      .map((item) => ({
      ...item,
      participant: {
        ...item.participant,
        countryLabel: getCountryName(item.participant?.country),
        genderLabel: formatGenderLabel(item.participant?.gender),
        ageLabel: formatAgeFromDateOfBirth(item.participant?.dateOfBirth)
      },
      waiverAcceptedAtLabel: formatDateTime(item.waiver?.acceptedAt),
      paymentProofUploadedAtLabel: formatDateTime(item.paymentProof?.uploadedAt),
      paymentReviewedAtLabel: formatDateTime(item.paymentReviewedAt),
      submission: mapSubmissionForRegistrant(submissionsByRegistrationId.get(String(item._id)))
    }));

    const [
      totalRegistrants,
      virtualCount,
      onsiteCount,
      proofSubmittedCount,
      paidCount,
      proofRejectedCount,
      submissionSubmittedCount,
      submissionApprovedCount,
      submissionRejectedCount
    ] = await Promise.all([
      Registration.countDocuments({ eventId: event._id }),
      Registration.countDocuments({ eventId: event._id, participationMode: 'virtual' }),
      Registration.countDocuments({ eventId: event._id, participationMode: 'onsite' }),
      Registration.countDocuments({ eventId: event._id, paymentStatus: 'proof_submitted' }),
      Registration.countDocuments({ eventId: event._id, paymentStatus: 'paid' }),
      Registration.countDocuments({ eventId: event._id, paymentStatus: 'proof_rejected' }),
      Submission.countDocuments({ eventId: event._id, status: 'submitted' }),
      Submission.countDocuments({ eventId: event._id, status: 'approved' }),
      Submission.countDocuments({ eventId: event._id, status: 'rejected' })
    ]);

    return res.render('organizer/event-registrants', {
      title: `Registrants - ${event.title}`,
      user,
      isAdminViewer: user.role === 'admin',
      event,
      registrations,
      selectedMode,
      selectedDistance,
      selectedPaymentStatus: filterContext.selectedPaymentStatus,
      selectedResultStatus,
      eventRaceDistances,
      searchQuery,
      exportQuery: buildRegistrantExportQuery(filterContext),
      summary: {
        totalRegistrants,
        virtualCount,
        onsiteCount,
        proofSubmittedCount,
        paidCount,
        proofRejectedCount,
        submissionSubmittedCount,
        submissionApprovedCount,
        submissionRejectedCount
      },
      message: getPageMessage(req.query)
    });
  } catch (error) {
    console.error('Error loading event registrants:', error);
    return res.status(500).render('error', {
      title: 'Server Error',
      status: 500,
      message: 'An error occurred while loading event registrants.'
    });
  }
});

router.post(
  '/events/:id/registrants/:registrationId/payment/approve',
  requireAuth,
  paymentReviewActionLimiter,
  async (req, res) => {
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
          message: 'Only approved organizers or admins can review payments.'
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

      const registration = await Registration.findOne({
        _id: req.params.registrationId,
        eventId: event._id
      });
      if (!registration) {
        const q = new URLSearchParams({ type: 'error', msg: 'Registration record not found.' });
        return res.redirect(`/organizer/events/${event._id}/registrants?${q.toString()}`);
      }
      if (!canOrganizerReviewPaymentProof(registration)) {
        const q = new URLSearchParams({
          type: 'error',
          msg: 'Only registrations with submitted payment proof can be approved.'
        });
        return res.redirect(`/organizer/events/${event._id}/registrants?${q.toString()}`);
      }

      const reviewNotes = String(req.body.reviewNotes || '').trim().slice(0, 1000);
      registration.paymentStatus = 'paid';
      registration.paymentReviewedAt = new Date();
      registration.paymentReviewedBy = user._id;
      registration.paymentReviewNotes = reviewNotes;
      registration.paymentRejectionReason = '';
      await registration.save();

      await createNotificationSafe(
        {
          userId: registration.userId,
          type: 'payment_approved',
          title: 'Payment Approved',
          message: `Your payment for ${event.title || 'the event'} has been approved.`,
          href: '/my-registrations',
          metadata: {
            registrationId: String(registration._id),
            eventId: String(event._id),
            eventTitle: event.title || ''
          }
        },
        'payment approved notification'
      );

      try {
        const runner = await User.findById(registration.userId).select('email firstName');
        if (runner?.email) {
          await emailService.sendPaymentApprovedEmailToRunner(
            runner.email,
            runner.firstName || 'Runner',
            event.title || 'Event',
            registration.confirmationCode || ''
          );
        }
      } catch (emailError) {
        console.error('Payment approval email failed:', {
          error: emailError.message,
          registrationId: String(registration._id)
        });
      }

      const q = new URLSearchParams({ type: 'success', msg: 'Payment marked as approved.' });
      return res.redirect(`/organizer/events/${event._id}/registrants?${q.toString()}`);
    } catch (error) {
      console.error('Error approving payment proof:', error);
      return res.status(500).render('error', {
        title: 'Server Error',
        status: 500,
        message: 'An error occurred while approving payment proof.'
      });
    }
  }
);

router.post(
  '/events/:id/registrants/:registrationId/payment/reject',
  requireAuth,
  paymentReviewActionLimiter,
  async (req, res) => {
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
          message: 'Only approved organizers or admins can review payments.'
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

      const registration = await Registration.findOne({
        _id: req.params.registrationId,
        eventId: event._id
      });
      if (!registration) {
        const q = new URLSearchParams({ type: 'error', msg: 'Registration record not found.' });
        return res.redirect(`/organizer/events/${event._id}/registrants?${q.toString()}`);
      }
      if (!canOrganizerReviewPaymentProof(registration)) {
        const q = new URLSearchParams({
          type: 'error',
          msg: 'Only registrations with submitted payment proof can be rejected.'
        });
        return res.redirect(`/organizer/events/${event._id}/registrants?${q.toString()}`);
      }

      const rejectionReason = String(req.body.rejectionReason || '').trim().slice(0, 500);
      const reviewNotes = String(req.body.reviewNotes || '').trim().slice(0, 1000);
      if (!rejectionReason || rejectionReason.length < 5) {
        const q = new URLSearchParams({
          type: 'error',
          msg: 'Rejection reason is required (at least 5 characters).'
        });
        return res.redirect(`/organizer/events/${event._id}/registrants?${q.toString()}`);
      }

      registration.paymentStatus = 'proof_rejected';
      registration.paymentReviewedAt = new Date();
      registration.paymentReviewedBy = user._id;
      registration.paymentReviewNotes = reviewNotes;
      registration.paymentRejectionReason = rejectionReason;
      await registration.save();

      await createNotificationSafe(
        {
          userId: registration.userId,
          type: 'payment_rejected',
          title: 'Payment Needs Update',
          message: `Your payment proof for ${event.title || 'the event'} was rejected. Please review and resubmit.`,
          href: '/my-registrations',
          metadata: {
            registrationId: String(registration._id),
            eventId: String(event._id),
            eventTitle: event.title || ''
          }
        },
        'payment rejected notification'
      );

      try {
        const runner = await User.findById(registration.userId).select('email firstName');
        if (runner?.email) {
          await emailService.sendPaymentRejectedEmailToRunner(
            runner.email,
            runner.firstName || 'Runner',
            event.title || 'Event',
            registration.confirmationCode || '',
            rejectionReason,
            reviewNotes
          );
        }
      } catch (emailError) {
        console.error('Payment rejection email failed:', {
          error: emailError.message,
          registrationId: String(registration._id)
        });
      }

      const q = new URLSearchParams({ type: 'success', msg: 'Payment proof rejected and runner notified.' });
      return res.redirect(`/organizer/events/${event._id}/registrants?${q.toString()}`);
    } catch (error) {
      console.error('Error rejecting payment proof:', error);
      return res.status(500).render('error', {
        title: 'Server Error',
        status: 500,
        message: 'An error occurred while rejecting payment proof.'
      });
    }
  }
);

router.post(
  '/events/:id/submissions/:submissionId/approve',
  requireAuth,
  paymentReviewActionLimiter,
  async (req, res) => {
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
          message: 'Only approved organizers or admins can review submissions.'
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

      const submissionRecord = await Submission.findOne({
        _id: req.params.submissionId,
        eventId: event._id
      })
        .select('_id')
        .lean();
      if (!submissionRecord) {
        const q = new URLSearchParams({
          type: 'error',
          msg: 'Submission record not found for this event.'
        });
        return res.redirect(`/organizer/events/${event._id}/registrants?${q.toString()}`);
      }

      const reviewNotes = String(req.body.reviewNotes || '').trim().slice(0, 1200);
      await reviewSubmission({
        submissionId: submissionRecord._id,
        organizerId: user._id,
        reviewerRole: user.role,
        action: 'approve',
        reviewNotes
      });

      const q = new URLSearchParams({ type: 'success', msg: 'Result submission approved.' });
      return res.redirect(`/organizer/events/${event._id}/registrants?${q.toString()}`);
    } catch (error) {
      const q = new URLSearchParams({
        type: 'error',
        msg: String(error?.message || 'Unable to approve submission.')
      });
      return res.redirect(`/organizer/events/${req.params.id}/registrants?${q.toString()}`);
    }
  }
);

router.post(
  '/events/:id/submissions/:submissionId/reject',
  requireAuth,
  paymentReviewActionLimiter,
  async (req, res) => {
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
          message: 'Only approved organizers or admins can review submissions.'
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

      const submissionRecord = await Submission.findOne({
        _id: req.params.submissionId,
        eventId: event._id
      })
        .select('_id')
        .lean();
      if (!submissionRecord) {
        const q = new URLSearchParams({
          type: 'error',
          msg: 'Submission record not found for this event.'
        });
        return res.redirect(`/organizer/events/${event._id}/registrants?${q.toString()}`);
      }

      const rejectionReason = String(req.body.rejectionReason || '').trim().slice(0, 500);
      if (!rejectionReason || rejectionReason.length < 5) {
        const q = new URLSearchParams({
          type: 'error',
          msg: 'Rejection reason must be at least 5 characters.'
        });
        return res.redirect(`/organizer/events/${event._id}/registrants?${q.toString()}`);
      }
      const reviewNotes = String(req.body.reviewNotes || '').trim().slice(0, 1200);
      await reviewSubmission({
        submissionId: submissionRecord._id,
        organizerId: user._id,
        reviewerRole: user.role,
        action: 'reject',
        rejectionReason,
        reviewNotes
      });

      const q = new URLSearchParams({ type: 'success', msg: 'Result submission rejected.' });
      return res.redirect(`/organizer/events/${event._id}/registrants?${q.toString()}`);
    } catch (error) {
      const q = new URLSearchParams({
        type: 'error',
        msg: String(error?.message || 'Unable to reject submission.')
      });
      return res.redirect(`/organizer/events/${req.params.id}/registrants?${q.toString()}`);
    }
  }
);

router.get('/events/:id/registrants/export', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
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
        message: 'Only approved organizers or admins can export registrants.'
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

    const { query } = getRegistrantFilterContext(event, req.query);
    const registrations = await Registration.find(query).sort({ registeredAt: -1 }).lean();
    const { headers, rows } = getRegistrantExportData(registrations);

    const csvContent = [headers, ...rows]
      .map((row) => row.map(csvEscape).join(','))
      .join('\n');

    const safeSlug = String(event.slug || 'event').replace(/[^a-zA-Z0-9-_]/g, '');
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `${safeSlug}-registrants-${timestamp}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=\"${filename}\"`);
    return res.status(200).send(csvContent);
  } catch (error) {
    console.error('Error exporting event registrants CSV:', error);
    return res.status(500).render('error', {
      title: 'Server Error',
      status: 500,
      message: 'An error occurred while exporting registrants.'
    });
  }
});

router.get('/events/:id/registrants/export-xlsx', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
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
        message: 'Only approved organizers or admins can export registrants.'
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

    const { query } = getRegistrantFilterContext(event, req.query);
    const registrations = await Registration.find(query).sort({ registeredAt: -1 }).lean();
    const { headers, rows } = getRegistrantExportData(registrations);

    const worksheetData = [headers, ...rows];
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Registrants');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    const safeSlug = String(event.slug || 'event').replace(/[^a-zA-Z0-9-_]/g, '');
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `${safeSlug}-registrants-${timestamp}.xlsx`;

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename=\"${filename}\"`);
    return res.status(200).send(buffer);
  } catch (error) {
    console.error('Error exporting event registrants XLSX:', error);
    return res.status(500).render('error', {
      title: 'Server Error',
      status: 500,
      message: 'An error occurred while exporting registrants.'
    });
  }
});

/* ==========================================
   GET: Edit Event (Owner Only)
   ========================================== */

router.get('/events/:id/edit', requireApprovedOrganizer, async (req, res) => {
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

    return res.render('organizer/edit-event', {
      title: `Edit Event - ${event.title}`,
      user,
      event,
      errors: {},
      formData: getCreateEventFormDataFromEvent(event),
      countries,
      defaultWaiverTemplate: DEFAULT_WAIVER_TEMPLATE,
      message: getPageMessage(req.query)
    });
  } catch (error) {
    console.error('Error loading event edit page:', error);
    return res.status(500).render('error', {
      title: 'Server Error',
      status: 500,
      message: 'An error occurred while loading event edit page.'
    });
  }
});

/* ==========================================
   POST: Update Event (Owner Only)
   ========================================== */

router.post('/events/:id/edit', requireApprovedOrganizer, uploadService.uploadEventBranding, requireCsrfProtection, async (req, res) => {
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
    formData.actionType = event.status === 'published' ? 'publish' : 'draft';
    if (req.uploadError) {
      const errorField = mapUploadFieldToFormField(req.uploadErrorField);
      return res.status(400).render('organizer/edit-event', {
        title: `Edit Event - ${event.title}`,
        user,
        event,
        errors: { [errorField]: req.uploadError },
        formData,
        countries,
        defaultWaiverTemplate: DEFAULT_WAIVER_TEMPLATE,
        message: null
      });
    }
    const validationErrors = validateCreateEventForm(formData);

    if (Object.keys(validationErrors).length > 0) {
      return res.status(400).render('organizer/edit-event', {
        title: `Edit Event - ${event.title}`,
        user,
        event,
        errors: validationErrors,
        formData,
        countries,
        defaultWaiverTemplate: DEFAULT_WAIVER_TEMPLATE,
        message: null
      });
    }

    const organiserNameFromUser = `${user.firstName || ''} ${user.lastName || ''}`.trim();
    const organiserName = formData.organiserName || organiserNameFromUser || 'helloRun Organizer';
    const eventTypesAllowed = getEventTypesAllowed(formData.eventType);

    event.title = formData.title;
    event.organiserName = organiserName;
    event.description = formData.description;
    event.eventType = formData.eventType || undefined;
    event.eventTypesAllowed = eventTypesAllowed;
    event.raceDistances = formData.raceDistances;
    event.registrationOpenAt = parseDateSafe(formData.registrationOpenAt);
    event.registrationCloseAt = parseDateSafe(formData.registrationCloseAt);
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
    event.minimumActivityDistanceKm = isVirtualMode && formData.virtualCompletionMode === 'accumulated_distance'
      ? formData.minimumActivityDistanceKm
      : null;
    event.acceptedRunTypes = isVirtualMode && formData.virtualCompletionMode === 'accumulated_distance'
      ? formData.acceptedRunTypes
      : [];
    event.finalSubmissionDeadlineAt = isVirtualMode && formData.virtualCompletionMode === 'accumulated_distance'
      ? parseDateSafe(formData.finalSubmissionDeadlineAt)
      : null;
    event.milestoneDistancesKm = isVirtualMode && formData.virtualCompletionMode === 'accumulated_distance'
      ? formData.milestoneDistancesKm
      : [];
    event.recognitionMode = isVirtualMode && formData.virtualCompletionMode === 'accumulated_distance'
      ? formData.recognitionMode
      : 'completion_only';
    event.leaderboardMode = isVirtualMode && formData.virtualCompletionMode === 'accumulated_distance'
      ? formData.leaderboardMode
      : 'finishers';
    const bannerImageFile = req.files?.bannerImageFile?.[0] || null;
    const logoFile = req.files?.logoFile?.[0] || null;
    const posterImageFile = req.files?.posterImageFile?.[0] || null;
    const galleryImageFiles = req.files?.galleryImageFiles || [];
    const previousBannerUrl = event.bannerImageUrl || '';
    const previousLogoUrl = event.logoUrl || '';
    const previousPosterUrl = event.posterImageUrl || '';
    const previousGalleryUrls = Array.isArray(event.galleryImageUrls) ? event.galleryImageUrls : [];

    if (bannerImageFile || logoFile || posterImageFile || galleryImageFiles.length) {
      const uploadedBranding = await uploadService.uploadEventBrandingToR2({
        userId: user._id,
        bannerImageFile: bannerImageFile || undefined,
        logoFile: logoFile || undefined,
        posterImageFile: posterImageFile || undefined,
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
    }
    if (formData.removePosterImage && !posterImageFile) {
      formData.posterImageUrl = '';
    }
    if (formData.removeGalleryImages && !galleryImageFiles.length) {
      formData.galleryImageUrls = [];
      formData.galleryImageUrlsText = '';
    }

    if ((formData.galleryImageUrls || []).length > MAX_GALLERY_IMAGES) {
      if (uploadedBrandingKeys.length) {
        await uploadService.deleteObjects(uploadedBrandingKeys);
        uploadedBrandingKeys.length = 0;
      }
      return res.status(400).render('organizer/edit-event', {
        title: `Edit Event - ${event.title}`,
        user,
        event,
        errors: { galleryImageUrls: `Gallery supports up to ${MAX_GALLERY_IMAGES} images.` },
        formData,
        countries,
        defaultWaiverTemplate: DEFAULT_WAIVER_TEMPLATE,
        message: null
      });
    }

    event.bannerImageUrl = formData.bannerImageUrl || '';
    event.logoUrl = formData.logoUrl || '';
    event.posterImageUrl = formData.posterImageUrl || '';
    event.galleryImageUrls = Array.isArray(formData.galleryImageUrls) ? formData.galleryImageUrls : [];
    const normalizedWaiverTemplate = sanitizeWaiverTemplate(formData.waiverTemplate);
    const previousWaiverTemplate = sanitizeWaiverTemplate(event.waiverTemplate || DEFAULT_WAIVER_TEMPLATE);
    if (previousWaiverTemplate !== normalizedWaiverTemplate) {
      event.waiverVersion = Number(event.waiverVersion || 1) + 1;
    } else if (!event.waiverVersion) {
      event.waiverVersion = 1;
    }
    event.waiverTemplate = normalizedWaiverTemplate;

    await event.save();

    const keysToDelete = [];
    if ((bannerImageFile || formData.removeBannerImage) && previousBannerUrl && previousBannerUrl !== event.bannerImageUrl) {
      const previousBannerKey = uploadService.extractObjectKeyFromPublicUrl(previousBannerUrl);
      if (previousBannerKey) keysToDelete.push(previousBannerKey);
    }
    if ((logoFile || formData.removeLogoImage) && previousLogoUrl && previousLogoUrl !== event.logoUrl) {
      const previousLogoKey = uploadService.extractObjectKeyFromPublicUrl(previousLogoUrl);
      if (previousLogoKey) keysToDelete.push(previousLogoKey);
    }
    if ((posterImageFile || formData.removePosterImage) && previousPosterUrl && previousPosterUrl !== event.posterImageUrl) {
      const previousPosterKey = uploadService.extractObjectKeyFromPublicUrl(previousPosterUrl);
      if (previousPosterKey) keysToDelete.push(previousPosterKey);
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
      msg: 'Event updated successfully.'
    });
    return res.redirect(`/organizer/events/${event._id}?${query.toString()}`);
  } catch (error) {
    console.error('Error updating event:', error);
    if (uploadedBrandingKeys.length) {
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
   POST: Event Status Transition (Owner Only)
   ========================================== */

router.post('/events/:id/status', requireApprovedOrganizer, async (req, res) => {
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

    if (nextStatus === 'published') {
      const readinessErrors = getPublishReadinessErrors(event);
      if (readinessErrors.length) {
        const q = new URLSearchParams({
          type: 'error',
          msg: `Cannot publish yet: ${readinessErrors[0]}`
        });
        return res.redirect(`/organizer/events/${event._id}?${q.toString()}`);
      }
    }

    event.status = nextStatus;
    await event.save();

    const q = new URLSearchParams({
      type: 'success',
      msg: `Event status updated to ${nextStatus}.`
    });
    return res.redirect(`/organizer/events/${event._id}?${q.toString()}`);
  } catch (error) {
    console.error('Error updating event status:', error);
    return res.status(500).render('error', {
      title: 'Server Error',
      status: 500,
      message: 'An error occurred while updating event status.'
    });
  }
});

/* ==========================================
   POST: Remove Event Media Immediately (Owner Only)
   ========================================== */

router.post('/events/:id/media/remove', requireApprovedOrganizer, async (req, res) => {
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
    console.error('Error removing event media:', error);
    return res.status(500).json({ success: false, message: 'Failed to remove media. Please try again.' });
  }
});

/* ==========================================
   POST: Create Event (Approved Organizers)
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
    if (req.uploadError) {
      const errorField = mapUploadFieldToFormField(req.uploadErrorField);
      return res.status(400).render('organizer/create-event', {
        title: 'Create Event - helloRun',
        user,
        errors: { [errorField]: req.uploadError },
        formData,
        countries,
        defaultWaiverTemplate: DEFAULT_WAIVER_TEMPLATE,
        message: null
      });
    }
    const validationErrors = validateCreateEventForm(formData);

    if (Object.keys(validationErrors).length > 0) {
      return res.status(400).render('organizer/create-event', {
        title: 'Create Event - helloRun',
        user,
        errors: validationErrors,
        formData,
        countries,
        defaultWaiverTemplate: DEFAULT_WAIVER_TEMPLATE,
        message: null
      });
    }

    const organiserNameFromUser = `${user.firstName || ''} ${user.lastName || ''}`.trim();
    const organiserName = formData.organiserName || organiserNameFromUser || 'helloRun Organizer';
    const status = formData.actionType === 'publish' ? 'published' : 'draft';
    const slug = await generateUniqueSlug(formData.title);
    const eventTypesAllowed = getEventTypesAllowed(formData.eventType);
    const isVirtualMode = formData.eventType === 'virtual' || formData.eventType === 'hybrid';

    const bannerImageFile = req.files?.bannerImageFile?.[0] || null;
    const logoFile = req.files?.logoFile?.[0] || null;
    const posterImageFile = req.files?.posterImageFile?.[0] || null;
    const galleryImageFiles = req.files?.galleryImageFiles || [];
    if (bannerImageFile || logoFile || posterImageFile || galleryImageFiles.length) {
      const uploadedBranding = await uploadService.uploadEventBrandingToR2({
        userId: user._id,
        bannerImageFile: bannerImageFile || undefined,
        logoFile: logoFile || undefined,
        posterImageFile: posterImageFile || undefined,
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
      if (Array.isArray(uploadedBranding.gallery) && uploadedBranding.gallery.length) {
        uploadedBrandingKeys.push(...uploadedBranding.gallery.map((item) => item.key));
        formData.galleryImageUrls = Array.from(
          new Set([...(formData.galleryImageUrls || []), ...uploadedBranding.gallery.map((item) => item.url)])
        );
        formData.galleryImageUrlsText = formData.galleryImageUrls.join('\n');
      }
    }

    if ((formData.galleryImageUrls || []).length > MAX_GALLERY_IMAGES) {
      if (uploadedBrandingKeys.length) {
        await uploadService.deleteObjects(uploadedBrandingKeys);
        uploadedBrandingKeys.length = 0;
      }
      return res.status(400).render('organizer/create-event', {
        title: 'Create Event - helloRun',
        user,
        errors: { galleryImageUrls: `Gallery supports up to ${MAX_GALLERY_IMAGES} images.` },
        formData,
        countries,
        defaultWaiverTemplate: DEFAULT_WAIVER_TEMPLATE,
        message: null
      });
    }

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
      status,
      eventType: formData.eventType || undefined,
      eventTypesAllowed,
      raceDistances: formData.raceDistances,
      registrationOpenAt: parseDateSafe(formData.registrationOpenAt),
      registrationCloseAt: parseDateSafe(formData.registrationCloseAt),
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
      minimumActivityDistanceKm: isVirtualMode && formData.virtualCompletionMode === 'accumulated_distance'
        ? formData.minimumActivityDistanceKm
        : null,
      acceptedRunTypes: isVirtualMode && formData.virtualCompletionMode === 'accumulated_distance'
        ? formData.acceptedRunTypes
        : [],
      finalSubmissionDeadlineAt: isVirtualMode && formData.virtualCompletionMode === 'accumulated_distance'
        ? parseDateSafe(formData.finalSubmissionDeadlineAt)
        : null,
      milestoneDistancesKm: isVirtualMode && formData.virtualCompletionMode === 'accumulated_distance'
        ? formData.milestoneDistancesKm
        : [],
      recognitionMode: isVirtualMode && formData.virtualCompletionMode === 'accumulated_distance'
        ? formData.recognitionMode
        : 'completion_only',
      leaderboardMode: isVirtualMode && formData.virtualCompletionMode === 'accumulated_distance'
        ? formData.leaderboardMode
        : 'finishers',
      bannerImageUrl: formData.bannerImageUrl || '',
      logoUrl: formData.logoUrl || '',
      posterImageUrl: formData.posterImageUrl || '',
      galleryImageUrls: formData.galleryImageUrls || [],
      waiverTemplate: sanitizeWaiverTemplate(formData.waiverTemplate),
      waiverVersion: 1
    });

    await event.save();

    const successText = status === 'published'
      ? 'Event published successfully.'
      : 'Event saved as draft successfully.';

    const query = new URLSearchParams({ type: 'success', msg: successText });
    return res.redirect(`/organizer/events?${query.toString()}`);
  } catch (error) {
    console.error('Error creating event:', error);
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

/* ==========================================
   GET: Complete Profile Page
   ========================================== */

router.get('/complete-profile', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    // Try to find the user's organizer application
    const application = await OrganiserApplication.findOne({ userId: user._id });

    res.render('organizer/complete-profile', {
      title: 'Complete Organizer Profile - helloRun',
      user: user,
      application: application || null,
      ORGANIZER_REVIEW_TIME_DAYS: process.env.ORGANIZER_REVIEW_TIME_DAYS || 3
    });
  } catch (error) {
    console.error('Error loading complete-profile:', error);
    res.status(500).send('Server error');
  }
});

/* ==========================================
   POST: Complete Profile Submission
   ========================================== */

router.post(
  '/complete-profile',
  requireAuth,
  uploadService.uploadOrganizerDocs,
  requireCsrfProtection,
  async (req, res) => {
    const uploadedObjectKeys = [];
    try {
      // ========== STEP 1: Validate Authentication ==========
      const userId = req.session.userId;
      const user = await User.findById(userId);

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User not found or session expired.'
        });
      }

      if (user.role !== 'organiser') {
        return res.status(403).json({
          success: false,
          message: 'Only organizers can submit applications.'
        });
      }

      // ========== STEP 2: Validate Existing Application ==========
      const existingApplication = await OrganiserApplication.findOne({
        userId: userId
      });

      if (existingApplication && existingApplication.status === 'approved') {
        return res.status(400).json({
          success: false,
          message: 'You have already been approved as an organizer.'
        });
      }

      if (existingApplication && existingApplication.status === 'pending') {
        return res.status(400).json({
          success: false,
          message: 'Your application is already under review. Please wait for feedback.'
        });
      }

      // ========== STEP 3: Validate Request Body ==========
      const {
        businessName,
        businessType,
        contactPhone,
        businessRegistrationNumber,
        businessAddress,
        additionalInfo,
        terms: agreeTerms
      } = req.body;

      // Validate required fields
      const errors = {};

      if (!businessName || businessName.trim().length < 2) {
        errors.businessName = 'Business name is required (minimum 2 characters)';
      }

      if (!businessType || !['individual', 'company', 'ngo', 'sports_club'].includes(businessType)) {
        errors.businessType = 'Please select a valid business type';
      }

      if (!contactPhone || !isValidPhone(contactPhone)) {
        errors.contactPhone = 'Please provide a valid phone number';
      }

      if (businessAddress && businessAddress.length > 500) {
        errors.businessAddress = 'Address must not exceed 500 characters';
      }

      if (additionalInfo && additionalInfo.length > 500) {
        errors.additionalInfo = 'Additional info must not exceed 500 characters';
      }

      if (!agreeTerms) {
        errors.agreeTerms = 'You must accept the terms and conditions';
      }

      // Return validation errors if any
      if (Object.keys(errors).length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Please fix the errors and try again',
          errors: errors
        });
      }

      // ========== STEP 4: Validate File Uploads ==========
      if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Please upload both ID proof and business proof documents'
        });
      }

      const idProofFile = req.files.idProof ? req.files.idProof[0] : null;
      const businessProofFile = req.files.businessProof ? req.files.businessProof[0] : null;

      if (!idProofFile) {
        return res.status(400).json({
          success: false,
          message: 'ID proof document is required'
        });
      }

      if (!businessProofFile) {
        return res.status(400).json({
          success: false,
          message: 'Business proof document is required'
        });
      }

      const fileValidation = validateFiles([idProofFile, businessProofFile]);
      if (!fileValidation.valid) {
        return res.status(400).json({
          success: false,
          message: fileValidation.error
        });
      }

      // ========== STEP 5: Upload Documents to Cloudflare R2 ==========
      let uploadedDocs;
      try {
        uploadedDocs = await uploadService.uploadOrganizerDocsToR2({
          userId,
          idProofFile,
          businessProofFile
        });
        uploadedObjectKeys.push(uploadedDocs.idProof.key, uploadedDocs.businessProof.key);
      } catch (uploadError) {
        console.error('R2 upload error:', uploadError);
        return res.status(500).json({
          success: false,
          message: 'Failed to upload documents. Please try again.'
        });
      }

      // ========== STEP 6: Create OrganiserApplication Record ==========
      let application;

      try {
        application = new OrganiserApplication({
          userId: userId,
          businessName: businessName.trim(),
          businessType: businessType,
          contactPhone: contactPhone.trim(),
          businessRegistrationNumber: businessRegistrationNumber?.trim() || '',
          businessAddress: businessAddress?.trim() || '',
          idProofUrl: uploadedDocs.idProof.url,
          businessProofUrl: uploadedDocs.businessProof.url,
          additionalInfo: additionalInfo?.trim() || '',
          status: 'pending',
          submittedAt: new Date()
        });

        // Save application (auto-generates applicationId via pre-save hook)
        await application.save();
      } catch (dbError) {
        console.error('Database save error:', dbError);

        // Delete uploaded cloud objects on database failure
        await uploadService.deleteObjects(uploadedObjectKeys);

        return res.status(500).json({
          success: false,
          message: 'Failed to save application. Please try again.'
        });
      }

      // ========== STEP 7: Update User Status ==========
      try {
        user.organizerApplicationId = application._id;
        user.organizerStatus = 'pending';
        await user.save();
      } catch (updateError) {
        console.error('User update error:', updateError);
        // Continue even if user update fails - application is already saved
      }

      // ========== STEP 8: Send Confirmation Email ==========
      try {
        await emailService.sendApplicationSubmittedEmail(
          user.email,
          user.firstName || 'Organizer',
          application.applicationId
        );
      } catch (emailError) {
        console.error('Email sending error:', emailError);
        // Don't fail the submission if email fails
      }

      // ========== STEP 9: Send Success Response ==========
      return res.status(201).json({
        success: true,
        message: 'Application submitted successfully!',
        applicationId: application.applicationId,
        redirectUrl: '/organizer/application-status'
      });

    } catch (error) {
      console.error('Unexpected error in complete-profile POST:', error);

      // Attempt to delete uploaded cloud objects if they exist
      if (uploadedObjectKeys.length > 0) {
        await uploadService.deleteObjects(uploadedObjectKeys);
      }

      return res.status(500).json({
        success: false,
        message: 'An unexpected error occurred. Please try again later.'
      });
    }
  }
);

/* ==========================================
   GET: Application Status Page
   ========================================== */

router.get('/application-status', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);

    if (!user) {
      return res.status(404).render('error', {
        title: '404 - User Not Found',
        status: 404,
        message: 'User account not found.'
      });
    }

    // Check if user has submitted an application
    const application = await OrganiserApplication.findOne({
      userId: req.session.userId
    });

    if (!application) {
      return res.redirect('/organizer/complete-profile');
    }

    // Calculate days since submission
    const submittedDate = new Date(application.submittedAt);
    const daysAgo = Math.floor((Date.now() - submittedDate) / (1000 * 60 * 60 * 24));

    // Calculate estimated review completion date
    const reviewDays = parseInt(process.env.ORGANIZER_REVIEW_TIME_DAYS) || 3;
    const estimatedDate = new Date(submittedDate);
    estimatedDate.setDate(estimatedDate.getDate() + reviewDays);

    res.render('organizer/application-status', {
      title: 'Application Status - helloRun',
      user: user,
      application: application,
      daysAgo: daysAgo,
      estimatedDate: estimatedDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      submittedDate: submittedDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      reviewDays: reviewDays,
      adminEmail: process.env.ADMIN_EMAIL || 'hellorunonline@gmail.com'
    });
  } catch (error) {
    console.error('Error loading application status:', error);
    res.status(500).render('error', {
      title: 'Server Error',
      status: 500,
      message: 'An error occurred while loading your application status.'
    });
  }
});

/* ==========================================
   HELPER METHODS
   ========================================== */

/**
 * Validate phone number format
 */
function isValidPhone(phone) {
  if (!phone || typeof phone !== 'string') {
    return false;
  }
  // Allow various phone formats with at least 7 digits
  const phoneRegex = /^[\d\s\-\+\(\)]+$/;
  const digitsOnly = phone.replace(/\D/g, '');
  return phoneRegex.test(phone) && digitsOnly.length >= 7;
}

/**
 * Validate uploaded files
 */
function validateFiles(files) {
  const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
  const maxSize = parseInt(process.env.UPLOAD_MAX_SIZE) || 5242880; // 5MB

  for (const file of files) {
    // Check file type
    if (!allowedTypes.includes(file.mimetype)) {
      return {
        valid: false,
        error: `Invalid file type: ${file.originalname}. Please upload PDF, JPG, or PNG files only.`
      };
    }

    // Check file size
    if (file.size > maxSize) {
      const maxSizeMB = Math.round(maxSize / 1024 / 1024);
      return {
        valid: false,
        error: `File ${file.originalname} exceeds ${maxSizeMB}MB limit.`
      };
    }
  }

  return { valid: true };
}

function getPageMessage(query) {
  const msg = typeof query.msg === 'string' ? query.msg.trim() : '';
  if (!msg) return null;
  const type = query.type === 'error' ? 'error' : 'success';
  return { type, text: msg.slice(0, 200) };
}

function normalizeArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return [value];
}

function normalizeProofTypes(value) {
  const allowed = new Set(['gps', 'photo', 'manual']);
  return normalizeArray(value)
    .map((item) => String(item || '').trim())
    .filter((item) => allowed.has(item));
}

function normalizeVirtualCompletionMode(value) {
  const safeValue = String(value || '').trim();
  return VIRTUAL_COMPLETION_MODES.has(safeValue) ? safeValue : 'single_activity';
}

function normalizeRunTypes(value) {
  return normalizeArray(value)
    .map((item) => String(item || '').trim())
    .filter((item) => ACCEPTED_RUN_TYPES.has(item));
}

function normalizeModeValue(value, allowedValues, fallback) {
  const safeValue = String(value || '').trim();
  return allowedValues.has(safeValue) ? safeValue : fallback;
}

function parseOptionalPositiveNumber(value) {
  const safeValue = String(value ?? '').trim();
  if (!safeValue) return null;
  const parsed = Number(safeValue);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeMilestoneDistances(value) {
  const rawValues = normalizeArray(value).join(',');
  const distances = rawValues
    .split(',')
    .map((item) => parseOptionalPositiveNumber(item))
    .filter((item) => Number.isFinite(item) && item > 0);
  return Array.from(new Set(distances)).sort((a, b) => a - b);
}

function normalizeRaceDistanceLabel(value) {
  if (!value) return '';
  const compact = String(value)
    .trim()
    .replace(/\s+/g, '')
    .toUpperCase()
    .replace(/[^0-9A-Z.]/g, '');
  if (!compact || compact.length > 30) return '';
  return compact;
}

function normalizeRaceDistances(presetValues, customDistancesRaw) {
  const presetDistances = normalizeArray(presetValues).map(normalizeRaceDistanceLabel);
  const customDistances = String(customDistancesRaw || '')
    .split(',')
    .map((item) => normalizeRaceDistanceLabel(item));
  return sortRaceDistancesDesc(Array.from(new Set([...presetDistances, ...customDistances].filter(Boolean))));
}

function sortRaceDistancesDesc(values = []) {
  const toNumericDistance = (value) => {
    const match = String(value || '').toUpperCase().match(/^(\d+(?:\.\d+)?)(K|KM|MI|M)?$/);
    if (!match) return Number.NEGATIVE_INFINITY;
    const amount = Number.parseFloat(match[1]);
    if (!Number.isFinite(amount)) return Number.NEGATIVE_INFINITY;
    const unit = match[2] || 'K';
    if (unit === 'MI' || unit === 'M') {
      return amount * 1.60934;
    }
    return amount;
  };

  return values
    .slice()
    .sort((a, b) => {
      const diff = toNumericDistance(b) - toNumericDistance(a);
      if (diff !== 0) return diff;
      return String(b || '').localeCompare(String(a || ''), undefined, { numeric: true, sensitivity: 'base' });
    });
}

function normalizeGalleryImageUrls(rawValue) {
  const combined = normalizeArray(rawValue).join('\n');
  const normalized = combined
    .split(/\r?\n|,/)
    .map((item) => String(item || '').trim())
    .filter(Boolean);
  return Array.from(new Set(normalized));
}

function getRegistrantFilterContext(event, queryParams = {}) {
  const selectedMode = ['virtual', 'onsite'].includes(queryParams.mode)
    ? queryParams.mode
    : '';
  const eventRaceDistances = Array.isArray(event.raceDistances) ? event.raceDistances : [];
  const selectedDistance = eventRaceDistances.includes(queryParams.distance)
    ? queryParams.distance
    : '';
  const searchQuery = typeof queryParams.q === 'string' ? queryParams.q.trim().slice(0, 80) : '';
  const selectedPaymentStatus = ['unpaid', 'proof_submitted', 'proof_rejected', 'paid', 'failed', 'refunded'].includes(queryParams.payment)
    ? queryParams.payment
    : '';
  const selectedResultStatus = ['submitted', 'approved', 'rejected'].includes(queryParams.result)
    ? queryParams.result
    : '';

  const query = { eventId: event._id };
  if (selectedMode) {
    query.participationMode = selectedMode;
  }
  if (selectedDistance) {
    query.raceDistance = selectedDistance;
  }
  if (selectedPaymentStatus) {
    query.paymentStatus = selectedPaymentStatus;
  }
  if (searchQuery) {
    const safePattern = new RegExp(escapeRegex(searchQuery), 'i');
    query.$or = [
      { confirmationCode: safePattern },
      { 'participant.firstName': safePattern },
      { 'participant.lastName': safePattern },
      { 'participant.email': safePattern },
      { 'participant.emergencyContactName': safePattern },
      { 'participant.emergencyContactNumber': safePattern },
      { 'participant.runningGroup': safePattern },
      { raceDistance: safePattern }
    ];
  }

  return {
    query,
    selectedMode,
    selectedDistance,
    selectedPaymentStatus,
    selectedResultStatus,
    eventRaceDistances,
    searchQuery
  };
}

function buildRegistrantExportQuery(filterContext) {
  const params = new URLSearchParams();
  if (filterContext.selectedMode) params.set('mode', filterContext.selectedMode);
  if (filterContext.selectedDistance) params.set('distance', filterContext.selectedDistance);
  if (filterContext.selectedPaymentStatus) params.set('payment', filterContext.selectedPaymentStatus);
  if (filterContext.selectedResultStatus) params.set('result', filterContext.selectedResultStatus);
  if (filterContext.searchQuery) params.set('q', filterContext.searchQuery);
  return params.toString();
}

function mapSubmissionForRegistrant(submission) {
  if (!submission) return null;

  const ocrData = submission.ocrData || {};
  const ocrTimeMs = Number(ocrData.extractedTimeMs);
  let ocrTimeLabel = '';
  if (Number.isFinite(ocrTimeMs) && ocrTimeMs > 0) {
    const ocrH = Math.floor(ocrTimeMs / 3600000);
    const ocrM = Math.floor((ocrTimeMs % 3600000) / 60000);
    const ocrS = Math.floor((ocrTimeMs % 60000) / 1000);
    ocrTimeLabel = (ocrH > 0 ? String(ocrH) + 'h ' : '') +
      String(ocrM).padStart(2, '0') + 'm ' +
      String(ocrS).padStart(2, '0') + 's';
  }

  const reviewedBy = submission.reviewedBy;
  const reviewerName = reviewedBy
    ? String(reviewedBy.firstName || '').trim() + ' ' + String(reviewedBy.lastName || '').trim()
    : '';

  return {
    ...submission,
    elapsedLabel: formatElapsedMs(submission.elapsedMs),
    runDateLabel: formatDateOnly(submission.runDate),
    runLocation: String(submission.runLocation || '').trim(),
    submittedAtLabel: formatDateTime(submission.submittedAt),
    reviewedAtLabel: formatDateTime(submission.reviewedAt),
    reviewerName: reviewerName.trim(),
    ocrTimeLabel,
    runType: submission.runType || 'run',
    elevationGain: submission.elevationGain != null ? submission.elevationGain : null,
    suspiciousFlag: Boolean(submission.suspiciousFlag),
    suspiciousFlagReason: String(submission.suspiciousFlagReason || '').trim()
  };
}

function getRegistrantExportData(registrations = []) {
  const headers = [
    'Confirmation Code',
    'First Name',
    'Last Name',
    'Email',
    'Mobile',
    'Country',
    'Date of Birth',
    'Gender',
    'Emergency Contact Name',
    'Emergency Contact Number',
    'Running Group',
    'Waiver Version',
    'Waiver Signature',
    'Waiver Accepted At',
    'Participation Mode',
    'Race Distance',
    'Status',
    'Payment Status',
    'Payment Proof URL',
    'Payment Proof Uploaded At',
    'Payment Reviewed At',
    'Payment Rejection Reason',
    'Payment Review Notes',
    'Registered At'
  ];

  const rows = registrations.map((registration) => {
    const participant = registration.participant || {};
    return [
      registration.confirmationCode || '',
      participant.firstName || '',
      participant.lastName || '',
      participant.email || '',
      participant.mobile || '',
      getCountryName(participant.country) || participant.country || '',
      formatDateOnly(participant.dateOfBirth) || '',
      formatGenderLabel(participant.gender) || '',
      participant.emergencyContactName || '',
      participant.emergencyContactNumber || '',
      participant.runningGroup || '',
      registration.waiver?.version || '',
      registration.waiver?.signature || '',
      registration.waiver?.acceptedAt ? new Date(registration.waiver.acceptedAt).toISOString() : '',
      registration.participationMode || '',
      registration.raceDistance || '',
      registration.status || '',
      registration.paymentStatus || '',
      registration.paymentProof?.url || '',
      registration.paymentProof?.uploadedAt ? new Date(registration.paymentProof.uploadedAt).toISOString() : '',
      registration.paymentReviewedAt ? new Date(registration.paymentReviewedAt).toISOString() : '',
      registration.paymentRejectionReason || '',
      registration.paymentReviewNotes || '',
      registration.registeredAt ? new Date(registration.registeredAt).toISOString() : ''
    ];
  });

  return { headers, rows };
}

function csvEscape(value) {
  const raw = String(value ?? '');
  const escaped = raw.replace(/"/g, '""');
  return `"${escaped}"`;
}

function escapeRegex(input) {
  return String(input || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getCreateEventFormData(body = {}) {
  const raceDistancePresets = normalizeArray(body.raceDistancePresets).map(normalizeRaceDistanceLabel).filter(Boolean);
  const raceDistances = normalizeRaceDistances(body.raceDistancePresets, body.raceDistanceCustom);
  const galleryImageUrls = normalizeGalleryImageUrls(body.galleryImageUrlsText || body.galleryImageUrls);
  const waiverTemplateRaw = typeof body.waiverTemplate === 'string'
    ? body.waiverTemplate
    : DEFAULT_WAIVER_TEMPLATE;
  return {
    title: (body.title || '').trim(),
    organiserName: (body.organiserName || '').trim(),
    description: (body.description || '').trim(),
    eventType: (body.eventType || '').trim(),
    registrationOpenAt: body.registrationOpenAt || '',
    registrationCloseAt: body.registrationCloseAt || '',
    eventStartAt: body.eventStartAt || '',
    eventEndAt: body.eventEndAt || '',
    venueName: (body.venueName || '').trim(),
    venueAddress: (body.venueAddress || '').trim(),
    city: (body.city || '').trim(),
    province: (body.province || '').trim(),
    country: normalizeCountryCode(body.country),
    geoLat: (body.geoLat || '').trim(),
    geoLng: (body.geoLng || '').trim(),
    virtualStartAt: body.virtualStartAt || '',
    virtualEndAt: body.virtualEndAt || '',
    proofTypesAllowed: normalizeProofTypes(body.proofTypesAllowed),
    virtualCompletionMode: normalizeVirtualCompletionMode(body.virtualCompletionMode),
    targetDistanceKm: parseOptionalPositiveNumber(body.targetDistanceKm),
    minimumActivityDistanceKm: parseOptionalPositiveNumber(body.minimumActivityDistanceKm),
    acceptedRunTypes: normalizeRunTypes(body.acceptedRunTypes),
    finalSubmissionDeadlineAt: body.finalSubmissionDeadlineAt || '',
    milestoneDistancesKm: normalizeMilestoneDistances(body.milestoneDistancesKm),
    milestoneDistancesText: normalizeMilestoneDistances(body.milestoneDistancesKm).join(', '),
    recognitionMode: normalizeModeValue(body.recognitionMode, RECOGNITION_MODES, 'completion_only'),
    leaderboardMode: normalizeModeValue(body.leaderboardMode, LEADERBOARD_MODES, 'finishers'),
    raceDistances,
    raceDistancePresets,
    raceDistanceCustom: String(body.raceDistanceCustom || '').trim(),
    bannerImageUrl: (body.bannerImageUrl || '').trim(),
    logoUrl: (body.logoUrl || '').trim(),
    posterImageUrl: (body.posterImageUrl || '').trim(),
    galleryImageUrls,
    galleryImageUrlsText: galleryImageUrls.join('\n'),
    removeBannerImage: body.removeBannerImage === '1',
    removeLogoImage: body.removeLogoImage === '1',
    removePosterImage: body.removePosterImage === '1',
    removeGalleryImages: body.removeGalleryImages === '1',
    waiverTemplate: sanitizeWaiverTemplate(waiverTemplateRaw),
    actionType: body.actionType === 'publish' ? 'publish' : 'draft'
  };
}

function formatDateForInput(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function getCreateEventFormDataFromEvent(event) {
  const eventRaceDistances = Array.isArray(event.raceDistances) ? event.raceDistances : [];
  const normalizedEventDistances = eventRaceDistances
    .map((item) => normalizeRaceDistanceLabel(item))
    .filter(Boolean);
  const raceDistancePresets = normalizedEventDistances.filter((item) => RACE_DISTANCE_PRESETS.has(item));
  const raceDistanceCustom = normalizedEventDistances
    .filter((item) => !RACE_DISTANCE_PRESETS.has(item))
    .join(', ');

  return {
    title: event.title || '',
    organiserName: event.organiserName || '',
    description: event.description || '',
    eventType: event.eventType || '',
    registrationOpenAt: formatDateForInput(event.registrationOpenAt),
    registrationCloseAt: formatDateForInput(event.registrationCloseAt),
    eventStartAt: formatDateForInput(event.eventStartAt),
    eventEndAt: formatDateForInput(event.eventEndAt),
    venueName: event.venueName || '',
    venueAddress: event.venueAddress || '',
    city: event.city || '',
    province: event.province || '',
    country: normalizeCountryCode(event.country),
    geoLat: event.geo?.lat?.toString?.() || '',
    geoLng: event.geo?.lng?.toString?.() || '',
    virtualStartAt: formatDateForInput(event.virtualWindow?.startAt),
    virtualEndAt: formatDateForInput(event.virtualWindow?.endAt),
    proofTypesAllowed: Array.isArray(event.proofTypesAllowed) ? event.proofTypesAllowed : [],
    virtualCompletionMode: normalizeVirtualCompletionMode(event.virtualCompletionMode),
    targetDistanceKm: Number.isFinite(event.targetDistanceKm) ? event.targetDistanceKm : null,
    minimumActivityDistanceKm: Number.isFinite(event.minimumActivityDistanceKm) ? event.minimumActivityDistanceKm : null,
    acceptedRunTypes: Array.isArray(event.acceptedRunTypes) ? event.acceptedRunTypes : [],
    finalSubmissionDeadlineAt: formatDateForInput(event.finalSubmissionDeadlineAt),
    milestoneDistancesKm: Array.isArray(event.milestoneDistancesKm) ? event.milestoneDistancesKm : [],
    milestoneDistancesText: (Array.isArray(event.milestoneDistancesKm) ? event.milestoneDistancesKm : []).join(', '),
    recognitionMode: normalizeModeValue(event.recognitionMode, RECOGNITION_MODES, 'completion_only'),
    leaderboardMode: normalizeModeValue(event.leaderboardMode, LEADERBOARD_MODES, 'finishers'),
    raceDistances: normalizedEventDistances,
    raceDistancePresets,
    raceDistanceCustom,
    bannerImageUrl: event.bannerImageUrl || '',
    logoUrl: event.logoUrl || '',
    posterImageUrl: event.posterImageUrl || '',
    galleryImageUrls: Array.isArray(event.galleryImageUrls) ? event.galleryImageUrls : [],
    galleryImageUrlsText: (Array.isArray(event.galleryImageUrls) ? event.galleryImageUrls : []).join('\n'),
    removeBannerImage: false,
    removeLogoImage: false,
    removePosterImage: false,
    removeGalleryImages: false,
    waiverTemplate: sanitizeWaiverTemplate(event.waiverTemplate || DEFAULT_WAIVER_TEMPLATE),
    actionType: event.status === 'published' ? 'publish' : 'draft'
  };
}

function parseDateSafe(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDateOnly(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function formatDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-US');
}

function formatElapsedMs(value) {
  const totalMs = Number(value || 0);
  if (!Number.isFinite(totalMs) || totalMs <= 0) return '';
  const totalSeconds = Math.floor(totalMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function formatGenderLabel(value) {
  const normalized = String(value || '').trim();
  if (!normalized) return '';
  if (normalized === 'prefer_not_to_say') return 'Prefer not to say';
  if (normalized === 'non_binary') return 'Non-binary';
  if (normalized === 'male') return 'Male';
  if (normalized === 'female') return 'Female';
  return normalized;
}

function formatAgeFromDateOfBirth(value) {
  if (!value) return '';
  const birthDate = new Date(value);
  if (Number.isNaN(birthDate.getTime())) return '';

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  const dayDiff = today.getDate() - birthDate.getDate();

  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    age -= 1;
  }

  if (age < 0 || age > 130) return '';
  return String(age);
}

function isValidUrl(url) {
  if (!url) return true;
  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
}

function sanitizeWaiverTemplate(value) {
  const normalizedTemplate = normalizeWaiverTemplate(value);
  if (!normalizedTemplate) return '';
  return normalizeWaiverTemplate(sanitizeHtml(normalizedTemplate, WAIVER_SANITIZE_OPTIONS));
}

function normalizeOrganizerDashboardRange(value) {
  const safe = String(value || '').trim().toLowerCase();
  if (safe === '7d' || safe === '30d' || safe === 'all') {
    return safe;
  }
  return '30d';
}

function getOrganizerDashboardRangeStart(range, now = new Date()) {
  if (range === 'all') return null;
  const days = range === '7d' ? 7 : 30;
  const start = new Date(now);
  start.setDate(start.getDate() - days);
  return start;
}

function getOrganizerDashboardRangeLabel(range) {
  if (range === '7d') return 'Last 7 days';
  if (range === 'all') return 'All time';
  return 'Last 30 days';
}

function getOrganizerDashboardRangeWindow(range, now = new Date()) {
  const currentEndAt = new Date(now);
  const currentStartAt = getOrganizerDashboardRangeStart(range, currentEndAt);
  if (!currentStartAt) {
    return {
      currentStartAt: null,
      currentEndAt: null,
      previousStartAt: null,
      previousEndAt: null,
      previousLabel: 'Previous period'
    };
  }

  const durationMs = currentEndAt.getTime() - currentStartAt.getTime();
  const previousEndAt = new Date(currentStartAt);
  const previousStartAt = new Date(previousEndAt.getTime() - durationMs);

  return {
    currentStartAt,
    currentEndAt,
    previousStartAt,
    previousEndAt,
    previousLabel: range === '7d' ? 'Previous 7 days' : 'Previous 30 days'
  };
}

function buildDateBoundFilter(baseFilter, field, startAt, endAt) {
  const filter = { ...baseFilter };
  if (!field || (!startAt && !endAt)) {
    return filter;
  }

  const bounds = {};
  if (startAt) bounds.$gte = startAt;
  if (endAt) bounds.$lt = endAt;
  if (Object.keys(bounds).length) {
    filter[field] = bounds;
  }

  return filter;
}

function buildOrganizerTrendMetric(currentValue, previousValue, previousLabel) {
  const current = Number(currentValue || 0);
  const previous = Number(previousValue || 0);
  const delta = current - previous;
  const direction = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
  const sign = delta > 0 ? '+' : '';

  return {
    current,
    previous,
    delta,
    direction,
    label: `${sign}${delta} vs ${previousLabel || 'previous period'}`
  };
}

function validateCreateEventForm(formData) {
  const errors = {};
  const isPublish = formData.actionType === 'publish';
  const dateFields = [
    'registrationOpenAt',
    'registrationCloseAt',
    'eventStartAt',
    'eventEndAt'
  ];

  if (!formData.title || formData.title.length < 5) {
    errors.title = 'Event title must be at least 5 characters.';
  }

  if (!isPublish) {
    validateOptionalCreateEventFields(formData, errors);
    return errors;
  }

  if (!formData.description || formData.description.length < 20) {
    errors.description = 'Description must be at least 20 characters.';
  }

  if (!['virtual', 'onsite', 'hybrid'].includes(formData.eventType)) {
    errors.eventType = 'Select a valid event type.';
  }
  if (!Array.isArray(formData.raceDistances) || !formData.raceDistances.length) {
    errors.raceDistances = 'Add at least one race distance (for example: 3K, 5K, 10K, 21K).';
  } else if (formData.raceDistances.length > 12) {
    errors.raceDistances = 'You can add up to 12 race distances per event.';
  }

  for (const field of dateFields) {
    if (!formData[field]) {
      errors[field] = 'This date is required.';
    } else if (!parseDateSafe(formData[field])) {
      errors[field] = 'Invalid date format.';
    }
  }

  const registrationOpenAt = parseDateSafe(formData.registrationOpenAt);
  const registrationCloseAt = parseDateSafe(formData.registrationCloseAt);
  const eventStartAt = parseDateSafe(formData.eventStartAt);
  const eventEndAt = parseDateSafe(formData.eventEndAt);

  if (registrationOpenAt && registrationCloseAt && registrationOpenAt >= registrationCloseAt) {
    errors.registrationCloseAt = 'Registration close must be after registration open.';
  }
  if (eventStartAt && eventEndAt && eventStartAt >= eventEndAt) {
    errors.eventEndAt = 'Event end must be after event start.';
  }
  const isVirtualOnly = formData.eventType === 'virtual';
  if (!isVirtualOnly && registrationCloseAt && eventStartAt && registrationCloseAt > eventStartAt) {
    errors.registrationCloseAt = 'Registration close must be on/before event start (virtual events may extend registration past the start date).';
  }

  const needsOnsiteFields = formData.eventType === 'onsite' || formData.eventType === 'hybrid';
  if (needsOnsiteFields) {
    if (!formData.venueName) errors.venueName = 'Venue name is required for on-site/hybrid events.';
    if (!formData.venueAddress) errors.venueAddress = 'Venue address is required for on-site/hybrid events.';
    if (!formData.city) errors.city = 'City is required for on-site/hybrid events.';
    if (!formData.country) {
      errors.country = 'Country is required for on-site/hybrid events.';
    } else if (!isValidCountryCode(formData.country)) {
      errors.country = 'Select a valid country.';
    }
  }

  const hasGeoLat = !!formData.geoLat;
  const hasGeoLng = !!formData.geoLng;
  if (hasGeoLat !== hasGeoLng) {
    errors.geo = 'Provide both latitude and longitude, or leave both empty.';
  }
  if (hasGeoLat && hasGeoLng) {
    const lat = Number(formData.geoLat);
    const lng = Number(formData.geoLng);
    if (Number.isNaN(lat) || lat < -90 || lat > 90) {
      errors.geoLat = 'Latitude must be between -90 and 90.';
    }
    if (Number.isNaN(lng) || lng < -180 || lng > 180) {
      errors.geoLng = 'Longitude must be between -180 and 180.';
    }
  }

  const needsVirtualFields = formData.eventType === 'virtual' || formData.eventType === 'hybrid';
  if (needsVirtualFields) {
    if (!formData.virtualStartAt) errors.virtualStartAt = 'Virtual window start is required for virtual/hybrid events.';
    if (!formData.virtualEndAt) errors.virtualEndAt = 'Virtual window end is required for virtual/hybrid events.';
    if (!formData.proofTypesAllowed.length) errors.proofTypesAllowed = 'Select at least one proof type.';
    if (formData.virtualCompletionMode === 'accumulated_distance') {
      errors.virtualCompletionMode = 'Accumulated virtual runs can be saved as drafts, but cannot be published until activity-level progress tracking is implemented.';
    }

    const virtualStart = parseDateSafe(formData.virtualStartAt);
    const virtualEnd = parseDateSafe(formData.virtualEndAt);
    if (virtualStart && virtualEnd && virtualStart >= virtualEnd) {
      errors.virtualEndAt = 'Virtual window end must be after virtual window start.';
    }
  }

  validateOptionalCreateEventFields(formData, errors);
  const waiverText = htmlToPlainText(formData.waiverTemplate || '');
  if (!waiverText || waiverText.length < 200) {
    errors.waiverTemplate = 'Waiver template must be at least 200 characters.';
  } else if ((formData.waiverTemplate || '').length > 20000) {
    errors.waiverTemplate = 'Waiver template must be 20,000 characters or less.';
  }

  return errors;
}

function validateOptionalCreateEventFields(formData, errors) {
  if (!isValidUrl(formData.bannerImageUrl)) {
    errors.bannerImageUrl = 'Banner URL must be a valid URL.';
  }
  if (!isValidUrl(formData.logoUrl)) {
    errors.logoUrl = 'Logo URL must be a valid URL.';
  }
  if (!isValidUrl(formData.posterImageUrl)) {
    errors.posterImageUrl = 'Poster URL must be a valid URL.';
  }
  if (Array.isArray(formData.galleryImageUrls) && formData.galleryImageUrls.length > MAX_GALLERY_IMAGES) {
    errors.galleryImageUrls = `Gallery supports up to ${MAX_GALLERY_IMAGES} images.`;
  }
  if (Array.isArray(formData.galleryImageUrls)) {
    const invalidGalleryUrl = formData.galleryImageUrls.find((galleryUrl) => !isValidUrl(galleryUrl));
    if (invalidGalleryUrl) {
      errors.galleryImageUrls = 'Each gallery URL must be a valid URL.';
    }
  }

  const optionalDateFields = [
    'registrationOpenAt',
    'registrationCloseAt',
    'eventStartAt',
    'eventEndAt',
    'virtualStartAt',
    'virtualEndAt',
    'finalSubmissionDeadlineAt'
  ];
  for (const field of optionalDateFields) {
    if (formData[field] && !parseDateSafe(formData[field])) {
      errors[field] = 'Invalid date format.';
    }
  }

  const hasGeoLat = !!formData.geoLat;
  const hasGeoLng = !!formData.geoLng;
  if (hasGeoLat !== hasGeoLng) {
    errors.geo = 'Provide both latitude and longitude, or leave both empty.';
  }
  if (hasGeoLat && hasGeoLng) {
    const lat = Number(formData.geoLat);
    const lng = Number(formData.geoLng);
    if (Number.isNaN(lat) || lat < -90 || lat > 90) {
      errors.geoLat = 'Latitude must be between -90 and 90.';
    }
    if (Number.isNaN(lng) || lng < -180 || lng > 180) {
      errors.geoLng = 'Longitude must be between -180 and 180.';
    }
  }

  if (formData.targetDistanceKm !== null && (!Number.isFinite(formData.targetDistanceKm) || formData.targetDistanceKm <= 0)) {
    errors.targetDistanceKm = 'Target distance must be greater than 0.';
  }
  if (formData.minimumActivityDistanceKm !== null && (!Number.isFinite(formData.minimumActivityDistanceKm) || formData.minimumActivityDistanceKm <= 0)) {
    errors.minimumActivityDistanceKm = 'Minimum activity distance must be greater than 0.';
  }
}

function slugify(input) {
  return String(input || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function getEventTypesAllowed(eventType) {
  if (eventType === 'virtual') return ['virtual'];
  if (eventType === 'onsite') return ['onsite'];
  if (eventType === 'hybrid') return ['virtual', 'onsite'];
  return [];
}

async function generateUniqueSlug(title) {
  const base = slugify(title) || 'event';
  let candidate = base;
  let counter = 2;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const exists = await Event.exists({ slug: candidate });
    if (!exists) return candidate;
    candidate = `${base}-${counter}`;
    counter += 1;
  }
}

async function getOwnedEventOrNull(eventId, userId) {
  if (!mongoose.Types.ObjectId.isValid(eventId)) {
    return null;
  }
  return Event.findOne({ _id: eventId, organizerId: userId });
}

function canAccessRegistrantReview(user) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return user.role === 'organiser' && user.organizerStatus === 'approved';
}

async function getRegistrantAccessibleEventOrNull(eventId, user) {
  if (!user || !mongoose.Types.ObjectId.isValid(eventId)) {
    return null;
  }
  if (user.role === 'admin') {
    return Event.findById(eventId);
  }
  return getOwnedEventOrNull(eventId, user._id);
}

function getStatusTransitionError(currentStatus, nextStatus) {
  const validStatuses = ['draft', 'published', 'closed'];
  if (!validStatuses.includes(nextStatus)) {
    return 'Invalid target status.';
  }
  if (currentStatus === nextStatus) {
    return `Event is already ${currentStatus}.`;
  }

  const allowed = {
    draft: ['published'],
    published: ['closed'],
    closed: []
  };

  if (!allowed[currentStatus] || !allowed[currentStatus].includes(nextStatus)) {
    return `Cannot move event from ${currentStatus} to ${nextStatus}.`;
  }

  return null;
}

function mapUploadFieldToFormField(fieldName) {
  const normalizedField = String(fieldName || '').trim();
  if (normalizedField === 'logoFile') return 'logoUrl';
  if (normalizedField === 'posterImageFile') return 'posterImageUrl';
  if (normalizedField === 'galleryImageFiles') return 'galleryImageUrls';
  return 'bannerImageUrl';
}

function getPublishReadinessErrors(event) {
  const formData = getCreateEventFormDataFromEvent(event);
  formData.actionType = 'publish';
  const errors = validateCreateEventForm(formData);
  return Object.values(errors);
}

module.exports = router;
