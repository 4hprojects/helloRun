require('dotenv').config();

const mongoose = require('mongoose');
const Event = require('../models/Event');
const { getPostgresClient, closePostgresClient } = require('../db/postgres');
const { normalizeMongoEvent } = require('../services/event-shadow.service');

async function main() {
  const sql = getPostgresClient();
  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 120000
  });

  const mongoEvents = await Event.find({ isPersonalRecord: { $ne: true } }).sort({ createdAt: 1 }).lean();
  const shadowEvents = await sql`
    select
      id,
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
      fee_mode,
      fee_amount,
      fee_currency,
      is_deleted
    from events_core
  `;
  const distances = await sql`
    select mongo_event_id, distance_label, sort_order
    from event_distances
    order by mongo_event_id, sort_order asc, distance_label asc
  `;

  const shadowByMongoId = new Map(shadowEvents.map((row) => [String(row.mongo_event_id), row]));
  const distancesByMongoId = new Map();
  for (const distance of distances) {
    const key = String(distance.mongo_event_id);
    if (!distancesByMongoId.has(key)) distancesByMongoId.set(key, []);
    distancesByMongoId.get(key).push(String(distance.distance_label));
  }

  const missing = [];
  const mismatched = [];

  for (const event of mongoEvents) {
    const normalized = normalizeMongoEvent(event);
    const row = shadowByMongoId.get(normalized.mongoEventId);
    if (!row) {
      missing.push({
        mongoEventId: normalized.mongoEventId,
        slug: normalized.slug,
        status: normalized.status
      });
      continue;
    }

    const differences = compareEvent(normalized, row, distancesByMongoId.get(normalized.mongoEventId) || []);
    if (differences.length) {
      mismatched.push({
        mongoEventId: normalized.mongoEventId,
        slug: normalized.slug,
        differences
      });
    }
  }

  const mongoIds = new Set(mongoEvents.map((event) => String(event._id)));
  const extra = shadowEvents
    .filter((row) => !mongoIds.has(String(row.mongo_event_id)))
    .map((row) => ({
      eventCoreId: String(row.id),
      mongoEventId: String(row.mongo_event_id),
      slug: row.slug
    }));

  const result = {
    mongoEventCount: mongoEvents.length,
    eventCoreCount: shadowEvents.length,
    missingCount: missing.length,
    mismatchedCount: mismatched.length,
    extraCount: extra.length,
    missing: missing.slice(0, 20),
    mismatched: mismatched.slice(0, 20),
    extra: extra.slice(0, 20)
  };

  console.log(JSON.stringify(result, null, 2));
  if (missing.length || mismatched.length) {
    process.exitCode = 1;
  }
}

function compareEvent(normalized, row, distanceLabels) {
  const differences = [];
  compareValue(differences, 'mongo_organizer_user_id', normalized.mongoOrganizerUserId, row.mongo_organizer_user_id);
  compareValue(differences, 'slug', normalized.slug, row.slug);
  compareValue(differences, 'reference_code', normalized.referenceCode || null, row.reference_code);
  compareValue(differences, 'title', normalized.title, row.title);
  compareValue(differences, 'organiser_name', normalized.organiserName, row.organiser_name);
  compareValue(differences, 'status', normalized.status, row.status);
  compareValue(differences, 'event_type', normalized.eventType, row.event_type);
  compareValue(differences, 'virtual_completion_mode', normalized.virtualCompletionMode, row.virtual_completion_mode);
  compareDate(differences, 'registration_open_at', normalized.registrationOpenAt, row.registration_open_at);
  compareDate(differences, 'registration_close_at', normalized.registrationCloseAt, row.registration_close_at);
  compareDate(differences, 'event_start_at', normalized.eventStartAt, row.event_start_at);
  compareDate(differences, 'event_end_at', normalized.eventEndAt, row.event_end_at);
  compareDate(differences, 'final_submission_deadline_at', normalized.finalSubmissionDeadlineAt, row.final_submission_deadline_at);
  compareValue(differences, 'fee_mode', normalized.feeMode, row.fee_mode);
  compareNumber(differences, 'fee_amount', normalized.feeAmount, row.fee_amount);
  compareValue(differences, 'fee_currency', normalized.feeCurrency, row.fee_currency);
  compareValue(differences, 'is_deleted', normalized.isDeleted, row.is_deleted);
  compareArray(differences, 'race_distances', normalized.distances, distanceLabels);
  return differences;
}

function compareValue(differences, field, expected, actual) {
  const safeExpected = expected === undefined ? null : expected;
  const safeActual = actual === undefined ? null : actual;
  if (String(safeExpected ?? '') !== String(safeActual ?? '')) {
    differences.push({ field, expected: safeExpected, actual: safeActual });
  }
}

function compareDate(differences, field, expected, actual) {
  const expectedIso = expected ? new Date(expected).toISOString() : '';
  const actualIso = actual ? new Date(actual).toISOString() : '';
  if (expectedIso !== actualIso) {
    differences.push({ field, expected: expectedIso || null, actual: actualIso || null });
  }
}

function compareNumber(differences, field, expected, actual) {
  const safeExpected = expected === null || expected === undefined ? null : Number(expected);
  const safeActual = actual === null || actual === undefined ? null : Number(actual);
  if (safeExpected !== safeActual) {
    differences.push({ field, expected: safeExpected, actual: safeActual });
  }
}

function compareArray(differences, field, expected, actual) {
  if (JSON.stringify(expected) !== JSON.stringify(actual)) {
    differences.push({ field, expected, actual });
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
