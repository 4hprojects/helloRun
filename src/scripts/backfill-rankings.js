#!/usr/bin/env node
// src/scripts/backfill-rankings.js
// Backfill rankings table from approved submissions

require('dotenv').config();
const mongoose = require('mongoose');
const { getPostgresClient } = require('../db/postgres');
const Submission = require('../models/Submission');
const Event = require('../models/Event');
const User = require('../models/User');
const {
  normalizeSingleActivityRanking,
  buildRankingChecksum,
  syncRankingEntry
} = require('../services/ranking.service');

async function backfillRankings() {
  let mongoConnection;
  let successCount = 0;
  let failureCount = 0;
  const sql = getPostgresClient();

  try {
    // Connect to MongoDB
    mongoConnection = await mongoose.connect(process.env.MONGODB_URI);
    console.log('[Backfill] Connected to MongoDB');

    // Get all approved submissions (excluding personal records)
    const approvedSubmissions = await Submission.find({
      status: 'approved',
      isPersonalRecord: { $ne: true }
    })
      .populate({ path: 'eventId', select: 'title slug status isDeleted' })
      .populate({ path: 'runnerId', select: 'firstName lastName' })
      .lean()
      .exec();

    console.log(`[Backfill] Found ${approvedSubmissions.length} approved submissions`);

    if (approvedSubmissions.length === 0) {
      console.log('[Backfill] No submissions to backfill. Exiting.');
      return;
    }

    // Filter visible submissions (published, non-deleted events)
    const visibleSubmissions = approvedSubmissions.filter(
      (s) => s.eventId && s.eventId.status === 'published' && s.eventId.isDeleted !== true
    );

    console.log(`[Backfill] ${visibleSubmissions.length} submissions from published events`);

    // Group and rank by event/distance/mode
    const groupedByEvent = new Map();
    for (const sub of visibleSubmissions) {
      const key = `${sub.eventId._id}|${sub.raceDistance}|${sub.participationMode}`;
      if (!groupedByEvent.has(key)) {
        groupedByEvent.set(key, []);
      }
      groupedByEvent.get(key).push(sub);
    }

    console.log(`[Backfill] Grouped into ${groupedByEvent.size} event/distance/mode combinations`);

    // Process each group
    for (const [groupKey, submissions] of groupedByEvent.entries()) {
      const [eventId, distance, mode] = groupKey.split('|');

      // Sort by elapsed time (ascending) for ranking
      submissions.sort((a, b) => (a.elapsedMs || 0) - (b.elapsedMs || 0));

      // Sync each ranked submission
      for (let rank = 0; rank < submissions.length; rank++) {
        const sub = submissions[rank];
        try {
          const normalized = normalizeSingleActivityRanking(
            {
              submissionId: sub._id.toString(),
              raceDistance: sub.raceDistance,
              participationMode: sub.participationMode,
              elapsedMs: sub.elapsedMs,
              submittedAt: sub.submittedAt,
              leaderboardType: 'single_activity'
            },
            rank + 1
          );

          const checksum = buildRankingChecksum(normalized);

          // Lookup event and submission in Supabase
          const [eventRows, submissionRows] = await Promise.all([
            sql`SELECT id FROM events_core WHERE slug = ${sub.eventId.slug} LIMIT 1`,
            sql`SELECT runner_user_id FROM submissions_core WHERE mongo_submission_id = ${sub._id.toString()} LIMIT 1`
          ]);

          if (eventRows.length === 0 || submissionRows.length === 0) {
            console.warn(
              `[Backfill] Skipping submission ${sub._id}: event or submission not found in Supabase`
            );
            continue;
          }

          const eventCoreId = eventRows[0].id;
          const runnerUserId = submissionRows[0].runner_user_id;

          // Insert ranking
          await sql`
            INSERT INTO rankings (
              mongo_submission_id, event_core_id, runner_user_id,
              leaderboard_type, rank_position, race_distance, participation_mode,
              elapsed_ms, approved_distance_km, approved_activity_count,
              submitted_at, calculated_at
            ) VALUES (
              ${normalized.mongo_submission_id},
              ${eventCoreId},
              ${runnerUserId},
              ${normalized.leaderboard_type},
              ${normalized.rank_position},
              ${normalized.race_distance},
              ${normalized.participation_mode},
              ${normalized.elapsed_ms},
              ${normalized.approved_distance_km},
              ${normalized.approved_activity_count},
              ${normalized.submitted_at},
              CURRENT_TIMESTAMP
            )
            ON CONFLICT (mongo_submission_id) DO UPDATE SET
              rank_position = EXCLUDED.rank_position,
              updated_at = CURRENT_TIMESTAMP
          `;

          // Log to migration_records
          await sql`
            INSERT INTO migration_records (
              phase, source_system, source_collection, source_id,
              target_system, target_table, target_id, operation, status, checksum, synced_at
            ) VALUES (
              'phase_6_rankings',
              'mongodb',
              'submissions',
              ${sub._id.toString()},
              'supabase',
              'rankings',
              '',
              'backfill',
              'synced',
              ${checksum},
              CURRENT_TIMESTAMP
            )
            ON CONFLICT (source_system, source_collection, source_id, target_system, target_table)
            DO UPDATE SET status = 'synced', synced_at = CURRENT_TIMESTAMP
          `;

          successCount++;
        } catch (error) {
          console.error(`[Backfill] Error syncing submission ${sub._id}:`, error.message);
          failureCount++;
        }
      }
    }

    console.log(
      `[Backfill] Completed: ${successCount} synced, ${failureCount} failed`
    );

    // Publish all successfully synced rankings
    if (successCount > 0) {
      console.log('[Backfill] Publishing rankings...');
      try {
        const publishResult = await sql`
          UPDATE rankings
          SET published_at = CURRENT_TIMESTAMP
          WHERE published_at IS NULL
          RETURNING id
        `;
        console.log(`[Backfill] Published ${publishResult.length} rankings`);
      } catch (error) {
        console.error('[Backfill] Error publishing rankings:', error.message);
      }
    }
  } catch (error) {
    console.error('[Backfill] Fatal error:', error.message);
    process.exit(1);
  } finally {
    if (mongoConnection) {
      await mongoConnection.disconnect();
    }
  }
}

backfillRankings();
