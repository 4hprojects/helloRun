const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildEventsPageUrl,
  buildEventsQueryParams,
  getEventsActiveFilters,
  getEventsFilterValues
} = require('../src/services/public-event-list.service');

test('event list URLs preserve every filter including the date range', () => {
  const filters = getEventsFilterValues({
    q: 'Sunrise',
    eventType: 'virtual',
    distance: '5k',
    status: 'open',
    dateFrom: '2026-07-20',
    dateTo: '2026-08-05'
  });

  assert.equal(
    buildEventsQueryParams(filters, 2).toString(),
    'q=Sunrise&eventType=virtual&distance=5K&status=open&dateFrom=2026-07-20&dateTo=2026-08-05&page=2'
  );
  assert.equal(
    buildEventsPageUrl(filters, 2),
    '/events?q=Sunrise&eventType=virtual&distance=5K&status=open&dateFrom=2026-07-20&dateTo=2026-08-05&page=2'
  );
});

test('event list exposes removable chips for both date boundaries', () => {
  const filters = getEventsFilterValues({
    eventType: 'onsite',
    dateFrom: '2026-07-20',
    dateTo: '2026-08-05'
  });
  const chips = getEventsActiveFilters(filters);
  const fromChip = chips.find((chip) => chip.key === 'dateFrom');
  const toChip = chips.find((chip) => chip.key === 'dateTo');

  assert.equal(fromChip.label, 'From');
  assert.match(fromChip.value, /Jul 20, 2026/);
  assert.equal(fromChip.clearUrl, '/events?eventType=onsite&dateTo=2026-08-05');
  assert.equal(toChip.label, 'To');
  assert.match(toChip.value, /Aug 5, 2026/);
  assert.equal(toChip.clearUrl, '/events?eventType=onsite&dateFrom=2026-07-20');
});

test('invalid and inverted event date inputs remain distinguishable', () => {
  const invalid = getEventsFilterValues({ dateFrom: 'not-a-date', dateTo: '2026-08-05' });
  assert.equal(invalid.dateFrom, null);
  assert.equal(invalid.dateTo.toISOString(), '2026-08-05T00:00:00.000Z');

  const inverted = getEventsFilterValues({ dateFrom: '2026-08-05', dateTo: '2026-07-20' });
  assert.equal(inverted.dateFrom > inverted.dateTo, true);
});
