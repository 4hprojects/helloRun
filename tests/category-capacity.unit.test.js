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
  assert.doesNotMatch(backfill, /\$inc/);
  assert.match(backfill, /Safe to run repeatedly/);
  // The counting lives in the service and is shared with the repair path. The script used
  // to carry its own copy, which is how the service function became dead code.
  assert.match(backfill, /recountCategoryReservations\(event\._id, \{ dryRun \}\)/);
  assert.doesNotMatch(backfill, /countDocuments/, 'the script must not re-implement the query');
  assert.match(service, /\$set: \{ 'raceCategories\.\$\.reserved': filled \}/);
});

test('the recount matches every shape the identifier has ever had', () => {
  // Slug for rows written today; the subdocument _id for rows written while
  // getRaceCategoryOptions preferred it — those matched nothing, which is why capacity was
  // a no-op; and a bare distance label for the rows that never resolved a category at all.
  assert.match(service, /function buildCategoryOccupancyQuery/);
  assert.match(service, /if \(category\._id\) byId\.push/);
  assert.match(service, /'pricingSnapshot\.raceDistance': exact/);
  // A label is free text and must not be read as a regular expression.
  assert.match(service, /label\.replace\(/);
  // The status filter is unchanged, so the number keeps meaning what it meant.
  assert.match(service, /status: \{ \$in: \['confirmed'\] \}/);
  assert.match(service, /paymentStatus: \{ \$nin: \['refunded'\] \}/);
});

test('a capped category with no id is reported rather than silently skipped', () => {
  // It cannot be claimed against either, so the organiser has to re-save the event.
  assert.match(service, /unidentifiable: true/);
  assert.match(backfill, /cannot be counted or claimed against/);
});

// --- The identifier that made all of this a no-op ------------------------------------------

test('a category is identified by its slug, never by the subdocument _id', () => {
  // Mongoose re-mints `_id` on every organiser save, so a counter or a snapshot keyed on it
  // drifts. With `_id` winning, reserveCategorySlot could never match and capacity was
  // silently unenforced on every event — as were the five other consumers that compare
  // pricingSnapshot.raceCategoryId against the slug.
  const { getRaceCategoryOptions } = require('../src/services/registration-price.service');
  const options = getRaceCategoryOptions({
    raceCategories: [{ _id: 'aaaaaaaaaaaaaaaaaaaaaaaa', categoryId: 'cat-1-5k', name: '5K', distanceLabel: '5K' }]
  });
  assert.equal(options[0].id, 'cat-1-5k');

  // _id remains the fallback for a category written without a slug.
  const legacy = getRaceCategoryOptions({
    raceCategories: [{ _id: 'bbbbbbbbbbbbbbbbbbbbbbbb', name: '10K', distanceLabel: '10K' }]
  });
  assert.equal(legacy[0].id, 'bbbbbbbbbbbbbbbbbbbbbbbb');
});

test('every pricing branch resolves the category, not just distance-based', () => {
  // Only distance_based used to set raceCategoryId, so a free event — or one priced by
  // signup option or package — reserved nothing and its slots were decoration.
  const { resolveRegistrationPrice, getCustomizedRegistrationOptions } = require('../src/services/registration-price.service');
  const categories = [{ categoryId: 'cat-1-5k', name: '5K', distanceLabel: '5K', slots: 10 }];
  const base = { raceCategories: categories, raceDistances: ['5K'], feeCurrency: 'PHP' };
  const form = { raceDistance: '5K' };

  assert.equal(resolveRegistrationPrice({ ...base, feeMode: 'free' }, form).raceCategoryId, 'cat-1-5k');
  assert.equal(
    resolveRegistrationPrice({ ...base, feeMode: 'paid', pricingMode: 'distance_based', feeAmount: 100 }, form).raceCategoryId,
    'cat-1-5k'
  );

  const optionEvent = {
    ...base,
    feeMode: 'paid',
    pricingMode: 'customized_options',
    customizedOptions: [{ shortDescription: 'Standard', amount: 100 }]
  };
  const optionId = getCustomizedRegistrationOptions(optionEvent)[0].id;
  const priced = resolveRegistrationPrice(optionEvent, { ...form, customizedOptionId: optionId });
  assert.equal(priced.raceCategoryId, 'cat-1-5k');
  assert.equal(priced.amount, 100, 'the amount logic must be untouched');

  // An event with no categories still yields '' and behaves exactly as before.
  assert.equal(resolveRegistrationPrice({ feeMode: 'free', raceCategories: [] }, form).raceCategoryId, '');
  assert.equal(resolveRegistrationPrice({ ...base, feeMode: 'free' }, {}).raceCategoryId, '');
});

test('the capacity counter survives an organiser saving an unrelated field', () => {
  // `reserved` is not on the form, so a plain overwrite handed a full category its capacity
  // back on every save — the same failure mergeKitInventory exists to prevent for stock.
  const { mergeRaceCategories } = require('../src/services/event-form.service');
  const merged = mergeRaceCategories(
    [
      { categoryId: 'cat-1-5k', name: '5K', slots: 20, targetSteps: null },
      { categoryId: 'cat-9-new', name: 'New', slots: 5, targetSteps: null }
    ],
    [{ categoryId: 'cat-1-5k', name: '5K', slots: 10, reserved: 7, targetSteps: 5000 }]
  );

  assert.equal(merged[0].reserved, 7, 'the counter must survive');
  assert.equal(merged[0].slots, 20, 'the submitted edit must still apply');
  assert.equal(merged[0].targetSteps, 5000, 'the step goal is carried the same way');
  assert.ok(!('reserved' in merged[1]), 'a new category starts untracked, not at zero');

  const untracked = mergeRaceCategories([{ categoryId: 'c', slots: 5 }], [{ categoryId: 'c', slots: 5 }]);
  assert.ok(!('reserved' in untracked[0]), 'absent stays absent — it means "never tracked"');
});

test('a full category is unavailable on the form, not discovered on submit', () => {
  const { buildDistanceChoices } = require('../src/services/registration-page-presentation.service');
  const choices = buildDistanceChoices({
    allowedRaceDistances: ['5K', '10K', '21K'],
    raceCategoryOptions: [
      { id: 'cat-1-5k', name: '5K', distanceLabel: '5K', slots: 10, reserved: 10 },
      { id: 'cat-2-10k', name: '10K', distanceLabel: '10K', slots: 10, reserved: 8 },
      { id: 'cat-3-21k', name: '21K', distanceLabel: '21K', slots: null, reserved: 0 }
    ],
    isFree: true
  });
  const by = (value) => choices.find((choice) => choice.value === value);

  assert.equal(by('5K').available, false);
  assert.equal(by('5K').isFull, true);
  // An uncapped category can never be full, however many people are in it.
  assert.equal(by('21K').isFull, false);
  assert.equal(by('21K').remaining, null);
  // Said only when it is nearly gone; a healthy count is noise.
  assert.match(by('10K').helper, /2 slots left/);
  assert.doesNotMatch(by('21K').helper, /left/);

  // The view disables it and labels it, and points at the waitlist where there is one.
  const view = read('src/views/pages/event-register.ejs');
  assert.match(view, /distance\.isFull \? 'Full'/);
  assert.match(view, /distance\.available \? '' : 'disabled'/);
  assert.match(view, /Join its waitlist/);
});
