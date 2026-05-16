#!/usr/bin/env node
// src/scripts/backfill-missing-references.js
// Fast backfill of only the events and users referenced by submissions

require('dotenv').config();
const mongoose = require('mongoose');
const { getPostgresClient } = require('../db/postgres');
const { syncEventShadow } = require('../services/event-shadow.service');
const { syncAppUserFromMongoUser } = require('../services/user-bridge.service');

async function backfillMissingReferences() {
  console.log('[Backfill] Starting targeted backfill of missing events and users...');

  await mongoose.connect(process.env.MONGODB_URI);

  // Load models
  require('../models/Submission');
  require('../models/Event');
  require('../models/User');

  const Submission = mongoose.model('Submission');
  const Event = mongoose.model('Event');
  const User = mongoose.model('User');
  const sql = getPostgresClient();

  try {
    // Get all unique event IDs from submissions
    const submissions = await Submission.find({}, { eventId: 1 }).lean();
    const eventIds = [...new Set(submissions.map(s => String(s.eventId)).filter(Boolean))];

    console.log(`[Backfill] Found ${eventIds.length} unique events referenced by submissions`);

    // Find which events are missing from Supabase
    const missingEventIds = [];
    for (const mongoEventId of eventIds) {
      const rows = await sql`SELECT id FROM events_core WHERE mongo_event_id = ${mongoEventId}`;
      if (rows.length === 0) {
        missingEventIds.push(mongoEventId);
      }
    }

    console.log(`[Backfill] ${missingEventIds.length} events missing from Supabase`);

    // Fetch and sync missing events
    let eventsSynced = 0;
    let eventsFailed = 0;
    for (const mongoEventId of missingEventIds) {
      try {
        const event = await Event.findById(mongoEventId).lean();
        if (!event) {
          console.warn(`[Backfill] Event ${mongoEventId} not found in MongoDB`);
          continue;
        }
        await syncEventShadow(event, { operation: 'backfill' });
        eventsSynced++;
      } catch (error) {
        console.error(`[Backfill] Error syncing event ${mongoEventId}: ${error.message}`);
        eventsFailed++;
      }
    }

    console.log(`[Backfill] Events synced: ${eventsSynced}, failed: ${eventsFailed}`);

    // Get all unique user IDs from submissions
    const userIds = [...new Set(submissions.map(s => String(s.runnerId)).filter(Boolean))];
    console.log(`[Backfill] Found ${userIds.length} unique users referenced by submissions`);

    // Find which users are missing from Supabase
    const missingUserIds = [];
    for (const mongoUserId of userIds) {
      const rows = await sql`SELECT id FROM app_users WHERE mongo_user_id = ${mongoUserId}`;
      if (rows.length === 0) {
        missingUserIds.push(mongoUserId);
      }
    }

    console.log(`[Backfill] ${missingUserIds.length} users missing from Supabase`);

    // Fetch and sync missing users
    let usersSynced = 0;
    let usersFailed = 0;
    for (const mongoUserId of missingUserIds) {
      try {
        const user = await User.findById(mongoUserId);
        if (!user) {
          console.warn(`[Backfill] User ${mongoUserId} not found in MongoDB`);
          continue;
        }
        await syncAppUserFromMongoUser(user, { operation: 'backfill' });
        usersSynced++;
      } catch (error) {
        console.error(`[Backfill] Error syncing user ${mongoUserId}: ${error.message}`);
        usersFailed++;
      }
    }

    console.log(`[Backfill] Users synced: ${usersSynced}, failed: ${usersFailed}`);
    console.log(`\n[Backfill] Complete: ${eventsSynced + usersSynced} references synced`);

    process.exit(0);
  } catch (error) {
    console.error('[Backfill] Fatal error:', error);
    process.exit(1);
  }
}

backfillMissingReferences();

      if (rows.length === 0) {
        missingEventIds.push(mongoEventId);
      }
    }

    console.log(`[Backfill] ${missingEventIds.length} events missing from Supabase`);

    // Fetch and sync missing events
    let eventsSynced = 0;
    let eventsFailed = 0;
    for (const mongoEventId of missingEventIds) {
      try {
        const event = await Event.findById(mongoEventId).lean();
        if (!event) {
          console.warn(`[Backfill] Event ${mongoEventId} not found in MongoDB`);
          continue;
        }
        await syncEventShadow(event, { operation: 'backfill' });
        eventsSynced++;
      } catch (error) {
        console.error(`[Backfill] Error syncing event ${mongoEventId}: ${error.message}`);
        eventsFailed++;
      }
    }

    console.log(`[Backfill] Events synced: ${eventsSynced}, failed: ${eventsFailed}`);

    // Get all unique user IDs from submissions
    const userIds = [...new Set(submissions.map(s => String(s.runnerId)).filter(Boolean))];
    console.log(`[Backfill] Found ${userIds.length} unique users referenced by submissions`);

    // Find which users are missing from Supabase
    const missingUserIds = [];
    for (const mongoUserId of userIds) {
      const rows = await sql`SELECT id FROM app_users WHERE mongo_user_id = ${mongoUserId}`;
      if (rows.length === 0) {
        missingUserIds.push(mongoUserId);
      }
    }

    console.log(`[Backfill] ${missingUserIds.length} users missing from Supabase`);

    // Fetch and sync missing users
    let usersSynced = 0;
    let usersFailed = 0;
    for (const mongoUserId of missingUserIds) {
      try {
        const user = await User.findById(mongoUserId);
        if (!user) {
          console.warn(`[Backfill] User ${mongoUserId} not found in MongoDB`);
          continue;
        }
        await syncAppUserFromMongoUser(user, { operation: 'backfill' });
        usersSynced++;
      } catch (error) {
        console.error(`[Backfill] Error syncing user ${mongoUserId}: ${error.message}`);
        usersFailed++;
      }
    }

    console.log(`[Backfill] Users synced: ${usersSynced}, failed: ${usersFailed}`);
    console.log(`\n[Backfill] Complete: ${eventsSynced + usersSynced} references synced`);

    process.exit(0);
  } catch (error) {
    console.error('[Backfill] Fatal error:', error);
    process.exit(1);
  }
}

backfillMissingReferences();
