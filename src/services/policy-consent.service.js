const { getPostgresClient } = require('../db/postgres');
const { syncAppUserFromMongoUser } = require('./user-bridge.service');

const POLICY_TYPES = Object.freeze({
  privacy: 'privacy_policy',
  terms: 'terms_policy',
  cookie: 'cookie_policy',
  dataUsage: 'data_usage_policy'
});

function buildPolicyConsentRecords(user, options = {}) {
  if (!user || !user._id) {
    throw new Error('MongoDB user is required.');
  }

  const agreedPolicies = user.agreedPolicies || {};
  const acceptedAt = normalizeDate(agreedPolicies.agreedAt || user.termsAcceptedAt || user.createdAt || new Date());
  const ipAddress = String(agreedPolicies.ipAddress || options.ipAddress || '').trim().slice(0, 120);
  const userAgent = String(agreedPolicies.userAgent || options.userAgent || '').trim().slice(0, 500);

  return [
    {
      policyType: POLICY_TYPES.privacy,
      mongoPolicyId: stringOrEmpty(agreedPolicies.privacyPolicyId),
      version: stringOrEmpty(agreedPolicies.privacyPolicyVersion),
      acceptedAt,
      ipAddress,
      userAgent
    },
    {
      policyType: POLICY_TYPES.terms,
      mongoPolicyId: stringOrEmpty(agreedPolicies.termsPolicyId),
      version: stringOrEmpty(agreedPolicies.termsPolicyVersion),
      acceptedAt,
      ipAddress,
      userAgent
    },
    {
      policyType: POLICY_TYPES.cookie,
      mongoPolicyId: stringOrEmpty(agreedPolicies.cookiePolicyId),
      version: stringOrEmpty(agreedPolicies.cookiePolicyVersion),
      acceptedAt,
      ipAddress,
      userAgent
    },
    {
      policyType: POLICY_TYPES.dataUsage,
      mongoPolicyId: stringOrEmpty(agreedPolicies.dataUsagePolicyId),
      version: stringOrEmpty(agreedPolicies.dataUsagePolicyVersion),
      acceptedAt,
      ipAddress,
      userAgent
    }
  ].filter((record) => record.version);
}

async function syncPolicyConsentsForMongoUser(user, options = {}) {
  const sql = options.sql || getPostgresClient();
  const source = options.source || 'live_sync';
  const records = buildPolicyConsentRecords(user, options);
  if (!records.length) {
    return [];
  }

  const appUser = options.appUser || await syncAppUserFromMongoUser(user, {
    sql,
    operation: source === 'backfill' ? 'backfill' : 'live_sync'
  });

  const mongoUserId = String(user._id);
  const synced = [];
  for (const record of records) {
    const rows = await sql`
      insert into policy_consents (
        app_user_id,
        mongo_user_id,
        policy_type,
        mongo_policy_id,
        version,
        accepted_at,
        ip_address,
        user_agent,
        source
      )
      values (
        ${appUser?.id || null},
        ${mongoUserId},
        ${record.policyType},
        ${record.mongoPolicyId || null},
        ${record.version},
        ${record.acceptedAt},
        ${record.ipAddress},
        ${record.userAgent},
        ${source}
      )
      on conflict (mongo_user_id, policy_type, version)
      do update set
        app_user_id = excluded.app_user_id,
        mongo_policy_id = excluded.mongo_policy_id,
        accepted_at = excluded.accepted_at,
        ip_address = excluded.ip_address,
        user_agent = excluded.user_agent,
        source = excluded.source
      returning *
    `;
    synced.push(rows[0]);
  }
  return synced;
}

function syncPolicyConsentsInBackground(user, options = {}) {
  syncPolicyConsentsForMongoUser(user, options)
    .catch((error) => {
      console.error('Supabase policy consent sync failed:', {
        userId: String(user?._id || ''),
        source: options.source || 'live_sync',
        error: error.message
      });
    });
}

function stringOrEmpty(value) {
  return String(value || '').trim();
}

function normalizeDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return new Date();
  }
  return date;
}

module.exports = {
  POLICY_TYPES,
  buildPolicyConsentRecords,
  syncPolicyConsentsForMongoUser,
  syncPolicyConsentsInBackground
};
