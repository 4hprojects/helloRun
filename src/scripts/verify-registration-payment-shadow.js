require('dotenv').config();

const mongoose = require('mongoose');
const Registration = require('../models/Registration');
const { getPostgresClient, closePostgresClient } = require('../db/postgres');
const { normalizeMongoRegistration } = require('../services/registration-payment-shadow.service');

async function main() {
  const sql = getPostgresClient();
  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 120000
  });

  const mongoRegistrations = await Registration.find({}).sort({ registeredAt: 1, createdAt: 1 }).lean();
  const shadowRegistrations = await sql`
    select
      r.id,
      r.mongo_registration_id,
      r.mongo_event_id,
      r.mongo_user_id,
      r.confirmation_code,
      r.participant_email,
      r.participation_mode,
      r.race_distance,
      r.status,
      r.payment_status_snapshot,
      r.waiver_version,
      r.registered_at,
      p.status as payment_status,
      p.proof_url,
      p.proof_key,
      p.proof_mime_type,
      p.proof_size,
      p.proof_uploaded_at,
      p.proof_submitted_by_mongo_user_id,
      p.submission_count,
      p.reviewed_at,
      p.reviewed_by_mongo_user_id,
      p.review_notes,
      p.rejection_reason
    from registrations r
    left join payments p on p.registration_id = r.id
  `;

  const shadowByMongoId = new Map(shadowRegistrations.map((row) => [String(row.mongo_registration_id), row]));
  const missing = [];
  const mismatched = [];

  for (const registration of mongoRegistrations) {
    const normalized = normalizeMongoRegistration(registration);
    const row = shadowByMongoId.get(normalized.mongoRegistrationId);
    if (!row) {
      missing.push({
        mongoRegistrationId: normalized.mongoRegistrationId,
        confirmationCode: normalized.confirmationCode
      });
      continue;
    }

    const differences = compareRegistration(normalized, row);
    if (differences.length) {
      mismatched.push({
        mongoRegistrationId: normalized.mongoRegistrationId,
        confirmationCode: normalized.confirmationCode,
        differences
      });
    }
  }

  const mongoIds = new Set(mongoRegistrations.map((registration) => String(registration._id)));
  const extra = shadowRegistrations
    .filter((row) => !mongoIds.has(String(row.mongo_registration_id)))
    .map((row) => ({
      registrationId: String(row.id),
      mongoRegistrationId: String(row.mongo_registration_id),
      confirmationCode: row.confirmation_code
    }));

  const result = {
    mongoRegistrationCount: mongoRegistrations.length,
    shadowRegistrationCount: shadowRegistrations.length,
    missingCount: missing.length,
    mismatchedCount: mismatched.length,
    extraCount: extra.length,
    missing: missing.slice(0, 20),
    mismatched: mismatched.slice(0, 20),
    extra: extra.slice(0, 20)
  };

  console.log(JSON.stringify(result, null, 2));
  if (missing.length || mismatched.length) process.exitCode = 1;
}

function compareRegistration(normalized, row) {
  const differences = [];
  compareValue(differences, 'mongo_event_id', normalized.mongoEventId, row.mongo_event_id);
  compareValue(differences, 'mongo_user_id', normalized.mongoUserId, row.mongo_user_id);
  compareValue(differences, 'confirmation_code', normalized.confirmationCode, row.confirmation_code);
  compareValue(differences, 'participant_email', normalized.participantEmail, row.participant_email);
  compareValue(differences, 'participation_mode', normalized.participationMode, row.participation_mode);
  compareValue(differences, 'race_distance', normalized.raceDistance, row.race_distance);
  compareValue(differences, 'status', normalized.status, row.status);
  compareValue(differences, 'payment_status_snapshot', normalized.paymentStatus, row.payment_status_snapshot);
  compareValue(differences, 'waiver_version', normalized.waiverVersion, row.waiver_version);
  compareDate(differences, 'registered_at', normalized.registeredAt, row.registered_at);
  compareValue(differences, 'payment_status', normalized.paymentStatus, row.payment_status);
  compareValue(differences, 'proof_url', normalized.paymentProofUrl, row.proof_url);
  compareValue(differences, 'proof_key', normalized.paymentProofKey, row.proof_key);
  compareValue(differences, 'proof_mime_type', normalized.paymentProofMimeType, row.proof_mime_type);
  compareValue(differences, 'proof_size', normalized.paymentProofSize, row.proof_size);
  compareDate(differences, 'proof_uploaded_at', normalized.paymentProofUploadedAt, row.proof_uploaded_at);
  compareValue(
    differences,
    'proof_submitted_by_mongo_user_id',
    normalized.paymentProofSubmittedByMongoUserId,
    row.proof_submitted_by_mongo_user_id
  );
  compareValue(differences, 'submission_count', normalized.paymentSubmissionCount, row.submission_count);
  compareDate(differences, 'reviewed_at', normalized.paymentReviewedAt, row.reviewed_at);
  compareValue(differences, 'reviewed_by_mongo_user_id', normalized.paymentReviewedByMongoUserId, row.reviewed_by_mongo_user_id);
  compareValue(differences, 'review_notes', normalized.paymentReviewNotes, row.review_notes);
  compareValue(differences, 'rejection_reason', normalized.paymentRejectionReason, row.rejection_reason);
  return differences;
}

function compareValue(differences, field, expected, actual) {
  if (String(expected ?? '') !== String(actual ?? '')) {
    differences.push({ field, expected: expected ?? null, actual: actual ?? null });
  }
}

function compareDate(differences, field, expected, actual) {
  const expectedIso = expected ? new Date(expected).toISOString() : '';
  const actualIso = actual ? new Date(actual).toISOString() : '';
  if (expectedIso !== actualIso) {
    differences.push({ field, expected: expectedIso || null, actual: actualIso || null });
  }
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
    await closePostgresClient();
  });
