const Event = require('../models/Event');
const { getCountries, getCountryName } = require('../utils/country');
const { getPublicEventVisibilityQuery } = require('../utils/public-event-visibility');
const { formatPlatformDate } = require('../utils/platform-date');
const { buildPublicEventView } = require('../utils/event-public-view');

const countries = getCountries();
const DEFAULT_EVENT_IMAGE_URL = '/images/helloRun-icon.webp';

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
  if (filterValues.dateFrom || filterValues.dateTo) {
    const dateConstraint = {};
    if (filterValues.dateFrom) dateConstraint.$gte = filterValues.dateFrom;
    if (filterValues.dateTo) {
      // Include events that start on or before dateTo (end of day)
      const endOfDay = new Date(filterValues.dateTo);
      endOfDay.setUTCHours(23, 59, 59, 999);
      dateConstraint.$lte = endOfDay;
    }
    query.eventStartAt = dateConstraint;
  }
  const dateRangeError = filterValues.dateFrom && filterValues.dateTo && filterValues.dateFrom > filterValues.dateTo
    ? 'From date must be on or before To date.'
    : '';
  if (filterValues.status === 'upcoming') {
    query.registrationOpenAt = { $gt: now };
    query.registrationCloseAt = { $gte: now };
    query.$and = query.$and || [];
    query.$and.push({
      $or: [
        { eventEndAt: { $exists: false } },
        { eventEndAt: null },
        { eventEndAt: { $gte: now } }
      ]
    });
  } else if (filterValues.status === 'open') {
    query.registrationOpenAt = { $lte: now };
    query.registrationCloseAt = { $gte: now };
    query.$and = query.$and || [];
    query.$and.push({
      $or: [
        { eventEndAt: { $exists: false } },
        { eventEndAt: null },
        { eventEndAt: { $gte: now } }
      ]
    });
  } else if (filterValues.status === 'closed') {
    query.$and = query.$and || [];
    query.$and.push({
      $or: [
        { eventEndAt: { $lt: now } },
        { registrationCloseAt: { $lt: now } },
        { registrationOpenAt: { $exists: false } },
        { registrationOpenAt: null },
        { registrationCloseAt: { $exists: false } },
        { registrationCloseAt: null }
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

  const eventSelect = 'title slug description organiserName eventType eventTypesAllowed raceDistances raceCategories eventStartAt eventEndAt venueName city country bannerImageUrl registrationCloseAt registrationOpenAt createdAt feeMode feeAmount feeCurrency pricingMode distancePricing pricingPeriods customizedOptions suggestedEventFee finalEventFee registrationPackages deliveryFeeEnabled deliveryFeeAmount';
  let events;
  if (filterValues.sort !== 'recommended') {
    const sortableEvents = await Event.find(query).select(eventSelect).lean();
    events = sortableEvents
      .sort((a, b) => compareEventsBySelectedSort(a, b, filterValues.sort, now))
      .slice(skip, skip + limit);
  } else if (filterValues.q) {
    const rankedEvents = await Event.find(query).select(eventSelect).lean();
    events = rankEventsForSearch(rankedEvents, filterValues.q)
      .sort((a, b) => compareEventsForSearch(a, b, now))
      .slice(skip, skip + limit);
  } else {
    const allEvents = await Event.find(query).select(eventSelect).lean();
    events = allEvents
      .sort((a, b) => compareEventsRecommended(a, b, now))
      .slice(skip, skip + limit);
  }

  const normalizedDistanceOptions = distanceOptions
    .map((item) => String(item || '').trim().toUpperCase())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  const activeFilterCount = Number(Boolean(filterValues.q))
    + Number(Boolean(filterValues.eventType))
    + Number(Boolean(filterValues.distance))
    + Number(filterValues.status !== 'all')
    + Number(Boolean(filterValues.dateFrom))
    + Number(Boolean(filterValues.dateTo));

  const activeFilters = getEventsActiveFilters(filterValues);
  const pageContent = getEventsPageContent(filterValues, { currentPage, totalPages });
  const resultStart = totalEvents === 0 ? 0 : skip + 1;
  const resultEnd = totalEvents === 0 ? 0 : Math.min(skip + events.length, totalEvents);

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
      const publicView = buildPublicEventView({ ...event, raceDistances }, { now });
      const distanceLabels = getEventCardDistanceLabels(raceDistances);
      const availability = getEventAvailability(event, now);
      return {
        ...event,
        raceDistances,
        organizerName: publicView.organizerName,
        eventTypeLabel: publicView.eventTypeLabel,
        priceLabel: publicView.pricing.amountLabel,
        startDateLabel: formatPlatformDate(event.eventStartAt, 'Start date not listed'),
        locationLabel: buildPublicLocationLabel(event, getCountryName(event.country)),
        distanceLabel: distanceLabels.compact,
        distanceFullLabel: distanceLabels.full,
        countryLabel: getCountryName(event.country),
        availability,
        displayState: availability,
        cardCtaLabel: availability.ctaLabel
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
      clearFiltersUrl: buildEventsPageUrl(getClearedEventFilters(filterValues), 1),
      summary: buildEventsResultsSummary(filterValues, totalEvents),
      validationError: dateRangeError
    },
    pagination: {
      currentPage,
      totalPages,
      pageSize: limit,
      resultStart,
      resultEnd,
      totalResults: totalEvents,
      getPageUrl: (pageNumber) => `${buildEventsPageUrl(filterValues, pageNumber)}#event-results`
    }
  };
}

async function listHomepagePromotedEvents(options = {}) {
  const now = options.now instanceof Date ? options.now : new Date();
  const limit = normalizePositiveInt(options.limit, 8);
  const baseQuery = {
    ...getPublicEventVisibilityQuery(now),
    $and: [
      ...(getPublicEventVisibilityQuery(now).$and || []),
      {
        $or: [
          { eventEndAt: { $exists: false } },
          { eventEndAt: null },
          { eventEndAt: { $gte: now } }
        ]
      }
    ]
  };
  const eventSelect = 'title slug description organiserName eventType eventTypesAllowed raceDistances eventStartAt eventEndAt venueName city country bannerImageUrl registrationCloseAt registrationOpenAt createdAt homeFeatured homeFeaturedRank homeFeaturedUntil';

  const featuredQuery = {
    ...baseQuery,
    homeFeatured: true,
    $and: [
      ...(baseQuery.$and || []),
      {
        $or: [
          { homeFeaturedUntil: { $exists: false } },
          { homeFeaturedUntil: null },
          { homeFeaturedUntil: { $gte: now } }
        ]
      }
    ]
  };

  const featuredEvents = await Event.find(featuredQuery)
    .sort({ homeFeaturedRank: 1, eventStartAt: 1, createdAt: -1 })
    .limit(limit)
    .select(eventSelect)
    .lean();

  const selected = featuredEvents.slice().sort(compareFeaturedHomepageEvents);
  const selectedIds = new Set(selected.map((event) => String(event._id)));

  if (selected.length < limit) {
    const fallbackEvents = await Event.find({
      ...baseQuery,
      _id: { $nin: Array.from(selectedIds) }
    })
      .sort({ registrationCloseAt: 1, eventStartAt: 1, createdAt: -1 })
      .limit(limit * 2)
      .select(eventSelect)
      .lean();
    selected.push(...fallbackEvents.slice(0, limit - selected.length));
  }

  return selected.slice(0, limit).map((event) => normalizeHomepageEventCard(event, now));
}

function compareFeaturedHomepageEvents(a, b) {
  const leftRank = Number.isFinite(a?.homeFeaturedRank) ? a.homeFeaturedRank : Number.POSITIVE_INFINITY;
  const rightRank = Number.isFinite(b?.homeFeaturedRank) ? b.homeFeaturedRank : Number.POSITIVE_INFINITY;
  if (leftRank !== rightRank) return leftRank - rightRank;
  const startDiff = getTimeValue(a?.eventStartAt) - getTimeValue(b?.eventStartAt);
  if (startDiff !== 0) return startDiff;
  return getTimeValue(b?.createdAt) - getTimeValue(a?.createdAt);
}

function getTimeValue(value) {
  if (!value) return Number.POSITIVE_INFINITY;
  const date = new Date(value);
  const time = date.getTime();
  return Number.isNaN(time) ? Number.POSITIVE_INFINITY : time;
}

function normalizeHomepageEventCard(event, now = new Date()) {
  const raceDistances = Array.isArray(event.raceDistances)
    ? event.raceDistances.map((distanceItem) => String(distanceItem || '').trim().toUpperCase()).filter(Boolean)
    : [];
  const countryLabel = getCountryName(event.country);

  return {
    id: String(event._id || ''),
    title: event.title || 'Untitled Event',
    slug: event.slug,
    href: `/events/${event.slug}`,
    description: event.description || 'View event details, registration windows, and race options.',
    organiserName: event.organiserName || '',
    eventType: event.eventType || 'event',
    eventTypeLabel: formatEventTypeLabel(event.eventType || 'event'),
    raceDistances,
    distanceLabel: raceDistances.join(', ') || 'Distances not listed',
    imageUrl: event.bannerImageUrl || DEFAULT_EVENT_IMAGE_URL,
    fallbackImageUrl: DEFAULT_EVENT_IMAGE_URL,
    dateLabel: formatPlatformDate(event.eventStartAt, 'Start date not listed'),
    locationLabel: buildPublicLocationLabel(event, countryLabel),
    displayState: getEventCardDisplayState(event, now),
    isFeatured: Boolean(event.homeFeatured)
  };
}

function buildPublicLocationLabel(event, countryLabel = '') {
  const location = [event.venueName, event.city, countryLabel].filter(Boolean).join(', ');
  if (location) return location;
  const isVirtual = String(event.eventType || '').trim() === 'virtual'
    || (Array.isArray(event.eventTypesAllowed) && event.eventTypesAllowed.includes('virtual'));
  return isVirtual ? 'Anywhere' : 'Location details not listed';
}

function parseFilterDate(value) {
  if (!value) return null;
  const str = String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return null;
  const d = new Date(`${str}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function getEventsFilterValues(query = {}) {
  const q = String(query.q || '').trim().slice(0, 100);
  const rawType = String(query.eventType || '').trim().toLowerCase();
  const rawDistance = String(query.distance || '').trim().toUpperCase();
  const rawStatus = String(query.status || '').trim().toLowerCase();
  const rawSort = String(query.sort || '').trim().toLowerCase();
  const eventType = ['virtual', 'onsite', 'hybrid'].includes(rawType) ? rawType : '';
  const distance = rawDistance && rawDistance.length <= 30 ? rawDistance : '';
  const status = ['all', 'upcoming', 'open', 'closed'].includes(rawStatus) ? rawStatus : 'all';
  const sort = ['recommended', 'closing-soon', 'start-date', 'newest'].includes(rawSort)
    ? rawSort
    : 'recommended';
  const dateFrom = parseFilterDate(query.dateFrom);
  const dateTo = parseFilterDate(query.dateTo);
  return { q, eventType, distance, status, dateFrom, dateTo, sort };
}

function getMatchingCountryCodes(searchQuery) {
  const safe = String(searchQuery || '').trim().toLowerCase();
  if (!safe) return [];
  return countries
    .filter((item) => item.name.toLowerCase().includes(safe))
    .map((item) => item.code);
}

function compareEventsBySelectedSort(a, b, sort, now = new Date()) {
  if (sort === 'newest') return compareEventsBySort(a, b, { createdAt: -1, eventStartAt: 1 });
  if (sort === 'start-date') {
    return compareDateWithMissingLast(a.eventStartAt, b.eventStartAt)
      || compareEventsBySort(a, b, { createdAt: -1 });
  }
  if (sort === 'closing-soon') {
    const leftClose = getFutureDateValue(a.registrationCloseAt, now);
    const rightClose = getFutureDateValue(b.registrationCloseAt, now);
    return compareNullableNumbers(leftClose, rightClose)
      || compareEventsRecommended(a, b, now);
  }
  return compareEventsRecommended(a, b, now);
}

function getFutureDateValue(value, now) {
  const time = getValidDateTime(value);
  return time !== null && time >= now.getTime() ? time : null;
}

function compareDateWithMissingLast(left, right) {
  return compareNullableNumbers(getValidDateTime(left), getValidDateTime(right));
}

function compareNullableNumbers(left, right) {
  if (left === right) return 0;
  if (left === null) return 1;
  if (right === null) return -1;
  return left - right;
}

function getValidDateTime(value) {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
}

function compareEventsRecommended(a, b, now = new Date()) {
  const leftAvailability = getEventAvailability(a, now);
  const rightAvailability = getEventAvailability(b, now);
  const priorityDiff = leftAvailability.priority - rightAvailability.priority;
  if (priorityDiff !== 0) return priorityDiff;

  const actionDateField = leftAvailability.key === 'open'
    ? 'registrationCloseAt'
    : leftAvailability.key === 'upcoming'
      ? 'registrationOpenAt'
      : 'eventEndAt';
  const leftActionDate = leftAvailability.key === 'closed'
    ? (a.eventEndAt || a.registrationCloseAt)
    : a[actionDateField];
  const rightActionDate = rightAvailability.key === 'closed'
    ? (b.eventEndAt || b.registrationCloseAt)
    : b[actionDateField];
  const actionDateDiff = leftAvailability.key === 'closed'
    ? compareDateDescendingWithMissingLast(leftActionDate, rightActionDate)
    : compareDateWithMissingLast(leftActionDate, rightActionDate);
  if (actionDateDiff !== 0) return actionDateDiff;

  return compareEventsBySort(a, b, { createdAt: -1, eventStartAt: 1 });
}

function compareDateDescendingWithMissingLast(left, right) {
  const leftTime = getValidDateTime(left);
  const rightTime = getValidDateTime(right);
  if (leftTime === rightTime) return 0;
  if (leftTime === null) return 1;
  if (rightTime === null) return -1;
  return rightTime - leftTime;
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

function compareEventsForSearch(a, b, now = new Date()) {
  const rankDiff = Number(b.searchRank || 0) - Number(a.searchRank || 0);
  if (rankDiff !== 0) return rankDiff;
  return compareEventsRecommended(a, b, now);
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

  const params = buildEventsQueryParams({ ...filterValues, sort: 'recommended' }, currentPage);
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
  if (filterValues.dateFrom) params.set('dateFrom', formatFilterDate(filterValues.dateFrom));
  if (filterValues.dateTo) params.set('dateTo', formatFilterDate(filterValues.dateTo));
  if (filterValues.sort && filterValues.sort !== 'recommended') params.set('sort', filterValues.sort);
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

  if (filterValues.dateFrom) {
    activeFilters.push({
      key: 'dateFrom',
      label: 'From',
      value: formatPlatformDate(filterValues.dateFrom),
      clearUrl: buildEventsPageUrl({ ...filterValues, dateFrom: null }, 1)
    });
  }

  if (filterValues.dateTo) {
    activeFilters.push({
      key: 'dateTo',
      label: 'To',
      value: formatPlatformDate(filterValues.dateTo),
      clearUrl: buildEventsPageUrl({ ...filterValues, dateTo: null }, 1)
    });
  }

  return activeFilters;
}

function getClearedEventFilters(filterValues = {}) {
  return {
    q: '',
    eventType: '',
    distance: '',
    status: 'all',
    dateFrom: null,
    dateTo: null,
    sort: filterValues.sort || 'recommended'
  };
}

function formatEventTypeLabel(value) {
  if (value === 'onsite') return 'On-site';
  if (value === 'virtual') return 'Virtual';
  if (value === 'hybrid') return 'Hybrid';
  return String(value || '').trim();
}

function formatEventStatusLabel(value) {
  if (value === 'upcoming') return 'Opens later';
  if (value === 'open') return 'Open now';
  if (value === 'closed') return 'Closed';
  return 'All';
}

function getEventsPageContent(filterValues, pagination = {}) {
  const filterLabel = getEventsFilterNarrative(filterValues);
  const displayFilterLabel = capitalizeFirst(filterLabel);
  const pageSuffix = Number(pagination.currentPage || 1) > 1
    ? ` - Page ${pagination.currentPage}`
    : '';
  const titlePrefix = displayFilterLabel ? `${displayFilterLabel} Events` : 'Running Events';
  const heroTitle = displayFilterLabel ? `${displayFilterLabel} Events` : 'Discover Running Events';
  const defaultDescription = 'Discover HelloRun events, browse by mode and distance, and find your next race or virtual challenge.';
  const filteredDescription = filterLabel
    ? `Browse ${getEventsFilterNarrative(filterValues, { lowercaseBase: true })} on HelloRun and find your next race or virtual challenge.`
    : defaultDescription;
  const heroDescription = filterLabel
    ? buildEventsHeroDescription(filterValues)
    : 'Compare virtual, on-site, and hybrid events to find your next challenge.';

  return {
    title: `${titlePrefix}${pageSuffix} - HelloRun`,
    heroTitle,
    heroDescription,
    seo: {
      description: filteredDescription,
      ogTitle: `${titlePrefix}${pageSuffix} - HelloRun`,
      twitterTitle: `${titlePrefix}${pageSuffix} - HelloRun`
    }
  };
}

function buildEventsResultsSummary(filterValues, totalEvents) {
  if (!hasAnyEventsFilters(filterValues)) {
    return 'Browse active HelloRun races by mode, distance, and registration status.';
  }

  const verb = Number(totalEvents || 0) === 1 ? 'matches' : 'match';
  return `${Number(totalEvents || 0).toLocaleString('en-US')} event${Number(totalEvents || 0) === 1 ? '' : 's'} ${verb} ${getEventsFilterNarrative(filterValues, { lowercaseBase: true })}.`;
}

function buildEventsHeroDescription(filterValues) {
  const narrative = getEventsFilterNarrative(filterValues, { lowercaseBase: true });
  if (!narrative) {
    return 'Explore active HelloRun races and pick your next challenge.';
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
  const dateNarrative = getEventsDateNarrative(filterValues);

  const base = parts.length
    ? parts.map((part) => (lowercaseBase ? String(part).toLowerCase() : part)).join(' ')
    : '';
  const datedBase = [base, dateNarrative].filter(Boolean).join(' ');
  if (filterValues.q) {
    return datedBase
      ? `${datedBase} results for "${filterValues.q}"`
      : `results for "${filterValues.q}"`;
  }

  return datedBase;
}

function hasAnyEventsFilters(filterValues) {
  return Boolean(
    filterValues.q ||
    filterValues.eventType ||
    filterValues.distance ||
    (filterValues.status && filterValues.status !== 'all') ||
    filterValues.dateFrom ||
    filterValues.dateTo
  );
}

function capitalizeFirst(value) {
  const text = String(value || '');
  return text ? `${text.charAt(0).toUpperCase()}${text.slice(1)}` : '';
}

function getEventsDateNarrative(filterValues) {
  if (filterValues.dateFrom && filterValues.dateTo) {
    return `from ${formatPlatformDate(filterValues.dateFrom)} through ${formatPlatformDate(filterValues.dateTo)}`;
  }
  if (filterValues.dateFrom) return `starting on or after ${formatPlatformDate(filterValues.dateFrom)}`;
  if (filterValues.dateTo) return `starting on or before ${formatPlatformDate(filterValues.dateTo)}`;
  return '';
}

function formatFilterDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

function getEventCardDisplayState(event, now = new Date()) {
  return getEventAvailability(event, now);
}

function getEventAvailability(event, now = new Date()) {
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
  const registrationHasClosed = hasValidRegistrationClose && registrationCloseAt < now;

  if (eventIsPast || registrationHasClosed) {
    return {
      key: 'closed',
      priority: 2,
      label: 'Closed',
      tone: 'closed',
      helper: eventIsPast
        ? `Event ended ${formatRelativeDayLabel(eventEndAt, now)}.`
        : `Registration closed ${formatRelativeDayLabel(registrationCloseAt, now)}.`,
      ctaLabel: 'View recap'
    };
  }

  if (registrationIsOpen) {
    return {
      key: 'open',
      priority: 0,
      label: 'Open now',
      tone: 'open',
      helper: hasValidRegistrationClose
        ? `Registration closes ${formatRelativeDayLabel(registrationCloseAt, now)}.`
        : 'Registration is currently open.',
      ctaLabel: 'View & register'
    };
  }

  if (hasValidRegistrationOpen && registrationOpenAt > now) {
    return {
      key: 'upcoming',
      priority: 1,
      label: 'Opens later',
      tone: 'soon',
      helper: `Registration opens ${formatRelativeDayLabel(registrationOpenAt, now)}.`,
      ctaLabel: 'View event'
    };
  }

  return {
    key: 'closed',
    priority: 2,
    label: 'Closed',
    tone: 'closed',
    helper: hasValidEventStart
      ? `Event starts ${formatRelativeDayLabel(eventStartAt, now)}; registration is unavailable.`
      : 'Registration is unavailable.',
    ctaLabel: 'View recap'
  };
}

function getEventCardDistanceLabels(raceDistances = []) {
  const normalized = Array.isArray(raceDistances)
    ? raceDistances.map((item) => String(item || '').trim().toUpperCase()).filter(Boolean)
    : [];
  if (!normalized.length) return { compact: 'Distances not listed', full: 'Distances not listed' };
  const compactOptions = normalized.map((item) => {
    const distancePrefix = item.match(/^(\d+(?:\.\d+)?\s*(?:K|KM|MI|M))\b/i);
    return distancePrefix ? distancePrefix[1].replace(/\s+/g, '') : item;
  });
  const uniqueCompactOptions = [...new Set(compactOptions)];
  const visible = uniqueCompactOptions.slice(0, 3).join(', ');
  const remaining = uniqueCompactOptions.length - 3;
  return {
    compact: remaining > 0 ? `${visible} +${remaining} more` : visible,
    full: normalized.join(', ')
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

  return formatPlatformDate(target);
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
  getEventCardDisplayState,
  getEventAvailability,
  getEventCardDistanceLabels,
  compareEventsRecommended,
  getEventsFilterValues,
  buildEventsPageUrl,
  buildEventsQueryParams,
  buildEventsCanonicalUrl,
  getEventsActiveFilters,
  getClearedEventFilters,
  compareEventsBySelectedSort,
  listHomepagePromotedEvents,
  normalizeHomepageEventCard
};
