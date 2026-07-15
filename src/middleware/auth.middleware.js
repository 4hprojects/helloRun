const User = require('../models/User');
const { countUnreadNotifications } = require('../services/notification.service');
const logger = require('../utils/logger');
const { sendHttpError } = require('../utils/http-error-response');
const { consumeSessionFlash } = require('../utils/session-flash');

const AUTH_LOCAL_USER_FIELDS = 'userId email firstName lastName displayName role adminTier organizerStatus emailVerified authProvider profileImageUrl avatarUrl accountStatus';
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
  res.locals.flash = consumeSessionFlash(req);

  if (req.session && req.session.userId) {
    try {
      const user = await User.findById(req.session.userId)
        .select(AUTH_LOCAL_USER_FIELDS)
        .lean();

      if (user) {
        if (user.accountStatus === 'suspended' || user.accountStatus === 'closed') {
          req.session.destroy(() => {});
          return res.redirect('/login?suspended=1');
        }
        res.locals.user = user;
        res.locals.isAuthenticated = true;
        res.locals.isOrganizer = user.role === 'organiser';
        res.locals.isAdmin = user.role === 'admin';
        res.locals.isFullAdmin = user.role === 'admin' && isFullAdminTier(user);
        res.locals.isApprovedOrganizer = user.role === 'organiser' && user.organizerStatus === 'approved';
        res.locals.runnerUnreadNotifications = await getRunnerUnreadCountForLocals(req, user);
      } else {
        req.session.destroy(() => {});
        res.locals.user = null;
        res.locals.isAuthenticated = false;
        res.locals.isOrganizer = false;
        res.locals.isAdmin = false;
        res.locals.isFullAdmin = false;
        res.locals.isApprovedOrganizer = false;
        res.locals.runnerUnreadNotifications = 0;
      }
    } catch (error) {
      logger.error('Error in populateAuthLocals:', error);
      res.locals.user = null;
      res.locals.isAuthenticated = false;
      res.locals.isOrganizer = false;
      res.locals.isAdmin = false;
      res.locals.isFullAdmin = false;
      res.locals.isApprovedOrganizer = false;
      res.locals.runnerUnreadNotifications = 0;
    }
  } else {
    res.locals.user = null;
    res.locals.isAuthenticated = false;
    res.locals.isOrganizer = false;
    res.locals.isAdmin = false;
    res.locals.isFullAdmin = false;
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
  try {
    const user = await User.findById(req.session.userId).select('role').lean();
    if (!user || user.role !== 'admin') {
      return sendHttpError(req, res, {
        status: 403,
        message: 'You do not have access to the admin area.',
        detail: 'Sign in with an administrator account or return to your dashboard.'
      });
    }
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Treats missing/undefined adminTier as 'full' so existing admins are never
 * locked out by a schema field that didn't exist when their account was created.
 */
function isFullAdminTier(user) {
  return Boolean(user) && user.adminTier !== 'support';
}

/**
 * Require admin role AND full admin tier (blocks the 'support' tier from the
 * highest-blast-radius actions: account/event deletion, policy publishing,
 * communications settings, site-wide settings, mass-email promotion, and
 * data exports). Always run after requireAdmin on the same route.
 */
async function requireFullAdmin(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.redirect('/login');
  }
  try {
    const user = await User.findById(req.session.userId).select('role adminTier').lean();
    if (!user || user.role !== 'admin' || !isFullAdminTier(user)) {
      return sendHttpError(req, res, {
        status: 403,
        message: 'This action requires full admin access.',
        detail: 'Your account can continue using support-safe admin tools. Ask a full administrator to complete this action.',
        actionHref: '/admin/dashboard',
        actionLabel: 'Return to Admin Dashboard'
      });
    }
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Require organiser role
 */
async function requireOrganizer(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.redirect('/login');
  }
  try {
    const user = await User.findById(req.session.userId).select('role').lean();
    if (!user || user.role !== 'organiser') {
      return sendHttpError(req, res, {
        status: 403,
        message: 'This area is available to organizer accounts.',
        detail: 'Return to your dashboard to continue with the tools available to your account.'
      });
    }
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Require approved organiser
 */
async function requireApprovedOrganizer(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.redirect('/login');
  }
  try {
    const user = await User.findById(req.session.userId).select('role organizerStatus').lean();
    if (!user || user.role !== 'organiser' || user.organizerStatus !== 'approved') {
      return sendHttpError(req, res, {
        status: 403,
        message: 'Organizer approval is required for this action.',
        detail: 'Review your application status for the current decision and any next steps.',
        actionHref: '/organizer/application-status',
        actionLabel: 'View Application Status'
      });
    }
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Require organiser account allowed to create events
 */
async function requireCanCreateEvents(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.redirect('/login');
  }
  try {
    const user = await User.findById(req.session.userId)
      .select('role organizerStatus emailVerified accountStatus organizerEventCreationAcknowledgement')
      .lean();
    if (!user || !canCreateEventsFromLeanUser(user)) {
      return sendHttpError(req, res, {
        status: 403,
        message: 'Your organizer account is not ready to create events.',
        detail: 'Verify your email and review the organizer dashboard for approval or event-creation requirements.',
        actionHref: '/organizer/dashboard',
        actionLabel: 'Review Organizer Dashboard'
      });
    }
    next();
  } catch (error) {
    next(error);
  }
}

// Identity approval is not required to create events — only to unlock paid/physical
// setups (enforced at event save time). Any verified organiser who signed the
// event-creation acknowledgement may create and manage free virtual events.
function canCreateEventsFromLeanUser(user) {
  if (user.role !== 'organiser' || !user.emailVerified) return false;
  if (user.accountStatus === 'restricted') return false;
  if (user.organizerStatus === 'approved') return true;
  return Boolean(user.organizerEventCreationAcknowledgement?.agreedAt);
}

module.exports = {
  populateAuthLocals,
  redirectIfAuth,
  requireAuth,
  requireAdmin,
  requireFullAdmin,
  isFullAdminTier,
  requireOrganizer,
  requireApprovedOrganizer,
  requireCanCreateEvents,
  canCreateEventsFromLeanUser
};
