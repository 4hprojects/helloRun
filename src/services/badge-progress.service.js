const Event = require('../models/Event');
const Registration = require('../models/Registration');
const Submission = require('../models/Submission');
const AccumulatedActivitySubmission = require('../models/AccumulatedActivitySubmission');
const mongoose = require('mongoose');
const { getPostgresClient } = require('../db/postgres');
const { syncRegistrationPaymentShadow } = require('./registration-payment-shadow.service');
const {
  findActiveEventBadgeDefinitions,
  findActiveGlobalBadgeDefinitions,
  upsertBadgeDefinition
} = require('./badge-definition.service');
const { logBadgeAudit } = require('./badge-audit.service');
const { notifyBadgeEarned } = require('./badge-notification.service');
const {
  generateDefaultEventBadges,
  resolveAppUserId,
  resolveEventCore
} = require('./event-badge.service');
const { checkBadgeRequirement, hasRevokedBadge } = require('./achievement.service');

const GLOBAL_DISTANCE_MILESTONES_KM = [5, 50, 100, 500, 1000];

async function refreshAccumulatedChallengeProgress(registrationOrId, options = {}) {
  if (!process.env.DATABASE_URL) return null;

  const registration = await resolveRegistration(registrationOrId);
  if (!registration?._id || registration.status !== 'confirmed') return null;

  const event = await Event.findById(registration.eventId);
  if (!isEligibleChallengeEvent(event)) return null;

  const sql = options.sql || getPostgresClient();
  await generateDefaultEventBadges(event, {
    performedBy: options.performedBy || event.approvedBy || event.organizerId,
    sql
  });

  const context = await buildProgressContext({ registration, event, sql });
  if (!context) return null;

  const progressRows = await upsertChallengeProgressRows(context, { sql });
  const awards = await awardCompletedChallengeBadges(context, {
    sql,
    performedBy: options.performedBy || null
  });

  return {
    progressRows,
    awards,
    currentValue: context.currentValue,
    targetValue: context.eventTargetDistanceKm,
    progressPercent: context.eventProgressPercent
  };
}

async function getRunnerBadgeProgress(mongoUserId, options = {}) {
  if (!process.env.DATABASE_URL) return [];

  const sql = options.sql || getPostgresClient();
  const limit = clampInt(options.limit, 1, 100, 30);
  const rows = await sql`
    SELECT
      bp.id AS badge_progress_id,
      bp.current_value,
      bp.target_value,
      bp.progress_percent,
      bp.last_calculated_at,
      bp.event_core_id,
      bp.mongo_event_id,
      bd.id AS badge_definition_id,
      bd.badge_code,
      bd.name,
      bd.description,
      bd.badge_type,
      bd.requirement_type,
      eb.badge_name_override,
      eb.badge_description_override,
      eb.badge_image_url
    FROM badge_progress bp
    JOIN badge_definitions bd ON bd.id = bp.badge_definition_id
    LEFT JOIN event_badges eb
      ON eb.event_core_id = bp.event_core_id
      AND eb.badge_definition_id = bp.badge_definition_id
    WHERE bp.mongo_user_id = ${String(mongoUserId)}
    ORDER BY bp.last_calculated_at DESC, bp.progress_percent DESC
    LIMIT ${limit}
  `;

  return rows.map((row) => ({
    badgeProgressId: String(row.badge_progress_id || ''),
    badgeDefinitionId: String(row.badge_definition_id || ''),
    badgeCode: row.badge_code || '',
    name: row.badge_name_override || row.name || '',
    description: row.badge_description_override || row.description || '',
    imageUrl: row.badge_image_url || '',
    badgeType: row.badge_type || '',
    requirementType: row.requirement_type || '',
    eventCoreId: String(row.event_core_id || ''),
    mongoEventId: row.mongo_event_id || '',
    currentValue: Number(row.current_value || 0),
    targetValue: Number(row.target_value || 0),
    progressPercent: Number(row.progress_percent || 0),
    lastCalculatedAt: row.last_calculated_at || null
  }));
}

async function refreshGlobalDistanceMilestoneProgress(mongoUserId, options = {}) {
  if (!process.env.DATABASE_URL) return null;

  const safeMongoUserId = String(mongoUserId || '').trim();
  if (!safeMongoUserId) return null;

  const sql = options.sql || getPostgresClient();
  const runnerUserId = await resolveAppUserId(safeMongoUserId, { sql });
  if (!runnerUserId) return null;

  await ensureGlobalDistanceMilestoneBadges({ sql });
  const currentValue = await sumApprovedLifetimeDistanceKm(safeMongoUserId);
  const context = {
    runnerUserId,
    eventCoreId: null,
    registrationId: null,
    submissionId: null,
    mongoUserId: safeMongoUserId,
    mongoEventId: '',
    mongoRegistrationId: '',
    mongoSubmissionId: '',
    currentValue,
    approvedDistanceKm: currentValue,
    resultStatus: currentValue > 0 ? 'approved' : ''
  };

  const progressRows = await upsertGlobalDistanceProgressRows(context, { sql });
  const awards = await awardCompletedGlobalDistanceBadges(context, {
    sql,
    performedBy: options.performedBy || null
  });

  return { progressRows, awards, currentValue };
}

function refreshGlobalDistanceMilestoneProgressInBackground(mongoUserId, options = {}) {
  refreshGlobalDistanceMilestoneProgress(mongoUserId, options).catch((error) => {
    console.error('Global distance badge progress refresh failed:', {
      mongoUserId: String(mongoUserId || ''),
      error: error.message
    });
  });
}

async function buildProgressContext({ registration, event, sql }) {
  const [eventCore, runnerUserId, approvedDistanceKm] = await Promise.all([
    resolveEventCore(event, { sql }),
    resolveAppUserId(registration.userId, { sql }),
    sumApprovedDistanceKm(registration._id)
  ]);
  if (!eventCore?.id || !runnerUserId) return null;

  let registrationRow = await findRegistrationRow(registration._id, { sql });
  if (!registrationRow) {
    await syncRegistrationPaymentShadow(registration, { sql, operation: 'live_sync' });
    registrationRow = await findRegistrationRow(registration._id, { sql });
  }
  if (!registrationRow?.id) return null;

  const eventTargetDistanceKm = Number(event.targetDistanceKm || 0);
  const eventProgressPercent = calculateProgressPercent(approvedDistanceKm, eventTargetDistanceKm);

  return {
    runnerUserId,
    eventCoreId: eventCore.id,
    registrationId: registrationRow.id,
    submissionId: null,
    mongoUserId: String(registration.userId),
    mongoEventId: String(registration.eventId),
    mongoRegistrationId: String(registration._id),
    mongoSubmissionId: '',
    currentValue: approvedDistanceKm,
    approvedDistanceKm,
    eventTargetDistanceKm,
    eventProgressPercent,
    resultStatus: approvedDistanceKm > 0 ? 'approved' : ''
  };
}

async function upsertChallengeProgressRows(context, options = {}) {
  const sql = options.sql || getPostgresClient();
  const badges = await findActiveEventBadgeDefinitions(context.eventCoreId, ['challenge_progress'], { sql });
  const rows = [];

  for (const badge of badges) {
    const targetValue = Number(badge.requirement_value?.targetDistanceKm || 0);
    if (!targetValue || targetValue <= 0) continue;
    const progressPercent = calculateProgressPercent(context.currentValue, targetValue);
    const result = await sql`
      INSERT INTO badge_progress (
        runner_user_id,
        badge_definition_id,
        event_core_id,
        registration_id,
        mongo_user_id,
        mongo_event_id,
        mongo_registration_id,
        current_value,
        target_value,
        progress_percent,
        last_calculated_at
      )
      VALUES (
        ${context.runnerUserId},
        ${badge.id},
        ${context.eventCoreId},
        ${context.registrationId},
        ${context.mongoUserId},
        ${context.mongoEventId},
        ${context.mongoRegistrationId},
        ${context.currentValue},
        ${targetValue},
        ${progressPercent},
        NOW()
      )
      ON CONFLICT (runner_user_id, badge_definition_id, event_core_id)
      DO UPDATE SET
        registration_id = EXCLUDED.registration_id,
        mongo_user_id = EXCLUDED.mongo_user_id,
        mongo_event_id = EXCLUDED.mongo_event_id,
        mongo_registration_id = EXCLUDED.mongo_registration_id,
        current_value = EXCLUDED.current_value,
        target_value = EXCLUDED.target_value,
        progress_percent = EXCLUDED.progress_percent,
        last_calculated_at = NOW()
      RETURNING *
    `;
    if (result[0]) rows.push(result[0]);
  }

  return rows;
}

async function upsertGlobalDistanceProgressRows(context, options = {}) {
  const sql = options.sql || getPostgresClient();
  const badges = await findActiveGlobalBadgeDefinitions(['global_distance'], { sql });
  const rows = [];

  for (const badge of badges) {
    const targetValue = Number(badge.requirement_value?.distanceKm || 0);
    if (!targetValue || targetValue <= 0) continue;
    const progressPercent = calculateProgressPercent(context.currentValue, targetValue);
    const result = await sql`
      INSERT INTO badge_progress (
        runner_user_id,
        badge_definition_id,
        event_core_id,
        registration_id,
        mongo_user_id,
        mongo_event_id,
        mongo_registration_id,
        current_value,
        target_value,
        progress_percent,
        last_calculated_at
      )
      VALUES (
        ${context.runnerUserId},
        ${badge.id},
        null,
        null,
        ${context.mongoUserId},
        '',
        '',
        ${context.currentValue},
        ${targetValue},
        ${progressPercent},
        NOW()
      )
      ON CONFLICT (runner_user_id, badge_definition_id)
      WHERE event_core_id IS NULL
      DO UPDATE SET
        mongo_user_id = EXCLUDED.mongo_user_id,
        current_value = EXCLUDED.current_value,
        target_value = EXCLUDED.target_value,
        progress_percent = EXCLUDED.progress_percent,
        last_calculated_at = NOW()
      RETURNING *
    `;
    if (result[0]) rows.push(result[0]);
  }

  return rows;
}

async function awardCompletedChallengeBadges(context, options = {}) {
  const sql = options.sql || getPostgresClient();
  const badges = await findActiveEventBadgeDefinitions(context.eventCoreId, ['challenge_progress'], { sql });
  const awarded = [];
  const awardedByAppUserId = await resolveAppUserId(options.performedBy, { sql });

  for (const badge of badges) {
    if (!checkBadgeRequirement(badge, context)) continue;
    if (await hasRevokedBadge({
      runnerUserId: context.runnerUserId,
      badgeDefinitionId: badge.id,
      eventCoreId: context.eventCoreId,
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
        ${context.eventCoreId},
        ${context.registrationId},
        null,
        ${context.mongoUserId},
        ${context.mongoEventId},
        ${context.mongoRegistrationId},
        '',
        'verified',
        'system_auto_award',
        ${awardedByAppUserId || null}
      )
      ON CONFLICT (runner_user_id, badge_definition_id, event_core_id)
      WHERE verification_status != 'revoked'
      DO NOTHING
      RETURNING *
    `;

    const userBadge = rows[0];
    if (!userBadge) continue;

    await logBadgeAudit({
      badgeDefinitionId: badge.id,
      userBadgeId: userBadge.id,
      eventCoreId: context.eventCoreId,
      runnerUserId: context.runnerUserId,
      action: 'badge_awarded',
      performedBy: awardedByAppUserId,
      metadata: {
        requirementType: badge.requirement_type,
        currentValue: context.currentValue,
        targetValue: badge.requirement_value?.targetDistanceKm || 0,
        mongoUserId: context.mongoUserId,
        mongoEventId: context.mongoEventId,
        mongoRegistrationId: context.mongoRegistrationId
      }
    }, { sql });

    await notifyBadgeEarned(context.mongoUserId, {
      ...badge,
      ...userBadge,
      name: badge.badge_name_override || badge.name,
      user_badge_id: userBadge.id
    });
    awarded.push(userBadge);
  }

  return awarded;
}

async function awardCompletedGlobalDistanceBadges(context, options = {}) {
  const sql = options.sql || getPostgresClient();
  const badges = await findActiveGlobalBadgeDefinitions(['global_distance'], { sql });
  const awarded = [];
  const awardedByAppUserId = await resolveAppUserId(options.performedBy, { sql });

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
        currentValue: context.currentValue,
        targetValue: badge.requirement_value?.distanceKm || 0,
        mongoUserId: context.mongoUserId
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

async function ensureGlobalDistanceMilestoneBadges(options = {}) {
  const sql = options.sql || getPostgresClient();
  const createdBy = await resolveAppUserId(options.performedBy, { sql });
  const definitions = [];

  for (const distanceKm of GLOBAL_DISTANCE_MILESTONES_KM) {
    const name = distanceKm === 5 ? 'First 5K' : `${distanceKm}K Club`;
    const definition = await upsertBadgeDefinition({
      badgeCode: `global-distance-${distanceKm}k`,
      name,
      description: `Awarded after completing ${distanceKm} km of verified HelloRun activity.`,
      badgeScope: 'global',
      badgeType: 'global_distance',
      requirementType: 'global_distance',
      requirementValue: { distanceKm },
      emailNotificationLevel: distanceKm >= 100 ? 'major' : 'none',
      points: distanceKm,
      visibilityState: 'revealed',
      isActive: true,
      isAutoCreated: true,
      isRepeatable: false,
      createdBy: createdBy || null
    }, { sql });
    if (definition) definitions.push(definition);
  }

  return definitions;
}

async function sumApprovedDistanceKm(registrationId) {
  const rows = await AccumulatedActivitySubmission.aggregate([
    {
      $match: {
        registrationId: registrationId,
        status: 'approved'
      }
    },
    {
      $group: {
        _id: '$registrationId',
        distanceKm: { $sum: '$distanceKm' }
      }
    }
  ]);
  return Number(rows[0]?.distanceKm || 0);
}

async function sumApprovedLifetimeDistanceKm(mongoUserId) {
  const runnerId = mongoose.Types.ObjectId.isValid(String(mongoUserId))
    ? new mongoose.Types.ObjectId(String(mongoUserId))
    : mongoUserId;
  const [submissionRows, activityRows] = await Promise.all([
    Submission.aggregate([
      {
        $match: {
          runnerId,
          status: 'approved',
          isPersonalRecord: { $ne: true }
        }
      },
      {
        $group: {
          _id: '$runnerId',
          distanceKm: { $sum: '$distanceKm' }
        }
      }
    ]),
    AccumulatedActivitySubmission.aggregate([
      {
        $match: {
          runnerId,
          status: 'approved',
          isPersonalRecord: { $ne: true }
        }
      },
      {
        $group: {
          _id: '$runnerId',
          distanceKm: { $sum: '$distanceKm' }
        }
      }
    ])
  ]);

  return Number(submissionRows[0]?.distanceKm || 0) + Number(activityRows[0]?.distanceKm || 0);
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

async function findRegistrationRow(registrationId, options = {}) {
  const sql = options.sql || getPostgresClient();
  const rows = await sql`
    SELECT id FROM registrations WHERE mongo_registration_id = ${String(registrationId)} LIMIT 1
  `;
  return rows[0] || null;
}

async function resolveRegistration(registrationOrId) {
  if (typeof registrationOrId === 'string') {
    return Registration.findById(registrationOrId);
  }
  if (!registrationOrId?._id) return registrationOrId;
  if (registrationOrId.status && registrationOrId.eventId && registrationOrId.userId) {
    return registrationOrId;
  }
  return Registration.findById(registrationOrId._id);
}

function isEligibleChallengeEvent(event) {
  return Boolean(
    event &&
    event._id &&
    event.status === 'published' &&
    event.digitalBadgeEnabled === true &&
    event.virtualCompletionMode === 'accumulated_distance' &&
    Number(event.targetDistanceKm || 0) > 0 &&
    event.isDeleted !== true &&
    event.isPersonalRecord !== true
  );
}

function calculateProgressPercent(currentValue, targetValue) {
  const current = Number(currentValue || 0);
  const target = Number(targetValue || 0);
  if (!Number.isFinite(current) || !Number.isFinite(target) || target <= 0) return 0;
  return Math.min(100, Number(((current / target) * 100).toFixed(2)));
}

async function getRunnerNextMilestones(mongoUserId, options = {}) {
  if (!process.env.DATABASE_URL) return { nextGlobalMilestone: null, challengesInProgress: [] };

  const sql = options.sql || getPostgresClient();
  const [currentKm, progressRows] = await Promise.all([
    sumApprovedLifetimeDistanceKm(mongoUserId).catch(() => 0),
    sql`
      SELECT
        bp.id AS badge_progress_id,
        bp.current_value,
        bp.target_value,
        bp.progress_percent,
        bp.last_calculated_at,
        bd.name,
        bd.badge_type
      FROM badge_progress bp
      JOIN badge_definitions bd ON bd.id = bp.badge_definition_id
      WHERE bp.mongo_user_id = ${String(mongoUserId)}
        AND bp.progress_percent < 100
        AND bd.badge_scope = 'challenge'
      ORDER BY bp.progress_percent DESC
      LIMIT 10
    `.catch(() => [])
  ]);

  const nextMilestoneKm = GLOBAL_DISTANCE_MILESTONES_KM.find((km) => currentKm < km) || null;
  const nextGlobalMilestone = nextMilestoneKm
    ? {
        distanceKm: nextMilestoneKm,
        currentKm: Number(currentKm),
        progressPercent: Math.min(99, Math.round((currentKm / nextMilestoneKm) * 100))
      }
    : null;

  const challengesInProgress = progressRows.map((row) => ({
    badgeProgressId: String(row.badge_progress_id || ''),
    name: row.name || '',
    badgeType: row.badge_type || '',
    currentValue: Number(row.current_value || 0),
    targetValue: Number(row.target_value || 0),
    progressPercent: Number(row.progress_percent || 0),
    lastCalculatedAt: row.last_calculated_at || null
  }));

  return { nextGlobalMilestone, challengesInProgress };
}

function clampInt(value, min, max, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

module.exports = {
  refreshAccumulatedChallengeProgress,
  refreshGlobalDistanceMilestoneProgress,
  refreshGlobalDistanceMilestoneProgressInBackground,
  ensureGlobalDistanceMilestoneBadges,
  sumApprovedLifetimeDistanceKm,
  GLOBAL_DISTANCE_MILESTONES_KM,
  getRunnerBadgeProgress,
  getRunnerNextMilestones,
  calculateProgressPercent,
  isEligibleChallengeEvent
};
