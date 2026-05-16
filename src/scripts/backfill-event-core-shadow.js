require('dotenv').config();

const mongoose = require('mongoose');
const User = require('../models/User');
const Event = require('../models/Event');
const OrganiserApplication = require('../models/OrganiserApplication');
const { closePostgresClient } = require('../db/postgres');
const {
  syncOrganiserShadow,
  syncEventShadow
} = require('../services/event-shadow.service');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 120000
  });

  const dryRun = process.argv.includes('--dry-run');
  const skipOrganisers = process.argv.includes('--skip-organisers');
  const applications = await OrganiserApplication.find({}).lean();
  const applicationByUserId = new Map(applications.map((item) => [String(item.userId), item]));

  const organiserUsers = await User.find({
    $or: [
      { role: 'organiser' },
      { organizerStatus: 'approved' }
    ]
  }).sort({ createdAt: 1 });

  const eventOrganizerIds = await Event.distinct('organizerId', { organizerId: { $ne: null } });
  const knownOrganiserIds = new Set(organiserUsers.map((user) => String(user._id)));
  const missingEventOrganizerIds = eventOrganizerIds
    .map((id) => String(id))
    .filter((id) => !knownOrganiserIds.has(id));

  const extraEventOrganisers = missingEventOrganizerIds.length
    ? await User.find({ _id: { $in: missingEventOrganizerIds } }).sort({ createdAt: 1 })
    : [];

  let organisersTotal = organiserUsers.length + extraEventOrganisers.length;
  let organisersSynced = 0;
  let organisersFailed = 0;

  for (const user of skipOrganisers ? [] : [...organiserUsers, ...extraEventOrganisers]) {
    if (dryRun) {
      organisersSynced += 1;
      continue;
    }

    try {
      await syncOrganiserShadow({
        user,
        application: applicationByUserId.get(String(user._id))
      }, { operation: 'backfill' });
      organisersSynced += 1;
    } catch (error) {
      organisersFailed += 1;
      console.error(`failed organiser user=${String(user._id)} email=${user.email}: ${error.message}`);
    }
  }

  const events = Event.find({ isPersonalRecord: { $ne: true } })
    .sort({ createdAt: 1 })
    .cursor();
  let eventsTotal = 0;
  let eventsSynced = 0;
  let eventsFailed = 0;

  for await (const event of events) {
    eventsTotal += 1;
    if (dryRun) {
      eventsSynced += 1;
      continue;
    }

    try {
      await syncEventShadow(event, { operation: 'backfill' });
      eventsSynced += 1;
    } catch (error) {
      eventsFailed += 1;
      console.error(`failed event=${String(event._id)} slug=${event.slug}: ${error.message}`);
    }
  }

  console.log(JSON.stringify({
    dryRun,
    skipOrganisers,
    organisersTotal,
    organisersSynced,
    organisersFailed,
    eventsTotal,
    eventsSynced,
    eventsFailed
  }, null, 2));

  if (organisersFailed > 0 || eventsFailed > 0) {
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
