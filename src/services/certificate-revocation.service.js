'use strict';

// Revoking an issued certificate, shared by the organiser's explicit revoke action and by
// an approval reversal, so both write the same fields and leave the same audit trail.
//
// The public verification page already treats `status === 'revoked' || revokedAt` as
// revoked, so flipping these fields is what actually withdraws the certificate.

const { recordCriticalAuditEventInBackground } = require('./critical-audit.service');

/**
 * @param {object} record  a Submission or AccumulatedActivitySubmission document
 * @param {string} sourceType 'submission_certificate' | 'accumulated_activity_certificate'
 * @returns {Promise<{ revoked: boolean, revokedAt: Date|null }>}
 *          revoked:false when there was no issued certificate to withdraw, which is the
 *          normal case and never an error.
 */
async function revokeIssuedCertificate({
  record,
  sourceType,
  actorUserId,
  reason,
  now = new Date(),
  save = true
}) {
  if (!record?.certificate?.url) {
    return { revoked: false, revokedAt: null };
  }
  if (String(record.certificate.status || '') === 'revoked') {
    return { revoked: false, revokedAt: record.certificate.revokedAt || null };
  }

  record.certificate.status = 'revoked';
  record.certificate.revokedAt = now;
  if (save) await record.save();

  recordCriticalAuditEventInBackground({
    actorMongoUserId: actorUserId,
    action: 'certificate.revoked',
    targetType: sourceType,
    targetId: String(record._id),
    statusFrom: '',
    statusTo: 'revoked',
    notes: String(reason || 'Certificate revoked.').slice(0, 500),
    occurredAt: now
  });

  return { revoked: true, revokedAt: now };
}

function getCertificateSourceType(submissionKind) {
  return submissionKind === 'accumulated'
    ? 'accumulated_activity_certificate'
    : 'submission_certificate';
}

module.exports = {
  revokeIssuedCertificate,
  getCertificateSourceType
};
