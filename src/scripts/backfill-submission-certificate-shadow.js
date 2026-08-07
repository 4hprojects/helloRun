// src/scripts/backfill-submission-certificate-shadow.js
// Backfill MongoDB Submission and AccumulatedActivitySubmission into Supabase shadow tables

require('dotenv').config();
const mongoose = require('mongoose');
const { syncSubmissionShadow } = require('../services/submission-shadow.service');
const { getPostgresClient } = require('../db/postgres');

const BATCH_SIZE = 50;

/**
 * Submissions already in the shadow.
 *
 * Syncing each one is a round trip, so a rerun that redoes finished work can burn its
 * whole budget without reaching anything new — which is exactly how the registration
 * backfill kept stalling. Skipping what is present makes an interrupted run resumable.
 */
async function loadAlreadySynced(client) {
  const rows = await client`SELECT mongo_submission_id FROM submissions_core`;
  return new Set(rows.map((row) => row.mongo_submission_id));
}

async function backfillSubmissions() {
  console.log('Starting submission and certificate backfill...');

  try {
    // Connect to MongoDB if not already connected
    if (!mongoose.connection.readyState) {
      await mongoose.connect(process.env.MONGODB_URI);
    }

    // Load models
    require('../models/Submission');
    require('../models/Event');
    require('../models/Registration');
    require('../models/User');

    const Submission = mongoose.model('Submission');
    const client = await getPostgresClient();

    // Get total count
    const dryRun = process.argv.includes('--dry-run');
    const force = process.argv.includes('--force');

    const totalCount = await Submission.countDocuments({});
    const alreadySynced = force ? new Set() : await loadAlreadySynced(client);
    console.log(`Found ${totalCount} MongoDB submissions; ${alreadySynced.size} already in the shadow.`);
    if (dryRun) console.log('DRY RUN — nothing will be written.');

    let processed = 0;
    let synced = 0;
    let failed = 0;
    let skipped = 0;
    const failedIds = [];

    // Keyset pagination: a large .skip() gets slower the further in it goes, and this
    // has to stay usable as the collection grows.
    let lastId = null;
    for (;;) {
      const filter = lastId ? { _id: { $gt: lastId } } : {};
      const submissions = await Submission.find(filter)
        .sort({ _id: 1 })
        .limit(BATCH_SIZE)
        .lean();
      if (submissions.length === 0) break;

      for (const submission of submissions) {
        lastId = submission._id;
        processed++;

        if (alreadySynced.has(String(submission._id))) {
          skipped++;
          continue;
        }
        if (dryRun) {
          synced++;
          continue;
        }

        try {
          await syncSubmissionShadow(submission, { operation: 'backfill' });
          synced++;
        } catch (error) {
          console.error(`Failed to sync submission ${submission._id}:`, error.message);
          failed++;
          failedIds.push(submission._id.toString());
        }
      }

      if (processed % 200 === 0) {
        console.log(`Progress: ${processed}/${totalCount} (${synced} synced, ${skipped} skipped, ${failed} failed)`);
      }
    }

    // Verify backfill
    const verifyResult = await client`
      SELECT COUNT(*) as synced_count FROM migration_records 
      WHERE phase = 'phase_5_submission_certificate' AND status = 'synced'
    `;

    const syncedCount = parseInt(verifyResult[0].synced_count, 10);

    console.log('\n=== Backfill Complete ===');
    console.log(`Total MongoDB submissions: ${totalCount}`);
    console.log(`Successfully synced: ${synced}`);
    console.log(`Skipped (already present): ${skipped}`);
    console.log(`Failed: ${failed}`);
    console.log(`Supabase migration_records verified: ${syncedCount}`);

    if (failedIds.length > 0) {
      console.log(`Failed submission IDs (first 20): ${failedIds.slice(0, 20).join(', ')}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('Backfill error:', error);
    process.exit(1);
  }
}

backfillSubmissions();
