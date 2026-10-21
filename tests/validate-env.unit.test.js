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
  const { missingRequired, warnings, errors } = validateEnv(fullEnv());
  assert.deepEqual(missingRequired, []);
  assert.deepEqual(warnings, []);
  assert.deepEqual(errors, []);
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

test('development refuses production-looking remote databases', () => {
  const { errors } = validateEnv(fullEnv({
    NODE_ENV: 'development',
    MONGODB_URI: 'mongodb+srv://user:secret@cluster.example.test/hellorun',
    DATABASE_URL: 'postgres://user:secret@db.example.test/postgres',
    REDIS_URL: ''
  }));
  assert.equal(errors.length, 1);
  assert.match(errors[0], /Non-production boot refused remote data services/);
  assert.doesNotMatch(errors[0], /secret/);
});

test('explicit remote development access still requires non-production database names', () => {
  const safe = validateEnv(fullEnv({
    NODE_ENV: 'development',
    MONGODB_URI: 'mongodb+srv://user:secret@cluster.example.test/hellorun_dev',
    DATABASE_URL: 'postgres://user:secret@db.example.test/hellorun_staging',
    REDIS_URL: '',
    ALLOW_REMOTE_DEVELOPMENT_DB: '1'
  }));
  assert.deepEqual(safe.errors, []);

  const unsafe = validateEnv(fullEnv({
    NODE_ENV: 'development',
    MONGODB_URI: 'mongodb+srv://user:secret@cluster.example.test/hellorun',
    REDIS_URL: '',
    ALLOW_REMOTE_DEVELOPMENT_DB: '1'
  }));
  assert.equal(unsafe.errors.length, 1);
});

test('production boot is not subject to the development guard', () => {
  const { errors } = validateEnv(fullEnv({
    NODE_ENV: 'production',
    MONGODB_URI: 'mongodb+srv://user:secret@cluster.example.test/hellorun',
    DATABASE_URL: 'postgres://user:secret@db.example.test/postgres',
    REDIS_URL: 'redis://cache.example.test:6379/0'
  }));
  assert.deepEqual(errors, []);
});

test('the in-memory upload backend is accepted only in the test environment', () => {
  assert.deepEqual(validateEnv(fullEnv({
    NODE_ENV: 'test',
    TEST_UPLOAD_STORAGE: 'memory'
  })).errors, []);

  const { errors } = validateEnv(fullEnv({
    NODE_ENV: 'production',
    TEST_UPLOAD_STORAGE: 'memory'
  }));
  assert.deepEqual(errors, ['TEST_UPLOAD_STORAGE is test-only and must not be set outside NODE_ENV=test.']);
});
