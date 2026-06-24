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
    const appUrl = String(process.env.APP_URL || '').replace(/\/$/, '');
    const canonicalUrl = `${appUrl}/certificates/verify/${encodeURIComponent(certificateNumber)}`;

    let seo = null;
    let shareUrls = null;
    if (result.found && result.certificate.status === 'valid') {
      const cert = result.certificate;
      const ogTitle = `${cert.eventTitle} — Verified HelloRun Certificate`;
      const shareText = `I completed ${cert.eventTitle} and earned a verified certificate! 🏃 #HelloRun`;
      seo = {
        ogTitle,
        description: `${cert.runnerName} completed ${cert.eventTitle}${cert.distance ? ` (${cert.distance})` : ''}${cert.finishTime ? ` in ${cert.finishTime}` : ''}. Verified by HelloRun.`,
        canonicalUrl,
        ogType: 'profile',
        ogImage: cert.eventLogoUrl || '',
        twitterCard: 'summary_large_image'
      };
      shareUrls = {
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(canonicalUrl)}`,
        x: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(canonicalUrl)}`,
        linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(canonicalUrl)}`,
        mail: `mailto:?subject=${encodeURIComponent(ogTitle)}&body=${encodeURIComponent(`${shareText}\n\n${canonicalUrl}`)}`
      };
    }

    return res.render('certificates/verification-result', {
      title: 'Certificate Verification - HelloRun',
      seo,
      certificateNumber,
      result,
      canonicalUrl,
      shareUrls
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
