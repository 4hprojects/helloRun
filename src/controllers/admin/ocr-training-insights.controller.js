'use strict';

/**
 * /admin/ocr-training/analytics and /settings (Phase 5).
 * Settings changes and the research export require the full admin tier (router).
 */

const mongoose = require('mongoose');
const logger = require('../../utils/logger');
const User = require('../../models/User');
const { getOcrAnalytics, buildResearchExportCsv, ALLOWED_WINDOWS, windowDays } = require('../../services/ocr/ocr-analytics.service');
const { getOcrSettings, updateOcrSettings, buildSettingsUpdate, validateTrainingBasis } = require('../../services/ocr/ocr-settings.service');
const notifications = require('../../services/ocr/ocr-notification.service');
const { getDigestSchedule } = require('../../utils/ocr/digest-schedule');
const { isRemindersEnabled } = require('../../services/ocr/ocr-config');
const { recordOcrAudit } = require('../../services/ocr/ocr-audit.service');
const base = require('./ocr-training.controller');

const EVENT_TYPE_LABELS = Object.freeze({
  'ocr.review_digest': 'Review digest (scheduled)',
  'ocr.dataset_ready': 'New verified samples threshold reached',
  'ocr.training_completed': 'Training finished',
  'ocr.training_failed': 'Training failed',
  'ocr.model_approval_needed': 'Candidate needs approval (full admins)',
  'ocr.model_activated': 'Model activated or rolled back (full admins)',
  'ocr.quality_regression': 'Reading quality dropped for a platform'
});

exports.renderAnalytics = async (req, res) => {
  try {
    const analytics = await getOcrAnalytics({ days: req.query.days });
    return res.render('admin/ocr-training/analytics', {
      ...base._baseLocals(req, 'analytics', 'Analytics'),
      analytics,
      windows: ALLOWED_WINDOWS,
      canExport: Boolean(res.locals?.isFullAdmin)
    });
  } catch (error) {
    return base._renderError(res, error, 'Could not load OCR analytics.');
  }
};

exports.exportResearchCsv = async (req, res) => {
  try {
    const days = windowDays(req.query.days);
    const csv = await buildResearchExportCsv({ days, experimentId: req.query.experimentId });
    await recordOcrAudit({ action: 'ocr.research_export', targetType: 'analytics', targetId: `${days}d`, details: { experimentId: String(req.query.experimentId || '').slice(0, 60) }, req });
    res.set('Content-Type', 'text/csv; charset=utf-8');
    res.set('Content-Disposition', `attachment; filename="hellorun-ocr-research-${days}d-${new Date().toISOString().slice(0, 10)}.csv"`);
    return res.send(csv);
  } catch (error) {
    logger.error('[ocr-training] research export failed', { error: error?.message });
    return res.status(500).send('Export failed.');
  }
};

exports.renderSettings = async (req, res) => {
  try {
    const [settings, admins, deliveries] = await Promise.all([
      getOcrSettings({ fresh: true }),
      User.find({ role: 'admin', accountStatus: { $nin: ['closed', 'suspended'] } }).select('_id firstName lastName email adminTier').sort({ firstName: 1 }).limit(200).lean(),
      notifications.listDeliveries(30)
    ]);
    const schedule = getDigestSchedule(new Date(), settings.notifications || {});
    return res.render('admin/ocr-training/settings', {
      ...base._baseLocals(req, 'settings', 'Settings'),
      settings,
      admins,
      deliveries,
      schedule,
      remindersFlag: isRemindersEnabled(),
      eventTypeLabels: EVENT_TYPE_LABELS,
      canEdit: Boolean(res.locals?.isFullAdmin)
    });
  } catch (error) {
    return base._renderError(res, error, 'Could not load OCR settings.');
  }
};

exports.updateSettings = async (req, res) => {
  const back = '/admin/ocr-training/settings';
  try {
    const { set, errors } = buildSettingsUpdate(req.body || {});
    if (req.body?.['notifications.recipients__present'] !== undefined) {
      const ids = [].concat(req.body['notifications.recipientUserIds'] || []).map(String).filter((id) => mongoose.isValidObjectId(id));
      const muted = [].concat(req.body['notifications.mutedUserIds'] || []).map(String).filter((id) => mongoose.isValidObjectId(id));
      const validAdmins = new Set((await User.find({ _id: { $in: [...ids, ...muted] }, role: 'admin' }).select('_id').lean()).map((user) => String(user._id)));
      set['notifications.recipientUserIds'] = ids.filter((id) => validAdmins.has(id));
      set['notifications.mutedUserIds'] = muted.filter((id) => validAdmins.has(id));
    }
    if (errors.length) return base._redirectWith(res, back, 'error', errors.join(' '));
    if (!Object.keys(set).length) return base._redirectWith(res, back, 'info', 'Nothing changed.');
    const before = await getOcrSettings({ fresh: true });
    const basisChanging = set['training.basis'] !== undefined && set['training.basis'] !== (before.training?.basis || 'opt_in');
    if (basisChanging && String(req.body?.basisConfirmation || '').trim() !== 'CHANGE BASIS') {
      return base._redirectWith(res, back, 'error', 'Type CHANGE BASIS to confirm a change of training basis.');
    }
    const basisCheck = validateTrainingBasis(set, before);
    if (basisCheck.errors.length) return base._redirectWith(res, back, 'error', basisCheck.errors.join(' '));
    await updateOcrSettings(set, req.session?.userId);
    if (basisChanging || set['training.noticePublishedAt'] !== undefined || set['training.noticePolicyVersion'] !== undefined) {
      await recordOcrAudit({
        action: 'ocr.training_basis_updated',
        targetType: 'ocr_settings',
        targetId: 'global',
        statusFrom: before.training?.basis || 'opt_in',
        statusTo: basisCheck.merged.basis,
        reason: `notice ${basisCheck.merged.noticePolicyVersion || '-'} published ${basisCheck.merged.noticePublishedAt ? new Date(basisCheck.merged.noticePublishedAt).toISOString().slice(0, 10) : '-'}; backfill not before ${basisCheck.merged.backfillNotBefore ? new Date(basisCheck.merged.backfillNotBefore).toISOString().slice(0, 10) : '-'}`,
        req
      });
    }
    await recordOcrAudit({
      action: 'ocr.settings_updated',
      targetType: 'ocr_settings',
      targetId: 'global',
      details: { changed: Object.keys(set), approvals: { dataset: set['dataset.thresholdsApprovedByOwner'], evaluation: set['evaluation.gatesApprovedByOwner'] }, wasEnabled: Boolean(before.notifications?.enabled) },
      req
    });
    return base._redirectWith(res, back, 'success', 'OCR settings saved.');
  } catch (error) {
    logger.error('[ocr-training] settings update failed', { error: error?.message });
    return base._redirectWith(res, back, 'error', 'Could not save settings.');
  }
};

exports.sendTestEmail = async (req, res) => {
  const back = '/admin/ocr-training/settings';
  try {
    const result = await notifications.sendTestEmail({ actorId: req.session?.userId });
    await recordOcrAudit({ action: 'ocr.test_email_sent', targetType: 'user', targetId: String(req.session?.userId || ''), details: result.delivered || {}, req });
    const sent = Number(result.delivered?.sent || 0);
    return base._redirectWith(res, back, sent ? 'success' : 'warning', sent ? 'Test email sent to you.' : `Test email not sent (${Object.keys(result.delivered || {}).join(', ') || result.skipped || 'unknown'}). See delivery history.`);
  } catch (error) {
    logger.error('[ocr-training] test email failed', { error: error?.message });
    return base._redirectWith(res, back, 'error', 'Could not send the test email.');
  }
};

exports.EVENT_TYPE_LABELS = EVENT_TYPE_LABELS;
