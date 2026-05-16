#!/usr/bin/env node
// src/scripts/repair-registration-references.js
// Repair registrations with NULL event_core_id or app_user_id references

require('dotenv').config();
const { getPostgresClient } = require('../db/postgres');

async function repairRegistrationReferences() {
  const sql = getPostgresClient();

  try {
    console.log('[Repair] Finding registrations with missing references...');

    // Find registrations with NULL event_core_id or app_user_id
    const missingRows = await sql`
      SELECT 
        r.id, 
        r.mongo_registration_id, 
        r.mongo_event_id, 
        r.mongo_user_id,
        r.event_core_id,
        r.app_user_id
      FROM registrations r
      WHERE r.event_core_id IS NULL OR r.app_user_id IS NULL
      ORDER BY r.mongo_created_at
    `;

    console.log(`[Repair] Found ${missingRows.length} registrations with missing references`);

    let repaired = 0;
    let skipped = 0;

    for (const reg of missingRows) {
      try {
        // Look up event_core_id if missing
        let eventCoreId = reg.event_core_id;
        if (!eventCoreId && reg.mongo_event_id) {
          const eventRows = await sql`
            SELECT id FROM events_core WHERE mongo_event_id = ${reg.mongo_event_id} LIMIT 1
          `;
          if (eventRows.length > 0) {
            eventCoreId = eventRows[0].id;
          }
        }

        // Look up app_user_id if missing
        let appUserId = reg.app_user_id;
        if (!appUserId && reg.mongo_user_id) {
          const userRows = await sql`
            SELECT id FROM app_users WHERE mongo_user_id = ${reg.mongo_user_id} LIMIT 1
          `;
          if (userRows.length > 0) {
            appUserId = userRows[0].id;
          }
        }

        if (!eventCoreId || !appUserId) {
          console.warn(`[Repair] Skipping ${reg.mongo_registration_id}: event=${eventCoreId ? 'found' : 'missing'}, user=${appUserId ? 'found' : 'missing'}`);
          skipped++;
          continue;
        }

        // Update registration with found references
        await sql`
          UPDATE registrations 
          SET event_core_id = ${eventCoreId}, app_user_id = ${appUserId}
          WHERE id = ${reg.id}
        `;

        repaired++;
      } catch (error) {
        console.error(`[Repair] Error fixing ${reg.mongo_registration_id}:`, error.message);
      }
    }

    console.log(`[Repair] Complete: ${repaired} repaired, ${skipped} skipped (missing events or users)`);

    // Show final status
    const finalMissing = await sql`
      SELECT COUNT(*) as count FROM registrations 
      WHERE event_core_id IS NULL OR app_user_id IS NULL
    `;

    console.log(`[Repair] Remaining broken registrations: ${finalMissing[0].count}`);

    if (parseInt(finalMissing[0].count, 10) === 0) {
      console.log('[Repair] ✅ All registration references are now fixed!');
    }

    process.exit(0);
  } catch (error) {
    console.error('[Repair] Fatal error:', error);
    process.exit(1);
  }
}

repairRegistrationReferences();
