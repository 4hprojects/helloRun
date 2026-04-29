'use strict';

const OCR_STRONG_CONFIDENCE = 0.7;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function compareSubmissionWithOcr({
  distanceKm,
  elapsedMs,
  runDate,
  runLocation,
  runType,
  elevationGain,
  steps,
  ocrData
} = {}) {
  const ocr = ocrData && typeof ocrData === 'object' ? ocrData : {};
  const confidence = Number(ocr.confidence || 0);
  const strongOcr = confidence >= OCR_STRONG_CONFIDENCE;
  const result = {
    distanceMismatch: false,
    timeMismatch: false,
    elevationMismatch: false,
    stepsMismatch: false,
    dateMismatch: false,
    locationMismatch: false,
    runTypeMismatch: false
  };

  const extractedDistanceKm = toFiniteNumber(ocr.extractedDistanceKm);
  const submittedDistanceKm = toFiniteNumber(distanceKm);
  if (extractedDistanceKm !== null && submittedDistanceKm !== null && submittedDistanceKm > 0) {
    result.distanceMismatch = Math.abs(extractedDistanceKm - submittedDistanceKm) > Math.max(submittedDistanceKm * 0.1, 0.5);
  }

  const extractedTimeMs = toFiniteNumber(ocr.extractedTimeMs);
  const submittedElapsedMs = toFiniteNumber(elapsedMs);
  if (extractedTimeMs !== null && submittedElapsedMs !== null && submittedElapsedMs > 0) {
    result.timeMismatch = Math.abs(extractedTimeMs - submittedElapsedMs) > 60000;
  }

  const extractedElevationGain = toFiniteNumber(ocr.extractedElevationGain);
  const submittedElevationGain = toFiniteNumber(elevationGain);
  if (strongOcr && extractedElevationGain !== null && submittedElevationGain !== null) {
    result.elevationMismatch = Math.abs(extractedElevationGain - submittedElevationGain) > Math.max(extractedElevationGain * 0.5, 100);
  }

  const extractedSteps = toFiniteNumber(ocr.extractedSteps);
  const submittedSteps = toFiniteNumber(steps);
  if (strongOcr && extractedSteps !== null && submittedSteps !== null) {
    result.stepsMismatch = Math.abs(extractedSteps - submittedSteps) > Math.max(extractedSteps * 0.3, 1000);
  }

  if (ocr.extractedRunDate && runDate) {
    const extractedDate = parseDateOnly(ocr.extractedRunDate);
    const submittedDate = parseDateOnly(runDate);
    if (extractedDate && submittedDate) {
      result.dateMismatch = Math.abs(extractedDate.getTime() - submittedDate.getTime()) > ONE_DAY_MS;
    }
  }

  const extractedRunType = normalizeRunType(ocr.extractedRunType);
  const submittedRunType = normalizeRunType(runType);
  if (extractedRunType && submittedRunType) {
    result.runTypeMismatch = extractedRunType !== submittedRunType;
  }

  if (strongOcr && ocr.extractedRunLocation && runLocation) {
    result.locationMismatch = !hasMeaningfulLocationOverlap(ocr.extractedRunLocation, runLocation);
  }

  return result;
}

function detectSuspiciousActivity({
  distanceKm,
  elapsedMs,
  runDate,
  runLocation,
  runType,
  elevationGain,
  steps,
  ocrData
} = {}) {
  const reasons = [];
  const submittedDistanceKm = toFiniteNumber(distanceKm);
  const submittedElapsedMs = toFiniteNumber(elapsedMs);
  const submittedElevationGain = toFiniteNumber(elevationGain);
  const submittedSteps = toFiniteNumber(steps);
  const comparisons = compareSubmissionWithOcr({ distanceKm, elapsedMs, runDate, runLocation, runType, elevationGain, steps, ocrData });
  const ocr = ocrData && typeof ocrData === 'object' ? ocrData : {};
  const confidence = Number(ocr.confidence || 0);

  if (submittedDistanceKm !== null && submittedDistanceKm > 200) {
    reasons.push('Distance exceeds 200 km.');
  }

  if (submittedDistanceKm !== null && submittedElapsedMs !== null && submittedElapsedMs > 0) {
    const paceMinPerKm = submittedElapsedMs / (submittedDistanceKm * 60000);
    if (paceMinPerKm < 2) {
      reasons.push('Pace faster than world record (< 2 min/km).');
    }
  }

  if (submittedElapsedMs !== null && submittedElapsedMs > ONE_DAY_MS) {
    reasons.push('Duration exceeds 24 hours.');
  }

  if (comparisons.distanceMismatch && confidence > OCR_STRONG_CONFIDENCE) {
    reasons.push('High-confidence OCR distance mismatch detected.');
  }

  if (comparisons.timeMismatch && confidence > OCR_STRONG_CONFIDENCE) {
    reasons.push('High-confidence OCR time mismatch detected.');
  }

  if (comparisons.elevationMismatch) {
    reasons.push('High-confidence OCR elevation mismatch detected.');
  }

  if (comparisons.stepsMismatch) {
    reasons.push('High-confidence OCR steps mismatch detected.');
  }

  if (comparisons.dateMismatch) {
    reasons.push('OCR activity date differs from submitted run date.');
  }

  if (comparisons.runTypeMismatch) {
    reasons.push('OCR activity type differs from submitted run type.');
  }

  if (comparisons.locationMismatch) {
    reasons.push('OCR activity location differs from submitted location.');
  }

  if (submittedDistanceKm !== null && submittedDistanceKm > 0 && submittedElevationGain !== null) {
    const elevationPerKm = submittedElevationGain / submittedDistanceKm;
    const type = normalizeRunType(runType);
    const maxElevationPerKm = type === 'hike' || type === 'trail_run' ? 300 : 200;
    if (elevationPerKm > maxElevationPerKm) {
      reasons.push(`Elevation gain is unusually high for the submitted distance (> ${maxElevationPerKm} m/km).`);
    }
  }

  if (submittedDistanceKm !== null && submittedDistanceKm > 0 && submittedSteps !== null && submittedSteps > 0) {
    const stepsPerKm = submittedSteps / submittedDistanceKm;
    if (stepsPerKm < 500 || stepsPerKm > 3000) {
      reasons.push('Steps per kilometer is outside the plausible range.');
    }
  }

  if (submittedElapsedMs !== null && submittedElapsedMs > 0 && submittedSteps !== null && submittedSteps > 0) {
    const stepsPerMinute = submittedSteps / (submittedElapsedMs / 60000);
    if (stepsPerMinute < 20 || stepsPerMinute > 240) {
      reasons.push('Step cadence is outside the plausible range.');
    }
  }

  if (ocr.nameMatchStatus === 'mismatched' && ocr.extractedName) {
    const suffix = ocr.nameMismatchAcknowledged ? ' Runner acknowledged and continued.' : '';
    reasons.push(`Screenshot name does not match account name.${suffix}`);
  }

  return {
    suspicious: reasons.length > 0,
    reason: reasons.join(' '),
    reasons,
    comparisons
  };
}

function toFiniteNumber(value) {
  if (value === undefined || value === null || value === '') return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function normalizeRunType(value) {
  const safe = String(value || '').trim().toLowerCase();
  return ['run', 'walk', 'hike', 'trail_run'].includes(safe) ? safe : '';
}

function parseDateOnly(value) {
  if (!value) return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  }
  const raw = String(value || '').trim();
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const date = match
    ? new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))
    : new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function hasMeaningfulLocationOverlap(a, b) {
  const aTokens = locationTokens(a);
  const bTokens = locationTokens(b);
  if (!aTokens.size || !bTokens.size) return true;
  for (const token of aTokens) {
    if (bTokens.has(token)) return true;
  }
  return false;
}

function locationTokens(value) {
  const stop = new Set(['city', 'route', 'venue', 'the', 'and', 'at', 'in', 'ph', 'philippines']);
  return new Set(
    String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .map((token) => token.trim())
      .filter((token) => token.length >= 3 && !stop.has(token))
  );
}

module.exports = {
  OCR_STRONG_CONFIDENCE,
  compareSubmissionWithOcr,
  detectSuspiciousActivity
};
