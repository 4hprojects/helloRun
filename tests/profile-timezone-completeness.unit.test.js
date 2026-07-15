'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { getRunnerProfileCompleteness } = require('../src/services/profile-completion.service');

const completeRunner = {
  role: 'runner',
  firstName: 'Test',
  lastName: 'Runner',
  mobile: '+639171234567',
  country: 'PH',
  timezone: 'Asia/Manila',
  dateOfBirth: new Date('1990-01-01T00:00:00Z'),
  gender: 'prefer_not_to_say',
  emergencyContactName: 'Contact',
  emergencyContactNumber: '+639181234567'
};

test('timezone contributes to runner profile completeness', () => {
  const result = getRunnerProfileCompleteness({ ...completeRunner, timezone: '' });
  assert.ok(result.missingFields.includes('Timezone'));
  assert.equal(result.requiredCount, 9);
});

test('confirmed profile data is complete when timezone is present', () => {
  const result = getRunnerProfileCompleteness(completeRunner);
  assert.equal(result.percent, 100);
  assert.deepEqual(result.missingFields, []);
});
