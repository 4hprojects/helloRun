const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ejs = require('ejs');

const ROOT = path.resolve(__dirname, '..');
const viewPath = path.join(ROOT, 'src/views/pages/how-it-works.ejs');
const viewSource = fs.readFileSync(viewPath, 'utf8');
const cssSource = fs.readFileSync(path.join(ROOT, 'src/public/css/how-it-works.css'), 'utf8');
const routesSource = fs.readFileSync(path.join(ROOT, 'src/routes/pageRoutes.js'), 'utf8');
const { buildHowItWorksActions } = require('../src/controllers/page/home.controller');

test('how it works template compiles with a compact connected hierarchy', () => {
  assert.doesNotThrow(() => ejs.compile(viewSource, { filename: viewPath }));
  assert.equal((viewSource.match(/<h1\b/g) || []).length, 1);
  assert.match(viewSource, /How HelloRun events work/);
  assert.match(viewSource, /I’m joining an event/);
  assert.match(viewSource, /I’m organizing an event/);
  assert.match(viewSource, /href="#runner-path"/);
  assert.match(viewSource, /href="#organizer-path"/);
  assert.match(viewSource, /id="runner-path" tabindex="-1"/);
  assert.match(viewSource, /id="organizer-path" tabindex="-1"/);
});

test('event format strip covers supported participation and result models', () => {
  for (const format of ['Virtual', 'On-site', 'Hybrid', 'Single result', 'Accumulated distance']) {
    assert.match(viewSource, new RegExp(`>${format}<`));
  }
});

test('lifecycle presents five connected stages with equal runner and organizer lanes', () => {
  for (const stage of ['Publish', 'Register', 'Complete', 'Review', 'Recognize']) {
    assert.match(viewSource, new RegExp(`<strong>${stage}</strong>`));
  }
  assert.equal((viewSource.match(/class="how-stage-row"/g) || []).length, 5);
  assert.equal((viewSource.match(/class="how-lane how-runner-lane"/g) || []).length, 5);
  assert.equal((viewSource.match(/class="how-lane how-organizer-lane"/g) || []).length, 5);
  assert.match(cssSource, /\.how-stage-row\s*\{[\s\S]*grid-template-columns:\s*108px minmax\(0, 1fr\) minmax\(0, 1fr\)/);
  assert.match(cssSource, /@media \(max-width: 520px\)[\s\S]*\.how-stage-row\s*\{\s*grid-template-columns:\s*1fr/);
});

test('operational guidance distinguishes evidence, review states, and event types', () => {
  for (const item of [
    'Correct account name',
    'Inside the event window',
    'Right distance or category',
    'Activity date is visible',
    'Duration is visible',
    'Activity source is visible',
    'Proof is readable'
  ]) assert.match(viewSource, new RegExp(item));

  assert.match(viewSource, /payment approval confirms a registration payment; activity-proof approval confirms the result/);
  assert.match(viewSource, /Single-result events/);
  assert.match(viewSource, /Accumulated Distance Challenges/);
  for (const state of ['Pending', 'Approved', 'Rejected', 'Resubmission']) {
    assert.match(viewSource, new RegExp(`>${state}<`));
  }
  assert.match(cssSource, /\.how-status-grid article\s*\{[\s\S]*border:\s*1px solid var\(--how-line\)/);
  assert.doesNotMatch(cssSource, /\.how-status-(?:pending|approved|rejected|resubmit)\s*\{[^}]*border-top-color/);
  assert.doesNotMatch(cssSource, /\.how-status-grid article\s*\{[^}]*border-top-width/);
  assert.match(viewSource, /Avoid Common Proof Mistakes/);
});

test('recognition and policy guidance stays conditional and links to detailed resources', () => {
  assert.match(viewSource, /Leaderboards use approved records/);
  assert.match(viewSource, /only when configured/);
  for (const route of ['/privacy', '/data-usage-policy', '/faq', '/contact']) {
    assert.match(viewSource, new RegExp(`href="${route}"`));
  }
  assert.doesNotMatch(viewSource, /run-proof-modal-dialog/);
  assert.doesNotMatch(viewSource, /ad-slot|adsense|advertisement/i);
});

test('role-aware next actions cover guest, runner, organizer, and administrator states', () => {
  assert.deepEqual(buildHowItWorksActions({}), {
    runner: { label: 'Browse Events', href: '/events', icon: 'calendar-search' },
    organizer: { label: 'Start Organizing', href: '/signup?role=organiser', icon: 'calendar-plus' }
  });
  assert.deepEqual(buildHowItWorksActions({ isAuthenticated: true }).runner, {
    label: 'My Registrations', href: '/my-registrations', icon: 'clipboard-list'
  });
  assert.deepEqual(buildHowItWorksActions({ isAuthenticated: true, isOrganizer: true }).organizer, {
    label: 'Organizer Dashboard', href: '/organizer/dashboard', icon: 'layout-dashboard'
  });
  assert.equal(buildHowItWorksActions({ isAuthenticated: true, isOrganizer: true }).runner.label, 'My Registrations');
  assert.deepEqual(buildHowItWorksActions({ isAuthenticated: true, isAdmin: true }).organizer, {
    label: 'Admin Dashboard', href: '/admin/dashboard', icon: 'shield-check'
  });
  assert.match(routesSource, /router\.get\('\/how-it-works', pageController\.getHowItWorks\)/);
});

test('page provides 44px targets, visible focus, responsive stacking, and reduced motion', () => {
  assert.match(cssSource, /min-height:\s*44px/);
  assert.match(cssSource, /:focus-visible/);
  assert.match(cssSource, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(cssSource, /overflow:\s*clip/);
  assert.match(cssSource, /\.how-lane:target/);
});
