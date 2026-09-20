'use strict';

// DB-free tests for the elevation and steps shown on organizer pages. The formatter is shared by
// the run-proof queue, the registrants list and the per-runner submissions page, so they cannot
// drift; the pinned wiring checks each place actually uses it.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ejs = require('ejs');

const ROOT = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const { buildEntryExtras, formatEntryExtrasSummary, formatElevation, formatSteps } = require('../src/utils/entry-extras');

test('only the values that exist are listed, elevation first', () => {
  assert.deepEqual(buildEntryExtras({ elevationGain: 128, steps: 8500 }), [
    { key: 'elevation', label: 'Elevation', value: '128 m' },
    { key: 'steps', label: 'Steps', value: '8,500' }
  ]);
  assert.deepEqual(buildEntryExtras({ elevationGain: 128 }).map((e) => e.key), ['elevation']);
  assert.deepEqual(buildEntryExtras({ steps: 9200 }).map((e) => e.key), ['steps']);
  assert.deepEqual(buildEntryExtras({}), []);
});

test('a flat course (0 m) is a real value, but 0 or missing steps carry no information', () => {
  assert.deepEqual(buildEntryExtras({ elevationGain: 0 }), [{ key: 'elevation', label: 'Elevation', value: '0 m' }]);
  assert.deepEqual(buildEntryExtras({ elevationGain: null, steps: 0 }), []);
  assert.deepEqual(buildEntryExtras({ elevationGain: undefined, steps: null }), []);
  assert.equal(formatElevation(''), '', 'a blank elevation is missing, not 0');
});

test('numbers are rounded and grouped, and garbage is ignored rather than printed', () => {
  assert.equal(formatElevation('150.6'), '151 m');
  assert.equal(formatSteps('9200'), '9,200');
  assert.equal(formatSteps(1234567), '1,234,567');
  for (const bad of ['abc', NaN, -5, {}, [], Infinity]) {
    assert.equal(formatElevation(bad), '', `elevation ${String(bad)}`);
  }
  for (const bad of ['abc', NaN, -5, 0, {}, []]) {
    assert.equal(formatSteps(bad), '', `steps ${String(bad)}`);
  }
  assert.deepEqual(buildEntryExtras(null), []);
  assert.deepEqual(buildEntryExtras(undefined), []);
});

test('the one-line summary reads naturally and is empty when there is nothing to show', () => {
  assert.equal(formatEntryExtrasSummary(buildEntryExtras({ elevationGain: 128, steps: 8500 })), '128 m elevation · 8,500 steps');
  assert.equal(formatEntryExtrasSummary(buildEntryExtras({ elevationGain: 0 })), '0 m elevation');
  assert.equal(formatEntryExtrasSummary(buildEntryExtras({ steps: 300 })), '300 steps');
  assert.equal(formatEntryExtrasSummary(buildEntryExtras({})), '');
  assert.equal(formatEntryExtrasSummary(), '');
});

// ---- Queue cards ------------------------------------------------------------------------------

const queueView = read('src/views/organizer/run-proof-review.ejs').replace(/<%-\s*include\([^%]+%>/g, '');
const queueItem = (overrides = {}) => ({
  id: 's1', participantName: 'Jordan', participantEmail: 'j@example.test', statusClass: 'submitted', statusLabel: 'Pending Review',
  submissionTypeLabel: 'Run Result', isAutoApproved: false, suspiciousFlag: false, hasOcrMismatch: false, distanceLabel: '5.00 km',
  elapsedLabel: '00:30:00', runDateLabel: 'Sep 1', submittedAtLabel: 'Sep 1', proofTypeLabel: 'GPS', sourceLabel: 'Manual upload',
  reviewSourceLabel: 'Awaiting', proofUrl: '', isImageProof: false, confirmationCode: 'HR-1', status: 'submitted', actionHref: '#',
  ...overrides
});
const renderQueue = (item) => ejs.render(queueView, {
  title: 'Run Proof Review', user: {}, isAdminViewer: false, event: { _id: 'e1', title: 'Sample' },
  filters: { status: 'pending', sort: 'oldest', q: '', page: 1 }, message: null,
  counts: { pending: 1, all: 1, reviewed: 0, approved: 0, autoApproved: 0, rejected: 0 },
  pagination: { page: 1, totalPages: 1, totalItems: 1, pageSize: 50, prevHref: '', nextHref: '' },
  links: { pending: '#', approved: '#', autoApproved: '#', rejected: '#', all: '#', reset: '#', registrants: '#', reviewOldest: '' },
  reviewItems: [item]
}, { filename: path.join(ROOT, 'src/views/organizer/run-proof-review.ejs') });

test('queue cards list elevation and steps beside the other facts, and only when present', () => {
  const html = renderQueue(queueItem({ extras: buildEntryExtras({ elevationGain: 128, steps: 8500 }) }));
  assert.match(html, /<div class="run-proof-meta-extra">\s*<dt>Elevation<\/dt>\s*<dd>128 m<\/dd>/);
  assert.match(html, /<div class="run-proof-meta-extra">\s*<dt>Steps<\/dt>\s*<dd>8,500<\/dd>/);
  // They sit inside the same facts grid as Distance, Elapsed, Run Date and Submitted.
  const grid = html.slice(html.indexOf('<dl class="run-proof-meta-grid">'), html.indexOf('</dl>', html.indexOf('<dl class="run-proof-meta-grid">')));
  assert.match(grid, /Submitted[\s\S]*Elevation[\s\S]*Steps/);

  assert.doesNotMatch(renderQueue(queueItem({ extras: [] })), /run-proof-meta-extra/);
  assert.doesNotMatch(renderQueue(queueItem()), /run-proof-meta-extra/, 'an item with no extras at all renders none');
});

test('queue values are escaped', () => {
  const html = renderQueue(queueItem({ extras: [{ key: 'steps', label: 'Steps', value: '<img src=x onerror=alert(1)>' }] }));
  assert.doesNotMatch(html, /<img src=x/);
});

test('the queue row builder carries the measurements from the entry', () => {
  const shared = read('src/routes/organiser/_shared.js');
  assert.match(shared, /const \{ buildEntryExtras \} = require\('\.\.\/\.\.\/utils\/entry-extras'\)/);
  assert.match(shared, /elevationGain: submission\.elevationGain != null \? submission\.elevationGain : null,\s*steps: submission\.steps != null \? submission\.steps : null,\s*extras: buildEntryExtras\(submission\)/);
});

// ---- Registrants list -------------------------------------------------------------------------

test('the registrants list adds one quiet line for standard results, never for accumulated progress', () => {
  const route = read('src/routes/organiser/registrants.js');
  assert.match(route, /if \(item\.submission && !item\.accumulatedProgress\) \{\s*item\.submission\.extrasLabel = formatEntryExtrasSummary\(buildEntryExtras\(item\.submission\)\)/);

  const view = read('src/views/organizer/event-registrants.ejs');
  assert.match(view, /<% if \(registration\.submission\.extrasLabel\) \{ %><span class="organizer-roster-result-extras"><%= registration\.submission\.extrasLabel %><\/span><% \} %>/);
  // The line lives in the standard-result branch, after the distance/elapsed line.
  const cell = view.slice(view.indexOf('data-label="Result or progress"'), view.indexOf('data-label="Actions"'));
  const accumulated = cell.slice(0, cell.indexOf('<% } else { %>'));
  assert.doesNotMatch(accumulated, /extrasLabel/);
  assert.ok(cell.indexOf('elapsedLabel') < cell.indexOf('extrasLabel'));
  assert.match(read('src/public/css/organizer-registrants.css'), /\.organizer-roster-result-extras \{[^}]*font-weight: 600/);
});

// ---- Per-runner submissions page --------------------------------------------------------------

test('the per-runner page formats elevation and steps through the same helper', () => {
  const route = read('src/routes/organiser/registrant-submissions.js');
  assert.match(route, /const \{ formatElevation, formatSteps \} = require\('\.\.\/\.\.\/utils\/entry-extras'\)/);
  assert.match(route, /\['Elevation', formatElevation\(item\.elevationGain\)\],\s*\['Steps', formatSteps\(item\.steps\)\]/);
  assert.doesNotMatch(route, /toLocaleString\('en-US'\)\],\s*\['Tracking/, 'no duplicated steps formatting left behind');
});
