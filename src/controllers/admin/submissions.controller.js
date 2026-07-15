'use strict';

const {
  logger, reviewSubmission, reviewAccumulatedActivitySubmission,
  buildSubmissionHubPath, listSubmissionHub, listSubmissionHubEvents,
  renderServerError, getRequestIpAddress, getRequestUserAgent
} = require('./_shared');
const { applyAdminSubmissionCorrection } = require('../../services/submission.service');

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
      listSubmissionHub({ filters: req.query }),
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
