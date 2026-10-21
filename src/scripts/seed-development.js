'use strict';

require('dotenv').config({ path: process.env.DOTENV_CONFIG_PATH || '.env.development' });

const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const { databaseNameOf, isSafeNonProductionDatabaseName, hostnameOf, isLocalHostname } = require('../config/database-safety');

function assertSafeSeedTarget(env = process.env) {
  const targets = [
    ['MONGODB_URI', env.MONGODB_URI],
    ['DATABASE_URL', env.DATABASE_URL]
  ];

  for (const [variable, uri] of targets) {
    if (!String(uri || '').trim()) throw new Error(`${variable} is required.`);
    const database = databaseNameOf(uri);
    if (!isLocalHostname(hostnameOf(uri)) || !isSafeNonProductionDatabaseName(database)) {
      throw new Error(`${variable} must use a loopback host and a database name containing dev, test, testing, or staging.`);
    }
  }
}

async function upsertUser(User, passwordHash, input) {
  let user = await User.findOne({ email: input.email });
  if (!user) user = new User({ email: input.email });
  Object.assign(user, input, {
    passwordHash,
    authProvider: 'local',
    emailVerified: true,
    accountStatus: 'active',
    country: 'Philippines',
    timezone: 'Asia/Manila',
    timezoneConfirmedAt: new Date(),
    timezoneSource: 'user'
  });
  await user.save();
  return user;
}

async function upsertEvent(Event, input) {
  let event = await Event.findOne({ slug: input.slug });
  if (!event) event = new Event(input);
  else Object.assign(event, input);
  await event.save();
  return event;
}

async function main() {
  assertSafeSeedTarget();

  const postgresUrl = process.env.DATABASE_URL;
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });

  // Avoid fire-and-forget shadow writes from Event.save(). Explicit, awaited
  // synchronization below makes completion deterministic.
  delete process.env.DATABASE_URL;

  const User = require('../models/User');
  const Event = require('../models/Event');
  const password = process.env.DEV_SEED_PASSWORD || 'HelloRunDev!2026';
  const passwordHash = await bcrypt.hash(password, 10);
  const now = new Date('2026-10-20T00:00:00.000Z');

  const users = {};
  users.admin = await upsertUser(User, passwordHash, {
    email: 'admin.full@dev.hellorun.local', firstName: 'Full', lastName: 'Admin',
    displayName: 'Full Admin', role: 'admin', adminTier: 'full'
  });
  users.support = await upsertUser(User, passwordHash, {
    email: 'admin.support@dev.hellorun.local', firstName: 'Support', lastName: 'Admin',
    displayName: 'Support Admin', role: 'admin', adminTier: 'support'
  });
  users.organiser = await upsertUser(User, passwordHash, {
    email: 'organiser.approved@dev.hellorun.local', firstName: 'Approved', lastName: 'Organiser',
    displayName: 'Approved Organiser', role: 'organiser', organizerStatus: 'approved',
    organizerEventCreationAcknowledgement: { agreedAt: now, signatureName: 'Approved Organiser' }
  });
  users.pendingOrganiser = await upsertUser(User, passwordHash, {
    email: 'organiser.pending@dev.hellorun.local', firstName: 'Pending', lastName: 'Organiser',
    displayName: 'Pending Organiser', role: 'organiser', organizerStatus: 'pending',
    organizerEventCreationAcknowledgement: { agreedAt: now, signatureName: 'Pending Organiser' }
  });
  users.runner = await upsertUser(User, passwordHash, {
    email: 'runner@dev.hellorun.local', firstName: 'Development', lastName: 'Runner',
    displayName: 'Development Runner', role: 'runner', organizerStatus: 'not_applied'
  });

  const common = {
    organizerId: users.organiser._id,
    organiserName: 'Approved Organiser',
    description: 'Deterministic local development fixture.',
    country: 'Philippines',
    pricingMode: 'free',
    feeMode: 'free',
    feeCurrency: 'PHP',
    raceDistances: ['5K'],
    raceCategories: [{ categoryId: '5k', name: '5K', type: 'distance', distanceLabel: '5K', distanceKm: 5 }]
  };
  const events = [
    await upsertEvent(Event, {
      ...common, slug: 'dev-virtual-open', referenceCode: 'DEV-VIRTUAL-OPEN', title: 'Development Virtual Open',
      status: 'published', eventType: 'virtual', eventTypesAllowed: ['virtual'],
      registrationOpenAt: new Date('2026-10-01T00:00:00Z'), registrationCloseAt: new Date('2027-12-01T00:00:00Z'),
      eventStartAt: new Date('2026-11-01T00:00:00Z'), eventEndAt: new Date('2027-12-15T00:00:00Z'),
      virtualWindow: { startAt: new Date('2026-11-01T00:00:00Z'), endAt: new Date('2027-12-15T00:00:00Z') }
    }),
    await upsertEvent(Event, {
      ...common, slug: 'dev-onsite-draft', referenceCode: 'DEV-ONSITE-DRAFT', title: 'Development Onsite Draft',
      status: 'draft', eventType: 'onsite', eventTypesAllowed: ['onsite'], venueName: 'Development Track',
      eventStartAt: new Date('2027-01-16T22:00:00Z'), eventEndAt: new Date('2027-01-17T04:00:00Z')
    }),
    await upsertEvent(Event, {
      ...common, slug: 'dev-hybrid-closed', referenceCode: 'DEV-HYBRID-CLOSED', title: 'Development Hybrid Closed',
      status: 'closed', eventType: 'hybrid', eventTypesAllowed: ['virtual', 'onsite'],
      eventStartAt: new Date('2026-08-01T00:00:00Z'), eventEndAt: new Date('2026-08-31T23:59:59Z')
    })
  ];

  process.env.DATABASE_URL = postgresUrl;
  const { getPostgresClient, closePostgresClient } = require('../db/postgres');
  const { syncAppUserFromMongoUser } = require('../services/user-bridge.service');
  const { syncOrganiserShadow, syncEventShadow } = require('../services/event-shadow.service');
  const sql = getPostgresClient();

  for (const user of Object.values(users)) {
    await syncAppUserFromMongoUser(user, { sql, operation: 'live_sync' });
  }
  await syncOrganiserShadow({ user: users.organiser, application: null }, { sql, operation: 'live_sync' });
  await syncOrganiserShadow({ user: users.pendingOrganiser, application: null }, { sql, operation: 'live_sync' });
  for (const event of events) await syncEventShadow(event, { sql, operation: 'live_sync' });

  const mongoCounts = { users: await User.countDocuments(), events: await Event.countDocuments() };
  const [postgresCounts] = await sql`
    select
      (select count(*)::int from app_users) as app_users,
      (select count(*)::int from organisers) as organisers,
      (select count(*)::int from events_core) as events
  `;

  console.log(JSON.stringify({
    environment: 'isolated-development',
    mongo: mongoCounts,
    postgres: postgresCounts,
    accounts: Object.values(users).map((user) => ({ email: user.email, role: user.role, adminTier: user.adminTier || null })),
    password
  }, null, 2));

  await closePostgresClient();
  await mongoose.disconnect();
}

if (require.main === module) {
  main().catch(async (error) => {
    console.error(error.message);
    await mongoose.disconnect().catch(() => {});
    process.exitCode = 1;
  });
}

module.exports = { assertSafeSeedTarget };
