function getPublicEventVisibilityQuery(now = new Date()) {
  return {
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
}

function isPublicEventVisible(event, now = new Date()) {
  if (!event) return false;
  if (event.status !== 'published') return false;
  if (event.isDeleted === true || event.isPersonalRecord === true) return false;
  if (!event.publicListingAvailableAt) return true;
  const availableAt = new Date(event.publicListingAvailableAt);
  if (Number.isNaN(availableAt.getTime())) return true;
  return availableAt <= now;
}

module.exports = {
  getPublicEventVisibilityQuery,
  isPublicEventVisible
};
