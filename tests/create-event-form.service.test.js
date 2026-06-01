const test = require('node:test');
const assert = require('node:assert/strict');

const {
  applyEventFormData,
  getCreateEventFormData,
  getCreateEventFormDataFromEvent,
  getEventReadinessChecklist,
  getEventReviewSummary,
  validateCreateEventForm
} = require('../src/services/event-form.service');

function buildPublishPayload(overrides = {}) {
  return {
    title: 'Paid Pricing Event',
    organiserName: 'HelloRun Test',
    description: 'A complete event description for publish validation.',
    eventType: 'virtual',
    raceDistanceCustom: '5K',
    registrationOpenAt: '2026-06-01T00:00',
    registrationCloseAt: '2026-06-10T00:00',
    eventStartAt: '2026-06-11T00:00',
    eventEndAt: '2026-06-12T00:00',
    virtualStartAt: '2026-06-11T00:00',
    virtualEndAt: '2026-06-12T00:00',
    proofTypesAllowed: ['running_app_sync', 'photo'],
    virtualCompletionMode: 'single_activity',
    acceptedRunTypes: ['run'],
    feeMode: 'paid',
    feeCurrency: 'PHP',
    paymentQrImageUrl: 'https://example.com/payment-qr.png',
    paymentAccountName: 'HelloRun Payments',
    actionType: 'publish',
    ...overrides
  };
}

test('create-event form maps legacy gps proof to running app sync', () => {
  const formData = getCreateEventFormData({
    proofTypesAllowed: ['gps', 'photo', 'gps', 'manual']
  });

  assert.deepEqual(formData.proofTypesAllowed, ['running_app_sync', 'photo', 'manual']);
});

test('create-event form derives accumulated target from distance labels and ignores manual targetDistanceKm', () => {
  const formData = getCreateEventFormData({
    eventType: 'virtual',
    raceDistanceCustom: '100K',
    virtualCompletionMode: 'accumulated_distance',
    targetDistanceKm: '999'
  });

  assert.equal(formData.targetDistanceKm, 100);
});

test('create-event form derives accumulated target from structured category distance', () => {
  const formData = getCreateEventFormData({
    eventType: 'virtual',
    virtualCompletionMode: 'accumulated_distance',
    raceCategoryName: '100K Challenge',
    raceCategoryDistanceLabel: '100K Challenge',
    raceCategoryDistanceKm: '100'
  });

  assert.equal(formData.targetDistanceKm, 100);
});

test('edit form restores accumulated target from category distance when stored target is missing', () => {
  const formData = getCreateEventFormDataFromEvent({
    title: 'Accumulated Challenge',
    eventType: 'virtual',
    virtualCompletionMode: 'accumulated_distance',
    raceDistances: ['100K Challenge'],
    raceCategories: [
      {
        categoryId: 'cat-100k-challenge',
        name: '100K Challenge',
        distanceLabel: '100K Challenge',
        distanceKm: 100
      }
    ]
  });

  assert.equal(formData.targetDistanceKm, 100);
});

test('create-event form maps legacy pricing modes to current pricing modes', () => {
  assert.equal(getCreateEventFormData({ feeMode: 'paid', pricingMode: 'same_fee' }).pricingMode, 'customized_options');
  assert.equal(getCreateEventFormData({ feeMode: 'paid', pricingMode: 'per_distance' }).pricingMode, 'distance_based');
  assert.equal(getCreateEventFormData({ feeMode: 'paid', pricingMode: 'per_distance_period' }).pricingMode, 'distance_based_period');
});

test('create-event form normalizes optional public posting date', () => {
  const blank = getCreateEventFormData();
  assert.equal(blank.publicListingAvailableAt, '');

  const formData = getCreateEventFormData({
    publicListingAvailableAt: '2026-06-01T08:30'
  });
  assert.equal(formData.publicListingAvailableAt, '2026-06-01T08:30');
});

test('publish validation rejects invalid or too-late public posting date', () => {
  const invalid = validateCreateEventForm(getCreateEventFormData(buildPublishPayload({
    publicListingAvailableAt: 'not-a-date'
  })));
  assert.equal(invalid.publicListingAvailableAt, 'Invalid date format.');

  const tooLate = validateCreateEventForm(getCreateEventFormData(buildPublishPayload({
    publicListingAvailableAt: '2026-06-10T00:01'
  })));
  assert.equal(tooLate.publicListingAvailableAt, 'Public posting date must be on or before registration close.');
});

test('applyEventFormData persists public posting date', () => {
  const event = { waiverTemplate: '' };
  const formData = getCreateEventFormData(buildPublishPayload({
    feeMode: 'free',
    paymentQrImageUrl: '',
    paymentAccountName: '',
    publicListingAvailableAt: '2026-06-02T09:15'
  }));

  applyEventFormData(event, formData, null);

  assert.equal(event.publicListingAvailableAt.toISOString(), new Date('2026-06-02T09:15').toISOString());
});

test('customized paid pricing requires runner-selectable option amount and description for publish', () => {
  const missingOption = getCreateEventFormData(buildPublishPayload({
    pricingMode: 'customized_options'
  }));
  const missingOptionErrors = validateCreateEventForm(missingOption);

  assert.equal(missingOptionErrors.customizedOptions, 'Add at least one custom signup option for paid customized pricing.');

  const missingDescription = getCreateEventFormData(buildPublishPayload({
    pricingMode: 'customized_options',
    customizedOptionAmount: ['850']
  }));
  const missingDescriptionErrors = validateCreateEventForm(missingDescription);

  assert.equal(missingDescriptionErrors.customizedOptionShortDescription0, 'Custom signup option description is required.');

  const valid = getCreateEventFormData(buildPublishPayload({
    pricingMode: 'customized_options',
    customizedOptionShortDescription: ['5K - Medal + Shirt + Race Kit'],
    customizedOptionAmount: ['850']
  }));
  const validErrors = validateCreateEventForm(valid);

  assert.equal(validErrors.customizedOptions, undefined);
  assert.equal(validErrors.customizedOptionShortDescription0, undefined);
  assert.equal(validErrors.customizedOptionAmount0, undefined);
});

test('distance-based paid pricing requires amount per selected distance for publish', () => {
  const missingAmount = getCreateEventFormData(buildPublishPayload({
    pricingMode: 'distance_based',
    raceDistanceCustom: '5K, 10K',
    distancePricingLabel: ['5K'],
    distancePricingAmount: ['500']
  }));
  const missingAmountErrors = validateCreateEventForm(missingAmount);

  assert.equal(missingAmountErrors.distancePricing, 'Add a positive amount for each paid distance.');

  const valid = getCreateEventFormData(buildPublishPayload({
    pricingMode: 'distance_based',
    raceDistanceCustom: '5K, 10K',
    distancePricingLabel: ['5K', '10K'],
    distancePricingAmount: ['500', '750']
  }));
  const validErrors = validateCreateEventForm(valid);

  assert.equal(validErrors.distancePricing, undefined);
});

test('structured race categories derive legacy distances and category-backed pricing', () => {
  const formData = getCreateEventFormData(buildPublishPayload({
    pricingMode: 'distance_based',
    raceDistanceCustom: '',
    raceCategoryId: ['cat-5k', 'cat-kids'],
    raceCategoryName: ['5K Open', 'Kids Dash'],
    raceCategoryType: ['distance', 'open'],
    raceCategoryDistanceLabel: ['5K', 'Kids Dash'],
    raceCategoryDistanceKm: ['5', '1'],
    raceCategorySlots: ['100', '50'],
    raceCategoryCutoffTime: ['1 hour', '20 minutes'],
    raceCategoryAgeGroup: ['Open', '12 and below'],
    raceCategoryRewardsDescription: ['Medal', 'Ribbon'],
    distancePricingCategoryId: ['cat-5k', 'cat-kids'],
    distancePricingLabel: ['5K', 'Kids Dash'],
    distancePricingAmount: ['500', '250']
  }));
  const errors = validateCreateEventForm(formData);
  const event = { waiverTemplate: '' };

  assert.deepEqual(formData.raceDistances, ['5K', 'KIDS DASH']);
  assert.equal(formData.raceCategories[1].categoryId, 'cat-kids');
  assert.equal(formData.distancePricing[1].categoryId, 'cat-kids');
  assert.equal(errors.distancePricing, undefined);

  applyEventFormData(event, formData, { firstName: 'Test', lastName: 'Organizer' });

  assert.deepEqual(event.raceDistances, ['5K', 'KIDS DASH']);
  assert.equal(event.raceCategories[0].name, '5K Open');
  assert.equal(event.raceCategories[1].distanceLabel, 'KIDS DASH');
  assert.equal(event.distancePricing[1].categoryId, 'cat-kids');
});

test('race category presets include marathon distance and numeric custom labels normalize', () => {
  const formData = getCreateEventFormData(buildPublishPayload({
    feeMode: 'free',
    paymentQrImageUrl: '',
    paymentAccountName: '',
    raceDistanceCustom: '',
    raceCategoryName: ['42K', 'Custom Ten'],
    raceCategoryType: ['distance', 'distance'],
    raceCategoryDistanceLabel: ['42K', '10 km'],
    raceCategoryDistanceKm: ['42', '10']
  }));

  assert.deepEqual(formData.raceDistances, ['42K', '10K']);
  assert.equal(formData.raceCategories[0].distanceKm, 42);
  assert.equal(formData.raceCategories[1].distanceLabel, '10K');
});

test('race category normalization repairs duplicate ids and validation rejects ambiguous labels', () => {
  const duplicateIdForm = getCreateEventFormData(buildPublishPayload({
    feeMode: 'free',
    paymentQrImageUrl: '',
    paymentAccountName: '',
    raceDistanceCustom: '',
    raceCategoryId: ['cat-5k', 'cat-5k'],
    raceCategoryName: ['5K Open', '10K Open'],
    raceCategoryDistanceLabel: ['5K', '10K']
  }));
  const duplicateIds = validateCreateEventForm(duplicateIdForm);
  const normalizedIds = duplicateIdForm.raceCategories.map((category) => category.categoryId);
  assert.equal(new Set(normalizedIds).size, normalizedIds.length);
  assert.equal(duplicateIds.raceCategoryName1, undefined);

  const duplicateNames = validateCreateEventForm(getCreateEventFormData(buildPublishPayload({
    feeMode: 'free',
    paymentQrImageUrl: '',
    paymentAccountName: '',
    raceDistanceCustom: '',
    raceCategoryName: ['Open', 'Open'],
    raceCategoryDistanceLabel: ['5K', '10K']
  })));
  assert.equal(duplicateNames.raceCategoryName1, 'Race category display names must be unique.');

  const duplicateDistances = validateCreateEventForm(getCreateEventFormData(buildPublishPayload({
    feeMode: 'free',
    paymentQrImageUrl: '',
    paymentAccountName: '',
    raceDistanceCustom: '',
    raceCategoryName: ['5K Open', '5K Elite'],
    raceCategoryDistanceLabel: ['5K', '5K']
  })));
  assert.equal(duplicateDistances.raceCategoryName1, 'Race category distance labels must be unique for registration and pricing.');
});

test('package-period pricing normalizes stable package ids and validates publish readiness', () => {
  const missingPackagePrice = getCreateEventFormData(buildPublishPayload({
    pricingMode: 'package_period',
    registrationPackageName: ['Medal + Shirt'],
    registrationPackageRegularStartAt: ['2026-06-01T00:00'],
    registrationPackageRegularEndAt: ['2026-06-10T00:00']
  }));
  const missingPackagePriceErrors = validateCreateEventForm(missingPackagePrice);

  assert.equal(missingPackagePrice.registrationPackages[0].packageId, 'pkg-1-medal-shirt');
  assert.equal(missingPackagePriceErrors.registrationPackages, 'Add at least one positive package price for each paid registration package.');

  const valid = getCreateEventFormData(buildPublishPayload({
    pricingMode: 'package_period',
    registrationPackageId: ['pkg-medal-shirt'],
    registrationPackageName: ['Medal + Shirt'],
    registrationPackageRegularStartAt: ['2026-06-01T00:00'],
    registrationPackageRegularEndAt: ['2026-06-10T00:00'],
    registrationPackageRegularAmount: ['999']
  }));
  const validErrors = validateCreateEventForm(valid);
  const readiness = getEventReadinessChecklist(valid);
  const event = { waiverTemplate: '' };

  assert.equal(valid.registrationPackages[0].packageId, 'pkg-medal-shirt');
  assert.equal(validErrors.registrationPackages, undefined);
  assert.equal(readiness.items.find((item) => item.id === 'registrationPackages').ok, true);

  applyEventFormData(event, valid, { firstName: 'Test', lastName: 'Organizer' });

  assert.equal(event.pricingMode, 'package_period');
  assert.equal(event.registrationPackages[0].packageId, 'pkg-medal-shirt');
  assert.equal(event.registrationPackages[0].pricingPeriods[0].amount, 999);
});

test('event readiness checklist mirrors backend publish validation', () => {
  const formData = getCreateEventFormData(buildPublishPayload({
    pricingMode: 'distance_based',
    paymentQrImageUrl: '',
    paymentAccountName: '',
    distancePricingLabel: ['5K'],
    distancePricingAmount: ['500']
  }));
  const readiness = getEventReadinessChecklist(formData);

  assert.equal(readiness.ready, false);
  assert.equal(readiness.items.find((item) => item.id === 'paymentQr').ok, false);
  assert.equal(readiness.items.find((item) => item.id === 'paymentAccountName').ok, false);
  assert.equal(readiness.errors.paymentQrImageUrl, 'Payment QR image is required before submitting a paid event for review.');
  assert.equal(readiness.errors.paymentAccountName, 'Payment account name is required before submitting a paid event for review.');
});

test('event review summary includes categories, pricing, payment, rewards, and content', () => {
  const formData = getCreateEventFormData(buildPublishPayload({
    pricingMode: 'distance_based',
    raceCategoryId: ['cat-10k'],
    raceCategoryName: ['10K Open'],
    raceCategoryType: ['distance'],
    raceCategoryDistanceLabel: ['10K'],
    distancePricingCategoryId: ['cat-10k'],
    distancePricingLabel: ['10K'],
    distancePricingAmount: ['750'],
    eventDetailsMarkdown: '<p>Detailed race rules and instructions for runners.</p>',
    physicalRewardsEnabled: '1',
    physicalRewardMedalEnabled: '1',
    physicalRewardsDescription: 'Medal for finishers.'
  }));
  const summary = getEventReviewSummary(formData);
  const eventCard = summary.find((card) => card.title === 'Event');
  const pricingCard = summary.find((card) => card.title === 'Pricing');
  const rewardsCard = summary.find((card) => card.title === 'Rewards');
  const contentCard = summary.find((card) => card.title === 'Content');

  assert.match(eventCard.rows.find((row) => row.label === 'Categories').value, /10K Open/);
  assert.match(pricingCard.rows.find((row) => row.label === 'Options').value, /PHP 750\.00/);
  assert.match(rewardsCard.rows.find((row) => row.label === 'Physical').value, /Medal/);
  assert.match(contentCard.rows.find((row) => row.label === 'Details').value, /plain-text chars/);
});

test('period distance pricing requires valid non-overlapping registration windows', () => {
  const outsideWindow = getCreateEventFormData(buildPublishPayload({
    pricingMode: 'distance_based_period',
    raceDistanceCustom: '5K',
    pricingPeriodEarlyBirdStartAt: '2026-05-31T00:00',
    pricingPeriodEarlyBirdEndAt: '2026-06-05T00:00',
    distancePricingLabel: ['5K'],
    distancePricingEarlyBirdAmount: ['400']
  }));
  const outsideWindowErrors = validateCreateEventForm(outsideWindow);

  assert.equal(outsideWindowErrors.pricingPeriods, 'Distance pricing periods must start within the registration window.');

  const overlapping = getCreateEventFormData(buildPublishPayload({
    pricingMode: 'distance_based_period',
    raceDistanceCustom: '5K',
    pricingPeriodEarlyBirdStartAt: '2026-06-01T00:00',
    pricingPeriodEarlyBirdEndAt: '2026-06-06T00:00',
    pricingPeriodRegularStartAt: '2026-06-05T00:00',
    pricingPeriodRegularEndAt: '2026-06-10T00:00',
    distancePricingLabel: ['5K'],
    distancePricingEarlyBirdAmount: ['400'],
    distancePricingRegularAmount: ['500']
  }));
  const overlappingErrors = validateCreateEventForm(overlapping);

  assert.equal(overlappingErrors.pricingPeriods, 'Distance pricing periods cannot overlap.');

  const valid = getCreateEventFormData(buildPublishPayload({
    pricingMode: 'distance_based_period',
    raceDistanceCustom: '5K',
    pricingPeriodEarlyBirdStartAt: '2026-06-01T00:00',
    pricingPeriodEarlyBirdEndAt: '2026-06-05T00:00',
    pricingPeriodRegularStartAt: '2026-06-05T00:00',
    pricingPeriodRegularEndAt: '2026-06-10T00:00',
    distancePricingLabel: ['5K'],
    distancePricingEarlyBirdAmount: ['400'],
    distancePricingRegularAmount: ['500']
  }));
  const validErrors = validateCreateEventForm(valid);

  assert.equal(validErrors.pricingPeriods, undefined);
  assert.equal(validErrors.distancePricing, undefined);
});

test('applyEventFormData persists current proof, pricing, and customized options values', () => {
  const event = { waiverTemplate: '' };
  const formData = getCreateEventFormData(buildPublishPayload({
    pricingMode: 'customized_options',
    proofTypesAllowed: ['gps'],
    customizedOptionShortDescription: ['5K - Medal + Shirt + Race Kit'],
    customizedOptionAmount: ['850']
  }));

  applyEventFormData(event, formData, { firstName: 'Test', lastName: 'Organizer' });

  assert.deepEqual(event.proofTypesAllowed, ['running_app_sync']);
  assert.equal(event.pricingMode, 'customized_options');
  assert.deepEqual(event.customizedOptions, [
    { shortDescription: '5K - Medal + Shirt + Race Kit', amount: 850 }
  ]);
  assert.equal(event.targetDistanceKm, null);
});

test('applyEventFormData persists distance pricing periods for period mode', () => {
  const event = { waiverTemplate: '' };
  const formData = getCreateEventFormData(buildPublishPayload({
    pricingMode: 'distance_based_period',
    raceDistanceCustom: '5K',
    pricingPeriodEarlyBirdStartAt: '2026-06-01T00:00',
    pricingPeriodEarlyBirdEndAt: '2026-06-05T00:00',
    pricingPeriodRegularStartAt: '2026-06-05T00:00',
    pricingPeriodRegularEndAt: '2026-06-10T00:00',
    distancePricingLabel: ['5K'],
    distancePricingEarlyBirdAmount: ['400'],
    distancePricingRegularAmount: ['500']
  }));

  applyEventFormData(event, formData, { firstName: 'Test', lastName: 'Organizer' });

  assert.equal(event.pricingMode, 'distance_based_period');
  assert.deepEqual(event.pricingPeriods.map((period) => period.code), ['early_bird', 'regular']);
  assert.equal(event.pricingPeriods[0].startAt instanceof Date, true);
});
