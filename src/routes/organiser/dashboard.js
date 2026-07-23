// src/routes/organiser/dashboard.js
const express = require('express');
const router = express.Router();
const {
  logger,
  mongoose,
  User,
  OrganiserApplication,
  Event,
  Registration,
  Submission,
  AccumulatedActivitySubmission,
  requireAuth,
  requireCsrfProtection,
  getRunnerEarnedBadges,
  normalizeOrganizerDashboardRange,
  getOrganizerDashboardRangeLabel,
  getOrganizerDashboardRangeWindow,
  getOrganizerDashboardRegistrationMetrics,
  getOrganizerDashboardSubmissionMetrics,
  buildOrganizerTrendMetric,
  getPageMessage
} = require('./_shared');

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
      nextAccumulatedResultReview,
      unpaidRegistrationsCount
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
        : null,
      organizerEventIds.length
        ? Registration.countDocuments({ eventId: { $in: organizerEventIds }, paymentStatus: 'unpaid', status: 'confirmed' })
        : 0
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
          logger.error('Error loading organiser dashboard badges:', error);
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
          }
        ]
      : [
          {
            icon: 'plus-circle',
            label: 'Create New Event',
            href: '#pending-create-event-modal',
            description: 'Set up a free virtual running event',
            pendingCreateEvent: true
          },
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
        unpaidRegistrations: unpaidRegistrationsCount,
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
      utilitiesOpen: !isApprovedOrganizer || totalEvents === 0 || totalRegistrations === 0,
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
    logger.error('Error loading organizer dashboard:', error);
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

    if (!user.emailVerified) {
      return res.redirect('/organizer/dashboard?ack_error=email_unverified');
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
    logger.error('Error saving event creation acknowledgement:', error);
    return res.redirect('/organizer/dashboard?ack_error=server');
  }
});

module.exports = router;
