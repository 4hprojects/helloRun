'use strict';

module.exports = {
  ...require('./admin/users.controller'),
  ...require('./admin/applications.controller'),
  ...require('./admin/events.controller'),
  ...require('./admin/badges.controller'),
  ...require('./admin/submissions.controller'),
  ...require('./admin/policy.controller'),
};
