'use strict';

// Per-size race-kit stock.
//
// The failure that matters is handing out a shirt that is not there, so the claim has to be
// atomic and the count has to survive everything else an organiser does to the event.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  getInventorySummary,
  getOfferedSizes,
  isOfferedSize,
  isTrackingSizes,
  normaliseSize
} = require('../src/services/kit-inventory.service');
const {
  KIT_SIZES,
  parseKitInventoryFields,
  mergeKitInventory
} = require('../src/services/event-form.service');
const { validateGuestForm } = require('../src/services/guest-registration.service');

const ROOT = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const service = read('src/services/kit-inventory.service.js');
const release = read('src/services/race-kit-release.service.js');
const cancellation = read('src/services/registration-cancellation.service.js');
const routes = read('src/routes/organiser/onsite-operations.js');

const TRACKED = {
  kitInventory: [
    { size: 'M', stock: 10, released: 8 },
    { size: 'L', stock: 5, released: 5 },
    { size: 'XL', stock: 0 }
  ]
};

// --- Where the count lives -----------------------------------------------------------------

test('stock is counted in Mongo, not on the dead Postgres columns', () => {
  // race_kits.quantity_reserved has never been written by anything but the insert that
  // creates the row, so building on it would mean adopting a counter nothing maintains.
  assert.match(read('src/models/Event.js'), /has never been written by anything but the/);
  assert.equal(/quantity_reserved/.test(service), false, 'the service must not read the dead columns');
});

test('the counter mirrors raceCategories.reserved, including the absent-means-zero rule', () => {
  // $inc creates `released` on first use, so the filter has to match its absence too.
  assert.match(service, /\$or: \[\{ released: \{ \$exists: false \} \}, \{ released: \{ \$lt: stock \} \}\]/);
  assert.match(service, /\$inc: \{ 'kitInventory\.\$\.released': 1 \}/);
  // The bound is inside the filter, so the check and the decrement are one operation.
  assert.match(service, /The bound is inside the filter/);
});

test('a sold-out size cannot be claimed, however the counter got there', () => {
  // Found by a live probe: with stock 0 the `$exists: false` branch — which is there so
  // $inc can create `released` on first use — matched unconditionally, because an absent
  // counter is not less than zero, it simply is not there. The first claim on a sold-out
  // size succeeded and handed out a shirt that did not exist.
  assert.match(service, /if \(stock <= 0\) return \{ claimed: false, tracked: true, reason: 'out_of_stock'/);
  assert.match(service, /Found by a live probe: stock 0 handed out a shirt/);
});

test('a size is counted when the kit leaves the table, not when somebody registers', () => {
  // An event routinely registers more people than it has shirts and tops up later, and a
  // no-show must not hold one.
  assert.match(service, /A slot is claimed when\n\/\/ somebody registers, months ahead; a shirt is claimed when it physically leaves/);
});

// --- Reading the numbers ---------------------------------------------------------------------

test('remaining never reads as a negative, however the stock was edited', () => {
  const summary = getInventorySummary({
    kitInventory: [{ size: 'M', stock: 2, released: 5 }]
  });
  // An organiser lowering stock below what has gone out should see "none left", not a
  // number that looks like a bug.
  assert.equal(summary[0].remaining, 0);
  assert.equal(summary[0].stock, 2);
  assert.equal(summary[0].released, 5);
});

test('a size with no released count reads as zero rather than being skipped', () => {
  const summary = getInventorySummary({ kitInventory: [{ size: 'XL', stock: 4 }] });
  assert.deepEqual(summary, [{ size: 'XL', stock: 4, released: 0, remaining: 4 }]);
});

test('an event with no sizes behaves exactly as it did before this existed', () => {
  assert.equal(isTrackingSizes({}), false);
  assert.equal(isTrackingSizes({ kitInventory: [] }), false);
  assert.deepEqual(getInventorySummary({}), []);
  assert.deepEqual(getOfferedSizes({}), []);
  // Anything is acceptable when there is nothing to check it against.
  assert.equal(isOfferedSize({}, 'ANYTHING'), true);
  assert.equal(isOfferedSize({}, ''), true);
});

test('sizes compare the same however they were typed', () => {
  assert.equal(normaliseSize('  m '), 'M');
  assert.equal(normaliseSize(null), '');
  assert.equal(isOfferedSize(TRACKED, 'm'), true);
  assert.equal(isOfferedSize(TRACKED, 'XXL'), false);
  assert.deepEqual(getOfferedSizes(TRACKED), ['M', 'L', 'XL']);
});

// --- Asking for a size -----------------------------------------------------------------------

test('a size is only demanded when the event actually stocks one', () => {
  const base = {
    firstName: 'A', lastName: 'B', email: 'a@b.com', mobile: '0917',
    participationMode: 'virtual', waiverAccepted: true, waiverSignature: 'A B'
  };

  // No inventory: never asked, and a stray value is not carried onto the record.
  const none = validateGuestForm({ ...base, kitSize: 'M' }, { kitInventory: [] });
  assert.equal(none.errors.kitSize, undefined);
  assert.equal(none.form.kitSize, '');

  // Tracked but optional.
  const optional = validateGuestForm(base, TRACKED);
  assert.equal(optional.errors.kitSize, undefined);

  // Tracked and required.
  const required = validateGuestForm(base, { ...TRACKED, kitSizeRequired: true });
  assert.equal(required.errors.kitSize, 'Choose a kit size.');

  // A size the event does not stock is refused even when optional.
  const wrong = validateGuestForm({ ...base, kitSize: 'XXL' }, TRACKED);
  assert.match(wrong.errors.kitSize, /sizes this event offers/);

  // And a good one passes, normalised.
  const good = validateGuestForm({ ...base, kitSize: ' m ' }, TRACKED);
  assert.deepEqual(good.errors, {});
  assert.equal(good.form.kitSize, 'M');
});

test('every way into an event can record a size', () => {
  // Account registration, guest, walk-in, waitlist claim and bulk import.
  assert.match(read('src/controllers/page/registration.controller.js'), /kitSize: formData\.kitSize \|\| ''/);
  assert.match(read('src/services/guest-registration.service.js'), /kitSize: form\.kitSize \|\| ''/);
  assert.match(routes, /validateGuestForm\(req\.body, event\)/);
  assert.match(read('src/routes/waitlist.routes.js'), /event\n\s*\);/);
  const importer = read('src/services/registrant-import.service.js');
  assert.match(importer, /kit_size: \['size', 'kit size', 'shirt size'/);
  assert.match(importer, /kitSize: row\.kit_size \|\| ''/);
});

// --- Handing it over --------------------------------------------------------------------------

test('releasing twice does not take a second shirt out of stock', () => {
  // A desk re-scanning somebody is far more likely than a genuine second kit.
  assert.match(release, /if \(registration\.kitSizeReleased\) \{/);
  assert.match(release, /ALREADY_RELEASED/);
});

test('stock is claimed before the kit is marked gone, and put back if that write fails', () => {
  // Running out is the one thing that can legitimately refuse, so it has to happen first.
  assert.match(release, /The stock is claimed first because it is\n\/\/ the one that can legitimately refuse/);
  assert.match(release, /if \(tracking\) await returnKitSize\(eventId, requested\)/);
});

test('running out of a size is an answer, not a 500', () => {
  assert.match(routes, /error\.code === 'NO_STOCK' \|\| error\.code === 'ALREADY_RELEASED'/);
  assert.match(routes, /res\.status\(409\)/);
  assert.match(release, /out_of_stock: `No \$\{requested\} left/);
  // The desk has to be able to act on it rather than being stuck on an error.
  assert.match(read('src/public/js/organizer-onsite-kits.js'), /button\.disabled = false/);
});

test('a substitution is recorded rather than hidden', () => {
  // Otherwise the stock count and what people are actually wearing drift apart.
  assert.match(release, /const substituted = Boolean\(normaliseSize\(size\)\)/);
  assert.match(read('src/models/Registration.js'), /kitSizeReleased/);
  assert.match(read('src/views/organizer/event-race-kits.ejs'), /chose <%= participant\.kitSize %>/);
});

test('a cancelled registration puts its kit back on the books', () => {
  // Nothing physically returns, but leaving the count down would have the organiser short
  // a shirt on paper that is still in the box.
  assert.match(cancellation, /returnKitForRegistration/);
  assert.match(cancellation, /if \(registration\.kitSizeReleased\)/);
  // Returning is guarded above zero so a double return cannot invent stock.
  assert.match(service, /released: \{ \$gt: 0 \} \}/);
});

// --- The setting ---------------------------------------------------------------------------------

test('editing an event never resets what has already been handed over', () => {
  // `released` is not on the form, so a plain overwrite would zero every count at the kit
  // table the moment an organiser edited anything else.
  const merged = mergeKitInventory(
    [{ size: 'M', stock: 20 }, { size: 'L', stock: 6 }],
    [{ size: 'M', stock: 10, released: 8 }, { size: 'L', stock: 5, released: 0 }]
  );
  assert.deepEqual(merged, [{ size: 'M', stock: 20, released: 8 }, { size: 'L', stock: 6 }]);
});

test('a blank size box means not offered, and zero means offered but sold out', () => {
  const parsed = parseKitInventoryFields({ kitStockM: '10', kitStockL: '0', kitStockXL: '' });
  assert.deepEqual(parsed, [{ size: 'M', stock: 10 }, { size: 'L', stock: 0 }]);
  // A sold-out size must still be listed, or it silently vanishes from the form.
  assert.ok(parsed.some((row) => row.size === 'L' && row.stock === 0));
  // Rubbish is ignored rather than failing a long form.
  assert.deepEqual(parseKitInventoryFields({ kitStockM: 'lots', kitStockL: '-3' }), []);
  assert.ok(KIT_SIZES.includes('2XL'));
});

test('recount is the repair, rather than hand-editing the counter', () => {
  assert.match(service, /async function recountKitInventory/);
  assert.match(service, /hand-editing `released` would just move the drift somewhere else/);
  // Cancelled registrations must not count as kits that went out.
  assert.match(service, /status: \{ \$ne: 'cancelled' \}/);
});
