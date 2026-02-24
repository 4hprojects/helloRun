const User = require('../models/User');

/**
 * Redirect already-authenticated users away from login/signup
 */
function redirectIfAuth(req, res, next) {
  if (req.session && req.session.userId) {
    // Redirect based on role
    if (req.session.role === 'admin') {
      return res.redirect('/admin/dashboard');
    } else if (req.session.role === 'organiser') {
      return res.redirect('/organizer/dashboard');
    } else {
      return res.redirect('/runner/dashboard');
    }
  }
  next();
}

/**
 * Populate res.locals with auth state for all views (nav, etc.)
 * Must be registered BEFORE all routes in server.js
 */
async function populateAuthLocals(req, res, next) {
  res.locals.isAuthPage = ['/login', '/signup', '/register', '/forgot-password'].some(
    path => req.path.startsWith(path)
  );

  if (req.session && req.session.userId) {
    try {
      const user = await User.findById(req.session.userId).select('-passwordHash');

      if (user) {
        res.locals.user = user;
        res.locals.isAuthenticated = true;
        res.locals.isOrganizer = user.role === 'organiser';
        res.locals.isAdmin = user.role === 'admin';
        res.locals.isApprovedOrganizer = user.role === 'organiser' && user.organizerStatus === 'approved';
      } else {
        req.session.destroy(() => {});
        res.locals.user = null;
        res.locals.isAuthenticated = false;
        res.locals.isOrganizer = false;
        res.locals.isAdmin = false;
        res.locals.isApprovedOrganizer = false;
      }
    } catch (error) {
      console.error('Error in populateAuthLocals:', error);
      res.locals.user = null;
      res.locals.isAuthenticated = false;
      res.locals.isOrganizer = false;
      res.locals.isAdmin = false;
      res.locals.isApprovedOrganizer = false;
    }
  } else {
    res.locals.user = null;
    res.locals.isAuthenticated = false;
    res.locals.isOrganizer = false;
    res.locals.isAdmin = false;
    res.locals.isApprovedOrganizer = false;
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

module.exports = {
  populateAuthLocals,
  redirectIfAuth,
  requireAuth,
  requireAdmin,
  requireOrganizer,
  requireApprovedOrganizer
};
