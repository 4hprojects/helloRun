const LEGACY_PRICING_MODE_MAP = Object.freeze({
  same_fee: 'customized_options',
  per_distance: 'distance_based',
  per_distance_period: 'distance_based_period'
});

function normalizePricingMode(value, feeMode = 'free') {
  if (String(feeMode || '').trim() !== 'paid') return 'free';
  const raw = String(value || '').trim();
  if (!raw || raw === 'free') return 'distance_based';
  return LEGACY_PRICING_MODE_MAP[raw] || raw;
}

function getCustomizedRegistrationOptions(event = {}) {
  return (Array.isArray(event.customizedOptions) ? event.customizedOptions : [])
    .map((option, index) => {
      const id = String(option?._id || option?.id || index).trim();
      const shortDescription = String(option?.shortDescription || '').trim();
      const amount = Number(option?.amount);
      return {
        id,
        shortDescription,
        amount: Number.isFinite(amount) ? amount : null,
        currency: String(event.feeCurrency || 'PHP').trim().toUpperCase() || 'PHP'
      };
    })
    .filter((option) => option.shortDescription && Number.isFinite(option.amount) && option.amount >= 0);
}

function getRaceCategoryOptions(event = {}) {
  return (Array.isArray(event.raceCategories) ? event.raceCategories : [])
    .map((category, index) => {
      // `categoryId` first, `_id` only as a fallback. Mongoose re-mints the subdocument
      // `_id` on every organiser save, so anything keyed on it drifts — while capacity,
      // waitlist offers, the slot release on cancellation, the accumulated-challenge
      // target, the minimum submission distance and the recount all key on the slug.
      // With `_id` winning, none of those ever matched.
      const id = String(category?.categoryId || category?._id || category?.id || '').trim();
      const distanceLabel = String(category?.distanceLabel || category?.name || '').trim().toUpperCase();
      const name = String(category?.name || distanceLabel || '').trim();
      return {
        id: id || `category-${index}`,
        name,
        type: String(category?.type || '').trim(),
        distanceLabel,
        // Carried so the registration form can mark a full category unavailable before
        // somebody fills in the whole thing. Absent `reserved` reads as zero, as everywhere.
        slots: Number.isFinite(Number(category?.slots)) ? Number(category.slots) : null,
        reserved: Number(category?.reserved) || 0
      };
    })
    .filter((category) => category.distanceLabel || category.name);
}

function formatIncludedPackageItems(includedItems = {}) {
  const items = [];
  if (includedItems.medal) items.push('Medal');
  if (includedItems.shirt) items.push('Shirt');
  if (includedItems.towel) items.push('Towel');
  if (includedItems.patch) items.push('Patch');
  if (includedItems.finisherKit) items.push('Finisher kit');
  if (Array.isArray(includedItems.otherItemNames)) {
    includedItems.otherItemNames
      .map((item) => String(item || '').trim())
      .filter(Boolean)
      .forEach((item) => items.push(item));
  }
  return items;
}

function getRegistrationPackageOptions(event = {}) {
  return (Array.isArray(event.registrationPackages) ? event.registrationPackages : [])
    .map((packageOption, index) => {
      const id = String(packageOption?.packageId || packageOption?._id || packageOption?.id || '').trim();
      const name = String(packageOption?.name || '').trim();
      const pricingPeriods = Array.isArray(packageOption?.pricingPeriods) ? packageOption.pricingPeriods : [];
      return {
        id: id || `package-${index}`,
        name,
        includedItems: formatIncludedPackageItems(packageOption?.includedItems),
        pricingPeriods
      };
    })
    .filter((packageOption) => packageOption.name);
}

/**
 * The category this registration is for, independent of how it is priced.
 *
 * Resolved once, up front, because every pricing branch needs it. Capacity is claimed on
 * `raceCategoryId`, and only the distance-based branch used to set it — so a free event, or
 * one priced by signup option or package, reserved nothing at all and its `slots` were
 * decoration.
 */
function resolveSelectedCategory(event = {}, formData = {}) {
  const raceDistance = String(formData.raceDistance || '').trim().toUpperCase();
  if (!raceDistance) return null;
  return (
    getRaceCategoryOptions(event).find(
      (category) => category.distanceLabel === raceDistance || category.name.toUpperCase() === raceDistance
    ) || null
  );
}

function resolveRegistrationPrice(event = {}, formData = {}, options = {}) {
  const currency = String(event.feeCurrency || 'PHP').trim().toUpperCase() || 'PHP';
  const pricingMode = normalizePricingMode(event.pricingMode, event.feeMode);
  const now = options.now instanceof Date ? options.now : new Date();

  // Carried into every branch below. An event with no categories still yields '' and
  // behaves exactly as it did before.
  const category = resolveSelectedCategory(event, formData);
  const categoryFields = {
    raceCategoryId: category?.id || '',
    raceCategoryName: category?.name || '',
    raceCategoryType: category?.type || ''
  };

  if (String(event.feeMode || '').trim() !== 'paid' || pricingMode === 'free') {
    return buildResolvedPrice({
      pricingMode: 'free',
      source: 'free',
      label: 'Free registration',
      amount: 0,
      currency,
      raceDistance: String(formData.raceDistance || '').trim().toUpperCase(),
      ...categoryFields
    });
  }

  if (pricingMode === 'customized_options' || pricingMode === 'customized_options_period') {
    const options = getCustomizedRegistrationOptions(event);
    const selectedOptionId = String(formData.customizedOptionId || '').trim();
    const selectedOption = options.find((option) => option.id === selectedOptionId);
    if (!selectedOption) {
      return {
        ok: false,
        errorField: 'customizedOptionId',
        error: 'Select a valid signup option for this event.',
        options
      };
    }
    return buildResolvedPrice({
      pricingMode,
      source: 'customized_option',
      label: selectedOption.shortDescription,
      amount: selectedOption.amount,
      currency: selectedOption.currency || currency,
      selectedOptionId: selectedOption.id,
      raceDistance: String(formData.raceDistance || '').trim().toUpperCase(),
      ...categoryFields
    });
  }

  if (pricingMode === 'package_period') {
    const packages = getRegistrationPackageOptions(event);
    const selectedPackageId = String(formData.registrationPackageId || '').trim();
    const selectedPackage = packages.find((packageOption) => packageOption.id === selectedPackageId);
    if (!selectedPackage) {
      return {
        ok: false,
        errorField: 'registrationPackageId',
        error: 'Select a valid registration package for this event.',
        packages
      };
    }
    const activePeriod = getActivePricingPeriod(selectedPackage.pricingPeriods, now);
    if (!activePeriod) {
      return {
        ok: false,
        errorField: 'registrationPackageId',
        error: 'Registration package pricing is not available for the current date.',
        packages
      };
    }
    const amount = firstFiniteNumber(activePeriod.amount);
    if (amount === null) {
      return {
        ok: false,
        errorField: 'registrationPackageId',
        error: 'Registration package pricing is not available for the selected package and current pricing period.',
        packages
      };
    }
    return buildResolvedPrice({
      pricingMode,
      source: 'registration_package',
      label: selectedPackage.name,
      amount,
      currency,
      packageId: selectedPackage.id,
      packageName: selectedPackage.name,
      packageIncludedItems: selectedPackage.includedItems,
      pricingPeriodCode: activePeriod.code || '',
      pricingPeriodLabel: activePeriod.label || '',
      raceDistance: String(formData.raceDistance || '').trim().toUpperCase(),
      ...categoryFields
    });
  }

  const raceDistance = String(formData.raceDistance || '').trim().toUpperCase();
  const selectedCategory = category;
  const distancePrice = (Array.isArray(event.distancePricing) ? event.distancePricing : [])
    .find((item) => {
      const itemCategoryId = String(item?.categoryId || '').trim();
      if (selectedCategory?.id && itemCategoryId && itemCategoryId === selectedCategory.id) return true;
      return String(item?.distance || '').trim().toUpperCase() === raceDistance;
    });
  const activePeriod = pricingMode === 'distance_based_period' ? getActivePricingPeriod(event.pricingPeriods, now) : null;
  if (pricingMode === 'distance_based_period' && !activePeriod) {
    return {
      ok: false,
      errorField: 'pricing',
      error: 'Registration pricing is not available for the current date.'
    };
  }
  const amount = activePeriod
    ? firstFiniteNumber(getDistancePeriodAmount(distancePrice, activePeriod.code))
    : firstFiniteNumber(
      distancePrice?.amount,
      distancePrice?.regularAmount,
      event.feeAmount,
      0
    );

  if (activePeriod && amount === null) {
    return {
      ok: false,
      errorField: 'pricing',
      error: 'Registration pricing is not available for the selected distance and current pricing period.'
    };
  }

  return buildResolvedPrice({
    pricingMode,
    source: 'distance_based',
    label: raceDistance || 'Registration fee',
    amount: amount === null ? 0 : amount,
    currency,
    raceDistance,
    raceCategoryId: selectedCategory?.id || '',
    raceCategoryName: selectedCategory?.name || '',
    raceCategoryType: selectedCategory?.type || '',
    pricingPeriodCode: activePeriod?.code || '',
    pricingPeriodLabel: activePeriod?.label || ''
  });
}

function buildResolvedPrice({
  pricingMode,
  source,
  label,
  amount,
  currency,
  selectedOptionId = '',
  raceCategoryId = '',
  raceCategoryName = '',
  raceCategoryType = '',
  raceDistance = '',
  packageId = '',
  packageName = '',
  packageIncludedItems = [],
  pricingPeriodCode = '',
  pricingPeriodLabel = ''
}) {
  const safeAmount = Number(amount);
  return {
    ok: true,
    pricingMode,
    source,
    label: String(label || '').trim(),
    amount: Number.isFinite(safeAmount) && safeAmount >= 0 ? safeAmount : 0,
    currency: String(currency || 'PHP').trim().toUpperCase() || 'PHP',
    selectedOptionId: String(selectedOptionId || '').trim(),
    raceCategoryId: String(raceCategoryId || '').trim(),
    raceCategoryName: String(raceCategoryName || '').trim(),
    raceCategoryType: String(raceCategoryType || '').trim(),
    raceDistance: String(raceDistance || '').trim(),
    packageId: String(packageId || '').trim(),
    packageName: String(packageName || '').trim(),
    packageIncludedItems: Array.isArray(packageIncludedItems) ? packageIncludedItems.map((item) => String(item || '').trim()).filter(Boolean) : [],
    pricingPeriodCode: String(pricingPeriodCode || '').trim(),
    pricingPeriodLabel: String(pricingPeriodLabel || '').trim()
  };
}

function firstFiniteNumber(...values) {
  for (const value of values) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  }
  return null;
}

function getActivePricingPeriod(periods = [], now = new Date()) {
  const currentTime = now.getTime();
  if (!Number.isFinite(currentTime)) return null;
  return (Array.isArray(periods) ? periods : [])
    .map((period) => {
      const startAt = parseDate(period?.startAt);
      const endAt = parseDate(period?.endAt);
      if (!startAt || !endAt) return null;
      return {
        code: String(period.code || '').trim(),
        label: String(period.label || '').trim(),
        amount: firstFiniteNumber(period.amount),
        startAt,
        endAt
      };
    })
    .filter(Boolean)
    .find((period) => period.startAt.getTime() <= currentTime && currentTime <= period.endAt.getTime()) || null;
}

function getDistancePeriodAmount(distancePrice, code) {
  if (code === 'early_bird') return distancePrice?.earlyBirdAmount;
  if (code === 'regular') return distancePrice?.regularAmount;
  if (code === 'late') return distancePrice?.lateAmount;
  return distancePrice?.amount;
}

function parseDate(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

module.exports = {
  getCustomizedRegistrationOptions,
  getRegistrationPackageOptions,
  getRaceCategoryOptions,
  normalizePricingMode,
  resolveRegistrationPrice
};
