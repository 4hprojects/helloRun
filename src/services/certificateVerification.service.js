const Submission = require('../models/Submission');
const AccumulatedActivitySubmission = require('../models/AccumulatedActivitySubmission');

async function verifyCertificateNumber(certificateNumber) {
  const safeNumber = normalizeCertificateNumber(certificateNumber);
  if (!safeNumber) {
    return { found: false, status: 'invalid', certificateNumber: '' };
  }

  const record = await findCertificateRecord(safeNumber);
  if (!record) {
    return { found: false, status: 'not_found', certificateNumber: safeNumber };
  }

  const publicData = buildPublicCertificateData(record);
  return {
    found: true,
    status: publicData.status,
    certificate: publicData
  };
}

async function findCertificateRecord(certificateNumber) {
  const query = { 'certificate.certificateNumber': certificateNumber };
  const populate = [
    { path: 'eventId', select: 'title slug organiserName eventStartAt eventEndAt logoUrl' },
    { path: 'registrationId', select: 'raceDistance participant confirmationCode' },
    { path: 'runnerId', select: 'firstName lastName' }
  ];

  let record = await Submission.findOne(query).populate(populate).lean();
  if (record) return { ...record, sourceType: 'submission' };

  record = await AccumulatedActivitySubmission.findOne(query).populate(populate).lean();
  if (record) return { ...record, sourceType: 'accumulated_activity' };
  return null;
}

function buildPublicCertificateData(record) {
  const certificate = record.certificate || {};
  const event = record.eventId || {};
  const registration = record.registrationId || {};
  const runner = record.runnerId || {};
  const runnerName = buildRunnerName(runner, registration);
  const status = certificate.status === 'revoked' || certificate.revokedAt ? 'revoked' : 'valid';

  return {
    certificateNumber: certificate.certificateNumber || '',
    status,
    runnerName,
    eventTitle: event.title || 'Event unavailable',
    eventSlug: String(event.slug || '').trim(),
    eventDate: event.eventStartAt || null,
    organizerName: event.organiserName || '',
    distance: registration.raceDistance || record.raceDistance || formatDistance(record.distanceKm),
    finishTime: formatElapsedMs(record.elapsedMs),
    rank: '',
    generatedAt: certificate.issuedAt || record.reviewedAt || null,
    revokedAt: certificate.revokedAt || null,
    verificationUrl: certificate.verificationUrl || '',
    eventLogoUrl: String(event.logoUrl || '').trim()
  };
}

function normalizeCertificateNumber(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '')
    .slice(0, 80);
}

function buildRunnerName(runner, registration) {
  const fromUser = `${String(runner?.firstName || '').trim()} ${String(runner?.lastName || '').trim()}`.trim();
  if (fromUser) return fromUser;
  const participant = registration?.participant || {};
  return `${String(participant.firstName || '').trim()} ${String(participant.lastName || '').trim()}`.trim() || 'Runner';
}

function formatDistance(value) {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric) || numeric <= 0) return '';
  return `${Number(numeric.toFixed(2)).toString()} km`;
}

function formatElapsedMs(value) {
  const totalMs = Number(value || 0);
  if (!Number.isFinite(totalMs) || totalMs <= 0) return '';
  const totalSeconds = Math.floor(totalMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

module.exports = {
  verifyCertificateNumber,
  findCertificateRecord,
  buildPublicCertificateData,
  normalizeCertificateNumber
};
