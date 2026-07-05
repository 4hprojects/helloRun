'use strict';

// Barrel: assembles the blog/* sub-controllers (CQ-2 split).

module.exports = {
  ...require('./blog/public.controller'),
  ...require('./blog/author.controller'),
  ...require('./blog/admin.controller')
};
