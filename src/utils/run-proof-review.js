'use strict';

const { resolveChallengeConfig } = require('./challenge-metrics');
const { getRejectionReasonOptions } = require('./rejection-reasons');

const REVIEW_CHECKLIST_VERSION = 'run-proof-v1';
const REVIEW_CRITERIA = Object.freeze({
  legibility: 'The proof is clear, complete, and uncropped.',
  activity_date: 'The activity date is visible and falls within the event window.',
  distance: 'The distance is visible and matches the submitted value and event requirement.',
  duration: 'The duration is visible and matches the submitted value.',
  steps: 'The step count is visible and matches the submitted value.',
  source: 'The source app or tracking device is visible.',
  activity_type: 'The activity type is visible and accepted for this event.',
  identity: 'The participant identity shown in the proof matches the registered runner.'
});

function isUploadedScreenshot(submission = {}) {
  if (String(submission.source || '').toLowerCase() === 'strava') return false;
  const url = String(submission.proof?.url || '');
  const mimeType = String(submission.proof?.mimeType || '').toLowerCase();
  return Boolean(url && (mimeType.startsWith('image/') || /\.(png|jpe?g|gif|webp)(?:\?|$)/i.test(url)));
}

function buildRunProofVerificationCriteria(event = {}, submission = {}) {
  const config = resolveChallengeConfig(event);
  const keys = ['legibility', 'activity_date'];
  const verifiesDistance = !config.accumulated || config.tracksDistance;
  if (verifiesDistance) keys.push('distance', 'duration');
  if (config.accumulated && config.tracksSteps) keys.push('steps');
  if (Array.isArray(event.acceptedRunTypes) && event.acceptedRunTypes.length) keys.push('activity_type');
  if (isUploadedScreenshot(submission)) keys.push('source');
  const nameStatus = String(submission.ocrData?.nameMatchStatus || '');
  if (submission.ocrData?.extractedName || ['matched', 'mismatched'].includes(nameStatus)) keys.push('identity');
  return Array.from(new Set(keys)).map((key) => ({ key, label: REVIEW_CRITERIA[key] }));
}

function formatList(values = []) {
  if (values.length <= 1) return values[0] || '';
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values.slice(0, -1).join(', ')}, and ${values[values.length - 1]}`;
}

function getVisibleEvidenceFields(criteria = []) {
  const labelByKey = {
    activity_date: 'the activity date',
    distance: 'distance',
    duration: 'duration',
    steps: 'step count',
    activity_type: 'activity type',
    identity: 'participant identity',
    source: 'source app or device'
  };
  return criteria.map((item) => labelByKey[item.key]).filter(Boolean);
}

function buildRunRejectionReasonOptions(event = {}, submission = {}) {
  const criteria = buildRunProofVerificationCriteria(event, submission);
  const fields = formatList(getVisibleEvidenceFields(criteria));
  const screenshotNoun = isUploadedScreenshot(submission) ? 'screenshot' : 'activity evidence';
  const defaults = {
    unclear_proof: `Please upload a clear, uncropped ${screenshotNoun} that visibly shows ${fields}. The values must match the details entered in HelloRun.`,
    incomplete_metrics: `The submitted ${screenshotNoun} is missing required details. Please submit evidence that clearly shows ${fields}.`,
    metrics_mismatch: `The details entered in HelloRun do not match the ${screenshotNoun}. Please correct the entered values or upload matching evidence that clearly shows ${fields}.`,
    wrong_activity: `The proof does not show an activity accepted for this event. Please submit the correct eligible activity with ${fields} clearly visible.`,
    identity_mismatch: `The participant identity shown in the proof does not match the registered runner. Please submit your own activity with the account identity and activity details clearly visible.`,
    distance_mismatch: 'The distance shown does not meet this event’s requirement. Please submit a qualifying activity and proof that clearly shows the completed distance.',
    date_outside_window: 'The activity date is outside this event’s eligible activity window. Please submit an activity completed within the dates shown on the event page.',
    duplicate_activity: 'This activity appears to have already been submitted. Please submit a different eligible activity that has not been used before.',
    unverifiable_proof: `We could not verify this ${screenshotNoun}. Please upload the original, unedited evidence with ${fields} clearly visible.`,
    other: ''
  };
  return getRejectionReasonOptions('run').map((reason) => ({
    ...reason,
    defaultMessage: defaults[reason.code] ?? reason.guidance
  }));
}

function normalizeVerifiedCriteria(value) {
  const values = Array.isArray(value) ? value : value == null ? [] : [value];
  return values.map((item) => String(item || '').trim()).filter(Boolean);
}

function validateReviewChecklist({ event, submission, version, verifiedCriteria }) {
  if (String(version || '') !== REVIEW_CHECKLIST_VERSION) {
    throw new Error('Refresh this review before approving; the verification checklist has changed.');
  }
  const requiredCriteria = buildRunProofVerificationCriteria(event, submission).map((item) => item.key);
  const submittedCriteria = normalizeVerifiedCriteria(verifiedCriteria);
  if (new Set(submittedCriteria).size !== submittedCriteria.length) {
    throw new Error('The verification checklist contains duplicate items. Refresh and try again.');
  }
  if (submittedCriteria.some((key) => !requiredCriteria.includes(key))) {
    throw new Error('The verification checklist contains an invalid item. Refresh and try again.');
  }
  const confirmed = new Set(submittedCriteria);
  if (requiredCriteria.some((key) => !confirmed.has(key))) {
    throw new Error('Confirm every applicable proof check before approving.');
  }
  return { version: REVIEW_CHECKLIST_VERSION, requiredCriteria, confirmedCriteria: submittedCriteria };
}

module.exports = {
  REVIEW_CHECKLIST_VERSION,
  REVIEW_CRITERIA,
  buildRunProofVerificationCriteria,
  buildRunRejectionReasonOptions,
  isUploadedScreenshot,
  normalizeVerifiedCriteria,
  validateReviewChecklist
};
