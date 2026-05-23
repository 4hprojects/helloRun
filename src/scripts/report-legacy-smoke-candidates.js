require('dotenv').config();

const fs = require('node:fs/promises');
const path = require('node:path');
const mongoose = require('mongoose');

const REPORT_MODELS = [
  {
    name: 'User',
    loader: () => require('../models/User'),
    select: '_id email firstName lastName createdAt updatedAt isSmokeTest testRunId createdByTest expiresAt',
    fields: ['email', 'firstName', 'lastName']
  },
  {
    name: 'OrganiserApplication',
    loader: () => require('../models/OrganiserApplication'),
    select: '_id userId applicationId businessName contactPhone createdAt updatedAt isSmokeTest testRunId createdByTest expiresAt',
    fields: ['applicationId', 'businessName']
  },
  {
    name: 'Event',
    loader: () => require('../models/Event'),
    select: '_id slug title organiserName createdAt updatedAt isSmokeTest testRunId createdByTest expiresAt',
    fields: ['slug', 'title', 'organiserName']
  },
  {
    name: 'Registration',
    loader: () => require('../models/Registration'),
    select: '_id eventId userId confirmationCode participant.email participant.firstName participant.lastName paymentProof.key paymentProof.url createdAt updatedAt isSmokeTest testRunId createdByTest expiresAt',
    fields: ['confirmationCode', 'participant.email', 'participant.firstName', 'participant.lastName', 'paymentProof.key', 'paymentProof.url']
  },
  {
    name: 'Submission',
    loader: () => require('../models/Submission'),
    select: '_id eventId registrationId runnerId proof.key proof.url certificate.key certificate.url runLocation ocrData.rawText createdAt updatedAt isSmokeTest testRunId createdByTest expiresAt',
    fields: ['proof.key', 'proof.url', 'certificate.key', 'certificate.url', 'runLocation', 'ocrData.rawText']
  }
];

const KEYWORD_PATTERN = /\b(smoke|smoke[-_ ]?test|test[-_ ]?run|legacy[-_ ]?test|qa[-_ ]?test|staging[-_ ]?test|dummy[-_ ]?data)\b/i;
const TEST_EMAIL_PATTERN = /@(example\.com|mailinator\.com|tempmail\.|test\.)/i;
const SMOKE_PREFIX_PATTERN = /(^|\/)smoke-tests\//i;

function parseArgs(argv = process.argv.slice(2)) {
  const options = {
    output: 'logs/legacy-smoke-candidates.json',
    limitPerModel: 250,
    sinceDays: 0,
    includeTagged: false
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--output') {
      options.output = String(argv[i + 1] || '').trim() || options.output;
      i += 1;
    } else if (arg.startsWith('--output=')) {
      options.output = arg.slice('--output='.length).trim() || options.output;
    } else if (arg === '--limit') {
      options.limitPerModel = Number(argv[i + 1] || options.limitPerModel);
      i += 1;
    } else if (arg.startsWith('--limit=')) {
      options.limitPerModel = Number(arg.slice('--limit='.length));
    } else if (arg === '--since-days') {
      options.sinceDays = Number(argv[i + 1] || options.sinceDays);
      i += 1;
    } else if (arg.startsWith('--since-days=')) {
      options.sinceDays = Number(arg.slice('--since-days='.length));
    } else if (arg === '--include-tagged') {
      options.includeTagged = true;
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  if (!Number.isFinite(options.limitPerModel) || options.limitPerModel <= 0) {
    throw new Error('--limit must be a positive number.');
  }

  if (!Number.isFinite(options.sinceDays) || options.sinceDays < 0) {
    throw new Error('--since-days must be zero or a positive number.');
  }

  return options;
}

function getNestedValue(source, dottedPath) {
  const parts = String(dottedPath || '').split('.').filter(Boolean);
  let current = source;
  for (const part of parts) {
    if (!current || typeof current !== 'object') return '';
    current = current[part];
  }
  if (current === null || current === undefined) return '';
  if (typeof current === 'string') return current;
  if (typeof current === 'number' || typeof current === 'boolean') return String(current);
  return '';
}

function analyzeLegacyCandidate(doc, fieldPaths) {
  const reasons = [];

  for (const fieldPath of fieldPaths) {
    const value = getNestedValue(doc, fieldPath).trim();
    if (!value) continue;

    if (fieldPath.toLowerCase().includes('email') && TEST_EMAIL_PATTERN.test(value)) {
      reasons.push({ field: fieldPath, reason: 'test_email_domain', value });
    }

    if (SMOKE_PREFIX_PATTERN.test(value)) {
      reasons.push({ field: fieldPath, reason: 'smoke_storage_prefix', value });
    }

    if (KEYWORD_PATTERN.test(value)) {
      reasons.push({ field: fieldPath, reason: 'legacy_test_keyword', value });
    }
  }

  return reasons;
}

function buildQuery(options) {
  const query = {};

  if (!options.includeTagged) {
    query.isSmokeTest = { $ne: true };
  }

  if (options.sinceDays > 0) {
    const now = Date.now();
    const since = new Date(now - options.sinceDays * 24 * 60 * 60 * 1000);
    query.createdAt = { $gte: since };
  }

  return query;
}

function buildCandidateEntry(doc, reasons) {
  return {
    id: String(doc._id),
    createdAt: doc.createdAt || null,
    updatedAt: doc.updatedAt || null,
    isSmokeTest: Boolean(doc.isSmokeTest),
    testRunId: doc.testRunId || '',
    createdByTest: doc.createdByTest || '',
    expiresAt: doc.expiresAt || null,
    reasons
  };
}

async function scanModel({ modelConfig, options }) {
  const Model = modelConfig.loader();
  const query = buildQuery(options);

  const docs = await Model.find(query)
    .select(modelConfig.select)
    .sort({ createdAt: -1 })
    .limit(options.limitPerModel)
    .lean();

  const candidates = [];
  for (const doc of docs) {
    const reasons = analyzeLegacyCandidate(doc, modelConfig.fields);
    if (reasons.length) {
      candidates.push(buildCandidateEntry(doc, reasons));
    }
  }

  return {
    scanned: docs.length,
    candidates
  };
}

async function ensureParentDir(filePath) {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
}

async function runLegacySmokeReport(options) {
  const mongoUri = String(process.env.MONGODB_URI || '').trim();
  if (!mongoUri) {
    throw new Error('MONGODB_URI is required to run legacy smoke candidate reporting.');
  }

  await mongoose.connect(mongoUri, {
    dbName: process.env.MONGODB_DB_NAME
  });

  try {
    const report = {
      generatedAt: new Date().toISOString(),
      options,
      summary: {},
      models: {}
    };

    let totalCandidates = 0;

    for (const modelConfig of REPORT_MODELS) {
      const result = await scanModel({ modelConfig, options });
      report.models[modelConfig.name] = result;
      report.summary[modelConfig.name] = {
        scanned: result.scanned,
        candidates: result.candidates.length
      };
      totalCandidates += result.candidates.length;
    }

    await enrichLinkedCandidates(report, options);

    totalCandidates = 0;
    for (const [modelName, payload] of Object.entries(report.models)) {
      report.summary[modelName] = {
        scanned: payload.scanned,
        candidates: payload.candidates.length
      };
      totalCandidates += payload.candidates.length;
    }

    report.summary.totalCandidates = totalCandidates;

    await ensureParentDir(options.output);
    await fs.writeFile(options.output, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

    console.log('Legacy smoke candidate report complete');
    console.log(`Output: ${options.output}`);
    console.log(`Total candidates: ${totalCandidates}`);
    for (const [name, details] of Object.entries(report.summary)) {
      if (name === 'totalCandidates') continue;
      console.log(`- ${name}: scanned ${details.scanned}, candidates ${details.candidates}`);
    }

    return report;
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
}

async function enrichLinkedCandidates(report, options) {
  const Registration = require('../models/Registration');
  const Event = require('../models/Event');
  const User = require('../models/User');
  const OrganiserApplication = require('../models/OrganiserApplication');
  const Submission = require('../models/Submission');

  const registrationCandidateIds = toObjectIdValues(report.models?.Registration?.candidates || []);
  if (!registrationCandidateIds.length) return;

  const registrationDocs = await Registration.find({ _id: { $in: registrationCandidateIds } })
    .select('_id eventId userId')
    .lean();

  const eventIds = dedupeIds(registrationDocs.map((doc) => doc.eventId));
  const userIds = dedupeIds(registrationDocs.map((doc) => doc.userId));

  if (eventIds.length) {
    const base = buildQuery(options);
    const docs = await Event.find({ ...base, _id: { $in: eventIds } })
      .select('_id createdAt updatedAt isSmokeTest testRunId createdByTest expiresAt')
      .lean();
    for (const doc of docs) {
      upsertCandidate(report.models.Event, buildCandidateEntry(doc, [
        {
          field: '_id',
          reason: 'linked_registration_candidate',
          value: 'registration-candidate-link'
        }
      ]));
    }
  }

  if (userIds.length) {
    const base = buildQuery(options);
    const docs = await User.find({ ...base, _id: { $in: userIds } })
      .select('_id createdAt updatedAt isSmokeTest testRunId createdByTest expiresAt')
      .lean();
    for (const doc of docs) {
      upsertCandidate(report.models.User, buildCandidateEntry(doc, [
        {
          field: '_id',
          reason: 'linked_registration_candidate',
          value: 'registration-candidate-link'
        }
      ]));
    }

    const applicationDocs = await OrganiserApplication.find({ ...base, userId: { $in: userIds } })
      .select('_id createdAt updatedAt isSmokeTest testRunId createdByTest expiresAt')
      .lean();
    for (const doc of applicationDocs) {
      upsertCandidate(report.models.OrganiserApplication, buildCandidateEntry(doc, [
        {
          field: 'userId',
          reason: 'linked_user_candidate',
          value: 'user-candidate-link'
        }
      ]));
    }
  }

  const base = buildQuery(options);
  const submissionDocs = await Submission.find({
    ...base,
    $or: [
      { registrationId: { $in: registrationCandidateIds } },
      { runnerId: { $in: userIds } }
    ]
  })
    .select('_id createdAt updatedAt isSmokeTest testRunId createdByTest expiresAt')
    .lean();

  for (const doc of submissionDocs) {
    upsertCandidate(report.models.Submission, buildCandidateEntry(doc, [
      {
        field: '_id',
        reason: 'linked_registration_candidate',
        value: 'registration-or-user-candidate-link'
      }
    ]));
  }
}

function toObjectIdValues(entries) {
  return dedupeIds((entries || []).map((entry) => entry?.id));
}

function dedupeIds(values) {
  const set = new Set();
  for (const value of values || []) {
    const id = String(value || '').trim();
    if (id && /^[a-f0-9]{24}$/i.test(id)) {
      set.add(id);
    }
  }
  return Array.from(set);
}

function upsertCandidate(modelBucket, entry) {
  if (!modelBucket || !entry?.id) return;
  const list = Array.isArray(modelBucket.candidates) ? modelBucket.candidates : [];
  const existing = list.find((item) => item.id === entry.id);
  if (!existing) {
    list.push(entry);
    modelBucket.candidates = list;
    return;
  }

  const existingKeys = new Set((existing.reasons || []).map((reason) => `${reason.field}|${reason.reason}|${reason.value}`));
  for (const reason of entry.reasons || []) {
    const key = `${reason.field}|${reason.reason}|${reason.value}`;
    if (!existingKeys.has(key)) {
      existing.reasons = Array.isArray(existing.reasons) ? existing.reasons : [];
      existing.reasons.push(reason);
      existingKeys.add(key);
    }
  }
}

async function main() {
  const options = parseArgs();
  await runLegacySmokeReport(options);
}

if (require.main === module) {
  main().catch((error) => {
    console.error('Legacy smoke candidate report failed:', error.message);
    process.exit(1);
  });
}

module.exports = {
  KEYWORD_PATTERN,
  TEST_EMAIL_PATTERN,
  SMOKE_PREFIX_PATTERN,
  REPORT_MODELS,
  parseArgs,
  getNestedValue,
  analyzeLegacyCandidate,
  buildQuery,
  buildCandidateEntry,
  dedupeIds,
  upsertCandidate,
  runLegacySmokeReport
};
