const mongoose = require('mongoose');
const Event = require('../models/Event');
const User = require('../models/User');

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

    if (!['organiser', 'admin'].includes(user.role)) {
      return renderJsonError(res, 403, 'Organizer or admin access is required.');
    }

    const eventId = String(req.params.eventId || req.body.eventId || '').trim();
    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return renderJsonError(res, 400, 'Invalid event reference.');
    }

    const event = await Event.findOne({ _id: eventId, isDeleted: { $ne: true } })
      .select('organizerId')
      .lean();

    if (!event) {
      return renderJsonError(res, 404, 'Event not found.');
    }

    if (user.role !== 'admin' && String(event.organizerId || '') !== String(user._id)) {
      return renderJsonError(res, 403, 'You can only manage onsite operations for your own events.');
    }

    req.organizerEvent = event;
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
