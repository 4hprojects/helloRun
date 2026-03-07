const RUNNER_SUBMITTABLE_PAYMENT_STATUSES = new Set(['unpaid', 'proof_rejected']);
const ORGANIZER_REVIEWABLE_PAYMENT_STATUSES = new Set(['proof_submitted']);

function canRunnerSubmitPaymentProof(registration = {}) {
  const paymentStatus = String(registration.paymentStatus || '').trim();
  const registrationStatus = String(registration.status || '').trim();

  if (!RUNNER_SUBMITTABLE_PAYMENT_STATUSES.has(paymentStatus)) {
    return false;
  }
  if (registrationStatus === 'cancelled' || registrationStatus === 'refunded') {
    return false;
  }
  return true;
}

function canOrganizerReviewPaymentProof(registration = {}) {
  const paymentStatus = String(registration.paymentStatus || '').trim();
  const proofUrl = String(registration.paymentProof?.url || '').trim();

  if (!ORGANIZER_REVIEWABLE_PAYMENT_STATUSES.has(paymentStatus)) {
    return false;
  }
  if (!proofUrl) {
    return false;
  }
  return true;
}

function getReviewablePaymentStatuses() {
  return Array.from(ORGANIZER_REVIEWABLE_PAYMENT_STATUSES);
}

module.exports = {
  canRunnerSubmitPaymentProof,
  canOrganizerReviewPaymentProof,
  getReviewablePaymentStatuses
};
