const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const {
  createSmokeTestMeta,
  createTestRunId,
  toPostgresSmokeMeta
} = require('../src/utils/smoke-test-meta');

const {
  buildMongoFilter,
  buildPostgresWhere,
  buildSmokePrefix,
  collectR2KeysFromDocuments,
  parseArgs,
  assertSafeEnvironment,
  quoteIdentifier
} = require('../src/scripts/cleanup-smoke-tests');
const { applySmokeTestSchema } = require('../src/utils/smoke-test-schema');
const uploadService = require('../src/services/upload.service');

test('createSmokeTestMeta returns one run id and matching Postgres metadata', () => {
  const now = new Date('2026-05-23T10:11:12.000Z');
  const meta = createSmokeTestMeta({ now, testRunId: 'smoke-fixed' });

  assert.deepEqual(meta, {
    isSmokeTest: true,
    testRunId: 'smoke-fixed',
    createdByTest: 'smoke',
    expiresAt: new Date('2026-05-24T10:11:12.000Z')
  });

  assert.deepEqual(toPostgresSmokeMeta(meta), {
    is_smoke_test: true,
    test_run_id: 'smoke-fixed',
    created_by_test: 'smoke',
    expires_at: new Date('2026-05-24T10:11:12.000Z')
  });
});

test('createTestRunId creates filesystem-safe smoke id', () => {
  assert.equal(
    createTestRunId(new Date('2026-05-23T10:11:12.345Z')),
    'smoke-2026-05-23T10-11-12-345Z'
  );
});

test('parseArgs requires a bounded cleanup mode', () => {
  assert.throws(() => parseArgs([]), /requires --test-run-id or --expired/);
  assert.deepEqual(parseArgs(['--dry-run', '--test-run-id', 'smoke-1']), {
    dryRun: true,
    expired: false,
    forceProduction: false,
    testRunId: 'smoke-1',
    auditLogFile: ''
  });
  assert.deepEqual(parseArgs(['--expired', '--force-production']), {
    dryRun: false,
    expired: true,
    forceProduction: true,
    testRunId: '',
    auditLogFile: ''
  });
  assert.deepEqual(parseArgs(['--expired', '--audit-log-file', 'logs/smoke-cleanup.jsonl']), {
    dryRun: false,
    expired: true,
    forceProduction: false,
    testRunId: '',
    auditLogFile: 'logs/smoke-cleanup.jsonl'
  });
});

test('assertSafeEnvironment refuses destructive production cleanup unless forced or dry run', () => {
  assert.throws(
    () => assertSafeEnvironment({ dryRun: false, forceProduction: false }, { NODE_ENV: 'production' }),
    /Refusing to clean smoke test data/
  );

  assert.doesNotThrow(() => {
    assertSafeEnvironment({ dryRun: true, forceProduction: false }, { NODE_ENV: 'production' });
  });

  assert.doesNotThrow(() => {
    assertSafeEnvironment({ dryRun: false, forceProduction: true }, { NODE_ENV: 'production' });
  });
});

test('cleanup filters always include smoke metadata', () => {
  const now = new Date('2026-05-23T00:00:00.000Z');

  assert.deepEqual(buildMongoFilter({ testRunId: 'smoke-1' }, now), {
    isSmokeTest: true,
    testRunId: 'smoke-1'
  });

  assert.deepEqual(buildMongoFilter({ expired: true }, now), {
    isSmokeTest: true,
    expiresAt: { $lt: now }
  });

  assert.deepEqual(buildPostgresWhere({ testRunId: 'smoke-1' }), {
    clause: 'is_smoke_test = true and test_run_id = $1',
    values: ['smoke-1']
  });

  assert.deepEqual(buildPostgresWhere({ expired: true }), {
    clause: 'is_smoke_test = true and expires_at < now()',
    values: []
  });
});

test('collectR2KeysFromDocuments collects direct keys and URLs', () => {
  const originalBase = process.env.R2_PUBLIC_BASE_URL;
  process.env.R2_PUBLIC_BASE_URL = 'https://assets.hellorun.test';

  try {
    const keys = new Set();
    collectR2KeysFromDocuments([
      {
        paymentProof: {
          key: 'payments/proofs/user/a.png',
          url: 'https://assets.hellorun.test/payments/proofs/user/a.png'
        },
        galleryImageUrls: [
          'https://assets.hellorun.test/event-branding/gallery/user/b.webp'
        ],
        unrelatedUrl: 'https://example.com/not-r2.png'
      }
    ], keys);

    assert.deepEqual(Array.from(keys).sort(), [
      'event-branding/gallery/user/b.webp',
      'payments/proofs/user/a.png'
    ]);
  } finally {
    if (originalBase === undefined) {
      delete process.env.R2_PUBLIC_BASE_URL;
    } else {
      process.env.R2_PUBLIC_BASE_URL = originalBase;
    }
  }
});

test('quoteIdentifier escapes table identifiers', () => {
  assert.equal(quoteIdentifier('events_core'), '"events_core"');
  assert.equal(quoteIdentifier('a"b'), '"a""b"');
});

test('buildSmokePrefix returns dedicated smoke path', () => {
  assert.equal(buildSmokePrefix('smoke-2026-05-23-001'), 'smoke-tests/smoke-2026-05-23-001/');
  assert.equal(buildSmokePrefix(''), '');
});

test('upload service scopes category to smoke prefix when run id is set', () => {
  const originalRunId = process.env.SMOKE_TEST_RUN_ID;
  const originalDisable = process.env.SMOKE_TEST_OBJECT_PREFIX;

  process.env.SMOKE_TEST_RUN_ID = 'smoke-run-42';
  delete process.env.SMOKE_TEST_OBJECT_PREFIX;

  try {
    assert.equal(
      uploadService._scopeCategoryForSmokeTests('payments/proofs'),
      'smoke-tests/smoke-run-42/payments/proofs'
    );

    process.env.SMOKE_TEST_OBJECT_PREFIX = '0';

    assert.equal(
      uploadService._scopeCategoryForSmokeTests('payments/proofs'),
      'payments/proofs'
    );
  } finally {
    if (originalRunId === undefined) {
      delete process.env.SMOKE_TEST_RUN_ID;
    } else {
      process.env.SMOKE_TEST_RUN_ID = originalRunId;
    }

    if (originalDisable === undefined) {
      delete process.env.SMOKE_TEST_OBJECT_PREFIX;
    } else {
      process.env.SMOKE_TEST_OBJECT_PREFIX = originalDisable;
    }
  }
});

test('applySmokeTestSchema auto-tags new docs when SMOKE_TEST_RUN_ID is set', async () => {
  const originalRunId = process.env.SMOKE_TEST_RUN_ID;
  const originalAutoTag = process.env.SMOKE_TEST_AUTO_TAG;
  process.env.SMOKE_TEST_RUN_ID = 'smoke-auto';
  delete process.env.SMOKE_TEST_AUTO_TAG;

  try {
    const schema = new mongoose.Schema({ name: String });
    applySmokeTestSchema(schema);
    const Model = mongoose.models.SmokeTagProbe || mongoose.model('SmokeTagProbe', schema);
    const doc = new Model({ name: 'probe' });

    await doc.validate();

    assert.equal(doc.isSmokeTest, true);
    assert.equal(doc.testRunId, 'smoke-auto');
    assert.equal(doc.createdByTest, 'smoke');
    assert.ok(doc.expiresAt instanceof Date);
  } finally {
    if (originalRunId === undefined) {
      delete process.env.SMOKE_TEST_RUN_ID;
    } else {
      process.env.SMOKE_TEST_RUN_ID = originalRunId;
    }

    if (originalAutoTag === undefined) {
      delete process.env.SMOKE_TEST_AUTO_TAG;
    } else {
      process.env.SMOKE_TEST_AUTO_TAG = originalAutoTag;
    }
  }
});
