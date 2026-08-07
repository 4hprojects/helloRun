'use strict';

// Atomic race-category capacity.
//
// The old check counted confirmed registrations and then inserted, so two people
// submitting for the last slot both read the same count and both got in. Counting is not
// a reservation, however close to the insert it happens.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { hasSlotLimit, findCategory } = require('../src/services/category-capacity.service');

const ROOT = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const service = read('src/services/category-capacity.service.js');
const controller = read('src/controllers/page/registration.controller.js');
const cancellation = read('src/services/registration-cancellation.service.js');
const eventModel = read('src/models/Event.js');
const backfill = read('src/scripts/backfill-category-reservations.js');

test('only categories with a positive slot count are capacity-limited', () => {
  assert.equal(hasSlotLimit({ slots: 50 }), true);
  // Most categories have no cap; null is the schema default.
  [{ slots: null }, { slots: 0 }, { slots: -1 }, { slots: 'many' }, {}, null].forEach((category) => {
    assert.equal(hasSlotLimit(category), false, `${JSON.stringify(category)} should be unlimited`);
  });
});

test('categories are matched by id as a string, not by reference', () => {
  const event = { raceCategories: [{ categoryId: 'c1', name: '5K' }, { categoryId: 'c2' }] };
  assert.equal(findCategory(event, 'c1').name, '5K');
  assert.equal(findCategory(event, 'c2').categoryId, 'c2');
  assert.equal(findCategory(event, 'nope'), null);
  assert.equal(findCategory(null, 'c1'), null);
});

test('the bound is enforced inside the update, so the check and the claim are one step', () => {
  // If the filter matched first and incremented second, the race would still be open.
  assert.match(service, /\$elemMatch: \{[\s\S]{0,200}reserved: \{ \$lt: slots \}/);
  assert.match(service, /\$inc: \{ 'raceCategories\.\$\.reserved': 1 \}/);
  assert.match(service, /atomicity for a single document update/);
});

test('a category that predates the counter is treated as zero, not as unmatched', () => {
  // Without this, $lt would never match an absent field and every such category would
  // read as full the moment capacity was introduced.
  assert.match(service, /\{ reserved: \{ \$exists: false \} \}/);
});

test('releasing is guarded at zero so a double release cannot create capacity', () => {
  assert.match(service, /reserved: \{ \$gt: 0 \}/);
  assert.match(service, /\$inc: \{ 'raceCategories\.\$\.reserved': -1 \}/);
});

test('a slot taken by a registration that then fails is given back', () => {
  // Includes the duplicate-key path, which is a real way to hold a slot and fail.
  assert.match(controller, /let reservedCategoryId = ''/);
  assert.match(controller, /if \(reservedCategoryId && reservedEventId\) \{/);
  assert.match(controller, /await releaseCategorySlot\(reservedEventId, reservedCategoryId\)/);
  // The tracking must live outside the try, or the catch cannot see it.
  const tryIndex = controller.indexOf('exports.postEventRegistration');
  const declIndex = controller.indexOf("let reservedCategoryId = ''", tryIndex);
  const openTry = controller.indexOf('try {', tryIndex);
  assert.ok(declIndex < openTry, 'reservation tracking must be declared before the try block');
});

test('cancelling gives the slot back explicitly', () => {
  // The old count-based check did this implicitly by no longer counting the row.
  assert.match(cancellation, /releaseCategorySlot\(registration\.eventId, categoryId\)/);
  assert.match(cancellation, /has to be explicit too/);
});

test('the old count-then-insert is gone from the registration path', () => {
  assert.doesNotMatch(controller, /filledSlots >= selectedCategory\.slots/);
  assert.match(controller, /reserveCategorySlot\(event\._id, resolvedPrice\.raceCategoryId\)/);
});

test('reserved has no schema default, so untracked stays distinguishable from zero', () => {
  assert.match(eventModel, /reserved: \{ type: Number, min: 0 \}/);
  assert.doesNotMatch(eventModel, /reserved: \{ type: Number, min: 0, default/);
});

test('the backfill recounts rather than adjusts, so it is safe to re-run', () => {
  assert.match(backfill, /--dry-run/);
  assert.match(backfill, /\$set: \{ 'raceCategories\.\$\.reserved': filled \}/);
  assert.doesNotMatch(backfill, /\$inc/);
  assert.match(backfill, /Safe to run\s*\n \* repeatedly/);
});
