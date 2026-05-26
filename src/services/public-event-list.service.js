const Event = require('../models/Event');
const { getCountries, getCountryName } = require('../utils/country');
const { getPublicEventVisibilityQuery } = require('../utils/public-event-visibility');

const countries = getCountries();

async function buildPublicEventListPage(queryParams = {}) {
  const filterValues = getEventsFilterValues(queryParams);
  const now = new Date();
  const matchingCountryCodes = getMatchingCountryCodes(filterValues.q);
  const query = getPublicEventVisibilityQuery(now);

  if (filterValues.eventType) {
    query.$or = [
      { eventType: filterValues.eventType },
      { eventTypesAllowed: filterValues.eventType }
    ];
  }
  if (filterValues.distance) {
    query.raceDistances = filterValues.distance;
  }
  if (filterValues.status === 'upcoming') {
    query.eventStartAt = { $gte: now };
  } else if (filterValues.status === 'open') {
    query.registrationOpenAt = { $lte: now };
    query.registrationCloseAt = { $gte: now };
  } else if (filterValues.status === 'closed') {
    query.$and = query.$and || [];
    query.$and.push({
      $or: [
        { eventEndAt: { $lt: now } },
        { registrationCloseAt: { $lt: now } }
      ]
    });
  }
  if (filterValues.q) {
    const safePattern = new RegExp(escapeRegex(filterValues.q), 'i');
    query.$and = query.$and || [];
    const searchConditions = [
      { title: safePattern },
      { organiserName: safePattern },
      { description: safePattern },
      { venueName: safePattern },
      { city: safePattern },
      { country: safePattern }
    ];
    if (matchingCountryCodes.length) {
      searchConditions.push({ country: { $in: matchingCountryCodes } });
    }
    query.$and.push({ $or: searchConditions });
  }

  const page = normalizePositiveInt(queryParams.page, 1);
  const limit = 9;
  const [totalEvents, distanceOptions] = await Promise.all([
    Event.countDocuments(query),
    Event.distinct('raceDistances', {
      ...getPublicEventVisibilityQuery(now)
    })
  ]);
  const totalPages = Math.max(1, Math.ceil(totalEvents / limit));
  const currentPage = Math.min(page, totalPages);
  const skip = (currentPage - 1) * limit;

  const eventSelect = 'title slug description organiserName eventType eventTypesAllowed raceDistances eventStartAt eventEndAt venueName city country bannerImageUrl registrationCloseAt registrationOpenAt createdAt';
  let events;
  if (filterValues.q) {
    const rankedEvents = await Event.find(query).select(eventSelect).lean();
    events = rankEventsForSearch(rankedEvents, filterValues.q)
      .sort((a, b) => compareEventsForSearch(a, b, filterValues.status))
      .slice(skip, skip + limit);
  } else {
    events = await Event.find(query)
      .sort(getEventsSort(filterValues.status))
      .skip(skip)
      .limit(limit)
      .select(eventSelect)
      .lean();
  }

  const normalizedDistanceOptions = distanceOptions
    .map((item) => String(item || '').trim().toUpperCase())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  const activeFilterCount = Number(Boolean(filterValues.q))
    + Number(Boolean(filterValues.eventType))
    + Number(Boolean(filterValues.distance))
    + Number(filterValues.status !== 'all');

  const activeFilters = getEventsActiveFilters(filterValues);
  const pageContent = getEventsPageContent(filterValues, { currentPage, totalPages });

  return {
    title: pageContent.title,
    seo: {
      ...pageContent.seo,
      canonicalUrl: buildEventsCanonicalUrl(filterValues, currentPage)
    },
    events: events.map((event) => {
      const raceDistances = Array.isArray(event.raceDistances)
        ? event.raceDistances.map((distanceItem) => String(distanceItem || '').trim().toUpperCase()).filter(Boolean)
        : [];
      return {
        ...event,
        raceDistances,
        countryLabel: getCountryName(event.country),
        displayState: getEventCardDisplayState(event, now)
      };
    }),
    filters: filterValues,
    pageContent,
    filterMeta: {
      hasActiveFilters: activeFilterCount > 0,
      activeFilterCount,
      resultsCount: totalEvents,
      distanceOptions: normalizedDistanceOptions,
      activeFilters,
      summary: buildEventsResultsSummary(filterValues, totalEvents)
    },
    pagination: {
      currentPage,
      totalPages,
      pageSize: limit,
      getPageUrl: (pageNumber) => buildEventsPageUrl(filterValues, pageNumber)
    }
  };
}

function getEventsFilterValues(query = {}) {
  const q = String(query.q || '').trim().slice(0, 100);
  const rawType = String(query.eventType || '').trim().toLowerCase();
  const rawDistance = String(query.distance || '').trim().toUpperCase();
  const rawStatus = String(query.status || '').trim().toLowerCase();
  const eventType = ['virtual', 'onsite', 'hybrid'].includes(rawType) ? rawType : '';
  const distance = rawDistance && rawDistance.length <= 30 ? rawDistance : '';
  const status = ['all', 'upcoming', 'open', 'closed'].includes(rawStatus) ? rawStatus : 'all';
  return { q, eventType, distance, status };
}

function getMatchingCountryCodes(searchQuery) {
  const safe = String(searchQuery || '').trim().toLowerCase();
  if (!safe) return [];
  return countries
    .filter((item) => item.name.toLowerCase().includes(safe))
    .map((item) => item.code);
}

function getEventsSort(status) {
  if (status === 'open') {
    return { registrationCloseAt: 1, eventStartAt: 1, createdAt: -1 };
  }
  if (status === 'closed') {
    return { eventEndAt: -1, registrationCloseAt: -1, createdAt: -1 };
  }
  return { eventStartAt: 1, createdAt: -1 };
}

function rankEventsForSearch(events, searchQuery) {
  return events.map((event) => ({
    ...event,
    searchRank: getEventSearchRank(event, searchQuery)
  }));
}

function getEventSearchRank(event, searchQuery) {
  const query = normalizeSearchValue(searchQuery);
  if (!query) return 0;

  const title = normalizeSearchValue(event.title);
  const organiserName = normalizeSearchValue(event.organiserName);
  const venueName = normalizeSearchValue(event.venueName);
  const city = normalizeSearchValue(event.city);
  const countryCode = normalizeSearchValue(event.country);
  const countryName = normalizeSearchValue(getCountryName(event.country));
  const description = normalizeSearchValue(event.description);

  if (title === query || organiserName === query) return 500;
  if ([venueName, city, countryCode, countryName].some((value) => value === query)) return 400;
  if ([title, organiserName].some((value) => value.includes(query))) return 300;
  if ([venueName, city, countryCode, countryName].some((value) => value.includes(query))) return 200;
  if (description.includes(query)) return 100;
  return 0;
}

function compareEventsForSearch(a, b, status) {
  const rankDiff = Number(b.searchRank || 0) - Number(a.searchRank || 0);
  if (rankDiff !== 0) return rankDiff;
  return compareEventsBySort(a, b, getEventsSort(status));
}

function compareEventsBySort(a, b, sortSpec) {
  for (const [field, direction] of Object.entries(sortSpec)) {
    const comparison = compareEventSortValue(a[field], b[field]);
    if (comparison !== 0) {
      return direction >= 0 ? comparison : -comparison;
    }
  }
  return 0;
}

function compareEventSortValue(left, right) {
  const leftValue = getSortableValue(left);
  const rightValue = getSortableValue(right);
  if (leftValue === rightValue) return 0;
  if (leftValue === null || leftValue === undefined) return 1;
  if (rightValue === null || rightValue === undefined) return -1;
  return leftValue < rightValue ? -1 : 1;
}

function getSortableValue(value) {
  if (value instanceof Date) return value.getTime();
  if (value && typeof value.getTime === 'function') return value.getTime();
  if (typeof value === 'string' || typeof value === 'number') return value;
  return value == null ? null : String(value);
}

function normalizeSearchValue(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function buildEventsCanonicalUrl(filterValues, currentPage) {
  const baseUrl = getAppBaseUrl();
  if (!baseUrl) return '';

  const params = buildEventsQueryParams(filterValues, currentPage);
  const path = params.toString() ? `/events?${params.toString()}` : '/events';
  return `${baseUrl}${path}`;
}

function buildEventsPageUrl(filterValues, currentPage = 1) {
  const params = buildEventsQueryParams(filterValues, currentPage);
  return params.toString() ? `/events?${params.toString()}` : '/events';
}

function buildEventsQueryParams(filterValues, currentPage = 1) {
  const params = new URLSearchParams();
  if (filterValues.q) params.set('q', filterValues.q);
  if (filterValues.eventType) params.set('eventType', filterValues.eventType);
  if (filterValues.distance) params.set('distance', filterValues.distance);
  if (filterValues.status && filterValues.status !== 'all') params.set('status', filterValues.status);
  if (currentPage > 1) params.set('page', String(currentPage));
  return params;
}

function getEventsActiveFilters(filterValues) {
  const activeFilters = [];

  if (filterValues.q) {
    activeFilters.push({
      key: 'q',
      label: 'Search',
      value: filterValues.q,
      clearUrl: buildEventsPageUrl({ ...filterValues, q: '' }, 1)
    });
  }

  if (filterValues.eventType) {
    activeFilters.push({
      key: 'eventType',
      label: 'Mode',
      value: formatEventTypeLabel(filterValues.eventType),
      clearUrl: buildEventsPageUrl({ ...filterValues, eventType: '' }, 1)
    });
  }

  if (filterValues.distance) {
    activeFilters.push({
      key: 'distance',
      label: 'Distance',
      value: filterValues.distance,
      clearUrl: buildEventsPageUrl({ ...filterValues, distance: '' }, 1)
    });
  }

  if (filterValues.status && filterValues.status !== 'all') {
    activeFilters.push({
      key: 'status',
      label: 'Status',
      value: formatEventStatusLabel(filterValues.status),
      clearUrl: buildEventsPageUrl({ ...filterValues, status: 'all' }, 1)
    });
  }

  return activeFilters;
}

function formatEventTypeLabel(value) {
  if (value === 'onsite') return 'On-site';
  if (value === 'virtual') return 'Virtual';
  if (value === 'hybrid') return 'Hybrid';
  return String(value || '').trim();
}

function formatEventStatusLabel(value) {
  if (value === 'upcoming') return 'Upcoming';
  if (value === 'open') return 'Open';
  if (value === 'closed') return 'Closed / Past';
  return 'All';
}

function getEventsPageContent(filterValues, pagination = {}) {
  const filterLabel = getEventsFilterNarrative(filterValues);
  const pageSuffix = Number(pagination.currentPage || 1) > 1
    ? ` - Page ${pagination.currentPage}`
    : '';
  const titlePrefix = filterLabel ? `${filterLabel} Events` : 'Running Events';
  const heroTitle = filterLabel ? `${filterLabel} Events` : 'Check Out Ongoing Events';
  const defaultDescription = 'Discover helloRun events, browse by mode and distance, and find your next race or virtual challenge.';
  const filteredDescription = filterLabel
    ? `Browse ${getEventsFilterNarrative(filterValues, { lowercaseBase: true })} on helloRun and find your next race or virtual challenge.`
    : defaultDescription;
  const heroDescription = filterLabel
    ? buildEventsHeroDescription(filterValues)
    : 'Explore active helloRun races and pick your next challenge.';

  return {
    title: `${titlePrefix}${pageSuffix} - helloRun`,
    heroTitle,
    heroDescription,
    seo: {
      description: filteredDescription,
      ogTitle: `${titlePrefix}${pageSuffix} - helloRun`,
      twitterTitle: `${titlePrefix}${pageSuffix} - helloRun`
    }
  };
}

function buildEventsResultsSummary(filterValues, totalEvents) {
  if (!hasAnyEventsFilters(filterValues)) {
    return 'Browse active helloRun races by mode, distance, and registration status.';
  }

  const verb = Number(totalEvents || 0) === 1 ? 'matches' : 'match';
  return `${Number(totalEvents || 0).toLocaleString('en-US')} event${Number(totalEvents || 0) === 1 ? '' : 's'} ${verb} ${getEventsFilterNarrative(filterValues, { lowercaseBase: true })}.`;
}

function buildEventsHeroDescription(filterValues) {
  const narrative = getEventsFilterNarrative(filterValues, { lowercaseBase: true });
  if (!narrative) {
    return 'Explore active helloRun races and pick your next challenge.';
  }

  if (filterValues.q) {
    return `Refine ${narrative.toLowerCase()} and compare the events that best fit your search.`;
  }

  return `Compare ${narrative.toLowerCase()} and choose the race that fits your next goal.`;
}

function getEventsFilterNarrative(filterValues, options = {}) {
  const lowercaseBase = !!options.lowercaseBase;
  const parts = [];
  if (filterValues.status && filterValues.status !== 'all') {
    parts.push(formatEventStatusLabel(filterValues.status));
  }
  if (filterValues.eventType) {
    parts.push(formatEventTypeLabel(filterValues.eventType));
  }
  if (filterValues.distance) {
    parts.push(filterValues.distance);
  }

  const base = parts.length
    ? parts.map((part) => (lowercaseBase ? String(part).toLowerCase() : part)).join(' ')
    : '';
  if (filterValues.q) {
    return base
      ? `${base} results for "${filterValues.q}"`
      : `results for "${filterValues.q}"`;
  }

  return base;
}

function hasAnyEventsFilters(filterValues) {
  return Boolean(
    filterValues.q ||
    filterValues.eventType ||
    filterValues.distance ||
    (filterValues.status && filterValues.status !== 'all')
  );
}

function getEventCardDisplayState(event, now = new Date()) {
  const registrationOpenAt = event?.registrationOpenAt ? new Date(event.registrationOpenAt) : null;
  const registrationCloseAt = event?.registrationCloseAt ? new Date(event.registrationCloseAt) : null;
  const eventStartAt = event?.eventStartAt ? new Date(event.eventStartAt) : null;
  const eventEndAt = event?.eventEndAt ? new Date(event.eventEndAt) : null;

  const hasValidRegistrationOpen = registrationOpenAt && !Number.isNaN(registrationOpenAt.getTime());
  const hasValidRegistrationClose = registrationCloseAt && !Number.isNaN(registrationCloseAt.getTime());
  const hasValidEventStart = eventStartAt && !Number.isNaN(eventStartAt.getTime());
  const hasValidEventEnd = eventEndAt && !Number.isNaN(eventEndAt.getTime());

  const registrationIsOpen = hasValidRegistrationOpen && hasValidRegistrationClose
    ? registrationOpenAt <= now && registrationCloseAt >= now
    : false;
  const eventIsPast = hasValidEventEnd ? eventEndAt < now : false;
  const startsSoon = hasValidEventStart
    ? eventStartAt >= now && (eventStartAt.getTime() - now.getTime()) <= 3 * 24 * 60 * 60 * 1000
    : false;

  if (eventIsPast) {
    return {
      label: 'Past Event',
      tone: 'past',
      helper: hasValidEventEnd ? `Ended ${formatRelativeDayLabel(eventEndAt, now)}.` : 'Event already finished.'
    };
  }

  if (registrationIsOpen) {
    return {
      label: 'Open Registration',
      tone: 'open',
      helper: hasValidRegistrationClose
        ? `Registration closes ${formatRelativeDayLabel(registrationCloseAt, now)}.`
        : 'Registration is currently open.'
    };
  }

  if (startsSoon) {
    return {
      label: 'Starts Soon',
      tone: 'soon',
      helper: hasValidEventStart ? `Starts ${formatRelativeDayLabel(eventStartAt, now)}.` : 'Starting soon.'
    };
  }

  if (hasValidRegistrationClose && registrationCloseAt < now) {
    return {
      label: 'Registration Closed',
      tone: 'closed',
      helper: hasValidEventStart && eventStartAt >= now
        ? `Event starts ${formatRelativeDayLabel(eventStartAt, now)}.`
        : 'Registration window has closed.'
    };
  }

  return {
    label: 'Event Listing',
    tone: 'neutral',
    helper: hasValidEventStart ? `Starts ${formatRelativeDayLabel(eventStartAt, now)}.` : 'View details for timing and registration info.'
  };
}

function formatRelativeDayLabel(targetDate, now = new Date()) {
  const target = new Date(targetDate);
  if (Number.isNaN(target.getTime())) return '';

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTarget = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  const dayDiff = Math.round((startOfTarget.getTime() - startOfToday.getTime()) / (24 * 60 * 60 * 1000));

  if (dayDiff === 0) return 'today';
  if (dayDiff === 1) return 'tomorrow';
  if (dayDiff === -1) return 'yesterday';
  if (dayDiff > 1 && dayDiff <= 14) return `in ${dayDiff} days`;
  if (dayDiff < -1 && dayDiff >= -14) return `${Math.abs(dayDiff)} days ago`;

  return target.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

function normalizePositiveInt(input, fallback) {
  const parsed = Number.parseInt(input, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getAppBaseUrl() {
  return String(process.env.APP_URL || '').trim().replace(/\/+$/, '');
}

module.exports = {
  buildPublicEventListPage,
  getEventsFilterValues,
  buildEventsPageUrl
};
