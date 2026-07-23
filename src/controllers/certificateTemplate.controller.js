const Event = require('../models/Event');
const CertificateTemplate = require('../models/CertificateTemplate');
const uploadService = require('../services/upload.service');
const {
  getOrCreateDefaultTemplate,
  updateTemplate,
  normalizeTemplateInput,
  publishTemplate,
  applyUploadedAssets
} = require('../services/certificateTemplate.service');
const { buildCertificatePdfBuffer } = require('../services/certificate.service');
const { buildVerificationUrl } = require('../services/certificateNumber.service');
const { getCertificateSetupPresentation } = require('../services/certificate-setup-presentation.service');

async function getCertificateSetup(req, res, next) {
  try {
    const event = await getAccessibleEvent(req);
    if (!event) {
      return res.status(404).render('error', {
        title: 'Event Not Found',
        status: 404,
        message: 'Event not found or inaccessible.'
      });
    }

    const template = await getOrCreateDefaultTemplate(event._id, { event });
    const presentation = getCertificateSetupPresentation({ event, template });
    return res.render('organizer/certificate-setup', {
      title: 'Certificate Setup - HelloRun',
      event,
      template,
      presentation,
      errors: {},
      message: getPageMessage(req.query),
      previewUrl: `/organizer/events/${event._id}/certificate/preview`
    });
  } catch (error) {
    return next(error);
  }
}

async function postCertificateSetup(req, res, next) {
  try {
    const event = await getAccessibleEvent(req);
    if (!event) return res.redirect('/organizer/events');
    const template = await getOrCreateDefaultTemplate(event._id, { event });
    await updateTemplate(template, req.body);
    return redirectCertificate(event._id, 'success', 'Certificate template saved.');
  } catch (error) {
    return next(error);
  }

  function redirectCertificate(eventId, type, msg) {
    const q = new URLSearchParams({ type, msg });
    return res.redirect(`/organizer/events/${eventId}/certificate?${q.toString()}`);
  }
}

async function postCertificateAssets(req, res, next) {
  try {
    const event = await getAccessibleEvent(req);
    if (!event) return res.redirect('/organizer/events');
    const template = await getOrCreateDefaultTemplate(event._id, { event });
    if (req.uploadError) {
      const q = new URLSearchParams({ type: 'error', msg: req.uploadError });
      return res.redirect(`/organizer/events/${event._id}/certificate?${q.toString()}`);
    }

    const uploaded = await uploadService.uploadCertificateAssetsToR2({
      userId: req.session.userId,
      eventId: event._id,
      backgroundImageFile: req.files?.backgroundImageFile?.[0],
      organizerLogoFile: req.files?.organizerLogoFile?.[0],
      eventLogoFile: req.files?.eventLogoFile?.[0],
      eventArtworkFile: req.files?.eventArtworkFile?.[0],
      signatureImageFile: req.files?.signatureImageFile?.[0],
      sponsorLogoFiles: req.files?.sponsorLogoFiles || []
    });
    await applyUploadedAssets(template, uploaded);

    const q = new URLSearchParams({ type: 'success', msg: 'Certificate assets uploaded.' });
    return res.redirect(`/organizer/events/${event._id}/certificate?${q.toString()}`);
  } catch (error) {
    return next(error);
  }
}

async function postCertificatePreview(req, res, next) {
  try {
    const event = await getAccessibleEvent(req);
    if (!event) return res.status(404).send('Event not found.');
    const template = await getOrCreateDefaultTemplate(event._id, { event });
    const previewTemplate = normalizeTemplateInput(template, req.body);

    const sample = template.previewSampleData || {};
    const certificateNumber = sample.certificateNumber || 'HR-CERT-2026-SAMPLE-000001';
    const buffer = await buildCertificatePdfBuffer({
      runnerName: sample.runnerName,
      eventTitle: sample.eventTitle || event.title,
      organizerName: sample.organizerName || event.organiserName,
      distance: sample.distance,
      finishTime: sample.finishTime,
      rank: sample.rank,
      eventDate: sample.eventDate,
      certificateNumber,
      verificationUrl: buildVerificationUrl(certificateNumber),
      template: {
        layoutKey: previewTemplate.layoutKey
      },
      assets: template.assets,
      content: previewTemplate.content,
      displayOptions: previewTemplate.displayOptions,
      styleOptions: previewTemplate.styleOptions,
      approvedAt: new Date()
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="certificate-preview.pdf"');
    return res.status(200).send(buffer);
  } catch (error) {
    return next(error);
  }
}

async function postCertificatePublish(req, res, next) {
  try {
    const event = await getAccessibleEvent(req);
    if (!event) return res.redirect('/organizer/events');
    const template = await getOrCreateDefaultTemplate(event._id, { event });
    await updateTemplate(template, req.body);
    await publishTemplate(template);
    const q = new URLSearchParams({ type: 'success', msg: 'Certificate template published.' });
    return res.redirect(`/organizer/events/${event._id}/certificate?${q.toString()}`);
  } catch (error) {
    return next(error);
  }
}

async function postCertificateArchive(req, res, next) {
  try {
    const event = await getAccessibleEvent(req);
    if (!event) return res.redirect('/organizer/events');
    await CertificateTemplate.updateMany({ eventId: event._id, status: 'active' }, {
      $set: { status: 'archived' }
    });
    const q = new URLSearchParams({ type: 'success', msg: 'Certificate template archived.' });
    return res.redirect(`/organizer/events/${event._id}/certificate?${q.toString()}`);
  } catch (error) {
    return next(error);
  }
}

async function getAccessibleEvent(req) {
  const userId = req.session?.userId;
  const eventId = req.params.eventId;
  if (!userId || !eventId) return null;
  const user = resLocalsUser(req);
  if (!user || !['organiser', 'admin'].includes(user.role)) return null;
  const query = { _id: eventId, isDeleted: { $ne: true } };
  if (user?.role !== 'admin') query.organizerId = userId;
  return Event.findOne(query).lean();
}

function resLocalsUser(req) {
  return req.res?.locals?.user || null;
}

function getPageMessage(query = {}) {
  if (!query.type || !query.msg) return null;
  return {
    type: String(query.type),
    text: String(query.msg)
  };
}

module.exports = {
  getCertificateSetup,
  postCertificateSetup,
  postCertificateAssets,
  postCertificatePreview,
  postCertificatePublish,
  postCertificateArchive
};
