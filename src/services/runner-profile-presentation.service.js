'use strict';

const NOTIFICATION_OPTIONS = Object.freeze([
  { key: 'result.approved', label: 'Run result approved', description: 'Email when an organizer approves your result.' },
  { key: 'result.rejected', label: 'Run result needs correction', description: 'Email when a result needs attention or resubmission.' },
  { key: 'certificate.issued', label: 'Certificate ready', description: 'Email when your finisher certificate is available.' },
  { key: 'badge.earned', label: 'Badge earned', description: 'Email when you earn an achievement badge.' },
  { key: 'organiser.payment_reminder', label: 'Payment reminders', description: 'Email payment reminders from event organizers.' },
  { key: 'event.promotion', label: 'Event promotions', description: 'Email invitations and promotions for upcoming events.' }
]);

const BADGE_TYPE_ICONS = Object.freeze({
  participant: 'user-check',
  finisher: 'trophy',
  distance_finisher: 'medal',
  mode_finisher: 'zap',
  challenge_progress: 'trending-up',
  challenge_finisher: 'award',
  category_winner: 'crown',
  top_rank: 'star',
  distance_winner: 'flag',
  mode_winner: 'shield-check'
});

const MISSING_FIELD_TARGETS = Object.freeze({
  'First Name': 'identity',
  'Last Name': 'identity',
  'Date of Birth': 'identity',
  Gender: 'identity',
  Mobile: 'contact',
  Country: 'location',
  Timezone: 'location',
  'Emergency Contact Name': 'emergency',
  'Emergency Contact Number': 'emergency'
});

function buildRunnerProfilePresentation(options = {}) {
  const user = options.user || {};
  const profileData = options.profileData || {};
  const completeness = options.profileCompleteness || { percent: 0, completedCount: 0, requiredCount: 0, missingFields: [] };
  const missingFields = Array.isArray(completeness.missingFields) ? completeness.missingFields : [];
  const firstMissingTarget = MISSING_FIELD_TARGETS[missingFields[0]] || 'identity';
  const displayName = String(profileData.displayName || user.displayName || '').trim()
    || String(profileData.firstName || user.firstName || '').trim()
    || 'Runner';
  const initials = getInitials(displayName);
  const optOut = new Set(Array.isArray(user.notificationPreferences?.emailOptOut)
    ? user.notificationPreferences.emailOptOut.map(String)
    : []);
  const badges = Array.isArray(options.badges) ? options.badges.map((badge) => normalizeBadge(badge, options.certifiedSubmissionIds)) : [];
  const progress = Array.isArray(options.badgeProgress) ? options.badgeProgress.map(normalizeProgress) : [];
  const featuredBadge = badges.find((badge) => badge.isFeatured) || null;
  const unfeaturedBadges = badges.filter((badge) => !badge.isFeatured);

  return {
    identity: {
      displayName,
      initials,
      avatarUrl: String(user.avatarUrl || '').trim(),
      email: String(user.email || '').trim()
    },
    dateOfBirthMasked: maskDateOfBirth(profileData.dateOfBirth),
    mobileMasked: maskContactNumber(profileData.mobile),
    emergencyContactNumberMasked: maskContactNumber(profileData.emergencyContactNumber),
    completion: {
      percent: Number(completeness.percent || 0),
      completedCount: Number(completeness.completedCount || 0),
      requiredCount: Number(completeness.requiredCount || 0),
      missingFields,
      isComplete: missingFields.length === 0,
      recoveryHref: `#${firstMissingTarget}`,
      recoveryLabel: `Complete ${formatTargetLabel(firstMissingTarget)}`
    },
    navigation: [
      { href: '#identity', label: 'Personal details', icon: 'contact' },
      { href: '#notifications', label: 'Preferences', icon: 'bell' },
      { href: '#integrations', label: 'Connections', icon: 'plug' },
      { href: '#account', label: 'Security', icon: 'shield-check' },
      { href: '#badges', label: 'Achievements', icon: 'award' }
    ],
    notificationOptions: NOTIFICATION_OPTIONS.map((item) => ({ ...item, enabled: !optOut.has(item.key) })),
    connection: {
      connected: Boolean(options.stravaConnection?.connected),
      athleteName: String(options.stravaConnection?.athleteName || '').trim(),
      athleteId: String(options.stravaConnection?.stravaAthleteId || '').trim()
    },
    account: {
      authProviderLabel: user.authProvider === 'google' ? 'Google' : 'Email and password',
      googleLinked: Boolean(user.googleId),
      localPasswordSet: Boolean(user.passwordHash),
      passwordActionLabel: user.passwordHash ? 'Change Password' : 'Set Password'
    },
    achievements: {
      earnedCount: badges.length,
      points: Number(options.badgePointsSummary?.totalPoints || 0),
      featuredBadge,
      previewProgress: progress.slice(0, 3),
      remainingProgress: progress.slice(3),
      previewBadges: unfeaturedBadges.slice(0, 3),
      remainingBadges: unfeaturedBadges.slice(3),
      hasMore: progress.length > 3 || unfeaturedBadges.length > 3,
      publicCollectionPath: String(options.publicBadgeCollectionPath || '')
    }
  };
}

function normalizeBadge(badge = {}, certifiedSubmissionIds) {
  const badgeType = String(badge.badgeType || 'achievement');
  const submissionId = String(badge.mongoSubmissionId || '');
  return {
    ...badge,
    badgeType,
    icon: BADGE_TYPE_ICONS[badgeType] || 'award',
    typeLabel: badgeType.replace(/_/g, ' '),
    shareUrl: badge.userBadgeId ? `/badges/${badge.userBadgeId}` : '',
    certificateUrl: submissionId && certifiedSubmissionIds?.has(submissionId)
      ? `/my-submissions/${submissionId}/certificate`
      : ''
  };
}

function normalizeProgress(item = {}) {
  const exactPercent = Math.max(0, Number(item.progressPercent || 0));
  return {
    ...item,
    exactPercent,
    barPercent: Math.min(100, exactPercent),
    percentLabel: Number(exactPercent.toFixed(1))
  };
}

function getInitials(displayName) {
  const parts = String(displayName || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'R';
  return (parts.length > 1 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : parts[0][0]).toUpperCase();
}

function formatTargetLabel(target) {
  const labels = { identity: 'identity details', contact: 'contact details', location: 'location', emergency: 'emergency contact' };
  return labels[target] || 'profile';
}

function maskContactNumber(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return 'Not set';
  const visible = digits.slice(-4);
  return `•••• •••• ${visible}`;
}

function maskDateOfBirth(value) {
  if (!value) return 'Not set';

  const normalized = String(value).trim();
  const yearFirstMatch = normalized.match(/^(\d{4})[-/]\d{1,2}[-/]\d{1,2}/);
  if (yearFirstMatch) return `••/••/${yearFirstMatch[1]}`;

  const yearLastMatch = normalized.match(/\d{1,2}[-/]\d{1,2}[-/](\d{4})$/);
  if (yearLastMatch) return `••/••/${yearLastMatch[1]}`;

  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? 'Protected' : `••/••/${parsed.getUTCFullYear()}`;
}

module.exports = {
  NOTIFICATION_OPTIONS,
  buildRunnerProfilePresentation
};
