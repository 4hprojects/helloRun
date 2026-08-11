const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ejs = require('ejs');

const root = path.resolve(__dirname, '..');
const discovery = fs.readFileSync(path.join(root, 'src/views/pages/leaderboard.ejs'), 'utf8');
const standings = fs.readFileSync(path.join(root, 'src/views/pages/event-leaderboard.ejs'), 'utf8');
const standingPartial = fs.readFileSync(path.join(root, 'src/views/pages/_event-leaderboard-standing.ejs'), 'utf8');
const standingsTemplates = `${standings}\n${standingPartial}`;
const css = fs.readFileSync(path.join(root, 'src/public/css/leaderboard.css'), 'utf8');

test('leaderboard templates compile and retain server-rendered forms', () => {
  ejs.compile(discovery, { filename: path.join(root, 'src/views/pages/leaderboard.ejs') });
  ejs.compile(standings, { filename: path.join(root, 'src/views/pages/event-leaderboard.ejs') });
  ejs.compile(standingPartial, { filename: path.join(root, 'src/views/pages/_event-leaderboard-standing.ejs') });
  assert.match(discovery, /method="GET" action="\/leaderboard"/);
  assert.match(standings, /method="GET" action="\/events\/<%= event\.slug %>\/leaderboard"/);
});

test('discovery uses compact search, aligned sorting, disclosed filters, chips, and pagination', () => {
  assert.match(discovery, /leaderboard-compact-header/);
  assert.match(discovery, /<label for="leaderboard-sort">Sort by<\/label>/);
  assert.match(discovery, /<details class="leaderboard-filter-panel"/);
  assert.match(discovery, /leaderboard-filter-chip/);
  assert.match(discovery, /leaderboard\.pagination/);
  assert.doesNotMatch(discovery, /after_results_meta/);
});

test('standings prioritize personal state and separate pending results from official ranks', () => {
  assert.match(standingPartial, /standingView\.state === 'verified'/);
  assert.match(standingPartial, /standingView\.state === 'guest'/);
  assert.match(standingPartial, /standing\.categoryLabel \|\| activeDistance\.label/);
  assert.match(standingPartial, /No result for this category yet/);
  assert.match(standings, /id="official-standings"/);
  assert.match(standings, /<details class="leaderboard-pending-section"/);
  assert.match(standings, /Public, but not officially ranked/);
  assert.match(standings, /<caption>/);
});

test('accumulated standings render progress metrics and isolate race time and pace columns', () => {
  assert.match(standingsTemplates, /Goal: \$\{selectedGoalLabel\}/);
  assert.match(standingsTemplates, /Verified distance/);
  assert.match(standingsTemplates, /Most Elevation/);
  assert.match(standingsTemplates, /isAlternateRanking \? 'Viewing ranking' : 'Official ranking'/);
  assert.match(standingsTemplates, /primaryMetric === 'elevation' && hasDistanceMetric/);
  assert.match(standingsTemplates, /primaryMetric === 'elevation' && hasStepsMetric/);
  assert.match(standingsTemplates, /Goal progress/);
  assert.match(standingsTemplates, /Remaining/);
  assert.match(standingsTemplates, /Activities/);
  assert.match(standingsTemplates, /Latest verification/);
  assert.match(standingsTemplates, /role="progressbar"/);
  assert.match(standingsTemplates, /presentation\.showCategoryCards/);
  assert.match(standingsTemplates, /overviewStats\.verifiedEntries/);
  assert.match(standingsTemplates, /selectedGoalLabel/);
  assert.match(standingsTemplates, /entry\.categoryLabel \|\| entry\.category/);
  assert.match(standingsTemplates, /presentation\.showAdvancedFilters/);
  assert.match(standingsTemplates, /<% \} else \{ %>[\s\S]*<th scope="col">Time<\/th>[\s\S]*<th scope="col">Pace<\/th>/);
});

test('multi-category content orders metric and category navigation before My Standing and details', () => {
  const metricIndex = standings.indexOf('aria-label="Leaderboard metric"');
  const categoryIndex = standings.indexOf('leaderboard-category-overview');
  const standingIndex = standings.lastIndexOf("include('_event-leaderboard-standing')");
  const detailsIndex = standings.indexOf('leaderboard-result-controls');
  assert.ok(metricIndex > -1);
  assert.ok(metricIndex < categoryIndex);
  assert.ok(categoryIndex < standingIndex);
  assert.ok(standingIndex < detailsIndex);
});

test('responsive CSS provides explicit 3-2-1 grids, touch targets, focus, and reduced motion', () => {
  assert.match(standings, /leaderboard-category-grid/);
  assert.match(standings, /No verified runners yet/);
  assert.match(standings, /aria-current="page"/);
  assert.match(css, /grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(css, /\.leaderboard-category-grid \{ display: grid; grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(css, /@media \(max-width: 900px\)[\s\S]*\.leaderboard-category-grid \{ grid-template-columns: repeat\(2, minmax\(0, 1fr\)\); \}/);
  assert.match(css, /@media \(max-width: 640px\)[\s\S]*\.leaderboard-category-grid \{ grid-template-columns: 1fr; \}/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
});
