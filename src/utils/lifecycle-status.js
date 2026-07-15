const STATUS_CATALOG = Object.freeze({
  registration: Object.freeze({
    pending: { label: 'Registration Pending', tone: 'warning', description: 'Complete the required next step to confirm your place.' },
    confirmed: { label: 'Registration Confirmed', tone: 'success', description: 'Your event registration is confirmed.' },
    cancelled: { label: 'Registration Cancelled', tone: 'neutral', description: 'This registration is no longer active.' },
    refunded: { label: 'Registration Refunded', tone: 'neutral', description: 'This registration has been refunded.' }
  }),
  payment: Object.freeze({
    unpaid: { label: 'Payment Needed', tone: 'warning', description: 'Follow the organizer instructions and upload your receipt.' },
    proof_submitted: { label: 'Payment Under Review', tone: 'info', description: 'Your receipt was received and is waiting for organizer review.' },
    paid: { label: 'Payment Approved', tone: 'success', description: 'Your payment is approved.' },
    proof_rejected: { label: 'Payment Needs Correction', tone: 'danger', description: 'Review the feedback and upload corrected proof.' },
    failed: { label: 'Payment Failed', tone: 'danger', description: 'Review the payment instructions before trying again.' },
    refunded: { label: 'Payment Refunded', tone: 'neutral', description: 'This payment has been refunded.' },
    not_required: { label: 'No Payment Required', tone: 'success', description: 'This registration does not require payment.' }
  }),
  submission: Object.freeze({
    not_started: { label: 'Run Proof Needed', tone: 'warning', description: 'Submit your eligible activity during the submission window.' },
    submitted: { label: 'Run Proof Under Review', tone: 'info', description: 'Your activity was received and is waiting for review.' },
    approved: { label: 'Run Result Approved', tone: 'success', description: 'Your result is approved and completion rewards are available when enabled.' },
    rejected: { label: 'Run Proof Needs Correction', tone: 'danger', description: 'Review the feedback and resubmit corrected proof.' }
  }),
  order: Object.freeze({
    pending_payment: { label: 'Order Payment Needed', tone: 'warning', description: 'Submit payment proof for this merchandise order.' },
    payment_review: { label: 'Order Payment Under Review', tone: 'info', description: 'Your merchandise payment is waiting for review.' },
    paid: { label: 'Order Paid', tone: 'success', description: 'Payment is approved and fulfillment can proceed.' },
    processing: { label: 'Order Processing', tone: 'info', description: 'Your merchandise order is being prepared.' },
    fulfilled: { label: 'Order Fulfilled', tone: 'success', description: 'Your merchandise order has been fulfilled.' },
    cancelled: { label: 'Order Cancelled', tone: 'neutral', description: 'This merchandise order is cancelled.' }
  })
});

function humanizeStatus(value) {
  return String(value || 'unknown')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getLifecycleStatus(kind, status) {
  const safeKind = String(kind || '').trim();
  const safeStatus = String(status || '').trim();
  return STATUS_CATALOG[safeKind]?.[safeStatus] || {
    label: humanizeStatus(safeStatus),
    tone: 'neutral',
    description: 'Review this item for its current state and available actions.'
  };
}

module.exports = { STATUS_CATALOG, getLifecycleStatus, humanizeStatus };
