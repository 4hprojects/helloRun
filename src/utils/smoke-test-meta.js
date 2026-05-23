function createTestRunId(now = new Date()) {
  return `smoke-${now.toISOString().replace(/[:.]/g, '-')}`;
}

function createSmokeTestMeta(options = {}) {
  const now = options.now || new Date();
  const testRunId = options.testRunId || process.env.SMOKE_TEST_RUN_ID || createTestRunId(now);

  return {
    isSmokeTest: true,
    testRunId,
    createdByTest: 'smoke',
    expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000)
  };
}

function toPostgresSmokeMeta(smokeMeta) {
  return {
    is_smoke_test: Boolean(smokeMeta?.isSmokeTest),
    test_run_id: smokeMeta?.testRunId || '',
    created_by_test: smokeMeta?.createdByTest || 'smoke',
    expires_at: smokeMeta?.expiresAt || null
  };
}

module.exports = {
  createTestRunId,
  createSmokeTestMeta,
  toPostgresSmokeMeta
};
