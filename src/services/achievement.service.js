const Event = require('../models/Event');
const User = require('../models/User');
const Registration = require('../models/Registration');
const Submission = require('../models/Submission');
const { getPostgresClient } = require('../db/postgres');
const { syncRegistrationPaymentShadow } = require('./registration-payment-shadow.service');
const { syncSubmissionShadow } = require('./submission-shadow.service');
const {
  findActiveEventBadgeDefinitions,
  upsertBadgeDefinition
} = require('./badge-definition.service');
const { logBadgeAudit } = require('./badge-audit.service');
const { notifyBadgeEarned } = require('./badge-notification.service');
const {
  generateDefaultEventBadges,
  resolveAppUserId,
  resolveEventCore
} = require('./event-badge.service');
const {
  normalizeBadgeDistanceLabel,
  normalizeBadgeParticipationMode
} = require('../utils/badge-normalization');

async function evaluateRegistrationAchievements(registrationOrId, options = {}) {
  if (!process.env.DATABASE_URL) return [];

  const registration = await resolveRegistrationForEvaluation(registrationOrId);
  if (!registration || !registration._id || registration.status !== 'confirmed') return [];

  const event = await Event.findById(registration.eventId);
  if (!isEligibleEvent(event)) return [];
  if (event.feeMode === 'paid' && registration.paymentStatus !== 'paid') return [];

  await generateDefaultEventBadges(event, {
    performedBy: options.performedBy || event.approvedBy || event.organizerId
  });

  const sql = options.sql || getPostgresClient();
  const context = await buildRegistrationContext({ registration, event, sql });
  if (!context) return [];

  return awardEligibleBadges({
    context,
    requirementTypes: ['registration_confirmed'],
    source: 'system_auto_award',
    awardedBy: options.performedBy || null,
    sql
  });
}

async function evaluateSubmissionAchievements(submissionOrId, options = {}) {
  if (!process.env.DATABASE_URL) return [];

  const submission = await resolveSubmissionForEvaluation(submissionOrId);
  if (!submission || !submission._id || submission.status !== 'approved') return [];
  if (submission.isPersonalRecord) return [];

  const [registration, event] = await Promise.all([
    Registration.findById(submission.registrationId),
    Event.findById(submission.eventId)
  ]);
  if (!registration || !isEligibleEvent(event)) return [];

  await generateDefaultEventBadges(event, {
    performedBy: options.performedBy || submission.reviewedBy || event.approvedBy || event.organizerId
  });

  const sql = options.sql || getPostgresClient();
  const context = await buildSubmissionContext({ submission, registration, event, sql });
  if (!context) return [];

  return awardEligibleBadges({
    context,
    requirementTypes: ['result_approved', 'distance_completed', 'mode_completed'],
    source: 'system_auto_award',
    awardedBy: options.performedBy || submission.reviewedBy || null,
    sql
  });
}

async function evaluateOnsiteResultAchievements(onsiteResultOrId, options = {}) {
  if (!process.env.DATABASE_URL) return [];

  const sql = options.sql || getPostgresClient();
  const onsiteResult = await resolveOnsiteResultForEvaluation(onsiteResultOrId, { sql });
  if (!onsiteResult?.id || !['approved', 'verified'].includes(String(onsiteResult.result_status || ''))) {
    return [];
  }

  const event = onsiteResult.mongo_event_id
    ? await Event.findById(onsiteResult.mongo_event_id)
    : null;
  if (!isEligibleEvent(event)) return [];

  await generateDefaultEventBadges(event, {
    performedBy: options.performedBy || event.approvedBy || event.organizerId,
    sql
  });

  const context = buildOnsiteResultContext(onsiteResult);
  if (!context) return [];

  return awardEligibleBadges({
    context,
    requirementTypes: ['result_approved', 'distance_completed', 'mode_completed'],
    source: 'system_auto_award',
    awardedBy: options.performedBy || onsiteResult.entered_by || null,
    sql
  });
}

async function evaluatePublishedRankingAchievements(input = {}, options = {}) {
  if (!process.env.DATABASE_URL) return [];

  const sql = options.sql || getPostgresClient();
  const rankings = await resolvePublishedRankingsForEvaluation(input, { sql });
  const awarded = [];

  for (const ranking of rankings) {
    if (!ranking?.event_core_id || !ranking?.runner_user_id || !ranking?.mongo_event_id || !ranking?.mongo_user_id) {
      continue;
    }

    const event = await Event.findById(ranking.mongo_event_id);
    if (!isEligibleEvent(event) || event.leaderboardRecognitionEnabled !== true) continue;

    await generateDefaultEventBadges(event, {
      performedBy: options.performedBy || event.approvedBy || event.organizerId,
      sql
    });

    const context = buildRankingContext(ranking);
    const rankingAwards = await awardEligibleBadges({
      context,
      requirementTypes: ['rank_achieved'],
      source: 'system_auto_award',
      awardedBy: options.performedBy || null,
      sql
    });
    awarded.push(...rankingAwards);
  }

  return awarded;
}

async function evaluateOrganiserAchievements(mongoUserId, options = {}) {
  if (!process.env.DATABASE_URL) return [];

  const safeMongoUserId = String(mongoUserId || '').trim();
  if (!safeMongoUserId) return [];

  const organiser = await User.findById(safeMongoUserId).select('_id role organizerStatus firstName lastName email').lean();
  if (!isEligibleOrganiser(organiser)) return [];

  const sql = options.sql || getPostgresClient();
  const organiserUserId = await resolveAppUserId(safeMongoUserId, { sql });
  if (!organiserUserId) return [];

  await ensureOrganiserBadgeDefinitions({ sql, performedBy: options.performedBy || null });
  const publishedEvents = await Event.find({
    organizerId: organiser._id,
    status: 'published',
    isDeleted: { $ne: true },
    isPersonalRecord: { $ne: true }
  }).select('_id').lean();
  const publishedEventCount = publishedEvents.length;
  const publishedEventIds = publishedEvents.map((event) => event._id);
  const confirmedRegistrationCount = publishedEventIds.length
    ? await Registration.countDocuments({
      eventId: { $in: publishedEventIds },
      status: 'confirmed'
    })
    : 0;

  const context = {
    runnerUserId: organiserUserId,
    eventCoreId: null,
    registrationId: null,
    submissionId: null,
    mongoUserId: safeMongoUserId,
    mongoEventId: '',
    mongoRegistrationId: '',
    mongoSubmissionId: '',
    organiserStatus: organiser.organizerStatus,
    organiserRole: organiser.role,
    publishedEventCount,
    confirmedRegistrationCount
  };

  return awardOrganiserBadges({
    context,
    awardedBy: options.performedBy || null,
    sql
  });
}

function evaluateOrganiserAchievementsInBackground(mongoUserId, options = {}) {
  evaluateOrganiserAchievements(mongoUserId, options).catch((error) => {
    console.error('Organiser achievement evaluation failed:', {
      mongoUserId: String(mongoUserId || ''),
      error: error.message
    });
  });
}

async function getRunnerEarnedBadges(mongoUserId, options = {}) {
  if (!process.env.DATABASE_URL) return [];

  const sql = options.sql || getPostgresClient();
  const limit = clampInt(options.limit, 1, 100, 30);
  const badgeScopes = Array.isArray(options.badgeScopes)
    ? options.badgeScopes
      .map((scope) => String(scope || '').trim())
      .filter(Boolean)
      .slice(0, 10)
    : [];
  const scopeFilter = badgeScopes.length
    ? sql`AND bd.badge_scope = ANY(${badgeScopes})`
    : sql``;
  const rows = await sql`
    SELECT
      ub.id AS user_badge_id,
      ub.earned_at,
      ub.is_featured,
      ub.verification_status,
      ub.event_core_id,
      ub.mongo_event_id,
      ub.mongo_submission_id,
      bd.id AS badge_definition_id,
      bd.badge_code,
      bd.name,
      bd.description,
      bd.badge_scope,
      bd.badge_type,
      bd.requirement_type,
      bd.points,
      ec.title AS event_title,
      ec.slug AS event_slug,
      eb.badge_name_override,
      eb.badge_description_override,
      eb.badge_image_url
    FROM user_badges ub
    JOIN badge_definitions bd ON bd.id = ub.badge_definition_id
    LEFT JOIN event_badges eb
      ON eb.event_core_id = ub.event_core_id
      AND eb.badge_definition_id = ub.badge_definition_id
    LEFT JOIN events_core ec ON ec.id = ub.event_core_id
    WHERE ub.mongo_user_id = ${String(mongoUserId)}
      AND ub.verification_status = 'verified'
      ${scopeFilter}
    ORDER BY ub.is_featured DESC, ub.earned_at DESC
    LIMIT ${limit}
  `;

  return rows.map((row) => ({
    userBadgeId: String(row.user_badge_id || ''),
    badgeDefinitionId: String(row.badge_definition_id || ''),
    badgeCode: row.badge_code || '',
    name: row.badge_name_override || row.name || '',
    description: row.badge_description_override || row.description || '',
    imageUrl: row.badge_image_url || '',
    badgeScope: row.badge_scope || '',
    badgeType: row.badge_type || '',
    requirementType: row.requirement_type || '',
    eventCoreId: String(row.event_core_id || ''),
    mongoEventId: row.mongo_event_id || '',
    eventTitle: row.event_title || '',
    eventSlug: row.event_slug || '',
    earnedAt: row.earned_at || null,
    isFeatured: Boolean(row.is_featured),
    points: Number(row.points || 0),
    mongoSubmissionId: row.mongo_submission_id || ''
  }));
}

async function getRunnerPointsSummary(mongoUserId, options = {}) {
  if (!process.env.DATABASE_URL) return { totalPoints: 0, badgeCount: 0 };

  const sql = options.sql || getPostgresClient();
  const rows = await sql`
    SELECT
      COALESCE(SUM(bd.points), 0) AS total_points,
      COUNT(*) AS badge_count
    FROM user_badges ub
    JOIN badge_definitions bd ON bd.id = ub.badge_definition_id
    WHERE ub.mongo_user_id = ${String(mongoUserId)}
      AND ub.verification_status = 'verified'
  `;
  const row = rows[0] || {};
  return {
    totalPoints: Number(row.total_points || 0),
    badgeCount: Number(row.badge_count || 0)
  };
}

async function getPublicBadgeVerification(userBadgeId, options = {}) {
  if (!process.env.DATABASE_URL) return null;
  const safeUserBadgeId = String(userBadgeId || '').trim();
  if (!isUuid(safeUserBadgeId)) return null;

  const sql = options.sql || getPostgresClient();
  const rows = await sql`
    SELECT
      ub.id AS user_badge_id,
      ub.earned_at,
      ub.verification_status,
      ub.source,
      ub.mongo_user_id,
      ub.mongo_event_id,
      ub.mongo_registration_id,
      ub.mongo_submission_id,
      bd.id AS badge_definition_id,
      bd.badge_code,
      bd.name,
      bd.description,
      bd.badge_scope,
      bd.badge_type,
      bd.requirement_type,
      bd.requirement_value,
      bd.points,
      au.display_name AS runner_name,
      ec.title AS event_title,
      ec.slug AS event_slug,
      ec.event_type,
      ec.virtual_completion_mode,
      eb.badge_name_override,
      eb.badge_description_override,
      eb.badge_image_url
    FROM user_badges ub
    JOIN badge_definitions bd ON bd.id = ub.badge_definition_id
    JOIN app_users au ON au.id = ub.runner_user_id
    LEFT JOIN events_core ec ON ec.id = ub.event_core_id
    LEFT JOIN event_badges eb
      ON eb.event_core_id = ub.event_core_id
      AND eb.badge_definition_id = ub.badge_definition_id
    WHERE ub.id = ${safeUserBadgeId}
      AND ub.verification_status = 'verified'
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) return null;

  return {
    userBadgeId: String(row.user_badge_id || ''),
    badgeDefinitionId: String(row.badge_definition_id || ''),
    badgeCode: row.badge_code || '',
    name: row.badge_name_override || row.name || '',
    description: row.badge_description_override || row.description || '',
    imageUrl: row.badge_image_url || '',
    badgeScope: row.badge_scope || '',
    badgeType: row.badge_type || '',
    requirementType: row.requirement_type || '',
    requirementValue: row.requirement_value || {},
    points: Number(row.points || 0),
    runnerName: row.runner_name || 'HelloRun Runner',
    eventTitle: row.event_title || '',
    eventSlug: row.event_slug || '',
    eventType: row.event_type || '',
    virtualCompletionMode: row.virtual_completion_mode || '',
    earnedAt: row.earned_at || null,
    verificationStatus: row.verification_status || '',
    source: row.source || '',
    mongoUserId: row.mongo_user_id || '',
    mongoEventId: row.mongo_event_id || '',
    mongoRegistrationId: row.mongo_registration_id || '',
    mongoSubmissionId: row.mongo_submission_id || '',
    verificationCode: safeUserBadgeId.slice(0, 8).toUpperCase(),
    evidenceLabel: getBadgeEvidenceLabel(row)
  };
}

async function setFeaturedRunnerBadge(mongoUserId, userBadgeId, options = {}) {
  if (!process.env.DATABASE_URL) return null;

  const sql = options.sql || getPostgresClient();
  const runnerUserId = await resolveAppUserId(mongoUserId, { sql });
  if (!runnerUserId) return null;

  let updated = null;
  await sql.begin(async (tx) => {
    await tx`
      UPDATE user_badges
      SET is_featured = FALSE
      WHERE runner_user_id = ${runnerUserId}
        AND is_featured = TRUE
    `;
    const rows = await tx`
      UPDATE user_badges
      SET is_featured = TRUE
      WHERE id = ${String(userBadgeId)}
        AND runner_user_id = ${runnerUserId}
        AND verification_status = 'verified'
      RETURNING *
    `;
    updated = rows[0] || null;
  });

  return updated;
}

async function listBadgeDefinitions(options = {}) {
  if (!process.env.DATABASE_URL) return [];

  const sql = options.sql || getPostgresClient();
  const limit = clampInt(options.limit, 1, 200, 100);
  const badgeScope = normalizeAdminBadgeScope(options.badgeScope);
  const scopeFilter = badgeScope ? sql`WHERE bd.badge_scope = ${badgeScope}` : sql``;
  return sql`
    SELECT
      bd.*,
      COUNT(DISTINCT eb.id) AS event_badge_count,
      COUNT(DISTINCT ub.id) FILTER (WHERE ub.verification_status = 'verified') AS earned_count
    FROM badge_definitions bd
    LEFT JOIN event_badges eb ON eb.badge_definition_id = bd.id
    LEFT JOIN user_badges ub ON ub.badge_definition_id = bd.id
    ${scopeFilter}
    GROUP BY bd.id
    ORDER BY bd.created_at DESC
    LIMIT ${limit}
  `;
}

async function listAdminUserBadges(options = {}) {
  if (!process.env.DATABASE_URL) return [];

  const sql = options.sql || getPostgresClient();
  const limit = clampInt(options.limit, 1, 200, 50);
  const status = String(options.status || 'verified').trim();
  const badgeScope = normalizeAdminBadgeScope(options.badgeScope);
  const scopeFilter = badgeScope ? sql`AND bd.badge_scope = ${badgeScope}` : sql``;
  const rows = await sql`
    SELECT
      ub.id AS user_badge_id,
      ub.earned_at,
      ub.updated_at,
      ub.verification_status,
      ub.revoke_reason,
      ub.mongo_user_id,
      ub.mongo_event_id,
      bd.name AS badge_name,
      bd.badge_scope,
      bd.badge_type,
      bd.requirement_type,
      e.title AS event_title,
      au.email AS runner_email,
      au.display_name AS runner_name
    FROM user_badges ub
    JOIN badge_definitions bd ON bd.id = ub.badge_definition_id
    LEFT JOIN events_core e ON e.id = ub.event_core_id
    LEFT JOIN app_users au ON au.id = ub.runner_user_id
    WHERE (${status} = 'all' OR ub.verification_status = ${status})
      ${scopeFilter}
    ORDER BY COALESCE(ub.updated_at, ub.earned_at) DESC
    LIMIT ${limit}
  `;

  return rows.map((row) => ({
    userBadgeId: String(row.user_badge_id || ''),
    badgeName: row.badge_name || '',
    badgeScope: row.badge_scope || '',
    badgeType: row.badge_type || '',
    requirementType: row.requirement_type || '',
    eventTitle: row.event_title || '',
    runnerName: row.runner_name || '',
    runnerEmail: row.runner_email || '',
    mongoUserId: row.mongo_user_id || '',
    mongoEventId: row.mongo_event_id || '',
    verificationStatus: row.verification_status || '',
    revokeReason: row.revoke_reason || '',
    earnedAt: row.earned_at || null,
    updatedAt: row.updated_at || null
  }));
}

async function getAdminBadgeAnalytics(options = {}) {
  if (!process.env.DATABASE_URL) {
    return buildEmptyBadgeAnalytics();
  }

  const sql = options.sql || getPostgresClient();
  const badgeScope = normalizeAdminBadgeScope(options.badgeScope);
  const definitionScopeFilter = badgeScope ? sql`WHERE bd.badge_scope = ${badgeScope}` : sql``;
  const awardScopeFilter = badgeScope ? sql`AND bd.badge_scope = ${badgeScope}` : sql``;

  const [
    definitionRows,
    awardRows,
    scopeRows,
    typeRows,
    topDefinitionRows
  ] = await Promise.all([
    sql`
      SELECT
        COUNT(*) AS total_definitions,
        COUNT(*) FILTER (WHERE bd.is_active = TRUE) AS active_definitions,
        COUNT(*) FILTER (WHERE bd.is_active = FALSE) AS disabled_definitions
      FROM badge_definitions bd
      ${definitionScopeFilter}
    `,
    sql`
      SELECT
        COUNT(*) AS total_awards,
        COUNT(*) FILTER (WHERE ub.verification_status = 'verified') AS verified_awards,
        COUNT(*) FILTER (WHERE ub.verification_status = 'revoked') AS revoked_awards,
        COUNT(DISTINCT ub.runner_user_id) AS awarded_users
      FROM user_badges ub
      JOIN badge_definitions bd ON bd.id = ub.badge_definition_id
      WHERE TRUE
        ${awardScopeFilter}
    `,
    sql`
      SELECT
        bd.badge_scope,
        COUNT(DISTINCT bd.id) AS definition_count,
        COUNT(ub.id) FILTER (WHERE ub.verification_status = 'verified') AS verified_awards,
        COUNT(ub.id) FILTER (WHERE ub.verification_status = 'revoked') AS revoked_awards
      FROM badge_definitions bd
      LEFT JOIN user_badges ub ON ub.badge_definition_id = bd.id
      ${definitionScopeFilter}
      GROUP BY bd.badge_scope
      ORDER BY verified_awards DESC, definition_count DESC, bd.badge_scope ASC
    `,
    sql`
      SELECT
        bd.badge_type,
        COUNT(DISTINCT bd.id) AS definition_count,
        COUNT(ub.id) FILTER (WHERE ub.verification_status = 'verified') AS verified_awards,
        COUNT(ub.id) FILTER (WHERE ub.verification_status = 'revoked') AS revoked_awards
      FROM badge_definitions bd
      LEFT JOIN user_badges ub ON ub.badge_definition_id = bd.id
      ${definitionScopeFilter}
      GROUP BY bd.badge_type
      ORDER BY verified_awards DESC, definition_count DESC, bd.badge_type ASC
      LIMIT 8
    `,
    sql`
      SELECT
        bd.id,
        bd.name,
        bd.badge_scope,
        bd.badge_type,
        bd.is_active,
        COUNT(ub.id) FILTER (WHERE ub.verification_status = 'verified') AS verified_awards,
        COUNT(ub.id) FILTER (WHERE ub.verification_status = 'revoked') AS revoked_awards
      FROM badge_definitions bd
      LEFT JOIN user_badges ub ON ub.badge_definition_id = bd.id
      ${definitionScopeFilter}
      GROUP BY bd.id
      HAVING COUNT(ub.id) > 0
      ORDER BY verified_awards DESC, revoked_awards DESC, bd.name ASC
      LIMIT 5
    `
  ]);

  const definitions = definitionRows[0] || {};
  const awards = awardRows[0] || {};
  const totalAwards = Number(awards.total_awards || 0);
  const revokedAwards = Number(awards.revoked_awards || 0);

  return {
    totalDefinitions: Number(definitions.total_definitions || 0),
    activeDefinitions: Number(definitions.active_definitions || 0),
    disabledDefinitions: Number(definitions.disabled_definitions || 0),
    totalAwards,
    verifiedAwards: Number(awards.verified_awards || 0),
    revokedAwards,
    awardedUsers: Number(awards.awarded_users || 0),
    revocationRate: totalAwards > 0 ? Math.round((revokedAwards / totalAwards) * 1000) / 10 : 0,
    byScope: scopeRows.map((row) => ({
      scope: row.badge_scope || 'event',
      definitionCount: Number(row.definition_count || 0),
      verifiedAwards: Number(row.verified_awards || 0),
      revokedAwards: Number(row.revoked_awards || 0)
    })),
    byType: typeRows.map((row) => ({
      type: row.badge_type || 'badge',
      definitionCount: Number(row.definition_count || 0),
      verifiedAwards: Number(row.verified_awards || 0),
      revokedAwards: Number(row.revoked_awards || 0)
    })),
    topDefinitions: topDefinitionRows.map((row) => ({
      badgeDefinitionId: String(row.id || ''),
      name: row.name || '',
      badgeScope: row.badge_scope || '',
      badgeType: row.badge_type || '',
      isActive: row.is_active !== false,
      verifiedAwards: Number(row.verified_awards || 0),
      revokedAwards: Number(row.revoked_awards || 0)
    }))
  };
}

async function revokeUserBadge(userBadgeId, input = {}, options = {}) {
  if (!process.env.DATABASE_URL) return null;

  const sql = options.sql || getPostgresClient();
  const performedBy = await resolveAppUserId(input.performedBy, { sql });
  const reason = String(input.reason || '').trim().slice(0, 500);
  const rows = await sql`
    UPDATE user_badges
    SET
      verification_status = 'revoked',
      revoke_reason = ${reason},
      is_featured = FALSE
    WHERE id = ${String(userBadgeId)}
      AND verification_status != 'revoked'
    RETURNING *
  `;
  const revoked = rows[0] || null;
  if (!revoked) return null;

  await logBadgeAudit({
    badgeDefinitionId: revoked.badge_definition_id,
    userBadgeId: revoked.id,
    eventCoreId: revoked.event_core_id,
    runnerUserId: revoked.runner_user_id,
    action: 'badge_revoked',
    performedBy,
    reason,
    metadata: {
      mongoUserId: revoked.mongo_user_id || '',
      mongoEventId: revoked.mongo_event_id || ''
    }
  }, { sql });

  return revoked;
}

async function updateBadgeDefinitionStatus(badgeDefinitionId, input = {}, options = {}) {
  if (!process.env.DATABASE_URL) return null;

  const safeBadgeDefinitionId = String(badgeDefinitionId || '').trim();
  if (!isUuid(safeBadgeDefinitionId)) return null;

  const sql = options.sql || getPostgresClient();
  const isActive = input.isActive === true;
  const performedBy = await resolveAppUserId(input.performedBy, { sql });
  const reason = String(input.reason || '').trim().slice(0, 500);
  const rows = await sql`
    UPDATE badge_definitions
    SET is_active = ${isActive}
    WHERE id = ${safeBadgeDefinitionId}
      AND is_active != ${isActive}
    RETURNING *
  `;
  const definition = rows[0] || null;
  if (!definition) return null;

  await logBadgeAudit({
    badgeDefinitionId: definition.id,
    action: isActive ? 'badge_definition_enabled' : 'badge_definition_disabled',
    performedBy,
    reason,
    metadata: {
      badgeCode: definition.badge_code || '',
      badgeScope: definition.badge_scope || '',
      badgeType: definition.badge_type || ''
    }
  }, { sql });

  return definition;
}

async function updateBadgeDefinitionEmailLevel(badgeDefinitionId, input = {}, options = {}) {
  if (!process.env.DATABASE_URL) return null;

  const safeBadgeDefinitionId = String(badgeDefinitionId || '').trim();
  if (!isUuid(safeBadgeDefinitionId)) return null;

  const emailNotificationLevel = normalizeBadgeEmailNotificationLevel(input.emailNotificationLevel);
  if (!emailNotificationLevel) return null;

  const sql = options.sql || getPostgresClient();
  const performedBy = await resolveAppUserId(input.performedBy, { sql });
  const reason = String(input.reason || '').trim().slice(0, 500);
  const rows = await sql`
    UPDATE badge_definitions
    SET email_notification_level = ${emailNotificationLevel}
    WHERE id = ${safeBadgeDefinitionId}
      AND email_notification_level != ${emailNotificationLevel}
    RETURNING *
  `;
  const definition = rows[0] || null;
  if (!definition) return null;

  await logBadgeAudit({
    badgeDefinitionId: definition.id,
    action: 'badge_definition_email_level_updated',
    performedBy,
    reason: reason || `Email notification level set to ${emailNotificationLevel}`,
    metadata: {
      badgeCode: definition.badge_code || '',
      badgeScope: definition.badge_scope || '',
      badgeType: definition.badge_type || '',
      emailNotificationLevel
    }
  }, { sql });

  return definition;
}

async function recalculateBadgeAwards(input = {}, options = {}) {
  if (!process.env.DATABASE_URL) {
    return buildEmptyBadgeRecalculationResult(input);
  }

  const sql = options.sql || getPostgresClient();
  const scope = normalizeRecalculationScope(input.scope);
  const limit = clampInt(input.limit, 1, 250, 50);
  const performedBy = input.performedBy || options.performedBy || null;
  const result = {
    scope,
    limit,
    registrationsProcessed: 0,
    submissionsProcessed: 0,
    organisersProcessed: 0,
    progressRefreshes: 0,
    progressRowsUpdated: 0,
    awardsCreated: 0,
    errors: []
  };
  const progressService = scope === 'all' || scope === 'event'
    ? require('./badge-progress.service')
    : null;

  if (scope === 'all' || scope === 'event') {
    const registrations = await Registration.find({ status: 'confirmed' })
      .sort({ updatedAt: -1, createdAt: -1, _id: -1 })
      .limit(limit);
    for (const registration of registrations) {
      try {
        const awards = await evaluateRegistrationAchievements(registration, { performedBy, sql });
        const progress = await progressService.refreshAccumulatedChallengeProgress(registration, { performedBy, sql });
        result.registrationsProcessed += 1;
        result.awardsCreated += awards.length;
        if (progress) {
          result.progressRefreshes += 1;
          result.progressRowsUpdated += Array.isArray(progress.progressRows) ? progress.progressRows.length : 0;
          result.awardsCreated += Array.isArray(progress.awards) ? progress.awards.length : 0;
        }
      } catch (error) {
        result.errors.push({
          type: 'registration',
          id: String(registration?._id || ''),
          message: error.message
        });
      }
    }

    const submissions = await Submission.find({
      status: 'approved',
      isPersonalRecord: { $ne: true }
    })
      .sort({ updatedAt: -1, createdAt: -1, _id: -1 })
      .limit(limit);
    const refreshedGlobalRunnerIds = new Set();
    for (const submission of submissions) {
      try {
        const awards = await evaluateSubmissionAchievements(submission, { performedBy, sql });
        result.submissionsProcessed += 1;
        result.awardsCreated += awards.length;
        const runnerId = String(submission.runnerId || submission.userId || '');
        if (runnerId && !refreshedGlobalRunnerIds.has(runnerId)) {
          refreshedGlobalRunnerIds.add(runnerId);
          const progress = await progressService.refreshGlobalDistanceMilestoneProgress(runnerId, { performedBy, sql });
          if (progress) {
            result.progressRefreshes += 1;
            result.progressRowsUpdated += Array.isArray(progress.progressRows) ? progress.progressRows.length : 0;
            result.awardsCreated += Array.isArray(progress.awards) ? progress.awards.length : 0;
          }
        }
      } catch (error) {
        result.errors.push({
          type: 'submission',
          id: String(submission?._id || ''),
          message: error.message
        });
      }
    }
  }

  if (scope === 'all' || scope === 'organiser') {
    const organisers = await User.find({
      role: 'organiser',
      organizerStatus: 'approved'
    })
      .sort({ updatedAt: -1, createdAt: -1, _id: -1 })
      .limit(limit)
      .select('_id')
      .lean();
    for (const organiser of organisers) {
      try {
        const awards = await evaluateOrganiserAchievements(organiser._id, { performedBy, sql });
        result.organisersProcessed += 1;
        result.awardsCreated += awards.length;
      } catch (error) {
        result.errors.push({
          type: 'organiser',
          id: String(organiser?._id || ''),
          message: error.message
        });
      }
    }
  }

  const performedByAppUserId = await resolveAppUserId(performedBy, { sql });
  await logBadgeAudit({
    action: 'badge_recalculated',
    performedBy: performedByAppUserId,
    reason: String(input.reason || 'Admin recalculated badge awards').trim().slice(0, 500),
    metadata: {
      scope: result.scope,
      limit: result.limit,
      registrationsProcessed: result.registrationsProcessed,
      submissionsProcessed: result.submissionsProcessed,
      organisersProcessed: result.organisersProcessed,
      progressRefreshes: result.progressRefreshes,
      progressRowsUpdated: result.progressRowsUpdated,
      awardsCreated: result.awardsCreated,
      errorCount: result.errors.length
    }
  }, { sql });

  return result;
}

function evaluateRegistrationAchievementsInBackground(registrationOrId, options = {}) {
  evaluateRegistrationAchievements(registrationOrId, options).catch((error) => {
    console.error('Registration achievement evaluation failed:', {
      registrationId: String(registrationOrId?._id || registrationOrId || ''),
      error: error.message
    });
  });
}

function evaluateSubmissionAchievementsInBackground(submissionOrId, options = {}) {
  evaluateSubmissionAchievements(submissionOrId, options).catch((error) => {
    console.error('Submission achievement evaluation failed:', {
      submissionId: String(submissionOrId?._id || submissionOrId || ''),
      error: error.message
    });
  });
}

async function awardEligibleBadges({ context, requirementTypes, source, awardedBy, sql }) {
  const badges = await findActiveEventBadgeDefinitions(context.eventCoreId, requirementTypes, { sql });
  const awarded = [];
  const awardedByAppUserId = await resolveAppUserId(awardedBy, { sql });

  for (const badge of badges) {
    if (!checkBadgeRequirement(badge, context)) continue;
    if (source === 'system_auto_award' && await hasRevokedBadge({
      runnerUserId: context.runnerUserId,
      badgeDefinitionId: badge.id,
      eventCoreId: context.eventCoreId,
      sql
    })) {
      continue;
    }

    const userBadgeRows = await sql`
      INSERT INTO user_badges (
        runner_user_id,
        badge_definition_id,
        event_core_id,
        registration_id,
        submission_id,
        mongo_user_id,
        mongo_event_id,
        mongo_registration_id,
        mongo_submission_id,
        verification_status,
        source,
        awarded_by
      )
      VALUES (
        ${context.runnerUserId},
        ${badge.id},
        ${context.eventCoreId},
        ${context.registrationId || null},
        ${context.submissionId || null},
        ${context.mongoUserId},
        ${context.mongoEventId},
        ${context.mongoRegistrationId || null},
        ${context.mongoSubmissionId || null},
        'verified',
        ${source},
        ${awardedByAppUserId || null}
      )
      ON CONFLICT (runner_user_id, badge_definition_id, event_core_id)
      WHERE verification_status != 'revoked'
      DO NOTHING
      RETURNING *
    `;

    const userBadge = userBadgeRows[0];
    if (!userBadge) continue;

    const notificationPayload = {
      ...badge,
      ...userBadge,
      name: badge.badge_name_override || badge.name,
      user_badge_id: userBadge.id
    };

    await logBadgeAudit({
      badgeDefinitionId: badge.id,
      userBadgeId: userBadge.id,
      eventCoreId: context.eventCoreId,
      runnerUserId: context.runnerUserId,
      action: 'badge_awarded',
      performedBy: awardedByAppUserId,
      metadata: {
        requirementType: badge.requirement_type,
        mongoUserId: context.mongoUserId,
        mongoEventId: context.mongoEventId,
        mongoRegistrationId: context.mongoRegistrationId || '',
        mongoSubmissionId: context.mongoSubmissionId || ''
      }
    }, { sql });

    await notifyBadgeEarned(context.mongoUserId, notificationPayload);
    awarded.push(userBadge);
  }

  return awarded;
}

function checkBadgeRequirement(badge, context) {
  const requirementType = String(badge.requirement_type || '').trim();
  const requirementValue = badge.requirement_value || {};

  if (requirementType === 'registration_confirmed') {
    return context.registrationStatus === 'confirmed';
  }

  if (requirementType === 'result_approved') {
    return context.submissionStatus === 'approved' ||
      context.resultStatus === 'approved' ||
      context.resultStatus === 'verified';
  }

  if (requirementType === 'distance_completed') {
    return isVerifiedCompletionContext(context) &&
      normalizeBadgeDistanceLabel(context.raceDistance) === normalizeBadgeDistanceLabel(requirementValue.raceDistance);
  }

  if (requirementType === 'mode_completed') {
    return isVerifiedCompletionContext(context) &&
      normalizeBadgeParticipationMode(context.participationMode) === normalizeBadgeParticipationMode(requirementValue.mode);
  }

  if (requirementType === 'challenge_progress') {
    const currentValue = Number(context.currentValue || context.approvedDistanceKm || 0);
    const targetValue = Number(requirementValue.targetDistanceKm || context.targetValue || 0);
    return targetValue > 0 && currentValue >= targetValue;
  }

  if (requirementType === 'global_distance') {
    const currentValue = Number(context.currentValue || context.approvedDistanceKm || 0);
    const targetValue = Number(requirementValue.distanceKm || context.targetValue || 0);
    return targetValue > 0 && currentValue >= targetValue;
  }

  if (requirementType === 'rank_achieved') {
    const currentRank = Number(context.rank || context.rankPosition || 0);
    const targetRank = Number(requirementValue.rank || requirementValue.rankPosition || 0);
    if (context.rankingsStatus !== 'published' || targetRank <= 0 || currentRank <= 0 || currentRank > targetRank) {
      return false;
    }
    if (requirementValue.leaderboardType && String(context.leaderboardType || '') !== String(requirementValue.leaderboardType)) {
      return false;
    }
    if (requirementValue.raceDistance &&
      normalizeBadgeDistanceLabel(context.raceDistance) !== normalizeBadgeDistanceLabel(requirementValue.raceDistance)) {
      return false;
    }
    if (requirementValue.mode &&
      normalizeBadgeParticipationMode(context.participationMode) !== normalizeBadgeParticipationMode(requirementValue.mode)) {
      return false;
    }
    return true;
  }

  if (requirementType === 'organiser_activity') {
    const activityType = String(requirementValue.activityType || '').trim();
    if (activityType === 'verified_organiser') {
      return context.organiserRole === 'organiser' && context.organiserStatus === 'approved';
    }
    if (activityType === 'published_event_count') {
      const requiredCount = Number(requirementValue.count || 0);
      return requiredCount > 0 && Number(context.publishedEventCount || 0) >= requiredCount;
    }
    if (activityType === 'confirmed_registration_count') {
      const requiredCount = Number(requirementValue.count || 0);
      return requiredCount > 0 && Number(context.confirmedRegistrationCount || 0) >= requiredCount;
    }
  }

  return false;
}

function isVerifiedCompletionContext(context = {}) {
  return context.submissionStatus === 'approved' ||
    context.resultStatus === 'approved' ||
    context.resultStatus === 'verified';
}

async function hasRevokedBadge({ runnerUserId, badgeDefinitionId, eventCoreId, sql }) {
  const rows = await sql`
    SELECT id
    FROM user_badges
    WHERE runner_user_id = ${runnerUserId}
      AND badge_definition_id = ${badgeDefinitionId}
      AND event_core_id = ${eventCoreId}
      AND verification_status = 'revoked'
    LIMIT 1
  `;
  return rows.length > 0;
}

async function buildRegistrationContext({ registration, event, sql }) {
  const [eventCore, runnerUserId] = await Promise.all([
    resolveEventCore(event, { sql }),
    resolveAppUserId(registration.userId, { sql })
  ]);
  if (!eventCore?.id || !runnerUserId) return null;

  let registrationRow = await findRegistrationRow(registration._id, { sql });
  if (!registrationRow) {
    await syncRegistrationPaymentShadow(registration, { sql, operation: 'live_sync' });
    registrationRow = await findRegistrationRow(registration._id, { sql });
  }
  if (!registrationRow?.id) return null;

  return {
    runnerUserId,
    eventCoreId: eventCore.id,
    registrationId: registrationRow.id,
    submissionId: null,
    mongoUserId: String(registration.userId),
    mongoEventId: String(registration.eventId),
    mongoRegistrationId: String(registration._id),
    mongoSubmissionId: '',
    registrationStatus: registration.status,
    paymentStatus: registration.paymentStatus,
    participationMode: registration.participationMode,
    raceDistance: registration.raceDistance
  };
}

async function buildSubmissionContext({ submission, registration, event, sql }) {
  const base = await buildRegistrationContext({ registration, event, sql });
  if (!base) return null;

  let submissionRow = await findSubmissionRow(submission._id, { sql });
  if (!submissionRow) {
    await syncSubmissionShadow(submission, { sql, operation: 'live_sync' });
    submissionRow = await findSubmissionRow(submission._id, { sql });
  }
  if (!submissionRow?.id) return null;

  return {
    ...base,
    submissionId: submissionRow.id,
    mongoSubmissionId: String(submission._id),
    submissionStatus: submission.status,
    distanceKm: Number(submission.distanceKm || 0),
    finishTime: Number(submission.elapsedMs || 0),
    raceDistance: submission.raceDistance || registration.raceDistance,
    participationMode: submission.participationMode || registration.participationMode
  };
}

async function findRegistrationRow(registrationId, options = {}) {
  const sql = options.sql || getPostgresClient();
  const rows = await sql`
    SELECT id FROM registrations WHERE mongo_registration_id = ${String(registrationId)} LIMIT 1
  `;
  return rows[0] || null;
}

async function findSubmissionRow(submissionId, options = {}) {
  const sql = options.sql || getPostgresClient();
  const rows = await sql`
    SELECT id FROM submissions_core WHERE mongo_submission_id = ${String(submissionId)} LIMIT 1
  `;
  return rows[0] || null;
}

async function resolveOnsiteResultForEvaluation(onsiteResultOrId, options = {}) {
  if (!onsiteResultOrId) return null;
  if (typeof onsiteResultOrId === 'object' && onsiteResultOrId.id && onsiteResultOrId.mongo_event_id) {
    return onsiteResultOrId;
  }

  const sql = options.sql || getPostgresClient();
  const onsiteResultId = typeof onsiteResultOrId === 'object'
    ? onsiteResultOrId.id
    : onsiteResultOrId;
  const rows = await sql`
    SELECT
      ors.*,
      ec.mongo_event_id,
      r.mongo_registration_id,
      r.mongo_user_id,
      r.race_distance AS registration_race_distance,
      r.participation_mode AS registration_participation_mode
    FROM onsite_results ors
    JOIN events_core ec ON ec.id = ors.event_core_id
    JOIN registrations r ON r.id = ors.registration_id
    WHERE ors.id = ${String(onsiteResultId)}
    LIMIT 1
  `;
  return rows[0] || null;
}

function buildOnsiteResultContext(onsiteResult) {
  if (!onsiteResult?.runner_user_id || !onsiteResult?.event_core_id || !onsiteResult?.registration_id) {
    return null;
  }

  return {
    runnerUserId: onsiteResult.runner_user_id,
    eventCoreId: onsiteResult.event_core_id,
    registrationId: onsiteResult.registration_id,
    submissionId: null,
    mongoUserId: String(onsiteResult.mongo_user_id || ''),
    mongoEventId: String(onsiteResult.mongo_event_id || ''),
    mongoRegistrationId: String(onsiteResult.mongo_registration_id || ''),
    mongoSubmissionId: '',
    registrationStatus: 'confirmed',
    paymentStatus: '',
    resultStatus: onsiteResult.result_status,
    distanceKm: Number(onsiteResult.race_distance_km || 0),
    finishTime: Number(onsiteResult.elapsed_ms || 0),
    raceDistance: onsiteResult.race_category || onsiteResult.registration_race_distance || '',
    participationMode: onsiteResult.participation_mode || onsiteResult.registration_participation_mode || 'onsite',
    onsiteResultId: String(onsiteResult.id || '')
  };
}

async function resolvePublishedRankingsForEvaluation(input = {}, options = {}) {
  const sql = options.sql || getPostgresClient();
  const rankingIds = Array.isArray(input.rankingIds)
    ? input.rankingIds.map((id) => String(id || '').trim()).filter(Boolean)
    : [];

  if (rankingIds.length) {
    return sql`
      SELECT
        r.*,
        au.mongo_user_id,
        ec.mongo_event_id,
        sc.id AS submission_core_id,
        sc.mongo_submission_id
      FROM rankings r
      JOIN app_users au ON au.id = r.runner_user_id
      JOIN events_core ec ON ec.id = r.event_core_id
      LEFT JOIN submissions_core sc ON sc.mongo_submission_id = r.mongo_submission_id
      WHERE r.id = ANY(${rankingIds})
        AND r.published_at IS NOT NULL
    `;
  }

  const eventSlug = String(input.eventSlug || '').trim();
  const leaderboardType = String(input.leaderboardType || '').trim();
  if (!eventSlug && !leaderboardType) return [];

  return sql`
    SELECT
      r.*,
      au.mongo_user_id,
      ec.mongo_event_id,
      sc.id AS submission_core_id,
      sc.mongo_submission_id
    FROM rankings r
    JOIN app_users au ON au.id = r.runner_user_id
    JOIN events_core ec ON ec.id = r.event_core_id
    LEFT JOIN submissions_core sc ON sc.mongo_submission_id = r.mongo_submission_id
    WHERE r.published_at IS NOT NULL
      AND (${!eventSlug} OR ec.slug = ${eventSlug})
      AND (${!leaderboardType} OR r.leaderboard_type = ${leaderboardType})
  `;
}

function buildRankingContext(ranking) {
  return {
    runnerUserId: ranking.runner_user_id,
    eventCoreId: ranking.event_core_id,
    registrationId: null,
    submissionId: ranking.submission_core_id || null,
    mongoUserId: String(ranking.mongo_user_id || ''),
    mongoEventId: String(ranking.mongo_event_id || ''),
    mongoRegistrationId: '',
    mongoSubmissionId: String(ranking.mongo_submission_id || ranking.mongo_submission_id || ''),
    rankingsStatus: 'published',
    rank: Number(ranking.rank_position || 0),
    rankPosition: Number(ranking.rank_position || 0),
    leaderboardType: ranking.leaderboard_type || '',
    raceDistance: ranking.race_distance || '',
    participationMode: ranking.participation_mode || '',
    distanceKm: Number(ranking.approved_distance_km || 0),
    finishTime: Number(ranking.elapsed_ms || 0),
    rankingId: String(ranking.id || '')
  };
}

async function ensureOrganiserBadgeDefinitions(options = {}) {
  const sql = options.sql || getPostgresClient();
  const createdBy = await resolveAppUserId(options.performedBy, { sql });
  const definitions = [
    {
      badgeCode: 'organiser-verified',
      name: 'Verified Organiser',
      description: 'Awarded after HelloRun approves an organiser account.',
      badgeScope: 'organiser',
      badgeType: 'organiser_verified',
      requirementType: 'organiser_activity',
      requirementValue: { activityType: 'verified_organiser' },
      emailNotificationLevel: 'major',
      points: 25,
      visibilityState: 'revealed',
      isActive: true,
      isAutoCreated: true,
      isRepeatable: false,
      createdBy: createdBy || null
    },
    {
      badgeCode: 'organiser-first-published-event',
      name: 'First Published Event',
      description: 'Awarded when an organiser publishes their first HelloRun event.',
      badgeScope: 'organiser',
      badgeType: 'organiser_published_event',
      requirementType: 'organiser_activity',
      requirementValue: { activityType: 'published_event_count', count: 1 },
      emailNotificationLevel: 'major',
      points: 50,
      visibilityState: 'revealed',
      isActive: true,
      isAutoCreated: true,
      isRepeatable: false,
      createdBy: createdBy || null
    },
    {
      badgeCode: 'organiser-first-confirmed-registration',
      name: 'First Confirmed Registration',
      description: 'Awarded when a published organiser event receives its first confirmed registration.',
      badgeScope: 'organiser',
      badgeType: 'organiser_first_registration',
      requirementType: 'organiser_activity',
      requirementValue: { activityType: 'confirmed_registration_count', count: 1 },
      emailNotificationLevel: 'major',
      points: 60,
      visibilityState: 'revealed',
      isActive: true,
      isAutoCreated: true,
      isRepeatable: false,
      createdBy: createdBy || null
    },
    {
      badgeCode: 'organiser-five-published-events',
      name: 'Event Builder',
      description: 'Awarded when an organiser publishes five HelloRun events.',
      badgeScope: 'organiser',
      badgeType: 'organiser_event_builder',
      requirementType: 'organiser_activity',
      requirementValue: { activityType: 'published_event_count', count: 5 },
      emailNotificationLevel: 'major',
      points: 125,
      visibilityState: 'revealed',
      isActive: true,
      isAutoCreated: true,
      isRepeatable: false,
      createdBy: createdBy || null
    },
    {
      badgeCode: 'organiser-hundred-confirmed-registrations',
      name: 'Community Builder',
      description: 'Awarded when an organiser reaches 100 confirmed registrations across published events.',
      badgeScope: 'organiser',
      badgeType: 'organiser_community_builder',
      requirementType: 'organiser_activity',
      requirementValue: { activityType: 'confirmed_registration_count', count: 100 },
      emailNotificationLevel: 'major',
      points: 250,
      visibilityState: 'revealed',
      isActive: true,
      isAutoCreated: true,
      isRepeatable: false,
      createdBy: createdBy || null
    }
  ];

  const rows = [];
  for (const definition of definitions) {
    const row = await upsertBadgeDefinition(definition, { sql });
    if (row) rows.push(row);
  }
  return rows;
}

async function awardOrganiserBadges({ context, awardedBy, sql }) {
  const badges = await sql`
    SELECT *
    FROM badge_definitions
    WHERE badge_scope = 'organiser'
      AND is_active = TRUE
      AND requirement_type = 'organiser_activity'
    ORDER BY points ASC, badge_code ASC
  `;
  const awarded = [];
  const awardedByAppUserId = await resolveAppUserId(awardedBy, { sql });

  for (const badge of badges) {
    if (!checkBadgeRequirement(badge, context)) continue;
    if (await hasRevokedGlobalBadge({
      runnerUserId: context.runnerUserId,
      badgeDefinitionId: badge.id,
      sql
    })) {
      continue;
    }

    const rows = await sql`
      INSERT INTO user_badges (
        runner_user_id,
        badge_definition_id,
        event_core_id,
        registration_id,
        submission_id,
        mongo_user_id,
        mongo_event_id,
        mongo_registration_id,
        mongo_submission_id,
        verification_status,
        source,
        awarded_by
      )
      VALUES (
        ${context.runnerUserId},
        ${badge.id},
        null,
        null,
        null,
        ${context.mongoUserId},
        '',
        '',
        '',
        'verified',
        'system_auto_award',
        ${awardedByAppUserId || null}
      )
      ON CONFLICT (runner_user_id, badge_definition_id)
      WHERE event_core_id IS NULL AND verification_status != 'revoked'
      DO NOTHING
      RETURNING *
    `;
    const userBadge = rows[0];
    if (!userBadge) continue;

    await logBadgeAudit({
      badgeDefinitionId: badge.id,
      userBadgeId: userBadge.id,
      eventCoreId: null,
      runnerUserId: context.runnerUserId,
      action: 'badge_awarded',
      performedBy: awardedByAppUserId,
      metadata: {
        requirementType: badge.requirement_type,
        mongoUserId: context.mongoUserId,
        organiserStatus: context.organiserStatus,
        publishedEventCount: context.publishedEventCount,
        confirmedRegistrationCount: context.confirmedRegistrationCount
      }
    }, { sql });

    await notifyBadgeEarned(context.mongoUserId, {
      ...badge,
      ...userBadge,
      name: badge.name,
      user_badge_id: userBadge.id
    });
    awarded.push(userBadge);
  }

  return awarded;
}

async function hasRevokedGlobalBadge({ runnerUserId, badgeDefinitionId, sql }) {
  const rows = await sql`
    SELECT id
    FROM user_badges
    WHERE runner_user_id = ${runnerUserId}
      AND badge_definition_id = ${badgeDefinitionId}
      AND event_core_id IS NULL
      AND verification_status = 'revoked'
    LIMIT 1
  `;
  return rows.length > 0;
}

function isEligibleOrganiser(user) {
  return Boolean(
    user &&
    user._id &&
    user.role === 'organiser' &&
    user.organizerStatus === 'approved'
  );
}

function isEligibleEvent(event) {
  return Boolean(
    event &&
    event._id &&
    event.status === 'published' &&
    event.digitalBadgeEnabled === true &&
    event.isDeleted !== true &&
    event.isPersonalRecord !== true
  );
}

async function resolveRegistrationForEvaluation(registrationOrId) {
  if (typeof registrationOrId === 'string') {
    return Registration.findById(registrationOrId);
  }

  if (!registrationOrId?._id) return registrationOrId;

  const hasRequiredFields = registrationOrId.status &&
    registrationOrId.eventId &&
    registrationOrId.userId &&
    registrationOrId.paymentStatus !== undefined;

  if (hasRequiredFields) return registrationOrId;
  return Registration.findById(registrationOrId._id);
}

async function resolveSubmissionForEvaluation(submissionOrId) {
  if (typeof submissionOrId === 'string') {
    return Submission.findById(submissionOrId);
  }

  if (!submissionOrId?._id) return submissionOrId;

  const hasRequiredFields = submissionOrId.status &&
    submissionOrId.registrationId &&
    submissionOrId.eventId;

  if (hasRequiredFields) return submissionOrId;
  return Submission.findById(submissionOrId._id);
}

function normalizeAdminBadgeScope(value) {
  const scope = String(value || '').trim();
  return ['global', 'event', 'challenge', 'organiser'].includes(scope) ? scope : '';
}

function normalizeRecalculationScope(value) {
  const scope = String(value || '').trim();
  return ['all', 'event', 'organiser'].includes(scope) ? scope : 'all';
}

function normalizeBadgeEmailNotificationLevel(value) {
  const level = String(value || '').trim().toLowerCase();
  return ['none', 'major', 'all'].includes(level) ? level : '';
}

function buildEmptyBadgeRecalculationResult(input = {}) {
  const scope = normalizeRecalculationScope(input.scope);
  const limit = clampInt(input.limit, 1, 250, 50);
  return {
    scope,
    limit,
    registrationsProcessed: 0,
    submissionsProcessed: 0,
    organisersProcessed: 0,
    progressRefreshes: 0,
    progressRowsUpdated: 0,
    awardsCreated: 0,
    errors: []
  };
}

function buildEmptyBadgeAnalytics() {
  return {
    totalDefinitions: 0,
    activeDefinitions: 0,
    disabledDefinitions: 0,
    totalAwards: 0,
    verifiedAwards: 0,
    revokedAwards: 0,
    awardedUsers: 0,
    revocationRate: 0,
    byScope: [],
    byType: [],
    topDefinitions: []
  };
}

module.exports = {
  evaluateRegistrationAchievements,
  evaluateSubmissionAchievements,
  evaluateOnsiteResultAchievements,
  evaluatePublishedRankingAchievements,
  evaluateOrganiserAchievements,
  evaluateRegistrationAchievementsInBackground,
  evaluateSubmissionAchievementsInBackground,
  evaluateOrganiserAchievementsInBackground,
  getRunnerEarnedBadges,
  getRunnerPointsSummary,
  getPublicBadgeVerification,
  setFeaturedRunnerBadge,
  listBadgeDefinitions,
  listAdminUserBadges,
  getAdminBadgeAnalytics,
  revokeUserBadge,
  updateBadgeDefinitionStatus,
  updateBadgeDefinitionEmailLevel,
  recalculateBadgeAwards,
  checkBadgeRequirement,
  hasRevokedBadge,
  resolveRegistrationForEvaluation,
  resolveSubmissionForEvaluation,
  resolveOnsiteResultForEvaluation,
  ensureOrganiserBadgeDefinitions
};

function clampInt(value, min, max, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));
}

function getBadgeEvidenceLabel(row = {}) {
  const requirementType = String(row.requirement_type || '');
  if (requirementType === 'registration_confirmed') return 'Confirmed event registration';
  if (requirementType === 'result_approved') return 'Approved event result';
  if (requirementType === 'distance_completed') return 'Approved result for the required distance';
  if (requirementType === 'mode_completed') return 'Approved result in the required participation mode';
  if (requirementType === 'challenge_progress') return 'Verified accumulated challenge distance';
  if (requirementType === 'global_distance') return 'Verified lifetime HelloRun distance';
  return 'Verified HelloRun achievement';
}
