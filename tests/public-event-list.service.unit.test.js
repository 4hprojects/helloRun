const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildEventsCanonicalUrl,
  buildEventsPageUrl,
  buildEventsQueryParams,
  compareEventsBySelectedSort,
  compareEventsRecommended,
  getClearedEventFilters,
  getEventAvailability,
  getEventCardDistanceLabels,
  getEventsActiveFilters,
  getEventsFilterValues
} = require('../src/services/public-event-list.service');

test('event list URLs preserve every filter and non-default sort', () => {
  const filters = getEventsFilterValues({
    q: 'Sunrise',
    eventType: 'virtual',
    distance: '5k',
    status: 'open',
    dateFrom: '2026-07-20',
    dateTo: '2026-08-05',
    sort: 'closing-soon'
  });

  assert.equal(
    buildEventsQueryParams(filters, 2).toString(),
    'q=Sunrise&eventType=virtual&distance=5K&status=open&dateFrom=2026-07-20&dateTo=2026-08-05&sort=closing-soon&page=2'
  );
  assert.equal(
    buildEventsPageUrl(filters, 2),
    '/events?q=Sunrise&eventType=virtual&distance=5K&status=open&dateFrom=2026-07-20&dateTo=2026-08-05&sort=closing-soon&page=2'
  );
});

test('recommended and invalid sort values are omitted from event URLs', () => {
  assert.equal(getEventsFilterValues({ sort: 'not-real' }).sort, 'recommended');
  assert.equal(buildEventsPageUrl(getEventsFilterValues({ sort: 'recommended' })), '/events');
});

test('event canonical URLs intentionally omit non-default sorting', () => {
  const originalAppUrl = process.env.APP_URL;
  process.env.APP_URL = 'https://hellorun.example';
  try {
    const filters = getEventsFilterValues({ q: 'Sunrise', sort: 'newest' });
    assert.equal(buildEventsCanonicalUrl(filters, 2), 'https://hellorun.example/events?q=Sunrise&page=2');
  } finally {
    if (originalAppUrl === undefined) delete process.env.APP_URL;
    else process.env.APP_URL = originalAppUrl;
  }
});

test('filter chips and clear-all URLs preserve sorting', () => {
  const filters = getEventsFilterValues({
    eventType: 'onsite',
    dateFrom: '2026-07-20',
    dateTo: '2026-08-05',
    sort: 'newest'
  });
  const chips = getEventsActiveFilters(filters);
  const fromChip = chips.find((chip) => chip.key === 'dateFrom');
  const toChip = chips.find((chip) => chip.key === 'dateTo');

  assert.equal(fromChip.label, 'From');
  assert.match(fromChip.value, /Jul 20, 2026/);
  assert.equal(fromChip.clearUrl, '/events?eventType=onsite&dateTo=2026-08-05&sort=newest');
  assert.equal(toChip.clearUrl, '/events?eventType=onsite&dateFrom=2026-07-20&sort=newest');
  assert.equal(buildEventsPageUrl(getClearedEventFilters(filters)), '/events?sort=newest');
});

test('invalid and inverted event date inputs remain distinguishable', () => {
  const invalid = getEventsFilterValues({ dateFrom: 'not-a-date', dateTo: '2026-08-05' });
  assert.equal(invalid.dateFrom, null);
  assert.equal(invalid.dateTo.toISOString(), '2026-08-05T00:00:00.000Z');

  const inverted = getEventsFilterValues({ dateFrom: '2026-08-05', dateTo: '2026-07-20' });
  assert.equal(inverted.dateFrom > inverted.dateTo, true);
});

test('availability states are mutually exclusive at their time boundaries', () => {
  const now = new Date('2026-07-17T08:00:00.000Z');
  const open = getEventAvailability({
    registrationOpenAt: '2026-07-10T00:00:00.000Z',
    registrationCloseAt: now,
    eventEndAt: '2026-08-01T00:00:00.000Z'
  }, now);
  const later = getEventAvailability({
    registrationOpenAt: '2026-07-18T00:00:00.000Z',
    registrationCloseAt: '2026-07-30T00:00:00.000Z'
  }, now);
  const closed = getEventAvailability({
    registrationOpenAt: '2026-07-01T00:00:00.000Z',
    registrationCloseAt: '2026-07-16T00:00:00.000Z'
  }, now);
  const unavailable = getEventAvailability({ eventStartAt: '2026-08-01T00:00:00.000Z' }, now);

  assert.deepEqual([open.key, later.key, closed.key, unavailable.key], ['open', 'upcoming', 'closed', 'closed']);
  assert.deepEqual([open.ctaLabel, later.ctaLabel, closed.ctaLabel], ['View & register', 'View event', 'View recap']);
});

test('recommended sorting prioritizes actionable availability and nearest deadlines', () => {
  const now = new Date('2026-07-17T08:00:00.000Z');
  const events = [
    { id: 'closed', registrationCloseAt: '2026-07-10T00:00:00.000Z' },
    { id: 'unavailable' },
    { id: 'later', registrationOpenAt: '2026-07-20T00:00:00.000Z', registrationCloseAt: '2026-08-20T00:00:00.000Z' },
    { id: 'open-late', registrationOpenAt: '2026-07-01T00:00:00.000Z', registrationCloseAt: '2026-08-10T00:00:00.000Z' },
    { id: 'open-soon', registrationOpenAt: '2026-07-01T00:00:00.000Z', registrationCloseAt: '2026-07-18T00:00:00.000Z' }
  ];
  events.sort((a, b) => compareEventsRecommended(a, b, now));
  assert.deepEqual(events.map((event) => event.id), ['open-soon', 'open-late', 'later', 'closed', 'unavailable']);
});

test('explicit event sorting handles dates and missing values deterministically', () => {
  const now = new Date('2026-07-17T08:00:00.000Z');
  const events = [
    { id: 'missing', createdAt: '2026-07-17T00:00:00.000Z' },
    { id: 'later', eventStartAt: '2026-08-01T00:00:00.000Z', registrationCloseAt: '2026-07-30T00:00:00.000Z', createdAt: '2026-07-10T00:00:00.000Z' },
    { id: 'sooner', eventStartAt: '2026-07-20T00:00:00.000Z', registrationCloseAt: '2026-07-18T00:00:00.000Z', createdAt: '2026-07-01T00:00:00.000Z' }
  ];
  assert.deepEqual(
    [...events].sort((a, b) => compareEventsBySelectedSort(a, b, 'start-date', now)).map((event) => event.id),
    ['sooner', 'later', 'missing']
  );
  assert.deepEqual(
    [...events].sort((a, b) => compareEventsBySelectedSort(a, b, 'closing-soon', now)).map((event) => event.id),
    ['sooner', 'later', 'missing']
  );
  assert.deepEqual(
    [...events].sort((a, b) => compareEventsBySelectedSort(a, b, 'newest', now)).map((event) => event.id),
    ['missing', 'later', 'sooner']
  );
});

test('event card distance labels limit visual density without losing the full value', () => {
  assert.deepEqual(getEventCardDistanceLabels([]), {
    compact: 'Distances not listed',
    full: 'Distances not listed'
  });
  assert.deepEqual(getEventCardDistanceLabels(['5k', '10K', '21k', '42K', '50K']), {
    compact: '5K, 10K, 21K +2 more',
    full: '5K, 10K, 21K, 42K, 50K'
  });
  assert.deepEqual(getEventCardDistanceLabels([
    '25K July Starter Quest',
    '50K July Progress Quest',
    '75K July Endurance Quest',
    '100K July Active Quest'
  ]), {
    compact: '25K, 50K, 75K +1 more',
    full: '25K JULY STARTER QUEST, 50K JULY PROGRESS QUEST, 75K JULY ENDURANCE QUEST, 100K JULY ACTIVE QUEST'
  });
});
