'use strict';

const {
  mongoose, User, OrganiserApplication, communicationService, logger,
  recordCriticalAuditEventInBackground, evaluateOrganiserAchievementsInBackground,
  VALID_FILTER_STATUSES, MIN_REJECTION_REASON_LENGTH, MAX_REJECTION_REASON_LENGTH,
  escapeRegex, getMessageFromQuery, canTransitionStatus, getRequestIpAddress, getRequestUserAgent,
  purgeApplicationDocuments, renderApplicationNotFound, renderServerError, buildDetailRedirect,
  getApplicationById, renderApplicationDetails
} = require('./_shared');

// SECTION: Organiser Applications
// ═══════════════════════════════════════════════════════════

exports.listApplications = async (req, res) => {
  try {
    const status = VALID_FILTER_STATUSES.includes(req.query.status) ? req.query.status : '';
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';

    const query = {};
    if (status) {
      query.status = status;
    }

    if (q) {
      const safeRegex = new RegExp(escapeRegex(q), 'i');
      query.$or = [
        { businessName: safeRegex },
        { applicationId: safeRegex }
      ];
    }

    let applications = await OrganiserApplication.find(query)
      .populate('userId', 'email firstName lastName')
      .populate('reviewedBy', 'firstName lastName')
      .sort({ submittedAt: -1 });

    if (q) {
      const qLower = q.toLowerCase();
      applications = applications.filter((app) => {
        const firstName = app.userId?.firstName?.toLowerCase() || '';
        const lastName = app.userId?.lastName?.toLowerCase() || '';
        const email = app.userId?.email?.toLowerCase() || '';
        const fullName = `${firstName} ${lastName}`.trim();
        return (
          fullName.includes(qLower) ||
          email.includes(qLower) ||
          app.businessName?.toLowerCase().includes(qLower) ||
          app.applicationId?.toLowerCase().includes(qLower)
        );
      });
    }

    return res.render('admin/applications-list', {
      title: 'Organizer Applications - HelloRun Admin',
      applications,
      filters: { status, q }
    });
  } catch (error) {
    return renderServerError(res, error, 'An error occurred while loading organizer applications.');
  }
};

exports.viewApplication = async (req, res) => {
  try {
    const applicationId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(applicationId)) {
      return renderApplicationNotFound(res);
    }

    return renderApplicationDetails(res, applicationId, {
      message: getMessageFromQuery(req),
      returnTo: req.query.returnTo
    });
  } catch (error) {
    return renderServerError(res, error, 'An error occurred while loading the application details.');
  }
};

exports.approveApplication = async (req, res) => {
  try {
    const applicationId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(applicationId)) {
      return renderApplicationNotFound(res);
    }

    const application = await getApplicationById(applicationId);
    if (!application) {
      return renderApplicationNotFound(res);
    }

    if (!canTransitionStatus(application.status, 'approved')) {
      return res.status(400).render('admin/application-details', {
        title: 'Application Details - HelloRun Admin',
        application,
        rejectionReasonDraft: '',
        message: {
          type: 'error',
          text: `Cannot approve application from "${application.status}" status.`
        }
      });
    }

    const previousStatus = application.status;
    application.status = 'approved';
    application.rejectionReason = '';
    application.reviewedBy = req.session.userId;
    application.reviewedAt = new Date();
    await purgeApplicationDocuments(application);
    await application.save();

    const userId = application.userId?._id || application.userId;
    await User.findByIdAndUpdate(userId, {
      role: 'organiser',
      organizerStatus: 'approved',
      organizerApplicationId: application._id
    });
    evaluateOrganiserAchievementsInBackground(userId, {
      performedBy: req.session.userId
    });

    recordCriticalAuditEventInBackground({
      actorMongoUserId: req.session.userId,
      action: 'organiser.application.approved',
      targetType: 'organiser_application',
      targetId: String(application._id),
      statusFrom: previousStatus,
      statusTo: 'approved',
      notes: `Application ${application.applicationId || application._id} approved.`,
      ipAddress: getRequestIpAddress(req),
      userAgent: getRequestUserAgent(req),
      occurredAt: application.reviewedAt
    });

    if (application.userId?.email) {
      try {
        await communicationService.notify('organiser.application_approved', {
          email: {
            to: application.userId.email,
            firstName: application.userId.firstName || 'Organizer',
            recipientUserId: application.userId._id,
            metadata: { applicationId: application.applicationId }
          }
        });
      } catch (emailError) {
        logger.error(
          `[Admin Review] Failed to send approval email for application ${application.applicationId}`,
          emailError
        );
      }
    }

    return res.redirect(
      buildDetailRedirect(application._id.toString(), 'success', 'Application approved successfully.', req.body.returnTo)
    );
  } catch (error) {
    return renderServerError(res, error, 'An error occurred while approving the application.');
  }
};

exports.rejectApplication = async (req, res) => {
  try {
    const applicationId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(applicationId)) {
      return renderApplicationNotFound(res);
    }

    const application = await getApplicationById(applicationId);
    if (!application) {
      return renderApplicationNotFound(res);
    }

    if (!canTransitionStatus(application.status, 'rejected')) {
      return res.status(400).render('admin/application-details', {
        title: 'Application Details - HelloRun Admin',
        application,
        rejectionReasonDraft: '',
        message: {
          type: 'error',
          text: `Cannot reject application from "${application.status}" status.`
        }
      });
    }

    const rejectionReason = typeof req.body.rejectionReason === 'string'
      ? req.body.rejectionReason.trim()
      : '';

    if (
      rejectionReason.length < MIN_REJECTION_REASON_LENGTH ||
      rejectionReason.length > MAX_REJECTION_REASON_LENGTH
    ) {
      return res.status(400).render('admin/application-details', {
        title: 'Application Details - HelloRun Admin',
        application,
        rejectionReasonDraft: rejectionReason,
        message: {
          type: 'error',
          text: `Rejection reason must be ${MIN_REJECTION_REASON_LENGTH}-${MAX_REJECTION_REASON_LENGTH} characters.`
        }
      });
    }

    const previousStatus = application.status;
    application.status = 'rejected';
    application.rejectionReason = rejectionReason;
    application.reviewedBy = req.session.userId;
    application.reviewedAt = new Date();
    await purgeApplicationDocuments(application);
    await application.save();

    const userId = application.userId?._id || application.userId;
    await User.findByIdAndUpdate(userId, {
      organizerStatus: 'rejected'
    });

    recordCriticalAuditEventInBackground({
      actorMongoUserId: req.session.userId,
      action: 'organiser.application.rejected',
      targetType: 'organiser_application',
      targetId: String(application._id),
      statusFrom: previousStatus,
      statusTo: 'rejected',
      notes: rejectionReason,
      ipAddress: getRequestIpAddress(req),
      userAgent: getRequestUserAgent(req),
      occurredAt: application.reviewedAt
    });

    if (application.userId?.email) {
      try {
        await communicationService.notify('organiser.application_rejected', {
          email: {
            to: application.userId.email,
            firstName: application.userId.firstName || 'Organizer',
            rejectionReason,
            recipientUserId: application.userId._id,
            metadata: { applicationId: application.applicationId }
          }
        });
      } catch (emailError) {
        logger.error(
          `[Admin Review] Failed to send rejection email for application ${application.applicationId}`,
          emailError
        );
      }
    }

    return res.redirect(
      buildDetailRedirect(application._id.toString(), 'success', 'Application rejected successfully.', req.body.returnTo)
    );
  } catch (error) {
    return renderServerError(res, error, 'An error occurred while rejecting the application.');
  }
};


// ═══════════════════════════════════════════════════════════
