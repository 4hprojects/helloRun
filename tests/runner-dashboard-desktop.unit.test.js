'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('dashboard separates canonical work, overview, results, and history zones', () => {
  const dashboard = read('src/views/runner/dashboard.ejs');
  assert.match(dashboard, /Active event journey/);
  assert.match(dashboard, /runner-dashboard-overview-grid/);
  assert.match(dashboard, /runner-dashboard-results/);
  assert.match(dashboard, /runner-dashboard-history-grid/);
  assert.ok(dashboard.indexOf('dashboard-event-progress') < dashboard.indexOf('runner-dashboard-overview-grid'));
});

test('recent result activity uses compact rows instead of canonical lifecycle cards', () => {
  const partial = read('src/views/runner/partials/result-submissions-card.ejs');
  assert.match(partial, /runner-compact-activity-list/);
  assert.doesNotMatch(partial, /include\('event-progress-row'/);
  assert.match(partial, /result-status-tabs/);
  assert.match(partial, /data-open-run-proof-modal/);
});

test('missed submissions are collapsed, counted, and keyboard-native', () => {
  const partial = read('src/views/runner/partials/dashboard-missed-submissions.ejs');
  assert.match(partial, /<details/);
  assert.match(partial, /<summary>/);
  assert.match(partial, /runner-missed-count/);
  assert.doesNotMatch(partial, /<details[^>]*open/);
});

test('desktop breakpoints prevent nested narrow event cards', () => {
  const css = read('src/public/css/runner-dashboard.css');
  assert.match(css, /@media \(min-width: 900px\)[\s\S]*repeat\(2, minmax\(320px, 1fr\)\)/);
  assert.match(css, /@media \(min-width: 1200px\)[\s\S]*repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(css, /white-space: nowrap/);
});

