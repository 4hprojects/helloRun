const mongoose = require('mongoose');
const Event = require('../models/Event');
const User = require('../models/User');
const { resolveEventAccess } = require('../services/event-access.service');

async function requireOrganizerEventAccess(req, res, next) {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.redirect('/login');
    }

    const user = await User.findById(userId).select('role organizerStatus').lean();
    if (!user) {
      return renderJsonError(res, 403, 'Authentication required.');
    }

    const eventId = String(req.params.eventId || req.body.eventId || '').trim();
    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return renderJsonError(res, 400, 'Invalid event reference.');
    }

    const access = await resolveEventAccess({ eventId, userId: user._id, userRole: user.role });
    if (!access) {
      return renderJsonError(res, 404, 'Event not found.');
    }
    req.eventAccess = access;
    req.organizerEvent = access.event;
    req.user = {
      id: String(user._id),
      mongoUserId: user._id,
      role: user.role,
      organizerStatus: user.organizerStatus
    };

    return next();
  } catch (error) {
    return next(error);
  }
}

function renderJsonError(res, status, message) {
  return res.status(status).json({ success: false, error: message });
}

module.exports = {
  requireOrganizerEventAccess
};
