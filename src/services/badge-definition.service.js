const { getPostgresClient } = require('../db/postgres');

async function upsertBadgeDefinition(payload = {}, options = {}) {
  const sql = options.sql || getPostgresClient();
  const rows = await sql`
    INSERT INTO badge_definitions (
      badge_code,
      name,
      description,
      badge_scope,
      badge_type,
      requirement_type,
      requirement_value,
      points,
      visibility_state,
      email_notification_level,
      is_active,
      is_auto_created,
      is_repeatable,
      created_by
    )
    VALUES (
      ${String(payload.badgeCode || '').trim()},
      ${String(payload.name || '').trim()},
      ${String(payload.description || '').trim()},
      ${String(payload.badgeScope || 'event').trim()},
      ${String(payload.badgeType || '').trim()},
      ${String(payload.requirementType || '').trim()},
      ${payload.requirementValue || null},
      ${Number(payload.points || 0)},
      ${String(payload.visibilityState || 'revealed').trim()},
      ${normalizeEmailNotificationLevel(payload.emailNotificationLevel)},
      ${payload.isActive !== false},
      ${payload.isAutoCreated === true},
      ${payload.isRepeatable === true},
      ${payload.createdBy || null}
    )
    ON CONFLICT (badge_code)
    DO UPDATE SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      requirement_value = EXCLUDED.requirement_value,
      email_notification_level = EXCLUDED.email_notification_level,
      is_active = EXCLUDED.is_active
    RETURNING *
  `;

  return rows[0] || null;
}

async function findActiveEventBadgeDefinitions(eventCoreId, requirementTypes = [], options = {}) {
  const sql = options.sql || getPostgresClient();
  const rows = await sql`
    SELECT
      bd.*,
      eb.id AS event_badge_id,
      eb.event_core_id,
      eb.mongo_event_id,
      eb.badge_name_override,
      eb.badge_description_override,
      eb.badge_image_url
    FROM event_badges eb
    JOIN badge_definitions bd ON bd.id = eb.badge_definition_id
    WHERE eb.event_core_id = ${eventCoreId}
      AND eb.is_active = TRUE
      AND bd.is_active = TRUE
      AND (${requirementTypes.length === 0} OR bd.requirement_type = ANY(${requirementTypes}))
  `;

  return rows;
}

async function findActiveGlobalBadgeDefinitions(requirementTypes = [], options = {}) {
  const sql = options.sql || getPostgresClient();
  return sql`
    SELECT *
    FROM badge_definitions
    WHERE badge_scope = 'global'
      AND is_active = TRUE
      AND (${requirementTypes.length === 0} OR requirement_type = ANY(${requirementTypes}))
    ORDER BY points ASC, badge_code ASC
  `;
}

module.exports = {
  upsertBadgeDefinition,
  findActiveEventBadgeDefinitions,
  findActiveGlobalBadgeDefinitions
};

function normalizeEmailNotificationLevel(value) {
  const level = String(value || 'none').trim().toLowerCase();
  return ['none', 'major', 'all'].includes(level) ? level : 'none';
}
