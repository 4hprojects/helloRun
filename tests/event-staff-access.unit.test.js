'use strict';

// Event-scoped race-day staff.
//
// Until this existed, checking runners in required the organiser's own login on the
// organiser's own phone — the first thing a pilot organiser with volunteers hits.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { normalisePermissions, STAFF_PERMISSIONS } = require('../src/services/event-staff.service');

const ROOT = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const model = read('src/models/EventStaff.js');
const service = read('src/services/event-staff.service.js');
const middleware = read('src/middleware/onsite-event-access.middleware.js');
const protection = read('src/routes/organiser/event-route-protection.js');
const operationsRoutes = read('src/routes/organiser/onsite-operations.js');
const pageRoutes = read('src/routes/organiser/onsite-pages.js');
const staffView = read('src/views/organizer/event-staff.ejs');

test('permissions are an allowlist, and anything else is dropped', () => {
  assert.deepEqual(STAFF_PERMISSIONS, ['check_in', 'race_kit', 'results']);
  assert.deepEqual(normalisePermissions(['check_in', 'results']), ['check_in', 'results']);

  // A crafted form post must not be able to invent a permission.
  assert.deepEqual(normalisePermissions(['admin', 'delete_event', '']), []);
  assert.deepEqual(normalisePermissions('check_in'), ['check_in']);
  assert.deepEqual(normalisePermissions(undefined), []);
  // Duplicates collapse rather than accumulating.
  assert.deepEqual(normalisePermissions(['check_in', 'check_in']), ['check_in']);
});

test('staff access is scoped to one event and never touches the global role', () => {
  // Widening User.role would grant something everywhere to solve a one-event problem.
  assert.match(model, /eventId/);
  assert.match(model, /not\* a new value on `User\.role`/);
  assert.doesNotMatch(model, /role: \{[\s\S]{0,120}enum: \['runner'/);

  const user = read('src/models/User.js');
  assert.match(user, /enum: \['runner', 'organiser', 'admin'\]/, 'User.role must be unchanged');
});

test('a revoked assignment grants nothing, and the row is kept for the audit trail', () => {
  assert.match(service, /revokedAt: null/);
  assert.match(model, /Revoking keeps the row/);
  assert.match(service, /\$set: \{ revokedAt: new Date\(\), revokedBy \}/);
});

test('re-adding someone previously removed reinstates rather than colliding', () => {
  // eventId+userId is unique, so a plain insert would fail on the second grant.
  assert.match(model, /unique: true/);
  assert.match(service, /revokedAt: null,\s*revokedBy: null/);
  assert.match(service, /upsert: true/);
});

test('granting access requires an existing account and at least one permission', () => {
  assert.match(service, /No HelloRun account uses that email address/);
  assert.match(service, /Choose at least one thing this person may do/);
  // This grants access; it must not become an account-creation path.
  assert.match(service, /it does\s*\n \* not create accounts/);
});

test('the middleware admits organiser, admin, or a staff member with that permission', () => {
  assert.match(middleware, /const isAdmin = user\.role === 'admin'/);
  assert.match(middleware, /isOwningOrganiser/);
  assert.match(middleware, /staffPermissions\.includes\(permission\)/);
  // Sibling of the organiser middleware rather than an edit to it.
  assert.match(
    read('src/middleware/organizer-event-access.middleware.js'),
    /\['organiser', 'admin'\]\.includes\(user\.role\)/,
    'the original organiser middleware must be unchanged'
  );
});

test('each onsite route asks for the permission its job needs', () => {
  assert.match(operationsRoutes, /check-in\/scan', protectOnsiteMutation\('check_in'\)/);
  assert.match(operationsRoutes, /bibs\/assign', protectOnsiteMutation\('check_in'\)/);
  assert.match(operationsRoutes, /race-kits\/release', protectOnsiteMutation\('race_kit'\)/);
  assert.match(operationsRoutes, /onsite-results', protectOnsiteMutation\('results'\)/);

  assert.match(pageRoutes, /'\/events\/:eventId\/check-in', protectOnsiteRead\('check_in'\)/);
  assert.match(pageRoutes, /'\/events\/:eventId\/race-kits', protectOnsiteRead\('race_kit'\)/);
  assert.match(pageRoutes, /'\/events\/:eventId\/onsite-results', protectOnsiteRead\('results'\)/);
});

test('staff cannot grant access to themselves or anyone else', () => {
  // The staff screens stay organiser/admin only — protectEvent*, never protectOnsite*.
  assert.match(pageRoutes, /'\/events\/:eventId\/staff', protectEventRead/);
  assert.match(pageRoutes, /'\/events\/:eventId\/staff', protectEventMutation/);
  assert.match(pageRoutes, /staff\/:staffId\/revoke', protectEventMutation/);
  assert.match(pageRoutes, /staff must\n\/\/ never be able to grant access/);
});

test('protection helpers keep the organiser-only variants intact', () => {
  assert.match(protection, /const protectEventRead = \[requireAuth, requireOrganizerEventAccess\]/);
  assert.match(protection, /protectOnsiteRead = \(permission\)/);
  assert.match(protection, /protectOnsiteMutation = \(permission\)/);
});

test('the staff page is CSRF-protected and confirms before removing access', () => {
  assert.match(staffView, /name="_csrf"/);
  assert.match(staffView, /data-high-risk-confirm/);
  assert.doesNotMatch(staffView, /<%-\s*member/);
});
