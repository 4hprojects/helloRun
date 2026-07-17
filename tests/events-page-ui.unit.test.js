const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ejs = require('ejs');

const ROOT = path.resolve(__dirname, '..');
const viewSource = fs.readFileSync(path.join(ROOT, 'src/views/pages/events.ejs'), 'utf8');
const cssSource = fs.readFileSync(path.join(ROOT, 'src/public/css/events.css'), 'utf8');
const mainSource = fs.readFileSync(path.join(ROOT, 'src/public/js/main.js'), 'utf8');
const saveSource = fs.readFileSync(path.join(ROOT, 'src/public/js/event-save.js'), 'utf8');

test('events discovery template compiles and keeps search and results ahead of disclosed filters', () => {
  assert.doesNotThrow(() => ejs.compile(viewSource, { filename: path.join(ROOT, 'src/views/pages/events.ejs') }));
  assert.match(viewSource, /class="events-discovery-header"/);
  assert.match(viewSource, /Search events, organizer, or location/);
  assert.match(viewSource, /<details class="events-filter-panel"/);
  assert.match(viewSource, /filterMeta\?\.hasActiveFilters \|\| filterMeta\?\.validationError \? 'open' : ''/);
  assert.ok(viewSource.indexOf('events-results-section') < viewSource.indexOf('events-card-grid'));
  assert.doesNotMatch(viewSource, /events-hero-summary/);
});

test('events filters and sorting are explicitly labelled and progressively functional', () => {
  assert.match(viewSource, /<label for="eventsMode">Mode<\/label>/);
  assert.match(viewSource, /<label for="eventsDistance">Distance<\/label>/);
  assert.match(viewSource, /<label for="eventsStatus">Registration availability<\/label>/);
  assert.match(viewSource, />Open now<\/option>/);
  assert.match(viewSource, />Opens later<\/option>/);
  assert.match(viewSource, /<label for="eventsSort">Sort by<\/label>/);
  assert.match(viewSource, /value="closing-soon"/);
  assert.match(viewSource, /value="start-date"/);
  assert.match(viewSource, /name="dateFrom"/);
  assert.match(viewSource, /name="dateTo"/);
  assert.match(viewSource, /aria-describedby="eventsDateError"/);
  assert.match(viewSource, />Apply filters<\/button>/);
  assert.match(viewSource, />Apply sort<\/button>/);
});

test('compact event cards expose the runner decision facts without list-page descriptions', () => {
  for (const label of ['Date', 'Location', 'Distance', 'Price']) {
    assert.match(viewSource, new RegExp(`<span>${label}<\\/span>`));
  }
  assert.match(viewSource, /event\.distanceFullLabel/);
  assert.match(viewSource, /class="sr-only"><%= event\.distanceFullLabel/);
  assert.match(viewSource, /event\.cardCtaLabel/);
  assert.match(viewSource, /Hosted by/);
  assert.doesNotMatch(viewSource, /event\.descriptionText/);
  assert.match(viewSource, /class="event-card-image-link" tabindex="-1" aria-hidden="true"/);
  assert.match(viewSource, /loading="lazy"/);
});

test('responsive event discovery uses three, two, and one-column grids with accessible controls', () => {
  assert.match(cssSource, /\.events-card-grid\s*\{[\s\S]*grid-template-columns:\s*repeat\(3,/);
  assert.match(cssSource, /@media \(max-width: 1024px\)[\s\S]*\.events-card-grid\s*\{[\s\S]*repeat\(2,/);
  assert.match(cssSource, /@media \(max-width: 760px\)[\s\S]*\.events-card-grid\s*\{[\s\S]*grid-template-columns:\s*1fr/);
  assert.match(cssSource, /\.btn-save-event\s*\{[\s\S]*width:\s*44px/);
  assert.match(cssSource, /min-height:\s*44px/);
  assert.match(cssSource, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(cssSource, /:focus-visible/);
});

test('expanded filters use balanced full-width rows and aligned field baselines', () => {
  assert.match(cssSource, /\.events-control-row:has\(\.events-filter-panel\[open\]\)\s*\{[\s\S]*flex-direction:\s*column/);
  assert.match(cssSource, /\.filter-group label\s*\{[\s\S]*min-height:\s*2\.25em/);
  assert.match(cssSource, /@media \(max-width: 1024px\)[\s\S]*\.events-control-row\s*\{[\s\S]*flex-direction:\s*column/);
  assert.match(cssSource, /\.events-filter-actions\s*\{[\s\S]*border-top:\s*1px solid/);
  assert.match(cssSource, /\.events-sort-control\s*\{[\s\S]*grid-template-columns:\s*auto minmax\(150px, 1fr\) auto/);
  assert.match(cssSource, /\.events-sort-control label\s*\{[\s\S]*white-space:\s*nowrap/);
});

test('operational saved-view tools are limited to admin and organizer paths', () => {
  assert.match(mainSource, /if \(!\/\^\\\/\(admin\|organizer\)/);
  assert.doesNotMatch(mainSource, /filter-bar\[action="\/events"\]/);
  assert.doesNotMatch(viewSource, /Save This View|No filters applied/);
});

test('saved-event enhancement announces success and retryable failure', () => {
  assert.match(saveSource, /aria-live/);
  assert.match(saveSource, /Event saved\./);
  assert.match(saveSource, /Could not update this saved event\. Please try again\./);
  assert.match(saveSource, /aria-busy/);
  assert.match(saveSource, /if \(!r\.ok \|\| !data\.success\)/);
});
