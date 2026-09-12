// src/routes/organiser/review.js
const express = require('express');
const router = express.Router();
const { getRejectionReasonOptions, resolveRejectionReason } = require('../../utils/rejection-reasons');
const { redirectWithFlash } = require('../../utils/session-flash');
const { normalizeSubmissionHubFilters } = require('../../services/submission-hub.service');
const { resolveChallengeConfig } = require('../../utils/challenge-metrics');
const {
  REVIEW_CHECKLIST_VERSION,
  buildRunProofVerificationCriteria,
  buildRunRejectionReasonOptions
} = require('../../utils/run-proof-review');
const {
  logger,
  mongoose,
  User,
  Event,
  Registration,
  Submission,
  AccumulatedActivitySubmission,
  requireAuth,
  requireCsrfProtection,
  notifyWithRetry,
  notifyWithRetryInBackground,
  buildSubmissionReviewSignal,
  reviewSubmission,
  recordCriticalAuditEventInBackground,
  evaluateRegistrationAchievementsInBackground,
  syncRegistrationPaymentShadowInBackground,
  reviewAccumulatedActivitySubmission,
  buildSubmissionHubPath,
  listSubmissionHub,
  listSubmissionHubEvents,
  canOrganizerReviewPaymentProof,
  paymentReviewActionLimiter,
  submissionReviewActionLimiter,
  registrantExportLimiter,
  directMessageLimiter,
  PAYMENT_PROOF_REVIEW_PAGE_SIZE,
  RUN_PROOF_REVIEW_PAGE_SIZE,
  getSubmissionSourceLabel,
  normalizePaymentProofReviewFilters,
  getPaymentProofReviewStatusQuery,
  buildPaymentProofReviewPath,
  buildPaymentProofReviewRow,
  normalizeRunProofReviewFilters,
  buildRunProofReviewQuery,
  getRunProofReviewSortSpec,
  mergeRunProofReviewDocs,
  buildRunProofReviewPath,
  buildRunProofQueueContextParams,
  buildSubmissionReviewPath,
  normalizeRunProofQueueContext,
  buildRunProofReviewRow,
  getSubmissionReviewContext,
  canAccessRegistrantReview,
  getRegistrantAccessibleEventOrNull,
  getPageMessage,
  getRequestIpAddress,
  getRequestUserAgent,
  escapeRegex,
  isFullAdminTier,
  csvEscape,
  REVIEW_REASON_LABELS
} = require('./_shared');

async function getNextPendingRunProof(eventId) {
  const sort = { submittedAt: 1, _id: 1 };
  const select = '_id submittedAt createdAt';
  const [standard, accumulated] = await Promise.all([
    Submission.findOne({ eventId, status: 'submitted' }).sort(sort).select(select).lean(),
    AccumulatedActivitySubmission.findOne({ eventId, status: 'submitted' }).sort(sort).select(select).lean()
  ]);
  const next = mergeRunProofReviewDocs(
    standard ? [standard] : [],
    accumulated ? [accumulated] : [],
    'oldest'
  )[0];
  return next?.submission || null;
}

// Finds the next item after `currentSubmissionId` in the exact same
// filtered/sorted/searched queue an organizer was browsing (not a global
// default), so a decision advances them through their own view of the
// queue instead of into an unrelated one. Must be computed BEFORE the
// current item's status is mutated, since a status-filtered context (e.g.
// "pending") would otherwise no longer match it once decided.
async function getNextRunProofInQueueContext(eventId, queueContext, currentSubmissionId) {
  const query = await buildRunProofReviewQuery(eventId, queueContext);
  const sortSpec = getRunProofReviewSortSpec(queueContext.sort);
  const select = '_id submittedAt createdAt';
  const [standardDocs, accumulatedDocs] = await Promise.all([
    Submission.find(query).sort(sortSpec).select(select).lean(),
    AccumulatedActivitySubmission.find(query).sort(sortSpec).select(select).lean()
  ]);
  const merged = mergeRunProofReviewDocs(standardDocs, accumulatedDocs, queueContext.sort);
  const currentIndex = merged.findIndex(
    (entry) => String(entry.submission._id) === String(currentSubmissionId)
  );
  if (currentIndex === -1) return null;
  return merged[currentIndex + 1]?.submission || null;
}

async function redirectAfterRunProofDecision(res, eventId, message, queueContext, nextSubmission) {
  if (nextSubmission) {
    return res.redirect(buildSubmissionReviewPath(eventId, nextSubmission._id, {
      queueStatus: queueContext.status,
      queueSort: queueContext.sort,
      queueQ: queueContext.q,
      queuePage: queueContext.page
    }, { type: 'success', msg: message }));
  }
  const queuePath = buildRunProofReviewPath(eventId, queueContext);
  const fallbackMessage = queueContext.status === 'pending'
    ? `${message} No pending proofs remain.`
    : `${message} No more items match your current filters.`;
  const separator = queuePath.includes('?') ? '&' : '?';
  const params = new URLSearchParams({ type: 'success', msg: fallbackMessage });
  return res.redirect(`${queuePath}${separator}${params.toString()}`);
}

router.get('/events/:id/submissions/export', requireAuth, registrantExportLimiter, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId).select('role organizerStatus');
    if (!user || !canAccessRegistrantReview(user)) return res.status(403).send('Access denied.');
    const event = await getRegistrantAccessibleEventOrNull(req.params.id, user);
    if (!event) return res.status(404).send('Event not found.');
    const activities = await AccumulatedActivitySubmission.find({ eventId: event._id })
      .sort({ runDate: 1, submittedAt: 1 })
      .populate('registrationId', 'confirmationCode participant')
      .lean();
    const headers = ['Confirmation Code', 'Participant', 'Department', 'Activity Date', 'Activity Type', 'Distance (km)', 'Elevation Gain (m)', 'Tracking App or Device', 'Status', 'Submitted At', 'Reviewed At'];
    const rows = activities.map((activity) => {
      const registration = activity.registrationId || {};
      const participant = registration.participant || {};
      return [registration.confirmationCode || '', [participant.firstName, participant.lastName].filter(Boolean).join(' '), participant.department || '', activity.runDate?.toISOString?.() || '', activity.runType || '', activity.distanceKm ?? '', activity.elevationGain ?? '', activity.trackingAppDevice || participant.preferredFitnessApp || '', activity.status || '', activity.submittedAt?.toISOString?.() || '', activity.reviewedAt?.toISOString?.() || ''];
    });
    recordCriticalAuditEventInBackground({
      actorMongoUserId: user._id,
      action: 'event.submissions_exported',
      targetType: 'event',
      targetId: String(event._id),
      notes: `Exported ${rows.length} accumulated activity submissions as CSV.`,
      ipAddress: getRequestIpAddress(req),
      userAgent: getRequestUserAgent(req)
    });
    return sendEventCsv(res, event.slug, 'submissions', headers, rows);
  } catch (error) {
    logger.error('Error exporting event submissions:', error);
    return res.status(500).send('Unable to export submissions.');
  }
});

router.get('/events/:id/participant-totals/export', requireAuth, registrantExportLimiter, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId).select('role organizerStatus');
    if (!user || !canAccessRegistrantReview(user)) return res.status(403).send('Access denied.');
    const event = await getRegistrantAccessibleEventOrNull(req.params.id, user);
    if (!event) return res.status(404).send('Event not found.');
    const registrations = await Registration.find({ eventId: event._id }).sort({ registeredAt: 1 }).lean();
    const totals = await AccumulatedActivitySubmission.aggregate([
      { $match: { eventId: event._id } },
      { $group: {
        _id: '$registrationId',
        approvedDistanceKm: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, { $ifNull: ['$distanceKm', 0] }, 0] } },
        approvedElevationGainM: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, { $ifNull: ['$elevationGain', 0] }, 0] } },
        approvedActivityCount: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } },
        pendingActivityCount: { $sum: { $cond: [{ $eq: ['$status', 'submitted'] }, 1, 0] } },
        clarificationActivityCount: { $sum: { $cond: [{ $eq: ['$status', 'needs_clarification'] }, 1, 0] } },
        rejectedActivityCount: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } },
        certificateTypes: { $addToSet: '$certificate.type' }
      } }
    ]);
    const byRegistration = new Map(totals.map((row) => [String(row._id), row]));
    const headers = ['Confirmation Code', 'Participant', 'Email', 'Department', 'Position', 'Tracking App or Device', 'Approved Distance (km)', 'Approved Elevation Gain (m)', 'Approved Activities', 'Pending Activities', 'Needs Clarification', 'Rejected Activities', 'Status', 'Certificate Type'];
    const rows = registrations.map((registration) => {
      const participant = registration.participant || {};
      const total = byRegistration.get(String(registration._id)) || {};
      const distance = Number(total.approvedDistanceKm || 0);
      const certificateType = (total.certificateTypes || []).find((value) => value === 'finisher' || value === 'participation') || (distance >= Number(event.targetDistanceKm || 50) ? 'finisher' : (Number(total.approvedActivityCount || 0) > 0 && event.participationCertificateEnabled ? 'participation' : ''));
      const approvedCount = Number(total.approvedActivityCount || 0);
      const participantStatus = distance >= Number(event.targetDistanceKm || 50)
        ? 'Finisher'
        : approvedCount > 0 ? 'Participant' : 'No approved activities';
      return [registration.confirmationCode || '', [participant.firstName, participant.lastName].filter(Boolean).join(' '), participant.email || '', participant.department || '', participant.position || '', participant.preferredFitnessApp || '', distance.toFixed(2), Number(total.approvedElevationGainM || 0).toFixed(0), approvedCount, Number(total.pendingActivityCount || 0), Number(total.clarificationActivityCount || 0), Number(total.rejectedActivityCount || 0), participantStatus, certificateType];
    });
    recordCriticalAuditEventInBackground({
      actorMongoUserId: user._id,
      action: 'event.participant_totals_exported',
      targetType: 'event',
      targetId: String(event._id),
      notes: `Exported ${rows.length} consolidated participant totals as CSV.`,
      ipAddress: getRequestIpAddress(req),
      userAgent: getRequestUserAgent(req)
    });
    return sendEventCsv(res, event.slug, 'participant-totals', headers, rows);
  } catch (error) {
    logger.error('Error exporting event participant totals:', error);
    return res.status(500).send('Unable to export participant totals.');
  }
});

function sendEventCsv(res, slug, suffix, headers, rows) {
  const csv = [headers, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');
  const safeSlug = String(slug || 'event').replace(/[^a-zA-Z0-9-_]/g, '');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${safeSlug}-${suffix}-${new Date().toISOString().slice(0, 10)}.csv"`);
  return res.status(200).send(csv);
}

/* ==========================================
   GET: All Submissions Hub
   ========================================== */

const ORGANIZER_SUBMISSION_DEFAULTS = Object.freeze({
  status: 'submitted',
  sort: 'oldest',
  pageSize: 25
});

async function listAccessibleReviewEvents(user) {
  if (user.role === 'admin') return Event.find({ isDeleted: { $ne: true } }).select('_id').lean();
  const { getAccessibleEventIdQuery } = require('../../services/event-access.service');
  const accessQuery = await getAccessibleEventIdQuery(user);
  return Event.find({ ...accessQuery, isDeleted: { $ne: true } }).select('_id').lean();
}

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

    const accessibleEvents = await listAccessibleReviewEvents(user);
    const eventIds = accessibleEvents.map((event) => String(event._id));
    const [hub, events] = await Promise.all([
      listSubmissionHub({ filters: req.query, eventIds, defaults: ORGANIZER_SUBMISSION_DEFAULTS }),
      listSubmissionHubEvents({ eventIds })
    ]);
    const basePath = '/organizer/submissions';
    const buildHubPath = (overrides) => buildSubmissionHubPath(
      basePath,
      hub.filters,
      overrides,
      ORGANIZER_SUBMISSION_DEFAULTS
    );

    return res.render('organizer/submissions', {
      title: 'Run Submissions - HelloRun Organizer',
      user,
      isAdminViewer: user.role === 'admin',
      filters: hub.filters,
      submissions: hub.items,
      counts: hub.counts,
      pagination: hub.pagination,
      events,
      message: getPageMessage(req.query),
      hasAdvancedFilters: Boolean(
        hub.filters.type !== 'all' ||
        hub.filters.eventId ||
        hub.filters.sort !== ORGANIZER_SUBMISSION_DEFAULTS.sort ||
        hub.filters.pageSize !== ORGANIZER_SUBMISSION_DEFAULTS.pageSize
      ),
      links: {
        all: buildHubPath({ status: 'all', page: 1 }),
        submitted: buildHubPath({ status: 'submitted', page: 1 }),
        approved: buildHubPath({ status: 'approved', page: 1 }),
        rejected: buildHubPath({ status: 'rejected', page: 1 }),
        prev: hub.pagination.page > 1 ? buildHubPath({ page: hub.pagination.page - 1 }) : '',
        next: hub.pagination.page < hub.pagination.totalPages ? buildHubPath({ page: hub.pagination.page + 1 }) : '',
        reset: basePath,
        events: '/organizer/events',
        dashboard: user.role === 'admin' ? '/admin/dashboard' : '/organizer/dashboard'
      }
    });
  } catch (error) {
    logger.error('Error loading organizer submissions:', error);
    return res.status(500).render('error', {
      title: 'Server Error',
      status: 500,
      message: 'An error occurred while loading run submissions.'
    });
  }
});

/* ==========================================
   POST: Quick Approve Clean Submission
   ========================================== */

router.post('/submissions/:submissionId/quick-approve', requireAuth, requireCsrfProtection, submissionReviewActionLimiter, async (req, res) => {
  const returnPath = buildOrganizerSubmissionReturnPath(req.body);
  try {
    const user = await User.findById(req.session.userId).select('firstName lastName email role organizerStatus');
    if (!user || user.role === 'admin' || !canAccessRegistrantReview(user)) {
      return respondToSubmissionHubAction(req, res, {
        ok: false,
        status: 403,
        message: 'Only approved organisers can quick-approve submissions.',
        returnPath
      });
    }

    const accessibleEvents = await listAccessibleReviewEvents(user);
    await approveCleanSubmission({
      submissionId: req.params.submissionId,
      eventIds: accessibleEvents.map((event) => String(event._id)),
      user,
      reviewNotes: req.body.reviewNotes
    });

    return respondToSubmissionHubAction(req, res, {
      ok: true,
      message: 'Submission approved.',
      returnPath
    });
  } catch (error) {
    return respondToSubmissionHubAction(req, res, {
      ok: false,
      status: 409,
      message: String(error?.message || 'Unable to approve this submission.'),
      returnPath
    });
  }
});

/* ==========================================
   GET: Submission Review Panel (AJAX, JSON)
   ========================================== */

router.get('/submissions/:submissionId/review-panel', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId).select('firstName lastName email role organizerStatus adminTier');
    if (!user || !canAccessRegistrantReview(user)) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }
    const isFullAdmin = user.role === 'admin' && isFullAdminTier(user);

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
        fullPageUrl: `/organizer/events/${String(event._id)}/submissions/${String(submission._id)}/review`,
        ...(isFullAdmin ? {
          isFullAdmin: true,
          adminAudit: {
            detectedSource: ocrData.detectedSource || '',
            validationMethod: submission.validation?.method || 'unknown',
            autoApprovalEligible: Boolean(submission.validation?.autoApprovalEligible),
            reviewRequired: Boolean(submission.validation?.reviewRequired),
            submissionMode: submission.validation?.submissionMode || 'unknown',
            reviewReasonCode: submission.validation?.reviewReason || ''
          },
          correctionUrl: `/admin/submissions/${String(submission._id)}/correct`,
          reviewReasonOptions: Object.entries(REVIEW_REASON_LABELS).map(([value, label]) => ({ value, label }))
        } : {})
      }
    });
  } catch (error) {
    logger.error('Submission review panel error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load submission details.' });
  }
});

/* ==========================================
   POST: Bulk Approve Submissions
   ========================================== */

router.post('/submissions/bulk-approve', requireAuth, requireCsrfProtection, submissionReviewActionLimiter, async (req, res) => {
  const returnPath = buildOrganizerSubmissionReturnPath(req.body);
  try {
    const user = await User.findById(req.session.userId).select('firstName lastName email role organizerStatus');
    if (!user || !canAccessRegistrantReview(user)) {
      return respondToSubmissionHubAction(req, res, {
        ok: false,
        status: 403,
        message: 'Access denied.',
        returnPath
      });
    }

    if (user.role === 'admin') {
      return respondToSubmissionHubAction(req, res, {
        ok: false,
        status: 403,
        message: 'Bulk approval is available to approved organisers on this page.',
        returnPath
      });
    }

    const rawIds = Array.isArray(req.body.submissionIds)
      ? req.body.submissionIds
      : String(req.body.submissionIds || '').split(',').filter(Boolean);
    const submissionIds = Array.from(new Set(rawIds.map((id) => String(id).trim()).filter(Boolean)));
    if (!submissionIds.length) {
      return respondToSubmissionHubAction(req, res, {
        ok: false,
        status: 400,
        message: 'No submissions selected.',
        returnPath
      });
    }
    if (submissionIds.length > 50) {
      return respondToSubmissionHubAction(req, res, {
        ok: false,
        status: 400,
        message: 'Select no more than 50 submissions at a time.',
        returnPath
      });
    }

    const reviewNotes = String(req.body.reviewNotes || '').trim().slice(0, 1200);
    const accessibleEvents = await listAccessibleReviewEvents(user);
    const eventIds = accessibleEvents.map((event) => String(event._id));
    const results = await Promise.allSettled(
      submissionIds.map((id) =>
        approveCleanSubmission({
          submissionId: id,
          eventIds,
          user,
          reviewNotes
        })
      )
    );

    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.length - succeeded;
    const msg = failed > 0
      ? `${succeeded} submission${succeeded !== 1 ? 's' : ''} approved. ${failed} skipped because individual review was required, the result was already reviewed, or it was inaccessible.`
      : `${succeeded} submission${succeeded !== 1 ? 's' : ''} approved.`;

    return respondToSubmissionHubAction(req, res, {
      ok: succeeded > 0,
      status: succeeded > 0 ? 200 : 409,
      message: msg,
      data: { succeeded, failed, requested: submissionIds.length },
      returnPath
    });
  } catch (error) {
    logger.error('Bulk submission approve error:', error);
    return respondToSubmissionHubAction(req, res, {
      ok: false,
      status: 500,
      message: 'An error occurred during bulk approval.',
      returnPath
    });
  }
});

async function approveCleanSubmission({ submissionId, eventIds, user, reviewNotes }) {
  if (!mongoose.Types.ObjectId.isValid(String(submissionId || ''))) {
    throw new Error('Submission is no longer available.');
  }
  const eventObjectIds = eventIds.map((eventId) => new mongoose.Types.ObjectId(eventId));
  let submission = await Submission.findOne({
    _id: submissionId,
    eventId: { $in: eventObjectIds }
  });
  let submissionKind = 'standard';
  if (!submission) {
    submission = await AccumulatedActivitySubmission.findOne({
      _id: submissionId,
      eventId: { $in: eventObjectIds }
    });
    submissionKind = 'accumulated';
  }
  if (!submission) throw new Error('Submission is no longer available or accessible.');
  if (submission.status !== 'submitted') throw new Error('Submission has already been reviewed.');
  const reviewSignal = buildSubmissionReviewSignal(submission);
  if (submission.suspiciousFlag || reviewSignal.label) {
    throw new Error('This submission requires individual review.');
  }

  const common = {
    organizerId: user._id,
    reviewerRole: 'organiser',
    action: 'approve',
    reviewNotes: String(reviewNotes || '').trim().slice(0, 1200)
  };
  if (submissionKind === 'accumulated') {
    return reviewAccumulatedActivitySubmission({ activityId: submission._id, ...common });
  }
  return reviewSubmission({ submissionId: submission._id, ...common });
}

function buildOrganizerSubmissionReturnPath(body = {}) {
  const filters = {
    status: body.returnStatus,
    type: body.returnType,
    eventId: body.returnEventId,
    sort: body.returnSort,
    q: body.returnQ,
    pageSize: body.returnPageSize,
    page: body.returnPage
  };
  const normalized = normalizeSubmissionHubFilters(
    filters,
    ORGANIZER_SUBMISSION_DEFAULTS
  );
  return buildSubmissionHubPath(
    '/organizer/submissions',
    normalized,
    {},
    ORGANIZER_SUBMISSION_DEFAULTS
  );
}

function respondToSubmissionHubAction(req, res, { ok, status = 200, message, data = {}, returnPath }) {
  const wantsJson = req.xhr || String(req.get('accept') || '').includes('application/json');
  if (wantsJson) {
    return res.status(status).json({ success: ok, message, returnPath, ...data });
  }
  return redirectWithFlash(req, res, returnPath, ok ? 'success' : 'error', message);
}

/* ==========================================
   POST: Bulk Approve Payment Proofs
   ========================================== */

router.post('/events/:id/payment-reviews/bulk-approve', requireAuth, requireCsrfProtection, async (req, res) => {
  const returnFilters = normalizePaymentProofReviewFilters({
    status: req.body.returnStatus,
    q: req.body.returnQ,
    page: req.body.returnPage
  });
  const buildReturnHref = (eventId) => buildPaymentProofReviewPath(eventId, returnFilters);
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
      return redirectWithFlash(req, res, buildReturnHref(event._id), 'error', 'No payment proofs selected.');
    }

    const reviewNotes = String(req.body.reviewNotes || '').trim().slice(0, 1000);

    const results = await Promise.allSettled(
      registrationIds.map(async (regId) => {
        const registration = await Registration.findOne({ _id: regId, eventId: event._id });
        if (!registration || !canOrganizerReviewPaymentProof(registration)) throw new Error('Skipped');
        if (String(registration.userId) === String(user._id)) throw new Error('Skipped');
        const previousStatus = registration.paymentStatus;
        registration.paymentStatus = 'paid';
        registration.paymentReviewedAt = new Date();
        registration.paymentReviewedBy = user._id;
        registration.paymentReviewNotes = reviewNotes;
        registration.paymentRejectionReason = '';
        registration.paymentRejectionCode = '';
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
        notifyWithRetryInBackground('payment.approved', {
          notification: { userId: registration.userId, type: 'payment_approved', title: 'Payment Approved', message: `Your payment for ${event.title || 'the event'} has been approved.`, href: `/my-registrations#registration-${String(registration._id)}`, metadata: { registrationId: String(registration._id), eventId: String(event._id), eventTitle: event.title || '' } },
          email: runner?.email ? { to: runner.email, firstName: runner.firstName || 'Runner', eventTitle: event.title || 'Event', confirmationCode: registration.confirmationCode || '', recipientUserId: registration.userId, metadata: { registrationId: String(registration._id), eventId: String(event._id) } } : null
        }, {
          source: 'organizer.bulk_payment_approve'
        });
      })
    );

    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.length - succeeded;
    const msg = failed > 0
      ? `${succeeded} payment${succeeded !== 1 ? 's' : ''} approved. ${failed} skipped.`
      : `${succeeded} payment${succeeded !== 1 ? 's' : ''} approved.`;

    return redirectWithFlash(req, res, buildReturnHref(event._id), succeeded > 0 ? 'success' : 'error', msg);
  } catch (error) {
    logger.error('Bulk payment approve error:', error);
    return redirectWithFlash(req, res, buildReturnHref(req.params.id), 'error', 'An error occurred during bulk approval.');
  }
});

/* ==========================================
   POST: Send Direct Message to Registrant
   ========================================== */

router.post('/events/:id/registrants/:registrationId/send-message', requireAuth, requireCsrfProtection, directMessageLimiter, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId).select('firstName lastName email role organizerStatus');
    if (!user || !canAccessRegistrantReview(user)) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const event = await getRegistrantAccessibleEventOrNull(req.params.id, user);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }

    const registration = await Registration.findOne({
      _id: req.params.registrationId,
      eventId: event._id
    }).populate('userId', 'email firstName').lean();

    if (!registration?.userId?.email) {
      const q = new URLSearchParams({ type: 'error', msg: 'Runner not found or has no email address.' });
      return res.redirect(`/organizer/events/${event._id}/registrants?${q}`);
    }

    const message = String(req.body.message || '').trim().slice(0, 1000);
    const subject = String(req.body.subject || '').trim().slice(0, 200) || `Message about ${event.title}`;
    if (message.length < 5) {
      const q = new URLSearchParams({ type: 'error', msg: 'Message is too short.' });
      return res.redirect(`/organizer/events/${event._id}/registrants?${q}`);
    }

    const organiserName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Event Organiser';
    notifyWithRetryInBackground('organiser.direct_message', {
      notification: {
        userId: registration.userId._id || registration.userId,
        type: 'organiser_message',
        title: `Message from ${event.title}`,
        message: message.slice(0, 200),
        href: `/my-registrations#registration-${String(registration._id)}`,
        metadata: { eventId: String(event._id), eventTitle: event.title }
      },
      email: {
        to: registration.userId.email,
        subject: `[${event.title}] ${subject}`,
        organiserName,
        eventTitle: event.title,
        message,
        replyTo: user.email,
        recipientUserId: registration.userId._id || registration.userId,
        firstName: registration.participant?.firstName || '',
        metadata: { registrationId: String(registration._id), eventId: String(event._id) }
      }
    });

    const q = new URLSearchParams({ type: 'success', msg: `Message sent to ${registration.participant?.firstName || 'runner'}.` });
    return res.redirect(`/organizer/events/${event._id}/registrants?${q}`);
  } catch (error) {
    logger.error('Organiser direct message error:', error);
    const q = new URLSearchParams({ type: 'error', msg: 'Unable to send message right now.' });
    return res.redirect(`/organizer/events/${req.params.id}/registrants?${q}`);
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
        notifyWithRetryInBackground('organiser.payment_reminder', {
          email: {
            to: runner.email,
            firstName: runner.firstName || 'Runner',
            eventTitle: event.title || 'Event',
            eventUrl: `${appUrl}/events/${event.slug}`,
            confirmationCode: reg.confirmationCode || '',
            recipientUserId: reg.userId,
            metadata: { registrationId: String(reg._id), eventId: String(event._id) }
          }
        }, {
          source: 'organizer.payment_reminder'
        });
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
    logger.error('Bulk email unpaid error:', error);
    const q = new URLSearchParams({ type: 'error', msg: 'An error occurred while sending emails.' });
    return res.redirect(`/organizer/events/${req.params.id}/registrants?${q}`);
  }
});

/* ==========================================
   GET: Payment Proof Review
   ========================================== */

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
      paymentRejectionReasonOptions: getRejectionReasonOptions('payment'),
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
    logger.error('Error loading payment proof review:', error);
    return res.status(500).render('error', {
      title: 'Server Error',
      status: 500,
      message: 'An error occurred while loading payment proof review.'
    });
  }
});

/* ==========================================
   GET: Run Proof Review
   ========================================== */

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
      accumulatedRejected,
      accumulatedNeedsClarification
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
      AccumulatedActivitySubmission.countDocuments({ eventId: event._id, status: 'rejected' }),
      // Only accumulated-activity submissions can ever sit in needs_clarification
      // (Submission's status enum has no such value) — included here so the
      // "Pending" tab's displayed count matches what its own query actually
      // includes (see getRunProofReviewStatusQuery's default branch).
      AccumulatedActivitySubmission.countDocuments({ eventId: event._id, status: 'needs_clarification' })
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

    const pendingCount = standardPending + accumulatedPending + accumulatedNeedsClarification;
    const approvedCount = standardApproved + accumulatedApproved;
    const autoApprovedCount = standardAutoApproved + accumulatedAutoApproved;
    const rejectedCount = standardRejected + accumulatedRejected;
    const oldestPending = pendingCount > 0 ? await getNextPendingRunProof(event._id) : null;

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
        registrants: `/organizer/events/${event._id}/registrants`,
        reviewOldest: oldestPending
          ? buildSubmissionReviewPath(event._id, oldestPending._id, { queueStatus: 'pending', queueSort: 'oldest' })
          : ''
      }
    });
  } catch (error) {
    logger.error('Error loading run proof review:', error);
    return res.status(500).render('error', {
      title: 'Server Error',
      status: 500,
      message: 'An error occurred while loading run proof review.'
    });
  }
});

/* ==========================================
   GET: Individual Submission Review
   ========================================== */

router.get('/events/:id/submissions/:submissionId/review', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId).select('firstName lastName email role organizerStatus adminTier');
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

    const isFullAdmin = user.role === 'admin' && isFullAdminTier(user);
    return res.render('organizer/submission-review', {
      title: `Submission Review - ${event.title}`,
      user,
      isAdminViewer: user.role === 'admin',
      isFullAdmin,
      reviewReasonOptions: isFullAdmin ? Object.entries(REVIEW_REASON_LABELS) : [],
      runRejectionReasonOptions: buildRunRejectionReasonOptions(event, context.submission),
      reviewChecklistVersion: REVIEW_CHECKLIST_VERSION,
      verificationCriteria: buildRunProofVerificationCriteria(event, context.submission),
      event,
      challengeConfig: resolveChallengeConfig(event),
      message: getPageMessage(req.query),
      ...context
    });
  } catch (error) {
    logger.error('Error loading submission review:', error);
    return res.status(500).render('error', {
      title: 'Server Error',
      status: 500,
      message: 'An error occurred while loading submission review.'
    });
  }
});

/* ==========================================
   POST: Approve Payment
   ========================================== */

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

      // Guard: organiser cannot approve their own payment proof
      const targetReg = await Registration.findOne({
        _id: req.params.registrationId,
        eventId: event._id
      }).select('userId').lean();
      if (targetReg && String(targetReg.userId) === String(user._id)) {
        recordCriticalAuditEventInBackground({
          actorMongoUserId: user._id,
          action: 'payment.self_approval_blocked',
          targetType: 'registration',
          targetId: String(req.params.registrationId),
          statusFrom: '',
          statusTo: '',
          notes: '[SELF-APPROVAL BLOCKED] Organiser attempted to approve their own payment proof.',
          ipAddress: getRequestIpAddress(req),
          userAgent: getRequestUserAgent(req),
          occurredAt: new Date()
        });
        const q = new URLSearchParams({ type: 'error', msg: 'You cannot approve your own payment proof.' });
        return res.redirect(`/organizer/events/${event._id}/registrants?${q.toString()}`);
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
            paymentRejectionReason: '',
            paymentRejectionCode: ''
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
        await notifyWithRetry('payment.approved', {
          notification: {
            userId: registration.userId,
            type: 'payment_approved',
            title: 'Payment Approved',
            message: `Your payment for ${event.title || 'the event'} has been approved.`,
            href: `/my-registrations#registration-${String(registration._id)}`,
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
        }, {
          source: 'organizer.payment_approve'
        });
      } catch (communicationError) {
        logger.error('Payment approval communication failed:', {
          error: communicationError.message,
          registrationId: String(registration._id)
        });
      }

      const q = new URLSearchParams({ type: 'success', msg: 'Payment marked as approved.' });
      return res.redirect(`/organizer/events/${event._id}/registrants?${q.toString()}`);
    } catch (error) {
      logger.error('Error approving payment receipt:', error);
      return res.status(500).render('error', {
        title: 'Server Error',
        status: 500,
        message: 'An error occurred while approving payment receipt.'
      });
    }
  }
);

/* ==========================================
   POST: Reject Payment
   ========================================== */

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

      let resolvedRejection;
      try {
        resolvedRejection = resolveRejectionReason(
          'payment',
          req.body.rejectionCode,
          req.body.rejectionReason,
          { allowLegacyDetail: true }
        );
      } catch (validationError) {
        const q = new URLSearchParams({ type: 'error', msg: validationError.message });
        return res.redirect(`/organizer/events/${event._id}/registrants?${q.toString()}`);
      }
      const rejectionReason = resolvedRejection.runnerMessage;
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
            paymentStatus: 'proof_rejected',
            paymentReviewedAt: reviewedAt,
            paymentReviewedBy: user._id,
            paymentReviewNotes: reviewNotes,
            paymentRejectionReason: rejectionReason,
            paymentRejectionCode: resolvedRejection.code
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
        await notifyWithRetry('payment.rejected', {
          notification: {
            userId: registration.userId,
            type: 'payment_rejected',
            title: 'Payment Needs Update',
            message: `Your payment receipt for ${event.title || 'the event'} was rejected. Please review and resubmit.`,
            href: `/my-registrations#registration-${String(registration._id)}`,
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
        }, {
          source: 'organizer.payment_reject'
        });
      } catch (communicationError) {
        logger.error('Payment rejection communication failed:', {
          error: communicationError.message,
          registrationId: String(registration._id)
        });
      }

      const q = new URLSearchParams({ type: 'success', msg: 'Payment receipt rejected and runner notified.' });
      return res.redirect(`/organizer/events/${event._id}/registrants?${q.toString()}`);
    } catch (error) {
      logger.error('Error rejecting payment receipt:', error);
      return res.status(500).render('error', {
        title: 'Server Error',
        status: 500,
        message: 'An error occurred while rejecting payment receipt.'
      });
    }
  }
);

/* ==========================================
   POST: Approve Submission
   ========================================== */

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

      const queueContext = normalizeRunProofQueueContext(req.body);

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
          const queuePath = buildRunProofReviewPath(event._id, queueContext);
          const separator = queuePath.includes('?') ? '&' : '?';
          return res.redirect(`${queuePath}${separator}type=error&msg=${encodeURIComponent('Submission record not found for this event.')}`);
        }

        const nextItem = await getNextRunProofInQueueContext(event._id, queueContext, activityRecord._id);
        const reviewNotes = String(req.body.reviewNotes || '').trim().slice(0, 1200);
        await reviewAccumulatedActivitySubmission({
          activityId: activityRecord._id,
          organizerId: user._id,
          reviewerRole: user.role,
          action: 'approve',
          reviewNotes,
          checklistVersion: req.body.checklistVersion,
          verifiedCriteria: req.body.verifiedCriteria,
          requireVerification: true
        });

        return redirectAfterRunProofDecision(res, event._id, 'Activity submission approved.', queueContext, nextItem);
      }

      const nextItem = await getNextRunProofInQueueContext(event._id, queueContext, submissionRecord._id);
      const reviewNotes = String(req.body.reviewNotes || '').trim().slice(0, 1200);
      await reviewSubmission({
        submissionId: submissionRecord._id,
        organizerId: user._id,
        reviewerRole: user.role,
        action: 'approve',
        reviewNotes,
        checklistVersion: req.body.checklistVersion,
        verifiedCriteria: req.body.verifiedCriteria,
        requireVerification: true
      });

      return redirectAfterRunProofDecision(res, event._id, 'Run result approved.', queueContext, nextItem);
    } catch (error) {
      return res.redirect(buildSubmissionReviewPath(req.params.id, req.params.submissionId, req.body, {
        type: 'error',
        msg: String(error?.message || 'Unable to approve submission.')
      }));
    }
  }
);

/* ==========================================
   POST: Reject Submission
   ========================================== */

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

      const queueContext = normalizeRunProofQueueContext(req.body);

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
          const queuePath = buildRunProofReviewPath(event._id, queueContext);
          const separator = queuePath.includes('?') ? '&' : '?';
          return res.redirect(`${queuePath}${separator}type=error&msg=${encodeURIComponent('Submission record not found for this event.')}`);
        }

        const nextItem = await getNextRunProofInQueueContext(event._id, queueContext, activityRecord._id);
        const rejectionReason = String(req.body.rejectionReason || '').trim().slice(0, 500);
        const rejectionCode = String(req.body.rejectionCode || '').trim();
        const reviewNotes = String(req.body.reviewNotes || '').trim().slice(0, 1200);
        await reviewAccumulatedActivitySubmission({
          activityId: activityRecord._id,
          organizerId: user._id,
          reviewerRole: user.role,
          action: 'reject',
          rejectionCode,
          rejectionReason,
          reviewNotes
        });

        return redirectAfterRunProofDecision(res, event._id, 'Activity submission rejected.', queueContext, nextItem);
      }

      const nextItem = await getNextRunProofInQueueContext(event._id, queueContext, submissionRecord._id);
      const rejectionReason = String(req.body.rejectionReason || '').trim().slice(0, 500);
      const rejectionCode = String(req.body.rejectionCode || '').trim();
      const reviewNotes = String(req.body.reviewNotes || '').trim().slice(0, 1200);
      await reviewSubmission({
        submissionId: submissionRecord._id,
        organizerId: user._id,
        reviewerRole: user.role,
        action: 'reject',
        rejectionCode,
        rejectionReason,
        reviewNotes
      });

      return redirectAfterRunProofDecision(res, event._id, 'Run result rejected.', queueContext, nextItem);
    } catch (error) {
      return res.redirect(buildSubmissionReviewPath(req.params.id, req.params.submissionId, req.body, {
        type: 'error',
        msg: String(error?.message || 'Unable to reject submission.')
      }));
    }
  }
);

/* ==========================================
   POST: Request Clarification (accumulated activity submissions only)
   ========================================== */

router.post(
  '/events/:id/submissions/:submissionId/clarify',
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

      const queueContext = normalizeRunProofQueueContext(req.body);

      const activityRecord = await AccumulatedActivitySubmission.findOne({
        _id: req.params.submissionId,
        eventId: event._id
      })
        .select('_id')
        .lean();
      if (!activityRecord) {
        const queuePath = buildRunProofReviewPath(event._id, queueContext);
        const separator = queuePath.includes('?') ? '&' : '?';
        return res.redirect(`${queuePath}${separator}type=error&msg=${encodeURIComponent('Submission record not found for this event.')}`);
      }

      const nextItem = await getNextRunProofInQueueContext(event._id, queueContext, activityRecord._id);
      const reviewNotes = String(req.body.reviewNotes || '').trim().slice(0, 1200);
      await reviewAccumulatedActivitySubmission({
        activityId: activityRecord._id,
        organizerId: user._id,
        reviewerRole: user.role,
        action: 'clarify',
        reviewNotes
      });

      return redirectAfterRunProofDecision(res, event._id, 'Marked as needing clarification.', queueContext, nextItem);
    } catch (error) {
      return res.redirect(buildSubmissionReviewPath(req.params.id, req.params.submissionId, req.body, {
        type: 'error',
        msg: String(error?.message || 'Unable to request clarification.')
      }));
    }
  }
);

module.exports = router;
