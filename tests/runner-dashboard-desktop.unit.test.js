'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('dashboard renders one canonical journey before compact supporting content', () => {
  const dashboard = read('src/views/runner/dashboard.ejs');
  const journey = read('src/views/runner/partials/dashboard-active-journey.ejs');

  assert.match(dashboard, /dashboard-hero/);
  assert.match(dashboard, /dashboard-header/);
  assert.match(dashboard, /btn-outline-light/);
  assert.match(dashboard, /data-run-proof-surface="runner-dashboard-header"/);
  assert.match(dashboard, /heroJourney\?\.nextAction/);
  assert.match(dashboard, /heroAction\?\.label \|\| 'Browse Events'/);
  assert.match(journey, /Active event journey/);
  assert.match(journey, /runnerDashboardPresentation\.primaryJourney/);
  assert.match(journey, /runnerDashboardPresentation\.secondaryJourneys/);
  assert.ok(dashboard.indexOf("dashboard-active-journey") < dashboard.indexOf("dashboard-summary"));
  assert.ok(dashboard.indexOf("dashboard-summary") < dashboard.indexOf('dashboard-support-grid'));
  assert.doesNotMatch(dashboard, /dashboard-next-action|dashboard-upcoming|dashboard-discover|dashboard-saved-events|dashboard-missed-submissions/);
  assert.doesNotMatch(dashboard, /Sign-in method/);
});

test('canonical journey owns event state, progress, deadline, and one contextual action', () => {
  const partial = read('src/views/runner/partials/dashboard-active-journey.ejs');
  assert.match(partial, /journey\.stateLabel/);
  assert.match(partial, /journey\.helperText/);
  assert.match(partial, /role="progressbar"/);
  assert.match(partial, /aria-valuenow/);
  assert.match(partial, /Remaining/);
  assert.match(partial, /Awaiting review/);
  assert.match(partial, /Submit by/);
  assert.match(partial, /data-open-run-proof-modal/);
  assert.match(partial, /journey\.nextAction\.type === 'download_certificate'/);
});

test('canonical journey uses compact desktop and stacked mobile layouts', () => {
  const css = read('src/public/css/runner-dashboard.css');
  assert.match(css, /\.runner-canonical-journey\s*\{[\s\S]*?grid-template-columns: minmax\(0, 1fr\) minmax\(245px, \.36fr\)/);
  assert.match(css, /\.dashboard-support-grid\s*\{[\s\S]*?grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(css, /\.dashboard-tools \.dashboard-secondary-links\s*\{[\s\S]*?repeat\(5, minmax\(0, 1fr\)\)/);
  assert.match(css, /@media \(max-width: 768px\)[\s\S]*?\.dashboard-support-grid,[\s\S]*?\.kpi-grid-primary \{ grid-template-columns: 1fr; \}/);
  assert.match(css, /\.runner-canonical-action\s*\{[\s\S]*?border-left: 1px solid var\(--border\)/);
});

test('dashboard exposes three primary snapshot metrics and subdued linked metrics', () => {
  const summary = read('src/views/runner/partials/dashboard-summary.ejs');
  assert.match(summary, /Active Events/);
  assert.match(summary, /Approved Distance/);
  assert.match(summary, /Pending Review/);
  assert.match(summary, /Completed Events/);
  assert.match(summary, /Certificates/);
  assert.match(summary, /Achievement Points/);
  assert.match(summary, /kpi-grid-primary/);
});

test('recent activity and latest achievement share one support row', () => {
  const dashboard = read('src/views/runner/dashboard.ejs');
  const recent = read('src/views/runner/partials/dashboard-recent-activity.ejs');
  const achievement = read('src/views/runner/partials/dashboard-latest-achievement.ejs');
  assert.match(dashboard, /dashboard-support-grid/);
  assert.match(recent, /Recent Activity/);
  assert.match(achievement, /Latest Achievement/);
  assert.match(achievement, /data-certificate-share-menu/);
  assert.match(achievement, /data-copy-cert-url/);
});

test('runner tools replace expanded dashboard discovery and archives', () => {
  const dashboard = read('src/views/runner/dashboard.ejs');
  for (const label of ['Submission History', 'Achievements', 'Running Groups', 'Saved &amp; New Events', 'Registration History']) {
    assert.match(dashboard, new RegExp(label));
  }
  assert.match(dashboard, /runnerDashboardPresentation\.toolCounts/);
});

test('runner mobile navigation keeps the five task-oriented destinations', () => {
  const nav = read('src/views/layouts/nav.ejs');
  assert.match(nav, />Home</);
  assert.match(nav, />Events</);
  assert.match(nav, /data-run-proof-surface="runner-mobile-nav"/);
  assert.match(nav, />Progress</);
  assert.match(nav, />Profile</);
});

test('dashboard has visible focus, reduced motion, and 44px compact controls', () => {
  const css = read('src/public/css/runner-dashboard.css');
  assert.match(css, /focus-visible/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /width: 2\.75rem; height: 2\.75rem/);
  assert.match(css, /overflow: hidden/);
});

test('dashboard refresh protects focused and expanded canonical interactions', () => {
  const script = read('src/public/js/runner-dashboard.js');
  assert.match(script, /currentRoot\.contains\(document\.activeElement\)/);
  assert.match(script, /details\[open\], \[data-certificate-share-menu\]:not\(\[hidden\]\)/);
  assert.match(script, /if \(focusedInside \|\| interactionOpen\) return/);
});
