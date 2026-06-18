function getPublicEventVisibilityQuery(now = new Date()) {
  return {
    status: 'published',
    isDeleted: { $ne: true },
    isPersonalRecord: { $ne: true },
    isSmokeTest: { $ne: true },
    $and: [
      {
        $or: [
          { publicListingAvailableAt: { $exists: false } },
          { publicListingAvailableAt: null },
          { publicListingAvailableAt: { $lte: now } }
        ]
      },
      {
        $nor: [
          { title: LEGACY_TEST_EVENT_PATTERN },
          { slug: LEGACY_TEST_EVENT_PATTERN },
          { description: LEGACY_TEST_EVENT_PATTERN }
        ]
      }
    ]
  };
}

const LEGACY_TEST_EVENT_PATTERN = /\b(?:submission service test event|shop[-_ ]?empty[-_ ]?event|empty[-_ ]?event|placeholder|smoke|smoke[-_ ]?test|test|test[-_ ]?event|test[-_ ]?run|dummy|qa|staging)\b/i;

function isPublicEventVisible(event, now = new Date()) {
  if (!event) return false;
  if (event.status !== 'published') return false;
  if (event.isDeleted === true || event.isPersonalRecord === true) return false;
  if (event.isSmokeTest === true) return false;
  if (isLegacyTestEvent(event)) return false;
  if (!event.publicListingAvailableAt) return true;
  const availableAt = new Date(event.publicListingAvailableAt);
  if (Number.isNaN(availableAt.getTime())) return true;
  return availableAt <= now;
}

function isLegacyTestEvent(event) {
  return [event.title, event.slug, event.description]
    .some((value) => LEGACY_TEST_EVENT_PATTERN.test(String(value || '')));
}

module.exports = {
  getPublicEventVisibilityQuery,
  isPublicEventVisible
};
