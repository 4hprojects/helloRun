const crypto = require('crypto');
const { getPostgresClient } = require('../db/postgres');
const { toPostgresSmokeMeta } = require('../utils/smoke-test-meta');

const PHASE = 'phase_1_app_users';

function normalizeMongoUser(user) {
  if (!user || !user._id) {
    throw new Error('MongoDB user is required.');
  }

  const mongoUserId = String(user._id);
  const email = String(user.email || '').trim().toLowerCase();
  if (!email) {
    throw new Error(`MongoDB user ${mongoUserId} is missing email.`);
  }

  const role = String(user.role || 'runner').trim().toLowerCase();
  const roleSnapshot = ['runner', 'organiser', 'admin'].includes(role) ? role : 'runner';
  const firstName = String(user.firstName || '').trim();
  const lastName = String(user.lastName || '').trim();
  const displayName = `${firstName} ${lastName}`.trim() || email.split('@')[0] || null;
  const smokeMeta = toPostgresSmokeMeta(user);

  return {
    mongoUserId,
    email,
    roleSnapshot,
    displayName,
    ...(smokeMeta.is_smoke_test ? { smokeMeta } : {})
  };
}

function buildChecksum(normalizedUser) {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify({
      mongoUserId: normalizedUser.mongoUserId,
      email: normalizedUser.email,
      roleSnapshot: normalizedUser.roleSnapshot,
      displayName: normalizedUser.displayName || ''
    }))
    .digest('hex');
}

async function syncAppUserFromMongoUser(user, options = {}) {
  const sql = options.sql || getPostgresClient();
  const operation = options.operation || 'live_sync';
  const normalized = normalizeMongoUser(user);
  const checksum = buildChecksum(normalized);
  const smokeMeta = normalized.smokeMeta || toPostgresSmokeMeta();

  try {
    const rows = await sql`
      insert into app_users (
        mongo_user_id,
        email,
        role_snapshot,
        display_name,
        is_smoke_test,
        test_run_id,
        created_by_test,
        expires_at
      )
      values (
        ${normalized.mongoUserId},
        ${normalized.email},
        ${normalized.roleSnapshot},
        ${normalized.displayName},
        ${smokeMeta.is_smoke_test},
        ${smokeMeta.test_run_id || null},
        ${smokeMeta.created_by_test || null},
        ${smokeMeta.expires_at}
      )
      on conflict (mongo_user_id)
      do update set
        email = excluded.email,
        role_snapshot = excluded.role_snapshot,
        display_name = excluded.display_name,
        is_smoke_test = excluded.is_smoke_test,
        test_run_id = excluded.test_run_id,
        created_by_test = excluded.created_by_test,
        expires_at = excluded.expires_at
      returning id, mongo_user_id, email, role_snapshot, display_name, created_at, updated_at
    `;

    const appUser = rows[0];
    await upsertMigrationRecord(sql, {
      normalized,
      targetId: String(appUser.id),
      operation,
      status: 'synced',
      checksum,
      errorCode: '',
      errorMessage: ''
    });

    return appUser;
  } catch (error) {
    await upsertMigrationRecord(sql, {
      normalized,
      targetId: null,
      operation,
      status: 'failed',
      checksum,
      errorCode: error.code || '',
      errorMessage: error.message || 'Unknown app user sync failure.'
    }).catch(() => {});
    throw error;
  }
}

async function upsertMigrationRecord(sql, input) {
  const now = new Date();
  const syncedAt = input.status === 'synced' ? now : null;
  return sql`
    insert into migration_records (
      phase,
      source_system,
      source_collection,
      source_id,
      target_system,
      target_table,
      target_id,
      operation,
      status,
      checksum,
      error_code,
      error_message,
      attempted_at,
      synced_at,
      is_smoke_test,
      test_run_id,
      created_by_test,
      expires_at
    )
    values (
      ${PHASE},
      'mongodb',
      'users',
      ${input.normalized.mongoUserId},
      'supabase',
      'app_users',
      ${input.targetId},
      ${input.operation},
      ${input.status},
      ${input.checksum},
      ${input.errorCode || ''},
      ${input.errorMessage || ''},
      ${now},
      ${syncedAt},
      ${input.normalized.smokeMeta?.is_smoke_test || false},
      ${input.normalized.smokeMeta?.test_run_id || null},
      ${input.normalized.smokeMeta?.created_by_test || null},
      ${input.normalized.smokeMeta?.expires_at || null}
    )
    on conflict (
      source_system,
      source_collection,
      source_id,
      target_system,
      target_table
    )
    do update set
      target_id = excluded.target_id,
      operation = excluded.operation,
      status = excluded.status,
      checksum = excluded.checksum,
      error_code = excluded.error_code,
      error_message = excluded.error_message,
      attempted_at = excluded.attempted_at,
      synced_at = excluded.synced_at,
      is_smoke_test = excluded.is_smoke_test,
      test_run_id = excluded.test_run_id,
      created_by_test = excluded.created_by_test,
      expires_at = excluded.expires_at
    returning *
  `;
}

module.exports = {
  PHASE,
  normalizeMongoUser,
  buildChecksum,
  syncAppUserFromMongoUser
};
