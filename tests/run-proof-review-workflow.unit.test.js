const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  REVIEW_CHECKLIST_VERSION,
  buildRunProofVerificationCriteria,
  buildRunRejectionReasonOptions,
  validateReviewChecklist
} = require('../src/utils/run-proof-review');

function keys(event, submission) {
  return buildRunProofVerificationCriteria(event, submission).map((item) => item.key);
}

test('standard uploaded run proof requires all evidence-first checks', () => {
  const event = { acceptedRunTypes: ['run'] };
  const submission = {
    source: 'manual_upload',
    proof: { url: '/proof.png', mimeType: 'image/png' },
    ocrData: { extractedName: 'Runner One', nameMatchStatus: 'matched' }
  };
  assert.deepEqual(keys(event, submission), [
    'legibility', 'activity_date', 'distance', 'duration', 'activity_type', 'source', 'identity'
  ]);
});

test('adaptive criteria support steps-only and dual-metric accumulated challenges', () => {
  const proof = { source: 'strava', proof: { url: '/activity/1' } };
  assert.deepEqual(keys({ virtualCompletionMode: 'accumulated_activity', challengeMetrics: ['steps'] }, proof), [
    'legibility', 'activity_date', 'steps'
  ]);
  assert.deepEqual(keys({ virtualCompletionMode: 'accumulated_activity', challengeMetrics: ['distance', 'steps'] }, proof), [
    'legibility', 'activity_date', 'distance', 'duration', 'steps'
  ]);
});

test('unclear-proof guidance names every visible field for September-style screenshots', () => {
  const options = buildRunRejectionReasonOptions(
    { acceptedRunTypes: ['run'] },
    { source: 'manual_upload', proof: { url: '/proof.jpg', mimeType: 'image/jpeg' } }
  );
  const unclear = options.find((option) => option.code === 'unclear_proof');
  assert.equal(
    unclear.defaultMessage,
    'Please upload a clear, uncropped screenshot that visibly shows the activity date, distance, duration, activity type, and source app or device. The values must match the details entered in HelloRun.'
  );
  assert.ok(options.some((option) => option.code === 'metrics_mismatch'));
  assert.ok(options.some((option) => option.code === 'unverifiable_proof'));
});

test('approval checklist rejects unknown versions, missing items, duplicates, and unknown criteria', () => {
  const event = {};
  const submission = { source: 'strava' };
  const required = ['legibility', 'activity_date', 'distance', 'duration'];
  assert.deepEqual(validateReviewChecklist({
    event,
    submission,
    version: REVIEW_CHECKLIST_VERSION,
    verifiedCriteria: required
  }), {
    version: REVIEW_CHECKLIST_VERSION,
    requiredCriteria: required,
    confirmedCriteria: required
  });
  assert.throws(() => validateReviewChecklist({ event, submission, version: 'old', verifiedCriteria: required }), /checklist has changed/i);
  assert.throws(() => validateReviewChecklist({ event, submission, version: REVIEW_CHECKLIST_VERSION, verifiedCriteria: required.slice(0, 3) }), /every applicable/i);
  assert.throws(() => validateReviewChecklist({ event, submission, version: REVIEW_CHECKLIST_VERSION, verifiedCriteria: [...required, 'distance'] }), /duplicate/i);
  assert.throws(() => validateReviewChecklist({ event, submission, version: REVIEW_CHECKLIST_VERSION, verifiedCriteria: [...required, 'unknown'] }), /invalid item/i);
});

test('review templates expose one decision workspace and no queue-card approval form', () => {
  const root = path.join(__dirname, '..');
  const detail = fs.readFileSync(path.join(root, 'src/views/organizer/submission-review.ejs'), 'utf8');
  const queue = fs.readFileSync(path.join(root, 'src/views/organizer/run-proof-review.ejs'), 'utf8');
  assert.match(detail, /role="tablist"/);
  assert.match(detail, /name="verifiedCriteria"/);
  assert.match(detail, /id="proofZoomDialog"/);
  assert.match(detail, /id="decisionConfirmDialog"/);
  assert.match(detail, /Use suggested message/);
  assert.match(queue, /Review oldest pending/);
  assert.doesNotMatch(queue, /data-run-proof-approve/);
});
