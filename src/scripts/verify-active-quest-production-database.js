require('dotenv').config({ path: process.env.DOTENV_CONFIG_PATH || '.env' });

const fs = require('node:fs');
const path = require('node:path');
const mongoose = require('mongoose');
const Event = require('../models/Event');
const { getPostgresClient, closePostgresClient } = require('../db/postgres');
const { normalizeMongoEvent } = require('../services/event-shadow.service');

const MIGRATION = '028_active_quest_series_foundation.sql';
const REQUIRED_TABLES = ['event_badges', 'event_distances', 'events_core', 'schema_migrations'];
const REQUIRED_COLUMNS = [
  'generated_from_key',
  'series_key',
  'series_month',
  'series_snapshot_checksum',
  'series_template_version_id',
  'series_year'
];
const REQUIRED_INDEXES = ['events_core_series_template_idx', 'events_core_unique_series_month'];

function expectedPriorMigrations() {
  const migrationDirectory = path.resolve(__dirname, '../db/migrations');
  return fs.readdirSync(migrationDirectory)
    .filter((name) => name.endsWith('.sql') && name < MIGRATION)
    .sort();
}

function assertSetContains(actual, expected, label) {
  const missing = expected.filter((value) => !actual.has(value));
  if (missing.length) throw new Error(`${label} missing: ${missing.join(', ')}.`);
}

function compareRepresentative(normalized, row, distances) {
  const differences = [];
  const fields = [
    ['slug', normalized.slug, row.slug],
    ['title', normalized.title, row.title],
    ['status', normalized.status, row.status],
    ['event_type', normalized.eventType, row.event_type],
    ['virtual_completion_mode', normalized.virtualCompletionMode, row.virtual_completion_mode]
  ];
  for (const [field, expected, actual] of fields) {
    if (String(expected || '') !== String(actual || '')) differences.push(field);
  }
  if (JSON.stringify(normalized.distances) !== JSON.stringify(distances)) differences.push('race_distances');
  return differences;
}

async function verifyDatabase({ postMigration = false } = {}) {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL must come from secrets management.');
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required.');

  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000, socketTimeoutMS: 120000 });
  const sql = getPostgresClient();
  const sampleEvents = await Event.find({ isPersonalRecord: { $ne: true } })
    .sort({ updatedAt: -1, _id: -1 })
    .limit(10)
    .lean();
  const mongoEventCount = await Event.countDocuments({ isPersonalRecord: { $ne: true } });

  return sql.begin(async (tx) => {
    await tx`SET TRANSACTION READ ONLY`;
    const migrations = await tx`SELECT filename FROM schema_migrations ORDER BY filename`;
    const migrationNames = new Set(migrations.map((row) => row.filename));
    assertSetContains(migrationNames, expectedPriorMigrations(), 'Required migrations');

    const tables = await tx`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name IN ${tx(REQUIRED_TABLES)}
    `;
    assertSetContains(new Set(tables.map((row) => row.table_name)), REQUIRED_TABLES, 'Required tables');

    const [{ count: shadowCountValue }] = await tx`SELECT count(*)::integer AS count FROM events_core`;
    const shadowEventCount = Number(shadowCountValue);
    if (mongoEventCount === 0 || shadowEventCount === 0) throw new Error('Production event stores must not be empty.');
    if (mongoEventCount !== shadowEventCount) {
      throw new Error(`Event shadow count mismatch: Mongo ${mongoEventCount}, Postgres ${shadowEventCount}.`);
    }

    const sampleIds = sampleEvents.map((event) => String(event._id));
    const rows = sampleIds.length
      ? await tx`
          SELECT mongo_event_id, slug, title, status, event_type, virtual_completion_mode
          FROM events_core
          WHERE mongo_event_id IN ${tx(sampleIds)}
        `
      : [];
    const distanceRows = sampleIds.length
      ? await tx`
          SELECT mongo_event_id, distance_label
          FROM event_distances
          WHERE mongo_event_id IN ${tx(sampleIds)}
          ORDER BY mongo_event_id, sort_order, distance_label
        `
      : [];
    const rowsById = new Map(rows.map((row) => [String(row.mongo_event_id), row]));
    const distancesById = new Map();
    for (const row of distanceRows) {
      const id = String(row.mongo_event_id);
      if (!distancesById.has(id)) distancesById.set(id, []);
      distancesById.get(id).push(String(row.distance_label));
    }
    for (const event of sampleEvents) {
      const normalized = normalizeMongoEvent(event);
      const row = rowsById.get(normalized.mongoEventId);
      if (!row) throw new Error(`Representative event missing from shadow: ${normalized.slug}.`);
      const differences = compareRepresentative(normalized, row, distancesById.get(normalized.mongoEventId) || []);
      if (differences.length) throw new Error(`Representative event mismatch for ${normalized.slug}: ${differences.join(', ')}.`);
    }

    if (postMigration) {
      if (!migrationNames.has(MIGRATION)) throw new Error(`Migration row missing: ${MIGRATION}.`);
      const columns = await tx`
        SELECT column_name, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'events_core' AND column_name IN ${tx(REQUIRED_COLUMNS)}
      `;
      assertSetContains(new Set(columns.map((row) => row.column_name)), REQUIRED_COLUMNS, 'Migration columns');
      if (columns.some((row) => row.is_nullable !== 'YES')) throw new Error('Migration 028 columns must remain nullable.');

      const constraints = await tx`
        SELECT conname FROM pg_constraint
        WHERE conrelid = 'public.events_core'::regclass AND conname = 'events_core_series_identity_check'
      `;
      if (constraints.length !== 1) throw new Error('Migration constraint missing: events_core_series_identity_check.');
      const indexes = await tx`
        SELECT indexname FROM pg_indexes
        WHERE schemaname = 'public' AND tablename = 'events_core' AND indexname IN ${tx(REQUIRED_INDEXES)}
      `;
      assertSetContains(new Set(indexes.map((row) => row.indexname)), REQUIRED_INDEXES, 'Migration indexes');
    } else if (migrationNames.has(MIGRATION)) {
      throw new Error(`Migration ${MIGRATION} is already applied; rerun with --post-migration.`);
    }

    return {
      mode: postMigration ? 'post-migration' : 'pre-migration',
      transactionReadOnly: true,
      priorMigrations: expectedPriorMigrations().length,
      mongoEventCount,
      shadowEventCount,
      representativeEvents: sampleEvents.length,
      migration028Applied: migrationNames.has(MIGRATION)
    };
  });
}

async function main() {
  const result = await verifyDatabase({ postMigration: process.argv.includes('--post-migration') });
  console.log(JSON.stringify(result, null, 2));
}

if (require.main === module) {
  main()
    .catch((error) => {
      console.error(error?.stack || error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await mongoose.disconnect().catch(() => {});
      await closePostgresClient().catch(() => {});
    });
}

module.exports = {
  MIGRATION,
  REQUIRED_COLUMNS,
  REQUIRED_INDEXES,
  REQUIRED_TABLES,
  assertSetContains,
  compareRepresentative,
  expectedPriorMigrations,
  verifyDatabase
};
