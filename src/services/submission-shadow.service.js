// src/services/submission-shadow.service.js
// Normalizes MongoDB Submission/AccumulatedActivitySubmission into Supabase shadow tables

const crypto = require('crypto');
const logger = require('../utils/logger');
const { getPostgresClient } = require('../db/postgres');
const { toPostgresSmokeMeta } = require('../utils/smoke-test-meta');

let disableSubmissionShadowSync = false;

/**
 * Normalize MongoDB Submission into Supabase submissions_core record
 * 
 * FIELDS SYNCED (official submission state):
 * - mongo_submission_id: official document reference
 * - registration_id, runner_user_id, event_id: relational references
 * - distance_km, elapsed_ms, run_date, run_type: official result metrics
 * - proof_type, proof_url, proof_key: proof metadata only
 * - submission_status: submitted/approved/rejected state
 * - is_personal_record: official flag
 * - submitted_at, reviewed_at, reviewed_by: audit trail
 * 
 * FIELDS NOT SYNCED (OCR payload stays in MongoDB):
 * - ocrData: extraction scores, confidence, candidate names, mismatches
 * - suspiciousFlag, suspiciousFlagReason: manual review flags
 * - stravaActivity: source metadata for traceability
 * - proofNotes, runLocation, elevationGain, steps: flexible details
 * 
 * @param {Object} submission MongoDB Submission document
 * @returns {Object} normalized submission object
 */
function normalizeMongoSubmission(submission) {
  return {
    mongo_submission_id: submission._id.toString(),
    registration_id: submission.registrationId?.toString(),
    runner_user_id: submission.runnerId?.toString(),
    event_id: submission.eventId?.toString(),
    distance_km: submission.distanceKm || 0,
    elapsed_ms: submission.elapsedMs || 0,
    run_date: submission.runDate ? new Date(submission.runDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    participation_mode: submission.participationMode || 'virtual',
    run_type: submission.runType || 'run',
    proof_type: submission.proofType || 'manual',
    proof_url: submission.proof?.url || '',
    proof_key: submission.proof?.key || '',
    proof_mime_type: submission.proof?.mimeType || '',
    submission_status: submission.status || 'submitted',
    is_personal_record: submission.isPersonalRecord || false,
    submitted_at: submission.submittedAt ? new Date(submission.submittedAt) : new Date(),
    reviewed_at: submission.reviewedAt ? new Date(submission.reviewedAt) : null,
    reviewed_by: submission.reviewedBy?.toString() || null,
    smokeMeta: toPostgresSmokeMeta(submission)
  };
}

/**
 * Build stable checksum for submission fields
 * @param {Object} normalized normalized submission object
 * @returns {string} SHA256 checksum
 */
function buildSubmissionChecksum(normalized) {
  const fields = [
    normalized.distance_km,
    normalized.elapsed_ms,
    normalized.proof_type,
    normalized.submission_status,
    normalized.is_personal_record
  ].join('|');
  return crypto.createHash('sha256').update(fields).digest('hex');
}

/**
 * Normalize MongoDB certificate metadata into Supabase certificates record
 * @param {Object} submission MongoDB Submission document with certificate
 * @param {Object} submissionCoreRow Supabase submissions_core row
 * @returns {Object|null} normalized certificate or null if no certificate
 */
function normalizeMongoSubmissionCertificate(submission, submissionCoreRow) {
  if (!submission.certificate || !submission.certificate.url || !submission.certificate.issuedAt) {
    return null;
  }

  return {
    mongo_certificate_id: `cert_${submission._id.toString()}`,
    submission_id: submissionCoreRow.id,
    runner_user_id: submissionCoreRow.runner_user_id,
    event_id: submissionCoreRow.event_id,
    certificate_url: submission.certificate.url || '',
    certificate_key: submission.certificate.key || '',
    issued_at: new Date(submission.certificate.issuedAt),
    issued_by: submission.reviewedBy?.toString() || null,
    certificate_type: 'finisher',
    certificate_template_id: submission.certificate.templateId?.toString() || null,
    certificate_number: submission.certificate.certificateNumber || null,
    verification_url: submission.certificate.verificationUrl || null,
    status: submission.certificate.status || 'generated',
    generated_at: new Date(submission.certificate.issuedAt),
    regenerated_at: submission.certificate.regeneratedAt ? new Date(submission.certificate.regeneratedAt) : null,
    revoked_at: submission.certificate.revokedAt ? new Date(submission.certificate.revokedAt) : null,
    generation_error: submission.certificate.generationError || null,
    goal_distance_km: finiteOrNull(submission.certificate.goalDistanceKm),
    verified_distance_km: finiteOrNull(submission.certificate.verifiedDistanceKm),
    approved_activity_count: integerOrNull(submission.certificate.approvedActivityCount),
    finalized_at: submission.certificate.finalizedAt ? new Date(submission.certificate.finalizedAt) : null
  };
}

/**
 * Sync a MongoDB Submission to Supabase shadow tables
 * @param {Object} submission MongoDB Submission document
 * @param {Object} options sync options { operation: 'live_sync' | 'backfill', sql: postgres client }
 * @returns {Promise<Object>} synced submission and certificate rows
 */
async function syncSubmissionShadow(submission, options = {}) {
  if (disableSubmissionShadowSync) {
    return null;
  }
  const sql = options.sql || getPostgresClient();
  const operation = options.operation || 'live_sync';

  try {
    // Normalize MongoDB submission
    const normalizedSubmission = normalizeMongoSubmission(submission);
    const checksum = buildSubmissionChecksum(normalizedSubmission);

    // Try to look up registration by mongo_registration_id
    let registrationRow = null;
    let eventId = null;
    let appUserId = null;
    let registrationId = null;

    if (normalizedSubmission.registration_id) {
      const registrationRows = await sql`
        SELECT r.id, r.app_user_id, r.event_core_id
        FROM registrations r
        WHERE r.mongo_registration_id = ${normalizedSubmission.registration_id}
        LIMIT 1
      `;

      if (registrationRows.length > 0) {
        registrationRow = registrationRows[0];
        registrationId = registrationRow.id;
        eventId = registrationRow.event_core_id;
        appUserId = registrationRow.app_user_id;
      }
    }

    // If registration lookup failed or has NULL references, look up event and user directly
    if (!eventId && normalizedSubmission.event_id) {
      const eventRows = await sql`
        SELECT id FROM events_core WHERE mongo_event_id = ${normalizedSubmission.event_id} LIMIT 1
      `;
      if (eventRows.length > 0) {
        eventId = eventRows[0].id;
      }
    }

    if (!appUserId && normalizedSubmission.runner_user_id) {
      const userRows = await sql`
        SELECT id FROM app_users WHERE mongo_user_id = ${normalizedSubmission.runner_user_id} LIMIT 1
      `;
      if (userRows.length > 0) {
        appUserId = userRows[0].id;
      }
    }

    // Verify we have required references
    if (!eventId) {
      throw new Error(`Event not found for submission ${submission._id} (event mongo_id: ${normalizedSubmission.event_id})`);
    }

    if (!appUserId) {
      throw new Error(`App user not found for submission ${submission._id} (user mongo_id: ${normalizedSubmission.runner_user_id})`);
    }

    let reviewedByAppUserId = null;
    if (normalizedSubmission.reviewed_by) {
      const reviewerRows = await sql`
        SELECT id FROM app_users WHERE mongo_user_id = ${normalizedSubmission.reviewed_by} LIMIT 1
      `;
      reviewedByAppUserId = reviewerRows[0]?.id || null;
    }

    // Upsert submissions_core
    const submissionResult = await sql`
      INSERT INTO submissions_core (
        mongo_submission_id, registration_id, runner_user_id, event_id, 
        distance_km, elapsed_ms, run_date, participation_mode, run_type, 
        proof_type, proof_url, proof_key, proof_mime_type, submission_status, 
        is_personal_record, submitted_at, reviewed_at, reviewed_by, updated_at,
        is_smoke_test, test_run_id, created_by_test, expires_at
      ) VALUES (
        ${normalizedSubmission.mongo_submission_id}, 
        ${registrationId}, 
        ${appUserId}, 
        ${eventId},
        ${normalizedSubmission.distance_km},
        ${normalizedSubmission.elapsed_ms},
        ${normalizedSubmission.run_date},
        ${normalizedSubmission.participation_mode},
        ${normalizedSubmission.run_type},
        ${normalizedSubmission.proof_type},
        ${normalizedSubmission.proof_url},
        ${normalizedSubmission.proof_key},
        ${normalizedSubmission.proof_mime_type},
        ${normalizedSubmission.submission_status},
        ${normalizedSubmission.is_personal_record},
        ${normalizedSubmission.submitted_at},
        ${normalizedSubmission.reviewed_at},
        ${reviewedByAppUserId},
        CURRENT_TIMESTAMP,
        ${normalizedSubmission.smokeMeta.is_smoke_test},
        ${normalizedSubmission.smokeMeta.test_run_id || null},
        ${normalizedSubmission.smokeMeta.created_by_test || null},
        ${normalizedSubmission.smokeMeta.expires_at}
      )
      ON CONFLICT (mongo_submission_id) DO UPDATE SET
        submission_status = EXCLUDED.submission_status,
        proof_url = EXCLUDED.proof_url,
        proof_key = EXCLUDED.proof_key,
        reviewed_at = EXCLUDED.reviewed_at,
        reviewed_by = EXCLUDED.reviewed_by,
        updated_at = CURRENT_TIMESTAMP,
        is_smoke_test = EXCLUDED.is_smoke_test,
        test_run_id = EXCLUDED.test_run_id,
        created_by_test = EXCLUDED.created_by_test,
        expires_at = EXCLUDED.expires_at
      RETURNING *
    `;

    const submissionCoreRow = submissionResult[0];

    // Handle certificate if present
    let certificateRow = null;
    const normalizedCertificate = normalizeMongoSubmissionCertificate(submission, submissionCoreRow);
    if (normalizedCertificate) {
      const certResult = await sql`
        INSERT INTO certificates (
          mongo_certificate_id, submission_id, runner_user_id, event_id,
          registration_id, certificate_url, certificate_key, issued_at, issued_by, certificate_type,
          certificate_template_id, certificate_number, verification_url, status, generated_at,
          regenerated_at, revoked_at, generation_error, goal_distance_km,
          verified_distance_km, approved_activity_count, finalized_at, updated_at,
          is_smoke_test, test_run_id, created_by_test, expires_at
        ) VALUES (
          ${normalizedCertificate.mongo_certificate_id},
          ${normalizedCertificate.submission_id},
          ${appUserId},
          ${eventId},
          ${registrationId},
          ${normalizedCertificate.certificate_url},
          ${normalizedCertificate.certificate_key},
          ${normalizedCertificate.issued_at},
          ${normalizedCertificate.issued_by},
          ${normalizedCertificate.certificate_type},
          ${normalizedCertificate.certificate_template_id},
          ${normalizedCertificate.certificate_number},
          ${normalizedCertificate.verification_url},
          ${normalizedCertificate.status},
          ${normalizedCertificate.generated_at},
          ${normalizedCertificate.regenerated_at},
          ${normalizedCertificate.revoked_at},
          ${normalizedCertificate.generation_error},
          ${normalizedCertificate.goal_distance_km},
          ${normalizedCertificate.verified_distance_km},
          ${normalizedCertificate.approved_activity_count},
          ${normalizedCertificate.finalized_at},
          CURRENT_TIMESTAMP,
          ${normalizedSubmission.smokeMeta.is_smoke_test},
          ${normalizedSubmission.smokeMeta.test_run_id || null},
          ${normalizedSubmission.smokeMeta.created_by_test || null},
          ${normalizedSubmission.smokeMeta.expires_at}
        )
        ON CONFLICT (mongo_certificate_id) DO UPDATE SET
          certificate_url = EXCLUDED.certificate_url,
          certificate_key = EXCLUDED.certificate_key,
          issued_at = EXCLUDED.issued_at,
          registration_id = EXCLUDED.registration_id,
          certificate_template_id = EXCLUDED.certificate_template_id,
          certificate_number = EXCLUDED.certificate_number,
          verification_url = EXCLUDED.verification_url,
          status = EXCLUDED.status,
          generated_at = EXCLUDED.generated_at,
          regenerated_at = EXCLUDED.regenerated_at,
          revoked_at = EXCLUDED.revoked_at,
          generation_error = EXCLUDED.generation_error,
          goal_distance_km = EXCLUDED.goal_distance_km,
          verified_distance_km = EXCLUDED.verified_distance_km,
          approved_activity_count = EXCLUDED.approved_activity_count,
          finalized_at = EXCLUDED.finalized_at,
          updated_at = CURRENT_TIMESTAMP,
          is_smoke_test = EXCLUDED.is_smoke_test,
          test_run_id = EXCLUDED.test_run_id,
          created_by_test = EXCLUDED.created_by_test,
          expires_at = EXCLUDED.expires_at
        RETURNING *
      `;
      certificateRow = certResult[0];
    }

    // Log to migration_records
    await sql`
      INSERT INTO migration_records (
        phase, source_system, source_collection, source_id, 
        target_system, target_table, target_id, operation, status, checksum, synced_at,
        is_smoke_test, test_run_id, created_by_test, expires_at
      ) VALUES (
        'phase_5_submission_certificate',
        'mongodb',
        'submissions',
        ${submission._id.toString()},
        'supabase',
        'submissions_core',
        ${submissionCoreRow.id},
        ${operation},
        'synced',
        ${checksum},
        CURRENT_TIMESTAMP,
        ${normalizedSubmission.smokeMeta.is_smoke_test},
        ${normalizedSubmission.smokeMeta.test_run_id || null},
        ${normalizedSubmission.smokeMeta.created_by_test || null},
        ${normalizedSubmission.smokeMeta.expires_at}
      )
      ON CONFLICT (source_system, source_collection, source_id, target_system, target_table) 
      DO UPDATE SET
        status = 'synced',
        synced_at = CURRENT_TIMESTAMP,
        is_smoke_test = EXCLUDED.is_smoke_test,
        test_run_id = EXCLUDED.test_run_id,
        created_by_test = EXCLUDED.created_by_test,
        expires_at = EXCLUDED.expires_at
    `;

    return {
      submissionCore: submissionCoreRow,
      certificate: certificateRow,
      checksum
    };
  } catch (error) {
    logger.error('Submission shadow sync error:', error.message);
    throw error;
  }
}

function finiteOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function integerOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 ? number : null;
}

function __setDisableSubmissionShadowSync(value) {
  disableSubmissionShadowSync = Boolean(value);
}

module.exports = {
  normalizeMongoSubmission,
  buildSubmissionChecksum,
  normalizeMongoSubmissionCertificate,
  syncSubmissionShadow,
  __setDisableSubmissionShadowSync
};
