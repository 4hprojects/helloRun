'use strict';

// Who may register for and submit to an event.
//
// canUseRunnerWorkspace is the single gate in front of every register, upload, submit and
// Strava route, so this pins the whole role matrix in one place. It must also agree with
// User.canParticipateInEvents, which used to allow admins while this one refused them.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { canUseRunnerWorkspace } = require('../src/utils/workspace');
const User = require('../src/models/User');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const participates = (doc) => User.prototype.canParticipateInEvents.call(doc);

test('runners always pass the runner-workspace gate', () => {
  assert.equal(canUseRunnerWorkspace({ role: 'runner' }), true);
  // Deliberately short-circuits before any verification check; registration catches an
  // unverified runner later with a clearer message.
  assert.equal(canUseRunnerWorkspace({ role: 'runner', emailVerified: false }), true);
  assert.equal(canUseRunnerWorkspace({ role: 'runner', accountStatus: 'restricted' }), true);
});

test('organisers pass once verified and unrestricted', () => {
  assert.equal(canUseRunnerWorkspace({ role: 'organiser', emailVerified: true }), true);
  assert.equal(canUseRunnerWorkspace({ role: 'organiser', emailVerified: false }), false);
  for (const accountStatus of ['restricted', 'suspended', 'closed']) {
    assert.equal(
      canUseRunnerWorkspace({ role: 'organiser', emailVerified: true, accountStatus }),
      false,
      accountStatus
    );
  }
  // organizerStatus is not consulted: a pending organiser may still take part as a runner.
  assert.equal(
    canUseRunnerWorkspace({ role: 'organiser', emailVerified: true, organizerStatus: 'pending' }),
    true
  );
});

test('admins never pass, whatever their verification or status', () => {
  assert.equal(canUseRunnerWorkspace({ role: 'admin', emailVerified: true }), false);
  assert.equal(canUseRunnerWorkspace({ role: 'admin', emailVerified: true, accountStatus: 'active' }), false);
});

test('an unknown or missing role is refused', () => {
  assert.equal(canUseRunnerWorkspace({}), false);
  assert.equal(canUseRunnerWorkspace(), false);
  assert.equal(canUseRunnerWorkspace({ role: 'guest' }), false);
});

test('canParticipateInEvents agrees with the workspace gate about admins', () => {
  // These two used to contradict each other: the gate refused admins while the model
  // method allowed them, reachable the moment either check was reordered or reused.
  assert.equal(participates({ role: 'admin', emailVerified: true }), false);
  assert.equal(canUseRunnerWorkspace({ role: 'admin', emailVerified: true }), false);

  assert.equal(participates({ role: 'runner', emailVerified: true }), true);
  assert.equal(participates({ role: 'organiser', emailVerified: true }), true);
  assert.equal(participates({ role: 'organiser', emailVerified: false }), false);
  assert.equal(participates({ role: 'runner', emailVerified: true, accountStatus: 'restricted' }), false);
});

test('every participant write route sits behind the runner-workspace gate', () => {
  const pageRoutes = read('src/routes/pageRoutes.js');
  const runnerRoutes = read('src/routes/runner.routes.js');
  const stravaRoutes = read('src/routes/strava.routes.js');

  for (const fragment of [
    "'/events/:slug/register', requireAuth, requireRunnerWorkspace",
    "'/my-registrations/:registrationId/details', requireAuth, requireRunnerWorkspace"
  ]) {
    assert.ok(pageRoutes.includes(fragment), fragment);
  }
  // Submit and resubmit are multi-line route definitions.
  assert.match(pageRoutes, /'\/my-registrations\/:registrationId\/submit-result',\s*\n\s*requireAuth,\s*\n\s*requireRunnerWorkspace/);
  assert.match(pageRoutes, /'\/my-registrations\/:registrationId\/resubmit-result',\s*\n\s*requireAuth,\s*\n\s*requireRunnerWorkspace/);
  assert.match(pageRoutes, /'\/my-registrations\/:registrationId\/payment-proof',\s*\n\s*requireAuth,\s*\n\s*requireRunnerWorkspace/);
  // The whole /runner subtree.
  assert.match(runnerRoutes, /router\.use\('\/runner', requireAuth, requireRunnerWorkspace\)/);
  // Strava sync uses the JSON variant of the same predicate.
  assert.match(stravaRoutes, /requireRunnerWorkspaceJson/);
});

test('the event page explains the admin block rather than offering a dead CTA', () => {
  const controller = read('src/controllers/page/event.controller.js');
  assert.match(controller, /if \(viewer\.role === 'admin'\)/);
  assert.match(controller, /cannot register for or compete in events/);
});
