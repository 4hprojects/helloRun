const test = require('node:test');
const assert = require('node:assert/strict');

const { getRejectionReasonOptions, resolveRejectionReason } = require('../src/utils/rejection-reasons');
const { getLifecycleStatus } = require('../src/utils/lifecycle-status');
const { setSessionFlash, consumeSessionFlash } = require('../src/utils/session-flash');

test('structured payment and run rejection reasons provide runner guidance', () => {
  assert.ok(getRejectionReasonOptions('payment').length >= 6);
  assert.ok(getRejectionReasonOptions('run').length >= 8);

  const result = resolveRejectionReason('run', 'unclear_proof', 'Distance is cropped.');
  assert.equal(result.code, 'unclear_proof');
  assert.match(result.runnerMessage, /Activity proof is unclear/);
  assert.match(result.guidance, /clear screenshot/i);
});

test('structured rejection rejects unknown codes and requires detail for other', () => {
  assert.throws(() => resolveRejectionReason('run', 'unknown', ''), /valid rejection reason/i);
  assert.throws(() => resolveRejectionReason('payment', 'other', 'short'), /at least 10 characters/i);
  assert.doesNotThrow(() => resolveRejectionReason('payment', '', 'Legacy free-form reason', { allowLegacyDetail: true }));
});

test('lifecycle vocabulary stays friendly and falls back safely', () => {
  assert.equal(getLifecycleStatus('payment', 'proof_submitted').label, 'Payment Under Review');
  assert.equal(getLifecycleStatus('submission', 'rejected').label, 'Run Proof Needs Correction');
  assert.equal(getLifecycleStatus('order', 'processing').label, 'Order Processing');
  assert.equal(getLifecycleStatus('submission', 'future_state').label, 'Future State');
});

test('session flash is consumed exactly once', () => {
  const req = { session: {} };
  assert.equal(setSessionFlash(req, 'success', 'Saved successfully.'), true);
  assert.deepEqual(consumeSessionFlash(req), { type: 'success', message: 'Saved successfully.' });
  assert.equal(consumeSessionFlash(req), null);
});
