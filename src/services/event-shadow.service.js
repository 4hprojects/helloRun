const crypto = require('crypto');
const { getPostgresClient } = require('../db/postgres');
const { syncAppUserFromMongoUser } = require('./user-bridge.service');
const { toPostgresSmokeMeta } = require('../utils/smoke-test-meta');

const PHASE = 'phase_3_event_core_shadow';

function normalizeMongoOrganiser({ user, application }) {
  if (!user || !user._id) {
    throw new Error('MongoDB organiser user is required.');
  }

  return {
    mongoUserId: String(user._id),
    email: String(user.email || '').trim().toLowerCase(),
    mongoApplicationId: application?._id ? String(application._id) : null,
    applicationReference: String(application?.applicationId || '').trim(),
    businessName: String(application?.businessName || user.organisationName || user.organizationName || '').trim(),
    businessType: String(application?.businessType || '').trim(),
    contactPhone: String(application?.contactPhone || user.mobile || '').trim(),
    businessRegistrationNumber: String(application?.businessRegistrationNumber || '').trim(),
    businessAddress: String(application?.businessAddress || '').trim(),
    status: normalizeOrganiserStatus(application?.status || user.organizerStatus || 'approved'),
    reviewedAt: application?.reviewedAt || null,
    submittedAt: application?.submittedAt || application?.createdAt || null,
    smokeMeta: toPostgresSmokeMeta(application?.isSmokeTest ? application : user)
  };
}

function normalizeMongoEvent(event) {
  if (!event || !event._id) {
    throw new Error('MongoDB event is required.');
  }

  const distances = Array.from(new Set((event.raceDistances || [])
    .map((item) => String(item || '').trim())
    .filter(Boolean)));

  return {
    mongoEventId: String(event._id),
    mongoOrganizerUserId: event.organizerId ? String(event.organizerId) : null,
    slug: String(event.slug || '').trim(),
    referenceCode: String(event.referenceCode || '').trim(),
    title: String(event.title || '').trim(),
    organiserName: String(event.organiserName || '').trim(),
    status: normalizeEventStatus(event.status),
    eventType: normalizeNullableEnum(event.eventType, ['virtual', 'onsite', 'hybrid']),
    virtualCompletionMode: normalizeNullableEnum(
      event.virtualCompletionMode,
      ['single_activity', 'accumulated_distance']
    ) || 'single_activity',
    registrationOpenAt: event.registrationOpenAt || null,
    registrationCloseAt: event.registrationCloseAt || null,
    eventStartAt: event.eventStartAt || null,
    eventEndAt: event.eventEndAt || null,
    finalSubmissionDeadlineAt: event.finalSubmissionDeadlineAt || null,
    venueName: String(event.venueName || '').trim(),
    venueAddress: String(event.venueAddress || '').trim(),
    city: String(event.city || '').trim(),
    province: String(event.province || '').trim(),
    country: String(event.country || '').trim(),
    feeMode: normalizeNullableEnum(event.feeMode, ['free', 'paid']) || 'free',
    feeAmount: nullableNumber(event.feeAmount),
    feeCurrency: String(event.feeCurrency || 'PHP').trim().toUpperCase().slice(0, 3) || 'PHP',
    pricingMode: String(event.pricingMode || 'free').trim() || 'free',
    targetDistanceKm: nullableNumber(event.targetDistanceKm),
    minimumActivityDistanceKm: nullableNumber(event.minimumActivityDistanceKm),
    recognitionMode: String(event.recognitionMode || 'completion_only').trim() || 'completion_only',
    leaderboardMode: String(event.leaderboardMode || 'finishers').trim() || 'finishers',
    digitalCertificateEnabled: event.digitalCertificateEnabled !== false,
    leaderboardRecognitionEnabled: event.leaderboardRecognitionEnabled !== false,
    physicalRewardsEnabled: event.physicalRewardsEnabled === true,
    isPersonalRecord: event.isPersonalRecord === true,
    isDeleted: event.isDeleted === true,
    submittedForReviewAt: event.submittedForReviewAt || null,
    approvedAt: event.approvedAt || null,
    archivedAt: event.archivedAt || null,
    deletedAt: event.deletedAt || null,
    mongoCreatedAt: event.createdAt || null,
    mongoUpdatedAt: event.updatedAt || null,
    smokeMeta: toPostgresSmokeMeta(event),
    distances
  };
}

function buildEventChecksum(normalizedEvent) {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify({
      mongoEventId: normalizedEvent.mongoEventId,
      mongoOrganizerUserId: normalizedEvent.mongoOrganizerUserId || '',
      slug: normalizedEvent.slug,
      referenceCode: normalizedEvent.referenceCode,
      title: normalizedEvent.title,
      organiserName: normalizedEvent.organiserName,
      status: normalizedEvent.status,
      eventType: normalizedEvent.eventType || '',
      virtualCompletionMode: normalizedEvent.virtualCompletionMode,
      registrationOpenAt: isoOrEmpty(normalizedEvent.registrationOpenAt),
      registrationCloseAt: isoOrEmpty(normalizedEvent.registrationCloseAt),
      eventStartAt: isoOrEmpty(normalizedEvent.eventStartAt),
      eventEndAt: isoOrEmpty(normalizedEvent.eventEndAt),
      finalSubmissionDeadlineAt: isoOrEmpty(normalizedEvent.finalSubmissionDeadlineAt),
      feeMode: normalizedEvent.feeMode,
      feeAmount: normalizedEvent.feeAmount,
      feeCurrency: normalizedEvent.feeCurrency,
      distances: normalizedEvent.distances
    }))
    .digest('hex');
}

async function syncOrganiserShadow({ user, application }, options = {}) {
  const sql = options.sql || getPostgresClient();
  const operation = options.operation || 'live_sync';
  const normalized = normalizeMongoOrganiser({ user, application });
  const appUser = await syncAppUserFromMongoUser(user, { sql, operation });

  const rows = await sql`
    insert into organisers (
      app_user_id,
      mongo_user_id,
      mongo_application_id,
      application_reference,
      business_name,
      business_type,
      contact_phone,
      business_registration_number,
      business_address,
      status,
      reviewed_at,
      submitted_at,
      is_smoke_test,
      test_run_id,
      created_by_test,
      expires_at
    )
    values (
      ${appUser.id},
      ${normalized.mongoUserId},
      ${normalized.mongoApplicationId},
      ${normalized.applicationReference},
      ${normalized.businessName},
      ${normalized.businessType},
      ${normalized.contactPhone},
      ${normalized.businessRegistrationNumber},
      ${normalized.businessAddress},
      ${normalized.status},
      ${normalized.reviewedAt},
      ${normalized.submittedAt},
      ${normalized.smokeMeta.is_smoke_test},
      ${normalized.smokeMeta.test_run_id || null},
      ${normalized.smokeMeta.created_by_test || null},
      ${normalized.smokeMeta.expires_at}
    )
    on conflict (mongo_user_id)
    do update set
      app_user_id = excluded.app_user_id,
      mongo_application_id = excluded.mongo_application_id,
      application_reference = excluded.application_reference,
      business_name = excluded.business_name,
      business_type = excluded.business_type,
      contact_phone = excluded.contact_phone,
      business_registration_number = excluded.business_registration_number,
      business_address = excluded.business_address,
      status = excluded.status,
      reviewed_at = excluded.reviewed_at,
      submitted_at = excluded.submitted_at,
      is_smoke_test = excluded.is_smoke_test,
      test_run_id = excluded.test_run_id,
      created_by_test = excluded.created_by_test,
      expires_at = excluded.expires_at
    returning *
  `;

  await upsertMigrationRecord(sql, {
    sourceCollection: 'users',
    sourceId: normalized.mongoUserId,
    targetTable: 'organisers',
    targetId: String(rows[0].id),
    operation,
    status: 'synced',
    checksum: buildGenericChecksum(normalized),
    smokeMeta: normalized.smokeMeta
  });

  return rows[0];
}

async function syncEventShadow(event, options = {}) {
  const sql = options.sql || getPostgresClient();
  const operation = options.operation || 'live_sync';
  const normalized = normalizeMongoEvent(event);
  const checksum = buildEventChecksum(normalized);

  const organiserRows = normalized.mongoOrganizerUserId
    ? await sql`select id from organisers where mongo_user_id = ${normalized.mongoOrganizerUserId} limit 1`
    : [];
  const organiserId = organiserRows[0]?.id || null;

  try {
    const eventRows = await sql`
      insert into events_core (
        organiser_id,
        mongo_event_id,
        mongo_organizer_user_id,
        slug,
        reference_code,
        title,
        organiser_name,
        status,
        event_type,
        virtual_completion_mode,
        registration_open_at,
        registration_close_at,
        event_start_at,
        event_end_at,
        final_submission_deadline_at,
        venue_name,
        venue_address,
        city,
        province,
        country,
        fee_mode,
        fee_amount,
        fee_currency,
        pricing_mode,
        target_distance_km,
        minimum_activity_distance_km,
        recognition_mode,
        leaderboard_mode,
        digital_certificate_enabled,
        leaderboard_recognition_enabled,
        physical_rewards_enabled,
        is_personal_record,
        is_deleted,
        submitted_for_review_at,
        approved_at,
        archived_at,
        deleted_at,
        mongo_created_at,
        mongo_updated_at,
        is_smoke_test,
        test_run_id,
        created_by_test,
        expires_at
      )
      values (
        ${organiserId},
        ${normalized.mongoEventId},
        ${normalized.mongoOrganizerUserId},
        ${normalized.slug},
        ${normalized.referenceCode || null},
        ${normalized.title},
        ${normalized.organiserName},
        ${normalized.status},
        ${normalized.eventType},
        ${normalized.virtualCompletionMode},
        ${normalized.registrationOpenAt},
        ${normalized.registrationCloseAt},
        ${normalized.eventStartAt},
        ${normalized.eventEndAt},
        ${normalized.finalSubmissionDeadlineAt},
        ${normalized.venueName},
        ${normalized.venueAddress},
        ${normalized.city},
        ${normalized.province},
        ${normalized.country},
        ${normalized.feeMode},
        ${normalized.feeAmount},
        ${normalized.feeCurrency},
        ${normalized.pricingMode},
        ${normalized.targetDistanceKm},
        ${normalized.minimumActivityDistanceKm},
        ${normalized.recognitionMode},
        ${normalized.leaderboardMode},
        ${normalized.digitalCertificateEnabled},
        ${normalized.leaderboardRecognitionEnabled},
        ${normalized.physicalRewardsEnabled},
        ${normalized.isPersonalRecord},
        ${normalized.isDeleted},
        ${normalized.submittedForReviewAt},
        ${normalized.approvedAt},
        ${normalized.archivedAt},
        ${normalized.deletedAt},
        ${normalized.mongoCreatedAt},
        ${normalized.mongoUpdatedAt},
        ${normalized.smokeMeta.is_smoke_test},
        ${normalized.smokeMeta.test_run_id || null},
        ${normalized.smokeMeta.created_by_test || null},
        ${normalized.smokeMeta.expires_at}
      )
      on conflict (mongo_event_id)
      do update set
        organiser_id = excluded.organiser_id,
        mongo_organizer_user_id = excluded.mongo_organizer_user_id,
        slug = excluded.slug,
        reference_code = excluded.reference_code,
        title = excluded.title,
        organiser_name = excluded.organiser_name,
        status = excluded.status,
        event_type = excluded.event_type,
        virtual_completion_mode = excluded.virtual_completion_mode,
        registration_open_at = excluded.registration_open_at,
        registration_close_at = excluded.registration_close_at,
        event_start_at = excluded.event_start_at,
        event_end_at = excluded.event_end_at,
        final_submission_deadline_at = excluded.final_submission_deadline_at,
        venue_name = excluded.venue_name,
        venue_address = excluded.venue_address,
        city = excluded.city,
        province = excluded.province,
        country = excluded.country,
        fee_mode = excluded.fee_mode,
        fee_amount = excluded.fee_amount,
        fee_currency = excluded.fee_currency,
        pricing_mode = excluded.pricing_mode,
        target_distance_km = excluded.target_distance_km,
        minimum_activity_distance_km = excluded.minimum_activity_distance_km,
        recognition_mode = excluded.recognition_mode,
        leaderboard_mode = excluded.leaderboard_mode,
        digital_certificate_enabled = excluded.digital_certificate_enabled,
        leaderboard_recognition_enabled = excluded.leaderboard_recognition_enabled,
        physical_rewards_enabled = excluded.physical_rewards_enabled,
        is_personal_record = excluded.is_personal_record,
        is_deleted = excluded.is_deleted,
        submitted_for_review_at = excluded.submitted_for_review_at,
        approved_at = excluded.approved_at,
        archived_at = excluded.archived_at,
        deleted_at = excluded.deleted_at,
        mongo_created_at = excluded.mongo_created_at,
        mongo_updated_at = excluded.mongo_updated_at,
        is_smoke_test = excluded.is_smoke_test,
        test_run_id = excluded.test_run_id,
        created_by_test = excluded.created_by_test,
        expires_at = excluded.expires_at
      returning *
    `;

    const eventCore = eventRows[0];
    await syncEventDistances(sql, eventCore.id, normalized);
    await upsertMigrationRecord(sql, {
      sourceCollection: 'events',
      sourceId: normalized.mongoEventId,
      targetTable: 'events_core',
      targetId: String(eventCore.id),
      operation,
      status: 'synced',
      checksum,
      smokeMeta: normalized.smokeMeta
    });
    return eventCore;
  } catch (error) {
    await upsertMigrationRecord(sql, {
      sourceCollection: 'events',
      sourceId: normalized.mongoEventId,
      targetTable: 'events_core',
      targetId: null,
      operation,
      status: 'failed',
      checksum,
      smokeMeta: normalized.smokeMeta,
      errorCode: error.code || '',
      errorMessage: error.message || 'Unknown event shadow sync failure.'
    }).catch(() => {});
    throw error;
  }
}

async function syncEventDistances(sql, eventCoreId, normalized) {
  await sql`delete from event_distances where event_core_id = ${eventCoreId}`;
  for (let index = 0; index < normalized.distances.length; index += 1) {
    const distance = normalized.distances[index];
    // eslint-disable-next-line no-await-in-loop
    await sql`
      insert into event_distances (
        event_core_id,
        mongo_event_id,
        distance_label,
        sort_order,
        is_smoke_test,
        test_run_id,
        created_by_test,
        expires_at
      )
      values (
        ${eventCoreId},
        ${normalized.mongoEventId},
        ${distance},
        ${index},
        ${normalized.smokeMeta.is_smoke_test},
        ${normalized.smokeMeta.test_run_id || null},
        ${normalized.smokeMeta.created_by_test || null},
        ${normalized.smokeMeta.expires_at}
      )
      on conflict (event_core_id, distance_label)
      do update set
        sort_order = excluded.sort_order,
        is_smoke_test = excluded.is_smoke_test,
        test_run_id = excluded.test_run_id,
        created_by_test = excluded.created_by_test,
        expires_at = excluded.expires_at
    `;
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
      synced_at,
      is_smoke_test,
      test_run_id,
      created_by_test,
      expires_at
    )
    values (
      ${PHASE},
      'mongodb',
      ${input.sourceCollection},
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
      ${syncedAt},
      ${input.smokeMeta?.is_smoke_test || false},
      ${input.smokeMeta?.test_run_id || null},
      ${input.smokeMeta?.created_by_test || null},
      ${input.smokeMeta?.expires_at || null}
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
      synced_at = excluded.synced_at,
      is_smoke_test = excluded.is_smoke_test,
      test_run_id = excluded.test_run_id,
      created_by_test = excluded.created_by_test,
      expires_at = excluded.expires_at
    returning *
  `;
}

function normalizeOrganiserStatus(value) {
  const status = String(value || '').trim().toLowerCase();
  if (['pending', 'under_review', 'approved', 'rejected', 'active'].includes(status)) return status;
  return 'approved';
}

function normalizeEventStatus(value) {
  const status = String(value || '').trim().toLowerCase();
  if (['draft', 'pending_review', 'published', 'closed', 'archived'].includes(status)) return status;
  return 'draft';
}

function normalizeNullableEnum(value, allowed) {
  const safe = String(value || '').trim().toLowerCase();
  return allowed.includes(safe) ? safe : null;
}

function nullableNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function isoOrEmpty(value) {
  return value ? new Date(value).toISOString() : '';
}

function buildGenericChecksum(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

module.exports = {
  PHASE,
  normalizeMongoOrganiser,
  normalizeMongoEvent,
  buildEventChecksum,
  syncOrganiserShadow,
  syncEventShadow
};
