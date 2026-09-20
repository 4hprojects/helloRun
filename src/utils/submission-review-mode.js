'use strict';

// How run submissions for an event are reviewed.
//
// - system: submissions that pass HelloRun's checks (OCR verification or a clean Strava
//   sync) are approved automatically; anything flagged waits for the organizer. This is
//   the default and matches how every event behaved before the setting existed.
// - manual: nothing is approved automatically. Every submission waits for the organizer,
//   including Strava syncs. Validation still runs so reviewers keep every signal.
//
// Events created before the setting have no stored value, which reads as "system".

const SUBMISSION_REVIEW_MODES = Object.freeze(['system', 'manual']);
const DEFAULT_SUBMISSION_REVIEW_MODE = 'system';

const SUBMISSION_REVIEW_MODE_OPTIONS = Object.freeze([
  {
    value: 'system',
    label: 'Reviewed and validated by HelloRun',
    badge: 'Recommended',
    description: 'Submissions that pass our checks are approved automatically. Anything flagged waits for you.'
  },
  {
    value: 'manual',
    label: 'I review every submission',
    badge: '',
    description: 'Nothing is approved automatically, including Strava syncs. Every submission waits for you in the review queue.'
  }
]);

// Short labels for organizer-facing summaries (queue header, event workspace).
const SUBMISSION_REVIEW_MODE_LABELS = Object.freeze({
  system: 'System validation',
  manual: 'Organizer reviews all'
});

function normalizeSubmissionReviewMode(value) {
  const safe = String(value || '').trim().toLowerCase();
  return SUBMISSION_REVIEW_MODES.includes(safe) ? safe : DEFAULT_SUBMISSION_REVIEW_MODE;
}

function isManualSubmissionReview(event) {
  return normalizeSubmissionReviewMode(event?.submissionReviewMode) === 'manual';
}

function getSubmissionReviewModeLabel(value) {
  return SUBMISSION_REVIEW_MODE_LABELS[normalizeSubmissionReviewMode(value)];
}

module.exports = {
  SUBMISSION_REVIEW_MODES,
  DEFAULT_SUBMISSION_REVIEW_MODE,
  SUBMISSION_REVIEW_MODE_OPTIONS,
  SUBMISSION_REVIEW_MODE_LABELS,
  normalizeSubmissionReviewMode,
  isManualSubmissionReview,
  getSubmissionReviewModeLabel
};
