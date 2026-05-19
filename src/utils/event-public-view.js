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
  const raceDistances = normalizeList(event.raceDistances).map((item) => item.toUpperCase());
  const rewardItems = buildRewardItems(event);
  const packageOptions = buildPackageOptions(event);
  const pricing = buildPricingSummary(event, packageOptions);
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
    targetDistanceLabel,
    distanceSummaryLabel,
    isAccumulatedChallenge,
    registrationState,
    pricing,
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

function buildPricingSummary(event, packageOptions) {
  const currency = event.feeCurrency || 'PHP';
  const registrationAmount = firstFiniteNumber(event.feeAmount);
  const finalAmount = firstFiniteNumber(event.finalEventFee, event.suggestedEventFee);
  const deliveryAmount = event.deliveryFeeEnabled ? firstFiniteNumber(event.deliveryFeeAmount) : null;
  const hasPackages = packageOptions.length > 0;

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

function formatProofTypeLabel(value) {
  const labels = {
    gps: 'GPS activity',
    photo: 'Photo proof',
    manual: 'Manual entry'
  };
  return labels[value] || value;
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
