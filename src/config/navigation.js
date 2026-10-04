'use strict';

// src/config/navigation.js
// The single source of truth for HelloRun's global navigation.
//
// Every destination is defined once in DESTINATIONS. `buildNavigation(locals)` picks the
// subsets each surface needs — the header row (which becomes the mobile menu below
// 900px) and the mobile bottom tabs — for the current visitor and workspace, and marks
// the current page. `layouts/nav.ejs` only renders what this returns.
//
// Visibility here is presentation only. Route guards in auth.middleware.js remain the
// authority on access; hiding a link never grants or removes permission.
//
// Signed-in users get an account menu (see `accountMenu`); guests get Log in / Sign Up.
//
// The footer is intentionally separate: it holds content and policy pages, not app
// destinations, and is rendered from layouts/footer.ejs.

const DESTINATIONS = Object.freeze({
  home: { href: '/', label: 'Home', icon: 'home' },
  events: { href: '/events', label: 'Events', icon: 'calendar-days' },
  blog: { href: '/blog', label: 'Blog', icon: 'newspaper' },
  leaderboard: { href: '/leaderboard', label: 'Leaderboard', icon: 'trophy' },
  login: { href: '/login', label: 'Log in', ariaLabel: 'Log in to HelloRun', icon: 'log-in', className: 'nav-login-btn' },
  signup: { href: '/signup', label: 'Sign Up', icon: 'user-plus', className: 'nav-signup-btn' },
  myRegistrations: { href: '/my-registrations', label: 'My Registrations', icon: 'clipboard-list' },
  submissions: { href: '/runner/submissions', label: 'Submission History', shortLabel: 'Progress', icon: 'file-check' },
  submitRun: { href: '/runner/submissions?openRunProof=1', label: 'Submit activity', shortLabel: 'Submit', icon: 'circle-plus', match: false },
  runnerDashboard: { href: '/runner/dashboard', label: 'Dashboard', shortLabel: 'Home', icon: 'layout-dashboard' },
  runnerProfile: { href: '/runner/profile', label: 'Profile', icon: 'user' },
  notifications: { href: '/runner/notifications', label: 'Notifications', icon: 'bell', className: 'nav-notifications-link' },
  organizerDashboard: { href: '/organizer/dashboard', label: 'Dashboard', ariaLabel: 'Organizer Dashboard', icon: 'layout-dashboard' },
  organizerEvents: { href: '/organizer/events', label: 'Organizer Events', shortLabel: 'Events', icon: 'calendar-days' },
  organizerWorkQueue: { href: '/organizer/dashboard#queue-breakdown-heading', label: 'Organizer Work Queue', shortLabel: 'Work', icon: 'inbox', match: false },
  organizerPromote: { href: '/organizer/promote', label: 'Organizer Promotion Tools', shortLabel: 'More', icon: 'more-horizontal' },
  adminDashboard: { href: '/admin/dashboard', label: 'Admin', ariaLabel: 'Admin Dashboard', shortLabel: 'Dashboard', icon: 'layout-dashboard' },
  adminReviews: { href: '/admin/reviews', label: 'Admin Reviews', shortLabel: 'Reviews', icon: 'list-checks' },
  adminSearch: { href: '/admin/search', label: 'Admin Search', shortLabel: 'Search', icon: 'search' },
  adminCommunications: { href: '/admin/communications', label: 'Admin Communications', shortLabel: 'More', icon: 'more-horizontal' }
});

const WORKSPACE_SWITCHES = Object.freeze({
  organizer: { action: '/workspace/organizer', label: 'Switch to Organizer mode', tooltip: 'Organizer mode', icon: 'calendar-cog' },
  runner: { action: '/workspace/runner', label: 'Switch to Runner mode', tooltip: 'Runner mode', icon: 'person-standing' }
});

function createPathMatcher(currentPath) {
  const path = String(currentPath || '');
  return (href) => {
    const target = String(href).split(/[?#]/)[0];
    if (target === '/') return path === '/';
    return path === target || path.startsWith(`${target}/`);
  };
}

function summariseNotifications(rawCount) {
  const parsed = Number(rawCount || 0);
  const count = Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
  return {
    count,
    display: count > 99 ? '99+' : String(count),
    label: count > 0
      ? `Notifications, ${count} unread notification${count === 1 ? '' : 's'}`
      : 'Notifications'
  };
}

// Mirrors the workspace resolution nav.ejs has always used, including the fallback for
// pages rendered without workspace locals (a plain runner account is a runner).
function resolveContext(locals = {}) {
  const isAuthenticated = Boolean(locals.isAuthenticated);
  const isOrganizerAccount = Boolean(locals.isOrganizer || locals.isApprovedOrganizer);
  const isRunnerWorkspace = Boolean(
    locals.isRunnerWorkspace ||
    (isAuthenticated && !locals.isAdmin && !isOrganizerAccount)
  );
  const isOrganizerWorkspace = Boolean(
    locals.isOrganizerWorkspace ||
    (isAuthenticated && isOrganizerAccount && !isRunnerWorkspace)
  );
  return { isAuthenticated, isRunnerWorkspace, isOrganizerWorkspace, isAdmin: Boolean(locals.isAdmin) };
}

function buildNavigation(locals = {}) {
  const isCurrent = createPathMatcher(locals.currentPath);
  const notifications = summariseNotifications(locals.runnerUnreadNotifications);
  const context = resolveContext(locals);

  // Header items carry everything the template prints, so it holds no route logic.
  const headerItem = (key, overrides = {}) => {
    const destination = { ...DESTINATIONS[key], ...overrides };
    const current = destination.match !== false && isCurrent(destination.href);
    return {
      id: key,
      href: destination.href,
      label: destination.label,
      ariaLabel: destination.ariaLabel || destination.label,
      title: destination.title || destination.label,
      icon: destination.icon,
      className: destination.className || '',
      data: destination.data || null,
      badge: destination.badge || null,
      isCurrent: current
    };
  };

  const bottomItem = (key, overrides = {}) => {
    const destination = { ...DESTINATIONS[key], ...overrides };
    return {
      id: key,
      href: destination.href,
      shortLabel: destination.shortLabel || destination.label,
      ariaLabel: destination.ariaLabel || destination.label,
      icon: destination.icon,
      isCurrent: destination.match !== false && isCurrent(destination.href)
    };
  };

  const notificationItem = () => headerItem('notifications', {
    ariaLabel: notifications.label,
    title: 'Notifications',
    badge: notifications.count > 0 ? notifications.display : null
  });

  const primary = ['home', 'events', 'blog', 'leaderboard']
    .map((key) => headerItem(key, { className: 'nav-primary-link' }));

  const navigation = {
    context: 'guest',
    isRunnerWorkspace: context.isRunnerWorkspace,
    primary,
    account: [],
    // Personal destinations shown in the account menu (avatar button on desktop,
    // inline section of the mobile menu). Log out and the workspace switch sit beside them.
    accountMenu: [],
    workspaceSwitch: null,
    auth: [],
    bottom: null,
    notifications
  };

  if (!context.isAuthenticated) {
    navigation.auth = [headerItem('login'), headerItem('signup')];
    return navigation;
  }

  navigation.accountMenu.push(headerItem('runnerProfile', { label: 'My profile', icon: 'user-round' }));
  navigation.account.push(headerItem('myRegistrations'));
  if (context.isRunnerWorkspace) navigation.account.push(headerItem('submissions'));

  // Header: admin first, then the active workspace. A user outside any workspace (for
  // example an admin-less page rendered without workspace locals) falls back to runner.
  if (context.isAdmin) {
    navigation.context = 'admin';
    navigation.account.push(headerItem('adminDashboard', {
      ariaLabel: 'Admin',
      icon: 'shield-check',
      label: `Admin — ${locals.isFullAdmin ? 'Full access' : 'Support access'}`,
      title: 'Admin',
      data: { 'admin-tier': locals.isFullAdmin ? 'full' : 'support' }
    }));
  } else if (context.isRunnerWorkspace) {
    navigation.context = 'runner';
    navigation.account.push(headerItem('runnerDashboard'), notificationItem());
    if (locals.canUseOrganizerWorkspace) navigation.workspaceSwitch = WORKSPACE_SWITCHES.organizer;
  } else if (context.isOrganizerWorkspace) {
    navigation.context = 'organizer';
    navigation.account.push(headerItem('organizerDashboard', { ariaLabel: 'Dashboard' }), notificationItem());
    if (locals.canUseRunnerWorkspace) navigation.workspaceSwitch = WORKSPACE_SWITCHES.runner;
  } else {
    navigation.context = 'runner';
    navigation.account.push(headerItem('runnerDashboard'), notificationItem());
  }

  // Bottom tabs: at most five task destinations per workspace. The workspace switch
  // lives in the header menu, which is the same control on every screen size.
  if (context.isRunnerWorkspace) {
    navigation.bottom = {
      label: 'Mobile navigation',
      items: [
        bottomItem('runnerDashboard', { ariaLabel: 'Dashboard' }),
        bottomItem('events'),
        {
          ...bottomItem('submitRun'),
          kind: 'submit',
          // Pages that load the run-proof modal open it in place instead of navigating.
          opensModal: Boolean(locals.renderRunProofModal)
        },
        bottomItem('submissions'),
        bottomItem('runnerProfile')
      ]
    };
  } else if (context.isOrganizerWorkspace) {
    const items = [bottomItem('organizerDashboard', { shortLabel: 'Dashboard' })];
    if (locals.isApprovedOrganizer || locals.canUseOrganizerWorkspace) {
      items.push(
        bottomItem('organizerEvents'),
        bottomItem('organizerWorkQueue'),
        bottomItem('notifications', { ariaLabel: notifications.label }),
        bottomItem('organizerPromote')
      );
    }
    navigation.bottom = { label: 'Organizer mobile navigation', items };
  } else if (context.isAdmin) {
    navigation.bottom = {
      label: 'Admin mobile navigation',
      items: [
        bottomItem('adminDashboard'),
        bottomItem('adminReviews'),
        bottomItem('adminSearch'),
        bottomItem('adminCommunications')
      ]
    };
  }

  return navigation;
}

module.exports = {
  DESTINATIONS,
  WORKSPACE_SWITCHES,
  buildNavigation,
  createPathMatcher,
  resolveContext,
  summariseNotifications
};
