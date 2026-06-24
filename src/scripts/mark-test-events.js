#!/usr/bin/env node
// One-off script: marks integration-test events as isTestData=true so they
// are excluded from public listings and the sitemap.
// Safe to run multiple times (idempotent).
require('dotenv').config();
const mongoose = require('mongoose');
const Event = require('../models/Event');

const TEST_SLUG_PATTERNS = [
  /\d{13}-\d{4,6}$/,        // timestamp+random suffix used by all integration test events
  /^phase\d+-/,              // phase* test events (e.g. phase5-route-...)
  /^route-leaderboard-/,     // route-level leaderboard tests
  /^runner-dash-/,           // runner dashboard tests
  /^accumulated-/,           // accumulated challenge tests
  /^smoke-/,                 // smoke test events
  /^test-event-/             // generic test events
];

async function run() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('MONGODB_URI is not set. Exiting.');
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');

  // First: dry-run to see what would be marked
  const candidates = await Event.find({
    isTestData: { $ne: true },
    $or: TEST_SLUG_PATTERNS.map((pattern) => ({ slug: pattern }))
  }).select('slug title status isPersonalRecord').lean();

  console.log(`\nFound ${candidates.length} candidate test events to mark:\n`);
  candidates.slice(0, 20).forEach((ev) => {
    console.log(`  [${ev.status}] ${ev.slug}`);
  });
  if (candidates.length > 20) {
    console.log(`  ... and ${candidates.length - 20} more`);
  }

  if (candidates.length === 0) {
    console.log('Nothing to mark. Exiting.');
    await mongoose.disconnect();
    return;
  }

  const result = await Event.updateMany(
    {
      isTestData: { $ne: true },
      $or: TEST_SLUG_PATTERNS.map((pattern) => ({ slug: pattern }))
    },
    { $set: { isTestData: true } }
  );

  console.log(`\nMarked ${result.modifiedCount} events as isTestData=true.`);
  console.log('These events are now excluded from public listings and the sitemap.');

  await mongoose.disconnect();
  console.log('Done.');
}

run().catch((error) => {
  console.error('Script failed:', error.message);
  process.exit(1);
});
