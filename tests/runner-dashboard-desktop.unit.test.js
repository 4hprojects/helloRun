'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ejs = require('ejs');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('dashboard puts the next action and active progress before the snapshot', () => {
  const dashboard = read('src/views/runner/dashboard.ejs');
  assert.match(dashboard, /dashboard-next-action/);
  assert.match(dashboard, /Active Event Progress/);
  assert.match(dashboard, /dashboard-summary/);
  assert.match(dashboard, /Recent Activity/);
  assert.match(read('src/views/runner/partials/dashboard-latest-achievement.ejs'), /Latest Achievement/);
  assert.ok(dashboard.indexOf('dashboard-next-action') < dashboard.indexOf('dashboard-event-progress'));
  assert.ok(dashboard.indexOf('dashboard-event-progress') < dashboard.indexOf('dashboard-summary'));
  assert.doesNotMatch(dashboard, /Sign-in method/);
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

test('dashboard exposes three primary metrics and compact secondary metrics', () => {
  const summary = read('src/views/runner/partials/dashboard-summary.ejs');
  assert.match(summary, /Active Events/);
  assert.match(summary, /Approved Distance/);
  assert.match(summary, /Pending Review/);
  assert.match(summary, /dashboard-secondary-metrics/);
});

test('active event progress uses a vertical semantic distance list', () => {
  const partial = read('src/views/runner/partials/event-progress-row.ejs');
  const css = read('src/public/css/runner-dashboard.css');
  assert.match(partial, /event-progress-detail-list/);
  assert.ok(partial.indexOf('Approved') < partial.indexOf('Remaining'));
  assert.ok(partial.indexOf('Remaining') < partial.indexOf('Awaiting review'));
  assert.ok(partial.indexOf('Awaiting review') < partial.indexOf('Target'));
  assert.match(css, /\.event-progress-detail-list dd[^}]*white-space: nowrap/);
  assert.doesNotMatch(partial, /event-progress-detail-grid/);
});

test('active event progress displays the real event logo beside title metadata', () => {
  const partial = read('src/views/runner/partials/event-progress-row.ejs');
  const css = read('src/public/css/runner-dashboard.css');
  assert.match(partial, /dashboard-event-progress-event-icon[\s\S]*item\.eventImageUrl \|\| '\/images\/helloRun-icon\.webp'[\s\S]*dashboard-event-progress-title/);
  assert.match(partial, /width="40" height="40" loading="lazy" decoding="async"/);
  assert.match(css, /\.dashboard-event-progress-event \{ display: grid; grid-template-columns: auto minmax\(0, 1fr\);/);
  assert.match(css, /\.dashboard-event-progress-event-icon \{[^}]*width: 2\.5rem;[^}]*height: 2\.5rem;[^}]*overflow: hidden;/);
  assert.match(css, /\.dashboard-event-progress-event-icon img[^}]*object-fit: contain/);
});

test('both progress bars show a centered approved percentage', () => {
  const eventPartial = read('src/views/runner/partials/event-progress-row.ejs');
  const nextActionPartial = read('src/views/runner/partials/dashboard-next-action.ejs');
  const css = read('src/public/css/runner-dashboard.css');
  assert.match(eventPartial, /dashboard-event-progress-percent/);
  assert.match(nextActionPartial, /dashboard-event-progress-percent/);
  assert.match(eventPartial, /Official approved progress for[\s\S]*% complete/);
  assert.match(nextActionPartial, /Official approved progress for[\s\S]*% complete/);
  assert.match(css, /\.dashboard-event-progress-percent[^}]*text-shadow:/);
  assert.doesNotMatch(css, /\.dashboard-event-progress-percent[^}]*background:/);
});

test('progress percentage display clamps and rounds boundary values', () => {
  const template = read('src/views/runner/partials/event-progress-row.ejs');
  for (const [input, expected] of [[-5, 0], [0, 0], [58.6, 59], [100, 100], [140, 100]]) {
    const html = ejs.render(template, {
      item: {
        eventTitle: 'Test Event',
        eventImageUrl: '/images/test.webp',
        eventType: 'Accumulated challenge',
        state: 'in_progress',
        stateTone: 'warning',
        stateLabel: 'Challenge in Progress',
        deadlineTone: 'normal',
        deadlineLabel: '5 days left',
        progress: { percent: input },
        payment: {},
        eventStartAtLabel: 'TBA',
        eventEndAtLabel: 'TBA',
        submissionDeadlineLabel: 'TBA'
      }
    });
    assert.match(html, new RegExp(`aria-valuenow="${expected}"`));
    assert.match(html, new RegExp(`>${expected}%<`));
  }
});

test('active event actions stay inside each event card', () => {
  const css = read('src/public/css/runner-dashboard.css');
  assert.match(css, /\.runner-event-progress-card \.dashboard-event-progress-row \{ flex-direction: column; align-items: stretch; \}/);
  assert.match(css, /\.runner-event-progress-card \.dashboard-event-progress-side \{ width: 100%; min-width: 0; flex-flow: row wrap;/);
  assert.match(css, /@media \(max-width: 420px\)[\s\S]*\.dashboard-event-progress-side \{ align-items: center; flex-direction: row; \}/);
});

test('active event Add Activity uses an accessible icon in the dates row', () => {
  const partial = read('src/views/runner/partials/event-progress-row.ejs');
  const css = read('src/public/css/runner-dashboard.css');

  assert.match(partial, /event-card-dates[\s\S]*Submit by[\s\S]*event-card-add-activity/);
  assert.match(partial, /event-card-add-activity[\s\S]*aria-label="<%= item\.nextAction\.label %> for <%= item\.eventTitle %>"[\s\S]*data-lucide="plus"/);
  assert.match(css, /\.event-card-add-activity \{[^}]*display: inline-grid;[^}]*width: 2\.75rem;[^}]*height: 2\.75rem;[^}]*border-radius: 50%;/);
  assert.match(css, /\.event-card-dates \{[^}]*display: grid;[^}]*grid-template-columns: minmax\(0, 1fr\) auto;[^}]*align-items: center;/);
  assert.match(css, /\.event-card-dates > span \{ grid-column: 1; \}/);
  assert.match(css, /\.event-card-dates \.event-card-add-activity \{[^}]*grid-column: 2;[^}]*grid-row: 1 \/ span 3;/);
});

test('next action progress guidance uses a compact semantic list', () => {
  const partial = read('src/views/runner/partials/dashboard-next-action.ejs');
  const css = read('src/public/css/runner-dashboard.css');
  assert.match(partial, /next-action-progress-list/);
  assert.match(partial, /<dt>Awaiting review<\/dt>/);
  assert.match(partial, /<dt>Remaining<\/dt>/);
  assert.match(partial, /<dt>Suggested per day<\/dt>/);
  assert.doesNotMatch(partial, /next-action-progress-stats/);
  assert.match(css, /\.next-action-progress-list dd[^}]*white-space: nowrap/);
});

test('next action status and days remaining share one row', () => {
  const partial = read('src/views/runner/partials/dashboard-next-action.ejs');
  const css = read('src/public/css/runner-dashboard.css');
  assert.match(partial, /runner-next-action-status-row[^>]*><span class="badge[\s\S]*deadline-chip/);
  assert.match(css, /\.runner-next-action-status-row \{ display: flex; flex-wrap: wrap; align-items: center;/);
});

test('next action event icon sits beside the event title and distance', () => {
  const partial = read('src/views/runner/partials/dashboard-next-action.ejs');
  const css = read('src/public/css/runner-dashboard.css');
  assert.match(partial, /runner-next-action-event-icon[\s\S]*item\.eventImageUrl \|\| '\/images\/helloRun-icon\.webp'[\s\S]*<h3 class="dashboard-event-progress-title">/);
  assert.match(partial, /width="44" height="44" decoding="async"/);
  assert.doesNotMatch(partial, /runner-next-action-event-icon[\s\S]{0,250}loading="lazy"/);
  assert.match(partial, /<p class="item-meta"><%= item\.raceDistance/);
  assert.match(css, /\.runner-next-action-event \{ display: grid; grid-template-columns: auto minmax\(0, 1fr\);/);
  assert.match(css, /\.runner-next-action-event-icon \{[^}]*width: 2\.75rem;[^}]*height: 2\.75rem;[^}]*overflow: hidden;/);
});

test('runner mobile navigation provides the five task-oriented destinations', () => {
  const nav = read('src/views/layouts/nav.ejs');
  assert.match(nav, />Home</);
  assert.match(nav, />Events</);
  assert.match(nav, /data-run-proof-surface="runner-mobile-nav"/);
  assert.match(nav, />Progress</);
  assert.match(nav, />Profile</);
});

test('latest achievement actions become accessible icon buttons on mobile', () => {
  const partial = read('src/views/runner/partials/dashboard-latest-achievement.ejs');
  const css = read('src/public/css/runner-dashboard.css');

  assert.match(partial, /data-lucide="<%= latestAchievement\.type === 'certificate' \? 'file-down' : 'eye' %>"/);
  for (const icon of ['shield-check', 'copy', 'share-2']) assert.match(partial, new RegExp(`data-lucide="${icon}"`));
  assert.match(partial, /latest-achievement-action[\s\S]*aria-label=/);
  assert.match(css, /\.latest-achievement-action \{ width: 2\.75rem; height: 2\.75rem;[^}]*border-radius: 50%; \}/);
  assert.match(css, /\.latest-achievement-action span \{[^}]*position: absolute;[^}]*clip: rect/);
  assert.match(css, /\.latest-achievement-action\[data-action-label\]::after \{[^}]*content: attr\(data-action-label\);/);
});
