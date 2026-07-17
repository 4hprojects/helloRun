const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ejs = require('ejs');

const root = path.resolve(__dirname, '..');
const discovery = fs.readFileSync(path.join(root, 'src/views/pages/leaderboard.ejs'), 'utf8');
const standings = fs.readFileSync(path.join(root, 'src/views/pages/event-leaderboard.ejs'), 'utf8');
const css = fs.readFileSync(path.join(root, 'src/public/css/leaderboard.css'), 'utf8');

test('leaderboard templates compile and retain server-rendered forms', () => {
  ejs.compile(discovery, { filename: path.join(root, 'src/views/pages/leaderboard.ejs') });
  ejs.compile(standings, { filename: path.join(root, 'src/views/pages/event-leaderboard.ejs') });
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
  assert.match(standings, /standingView\.state === 'verified'/);
  assert.match(standings, /standingView\.state === 'guest'/);
  assert.match(standings, /No result for this distance yet/);
  assert.match(standings, /id="official-standings"/);
  assert.match(standings, /<details class="leaderboard-pending-section"/);
  assert.match(standings, /Public, but not officially ranked/);
  assert.match(standings, /<caption>/);
});

test('accumulated standings render progress metrics and isolate race time and pace columns', () => {
  assert.match(standings, /Verified challenge progress/);
  assert.match(standings, /Verified distance/);
  assert.match(standings, /Goal progress/);
  assert.match(standings, /Remaining/);
  assert.match(standings, /Activities/);
  assert.match(standings, /Latest verification/);
  assert.match(standings, /role="progressbar"/);
  assert.match(standings, /presentation\.showDistanceNavigation/);
  assert.match(standings, /presentation\.showAdvancedFilters/);
  assert.match(standings, /<% \} else \{ %>[\s\S]*<th scope="col">Time<\/th>[\s\S]*<th scope="col">Pace<\/th>/);
});

test('responsive CSS provides explicit 3-2-1 grids, touch targets, focus, and reduced motion', () => {
  assert.match(css, /grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(css, /@media \(max-width: 900px\)[\s\S]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(css, /@media \(max-width: 640px\)[\s\S]*\.leaderboard-discovery-grid \{ grid-template-columns: 1fr; \}/);
  assert.match(css, /\.leaderboard-distance-carousel-btn \{ width: 44px; height: 44px;/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
});
