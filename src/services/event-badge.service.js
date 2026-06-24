const Event = require('../models/Event');
const logger = require('../utils/logger');
const User = require('../models/User');
const BadgeContent = require('../models/BadgeContent');
const { getPostgresClient } = require('../db/postgres');
const { syncAppUserFromMongoUser } = require('./user-bridge.service');
const { syncEventShadow } = require('./event-shadow.service');
const { upsertBadgeDefinition } = require('./badge-definition.service');
const { logBadgeAudit } = require('./badge-audit.service');
const { normalizeBadgeDistanceLabel } = require('../utils/badge-normalization');

async function generateDefaultEventBadges(eventOrId, options = {}) {
  if (!process.env.DATABASE_URL) return [];

  const event = typeof eventOrId === 'string'
    ? await Event.findById(eventOrId)
    : eventOrId;
  if (!isEligibleForEventBadges(event)) return [];

  const sql = options.sql || getPostgresClient();
  const actorAppUserId = await resolveAppUserId(options.performedBy || event.approvedBy, { sql });
  const eventCore = await resolveEventCore(event, { sql });
  if (!eventCore?.id) return [];

  // Check which badge_codes already exist for this event so we only create new ones.
  // This allows re-running after new race categories are added without duplicating existing badges.
  const existingRows = await sql`
    SELECT bd.badge_code
    FROM event_badges eb
    JOIN badge_definitions bd ON bd.id = eb.badge_definition_id
    WHERE eb.event_core_id = ${eventCore.id}
  `;
  const existingBadgeCodes = new Set(existingRows.map((row) => row.badge_code));

  const logoFallback = String(event.logoUrl || '').trim() || null;
  const payloads = buildDefaultEventBadges(event)
    .filter((payload) => !existingBadgeCodes.has(payload.badgeCode))
    .map((payload) => ({ ...payload, createdBy: actorAppUserId }));

  if (!payloads.length) return [];

  const created = [];
  await sql.begin(async (tx) => {
    for (const payload of payloads) {
      const definition = await upsertBadgeDefinition(payload, { sql: tx });
      if (!definition) continue;

      const eventBadgeRows = await tx`
        INSERT INTO event_badges (
          event_core_id,
          mongo_event_id,
          badge_definition_id,
          badge_image_url,
          is_visible_on_event_page,
          is_active
        )
        VALUES (
          ${eventCore.id},
          ${String(event._id)},
          ${definition.id},
          ${logoFallback},
          TRUE,
          TRUE
        )
        ON CONFLICT (event_core_id, badge_definition_id)
        DO UPDATE SET
          mongo_event_id = EXCLUDED.mongo_event_id,
          is_active = TRUE
        RETURNING *
      `;

      const eventBadge = eventBadgeRows[0];
      created.push({ definition, eventBadge, payload });
      await upsertBadgeContent({
        definition,
        eventBadge,
        event,
        payload
      });
    }

    await logBadgeAudit({
      eventCoreId: eventCore.id,
      action: 'event_badges_auto_created',
      performedBy: actorAppUserId,
      metadata: {
        mongoEventId: String(event._id),
        badgeCount: created.length
      }
    }, { sql: tx });
  });

  return created;
}

function generateDefaultEventBadgesInBackground(eventOrId, options = {}) {
  generateDefaultEventBadges(eventOrId, options).catch((error) => {
    logger.error('Event badge generation failed:', {
      eventId: String(eventOrId?._id || eventOrId || ''),
      error: error.message
    });
  });
}

async function getEventBadgesByMongoEventId(mongoEventId, options = {}) {
  if (!process.env.DATABASE_URL) return [];

  const sql = options.sql || getPostgresClient();
  const includeHidden = options.includeHidden === true;
  const includeInactive = options.includeInactive === true;
  const includeInactiveDefinitions = options.includeInactiveDefinitions === true;

  if (includeHidden || includeInactive || includeInactiveDefinitions) {
    const rows = await sql`
      SELECT
        eb.id AS event_badge_id,
        eb.event_core_id,
        eb.mongo_event_id,
        eb.badge_name_override,
        eb.badge_description_override,
        eb.badge_image_url,
        eb.is_visible_on_event_page,
        eb.is_active AS event_badge_is_active,
        bd.id AS badge_definition_id,
        bd.badge_code,
        bd.name,
        bd.description,
        bd.badge_type,
        bd.requirement_type,
        bd.requirement_value,
        bd.image_url AS definition_image_url,
        bd.is_active AS badge_definition_is_active
      FROM event_badges eb
      JOIN badge_definitions bd ON bd.id = eb.badge_definition_id
      WHERE eb.mongo_event_id = ${String(mongoEventId)}
      ORDER BY
        CASE bd.badge_type
          WHEN 'participant' THEN 1
          WHEN 'finisher' THEN 2
          WHEN 'distance_finisher' THEN 3
          WHEN 'mode_finisher' THEN 4
          ELSE 99
        END,
        bd.name ASC
    `;

    return rows
      .filter((row) => includeInactive || row.event_badge_is_active === true)
      .filter((row) => includeHidden || row.is_visible_on_event_page === true)
      .filter((row) => includeInactiveDefinitions || row.badge_definition_is_active === true)
      .map(formatEventBadgeRow);
  }

  const rows = await sql`
    SELECT
      eb.id AS event_badge_id,
      eb.event_core_id,
      eb.mongo_event_id,
      eb.badge_name_override,
      eb.badge_description_override,
      eb.badge_image_url,
      eb.is_visible_on_event_page,
      eb.is_active AS event_badge_is_active,
      bd.id AS badge_definition_id,
      bd.badge_code,
      bd.name,
      bd.description,
      bd.badge_type,
      bd.requirement_type,
      bd.requirement_value,
      bd.is_active AS badge_definition_is_active
    FROM event_badges eb
    JOIN badge_definitions bd ON bd.id = eb.badge_definition_id
    WHERE eb.mongo_event_id = ${String(mongoEventId)}
      AND eb.is_active = TRUE
      AND eb.is_visible_on_event_page = TRUE
      AND bd.is_active = TRUE
    ORDER BY
      CASE bd.badge_type
        WHEN 'participant' THEN 1
        WHEN 'finisher' THEN 2
        WHEN 'distance_finisher' THEN 3
        WHEN 'mode_finisher' THEN 4
        ELSE 99
      END,
      bd.name ASC
  `;

  return rows.map(formatEventBadgeRow);
}

async function updateEventBadgeDisplay({ mongoEventId, eventBadgeId, updates = {} }, options = {}) {
  if (!process.env.DATABASE_URL) return null;

  const sql = options.sql || getPostgresClient();
  const rows = await sql`
    UPDATE event_badges
    SET
      badge_name_override = ${stringOrNull(updates.name)},
      badge_description_override = ${stringOrNull(updates.description)},
      badge_image_url = ${stringOrNull(updates.imageUrl)},
      is_visible_on_event_page = ${updates.isVisible !== false},
      is_active = ${updates.isActive !== false}
    WHERE id = ${String(eventBadgeId)}
      AND mongo_event_id = ${String(mongoEventId)}
    RETURNING *
  `;

  return rows[0] || null;
}

function buildDefaultEventBadges(event) {
  const slug = slugify(event.slug || event.title || event._id);
  const title = String(event.title || 'Event').trim();
  const badges = [
    {
      badgeCode: `${slug}-participant`,
      name: `${title} Participant`,
      description: `Awarded for joining ${title}.`,
      badgeScope: 'event',
      badgeType: 'participant',
      requirementType: 'registration_confirmed',
      requirementValue: null,
      visibilityState: 'revealed',
      isAutoCreated: true
    },
    {
      badgeCode: `${slug}-finisher`,
      name: `${title} Finisher`,
      description: `Awarded for completing ${title}.`,
      badgeScope: 'event',
      badgeType: 'finisher',
      requirementType: 'result_approved',
      requirementValue: null,
      visibilityState: 'revealed',
      isAutoCreated: true
    }
  ];

  for (const distanceLabel of getRaceDistances(event)) {
    badges.push({
      badgeCode: `${slug}-${slugify(distanceLabel)}-finisher`,
      name: `${title} ${distanceLabel} Finisher`,
      description: `Awarded for completing the ${distanceLabel} category of ${title}.`,
      badgeScope: 'event',
      badgeType: 'distance_finisher',
      requirementType: 'distance_completed',
      requirementValue: { raceDistance: distanceLabel },
      visibilityState: 'revealed',
      isAutoCreated: true
    });
  }

  for (const mode of getAllowedParticipationModes(event)) {
    badges.push({
      badgeCode: `${slug}-${mode}-finisher`,
      name: `${title} ${capitalize(mode)} Finisher`,
      description: `Awarded for completing ${title} as a ${mode} participant.`,
      badgeScope: 'event',
      badgeType: 'mode_finisher',
      requirementType: 'mode_completed',
      requirementValue: { mode },
      visibilityState: 'revealed',
      isAutoCreated: true
    });
  }

  if (isAccumulatedChallenge(event)) {
    for (const milestone of buildChallengeMilestones(event.targetDistanceKm)) {
      badges.push({
        badgeCode: `${slug}-challenge-${milestone.percent}`,
        name: milestone.percent === 100
          ? `${title} Challenge Finisher`
          : `${title} ${milestone.percent}% Complete`,
        description: milestone.percent === 100
          ? `Awarded for completing the ${milestone.targetDistanceKm}K challenge goal for ${title}.`
          : `Awarded for reaching ${milestone.percent}% of the ${title} challenge goal.`,
        badgeScope: 'challenge',
        badgeType: milestone.percent === 100 ? 'challenge_finisher' : 'challenge_progress',
        requirementType: 'challenge_progress',
        requirementValue: {
          percent: milestone.percent,
          targetDistanceKm: milestone.targetDistanceKm
        },
        emailNotificationLevel: milestone.percent === 100 ? 'major' : 'none',
        visibilityState: 'revealed',
        isAutoCreated: true
      });
    }
  }

  if (event.leaderboardRecognitionEnabled === true) {
    for (const rank of [1, 3, 10]) {
      badges.push({
        badgeCode: `${slug}-top-${rank}`,
        name: `${title} Top ${rank} Finisher`,
        description: `Awarded for placing in the top ${rank} of a published ${title} leaderboard.`,
        badgeScope: 'event',
        badgeType: rank === 1 ? 'category_winner' : 'top_rank',
        requirementType: 'rank_achieved',
        requirementValue: { rank },
        emailNotificationLevel: rank === 1 ? 'major' : 'none',
        visibilityState: 'revealed',
        isAutoCreated: true
      });
    }

    for (const distanceLabel of getRaceDistances(event)) {
      badges.push({
        badgeCode: `${slug}-${slugify(distanceLabel)}-winner`,
        name: `${title} ${distanceLabel} Winner`,
        description: `Awarded for ranking first in the ${distanceLabel} category of a published ${title} leaderboard.`,
        badgeScope: 'event',
        badgeType: 'distance_winner',
        requirementType: 'rank_achieved',
        requirementValue: {
          rank: 1,
          raceDistance: distanceLabel
        },
        emailNotificationLevel: 'major',
        visibilityState: 'revealed',
        isAutoCreated: true
      });
    }

    for (const mode of getAllowedParticipationModes(event)) {
      badges.push({
        badgeCode: `${slug}-${mode}-winner`,
        name: `${title} ${capitalize(mode)} Winner`,
        description: `Awarded for ranking first among ${mode} participants on a published ${title} leaderboard.`,
        badgeScope: 'event',
        badgeType: 'mode_winner',
        requirementType: 'rank_achieved',
        requirementValue: {
          rank: 1,
          mode
        },
        emailNotificationLevel: 'major',
        visibilityState: 'revealed',
        isAutoCreated: true
      });
    }
  }

  return badges;
}

function isEligibleForEventBadges(event) {
  return Boolean(
    event &&
    event._id &&
    event.status === 'published' &&
    event.digitalBadgeEnabled === true &&
    event.isDeleted !== true &&
    event.isPersonalRecord !== true
  );
}

async function resolveEventCore(event, options = {}) {
  const sql = options.sql || getPostgresClient();
  let rows = await sql`
    SELECT id, mongo_event_id FROM events_core WHERE mongo_event_id = ${String(event._id)} LIMIT 1
  `;
  if (rows[0]) return rows[0];

  await syncEventShadow(event, { sql, operation: 'live_sync' });
  rows = await sql`
    SELECT id, mongo_event_id FROM events_core WHERE mongo_event_id = ${String(event._id)} LIMIT 1
  `;
  return rows[0] || null;
}

async function resolveAppUserId(mongoUserId, options = {}) {
  const safeId = String(mongoUserId || '').trim();
  if (!safeId) return null;

  const sql = options.sql || getPostgresClient();
  const existing = await sql`
    SELECT id FROM app_users WHERE mongo_user_id = ${safeId} LIMIT 1
  `;
  if (existing[0]) return existing[0].id;

  const user = await User.findById(safeId).select('_id email role firstName lastName').lean();
  if (!user) return null;
  const appUser = await syncAppUserFromMongoUser(user, { sql, operation: 'live_sync' });
  return appUser?.id || null;
}

async function upsertBadgeContent({ definition, eventBadge, event, payload }) {
  await BadgeContent.updateOne(
    {
      badgeDefinitionId: String(definition.id),
      eventCoreId: String(eventBadge.event_core_id)
    },
    {
      $set: {
        badgeDefinitionId: String(definition.id),
        eventCoreId: String(eventBadge.event_core_id),
        mongoEventId: String(event._id),
        displayTitle: payload.name,
        displayDescription: payload.description,
        theme: 'event',
        rarity: 'common',
        unlockMessage: buildUnlockMessage(payload, event),
        metadata: {
          badgeType: payload.badgeType,
          requirementType: payload.requirementType,
          requirementValue: payload.requirementValue || null
        }
      }
    },
    { upsert: true }
  );
}

function buildUnlockMessage(payload, event) {
  if (payload.badgeType === 'participant') return `You joined ${event.title}.`;
  if (payload.badgeType === 'distance_finisher') {
    return `You completed the ${payload.requirementValue?.raceDistance || 'selected'} category.`;
  }
  if (payload.badgeType === 'mode_finisher') {
    return `You completed ${event.title} as a ${payload.requirementValue?.mode || 'registered'} participant.`;
  }
  return `You completed ${event.title}.`;
}

function formatEventBadgeRow(row) {
  return {
    eventBadgeId: String(row.event_badge_id || ''),
    badgeDefinitionId: String(row.badge_definition_id || ''),
    badgeCode: row.badge_code || '',
    name: row.badge_name_override || row.name || '',
    description: row.badge_description_override || row.description || '',
    imageUrl: row.badge_image_url || row.definition_image_url || '',
    badgeType: row.badge_type || '',
    requirementType: row.requirement_type || '',
    requirementValue: row.requirement_value || null,
    isVisibleOnEventPage: row.is_visible_on_event_page !== false,
    isActive: row.event_badge_is_active !== false,
    isDefinitionActive: row.badge_definition_is_active !== false,
    eventCoreId: String(row.event_core_id || ''),
    mongoEventId: row.mongo_event_id || ''
  };
}

function getAllowedParticipationModes(event) {
  const allowed = Array.isArray(event.eventTypesAllowed) ? event.eventTypesAllowed : [];
  const modes = new Set(allowed.filter((mode) => mode === 'virtual' || mode === 'onsite'));

  if (!modes.size) {
    if (event.eventType === 'virtual') modes.add('virtual');
    if (event.eventType === 'onsite') modes.add('onsite');
    if (event.eventType === 'hybrid') {
      modes.add('virtual');
      modes.add('onsite');
    }
  }

  return Array.from(modes);
}

function getRaceDistances(event) {
  return Array.from(new Set(
    (Array.isArray(event.raceDistances) ? event.raceDistances : [])
      .map((item) => normalizeBadgeDistanceLabel(item))
      .filter(Boolean)
  ));
}

function isAccumulatedChallenge(event) {
  return event?.virtualCompletionMode === 'accumulated_distance' &&
    Number(event.targetDistanceKm || 0) > 0;
}

function buildChallengeMilestones(targetDistanceKm) {
  const target = Number(targetDistanceKm || 0);
  if (!Number.isFinite(target) || target <= 0) return [];
  return [25, 50, 75, 100].map((percent) => ({
    percent,
    targetDistanceKm: Number(((target * percent) / 100).toFixed(2))
  }));
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'event';
}

function capitalize(value) {
  const safe = String(value || '').trim();
  return safe ? safe.charAt(0).toUpperCase() + safe.slice(1) : '';
}

module.exports = {
  generateDefaultEventBadges,
  generateDefaultEventBadgesInBackground,
  getEventBadgesByMongoEventId,
  updateEventBadgeDisplay,
  buildDefaultEventBadges,
  isEligibleForEventBadges,
  buildChallengeMilestones,
  resolveAppUserId,
  resolveEventCore
};

function stringOrNull(value) {
  const safe = String(value || '').trim();
  return safe || null;
}
