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
