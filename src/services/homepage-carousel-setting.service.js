const HomepageCarouselSetting = require('../models/HomepageCarouselSetting');

const HOMEPAGE_CAROUSEL_SETTING_KEY = 'homepage.carousel';
const DEFAULT_HOMEPAGE_CAROUSEL_SETTINGS = Object.freeze({
  key: HOMEPAGE_CAROUSEL_SETTING_KEY,
  enabled: true,
  loopEnabled: true,
  maxItems: 8
});

async function getHomepageCarouselSettings() {
  const setting = await HomepageCarouselSetting.findOneAndUpdate(
    { key: HOMEPAGE_CAROUSEL_SETTING_KEY },
    { $setOnInsert: DEFAULT_HOMEPAGE_CAROUSEL_SETTINGS },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean();

  return normalizeStoredSettings(setting);
}

async function updateHomepageCarouselSettings(input = {}, actor = null) {
  const values = normalizeHomepageCarouselSettings(input);
  const setting = await HomepageCarouselSetting.findOneAndUpdate(
    { key: HOMEPAGE_CAROUSEL_SETTING_KEY },
    {
      $set: {
        ...values,
        updatedBy: actor || null
      }
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean();

  return normalizeStoredSettings(setting);
}

function normalizeHomepageCarouselSettings(input = {}) {
  return {
    enabled: normalizeBoolean(input.enabled),
    loopEnabled: normalizeBoolean(input.loopEnabled),
    maxItems: normalizeInt(input.maxItems, 1, 12, DEFAULT_HOMEPAGE_CAROUSEL_SETTINGS.maxItems)
  };
}

function normalizeStoredSettings(setting = {}) {
  return {
    ...DEFAULT_HOMEPAGE_CAROUSEL_SETTINGS,
    ...setting,
    enabled: setting.enabled !== false,
    loopEnabled: setting.loopEnabled !== false,
    maxItems: normalizeInt(setting.maxItems, 1, 12, DEFAULT_HOMEPAGE_CAROUSEL_SETTINGS.maxItems)
  };
}

function normalizeBoolean(value) {
  return value === true || value === 'true' || value === '1' || value === 'on';
}

function normalizeInt(value, min, max, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

module.exports = {
  DEFAULT_HOMEPAGE_CAROUSEL_SETTINGS,
  HOMEPAGE_CAROUSEL_SETTING_KEY,
  getHomepageCarouselSettings,
  normalizeHomepageCarouselSettings,
  updateHomepageCarouselSettings
};
