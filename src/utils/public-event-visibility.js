function getPublicEventVisibilityQuery(now = new Date()) {
  const allowTestEvents = canExposeTestEvents();
  const query = {
    status: 'published',
    isDeleted: { $ne: true },
    isPersonalRecord: { $ne: true },
    $and: [
      {
        $or: [
          { publicListingAvailableAt: { $exists: false } },
          { publicListingAvailableAt: null },
          { publicListingAvailableAt: { $lte: now } }
        ]
      }
    ]
  };

  if (!allowTestEvents) {
    query.isTestData = { $ne: true };
    query.isSmokeTest = { $ne: true };
    query.$and.push({
      $nor: [
        { title: LEGACY_TEST_EVENT_PATTERN },
        { slug: LEGACY_TEST_EVENT_PATTERN },
        { description: LEGACY_TEST_EVENT_PATTERN }
      ]
    });
  }

  return query;
}

const LEGACY_TEST_EVENT_PATTERN = /\b(?:submission service test event|shop[-_ ]?empty[-_ ]?event|empty[-_ ]?event|placeholder|smoke|smoke[-_ ]?test|test|test[-_ ]?event|test[-_ ]?run|dummy|qa|staging)\b/i;

function isPublicEventVisible(event, now = new Date()) {
  if (!event) return false;
  if (event.status !== 'published') return false;
  if (event.isDeleted === true || event.isPersonalRecord === true) return false;
  if (!canExposeTestEvents()) {
    if (event.isTestData === true || event.isSmokeTest === true) return false;
    if (isLegacyTestEvent(event)) return false;
  }
  if (!event.publicListingAvailableAt) return true;
  const availableAt = new Date(event.publicListingAvailableAt);
  if (Number.isNaN(availableAt.getTime())) return true;
  return availableAt <= now;
}

function canExposeTestEvents(env = process.env) {
  return String(env.NODE_ENV || '') === 'test' && String(env.ALLOW_TEST_EVENT_VISIBILITY || '') === '1';
}

function isLegacyTestEvent(event) {
  return [event.title, event.slug, event.description]
    .some((value) => LEGACY_TEST_EVENT_PATTERN.test(String(value || '')));
}

module.exports = {
  getPublicEventVisibilityQuery,
  isPublicEventVisible,
  canExposeTestEvents
};
