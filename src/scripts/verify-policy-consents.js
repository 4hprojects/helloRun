require('dotenv').config();

const mongoose = require('mongoose');
const User = require('../models/User');
const { getPostgresClient, closePostgresClient } = require('../db/postgres');
const { buildPolicyConsentRecords } = require('../services/policy-consent.service');

async function main() {
  const sql = getPostgresClient();
  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 120000
  });

  const users = await User.find({
    'agreedPolicies.agreedAt': { $exists: true, $ne: null }
  })
    .select('_id email agreedPolicies termsAcceptedAt createdAt')
    .lean();

  const expected = [];
  for (const user of users) {
    for (const record of buildPolicyConsentRecords(user)) {
      expected.push({
        mongoUserId: String(user._id),
        email: user.email,
        policyType: record.policyType,
        version: record.version
      });
    }
  }

  const rows = await sql`
    select mongo_user_id, policy_type, version
    from policy_consents
  `;
  const actualSet = new Set(rows.map((row) => `${row.mongo_user_id}|${row.policy_type}|${row.version}`));
  const expectedSet = new Set(expected.map((item) => `${item.mongoUserId}|${item.policyType}|${item.version}`));

  const missing = expected
    .filter((item) => !actualSet.has(`${item.mongoUserId}|${item.policyType}|${item.version}`))
    .slice(0, 20);
  const extra = rows
    .filter((row) => !expectedSet.has(`${row.mongo_user_id}|${row.policy_type}|${row.version}`))
    .map((row) => ({
      mongoUserId: row.mongo_user_id,
      policyType: row.policy_type,
      version: row.version
    }))
    .slice(0, 20);

  const result = {
    usersWithConsentSnapshot: users.length,
    expectedConsentCount: expected.length,
    supabaseConsentCount: rows.length,
    missingCount: expected.length - rows.filter((row) => expectedSet.has(`${row.mongo_user_id}|${row.policy_type}|${row.version}`)).length,
    extraCount: rows.length - rows.filter((row) => expectedSet.has(`${row.mongo_user_id}|${row.policy_type}|${row.version}`)).length,
    missing,
    extra
  };

  console.log(JSON.stringify(result, null, 2));
  if (result.missingCount || result.extraCount) {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
    await closePostgresClient();
  });
