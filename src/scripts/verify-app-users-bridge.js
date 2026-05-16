require('dotenv').config();

const mongoose = require('mongoose');
const User = require('../models/User');
const { getPostgresClient, closePostgresClient } = require('../db/postgres');

async function main() {
  const sql = getPostgresClient();
  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 120000
  });

  const mongoUsers = await User.find({ email: { $exists: true, $ne: '' } })
    .select('_id email role firstName lastName')
    .lean();
  const appUsers = await sql`select id, mongo_user_id, email, role_snapshot from app_users`;
  const appUserByMongoId = new Map(appUsers.map((row) => [String(row.mongo_user_id), row]));

  const missing = [];
  const mismatched = [];

  for (const user of mongoUsers) {
    const row = appUserByMongoId.get(String(user._id));
    if (!row) {
      missing.push({ mongoUserId: String(user._id), email: user.email });
      continue;
    }
    const mongoEmail = String(user.email || '').trim().toLowerCase();
    const mongoRole = String(user.role || 'runner').trim().toLowerCase();
    if (String(row.email || '').trim().toLowerCase() !== mongoEmail || row.role_snapshot !== mongoRole) {
      mismatched.push({
        mongoUserId: String(user._id),
        mongoEmail,
        appUserEmail: row.email,
        mongoRole,
        appUserRole: row.role_snapshot
      });
    }
  }

  const extra = appUsers
    .filter((row) => !mongoUsers.some((user) => String(user._id) === String(row.mongo_user_id)))
    .map((row) => ({ appUserId: String(row.id), mongoUserId: row.mongo_user_id, email: row.email }));

  const result = {
    mongoUserCount: mongoUsers.length,
    appUserCount: appUsers.length,
    missingCount: missing.length,
    mismatchedCount: mismatched.length,
    extraCount: extra.length,
    missing: missing.slice(0, 20),
    mismatched: mismatched.slice(0, 20),
    extra: extra.slice(0, 20)
  };

  console.log(JSON.stringify(result, null, 2));
  if (missing.length || mismatched.length) {
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
