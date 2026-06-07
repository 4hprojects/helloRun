const AdSetting = require('../models/AdSetting');

const AD_SETTING_KEY = 'ads.global';
const DEFAULT_PUBLISHER_ID = 'ca-pub-4537208011192461';

const AD_PAGE_GROUPS = Object.freeze({
  home: {
    label: 'Home',
    placements: {
      after_features: 'After core features',
      before_cta: 'Before final CTA'
    }
  },
  events: {
    label: 'Events Listing',
    placements: {
      after_results_meta: 'After filters and results summary',
      in_feed: 'In event card feed'
    }
  },
  eventDetails: {
    label: 'Event Details',
    placements: {
      after_how_it_works: 'After how it works',
      sidebar: 'Desktop sidebar'
    }
  },
  leaderboard: {
    label: 'Leaderboard Discovery',
    placements: {
      after_results_meta: 'After filters and results summary',
      in_feed: 'In leaderboard card feed'
    }
  },
  blogListing: {
    label: 'Blog Listing',
    placements: {
      after_results_meta: 'After filters and results summary',
      in_feed: 'In post card feed'
    }
  },
  blogPost: {
    label: 'Blog Post',
    placements: {
      after_intro: 'After intro or cover image',
      in_article: 'In article body',
      before_related: 'Before related posts'
    }
  },
  shopDiscovery: {
    label: 'Shop Discovery',
    placements: {
      after_results_meta: 'After filters and results summary'
    }
  }
});

const DEFAULT_AD_SETTINGS = Object.freeze({
  key: AD_SETTING_KEY,
  enabled: true,
  scriptEnabled: true,
  publisherId: DEFAULT_PUBLISHER_ID,
  pageGroups: buildDefaultPageGroups()
});

async function getAdSettings() {
  const setting = await AdSetting.findOneAndUpdate(
    { key: AD_SETTING_KEY },
    { $setOnInsert: DEFAULT_AD_SETTINGS },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean();

  return normalizeStoredAdSettings(setting);
}

async function updateAdSettings(input = {}, actor = null) {
  const values = normalizeAdSettings(input);
  const setting = await AdSetting.findOneAndUpdate(
    { key: AD_SETTING_KEY },
    {
      $set: {
        ...values,
        updatedBy: actor || null
      }
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean();

  return normalizeStoredAdSettings(setting);
}

function normalizeAdSettings(input = {}) {
  const publisherId = normalizePublisherId(input.publisherId || DEFAULT_PUBLISHER_ID);
  return {
    enabled: normalizeBoolean(input.enabled),
    scriptEnabled: normalizeBoolean(input.scriptEnabled),
    publisherId,
    pageGroups: normalizePageGroups(input.pageGroups || input)
  };
}

function normalizeStoredAdSettings(setting = {}) {
  const merged = {
    ...DEFAULT_AD_SETTINGS,
    ...setting
  };

  return {
    ...merged,
    enabled: merged.enabled !== false,
    scriptEnabled: merged.scriptEnabled !== false,
    publisherId: normalizePublisherId(merged.publisherId || DEFAULT_PUBLISHER_ID),
    pageGroups: normalizePageGroups(merged.pageGroups || {})
  };
}

function canRenderAdPlacement(settings, groupKey, placementKey) {
  if (!settings || settings.enabled === false) return false;
  const group = settings.pageGroups?.[groupKey];
  const placement = group?.placements?.[placementKey];
  return Boolean(group?.enabled && placement?.enabled && placement?.slotId);
}

function shouldLoadAdScript(settings, groupKey) {
  if (!settings || settings.enabled === false || settings.scriptEnabled === false) return false;
  return Boolean(groupKey && settings.pageGroups?.[groupKey]?.enabled);
}

function resolveAdPageGroup(pathname = '') {
  const path = String(pathname || '').split('?')[0].replace(/\/+$/, '') || '/';
  const segments = path.split('/').filter(Boolean);

  if (path === '/') return 'home';
  if (path === '/events') return 'events';
  if (path === '/leaderboard') return 'leaderboard';
  if (path === '/shop') return 'shopDiscovery';
  if (segments[0] === 'events' && segments.length === 3 && segments[2] === 'shop') return 'shopDiscovery';
  if (segments[0] === 'events' && segments.length === 2) return 'eventDetails';
  if (path === '/blog') return 'blogListing';
  if (segments[0] === 'blog' && ['category', 'tag'].includes(segments[1]) && segments.length === 3) return 'blogListing';
  if (segments[0] === 'blog' && segments.length === 2) return 'blogPost';
  return '';
}

function buildDefaultPageGroups() {
  return Object.keys(AD_PAGE_GROUPS).reduce((groups, groupKey) => {
    groups[groupKey] = {
      enabled: groupKey !== 'shopDiscovery',
      placements: Object.keys(AD_PAGE_GROUPS[groupKey].placements).reduce((placements, placementKey) => {
        placements[placementKey] = {
          enabled: true,
          slotId: ''
        };
        return placements;
      }, {})
    };
    return groups;
  }, {});
}

function normalizePageGroups(input = {}) {
  const defaults = buildDefaultPageGroups();
  return Object.keys(AD_PAGE_GROUPS).reduce((groups, groupKey) => {
    const sourceGroup = input[groupKey] || {};
    groups[groupKey] = {
      enabled: hasOwnValue(sourceGroup, 'enabled')
        ? normalizeBoolean(sourceGroup.enabled)
        : normalizeBoolean(input[`group_${groupKey}_enabled`]),
      placements: {}
    };

    Object.keys(AD_PAGE_GROUPS[groupKey].placements).forEach((placementKey) => {
      const sourcePlacement = sourceGroup.placements?.[placementKey] || {};
      const flatEnabledKey = `placement_${groupKey}_${placementKey}_enabled`;
      const flatSlotKey = `slot_${groupKey}_${placementKey}`;
      groups[groupKey].placements[placementKey] = {
        enabled: hasOwnValue(sourcePlacement, 'enabled')
          ? normalizeBoolean(sourcePlacement.enabled)
          : normalizeBoolean(input[flatEnabledKey]),
        slotId: normalizeSlotId(sourcePlacement.slotId ?? input[flatSlotKey] ?? defaults[groupKey].placements[placementKey].slotId)
      };
    });

    return groups;
  }, {});
}

function normalizePublisherId(value) {
  const normalized = String(value || '').trim();
  return /^ca-pub-\d{10,24}$/.test(normalized) ? normalized : DEFAULT_PUBLISHER_ID;
}

function normalizeSlotId(value) {
  return String(value || '').replace(/\D/g, '').slice(0, 32);
}

function normalizeBoolean(value) {
  return value === true || value === 'true' || value === '1' || value === 'on';
}

function hasOwnValue(source, key) {
  return Object.prototype.hasOwnProperty.call(source || {}, key);
}

module.exports = {
  AD_PAGE_GROUPS,
  AD_SETTING_KEY,
  DEFAULT_AD_SETTINGS,
  DEFAULT_PUBLISHER_ID,
  canRenderAdPlacement,
  getAdSettings,
  normalizeAdSettings,
  normalizePublisherId,
  normalizeSlotId,
  resolveAdPageGroup,
  shouldLoadAdScript,
  updateAdSettings
};
