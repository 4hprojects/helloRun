'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ejs = require('ejs');
const {
  getRegistrantFilterContext,
  buildRegistrantListPath,
  buildRegistrantExportQuery,
  getRegistrantSortSpec
} = require('../src/routes/organiser/_shared');

const ROOT = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const view = read('src/views/organizer/event-registrants.ejs');
const css = read('src/public/css/organizer-registrants.css');
const script = read('src/public/js/organizer-registrants.js');

test('registrant filters normalize roster sorting, statuses, paging, and field mode', () => {
  const event = { _id: 'event-1', raceDistances: ['25K', '50K'] };
  const filters = getRegistrantFilterContext(event, {
    registrationStatus: 'confirmed', sort: 'name_asc', pageSize: '50', page: '2', fieldMode: '1', distance: '50K'
  });
  assert.equal(filters.selectedRegistrationStatus, 'confirmed');
  assert.equal(filters.selectedSort, 'name_asc');
  assert.equal(filters.pageSize, 50);
  assert.equal(filters.requestedPage, 2);
  assert.equal(filters.fieldMode, true);
  assert.deepEqual(getRegistrantSortSpec('name_asc'), { 'participant.lastName': 1, 'participant.firstName': 1, _id: 1 });
  assert.match(buildRegistrantListPath('event-1', filters), /registrationStatus=confirmed/);
  assert.match(buildRegistrantListPath('event-1', filters), /fieldMode=1/);
  assert.match(buildRegistrantExportQuery(filters), /registrationStatus=confirmed/);
});

test('invalid roster query values fail back to safe defaults', () => {
  const filters = getRegistrantFilterContext({ _id: 'event-1', raceDistances: [] }, {
    registrationStatus: 'bad', sort: 'bad', pageSize: '999', page: '-2'
  });
  assert.equal(filters.selectedRegistrationStatus, '');
  assert.equal(filters.selectedSort, 'newest');
  assert.equal(filters.pageSize, 25);
  assert.equal(filters.requestedPage, 1);
});

test('roster template uses contextual filters, expandable records, and focused review links', () => {
  assert.doesNotThrow(() => ejs.compile(view, { filename: path.join(ROOT, 'src/views/organizer/event-registrants.ejs') }));
  assert.match(view, /organizer-roster-status-strip/);
  assert.match(view, /capabilities\.isPaidEvent/);
  assert.match(view, /capabilities\.supportsOnsite/);
  assert.match(view, /Filters &amp; sort/);
  assert.match(view, /name="registrationStatus"/);
  assert.match(view, /name="pageSize"/);
  assert.match(view, /data-toggle-registrant-details/);
  assert.match(view, /data-message-runner/);
  assert.match(view, /payment-proofs\/review/);
  assert.match(view, /run-proofs\/review/);
  assert.doesNotMatch(view, /data-registrant-column-toggle/);
  assert.doesNotMatch(view, /payment\/approve/);
  assert.doesNotMatch(view, /payment\/reject/);
});

test('roster presentation is responsive and dialogs are accessible', () => {
  assert.match(css, /@media \(max-width: 760px\)/);
  assert.match(css, /min-height: 44px/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /organizer-roster-dialog-backdrop[^}]*place-items: center/);
  assert.match(script, /event\.key === 'Escape'/);
  assert.match(script, /event\.key !== 'Tab'/);
  assert.match(script, /window\.lucide\?\.createIcons/);
  assert.match(script, /button\.disabled = true/);
});

test('the row shows only Submissions and Details, and the actions column fits them without overlapping progress', () => {
  const rosterCss = fs.readFileSync(path.join(__dirname, '..', 'src/public/css/organizer-registrants.css'), 'utf8');
  const view = fs.readFileSync(path.join(__dirname, '..', 'src/views/organizer/event-registrants.ejs'), 'utf8');

  const actions = view.match(/<div class="organizer-roster-record-actions"[\s\S]*?<\/div>\s*<\/div>/)[0];
  const buttonCount = (actions.match(/organizer-roster-icon-action /g) || []).length;
  assert.equal(buttonCount, 2, 'only Submissions and Details belong beside the progress bar');
  assert.match(actions, /organizer-roster-action-submissions/);
  assert.match(actions, /organizer-roster-action-details/);
  assert.doesNotMatch(actions, /data-message-runner/, 'Message lives inside the Details panel');

  // Each icon action is a fixed 44px square; the row gap is .35rem (5.6px at 16px).
  const width = Number(rosterCss.match(/--roster-actions-width:\s*([\d.]+)rem/)[1]) * 16;
  assert.ok(width >= buttonCount * 44 + (buttonCount - 1) * 5.6, `actions column ${width}px is narrower than ${buttonCount} buttons need`);

  // Every grid template that defines the last column must use the shared width, not a literal.
  const templates = rosterCss.match(/grid-template-columns:[^;}]*var\(--roster-actions-width\)/g) || [];
  assert.ok(templates.length >= 3, `expected the shared width in the row templates, found ${templates.length}`);
  assert.doesNotMatch(rosterCss, /grid-template-columns:[^;}]*\s(?:100|108)px[;}]/, 'no template may hard-code a column width');
});

test('Message is a labelled button inside each record\'s Details panel and keeps its dialog hooks', () => {
  const view = fs.readFileSync(path.join(__dirname, '..', 'src/views/organizer/event-registrants.ejs'), 'utf8');
  const records = view.match(/<article class="organizer-roster-record"[\s\S]*?<\/article>/g) || [];
  assert.equal(records.length, 1, 'one record template');
  const record = records[0];
  const buttons = record.match(/<button\b(?:(?!<\/button>)[\s\S])*?data-message-runner[\s\S]*?<\/button>/g) || [];
  assert.equal(buttons.length, 1);
  assert.match(buttons[0], /data-registration-id="<%= registration\._id %>"/);
  assert.match(buttons[0], /data-runner-name="<%= runnerName %>"/);

  const details = record.slice(record.indexOf('class="organizer-roster-record-details"'));
  assert.ok(details.includes('data-message-runner'), 'the button sits inside the details panel');
  assert.match(details, /<span>Message runner<\/span>/);
});

test('Submissions is the solid brand action, Details the quieter tint that turns solid when open', () => {
  const rosterCss = fs.readFileSync(path.join(__dirname, '..', 'src/public/css/organizer-registrants.css'), 'utf8');
  assert.match(rosterCss, /\.organizer-roster-action-submissions \{[^}]*background: #c2410c;[^}]*color: #fff;/);
  assert.match(rosterCss, /\.organizer-roster-action-submissions:hover \{[^}]*background: #9a3412;/);
  assert.match(rosterCss, /\.organizer-roster-action-details \{[^}]*background: #fff7ed;[^}]*color: #c2410c;/);
  assert.match(rosterCss, /\.organizer-roster-action-details\[aria-expanded="true"\] \{[^}]*background: #c2410c;[^}]*color: #fff;/);
});

test('without JavaScript the dead Message button is hidden and the noscript form remains', () => {
  const rosterCss = fs.readFileSync(path.join(__dirname, '..', 'src/public/css/organizer-registrants.css'), 'utf8');
  const view = fs.readFileSync(path.join(__dirname, '..', 'src/views/organizer/event-registrants.ejs'), 'utf8');
  assert.match(rosterCss, /\.organizer-roster-page:not\(\.is-enhanced\) \.organizer-roster-message-btn \{ display: none !important; \}/);
  assert.match(view, /<noscript><form method="POST" action="<%= basePath %>\/<%= registration\._id %>\/send-message"/);
});
