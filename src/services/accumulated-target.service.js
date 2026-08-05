'use strict';

const { normalizeTargetSteps } = require('../utils/challenge-metrics');

function parseDistanceLabelKm(value) {
  const normalized = String(value || '').trim().toUpperCase().replace(/\s+/g, '');
  const match = normalized.match(/^(\d+(?:\.\d+)?)(?:(?:KM|K)(?:[^0-9.]|$)|$)/);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function findRegistrationCategory(registration = {}, event = {}) {
  const categoryId = String(registration.pricingSnapshot?.raceCategoryId || '').trim();
  if (!categoryId) return null;
  const categories = Array.isArray(event?.raceCategories) ? event.raceCategories : [];
  return categories.find((item) => String(item?.categoryId || '').trim() === categoryId) || null;
}

function resolveAccumulatedTargetDistanceKm(registration = {}, event = {}) {
  const category = findRegistrationCategory(registration, event);
  if (category) {
    // An explicit 0 means the category deliberately carries no distance goal
    // (e.g. a steps-only category on a multi-metric event) and must not fall
    // through to the event-wide default.
    if (category.distanceKm === 0) return 0;
    const categoryDistance = Number(category.distanceKm || 0);
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

function resolveAccumulatedTargetSteps(registration = {}, event = {}) {
  const category = findRegistrationCategory(registration, event);
  if (category) {
    // Mirrors resolveAccumulatedTargetDistanceKm: an explicit 0 means the
    // category deliberately carries no steps goal and must not fall through
    // to the event-wide default.
    if (category.targetSteps === 0) return null;
    const categorySteps = normalizeTargetSteps(category.targetSteps);
    if (categorySteps !== null) return categorySteps;
  }

  return normalizeTargetSteps(event?.targetSteps);
}

module.exports = {
  parseDistanceLabelKm,
  resolveAccumulatedTargetDistanceKm,
  resolveAccumulatedTargetSteps
};
