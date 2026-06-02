'use strict';

const OCR_STRONG_CONFIDENCE = 0.7;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function toFiniteNumber(value) {
  if (value === undefined || value === null || value === '') return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function isDistanceMismatch(extractedDistanceKm, submittedDistanceKm) {
  const extracted = toFiniteNumber(extractedDistanceKm);
  const submitted = toFiniteNumber(submittedDistanceKm);
  if (extracted === null || submitted === null || submitted <= 0) return false;
  return Math.abs(extracted - submitted) > Math.max(submitted * 0.1, 0.5);
}

function isTimeMismatch(extractedTimeMs, submittedElapsedMs) {
  const extracted = toFiniteNumber(extractedTimeMs);
  const submitted = toFiniteNumber(submittedElapsedMs);
  if (extracted === null || submitted === null || submitted <= 0) return false;
  return Math.abs(extracted - submitted) > 60000;
}

function isElevationMismatch(extractedElevationGain, submittedElevationGain) {
  const extracted = toFiniteNumber(extractedElevationGain);
  const submitted = toFiniteNumber(submittedElevationGain);
  if (extracted === null || submitted === null) return false;
  return Math.abs(extracted - submitted) > Math.max(extracted * 0.5, 100);
}

function isStepsMismatch(extractedSteps, submittedSteps) {
  const extracted = toFiniteNumber(extractedSteps);
  const submitted = toFiniteNumber(submittedSteps);
  if (extracted === null || submitted === null) return false;
  return Math.abs(extracted - submitted) > Math.max(extracted * 0.3, 1000);
}

function isDateMismatch(extractedDate, submittedDate) {
  if (!extractedDate || !submittedDate) return false;
  return Math.abs(extractedDate.getTime() - submittedDate.getTime()) > ONE_DAY_MS;
}

module.exports = {
  OCR_STRONG_CONFIDENCE,
  ONE_DAY_MS,
  toFiniteNumber,
  isDistanceMismatch,
  isTimeMismatch,
  isElevationMismatch,
  isStepsMismatch,
  isDateMismatch
};
