const test = require('node:test');
const assert = require('node:assert/strict');

const { buildPolicyConsentRecords } = require('../src/services/policy-consent.service');

test('buildPolicyConsentRecords creates one record per accepted policy version', () => {
  const acceptedAt = new Date('2026-05-15T00:00:00.000Z');
  const records = buildPolicyConsentRecords({
    _id: '507f1f77bcf86cd799439011',
    agreedPolicies: {
      privacyPolicyId: 'privacy-id',
      privacyPolicyVersion: '1.0',
      termsPolicyId: 'terms-id',
      termsPolicyVersion: '1.1',
      cookiePolicyId: 'cookie-id',
      cookiePolicyVersion: '1.2',
      dataUsagePolicyId: 'data-usage-id',
      dataUsagePolicyVersion: '1.3',
      agreedAt: acceptedAt,
      ipAddress: '127.0.0.1',
      userAgent: 'node:test'
    }
  });

  assert.equal(records.length, 4);
  assert.deepEqual(records.map((record) => record.policyType), [
    'privacy_policy',
    'terms_policy',
    'cookie_policy',
    'data_usage_policy'
  ]);
  assert.deepEqual(records.map((record) => record.version), ['1.0', '1.1', '1.2', '1.3']);
  assert.equal(records[0].acceptedAt, acceptedAt);
});

test('buildPolicyConsentRecords skips policies without versions', () => {
  const records = buildPolicyConsentRecords({
    _id: '507f1f77bcf86cd799439011',
    agreedPolicies: {
      privacyPolicyVersion: '1.0',
      termsPolicyVersion: '',
      cookiePolicyVersion: null,
      dataUsagePolicyVersion: '',
      agreedAt: new Date()
    }
  });

  assert.equal(records.length, 1);
  assert.equal(records[0].policyType, 'privacy_policy');
});
