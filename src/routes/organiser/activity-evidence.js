// src/routes/organiser/activity-evidence.js
// Reviewer actions on the optional activity link (docs/improvement-plan/ocr-platform-aware,
// Phase 2). Event-scoped exactly like the other review actions: owner, active co-organizer
// or admin, re-checked on every request.
const express = require('express');
const router = express.Router();
const {
  logger,
  User,
  submissionReviewActionLimiter,
  canAccessRegistrantReview,
  getRegistrantAccessibleEventOrNull
} = require('./_shared');
const { protectEventReviewMutation } = require('./event-route-protection');
const { recordManualUrlCheck } = require('../../services/ocr/activity-url-verification.service');

function reviewPath(eventId, submissionId, type, message) {
  const params = new URLSearchParams({ type, msg: message });
  return `/organizer/events/${encodeURIComponent(eventId)}/submissions/${encodeURIComponent(submissionId)}/review?${params.toString()}`;
}

router.post(
  '/events/:id/submissions/:submissionId/activity-url-check',
  protectEventReviewMutation,
  submissionReviewActionLimiter,
  async (req, res) => {
    const { id: eventId, submissionId } = req.params;
    try {
      const user = await User.findById(req.session.userId).select('firstName lastName email role organizerStatus accountStatus');
      if (!user || !canAccessRegistrantReview(user)) {
        return res.status(403).render('error', { title: '403 - Access Denied', status: 403, message: 'Only approved organizers or admins can review submissions.' });
      }
      const event = await getRegistrantAccessibleEventOrNull(eventId, user);
      if (!event) {
        return res.status(404).render('error', { title: '404 - Event Not Found', status: 404, message: 'Event not found or you do not have access.' });
      }
      const kind = req.body?.kind === 'accumulated_activity' ? 'accumulated_activity' : 'run_submission';
      const result = await recordManualUrlCheck({
        kind,
        entryId: submissionId,
        eventId: event._id,
        status: String(req.body?.status || ''),
        comparedFields: {
          distance: req.body?.compared_distance,
          duration: req.body?.compared_duration,
          date: req.body?.compared_date
        },
        notes: req.body?.notes,
        reviewerId: user._id
      });
      return res.redirect(reviewPath(event._id, submissionId, 'success', `Activity link check saved (${result.status.replace(/_/g, ' ')}).`));
    } catch (error) {
      if (['not_found', 'invalid_status', 'no_activity_url'].includes(error?.code)) {
        return res.redirect(reviewPath(eventId, submissionId, 'error', error.message));
      }
      logger.error('Error recording activity link check:', error);
      return res.redirect(reviewPath(eventId, submissionId, 'error', 'Could not save the activity link check.'));
    }
  }
);

module.exports = router;
