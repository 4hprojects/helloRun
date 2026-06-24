const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('runner screenshot submission path uses proof-hash idempotency lock', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../src/controllers/page.controller.js'), 'utf8');

  assert.match(source, /buildProofSubmissionIdempotencyKey/);
  assert.match(source, /acquireSubmissionIdempotencyLock/);
  assert.match(source, /This screenshot submission is already being processed/);
});

test('payment receipt submission path uses receipt idempotency lock', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../src/controllers/page.controller.js'), 'utf8');

  assert.match(source, /buildPaymentProofIdempotencyKey/);
  assert.match(source, /payment_proof_submission/);
  assert.match(source, /This payment receipt is already being processed/);
});

test('Strava submission path uses activity idempotency lock', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../src/services/strava-submission.service.js'), 'utf8');

  assert.match(source, /buildStravaSubmissionIdempotencyKey/);
  assert.match(source, /acquireSubmissionIdempotencyLock/);
  assert.match(source, /This Strava activity submission is already being processed/);
});
