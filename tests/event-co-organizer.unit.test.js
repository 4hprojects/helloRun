const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const EventCoOrganizer = require('../src/models/EventCoOrganizer');
const {
  INVITE_TTL_MS,
  normalizeEmail,
  isActiveAccount,
  getCoOrganizerErrorMessage
} = require('../src/services/event-co-organizer.service');
const { buildPublicEventView } = require('../src/utils/event-public-view');
const { canUseWorkspace, getWorkspaceForPath } = require('../src/utils/workspace');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('co-organizer membership is event scoped, auditable, and unique per event user', () => {
  const paths = EventCoOrganizer.schema.paths;
  assert.equal(paths.eventId.options.ref, 'Event');
  assert.equal(paths.userId.options.ref, 'User');
  assert.deepEqual(paths.status.enumValues, ['pending', 'active', 'declined', 'cancelled', 'expired', 'revoked']);
  assert.equal(paths.tokenHash.options.select, false);
  assert.ok(paths.invitedBy);
  assert.ok(paths.acceptedAt);
  assert.ok(paths.revokedAt);
  assert.ok(EventCoOrganizer.schema.indexes().some(([keys, options]) => keys.eventId === 1 && keys.userId === 1 && options.unique));
});

test('legacy accounts without a stored status retain active eligibility', () => {
  assert.equal(isActiveAccount({}), true);
  assert.equal(isActiveAccount({ accountStatus: 'active' }), true);
  assert.equal(isActiveAccount({ accountStatus: 'restricted' }), false);
  assert.equal(isActiveAccount({ accountStatus: 'suspended' }), false);
  assert.equal(isActiveAccount({ accountStatus: 'closed' }), false);
  assert.equal(isActiveAccount(null), false);
});

test('invitations normalize addresses and expire after seven days', () => {
  assert.equal(normalizeEmail(' J.Balangen@BSU.edu.ph '), 'j.balangen@bsu.edu.ph');
  assert.equal(INVITE_TTL_MS, 7 * 24 * 60 * 60 * 1000);
  const service = read('src/services/event-co-organizer.service.js');
  assert.match(service, /findOneAndUpdate\(\{/);
  assert.match(service, /href: `\/organizer\/co-organizer-invitations\/account\/\$\{membership\._id\}`/);
  assert.doesNotMatch(service, /notification:[\s\S]{0,500}href: `\/organizer\/co-organizer-invitations\/\$\{token\}`/);
});

test('authenticated recipients can respond in app without exposing an invitation token', () => {
  const service = read('src/services/event-co-organizer.service.js');
  const routes = read('src/routes/organiser/co-organizers.js');
  const view = read('src/views/organizer/co-organizer-invitation.ejs');
  assert.match(service, /async function resolveAccountInvitation/);
  assert.match(service, /String\(user\._id\) !== String\(membership\.userId\)/);
  assert.match(service, /invitedEmail: normalizeEmail\(user\.email\)/);
  assert.match(routes, /router\.get\('\/co-organizer-invitations\/account\/:membershipId', requireAuth/);
  assert.match(routes, /router\.post\('\/co-organizer-invitations\/account\/:membershipId', requireAuth, requireCsrfProtection, limiter/);
  assert.match(view, /action="<%= formAction %>"/);
});

test('organizer navigation exposes account notifications', () => {
  const nav = read('src/views/layouts/nav.ejs');
  const auth = read('src/middleware/auth.middleware.js');
  assert.match(nav, /else if \(isOrganizerWorkspace\)[\s\S]*href="\/runner\/notifications"/);
  assert.match(auth, /\[WORKSPACES\.RUNNER, WORKSPACES\.ORGANIZER\]\.includes\(activeWorkspace\)/);
});

test('inline team summaries include only active and unexpired pending memberships', () => {
  const service = read('src/services/event-co-organizer.service.js');
  assert.match(service, /async function listEventTeamSummary/);
  assert.match(service, /\{ status: 'active' \}/);
  assert.match(service, /\{ status: 'pending', expiresAt: \{ \$gt: now \} \}/);
  assert.doesNotMatch(service.slice(service.indexOf('async function listEventTeamSummary'), service.indexOf('function getCoOrganizerErrorMessage')), /declined|cancelled|revoked/);
});

test('co-organizer mutations expose known validation errors but sanitize unexpected failures', () => {
  assert.equal(
    getCoOrganizerErrorMessage(new Error('That account is already a co-organizer.')),
    'That account is already a co-organizer.'
  );
  assert.equal(
    getCoOrganizerErrorMessage(new Error('MongoServerError: secret internal detail')),
    'Unable to update the event team. Please try again.'
  );
});

test('runner co-organizers can switch workspaces without changing permanent role', () => {
  const user = { role: 'runner', canUseOrganizerWorkspace: true };
  assert.equal(canUseWorkspace(user, 'runner'), true);
  assert.equal(canUseWorkspace(user, 'organizer'), true);
  assert.equal(getWorkspaceForPath(user, '/organizer/events/abc', 'runner'), 'organizer');
  assert.equal(user.role, 'runner');
});

test('public event presentation exposes names but never membership emails', () => {
  const details = buildPublicEventView({ title: 'CNS', slug: 'cns', organiserName: 'BSU', eventType: 'virtual' }, {
    coOrganizerNames: ['Janice Balangen']
  });
  assert.deepEqual(details.coOrganizerNames, ['Janice Balangen']);
  assert.doesNotMatch(JSON.stringify(details), /j\.balangen@bsu\.edu\.ph/i);
  assert.match(read('src/views/pages/event-details.ejs'), /Co-organized by/);
});

test('authorization keeps team management and archive controls owner-only', () => {
  const access = read('src/services/event-access.service.js');
  const statusRoute = read('src/routes/organiser/event-management.js');
  const teamRoute = read('src/routes/organiser/co-organizers.js');
  assert.match(access, /level: 'co_organizer', canManageTeam: false, canArchiveOrDelete: false/);
  assert.match(statusRoute, /nextStatus === 'archived'.*!access\?\.canArchiveOrDelete/s);
  assert.match(teamRoute, /if \(!access\.canManageTeam\)/);
});

test('admin team mutations are full-admin-only and use event-scoped service actions', () => {
  const routes = read('src/routes/admin.routes.js');
  const controller = read('src/controllers/admin/events.controller.js');
  assert.match(routes, /'\/events\/:id\/co-organizers', requireAdmin, requireFullAdmin, adminModerationLimiter/);
  assert.match(routes, /'\/events\/:id\/co-organizers\/:membershipId\/:action', requireAdmin, requireFullAdmin, adminModerationLimiter/);
  assert.match(controller, /inviteCoOrganizer\(\{[\s\S]*actorRole: 'admin'/);
  assert.match(controller, /cancelOrRevoke\(\{[\s\S]*membershipId: req\.params\.membershipId/);
  assert.match(controller, /\['cancel', 'revoke', 'resend'\]\.includes\(action\)/);
  assert.match(controller, /getCoOrganizerErrorMessage\(error\)/);
});

test('sensitive event operations use shared event-scoped access', () => {
  assert.match(read('src/services/submission.service.js'), /resolveEventAccess/);
  assert.match(read('src/services/accumulated-activity.service.js'), /resolveEventAccess/);
  assert.match(read('src/controllers/certificateTemplate.controller.js'), /resolveAccessibleEvent/);
  assert.match(read('src/middleware/shop-access.middleware.js'), /resolveEventAccess/);
  assert.match(read('src/routes/organiser/event-management.js'), /event\.organizerId, audience/);
});

test('CNS rollout is exact, dry-run by default, and preserves the runner role', () => {
  const script = read('src/scripts/invite-cns-co-organizer.js');
  assert.match(script, /cns-move-more-challenge-2026/);
  assert.match(script, /a\.baniaga@bsu\.edu\.ph/);
  assert.match(script, /process\.argv\.includes\('--apply'\)/);
  assert.match(script, /noActionNeeded/);
  assert.doesNotMatch(script, /role\s*[:=]\s*['"]organiser['"]/);
});
