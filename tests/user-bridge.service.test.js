const test = require('node:test');
const assert = require('node:assert/strict');

const {
  normalizeMongoUser,
  buildChecksum
} = require('../src/services/user-bridge.service');

test('normalizeMongoUser maps MongoDB user fields to app_users payload', () => {
  const normalized = normalizeMongoUser({
    _id: '507f1f77bcf86cd799439011',
    email: ' Runner@Example.COM ',
    role: 'organiser',
    firstName: 'Kayla',
    lastName: 'Ryhs'
  });

  assert.deepEqual(normalized, {
    mongoUserId: '507f1f77bcf86cd799439011',
    email: 'runner@example.com',
    roleSnapshot: 'organiser',
    displayName: 'Kayla Ryhs'
  });
});

test('normalizeMongoUser defaults unsupported roles to runner', () => {
  const normalized = normalizeMongoUser({
    _id: '507f1f77bcf86cd799439011',
    email: 'runner@example.com',
    role: 'owner'
  });

  assert.equal(normalized.roleSnapshot, 'runner');
});

test('buildChecksum is stable for unchanged bridge payloads', () => {
  const payload = {
    mongoUserId: '507f1f77bcf86cd799439011',
    email: 'runner@example.com',
    roleSnapshot: 'runner',
    displayName: 'Runner'
  };

  assert.equal(buildChecksum(payload), buildChecksum({ ...payload }));
});
