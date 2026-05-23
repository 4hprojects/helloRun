require('dotenv').config();

const fs = require('node:fs/promises');
const mongoose = require('mongoose');
const { getPostgresClient, closePostgresClient } = require('../db/postgres');
const uploadService = require('../services/upload.service');

const MONGO_MODEL_LOADERS = [
  ['Notification', () => require('../models/Notification')],
  ['CommunicationLog', () => require('../models/CommunicationLog')],
  ['CommunicationEventSetting', () => require('../models/CommunicationEventSetting')],
  ['CommunicationSetting', () => require('../models/CommunicationSetting')],
  ['DailyEmailUsage', () => require('../models/DailyEmailUsage')],
  ['BlogReport', () => require('../models/BlogReport')],
  ['BlogComment', () => require('../models/BlogComment')],
  ['BlogLike', () => require('../models/BlogLike')],
  ['BlogView', () => require('../models/BlogView')],
  ['BlogRevision', () => require('../models/BlogRevision')],
  ['Blog', () => require('../models/Blog')],
  ['BadgeContent', () => require('../models/BadgeContent')],
  ['BadgeTemplate', () => require('../models/BadgeTemplate')],
  ['ShopOrderNotes', () => require('../models/ShopOrderNotes')],
  ['ShopMediaMetadata', () => require('../models/ShopMediaMetadata')],
  ['ShopPolicySnapshot', () => require('../models/ShopPolicySnapshot')],
  ['ShopProductContent', () => require('../models/ShopProductContent')],
  ['AccumulatedActivitySubmission', () => require('../models/AccumulatedActivitySubmission')],
  ['Submission', () => require('../models/Submission')],
  ['Registration', () => require('../models/Registration')],
  ['Event', () => require('../models/Event')],
  ['OrganiserApplication', () => require('../models/OrganiserApplication')],
  ['RunningGroupActivity', () => require('../models/RunningGroupActivity')],
  ['RunningGroup', () => require('../models/RunningGroup')],
  ['StravaConnection', () => require('../models/StravaConnection')],
  ['PrivacyPolicy', () => require('../models/PrivacyPolicy')],
  ['User', () => require('../models/User')]
];

const POSTGRES_TABLES = [
  'badge_audit_logs',
  'user_badges',
  'event_badges',
  'shop_payments',
  'shop_fulfilment_logs',
  'order_items',
  'orders',
  'inventory_movements',
  'product_variants',
  'products_core',
  'achievement_merchandise_rules',
  'onsite_results',
  'result_imports',
  'check_ins',
  'bib_assignments',
  'race_kits',
  'certificates',
  'rankings',
  'submissions_core',
  'payments',
  'registrations',
  'event_distances',
  'event_categories',
  'events_core',
  'organisers',
  'policy_consents',
  'audit_critical',
  'migration_records',
  'app_users'
];

function parseArgs(argv = process.argv.slice(2)) {
  const options = {
    dryRun: false,
    expired: false,
    forceProduction: false,
    testRunId: '',
    auditLogFile: ''
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--expired') {
      options.expired = true;
    } else if (arg === '--force-production') {
      options.forceProduction = true;
    } else if (arg === '--test-run-id') {
      options.testRunId = String(argv[i + 1] || '').trim();
      i += 1;
    } else if (arg.startsWith('--test-run-id=')) {
      options.testRunId = arg.slice('--test-run-id='.length).trim();
    } else if (arg === '--audit-log-file') {
      options.auditLogFile = String(argv[i + 1] || '').trim();
      i += 1;
    } else if (arg.startsWith('--audit-log-file=')) {
      options.auditLogFile = arg.slice('--audit-log-file='.length).trim();
    } else {
      throw new Error(`Unknown cleanup option: ${arg}`);
    }
  }

  if (!options.testRunId && !options.expired) {
    throw new Error('Smoke cleanup requires --test-run-id or --expired.');
  }

  return options;
}

function assertSafeEnvironment(options, env = process.env) {
  if (env.NODE_ENV === 'production' && !options.dryRun && !options.forceProduction) {
    throw new Error('Refusing to clean smoke test data in production without --force-production.');
  }
}

function buildMongoFilter(options, now = new Date()) {
  if (options.testRunId) {
    return {
      isSmokeTest: true,
      testRunId: options.testRunId
    };
  }

  return {
    isSmokeTest: true,
    expiresAt: { $lt: now }
  };
}

function buildPostgresWhere(options) {
  if (options.testRunId) {
    return {
      clause: 'is_smoke_test = true and test_run_id = $1',
      values: [options.testRunId]
    };
  }

  return {
    clause: 'is_smoke_test = true and expires_at < now()',
    values: []
  };
}

function loadMongoModels() {
  const loaded = [];
  for (const [name, loader] of MONGO_MODEL_LOADERS) {
    loaded.push([name, loader()]);
  }
  return loaded;
}

async function cleanupMongo({ models, filter, dryRun }) {
  const summary = {};
  const r2Keys = new Set();

  for (const [name, Model] of models) {
    const count = await Model.countDocuments(filter);
    summary[name] = count;

    if (count > 0) {
      const docs = await Model.find(filter).lean();
      collectR2KeysFromDocuments(docs, r2Keys);
    }

    if (!dryRun && count > 0) {
      await Model.deleteMany(filter);
    }
  }

  return {
    summary,
    r2Keys: Array.from(r2Keys)
  };
}

async function validateMongoCleanup({ models, filter }) {
  const remaining = {};

  for (const [name, Model] of models) {
    const count = await Model.countDocuments(filter);
    if (count > 0) {
      remaining[name] = count;
    }
  }

  return remaining;
}

async function cleanupPostgres({ sql, options, dryRun }) {
  const summary = {};
  const where = buildPostgresWhere(options);

  for (const table of POSTGRES_TABLES) {
    const count = await queryPostgresCount(sql, table, where);
    summary[table] = count;

    if (!dryRun && count > 0) {
      await queryPostgresDelete(sql, table, where);
    }
  }

  return summary;
}

async function validatePostgresCleanup({ sql, options }) {
  const remaining = {};
  const where = buildPostgresWhere(options);

  for (const table of POSTGRES_TABLES) {
    const count = await queryPostgresCount(sql, table, where);
    if (count > 0) {
      remaining[table] = count;
    }
  }

  return remaining;
}

async function queryPostgresCount(sql, table, where) {
  try {
    const rows = await sql.unsafe(
      `select count(*)::int as count from ${quoteIdentifier(table)} where ${where.clause}`,
      where.values
    );
    return Number(rows[0]?.count || 0);
  } catch (error) {
    if (isMissingSmokeMetadataError(error)) return 0;
    throw error;
  }
}

async function queryPostgresDelete(sql, table, where) {
  try {
    await sql.unsafe(
      `delete from ${quoteIdentifier(table)} where ${where.clause}`,
      where.values
    );
  } catch (error) {
    if (isMissingSmokeMetadataError(error)) return;
    throw error;
  }
}

function isMissingSmokeMetadataError(error) {
  const code = String(error?.code || '');
  return code === '42P01' || code === '42703';
}

function quoteIdentifier(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function collectR2KeysFromDocuments(docs, target) {
  for (const doc of docs) {
    collectR2KeysFromValue(doc, target);
  }
}

function collectR2KeysFromValue(value, target) {
  if (!value) return;

  if (Array.isArray(value)) {
    value.forEach((item) => collectR2KeysFromValue(item, target));
    return;
  }

  if (typeof value !== 'object') return;

  for (const [key, child] of Object.entries(value)) {
    if (Array.isArray(child) && key.endsWith('Urls')) {
      child.forEach((url) => addR2Key(uploadService.extractObjectKeyFromPublicUrl(url), target));
    } else if (typeof child === 'string') {
      if (key === 'key' || key.endsWith('Key')) {
        addR2Key(child, target);
      } else if (key === 'url' || key.endsWith('Url')) {
        addR2Key(uploadService.extractObjectKeyFromPublicUrl(child), target);
      }
    } else {
      collectR2KeysFromValue(child, target);
    }
  }
}

function addR2Key(value, target) {
  const key = String(value || '').trim().replace(/^\/+/, '');
  if (key) target.add(key);
}

function buildSmokePrefix(testRunId) {
  const safeRunId = String(testRunId || '').trim().replace(/[^a-zA-Z0-9._-]/g, '-');
  if (!safeRunId) return '';
  return `smoke-tests/${safeRunId}/`;
}

async function cleanupR2({ keys, dryRun, testRunId }) {
  const discoveredKeys = Array.isArray(keys) ? keys : [];
  let prefixedKeys = [];

  if (testRunId) {
    const prefix = buildSmokePrefix(testRunId);
    if (prefix) {
      prefixedKeys = await uploadService.listObjectKeysByPrefix(prefix);
    }
  }

  const uniqueKeys = Array.from(new Set([...discoveredKeys, ...prefixedKeys].map((key) => String(key || '').trim()).filter(Boolean)));
  if (!dryRun && uniqueKeys.length > 0) {
    await uploadService.deleteObjects(uniqueKeys);
  }
  return {
    keys: uniqueKeys,
    count: uniqueKeys.length,
    prefixCount: prefixedKeys.length
  };
}

function printSummary({ options, mongoSummary, postgresSummary, r2Summary }) {
  console.log('Smoke test cleanup summary');
  console.log(`Test Run ID: ${options.testRunId || '(expired records)'}`);
  console.log(`Expired Cleanup: ${options.expired}`);
  console.log(`Dry Run: ${options.dryRun}`);
  console.log(`Production Forced: ${options.forceProduction}`);

  console.log('\nMongoDB');
  printCounts(mongoSummary);

  console.log('\nSupabase/Postgres');
  printCounts(postgresSummary);

  console.log('\nR2');
  console.log(`- objects: ${r2Summary.count} ${options.dryRun ? 'found' : 'deleted'}`);
  if (options.testRunId) {
    console.log(`- prefix objects: ${r2Summary.prefixCount || 0}`);
  }
}

async function writeAuditLog({ options, mongoSummary, postgresSummary, r2Summary }) {
  if (!options.auditLogFile) return;

  const payload = {
    type: 'smoke-test-cleanup',
    executedAt: new Date().toISOString(),
    testRunId: options.testRunId || null,
    expired: options.expired,
    dryRun: options.dryRun,
    forceProduction: options.forceProduction,
    mongoSummary,
    postgresSummary,
    r2Summary
  };

  await fs.appendFile(options.auditLogFile, `${JSON.stringify(payload)}\n`, 'utf8');
}

function printCounts(summary) {
  const entries = Object.entries(summary || {});
  if (!entries.length) {
    console.log('- skipped');
    return;
  }

  for (const [name, count] of entries) {
    console.log(`- ${name}: ${count}`);
  }
}

function assertNoRemaining(remaining, label) {
  const entries = Object.entries(remaining);
  if (!entries.length) return;

  const details = entries.map(([name, count]) => `${name}: ${count}`).join(', ');
  throw new Error(`${label} cleanup validation failed. Remaining smoke records: ${details}`);
}

async function main() {
  const options = parseArgs();
  assertSafeEnvironment(options);

  const mongoUri = String(process.env.MONGODB_URI || '').trim();
  const mongoFilter = buildMongoFilter(options);
  let models = [];
  let mongoSummary = {};
  let postgresSummary = {};
  let r2Summary = { count: 0, keys: [] };
  let sql = null;

  try {
    if (mongoUri) {
      await mongoose.connect(mongoUri, {
        dbName: process.env.MONGODB_DB_NAME
      });
      models = loadMongoModels();
      const mongoResult = await cleanupMongo({
        models,
        filter: mongoFilter,
        dryRun: options.dryRun
      });
      mongoSummary = mongoResult.summary;
      r2Summary = await cleanupR2({
        keys: mongoResult.r2Keys,
        dryRun: options.dryRun,
        testRunId: options.testRunId
      });
    } else if (options.testRunId) {
      r2Summary = await cleanupR2({
        keys: [],
        dryRun: options.dryRun,
        testRunId: options.testRunId
      });
    }

    if (process.env.DATABASE_URL) {
      sql = getPostgresClient();
      postgresSummary = await cleanupPostgres({
        sql,
        options,
        dryRun: options.dryRun
      });
    }

    printSummary({
      options,
      mongoSummary,
      postgresSummary,
      r2Summary
    });

    await writeAuditLog({
      options,
      mongoSummary,
      postgresSummary,
      r2Summary
    });

    if (!options.dryRun) {
      if (models.length) {
        assertNoRemaining(await validateMongoCleanup({ models, filter: mongoFilter }), 'MongoDB');
      }
      if (sql) {
        assertNoRemaining(await validatePostgresCleanup({ sql, options }), 'Supabase/Postgres');
      }
    }
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    await closePostgresClient();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error('Smoke test cleanup failed:', error.message);
    process.exit(1);
  });
}

module.exports = {
  POSTGRES_TABLES,
  buildMongoFilter,
  buildPostgresWhere,
  buildSmokePrefix,
  collectR2KeysFromDocuments,
  parseArgs,
  assertSafeEnvironment,
  quoteIdentifier
};
