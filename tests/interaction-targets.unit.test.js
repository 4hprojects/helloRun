'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('every admin page title is the page h1 and keeps its h2 styling', () => {
  const dir = path.join(root, 'src/views/admin');
  for (const file of fs.readdirSync(dir).filter((name) => name.endsWith('.ejs'))) {
    const source = fs.readFileSync(path.join(dir, file), 'utf8');
    const headerAt = source.indexOf('admin-header-row');
    if (headerAt < 0) continue;
    const firstHeading = source.slice(headerAt).match(/<h([12])\b/);
    assert.ok(firstHeading, `${file} has no title heading`);
    assert.equal(firstHeading[1], '1', `${file}: the admin title should be an <h1>`);
  }

  const css = read('src/public/css/admin.css');
  assert.match(css, /\.admin-header-row h1 \{\s*font-size: clamp\(2rem, 4vw, 2\.5rem\);\s*font-weight: 700;/);
  assert.match(css, /@media \(max-width: 480px\) \{\s*\.admin-header-row h1 \{\s*font-size: 1\.75rem;/);
});

test('small standalone links and controls get at least a 24px target (WCAG 2.5.8)', () => {
  const targets = [
    ['src/public/css/style.css', /\.organizer-workspace-breadcrumbs a \{[^}]*min-height: 24px/],
    ['src/public/css/organizer-dashboard.css', /\.organizer-text-link, \.organizer-card-heading a, \.organizer-events-heading a \{[^}]*min-height: 24px/],
    ['src/public/css/organizer-dashboard.css', /\.organizer-utilities-grid a \{[^}]*min-height: 24px/],
    ['src/public/css/organizer-dashboard.css', /\.organizer-ranked-card li a \{[^}]*min-height: 24px/],
    ['src/public/css/organizer-event-list.css', /\.organizer-event-list-title-row h2 a \{[^}]*min-height: 24px/],
    ['src/public/css/admin.css', /\.metric-link \{[^}]*min-height: 24px/],
    ['src/public/css/admin.css', /\.dash-section-link \{[^}]*min-height: 24px/],
    ['src/public/css/admin.css', /\.admin-sort-header \{[^}]*min-height: 24px/],
    ['src/public/css/admin.css', /\.communication-digest-head a \{[^}]*min-height: 24px/],
    ['src/public/css/event-details.css', /\.event-related-browse \{[^}]*min-height: 24px/]
  ];
  for (const [file, pattern] of targets) assert.match(read(file), pattern, `${file} lost ${pattern}`);
});

test('tiny label links stretch their hit area over the surrounding card or tile', () => {
  const list = read('src/public/css/organizer-event-list.css');
  assert.match(list, /\.organizer-event-list-workload > div:has\(> dt > a\) \{ position: relative; \}/);
  assert.match(list, /\.organizer-event-list-workload dt a::after \{ content: ""; position: absolute; inset: 0;/);
  assert.match(list, /div:has\(> dt > a:focus-visible\) \{ outline: 2px solid #111827;/);

  const details = read('src/public/css/event-details.css');
  assert.match(details, /\.event-related-card \{\s*position: relative;/);
  assert.match(details, /\.event-related-title a::after \{\s*content: "";\s*position: absolute;\s*inset: 0;/);
  assert.match(details, /\.event-related-card:has\(\.event-related-title a:focus-visible\) \{\s*outline: 2px solid #111827;/);
  // The duplicate image link stays out of the tab order and accessibility tree.
  assert.match(read('src/views/pages/event-details.ejs'), /class="event-related-img-link" tabindex="-1" aria-hidden="true"/);
});
