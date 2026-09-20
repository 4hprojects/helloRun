// src/routes/organiser/registrant-submissions.js
// Every entry one runner submitted for an event, viewable and correctable by the event's
// organizer, co-organizers and admins.
const express = require('express');
const router = express.Router();
const { correctSubmissionValues, describeChanges } = require('../../services/submission-correction.service');
const { reverseSubmissionApproval } = require('../../services/approval-reversal.service');
const {
  REVIEW_CHECKLIST_VERSION,
  buildRunProofVerificationCriteria,
  buildRunRejectionReasonOptions
} = require('../../utils/run-proof-review');
const { getAvailableDecisions, isDecisionAllowed } = require('../../utils/entry-decision-actions');
const { getReversalReasonOptions, resolveReversalReason } = require('../../utils/reversal-reasons');
const { resolveChallengeConfig } = require('../../utils/challenge-metrics');
const { formatElevation, formatSteps } = require('../../utils/entry-extras');
const {
  logger,
  mongoose,
  User,
  Registration,
  Submission,
  AccumulatedActivitySubmission,
  requireAuth,
  requireCsrfProtection,
  submissionReviewActionLimiter,
  reviewSubmission,
  reviewAccumulatedActivitySubmission,
  mergeRunProofReviewDocs,
  buildRunProofReviewRow,
  canAccessRegistrantReview,
  getRegistrantAccessibleEventOrNull,
  getPageMessage,
  getRequestIpAddress,
  getRequestUserAgent,
  formatDateTime
} = require('./_shared');

const QUEUE_CONTEXT = Object.freeze({ status: 'all', sort: 'newest', q: '', page: 1 });
const ENTRY_POPULATE = [
  { path: 'reviewedBy', select: 'firstName lastName email' },
  { path: 'registrationId', select: 'participant confirmationCode raceDistance participationMode' },
  { path: 'organizerCorrections.editedBy', select: 'firstName lastName email' }
];

function buildEntriesPath(eventId, registrationId, message) {
  const base = `/organizer/events/${String(eventId)}/registrants/${String(registrationId)}/submissions`;
  if (!message) return base;
  const params = new URLSearchParams({ type: message.type, msg: String(message.text).slice(0, 200) });
  return `${base}?${params.toString()}`;
}

function renderError(res, status, title, message) {
  return res.status(status).render('error', { title, status, message });
}

// Shared by the page and the edit handler so both apply identical access rules.
async function resolveAccess(req, res, { failureMessage }) {
  const user = await User.findById(req.session.userId).select('firstName lastName email role organizerStatus accountStatus adminTier');
  if (!user) {
    renderError(res, 404, '404 - User Not Found', 'User account not found.');
    return null;
  }
  if (!canAccessRegistrantReview(user)) {
    renderError(res, 403, '403 - Access Denied', failureMessage);
    return null;
  }
  const event = await getRegistrantAccessibleEventOrNull(req.params.id, user);
  if (!event) {
    renderError(res, 404, '404 - Event Not Found', 'Event not found or you do not have access.');
    return null;
  }
  if (!mongoose.Types.ObjectId.isValid(String(req.params.registrationId || ''))) {
    renderError(res, 404, '404 - Registrant Not Found', 'Registrant not found for this event.');
    return null;
  }
  const registration = await Registration.findOne({ _id: req.params.registrationId, eventId: event._id }).lean();
  if (!registration) {
    renderError(res, 404, '404 - Registrant Not Found', 'Registrant not found for this event.');
    return null;
  }
  return { user, event, registration };
}

function toEditValues(item) {
  const totalSeconds = Math.max(0, Math.floor(Number(item.elapsedMs || 0) / 1000));
  return {
    distanceKm: item.distanceKm === null || item.distanceKm === undefined ? '' : Number(item.distanceKm).toFixed(2),
    hours: Math.floor(totalSeconds / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    runDate: item.runDate ? new Date(item.runDate).toISOString().slice(0, 10) : '',
    runLocation: item.runLocation || '',
    runType: item.runType || 'run',
    elevationGain: item.elevationGain === null || item.elevationGain === undefined ? '' : Math.round(Number(item.elevationGain)),
    steps: item.steps === null || item.steps === undefined ? '' : Number(item.steps),
    trackingAppDevice: item.trackingAppDevice || ''
  };
}

const RUN_TYPE_LABELS = Object.freeze({
  run: 'Run',
  walk: 'Walk',
  hike: 'Hike',
  trail_run: 'Trail run',
  treadmill: 'Treadmill'
});

// The details a runner supplied beyond distance, time and date, for the compact row on each
// card. Only values that exist are listed, so an entry with none shows no row at all.
function buildDetailFacts(item) {
  const facts = [
    ['Location', String(item.runLocation || '').trim()],
    ['Activity type', item.runType ? (RUN_TYPE_LABELS[item.runType] || item.runType) : ''],
    ['Elevation', formatElevation(item.elevationGain)],
    ['Steps', formatSteps(item.steps)],
    ['Tracking app or device', String(item.trackingAppDevice || '').trim()]
  ];
  return facts.filter(([, value]) => value !== '').map(([label, value]) => ({ label, value }));
}

function toCorrectionHistory(item) {
  return (Array.isArray(item.organizerCorrections) ? item.organizerCorrections : [])
    .slice()
    .sort((a, b) => new Date(b.editedAt) - new Date(a.editedAt))
    .map((entry) => {
      const editor = entry.editedBy || {};
      return {
        editedAtLabel: formatDateTime(entry.editedAt),
        editorName: [editor.firstName, editor.lastName].filter(Boolean).join(' ').trim() || editor.email || 'An organizer',
        reason: entry.reason,
        lines: describeChanges(entry.changes || [])
      };
    });
}

router.get('/events/:id/registrants/:registrationId/submissions', requireAuth, async (req, res) => {
  try {
    const access = await resolveAccess(req, res, {
      failureMessage: 'Only approved organizers or admins can view submissions.'
    });
    if (!access) return undefined;
    const { user, event, registration } = access;

    const query = { eventId: event._id, registrationId: registration._id };
    const sort = { submittedAt: -1, _id: -1 };
    const [standardDocs, accumulatedDocs] = await Promise.all([
      Submission.find(query).sort(sort).populate(ENTRY_POPULATE).lean(),
      AccumulatedActivitySubmission.find(query).sort(sort).populate(ENTRY_POPULATE).lean()
    ]);

    const entryBase = `/organizer/events/${event._id}/registrants/${registration._id}/submissions`;
    const entries = mergeRunProofReviewDocs(standardDocs, accumulatedDocs, 'newest').map((item) => {
      const decision = getAvailableDecisions(item.submission.status, item.submissionKind);
      return {
        ...buildRunProofReviewRow(item.submission, event, QUEUE_CONTEXT, item.submissionKind, user._id),
        edit: toEditValues(item.submission),
        corrections: toCorrectionHistory(item.submission),
        editAction: `${entryBase}/${item.submission._id}/edit`,
        detailFacts: buildDetailFacts(item.submission),
        decisionAction: `${entryBase}/${item.submission._id}/decision`,
        decision,
        // Same builders the review page uses, and only when the matching dialog will render.
        verificationCriteria: decision.canApprove ? buildRunProofVerificationCriteria(event, item.submission) : [],
        rejectionOptions: decision.canReject ? buildRunRejectionReasonOptions(event, item.submission) : [],
        reversalOptions: decision.canReverse ? getReversalReasonOptions() : []
      };
    });

    const counts = entries.reduce((acc, entry) => {
      acc.total += 1;
      if (entry.status === 'approved') acc.approved += 1;
      else if (entry.status === 'rejected') acc.rejected += 1;
      else acc.pending += 1;
      return acc;
    }, { total: 0, approved: 0, pending: 0, rejected: 0 });

    const participant = registration.participant || {};
    const categoryName = String(registration.pricingSnapshot?.raceCategoryName || '').trim();
    const distance = String(registration.raceDistance || '').trim();

    return res.render('organizer/registrant-submissions', {
      title: `Submissions - ${[participant.firstName, participant.lastName].filter(Boolean).join(' ') || 'Runner'}`,
      user,
      isAdminViewer: user.role === 'admin',
      event,
      runner: {
        name: [participant.firstName, participant.lastName].filter(Boolean).join(' ').trim() || 'N/A',
        email: participant.email || 'N/A',
        confirmationCode: registration.confirmationCode || '',
        categoryLabel: categoryName && distance && categoryName.toLowerCase() !== distance.toLowerCase()
          ? `${categoryName} · ${distance}`
          : distance || categoryName || 'Unspecified category'
      },
      entries,
      counts,
      reviewChecklistVersion: REVIEW_CHECKLIST_VERSION,
      // What the event requires of the extra details, so the edit dialog marks them required.
      editConfig: {
        stepsRequired: resolveChallengeConfig(event).tracksSteps,
        deviceRequired: Boolean(event.requireTrackingAppDevice)
      },
      message: getPageMessage(req.query),
      links: {
        registrants: `/organizer/events/${event._id}/registrants`,
        queue: `/organizer/events/${event._id}/run-proofs/review?status=all&sort=newest`
      }
    });
  } catch (error) {
    logger.error('Error loading registrant submissions:', error);
    return renderError(res, 500, 'Server Error', 'An error occurred while loading this runner\'s submissions.');
  }
});

function readElapsedMs(body) {
  const fields = [body.elapsedHours, body.elapsedMinutes, body.elapsedSeconds];
  if (fields.every((value) => value === undefined || String(value).trim() === '')) return undefined;
  const [hours, minutes, seconds] = fields.map((value) => {
    const text = String(value ?? '').trim();
    return text === '' ? 0 : Number(text);
  });
  if (![hours, minutes, seconds].every((part) => Number.isInteger(part) && part >= 0)) {
    throw new Error('Elapsed time must be whole, non-negative hours, minutes and seconds.');
  }
  if (minutes > 59 || seconds > 59) {
    throw new Error('Minutes and seconds must be between 0 and 59.');
  }
  return Math.round((hours * 3600 + minutes * 60 + seconds) * 1000);
}

router.post(
  '/events/:id/registrants/:registrationId/submissions/:submissionId/edit',
  requireAuth,
  requireCsrfProtection,
  submissionReviewActionLimiter,
  async (req, res) => {
    let access = null;
    try {
      access = await resolveAccess(req, res, {
        failureMessage: 'Only approved organizers or admins can edit submissions.'
      });
      if (!access) return undefined;
      const { user, event, registration } = access;

      // The entry must belong to this runner's registration, so a crafted URL cannot edit
      // another runner's entry through a registration the viewer happens to be able to open.
      const entryQuery = { _id: req.params.submissionId, eventId: event._id, registrationId: registration._id };
      const owned = mongoose.Types.ObjectId.isValid(String(req.params.submissionId || ''))
        && (await Submission.exists(entryQuery) || await AccumulatedActivitySubmission.exists(entryQuery));
      if (!owned) {
        return renderError(res, 404, '404 - Submission Not Found', 'Submission record not found for this runner.');
      }

      const result = await correctSubmissionValues({
        submissionId: req.params.submissionId,
        actorUserId: user._id,
        actorRole: user.role,
        changes: {
          distanceKm: req.body.distanceKm,
          elapsedMs: readElapsedMs(req.body),
          runDate: req.body.runDate,
          runLocation: req.body.runLocation,
          runType: req.body.runType,
          elevationGain: req.body.elevationGain,
          steps: req.body.steps,
          trackingAppDevice: req.body.trackingAppDevice
        },
        reason: req.body.reason,
        ipAddress: getRequestIpAddress(req),
        userAgent: getRequestUserAgent(req)
      });

      const summary = result.certificateRegenerated ? ' The certificate was regenerated.' : '';
      return res.redirect(buildEntriesPath(event._id, registration._id, {
        type: 'success',
        text: `Entry updated and the runner was notified.${summary}`
      }));
    } catch (error) {
      if (!access) {
        logger.error('Error correcting submission values:', error);
        return renderError(res, 500, 'Server Error', 'An error occurred while updating this entry.');
      }
      // Validation failures are the organizer's to fix, so they go back to the page.
      logger.warn('Submission correction rejected:', { submissionId: req.params.submissionId, error: error.message });
      return res.redirect(buildEntriesPath(access.event._id, access.registration._id, {
        type: 'error',
        text: error.message || 'The entry could not be updated.'
      }));
    }
  }
);

const decisionMessages = {
  approve: { standard: 'Run result approved.', accumulated: 'Activity approved.' },
  reject: { standard: 'Run result rejected.', accumulated: 'Activity rejected.' }
};

router.post(
  '/events/:id/registrants/:registrationId/submissions/:submissionId/decision',
  requireAuth,
  requireCsrfProtection,
  submissionReviewActionLimiter,
  async (req, res) => {
    let access = null;
    try {
      access = await resolveAccess(req, res, {
        failureMessage: 'Only approved organizers or admins can review submissions.'
      });
      if (!access) return undefined;
      const { user, event, registration } = access;

      // The entry must belong to this runner's registration, so a crafted URL cannot decide
      // another runner's entry through a registration the viewer happens to be able to open.
      const entryQuery = { _id: req.params.submissionId, eventId: event._id, registrationId: registration._id };
      const idIsValid = mongoose.Types.ObjectId.isValid(String(req.params.submissionId || ''));
      const standard = idIsValid ? await Submission.findOne(entryQuery).select('status').lean() : null;
      const activity = idIsValid && !standard
        ? await AccumulatedActivitySubmission.findOne(entryQuery).select('status').lean()
        : null;
      const record = standard || activity;
      if (!record) {
        return renderError(res, 404, '404 - Submission Not Found', 'Submission record not found for this runner.');
      }
      const kind = standard ? 'standard' : 'accumulated';

      const action = String(req.body.action || '').trim();
      // Checked against the entry's current status so a stale page fails with a clear message;
      // the services re-check the transition themselves.
      if (!isDecisionAllowed(action, record.status, kind)) {
        throw new Error('That status change is not available for this entry any more. Reload the page and try again.');
      }

      const reviewer = { organizerId: user._id, reviewerRole: user.role };
      const reviewNotes = String(req.body.reviewNotes || '').trim().slice(0, 1200);
      let message = '';

      if (action === 'reverse') {
        // An approved entry is always unwound through the reversal service, for both entry
        // kinds, so its certificate, badges and ranking are withdrawn with it. The quick reason
        // and optional note become one runner-facing message; a missing or unknown reason (or
        // "Other" with no explanation) throws here and returns to the page with the message.
        const reversal = resolveReversalReason(req.body.reversalCode, req.body.reversalNote);
        const outcome = await reverseSubmissionApproval({
          submissionId: record._id,
          actorUserId: user._id,
          actorRole: user.role,
          reason: reversal.runnerMessage
        });
        const extras = [
          outcome.certificateRevoked ? 'certificate revoked' : '',
          outcome.badgesRevoked ? `${outcome.badgesRevoked} badge${outcome.badgesRevoked === 1 ? '' : 's'} withdrawn` : ''
        ].filter(Boolean).join(', ');
        message = extras ? `Approval reversed (${extras}).` : 'Approval reversed.';
      } else if (action === 'approve') {
        const approval = {
          ...reviewer,
          action: 'approve',
          reviewNotes,
          checklistVersion: req.body.checklistVersion,
          verifiedCriteria: req.body.verifiedCriteria,
          requireVerification: true
        };
        if (kind === 'accumulated') {
          await reviewAccumulatedActivitySubmission({ activityId: record._id, ...approval });
        } else {
          await reviewSubmission({ submissionId: record._id, ...approval });
        }
        message = decisionMessages.approve[kind];
      } else {
        const rejection = {
          ...reviewer,
          action: 'reject',
          rejectionCode: String(req.body.rejectionCode || '').trim(),
          rejectionReason: String(req.body.rejectionReason || '').trim().slice(0, 500),
          reviewNotes
        };
        if (kind === 'accumulated') {
          await reviewAccumulatedActivitySubmission({ activityId: record._id, ...rejection });
        } else {
          await reviewSubmission({ submissionId: record._id, ...rejection });
        }
        message = decisionMessages.reject[kind];
      }

      return res.redirect(buildEntriesPath(event._id, registration._id, { type: 'success', text: message }));
    } catch (error) {
      if (!access) {
        logger.error('Error deciding submission from the runner entries page:', error);
        return renderError(res, 500, 'Server Error', 'An error occurred while updating this entry.');
      }
      // Validation failures (missing checklist item, short reason, stale status) go back to the
      // page so the organizer keeps their place.
      logger.warn('Entry decision rejected:', { submissionId: req.params.submissionId, error: error.message });
      return res.redirect(buildEntriesPath(access.event._id, access.registration._id, {
        type: 'error',
        text: error.message || 'The entry could not be updated.'
      }));
    }
  }
);

module.exports = router;
