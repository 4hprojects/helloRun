'use strict';

const WORKSPACES = Object.freeze({
  RUNNER: 'runner',
  ORGANIZER: 'organizer',
  ADMIN: 'admin'
});

function getDefaultWorkspace(user = {}) {
  if (user.role === 'admin') return WORKSPACES.ADMIN;
  if (user.role === 'organiser') return WORKSPACES.ORGANIZER;
  return WORKSPACES.RUNNER;
}

function canUseRunnerWorkspace(user = {}) {
  if (user.role === 'runner') return true;
  if (user.role !== 'organiser' || user.emailVerified !== true) return false;
  return !['restricted', 'suspended', 'closed'].includes(String(user.accountStatus || ''));
}

function canUseWorkspace(user = {}, workspace) {
  if (workspace === WORKSPACES.ADMIN) return user.role === 'admin';
  if (workspace === WORKSPACES.ORGANIZER) return user.role === 'organiser';
  if (workspace === WORKSPACES.RUNNER) return canUseRunnerWorkspace(user);
  return false;
}

function resolveActiveWorkspace(user = {}, requestedWorkspace) {
  if (canUseWorkspace(user, requestedWorkspace)) return requestedWorkspace;
  return getDefaultWorkspace(user);
}

function getWorkspaceForPath(user = {}, pathname = '', currentWorkspace) {
  const path = String(pathname || '');
  if (path === '/runner' || path.startsWith('/runner/')) {
    return canUseRunnerWorkspace(user)
      ? WORKSPACES.RUNNER
      : resolveActiveWorkspace(user, currentWorkspace);
  }
  if (path === '/organizer' || path.startsWith('/organizer/')) {
    return user.role === 'organiser'
      ? WORKSPACES.ORGANIZER
      : resolveActiveWorkspace(user, currentWorkspace);
  }
  if (path === '/admin' || path.startsWith('/admin/')) {
    return user.role === 'admin'
      ? WORKSPACES.ADMIN
      : resolveActiveWorkspace(user, currentWorkspace);
  }
  return resolveActiveWorkspace(user, currentWorkspace);
}

function getWorkspaceDashboard(workspace) {
  if (workspace === WORKSPACES.ADMIN) return '/admin/dashboard';
  if (workspace === WORKSPACES.ORGANIZER) return '/organizer/dashboard';
  return '/runner/dashboard';
}

function isOwnOrganizerEvent(user, event = {}) {
  const safeUser = user || {};
  if (safeUser.role !== 'organiser') return false;
  const organizerId = event.organizerId?._id || event.organizerId;
  return Boolean(safeUser._id && organizerId && String(safeUser._id) === String(organizerId));
}

module.exports = {
  WORKSPACES,
  getDefaultWorkspace,
  canUseRunnerWorkspace,
  canUseWorkspace,
  resolveActiveWorkspace,
  getWorkspaceForPath,
  getWorkspaceDashboard,
  isOwnOrganizerEvent
};
