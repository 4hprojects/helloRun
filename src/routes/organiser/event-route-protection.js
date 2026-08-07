const { requireAuth } = require('../../middleware/auth.middleware');
const { requireCsrfProtection } = require('../../middleware/csrf.middleware');
const { requireOrganizerEventAccess } = require('../../middleware/organizer-event-access.middleware');
const { requireOnsiteEventAccess } = require('../../middleware/onsite-event-access.middleware');

const protectEventRead = [requireAuth, requireOrganizerEventAccess];
const protectEventMutation = [requireAuth, requireCsrfProtection, requireOrganizerEventAccess];

// Onsite operations additionally admit assigned race-day staff holding the named
// permission. Everything else stays organiser/admin only.
const protectOnsiteRead = (permission) => [requireAuth, requireOnsiteEventAccess(permission)];
const protectOnsiteMutation = (permission) => [
  requireAuth,
  requireCsrfProtection,
  requireOnsiteEventAccess(permission)
];

module.exports = {
  protectEventMutation,
  protectEventRead,
  protectOnsiteRead,
  protectOnsiteMutation
};
