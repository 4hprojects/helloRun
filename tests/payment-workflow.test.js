const test = require('node:test');
const assert = require('node:assert/strict');
const {
  canRunnerSubmitPaymentProof,
  canOrganizerReviewPaymentProof,
  getReviewablePaymentStatuses
} = require('../src/utils/payment-workflow');

test('runner can submit proof when unpaid and active', () => {
  assert.equal(
    canRunnerSubmitPaymentProof({
      paymentStatus: 'unpaid',
      status: 'confirmed'
    }),
    true
  );
});

test('runner can resubmit proof when previously rejected and active', () => {
  assert.equal(
    canRunnerSubmitPaymentProof({
      paymentStatus: 'proof_rejected',
      status: 'confirmed'
    }),
    true
  );
});

test('runner cannot submit proof when payment already submitted', () => {
  assert.equal(
    canRunnerSubmitPaymentProof({
      paymentStatus: 'proof_submitted',
      status: 'confirmed'
    }),
    false
  );
});

test('runner cannot submit proof when registration is cancelled or refunded', () => {
  assert.equal(
    canRunnerSubmitPaymentProof({
      paymentStatus: 'unpaid',
      status: 'cancelled'
    }),
    false
  );
  assert.equal(
    canRunnerSubmitPaymentProof({
      paymentStatus: 'proof_rejected',
      status: 'refunded'
    }),
    false
  );
});

test('organizer can review only when proof is submitted and proof URL exists', () => {
  assert.equal(
    canOrganizerReviewPaymentProof({
      paymentStatus: 'proof_submitted',
      paymentProof: { url: 'https://example.com/proof.pdf' }
    }),
    true
  );
});

test('organizer cannot review when proof url is missing', () => {
  assert.equal(
    canOrganizerReviewPaymentProof({
      paymentStatus: 'proof_submitted',
      paymentProof: { url: '' }
    }),
    false
  );
});

test('organizer cannot review when payment status is not reviewable', () => {
  assert.equal(
    canOrganizerReviewPaymentProof({
      paymentStatus: 'unpaid',
      paymentProof: { url: 'https://example.com/proof.pdf' }
    }),
    false
  );
  assert.equal(
    canOrganizerReviewPaymentProof({
      paymentStatus: 'paid',
      paymentProof: { url: 'https://example.com/proof.pdf' }
    }),
    false
  );
});

test('reviewable statuses set remains strict', () => {
  assert.deepEqual(getReviewablePaymentStatuses(), ['proof_submitted']);
});
