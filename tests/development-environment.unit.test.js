'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { assertSafeSeedTarget } = require('../src/scripts/seed-development');

const ROOT = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');

test('development compose services bind databases only to loopback', () => {
  const compose = read('compose.dev.yml');
  assert.match(compose, /127\.0\.0\.1:27018:27017/);
  assert.match(compose, /127\.0\.0\.1:5433:5432/);
  assert.match(compose, /POSTGRES_DB: hellorun_dev/);
  assert.match(compose, /db\.hello\(\)\.isWritablePrimary/);
  assert.match(compose, /quit\(1\)/);
});

test('development environment defaults every unfinished feature off', () => {
  const env = read('.env.development.example');
  for (const flag of [
    'FEATURE_STEP_COMPETITIONS_ENABLED',
    'STRAVA_PRIVATE_VIEWER_ENABLED',
    'COROS_DIRECT_INTEGRATION_ENABLED',
    'OCR_SERVER_PIPELINE_ENABLED',
    'OCR_SERVER_AUTO_APPROVAL_ENABLED',
    'OCR_TRAINING_CONSENT_PROMPT_ENABLED',
    'OCR_TRAINING_ENABLED',
    'OCR_REMINDERS_ENABLED'
  ]) assert.match(env, new RegExp(`^${flag}=false$`, 'm'));
});

test('development seed refuses remote or production-looking targets', () => {
  assert.doesNotThrow(() => assertSafeSeedTarget({
    MONGODB_URI: 'mongodb://127.0.0.1:27018/hellorun_dev',
    DATABASE_URL: 'postgres://user:pass@127.0.0.1:5433/hellorun_dev'
  }));
  assert.throws(() => assertSafeSeedTarget({
    MONGODB_URI: 'mongodb://127.0.0.1:27018/hellorun',
    DATABASE_URL: 'postgres://user:pass@127.0.0.1:5433/hellorun_dev'
  }), /MONGODB_URI must use a loopback host/);
  assert.throws(() => assertSafeSeedTarget({
    MONGODB_URI: 'mongodb+srv://user:pass@example.test/hellorun_dev',
    DATABASE_URL: 'postgres://user:pass@127.0.0.1:5433/hellorun_dev'
  }), /MONGODB_URI must use a loopback host/);
});

test('guarded database test runs enable test fixtures only in test mode', () => {
  const runner = read('src/scripts/run-test-group.js');
  assert.match(runner, /NODE_ENV: 'test'/);
  assert.match(runner, /ALLOW_TEST_EVENT_VISIBILITY: '1'/);
  assert.match(runner, /TEST_UPLOAD_STORAGE: 'memory'/);
  assert.match(runner, /databaseTouchingRun/);
});
