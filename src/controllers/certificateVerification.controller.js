const { verifyCertificateNumber, normalizeCertificateNumber } = require('../services/certificateVerification.service');
const { logCertificateAuditInBackground } = require('../services/certificateAudit.service');

async function getVerificationSearch(req, res) {
  return res.render('certificates/verify', {
    title: 'Verify Certificate - HelloRun',
    certificateNumber: '',
    result: null,
    message: null
  });
}

async function postVerificationSearch(req, res) {
  const certificateNumber = normalizeCertificateNumber(req.body.certificateNumber);
  if (!certificateNumber) {
    return res.status(400).render('certificates/verify', {
      title: 'Verify Certificate - HelloRun',
      certificateNumber: '',
      result: null,
      message: 'Enter a certificate number.'
    });
  }
  return res.redirect(`/certificates/verify/${encodeURIComponent(certificateNumber)}`);
}

async function getVerificationResult(req, res, next) {
  try {
    const certificateNumber = normalizeCertificateNumber(req.params.certificateNumber);
    const result = await verifyCertificateNumber(certificateNumber);
    logCertificateAuditInBackground({
      action: 'verified',
      details: {
        certificateNumber,
        found: result.found,
        status: result.status
      },
      ipAddress: getRequestIpAddress(req),
      userAgent: getRequestUserAgent(req)
    });
    return res.render('certificates/verification-result', {
      title: 'Certificate Verification - HelloRun',
      certificateNumber,
      result
    });
  } catch (error) {
    return next(error);
  }
}

function getRequestIpAddress(req) {
  const forwardedFor = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return (forwardedFor || String(req.ip || '').trim()).slice(0, 120);
}

function getRequestUserAgent(req) {
  return String(req.get('user-agent') || '').trim().slice(0, 500);
}

module.exports = {
  getVerificationSearch,
  postVerificationSearch,
  getVerificationResult
};
