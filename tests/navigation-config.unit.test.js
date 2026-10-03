'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  DESTINATIONS,
  buildNavigation,
  createPathMatcher,
  summariseNotifications
} = require('../src/config/navigation');

const hrefs = (items) => items.map((item) => item.href);
const allHrefs = (navigation) => [
  ...hrefs(navigation.primary),
  ...hrefs(navigation.account),
  ...hrefs(navigation.auth),
  ...(navigation.bottom ? hrefs(navigation.bottom.items) : [])
];
const member = { isAuthenticated: true, user: { firstName: 'Test' } };

test('guests see public destinations and sign-in actions only', () => {
  const navigation = buildNavigation({ currentPath: '/', isAuthenticated: false });
  assert.equal(navigation.context, 'guest');
  assert.deepEqual(hrefs(navigation.primary), ['/', '/events', '/blog', '/leaderboard']);
  assert.deepEqual(hrefs(navigation.auth), ['/login', '/signup']);
  assert.deepEqual(navigation.account, []);
  assert.equal(navigation.bottom, null);
  assert.equal(navigation.workspaceSwitch, null);
  assert.ok(!allHrefs(navigation).some((href) => /^\/(runner|organizer|admin|my-)/.test(href)));
});

test('runners get runner destinations and never organiser or admin links', () => {
  const navigation = buildNavigation({ ...member, currentPath: '/runner/dashboard', isRunnerWorkspace: true });
  assert.equal(navigation.context, 'runner');
  assert.deepEqual(hrefs(navigation.account), ['/my-registrations', '/runner/submissions', '/runner/dashboard', '/runner/notifications']);
  assert.deepEqual(hrefs(navigation.bottom.items), [
    '/runner/dashboard', '/events', '/runner/submissions?openRunProof=1', '/runner/submissions', '/runner/profile'
  ]);
  assert.equal(navigation.workspaceSwitch, null, 'no switch without organiser access');
  assert.ok(!allHrefs(navigation).some((href) => /^\/(organizer|admin)/.test(href)));
});

test('a runner who can organise gets one switch to organiser mode, outside the bottom tabs', () => {
  const navigation = buildNavigation({ ...member, isRunnerWorkspace: true, canUseOrganizerWorkspace: true });
  assert.equal(navigation.workspaceSwitch.action, '/workspace/organizer');
  assert.ok(navigation.bottom.items.length <= 5);
});

test('organisers get organiser tabs; unapproved organisers get only the dashboard', () => {
  const approved = buildNavigation({
    ...member, isOrganizer: true, isApprovedOrganizer: true, isOrganizerWorkspace: true, canUseRunnerWorkspace: true
  });
  assert.equal(approved.context, 'organizer');
  assert.deepEqual(hrefs(approved.account), ['/my-registrations', '/organizer/dashboard', '/runner/notifications']);
  assert.deepEqual(hrefs(approved.bottom.items), [
    '/organizer/dashboard', '/organizer/events', '/organizer/dashboard#queue-breakdown-heading', '/runner/notifications', '/organizer/promote'
  ]);
  assert.equal(approved.workspaceSwitch.action, '/workspace/runner');
  assert.ok(!allHrefs(approved).some((href) => href.startsWith('/admin')));

  const pending = buildNavigation({ ...member, isOrganizer: true });
  assert.equal(pending.context, 'organizer');
  assert.deepEqual(hrefs(pending.bottom.items), ['/organizer/dashboard']);
});

test('admins see the admin area with their access tier; non-admins never do', () => {
  const support = buildNavigation({ ...member, isAdmin: true, isFullAdmin: false });
  const full = buildNavigation({ ...member, isAdmin: true, isFullAdmin: true });
  const adminLink = (navigation) => navigation.account.find((item) => item.href === '/admin/dashboard');
  assert.deepEqual(adminLink(support).data, { 'admin-tier': 'support' });
  assert.equal(adminLink(support).label, 'Admin — Support access');
  assert.deepEqual(adminLink(full).data, { 'admin-tier': 'full' });
  assert.deepEqual(hrefs(full.bottom.items), ['/admin/dashboard', '/admin/reviews', '/admin/search', '/admin/communications']);

  for (const locals of [{ isAuthenticated: false }, { ...member, isRunnerWorkspace: true }, { ...member, isOrganizer: true }]) {
    assert.ok(!allHrefs(buildNavigation(locals)).some((href) => href.startsWith('/admin')));
  }
});

test('every bottom navigation has at most five destinations', () => {
  for (const locals of [
    { ...member, isRunnerWorkspace: true, canUseOrganizerWorkspace: true },
    { ...member, isOrganizer: true, isApprovedOrganizer: true, canUseOrganizerWorkspace: true, canUseRunnerWorkspace: true },
    { ...member, isAdmin: true, isFullAdmin: true }
  ]) {
    assert.ok(buildNavigation(locals).bottom.items.length <= 5);
  }
});

test('nested routes keep their parent destination current, and exactly one primary item is current', () => {
  const isCurrent = createPathMatcher('/events/october-active-run-2026');
  assert.equal(isCurrent('/events'), true);
  assert.equal(isCurrent('/'), false);
  assert.equal(createPathMatcher('/eventsx')('/events'), false);
  assert.equal(createPathMatcher('/runner/submissions')('/runner/submissions?openRunProof=1'), true);

  for (const currentPath of ['/', '/events', '/events/a', '/blog/post', '/leaderboard']) {
    const current = buildNavigation({ currentPath }).primary.filter((item) => item.isCurrent);
    assert.equal(current.length, 1, currentPath);
  }

  const organizer = buildNavigation({ ...member, currentPath: '/runner/notifications', isOrganizer: true, isApprovedOrganizer: true });
  assert.ok(organizer.account.find((item) => item.href === '/runner/notifications').isCurrent);
  assert.ok(organizer.bottom.items.find((item) => item.href === '/runner/notifications').isCurrent);

  // Shortcuts that open a task rather than a page are never marked current.
  const runner = buildNavigation({ ...member, currentPath: '/runner/submissions', isRunnerWorkspace: true });
  assert.equal(runner.bottom.items.find((item) => item.kind === 'submit').isCurrent, false);
  assert.equal(runner.bottom.items.find((item) => item.href === '/runner/submissions').isCurrent, true);
});

test('notification summary keeps the exact count accessible and caps the visual badge', () => {
  assert.deepEqual(summariseNotifications(0), { count: 0, display: '0', label: 'Notifications' });
  assert.equal(summariseNotifications(1).label, 'Notifications, 1 unread notification');
  assert.equal(summariseNotifications(150).display, '99+');
  assert.equal(summariseNotifications(150).label, 'Notifications, 150 unread notifications');
  assert.equal(summariseNotifications('junk').count, 0);
});

test('destinations point at routes that exist', () => {
  const routeSources = ['pageRoutes.js', 'runner.routes.js', 'authRoutes.js', 'admin.routes.js']
    .map((file) => fs.readFileSync(path.join(__dirname, '..', 'src', 'routes', file), 'utf8'))
    .join('\n');
  const organizerSources = fs.readdirSync(path.join(__dirname, '..', 'src', 'routes', 'organiser'))
    .map((file) => fs.readFileSync(path.join(__dirname, '..', 'src', 'routes', 'organiser', file), 'utf8'))
    .join('\n');
  for (const destination of Object.values(DESTINATIONS)) {
    const pathname = destination.href.split(/[?#]/)[0];
    if (pathname === '/') continue;
    const local = pathname.replace(/^\/(organizer|admin|runner)(?=\/)/, '');
    const declared = new RegExp(`\\.get\\(\\s*['"](${pathname}|${local})['"]`);
    assert.ok(
      declared.test(routeSources) || declared.test(organizerSources),
      `${destination.href} has no GET route`
    );
  }
});

test('server exposes the builder to every view, and the nav degrades to the logo bar without it', () => {
  const server = fs.readFileSync(path.join(__dirname, '..', 'src', 'server.js'), 'utf8');
  assert.match(server, /app\.locals\.buildNavigation = require\('\.\/config\/navigation'\)\.buildNavigation;/);

  const ejs = require('ejs');
  const navPath = path.join(__dirname, '..', 'src', 'views', 'layouts', 'nav.ejs');
  const html = ejs.render(fs.readFileSync(navPath, 'utf8'), { isAuthenticated: false }, { filename: navPath });
  assert.match(html, /class="logo" aria-label="HelloRun Home"/);
  assert.doesNotMatch(html, /href="\/events"/);
});
