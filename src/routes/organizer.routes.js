const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const crypto = require('crypto');
const ExcelJS = require('exceljs');
const User = require('../models/User');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const Submission = require('../models/Submission');
const AccumulatedActivitySubmission = require('../models/AccumulatedActivitySubmission');
const OrganiserApplication = require('../models/OrganiserApplication');
const uploadService = require('../services/upload.service');
const communicationService = require('../services/communication.service');
const { createRateLimiter } = require('../middleware/rate-limit.middleware');
const { requireAuth, requireApprovedOrganizer, requireCanCreateEvents } = require('../middleware/auth.middleware');
const { requireCsrfProtection } = require('../middleware/csrf.middleware');
const { getCountries, isValidCountryCode, normalizeCountryCode, getCountryName } = require('../utils/country');
const { DEFAULT_WAIVER_TEMPLATE, normalizeWaiverTemplate } = require('../utils/waiver');
const { sanitizeHtml, htmlToPlainText } = require('../utils/sanitize');
const { markdownToHtml } = require('../utils/markdown');
const { generateUniqueReferenceCode } = require('../utils/referenceCode');
const { canOrganizerReviewPaymentProof } = require('../utils/payment-workflow');
const { buildSubmissionReviewSignal } = require('../utils/submission-review-labels');
const {
  buildPublicEventView,
  renderEventDetailsContent
} = require('../utils/event-public-view');
const { reviewSubmission } = require('../services/submission.service');
const { recordCriticalAuditEventInBackground } = require('../services/critical-audit.service');
const { syncRegistrationPaymentShadow } = require('../services/registration-payment-shadow.service');
const { recordSyncFailureInBackground } = require('../services/sync-failure.service');
const {
  evaluateRegistrationAchievementsInBackground,
  getRunnerEarnedBadges
} = require('../services/achievement.service');
const {
  generateDefaultEventBadges,
  generateDefaultEventBadgesInBackground,
  getEventBadgesByMongoEventId,
  updateEventBadgeDisplay
} = require('../services/event-badge.service');
const eventFormService = require('../services/event-form.service');
const { tryAutoApproveEvent } = require('../services/event-approval.service');
const {
  reviewAccumulatedActivitySubmission,
  getAccumulatedActivitiesForRegistrations,
  buildAccumulatedProgress
} = require('../services/accumulated-activity.service');
const {
  buildSubmissionHubPath,
  listSubmissionHub,
  listSubmissionHubEvents
} = require('../services/submission-hub.service');
const {
  AUDIT_GROUP_OPTIONS,
  AUDIT_TARGET_TYPE_OPTIONS,
  buildCriticalAuditPath,
  listCriticalAuditEvents,
  listCriticalAuditSignals,
  normalizeCriticalAuditFilters
} = require('../services/critical-audit-query.service');
const onsiteOperationsRoutes = require('./organiser/onsite-operations');
const qrAndDashboardRoutes = require('./organiser/qr-and-dashboard');

const countries = getCountries();
const RACE_DISTANCE_PRESETS = new Set(['3K', '5K', '10K', '21K']);
const MAX_GALLERY_IMAGES = 12;
const PREVIEW_SESSION_TTL_MS = 30 * 60 * 1000;
const MAX_PREVIEW_SESSION_ENTRIES = 5;
const RUN_PROOF_REVIEW_PAGE_SIZE = 50;
const PAYMENT_PROOF_REVIEW_PAGE_SIZE = 50;
const REGISTRANTS_PAGE_SIZE = 100;
const VIRTUAL_COMPLETION_MODES = new Set(['single_activity', 'accumulated_distance']);
const ACCEPTED_RUN_TYPES = new Set(['run', 'walk', 'hike', 'trail_run']);
const RECOGNITION_MODES = new Set(['completion_only', 'completion_with_optional_ranking']);
const LEADERBOARD_MODES = new Set(['finishers', 'top_distance', 'finishers_and_top_distance']);
const FEE_MODES = new Set(['free', 'paid']);
const WAIVER_SANITIZE_OPTIONS = Object.freeze({
  allowedTags: ['div', 'p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'blockquote', 'a'],
  allowedAttributes: {
    a: ['href', 'rel', 'target'],
    div: ['class']
  }
});
const EVENT_DETAILS_SANITIZE_OPTIONS = Object.freeze({
  allowedTags: ['p', 'br', 'strong', 'em', 'u', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'blockquote', 'a', 'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'code'],
  allowedAttributes: {
    a: ['href', 'rel', 'target']
  }
});
const paymentReviewActionLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000,
  maxRequests: 60,
  message: 'Too many payment review actions. Please wait before trying again.'
});
const submissionReviewActionLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000,
  maxRequests: 60,
  message: 'Too many submission review actions. Please wait before trying again.'
});
const registrantExportLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  maxRequests: 10,
  message: 'Too many registrant exports. Please wait a few minutes and try again.'
});

function syncRegistrationPaymentShadowInBackground(registration, context = {}) {
  if (!registration || !registration._id || !process.env.DATABASE_URL) return;
  syncRegistrationPaymentShadow(registration, { operation: 'live_sync' }).catch((error) => {
    console.error('Supabase registration/payment shadow sync failed:', {
      registrationId: String(registration._id),
      error: error?.message || String(error),
      ...context
    });
    recordSyncFailureInBackground('registration', String(registration._id), error, {
      operation: 'live_sync',
      ...context
    });
  });
}

/* ==========================================
   Phase 7: Onsite Operations Routes
   ========================================== */
router.use('/', onsiteOperationsRoutes);
router.use('/', qrAndDashboardRoutes);

function getPreviewSessionStore(req) {
  if (!req.session) return {};
  const now = Date.now();
  const existing = req.session.eventPreviewDrafts && typeof req.session.eventPreviewDrafts === 'object'
    ? req.session.eventPreviewDrafts
    : {};
  const validEntries = Object.entries(existing)
    .filter(([, entry]) => entry && Number(entry.expiresAt || 0) > now)
    .sort((a, b) => Number(b[1].createdAt || 0) - Number(a[1].createdAt || 0))
    .slice(0, MAX_PREVIEW_SESSION_ENTRIES);
  req.session.eventPreviewDrafts = Object.fromEntries(validEntries);
  return req.session.eventPreviewDrafts;
}

function savePreviewSession(req) {
  return new Promise((resolve, reject) => {
    if (!req.session || typeof req.session.save !== 'function') return resolve();
    req.session.save((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

function buildPreviewBackHref(source, eventId) {
  return source === 'edit' && mongoose.Types.ObjectId.isValid(eventId)
    ? `/organizer/events/${eventId}/edit`
    : '/organizer/create-event';
}

/* ==========================================
   UTILITY FUNCTIONS
   ========================================== */

function getRequestIpAddress(req) {
  const forwardedFor = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const directIp = String(req.ip || '').trim();
  return (forwardedFor || directIp).slice(0, 120);
}

function getRequestUserAgent(req) {
  return String(req.get('user-agent') || '').trim().slice(0, 500);
}

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
    const eventQuery = { organizerId: user._id, isDeleted: { $ne: true } };

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

    const [
      registrationMetrics,
      standardSubmissionMetrics,
      accumulatedSubmissionMetrics,
      nextPaymentReview,
      nextResultReview,
      nextAccumulatedResultReview
    ] = await Promise.all([
      getOrganizerDashboardRegistrationMetrics(organizerEventIds, recentEventIds, rangeWindow),
      getOrganizerDashboardSubmissionMetrics(Submission, organizerEventIds, rangeWindow),
      getOrganizerDashboardSubmissionMetrics(AccumulatedActivitySubmission, organizerEventIds, rangeWindow),
      organizerEventIds.length
        ? Registration.findOne({ eventId: { $in: organizerEventIds }, paymentStatus: 'proof_submitted' })
          .sort({ 'paymentProof.uploadedAt': -1, updatedAt: -1, createdAt: -1 })
          .select('eventId')
          .lean()
        : null,
      organizerEventIds.length
        ? Submission.findOne({ eventId: { $in: organizerEventIds }, status: 'submitted' })
          .sort({ submittedAt: -1, updatedAt: -1, createdAt: -1 })
          .select('eventId submittedAt')
          .lean()
        : null,
      organizerEventIds.length
        ? AccumulatedActivitySubmission.findOne({ eventId: { $in: organizerEventIds }, status: 'submitted' })
          .sort({ submittedAt: -1, updatedAt: -1, createdAt: -1 })
          .select('eventId submittedAt')
          .lean()
        : null
    ]);

    const totalRegistrations = registrationMetrics.totalRegistrations;
    const pendingPaymentReviews = registrationMetrics.pendingPaymentReviews;
    const pendingResultReviews = standardSubmissionMetrics.pendingResultReviews;
    const pendingAccumulatedResultReviews = accumulatedSubmissionMetrics.pendingResultReviews;
    const registrationsInRange = registrationMetrics.registrationsInRange;
    const registrationsInPreviousRange = registrationMetrics.registrationsInPreviousRange;
    const submissionsInRange = standardSubmissionMetrics.submissionsInRange + accumulatedSubmissionMetrics.submissionsInRange;
    const approvalsInRange = standardSubmissionMetrics.approvalsInRange + accumulatedSubmissionMetrics.approvalsInRange;
    const submissionsInPreviousRange = standardSubmissionMetrics.submissionsInPreviousRange + accumulatedSubmissionMetrics.submissionsInPreviousRange;
    const approvalsInPreviousRange = standardSubmissionMetrics.approvalsInPreviousRange + accumulatedSubmissionMetrics.approvalsInPreviousRange;

    const recentRegistrationsByEventId = new Map(
      registrationMetrics.recentRegistrationCounts.map((item) => [String(item._id), item.count])
    );
    const pendingResultsByEventId = new Map();
    for (const item of standardSubmissionMetrics.resultQueueCounts) {
      pendingResultsByEventId.set(String(item._id), Number(item.resultPending || 0));
    }
    for (const item of accumulatedSubmissionMetrics.resultQueueCounts) {
      const key = String(item._id);
      pendingResultsByEventId.set(
        key,
        Number(pendingResultsByEventId.get(key) || 0) + Number(item.resultPending || 0)
      );
    }

    const recentEvents = recentEventDocs.map((event) => ({
      id: event._id,
      name: event.title,
      date: event.eventStartAt || event.createdAt,
      location: [event.venueName, event.city, event.country].filter(Boolean).join(', ') || 'TBA',
      status: event.status,
      registrations: recentRegistrationsByEventId.get(String(event._id)) || 0,
      pendingRunProofSubmissions: pendingResultsByEventId.get(String(event._id)) || 0,
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
    for (const item of registrationMetrics.paymentQueueCounts) {
      queueByEventId.set(String(item._id), {
        eventId: String(item._id),
        paymentPending: Number(item.paymentPending || 0),
        resultPending: 0
      });
    }
    for (const item of standardSubmissionMetrics.resultQueueCounts) {
      const key = String(item._id);
      const existing = queueByEventId.get(key) || { eventId: key, paymentPending: 0, resultPending: 0 };
      existing.resultPending = Number(item.resultPending || 0);
      queueByEventId.set(key, existing);
    }
    for (const item of accumulatedSubmissionMetrics.resultQueueCounts) {
      const key = String(item._id);
      const existing = queueByEventId.get(key) || { eventId: key, paymentPending: 0, resultPending: 0 };
      existing.resultPending += Number(item.resultPending || 0);
      queueByEventId.set(key, existing);
    }

    const totalPendingResultReviews = Number(pendingResultReviews || 0) + Number(pendingAccumulatedResultReviews || 0);
    const nextResultCandidates = [nextResultReview, nextAccumulatedResultReview].filter(Boolean);
    const nextPendingResultReview = nextResultCandidates.sort((a, b) => (
      new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime()
    ))[0] || null;

    const topApprovalsByEventId = new Map();
    for (const item of standardSubmissionMetrics.topApprovalsRaw.concat(accumulatedSubmissionMetrics.topApprovalsRaw)) {
      const key = String(item._id);
      topApprovalsByEventId.set(key, Number(topApprovalsByEventId.get(key) || 0) + Number(item.count || 0));
    }
    const topApprovalsRaw = Array.from(topApprovalsByEventId.entries())
      .map(([eventId, count]) => ({ _id: eventId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    const topRegistrationsRaw = registrationMetrics.topRegistrationsRaw;
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
        paymentHref: `/organizer/events/${item.eventId}/payment-proofs/review`,
        resultHref: `/organizer/events/${item.eventId}/run-proofs/review`
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
      href: `/organizer/events/${String(item._id)}/run-proofs/review?status=approved`
    }));
    const topPendingQueue = queueBreakdown.slice(0, 3).map((item) => ({
      eventId: item.eventId,
      eventTitle: item.eventTitle,
      count: item.totalPending,
      href: `/organizer/events/${item.eventId}/registrants`
    }));
    const isApprovedOrganizer = user.role === 'organiser' && user.organizerStatus === 'approved';
    const organiserBadges = isApprovedOrganizer
      ? await getRunnerEarnedBadges(user._id, { limit: 6, badgeScopes: ['organiser'] }).catch((error) => {
          console.error('Error loading organiser dashboard badges:', error);
          return [];
        })
      : [];
    const applicationAction = application && application.status !== 'rejected'
      ? {
          label: 'View Application Status',
          href: '/organizer/application-status',
          description: 'Track your organizer review'
        }
      : {
          label: application?.status === 'rejected' ? 'Submit Updated Application' : 'Start Organizer Application',
          href: application?.status === 'rejected' ? '/organizer/complete-profile?edit=1' : '/organizer/complete-profile',
          description: 'Complete your business information and upload documents'
        };
    const quickActions = isApprovedOrganizer
      ? [
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
            icon: 'clipboard-list',
            label: 'All Run Submissions',
            href: '/organizer/submissions',
            description: 'Browse run proofs across events'
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
        ]
      : user.organizerStatus === 'pending'
        ? [
            {
              icon: 'plus-circle',
              label: 'Create New Event',
              href: '#pending-create-event-modal',
              description: 'Set up a new running event',
              pendingCreateEvent: true
            },
            {
              icon: 'file-check',
              label: applicationAction.label,
              href: applicationAction.href,
              description: applicationAction.description,
              targetBlank: true
            }
          ]
        : [
            {
              icon: application ? 'file-check' : 'file-plus-2',
              label: applicationAction.label,
              href: applicationAction.href,
              description: applicationAction.description,
              targetBlank: true
            }
          ];

    // Build dashboard data
    const dashboardData = {
      title: 'Organizer Dashboard - HelloRun',
      user: user,
      application: application || null,
      adminEmail: process.env.ADMIN_EMAIL || 'hellorunonline@gmail.com',
      stats: {
        totalEvents,
        activeEvents,
        totalRegistrations,
        upcomingEvents,
        pendingPaymentReviews,
        pendingResultReviews: totalPendingResultReviews
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
        pendingResultReviews: totalPendingResultReviews,
        paymentReviewHref: nextPaymentReview?.eventId
          ? `/organizer/events/${String(nextPaymentReview.eventId)}/payment-proofs/review`
          : '/organizer/events',
        resultReviewHref: nextPendingResultReview?._id && nextPendingResultReview?.eventId
          ? `/organizer/events/${String(nextPendingResultReview.eventId)}/submissions/${String(nextPendingResultReview._id)}/review`
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
      organiserBadges,
      isApprovedOrganizer,
      applicationAction,
      quickActions,
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
   POST: Acknowledge Event Creation (Pending Organizers)
   ========================================== */

router.post('/acknowledge-event-creation', requireAuth, requireCsrfProtection, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    if (!user || user.role !== 'organiser') {
      return res.status(403).render('error', {
        title: '403 - Access Denied',
        status: 403,
        message: 'Access denied.'
      });
    }

    if (user.organizerStatus === 'approved') {
      return res.redirect('/organizer/create-event');
    }

    if (user.organizerStatus !== 'pending') {
      return res.redirect('/organizer/dashboard?ack_error=not_pending');
    }

    const { agreedCheckbox, signatureName } = req.body;
    if (!agreedCheckbox || agreedCheckbox !== '1') {
      return res.redirect('/organizer/dashboard?ack_error=checkbox');
    }

    const trimmedName = (signatureName || '').trim();
    if (!trimmedName || trimmedName.length < 3) {
      return res.redirect('/organizer/dashboard?ack_error=signature');
    }

    const accountFullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
    const normalize = (s) => s.trim().toLowerCase().replace(/\s+/g, ' ');
    if (normalize(trimmedName) !== normalize(accountFullName)) {
      return res.redirect('/organizer/dashboard?ack_error=signature_mismatch');
    }

    user.organizerEventCreationAcknowledgement = {
      agreedAt: new Date(),
      signatureName: trimmedName,
      ipAddress: String(req.headers['x-forwarded-for'] || req.ip || '').split(',')[0].trim().slice(0, 120),
      userAgent: String(req.headers['user-agent'] || '').slice(0, 500)
    };
    await user.save();

    return res.redirect('/organizer/create-event');
  } catch (error) {
    console.error('Error saving event creation acknowledgement:', error);
    return res.redirect('/organizer/dashboard?ack_error=server');
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
    console.error('Error creating event preview session:', error);
    return res.status(500).json({ ok: false, message: 'An error occurred while preparing the event preview.' });
  }
});

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
    console.error('Error refreshing event readiness:', error);
    return res.status(500).json({ ok: false, message: 'An error occurred while refreshing event readiness.' });
  }
});

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
    console.error('Error loading organizer events:', error);
    return res.status(500).render('error', {
      title: 'Server Error',
      status: 500,
      message: 'An error occurred while loading your events.'
    });
  }
});

router.get('/submissions', requireAuth, async (req, res) => {
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
        message: 'Only approved organizers or admins can view run submissions.'
      });
    }

    const accessibleEvents = user.role === 'admin'
      ? await Event.find({ isDeleted: { $ne: true } }).select('_id').lean()
      : await Event.find({ organizerId: user._id, isDeleted: { $ne: true } }).select('_id').lean();
    const eventIds = accessibleEvents.map((event) => String(event._id));
    const [hub, events] = await Promise.all([
      listSubmissionHub({ filters: req.query, eventIds }),
      listSubmissionHubEvents({ eventIds })
    ]);
    const basePath = '/organizer/submissions';

    return res.render('organizer/submissions', {
      title: 'Run Submissions - HelloRun Organizer',
      user,
      isAdminViewer: user.role === 'admin',
      filters: hub.filters,
      submissions: hub.items,
      counts: hub.counts,
      pagination: hub.pagination,
      events,
      links: {
        all: buildSubmissionHubPath(basePath, hub.filters, { status: 'all', page: 1 }),
        submitted: buildSubmissionHubPath(basePath, hub.filters, { status: 'submitted', page: 1 }),
        approved: buildSubmissionHubPath(basePath, hub.filters, { status: 'approved', page: 1 }),
        rejected: buildSubmissionHubPath(basePath, hub.filters, { status: 'rejected', page: 1 }),
        prev: hub.pagination.page > 1 ? buildSubmissionHubPath(basePath, hub.filters, { page: hub.pagination.page - 1 }) : '',
        next: hub.pagination.page < hub.pagination.totalPages ? buildSubmissionHubPath(basePath, hub.filters, { page: hub.pagination.page + 1 }) : '',
        reset: basePath,
        events: '/organizer/events',
        dashboard: user.role === 'admin' ? '/admin/dashboard' : '/organizer/dashboard'
      }
    });
  } catch (error) {
    console.error('Error loading organizer submissions:', error);
    return res.status(500).render('error', {
      title: 'Server Error',
      status: 500,
      message: 'An error occurred while loading run submissions.'
    });
  }
});

/* ==========================================
   GET: Submission Review Panel (AJAX, JSON)
   ========================================== */

router.get('/submissions/:submissionId/review-panel', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId).select('firstName lastName email role organizerStatus');
    if (!user || !canAccessRegistrantReview(user)) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const submissionId = String(req.params.submissionId || '').trim();
    if (!mongoose.Types.ObjectId.isValid(submissionId)) {
      return res.status(404).json({ success: false, message: 'Submission not found.' });
    }

    // Find submission and resolve event for access check
    let submission = await Submission.findById(submissionId)
      .populate([
        { path: 'reviewedBy', select: 'firstName lastName email' },
        { path: 'runnerId', select: 'firstName lastName email mobile country gender' },
        { path: 'registrationId', select: 'participant confirmationCode raceDistance participationMode status paymentStatus' }
      ])
      .lean();
    let submissionKind = 'standard';

    if (!submission) {
      submission = await AccumulatedActivitySubmission.findById(submissionId)
        .populate([
          { path: 'reviewedBy', select: 'firstName lastName email' },
          { path: 'runnerId', select: 'firstName lastName email mobile country gender' },
          { path: 'registrationId', select: 'participant confirmationCode raceDistance participationMode status paymentStatus' }
        ])
        .lean();
      submissionKind = submission ? 'accumulated' : '';
    }
    if (!submission) return res.status(404).json({ success: false, message: 'Submission not found.' });

    const event = await getRegistrantAccessibleEventOrNull(submission.eventId, user);
    if (!event) return res.status(403).json({ success: false, message: 'Access denied to this event.' });

    const registration = submission.registrationId || null;
    const participant = registration?.participant || {};
    const runner = submission.runnerId || {};
    const reviewed = submission.reviewedBy || {};
    const ocrData = submission.ocrData || {};

    const elapsedMs = Number(submission.elapsedMs || 0);
    const totalSec = Math.floor(elapsedMs / 1000);
    const elapsedLabel = [
      String(Math.floor(totalSec / 3600)).padStart(2, '0'),
      String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0'),
      String(totalSec % 60).padStart(2, '0')
    ].join(':');

    const runDate = submission.runDate ? new Date(submission.runDate) : null;
    const runDateLabel = runDate ? runDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A';

    const ocrTimeMs = Number(ocrData.extractedTimeMs);
    let ocrTimeLabel = '';
    if (Number.isFinite(ocrTimeMs) && ocrTimeMs > 0) {
      const s = Math.floor(ocrTimeMs / 1000);
      ocrTimeLabel = `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
    }

    const proofPath = String(submission.proof?.url || '');
    const proofMime = String(submission.proof?.mimeType || '');
    const isImage = proofMime.startsWith('image/') || /\.(png|jpe?g|gif|webp)$/i.test(proofPath);

    return res.json({
      success: true,
      submission: {
        id: String(submission._id),
        status: submission.status || 'submitted',
        submissionKind,
        participantName: [participant.firstName, participant.lastName].filter(Boolean).join(' ').trim() || [runner.firstName, runner.lastName].filter(Boolean).join(' ').trim() || 'N/A',
        participantEmail: participant.email || runner.email || 'N/A',
        eventTitle: event.title || 'Event',
        confirmationCode: registration?.confirmationCode || 'N/A',
        raceDistance: registration?.raceDistance || submission.raceDistance || 'N/A',
        participationMode: registration?.participationMode || submission.participationMode || 'N/A',
        distanceKm: Number(submission.distanceKm || 0).toFixed(2),
        elapsedLabel,
        runDateLabel,
        runType: String(submission.runType || 'run'),
        runLocation: String(submission.runLocation || '').trim(),
        proofUrl: proofPath,
        proofMimeType: proofMime,
        isProofImage: isImage,
        proofTypeLabel: String(submission.proofType || 'manual').toUpperCase(),
        sourceLabel: getSubmissionSourceLabel(submission),
        suspiciousFlag: Boolean(submission.suspiciousFlag),
        suspiciousFlagReason: String(submission.suspiciousFlagReason || '').trim(),
        reviewSignal: buildSubmissionReviewSignal(submission),
        ocrData: {
          confidence: Math.round(Number(ocrData.confidence || 0) * 100),
          extractedDistanceKm: ocrData.extractedDistanceKm != null ? Number(ocrData.extractedDistanceKm).toFixed(2) : null,
          distanceMismatch: Boolean(ocrData.distanceMismatch),
          ocrTimeLabel,
          timeMismatch: Boolean(ocrData.timeMismatch),
          extractedRunDate: ocrData.extractedRunDate ? new Date(ocrData.extractedRunDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : null,
          dateMismatch: Boolean(ocrData.dateMismatch),
          extractedRunLocation: ocrData.extractedRunLocation || null,
          locationMismatch: Boolean(ocrData.locationMismatch),
          nameMatchStatus: ocrData.nameMatchStatus || null,
          extractedName: ocrData.extractedName || null
        },
        reviewedByName: [reviewed.firstName, reviewed.lastName].filter(Boolean).join(' ').trim() || '',
        rejectionReason: String(submission.rejectionReason || '').trim(),
        reviewNotes: String(submission.reviewNotes || '').trim(),
        reviewedAtLabel: submission.reviewedAt ? new Date(submission.reviewedAt).toLocaleString('en-US') : '',
        approveUrl: `/organizer/events/${String(event._id)}/submissions/${String(submission._id)}/approve`,
        rejectUrl: `/organizer/events/${String(event._id)}/submissions/${String(submission._id)}/reject`,
        fullPageUrl: `/organizer/events/${String(event._id)}/submissions/${String(submission._id)}/review`
      }
    });
  } catch (error) {
    console.error('Submission review panel error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load submission details.' });
  }
});

/* ==========================================
   POST: Bulk Approve Submissions
   ========================================== */

router.post('/submissions/bulk-approve', requireAuth, requireCsrfProtection, submissionReviewActionLimiter, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId).select('firstName lastName email role organizerStatus');
    if (!user || !canAccessRegistrantReview(user)) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const rawIds = Array.isArray(req.body.submissionIds)
      ? req.body.submissionIds
      : String(req.body.submissionIds || '').split(',').filter(Boolean);
    const submissionIds = rawIds.map((id) => String(id).trim()).filter(Boolean).slice(0, 50);
    if (!submissionIds.length) {
      return res.redirect('/organizer/submissions?' + new URLSearchParams({ type: 'error', msg: 'No submissions selected.' }).toString());
    }

    const reviewNotes = String(req.body.reviewNotes || '').trim().slice(0, 1200);
    const results = await Promise.allSettled(
      submissionIds.map((id) =>
        reviewSubmission({
          submissionId: id,
          organizerId: user._id,
          reviewerRole: user.role === 'admin' ? 'admin' : 'organiser',
          action: 'approve',
          reviewNotes
        })
      )
    );

    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.length - succeeded;
    const msg = failed > 0
      ? `${succeeded} submission${succeeded !== 1 ? 's' : ''} approved. ${failed} skipped (already reviewed or inaccessible).`
      : `${succeeded} submission${succeeded !== 1 ? 's' : ''} approved.`;

    return res.redirect('/organizer/submissions?' + new URLSearchParams({ type: 'success', msg }).toString());
  } catch (error) {
    console.error('Bulk submission approve error:', error);
    return res.redirect('/organizer/submissions?' + new URLSearchParams({ type: 'error', msg: 'An error occurred during bulk approval.' }).toString());
  }
});

/* ==========================================
   POST: Bulk Approve Payment Proofs
   ========================================== */

router.post('/events/:id/payment-reviews/bulk-approve', requireAuth, requireCsrfProtection, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId).select('firstName lastName email role organizerStatus');
    if (!user || !canAccessRegistrantReview(user)) {
      return res.status(403).render('error', { title: '403 - Access Denied', status: 403, message: 'Access denied.' });
    }

    const event = await getRegistrantAccessibleEventOrNull(req.params.id, user);
    if (!event) {
      return res.status(404).render('error', { title: '404 - Not Found', status: 404, message: 'Event not found.' });
    }

    const rawIds = Array.isArray(req.body.registrationIds)
      ? req.body.registrationIds
      : String(req.body.registrationIds || '').split(',').filter(Boolean);
    const registrationIds = rawIds.map((id) => String(id).trim()).filter(Boolean).slice(0, 50);
    if (!registrationIds.length) {
      const q = new URLSearchParams({ type: 'error', msg: 'No payment proofs selected.' });
      return res.redirect(`/organizer/events/${event._id}/payment-proof-review?${q}`);
    }

    const reviewNotes = String(req.body.reviewNotes || '').trim().slice(0, 1000);

    const results = await Promise.allSettled(
      registrationIds.map(async (regId) => {
        const registration = await Registration.findOne({ _id: regId, eventId: event._id });
        if (!registration || !canOrganizerReviewPaymentProof(registration)) throw new Error('Skipped');
        const previousStatus = registration.paymentStatus;
        registration.paymentStatus = 'paid';
        registration.paymentReviewedAt = new Date();
        registration.paymentReviewedBy = user._id;
        registration.paymentReviewNotes = reviewNotes;
        registration.paymentRejectionReason = '';
        await registration.save();
        evaluateRegistrationAchievementsInBackground(registration, { performedBy: user._id });
        recordCriticalAuditEventInBackground({
          actorMongoUserId: user._id,
          action: 'payment.approved',
          targetType: 'registration',
          targetId: String(registration._id),
          statusFrom: previousStatus,
          statusTo: 'paid',
          notes: reviewNotes || `Bulk payment approval for ${registration.confirmationCode || registration._id}.`,
          ipAddress: getRequestIpAddress(req),
          userAgent: getRequestUserAgent(req),
          occurredAt: registration.paymentReviewedAt
        });
        const runner = await User.findById(registration.userId).select('email firstName');
        communicationService.notify('payment.approved', {
          notification: { userId: registration.userId, type: 'payment_approved', title: 'Payment Approved', message: `Your payment for ${event.title || 'the event'} has been approved.`, href: '/my-registrations', metadata: { registrationId: String(registration._id), eventId: String(event._id), eventTitle: event.title || '' } },
          email: runner?.email ? { to: runner.email, firstName: runner.firstName || 'Runner', eventTitle: event.title || 'Event', confirmationCode: registration.confirmationCode || '', recipientUserId: registration.userId, metadata: { registrationId: String(registration._id), eventId: String(event._id) } } : null
        }).catch(() => {});
      })
    );

    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.length - succeeded;
    const msg = failed > 0
      ? `${succeeded} payment${succeeded !== 1 ? 's' : ''} approved. ${failed} skipped.`
      : `${succeeded} payment${succeeded !== 1 ? 's' : ''} approved.`;

    const q = new URLSearchParams({ type: 'success', msg });
    return res.redirect(`/organizer/events/${event._id}/payment-proof-review?${q}`);
  } catch (error) {
    console.error('Bulk payment approve error:', error);
    const q = new URLSearchParams({ type: 'error', msg: 'An error occurred during bulk approval.' });
    return res.redirect(`/organizer/events/${req.params.id}/payment-proof-review?${q}`);
  }
});

/* ==========================================
   POST: Email All Unpaid Registrants
   ========================================== */

router.post('/events/:id/registrants/email-unpaid', requireAuth, requireCsrfProtection, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId).select('firstName lastName email role organizerStatus');
    if (!user || !canAccessRegistrantReview(user)) {
      return res.status(403).render('error', { title: '403 - Access Denied', status: 403, message: 'Access denied.' });
    }

    const event = await getRegistrantAccessibleEventOrNull(req.params.id, user);
    if (!event) {
      return res.status(404).render('error', { title: '404 - Not Found', status: 404, message: 'Event not found.' });
    }

    const unpaidRegistrations = await Registration.find({
      eventId: event._id,
      status: 'confirmed',
      paymentStatus: { $in: ['unpaid', 'proof_rejected'] }
    }).limit(100).select('_id userId confirmationCode').lean();

    if (!unpaidRegistrations.length) {
      const q = new URLSearchParams({ type: 'error', msg: 'No unpaid registrants to email.' });
      return res.redirect(`/organizer/events/${event._id}/registrants?${q}`);
    }

    const runnerIds = Array.from(new Set(
      unpaidRegistrations
        .map((reg) => String(reg.userId || '').trim())
        .filter((id) => mongoose.Types.ObjectId.isValid(id))
    ));
    const runnerRows = runnerIds.length
      ? await User.find({ _id: { $in: runnerIds } }).select('email firstName').lean()
      : [];
    const runnersById = new Map(runnerRows.map((runner) => [String(runner._id), runner]));
    const appUrl = String(process.env.APP_URL || '').replace(/\/$/, '');
    await Promise.allSettled(
      unpaidRegistrations.map(async (reg) => {
        const runner = runnersById.get(String(reg.userId || ''));
        if (!runner?.email) return;
        communicationService.notify('organiser.payment_reminder', {
          email: {
            to: runner.email,
            firstName: runner.firstName || 'Runner',
            eventTitle: event.title || 'Event',
            eventUrl: `${appUrl}/events/${event.slug}`,
            confirmationCode: reg.confirmationCode || '',
            recipientUserId: reg.userId,
            metadata: { registrationId: String(reg._id), eventId: String(event._id) }
          }
        }).catch(() => {});
      })
    );

    recordCriticalAuditEventInBackground({
      actorMongoUserId: user._id,
      action: 'organiser.payment_reminder_sent',
      targetType: 'event',
      targetId: String(event._id),
      notes: `Payment reminder sent to ${unpaidRegistrations.length} unpaid registrant(s).`,
      ipAddress: getRequestIpAddress(req),
      userAgent: getRequestUserAgent(req),
      occurredAt: new Date()
    });

    const q = new URLSearchParams({ type: 'success', msg: `Payment reminder sent to ${unpaidRegistrations.length} runner${unpaidRegistrations.length !== 1 ? 's' : ''}.` });
    return res.redirect(`/organizer/events/${event._id}/registrants?${q}`);
  } catch (error) {
    console.error('Bulk email unpaid error:', error);
    const q = new URLSearchParams({ type: 'error', msg: 'An error occurred while sending emails.' });
    return res.redirect(`/organizer/events/${req.params.id}/registrants?${q}`);
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
      eventDetailsHtml: renderEventDetailsMarkdown(event.eventDetailsMarkdown),
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
    console.error('Error loading organizer event audit trail:', error);
    return res.status(500).render('error', {
      title: 'Server Error',
      status: 500,
      message: 'An error occurred while loading the event audit trail.'
    });
  }
});

router.get('/events/:id/badges', requireApprovedOrganizer, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    const event = await getOwnedEventOrNull(req.params.id, user?._id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found or inaccessible.' });
    }

    const badges = await getEventBadgesByMongoEventId(event._id);
    return res.json({ success: true, badges });
  } catch (error) {
    console.error('Organizer event badges load error:', error);
    return res.status(500).json({ success: false, message: 'Unable to load event badges.' });
  }
});

router.get('/events/:id/badges/manage', requireApprovedOrganizer, async (req, res) => {
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
      console.error('Organizer badge manager generation error:', error);
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
    console.error('Organizer badge manager load error:', error);
    return res.status(500).render('error', {
      title: 'Server Error',
      status: 500,
      message: 'An error occurred while loading the badge manager.'
    });
  }
});

router.post('/events/:id/badges/:badgeId', requireApprovedOrganizer, requireCsrfProtection, async (req, res) => {
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
    console.error('Organizer event badge update error:', error);
    if (!acceptsJson(req)) {
      return res.redirect(`/organizer/events/${req.params.id}/badges/manage?type=error&msg=Unable%20to%20update%20event%20badge.`);
    }
    return res.status(500).json({ success: false, message: 'Unable to update event badge.' });
  }
});

router.post('/events/:id/badges/:badgeId/image', requireApprovedOrganizer, uploadService.uploadBadgeImage, requireCsrfProtection, async (req, res) => {
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
    console.error('Badge image upload error:', error);
    return res.status(500).json({ success: false, message: 'Badge image upload failed.' });
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
      selectedResultStatus,
      requestedPage
    } = filterContext;

    const registrantQuery = { ...query };
    if (selectedResultStatus) {
      registrantQuery._id = {
        $in: await getRegistrationIdsWithSubmissionStatus(event._id, selectedResultStatus)
      };
    }

    const filteredRegistrantsCount = await Registration.countDocuments(registrantQuery);
    const totalPages = Math.max(1, Math.ceil(filteredRegistrantsCount / REGISTRANTS_PAGE_SIZE));
    const page = Math.min(requestedPage, totalPages);
    const pageStart = (page - 1) * REGISTRANTS_PAGE_SIZE;

    const registrationsRaw = filteredRegistrantsCount > 0
      ? await Registration.find(registrantQuery)
        .sort({ registeredAt: -1 })
        .skip(pageStart)
        .limit(REGISTRANTS_PAGE_SIZE)
        .lean()
      : [];

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
        .select('registrationId status distanceKm elapsedMs runDate runLocation proofType proof submittedAt reviewedAt reviewedBy reviewNotes rejectionReason ocrData runType elevationGain steps suspiciousFlag suspiciousFlagReason validation')
        .populate('reviewedBy', 'firstName lastName')
        .lean()
      : [];
    const submissionsByRegistrationId = new Map(
      submissions.map((item) => [String(item.registrationId), item])
    );
    const [
      accumulatedActivities,
      accumulatedProgressActivities
    ] = registrationIds.length
      ? await Promise.all([
        getAccumulatedActivitiesForRegistrations(registrationIds, selectedResultStatus ? { status: selectedResultStatus } : {}),
        selectedResultStatus
          ? getAccumulatedActivitiesForRegistrations(registrationIds)
          : Promise.resolve([])
      ])
      : [[], []];
    const accumulatedActivitiesByRegistrationId = new Map();
    for (const activity of accumulatedActivities) {
      const key = String(activity.registrationId);
      const current = accumulatedActivitiesByRegistrationId.get(key) || [];
      current.push(activity);
      accumulatedActivitiesByRegistrationId.set(key, current);
    }
    const accumulatedProgressActivitiesByRegistrationId = selectedResultStatus
      ? new Map()
      : accumulatedActivitiesByRegistrationId;
    if (selectedResultStatus) {
      for (const activity of accumulatedProgressActivities) {
        const key = String(activity.registrationId);
        const current = accumulatedProgressActivitiesByRegistrationId.get(key) || [];
        current.push(activity);
        accumulatedProgressActivitiesByRegistrationId.set(key, current);
      }
    }

    const registrations = registrationsRaw.map((item) => ({
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
      expectedPaymentLabel: formatExpectedPaymentLabel(item, event),
      signupOptionLabel: item.pricingSnapshot?.optionDescription || '',
      pricingPeriodLabel: item.pricingSnapshot?.pricingPeriodLabel || '',
      accumulatedProgress: event.virtualCompletionMode === 'accumulated_distance'
        ? buildAccumulatedProgress({
          activities: accumulatedProgressActivitiesByRegistrationId.get(String(item._id)) || [],
          targetDistanceKm: event.targetDistanceKm
        })
        : null,
      submission: mapSubmissionForRegistrant(
        submissionsByRegistrationId.get(String(item._id)) ||
          (accumulatedActivitiesByRegistrationId.get(String(item._id)) || [])[0],
        {
          isAccumulatedActivity: !submissionsByRegistrationId.has(String(item._id)) &&
            Boolean((accumulatedActivitiesByRegistrationId.get(String(item._id)) || [])[0])
        }
      )
    }));

    const [
      registrationSummaryCounts,
      standardSubmissionSummaryCounts,
      accumulatedSubmissionSummaryCounts
    ] = await Promise.all([
      getEventRegistrationSummaryCounts(event._id),
      getEventSubmissionSummaryCounts(Submission, event._id),
      event.virtualCompletionMode === 'accumulated_distance'
        ? getEventSubmissionSummaryCounts(AccumulatedActivitySubmission, event._id)
        : { submitted: 0, approved: 0, rejected: 0 }
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
        totalRegistrants: registrationSummaryCounts.totalRegistrants,
        virtualCount: registrationSummaryCounts.virtualCount,
        onsiteCount: registrationSummaryCounts.onsiteCount,
        proofSubmittedCount: registrationSummaryCounts.proofSubmittedCount,
        paidCount: registrationSummaryCounts.paidCount,
        proofRejectedCount: registrationSummaryCounts.proofRejectedCount,
        unpaidCount: registrationSummaryCounts.unpaidCount,
        submissionSubmittedCount: standardSubmissionSummaryCounts.submitted + accumulatedSubmissionSummaryCounts.submitted,
        submissionApprovedCount: standardSubmissionSummaryCounts.approved + accumulatedSubmissionSummaryCounts.approved,
        submissionRejectedCount: standardSubmissionSummaryCounts.rejected + accumulatedSubmissionSummaryCounts.rejected
      },
      message: getPageMessage(req.query),
      pagination: {
        page,
        totalPages,
        totalItems: filteredRegistrantsCount,
        pageSize: REGISTRANTS_PAGE_SIZE,
        prevHref: page > 1 ? buildRegistrantListPath(event._id, filterContext, { page: page - 1 }) : '',
        nextHref: page < totalPages ? buildRegistrantListPath(event._id, filterContext, { page: page + 1 }) : ''
      }
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

router.get('/events/:eventId/payment-proofs/review', requireAuth, async (req, res) => {
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
        message: 'Only approved organizers or admins can review payment proofs.'
      });
    }

    const event = await getRegistrantAccessibleEventOrNull(req.params.eventId, user);
    if (!event) {
      return res.status(404).render('error', {
        title: '404 - Event Not Found',
        status: 404,
        message: 'Event not found or you do not have access.'
      });
    }

    const filters = normalizePaymentProofReviewFilters(req.query);
    const statusQuery = getPaymentProofReviewStatusQuery(filters.status);
    const query = {
      eventId: event._id,
      paymentStatus: statusQuery
    };

    if (filters.q) {
      const safePattern = new RegExp(escapeRegex(filters.q), 'i');
      query.$or = [
        { confirmationCode: safePattern },
        { 'participant.firstName': safePattern },
        { 'participant.lastName': safePattern },
        { 'participant.email': safePattern }
      ];
    }

    const [totalItems, pendingCount, paidCount, rejectedCount] = await Promise.all([
      Registration.countDocuments(query),
      Registration.countDocuments({ eventId: event._id, paymentStatus: 'proof_submitted' }),
      Registration.countDocuments({ eventId: event._id, paymentStatus: 'paid' }),
      Registration.countDocuments({ eventId: event._id, paymentStatus: 'proof_rejected' })
    ]);

    const totalPages = Math.max(1, Math.ceil(totalItems / PAYMENT_PROOF_REVIEW_PAGE_SIZE));
    const page = Math.min(filters.page, totalPages);
    const pageStart = (page - 1) * PAYMENT_PROOF_REVIEW_PAGE_SIZE;
    filters.page = page;

    const registrationsRaw = totalItems > 0
      ? await Registration.find(query)
        .sort({ 'paymentProof.uploadedAt': -1, paymentReviewedAt: -1, updatedAt: -1, registeredAt: -1 })
        .skip(pageStart)
        .limit(PAYMENT_PROOF_REVIEW_PAGE_SIZE)
        .populate('paymentReviewedBy', 'firstName lastName email')
        .lean()
      : [];

    const reviewItems = registrationsRaw.map((registration) => buildPaymentProofReviewRow(registration, event));
    const reviewedCount = paidCount + rejectedCount;

    return res.render('organizer/payment-proof-review', {
      title: `Payment Proof Review - ${event.title}`,
      user,
      isAdminViewer: user.role === 'admin',
      event,
      filters,
      reviewItems,
      message: getPageMessage(req.query),
      counts: {
        pending: pendingCount,
        reviewed: reviewedCount,
        rejected: rejectedCount,
        paid: paidCount
      },
      pagination: {
        page,
        totalPages,
        totalItems,
        pageSize: PAYMENT_PROOF_REVIEW_PAGE_SIZE,
        prevHref: page > 1 ? buildPaymentProofReviewPath(event._id, filters, { page: page - 1 }) : '',
        nextHref: page < totalPages ? buildPaymentProofReviewPath(event._id, filters, { page: page + 1 }) : ''
      },
      links: {
        pending: buildPaymentProofReviewPath(event._id, filters, { status: 'pending', page: 1 }),
        approved: buildPaymentProofReviewPath(event._id, filters, { status: 'approved', page: 1 }),
        rejected: buildPaymentProofReviewPath(event._id, filters, { status: 'rejected', page: 1 }),
        all: buildPaymentProofReviewPath(event._id, filters, { status: 'all', page: 1 }),
        reset: `/organizer/events/${event._id}/payment-proofs/review`,
        registrants: `/organizer/events/${event._id}/registrants`
      }
    });
  } catch (error) {
    console.error('Error loading payment proof review:', error);
    return res.status(500).render('error', {
      title: 'Server Error',
      status: 500,
      message: 'An error occurred while loading payment proof review.'
    });
  }
});

router.get('/events/:eventId/run-proofs/review', requireAuth, async (req, res) => {
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
        message: 'Only approved organizers or admins can review run proofs.'
      });
    }

    const event = await getRegistrantAccessibleEventOrNull(req.params.eventId, user);
    if (!event) {
      return res.status(404).render('error', {
        title: '404 - Event Not Found',
        status: 404,
        message: 'Event not found or you do not have access.'
      });
    }

    const filters = normalizeRunProofReviewFilters(req.query);
    const submissionQuery = await buildRunProofReviewQuery(event._id, filters);
    const sortSpec = getRunProofReviewSortSpec(filters.sort);
    const populate = [
      { path: 'reviewedBy', select: 'firstName lastName email' },
      { path: 'registrationId', select: 'participant confirmationCode raceDistance participationMode' }
    ];

    const [
      standardTotal,
      accumulatedTotal,
      standardPending,
      standardApproved,
      standardRejected,
      accumulatedPending,
      accumulatedApproved,
      standardAutoApproved,
      accumulatedAutoApproved,
      accumulatedRejected
    ] = await Promise.all([
      Submission.countDocuments(submissionQuery),
      AccumulatedActivitySubmission.countDocuments(submissionQuery),
      Submission.countDocuments({ eventId: event._id, status: 'submitted' }),
      Submission.countDocuments({ eventId: event._id, status: 'approved' }),
      Submission.countDocuments({ eventId: event._id, status: 'rejected' }),
      AccumulatedActivitySubmission.countDocuments({ eventId: event._id, status: 'submitted' }),
      AccumulatedActivitySubmission.countDocuments({ eventId: event._id, status: 'approved' }),
      Submission.countDocuments({ eventId: event._id, status: 'approved', $or: [{ reviewedBy: null }, { reviewedBy: { $exists: false } }] }),
      AccumulatedActivitySubmission.countDocuments({ eventId: event._id, status: 'approved', $or: [{ reviewedBy: null }, { reviewedBy: { $exists: false } }] }),
      AccumulatedActivitySubmission.countDocuments({ eventId: event._id, status: 'rejected' })
    ]);

    const totalItems = standardTotal + accumulatedTotal;
    const totalPages = Math.max(1, Math.ceil(totalItems / RUN_PROOF_REVIEW_PAGE_SIZE));
    const page = Math.min(filters.page, totalPages);
    const pageStart = (page - 1) * RUN_PROOF_REVIEW_PAGE_SIZE;
    const pageEnd = pageStart + RUN_PROOF_REVIEW_PAGE_SIZE;
    const queryLimit = Math.max(pageEnd, RUN_PROOF_REVIEW_PAGE_SIZE);
    filters.page = page;

    const [standardDocs, accumulatedDocs] = totalItems > 0
      ? await Promise.all([
        Submission.find(submissionQuery).sort(sortSpec).limit(queryLimit).populate(populate).lean(),
        AccumulatedActivitySubmission.find(submissionQuery).sort(sortSpec).limit(queryLimit).populate(populate).lean()
      ])
      : [[], []];

    const reviewItems = mergeRunProofReviewDocs(standardDocs, accumulatedDocs, filters.sort)
      .slice(pageStart, pageEnd)
      .map((item) => buildRunProofReviewRow(item.submission, event, filters, item.submissionKind));

    const pendingCount = standardPending + accumulatedPending;
    const approvedCount = standardApproved + accumulatedApproved;
    const autoApprovedCount = standardAutoApproved + accumulatedAutoApproved;
    const rejectedCount = standardRejected + accumulatedRejected;

    return res.render('organizer/run-proof-review', {
      title: `Run Proof Review - ${event.title}`,
      user,
      isAdminViewer: user.role === 'admin',
      event,
      filters,
      reviewItems,
      message: getPageMessage(req.query),
      counts: {
        pending: pendingCount,
        all: pendingCount + approvedCount + rejectedCount,
        reviewed: approvedCount + rejectedCount,
        approved: approvedCount,
        autoApproved: autoApprovedCount,
        rejected: rejectedCount
      },
      pagination: {
        page,
        totalPages,
        totalItems,
        pageSize: RUN_PROOF_REVIEW_PAGE_SIZE,
        prevHref: page > 1 ? buildRunProofReviewPath(event._id, filters, { page: page - 1 }) : '',
        nextHref: page < totalPages ? buildRunProofReviewPath(event._id, filters, { page: page + 1 }) : ''
      },
      links: {
        pending: buildRunProofReviewPath(event._id, filters, { status: 'pending', sort: 'oldest', page: 1 }),
        approved: buildRunProofReviewPath(event._id, filters, { status: 'approved', sort: 'newest', page: 1 }),
        autoApproved: buildRunProofReviewPath(event._id, filters, { status: 'auto-approved', sort: 'newest', page: 1 }),
        rejected: buildRunProofReviewPath(event._id, filters, { status: 'rejected', sort: 'newest', page: 1 }),
        all: buildRunProofReviewPath(event._id, filters, { status: 'all', sort: 'newest', page: 1 }),
        reset: `/organizer/events/${event._id}/run-proofs/review`,
        registrants: `/organizer/events/${event._id}/registrants`
      }
    });
  } catch (error) {
    console.error('Error loading run proof review:', error);
    return res.status(500).render('error', {
      title: 'Server Error',
      status: 500,
      message: 'An error occurred while loading run proof review.'
    });
  }
});

router.get('/events/:id/submissions/:submissionId/review', requireAuth, async (req, res) => {
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

    const context = await getSubmissionReviewContext(event, req.params.submissionId, req.query);
    if (!context) {
      return res.status(404).render('error', {
        title: '404 - Submission Not Found',
        status: 404,
        message: 'Submission record not found for this event.'
      });
    }

    return res.render('organizer/submission-review', {
      title: `Submission Review - ${event.title}`,
      user,
      isAdminViewer: user.role === 'admin',
      event,
      message: getPageMessage(req.query),
      ...context
    });
  } catch (error) {
    console.error('Error loading submission review:', error);
    return res.status(500).render('error', {
      title: 'Server Error',
      status: 500,
      message: 'An error occurred while loading submission review.'
    });
  }
});

router.post(
  '/events/:id/registrants/:registrationId/payment/approve',
  requireAuth,
  requireCsrfProtection,
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

      const reviewNotes = String(req.body.reviewNotes || '').trim().slice(0, 1000);
      const reviewedAt = new Date();
      const registration = await Registration.findOneAndUpdate(
        {
          _id: req.params.registrationId,
          eventId: event._id,
          paymentStatus: 'proof_submitted',
          'paymentProof.url': { $nin: ['', null] }
        },
        {
          $set: {
            paymentStatus: 'paid',
            paymentReviewedAt: reviewedAt,
            paymentReviewedBy: user._id,
            paymentReviewNotes: reviewNotes,
            paymentRejectionReason: ''
          }
        },
        { new: true, runValidators: true }
      );
      if (!registration) {
        const existingRegistration = await Registration.findOne({
          _id: req.params.registrationId,
          eventId: event._id
        }).lean();
        if (!existingRegistration) {
          const q = new URLSearchParams({ type: 'error', msg: 'Registration record not found.' });
          return res.redirect(`/organizer/events/${event._id}/registrants?${q.toString()}`);
        }
        const q = new URLSearchParams({
          type: 'error',
          msg: 'Only registrations with submitted payment receipts can be approved.'
        });
        return res.redirect(`/organizer/events/${event._id}/registrants?${q.toString()}`);
      }

      syncRegistrationPaymentShadowInBackground(registration, {
        route: 'organizer.payment.approve'
      });
      evaluateRegistrationAchievementsInBackground(registration, {
        performedBy: user._id
      });
      recordCriticalAuditEventInBackground({
        actorMongoUserId: user._id,
        action: 'payment.approved',
        targetType: 'registration',
        targetId: String(registration._id),
        statusFrom: 'proof_submitted',
        statusTo: 'paid',
        notes: reviewNotes || `Payment approved for registration ${registration.confirmationCode || registration._id}.`,
        ipAddress: getRequestIpAddress(req),
        userAgent: getRequestUserAgent(req),
        occurredAt: reviewedAt
      });

      try {
        const runner = await User.findById(registration.userId).select('email firstName');
        await communicationService.notify('payment.approved', {
          notification: {
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
          email: runner?.email ? {
            to: runner.email,
            firstName: runner.firstName || 'Runner',
            eventTitle: event.title || 'Event',
            confirmationCode: registration.confirmationCode || '',
            recipientUserId: registration.userId,
            metadata: {
              registrationId: String(registration._id),
              eventId: String(event._id)
            }
          } : null
        });
      } catch (communicationError) {
        console.error('Payment approval communication failed:', {
          error: communicationError.message,
          registrationId: String(registration._id)
        });
      }

      const q = new URLSearchParams({ type: 'success', msg: 'Payment marked as approved.' });
      return res.redirect(`/organizer/events/${event._id}/registrants?${q.toString()}`);
    } catch (error) {
      console.error('Error approving payment receipt:', error);
      return res.status(500).render('error', {
        title: 'Server Error',
        status: 500,
        message: 'An error occurred while approving payment receipt.'
      });
    }
  }
);

router.post(
  '/events/:id/registrants/:registrationId/payment/reject',
  requireAuth,
  requireCsrfProtection,
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

      const rejectionReason = String(req.body.rejectionReason || '').trim().slice(0, 500);
      const reviewNotes = String(req.body.reviewNotes || '').trim().slice(0, 1000);
      if (!rejectionReason || rejectionReason.length < 5) {
        const q = new URLSearchParams({
          type: 'error',
          msg: 'Rejection reason is required (at least 5 characters).'
        });
        return res.redirect(`/organizer/events/${event._id}/registrants?${q.toString()}`);
      }

      const reviewedAt = new Date();
      const registration = await Registration.findOneAndUpdate(
        {
          _id: req.params.registrationId,
          eventId: event._id,
          paymentStatus: 'proof_submitted',
          'paymentProof.url': { $nin: ['', null] }
        },
        {
          $set: {
            paymentStatus: 'proof_rejected',
            paymentReviewedAt: reviewedAt,
            paymentReviewedBy: user._id,
            paymentReviewNotes: reviewNotes,
            paymentRejectionReason: rejectionReason
          }
        },
        { new: true, runValidators: true }
      );
      if (!registration) {
        const existingRegistration = await Registration.findOne({
          _id: req.params.registrationId,
          eventId: event._id
        }).lean();
        if (!existingRegistration) {
          const q = new URLSearchParams({ type: 'error', msg: 'Registration record not found.' });
          return res.redirect(`/organizer/events/${event._id}/registrants?${q.toString()}`);
        }
        const q = new URLSearchParams({
          type: 'error',
          msg: 'Only registrations with submitted payment receipts can be rejected.'
        });
        return res.redirect(`/organizer/events/${event._id}/registrants?${q.toString()}`);
      }

      syncRegistrationPaymentShadowInBackground(registration, {
        route: 'organizer.payment.reject'
      });
      recordCriticalAuditEventInBackground({
        actorMongoUserId: user._id,
        action: 'payment.rejected',
        targetType: 'registration',
        targetId: String(registration._id),
        statusFrom: 'proof_submitted',
        statusTo: 'proof_rejected',
        notes: rejectionReason,
        ipAddress: getRequestIpAddress(req),
        userAgent: getRequestUserAgent(req),
        occurredAt: reviewedAt
      });

      try {
        const runner = await User.findById(registration.userId).select('email firstName');
        await communicationService.notify('payment.rejected', {
          notification: {
            userId: registration.userId,
            type: 'payment_rejected',
            title: 'Payment Needs Update',
            message: `Your payment receipt for ${event.title || 'the event'} was rejected. Please review and resubmit.`,
            href: '/my-registrations',
            metadata: {
              registrationId: String(registration._id),
              eventId: String(event._id),
              eventTitle: event.title || ''
            }
          },
          email: runner?.email ? {
            to: runner.email,
            firstName: runner.firstName || 'Runner',
            eventTitle: event.title || 'Event',
            confirmationCode: registration.confirmationCode || '',
            rejectionReason,
            reviewNotes,
            recipientUserId: registration.userId,
            metadata: {
              registrationId: String(registration._id),
              eventId: String(event._id)
            }
          } : null
        });
      } catch (communicationError) {
        console.error('Payment rejection communication failed:', {
          error: communicationError.message,
          registrationId: String(registration._id)
        });
      }

      const q = new URLSearchParams({ type: 'success', msg: 'Payment receipt rejected and runner notified.' });
      return res.redirect(`/organizer/events/${event._id}/registrants?${q.toString()}`);
    } catch (error) {
      console.error('Error rejecting payment receipt:', error);
      return res.status(500).render('error', {
        title: 'Server Error',
        status: 500,
        message: 'An error occurred while rejecting payment receipt.'
      });
    }
  }
);

router.post(
  '/events/:id/submissions/:submissionId/approve',
  requireAuth,
  requireCsrfProtection,
  submissionReviewActionLimiter,
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
        const activityRecord = await AccumulatedActivitySubmission.findOne({
          _id: req.params.submissionId,
          eventId: event._id
        })
          .select('_id')
          .lean();
        if (!activityRecord) {
          const queueContext = normalizeRunProofQueueContext(req.body);
          const queuePath = buildRunProofReviewPath(event._id, queueContext);
          const separator = queuePath.includes('?') ? '&' : '?';
          return res.redirect(`${queuePath}${separator}type=error&msg=${encodeURIComponent('Submission record not found for this event.')}`);
        }

        const reviewNotes = String(req.body.reviewNotes || '').trim().slice(0, 1200);
        await reviewAccumulatedActivitySubmission({
          activityId: activityRecord._id,
          organizerId: user._id,
          reviewerRole: user.role,
          action: 'approve',
          reviewNotes
        });

        return res.redirect(buildSubmissionReviewPath(event._id, activityRecord._id, req.body, {
          type: 'success',
          msg: 'Activity submission approved.'
        }));
      }

      const reviewNotes = String(req.body.reviewNotes || '').trim().slice(0, 1200);
      await reviewSubmission({
        submissionId: submissionRecord._id,
        organizerId: user._id,
        reviewerRole: user.role,
        action: 'approve',
        reviewNotes
      });

      return res.redirect(buildSubmissionReviewPath(event._id, submissionRecord._id, req.body, {
        type: 'success',
        msg: 'Run result approved.'
      }));
    } catch (error) {
      return res.redirect(buildSubmissionReviewPath(req.params.id, req.params.submissionId, req.body, {
        type: 'error',
        msg: String(error?.message || 'Unable to approve submission.')
      }));
    }
  }
);

router.post(
  '/events/:id/submissions/:submissionId/reject',
  requireAuth,
  requireCsrfProtection,
  submissionReviewActionLimiter,
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
        const activityRecord = await AccumulatedActivitySubmission.findOne({
          _id: req.params.submissionId,
          eventId: event._id
        })
          .select('_id')
          .lean();
        if (!activityRecord) {
          const queueContext = normalizeRunProofQueueContext(req.body);
          const queuePath = buildRunProofReviewPath(event._id, queueContext);
          const separator = queuePath.includes('?') ? '&' : '?';
          return res.redirect(`${queuePath}${separator}type=error&msg=${encodeURIComponent('Submission record not found for this event.')}`);
        }

        const rejectionReason = String(req.body.rejectionReason || '').trim().slice(0, 500);
        if (!rejectionReason || rejectionReason.length < 5) {
          return res.redirect(buildSubmissionReviewPath(event._id, activityRecord._id, req.body, {
            type: 'error',
            msg: 'Rejection reason must be at least 5 characters.'
          }));
        }
        const reviewNotes = String(req.body.reviewNotes || '').trim().slice(0, 1200);
        await reviewAccumulatedActivitySubmission({
          activityId: activityRecord._id,
          organizerId: user._id,
          reviewerRole: user.role,
          action: 'reject',
          rejectionReason,
          reviewNotes
        });

        return res.redirect(buildSubmissionReviewPath(event._id, activityRecord._id, req.body, {
          type: 'success',
          msg: 'Activity submission rejected.'
        }));
      }

      const rejectionReason = String(req.body.rejectionReason || '').trim().slice(0, 500);
      if (!rejectionReason || rejectionReason.length < 5) {
        return res.redirect(buildSubmissionReviewPath(event._id, submissionRecord._id, req.body, {
          type: 'error',
          msg: 'Rejection reason must be at least 5 characters.'
        }));
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

      return res.redirect(buildSubmissionReviewPath(event._id, submissionRecord._id, req.body, {
        type: 'success',
        msg: 'Run result rejected.'
      }));
    } catch (error) {
      return res.redirect(buildSubmissionReviewPath(req.params.id, req.params.submissionId, req.body, {
        type: 'error',
        msg: String(error?.message || 'Unable to reject submission.')
      }));
    }
  }
);

router.get('/events/:id/registrants/export', requireAuth, registrantExportLimiter, async (req, res) => {
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

    recordCriticalAuditEventInBackground({
      actorMongoUserId: user._id,
      action: 'organiser.registrants_exported',
      targetType: 'event',
      targetId: String(event._id),
      notes: `CSV registrant export generated with ${rows.length} row(s).`,
      ipAddress: getRequestIpAddress(req),
      userAgent: getRequestUserAgent(req),
      occurredAt: new Date()
    });

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

router.get('/events/:id/registrants/export-xlsx', requireAuth, registrantExportLimiter, async (req, res) => {
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

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'HelloRun';
    workbook.created = new Date();
    const worksheet = workbook.addWorksheet('Registrants');
    worksheet.addRow(headers);
    rows.forEach((row) => worksheet.addRow(row));
    worksheet.getRow(1).font = { bold: true };
    worksheet.columns.forEach((column) => {
      let maxLength = 12;
      column.eachCell({ includeEmpty: true }, (cell) => {
        maxLength = Math.max(maxLength, String(cell.value || '').length);
      });
      column.width = Math.min(maxLength + 2, 48);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const safeSlug = String(event.slug || 'event').replace(/[^a-zA-Z0-9-_]/g, '');
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `${safeSlug}-registrants-${timestamp}.xlsx`;

    recordCriticalAuditEventInBackground({
      actorMongoUserId: user._id,
      action: 'organiser.registrants_exported',
      targetType: 'event',
      targetId: String(event._id),
      notes: `XLSX registrant export generated with ${rows.length} row(s).`,
      ipAddress: getRequestIpAddress(req),
      userAgent: getRequestUserAgent(req),
      occurredAt: new Date()
    });

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
    if (isDraftSubmitForReview) {
      event.status = 'pending_review';
      event.submittedForReviewAt = new Date();
    }

    await event.save();
    generateDefaultEventBadgesInBackground(event, { performedBy: user._id });

    const autoApproval = isDraftSubmitForReview
      ? await tryAutoApproveEvent(event, { organizer: user })
      : { approved: false };

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

router.post('/events/:id/status', requireApprovedOrganizer, requireCsrfProtection, async (req, res) => {
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

router.post('/events/:id/media/remove', requireApprovedOrganizer, requireCsrfProtection, async (req, res) => {
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
    const editMode = Boolean(
      application &&
      ['pending', 'under_review', 'rejected'].includes(application.status) &&
      String(req.query.edit || '') === '1'
    );
    const submittedAt = application ? new Date(application.submittedAt || application.createdAt || Date.now()) : null;
    const reviewDays = parseInt(process.env.ORGANIZER_REVIEW_TIME_DAYS, 10) || 3;
    const estimatedAt = submittedAt ? new Date(submittedAt) : null;
    if (estimatedAt) estimatedAt.setDate(estimatedAt.getDate() + reviewDays);

    res.render('organizer/complete-profile', {
      title: 'Complete Organizer Profile - HelloRun',
      user: user,
      application: application || null,
      editMode,
      reviewDays,
      daysAgo: submittedAt ? Math.floor((Date.now() - submittedAt) / (1000 * 60 * 60 * 24)) : 0,
      submittedDate: submittedAt
        ? submittedAt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
        : '',
      estimatedDate: estimatedAt
        ? estimatedAt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
        : ''
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

      const canUpdateExistingApplication = existingApplication &&
        ['pending', 'under_review', 'rejected'].includes(existingApplication.status);

      if (existingApplication && !canUpdateExistingApplication) {
        return res.status(400).json({
          success: false,
          message: 'This application can no longer be updated.'
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
        if (existingApplication?.idProofUrl) {
          req.files = {};
        } else {
          return res.status(400).json({
            success: false,
            message: 'Please upload an ID proof document.'
          });
        }
      }

      const idProofFile = req.files.idProof ? req.files.idProof[0] : null;
      const businessProofFile = req.files.businessProof ? req.files.businessProof[0] : null;

      if (!idProofFile && !existingApplication?.idProofUrl) {
        return res.status(400).json({
          success: false,
          message: 'ID proof document is required'
        });
      }

      const fileValidation = validateFiles([idProofFile, businessProofFile].filter(Boolean));
      if (!fileValidation.valid) {
        return res.status(400).json({
          success: false,
          message: fileValidation.error
        });
      }

      // ========== STEP 5: Upload Documents to Cloudflare R2 ==========
      let uploadedDocs = { idProof: null, businessProof: null };
      try {
        if (idProofFile || businessProofFile) {
          uploadedDocs = await uploadService.uploadOrganizerDocsToR2({
            userId,
            idProofFile,
            businessProofFile
          });
          if (uploadedDocs.idProof?.key) uploadedObjectKeys.push(uploadedDocs.idProof.key);
          if (uploadedDocs.businessProof?.key) uploadedObjectKeys.push(uploadedDocs.businessProof.key);
        }
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
        application = existingApplication || new OrganiserApplication({
          userId: userId,
          submittedAt: new Date()
        });

        const oldDocumentKeys = [];
        if (uploadedDocs.idProof?.url && application.idProofUrl) {
          oldDocumentKeys.push(uploadService.extractObjectKeyFromPublicUrl(application.idProofUrl));
        }
        if (uploadedDocs.businessProof?.url && application.businessProofUrl) {
          oldDocumentKeys.push(uploadService.extractObjectKeyFromPublicUrl(application.businessProofUrl));
        }

        application.businessName = businessName.trim();
        application.businessType = businessType;
        application.contactPhone = contactPhone.trim();
        application.businessRegistrationNumber = businessRegistrationNumber?.trim() || '';
        application.businessAddress = businessAddress?.trim() || '';
        application.idProofUrl = uploadedDocs.idProof?.url || application.idProofUrl || '';
        application.businessProofUrl = uploadedDocs.businessProof?.url || application.businessProofUrl || '';
        application.additionalInfo = additionalInfo?.trim() || '';
        application.status = 'pending';
        application.rejectionReason = '';
        application.reviewedBy = undefined;
        application.reviewedAt = undefined;
        if (existingApplication) application.submittedAt = new Date();

        await application.save();
        await uploadService.deleteObjects(oldDocumentKeys.filter(Boolean));
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
        await communicationService.notify('organiser.application_submitted', {
          email: {
            to: user.email,
            firstName: user.firstName || 'Organizer',
            applicationId: application.applicationId,
            recipientUserId: user._id,
            metadata: { applicationId: application.applicationId }
          }
        });
      } catch (emailError) {
        console.error('Email sending error:', emailError);
        // Don't fail the submission if email fails
      }

      // ========== STEP 9: Send Success Response ==========
      if (!wantsJsonResponse(req)) {
        return res.redirect('/organizer/application-status');
      }
      return res.status(201).json({
        success: true,
        message: existingApplication ? 'Application updated successfully!' : 'Application submitted successfully!',
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
      title: 'Application Status - HelloRun',
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
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  const maxSize = parseInt(process.env.UPLOAD_MAX_SIZE) || 5242880; // 5MB

  for (const file of files) {
    // Check file type
    if (!allowedTypes.includes(file.mimetype)) {
      return {
        valid: false,
        error: `Invalid file type: ${file.originalname}. Please upload PDF, JPG, PNG, or WebP files only.`
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

function wantsJsonResponse(req) {
  const accept = String(req.get('accept') || '');
  const requestedWith = String(req.get('x-requested-with') || '').toLowerCase();
  return requestedWith === 'xmlhttprequest' || accept.includes('application/json');
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
  const numericOnly = compact.match(/^(\d+(?:\.\d+)?)$/);
  if (numericOnly) return `${numericOnly[1]}K`;
  const kmValue = compact.match(/^(\d+(?:\.\d+)?)(KM|K)$/);
  if (kmValue) return `${kmValue[1]}K`;
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
  const requestedPageValue = Number.parseInt(String(queryParams.page || '1'), 10);
  const requestedPage = Number.isFinite(requestedPageValue) && requestedPageValue > 0 ? requestedPageValue : 1;

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
    searchQuery,
    requestedPage
  };
}

async function getEventRegistrationSummaryCounts(eventId) {
  const [summary = {}] = await Registration.aggregate([
    { $match: { eventId } },
    {
      $group: {
        _id: null,
        totalRegistrants: { $sum: 1 },
        virtualCount: {
          $sum: { $cond: [{ $eq: ['$participationMode', 'virtual'] }, 1, 0] }
        },
        onsiteCount: {
          $sum: { $cond: [{ $eq: ['$participationMode', 'onsite'] }, 1, 0] }
        },
        proofSubmittedCount: {
          $sum: { $cond: [{ $eq: ['$paymentStatus', 'proof_submitted'] }, 1, 0] }
        },
        paidCount: {
          $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, 1, 0] }
        },
        proofRejectedCount: {
          $sum: { $cond: [{ $eq: ['$paymentStatus', 'proof_rejected'] }, 1, 0] }
        },
        unpaidCount: {
          $sum: {
            $cond: [
              { $and: [{ $eq: ['$status', 'confirmed'] }, { $eq: ['$paymentStatus', 'unpaid'] }] },
              1,
              0
            ]
          }
        }
      }
    }
  ]);

  return {
    totalRegistrants: Number(summary.totalRegistrants || 0),
    virtualCount: Number(summary.virtualCount || 0),
    onsiteCount: Number(summary.onsiteCount || 0),
    proofSubmittedCount: Number(summary.proofSubmittedCount || 0),
    paidCount: Number(summary.paidCount || 0),
    proofRejectedCount: Number(summary.proofRejectedCount || 0),
    unpaidCount: Number(summary.unpaidCount || 0)
  };
}

async function getEventSubmissionSummaryCounts(Model, eventId) {
  const [summary = {}] = await Model.aggregate([
    { $match: { eventId } },
    {
      $group: {
        _id: null,
        submitted: {
          $sum: { $cond: [{ $eq: ['$status', 'submitted'] }, 1, 0] }
        },
        approved: {
          $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
        },
        rejected: {
          $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] }
        }
      }
    }
  ]);

  return {
    submitted: Number(summary.submitted || 0),
    approved: Number(summary.approved || 0),
    rejected: Number(summary.rejected || 0)
  };
}

async function getRegistrationIdsWithSubmissionStatus(eventId, status) {
  const [standardRows, accumulatedRows] = await Promise.all([
    Submission.find({ eventId, status }).select('registrationId').lean(),
    AccumulatedActivitySubmission.find({ eventId, status }).select('registrationId').lean()
  ]);
  const ids = new Set();
  standardRows.forEach((item) => {
    if (item.registrationId) ids.add(String(item.registrationId));
  });
  accumulatedRows.forEach((item) => {
    if (item.registrationId) ids.add(String(item.registrationId));
  });
  return Array.from(ids);
}

function buildRegistrantListPath(eventId, filterContext = {}, overrides = {}) {
  const next = {
    mode: filterContext.selectedMode,
    distance: filterContext.selectedDistance,
    payment: filterContext.selectedPaymentStatus,
    result: filterContext.selectedResultStatus,
    q: filterContext.searchQuery,
    page: filterContext.requestedPage,
    ...overrides
  };
  const params = new URLSearchParams();
  if (next.mode) params.set('mode', next.mode);
  if (next.distance) params.set('distance', next.distance);
  if (next.payment) params.set('payment', next.payment);
  if (next.result) params.set('result', next.result);
  if (next.q) params.set('q', next.q);
  if (Number(next.page || 1) > 1) params.set('page', String(next.page));
  const query = params.toString();
  return `/organizer/events/${String(eventId)}/registrants${query ? `?${query}` : ''}`;
}

function normalizePaymentProofReviewFilters(queryParams = {}) {
  const status = ['pending', 'approved', 'rejected', 'all'].includes(String(queryParams.status || '').trim())
    ? String(queryParams.status).trim()
    : 'pending';
  const q = typeof queryParams.q === 'string' ? queryParams.q.trim().slice(0, 80) : '';
  const requestedPage = Number.parseInt(String(queryParams.page || '1'), 10);
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  return { status, q, page };
}

function getPaymentProofReviewStatusQuery(status) {
  if (status === 'approved') return 'paid';
  if (status === 'rejected') return 'proof_rejected';
  if (status === 'all') return { $in: ['proof_submitted', 'paid', 'proof_rejected'] };
  return 'proof_submitted';
}

async function getEventAuditTargetIds(eventId) {
  const eventIdString = String(eventId || '');
  const [registrations, submissions, accumulatedActivities] = await Promise.all([
    Registration.find({ eventId }).select('_id').limit(5000).lean(),
    Submission.find({ eventId }).select('_id').limit(5000).lean(),
    AccumulatedActivitySubmission.find({ eventId }).select('_id').limit(5000).lean()
  ]);

  return Array.from(new Set([
    eventIdString,
    ...registrations.map((item) => String(item._id)),
    ...submissions.map((item) => String(item._id)),
    ...accumulatedActivities.map((item) => String(item._id))
  ].filter(Boolean)));
}

function buildPaymentProofReviewPath(eventId, filters = {}, overrides = {}) {
  const next = { ...filters, ...overrides };
  const params = new URLSearchParams();
  if (next.status && next.status !== 'pending') params.set('status', next.status);
  if (next.q) params.set('q', next.q);
  if (Number(next.page || 1) > 1) params.set('page', String(next.page));
  const query = params.toString();
  return `/organizer/events/${String(eventId)}/payment-proofs/review${query ? `?${query}` : ''}`;
}

function buildPaymentProofReviewRow(registration, event) {
  const participant = registration.participant || {};
  const reviewer = registration.paymentReviewedBy || null;
  const reviewerName = reviewer
    ? [reviewer.firstName, reviewer.lastName].filter(Boolean).join(' ').trim() || reviewer.email || ''
    : '';
  const paymentStatus = registration.paymentStatus || '';

  return {
    id: String(registration._id),
    confirmationCode: registration.confirmationCode || 'N/A',
    participantName: [participant.firstName, participant.lastName].filter(Boolean).join(' ').trim() || 'N/A',
    participantEmail: participant.email || 'N/A',
    participantMobile: participant.mobile || '',
    raceDistance: registration.raceDistance || 'N/A',
    participationMode: registration.participationMode || 'N/A',
    paymentStatus,
    paymentStatusLabel: formatPaymentProofStatusLabel(paymentStatus),
    isPending: paymentStatus === 'proof_submitted',
    proofUrl: registration.paymentProof?.url || '',
    proofUploadedAt: registration.paymentProof?.uploadedAt || null,
    proofUploadedAtLabel: formatDateTime(registration.paymentProof?.uploadedAt),
    proofMimeType: registration.paymentProof?.mimeType || '',
    expectedPaymentLabel: formatExpectedPaymentLabel(registration, event),
    payeeName: event.paymentAccountName || '',
    paymentInstructions: event.paymentInstructions || '',
    reviewedAtLabel: formatDateTime(registration.paymentReviewedAt),
    reviewerName,
    reviewerEmail: reviewer?.email || '',
    rejectionReason: registration.paymentRejectionReason || '',
    reviewNotes: registration.paymentReviewNotes || ''
  };
}

function formatPaymentProofStatusLabel(value) {
  if (value === 'proof_submitted') return 'Pending Review';
  if (value === 'proof_rejected') return 'Rejected';
  if (value === 'paid') return 'Approved';
  return String(value || 'N/A').replace(/_/g, ' ');
}

function normalizeRunProofReviewFilters(queryParams = {}) {
  const status = ['pending', 'approved', 'auto-approved', 'rejected', 'all'].includes(String(queryParams.status || '').trim())
    ? String(queryParams.status).trim()
    : 'pending';
  const hasSort = ['oldest', 'newest'].includes(String(queryParams.sort || '').trim());
  const sort = hasSort
    ? String(queryParams.sort).trim()
    : status === 'pending' ? 'oldest' : 'newest';
  const q = typeof queryParams.q === 'string' ? queryParams.q.trim().slice(0, 120) : '';
  const requestedPage = Number.parseInt(String(queryParams.page || '1'), 10);
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  return { status, sort, q, page };
}

function getRunProofReviewStatusQuery(status) {
  if (status === 'approved') return { status: 'approved' };
  if (status === 'auto-approved') {
    return {
      status: 'approved',
      $or: [{ reviewedBy: null }, { reviewedBy: { $exists: false } }]
    };
  }
  if (status === 'rejected') return { status: 'rejected' };
  if (status === 'all') return { status: { $in: ['submitted', 'approved', 'rejected'] } };
  return { status: 'submitted' };
}

async function buildRunProofReviewQuery(eventId, filters = {}) {
  const query = { eventId, ...getRunProofReviewStatusQuery(filters.status) };
  if (!filters.q) return query;

  const searchPattern = new RegExp(escapeRegex(filters.q), 'i');
  const matchingRegistrations = await Registration.find({
    eventId,
    $or: [
      { confirmationCode: searchPattern },
      { 'participant.firstName': searchPattern },
      { 'participant.lastName': searchPattern },
      { 'participant.email': searchPattern }
    ]
  })
    .select('_id')
    .lean();

  return {
    ...query,
    registrationId: { $in: matchingRegistrations.map((item) => item._id) }
  };
}

function getRunProofReviewSortSpec(sort) {
  const direction = sort === 'newest' ? -1 : 1;
  return { submittedAt: direction, _id: direction };
}

function mergeRunProofReviewDocs(standardDocs = [], accumulatedDocs = [], sort = 'oldest') {
  const merged = [];
  let standardIndex = 0;
  let accumulatedIndex = 0;

  while (standardIndex < standardDocs.length || accumulatedIndex < accumulatedDocs.length) {
    const standard = standardDocs[standardIndex];
    const accumulated = accumulatedDocs[accumulatedIndex];
    if (!accumulated || (standard && compareRunProofReviewDocs(standard, accumulated, sort) <= 0)) {
      merged.push({ submission: standard, submissionKind: 'standard' });
      standardIndex += 1;
    } else {
      merged.push({ submission: accumulated, submissionKind: 'accumulated' });
      accumulatedIndex += 1;
    }
  }

  return merged;
}

function compareRunProofReviewDocs(a, b, sort = 'oldest') {
  const direction = sort === 'newest' ? -1 : 1;
  const aTime = getRunProofReviewSortTime(a);
  const bTime = getRunProofReviewSortTime(b);
  if (aTime !== bTime) return (aTime - bTime) * direction;
  return String(a?._id || '').localeCompare(String(b?._id || '')) * direction;
}

function getRunProofReviewSortTime(submission) {
  const value = submission?.submittedAt || submission?.createdAt || 0;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function buildRunProofReviewPath(eventId, filters = {}, overrides = {}) {
  const next = { ...filters, ...overrides };
  const params = new URLSearchParams();
  if (next.status && next.status !== 'pending') params.set('status', next.status);
  if (next.sort && next.sort !== (next.status === 'pending' || !next.status ? 'oldest' : 'newest')) {
    params.set('sort', next.sort);
  }
  if (next.q) params.set('q', next.q);
  if (Number(next.page || 1) > 1) params.set('page', String(next.page));
  const query = params.toString();
  return `/organizer/events/${String(eventId)}/run-proofs/review${query ? `?${query}` : ''}`;
}

function buildRunProofQueueContextParams(filters = {}) {
  const params = new URLSearchParams();
  params.set('queueStatus', filters.status || 'pending');
  params.set('queueSort', filters.sort || ((filters.status || 'pending') === 'pending' ? 'oldest' : 'newest'));
  if (filters.q) params.set('queueQ', filters.q);
  if (Number(filters.page || 1) > 1) params.set('queuePage', String(filters.page));
  return params;
}

function buildSubmissionReviewPath(eventId, submissionId, queryParams = {}, message = {}) {
  const queueContext = normalizeRunProofQueueContext(queryParams);
  const params = buildRunProofQueueContextParams(queueContext);
  if (message.type) params.set('type', message.type);
  if (message.msg) params.set('msg', message.msg);
  const query = params.toString();
  return `/organizer/events/${String(eventId)}/submissions/${String(submissionId)}/review${query ? `?${query}` : ''}`;
}

function normalizeRunProofQueueContext(queryParams = {}) {
  return normalizeRunProofReviewFilters({
    status: queryParams.queueStatus,
    sort: queryParams.queueSort,
    q: queryParams.queueQ,
    page: queryParams.queuePage
  });
}

function buildRunProofReviewRow(submission, event, filters, submissionKind) {
  const registration = submission.registrationId || {};
  const participant = registration.participant || {};
  const reviewer = submission.reviewedBy || null;
  const reviewerName = reviewer
    ? [reviewer.firstName, reviewer.lastName].filter(Boolean).join(' ').trim() || reviewer.email || ''
    : '';
  const mappedSubmission = mapSubmissionForRegistrant(submission, {
    isAccumulatedActivity: submissionKind === 'accumulated'
  });
  const proofUrl = submission.proof?.url || '';
  const proofMimeType = String(submission.proof?.mimeType || '');
  const proofPath = String(proofUrl).split('?')[0];
  const isImageProof = Boolean(proofUrl && (proofMimeType.startsWith('image/') || /\.(png|jpe?g|gif|webp)$/i.test(proofPath)));
  const hasOcrMismatch = Boolean(
    submission.ocrData?.distanceMismatch ||
    submission.ocrData?.timeMismatch ||
    submission.ocrData?.elevationMismatch ||
    submission.ocrData?.stepsMismatch ||
    submission.ocrData?.dateMismatch ||
    submission.ocrData?.locationMismatch ||
    submission.ocrData?.runTypeMismatch ||
    submission.ocrData?.nameMatchStatus === 'mismatched'
  );
  const queueContext = buildRunProofQueueContextParams(filters).toString();
  const isAutoApproved = submission.status === 'approved' && !submission.reviewedBy;
  const statusLabel = submission.status === 'submitted'
    ? 'Pending Review'
    : isAutoApproved
      ? 'Auto-approved'
      : String(submission.status || 'N/A');

  return {
    id: String(submission._id),
    submissionKind,
    submissionTypeLabel: submissionKind === 'accumulated' ? 'Accumulated Activity' : 'Run Result',
    participantName: [participant.firstName, participant.lastName].filter(Boolean).join(' ').trim() || 'N/A',
    participantEmail: participant.email || 'N/A',
    confirmationCode: registration.confirmationCode || 'N/A',
    raceDistance: registration.raceDistance || submission.raceDistance || 'N/A',
    participationMode: registration.participationMode || submission.participationMode || 'N/A',
    status: submission.status || 'submitted',
    statusLabel,
    statusClass: isAutoApproved ? 'auto-approved' : (submission.status || 'submitted'),
    isAutoApproved,
    submittedAt: submission.submittedAt || submission.createdAt || null,
    submittedAtLabel: mappedSubmission.submittedAtLabel,
    runDateLabel: mappedSubmission.runDateLabel,
    distanceLabel: `${Number(submission.distanceKm || 0).toFixed(2)} km`,
    elapsedLabel: mappedSubmission.elapsedLabel || 'N/A',
    proofTypeLabel: String(submission.proofType || 'manual').toUpperCase(),
    sourceLabel: submission.source === 'strava' ? 'Strava' : 'Manual upload',
    reviewSourceLabel: isAutoApproved ? 'Auto-approved by validation' : (submission.status === 'submitted' ? 'Awaiting organizer review' : 'Organizer reviewed'),
    proofUrl,
    isImageProof,
    suspiciousFlag: mappedSubmission.suspiciousFlag,
    suspiciousFlagReason: mappedSubmission.suspiciousFlagReason,
    reviewSignal: mappedSubmission.reviewSignal,
    hasOcrMismatch,
    reviewedAtLabel: mappedSubmission.reviewedAtLabel,
    reviewerName,
    reviewerEmail: reviewer?.email || '',
    rejectionReason: submission.rejectionReason || '',
    reviewNotes: submission.reviewNotes || '',
    actionHref: `/organizer/events/${String(event._id)}/submissions/${String(submission._id)}/review${queueContext ? `?${queueContext}` : ''}`,
    approveActionHref: `/organizer/events/${String(event._id)}/submissions/${String(submission._id)}/approve`
  };
}

function formatExpectedPaymentLabel(registration, event) {
  const currency = registration.paymentCurrency || event.feeCurrency || registration.addOnsCurrency || 'PHP';
  const savedPaymentAmount = Number(registration.paymentAmountDue);
  const snapshotAmount = Number(registration.pricingSnapshot?.amount);
  const eventFee = Number.isFinite(savedPaymentAmount) && savedPaymentAmount > 0
    ? savedPaymentAmount
    : Number.isFinite(snapshotAmount) && snapshotAmount > 0
      ? snapshotAmount
      : Number(event.feeAmount || 0);
  const addOnsSubtotal = Number(registration.addOnsSubtotal || 0);
  const total = Math.max(0, eventFee) + Math.max(0, addOnsSubtotal);
  if (Number.isFinite(total) && total > 0) {
    return `${currency} ${total.toFixed(2)}`;
  }
  if (event.feeMode === 'paid') {
    return `${currency} ${Math.max(0, eventFee || 0).toFixed(2)}`;
  }
  return 'No payment required';
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

async function getSubmissionReviewContext(event, submissionId, queryParams = {}) {
  if (!event || !mongoose.Types.ObjectId.isValid(submissionId)) return null;
  const eventId = event._id;
  const basePopulate = [
    { path: 'reviewedBy', select: 'firstName lastName email' },
    { path: 'runnerId', select: 'firstName lastName email mobile country gender' },
    { path: 'registrationId', select: 'participant confirmationCode raceDistance participationMode status paymentStatus registeredAt' }
  ];

  let submission = await Submission.findOne({ _id: submissionId, eventId })
    .populate(basePopulate)
    .lean();
  let submissionKind = 'standard';

  if (!submission) {
    submission = await AccumulatedActivitySubmission.findOne({ _id: submissionId, eventId })
      .populate(basePopulate)
      .lean();
    submissionKind = submission ? 'accumulated' : '';
  }
  if (!submission) return null;

  const registration = submission.registrationId || null;
  const participant = registration?.participant || {};
  const runner = submission.runnerId || {};
  const mappedSubmission = mapSubmissionForRegistrant(submission, {
    isAccumulatedActivity: submissionKind === 'accumulated'
  });

  const accumulatedActivities = submissionKind === 'accumulated' && registration?._id
    ? await AccumulatedActivitySubmission.find({ registrationId: registration._id })
      .sort({ submittedAt: -1, createdAt: -1 })
      .lean()
    : [];

  const queueContext = normalizeRunProofQueueContext(queryParams);
  const queueContextParams = buildRunProofQueueContextParams(queueContext);

  return {
    submission: mappedSubmission,
    submissionKind,
    participant: {
      name: [participant.firstName, participant.lastName].filter(Boolean).join(' ').trim() ||
        [runner.firstName, runner.lastName].filter(Boolean).join(' ').trim() ||
        'N/A',
      email: participant.email || runner.email || 'N/A',
      mobile: participant.mobile || runner.mobile || 'N/A',
      countryLabel: getCountryName(participant.country || runner.country) || participant.country || runner.country || 'N/A',
      genderLabel: formatGenderLabel(participant.gender || runner.gender) || 'N/A'
    },
    registration: registration ? {
      id: String(registration._id),
      confirmationCode: registration.confirmationCode || 'N/A',
      raceDistance: registration.raceDistance || submission.raceDistance || 'N/A',
      participationMode: registration.participationMode || submission.participationMode || 'N/A',
      status: registration.status || 'N/A',
      paymentStatus: registration.paymentStatus || 'N/A',
      registeredAtLabel: formatDateTime(registration.registeredAt)
    } : {
      id: '',
      confirmationCode: 'N/A',
      raceDistance: submission.raceDistance || 'N/A',
      participationMode: submission.participationMode || 'N/A',
      status: 'N/A',
      paymentStatus: 'N/A',
      registeredAtLabel: ''
    },
    accumulatedProgress: submissionKind === 'accumulated'
      ? buildAccumulatedProgress({
        activities: accumulatedActivities,
        targetDistanceKm: event.targetDistanceKm
      })
      : null,
    backHref: buildRunProofReviewPath(event._id, queueContext),
    queueContext: Object.fromEntries(queueContextParams.entries()),
    reviewActionBase: `/organizer/events/${String(event._id)}/submissions/${String(submission._id)}`
  };
}

function mapSubmissionForRegistrant(submission, options = {}) {
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
    isAccumulatedActivity: Boolean(options.isAccumulatedActivity),
    targetTypeLabel: options.isAccumulatedActivity ? 'Challenge Activity (Accumulated Activity)' : 'Event Result',
    sourceLabel: getSubmissionSourceLabel(submission),
    autoApprovalSourceLabel: getAutoApprovalSourceLabel(submission),
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
    suspiciousFlagReason: String(submission.suspiciousFlagReason || '').trim(),
    reviewSignal: buildSubmissionReviewSignal(submission)
  };
}

function getSubmissionSourceLabel(submission = {}) {
  const source = String(submission.source || '').trim().toLowerCase();
  if (source === 'strava') return 'Strava Activity';
  if (Number(submission.ocrData?.confidence || 0) > 0) return 'Activity Screenshot with OCR';
  return 'Activity Screenshot';
}

function getAutoApprovalSourceLabel(submission = {}) {
  const source = String(submission.source || '').trim().toLowerCase();
  if (source === 'strava') return 'Verified synced-source validation';
  if (Number(submission.ocrData?.confidence || 0) > 0) return 'OCR and name-match validation';
  return 'Manual review validation';
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
    'Race Category ID',
    'Race Category Name',
    'Race Category Type',
    'Status',
    'Payment Status',
    'Expected Payment',
    'Signup Option',
    'Registration Package',
    'Pricing Period',
    'Payment Receipt URL',
    'Payment Receipt Uploaded At',
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
      registration.pricingSnapshot?.raceCategoryId || '',
      registration.pricingSnapshot?.raceCategoryName || '',
      registration.pricingSnapshot?.raceCategoryType || '',
      registration.status || '',
      registration.paymentStatus || '',
      formatRegistrationExpectedPayment(registration),
      registration.pricingSnapshot?.optionDescription || '',
      registration.pricingSnapshot?.packageName || '',
      registration.pricingSnapshot?.pricingPeriodLabel || '',
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

function formatRegistrationExpectedPayment(registration) {
  const currency = registration.paymentCurrency || registration.pricingSnapshot?.currency || registration.addOnsCurrency || 'PHP';
  const registrationFee = Number.isFinite(Number(registration.paymentAmountDue))
    ? Number(registration.paymentAmountDue)
    : Number(registration.pricingSnapshot?.amount || 0);
  const addOnsSubtotal = Number(registration.addOnsSubtotal || 0);
  const total = Math.max(0, registrationFee) + Math.max(0, addOnsSubtotal);
  return total > 0 ? `${currency} ${total.toFixed(2)}` : '';
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
  return eventFormService.getCreateEventFormData(body);
  const isDefaultCreateBody = !Object.keys(body || {}).length;
  body = getDefaultedCreateEventBody(body);
  const raceDistancePresets = normalizeArray(body.raceDistancePresets).map(normalizeRaceDistanceLabel).filter(Boolean);
  const raceDistances = normalizeRaceDistances(body.raceDistancePresets, body.raceDistanceCustom);
  const galleryImageUrls = normalizeGalleryImageUrls(body.galleryImageUrlsText || body.galleryImageUrls);
  const waiverTemplateRaw = typeof body.waiverTemplate === 'string'
    ? body.waiverTemplate
    : DEFAULT_WAIVER_TEMPLATE;
  const feeMode = normalizeModeValue(body.feeMode, FEE_MODES, 'free');
  return {
    title: (body.title || '').trim(),
    organiserName: (body.organiserName || '').trim(),
    description: (body.description || '').trim(),
    eventDetailsMarkdown: String(body.eventDetailsMarkdown || '').trim().slice(0, 20000),
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
    feeMode,
    feeAmount: feeMode === 'paid' ? parseOptionalPositiveNumber(body.feeAmount) : null,
    feeCurrency: normalizeCurrency(body.feeCurrency),
    paymentQrImageUrl: String(body.paymentQrImageUrl || '').trim(),
    paymentQrImageKey: String(body.paymentQrImageKey || '').trim(),
    removePaymentQrImage: body.removePaymentQrImage === '1',
    paymentAccountName: String(body.paymentAccountName || '').trim().slice(0, 160),
    paymentInstructions: String(body.paymentInstructions || '').trim().slice(0, 1000),
    digitalBadgeEnabled: isDefaultCreateBody ? normalizeBoolean(body.digitalBadgeEnabled) : normalizeBoolean(body.digitalBadgeEnabled),
    digitalCertificateEnabled: isDefaultCreateBody ? normalizeBoolean(body.digitalCertificateEnabled) : normalizeBoolean(body.digitalCertificateEnabled),
    leaderboardRecognitionEnabled: isDefaultCreateBody ? normalizeBoolean(body.leaderboardRecognitionEnabled) : normalizeBoolean(body.leaderboardRecognitionEnabled),
    physicalRewardsEnabled: normalizeBoolean(body.physicalRewardsEnabled),
    physicalRewardMedalEnabled: normalizeBoolean(body.physicalRewardMedalEnabled),
    physicalRewardShirtEnabled: normalizeBoolean(body.physicalRewardShirtEnabled),
    physicalRewardPatchEnabled: normalizeBoolean(body.physicalRewardPatchEnabled),
    physicalRewardFinisherKitEnabled: normalizeBoolean(body.physicalRewardFinisherKitEnabled),
    physicalRewardsDescription: String(body.physicalRewardsDescription || '').trim().slice(0, 1000),
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
  return eventFormService.getCreateEventFormDataFromEvent(event);
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
    eventDetailsMarkdown: event.eventDetailsMarkdown || '',
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
    feeMode: event.feeMode || 'free',
    feeAmount: Number.isFinite(event.feeAmount) ? event.feeAmount : null,
    feeCurrency: event.feeCurrency || 'PHP',
    paymentQrImageUrl: event.paymentQrImageUrl || '',
    paymentQrImageKey: event.paymentQrImageKey || '',
    removePaymentQrImage: false,
    paymentAccountName: event.paymentAccountName || '',
    paymentInstructions: event.paymentInstructions || '',
    digitalBadgeEnabled: Boolean(event.digitalBadgeEnabled),
    digitalCertificateEnabled: event.digitalCertificateEnabled !== false,
    leaderboardRecognitionEnabled: event.leaderboardRecognitionEnabled !== false,
    physicalRewardsEnabled: Boolean(event.physicalRewardsEnabled),
    physicalRewardMedalEnabled: Boolean(event.physicalRewardMedalEnabled),
    physicalRewardShirtEnabled: Boolean(event.physicalRewardShirtEnabled),
    physicalRewardPatchEnabled: Boolean(event.physicalRewardPatchEnabled),
    physicalRewardFinisherKitEnabled: Boolean(event.physicalRewardFinisherKitEnabled),
    physicalRewardsDescription: event.physicalRewardsDescription || '',
    waiverTemplate: sanitizeWaiverTemplate(event.waiverTemplate || DEFAULT_WAIVER_TEMPLATE),
    actionType: event.status === 'published' ? 'publish' : 'draft'
  };
}

function parseDateSafe(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function addDays(date, days) {
  if (!date) return null;
  const copy = new Date(date.getTime());
  copy.setDate(copy.getDate() + days);
  return copy;
}

function resolveFinalSubmissionDeadline(formData) {
  return parseDateSafe(formData.finalSubmissionDeadlineAt) || addDays(parseDateSafe(formData.eventEndAt), 14);
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

function renderEventDetailsMarkdown(value) {
  const markdown = String(value || '').trim();
  if (!markdown) return '';
  return sanitizeHtml(markdownToHtml(markdown), EVENT_DETAILS_SANITIZE_OPTIONS);
}

function hasOwnValue(body, key) {
  return Object.prototype.hasOwnProperty.call(body || {}, key);
}

function normalizeBoolean(value) {
  return value === true || value === 'true' || value === '1' || value === 'on';
}

function normalizeCurrency(value) {
  const normalized = String(value || 'PHP').trim().toUpperCase().replace(/[^A-Z]/g, '');
  return normalized.slice(0, 3) || 'PHP';
}

function getDefaultedCreateEventBody(body = {}) {
  return Object.keys(body || {}).length ? body : {
    feeMode: 'free',
    feeCurrency: 'PHP',
    pricingMode: 'free',
    virtualCompletionMode: 'accumulated_distance',
    acceptedRunTypes: ['run', 'walk', 'hike', 'trail_run'],
    recognitionMode: 'completion_with_optional_ranking',
    leaderboardMode: 'finishers_and_top_distance'
  };
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

async function getOrganizerDashboardRegistrationMetrics(eventIds = [], recentEventIds = [], rangeWindow = {}) {
  if (!eventIds.length) {
    return {
      totalRegistrations: 0,
      pendingPaymentReviews: 0,
      registrationsInRange: 0,
      registrationsInPreviousRange: 0,
      recentRegistrationCounts: [],
      paymentQueueCounts: [],
      topRegistrationsRaw: []
    };
  }

  const currentRangeExpr = buildAggregationDateRangeExpression('registeredAt', rangeWindow.currentStartAt, rangeWindow.currentEndAt, true);
  const previousRangeExpr = buildAggregationDateRangeExpression('registeredAt', rangeWindow.previousStartAt, rangeWindow.previousEndAt, false);
  const topRegistrationsMatch = {
    eventId: { $in: eventIds },
    ...buildAggregationDateRangeMatch('registeredAt', rangeWindow.currentStartAt, rangeWindow.currentEndAt)
  };

  const [metrics = {}] = await Registration.aggregate([
    { $match: { eventId: { $in: eventIds } } },
    {
      $facet: {
        summary: [
          {
            $group: {
              _id: null,
              totalRegistrations: { $sum: 1 },
              pendingPaymentReviews: {
                $sum: { $cond: [{ $eq: ['$paymentStatus', 'proof_submitted'] }, 1, 0] }
              },
              registrationsInRange: { $sum: { $cond: [currentRangeExpr, 1, 0] } },
              registrationsInPreviousRange: { $sum: { $cond: [previousRangeExpr, 1, 0] } }
            }
          }
        ],
        recentRegistrationCounts: [
          { $match: recentEventIds.length ? { eventId: { $in: recentEventIds } } : { _id: { $exists: false } } },
          { $group: { _id: '$eventId', count: { $sum: 1 } } }
        ],
        paymentQueueCounts: [
          { $match: { paymentStatus: 'proof_submitted' } },
          { $group: { _id: '$eventId', paymentPending: { $sum: 1 } } },
          { $sort: { paymentPending: -1 } }
        ],
        topRegistrationsRaw: [
          { $match: topRegistrationsMatch },
          { $group: { _id: '$eventId', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 3 }
        ]
      }
    }
  ]);
  const summary = metrics.summary?.[0] || {};

  return {
    totalRegistrations: Number(summary.totalRegistrations || 0),
    pendingPaymentReviews: Number(summary.pendingPaymentReviews || 0),
    registrationsInRange: Number(summary.registrationsInRange || 0),
    registrationsInPreviousRange: Number(summary.registrationsInPreviousRange || 0),
    recentRegistrationCounts: metrics.recentRegistrationCounts || [],
    paymentQueueCounts: metrics.paymentQueueCounts || [],
    topRegistrationsRaw: metrics.topRegistrationsRaw || []
  };
}

async function getOrganizerDashboardSubmissionMetrics(Model, eventIds = [], rangeWindow = {}) {
  if (!eventIds.length) {
    return {
      pendingResultReviews: 0,
      submissionsInRange: 0,
      approvalsInRange: 0,
      submissionsInPreviousRange: 0,
      approvalsInPreviousRange: 0,
      resultQueueCounts: [],
      topApprovalsRaw: []
    };
  }

  const currentRangeExpr = buildAggregationDateRangeExpression('submittedAt', rangeWindow.currentStartAt, rangeWindow.currentEndAt, true);
  const previousRangeExpr = buildAggregationDateRangeExpression('submittedAt', rangeWindow.previousStartAt, rangeWindow.previousEndAt, false);
  const approvedCurrentExpr = { $and: [{ $eq: ['$status', 'approved'] }, currentRangeExpr] };
  const approvedPreviousExpr = { $and: [{ $eq: ['$status', 'approved'] }, previousRangeExpr] };
  const topApprovalsMatch = {
    eventId: { $in: eventIds },
    status: 'approved',
    ...buildAggregationDateRangeMatch('submittedAt', rangeWindow.currentStartAt, rangeWindow.currentEndAt)
  };

  const [metrics = {}] = await Model.aggregate([
    { $match: { eventId: { $in: eventIds } } },
    {
      $facet: {
        summary: [
          {
            $group: {
              _id: null,
              pendingResultReviews: {
                $sum: { $cond: [{ $eq: ['$status', 'submitted'] }, 1, 0] }
              },
              submissionsInRange: { $sum: { $cond: [currentRangeExpr, 1, 0] } },
              approvalsInRange: { $sum: { $cond: [approvedCurrentExpr, 1, 0] } },
              submissionsInPreviousRange: { $sum: { $cond: [previousRangeExpr, 1, 0] } },
              approvalsInPreviousRange: { $sum: { $cond: [approvedPreviousExpr, 1, 0] } }
            }
          }
        ],
        resultQueueCounts: [
          { $match: { status: 'submitted' } },
          { $group: { _id: '$eventId', resultPending: { $sum: 1 } } },
          { $sort: { resultPending: -1 } }
        ],
        topApprovalsRaw: [
          { $match: topApprovalsMatch },
          { $group: { _id: '$eventId', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 3 }
        ]
      }
    }
  ]);
  const summary = metrics.summary?.[0] || {};

  return {
    pendingResultReviews: Number(summary.pendingResultReviews || 0),
    submissionsInRange: Number(summary.submissionsInRange || 0),
    approvalsInRange: Number(summary.approvalsInRange || 0),
    submissionsInPreviousRange: Number(summary.submissionsInPreviousRange || 0),
    approvalsInPreviousRange: Number(summary.approvalsInPreviousRange || 0),
    resultQueueCounts: metrics.resultQueueCounts || [],
    topApprovalsRaw: metrics.topApprovalsRaw || []
  };
}

function buildAggregationDateRangeExpression(field, startAt, endAt, defaultValue) {
  const checks = [];
  if (startAt) checks.push({ $gte: [`$${field}`, startAt] });
  if (endAt) checks.push({ $lt: [`$${field}`, endAt] });
  if (!checks.length) return Boolean(defaultValue);
  return checks.length === 1 ? checks[0] : { $and: checks };
}

function buildAggregationDateRangeMatch(field, startAt, endAt) {
  const bounds = {};
  if (startAt) bounds.$gte = startAt;
  if (endAt) bounds.$lt = endAt;
  return Object.keys(bounds).length ? { [field]: bounds } : {};
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
  return eventFormService.validateCreateEventForm(formData);
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
  if ((formData.eventDetailsMarkdown || '').length > 20000) {
    errors.eventDetailsMarkdown = 'Event details must be 20,000 characters or less.';
  }
  if (formData.feeMode === 'paid') {
    if (formData.feeAmount !== null && (!Number.isFinite(formData.feeAmount) || formData.feeAmount < 0)) {
      errors.feeAmount = 'Paid event amount must be zero or higher.';
    }
    if (!formData.paymentQrImageUrl) {
      errors.paymentQrImageUrl = 'Payment QR image is required before submitting a paid event for review.';
    }
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
      if (!Number.isFinite(formData.targetDistanceKm) || formData.targetDistanceKm <= 0) {
        errors.raceDistances = 'Add a numeric race distance (e.g. 100K) - it sets the completion goal for accumulated challenges.';
      }
      if (!Number.isFinite(formData.minimumActivityDistanceKm) || formData.minimumActivityDistanceKm <= 0) {
        errors.minimumActivityDistanceKm = 'Minimum activity distance is required for accumulated-distance events.';
      }
      if (!Array.isArray(formData.acceptedRunTypes) || !formData.acceptedRunTypes.length) {
        errors.acceptedRunTypes = 'Select at least one accepted activity type.';
      }
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
  if (!isValidUrl(formData.paymentQrImageUrl)) {
    errors.paymentQrImageUrl = 'Payment QR URL must be a valid URL.';
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

  // targetDistanceKm is derived from raceDistances - no manual input to validate here
  if (formData.minimumActivityDistanceKm !== null && (!Number.isFinite(formData.minimumActivityDistanceKm) || formData.minimumActivityDistanceKm <= 0)) {
    errors.minimumActivityDistanceKm = 'Minimum activity distance must be greater than 0.';
  }
  if (formData.feeMode === 'paid') {
    if (formData.feeAmount !== null && (!Number.isFinite(formData.feeAmount) || formData.feeAmount < 0)) {
      errors.feeAmount = 'Paid event amount must be zero or higher.';
    }
    if (!/^[A-Z]{3}$/.test(formData.feeCurrency || '')) {
      errors.feeCurrency = 'Currency must be a 3-letter code.';
    }
  }
  if ((formData.eventDetailsMarkdown || '').length > 20000) {
    errors.eventDetailsMarkdown = 'Event details must be 20,000 characters or less.';
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
    return Event.findOne({ _id: eventId, organizerId: userId, isDeleted: { $ne: true } });
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
  const validStatuses = ['draft', 'pending_review', 'published', 'closed', 'archived'];
  if (!validStatuses.includes(nextStatus)) {
    return 'Invalid target status.';
  }
  if (currentStatus === nextStatus) {
    return `Event is already ${currentStatus}.`;
  }

  const allowed = {
    draft: ['pending_review'],
    pending_review: [],
    published: ['closed'],
    closed: [],
    archived: []
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
  if (normalizedField === 'paymentQrImageFile') return 'paymentQrImageUrl';
  if (normalizedField === 'galleryImageFiles') return 'galleryImageUrls';
  return 'bannerImageUrl';
}

function acceptsJson(req) {
  const accept = String(req.get('accept') || '').toLowerCase();
  if (accept.includes('text/html') && !accept.includes('application/json')) {
    return false;
  }
  return true;
}

function isChecked(value) {
  if (Array.isArray(value)) {
    return value.some((item) => item === '1' || item === 'true' || item === 'on');
  }
  return value === '1' || value === 'true' || value === 'on';
}

function getPublishReadinessErrors(event) {
  return eventFormService.getPublishReadinessErrors(event);
  const formData = getCreateEventFormDataFromEvent(event);
  formData.actionType = 'publish';
  const errors = validateCreateEventForm(formData);
  return Object.values(errors);
}

function getEventReadinessChecklist(formData) {
  return eventFormService.getEventReadinessChecklist(formData);
}

function getEventReviewSummary(formData) {
  return eventFormService.getEventReviewSummary(formData);
}

function getConsistencyWarnings(formData) {
  return eventFormService.validateRewardPricingConsistency(formData).warnings;
}

module.exports = router;
