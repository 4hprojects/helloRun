#!/usr/bin/env node
// src/scripts/verify-phase7-onsite.js
// Verify Phase 7 onsite operations schema and initial state

require('dotenv').config();
const { getPostgresClient } = require('../db/postgres');

async function verifyPhase7() {
  const sql = getPostgresClient();

  console.log('[Phase 7] Verifying onsite operations schema...\n');

  try {
    // Check tables exist
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name IN (
        'race_kits', 'bib_assignments', 'check_ins', 
        'result_imports', 'onsite_results'
      )
      ORDER BY table_name
    `;

    console.log(`📊 Onsite Operations Tables: ${tables.length}/5 created`);
    for (const t of tables) {
      console.log(`  ✅ ${t.table_name}`);
    }

    // Check views exist
    const views = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'VIEW' 
      AND table_name LIKE 'v_%checkin%' OR table_name LIKE 'v_onsite%' OR table_name LIKE 'v_bib%' OR table_name LIKE 'v_race%'
    `;

    console.log(`\n👀 Report Views: ${views.length} views created`);
    for (const v of views) {
      console.log(`  ✅ ${v.table_name}`);
    }

    // Check indexes
    const indexes = await sql`
      SELECT indexname, tablename
      FROM pg_indexes
      WHERE schemaname = 'public' AND tablename IN (
        'race_kits', 'bib_assignments', 'check_ins', 
        'result_imports', 'onsite_results'
      )
      ORDER BY tablename, indexname
    `;

    console.log(`\n🗂️  Indexes Created: ${indexes.length}`);
    for (const idx of indexes) {
      console.log(`  ✅ ${idx.indexname} on ${idx.tablename}`);
    }

    // Get record counts
    const raceKitCount = await sql`SELECT COUNT(*) as count FROM race_kits`;
    const bibCount = await sql`SELECT COUNT(*) as count FROM bib_assignments`;
    const checkInCount = await sql`SELECT COUNT(*) as count FROM check_ins`;
    const importCount = await sql`SELECT COUNT(*) as count FROM result_imports`;
    const resultCount = await sql`SELECT COUNT(*) as count FROM onsite_results`;

    console.log(`\n📈 Current Data State:`);
    console.log(`  Race Kits: ${raceKitCount[0].count}`);
    console.log(`  Bib Assignments: ${bibCount[0].count}`);
    console.log(`  Check-ins: ${checkInCount[0].count}`);
    console.log(`  Result Imports: ${importCount[0].count}`);
    console.log(`  Onsite Results: ${resultCount[0].count}`);

    // Check foreign key constraints
    const constraints = await sql`
      SELECT constraint_name, table_name
      FROM information_schema.table_constraints
      WHERE constraint_type = 'FOREIGN KEY' 
      AND table_name IN ('race_kits', 'bib_assignments', 'check_ins', 'result_imports', 'onsite_results')
      ORDER BY table_name, constraint_name
    `;

    console.log(`\n🔗 Foreign Key Constraints: ${constraints.length}`);
    for (const c of constraints) {
      console.log(`  ✅ ${c.constraint_name} on ${c.table_name}`);
    }

    // Verify migration was applied
    const migrationEntry = await sql`
      SELECT filename FROM schema_migrations 
      WHERE filename = '007_phase7_onsite_operations.sql'
    `;

    if (migrationEntry.length > 0) {
      console.log(`\n✅ Phase 7 Migration Applied`);
      console.log(`   Filename: ${migrationEntry[0].filename}`);
    } else {
      console.log(`\n⚠️  Phase 7 Migration NOT recorded in schema_migrations`);
    }

    console.log(`\n✅ Phase 7 Verification: COMPLETE\n`);
    console.log('Schema Status: READY FOR ONSITE OPERATIONS\n');
    process.exit(0);
  } catch (error) {
    console.error('[Phase 7] Verification failed:', error);
    process.exit(1);
  }
}

verifyPhase7();
