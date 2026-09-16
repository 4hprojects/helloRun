'use strict';

// Source-level guards for the two post-registration edit routes. These fields decide
// whether a runner appears in public, so the authorization, CSRF, rate limiting, audit
// and cache-invalidation wiring is asserted rather than assumed.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('the organiser edit route is authorized, CSRF-protected and rate limited', () => {
  const registrants = read('src/routes/organiser/registrants.js');

  assert.match(
    registrants,
    /'\/events\/:id\/registrants\/:registrationId\/details',\s*\n\s*requireAuth,\s*\n\s*requireCsrfProtection,\s*\n\s*registrantDetailsLimiter/
  );
  // Same pair the rest of the registrants routes use; co-organisers pass via resolveEventAccess.
  assert.match(registrants, /canAccessRegistrantReview\(user\)/);
  assert.match(registrants, /getRegistrantAccessibleEventOrNull\(req\.params\.id, user\)/);
  // The registration must belong to the event being administered.
  assert.match(registrants, /Registration\.findOne\(\{\s*\n\s*_id: req\.params\.registrationId,\s*\n\s*eventId: event\._id\s*\n\s*\}\)/);

  const shared = read('src/routes/organiser/_shared.js');
  assert.match(shared, /const registrantDetailsLimiter = createRateLimiter\(/);
  assert.match(shared, /\n  registrantDetailsLimiter,/);
});

test('the organiser edit route demands a reason and records field names, not values', () => {
  const registrants = read('src/routes/organiser/registrants.js');

  assert.match(registrants, /const reason = normalizeReason\(req\.body\?\.reason\);/);
  assert.match(registrants, /if \(!reason\)/);
  assert.match(registrants, /registration\.leaderboard_preference_changed/);
  assert.match(registrants, /registration\.participant_details_updated/);
  // Notes carry the changed field names and the reason — never the new values.
  assert.match(registrants, /notes: `Updated \$\{outcome\.changedFields\.join\(', '\)\}\. Reason: \$\{reason\}`/);
  assert.match(registrants, /ipAddress: getRequestIpAddress\(req\)/);
});

test('an unchanged submission writes nothing at all', () => {
  const registrants = read('src/routes/organiser/registrants.js');
  const controller = read('src/controllers/page/registration.controller.js');
  // No save, no audit entry, no notification, no cache flush for a no-op resubmit.
  for (const source of [registrants, controller]) {
    assert.match(source, /if \(!outcome\.changedFields\.length\)/);
  }
});

test('both routes save through the document so the Postgres shadow stays in step', () => {
  // An atomic updateOne would skip the post-save hook that mirrors participant fields.
  const registrants = read('src/routes/organiser/registrants.js');
  const controller = read('src/controllers/page/registration.controller.js');

  assert.match(registrants, /await registration\.save\(\);/);
  assert.match(controller, /await registration\.save\(\);/);
  assert.doesNotMatch(registrants, /Registration\.updateOne/);
});

test('a leaderboard change flushes the cached board', () => {
  // The cache holds rendered names with hidden runners already filtered out, so without
  // this the change is invisible until the TTL lapses.
  const registrants = read('src/routes/organiser/registrants.js');
  const controller = read('src/controllers/page/registration.controller.js');

  assert.match(registrants, /if \(outcome\.leaderboardChanged && event\.slug\)/);
  assert.match(registrants, /invalidateLeaderboardCache\(event\.slug\)/);
  assert.match(controller, /if \(outcome\.leaderboardChanged && eventSlug\)/);
  assert.match(controller, /invalidateLeaderboardCache\(eventSlug\)/);
});

test('the runner route is scoped to the signed-in runner and cannot rename anyone', () => {
  const routes = read('src/routes/pageRoutes.js');
  const controller = read('src/controllers/page/registration.controller.js');

  assert.match(
    routes,
    /router\.post\('\/my-registrations\/:registrationId\/details', requireAuth, requireRunnerWorkspace, requireCsrfProtection, registrationDetailsLimiter/
  );
  // The userId filter is the whole authorization.
  assert.match(controller, /Registration\.findOne\(\{\s*\n\s*_id: registrationId,\s*\n\s*userId: req\.session\.userId\s*\n\s*\}\)/);
  assert.match(controller, /normalizeRegistrationDetailsInput\(req\.body, \{ allowName: false \}\)/);

  // A runner acting on their own record needs no audit entry or self-notification.
  // Scoped to this handler: the controller imports the audit helper for other routes.
  const start = controller.indexOf('exports.postRegistrationDetails');
  const handler = controller.slice(start, controller.indexOf('exports.', start + 1));
  assert.ok(start > -1, 'postRegistrationDetails handler not found');
  assert.doesNotMatch(handler, /recordCriticalAuditEventInBackground/);
  assert.doesNotMatch(handler, /notifyWithRetry/);
  assert.doesNotMatch(handler, /allowName: true/);
});

test('the organiser path notifies the runner through a registered communication key', () => {
  const registrants = read('src/routes/organiser/registrants.js');
  const registry = read('src/services/communication-events.registry.js');
  const communication = read('src/services/communication.service.js');

  assert.match(registrants, /notifyWithRetryInBackground\('registration\.updated_by_organiser'/);
  // notify() throws for an unregistered key, so all three wiring points must exist.
  assert.match(registry, /eventKey: 'registration\.updated_by_organiser'/);
  assert.match(communication, /if \(eventKey === 'registration\.updated_by_organiser'\)/);
  assert.match(communication, /'registration\.updated_by_organiser': `Registration Updated/);
  assert.match(read('src/services/email.service.js'), /exports\.sendRegistrationUpdatedByOrganizerEmail = async/);
});

test('the new audit actions are discoverable in the organiser audit filters', () => {
  const audit = read('src/services/critical-audit-query.service.js');

  assert.match(audit, /registrations: \[/);
  assert.match(audit, /'registration\.leaderboard_preference_changed'/);
  assert.match(audit, /'registration\.participant_details_updated'/);
  // registration.cancelled predated the group and had no home until now.
  assert.match(audit, /'registration\.cancelled'/);
  assert.match(audit, /\{ value: 'registrations', label: 'Registration changes' \}/);
});

test('both edit forms are rendered and post to their own route', () => {
  const organiserView = read('src/views/organizer/event-registrants.ejs');
  const runnerView = read('src/views/partials/my-registration-card.ejs');

  assert.match(organiserView, /action="<%= basePath %>\/<%= registration\._id %>\/details"/);
  assert.match(organiserView, /name="reason" maxlength="500" required/);
  assert.match(organiserView, /<dt>Leaderboard<\/dt>/);
  // The organiser form must warn that an account holder's own profile name wins.
  assert.match(organiserView, /their leaderboard name and certificate follow their account profile/);

  assert.match(runnerView, /action="\/my-registrations\/<%= item\.registrationId %>\/details"/);
  assert.match(runnerView, /name="leaderboardDisplayPreference"/);
  // Name and emergency contact are profile-owned; the runner form must not offer either.
  assert.doesNotMatch(runnerView, /name="firstName"/);
  assert.doesNotMatch(runnerView, /name="lastName"/);
  assert.doesNotMatch(runnerView, /name="emergencyContactName"/);
  assert.doesNotMatch(runnerView, /name="emergencyContactNumber"/);
  // The organiser keeps emergency contact, which they need on race day.
  assert.match(organiserView, /name="emergencyContactNumber"/);
});

test('neither form is offered on a cancelled registration', () => {
  const organiserView = read('src/views/organizer/event-registrants.ejs');
  const runnerView = read('src/views/partials/my-registration-card.ejs');
  const controller = read('src/controllers/page/registration.controller.js');

  assert.match(organiserView, /registration\.status !== 'cancelled'/);
  assert.match(runnerView, /registration\.status !== 'cancelled'/);
  // Enforced server-side too, not just hidden in the view.
  assert.match(controller, /This registration was cancelled and can no longer be edited/);
});
