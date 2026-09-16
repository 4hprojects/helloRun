'use strict';

const {
  logger, reviewSubmission, reviewAccumulatedActivitySubmission,
  buildSubmissionHubPath, listSubmissionHub, listSubmissionHubEvents,
  renderServerError, getRequestIpAddress, getRequestUserAgent
} = require('./_shared');
const { applyAdminSubmissionCorrection } = require('../../services/submission.service');
const { reverseSubmissionApproval } = require('../../services/approval-reversal.service');
const { getPageMessage } = require('../../routes/organiser/_shared');

// SECTION: Submission Review
// ═══════════════════════════════════════════════════════════

exports.bulkRejectSubmissions = async (req, res) => {
  try {
    const rawIds = Array.isArray(req.body.submissionIds)
      ? req.body.submissionIds
      : String(req.body.submissionIds || '').split(',').filter(Boolean);
    const submissionIds = rawIds.map((id) => String(id).trim()).filter(Boolean).slice(0, 50);
    if (!submissionIds.length) {
      const q = new URLSearchParams({ type: 'error', msg: 'No submissions selected.' });
      return res.redirect(`/admin/submissions?${q}`);
    }

    const rejectionReason = String(req.body.rejectionReason || '').trim().slice(0, 500);
    if (!rejectionReason) {
      const q = new URLSearchParams({ type: 'error', msg: 'A rejection reason is required.' });
      return res.redirect(`/admin/submissions?${q}`);
    }

    const results = await Promise.allSettled(
      submissionIds.map((id) =>
        reviewSubmission({
          submissionId: id,
          organizerId: req.session.userId,
          reviewerRole: 'admin',
          action: 'reject',
          rejectionReason,
          reviewNotes: String(req.body.reviewNotes || '').trim().slice(0, 1200)
        }).catch(() =>
          reviewAccumulatedActivitySubmission({
            activityId: id,
            organizerId: req.session.userId,
            reviewerRole: 'admin',
            action: 'reject',
            rejectionReason,
            reviewNotes: String(req.body.reviewNotes || '').trim().slice(0, 1200)
          })
        )
      )
    );

    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.length - succeeded;
    const msg = failed > 0
      ? `${succeeded} submission${succeeded !== 1 ? 's' : ''} rejected. ${failed} could not be processed.`
      : `${succeeded} submission${succeeded !== 1 ? 's' : ''} rejected.`;

    const q = new URLSearchParams({ type: succeeded > 0 ? 'success' : 'error', msg });
    return res.redirect(`/admin/submissions?${q}`);
  } catch (error) {
    logger.error('Admin bulk reject submissions error:', error);
    const q = new URLSearchParams({ type: 'error', msg: 'An error occurred during bulk rejection.' });
    return res.redirect(`/admin/submissions?${q}`);
  }
};

exports.correctSubmission = async (req, res) => {
  try {
    const submissionId = String(req.params.submissionId || '').trim();
    const result = await applyAdminSubmissionCorrection({
      submissionId,
      adminUserId: req.session.userId,
      distanceKm: req.body.distanceKm,
      elapsedMs: req.body.elapsedMs,
      runDate: req.body.runDate,
      runLocation: req.body.runLocation,
      runType: req.body.runType,
      reviewReason: req.body.reviewReason,
      autoApprovalEligible: req.body.autoApprovalEligible,
      correctionReason: req.body.correctionReason,
      ipAddress: getRequestIpAddress(req),
      userAgent: getRequestUserAgent(req)
    });
    return res.json({
      success: true,
      message: 'Submission corrected.',
      submissionKind: result.submissionKind,
      auditReference: result.auditReference
    });
  } catch (error) {
    logger.error('Admin submission correction error:', error);
    return res.status(400).json({ success: false, message: error.message || 'Failed to correct submission.' });
  }
};

exports.listSubmissions = async (req, res) => {
  try {
    const [hub, events] = await Promise.all([
      listSubmissionHub({ filters: req.query, viewerId: req.session.userId }),
      listSubmissionHubEvents()
    ]);
    const basePath = '/admin/submissions';

    return res.render('admin/submissions', {
      title: 'Run Submissions - HelloRun Admin',
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
        reviews: '/admin/reviews?type=results'
      }
    });
  } catch (error) {
    return renderServerError(res, error, 'An error occurred while loading run submissions.');
  }
};

const APPROVED_ENTRIES_DEFAULTS = Object.freeze({
  status: 'approved',
  sort: 'newest',
  pageSize: 25
});

// Admin twin of the organiser page. Same view and same reversal service; the only
// difference is that this one is not scoped to events the viewer organizes.
exports.listApprovedEntries = async (req, res) => {
  try {
    const filters = { ...req.query, status: 'approved' };
    const [hub, events] = await Promise.all([
      listSubmissionHub({ filters, defaults: APPROVED_ENTRIES_DEFAULTS, viewerId: req.session.userId }),
      listSubmissionHubEvents()
    ]);
    const basePath = '/admin/approved-entries';
    const buildPath = (overrides) => buildSubmissionHubPath(basePath, hub.filters, overrides, APPROVED_ENTRIES_DEFAULTS);

    return res.render('organizer/approved-entries', {
      title: 'Approved Entries - HelloRun Admin',
      user: res.locals.user || null,
      isAdminViewer: true,
      basePath,
      reversalBasePath: basePath,
      filters: hub.filters,
      submissions: hub.items,
      counts: hub.counts,
      pagination: hub.pagination,
      events,
      message: getPageMessage(req.query),
      links: {
        prev: hub.pagination.page > 1 ? buildPath({ page: hub.pagination.page - 1 }) : '',
        next: hub.pagination.page < hub.pagination.totalPages ? buildPath({ page: hub.pagination.page + 1 }) : '',
        reset: basePath,
        submissions: '/admin/submissions',
        dashboard: '/admin/dashboard'
      }
    });
  } catch (error) {
    return renderServerError(res, error, 'An error occurred while loading approved entries.');
  }
};

exports.reverseApprovedEntry = async (req, res) => {
  const listPath = '/admin/approved-entries';
  try {
    const outcome = await reverseSubmissionApproval({
      submissionId: req.params.submissionId,
      actorUserId: req.session.userId,
      actorRole: 'admin',
      reason: req.body?.reason
    });
    const extras = [
      outcome.certificateRevoked ? 'certificate revoked' : '',
      outcome.badgesRevoked ? `${outcome.badgesRevoked} badge${outcome.badgesRevoked === 1 ? '' : 's'} withdrawn` : ''
    ].filter(Boolean).join(', ');
    const msg = extras ? `Approval reversed (${extras}).` : 'Approval reversed.';
    return res.redirect(`${listPath}?msg=${encodeURIComponent(msg)}`);
  } catch (error) {
    logger.error('Admin approval reversal failed:', error);
    return res.redirect(`${listPath}?type=error&msg=${encodeURIComponent(error.message || 'Could not reverse that approval.')}`);
  }
};
