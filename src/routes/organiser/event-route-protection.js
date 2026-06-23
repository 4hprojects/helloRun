const { requireAuth } = require('../../middleware/auth.middleware');
const { requireCsrfProtection } = require('../../middleware/csrf.middleware');
const { requireOrganizerEventAccess } = require('../../middleware/organizer-event-access.middleware');

const protectEventRead = [requireAuth, requireOrganizerEventAccess];
const protectEventMutation = [requireAuth, requireCsrfProtection, requireOrganizerEventAccess];

module.exports = {
  protectEventMutation,
  protectEventRead
};
