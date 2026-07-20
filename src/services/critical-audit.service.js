const crypto = require('crypto');
const User = require('../models/User');
const { getPostgresClient } = require('../db/postgres');
const { syncAppUserFromMongoUser } = require('./user-bridge.service');
const logger = require('../utils/logger');
const { recordSyncFailureInBackground } = require('./sync-failure.service');

let disableCriticalAuditBackgroundWrites = false;

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
  const rows = await recordCriticalAuditEvents([input], options);
  return rows[0];
}

async function recordCriticalAuditEvents(inputs = [], options = {}) {
  const events = Array.isArray(inputs) ? inputs.filter(Boolean) : [];
  if (!events.length) return [];

  const sql = options.sql || getPostgresClient();
  const actorMongoUserIds = Array.from(new Set(
    events.map((input) => String(input.actorMongoUserId || '').trim())
  ));
  if (actorMongoUserIds.length > 1) {
    throw new Error('A critical audit batch must have one common actor.');
  }

  const actorMongoUserId = actorMongoUserIds[0];
  let actorAppUserId = null;

  if (actorMongoUserId) {
    const actor = await User.findById(actorMongoUserId).select('_id email role firstName lastName').lean();
    if (actor) {
      const appUser = await syncAppUserFromMongoUser(actor, { sql, operation: 'live_sync' });
      actorAppUserId = appUser?.id || null;
    }
  }

  const auditRows = events.map((input) => {
    const occurredAt = input.occurredAt ? new Date(input.occurredAt) : new Date();
    const inputActorMongoUserId = String(input.actorMongoUserId || '').trim();
    const idempotencyKey = input.idempotencyKey || buildAuditIdempotencyKey({
      ...input,
      actorMongoUserId: inputActorMongoUserId,
      occurredAt
    });

    return {
      actor_user_id: actorAppUserId,
      actor_mongo_user_id: inputActorMongoUserId || null,
      action: String(input.action || '').trim(),
      target_type: String(input.targetType || '').trim(),
      target_id: String(input.targetId || '').trim(),
      status_from: stringOrNull(input.statusFrom),
      status_to: stringOrNull(input.statusTo),
      notes: stringOrNull(input.notes),
      ip_address: stringOrNull(input.ipAddress),
      user_agent: stringOrNull(input.userAgent),
      idempotency_key: idempotencyKey,
      created_at: occurredAt
    };
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
    ${sql(auditRows,
      'actor_user_id',
      'actor_mongo_user_id',
      'action',
      'target_type',
      'target_id',
      'status_from',
      'status_to',
      'notes',
      'ip_address',
      'user_agent',
      'idempotency_key',
      'created_at')}
    on conflict (idempotency_key)
    do update set
      actor_user_id = excluded.actor_user_id,
      actor_mongo_user_id = excluded.actor_mongo_user_id,
      notes = excluded.notes,
      ip_address = excluded.ip_address,
      user_agent = excluded.user_agent
    returning *
  `;

  return rows;
}

function recordCriticalAuditEventInBackground(input = {}) {
  if (disableCriticalAuditBackgroundWrites) {
    return;
  }

  recordCriticalAuditEvent(input)
    .catch((error) => {
      logger.error('Supabase critical audit write failed:', {
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId,
        error: error.message
      });
      recordSyncFailureInBackground('critical_audit', String(input.targetId || ''), error, {
        action: input.action,
        targetType: input.targetType
      });
    });
}

function stringOrNull(value) {
  const safe = String(value || '').trim();
  return safe || null;
}

function __setDisableCriticalAuditBackgroundWrites(value) {
  disableCriticalAuditBackgroundWrites = Boolean(value);
}

module.exports = {
  __setDisableCriticalAuditBackgroundWrites,
  buildAuditIdempotencyKey,
  recordCriticalAuditEvent,
  recordCriticalAuditEvents,
  recordCriticalAuditEventInBackground
};
