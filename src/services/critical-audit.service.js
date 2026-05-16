const crypto = require('crypto');
const User = require('../models/User');
const { getPostgresClient } = require('../db/postgres');
const { syncAppUserFromMongoUser } = require('./user-bridge.service');

function buildAuditIdempotencyKey(input = {}) {
  const stable = {
    action: String(input.action || '').trim(),
    targetType: String(input.targetType || '').trim(),
    targetId: String(input.targetId || '').trim(),
    statusFrom: String(input.statusFrom || ''),
    statusTo: String(input.statusTo || ''),
    actorMongoUserId: String(input.actorMongoUserId || ''),
    occurredAt: input.occurredAt ? new Date(input.occurredAt).toISOString() : ''
  };

  return crypto
    .createHash('sha256')
    .update(JSON.stringify(stable))
    .digest('hex');
}

async function recordCriticalAuditEvent(input = {}, options = {}) {
  const sql = options.sql || getPostgresClient();
  const actorMongoUserId = String(input.actorMongoUserId || '').trim();
  let actorAppUserId = null;

  if (actorMongoUserId) {
    const actor = await User.findById(actorMongoUserId).select('_id email role firstName lastName').lean();
    if (actor) {
      const appUser = await syncAppUserFromMongoUser(actor, { sql, operation: 'live_sync' });
      actorAppUserId = appUser?.id || null;
    }
  }

  const occurredAt = input.occurredAt ? new Date(input.occurredAt) : new Date();
  const idempotencyKey = input.idempotencyKey || buildAuditIdempotencyKey({
    ...input,
    actorMongoUserId,
    occurredAt
  });

  const rows = await sql`
    insert into audit_critical (
      actor_user_id,
      actor_mongo_user_id,
      action,
      target_type,
      target_id,
      status_from,
      status_to,
      notes,
      ip_address,
      user_agent,
      idempotency_key,
      created_at
    )
    values (
      ${actorAppUserId},
      ${actorMongoUserId || null},
      ${String(input.action || '').trim()},
      ${String(input.targetType || '').trim()},
      ${String(input.targetId || '').trim()},
      ${stringOrNull(input.statusFrom)},
      ${stringOrNull(input.statusTo)},
      ${stringOrNull(input.notes)},
      ${stringOrNull(input.ipAddress)},
      ${stringOrNull(input.userAgent)},
      ${idempotencyKey},
      ${occurredAt}
    )
    on conflict (idempotency_key)
    do update set
      actor_user_id = excluded.actor_user_id,
      actor_mongo_user_id = excluded.actor_mongo_user_id,
      notes = excluded.notes,
      ip_address = excluded.ip_address,
      user_agent = excluded.user_agent
    returning *
  `;

  return rows[0];
}

function recordCriticalAuditEventInBackground(input = {}) {
  recordCriticalAuditEvent(input)
    .catch((error) => {
      console.error('Supabase critical audit write failed:', {
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId,
        error: error.message
      });
    });
}

function stringOrNull(value) {
  const safe = String(value || '').trim();
  return safe || null;
}

module.exports = {
  buildAuditIdempotencyKey,
  recordCriticalAuditEvent,
  recordCriticalAuditEventInBackground
};
