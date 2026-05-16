// src/scripts/verify-submission-certificate-shadow.js
// Verify MongoDB submissions and certificates are correctly mirrored in Supabase

require('dotenv').config();
const mongoose = require('mongoose');
const { getPostgresClient } = require('../db/postgres');

async function verifySubmissions() {
  console.log('Starting submission and certificate verification...');

  try {
    if (!mongoose.connection.readyState) {
      await mongoose.connect(process.env.MONGODB_URI);
    }

    // Load models
    require('../models/Submission');
    const Submission = mongoose.model('Submission');
    const sql = await getPostgresClient();

    // Count MongoDB submissions
    const mongoCount = await Submission.countDocuments({});
    console.log(`MongoDB submissions: ${mongoCount}`);

    // Count Supabase submissions_core
    const submissionResult = await sql`
      SELECT COUNT(*) as count FROM submissions_core
    `;
    const supabaseSubmissionCount = parseInt(submissionResult[0].count, 10);
    console.log(`Supabase submissions_core: ${supabaseSubmissionCount}`);

    // Count Supabase certificates
    const certificateResult = await sql`
      SELECT COUNT(*) as count FROM certificates
    `;
    const supabaseCertificateCount = parseInt(certificateResult[0].count, 10);
    console.log(`Supabase certificates: ${supabaseCertificateCount}`);

    // Find missing submissions (in MongoDB but not in Supabase)
    const submissions = await Submission.find({}).lean();
    const mongoIds = submissions.map(s => s._id.toString());

    const missingResult = await sql`
      SELECT mongo_submission_id FROM submissions_core 
      WHERE mongo_submission_id = ANY(${mongoIds})
    `;
    const supabaseIds = missingResult.map(r => r.mongo_submission_id);

    const missing = mongoIds.filter(id => !supabaseIds.includes(id));
    console.log(`Missing in Supabase: ${missing.length}`);
    if (missing.length > 0) {
      console.log(`  IDs: ${missing.slice(0, 5).join(', ')}${missing.length > 5 ? '...' : ''}`);
    }

    // Find extra submissions (in Supabase but not in MongoDB)
    const extraResult = await sql`
      SELECT mongo_submission_id FROM submissions_core 
      WHERE mongo_submission_id <> ALL(${mongoIds}) OR mongo_submission_id IS NULL
    `;
    const extra = extraResult.length;
    console.log(`Extra in Supabase: ${extra}`);

    // Verify migration_records tracking
    const trackingResult = await sql`
      SELECT status, COUNT(*) as count, COUNT(DISTINCT source_id) as unique_sources
      FROM migration_records 
      WHERE phase = 'phase_5_submission_certificate'
      GROUP BY status
    `;
    console.log(`\nMigration records tracking:`);
    trackingResult.forEach(row => {
      console.log(`  Status '${row.status}': ${row.count} records, ${row.unique_sources} unique submissions`);
    });

    // Summary
    console.log('\n=== Verification Summary ===');
    const status = missing.length === 0 && extra === 0 ? '✓ PASS' : '✗ FAIL';
    console.log(status);
    console.log(`MongoDB submissions: ${mongoCount}`);
    console.log(`Supabase submissions_core: ${supabaseSubmissionCount}`);
    console.log(`Missing: ${missing.length}`);
    console.log(`Extra: ${extra}`);

    process.exit(status === '✓ PASS' ? 0 : 1);
  } catch (error) {
    console.error('Verification error:', error);
    process.exit(1);
  }
}

verifySubmissions();
