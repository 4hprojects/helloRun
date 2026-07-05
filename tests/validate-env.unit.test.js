const test = require('node:test');
const assert = require('node:assert/strict');

const { validateEnv } = require('../src/config/validate-env');

function fullEnv(overrides = {}) {
  return {
    SESSION_SECRET: 'secret',
    MONGODB_URI: 'mongodb://localhost/db',
    DATABASE_URL: 'postgres://localhost/db',
    APP_URL: 'https://example.test',
    RESEND_API_KEY: 'key',
    EMAIL_FROM: 'noreply@example.test',
    TURNSTILE_SITE_KEY: 'site',
    TURNSTILE_SECRET_KEY: 'secret',
    R2_BUCKET: 'bucket',
    R2_ACCESS_KEY_ID: 'id',
    R2_SECRET_ACCESS_KEY: 'key',
    R2_ENDPOINT: 'https://r2.example.test',
    R2_PUBLIC_BASE_URL: 'https://cdn.example.test',
    REDIS_URL: 'redis://localhost:6379',
    ...overrides
  };
}

test('a fully configured env produces no findings', () => {
  const { missingRequired, warnings } = validateEnv(fullEnv());
  assert.deepEqual(missingRequired, []);
  assert.deepEqual(warnings, []);
});

test('missing SESSION_SECRET or MONGODB_URI is fatal', () => {
  const { missingRequired } = validateEnv(fullEnv({ SESSION_SECRET: '', MONGODB_URI: '  ' }));
  assert.deepEqual(missingRequired, ['SESSION_SECRET', 'MONGODB_URI']);
});

test('missing recommended vars and Redis warn but are not fatal', () => {
  const { missingRequired, warnings } = validateEnv(fullEnv({ RESEND_API_KEY: '', REDIS_URL: '' }));
  assert.deepEqual(missingRequired, []);
  assert.ok(warnings.some((w) => w.startsWith('RESEND_API_KEY')));
  assert.ok(warnings.some((w) => w.startsWith('REDIS_URL')));
});

test('non-numeric duration vars warn about falling back to defaults', () => {
  const { warnings } = validateEnv(fullEnv({ PASSWORD_RESET_EXPIRY: 'one-hour', UPLOAD_MAX_SIZE: '-5' }));
  assert.ok(warnings.some((w) => w.includes('PASSWORD_RESET_EXPIRY="one-hour"')));
  assert.ok(warnings.some((w) => w.includes('UPLOAD_MAX_SIZE="-5"')));
});

test('valid numeric duration vars do not warn', () => {
  const { warnings } = validateEnv(fullEnv({ PASSWORD_RESET_EXPIRY: '3600000' }));
  assert.deepEqual(warnings, []);
});
