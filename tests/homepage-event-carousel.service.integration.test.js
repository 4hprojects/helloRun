const test = require('node:test');
const assert = require('node:assert/strict');

const Event = require('../src/models/Event');
const {
  listHomepagePromotedEvents,
  normalizeHomepageEventCard
} = require('../src/services/public-event-list.service');

const originalFind = Event.find;

test.afterEach(() => {
  Event.find = originalFind;
});

test('homepage promoted events prefer active featured events and fill with automatic events', async () => {
  const now = new Date('2026-05-28T00:00:00.000Z');
  const events = [
    buildEvent({
      _id: 'featured-low',
      title: 'Featured Low Rank',
      slug: 'featured-low',
      homeFeatured: true,
      homeFeaturedRank: 1,
      eventStartAt: '2026-06-10T00:00:00.000Z'
    }),
    buildEvent({
      _id: 'featured-high',
      title: 'Featured High Rank',
      slug: 'featured-high',
      homeFeatured: true,
      homeFeaturedRank: 10,
      eventStartAt: '2026-06-01T00:00:00.000Z'
    }),
    buildEvent({
      _id: 'fallback-open',
      title: 'Fallback Open',
      slug: 'fallback-open',
      registrationCloseAt: '2026-05-30T00:00:00.000Z',
      eventStartAt: '2026-06-05T00:00:00.000Z'
    }),
    buildEvent({
      _id: 'future-posting',
      title: 'Future Posting',
      slug: 'future-posting',
      publicListingAvailableAt: '2026-06-01T00:00:00.000Z'
    }),
    buildEvent({
      _id: 'expired-featured',
      title: 'Expired Featured',
      slug: 'expired-featured',
      homeFeatured: true,
      homeFeaturedRank: 0,
      homeFeaturedUntil: '2026-05-01T00:00:00.000Z',
      registrationCloseAt: '2026-06-02T00:00:00.000Z'
    }),
    buildEvent({
      _id: 'past-event',
      title: 'Past Event',
      slug: 'past-event',
      eventEndAt: '2026-05-01T00:00:00.000Z'
    })
  ];

  Event.find = createMockFind(events);

  const promoted = await listHomepagePromotedEvents({ now, limit: 4 });

  assert.deepEqual(
    promoted.map((event) => event.slug),
    ['featured-low', 'featured-high', 'fallback-open', 'expired-featured']
  );
  assert.equal(promoted.some((event) => event.slug === 'future-posting'), false);
  assert.equal(promoted.some((event) => event.slug === 'past-event'), false);
});

test('normalizeHomepageEventCard provides image fallback and public event link', () => {
  const card = normalizeHomepageEventCard(buildEvent({
    _id: 'card-event',
    title: 'Card Event',
    slug: 'card-event',
    bannerImageUrl: '',
    raceDistances: ['5k', '10K'],
    city: 'Manila',
    country: 'PH'
  }));

  assert.equal(card.href, '/events/card-event');
  assert.equal(card.imageUrl, '/images/helloRun-icon.webp');
  assert.equal(card.fallbackImageUrl, '/images/helloRun-icon.webp');
  assert.equal(card.distanceLabel, '5K, 10K');
  assert.match(card.locationLabel, /Manila/);
});

function buildEvent(overrides = {}) {
  return {
    _id: overrides._id || `event-${Math.random()}`,
    title: overrides.title || 'Test Event',
    slug: overrides.slug || 'test-event',
    description: overrides.description || 'Test event description',
    organiserName: 'HelloRun',
    status: 'published',
    isDeleted: false,
    isPersonalRecord: false,
    eventType: 'virtual',
    raceDistances: ['5K'],
    registrationOpenAt: '2026-05-01T00:00:00.000Z',
    registrationCloseAt: overrides.registrationCloseAt || '2026-06-15T00:00:00.000Z',
    publicListingAvailableAt: overrides.publicListingAvailableAt ?? null,
    eventStartAt: overrides.eventStartAt || '2026-06-01T00:00:00.000Z',
    eventEndAt: overrides.eventEndAt || '2026-06-30T00:00:00.000Z',
    venueName: '',
    city: '',
    country: '',
    bannerImageUrl: '/banner.webp',
    homeFeatured: false,
    homeFeaturedRank: null,
    homeFeaturedUntil: null,
    createdAt: '2026-04-01T00:00:00.000Z',
    ...overrides
  };
}

function createMockFind(events) {
  return (query) => {
    let result = events.filter((event) => matchesQuery(event, query));
    return {
      sort(sortSpec) {
        result = result.slice().sort((a, b) => compareBySort(a, b, sortSpec));
        return this;
      },
      limit(count) {
        result = result.slice(0, count);
        return this;
      },
      select() {
        return this;
      },
      async lean() {
        return result.map((event) => ({ ...event }));
      }
    };
  };
}

function matchesQuery(event, query) {
  for (const [key, expected] of Object.entries(query || {})) {
    if (key === '$and') {
      if (!expected.every((condition) => matchesQuery(event, condition))) return false;
      continue;
    }
    if (key === '$or') {
      if (!expected.some((condition) => matchesQuery(event, condition))) return false;
      continue;
    }

    const actual = event[key];
    if (expected && typeof expected === 'object' && !Array.isArray(expected) && !(expected instanceof Date)) {
      if ('$ne' in expected && actual === expected.$ne) return false;
      if ('$exists' in expected) {
        const exists = actual !== undefined;
        if (exists !== expected.$exists) return false;
      }
      if ('$lte' in expected && !(new Date(actual).getTime() <= new Date(expected.$lte).getTime())) return false;
      if ('$gte' in expected && !(new Date(actual).getTime() >= new Date(expected.$gte).getTime())) return false;
      if ('$nin' in expected && expected.$nin.map(String).includes(String(actual))) return false;
      continue;
    }

    if (actual !== expected) return false;
  }
  return true;
}

function compareBySort(a, b, sortSpec) {
  for (const [field, direction] of Object.entries(sortSpec || {})) {
    const left = sortValue(a[field]);
    const right = sortValue(b[field]);
    if (left === right) continue;
    return direction >= 0
      ? (left < right ? -1 : 1)
      : (left > right ? -1 : 1);
  }
  return 0;
}

function sortValue(value) {
  if (value === null || value === undefined) return Number.POSITIVE_INFINITY;
  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) return date.getTime();
  return value;
}
