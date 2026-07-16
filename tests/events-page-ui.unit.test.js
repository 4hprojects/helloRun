const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ejs = require('ejs');

const ROOT = path.resolve(__dirname, '..');
const viewSource = fs.readFileSync(path.join(ROOT, 'src/views/pages/events.ejs'), 'utf8');
const cssSource = fs.readFileSync(path.join(ROOT, 'src/public/css/events.css'), 'utf8');
const saveSource = fs.readFileSync(path.join(ROOT, 'src/public/js/event-save.js'), 'utf8');

test('events discovery template compiles and exposes complete labelled filters', () => {
  assert.doesNotThrow(() => ejs.compile(viewSource, { filename: path.join(ROOT, 'src/views/pages/events.ejs') }));
  assert.match(viewSource, /Search events, organizer, or location/);
  assert.match(viewSource, /<label for="eventsMode">Mode<\/label>/);
  assert.match(viewSource, /<label for="eventsDistance">Distance<\/label>/);
  assert.match(viewSource, /<label for="eventsStatus">Registration status<\/label>/);
  assert.match(viewSource, /name="dateFrom"/);
  assert.match(viewSource, /name="dateTo"/);
  assert.match(viewSource, /aria-describedby="eventsDateError"/);
});

test('events cards and pagination expose decision and accessibility context', () => {
  assert.match(viewSource, /event\.organizerName/);
  assert.match(viewSource, /event\.priceLabel/);
  assert.match(viewSource, /event\.eventTypeLabel/);
  assert.match(viewSource, /class="card-image-link" tabindex="-1" aria-hidden="true"/);
  assert.match(viewSource, /alt=""/);
  assert.match(viewSource, /Go to page \$\{i\}/);
  assert.match(viewSource, /pagination\.resultStart/);
  assert.match(viewSource, /#event-results/);
});

test('events mobile controls preserve touch size and visible result/filter feedback', () => {
  assert.match(cssSource, /\.filter-primary-grid[\s\S]*grid-template-columns:\s*1fr/);
  assert.match(cssSource, /\.btn-save-event\s*\{[\s\S]*width:\s*44px/);
  assert.doesNotMatch(
    cssSource,
    /\.results-meta,\s*\n\s*\.results-summary,\s*\n\s*\.active-filters\s*\{\s*display:\s*none/
  );
  assert.match(cssSource, /@media \(prefers-reduced-motion: reduce\)/);
});

test('saved-event enhancement announces success and retryable failure', () => {
  assert.match(saveSource, /aria-live/);
  assert.match(saveSource, /Event saved\./);
  assert.match(saveSource, /Could not update this saved event\. Please try again\./);
  assert.match(saveSource, /aria-busy/);
  assert.match(saveSource, /if \(!r\.ok \|\| !data\.success\)/);
});
