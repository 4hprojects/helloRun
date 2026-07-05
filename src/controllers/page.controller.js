'use strict';

// Barrel: assembles the page/* sub-controllers (analysis CQ-2 split).

module.exports = {
  ...require('./page/home.controller'),
  ...require('./page/event.controller'),
  ...require('./page/badge.controller'),
  ...require('./page/registration.controller'),
  ...require('./page/submission.controller'),
  ...require('./page/blog-public.controller'),
  ...require('./page/leaderboard.controller'),
  ...require('./page/sitemap.controller')
};
