const crypto = require('crypto');
const { getPostgresClient } = require('../db/postgres');

const PHASE = 'phase_4_registration_payment_shadow';

function normalizeMongoRegistration(registration) {
  if (!registration || !registration._id) {
    throw new Error('MongoDB registration is required.');
  }

  const participant = registration.participant || {};
  const paymentProof = registration.paymentProof || {};
  const waiver = registration.waiver || {};

  return {
    mongoRegistrationId: String(registration._id),
    mongoEventId: registration.eventId ? String(registration.eventId) : '',
    mongoUserId: registration.userId ? String(registration.userId) : '',
    confirmationCode: String(registration.confirmationCode || '').trim().toUpperCase(),
    participantFirstName: String(participant.firstName || '').trim(),
    participantLastName: String(participant.lastName || '').trim(),
    participantEmail: String(participant.email || '').trim().toLowerCase(),
    participantMobile: String(participant.mobile || '').trim(),
    participantCountry: String(participant.country || '').trim(),
    participantGender: String(participant.gender || '').trim(),
    emergencyContactName: String(participant.emergencyContactName || '').trim(),
    emergencyContactNumber: String(participant.emergencyContactNumber || '').trim(),
    runningGroup: String(participant.runningGroup || '').trim(),
    participationMode: normalizeRegistrationMode(registration.participationMode),
    raceDistance: String(registration.raceDistance || '').trim(),
    status: normalizeRegistrationStatus(registration.status),
    paymentStatus: normalizePaymentStatus(registration.paymentStatus),
    waiverAccepted: waiver.accepted !== false,
    waiverVersion: Number.isInteger(Number(waiver.version)) ? Number(waiver.version) : 1,
    waiverSignature: String(waiver.signature || '').trim(),
    waiverAcceptedAt: waiver.acceptedAt || null,
    registeredAt: registration.registeredAt || null,
    mongoCreatedAt: registration.createdAt || null,
    mongoUpdatedAt: registration.updatedAt || null,
    paymentProofUrl: String(paymentProof.url || '').trim(),
    paymentProofKey: String(paymentProof.key || '').trim(),
    paymentProofMimeType: String(paymentProof.mimeType || '').trim(),
    paymentProofSize: Number.isFinite(Number(paymentProof.size)) ? Number(paymentProof.size) : 0,
    paymentProofUploadedAt: paymentProof.uploadedAt || null,
    paymentProofSubmittedByMongoUserId: paymentProof.submittedBy ? String(paymentProof.submittedBy) : null,
    paymentSubmissionCount: Number.isInteger(Number(registration.paymentSubmissionCount))
      ? Number(registration.paymentSubmissionCount)
      : 0,
    paymentReviewedAt: registration.paymentReviewedAt || null,
    paymentReviewedByMongoUserId: registration.paymentReviewedBy ? String(registration.paymentReviewedBy) : null,
    paymentReviewNotes: String(registration.paymentReviewNotes || '').trim(),
    paymentRejectionReason: String(registration.paymentRejectionReason || '').trim()
  };
}

function buildRegistrationChecksum(normalized) {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify({
      mongoRegistrationId: normalized.mongoRegistrationId,
      mongoEventId: normalized.mongoEventId,
      mongoUserId: normalized.mongoUserId,
      confirmationCode: normalized.confirmationCode,
      participantEmail: normalized.participantEmail,
      participationMode: normalized.participationMode,
      raceDistance: normalized.raceDistance,
      status: normalized.status,
      paymentStatus: normalized.paymentStatus,
      registeredAt: isoOrEmpty(normalized.registeredAt)
    }))
    .digest('hex');
}

async function syncRegistrationPaymentShadow(registration, options = {}) {
  const sql = options.sql || getPostgresClient();
  const operation = options.operation || 'live_sync';
  const normalized = normalizeMongoRegistration(registration);
  const checksum = buildRegistrationChecksum(normalized);

  const eventRows = normalized.mongoEventId
    ? await sql`select id from events_core where mongo_event_id = ${normalized.mongoEventId} limit 1`
    : [];
  const userRows = normalized.mongoUserId
    ? await sql`select id from app_users where mongo_user_id = ${normalized.mongoUserId} limit 1`
    : [];
  const proofSubmittedByRows = normalized.paymentProofSubmittedByMongoUserId
    ? await sql`select id from app_users where mongo_user_id = ${normalized.paymentProofSubmittedByMongoUserId} limit 1`
    : [];
  const reviewedByRows = normalized.paymentReviewedByMongoUserId
    ? await sql`select id from app_users where mongo_user_id = ${normalized.paymentReviewedByMongoUserId} limit 1`
    : [];

  try {
    const registrationRows = await sql`
      insert into registrations (
        event_core_id,
        app_user_id,
        mongo_registration_id,
        mongo_event_id,
        mongo_user_id,
        confirmation_code,
        participant_first_name,
        participant_last_name,
        participant_email,
        participant_mobile,
        participant_country,
        participant_gender,
        emergency_contact_name,
        emergency_contact_number,
        running_group,
        participation_mode,
        race_distance,
        status,
        payment_status_snapshot,
        waiver_accepted,
        waiver_version,
        waiver_signature,
        waiver_accepted_at,
        registered_at,
        mongo_created_at,
        mongo_updated_at
      )
      values (
        ${eventRows[0]?.id || null},
        ${userRows[0]?.id || null},
        ${normalized.mongoRegistrationId},
        ${normalized.mongoEventId},
        ${normalized.mongoUserId},
        ${normalized.confirmationCode},
        ${normalized.participantFirstName},
        ${normalized.participantLastName},
        ${normalized.participantEmail},
        ${normalized.participantMobile},
        ${normalized.participantCountry},
        ${normalized.participantGender},
        ${normalized.emergencyContactName},
        ${normalized.emergencyContactNumber},
        ${normalized.runningGroup},
        ${normalized.participationMode},
        ${normalized.raceDistance},
        ${normalized.status},
        ${normalized.paymentStatus},
        ${normalized.waiverAccepted},
        ${normalized.waiverVersion},
        ${normalized.waiverSignature},
        ${normalized.waiverAcceptedAt},
        ${normalized.registeredAt},
        ${normalized.mongoCreatedAt},
        ${normalized.mongoUpdatedAt}
      )
      on conflict (mongo_registration_id)
      do update set
        event_core_id = excluded.event_core_id,
        app_user_id = excluded.app_user_id,
        mongo_event_id = excluded.mongo_event_id,
        mongo_user_id = excluded.mongo_user_id,
        confirmation_code = excluded.confirmation_code,
        participant_first_name = excluded.participant_first_name,
        participant_last_name = excluded.participant_last_name,
        participant_email = excluded.participant_email,
        participant_mobile = excluded.participant_mobile,
        participant_country = excluded.participant_country,
        participant_gender = excluded.participant_gender,
        emergency_contact_name = excluded.emergency_contact_name,
        emergency_contact_number = excluded.emergency_contact_number,
        running_group = excluded.running_group,
        participation_mode = excluded.participation_mode,
        race_distance = excluded.race_distance,
        status = excluded.status,
        payment_status_snapshot = excluded.payment_status_snapshot,
        waiver_accepted = excluded.waiver_accepted,
        waiver_version = excluded.waiver_version,
        waiver_signature = excluded.waiver_signature,
        waiver_accepted_at = excluded.waiver_accepted_at,
        registered_at = excluded.registered_at,
        mongo_created_at = excluded.mongo_created_at,
        mongo_updated_at = excluded.mongo_updated_at
      returning *
    `;

    const shadowRegistration = registrationRows[0];
    await sql`
      insert into payments (
        registration_id,
        mongo_registration_id,
        status,
        proof_url,
        proof_key,
        proof_mime_type,
        proof_size,
        proof_uploaded_at,
        proof_submitted_by_mongo_user_id,
        proof_submitted_by_user_id,
        submission_count,
        reviewed_at,
        reviewed_by_mongo_user_id,
        reviewed_by_user_id,
        review_notes,
        rejection_reason
      )
      values (
        ${shadowRegistration.id},
        ${normalized.mongoRegistrationId},
        ${normalized.paymentStatus},
        ${normalized.paymentProofUrl},
        ${normalized.paymentProofKey},
        ${normalized.paymentProofMimeType},
        ${normalized.paymentProofSize},
        ${normalized.paymentProofUploadedAt},
        ${normalized.paymentProofSubmittedByMongoUserId},
        ${proofSubmittedByRows[0]?.id || null},
        ${normalized.paymentSubmissionCount},
        ${normalized.paymentReviewedAt},
        ${normalized.paymentReviewedByMongoUserId},
        ${reviewedByRows[0]?.id || null},
        ${normalized.paymentReviewNotes},
        ${normalized.paymentRejectionReason}
      )
      on conflict (mongo_registration_id)
      do update set
        registration_id = excluded.registration_id,
        status = excluded.status,
        proof_url = excluded.proof_url,
        proof_key = excluded.proof_key,
        proof_mime_type = excluded.proof_mime_type,
        proof_size = excluded.proof_size,
        proof_uploaded_at = excluded.proof_uploaded_at,
        proof_submitted_by_mongo_user_id = excluded.proof_submitted_by_mongo_user_id,
        proof_submitted_by_user_id = excluded.proof_submitted_by_user_id,
        submission_count = excluded.submission_count,
        reviewed_at = excluded.reviewed_at,
        reviewed_by_mongo_user_id = excluded.reviewed_by_mongo_user_id,
        reviewed_by_user_id = excluded.reviewed_by_user_id,
        review_notes = excluded.review_notes,
        rejection_reason = excluded.rejection_reason
    `;

    await upsertMigrationRecord(sql, {
      sourceId: normalized.mongoRegistrationId,
      targetTable: 'registrations',
      targetId: String(shadowRegistration.id),
      operation,
      status: 'synced',
      checksum
    });

    return shadowRegistration;
  } catch (error) {
    await upsertMigrationRecord(sql, {
      sourceId: normalized.mongoRegistrationId,
      targetTable: 'registrations',
      targetId: null,
      operation,
      status: 'failed',
      checksum,
      errorCode: error.code || '',
      errorMessage: error.message || 'Unknown registration/payment shadow sync failure.'
    }).catch(() => {});
    throw error;
  }
}

async function upsertMigrationRecord(sql, input) {
  const now = new Date();
  const syncedAt = input.status === 'synced' ? now : null;
  return sql`
    insert into migration_records (
      phase,
      source_system,
      source_collection,
      source_id,
      target_system,
      target_table,
      target_id,
      operation,
      status,
      checksum,
      error_code,
      error_message,
      attempted_at,
      synced_at
    )
    values (
      ${PHASE},
      'mongodb',
      'registrations',
      ${input.sourceId},
      'supabase',
      ${input.targetTable},
      ${input.targetId},
      ${input.operation},
      ${input.status},
      ${input.checksum},
      ${input.errorCode || ''},
      ${input.errorMessage || ''},
      ${now},
      ${syncedAt}
    )
    on conflict (
      source_system,
      source_collection,
      source_id,
      target_system,
      target_table
    )
    do update set
      phase = excluded.phase,
      target_id = excluded.target_id,
      operation = excluded.operation,
      status = excluded.status,
      checksum = excluded.checksum,
      error_code = excluded.error_code,
      error_message = excluded.error_message,
      attempted_at = excluded.attempted_at,
      synced_at = excluded.synced_at
    returning *
  `;
}

function normalizeRegistrationStatus(value) {
  const status = String(value || '').trim().toLowerCase();
  if (['pending_payment', 'paid', 'confirmed', 'cancelled', 'refunded'].includes(status)) return status;
  return 'confirmed';
}

function normalizePaymentStatus(value) {
  const status = String(value || '').trim().toLowerCase();
  if (['unpaid', 'proof_submitted', 'proof_rejected', 'paid', 'failed', 'refunded'].includes(status)) return status;
  return 'unpaid';
}

function normalizeRegistrationMode(value) {
  const mode = String(value || '').trim().toLowerCase();
  return mode === 'onsite' ? 'onsite' : 'virtual';
}

function isoOrEmpty(value) {
  return value ? new Date(value).toISOString() : '';
}

module.exports = {
  PHASE,
  normalizeMongoRegistration,
  buildRegistrationChecksum,
  syncRegistrationPaymentShadow
};
