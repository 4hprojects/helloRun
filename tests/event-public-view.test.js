const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildPublicEventSeo,
  buildPublicEventView,
  renderEventDetailsContent
} = require('../src/utils/event-public-view');

test('renderEventDetailsContent preserves safe Quill HTML', () => {
  const html = renderEventDetailsContent('<h1>Challenge Details</h1><p>Earn a <strong>badge</strong>.</p><script>alert(1)</script>');

  assert.match(html, /<h1>Challenge Details<\/h1>/);
  assert.match(html, /<strong>badge<\/strong>/);
  assert.doesNotMatch(html, /script/);
  assert.doesNotMatch(html, /&lt;h1&gt;/);
});

test('renderEventDetailsContent still supports markdown input', () => {
  const html = renderEventDetailsContent('# Challenge Details\n\n- Run\n- Walk');

  assert.match(html, /<h1>Challenge Details<\/h1>/);
  assert.match(html, /<ul>/);
  assert.match(html, /<li>Run<\/li>/);
});

test('buildPublicEventView treats delivery-only paid setup as free base registration with optional cost', () => {
  const publicEvent = buildPublicEventView({
    title: '2026K Challenge',
    slug: '2026k-challenge',
    organiserName: 'helloRun',
    eventType: 'virtual',
    eventTypesAllowed: ['virtual'],
    raceDistances: ['2026K'],
    registrationOpenAt: '2026-01-01T00:00:00.000Z',
    registrationCloseAt: '2026-06-30T00:00:00.000Z',
    eventStartAt: '2026-01-01T00:00:00.000Z',
    eventEndAt: '2026-12-31T00:00:00.000Z',
    virtualCompletionMode: 'accumulated_distance',
    targetDistanceKm: 2026,
    feeMode: 'paid',
    feeAmount: null,
    finalEventFee: 100,
    suggestedEventFee: 100,
    feeCurrency: 'PHP',
    deliveryFeeEnabled: true,
    deliveryFeeAmount: 100
  }, {
    now: new Date('2026-05-13T00:00:00.000Z'),
    registrationCount: 42
  });

  assert.equal(publicEvent.pricing.label, 'Free base registration');
  assert.equal(publicEvent.pricing.amountLabel, 'Free to join');
  assert.equal(publicEvent.pricing.hasOptionalCosts, true);
  assert.equal(publicEvent.registrationState.canRegisterNow, true);
  assert.equal(publicEvent.targetDistanceLabel, '2,026 km');
  assert.equal(publicEvent.stats[0].value, '42');
});

test('buildPublicEventView surfaces packages as optional add-ons', () => {
  const publicEvent = buildPublicEventView({
    title: 'Package Event',
    slug: 'package-event',
    eventType: 'virtual',
    eventTypesAllowed: ['virtual'],
    feeMode: 'paid',
    feeCurrency: 'PHP',
    registrationPackages: [
      {
        name: 'Shirt Package',
        includedItems: { shirt: true },
        pricingPeriods: [{ label: 'Regular', amount: 499 }]
      }
    ]
  });

  assert.equal(publicEvent.pricing.label, 'Free base registration');
  assert.equal(publicEvent.packageOptions.length, 1);
  assert.equal(publicEvent.packageOptions[0].amountLabel, 'From PHP 499');
  assert.deepEqual(publicEvent.packageOptions[0].includedItems, ['Shirt']);
});

test('buildPublicEventView shows all race distances for non-accumulated events', () => {
  const publicEvent = buildPublicEventView({
    title: 'Multi Distance Race',
    slug: 'multi-distance-race',
    eventType: 'onsite',
    eventTypesAllowed: ['onsite'],
    raceDistances: ['3K', '5K', '10K'],
    virtualCompletionMode: 'single_activity',
    feeMode: 'free'
  });

  assert.deepEqual(publicEvent.raceDistances, ['3K', '5K', '10K']);
  assert.equal(publicEvent.distanceSummaryLabel, '3K, 5K, 10K');
  assert.equal(publicEvent.stats[1].label, 'Distances');
  assert.equal(publicEvent.stats[1].value, '3K, 5K, 10K');
});

test('buildPublicEventView shows accumulated registration options without duplicating the target stat', () => {
  const publicEvent = buildPublicEventView({
    title: 'Accumulated Race',
    slug: 'accumulated-race',
    eventType: 'virtual',
    eventTypesAllowed: ['virtual'],
    raceDistances: ['5K', '10K'],
    virtualCompletionMode: 'accumulated_distance',
    targetDistanceKm: 10,
    feeMode: 'free'
  });

  assert.equal(publicEvent.targetDistanceLabel, '10 km');
  assert.equal(publicEvent.distanceSummaryLabel, '5K, 10K');
  assert.deepEqual(publicEvent.stats[1], { label: 'Registration Options', value: '5K, 10K', helper: 'Distance labels' });
  assert.equal(publicEvent.stats.some((stat) => stat.label === 'Target'), false);
});

test('buildPublicEventView surfaces customized signup pricing options', () => {
  const publicEvent = buildPublicEventView({
    title: 'Custom Pricing Race',
    slug: 'custom-pricing-race',
    eventType: 'virtual',
    eventTypesAllowed: ['virtual'],
    raceDistances: ['5K'],
    feeMode: 'paid',
    pricingMode: 'customized_options',
    feeCurrency: 'PHP',
    customizedOptions: [
      { shortDescription: '5K - Medal + Shirt + Race Kit', amount: 850 },
      { shortDescription: 'Virtual 100K - Digital Badge Only', amount: 300 }
    ]
  });

  assert.equal(publicEvent.pricing.label, 'Signup options');
  assert.equal(publicEvent.pricing.amountLabel, 'PHP 300 - PHP 850');
  assert.equal(publicEvent.pricingOptions.length, 2);
  assert.deepEqual(publicEvent.pricingOptions.map((option) => option.amountLabel), ['PHP 850', 'PHP 300']);
});

test('buildPublicEventView normalizes legacy same fee pricing as signup options', () => {
  const publicEvent = buildPublicEventView({
    title: 'Legacy Same Fee Race',
    slug: 'legacy-same-fee-race',
    eventType: 'virtual',
    eventTypesAllowed: ['virtual'],
    raceDistances: ['5K'],
    feeMode: 'paid',
    pricingMode: 'same_fee',
    feeCurrency: 'PHP',
    customizedOptions: [
      { shortDescription: '5K - Medal + Shirt + Race Kit', amount: 850 }
    ]
  });

  assert.equal(publicEvent.pricing.label, 'Signup options');
  assert.equal(publicEvent.pricing.amountLabel, 'PHP 850');
});

test('buildPublicEventView surfaces distance based pricing options', () => {
  const publicEvent = buildPublicEventView({
    title: 'Distance Pricing Race',
    slug: 'distance-pricing-race',
    eventType: 'onsite',
    eventTypesAllowed: ['onsite'],
    raceDistances: ['5K', '10K'],
    feeMode: 'paid',
    pricingMode: 'distance_based',
    feeCurrency: 'PHP',
    distancePricing: [
      { distance: '5K', amount: 500 },
      { distance: '10K', amount: 750 }
    ]
  });

  assert.equal(publicEvent.pricing.label, 'Registration pricing');
  assert.equal(publicEvent.pricing.amountLabel, 'PHP 500 - PHP 750');
  assert.deepEqual(publicEvent.pricingOptions.map((option) => `${option.label}:${option.amountLabel}`), ['5K:PHP 500', '10K:PHP 750']);
});

test('buildPublicEventView surfaces structured race category summaries and pricing labels', () => {
  const publicEvent = buildPublicEventView({
    title: 'Category Race',
    slug: 'category-race',
    eventType: 'onsite',
    eventTypesAllowed: ['onsite'],
    raceCategories: [
      {
        categoryId: 'cat-open-10k',
        name: '10K Open',
        type: 'distance',
        distanceLabel: '10K',
        distanceKm: 10,
        slots: 150,
        cutoffTime: '2 hours',
        ageGroup: '18+',
        rewardsDescription: 'Medal for finishers'
      },
      {
        categoryId: 'cat-kids',
        name: 'Kids Dash',
        type: 'open',
        distanceLabel: '1K',
        distanceKm: 1
      }
    ],
    feeMode: 'paid',
    pricingMode: 'distance_based',
    feeCurrency: 'PHP',
    distancePricing: [
      { categoryId: 'cat-open-10k', distance: '10K', amount: 750 },
      { categoryId: 'cat-kids', distance: '1K', amount: 250 }
    ]
  });

  assert.deepEqual(publicEvent.raceDistances, ['10K', '1K']);
  assert.equal(publicEvent.raceCategories.length, 2);
  assert.equal(publicEvent.raceCategories[0].name, '10K Open');
  assert.equal(publicEvent.raceCategories[0].typeLabel, 'Distance');
  assert.equal(publicEvent.raceCategories[0].summary, '10K | 10 km | 150 slots | 2 hours | 18+');
  assert.equal(publicEvent.raceCategories[0].rewardsDescription, 'Medal for finishers');
  assert.deepEqual(publicEvent.pricingOptions.map((option) => `${option.label}:${option.amountLabel}`), ['10K Open (10K):PHP 750', 'Kids Dash (1K):PHP 250']);
});

test('buildPublicEventView surfaces package period pricing options', () => {
  const publicEvent = buildPublicEventView({
    title: 'Package Pricing Race',
    slug: 'package-pricing-race',
    eventType: 'virtual',
    eventTypesAllowed: ['virtual'],
    raceDistances: ['5K'],
    feeMode: 'paid',
    pricingMode: 'package_period',
    feeCurrency: 'PHP',
    registrationPackages: [
      {
        packageId: 'pkg-medal-shirt',
        name: 'Medal + Shirt',
        includedItems: { medal: true, shirt: true },
        pricingPeriods: [
          { label: 'Early Bird', amount: 899 },
          { label: 'Regular', amount: 999 }
        ]
      }
    ]
  });

  assert.equal(publicEvent.pricing.label, 'Registration pricing');
  assert.equal(publicEvent.pricing.amountLabel, 'PHP 899');
  assert.equal(publicEvent.pricingOptions.length, 1);
  assert.deepEqual(publicEvent.pricingOptions.map((option) => `${option.label}:${option.amountLabel}`), ['Medal + Shirt:From PHP 899']);
});

test('buildPublicEventSeo uses event image and canonical URL', () => {
  const seo = buildPublicEventSeo({
    title: 'SEO Event',
    slug: 'seo-event',
    description: 'A focused event page description for runners.',
    bannerImageUrl: 'https://cdn.example.com/banner.webp'
  }, 'https://hellorun.online/');

  assert.equal(seo.canonicalUrl, 'https://hellorun.online/events/seo-event');
  assert.equal(seo.ogImage, 'https://cdn.example.com/banner.webp');
  assert.match(seo.description, /focused event page/);
});
