#!/usr/bin/env node
// src/scripts/diagnose-broken-registrations.js
// Diagnose why registrations have missing user/event references

require('dotenv').config();
const mongoose = require('mongoose');
const { getPostgresClient } = require('../db/postgres');

async function diagnose() {
  await mongoose.connect(process.env.MONGODB_URI);
  const sql = getPostgresClient();

  const Registration = require('../models/Registration');
  const User = require('../models/User');
  const Event = require('../models/Event');

  // Find broken registrations
  const brokenRegs = await sql`
    SELECT mongo_registration_id, mongo_user_id, mongo_event_id
    FROM registrations
    WHERE event_core_id IS NULL OR app_user_id IS NULL
    LIMIT 5
  `;

  console.log(`\nChecking ${brokenRegs.length} broken registrations:\n`);

  for (const reg of brokenRegs) {
    console.log(`Registration: ${reg.mongo_registration_id}`);

    // Check user
    const mongoUser = await User.findById(reg.mongo_user_id).lean();
    const supabaseUser = reg.mongo_user_id
      ? await sql`SELECT id FROM app_users WHERE mongo_user_id = ${reg.mongo_user_id}`
      : [];

    console.log(`  User ${reg.mongo_user_id}:`);
    console.log(`    - In MongoDB: ${!!mongoUser} ${mongoUser ? `(${mongoUser.email})` : '(NOT FOUND)'}`);
    console.log(`    - In Supabase: ${supabaseUser.length > 0} ${supabaseUser.length > 0 ? `(id=${supabaseUser[0].id})` : '(NOT FOUND)'}`);

    // Check event
    const mongoEvent = await Event.findById(reg.mongo_event_id).lean();
    const supabaseEvent = reg.mongo_event_id
      ? await sql`SELECT id FROM events_core WHERE mongo_event_id = ${reg.mongo_event_id}`
      : [];

    console.log(`  Event ${reg.mongo_event_id}:`);
    console.log(`    - In MongoDB: ${!!mongoEvent} ${mongoEvent ? `(${mongoEvent.title})` : '(NOT FOUND)'}`);
    console.log(`    - In Supabase: ${supabaseEvent.length > 0} ${supabaseEvent.length > 0 ? `(id=${supabaseEvent[0].id})` : '(NOT FOUND)'}`);
    console.log();
  }

  process.exit(0);
}

diagnose().catch((err) => {
  console.error(err);
  process.exit(1);
});
