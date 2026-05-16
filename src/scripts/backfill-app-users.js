require('dotenv').config();

const mongoose = require('mongoose');
const User = require('../models/User');
const { syncAppUserFromMongoUser } = require('../services/user-bridge.service');
const { closePostgresClient } = require('../db/postgres');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 120000
  });

  const dryRun = process.argv.includes('--dry-run');
  const users = User.find({ email: { $exists: true, $ne: '' } })
    .sort({ createdAt: 1 })
    .cursor();

  let total = 0;
  let synced = 0;
  let failed = 0;

  for await (const user of users) {
    total += 1;
    if (dryRun) {
      synced += 1;
      continue;
    }

    try {
      await syncAppUserFromMongoUser(user, { operation: 'backfill' });
      synced += 1;
    } catch (error) {
      failed += 1;
      console.error(`failed user=${String(user._id)} email=${user.email}: ${error.message}`);
    }
  }

  console.log(JSON.stringify({ dryRun, total, synced, failed }, null, 2));
  if (failed > 0) {
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
