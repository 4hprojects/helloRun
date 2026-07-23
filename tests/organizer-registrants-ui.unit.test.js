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
