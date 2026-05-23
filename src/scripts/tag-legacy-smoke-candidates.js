require('dotenv').config();

const fs = require('node:fs/promises');
const mongoose = require('mongoose');

const MODEL_LOADERS = {
  User: () => require('../models/User'),
  OrganiserApplication: () => require('../models/OrganiserApplication'),
  Event: () => require('../models/Event'),
  Registration: () => require('../models/Registration'),
  Submission: () => require('../models/Submission')
};

const DEFAULT_ALLOWED_REASONS = new Set([
  'test_email_domain',
  'smoke_storage_prefix',
  'legacy_test_keyword'
]);

function parseArgs(argv = process.argv.slice(2)) {
  const options = {
    reportFile: 'logs/legacy-smoke-candidates.json',
    testRunId: '',
    createdByTest: 'legacy-smoke-backfill',
    expiresInHours: 1,
    apply: false,
    includeLinked: false
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--report-file') {
      options.reportFile = String(argv[i + 1] || '').trim() || options.reportFile;
      i += 1;
    } else if (arg.startsWith('--report-file=')) {
      options.reportFile = arg.slice('--report-file='.length).trim() || options.reportFile;
    } else if (arg === '--test-run-id') {
      options.testRunId = String(argv[i + 1] || '').trim();
      i += 1;
    } else if (arg.startsWith('--test-run-id=')) {
      options.testRunId = arg.slice('--test-run-id='.length).trim();
    } else if (arg === '--created-by-test') {
      options.createdByTest = String(argv[i + 1] || '').trim() || options.createdByTest;
      i += 1;
    } else if (arg.startsWith('--created-by-test=')) {
      options.createdByTest = arg.slice('--created-by-test='.length).trim() || options.createdByTest;
    } else if (arg === '--expires-in-hours') {
      options.expiresInHours = Number(argv[i + 1] || options.expiresInHours);
      i += 1;
    } else if (arg.startsWith('--expires-in-hours=')) {
      options.expiresInHours = Number(arg.slice('--expires-in-hours='.length));
    } else if (arg === '--apply') {
      options.apply = true;
    } else if (arg === '--include-linked') {
      options.includeLinked = true;
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  if (!options.testRunId) {
    throw new Error('--test-run-id is required.');
  }

  if (!Number.isFinite(options.expiresInHours) || options.expiresInHours <= 0) {
    throw new Error('--expires-in-hours must be a positive number.');
  }

  return options;
}

function toObjectIdList(candidates = []) {
  return candidates
    .map((entry) => String(entry?.id || '').trim())
    .filter((id) => id && /^[a-f0-9]{24}$/i.test(id));
}

function hasAllowedReason(entry, options = {}) {
  const allowedReasons = new Set(DEFAULT_ALLOWED_REASONS);
  if (options.includeLinked) {
    allowedReasons.add('linked_registration_candidate');
    allowedReasons.add('linked_user_candidate');
  }

  const reasons = Array.isArray(entry?.reasons) ? entry.reasons : [];
  return reasons.some((item) => allowedReasons.has(String(item?.reason || '').trim()));
}

function selectEligibleIds(candidates = [], options = {}) {
  return toObjectIdList(candidates.filter((entry) => hasAllowedReason(entry, options)));
}

async function loadReport(reportFile) {
  const json = await fs.readFile(reportFile, 'utf8');
  return JSON.parse(json);
}

async function tagModelCandidates({ modelName, candidates, options, expiresAt }) {
  const loader = MODEL_LOADERS[modelName];
  if (!loader) {
    return { modelName, eligible: 0, matched: 0, modified: 0, skipped: true };
  }

  const ids = selectEligibleIds(candidates, options);
  if (!ids.length) {
    return { modelName, eligible: 0, matched: 0, modified: 0, skipped: false };
  }

  const Model = loader();
  const filter = {
    _id: { $in: ids },
    isSmokeTest: { $ne: true }
  };

  const matched = await Model.countDocuments(filter);
  if (!options.apply) {
    return { modelName, eligible: ids.length, matched, modified: 0, skipped: false };
  }

  const update = {
    $set: {
      isSmokeTest: true,
      testRunId: options.testRunId,
      createdByTest: options.createdByTest,
      expiresAt
    }
  };

  const result = await Model.updateMany(filter, update);
  const modified = Number(result.modifiedCount || 0);

  return { modelName, eligible: ids.length, matched, modified, skipped: false };
}

async function runLegacyTagging(options) {
  const mongoUri = String(process.env.MONGODB_URI || '').trim();
  if (!mongoUri) {
    throw new Error('MONGODB_URI is required to tag legacy smoke candidates.');
  }

  const report = await loadReport(options.reportFile);
  const models = report?.models || {};
  const expiresAt = new Date(Date.now() + options.expiresInHours * 60 * 60 * 1000);

  await mongoose.connect(mongoUri, {
    dbName: process.env.MONGODB_DB_NAME
  });

  try {
    const summary = [];
    for (const [modelName, payload] of Object.entries(models)) {
      const candidates = Array.isArray(payload?.candidates) ? payload.candidates : [];
      // eslint-disable-next-line no-await-in-loop
      const row = await tagModelCandidates({ modelName, candidates, options, expiresAt });
      summary.push(row);
    }

    const totals = summary.reduce(
      (acc, row) => {
        acc.eligible += row.eligible;
        acc.matched += row.matched;
        acc.modified += row.modified;
        return acc;
      },
      { eligible: 0, matched: 0, modified: 0 }
    );

    console.log('Legacy smoke candidate tagging summary');
    console.log(`Mode: ${options.apply ? 'APPLY' : 'DRY-RUN'}`);
    console.log(`Report file: ${options.reportFile}`);
    console.log(`testRunId: ${options.testRunId}`);
    console.log(`includeLinked: ${options.includeLinked}`);
    console.log(`expiresAt: ${expiresAt.toISOString()}`);

    for (const row of summary) {
      if (row.skipped) {
        console.log(`- ${row.modelName}: skipped (no loader)`);
        continue;
      }
      console.log(`- ${row.modelName}: eligible ${row.eligible}, matched ${row.matched}, modified ${row.modified}`);
    }

    console.log(`Totals: eligible ${totals.eligible}, matched ${totals.matched}, modified ${totals.modified}`);

    return { summary, totals, options, expiresAt };
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
}

async function main() {
  const options = parseArgs();
  await runLegacyTagging(options);
}

if (require.main === module) {
  main().catch((error) => {
    console.error('Legacy smoke tagging failed:', error.message);
    process.exit(1);
  });
}

module.exports = {
  parseArgs,
  hasAllowedReason,
  selectEligibleIds,
  runLegacyTagging
};
