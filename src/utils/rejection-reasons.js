const REJECTION_REASONS = Object.freeze({
  payment: Object.freeze({
    unreadable_receipt: { label: 'Receipt is unclear or unreadable', guidance: 'Upload a clear receipt showing the payment date, amount, recipient, and reference.' },
    wrong_amount: { label: 'Payment amount does not match', guidance: 'Check the event fee and upload proof for the correct total.' },
    wrong_recipient: { label: 'Payment recipient does not match', guidance: 'Use the organizer payment account shown in your registration instructions.' },
    missing_reference: { label: 'Payment reference is missing', guidance: 'Upload proof that clearly shows the transaction or reference number.' },
    duplicate_receipt: { label: 'Receipt was already used', guidance: 'Upload the unique receipt for this registration.' },
    other: { label: 'Another payment issue needs correction', guidance: 'Review the organizer’s details below and upload corrected proof.' }
  }),
  run: Object.freeze({
    unclear_proof: { label: 'Activity proof is unclear', guidance: 'Upload a clear screenshot showing distance, duration, and activity date.' },
    wrong_activity: { label: 'Proof does not show the required activity', guidance: 'Upload the activity that belongs to this event and registration.' },
    identity_mismatch: { label: 'Activity identity does not match', guidance: 'Submit your own activity using the name associated with your HelloRun profile.' },
    distance_mismatch: { label: 'Distance does not meet the event requirement', guidance: 'Review the required distance and submit a qualifying activity.' },
    date_outside_window: { label: 'Activity date is outside the event window', guidance: 'Submit an activity completed within the dates shown on the event.' },
    incomplete_metrics: { label: 'Required activity details are missing', guidance: 'Upload proof that includes the required distance, duration, and date.' },
    duplicate_activity: { label: 'Activity was already submitted', guidance: 'Submit a different eligible activity that has not already been used.' },
    other: { label: 'Another activity issue needs correction', guidance: 'Review the organizer’s details below and submit corrected proof.' }
  })
});

function getRejectionReasonOptions(kind) {
  const catalog = REJECTION_REASONS[kind] || {};
  return Object.entries(catalog).map(([code, value]) => ({ code, ...value }));
}

function resolveRejectionReason(kind, code, detail, options = {}) {
  const catalog = REJECTION_REASONS[kind];
  if (!catalog) throw new Error('Unknown rejection reason type.');

  const safeDetail = String(detail || '').trim().slice(0, 500);
  let safeCode = String(code || '').trim();
  if (!safeCode && options.allowLegacyDetail && safeDetail.length >= 5) safeCode = 'other';
  const definition = catalog[safeCode];
  if (!definition) throw new Error('Select a valid rejection reason.');
  if (safeCode === 'other' && safeDetail.length < 10) {
    throw new Error('Add at least 10 characters of detail for the selected reason.');
  }

  return {
    code: safeCode,
    label: definition.label,
    guidance: definition.guidance,
    detail: safeDetail,
    runnerMessage: safeDetail ? `${definition.label}: ${safeDetail}` : definition.label
  };
}

module.exports = { REJECTION_REASONS, getRejectionReasonOptions, resolveRejectionReason };
