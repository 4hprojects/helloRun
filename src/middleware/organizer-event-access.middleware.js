const mongoose = require('mongoose');
const User = require('../models/User');
const { resolveEventAccess } = require('../services/event-access.service');
const { sendHttpError } = require('../utils/http-error-response');

const RESTRICTED_ACCOUNT_STATUSES = new Set(['restricted', 'suspended', 'closed']);

async function requireOrganizerEventAccess(req, res, next) {
  return requireEventAccess(req, res, next, { requireReviewEligibility: false });
}

async function requireOrganizerEventReviewAccess(req, res, next) {
  return requireEventAccess(req, res, next, { requireReviewEligibility: true });
}

async function requireEventAccess(req, res, next, { requireReviewEligibility }) {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.redirect('/login');
    }

    const user = await User.findById(userId)
      .select('role adminTier organizerStatus accountStatus')
      .lean();
    if (!user) {
      return renderAccessError(req, res, 403, 'Authentication required.');
    }
    if (RESTRICTED_ACCOUNT_STATUSES.has(String(user.accountStatus || ''))) {
      return renderAccessError(req, res, 403, 'This account cannot manage events.');
    }
    if (requireReviewEligibility && !canReviewRegistrantData(user)) {
      return renderAccessError(req, res, 403, 'Organizer approval is required to review participant data.');
    }

    const eventId = String(req.params?.eventId || req.params?.id || req.body?.eventId || '').trim();
    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return renderAccessError(req, res, 400, 'Invalid event reference.');
    }

    const access = await resolveEventAccess({ eventId, userId: user._id, userRole: user.role });
    if (!access) {
      return renderAccessError(req, res, 404, 'Event not found.');
    }
    req.eventAccess = access;
    req.organizerEvent = access.event;
    req.user = {
      id: String(user._id),
      mongoUserId: user._id,
      role: user.role,
      adminTier: user.adminTier,
      accountStatus: user.accountStatus,
      organizerStatus: user.organizerStatus
    };

    return next();
  } catch (error) {
    return next(error);
  }
}

function canReviewRegistrantData(user) {
  if (user.role === 'admin') return true;
  return user.role === 'organiser' && user.organizerStatus === 'approved';
}

function renderAccessError(req, res, status, message) {
  return sendHttpError(req, res, { status, message });
}

module.exports = {
  requireOrganizerEventAccess,
  requireOrganizerEventReviewAccess,
  canReviewRegistrantData
};
