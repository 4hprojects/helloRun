'use strict';

const REVIEW_REASON_LABELS = {
  below_minimum_distance_one_time_submission: 'Below minimum distance',
  suspicious_activity: 'Suspicious activity',
  strava_review_required: 'Strava review required',
  strava_auto_approval_criteria_not_met: 'Strava auto-approval criteria not met',
  manual_upload_review_required: 'Manual review required',
  ocr_name_not_matched: 'OCR name not matched',
  ocr_distance_missing: 'OCR distance missing',
  ocr_time_missing: 'OCR time missing',
  ocr_confidence_below_threshold: 'OCR confidence below threshold',
  ocr_auto_approval_criteria_not_met: 'OCR auto-approval criteria not met'
};

const REVIEW_REASON_DESCRIPTIONS = {
  below_minimum_distance_one_time_submission: 'The proof distance is below the required distance for this one-time result.',
  suspicious_activity: 'The proof triggered one or more activity integrity checks.',
  strava_review_required: 'This Strava result needs manual review before approval.',
  strava_auto_approval_criteria_not_met: 'The Strava result did not satisfy all synced-source auto-approval criteria.',
  manual_upload_review_required: 'This uploaded proof needs manual review before approval.',
  ocr_name_not_matched: 'The name detected from the screenshot did not match the runner account.',
  ocr_distance_missing: 'The screenshot did not provide a valid OCR distance.',
  ocr_time_missing: 'The screenshot did not provide a valid OCR duration.',
  ocr_confidence_below_threshold: 'The OCR confidence was below the auto-approval threshold.',
  ocr_auto_approval_criteria_not_met: 'The OCR result did not satisfy all auto-approval criteria.'
};

function getSubmissionReviewReasonCode(submission = {}) {
  return String(submission.validation?.reviewReason || '').trim();
}

function getSubmissionReviewReasonLabel(submission = {}) {
  const code = getSubmissionReviewReasonCode(submission);
  if (!code) return '';
  return REVIEW_REASON_LABELS[code] || humanizeReviewReason(code);
}

function getSubmissionReviewReasonDescription(submission = {}) {
  const code = getSubmissionReviewReasonCode(submission);
  if (!code) return '';
  return REVIEW_REASON_DESCRIPTIONS[code] || '';
}

function buildSubmissionReviewSignal(submission = {}) {
  const code = getSubmissionReviewReasonCode(submission);
  const label = getSubmissionReviewReasonLabel(submission);
  const description = getSubmissionReviewReasonDescription(submission);
  return {
    code,
    label,
    description,
    suspiciousReason: String(submission.suspiciousFlagReason || '').trim()
  };
}

function humanizeReviewReason(code) {
  return String(code || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

module.exports = {
  REVIEW_REASON_LABELS,
  REVIEW_REASON_DESCRIPTIONS,
  getSubmissionReviewReasonCode,
  getSubmissionReviewReasonLabel,
  getSubmissionReviewReasonDescription,
  buildSubmissionReviewSignal
};
