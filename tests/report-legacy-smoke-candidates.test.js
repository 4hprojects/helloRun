const test = require('node:test');
const assert = require('node:assert/strict');

const {
  parseArgs,
  getNestedValue,
  analyzeLegacyCandidate,
  buildQuery
} = require('../src/scripts/report-legacy-smoke-candidates');

test('parseArgs supports output, limit, since-days, and include-tagged', () => {
  assert.deepEqual(parseArgs([]), {
    output: 'logs/legacy-smoke-candidates.json',
    limitPerModel: 250,
    sinceDays: 0,
    includeTagged: false
  });

  assert.deepEqual(parseArgs([
    '--output',
    'logs/custom.json',
    '--limit',
    '50',
    '--since-days',
    '30',
    '--include-tagged'
  ]), {
    output: 'logs/custom.json',
    limitPerModel: 50,
    sinceDays: 30,
    includeTagged: true
  });
});

test('getNestedValue reads dotted paths safely', () => {
  const doc = {
    a: {
      b: {
        c: 'hello'
      }
    }
  };

  assert.equal(getNestedValue(doc, 'a.b.c'), 'hello');
  assert.equal(getNestedValue(doc, 'a.b.d'), '');
  assert.equal(getNestedValue(null, 'a.b.c'), '');
});

test('analyzeLegacyCandidate captures keyword, email domain, and smoke prefix reasons', () => {
  const doc = {
    email: 'qa-user@example.com',
    slug: 'spring-smoke-test-run',
    proof: {
      key: 'smoke-tests/smoke-2026-05-23/results/proofs/x.png'
    }
  };

  const reasons = analyzeLegacyCandidate(doc, ['email', 'slug', 'proof.key']);
  const reasonCodes = reasons.map((item) => item.reason).sort();

  assert.deepEqual(reasonCodes, ['legacy_test_keyword', 'legacy_test_keyword', 'smoke_storage_prefix', 'test_email_domain']);
});

test('buildQuery excludes tagged by default and supports since-days window', () => {
  const defaultQuery = buildQuery({ includeTagged: false, sinceDays: 0 });
  assert.deepEqual(defaultQuery, {
    isSmokeTest: { $ne: true }
  });

  const withWindow = buildQuery({ includeTagged: false, sinceDays: 7 });
  assert.deepEqual(withWindow.isSmokeTest, { $ne: true });
  assert.ok(withWindow.createdAt.$gte instanceof Date);

  const includeTagged = buildQuery({ includeTagged: true, sinceDays: 0 });
  assert.deepEqual(includeTagged, {});
});
