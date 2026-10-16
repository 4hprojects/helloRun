'use strict';

/**
 * Runner withdrawal of the optional OCR model-improvement consent (Phase 3).
 * Excludes every training sample cut from this entry's screenshot from future datasets.
 * It does not change the entry or its review. Models already trained are not "untrained"
 * by this (doc 05 "Retention and research").
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');
const Submission = require('../models/Submission');
const AccumulatedActivitySubmission = require('../models/AccumulatedActivitySubmission');
const TrainingSample = require('../models/TrainingSample');
const { recordOcrAudit } = require('../services/ocr/ocr-audit.service');

exports.withdrawOcrTrainingConsent = async (req, res) => {
  const submissionId = String(req.params.submissionId || '');
  const back = `/runner/submissions/${encodeURIComponent(submissionId)}`;
  if (!mongoose.isValidObjectId(submissionId)) return res.status(404).render('error', { title: 'Not Found', status: 404, message: 'Submission not found.' });
  try {
    const runnerId = req.session?.userId;
    const filter = { _id: submissionId, runnerId, 'ocrTrainingConsent.granted': true };
    const update = { $set: { 'ocrTrainingConsent.granted': false, 'ocrTrainingConsent.withdrawnAt': new Date() } };
    let result = await Submission.updateOne(filter, update);
    let kind = 'run_submission';
    if (!result.matchedCount) {
      result = await AccumulatedActivitySubmission.updateOne(filter, update);
      kind = 'accumulated_activity';
    }
    if (!result.matchedCount) return res.redirect(back);
    const excluded = await TrainingSample.updateMany(
      { 'sourceEntry.id': submissionId, status: { $ne: 'excluded' } },
      { $set: { status: 'excluded', eligibility: 'ineligible', exclusionReason: 'consent_withdrawn' }, $addToSet: { ineligibleReasons: 'consent_withdrawn' }, $inc: { __v: 1 } }
    );
    await recordOcrAudit({
      action: 'ocr.training_consent_withdrawn',
      targetType: kind,
      targetId: submissionId,
      statusFrom: 'granted',
      statusTo: 'withdrawn',
      details: { samplesExcluded: Number(excluded.modifiedCount || 0) },
      req
    });
    return res.redirect(back);
  } catch (error) {
    logger.error('[ocr-consent] withdrawal failed', { error: error?.message });
    return res.status(500).render('error', { title: 'Server Error', status: 500, message: 'Could not withdraw permission. Please try again.' });
  }
};
