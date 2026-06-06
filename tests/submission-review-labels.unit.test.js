const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildSubmissionReviewSignal,
  getSubmissionReviewReasonLabel,
  getSubmissionReviewReasonDescription
} = require('../src/utils/submission-review-labels');

test('submission review labels format known validation reasons', () => {
  const submission = {
    validation: {
      reviewReason: 'below_minimum_distance_one_time_submission'
    },
    suspiciousFlagReason: 'Submitted distance is below the minimum required distance.'
  };

  assert.equal(getSubmissionReviewReasonLabel(submission), 'Below minimum distance');
  assert.match(getSubmissionReviewReasonDescription(submission), /below the required distance/i);

  const signal = buildSubmissionReviewSignal(submission);
  assert.equal(signal.code, 'below_minimum_distance_one_time_submission');
  assert.equal(signal.label, 'Below minimum distance');
  assert.equal(signal.suspiciousReason, 'Submitted distance is below the minimum required distance.');
});

test('submission review labels format Strava validation reasons', () => {
  const submission = {
    validation: {
      reviewReason: 'strava_auto_approval_criteria_not_met'
    }
  };

  assert.equal(getSubmissionReviewReasonLabel(submission), 'Strava auto-approval criteria not met');
  assert.match(getSubmissionReviewReasonDescription(submission), /synced-source auto-approval/i);
});

test('submission review labels humanize unknown validation reasons', () => {
  const submission = {
    validation: {
      reviewReason: 'custom_future_reason'
    }
  };

  assert.equal(getSubmissionReviewReasonLabel(submission), 'Custom Future Reason');
  assert.equal(getSubmissionReviewReasonDescription(submission), '');
});
