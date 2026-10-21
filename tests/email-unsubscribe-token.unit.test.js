const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createEmailUnsubscribeToken,
  verifyEmailUnsubscribeToken
} = require('../src/utils/email-unsubscribe-token');

const secret = 'unit-test-secret-with-enough-entropy';

test('signed unsubscribe tokens round-trip without a login session', () => {
  const expiresAt = Date.now() + 60_000;
  const token = createEmailUnsubscribeToken({
    userId: '507f1f77bcf86cd799439011',
    key: 'event.promotion',
    expiresAt
  }, secret);
  assert.deepEqual(verifyEmailUnsubscribeToken(token, secret, Date.now()), {
    userId: '507f1f77bcf86cd799439011',
    key: 'event.promotion',
    expiresAt
  });
});

test('unsubscribe tokens reject tampering, expiry, and unknown preference keys', () => {
  const expiresAt = Date.now() + 60_000;
  const token = createEmailUnsubscribeToken({ userId: 'user-1', key: 'event.promotion', expiresAt }, secret);
  assert.equal(verifyEmailUnsubscribeToken(`${token}x`, secret), null);
  assert.equal(verifyEmailUnsubscribeToken(token, secret, expiresAt), null);
  assert.equal(createEmailUnsubscribeToken({ userId: 'user-1', key: 'unknown.preference' }, secret), '');
});
