'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { renderNav: renderSharedNav } = require('./helpers/render-nav');
const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

function renderNav(overrides = {}) {
  return renderSharedNav({
    currentPath: '/',
    renderRunProofModal: false,
    csrfToken: 'test-csrf',
    runnerUnreadNotifications: 0,
    isAuthenticated: true,
    isAdmin: false,
    isOrganizer: false,
    isApprovedOrganizer: false,
    isFullAdmin: false,
    canUseOrganizerWorkspace: false,
    canUseRunnerWorkspace: false,
    user: { firstName: 'Mobile', avatarUrl: '' },
    ...overrides
  });
}

test('run proof is full-screen on phones and restores only non-file draft data', () => {
  const css = read('src/public/css/run-proof-modal.css');
  assert.match(css, /width: 100vw;[\s\S]*height: 100dvh/);
  assert.match(css, /\.run-proof-header-actions \.run-proof-back-btn \{[\s\S]*min-width: 2\.75rem !important;[\s\S]*min-height: 2\.75rem !important;/);
  assert.match(css, /\.run-proof-modal-desc,[\s\S]*\.run-proof-step-indicator \{\s*overflow-wrap: anywhere;/);
  const js = read('src/public/js/run-proof-modal.js');
  assert.match(js, /runProofDraftKey/);
  assert.match(js, /Select the proof image again/);
});

test('each authenticated role has a bounded mobile task navigation', () => {
  const bottomNav = (html) => (html.match(/<nav class="mobile-bottom-nav"[\s\S]*?<\/nav>/) || [''])[0];
  const runner = bottomNav(renderNav({ canUseOrganizerWorkspace: true }));
  const organizer = bottomNav(renderNav({ isOrganizer: true, isApprovedOrganizer: true, canUseOrganizerWorkspace: true, canUseRunnerWorkspace: true }));
  const admin = bottomNav(renderNav({ isAdmin: true, isFullAdmin: true }));
  assert.match(runner, /aria-label="Mobile navigation"/);
  assert.match(organizer, /aria-label="Organizer mobile navigation"/);
  assert.match(admin, /aria-label="Admin mobile navigation"/);
  for (const html of [runner, organizer, admin]) {
    const tabs = html.match(/class="mobile-nav-tab[ "]/g) || [];
    assert.ok(tabs.length > 0 && tabs.length <= 5, `expected 1-5 bottom tabs, found ${tabs.length}`);
  }
});

test('runner mobile submit works on pages that do not load the proof modal', () => {
  const navigationConfig = read('src/config/navigation.js');
  assert.match(navigationConfig, /opensModal: Boolean\(locals\.renderRunProofModal\)/);

  const server = read('src/server.js');
  assert.match(server, /pathname\.startsWith\('\/runner\/'\)/);

  const modal = read('src/public/js/run-proof-modal.js');
  assert.match(modal, /params\.get\('openRunProof'\) === '1'/);
  assert.match(modal, /openModal\(dashboardTrigger \|\| fallbackTrigger \|\| null, null\)/);

  const publicPageNav = renderNav({ currentPath: '/events' });
  assert.match(publicPageNav, /<a href="\/runner\/submissions\?openRunProof=1" class="mobile-nav-tab mobile-nav-tab-submit"/);
  assert.doesNotMatch(publicPageNav, /data-run-proof-surface="runner-mobile-nav"/);

  const runnerPageNav = renderNav({ currentPath: '/runner/dashboard', renderRunProofModal: true });
  assert.match(runnerPageNav, /<button type="button" class="mobile-nav-tab mobile-nav-tab-submit"[^>]*data-run-proof-surface="runner-mobile-nav"/);
  assert.doesNotMatch(runnerPageNav, /href="\/runner\/submissions\?openRunProof=1"/);
});

test('every role-specific mobile tab resolves to its intended task', () => {
  const runner = renderNav({ canUseOrganizerWorkspace: true });
  for (const target of [
    'href="/runner/dashboard"',
    'href="/events"',
    'href="/runner/submissions?openRunProof=1"',
    'href="/runner/submissions"',
    'href="/runner/profile"',
    'action="/workspace/organizer"'
  ]) assert.match(runner, new RegExp(target.replace(/[/?]/g, '\\$&')));

  const organizer = renderNav({
    currentPath: '/organizer/dashboard',
    isOrganizer: true,
    isApprovedOrganizer: true,
    canUseOrganizerWorkspace: true,
    canUseRunnerWorkspace: true
  });
  for (const target of [
    'href="/organizer/dashboard"',
    'href="/organizer/events"',
    'href="/organizer/dashboard#queue-breakdown-heading"',
    'href="/runner/notifications"',
    'href="/organizer/promote"',
    'action="/workspace/runner"'
  ]) assert.match(organizer, new RegExp(target.replace(/[/?]/g, '\\$&')));

  const admin = renderNav({ isAdmin: true, isFullAdmin: true });
  for (const target of [
    'href="/admin/dashboard"',
    'href="/admin/reviews"',
    'href="/admin/search"',
    'href="/admin/communications"'
  ]) assert.match(admin, new RegExp(target.replace(/[/?]/g, '\\$&')));
});

test('mobile operational work exposes cards, sticky decisions, field state, and safe drafts', () => {
  assert.match(read('src/public/js/main.js'), /initMobileOperationalTables/);
  assert.match(read('src/public/js/main.js'), /Offline · actions are paused to prevent duplicate check-ins/);
  assert.match(read('src/public/css/organizer-events.css'), /position: sticky/);
  assert.match(read('src/public/js/main.js'), /registrationDraft/);
  assert.match(read('src/public/js/main.js'), /field.type !== 'file'/);
});
