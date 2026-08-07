const mongoose = require('mongoose');
const Event = require('../models/Event');
const User = require('../models/User');
const { getStaffPermissions } = require('../services/event-staff.service');

/**
 * Access to one event's onsite operations, for the organiser, an admin, or an assigned
 * staff member holding a named permission.
 *
 * A sibling of requireOrganizerEventAccess rather than an edit to it: that middleware
 * rejects anyone who is not an organiser or admin before any per-event check runs, and
 * race-day volunteers are ordinary runner accounts. Widening it would loosen every route
 * that uses it.
 *
 * Staff reach only the routes explicitly wrapped in this. They cannot edit the event,
 * manage other staff, or see anything outside the permission they were granted.
 *
 * @param {string} permission - one of EventStaff STAFF_PERMISSIONS
 */
function requireOnsiteEventAccess(permission) {
  return async function onsiteEventAccess(req, res, next) {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.redirect('/login');
      }

      const user = await User.findById(userId).select('role organizerStatus').lean();
      if (!user) {
        return denied(res, req, 403, 'Authentication required.');
      }

      const eventId = String(req.params.eventId || req.body?.eventId || '').trim();
      if (!mongoose.Types.ObjectId.isValid(eventId)) {
        return denied(res, req, 400, 'Invalid event reference.');
      }

      const event = await Event.findOne({ _id: eventId, isDeleted: { $ne: true } })
        .select('organizerId')
        .lean();
      if (!event) {
        return denied(res, req, 404, 'Event not found.');
      }

      const isAdmin = user.role === 'admin';
      const isOwningOrganiser =
        user.role === 'organiser' && String(event.organizerId || '') === String(user._id);

      let staffPermissions = [];
      if (!isAdmin && !isOwningOrganiser) {
        staffPermissions = await getStaffPermissions(eventId, user._id);
        if (!staffPermissions.includes(permission)) {
          return denied(res, req, 403, 'You do not have access to this event operation.');
        }
      }

      req.organizerEvent = event;
      req.eventStaffPermissions = staffPermissions;
      req.isEventStaffOnly = !isAdmin && !isOwningOrganiser;
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
  };
}

/**
 * Page routes render HTML; the JSON operations API expects JSON. Returning HTML to a
 * fetch() caller was an existing rough edge, so respond in the shape the caller asked for.
 */
function denied(res, req, status, message) {
  const wantsJson =
    req.xhr ||
    req.get('accept')?.includes('application/json') ||
    req.get('content-type')?.includes('application/json');

  if (wantsJson) {
    return res.status(status).json({ success: false, error: message });
  }
  return res.status(status).render('error', {
    title: `${status} - Access Denied`,
    status,
    message
  });
}

module.exports = {
  requireOnsiteEventAccess
};
