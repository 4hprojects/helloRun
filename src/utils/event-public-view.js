const { markdownToHtml } = require('./markdown');
const { sanitizeHtml, htmlToPlainText } = require('./sanitize');
const { getCountryName } = require('./country');

const EVENT_DETAILS_SANITIZE_OPTIONS = Object.freeze({
  allowedTags: [
    'p',
    'br',
    'strong',
    'em',
    'u',
    's',
    'ul',
    'ol',
    'li',
    'h1',
    'h2',
    'h3',
    'h4',
    'blockquote',
    'a',
    'hr',
    'table',
    'thead',
    'tbody',
    'tr',
    'th',
    'td',
    'code',
    'span'
  ],
  allowedAttributes: {
    a: ['href', 'rel', 'target'],
    ol: ['class'],
    ul: ['class'],
    span: ['class']
  }
});

function renderEventDetailsContent(value) {
  const content = String(value || '').trim();
  if (!content) return '';

  if (looksLikeHtml(content)) {
    return sanitizeHtml(content, EVENT_DETAILS_SANITIZE_OPTIONS);
  }

  return sanitizeHtml(markdownToHtml(content), EVENT_DETAILS_SANITIZE_OPTIONS);
}

function buildPublicEventView(event, options = {}) {
  const now = options.now instanceof Date ? options.now : new Date();
  const registrationCount = Number(options.registrationCount || 0);
  const registrationState = buildRegistrationState(event, now);
  const eventTypeLabel = formatEventTypeLabel(event.eventType);
  const allowedModes = normalizeList(event.eventTypesAllowed).map(formatEventTypeLabel).filter(Boolean);
  const raceCategories = buildRaceCategorySummaries(event);
  const categoryDistanceLabels = raceCategories
    .map((category) => category.distanceLabel)
    .filter(Boolean);
  const raceDistances = uniqueList(normalizeList(event.raceDistances).map((item) => item.toUpperCase()).concat(categoryDistanceLabels));
  const rewardItems = buildRewardItems(event);
  const packageOptions = buildPackageOptions(event);
  const pricingOptions = buildPricingOptions(event, raceCategories);
  const pricing = buildPricingSummary(event, packageOptions, pricingOptions);
  const timeline = buildTimeline(event);
  const virtualRules = buildVirtualRules(event);
  const location = buildLocation(event);
  const heroImageUrl = event.bannerImageUrl || event.posterImageUrl || '/images/helloRun-icon.webp';
  const posterImageUrl = event.posterImageUrl || '';
  const galleryImageUrls = Array.isArray(event.galleryImageUrls) ? event.galleryImageUrls.filter(Boolean) : [];
  const targetDistanceLabel = Number.isFinite(Number(event.targetDistanceKm)) && Number(event.targetDistanceKm) > 0
    ? `${formatNumber(event.targetDistanceKm)} km`
    : (raceDistances[0] || 'Open distance');
  const isAccumulatedChallenge = event.virtualCompletionMode === 'accumulated_distance';
  const distanceSummaryLabel = raceDistances.length
    ? raceDistances.join(', ')
    : targetDistanceLabel;

  return {
    title: event.title || 'helloRun Event',
    slug: event.slug || '',
    organizerName: event.organiserName || 'helloRun',
    description: event.description || '',
    descriptionText: htmlToPlainText(event.description || ''),
    eventTypeLabel,
    allowedModes,
    raceDistances,
    raceCategories,
    targetDistanceLabel,
    distanceSummaryLabel,
    isAccumulatedChallenge,
    registrationState,
    pricing,
    pricingOptions,
    rewardItems,
    packageOptions,
    timeline,
    virtualRules,
    location,
    showLocation: Boolean(location.summary),
    heroImageUrl,
    posterImageUrl,
    galleryImageUrls,
    logoUrl: event.logoUrl || '',
    stats: buildStats({ event, registrationCount, targetDistanceLabel, raceDistances, distanceSummaryLabel }),
    primaryCta: registrationState.canRegisterNow
      ? { label: 'Register Now', href: `/events/${event.slug}/register`, disabled: false }
      : { label: registrationState.label, href: '', disabled: true },
    secondaryCtas: [
      event.leaderboardRecognitionEnabled !== false ? { label: 'View Leaderboard', href: `/leaderboard?event=${encodeURIComponent(event.slug || '')}` } : null
    ].filter(Boolean)
  };
}

function buildPublicEventSeo(event, baseUrl = '') {
  const canonicalUrl = baseUrl && event.slug ? `${baseUrl.replace(/\/+$/, '')}/events/${event.slug}` : '';
  const description = htmlToPlainText(event.description || event.eventDetailsMarkdown || '').slice(0, 160);
  const ogImage = event.bannerImageUrl || event.posterImageUrl || (baseUrl ? `${baseUrl.replace(/\/+$/, '')}/images/helloRun-icon.webp` : '');

  return {
    description,
    canonicalUrl,
    ogTitle: `${event.title || 'helloRun Event'} - helloRun`,
    twitterTitle: `${event.title || 'helloRun Event'} - helloRun`,
    ogType: 'article',
    ogImage
  };
}

function looksLikeHtml(value) {
  return /<\/?[a-z][\s\S]*>/i.test(String(value || ''));
}

function buildRegistrationState(event, now) {
  const registrationOpenAt = parseDate(event.registrationOpenAt);
  const registrationCloseAt = parseDate(event.registrationCloseAt);
  const eventEndAt = parseDate(event.eventEndAt);
  const isPast = eventEndAt && eventEndAt < now;
  const isNotOpenYet = registrationOpenAt && registrationOpenAt > now;
  const isClosed = registrationCloseAt && registrationCloseAt < now;
  const canRegisterNow = !isPast && !isNotOpenYet && !isClosed;

  if (isPast) {
    return {
      label: 'Event Ended',
      tone: 'closed',
      canRegisterNow: false,
      helper: `Event ended ${formatDate(eventEndAt)}.`
    };
  }
  if (isClosed) {
    return {
      label: 'Registration Closed',
      tone: 'closed',
      canRegisterNow: false,
      helper: `Registration closed ${formatDate(registrationCloseAt)}.`
    };
  }
  if (isNotOpenYet) {
    return {
      label: 'Registration Opens Soon',
      tone: 'upcoming',
      canRegisterNow: false,
      helper: `Registration opens ${formatDate(registrationOpenAt)}.`
    };
  }

  return {
    label: 'Registration Open',
    tone: 'open',
    canRegisterNow: true,
    helper: registrationCloseAt ? `Registration closes ${formatDate(registrationCloseAt)}.` : 'Registration is currently open.'
  };
}

function buildPricingSummary(event, packageOptions, pricingOptions = []) {
  const currency = event.feeCurrency || 'PHP';
  const pricingMode = normalizePricingMode(event.pricingMode, event.feeMode);
  const registrationAmount = firstFiniteNumber(event.feeAmount);
  const finalAmount = firstFiniteNumber(event.finalEventFee, event.suggestedEventFee);
  const deliveryAmount = event.deliveryFeeEnabled ? firstFiniteNumber(event.deliveryFeeAmount) : null;
  const hasPackages = packageOptions.length > 0;
  const hasPricingOptions = pricingOptions.length > 0;

  if (event.feeMode !== 'paid') {
    return {
      label: 'Free registration',
      amountLabel: 'Free',
      helper: deliveryAmount !== null || hasPackages
        ? 'Optional add-ons or delivery fees may apply when configured by the organizer.'
        : 'No registration fee is listed for this event.',
      currency,
      registrationAmount: 0,
      deliveryAmount,
      hasOptionalCosts: deliveryAmount !== null || hasPackages
    };
  }

  if (hasPricingOptions) {
    const prices = pricingOptions
      .map((option) => firstFiniteNumber(option.amount))
      .filter((amount) => amount !== null);
    const minAmount = prices.length ? Math.min(...prices) : null;
    const maxAmount = prices.length ? Math.max(...prices) : null;
    const amountLabel = minAmount === null
      ? 'See options'
      : minAmount === maxAmount
        ? formatMoney(minAmount, currency)
        : `${formatMoney(minAmount, currency)} - ${formatMoney(maxAmount, currency)}`;
    const isCustomizedPricing = pricingMode === 'customized_options' || pricingMode === 'customized_options_period';
    return {
      label: isCustomizedPricing ? 'Signup options' : 'Registration pricing',
      amountLabel,
      helper: isCustomizedPricing
        ? 'Choose your signup option during registration.'
        : 'Price depends on the distance selected during registration.',
      currency,
      registrationAmount: minAmount,
      deliveryAmount,
      hasOptionalCosts: true
    };
  }

  if (registrationAmount !== null && registrationAmount > 0) {
    return {
      label: 'Registration fee',
      amountLabel: formatMoney(registrationAmount, currency),
      helper: deliveryAmount !== null ? `Delivery or claiming fee: ${formatMoney(deliveryAmount, currency)}.` : 'Payment instructions are shown during registration when required.',
      currency,
      registrationAmount,
      deliveryAmount,
      hasOptionalCosts: deliveryAmount !== null || hasPackages
    };
  }

  if (hasPackages) {
    return {
      label: 'Free base registration',
      amountLabel: 'Free to join',
      helper: 'Optional event packages are available below.',
      currency,
      registrationAmount: 0,
      deliveryAmount,
      hasOptionalCosts: true
    };
  }

  if (deliveryAmount !== null && finalAmount !== null && finalAmount <= deliveryAmount) {
    return {
      label: 'Free base registration',
      amountLabel: 'Free to join',
      helper: `Optional delivery or add-on fee: ${formatMoney(deliveryAmount, currency)}.`,
      currency,
      registrationAmount: 0,
      deliveryAmount,
      hasOptionalCosts: true
    };
  }

  if (finalAmount !== null && finalAmount > 0) {
    return {
      label: 'Event fee',
      amountLabel: formatMoney(finalAmount, currency),
      helper: deliveryAmount !== null ? `Includes configured event and delivery fees where applicable.` : 'Payment instructions are shown during registration when required.',
      currency,
      registrationAmount: finalAmount,
      deliveryAmount,
      hasOptionalCosts: deliveryAmount !== null
    };
  }

  return {
    label: 'Pricing pending',
    amountLabel: 'TBA',
    helper: 'The organizer has not published final pricing details yet.',
    currency,
    registrationAmount: null,
    deliveryAmount,
    hasOptionalCosts: deliveryAmount !== null
  };
}

function buildPricingOptions(event, raceCategories = []) {
  if (event.feeMode !== 'paid') return [];
  const pricingMode = normalizePricingMode(event.pricingMode, event.feeMode);
  const currency = event.feeCurrency || 'PHP';

  if (pricingMode === 'customized_options' || pricingMode === 'customized_options_period') {
    return (Array.isArray(event.customizedOptions) ? event.customizedOptions : [])
      .map((option) => {
        const label = String(option?.shortDescription || '').trim();
        const amount = firstFiniteNumber(option?.amount);
        if (!label || amount === null) return null;
        return {
          type: 'customized_option',
          label,
          amount,
          amountLabel: formatMoney(amount, currency),
          helper: 'Selectable during signup'
        };
      })
      .filter(Boolean);
  }

  if (pricingMode === 'package_period') {
    return (Array.isArray(event.registrationPackages) ? event.registrationPackages : [])
      .map((packageOption) => {
        const label = String(packageOption?.name || '').trim();
        const prices = (Array.isArray(packageOption?.pricingPeriods) ? packageOption.pricingPeriods : [])
          .map((period) => firstFiniteNumber(period?.amount))
          .filter((value) => value !== null);
        const amount = prices.length ? Math.min(...prices) : null;
        if (!label || amount === null) return null;
        return {
          type: 'registration_package',
          label,
          amount,
          amountLabel: prices.length > 1 ? `From ${formatMoney(amount, currency)}` : formatMoney(amount, currency),
          helper: 'Based on selected package and registration date'
        };
      })
      .filter(Boolean);
  }

  if (pricingMode === 'distance_based' || pricingMode === 'distance_based_period') {
    const categoriesById = new Map();
    const categoriesByDistance = new Map();
    raceCategories.forEach((category) => {
      if (category.id) categoriesById.set(category.id, category);
      if (category.distanceLabel && !categoriesByDistance.has(category.distanceLabel)) {
        categoriesByDistance.set(category.distanceLabel, category);
      }
    });

    return (Array.isArray(event.distancePricing) ? event.distancePricing : [])
      .map((item) => {
        const distanceLabel = String(item?.distance || '').trim().toUpperCase();
        const categoryId = String(item?.categoryId || '').trim();
        const category = (categoryId && categoriesById.get(categoryId)) || categoriesByDistance.get(distanceLabel);
        const label = category ? category.pricingLabel : distanceLabel;
        const prices = [item?.amount, item?.earlyBirdAmount, item?.regularAmount, item?.lateAmount]
          .map((value) => firstFiniteNumber(value))
          .filter((value) => value !== null);
        const amount = prices.length ? Math.min(...prices) : null;
        if (!label || amount === null) return null;
        return {
          type: 'distance_based',
          label,
          amount,
          amountLabel: prices.length > 1 ? `From ${formatMoney(amount, currency)}` : formatMoney(amount, currency),
          helper: pricingMode === 'distance_based_period' ? 'Based on selected distance and registration date' : 'Based on selected distance'
        };
      })
      .filter(Boolean);
  }

  return [];
}

function buildRewardItems(event) {
  const items = [];
  if (event.digitalCertificateEnabled !== false) items.push({ label: 'Digital certificate', type: 'digital' });
  if (event.digitalBadgeEnabled) items.push({ label: 'Digital badge', type: 'digital' });
  if (event.leaderboardRecognitionEnabled !== false) items.push({ label: 'Leaderboard recognition', type: 'digital' });

  if (event.physicalRewardsEnabled) {
    if (event.physicalRewardMedalEnabled) items.push({ label: 'Finisher medal', type: 'physical' });
    if (event.physicalRewardShirtEnabled) items.push({ label: 'Event shirt', type: 'physical' });
    if (event.physicalRewardPatchEnabled) items.push({ label: 'Patch', type: 'physical' });
    if (event.physicalRewardTowelEnabled) items.push({ label: 'Towel', type: 'physical' });
    if (event.physicalRewardFinisherKitEnabled) items.push({ label: 'Finisher kit', type: 'physical' });
    normalizeOtherItems(event.physicalRewardOtherItems).forEach((item) => {
      items.push({ label: item.name, type: 'physical' });
    });
  }

  return items;
}

function buildRaceCategorySummaries(event) {
  const structuredCategories = Array.isArray(event.raceCategories) ? event.raceCategories : [];
  const summaries = structuredCategories
    .map((category, index) => {
      const name = String(category?.name || '').trim();
      const distanceLabel = String(category?.distanceLabel || '').trim().toUpperCase();
      const displayName = name || distanceLabel;
      if (!displayName) return null;

      const typeLabel = formatRaceCategoryTypeLabel(category?.type);
      const distanceKm = firstFiniteNumber(category?.distanceKm);
      const distanceKmLabel = distanceKm !== null && distanceKm > 0 ? `${formatNumber(distanceKm)} km` : '';
      const slots = firstFiniteNumber(category?.slots);
      const slotsLabel = slots !== null && slots > 0 ? `${formatNumber(slots)} slots` : '';
      const cutoffTime = String(category?.cutoffTime || '').trim();
      const ageGroup = String(category?.ageGroup || '').trim();
      const rewardsDescription = String(category?.rewardsDescription || '').trim();
      const details = [distanceLabel, distanceKmLabel, slotsLabel, cutoffTime, ageGroup].filter(Boolean);

      return {
        id: String(category?.categoryId || category?._id || category?.id || `category-${index + 1}`).trim(),
        name: displayName,
        type: String(category?.type || 'distance').trim() || 'distance',
        typeLabel,
        distanceLabel,
        distanceKm,
        distanceKmLabel,
        slots,
        slotsLabel,
        cutoffTime,
        ageGroup,
        rewardsDescription,
        summary: details.join(' | ') || typeLabel,
        pricingLabel: name && distanceLabel && name.toUpperCase() !== distanceLabel ? `${name} (${distanceLabel})` : displayName,
        isLegacy: false
      };
    })
    .filter(Boolean);

  if (summaries.length) return summaries;

  return normalizeList(event.raceDistances)
    .map((distance, index) => {
      const label = distance.toUpperCase();
      return {
        id: `legacy-distance-${index + 1}`,
        name: label,
        type: 'distance',
        typeLabel: 'Distance',
        distanceLabel: label,
        distanceKm: null,
        distanceKmLabel: '',
        slots: null,
        slotsLabel: '',
        cutoffTime: '',
        ageGroup: '',
        rewardsDescription: '',
        summary: label,
        pricingLabel: label,
        isLegacy: true
      };
    });
}

function buildPackageOptions(event) {
  return (Array.isArray(event.registrationPackages) ? event.registrationPackages : [])
    .map((packageOption) => {
      const name = String(packageOption.name || '').trim();
      if (!name) return null;
      const periods = Array.isArray(packageOption.pricingPeriods) ? packageOption.pricingPeriods : [];
      const prices = periods
        .map((period) => firstFiniteNumber(period.amount))
        .filter((amount) => amount !== null);
      const lowestAmount = prices.length ? Math.min(...prices) : null;
      return {
        name,
        notes: String(packageOption.notes || '').trim(),
        amountLabel: lowestAmount !== null ? `From ${formatMoney(lowestAmount, event.feeCurrency || 'PHP')}` : 'Price TBA',
        includedItems: formatIncludedItems(packageOption.includedItems)
      };
    })
    .filter(Boolean);
}

function buildTimeline(event) {
  return [
    { label: 'Registration Opens', value: formatDate(event.registrationOpenAt), icon: 'calendar-plus' },
    { label: 'Registration Closes', value: formatDate(event.registrationCloseAt), icon: 'calendar-x' },
    { label: 'Event Starts', value: formatDate(event.eventStartAt), icon: 'flag' },
    { label: 'Event Ends', value: formatDate(event.eventEndAt), icon: 'badge-check' },
    event.finalSubmissionDeadlineAt
      ? { label: 'Final Submission Deadline', value: formatDate(event.finalSubmissionDeadlineAt), icon: 'upload-cloud' }
      : null
  ].filter(Boolean);
}

function buildVirtualRules(event) {
  const acceptedActivities = normalizeList(event.acceptedRunTypes).map(formatActivityTypeLabel);
  const proofTypes = normalizeList(event.proofTypesAllowed).map(formatProofTypeLabel);
  const minimumDistance = Number.isFinite(Number(event.minimumActivityDistanceKm)) && Number(event.minimumActivityDistanceKm) > 0
    ? `${formatNumber(event.minimumActivityDistanceKm)} km minimum per submission`
    : '';

  return {
    completionMode: event.virtualCompletionMode === 'accumulated_distance' ? 'Accumulated distance challenge' : 'Single activity completion',
    targetDistanceKm: Number.isFinite(Number(event.targetDistanceKm)) ? Number(event.targetDistanceKm) : null,
    acceptedActivities,
    proofTypes,
    minimumDistance,
    finalSubmissionDeadline: formatDate(event.finalSubmissionDeadlineAt),
    leaderboardMode: formatLeaderboardMode(event.leaderboardMode),
    recognitionMode: formatRecognitionMode(event.recognitionMode),
    virtualWindowLabel: formatDateRange(event.virtualWindow?.startAt, event.virtualWindow?.endAt)
  };
}

function buildLocation(event) {
  const cityCountry = [event.city, getCountryName(event.country)].filter(Boolean).join(', ');
  const summary = [event.venueName, cityCountry].filter(Boolean).join(' - ');
  return {
    venueName: event.venueName || '',
    address: event.venueAddress || '',
    cityCountry,
    summary
  };
}

function buildStats({ event, registrationCount, targetDistanceLabel, raceDistances = [], distanceSummaryLabel = '' }) {
  const isAccumulatedChallenge = event.virtualCompletionMode === 'accumulated_distance';
  const hasMultipleDistances = !isAccumulatedChallenge && raceDistances.length > 1;
  const stats = [
    { label: 'Signups', value: String(registrationCount), helper: 'Registered runners' }
  ];

  if (isAccumulatedChallenge && raceDistances.length) {
    stats.push({
      label: raceDistances.length > 1 ? 'Registration Options' : 'Registration Option',
      value: distanceSummaryLabel || raceDistances.join(', '),
      helper: raceDistances.length > 1 ? 'Distance labels' : 'Distance label'
    });
  } else {
    stats.push({
      label: isAccumulatedChallenge ? 'Target' : (hasMultipleDistances ? 'Distances' : 'Distance'),
      value: isAccumulatedChallenge ? targetDistanceLabel : (distanceSummaryLabel || targetDistanceLabel),
      helper: isAccumulatedChallenge ? 'Accumulated goal' : (hasMultipleDistances ? 'Race distances' : 'Race distance')
    });
  }

  if (event.eventEndAt && event.eventStartAt) {
    const start = parseDate(event.eventStartAt);
    const end = parseDate(event.eventEndAt);
    if (start && end && end >= start) {
      const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1);
      stats.push({ label: 'Duration', value: `${days} days`, helper: 'Event window' });
    }
  }

  return stats;
}

function formatIncludedItems(includedItems = {}) {
  const items = [];
  if (includedItems.medal) items.push('Medal');
  if (includedItems.shirt) items.push('Shirt');
  if (includedItems.towel) items.push('Towel');
  if (includedItems.patch) items.push('Patch');
  if (includedItems.finisherKit) items.push('Finisher kit');
  normalizeList(includedItems.otherItemNames).forEach((item) => items.push(item));
  return items;
}

function normalizeOtherItems(value) {
  return (Array.isArray(value) ? value : [])
    .map((item) => ({
      name: String(item?.name || '').trim(),
      amount: firstFiniteNumber(item?.amount)
    }))
    .filter((item) => item.name);
}

function normalizeList(value) {
  return (Array.isArray(value) ? value : [])
    .map((item) => String(item || '').trim())
    .filter(Boolean);
}

function uniqueList(items) {
  const seen = new Set();
  const result = [];
  items.forEach((item) => {
    const value = String(item || '').trim();
    if (!value || seen.has(value)) return;
    seen.add(value);
    result.push(value);
  });
  return result;
}

function formatEventTypeLabel(value) {
  const normalized = String(value || '').trim();
  if (normalized === 'onsite') return 'Onsite';
  if (normalized === 'hybrid') return 'Hybrid';
  if (normalized === 'virtual') return 'Virtual';
  return normalized || 'Event';
}

function formatActivityTypeLabel(value) {
  const labels = {
    run: 'Run',
    walk: 'Walk',
    hike: 'Hike',
    trail_run: 'Trail run'
  };
  return labels[value] || value;
}

function formatRaceCategoryTypeLabel(value) {
  const labels = {
    distance: 'Distance',
    challenge: 'Challenge',
    open: 'Open',
    other: 'Other'
  };
  return labels[value] || 'Category';
}

function formatProofTypeLabel(value) {
  const labels = {
    running_app_sync: 'Strava or running app sync',
    gps: 'GPS activity',
    photo: 'Photo proof',
    manual: 'Manual entry'
  };
  return labels[value] || value;
}

function normalizePricingMode(value, feeMode = 'free') {
  if (String(feeMode || '').trim() !== 'paid') return 'free';
  const raw = String(value || '').trim();
  if (!raw || raw === 'free') return 'distance_based';
  if (raw === 'same_fee') return 'customized_options';
  if (raw === 'per_distance') return 'distance_based';
  if (raw === 'per_distance_period') return 'distance_based_period';
  return raw;
}

function formatLeaderboardMode(value) {
  const labels = {
    finishers: 'Finishers leaderboard',
    top_distance: 'Top total distance',
    finishers_and_top_distance: 'Finishers and top total distance'
  };
  return labels[value] || 'Leaderboard recognition';
}

function formatRecognitionMode(value) {
  const labels = {
    completion_only: 'Completion recognition',
    completion_with_optional_ranking: 'Completion with optional ranking'
  };
  return labels[value] || 'Completion recognition';
}

function formatDateRange(startValue, endValue) {
  const start = formatDate(startValue);
  const end = formatDate(endValue);
  if (start === 'TBA' && end === 'TBA') return 'TBA';
  return `${start} - ${end}`;
}

function formatDate(value) {
  const date = parseDate(value);
  if (!date) return 'TBA';
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function formatMoney(amount, currency = 'PHP') {
  const value = Number(amount);
  if (!Number.isFinite(value)) return 'TBA';
  return `${currency || 'PHP'} ${value.toLocaleString('en-US', {
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2
  })}`;
}

function formatNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return String(value || '');
  return number.toLocaleString('en-US', {
    maximumFractionDigits: 2
  });
}

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function firstFiniteNumber(...values) {
  for (const value of values) {
    if (value === null || value === undefined || value === '') continue;
    const number = Number(value);
    if (Number.isFinite(number)) return number;
  }
  return null;
}

module.exports = {
  buildPublicEventSeo,
  buildPublicEventView,
  renderEventDetailsContent
};
