'use strict';

// Source-level guards for the per-runner submissions routes. The handlers need a database
// to run, so these pin the security-relevant wiring: middleware order, access checks and
// the ownership check that stops one runner's entry being edited through another's URL.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const route = read('src/routes/organiser/registrant-submissions.js');

test('the router is mounted with the other organizer routers', () => {
  const barrel = read('src/routes/organizer.routes.js');
  assert.match(barrel, /require\('\.\/organiser\/registrant-submissions'\)/);
  assert.match(barrel, /router\.use\('\/', registrantSubmissionsRoutes\)/);
});

test('the page is authenticated and the edit is CSRF-protected and rate-limited', () => {
  assert.match(route, /router\.get\('\/events\/:id\/registrants\/:registrationId\/submissions', requireAuth,/);
  assert.match(
    route,
    /'\/events\/:id\/registrants\/:registrationId\/submissions\/:submissionId\/edit',\s*requireAuth,\s*requireCsrfProtection,\s*submissionReviewActionLimiter,/
  );
});

test('page and edit share one access guard: role check, event access, registration scoped to the event', () => {
  assert.match(route, /canAccessRegistrantReview\(user\)/);
  assert.match(route, /getRegistrantAccessibleEventOrNull\(req\.params\.id, user\)/);
  assert.match(route, /Registration\.findOne\(\{ _id: req\.params\.registrationId, eventId: event\._id \}\)/);
  assert.equal((route.match(/await resolveAccess\(/g) || []).length, 2);
});

test('an entry can only be edited through the registration it belongs to', () => {
  assert.match(route, /const entryQuery = \{ _id: req\.params\.submissionId, eventId: event\._id, registrationId: registration\._id \}/);
  assert.match(route, /Submission\.exists\(entryQuery\)[\s\S]*AccumulatedActivitySubmission\.exists\(entryQuery\)/);
  assert.match(route, /Submission record not found for this runner/);
});

test('the page reads both submission collections and never trusts a client-supplied actor', () => {
  assert.match(route, /Submission\.find\(query\)[\s\S]*AccumulatedActivitySubmission\.find\(query\)/);
  assert.match(route, /actorUserId: user\._id,\s*actorRole: user\.role/);
  assert.doesNotMatch(route, /actorUserId: req\.body/);
});

test('elapsed time is assembled from whole hours, minutes and seconds', () => {
  assert.match(route, /Minutes and seconds must be between 0 and 59/);
  assert.match(route, /Number\.isInteger\(part\)/);
});

test('validation failures redirect back to the page instead of losing the organizer\'s place', () => {
  assert.match(route, /type: 'error',\s*text: error\.message/);
});
