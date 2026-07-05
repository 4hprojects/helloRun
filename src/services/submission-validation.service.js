'use strict';

// OCR parsing, distance-plausibility, and auto-approval decision logic —
// extracted from submission.service.js (analysis CQ-2). Pure leaf: no imports,
// no calls back into the submission orchestrator.

const AUTO_APPROVAL_CONFIDENCE_THRESHOLD = 0.7;
const AUTO_APPROVAL_REVIEW_NOTE = 'Auto-approved from OCR name match.';
const STRAVA_AUTO_APPROVAL_REVIEW_NOTE = 'Auto-approved from verified Strava activity.';

function sanitizeOptionalNumber(value, min, max) {
  if (value === undefined || value === null || value === '') return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < min || numeric > max) return null;
  return numeric;
}


function sanitizeOcrData(value) {
  if (!value || typeof value !== 'object') {
    return {
      extractedDistanceKm: null,
      extractedTimeMs: null,
      extractedElevationGain: null,
      extractedSteps: null,
      extractedRunDate: '',
      extractedRunLocation: '',
      extractedRunType: '',
      rawText: '',
      confidence: 0,
      distanceMismatch: false,
      timeMismatch: false,
      elevationMismatch: false,
      stepsMismatch: false,
      dateMismatch: false,
      locationMismatch: false,
      runTypeMismatch: false,
      detectedSource: '',
      parserVersion: '',
      ocrPass: '',
      qualityFlags: [],
      extractedName: '',
      nameMatchStatus: 'not_checked',
      nameMismatchAcknowledged: false
    };
  }

  const distKm = sanitizeOptionalNumber(value.extractedDistanceKm, 0.000001, 1000);
  const timeMs = sanitizeOptionalNumber(value.extractedTimeMs, 0.000001, 7 * 24 * 60 * 60 * 1000);
  const elevationGain = sanitizeOptionalNumber(value.extractedElevationGain, 0, 20000);
  const steps = sanitizeOptionalNumber(value.extractedSteps, 0, 200000);
  const ALLOWED_SOURCES = new Set(['strava', 'nike', 'garmin', 'apple', 'google', 'coros', 'unknown', '']);
  const ALLOWED_NAME_STATUSES = new Set(['matched', 'mismatched', 'not_detected', 'not_checked']);
  const ALLOWED_RUN_TYPES = new Set(['run', 'walk', 'hike', 'trail_run', '']);
  const rawSource = String(value.detectedSource || '').trim().toLowerCase();
  const rawNameStatus = String(value.nameMatchStatus || '').trim().toLowerCase();
  const rawRunType = String(value.extractedRunType || '').trim().toLowerCase();

  return {
    extractedDistanceKm: distKm,
    extractedTimeMs: timeMs,
    extractedElevationGain: elevationGain !== null ? Math.round(elevationGain) : null,
    extractedSteps: steps !== null ? Math.round(steps) : null,
    extractedRunDate: sanitizeOcrDate(value.extractedRunDate),
    extractedRunLocation: String(value.extractedRunLocation || '').trim().slice(0, 200),
    extractedRunType: ALLOWED_RUN_TYPES.has(rawRunType) ? rawRunType : '',
    rawText: String(value.rawText || '').slice(0, 2000),
    confidence: (() => {
      const c = Number(value.confidence);
      return Number.isFinite(c) && c >= 0 && c <= 1 ? Math.round(c * 100) / 100 : 0;
    })(),
    distanceMismatch: Boolean(value.distanceMismatch),
    timeMismatch: Boolean(value.timeMismatch),
    elevationMismatch: Boolean(value.elevationMismatch),
    stepsMismatch: Boolean(value.stepsMismatch),
    dateMismatch: Boolean(value.dateMismatch),
    locationMismatch: Boolean(value.locationMismatch),
    runTypeMismatch: Boolean(value.runTypeMismatch),
    detectedSource: ALLOWED_SOURCES.has(rawSource) ? rawSource : '',
    parserVersion: String(value.parserVersion || '').trim().slice(0, 40),
    ocrPass: String(value.ocrPass || '').trim().slice(0, 40),
    qualityFlags: Array.isArray(value.qualityFlags)
      ? value.qualityFlags
        .map((item) => String(item || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, ''))
        .filter(Boolean)
        .slice(0, 10)
      : [],
    extractedName: cleanOcrNameCandidate(value.extractedName).slice(0, 120),
    nameMatchStatus: ALLOWED_NAME_STATUSES.has(rawNameStatus) ? rawNameStatus : 'not_checked',
    nameMismatchAcknowledged: Boolean(value.nameMismatchAcknowledged)
  };
}

function sanitizeOcrDate(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return '';
  const date = new Date(`${raw}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? '' : raw;
}

function cleanOcrNameCandidate(value) {
  const name = String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[^A-Za-z]+/, '')
    .replace(/^\d+\s*[%.)\]-]*\s*/, '')
    .replace(/\s+[A-Za-z]?[%=_~^`|]+$/g, '')
    .replace(/[|\\/,;:!?.\s]+$/g, '')
    .replace(/^[^A-Za-z]+/, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!name || /\d/.test(name)) return '';
  if (/\b(?:km|mi|mile|miles|meter|meters|ft|feet|bpm|cal|kcal|min|sec|pace)\b/i.test(name)) return '';
  if (/\b(?:distance|moving\s+time|elapsed\s+time|elevation|calories|heart\s+rate|relative\s+effort|segments?|kudos|weather|humidity|wind|cadence|steps)\b/i.test(name)) return '';
  const letters = (name.match(/[A-Za-z]/g) || []).length;
  const visible = name.replace(/\s/g, '').length;
  if (!visible || letters / visible < 0.65) return '';
  return name;
}

function getStandardSubmissionMinimumDistanceKm(registration, event) {
  if (!registration || !event || event.virtualCompletionMode === 'accumulated_distance') {
    return null;
  }

  const categories = Array.isArray(event.raceCategories) ? event.raceCategories : [];
  const snapshot = registration.pricingSnapshot || {};
  const categoryId = String(snapshot.raceCategoryId || '').trim();
  if (categoryId) {
    const matchedCategory = categories.find((category) => String(category.categoryId || '').trim() === categoryId);
    const categoryDistance = normalizePositiveDistance(matchedCategory?.distanceKm);
    if (categoryDistance !== null) return categoryDistance;
  }

  const distanceLabel = String(snapshot.raceDistance || registration.raceDistance || '').trim();
  if (distanceLabel) {
    const matchedCategory = categories.find((category) => {
      const labels = [
        category.distanceLabel,
        category.name
      ].map((value) => String(value || '').trim().toLowerCase()).filter(Boolean);
      return labels.includes(distanceLabel.toLowerCase());
    });
    const categoryDistance = normalizePositiveDistance(matchedCategory?.distanceKm);
    if (categoryDistance !== null) return categoryDistance;

    const parsedDistance = parseDistanceLabelKm(distanceLabel);
    if (parsedDistance !== null) return parsedDistance;
  }

  return normalizePositiveDistance(event.targetDistanceKm);
}

function detectBelowMinimumStandardSubmissionDistance({
  submittedDistanceKm,
  ocrData,
  minimumRequiredDistanceKm
}) {
  const minimum = normalizePositiveDistance(minimumRequiredDistanceKm);
  if (minimum === null) {
    return {
      belowMinimum: false,
      detectedDistanceKm: null,
      minimumRequiredDistanceKm: null
    };
  }

  const ocrDistance = normalizePositiveDistance(ocrData?.extractedDistanceKm);
  const submittedDistance = normalizePositiveDistance(submittedDistanceKm);
  const detectedDistance = ocrDistance !== null ? ocrDistance : submittedDistance;
  const belowMinimum = detectedDistance !== null && detectedDistance < minimum;

  return {
    belowMinimum,
    detectedDistanceKm: detectedDistance,
    minimumRequiredDistanceKm: minimum
  };
}

function detectImplausibleAccumulatedActivityDistance({
  submittedDistanceKm,
  ocrData,
  targetDistanceKm
}) {
  const target = normalizePositiveDistance(targetDistanceKm);
  const ocrDistance = normalizePositiveDistance(ocrData?.extractedDistanceKm);
  const submittedDistance = normalizePositiveDistance(submittedDistanceKm);
  const detectedDistance = ocrDistance !== null ? ocrDistance : submittedDistance;

  const implausible = detectedDistance !== null && (
    detectedDistance > 100 ||
    (target !== null && detectedDistance >= target)
  );

  return {
    implausible,
    detectedDistanceKm: detectedDistance,
    targetDistanceKm: target
  };
}

function parseDistanceLabelKm(value) {
  const safe = String(value || '').trim().toLowerCase();
  if (!safe) return null;

  const kmMatch = safe.match(/(\d+(?:\.\d+)?)\s*(?:k|km|kilometer|kilometers|kilometre|kilometres)\b/);
  if (kmMatch) return normalizePositiveDistance(kmMatch[1]);

  const plainMatch = safe.match(/^(\d+(?:\.\d+)?)$/);
  if (plainMatch) return normalizePositiveDistance(plainMatch[1]);

  return null;
}

function normalizePositiveDistance(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0 || numeric > 500) return null;
  return Math.round(numeric * 100) / 100;
}

function formatDistanceForMessage(value) {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric)) return '0';
  return Number(numeric.toFixed(2)).toString();
}

function buildSubmissionValidationMetadata({
  input,
  registration,
  ocrData,
  suspiciousFlag,
  minimumDistanceCheck
}) {
  const method = normalizeValidationMethod(input?.source, ocrData);
  const submissionMode = registration?.isPersonalRecord ? 'personal_record' : 'one_time';
  const autoApprovalEligible = isAutoApprovablePayload({
    source: input?.source,
    stravaActivity: input?.stravaActivity,
    ocrData,
    suspiciousFlag
  });
  return {
    method,
    autoApprovalEligible,
    reviewRequired: !autoApprovalEligible,
    reviewReason: autoApprovalEligible
      ? ''
      : getSubmissionReviewReason({
        method,
        ocrData,
        suspiciousFlag,
        minimumDistanceCheck
      }),
    submissionMode,
    detectedDistanceKm: minimumDistanceCheck.detectedDistanceKm,
    minimumRequiredDistanceKm: minimumDistanceCheck.minimumRequiredDistanceKm
  };
}

function normalizeValidationMethod(source, ocrData) {
  const safeSource = String(source || '').trim().toLowerCase();
  if (safeSource === 'strava') return 'strava';
  const hasOcrSignals = Boolean(
    ocrData &&
    (
      Number(ocrData.confidence || 0) > 0 ||
      ocrData.extractedDistanceKm !== null ||
      ocrData.extractedTimeMs !== null ||
      String(ocrData.rawText || '').trim()
    )
  );
  return hasOcrSignals ? 'ocr' : 'manual_upload';
}

function isNameMatchAcceptableForAutoApproval(nameMatchStatus) {
  return nameMatchStatus === 'matched' || nameMatchStatus === 'not_detected';
}

function getSubmissionReviewReason({
  method,
  ocrData,
  suspiciousFlag,
  minimumDistanceCheck
}) {
  if (minimumDistanceCheck?.belowMinimum) {
    return 'below_minimum_distance_one_time_submission';
  }
  if (suspiciousFlag) {
    return 'suspicious_activity';
  }
  if (method === 'strava') {
    return 'strava_auto_approval_criteria_not_met';
  }
  if (method !== 'ocr') {
    return `${method}_review_required`;
  }
  if (!isNameMatchAcceptableForAutoApproval(ocrData?.nameMatchStatus)) {
    return 'ocr_name_not_matched';
  }
  if (!normalizePositiveDistance(ocrData?.extractedDistanceKm)) {
    return 'ocr_distance_missing';
  }
  if (!normalizePositiveNumber(ocrData?.extractedTimeMs)) {
    return 'ocr_time_missing';
  }
  if (Number(ocrData?.confidence || 0) < AUTO_APPROVAL_CONFIDENCE_THRESHOLD) {
    return 'ocr_confidence_below_threshold';
  }
  return 'ocr_auto_approval_criteria_not_met';
}

function isAutoApprovableOcrPayload({ ocrData, suspiciousFlag }) {
  const extractedDistanceKm = Number(ocrData?.extractedDistanceKm);
  const extractedTimeMs = Number(ocrData?.extractedTimeMs);
  return (
    isNameMatchAcceptableForAutoApproval(ocrData?.nameMatchStatus) &&
    Number.isFinite(extractedDistanceKm) &&
    extractedDistanceKm > 0 &&
    Number.isFinite(extractedTimeMs) &&
    extractedTimeMs > 0 &&
    !ocrData.distanceMismatch &&
    !ocrData.timeMismatch &&
    !ocrData.elevationMismatch &&
    !ocrData.stepsMismatch &&
    !ocrData.dateMismatch &&
    !ocrData.locationMismatch &&
    !ocrData.runTypeMismatch &&
    !suspiciousFlag &&
    Number(ocrData.confidence || 0) >= AUTO_APPROVAL_CONFIDENCE_THRESHOLD
  );
}

function isAutoApprovableSyncedPayload({ source, stravaActivity, suspiciousFlag }) {
  const safeSource = String(source || '').trim().toLowerCase();
  if (safeSource !== 'strava') return false;
  if (suspiciousFlag) return false;
  const activityId = Number(stravaActivity?.id || 0);
  const athleteId = Number(stravaActivity?.athleteId || 0);
  const distanceKm = Number(stravaActivity?.distanceKm || 0);
  const elapsedSeconds = Number(stravaActivity?.elapsedTimeSeconds || stravaActivity?.movingTimeSeconds || 0);
  return (
    Number.isFinite(activityId) &&
    activityId > 0 &&
    Number.isFinite(athleteId) &&
    athleteId > 0 &&
    Number.isFinite(distanceKm) &&
    distanceKm > 0 &&
    Number.isFinite(elapsedSeconds) &&
    elapsedSeconds > 0
  );
}

function isAutoApprovablePayload({ source, stravaActivity, ocrData, suspiciousFlag }) {
  if (isAutoApprovableSyncedPayload({ source, stravaActivity, suspiciousFlag })) {
    return true;
  }
  return isAutoApprovableOcrPayload({ ocrData, suspiciousFlag });
}

function normalizePositiveNumber(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  return numeric;
}

function isAutoApprovableOcrSubmission(submission) {
  if (!submission) return false;
  const ocrData = submission.ocrData || {};
  const extractedDistanceKm = Number(ocrData.extractedDistanceKm);
  const extractedTimeMs = Number(ocrData.extractedTimeMs);
  return (
    String(submission.status || '') === 'submitted' &&
    isNameMatchAcceptableForAutoApproval(ocrData.nameMatchStatus) &&
    Number.isFinite(extractedDistanceKm) &&
    extractedDistanceKm > 0 &&
    Number.isFinite(extractedTimeMs) &&
    extractedTimeMs > 0 &&
    !ocrData.distanceMismatch &&
    !ocrData.timeMismatch &&
    !ocrData.elevationMismatch &&
    !ocrData.stepsMismatch &&
    !ocrData.dateMismatch &&
    !ocrData.locationMismatch &&
    !ocrData.runTypeMismatch &&
    !submission.suspiciousFlag &&
    Number(ocrData.confidence || 0) >= AUTO_APPROVAL_CONFIDENCE_THRESHOLD
  );
}

function isAutoApprovableSubmission(submission) {
  if (!submission || String(submission.status || '') !== 'submitted') return false;
  return isAutoApprovablePayload({
    source: submission.source,
    stravaActivity: submission.stravaActivity,
    ocrData: submission.ocrData || {},
    suspiciousFlag: submission.suspiciousFlag
  });
}


function getAutoApprovalReviewNote(submission = {}) {
  const source = String(submission.source || '').trim().toLowerCase();
  return source === 'strava' ? STRAVA_AUTO_APPROVAL_REVIEW_NOTE : AUTO_APPROVAL_REVIEW_NOTE;
}


module.exports = {
  AUTO_APPROVAL_CONFIDENCE_THRESHOLD,
  AUTO_APPROVAL_REVIEW_NOTE,
  STRAVA_AUTO_APPROVAL_REVIEW_NOTE,
  sanitizeOptionalNumber,
  sanitizeOcrData,
  sanitizeOcrDate,
  cleanOcrNameCandidate,
  getStandardSubmissionMinimumDistanceKm,
  detectBelowMinimumStandardSubmissionDistance,
  detectImplausibleAccumulatedActivityDistance,
  parseDistanceLabelKm,
  normalizePositiveDistance,
  formatDistanceForMessage,
  buildSubmissionValidationMetadata,
  normalizeValidationMethod,
  isNameMatchAcceptableForAutoApproval,
  getSubmissionReviewReason,
  isAutoApprovableOcrPayload,
  isAutoApprovableSyncedPayload,
  isAutoApprovablePayload,
  normalizePositiveNumber,
  isAutoApprovableOcrSubmission,
  isAutoApprovableSubmission,
  getAutoApprovalReviewNote
};
