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

    const presentation = buildVerificationPagePresentation(result, canonicalUrl);

    return res.render('certificates/verification-result', {
      title: presentation.title,
      seo: presentation.seo,
      certificateNumber,
      result,
      canonicalUrl,
      shareUrls: presentation.shareUrls
    });
  } catch (error) {
    return next(error);
  }
}

function buildVerificationPagePresentation(result, canonicalUrl) {
  let seo = {
    robots: 'noindex, nofollow',
    canonicalUrl
  };
  let shareUrls = null;
  let title = 'Certificate Verification - HelloRun';

  if (result.found && result.certificate.status === 'valid') {
    const cert = result.certificate;
    const achievement = cert.verifiedDistance
      ? `${cert.goalDistance} goal with ${cert.verifiedDistance} verified at ${cert.eventTitle}`
      : [cert.distance, cert.eventTitle].filter(Boolean).join(' at ');
    const ogTitle = `${cert.runnerName} — Verified ${cert.eventTitle} Achievement`;
    const shareText = `${cert.runnerName} officially completed ${achievement || cert.eventTitle}. View the verified HelloRun achievement. 🏃 #HelloRun`;
    title = `${cert.runnerName} — Verified Achievement | HelloRun`;
    seo = {
      ogTitle,
      description: cert.verifiedDistance
        ? `${cert.runnerName} completed the ${cert.goalDistance} goal with ${cert.verifiedDistance} verified at ${cert.eventTitle}. Verified by HelloRun.`
        : `${cert.runnerName} completed ${cert.eventTitle}${cert.distance ? ` (${cert.distance})` : ''}${cert.finishTime ? ` in ${cert.finishTime}` : ''}. Verified by HelloRun.`,
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

  return { title, seo, shareUrls };
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
  getVerificationResult,
  buildVerificationPagePresentation
};
