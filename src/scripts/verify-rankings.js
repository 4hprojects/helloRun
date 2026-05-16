#!/usr/bin/env node
// src/scripts/verify-rankings.js
// Verify rankings backfill completeness

require('dotenv').config();
const mongoose = require('mongoose');
const { getPostgresClient } = require('../db/postgres');
const Submission = require('../models/Submission');
const Event = require('../models/Event');

async function verifyRankings() {
  let mongoConnection;

  try {
    // Connect to MongoDB
    mongoConnection = await mongoose.connect(process.env.MONGODB_URI);
    const sql = getPostgresClient();

    console.log('[Verify] Checking rankings completeness...\n');

    // Count MongoDB approved submissions (non-personal records, published events)
    const publishedEvents = await Event.find({
      status: 'published',
      isDeleted: { $ne: true }
    }).lean();
    const publishedEventIds = publishedEvents.map((e) => e._id);

    const mongoSubmissions = await Submission.countDocuments({
      status: 'approved',
      isPersonalRecord: { $ne: true },
      eventId: { $in: publishedEventIds }
    });

    // Count Supabase rankings
    const supbaseRankingsResult = await sql`
      SELECT COUNT(*) as count FROM rankings WHERE published_at IS NOT NULL
    `;
    const supabaseRankings = Number(supbaseRankingsResult[0].count);

    // Count migration records for rankings
    const migrationResult = await sql`
      SELECT COUNT(*) as count FROM migration_records
      WHERE phase = 'phase_6_rankings' AND status = 'synced'
    `;
    const syncedRecords = Number(migrationResult[0].count);

    console.log(`MongoDB approved submissions (published events): ${mongoSubmissions}`);
    console.log(`Supabase published rankings: ${supabaseRankings}`);
    console.log(`Migration records (synced): ${syncedRecords}\n`);

    // Check for missing rankings
    const missing = mongoSubmissions - syncedRecords;
    const extra = supabaseRankings - syncedRecords;

    if (missing > 0) {
      console.log(`⚠️  Missing: ${missing} submissions not yet ranked`);
    }
    if (extra > 0) {
      console.log(`⚠️  Extra: ${extra} rankings without migration records`);
    }

    // Get event-specific breakdown
    console.log('\n[Verify] Event ranking breakdown:');
    const eventBreakdown = await sql`
      SELECT
        e.title,
        e.slug,
        COUNT(DISTINCT r.mongo_submission_id) as ranking_count,
        COUNT(DISTINCT CASE WHEN r.leaderboard_type = 'single_activity' THEN r.mongo_submission_id END) as single_activity_count,
        COUNT(DISTINCT CASE WHEN r.leaderboard_type = 'accumulated' THEN r.mongo_submission_id END) as accumulated_count
      FROM rankings r
      JOIN events_core e ON r.event_core_id = e.id
      WHERE r.published_at IS NOT NULL
      GROUP BY e.id, e.title, e.slug
      ORDER BY ranking_count DESC
      LIMIT 10
    `;

    for (const row of eventBreakdown) {
      console.log(
        `  ${row.title} (${row.slug}): ${row.ranking_count} rankings (${row.single_activity_count} single, ${row.accumulated_count} accumulated)`
      );
    }

    // Verification summary
    const verificationStatus = missing === 0 && extra === 0 ? '✓ PASS' : '✗ FAIL';
    console.log(`\nVerification Summary: ${verificationStatus}`);

    if (missing === 0 && extra === 0) {
      console.log(`All ${mongoSubmissions} approved submissions are ranked correctly.`);
    }
  } catch (error) {
    console.error('[Verify] Error:', error.message);
    process.exit(1);
  } finally {
    if (mongoConnection) {
      await mongoConnection.disconnect();
    }
  }
}

verifyRankings();
