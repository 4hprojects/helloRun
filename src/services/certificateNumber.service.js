const Submission = require('../models/Submission');
const AccumulatedActivitySubmission = require('../models/AccumulatedActivitySubmission');

async function generateCertificateNumber({ event, sequenceSeed } = {}) {
  const year = getCertificateYear(event);
  const eventCode = buildEventShortCode(event);

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const sequence = await getNextSequence({ event, sequenceSeed, attempt });
    const candidate = `HR-CERT-${year}-${eventCode}-${String(sequence).padStart(6, '0')}`;
    // eslint-disable-next-line no-await-in-loop
    const exists = await certificateNumberExists(candidate);
    if (!exists) return candidate;
  }

  throw new Error('Unable to generate a unique certificate number.');
}

async function certificateNumberExists(certificateNumber) {
  const safe = String(certificateNumber || '').trim();
  if (!safe) return false;
  const [standard, accumulated] = await Promise.all([
    Submission.exists({ 'certificate.certificateNumber': safe }),
    AccumulatedActivitySubmission.exists({ 'certificate.certificateNumber': safe })
  ]);
  return Boolean(standard || accumulated);
}

function buildVerificationUrl(certificateNumber) {
  const safeNumber = encodeURIComponent(String(certificateNumber || '').trim());
  const configuredBase = String(process.env.CERTIFICATE_PUBLIC_VERIFY_BASE_URL || '').trim().replace(/\/+$/, '');
  if (configuredBase) return `${configuredBase}/${safeNumber}`;
  const publicBase = String(process.env.PUBLIC_BASE_URL || process.env.APP_BASE_URL || '').trim().replace(/\/+$/, '');
  if (publicBase) return `${publicBase}/certificates/verify/${safeNumber}`;
  return `/certificates/verify/${safeNumber}`;
}

function buildEventShortCode(event = {}) {
  const source = String(event.referenceCode || event.slug || event.title || 'EVENT').trim();
  const safe = source
    .toUpperCase()
    .replace(/^HR-?/, '')
    .replace(/[^A-Z0-9]+/g, '')
    .slice(0, 10);
  return safe || 'EVENT';
}

function getCertificateYear(event = {}) {
  const date = event.eventStartAt || event.eventEndAt || new Date();
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? new Date().getFullYear() : parsed.getFullYear();
}

async function getNextSequence({ event, sequenceSeed, attempt }) {
  if (Number.isInteger(sequenceSeed) && sequenceSeed > 0) {
    return sequenceSeed + attempt;
  }

  const eventId = event?._id;
  if (!eventId) return Date.now() % 1000000;
  const [standardCount, accumulatedCount] = await Promise.all([
    Submission.countDocuments({ eventId, 'certificate.issuedAt': { $exists: true, $ne: null } }),
    AccumulatedActivitySubmission.countDocuments({ eventId, 'certificate.issuedAt': { $exists: true, $ne: null } })
  ]);
  return standardCount + accumulatedCount + attempt + 1;
}

module.exports = {
  generateCertificateNumber,
  certificateNumberExists,
  buildVerificationUrl,
  buildEventShortCode,
  getCertificateYear
};
