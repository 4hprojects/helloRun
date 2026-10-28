const mongoose = require('mongoose');
const User = require('../../models/User');
const Event = require('../../models/Event');
const ActiveQuestSeries = require('../../models/ActiveQuestSeries');
const ActiveQuestTemplateVersion = require('../../models/ActiveQuestTemplateVersion');
const {
  createActiveQuestTemplateDraft,
  initializeActiveQuestFoundation,
  publishActiveQuestTemplate,
  updateActiveQuestFeatureFlag,
  updateActiveQuestSeriesSettings,
  updateActiveQuestTemplateDraft
} = require('../../services/active-quest-foundation.service');
const { generateActiveQuestEdition } = require('../../services/active-quest-generator.service');
const { getActiveQuestPublicationErrors } = require('../../services/active-quest-readiness.service');
const { getActiveQuestSeriesAnalytics } = require('../../services/active-quest-analytics.service');
const { listActiveQuestSchedulerRecovery } = require('../../services/active-quest-scheduler.service');
const logger = require('../../utils/logger');

exports.getActiveQuest = async (req, res) => {
  try {
    const series = await ActiveQuestSeries.findOne({ key: 'active-quest' }).lean();
    const [templates, editions, analytics, schedulerRecovery] = await Promise.all([
      series
        ? ActiveQuestTemplateVersion.find({ seriesKey: 'active-quest' }).sort({ version: -1 }).lean()
        : [],
      Event.find({ seriesKey: 'active-quest', isDeleted: { $ne: true } })
        .sort({ seriesYear: -1, seriesMonth: -1 })
        .lean(),
      series ? getActiveQuestSeriesAnalytics() : { months: [], totals: {}, metricRules: {} },
      series ? listActiveQuestSchedulerRecovery() : { enabled: false, missed: [], jobs: [] }
    ]);
    const currentTemplate = templates.find((template) =>
      String(template._id) === String(series?.currentTemplateVersionId || '')
    ) || null;
    const draftTemplate = templates.find((template) => template.status === 'draft') || null;
    return res.render('admin/active-quest', {
      title: 'Active Quest Management - HelloRun Admin',
      series,
      templates,
      currentTemplate,
      draftTemplate,
      editions: editions.map((event) => ({
        ...event,
        readinessErrors: getActiveQuestPublicationErrors(event)
      })),
      analytics,
      schedulerRecovery,
      message: getMessage(req.query)
    });
  } catch (error) {
    return renderError(res, error, 'Active Quest management could not be loaded.');
  }
};

exports.initializeActiveQuest = async (req, res) => {
  try {
    const actor = await getActor(req);
    const result = await initializeActiveQuestFoundation({ actor, organizerId: actor._id });
    return redirect(res, 'success', result.created
      ? 'Active Quest foundation created. Every feature flag remains disabled.'
      : 'Active Quest foundation already exists. No records changed.');
  } catch (error) {
    return redirectError(res, error);
  }
};

exports.updateActiveQuestSeries = async (req, res) => {
  try {
    const [actor, series] = await Promise.all([getActor(req), getSeries()]);
    await updateActiveQuestSeriesSettings({
      series,
      actor,
      reason: req.body.reason,
      changes: {
        tagline: req.body.tagline,
        scheduleDefaults: {
          registrationLeadDays: req.body.registrationLeadDays,
          draftPreparationDaysBeforeRegistration: req.body.draftPreparationDaysBeforeRegistration,
          registrationCloseDay: req.body.registrationCloseDay,
          proofCloseDayNextMonth: req.body.proofCloseDayNextMonth,
          reviewTargetDays: req.body.reviewTargetDays
        },
        brandAssets: {
          logoUrl: req.body.logoUrl,
          bannerUrl: req.body.bannerUrl,
          posterUrl: req.body.posterUrl
        }
      }
    });
    return redirect(res, 'success', 'Active Quest series settings saved and audited.');
  } catch (error) {
    return redirectError(res, error);
  }
};

exports.updateActiveQuestFlag = async (req, res) => {
  try {
    const [actor, series] = await Promise.all([getActor(req), getSeries()]);
    const result = await updateActiveQuestFeatureFlag({
      series,
      actor,
      flag: req.body.flag,
      enabled: req.body.enabled === 'true',
      reason: req.body.reason
    });
    return redirect(res, 'success', result.changed ? 'Feature flag changed and audited.' : 'Feature flag already had that value.');
  } catch (error) {
    return redirectError(res, error);
  }
};

exports.createActiveQuestTemplateDraft = async (req, res) => {
  try {
    const [actor, series] = await Promise.all([getActor(req), getSeries()]);
    const existingDraft = await ActiveQuestTemplateVersion.findOne({ seriesKey: 'active-quest', status: 'draft' });
    if (existingDraft) throw new Error(`Template version ${existingDraft.version} is already an editable draft.`);
    const source = await ActiveQuestTemplateVersion.findById(series.currentTemplateVersionId);
    if (!source) throw new Error('Current Active Quest template was not found.');
    await createActiveQuestTemplateDraft({
      series,
      actor,
      overrides: {
        policyText: source.policyText,
        rulesText: source.rulesText,
        categories: source.categories.map((category) => category.toObject()),
        contentBlocks: source.contentBlocks.map((block) => block.toObject()),
        rewardRequirements: source.rewardRequirements.toObject(),
        uiSettings: source.uiSettings.toObject(),
        summaryOfChanges: `Draft cloned from version ${source.version}.`
      }
    });
    return redirect(res, 'success', 'New template draft created from the current version.');
  } catch (error) {
    return redirectError(res, error);
  }
};

exports.saveActiveQuestTemplateDraft = async (req, res) => {
  try {
    const [actor, template] = await Promise.all([
      getActor(req),
      ActiveQuestTemplateVersion.findById(req.params.id)
    ]);
    if (!template) throw new Error('Active Quest template draft was not found.');
    const certificateTemplateVersionId = normalizeOptionalObjectId(
      req.body.certificateTemplateVersionId,
      'Certificate template version ID'
    );
    const categories = template.categories.map((category) => ({
      ...category.toObject(),
      badgeAssetUrl: String(req.body[`badgeAssetUrl_${category.key}`] || '').trim()
    }));
    const blocks = [
      { key: 'summary', title: 'Summary', markdown: String(req.body.summaryMarkdown || '').trim(), displayOrder: 1 },
      { key: 'faq', title: 'FAQ', markdown: String(req.body.faqMarkdown || '').trim(), displayOrder: 2 }
    ].filter((block) => block.markdown);
    const existingCertificate = template.rewardRequirements?.certificateTemplate || {};
    const certificateHeading = String(req.body.certificateHeading || '').trim();
    const certificateBodyText = String(req.body.certificateBodyText || '').trim();
    const certificateTemplate = certificateHeading && certificateBodyText
      ? {
          name: String(req.body.certificateName || 'Active Quest Certificate').trim().slice(0, 150),
          layoutKey: 'verified_achievement',
          assets: {
            ...(existingCertificate.assets || {}),
            backgroundImageUrl: String(req.body.certificateBackgroundImageUrl || '').trim(),
            organizerLogoUrl: String(req.body.certificateOrganizerLogoUrl || '').trim(),
            signatureImageUrl: String(req.body.certificateSignatureImageUrl || '').trim()
          },
          content: {
            heading: certificateHeading.slice(0, 120),
            bodyText: certificateBodyText.slice(0, 1000),
            footerText: String(req.body.certificateFooterText || '').trim().slice(0, 300),
            signatureName: String(req.body.certificateSignatureName || '').trim().slice(0, 120),
            signatureRole: String(req.body.certificateSignatureRole || 'Organiser').trim().slice(0, 120)
          },
          displayOptions: {
            showDistance: true,
            showFinishTime: false,
            showRank: false,
            showEventDate: true,
            showCertificateNumber: true,
            showQrCode: true,
            showOrganizerLogo: true,
            showEventLogo: true,
            showSponsorLogos: false
          },
          styleOptions: {
            ...(existingCertificate.styleOptions || {}),
            primaryColor: normalizeHexColor(req.body.certificatePrimaryColor, '#0F172A'),
            accentColor: normalizeHexColor(req.body.certificateAccentColor, '#FA9A4B'),
            secondaryAccentColor: normalizeHexColor(req.body.certificateSecondaryAccentColor, '#78C0E9'),
            fontFamily: 'Helvetica',
            pageSize: 'A4',
            orientation: 'landscape'
          }
        }
      : null;
    await updateActiveQuestTemplateDraft({
      template,
      actor,
      changes: {
        policyText: req.body.policyText,
        rulesText: req.body.rulesText,
        summaryOfChanges: req.body.summaryOfChanges,
        categories,
        contentBlocks: blocks,
        rewardRequirements: {
          ...template.rewardRequirements.toObject(),
          certificateTemplateVersionId,
          certificateTemplate
        }
      }
    });
    return redirect(res, 'success', `Template version ${template.version} draft saved.`);
  } catch (error) {
    return redirectError(res, error);
  }
};

function normalizeHexColor(value, fallback) {
  const safe = String(value || '').trim();
  return /^#[0-9a-fA-F]{6}$/.test(safe) ? safe : fallback;
}

exports.publishActiveQuestTemplate = async (req, res) => {
  try {
    const [actor, series, template] = await Promise.all([
      getActor(req),
      getSeries(),
      ActiveQuestTemplateVersion.findById(req.params.id)
    ]);
    if (!template) throw new Error('Active Quest template draft was not found.');
    await publishActiveQuestTemplate({ series, template, actor, effectiveAt: new Date() });
    return redirect(res, 'success', `Template version ${template.version} published and frozen.`);
  } catch (error) {
    return redirectError(res, error);
  }
};

exports.generateActiveQuestEdition = async (req, res) => {
  try {
    const actor = await getActor(req);
    const result = await generateActiveQuestEdition({
      seriesKey: 'active-quest',
      year: Number(req.body.year),
      month: Number(req.body.month),
      requestedBy: actor
    });
    const message = result.created
      ? `Draft generated. ${result.warnings.length} readiness warning${result.warnings.length === 1 ? '' : 's'} remain.`
      : 'Existing edition returned without overwriting its edits.';
    const query = new URLSearchParams({ type: 'success', msg: message, eventId: result.eventId });
    return res.redirect(`/admin/active-quest?${query.toString()}#editions`);
  } catch (error) {
    return redirectError(res, error);
  }
};

async function getActor(req) {
  const actor = await User.findById(req.session.userId).select('_id role adminTier');
  if (!actor) throw new Error('Admin account was not found.');
  return actor;
}

async function getSeries() {
  const series = await ActiveQuestSeries.findOne({ key: 'active-quest' });
  if (!series) throw new Error('Initialize Active Quest before changing it.');
  return series;
}

function normalizeOptionalObjectId(value, label) {
  const safe = String(value || '').trim();
  if (!safe) return null;
  if (!mongoose.Types.ObjectId.isValid(safe)) throw new Error(`${label} is invalid.`);
  return new mongoose.Types.ObjectId(safe);
}

function redirect(res, type, message) {
  const query = new URLSearchParams({ type, msg: String(message || '').slice(0, 300) });
  return res.redirect(`/admin/active-quest?${query.toString()}`);
}

function redirectError(res, error) {
  logger.error('Active Quest admin action failed:', { error: error?.message || String(error) });
  return redirect(res, 'error', error?.message || 'Active Quest action failed.');
}

function getMessage(query = {}) {
  const type = ['success', 'error', 'warning'].includes(String(query.type || '')) ? String(query.type) : '';
  const text = String(query.msg || '').trim().slice(0, 300);
  return type && text ? { type, text } : null;
}

function renderError(res, error, message) {
  logger.error(message, { error: error?.message || String(error) });
  return res.status(500).render('error', { title: 'Server Error', status: 500, message });
}
