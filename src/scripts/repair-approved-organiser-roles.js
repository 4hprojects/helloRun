require('dotenv').config();

// Promotes runners whose organizer status is "approved" to the organiser role.
// Admin user edits could previously set the status without the role, which left
// those accounts without organizer workspace access. Dry-run unless --apply.

const mongoose = require('mongoose');
const User = require('../models/User');
const { closePostgresClient } = require('../db/postgres');
const { recordCriticalAuditEvents } = require('../services/critical-audit.service');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 120000
  });

  const apply = process.argv.includes('--apply');
  const query = { role: 'runner', organizerStatus: 'approved' };
  const users = await User.find(query).select('_id userId email').sort({ createdAt: 1 }).lean();

  users.forEach((user) => console.log(`${user._id}\t${user.userId || '-'}\t${user.email || '-'}`));

  let modified = 0;
  if (apply && users.length) {
    const ids = users.map((user) => user._id);
    const result = await User.updateMany({ ...query, _id: { $in: ids } }, { $set: { role: 'organiser' } });
    modified = result.modifiedCount;
    await recordCriticalAuditEvents(users.map((user) => ({
      action: 'admin.user.role_changed',
      targetType: 'user',
      targetId: String(user._id),
      statusFrom: 'runner',
      statusTo: 'organiser',
      notes: 'Repair: approved organizer status without the organiser role.'
    })));
  }

  console.log(JSON.stringify({ dryRun: !apply, matched: users.length, modified }, null, 2));
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
