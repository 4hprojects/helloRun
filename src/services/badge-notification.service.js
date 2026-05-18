const User = require('../models/User');
const communicationService = require('./communication.service');

async function notifyBadgeEarned(mongoUserId, badge = {}) {
  if (!mongoUserId) return null;

  const badgeName = badge.badge_name_override || badge.name || badge.displayTitle || 'Achievement Badge';
  const userBadgeId = String(badge.user_badge_id || badge.userBadgeId || badge.id || '');
  const badgeUrl = buildBadgeVerificationUrl(userBadgeId);
  const notification = {
    userId: mongoUserId,
    type: 'badge_earned',
    title: 'Badge Earned',
    message: `You earned the ${badgeName} badge.`,
    href: badgeUrl || '/runner/profile#badges',
    metadata: {
      badgeDefinitionId: String(badge.badge_definition_id || badge.badgeDefinitionId || ''),
      userBadgeId,
      eventCoreId: String(badge.event_core_id || badge.eventCoreId || ''),
      mongoEventId: String(badge.mongo_event_id || badge.mongoEventId || ''),
      badgeUrl
    }
  };

  const payload = { notification };
  if (shouldSendBadgeEarnedEmail(badge) && badgeUrl) {
    const runner = await User.findById(mongoUserId).select('email firstName').lean();
    if (runner?.email) {
      payload.email = {
        to: runner.email,
        recipientUserId: mongoUserId,
        firstName: runner.firstName || 'Runner',
        badgeName,
        badgeDescription: badge.badge_description_override || badge.description || '',
        badgeType: badge.badge_type || badge.badgeType || '',
        badgeScope: badge.badge_scope || badge.badgeScope || '',
        badgeUrl,
        metadata: notification.metadata
      };
    }
  }

  return communicationService.notify('badge.earned', payload);
}

function shouldSendBadgeEarnedEmail(badge = {}) {
  const level = String(badge.email_notification_level || badge.emailNotificationLevel || 'none')
    .trim()
    .toLowerCase();
  if (level === 'all') return true;
  if (level !== 'major') return false;

  const badgeType = String(badge.badge_type || badge.badgeType || '').trim();
  const requirementType = String(badge.requirement_type || badge.requirementType || '').trim();
  return badgeType === 'challenge_finisher' ||
    badgeType === 'global_distance' ||
    requirementType === 'global_distance';
}

function buildBadgeVerificationUrl(userBadgeId) {
  const safeId = String(userBadgeId || '').trim();
  if (!safeId) return '';
  const baseUrl = String(process.env.APP_URL || '').trim().replace(/\/+$/, '');
  return baseUrl ? `${baseUrl}/badges/${safeId}` : `/badges/${safeId}`;
}

module.exports = {
  notifyBadgeEarned,
  shouldSendBadgeEarnedEmail,
  buildBadgeVerificationUrl
};
