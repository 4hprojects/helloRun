const ACTIVE_QUEST_SERIES_KEY = 'active-quest';
const ACTIVE_QUEST_TIMEZONE = 'Asia/Manila';

const ACTIVE_QUEST_FEATURE_FLAGS = Object.freeze([
  'activeQuestSeriesEnabled',
  'activeQuestDraftGenerationEnabled',
  'activeQuestSchedulerEnabled',
  'activeQuestAutoPublishEnabled'
]);

const ACTIVE_QUEST_CATEGORIES = Object.freeze([
  Object.freeze({ key: 'starter-quest', targetKm: 25, label: 'Starter Quest', displayOrder: 1 }),
  Object.freeze({ key: 'active-quest', targetKm: 50, label: 'Active Quest', displayOrder: 2 }),
  Object.freeze({ key: 'momentum-quest', targetKm: 75, label: 'Momentum Quest', displayOrder: 3 }),
  Object.freeze({ key: 'endurance-quest', targetKm: 100, label: 'Endurance Quest', displayOrder: 4 }),
  Object.freeze({ key: 'distance-quest', targetKm: 150, label: 'Distance Quest', displayOrder: 5 }),
  Object.freeze({ key: 'ultra-quest', targetKm: 200, label: 'Ultra Quest', displayOrder: 6 })
]);

const ACTIVE_QUEST_SCHEDULE_DEFAULTS = Object.freeze({
  registrationLeadDays: 7,
  draftPreparationDaysBeforeRegistration: 10,
  registrationCloseDay: 22,
  proofCloseDayNextMonth: 14,
  reviewTargetDays: 3
});

function buildDisabledActiveQuestFlags() {
  return Object.fromEntries(ACTIVE_QUEST_FEATURE_FLAGS.map((key) => [key, false]));
}

module.exports = {
  ACTIVE_QUEST_CATEGORIES,
  ACTIVE_QUEST_FEATURE_FLAGS,
  ACTIVE_QUEST_SCHEDULE_DEFAULTS,
  ACTIVE_QUEST_SERIES_KEY,
  ACTIVE_QUEST_TIMEZONE,
  buildDisabledActiveQuestFlags
};
