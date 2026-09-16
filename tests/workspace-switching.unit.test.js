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
  getWorkspaceDashboard
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

test('organisers and co-organisers are no longer blocked from joining their own events', () => {
  // The platform used to refuse registration, payment actions, and submissions on any
  // event the signed-in organiser owned. That rule is gone; the only thing that stays
  // off limits is reviewing your own work (asserted below).
  const workspace = read('src/utils/workspace.js');
  const registration = read('src/controllers/page/registration.controller.js');
  const submission = read('src/controllers/page/submission.controller.js');
  const submissionService = read('src/services/submission.service.js');
  const eventDetails = read('src/views/pages/event-details.ejs');

  for (const source of [workspace, registration, submission, submissionService, eventDetails]) {
    assert.doesNotMatch(source, /isOwnOrganizerEvent/);
    assert.doesNotMatch(source, /ownEventParticipationConflict/);
  }
  assert.doesNotMatch(submission, /OWN_EVENT_CONFLICT/);
  assert.doesNotMatch(submissionService, /Organizers cannot submit results to events they manage/);
});

test('reviewing your own entry is recorded, not blocked', () => {
  // Blocking it deadlocked a sole organiser: with no co-organiser, and a submission that
  // is not auto-approvable, nobody could approve their entry. The conflict-of-interest
  // signal is kept as an extra audit row instead.
  const submissionService = read('src/services/submission.service.js');
  const accumulated = read('src/services/accumulated-activity.service.js');

  for (const source of [submissionService, accumulated]) {
    assert.doesNotMatch(source, /You cannot review your own/);
    assert.match(source, /const isSelfReview = Boolean\(/);
    assert.match(source, /action: 'submission\.self_reviewed'/);
  }

  // Payment proofs keep their own self-approval block; that is a money control and was
  // deliberately left in place.
  const review = read('src/routes/organiser/review.js');
  assert.match(review, /You cannot approve your own payment proof/);
  assert.match(review, /payment\.self_approval_blocked/);
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

test('participant mutation paths stay behind the runner workspace gate', () => {
  const pageRoutes = read('src/routes/pageRoutes.js');

  assert.match(pageRoutes, /\/events\/:slug\/register', requireAuth, requireRunnerWorkspace/);
});
