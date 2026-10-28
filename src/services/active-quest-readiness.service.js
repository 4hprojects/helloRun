const { ACTIVE_QUEST_CATEGORIES, ACTIVE_QUEST_SERIES_KEY, ACTIVE_QUEST_TIMEZONE } = require('../config/active-quest');
const { getPublishReadinessErrors } = require('./event-form.service');
const { isValidActiveQuestCertificateTemplate } = require('./active-quest-generator.service');

function getActiveQuestPublicationErrors(event) {
  if (!event || event.seriesKey !== ACTIVE_QUEST_SERIES_KEY) return [];
  const errors = [];
  const expectedTargets = ACTIVE_QUEST_CATEGORIES.map((category) => category.targetKm);
  const actualTargets = (event.raceCategories || []).map((category) => Number(category.distanceKm));
  const snapshotCategories = event.seriesSnapshot?.categories || [];
  const schedule = event.seriesSchedule;

  if (!event.seriesYear || !event.seriesMonth || !event.seriesTemplateVersionId || !event.generatedFromKey) {
    errors.push('Series identity and template provenance are incomplete.');
  }
  if (!event.seriesSnapshot || !schedule) errors.push('Frozen template and schedule snapshots are required.');
  if (schedule?.timezone !== ACTIVE_QUEST_TIMEZONE || schedule?.boundaryMode !== 'half_open') {
    errors.push('Active Quest schedule must use half-open Asia/Manila boundaries.');
  }
  if (JSON.stringify(actualTargets) !== JSON.stringify(expectedTargets)) {
    errors.push('Active Quest requires the exact 25K, 50K, 75K, 100K, 150K, and 200K categories.');
  }
  if (event.status === 'published') errors.push('Published editions cannot be re-approved.');
  if (event.autoEmailPromotionEnabled === true) errors.push('Automatic promotion must remain disabled before publication.');
  if (event.digitalBadgeEnabled !== true) errors.push('Category badges are not enabled.');
  if (snapshotCategories.length !== 6 || snapshotCategories.some((category) => !String(category.badgeAssetUrl || '').trim())) {
    errors.push('All six category badge assets must be mapped.');
  }
  if (
    event.digitalCertificateEnabled !== true ||
    !isValidActiveQuestCertificateTemplate(event.seriesSnapshot?.rewardRequirements?.certificateTemplate)
  ) {
    errors.push('A validated reusable certificate template design is required.');
  }
  if (!event.bannerImageUrl || !event.posterImageUrl) errors.push('Series banner and poster assets are required.');
  for (const dateText of Object.values(schedule?.display || {})) {
    if (dateText && !String(event.eventDetailsMarkdown || '').includes(dateText)) {
      errors.push(`Public content is missing the structured date ${dateText}.`);
    }
  }
  errors.push(...getPublishReadinessErrors(event));
  return Array.from(new Set(errors));
}

module.exports = {
  getActiveQuestPublicationErrors
};
