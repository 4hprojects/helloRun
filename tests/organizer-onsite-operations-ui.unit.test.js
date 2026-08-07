'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ejs = require('ejs');
const {
  buildParticipantRow,
  escapeRegex,
  normalizePageSize
} = require('../src/services/onsite-roster.service');

const ROOT = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const view = read('src/views/organizer/event-check-in.ejs');
const bibsView = read('src/views/organizer/event-bibs.ejs');
const kitsView = read('src/views/organizer/event-race-kits.ejs');
const css = read('src/public/css/organizer-check-in.css');
const script = read('src/public/js/organizer-check-in.js');
const bibsScript = read('src/public/js/organizer-onsite-bibs.js');
const kitsScript = read('src/public/js/organizer-onsite-kits.js');
const boardView = read('src/views/organizer/event-check-in-board.ejs');
const boardScript = read('src/public/js/organizer-check-in-board.js');
const resultsView = read('src/views/organizer/event-onsite-results.ejs');
const resultsScript = read('src/public/js/organizer-onsite-results.js');
const realtimeService = read('src/services/realtime-checkin.service.js');
const eventDetailService = read('src/services/organizer-event-detail.service.js');
const migration = read('src/db/migrations/023_onsite_checkin_bib_uniqueness.sql');
const onsiteService = read('src/services/onsite-operations.service.js');
const onsiteRoutes = read('src/routes/organiser/onsite-operations.js');

test('participant rows merge Mongo identity with Postgres onsite state', () => {
  const registration = {
    _id: 'reg-1',
    confirmationCode: 'HR-ABC123',
    participant: {
      firstName: 'Ana',
      lastName: 'Reyes',
      email: 'ana@example.com',
      emergencyContactName: 'Lito Reyes',
      emergencyContactNumber: '09171234567'
    },
    raceDistance: '10K',
    participationMode: 'onsite',
    paymentStatus: 'paid',
    status: 'confirmed'
  };

  const row = buildParticipantRow(registration, {
    bib_number: '204',
    check_in_status: 'checked_in',
    checked_in_at: '2026-08-07T01:00:00.000Z',
    verification_method: 'manual'
  });

  assert.equal(row.fullName, 'Ana Reyes');
  assert.equal(row.bibNumber, '204');
  assert.equal(row.isCheckedIn, true);
  assert.equal(row.isMissingShadowRecord, false);
  assert.equal(row.emergencyContactNumber, '09171234567');
});

test('a registration with no Postgres shadow row is flagged rather than shown as checkable', () => {
  const row = buildParticipantRow(
    { _id: 'reg-2', confirmationCode: 'HR-XYZ789', participant: {} },
    undefined
  );

  assert.equal(row.isMissingShadowRecord, true);
  assert.equal(row.isCheckedIn, false);
  assert.equal(row.bibNumber, '');
  assert.equal(row.fullName, 'Unnamed participant');
});

test('search input is escaped before becoming a regex and page size is bounded', () => {
  assert.equal(escapeRegex('a.*b'), 'a\\.\\*b');
  assert.equal(escapeRegex('(evil)'), '\\(evil\\)');
  assert.doesNotThrow(() => new RegExp(escapeRegex('[unclosed')));

  assert.equal(normalizePageSize(undefined), 100);
  assert.equal(normalizePageSize('0'), 100);
  assert.equal(normalizePageSize('-5'), 100);
  assert.equal(normalizePageSize('abc'), 100);
  assert.equal(normalizePageSize('50'), 50);
  assert.equal(normalizePageSize('99999'), 500);
});

test('migration 023 dedupes before adding uniqueness and keeps voided bibs reassignable', () => {
  // Duplicates must be reconciled first or the index creation fails on live data.
  assert.match(migration, /DELETE FROM check_ins/);
  assert.match(migration, /ROW_NUMBER\(\) OVER/);
  assert.match(migration, /CREATE UNIQUE INDEX IF NOT EXISTS check_ins_event_registration_unique/);
  assert.match(migration, /CREATE UNIQUE INDEX IF NOT EXISTS bib_assignments_event_registration_live_unique/);
  assert.match(migration, /WHERE assignment_status <> 'voided'/);
  // Additive only: the gate we agreed forbids destructive schema changes here.
  assert.doesNotMatch(migration, /DROP TABLE/i);
  assert.doesNotMatch(migration, /DROP COLUMN/i);
  assert.doesNotMatch(migration, /ALTER COLUMN/i);
});

test('repeat check-ins upsert instead of inserting a second row', () => {
  assert.match(onsiteService, /ON CONFLICT \(event_core_id, registration_id\) DO UPDATE SET/);
  // The first scan is the meaningful arrival time and must survive a rescan.
  assert.match(onsiteService, /checked_in_at = COALESCE\(check_ins\.checked_in_at, EXCLUDED\.checked_in_at\)/);
  assert.match(onsiteService, /\(xmax <> 0\) AS was_already_checked_in/);
  assert.doesNotMatch(onsiteService, /ON CONFLICT \(mongo_bib_assignment_id\)/);
});

test('bib reassignment targets the live-bib partial index', () => {
  assert.match(
    onsiteService,
    /ON CONFLICT \(event_core_id, registration_id\) WHERE assignment_status <> 'voided'/
  );
});

test('check-in endpoint reports repeat scans and is rate limited', () => {
  assert.match(onsiteRoutes, /checkInLimiter/);
  assert.match(onsiteRoutes, /alreadyCheckedIn/);
  assert.match(onsiteRoutes, /Participant was already checked in/);
});

test('console template renders server-side and exposes the offline backup list', () => {
  assert.doesNotThrow(() =>
    ejs.compile(view, { filename: path.join(ROOT, 'src/views/organizer/event-check-in.ejs') })
  );
  assert.match(view, /data-checkin-console/);
  assert.match(view, /basePath %>\/backup-list/);
  assert.match(view, /data-checkin-button/);
  assert.match(view, /listCounts\.missingShadowRecord/);
  // Participant data must never be emitted through raw output.
  assert.doesNotMatch(view, /<%-\s*participant/);
  assert.doesNotMatch(view, /<%-\s*search/);
});

test('headline progress is event-wide, never the filtered page', () => {
  // A search or a truncated page must not be able to understate event progress.
  assert.match(view, /totals\.checkedIn/);
  assert.match(view, /totals\.registered/);
  assert.match(view, /Totals cover the whole event/);
  assert.doesNotMatch(view, /checkin-counts[\s\S]{0,400}listCounts\.checkedIn/);
  // Unavailable totals degrade to an em dash rather than a misleading zero.
  assert.match(view, /totals\.checkedIn === null \? '—'/);
});

test('console is mobile-first, touch-friendly, and does not rely on colour alone', () => {
  assert.match(css, /min-height: 2\.75rem/);
  assert.match(css, /@media \(min-width: 40rem\)/);
  // The checked-in row carries a text status as well as the green treatment.
  assert.match(view, /checkin-row-status-done[^>]*>Checked in/);
});

test('roster rows carry bib and kit state for the bib and race-kit pages', () => {
  const withKit = buildParticipantRow(
    { _id: 'reg-1', confirmationCode: 'HR-A', participant: {} },
    { bib_number: '12', bib_status: 'picked_up', picked_up_at: '2026-08-07T02:00:00.000Z' }
  );
  assert.equal(withKit.hasBib, true);
  assert.equal(withKit.isKitReleased, true);

  const withoutKit = buildParticipantRow(
    { _id: 'reg-2', confirmationCode: 'HR-B', participant: {} },
    { bib_number: '13', bib_status: 'assigned' }
  );
  assert.equal(withoutKit.hasBib, true);
  assert.equal(withoutKit.isKitReleased, false);

  const withoutBib = buildParticipantRow(
    { _id: 'reg-3', confirmationCode: 'HR-C', participant: {} },
    { bib_number: null, bib_status: null }
  );
  assert.equal(withoutBib.hasBib, false);
  assert.equal(withoutBib.isKitReleased, false);
});

test('bib and race-kit pages render and share the roster shape', () => {
  [
    ['src/views/organizer/event-bibs.ejs', bibsView],
    ['src/views/organizer/event-race-kits.ejs', kitsView]
  ].forEach(([file, template]) => {
    assert.doesNotThrow(
      () => ejs.compile(template, { filename: path.join(ROOT, file) }),
      `${file} should compile`
    );
    assert.match(template, /totals\.registered/);
    assert.match(template, /Totals cover the whole event/);
    assert.doesNotMatch(template, /<%-\s*participant/);
  });

  // Kit release depends on a bib existing, and the page must say so rather than failing.
  assert.match(kitsView, /Needs a bib/);
  assert.match(kitsView, /a bib must be assigned/);
});

test('bulk bib assignment previews before writing and reports partial failures', () => {
  assert.match(bibsView, /data-bulk-preview/);
  assert.match(bibsView, /data-bulk-confirm/);
  assert.match(bibsView, /Nothing is assigned until you confirm/);
  assert.match(bibsScript, /pendingAssignments/);
  assert.match(bibsScript, /payload\.failed/);
  assert.match(bibsScript, /'x-csrf-token': csrfToken/);
  // Only unassigned, synced rows are eligible for a sequential range.
  assert.match(bibsScript, /dataset\.hasBib === '0' && row\.dataset\.missingShadow === '0'/);
});

test('bulk endpoint is bounded and rate limited', () => {
  assert.match(onsiteRoutes, /MAX_BULK_BIB_ASSIGNMENTS/);
  assert.match(onsiteRoutes, /bulkBibLimiter/);
  assert.match(onsiteRoutes, /assignments array required/);
});

test('kit release script sends CSRF and surfaces failures', () => {
  assert.match(kitsScript, /'x-csrf-token': csrfToken/);
  assert.match(kitsScript, /button\.disabled = true/);
  assert.match(kitsScript, /checkin-row-status-error/);
  assert.match(kitsScript, /Network error/);
});

test('onsite tooling is linked from event-details only for onsite-capable events', () => {
  const { supportsOnsiteOperations } = require('../src/services/organizer-event-detail.service');

  assert.equal(supportsOnsiteOperations({ eventTypesAllowed: ['onsite'] }), true);
  assert.equal(supportsOnsiteOperations({ eventTypesAllowed: ['virtual', 'onsite'] }), true);
  assert.equal(supportsOnsiteOperations({ eventTypesAllowed: ['virtual'] }), false);
  assert.equal(supportsOnsiteOperations({ eventType: 'onsite' }), true);
  assert.equal(supportsOnsiteOperations({ eventType: 'hybrid' }), true);
  assert.equal(supportsOnsiteOperations({ eventType: 'virtual' }), false);
  assert.equal(supportsOnsiteOperations({}), false);

  assert.match(eventDetailService, /group: 'Onsite operations'/);
});

test('live board renders server-side first and degrades without blanking', () => {
  assert.doesNotThrow(() =>
    ejs.compile(boardView, { filename: path.join(ROOT, 'src/views/organizer/event-check-in-board.ejs') })
  );
  // First paint comes from the server, so the board is readable before any poll.
  assert.match(boardView, /data-board-checked-in/);
  assert.match(boardView, /Live figures are unavailable/);
  assert.match(boardView, /Not enough recent arrivals/);
  assert.doesNotMatch(boardView, /<%-\s*entry/);

  assert.match(boardScript, /Connection lost/);
  // Participant names are user data and must be written as text, never markup.
  assert.match(boardScript, /createTextNode\(name\)/);
  assert.doesNotMatch(boardScript, /innerHTML/);
});

test('realtime queries bind the interval instead of interpolating it into a literal', () => {
  // INTERVAL '$1 minutes' put a bound parameter inside a string literal and threw.
  assert.match(realtimeService, /make_interval\(mins => \$\{/);
  assert.doesNotMatch(realtimeService, /INTERVAL '\$\{/);
  // Totals are onsite-scoped so the board agrees with the check-in console.
  assert.match(realtimeService, /r\.participation_mode = 'onsite'/);
  // No fabricated velocity: with no recent arrivals there is no estimate.
  assert.match(realtimeService, /canEstimate \? Math\.ceil/);
  assert.doesNotMatch(realtimeService, /recent_count \|\| 1/);
});

test('results page records and approves, and is honest about what approval does', () => {
  assert.doesNotThrow(() =>
    ejs.compile(resultsView, { filename: path.join(ROOT, 'src/views/organizer/event-onsite-results.ejs') })
  );
  assert.match(resultsView, /data-result-save/);
  assert.match(resultsView, /data-result-approve/);
  assert.match(resultsView, /totals\.resultsApproved/);
  // Approval now reaches the leaderboard, rankings and certificates via a Submission.
  assert.match(resultsView, /enters the runner\s+into the event leaderboard/);
  assert.doesNotMatch(resultsView, /<%-\s*participant/);

  assert.match(resultsScript, /'x-csrf-token': csrfToken/);
  assert.match(resultsScript, /awardsCreated/);
  assert.match(resultsScript, /Record a finish time first/);
});

test('finish times are validated and converted server-side', () => {
  // The route derives elapsed_ms from the entered time so the two cannot disagree.
  assert.match(onsiteRoutes, /isValidTimeFormat/);
  assert.match(onsiteRoutes, /timeToMilliseconds/);
  assert.match(onsiteRoutes, /Finish time must be HH:MM:SS or MM:SS/);
});

test('check-in script sends CSRF, disables the button, and surfaces failures', () => {
  assert.match(script, /'x-csrf-token': csrfToken/);
  assert.match(script, /button\.disabled = true/);
  assert.match(script, /checkin-row-status-error/);
  assert.match(script, /was_already_checked_in/);
  assert.match(script, /Network error/);
});
