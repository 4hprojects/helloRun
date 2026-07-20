'use strict';

const {
  crypto,
  Event,
  User,
  Registration,
  Submission,
  OrganiserApplication,
  Blog,
  BlogLike,
  communicationService,
  registerBlogView,
  getRunnerRegistrations,
  listPolicyDocuments,
  uploadService,
  getCountries,
  isValidCountryCode,
  normalizeCountryCode,
  getCountryName,
  BLOG_CATEGORIES,
  renderWaiverTemplate,
  assertRunDateNotFuture,
  parseRunDateOnly,
  isRunDateAlignedWithEvent,
  canRunnerSubmitPaymentProof,
  getInitialRegistrationPaymentStatus,
  createSubmission,
  editRejectedSubmissionMetadata,
  resubmitSubmission,
  getRunnerSubmissions,
  getRunnerPerformanceSnapshot,
  PERSONAL_RECORD_REGISTRATION_ID,
  AccumulatedActivitySubmission,
  createAccumulatedActivitySubmission,
  getAccumulatedActivitiesForRegistrations,
  buildAccumulatedProgress,
  acquireSubmissionIdempotencyLock,
  buildPaymentProofIdempotencyKey,
  buildProofSubmissionIdempotencyKey,
  resolveAccumulatedTargetDistanceKm,
  evaluateRegistrationAchievementsInBackground,
  getRunnerEarnedBadges,
  loadPublicBadgeVerification,
  getLeaderboardDiscoveryData,
  getEventLeaderboard,
  getMyStanding,
  buildPublicEventSeo,
  buildPublicEventView,
  renderEventDetailsContent,
  getCustomizedRegistrationOptions,
  getRegistrationPackageOptions,
  getRaceCategoryOptions,
  resolveRegistrationPrice,
  getEventBadgesByMongoEventId,
  listProductsByMongoEventId,
  recalculateOrderTotals,
  buildPublicEventListPage,
  listHomepagePromotedEvents,
  getEventCardDisplayState,
  getHomepageCarouselSettings,
  getPostgresClient,
  getPublicEventVisibilityQuery,
  logger,
  recordSyncFailureInBackground,
  recordCriticalAuditEventInBackground,
  countries,
  getAppBaseUrl,
  getSitemapBaseUrl,
  escapeXml,
  buildRegistrationOrderNote,
  formatDateOnly,
  getPublishedEventBySlug,
  renderEventNotFound
} = require('./_shared');

exports.getEventBadges = async (req, res) => {
  try {
    const event = await getPublishedEventBySlug(req.params.slug);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }

    const badges = await getEventBadgesByMongoEventId(event._id);
    return res.json({ success: true, badges });
  } catch (error) {
    logger.error('Event badges load error:', error);
    return res.status(500).json({ success: false, message: 'Unable to load event badges.' });
  }
};

exports.getPublicBadgePage = async (req, res) => {
  try {
    const badge = await loadPublicBadgeVerification(req.params.userBadgeId);
    if (!badge) {
      return res.status(404).render('error', {
        title: 'Badge Not Found - HelloRun',
        status: 404,
        message: 'This badge could not be verified. It may have been revoked or the link may be incorrect.'
      });
    }

    const baseUrl = getSitemapBaseUrl(req);
    const badgeUrl = `${baseUrl}/badges/${badge.userBadgeId}`;
    const badgeShareImageUrl = `${baseUrl}/badges/${badge.userBadgeId}/share-image.svg`;
    const openBadgeUrl = `${baseUrl}/badges/${badge.userBadgeId}/open-badge.json`;
    const shareText = `${badge.runnerName} earned the ${badge.name} badge on HelloRun.`;
    const openBadgeMetadata = buildOpenBadgeMetadata(badge, { baseUrl, badgeUrl, badgeShareImageUrl, openBadgeUrl });
    return res.render('pages/badge-verification', {
      title: `${badge.name} - Verified Badge - HelloRun`,
      additionalCSS: ['/css/badge-verification.css'],
      seo: {
        description: `${badge.runnerName} earned the ${badge.name} badge on HelloRun.`,
        canonicalUrl: badgeUrl,
        ogType: 'article',
        ogTitle: `${badge.name} - Verified HelloRun Badge`,
        twitterTitle: `${badge.name} - Verified HelloRun Badge`,
        ogImage: badgeShareImageUrl
      },
      badge,
      badgeUrl,
      openBadgeUrl,
      openBadgeMetadata,
      shareText,
      facebookShareUrl: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(badgeUrl)}`,
      xShareUrl: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(badgeUrl)}`,
      linkedInShareUrl: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(badgeUrl)}`,
      mailShareUrl: `mailto:?subject=${encodeURIComponent(`${badge.name} - Verified HelloRun Badge`)}&body=${encodeURIComponent(`${shareText}\n\n${badgeUrl}`)}`,
      formatDateOnly
    });
  } catch (error) {
    logger.error('Public badge verification page error:', error);
    return res.status(500).render('error', {
      title: 'Server Error',
      status: 500,
      message: 'Unable to verify this badge right now.'
    });
  }
};

exports.getPublicOpenBadgeMetadata = async (req, res) => {
  try {
    const badge = await loadPublicBadgeVerification(req.params.userBadgeId);
    if (!badge) {
      return res.status(404).json({ success: false, message: 'Badge not found or not verified.' });
    }

    const baseUrl = getSitemapBaseUrl(req);
    const badgeUrl = `${baseUrl}/badges/${badge.userBadgeId}`;
    const badgeShareImageUrl = `${baseUrl}/badges/${badge.userBadgeId}/share-image.svg`;
    const openBadgeUrl = `${baseUrl}/badges/${badge.userBadgeId}/open-badge.json`;
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.json(buildOpenBadgeMetadata(badge, { baseUrl, badgeUrl, badgeShareImageUrl, openBadgeUrl }));
  } catch (error) {
    logger.error('Public Open Badge metadata error:', error);
    return res.status(500).json({ success: false, message: 'Unable to load badge metadata.' });
  }
};

exports.getPublicBadgeShareImage = async (req, res) => {
  try {
    const badge = await loadPublicBadgeVerification(req.params.userBadgeId);
    if (!badge) {
      return res.status(404).type('image/svg+xml').send(buildShareImageSvg({
        title: 'Badge Not Found',
        subtitle: 'This HelloRun badge could not be verified.',
        kicker: 'HelloRun',
        statLabel: 'Verification',
        statValue: 'Unavailable'
      }));
    }

    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.type('image/svg+xml').send(buildShareImageSvg({
      title: badge.name,
      subtitle: `${badge.runnerName} earned this verified HelloRun badge.`,
      kicker: 'Verified Badge',
      statLabel: badge.eventTitle ? 'Event' : 'Scope',
      statValue: badge.eventTitle || formatBadgeScopeLabel(badge.badgeScope),
      footer: `Verification ID ${badge.verificationCode}`
    }));
  } catch (error) {
    logger.error('Public badge share image error:', error);
    return res.status(500).type('image/svg+xml').send(buildShareImageSvg({
      title: 'HelloRun Badge',
      subtitle: 'Verified achievement preview is unavailable right now.',
      kicker: 'HelloRun',
      statLabel: 'Status',
      statValue: 'Unavailable'
    }));
  }
};

exports.getPublicBadgeVerification = async (req, res) => {
  try {
    const badge = await loadPublicBadgeVerification(req.params.userBadgeId);
    if (!badge) {
      return res.status(404).json({ success: false, message: 'Badge not found or not verified.' });
    }
    return res.json({
      success: true,
      badge: {
        userBadgeId: badge.userBadgeId,
        badgeCode: badge.badgeCode,
        name: badge.name,
        description: badge.description,
        badgeScope: badge.badgeScope,
        badgeType: badge.badgeType,
        requirementType: badge.requirementType,
        runnerName: badge.runnerName,
        eventTitle: badge.eventTitle,
        eventSlug: badge.eventSlug,
        earnedAt: badge.earnedAt,
        verificationStatus: badge.verificationStatus,
        verificationCode: badge.verificationCode,
        evidenceLabel: badge.evidenceLabel
      }
    });
  } catch (error) {
    logger.error('Public badge verification API error:', error);
    return res.status(500).json({ success: false, message: 'Unable to verify badge.' });
  }
};

exports.getPublicRunnerBadgeCollection = async (req, res) => {
  try {
    const publicUserId = String(req.params.userId || '').trim();
    const runner = await User.findOne({
      userId: publicUserId,
      role: 'runner'
    }).select('_id userId firstName lastName createdAt').lean();

    if (!runner) {
      return res.status(404).render('error', {
        title: 'Badge Collection Not Found - HelloRun',
        status: 404,
        message: 'This public badge collection could not be found.'
      });
    }

    const badges = await getRunnerEarnedBadges(runner._id, { limit: 100 });
    const totalPoints = badges.reduce((sum, b) => sum + (b.points || 0), 0);
    const baseUrl = getSitemapBaseUrl(req);
    const collectionUrl = `${baseUrl}/runners/${encodeURIComponent(runner.userId)}/badges`;
    const collectionShareImageUrl = `${baseUrl}/runners/${encodeURIComponent(runner.userId)}/badges/share-image.svg`;
    const runnerName = [runner.firstName, runner.lastName].filter(Boolean).join(' ') || 'HelloRun Runner';
    const featuredBadge = badges.find((badge) => badge.isFeatured) || badges[0] || null;
    const badgesByScope = buildBadgeCollectionScopeSummary(badges);
    const hasBadges = badges.length > 0;
    const collectionDescription = hasBadges
      ? `${runnerName}'s public collection of verified HelloRun badges.`
      : `${runnerName}'s public HelloRun badge collection.`;
    const collectionSeoTitle = hasBadges
      ? `${runnerName} - Verified HelloRun Badge Collection`
      : `${runnerName} - Public HelloRun Badge Collection`;

    return res.render('pages/runner-badge-collection', {
      title: `${runnerName} - Badge Collection - HelloRun`,
      additionalCSS: ['/css/badge-verification.css'],
      seo: {
        description: collectionDescription,
        canonicalUrl: collectionUrl,
        ogType: 'profile',
        ogTitle: collectionSeoTitle,
        twitterTitle: collectionSeoTitle,
        ogImage: collectionShareImageUrl
      },
      runner: {
        userId: runner.userId,
        name: runnerName,
        joinedAt: runner.createdAt || null
      },
      badges,
      totalPoints,
      featuredBadge,
      badgesByScope,
      collectionUrl,
      shareText: collectionDescription,
      facebookShareUrl: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(collectionUrl)}`,
      xShareUrl: `https://twitter.com/intent/tweet?text=${encodeURIComponent(collectionDescription)}&url=${encodeURIComponent(collectionUrl)}`,
      linkedInShareUrl: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(collectionUrl)}`,
      mailShareUrl: `mailto:?subject=${encodeURIComponent(`${runnerName} - HelloRun Badge Collection`)}&body=${encodeURIComponent(`${collectionDescription}\n\n${collectionUrl}`)}`,
      formatDateOnly
    });
  } catch (error) {
    logger.error('Public runner badge collection error:', error);
    return res.status(500).render('error', {
      title: 'Server Error',
      status: 500,
      message: 'Unable to load this badge collection right now.'
    });
  }
};

exports.getPublicRunnerProfile = async (req, res) => {
  try {
    const publicUserId = String(req.params.userId || '').trim();
    const runner = await User.findOne({
      userId: publicUserId,
      role: 'runner'
    }).select('_id userId firstName lastName avatarUrl runningGroup createdAt').lean();

    if (!runner) {
      return res.status(404).render('error', {
        title: 'Runner Not Found - HelloRun',
        status: 404,
        message: 'This runner profile could not be found.'
      });
    }

    const runnerName = [runner.firstName, runner.lastName].filter(Boolean).join(' ') || 'HelloRun Runner';
    const baseUrl = getSitemapBaseUrl(req);
    const profileUrl = `${baseUrl}/runners/${encodeURIComponent(runner.userId)}`;

    const [snapshot, recentBadges] = await Promise.all([
      getRunnerPerformanceSnapshot(runner._id, { recentLimit: 3 }).catch(() => null),
      getRunnerEarnedBadges(runner._id, { limit: 6 }).catch(() => [])
    ]);

    return res.render('pages/runner-profile', {
      title: `${runnerName} - Runner Profile - HelloRun`,
      seo: {
        description: `${runnerName}'s running profile on HelloRun.`,
        canonicalUrl: profileUrl,
        ogType: 'profile',
        ogTitle: `${runnerName} - HelloRun Runner Profile`,
        ogImage: runner.avatarUrl || ''
      },
      runner: {
        userId: runner.userId,
        name: runnerName,
        avatarUrl: runner.avatarUrl || '',
        runningGroup: runner.runningGroup || '',
        joinedAt: runner.createdAt || null,
        badgesHref: `/runners/${encodeURIComponent(runner.userId)}/badges`
      },
      metrics: snapshot ? {
        totalDistanceKm: snapshot.metrics?.totalDistanceKm || 0,
        completedEvents: snapshot.metrics?.completedEvents || 0,
        fastestElapsedLabel: snapshot.metrics?.fastestElapsedLabel || '',
        certificatesCount: snapshot.counts?.certificates || 0
      } : null,
      recentBadges,
      profileUrl,
      shareText: `Check out ${runnerName}'s running profile on HelloRun!`,
      facebookShareUrl: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(profileUrl)}`,
      xShareUrl: `https://twitter.com/intent/tweet?text=${encodeURIComponent(`Check out ${runnerName}'s running profile on HelloRun!`)}&url=${encodeURIComponent(profileUrl)}`,
      linkedInShareUrl: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(profileUrl)}`
    });
  } catch (error) {
    logger.error('Public runner profile error:', error);
    return res.status(500).render('error', {
      title: 'Server Error',
      status: 500,
      message: 'Unable to load this runner profile right now.'
    });
  }
};

exports.getPublicRunnerBadgeCollectionShareImage = async (req, res) => {
  try {
    const publicUserId = String(req.params.userId || '').trim();
    const runner = await User.findOne({
      userId: publicUserId,
      role: 'runner'
    }).select('_id userId firstName lastName').lean();

    if (!runner) {
      return res.status(404).type('image/svg+xml').send(buildShareImageSvg({
        title: 'Collection Not Found',
        subtitle: 'This HelloRun badge collection could not be found.',
        kicker: 'HelloRun',
        statLabel: 'Collection',
        statValue: 'Unavailable'
      }));
    }

    const badges = await getRunnerEarnedBadges(runner._id, { limit: 100 });
    const runnerName = [runner.firstName, runner.lastName].filter(Boolean).join(' ') || 'HelloRun Runner';
    const featuredBadge = badges.find((badge) => badge.isFeatured) || badges[0] || null;

    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.type('image/svg+xml').send(buildShareImageSvg({
      title: runnerName,
      subtitle: featuredBadge
        ? `Featured badge: ${featuredBadge.name}`
        : 'Public HelloRun badge collection.',
      kicker: featuredBadge ? 'Verified Collection' : 'Public Collection',
      statLabel: 'Badges',
      statValue: String(badges.length),
      footer: `Runner ID ${runner.userId}`
    }));
  } catch (error) {
    logger.error('Public runner badge collection share image error:', error);
    return res.status(500).type('image/svg+xml').send(buildShareImageSvg({
      title: 'HelloRun Collection',
      subtitle: 'Verified collection preview is unavailable right now.',
      kicker: 'HelloRun',
      statLabel: 'Status',
      statValue: 'Unavailable'
    }));
  }
};

function buildBadgeCollectionScopeSummary(badges = []) {
  const order = ['event', 'challenge', 'global', 'organiser'];
  const labels = {
    event: 'Event',
    challenge: 'Challenge',
    global: 'Global',
    organiser: 'Organiser'
  };
  const counts = new Map();
  for (const badge of badges) {
    const scope = String(badge.badgeScope || 'event').trim() || 'event';
    counts.set(scope, (counts.get(scope) || 0) + 1);
  }

  return Array.from(new Set(order.concat(Array.from(counts.keys()))))
    .filter((scope) => counts.has(scope))
    .map((scope) => ({
      scope,
      label: labels[scope] || scope,
      count: counts.get(scope) || 0
    }));
}

function buildOpenBadgeMetadata(badge = {}, options = {}) {
  const baseUrl = String(options.baseUrl || '').replace(/\/$/, '');
  const badgeUrl = options.badgeUrl || `${baseUrl}/badges/${badge.userBadgeId}`;
  const openBadgeUrl = options.openBadgeUrl || `${badgeUrl}/open-badge.json`;
  const badgeShareImageUrl = options.badgeShareImageUrl || `${badgeUrl}/share-image.svg`;
  const achievementId = `${baseUrl}/badge-definitions/${encodeURIComponent(badge.badgeCode || badge.badgeDefinitionId || badge.userBadgeId)}`;
  const criteriaNarrative = badge.evidenceLabel || getBadgeCriteriaNarrative(badge.requirementType);

  return {
    '@context': [
      'https://www.w3.org/ns/credentials/v2',
      'https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json'
    ],
    id: openBadgeUrl,
    type: ['VerifiableCredential', 'OpenBadgeCredential'],
    name: `${badge.name} - HelloRun Badge`,
    description: badge.description || 'Verified HelloRun achievement.',
    issuer: {
      id: `${baseUrl}/`,
      type: ['Profile'],
      name: 'HelloRun',
      url: `${baseUrl}/`
    },
    issuanceDate: formatIsoDate(badge.earnedAt),
    validFrom: formatIsoDate(badge.earnedAt),
    credentialSubject: {
      type: ['AchievementSubject'],
      name: badge.runnerName || 'HelloRun Runner',
      achievement: {
        id: achievementId,
        type: ['Achievement'],
        achievementType: formatBadgeScopeLabel(badge.badgeScope),
        name: badge.name || 'HelloRun Badge',
        description: badge.description || 'Verified HelloRun achievement.',
        criteria: {
          narrative: criteriaNarrative
        },
        image: {
          id: badgeShareImageUrl,
          type: 'Image'
        },
        tags: [
          badge.badgeScope,
          badge.badgeType,
          badge.requirementType
        ].filter(Boolean)
      }
    },
    evidence: [{
      id: badgeUrl,
      type: ['Evidence'],
      name: badge.evidenceLabel || 'Verified HelloRun evidence',
      narrative: criteriaNarrative
    }],
    verification: {
      type: 'HostedBadge',
      verificationProperty: 'id'
    },
    image: {
      id: badgeShareImageUrl,
      type: 'Image'
    },
    url: badgeUrl,
    helloRun: {
      userBadgeId: badge.userBadgeId,
      badgeCode: badge.badgeCode,
      verificationCode: badge.verificationCode,
      verificationStatus: badge.verificationStatus,
      eventTitle: badge.eventTitle || '',
      eventUrl: badge.eventSlug ? `${baseUrl}/events/${badge.eventSlug}` : ''
    }
  };
}

function buildShareImageSvg(input = {}) {
  const titleLines = splitSvgText(input.title || 'HelloRun Badge', 26, 2);
  const subtitleLines = splitSvgText(input.subtitle || 'Verified HelloRun achievement.', 54, 2);
  const footer = String(input.footer || 'hellorun.ph').trim();
  const statLabel = String(input.statLabel || 'Verified').trim();
  const statValue = String(input.statValue || 'HelloRun').trim();
  const kicker = String(input.kicker || 'HelloRun').trim();
  const titleY = titleLines.length === 1 ? 365 : 330;
  const subtitleY = titleY + (titleLines.length * 76) + 28;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-label="${escapeXml(input.title || 'HelloRun Badge')}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="55%" stop-color="#eef7fb"/>
      <stop offset="100%" stop-color="#fff7ed"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#FA9A4B"/>
      <stop offset="100%" stop-color="#1495d1"/>
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="18" stdDeviation="22" flood-color="#0f172a" flood-opacity="0.14"/>
    </filter>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect x="64" y="56" width="1072" height="518" rx="28" fill="#ffffff" filter="url(#shadow)"/>
  <circle cx="988" cy="168" r="92" fill="#ecfdf5"/>
  <circle cx="1018" cy="140" r="38" fill="#dbeafe"/>
  <rect x="96" y="90" width="196" height="48" rx="24" fill="#ecfdf5"/>
  <text x="126" y="122" font-family="Inter, Arial, sans-serif" font-size="22" font-weight="800" fill="#047857">${escapeXml(kicker)}</text>
  <g transform="translate(96 176)">
    <rect width="132" height="132" rx="28" fill="url(#accent)"/>
    <circle cx="66" cy="52" r="24" fill="#ffffff" opacity="0.95"/>
    <path d="M44 92h44l12 20H32l12-20Z" fill="#ffffff" opacity="0.95"/>
    <path d="M42 34l12 10 14-22 14 22 12-10-10 34H52L42 34Z" fill="#ffffff" opacity="0.9"/>
  </g>
  ${titleLines.map((line, index) => `<text x="260" y="${titleY + (index * 76)}" font-family="Poppins, Arial, sans-serif" font-size="62" font-weight="800" fill="#0f172a">${escapeXml(line)}</text>`).join('\n  ')}
  ${subtitleLines.map((line, index) => `<text x="260" y="${subtitleY + (index * 34)}" font-family="Inter, Arial, sans-serif" font-size="28" font-weight="600" fill="#475569">${escapeXml(line)}</text>`).join('\n  ')}
  <rect x="96" y="458" width="332" height="78" rx="18" fill="#f8fafc" stroke="#e2e8f0"/>
  <text x="122" y="488" font-family="Inter, Arial, sans-serif" font-size="18" font-weight="800" fill="#64748b">${escapeXml(statLabel.toUpperCase())}</text>
  <text x="122" y="522" font-family="Inter, Arial, sans-serif" font-size="28" font-weight="800" fill="#0f172a">${escapeXml(truncateText(statValue, 22))}</text>
  <text x="96" y="604" font-family="Inter, Arial, sans-serif" font-size="22" font-weight="700" fill="#64748b">${escapeXml(footer)}</text>
  <text x="1000" y="604" text-anchor="end" font-family="Poppins, Arial, sans-serif" font-size="28" font-weight="900" fill="#0f172a">HelloRun</text>
</svg>`;
}

function splitSvgText(value, maxLength, maxLines) {
  const words = String(value || '').trim().replace(/\s+/g, ' ').split(' ').filter(Boolean);
  const lines = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxLength && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
    if (lines.length === maxLines) break;
  }
  if (current && lines.length < maxLines) lines.push(current);
  if (!lines.length) lines.push('HelloRun');
  if (words.join(' ').length > lines.join(' ').length) {
    lines[lines.length - 1] = `${truncateText(lines[lines.length - 1], Math.max(8, maxLength - 1))}...`;
  }
  return lines;
}

function truncateText(value, maxLength) {
  const safe = String(value || '').trim();
  if (safe.length <= maxLength) return safe;
  return safe.slice(0, Math.max(0, maxLength - 3)).trimEnd() + '...';
}

function formatBadgeScopeLabel(value) {
  const scope = String(value || '').trim();
  if (scope === 'organiser') return 'Organiser achievement';
  if (scope === 'challenge') return 'Challenge achievement';
  if (scope === 'global') return 'Global achievement';
  return 'Event achievement';
}

function getBadgeCriteriaNarrative(requirementType) {
  const type = String(requirementType || '').trim();
  if (type === 'registration_confirmed') return 'Registration was confirmed in HelloRun.';
  if (type === 'result_approved') return 'A submitted result was reviewed and approved in HelloRun.';
  if (type === 'distance_completed') return 'The runner completed the required distance with an approved result.';
  if (type === 'mode_completed') return 'The runner completed the required participation mode with an approved result.';
  if (type === 'challenge_progress') return 'The runner reached the required verified challenge progress.';
  if (type === 'global_distance') return 'The runner reached the required verified lifetime distance.';
  if (type === 'rank_achieved') return 'The runner achieved the required rank on a published leaderboard.';
  if (type === 'organiser_activity') return 'The organiser completed the required verified platform activity.';
  return 'The achievement was verified by HelloRun.';
}

function formatIsoDate(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return new Date().toISOString();
  return date.toISOString();
}
