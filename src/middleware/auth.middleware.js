const User = require('../models/User');
const { countUnreadNotifications } = require('../services/notification.service');

/**
 * Redirect already-authenticated users away from login/signup
 */
async function redirectIfAuth(req, res, next) {
  if (req.session && req.session.userId) {
    try {
      const user = await User.findById(req.session.userId).select('role organizerStatus');
      if (!user) {
        req.session.destroy(() => {});
        return next();
      }

      req.session.role = user.role;

      if (user.role === 'admin') {
        return res.redirect('/admin/dashboard');
      }

      if (user.role === 'organiser') {
        return res.redirect('/organizer/dashboard');
      }

      return res.redirect('/runner/dashboard');
    } catch (error) {
      console.error('Error in redirectIfAuth:', error);
      return next(error);
    }
  }
  next();
}

/**
 * Populate res.locals with auth state for all views (nav, etc.)
 * Must be registered BEFORE all routes in server.js
 */
async function populateAuthLocals(req, res, next) {
  res.locals.currentPath = req.path;

  if (req.session && req.session.userId) {
    try {
      const user = await User.findById(req.session.userId).select('-passwordHash');

      if (user) {
        res.locals.user = user;
        res.locals.isAuthenticated = true;
        res.locals.isOrganizer = user.role === 'organiser';
        res.locals.isAdmin = user.role === 'admin';
        res.locals.isApprovedOrganizer = user.role === 'organiser' && user.organizerStatus === 'approved';
        res.locals.runnerUnreadNotifications = user.role === 'runner'
          ? await countUnreadNotifications(user._id)
          : 0;
      } else {
        req.session.destroy(() => {});
        res.locals.user = null;
        res.locals.isAuthenticated = false;
        res.locals.isOrganizer = false;
        res.locals.isAdmin = false;
        res.locals.isApprovedOrganizer = false;
        res.locals.runnerUnreadNotifications = 0;
      }
    } catch (error) {
      console.error('Error in populateAuthLocals:', error);
      res.locals.user = null;
      res.locals.isAuthenticated = false;
      res.locals.isOrganizer = false;
      res.locals.isAdmin = false;
      res.locals.isApprovedOrganizer = false;
      res.locals.runnerUnreadNotifications = 0;
    }
  } else {
    res.locals.user = null;
    res.locals.isAuthenticated = false;
    res.locals.isOrganizer = false;
    res.locals.isAdmin = false;
    res.locals.isApprovedOrganizer = false;
    res.locals.runnerUnreadNotifications = 0;
  }

  next();
}

/**
 * Require authenticated user
 */
function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    if (req.session) {
      req.session.returnTo = req.originalUrl;
    }
    return res.redirect('/login');
  }
  next();
}

/**
 * Require admin role
 */
async function requireAdmin(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.redirect('/login');
  }
  const user = await User.findById(req.session.userId);
  if (!user || user.role !== 'admin') {
    return res.status(403).send('Access denied');
  }
  next();
}

/**
 * Require organiser role
 */
async function requireOrganizer(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.redirect('/login');
  }
  const user = await User.findById(req.session.userId);
  if (!user || user.role !== 'organiser') {
    return res.status(403).send('Access denied');
  }
  next();
}

/**
 * Require approved organiser
 */
async function requireApprovedOrganizer(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.redirect('/login');
  }
  const user = await User.findById(req.session.userId);
  if (!user || user.role !== 'organiser' || user.organizerStatus !== 'approved') {
    return res.status(403).send('Access denied - Organizer approval required');
  }
  next();
}

/**
 * Require organiser account allowed to create events
 */
async function requireCanCreateEvents(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.redirect('/login');
  }
  const user = await User.findById(req.session.userId);
  if (!user || typeof user.canCreateEvents !== 'function' || !user.canCreateEvents()) {
    return res.status(403).send('Access denied - verified organizer approval required');
  }
  next();
}

module.exports = {
  populateAuthLocals,
  redirectIfAuth,
  requireAuth,
  requireAdmin,
  requireOrganizer,
  requireApprovedOrganizer,
  requireCanCreateEvents
};
