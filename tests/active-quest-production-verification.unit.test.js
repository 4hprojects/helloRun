const test = require('node:test');
const assert = require('node:assert/strict');
const {
  MIGRATION,
  AUTHORITATIVE_EVENT_QUERY,
  REQUIRED_COLUMNS,
  REQUIRED_INDEXES,
  assertAuthoritativeShadowCoverage,
  assertSetContains,
  compareRepresentative,
  expectedPriorMigrations
} = require('../src/scripts/verify-active-quest-production-database');
const { verifyDeployment } = require('../src/scripts/verify-active-quest-deployment');

test('Active Quest database preflight requires every migration before 028', () => {
  const migrations = expectedPriorMigrations();
  assert.ok(migrations.length >= 28);
  assert.equal(migrations.includes(MIGRATION), false);
  assert.equal(migrations.at(-1), '027_public_schema_rls_lockdown.sql');
  assert.throws(() => assertSetContains(new Set(migrations.slice(1)), migrations, 'Required migrations'), /001_phase1_app_users/);
});

test('Active Quest database verifier locks the migration 028 shape', () => {
  assert.deepEqual(REQUIRED_COLUMNS, [
    'generated_from_key',
    'series_key',
    'series_month',
    'series_snapshot_checksum',
    'series_template_version_id',
    'series_year'
  ]);
  assert.deepEqual(REQUIRED_INDEXES, ['events_core_series_template_idx', 'events_core_unique_series_month']);
});

test('Active Quest database verifier scopes Mongo authority to real events', () => {
  assert.deepEqual(AUTHORITATIVE_EVENT_QUERY, {
    isPersonalRecord: { $ne: true },
    isTestData: { $ne: true }
  });
});

test('Active Quest database verifier reports unrelated fixture shadows without failing coverage', () => {
  assert.deepEqual(assertAuthoritativeShadowCoverage({
    mongoEventIds: ['event-a', 'event-b'],
    shadowMongoEventIds: ['event-a', 'event-b'],
    totalShadowEventCount: 602
  }), {
    mongoEventCount: 2,
    shadowEventCount: 2,
    totalShadowEventCount: 602,
    ignoredShadowEventCount: 600
  });
});

test('Active Quest database verifier rejects missing authoritative shadows', () => {
  assert.throws(() => assertAuthoritativeShadowCoverage({
    mongoEventIds: ['event-a', 'event-b'],
    shadowMongoEventIds: ['event-a'],
    totalShadowEventCount: 601
  }), /Authoritative event shadows missing: 1/);
});

test('Active Quest representative parity reports changed fields', () => {
  const normalized = {
    slug: 'november-active-quest-2026',
    title: 'November Active Quest 2026',
    status: 'draft',
    eventType: 'virtual',
    virtualCompletionMode: 'accumulated_distance',
    distances: ['25K', '50K']
  };
  const row = {
    slug: normalized.slug,
    title: normalized.title,
    status: 'published',
    event_type: normalized.eventType,
    virtual_completion_mode: normalized.virtualCompletionMode
  };
  assert.deepEqual(compareRepresentative(normalized, row, normalized.distances), ['status']);
});

test('Active Quest deployment verifier requires exact SHA and healthy routes', async () => {
  const sha = 'a'.repeat(40);
  const fetchImpl = async (url) => {
    if (url.endsWith('/healthz')) return { status: 200, json: async () => ({ ok: true, build: { commit: sha } }) };
    if (url.endsWith('/readyz')) return { status: 200, json: async () => ({ ok: true }) };
    return { status: 200, json: async () => null };
  };
  assert.deepEqual(await verifyDeployment({ baseUrl: 'https://hellorun.example', expectedSha: sha, fetchImpl }), {
    expectedSha: sha,
    healthz: 200,
    readyz: 200,
    activeQuest: 200
  });
  await assert.rejects(
    verifyDeployment({ baseUrl: 'https://hellorun.example', expectedSha: 'b'.repeat(40), fetchImpl }),
    /Deployed SHA mismatch/
  );
});

test('Active Quest deployment verifier refuses insecure URLs and short SHAs', async () => {
  await assert.rejects(verifyDeployment({ baseUrl: 'http://hellorun.example', expectedSha: 'a'.repeat(40) }), /HTTPS/);
  await assert.rejects(verifyDeployment({ baseUrl: 'https://hellorun.example', expectedSha: 'abc' }), /40-character/);
});
