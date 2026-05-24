const test = require('node:test');
const assert = require('node:assert/strict');

const {
  getCustomizedRegistrationOptions,
  getRegistrationPackageOptions,
  getRaceCategoryOptions,
  resolveRegistrationPrice
} = require('../src/services/registration-price.service');

test('registration price resolver returns runner-selected customized option snapshot', () => {
  const event = {
    feeMode: 'paid',
    pricingMode: 'customized_options',
    feeCurrency: 'PHP',
    customizedOptions: [
      { _id: 'option-5k', shortDescription: '5K - Medal + Shirt + Race Kit', amount: 850 },
      { _id: 'option-10k', shortDescription: '10K - Medal + Shirt + Race Kit', amount: 1050 }
    ]
  };

  const result = resolveRegistrationPrice(event, { customizedOptionId: 'option-10k' });

  assert.equal(result.ok, true);
  assert.equal(result.pricingMode, 'customized_options');
  assert.equal(result.source, 'customized_option');
  assert.equal(result.selectedOptionId, 'option-10k');
  assert.equal(result.label, '10K - Medal + Shirt + Race Kit');
  assert.equal(result.amount, 1050);
  assert.equal(result.currency, 'PHP');
});

test('registration price resolver rejects missing customized option selection', () => {
  const result = resolveRegistrationPrice({
    feeMode: 'paid',
    pricingMode: 'customized_options',
    customizedOptions: [
      { _id: 'option-5k', shortDescription: '5K - Medal + Shirt + Race Kit', amount: 850 }
    ]
  }, {});

  assert.equal(result.ok, false);
  assert.equal(result.errorField, 'customizedOptionId');
});

test('registration price resolver handles distance based event pricing', () => {
  const result = resolveRegistrationPrice({
    feeMode: 'paid',
    pricingMode: 'distance_based',
    feeCurrency: 'PHP',
    distancePricing: [
      { distance: '5K', amount: 500 },
      { distance: '10K', amount: 750 }
    ]
  }, { raceDistance: '10K' });

  assert.equal(result.ok, true);
  assert.equal(result.source, 'distance_based');
  assert.equal(result.label, '10K');
  assert.equal(result.amount, 750);
});

test('registration price resolver preserves structured race category identity', () => {
  const result = resolveRegistrationPrice({
    feeMode: 'paid',
    pricingMode: 'distance_based',
    feeCurrency: 'PHP',
    raceCategories: [
      {
        categoryId: 'cat-open-10k',
        name: '10K Open',
        type: 'distance',
        distanceLabel: '10K'
      }
    ],
    distancePricing: [
      { categoryId: 'cat-open-10k', distance: '10K', amount: 750 }
    ]
  }, { raceDistance: '10K' });

  assert.equal(result.ok, true);
  assert.equal(result.source, 'distance_based');
  assert.equal(result.raceCategoryId, 'cat-open-10k');
  assert.equal(result.raceCategoryName, '10K Open');
  assert.equal(result.raceCategoryType, 'distance');
  assert.equal(result.amount, 750);
});

test('race category options omit empty rows', () => {
  const options = getRaceCategoryOptions({
    raceCategories: [
      { categoryId: 'cat-5k', name: '5K Open', type: 'distance', distanceLabel: '5K' },
      { categoryId: 'empty' }
    ]
  });

  assert.deepEqual(options, [
    {
      id: 'cat-5k',
      name: '5K Open',
      type: 'distance',
      distanceLabel: '5K'
    }
  ]);
});

test('registration price resolver uses active distance pricing period', () => {
  const event = {
    feeMode: 'paid',
    pricingMode: 'distance_based_period',
    feeCurrency: 'PHP',
    pricingPeriods: [
      {
        label: 'Early Bird',
        code: 'early_bird',
        startAt: '2026-06-01T00:00:00.000Z',
        endAt: '2026-06-05T00:00:00.000Z'
      },
      {
        label: 'Regular',
        code: 'regular',
        startAt: '2026-06-05T00:00:00.000Z',
        endAt: '2026-06-10T00:00:00.000Z'
      }
    ],
    distancePricing: [
      { distance: '5K', earlyBirdAmount: 400, regularAmount: 500 }
    ]
  };

  const result = resolveRegistrationPrice(event, { raceDistance: '5K' }, {
    now: new Date('2026-06-03T00:00:00.000Z')
  });

  assert.equal(result.ok, true);
  assert.equal(result.amount, 400);
  assert.equal(result.pricingPeriodCode, 'early_bird');
  assert.equal(result.pricingPeriodLabel, 'Early Bird');
});

test('registration price resolver rejects period pricing outside active windows', () => {
  const result = resolveRegistrationPrice({
    feeMode: 'paid',
    pricingMode: 'distance_based_period',
    pricingPeriods: [
      {
        label: 'Regular',
        code: 'regular',
        startAt: '2026-06-05T00:00:00.000Z',
        endAt: '2026-06-10T00:00:00.000Z'
      }
    ],
    distancePricing: [
      { distance: '5K', regularAmount: 500 }
    ]
  }, { raceDistance: '5K' }, {
    now: new Date('2026-06-03T00:00:00.000Z')
  });

  assert.equal(result.ok, false);
  assert.equal(result.errorField, 'pricing');
});

test('registration price resolver uses active package pricing period', () => {
  const event = {
    feeMode: 'paid',
    pricingMode: 'package_period',
    feeCurrency: 'PHP',
    registrationPackages: [
      {
        packageId: 'pkg-medal-shirt',
        name: 'Medal + Shirt',
        includedItems: { medal: true, shirt: true },
        pricingPeriods: [
          {
            label: 'Early Bird',
            code: 'early_bird',
            startAt: '2026-06-01T00:00:00.000Z',
            endAt: '2026-06-05T00:00:00.000Z',
            amount: 899
          },
          {
            label: 'Regular',
            code: 'regular',
            startAt: '2026-06-05T00:00:00.000Z',
            endAt: '2026-06-10T00:00:00.000Z',
            amount: 999
          }
        ]
      }
    ]
  };

  const result = resolveRegistrationPrice(event, { registrationPackageId: 'pkg-medal-shirt' }, {
    now: new Date('2026-06-03T00:00:00.000Z')
  });

  assert.equal(result.ok, true);
  assert.equal(result.source, 'registration_package');
  assert.equal(result.packageId, 'pkg-medal-shirt');
  assert.equal(result.packageName, 'Medal + Shirt');
  assert.deepEqual(result.packageIncludedItems, ['Medal', 'Shirt']);
  assert.equal(result.amount, 899);
  assert.equal(result.pricingPeriodCode, 'early_bird');
  assert.equal(result.pricingPeriodLabel, 'Early Bird');
});

test('registration price resolver rejects missing or inactive package pricing', () => {
  const event = {
    feeMode: 'paid',
    pricingMode: 'package_period',
    registrationPackages: [
      {
        packageId: 'pkg-medal-shirt',
        name: 'Medal + Shirt',
        pricingPeriods: [
          {
            label: 'Regular',
            code: 'regular',
            startAt: '2026-06-05T00:00:00.000Z',
            endAt: '2026-06-10T00:00:00.000Z',
            amount: 999
          }
        ]
      }
    ]
  };

  const missing = resolveRegistrationPrice(event, {}, { now: new Date('2026-06-06T00:00:00.000Z') });
  const inactive = resolveRegistrationPrice(event, { registrationPackageId: 'pkg-medal-shirt' }, {
    now: new Date('2026-06-03T00:00:00.000Z')
  });

  assert.equal(missing.ok, false);
  assert.equal(missing.errorField, 'registrationPackageId');
  assert.equal(inactive.ok, false);
  assert.equal(inactive.errorField, 'registrationPackageId');
});

test('registration package options omit incomplete rows', () => {
  const options = getRegistrationPackageOptions({
    registrationPackages: [
      { packageId: 'pkg-valid', name: 'Medal + Shirt', includedItems: { medal: true, otherItemNames: ['Sticker'] } },
      { packageId: 'missing-name', name: '' }
    ]
  });

  assert.deepEqual(options, [
    {
      id: 'pkg-valid',
      name: 'Medal + Shirt',
      includedItems: ['Medal', 'Sticker'],
      pricingPeriods: []
    }
  ]);
});

test('registration price resolver treats paid legacy free pricing mode as distance based fallback', () => {
  const result = resolveRegistrationPrice({
    feeMode: 'paid',
    pricingMode: 'free',
    feeAmount: 380,
    feeCurrency: 'PHP'
  }, { raceDistance: '5K' });

  assert.equal(result.ok, true);
  assert.equal(result.pricingMode, 'distance_based');
  assert.equal(result.source, 'distance_based');
  assert.equal(result.amount, 380);
});

test('customized registration options omit incomplete rows', () => {
  const options = getCustomizedRegistrationOptions({
    feeCurrency: 'PHP',
    customizedOptions: [
      { _id: 'valid', shortDescription: 'Virtual 100K - Digital Badge Only', amount: 300 },
      { _id: 'missing-description', shortDescription: '', amount: 100 },
      { _id: 'missing-amount', shortDescription: 'No amount' }
    ]
  });

  assert.deepEqual(options, [
    {
      id: 'valid',
      shortDescription: 'Virtual 100K - Digital Badge Only',
      amount: 300,
      currency: 'PHP'
    }
  ]);
});
