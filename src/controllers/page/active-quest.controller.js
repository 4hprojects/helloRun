'use strict';

const Event = require('../../models/Event');
const ActiveQuestSeries = require('../../models/ActiveQuestSeries');
const { ACTIVE_QUEST_SERIES_KEY } = require('../../config/active-quest');
const { getPublicEventVisibilityQuery } = require('../../utils/public-event-visibility');
const { buildActiveQuestPublicPage } = require('../../services/active-quest-public.service');
const logger = require('../../utils/logger');

exports.getActiveQuestLanding = async (req, res) => renderActiveQuest(req, res, null);

exports.getActiveQuestYear = async (req, res) => {
  const year = Number(req.params.year);
  if (!Number.isInteger(year) || year < 2000 || year > 3000) {
    return res.status(404).render('error', { title: 'Archive not found', status: 404, message: 'That Active Quest archive year is not available.' });
  }
  return renderActiveQuest(req, res, year);
};

async function renderActiveQuest(req, res, selectedYear) {
  try {
    const now = new Date();
    const [series, events] = await Promise.all([
      ActiveQuestSeries.findOne({ key: ACTIVE_QUEST_SERIES_KEY }).lean(),
      Event.find({
        ...getPublicEventVisibilityQuery(now),
        seriesKey: ACTIVE_QUEST_SERIES_KEY
      })
        .select('title slug status seriesKey seriesYear seriesMonth seriesSnapshot registrationOpenAt registrationCloseAt eventStartAt eventEndAt raceDistances bannerImageUrl posterImageUrl digitalBadgeEnabled digitalCertificateEnabled leaderboardRecognitionEnabled isDeleted')
        .sort({ seriesYear: 1, seriesMonth: 1 })
        .lean()
    ]);
    const page = buildActiveQuestPublicPage({ series, events, selectedYear, now });
    const baseUrl = getRequestBaseUrl(req);
    const canonicalPath = selectedYear ? `/active-quest/${selectedYear}` : '/active-quest';
    const title = selectedYear ? `Active Quest ${selectedYear} Archive - HelloRun` : 'Active Quest Monthly Virtual Challenge - HelloRun';
    const description = selectedYear
      ? `Browse published Active Quest editions from ${selectedYear}.`
      : 'Choose a monthly 25K to 200K virtual distance goal. Submit proof, build approved distance, and finish at your pace.';
    return res.render('pages/active-quest', {
      title,
      seo: {
        description,
        canonicalUrl: `${baseUrl}${canonicalPath}`,
        ogTitle: title,
        ogType: 'website',
        ogImage: page.featured?.bannerImageUrl || `${baseUrl}/images/helloRun-icon.webp`,
        robots: 'index,follow'
      },
      page
    });
  } catch (error) {
    logger.error('Unable to render Active Quest public page:', error);
    return res.status(500).render('error', { title: 'Server Error', status: 500, message: 'Active Quest is temporarily unavailable.' });
  }
}

function getRequestBaseUrl(req) {
  const configured = String(process.env.APP_URL || '').trim().replace(/\/+$/, '');
  if (configured) return configured;
  const protocol = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim() || req.protocol || 'https';
  return `${protocol}://${req.get('host')}`;
}
