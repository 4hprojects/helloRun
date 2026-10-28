const { ACTIVE_QUEST_CATEGORIES, ACTIVE_QUEST_TIMEZONE } = require('../config/active-quest');
const { getRewardReadiness } = require('./active-quest-generator.service');

function buildActiveQuestPublicPage({ series = null, events = [], selectedYear = null, now = new Date() } = {}) {
  const pht = getPhtYearMonth(now);
  const visibleEvents = events
    .filter((event) => event?.status === 'published' && event?.isDeleted !== true)
    .sort(compareEditionAscending);
  const current = visibleEvents.find((event) => Number(event.seriesYear) === pht.year && Number(event.seriesMonth) === pht.month);
  const next = visibleEvents.find((event) => editionNumber(event) > pht.year * 100 + pht.month);
  const featured = current || next || visibleEvents.at(-1) || null;
  const year = selectedYear ? Number(selectedYear) : null;
  const archiveEvents = visibleEvents
    .filter((event) => !year || Number(event.seriesYear) === year)
    .sort((left, right) => compareEditionAscending(right, left))
    .map((event) => presentEdition(event, now));
  const availableYears = Array.from(new Set(visibleEvents.map((event) => Number(event.seriesYear)).filter(Boolean)))
    .sort((left, right) => right - left);
  const rewardReadiness = featured ? getRewardReadiness(featured.seriesSnapshot || {}) : { badgesReady: false, certificateReady: false };

  return {
    title: series?.displayName || 'Active Quest',
    tagline: series?.tagline || 'Your Distance. Your Pace. Your Quest.',
    timezone: series?.timezone || ACTIVE_QUEST_TIMEZONE,
    categories: (featured?.seriesSnapshot?.categories || ACTIVE_QUEST_CATEGORIES).map((category) => ({
      key: category.key,
      targetKm: Number(category.targetKm),
      label: category.label,
      badgeAssetUrl: String(category.badgeAssetUrl || '')
    })),
    featured: featured ? presentEdition(featured, now) : null,
    featuredRelation: current ? 'current' : next ? 'next' : featured ? 'latest' : 'none',
    archiveEvents,
    availableYears,
    selectedYear: year,
    rewards: {
      badgesAvailable: featured?.digitalBadgeEnabled === true && rewardReadiness.badgesReady,
      certificateAvailable: featured?.digitalCertificateEnabled === true && rewardReadiness.certificateReady
    },
    hasPublishedEditions: visibleEvents.length > 0
  };
}

function presentEdition(event, now = new Date()) {
  const registrationOpenAt = parseDate(event.registrationOpenAt);
  const registrationCloseAt = parseDate(event.registrationCloseAt);
  let registrationState = 'closed';
  if (registrationOpenAt && now < registrationOpenAt) registrationState = 'upcoming';
  else if ((!registrationOpenAt || now >= registrationOpenAt) && (!registrationCloseAt || now <= registrationCloseAt)) {
    registrationState = 'open';
  }
  return {
    id: String(event._id || ''),
    title: String(event.title || ''),
    slug: String(event.slug || ''),
    href: event.slug ? `/events/${event.slug}` : '',
    registrationHref: registrationState === 'open' && event.slug ? `/events/${event.slug}/register` : '',
    registrationState,
    registrationLabel: registrationState === 'open' ? 'Registration open' : registrationState === 'upcoming' ? 'Registration opens soon' : 'Registration closed',
    year: Number(event.seriesYear),
    month: Number(event.seriesMonth),
    eventStartAt: parseDate(event.eventStartAt),
    eventEndAt: parseDate(event.eventEndAt),
    registrationOpenAt,
    registrationCloseAt,
    raceDistances: Array.isArray(event.raceDistances) ? event.raceDistances : [],
    bannerImageUrl: String(event.bannerImageUrl || event.posterImageUrl || ''),
    leaderboardHref: event.leaderboardRecognitionEnabled === true && event.slug
      ? `/events/${event.slug}/leaderboard`
      : ''
  };
}

function getPhtYearMonth(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: ACTIVE_QUEST_TIMEZONE,
    year: 'numeric',
    month: 'numeric'
  }).formatToParts(now);
  return {
    year: Number(parts.find((part) => part.type === 'year')?.value),
    month: Number(parts.find((part) => part.type === 'month')?.value)
  };
}

function editionNumber(event) {
  return Number(event?.seriesYear || 0) * 100 + Number(event?.seriesMonth || 0);
}

function compareEditionAscending(left, right) {
  return editionNumber(left) - editionNumber(right);
}

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

module.exports = {
  buildActiveQuestPublicPage,
  presentEdition,
  getPhtYearMonth,
  editionNumber
};
