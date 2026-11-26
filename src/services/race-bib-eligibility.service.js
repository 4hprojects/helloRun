'use strict';

function evaluateBibEligibility(event = {}, registration = {}, options = {}) {
  if (String(registration.paymentStatus || '') === 'refunded') {
    return { eligible: false, reason: 'inactive_registration' };
  }
  if (!['confirmed', 'paid'].includes(String(registration.status || ''))) {
    return { eligible: false, reason: ['cancelled', 'refunded'].includes(registration.status) ? 'inactive_registration' : 'registration_pending' };
  }
  if (String(event.feeMode || 'free') === 'paid' && String(registration.paymentStatus || '') !== 'paid') {
    return { eligible: false, reason: 'payment_pending' };
  }
  if (!['virtual', 'onsite'].includes(String(registration.participationMode || ''))) {
    return { eligible: false, reason: 'invalid_participation_mode' };
  }
  if (options.requireRelease !== false && event.bibSettings?.releaseStatus !== 'released') {
    return { eligible: false, reason: 'design_awaiting_release' };
  }
  if (options.requireRelease !== false && !event.bibSettings?.releasedDesignVersionId) {
    return { eligible: false, reason: 'design_awaiting_release' };
  }
  if (registration.participationMode === 'onsite' && options.requireAssignment && !options.bibNumber) {
    return { eligible: false, reason: 'number_awaiting_assignment' };
  }
  return { eligible: true, reason: '' };
}

module.exports = { evaluateBibEligibility };
