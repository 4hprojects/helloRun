require('dotenv').config();

const mongoose = require('mongoose');
const User = require('../models/User');
const { syncPolicyConsentsForMongoUser } = require('../services/policy-consent.service');
const { closePostgresClient } = require('../db/postgres');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 120000
  });

  const dryRun = process.argv.includes('--dry-run');
  const users = User.find({
    'agreedPolicies.agreedAt': { $exists: true, $ne: null }
  })
    .sort({ createdAt: 1 })
    .cursor();

  let totalUsers = 0;
  let totalConsents = 0;
  let syncedConsents = 0;
  let failedUsers = 0;

  for await (const user of users) {
    totalUsers += 1;
    const expectedCount = ['privacyPolicyVersion', 'termsPolicyVersion', 'cookiePolicyVersion']
      .filter((field) => String(user.agreedPolicies?.[field] || '').trim())
      .length;
    totalConsents += expectedCount;

    if (dryRun) {
      syncedConsents += expectedCount;
      continue;
    }

    try {
      const records = await syncPolicyConsentsForMongoUser(user, { source: 'backfill' });
      syncedConsents += records.length;
    } catch (error) {
      failedUsers += 1;
      console.error(`failed user=${String(user._id)} email=${user.email}: ${error.message}`);
    }
  }

  console.log(JSON.stringify({ dryRun, totalUsers, totalConsents, syncedConsents, failedUsers }, null, 2));
  if (failedUsers > 0) {
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
