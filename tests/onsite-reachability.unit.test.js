'use strict';

// Two ways a real onsite field became unreachable on race day.
//
// Five of the six registration paths produce a participant with no HelloRun account, and
// the race pass was session-scoped — so most of a field could only be found by typing a
// name at the desk. And the roster capped at 500 rows with no offset, so on a 900-runner
// event 400 people were not on the list at all.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ejs = require('ejs');

const { normalisePageNumber } = require('../src/services/onsite-roster.service');

const ROOT = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const roster = read('src/services/onsite-roster.service.js');
const guestRoutes = read('src/routes/guest.routes.js');

function renderGuestPage(data) {
  const file = 'src/views/pages/guest-registration.ejs';
  return ejs.compile(read(file), { filename: path.join(ROOT, file), views: [path.join(ROOT, 'src/views')] })({
    title: 't',
    user: {},
    event: { title: 'E', slug: 'e' },
    registration: {
      confirmationCode: 'HR-ABC123', status: 'confirmed', participationMode: 'onsite',
      participant: { firstName: 'A', lastName: 'B', email: 'a@b.com' }, raceDistance: '5K'
    },
    onsite: null,
    qrDataUrl: '',
    ...data
  });
}

// --- The guest race pass ------------------------------------------------------------------

test('a guest reaches their bib and QR from the link they already have', () => {
  // Reusing the manage token rather than minting a second credential: it is already
  // hashed, single-purpose, and revoked on cancellation and on claim.
  assert.match(guestRoutes, /getOnsiteStateForRegistrations/);
  // Resolved, not just mentioned. It was first imported from qr-code.service, where it
  // does not exist, so it was undefined and every guest QR failed silently into the
  // catch — a string match on the name proved nothing.
  assert.equal(
    typeof require('../src/services/bib-qr-token.service').renderBibQrCode,
    'function',
    'renderBibQrCode must live where the guest route imports it from'
  );
  assert.match(guestRoutes, /renderBibQrCode \} = require\('\.\.\/services\/bib-qr-token\.service'\)/);
  assert.match(guestRoutes, /Reusing the manage token rather than minting a second credential/);

  const withBib = renderGuestPage({ onsite: { bibNumber: 'A-12' }, qrDataUrl: 'data:image/png;base64,xx' });
  assert.match(withBib, /A-12/);
  assert.match(withBib, /race-pass-qr/);
  assert.match(withBib, /HR-ABC123/, 'the confirmation code stays — it is what a desk asks for');
});

test('a QR failure does not cost the participant their bib', () => {
  // The pass is still useful with the number alone, so this must not 500 the page.
  assert.match(guestRoutes, /The pass is still useful with the bib number alone/);
  const noQr = renderGuestPage({ onsite: { bibNumber: 'A-12' }, qrDataUrl: '' });
  assert.match(noQr, /A-12/);
  assert.doesNotMatch(noQr, /race-pass-qr/);
});

test('no bib yet, and a cancelled entry, both say so instead of showing a pass', () => {
  assert.match(renderGuestPage({}), /once the organiser has assigned one/);

  const cancelled = renderGuestPage({
    registration: {
      confirmationCode: 'HR-ABC123', status: 'cancelled', participationMode: 'onsite',
      participant: { firstName: 'A', lastName: 'B', email: 'a@b.com' }
    },
    onsite: { bibNumber: 'A-12' },
    qrDataUrl: 'x'
  });
  assert.doesNotMatch(cancelled, /race-pass-qr/, 'a cancelled entry must not present a scannable pass');
  assert.match(cancelled, /was cancelled/);
});

// --- Roster paging --------------------------------------------------------------------------

test('the roster can be paged past its limit', () => {
  assert.match(roster, /\.skip\(skip\)/);
  assert.match(roster, /const page = normalisePageNumber\(options\.page\)/);
  // A name that appears twice must not shift between pages and skip somebody.
  assert.match(roster, /_id: 1 \}\)/);
  assert.match(roster, /a name that appears twice can shift between pages/);
});

test('the page number is bounded, so a hand-typed value cannot scan the collection', () => {
  assert.equal(normalisePageNumber(undefined), 1);
  assert.equal(normalisePageNumber('0'), 1);
  assert.equal(normalisePageNumber('-3'), 1);
  assert.equal(normalisePageNumber('abc'), 1);
  assert.equal(normalisePageNumber('4'), 4);
  assert.equal(normalisePageNumber('999999'), 10000);
});

test('the roster reports the real total, not just what fits', () => {
  // "Showing the first 500 matches, narrow your search" is a dead end when the answer is
  // that there are 900 people.
  assert.match(roster, /matchingCount/);
  assert.match(roster, /totalPages: Math\.max\(1, Math\.ceil\(matchingCount \/ limit\)\)/);
  assert.match(roster, /hasNextPage: skip \+ participants\.length < matchingCount/);
});

test('every roster page offers paging, and stays quiet on a single page', () => {
  const partial = read('src/views/organizer/partials/roster-paging.ejs');
  assert.match(partial, /Showing <%= participants\.length %> of <%= pagingTotal %>/);

  for (const view of ['event-check-in', 'event-bibs', 'event-race-kits', 'event-onsite-results']) {
    const source = read(`src/views/organizer/${view}.ejs`);
    assert.match(source, /include\('partials\/roster-paging'/, `${view} must offer paging`);
    assert.doesNotMatch(source, /Narrow the search to see more/, `${view} must not still dead-end`);
  }

  // Every page that renders it must be handed the numbers.
  const pages = read('src/routes/organiser/onsite-pages.js');
  assert.equal((pages.match(/totalPages: /g) || []).length, 4);
  assert.equal((pages.match(/page: req\.query\.page/g) || []).length, 4);
});

test('the offline backup export pages through instead of stopping at 500', () => {
  // This is the list staff fall back on when connectivity drops, so a silent truncation
  // lands at the worst possible moment.
  const pages = read('src/routes/organiser/onsite-pages.js');
  assert.match(pages, /while \(consoleData\.hasNextPage && page < 40\)/);
  assert.match(pages, /const rows = participants\.map/, 'the export must map every page, not the last one');
  assert.match(pages, /silently stopping at 500 would hide 400 people/);
});

// --- Who appears on the race-day list -----------------------------------------------------

test('a cancelled entry is not on the race-day roster', () => {
  // It used to look exactly like a live one, so a desk could hand a bib and a kit to
  // somebody whose registration had been cancelled.
  assert.match(roster, /status: \{ \$ne: 'cancelled' \} \}\)/);
  assert.match(roster, /A cancelled entry is not a participant/);
  // But an organiser reconciling afterwards does need to see them.
  assert.match(roster, /options\.includeCancelled/);
});

test('a mode the event does not run is refused', () => {
  const { validateGuestForm } = require('../src/services/guest-registration.service');
  const base = {
    firstName: 'A', lastName: 'B', email: 'a@b.com', mobile: '09', raceDistance: '5K',
    waiverAccepted: true, waiverSignature: 'A B', emergencyContactName: 'E', emergencyContactNumber: '1'
  };
  const modeError = (event, participationMode) =>
    validateGuestForm({ ...base, participationMode }, event).errors.participationMode;

  // The roster filters on participationMode, so a virtual entry on an onsite-only race
  // held a confirmed place while being invisible on race day.
  assert.ok(modeError({ eventType: 'onsite', eventTypesAllowed: ['onsite'] }, 'virtual'));
  assert.equal(modeError({ eventType: 'onsite', eventTypesAllowed: ['onsite'] }, 'onsite'), undefined);
  assert.equal(modeError({ eventType: 'hybrid', eventTypesAllowed: ['onsite', 'virtual'] }, 'virtual'), undefined);

  // Events created before eventTypesAllowed was populated still work, and hybrid means both.
  assert.equal(modeError({ eventType: 'virtual', eventTypesAllowed: [] }, 'virtual'), undefined);
  assert.ok(modeError({ eventType: 'onsite', eventTypesAllowed: [] }, 'virtual'));
  // A caller that passes no event is unchanged.
  assert.equal(modeError(null, 'virtual'), undefined);
});
