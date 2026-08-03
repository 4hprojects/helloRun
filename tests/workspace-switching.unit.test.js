'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  WORKSPACES,
  getDefaultWorkspace,
  canUseRunnerWorkspace,
  canUseWorkspace,
  resolveActiveWorkspace,
  getWorkspaceForPath,
  getWorkspaceDashboard,
  isOwnOrganizerEvent
} = require('../src/utils/workspace');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('workspace defaults preserve permanent account roles', () => {
  assert.equal(getDefaultWorkspace({ role: 'runner' }), WORKSPACES.RUNNER);
  assert.equal(getDefaultWorkspace({ role: 'organiser' }), WORKSPACES.ORGANIZER);
  assert.equal(getDefaultWorkspace({ role: 'admin' }), WORKSPACES.ADMIN);
  assert.equal(getWorkspaceDashboard(WORKSPACES.RUNNER), '/runner/dashboard');
  assert.equal(getWorkspaceDashboard(WORKSPACES.ORGANIZER), '/organizer/dashboard');
  assert.equal(getWorkspaceDashboard(WORKSPACES.ADMIN), '/admin/dashboard');
});

test('verified unrestricted organizers can use runner workspace without changing role', () => {
  const organizer = {
    role: 'organiser',
    organizerStatus: 'pending',
    emailVerified: true,
    accountStatus: 'active'
  };

  assert.equal(canUseRunnerWorkspace(organizer), true);
  assert.equal(canUseWorkspace(organizer, WORKSPACES.RUNNER), true);
  assert.equal(canUseWorkspace(organizer, WORKSPACES.ORGANIZER), true);
  assert.equal(resolveActiveWorkspace(organizer, WORKSPACES.RUNNER), WORKSPACES.RUNNER);
  assert.equal(organizer.role, 'organiser');
});

test('unverified or restricted organizers and admins cannot use runner workspace', () => {
  assert.equal(canUseRunnerWorkspace({
    role: 'organiser',
    emailVerified: false,
    accountStatus: 'active'
  }), false);
  assert.equal(canUseRunnerWorkspace({
    role: 'organiser',
    emailVerified: true,
    accountStatus: 'restricted'
  }), false);
  assert.equal(canUseRunnerWorkspace({
    role: 'admin',
    emailVerified: true,
    accountStatus: 'active'
  }), false);
});

test('workspace paths activate only workspaces authorized by the permanent role', () => {
  const organizer = {
    role: 'organiser',
    emailVerified: true,
    accountStatus: 'active'
  };
  const admin = { role: 'admin' };

  assert.equal(
    getWorkspaceForPath(organizer, '/runner/dashboard', WORKSPACES.ORGANIZER),
    WORKSPACES.RUNNER
  );
  assert.equal(
    getWorkspaceForPath(organizer, '/organizer/events', WORKSPACES.RUNNER),
    WORKSPACES.ORGANIZER
  );
  assert.equal(
    getWorkspaceForPath(admin, '/runner/dashboard', WORKSPACES.ADMIN),
    WORKSPACES.ADMIN
  );
});

test('organizer own-event conflicts compare stable user and event IDs', () => {
  const organizer = { _id: 'organizer-1', role: 'organiser' };
  assert.equal(isOwnOrganizerEvent(organizer, { organizerId: 'organizer-1' }), true);
  assert.equal(isOwnOrganizerEvent(organizer, { organizerId: { _id: 'organizer-1' } }), true);
  assert.equal(isOwnOrganizerEvent(organizer, { organizerId: 'organizer-2' }), false);
  assert.equal(isOwnOrganizerEvent({ _id: 'organizer-1', role: 'runner' }, { organizerId: 'organizer-1' }), false);
});

test('workspace switching UI uses CSRF-protected forms on desktop and mobile', () => {
  const nav = read('src/views/layouts/nav.ejs');
  assert.match(nav, /action="\/workspace\/runner" method="POST"/);
  assert.match(nav, /action="\/workspace\/organizer" method="POST"/);
  assert.match(nav, /name="_csrf"/);
  assert.match(nav, /locals\.isRunnerWorkspace/);
  assert.match(nav, /mobile-workspace-switch-form/);

  const authRoutes = read('src/routes/authRoutes.js');
  assert.match(authRoutes, /router\.post\('\/workspace\/:workspace', requireAuth, requireCsrfProtection/);
});

test('participant mutation paths and own-event guards are enforced server-side', () => {
  const pageRoutes = read('src/routes/pageRoutes.js');
  const registration = read('src/controllers/page/registration.controller.js');
  const submission = read('src/controllers/page/submission.controller.js');
  const submissionService = read('src/services/submission.service.js');

  assert.match(pageRoutes, /\/events\/:slug\/register', requireAuth, requireRunnerWorkspace/);
  assert.match(registration, /isOwnOrganizerEvent\(user, event\)/);
  assert.match(submission, /OWN_EVENT_CONFLICT/);
  assert.match(submissionService, /Organizers cannot submit results to events they manage/);
});
