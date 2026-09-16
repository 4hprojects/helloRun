'use strict';

// Narrow, idempotent content sync for the CNS Move More Challenge.
//
// update-cns-move-more-content.js is the one-time migration: it asserts fixed record
// counts and rewrites registrations, activities, and the certificate template. This
// script only pushes editorial fields from the source fixture onto the live event, so
// it stays safe to re-run as the copy and the registration deadline change.
//
// Dry run by default; pass --apply to write.

require('dotenv').config();

const mongoose = require('mongoose');
const Event = require('../models/Event');
const { syncEventShadow } = require('../services/event-shadow.service');
const { closePostgresClient } = require('../db/postgres');
const {
  SLUG,
  buildCnsMoveMoreChallengeEventPayload
} = require('../content/events/cns-move-more-challenge-2026');

const APPLY = process.argv.includes('--apply');

const SYNC_FIELDS = Object.freeze([
  'description',
  'eventDetailsMarkdown',
  'registrationCloseAt',
  'requiredRegistrationFields'
]);

function comparable(value) {
  if (value instanceof Date) return value.toISOString();
  return JSON.stringify(value, (key, item) => (key === '_id' ? undefined : item));
}

async function main() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required.');
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });

  const event = await Event.findOne({ slug: SLUG, isDeleted: { $ne: true } });
  if (!event) throw new Error(`Event not found: ${SLUG}`);

  const payload = buildCnsMoveMoreChallengeEventPayload({
    organizerId: event.organizerId,
    approvedBy: event.approvedBy || event.organizerId,
    referenceCode: event.referenceCode,
    now: event.approvedAt || new Date()
  });

  const changes = SYNC_FIELDS
    .filter((field) => comparable(event.get(field)) !== comparable(payload[field]))
    .map((field) => ({ field, from: event.get(field), to: payload[field] }));

  const preview = {
    mode: APPLY ? 'apply' : 'dry-run',
    slug: SLUG,
    eventId: String(event._id),
    changedFields: changes.map((change) => change.field),
    changes,
    mutationApplied: false
  };

  if (!APPLY || !changes.length) {
    console.log(JSON.stringify(preview, null, 2));
    return;
  }

  const update = Object.fromEntries(changes.map((change) => [change.field, change.to]));
  await Event.updateOne({ _id: event._id }, { $set: update }, { runValidators: true });

  const updated = await Event.findById(event._id);
  await syncEventShadow(updated, { operation: 'cns_content_sync' });

  preview.mutationApplied = true;
  console.log(JSON.stringify(preview, null, 2));
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => {});
    await closePostgresClient().catch(() => {});
  });
