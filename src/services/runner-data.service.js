const Registration = require('../models/Registration');

async function getRunnerRegistrations(userId) {
  return Registration.find({ userId })
    .populate({
      path: 'eventId',
      select: 'title slug status eventStartAt eventEndAt city country venueName'
    })
    .sort({ registeredAt: -1 })
    .lean();
}

function buildRunnerDashboardData(registrations = [], now = new Date()) {
  const validRegistrations = registrations.filter((item) => item && item.eventId);
  const upcoming = [];
  const past = [];
  const unpaid = [];

  for (const registration of validRegistrations) {
    const startAt = parseDateSafe(registration.eventId?.eventStartAt);
    const isUpcoming = startAt && startAt >= now;

    if (isUpcoming) {
      upcoming.push(registration);
    } else {
      past.push(registration);
    }

    if (registration.paymentStatus === 'unpaid') {
      unpaid.push(registration);
    }
  }

  const activity = validRegistrations
    .slice()
    .sort((a, b) => new Date(b.registeredAt || 0) - new Date(a.registeredAt || 0))
    .slice(0, 8)
    .map((registration) => ({
      type: 'registered',
      at: registration.registeredAt || null,
      eventTitle: registration.eventId?.title || 'Event unavailable',
      confirmationCode: registration.confirmationCode || ''
    }));

  return {
    all: validRegistrations,
    upcoming,
    past,
    unpaid,
    activity,
    stats: {
      total: validRegistrations.length,
      upcoming: upcoming.length,
      past: past.length,
      unpaid: unpaid.length,
      paid: validRegistrations.filter((item) => item.paymentStatus === 'paid').length
    }
  };
}

function parseDateSafe(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

module.exports = {
  getRunnerRegistrations,
  buildRunnerDashboardData
};
