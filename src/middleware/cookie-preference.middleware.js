'use strict';

const { readPreferences } = require('../services/cookie-preference.service');

function populateCookiePreferenceLocals(req, res, next) {
  const preferences = readPreferences(req.get('cookie') || '', process.env.SESSION_SECRET);
  req.cookiePreferences = preferences;
  res.locals.cookiePreferences = preferences;
  res.locals.canUseFunctionalStorage = preferences.functional;
  res.locals.canUseAnalytics = preferences.analytics;
  next();
}

module.exports = { populateCookiePreferenceLocals };
