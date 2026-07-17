const Submission = require('../models/Submission');
const AccumulatedActivitySubmission = require('../models/AccumulatedActivitySubmission');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const User = require('../models/User');
const mongoose = require('mongoose');
const { issueSubmissionCertificate } = require('../services/certificate.service');
const { recordCriticalAuditEventInBackground } = require('../services/critical-audit.service');

async function regenerateCertificate(req, res, next) {
  try {
    const context = await getCertificateMutationContext(req);
    if (!context) {
      return res.status(404).json({ success: false, error: 'Certificate not found or inaccessible.' });
    }
    if (context.record.status !== 'approved') {
      return res.status(400).json({ success: false, error: 'Only approved records can be regenerated.' });
    }
    if (context.record.certificate?.status === 'revoked') {
      return res.status(400).json({ success: false, error: 'Revoked certificates cannot be regenerated.' });
    }
    const isAccumulated = context.event.virtualCompletionMode === 'accumulated_distance';
    if (isAccumulated && !context.record.certificate?.finalizedAt) {
      return res.status(400).json({ success: false, error: 'Accumulated challenge certificates are finalized automatically after the submission deadline and final reviews.' });
    }

    const certificate = await issueSubmissionCertificate({
      submission: context.record,
      registration: context.registration,
      event: context.event,
      runner: context.runner,
      certificateNumber: context.record.certificate?.certificateNumber || '',
      accumulatedSnapshot: isAccumulated ? {
        goalDistanceKm: context.record.certificate.goalDistanceKm,
        verifiedDistanceKm: context.record.certificate.verifiedDistanceKm,
        approvedActivityCount: context.record.certificate.approvedActivityCount,
        finalizedAt: context.record.certificate.finalizedAt
      } : null
    });

    context.record.certificate = {
      url: certificate.url || '',
      key: certificate.key || '',
      issuedAt: context.record.certificate?.issuedAt || certificate.issuedAt || new Date(),
      certificateNumber: certificate.certificateNumber || '',
      verificationUrl: certificate.verificationUrl || '',
      templateId: certificate.templateId || null,
      status: 'regenerated',
      revokedAt: null,
      regeneratedAt: new Date(),
      generationError: '',
      goalDistanceKm: context.record.certificate?.goalDistanceKm ?? null,
      verifiedDistanceKm: context.record.certificate?.verifiedDistanceKm ?? null,
      approvedActivityCount: context.record.certificate?.approvedActivityCount ?? null,
      finalizedAt: context.record.certificate?.finalizedAt || null
    };
    await context.record.save();

    recordCriticalAuditEventInBackground({
      actorMongoUserId: req.session.userId,
      action: 'certificate.regenerated',
      targetType: context.sourceType,
      targetId: String(context.record._id),
      statusFrom: '',
      statusTo: 'regenerated',
      notes: String(req.body.reason || 'Certificate regenerated.').slice(0, 500),
      occurredAt: context.record.certificate.regeneratedAt
    });

    return redirectOrJson(req, res, context.event._id, true, 'Certificate regenerated.');
  } catch (error) {
    return next(error);
  }
}

async function revokeCertificate(req, res, next) {
  try {
    const context = await getCertificateMutationContext(req);
    if (!context) {
      return res.status(404).json({ success: false, error: 'Certificate not found or inaccessible.' });
    }
    if (!context.record.certificate?.url) {
      return res.status(400).json({ success: false, error: 'Certificate has not been generated.' });
    }

    const revokedAt = new Date();
    context.record.certificate.status = 'revoked';
    context.record.certificate.revokedAt = revokedAt;
    await context.record.save();

    recordCriticalAuditEventInBackground({
      actorMongoUserId: req.session.userId,
      action: 'certificate.revoked',
      targetType: context.sourceType,
      targetId: String(context.record._id),
      statusFrom: '',
      statusTo: 'revoked',
      notes: String(req.body.reason || 'Certificate revoked.').slice(0, 500),
      occurredAt: revokedAt
    });

    return redirectOrJson(req, res, context.event._id, true, 'Certificate revoked.');
  } catch (error) {
    return next(error);
  }
}

async function getCertificateMutationContext(req) {
  const event = await getAccessibleEvent(req);
  if (!event) return null;

  const certificateId = String(req.params.certificateId || '').trim();
  const identityQuery = mongoose.Types.ObjectId.isValid(certificateId)
    ? [{ _id: certificateId }, { 'certificate.certificateNumber': certificateId }]
    : [{ 'certificate.certificateNumber': certificateId }];
  let record = await Submission.findOne({
    eventId: event._id,
    $or: identityQuery
  });
  let sourceType = 'submission_certificate';

  if (!record) {
    record = await AccumulatedActivitySubmission.findOne({
      eventId: event._id,
      $or: identityQuery
    });
    sourceType = 'accumulated_activity_certificate';
  }
  if (!record) return null;

  const [registration, runner] = await Promise.all([
    Registration.findById(record.registrationId).lean(),
    User.findById(record.runnerId).select('firstName lastName email').lean()
  ]);
  if (!registration || !runner) return null;

  return { event, record, registration, runner, sourceType };
}

async function getAccessibleEvent(req) {
  const user = req.res?.locals?.user;
  if (!user || !['organiser', 'admin'].includes(user.role)) return null;
  const query = { _id: req.params.eventId, isDeleted: { $ne: true } };
  if (user.role !== 'admin') query.organizerId = req.session.userId;
  return Event.findOne(query).lean();
}

function redirectOrJson(req, res, eventId, success, message) {
  const accept = String(req.get('accept') || '');
  if (accept.includes('application/json')) {
    return res.json({ success, message });
  }
  const q = new URLSearchParams({ type: success ? 'success' : 'error', msg: message });
  return res.redirect(`/organizer/events/${eventId}/registrants?${q.toString()}`);
}

module.exports = {
  regenerateCertificate,
  revokeCertificate
};
