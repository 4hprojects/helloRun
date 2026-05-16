// src/scripts/backfill-submission-certificate-shadow.js
// Backfill MongoDB Submission and AccumulatedActivitySubmission into Supabase shadow tables

require('dotenv').config();
const mongoose = require('mongoose');
const { syncSubmissionShadow } = require('../services/submission-shadow.service');
const { getPostgresClient } = require('../db/postgres');

const BATCH_SIZE = 50;

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
    const totalCount = await Submission.countDocuments({});
    console.log(`Found ${totalCount} MongoDB submissions to backfill`);

    let processed = 0;
    let synced = 0;
    let failed = 0;
    const failedIds = [];

    // Process in batches
    for (let skip = 0; skip < totalCount; skip += BATCH_SIZE) {
      const submissions = await Submission.find({})
        .skip(skip)
        .limit(BATCH_SIZE)
        .lean();

      for (const submission of submissions) {
        try {
          await syncSubmissionShadow(submission, { operation: 'backfill' });
          synced++;
        } catch (error) {
          console.error(`Failed to sync submission ${submission._id}:`, error.message);
          failed++;
          failedIds.push(submission._id.toString());
        }
        processed++;

        if (processed % 100 === 0) {
          console.log(`Progress: ${processed}/${totalCount} (${synced} synced, ${failed} failed)`);
        }
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
    console.log(`Failed: ${failed}`);
    console.log(`Supabase migration_records verified: ${syncedCount}`);

    if (failedIds.length > 0) {
      console.log(`Failed submission IDs: ${failedIds.join(', ')}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('Backfill error:', error);
    process.exit(1);
  }
}

backfillSubmissions();
