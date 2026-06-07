const {
  canRenderAdPlacement,
  getAdSettings,
  resolveAdPageGroup,
  shouldLoadAdScript
} = require('../services/ad-setting.service');
const logger = require('../utils/logger');

async function populateAdLocals(req, res, next) {
  res.locals.ads = createEmptyAdLocals();

  if (!shouldEvaluateAds(req)) {
    return next();
  }

  const pageGroup = resolveAdPageGroup(req.path);
  if (!pageGroup) {
    return next();
  }

  try {
    const settings = await getAdSettings();
    const renderScript = shouldLoadAdScript(settings, pageGroup);
    res.locals.ads = {
      settings,
      pageGroup,
      publisherId: settings.publisherId,
      renderScript,
      canRender(groupKey, placementKey) {
        return canRenderAdPlacement(settings, groupKey, placementKey);
      },
      getSlot(groupKey, placementKey) {
        return settings.pageGroups?.[groupKey]?.placements?.[placementKey]?.slotId || '';
      }
    };
  } catch (error) {
    logger.error('Error in populateAdLocals:', error);
  }

  return next();
}

function shouldEvaluateAds(req) {
  const method = String(req.method || '').toUpperCase();
  if (!['GET', 'HEAD'].includes(method)) return false;
  const accept = String(req.get('accept') || '').toLowerCase();
  if (accept.includes('application/json') && !accept.includes('text/html')) return false;
  return true;
}

function createEmptyAdLocals() {
  return {
    settings: null,
    pageGroup: '',
    publisherId: '',
    renderScript: false,
    canRender: () => false,
    getSlot: () => ''
  };
}

module.exports = {
  populateAdLocals
};
