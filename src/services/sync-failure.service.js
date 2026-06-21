const { getPostgresClient } = require('../db/postgres');
const logger = require('../utils/logger');

async function recordSyncFailure(syncType, entityId, error, context = {}) {
  try {
    const sql = getPostgresClient();
    await sql`
      insert into sync_failure_log (sync_type, entity_id, error_message, error_stack, context)
      values (
        ${String(syncType || '').trim()},
        ${String(entityId || '') || null},
        ${String(error?.message || error || '').slice(0, 2000)},
        ${String(error?.stack || '').slice(0, 5000) || null},
        ${JSON.stringify(context)}
      )
    `;
  } catch (logError) {
    logger.error('[sync-failure] Could not write to sync_failure_log:', {
      syncType,
      entityId,
      originalError: String(error?.message || error || ''),
      logError: logError.message
    });
  }
}

function recordSyncFailureInBackground(syncType, entityId, error, context = {}) {
  recordSyncFailure(syncType, entityId, error, context).catch(() => {});
}

async function getRecentFailures(options = {}) {
  const sql = getPostgresClient();
  const limit = Math.min(Number(options.limit || 20), 200);
  const sinceMins = Number(options.sinceMins || 1440);
  return sql`
    select id, sync_type, entity_id, error_message, context, created_at
    from sync_failure_log
    where resolved_at is null
      and created_at > now() - (${sinceMins} || ' minutes')::interval
    order by created_at desc
    limit ${limit}
  `;
}

async function countUnresolvedFailures(sinceMins = 1440) {
  const sql = getPostgresClient();
  return sql`
    select sync_type, count(*)::int as count
    from sync_failure_log
    where resolved_at is null
      and created_at > now() - (${sinceMins} || ' minutes')::interval
    group by sync_type
    order by count desc
  `;
}

module.exports = {
  recordSyncFailure,
  recordSyncFailureInBackground,
  getRecentFailures,
  countUnresolvedFailures
};
