'use strict';

function parseDistanceLabelKm(value) {
  const normalized = String(value || '').trim().toUpperCase().replace(/\s+/g, '');
  const match = normalized.match(/^(\d+(?:\.\d+)?)(K|KM)?$/);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function resolveAccumulatedTargetDistanceKm(registration = {}, event = {}) {
  const categoryId = String(registration.pricingSnapshot?.raceCategoryId || '').trim();
  const categories = Array.isArray(event?.raceCategories) ? event.raceCategories : [];
  if (categoryId) {
    const category = categories.find((item) => String(item?.categoryId || '').trim() === categoryId);
    const categoryDistance = Number(category?.distanceKm || 0);
    if (Number.isFinite(categoryDistance) && categoryDistance > 0) {
      return categoryDistance;
    }
  }

  const selectedDistanceLabels = [
    registration.pricingSnapshot?.raceDistance,
    registration.raceDistance
  ];
  for (const label of selectedDistanceLabels) {
    const parsed = parseDistanceLabelKm(label);
    if (parsed) return parsed;
  }

  const fallback = Number(event?.targetDistanceKm || 0);
  return Number.isFinite(fallback) && fallback > 0 ? fallback : 0;
}

module.exports = {
  parseDistanceLabelKm,
  resolveAccumulatedTargetDistanceKm
};
