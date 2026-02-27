const mongoose = require('mongoose');
const OrganiserApplication = require('../models/OrganiserApplication');
const User = require('../models/User');
const Blog = require('../models/Blog');
const emailService = require('../services/email.service');

const VALID_FILTER_STATUSES = ['pending', 'under_review', 'approved', 'rejected'];
const REVIEWABLE_STATUSES = ['pending', 'under_review'];
const MIN_REJECTION_REASON_LENGTH = 15;
const MAX_REJECTION_REASON_LENGTH = 500;

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getMessageFromQuery(req) {
  const rawMessage = typeof req.query.msg === 'string' ? req.query.msg.trim() : '';
  if (!rawMessage) return null;

  const type = ['success', 'error', 'info'].includes(req.query.type) ? req.query.type : 'info';
  return {
    type,
    text: rawMessage.slice(0, 200)
  };
}

function buildDetailRedirect(applicationId, type, message) {
  const params = new URLSearchParams({
    type,
    msg: message
  });
  return `/admin/applications/${applicationId}?${params.toString()}`;
}

function canTransitionStatus(currentStatus, targetStatus) {
  return REVIEWABLE_STATUSES.includes(currentStatus) && currentStatus !== targetStatus;
}

function renderApplicationNotFound(res) {
  return res.status(404).render('error', {
    title: '404 - Application Not Found',
    status: 404,
    message: 'The requested organizer application does not exist.'
  });
}

function renderServerError(res, error, fallbackMessage) {
  console.error(fallbackMessage, error);
  return res.status(500).render('error', {
    title: '500 - Server Error',
    status: 500,
    message: fallbackMessage
  });
}

async function getApplicationById(applicationId) {
  return OrganiserApplication.findById(applicationId)
    .populate('userId', 'email firstName lastName role organizerStatus')
    .populate('reviewedBy', 'firstName lastName email role');
}

async function renderApplicationDetails(res, applicationId, options = {}) {
  const application = await getApplicationById(applicationId);
  if (!application) {
    return renderApplicationNotFound(res);
  }

  return res.render('admin/application-details', {
    title: 'Application Details - helloRun Admin',
    application,
    message: options.message || null,
    rejectionReasonDraft: options.rejectionReasonDraft || ''
  });
}

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
      title: 'Organizer Applications - helloRun Admin',
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
      message: getMessageFromQuery(req)
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
        title: 'Application Details - helloRun Admin',
        application,
        rejectionReasonDraft: '',
        message: {
          type: 'error',
          text: `Cannot approve application from "${application.status}" status.`
        }
      });
    }

    application.status = 'approved';
    application.rejectionReason = '';
    application.reviewedBy = req.session.userId;
    application.reviewedAt = new Date();
    await application.save();

    const userId = application.userId?._id || application.userId;
    await User.findByIdAndUpdate(userId, {
      role: 'organiser',
      organizerStatus: 'approved',
      organizerApplicationId: application._id
    });

    if (application.userId?.email) {
      try {
        await emailService.sendApplicationApprovedEmail(
          application.userId.email,
          application.userId.firstName || 'Organizer'
        );
      } catch (emailError) {
        console.error(
          `[Admin Review] Failed to send approval email for application ${application.applicationId}`,
          emailError
        );
      }
    }

    return res.redirect(
      buildDetailRedirect(application._id.toString(), 'success', 'Application approved successfully.')
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
        title: 'Application Details - helloRun Admin',
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
        title: 'Application Details - helloRun Admin',
        application,
        rejectionReasonDraft: rejectionReason,
        message: {
          type: 'error',
          text: `Rejection reason must be ${MIN_REJECTION_REASON_LENGTH}-${MAX_REJECTION_REASON_LENGTH} characters.`
        }
      });
    }

    application.status = 'rejected';
    application.rejectionReason = rejectionReason;
    application.reviewedBy = req.session.userId;
    application.reviewedAt = new Date();
    await application.save();

    const userId = application.userId?._id || application.userId;
    await User.findByIdAndUpdate(userId, {
      organizerStatus: 'rejected'
    });

    if (application.userId?.email) {
      try {
        await emailService.sendApplicationRejectedEmail(
          application.userId.email,
          application.userId.firstName || 'Organizer',
          rejectionReason
        );
      } catch (emailError) {
        console.error(
          `[Admin Review] Failed to send rejection email for application ${application.applicationId}`,
          emailError
        );
      }
    }

    return res.redirect(
      buildDetailRedirect(application._id.toString(), 'success', 'Application rejected successfully.')
    );
  } catch (error) {
    return renderServerError(res, error, 'An error occurred while rejecting the application.');
  }
};

exports.dashboard = async (req, res) => {
  try {
    const [
      totalUsers,
      totalApplications,
      pendingApplications,
      approvedApplications,
      rejectedApplications,
      totalBlogs,
      pendingBlogs,
      publishedBlogs,
      rejectedBlogs,
      archivedBlogs
    ] =
      await Promise.all([
        User.countDocuments(),
        OrganiserApplication.countDocuments(),
        OrganiserApplication.countDocuments({ status: 'pending' }),
        OrganiserApplication.countDocuments({ status: 'approved' }),
        OrganiserApplication.countDocuments({ status: 'rejected' }),
        Blog.countDocuments({ isDeleted: { $ne: true } }),
        Blog.countDocuments({ isDeleted: { $ne: true }, status: 'pending' }),
        Blog.countDocuments({ isDeleted: { $ne: true }, status: 'published' }),
        Blog.countDocuments({ isDeleted: { $ne: true }, status: 'rejected' }),
        Blog.countDocuments({ isDeleted: { $ne: true }, status: 'archived' })
      ]);

    return res.render('admin/dashboard', {
      title: 'Admin Dashboard - helloRun',
      stats: {
        totalUsers,
        totalApplications,
        pendingApplications,
        approvedApplications,
        rejectedApplications,
        totalBlogs,
        pendingBlogs,
        publishedBlogs,
        rejectedBlogs,
        archivedBlogs
      }
    });
  } catch (error) {
    return renderServerError(res, error, 'An error occurred while loading the admin dashboard.');
  }
};
