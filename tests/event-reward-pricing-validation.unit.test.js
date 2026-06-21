const test = require('node:test');
const assert = require('node:assert/strict');

const { validateRewardPricingConsistency } = require('../src/services/event-form.service');

function baseFormData(overrides = {}) {
  return {
    raceCategories: [
      { categoryId: 'cat-5k', name: '5K Run', distanceKm: 5 },
      { categoryId: 'cat-10k', name: '10K Run', distanceKm: 10 }
    ],
    distancePricing: [
      { categoryId: 'cat-5k', amount: 300 },
      { categoryId: 'cat-10k', amount: 400 }
    ],
    feeMode: 'paid',
    deliveryFeeEnabled: false,
    physicalRewardsEnabled: false,
    ...overrides
  };
}

test('valid event returns no errors and no warnings', () => {
  const { errors, warnings } = validateRewardPricingConsistency(baseFormData());
  assert.deepEqual(errors, {});
  assert.deepEqual(warnings, {});
});

test('duplicate categoryId in raceCategories returns error', () => {
  const formData = baseFormData({
    raceCategories: [
      { categoryId: 'cat-5k', name: '5K Run', distanceKm: 5 },
      { categoryId: 'cat-5k', name: '5K Fun Run', distanceKm: 5 }
    ]
  });
  const { errors } = validateRewardPricingConsistency(formData);
  assert.ok(errors.raceCategories, 'expected raceCategories error for duplicate IDs');
  assert.match(errors.raceCategories, /duplicate/i);
});

test('distancePricing references missing categoryId returns error', () => {
  const formData = baseFormData({
    distancePricing: [
      { categoryId: 'cat-5k', amount: 300 },
      { categoryId: 'cat-ghost', amount: 500 }
    ]
  });
  const { errors } = validateRewardPricingConsistency(formData);
  assert.ok(errors.distancePricing, 'expected distancePricing error for missing category reference');
  assert.match(errors.distancePricing, /no longer exists/i);
});

test('delivery fee enabled without physical rewards returns warning not error', () => {
  const formData = baseFormData({
    deliveryFeeEnabled: true,
    physicalRewardsEnabled: false
  });
  const { errors, warnings } = validateRewardPricingConsistency(formData);
  assert.deepEqual(errors, {});
  assert.ok(warnings.deliveryFee, 'expected deliveryFee warning');
  assert.match(warnings.deliveryFee, /physical rewards are off/i);
});

test('free event with delivery fee returns warning not error', () => {
  const formData = baseFormData({
    feeMode: 'free',
    deliveryFeeEnabled: true,
    physicalRewardsEnabled: true
  });
  const { errors, warnings } = validateRewardPricingConsistency(formData);
  assert.deepEqual(errors, {});
  assert.ok(warnings.deliveryFeeFreeEvent, 'expected deliveryFeeFreeEvent warning');
  assert.match(warnings.deliveryFeeFreeEvent, /free event/i);
});

test('both errors return simultaneously', () => {
  const formData = baseFormData({
    raceCategories: [
      { categoryId: 'cat-5k', name: '5K', distanceKm: 5 },
      { categoryId: 'cat-5k', name: '5K Dupe', distanceKm: 5 }
    ],
    distancePricing: [{ categoryId: 'cat-ghost', amount: 999 }]
  });
  const { errors } = validateRewardPricingConsistency(formData);
  assert.ok(errors.raceCategories, 'expected raceCategories error');
  assert.ok(errors.distancePricing, 'expected distancePricing error');
});
