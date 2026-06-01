const User = require('../models/User');
const { countUnreadNotifications } = require('../services/notification.service');
const logger = require('../utils/logger');

const AUTH_LOCAL_USER_FIELDS = 'userId email firstName lastName displayName role organizerStatus emailVerified authProvider profileImageUrl avatarUrl';
const RUNNER_UNREAD_CACHE_MS = 30 * 1000;

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
      logger.error('Error in redirectIfAuth:', error);
      return next(error);
    }
  }
  next();
}

async function getRunnerUnreadCountForLocals(req, user) {
  if (user.role !== 'runner') return 0;
  if (!shouldLoadRunnerUnreadCount(req)) return 0;

  const cache = req.session?.runnerUnreadNotifications;
  const cachedAt = Number(cache?.cachedAt || 0);
  const forceFresh = req.path.startsWith('/runner/notifications');
  if (!forceFresh && cache && Date.now() - cachedAt < RUNNER_UNREAD_CACHE_MS) {
    return Number(cache.count || 0);
  }

  const count = await countUnreadNotifications(user._id);
  if (req.session) {
    req.session.runnerUnreadNotifications = {
      count,
      cachedAt: Date.now()
    };
  }
  return count;
}

function shouldLoadRunnerUnreadCount(req) {
  const method = String(req.method || '').toUpperCase();
  if (!['GET', 'HEAD'].includes(method)) return false;
  if (req.path.startsWith('/admin') || req.path.startsWith('/organizer') || req.path.startsWith('/webhooks')) return false;

  const accept = String(req.get('accept') || '').toLowerCase();
  if (accept.includes('application/json') && !accept.includes('text/html')) return false;
  return true;
}

/**
 * Populate res.locals with auth state for all views (nav, etc.)
 * Must be registered BEFORE all routes in server.js
 */
async function populateAuthLocals(req, res, next) {
  res.locals.currentPath = req.path;

  if (req.session && req.session.userId) {
    try {
      const user = await User.findById(req.session.userId)
        .select(AUTH_LOCAL_USER_FIELDS)
        .lean();

      if (user) {
        res.locals.user = user;
        res.locals.isAuthenticated = true;
        res.locals.isOrganizer = user.role === 'organiser';
        res.locals.isAdmin = user.role === 'admin';
        res.locals.isApprovedOrganizer = user.role === 'organiser' && user.organizerStatus === 'approved';
        res.locals.runnerUnreadNotifications = await getRunnerUnreadCountForLocals(req, user);
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
      logger.error('Error in populateAuthLocals:', error);
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
  const user = await User.findById(req.session.userId).select('role').lean();
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
  const user = await User.findById(req.session.userId).select('role').lean();
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
  const user = await User.findById(req.session.userId).select('role organizerStatus').lean();
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
  const user = await User.findById(req.session.userId)
    .select('role organizerStatus emailVerified organizerEventCreationAcknowledgement')
    .lean();
  if (!user || !canCreateEventsFromLeanUser(user)) {
    return res.status(403).send('Access denied - verified organizer approval required');
  }
  next();
}

function canCreateEventsFromLeanUser(user) {
  if (user.role !== 'organiser' || !user.emailVerified) return false;
  if (user.organizerStatus === 'approved') return true;
  return user.organizerStatus === 'pending' && Boolean(user.organizerEventCreationAcknowledgement?.agreedAt);
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
