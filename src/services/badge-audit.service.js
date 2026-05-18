const { getPostgresClient } = require('../db/postgres');

async function logBadgeAudit(input = {}, options = {}) {
  if (!process.env.DATABASE_URL) return null;

  const sql = options.sql || getPostgresClient();
  const rows = await sql`
    INSERT INTO badge_audit_logs (
      badge_definition_id,
      user_badge_id,
      event_core_id,
      runner_user_id,
      action,
      performed_by,
      reason,
      metadata
    )
    VALUES (
      ${input.badgeDefinitionId || null},
      ${input.userBadgeId || null},
      ${input.eventCoreId || null},
      ${input.runnerUserId || null},
      ${String(input.action || '').trim()},
      ${input.performedBy || null},
      ${stringOrNull(input.reason)},
      ${input.metadata || {}}
    )
    RETURNING *
  `;

  return rows[0] || null;
}

async function listRecentBadgeAuditLogs(options = {}) {
  if (!process.env.DATABASE_URL) return [];

  const sql = options.sql || getPostgresClient();
  const limit = clampInt(options.limit, 1, 100, 30);
  const badgeScope = normalizeBadgeScope(options.badgeScope);
  const scopeFilter = badgeScope ? sql`WHERE bd.badge_scope = ${badgeScope}` : sql``;
  const rows = await sql`
    SELECT
      bal.id,
      bal.action,
      bal.reason,
      bal.metadata,
      bal.created_at,
      bd.name AS badge_name,
      bd.badge_scope,
      actor.email AS actor_email,
      actor.display_name AS actor_name,
      runner.email AS runner_email,
      runner.display_name AS runner_name
    FROM badge_audit_logs bal
    LEFT JOIN badge_definitions bd ON bd.id = bal.badge_definition_id
    LEFT JOIN app_users actor ON actor.id = bal.performed_by
    LEFT JOIN app_users runner ON runner.id = bal.runner_user_id
    ${scopeFilter}
    ORDER BY bal.created_at DESC
    LIMIT ${limit}
  `;

  return rows.map((row) => ({
    id: String(row.id || ''),
    action: row.action || '',
    reason: row.reason || '',
    metadata: row.metadata || {},
    badgeName: row.badge_name || '',
    badgeScope: row.badge_scope || '',
    actorName: row.actor_name || '',
    actorEmail: row.actor_email || '',
    runnerName: row.runner_name || '',
    runnerEmail: row.runner_email || '',
    createdAt: row.created_at || null
  }));
}

function logBadgeAuditInBackground(input = {}) {
  logBadgeAudit(input).catch((error) => {
    console.error('Badge audit write failed:', {
      action: input.action,
      badgeDefinitionId: input.badgeDefinitionId,
      userBadgeId: input.userBadgeId,
      error: error.message
    });
  });
}

function stringOrNull(value) {
  const safe = String(value || '').trim();
  return safe || null;
}

function normalizeBadgeScope(value) {
  const scope = String(value || '').trim();
  return ['global', 'event', 'challenge', 'organiser'].includes(scope) ? scope : '';
}

module.exports = {
  logBadgeAudit,
  listRecentBadgeAuditLogs,
  logBadgeAuditInBackground
};

function clampInt(value, min, max, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}
