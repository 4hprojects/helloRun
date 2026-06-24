const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
require('dotenv').config();

const SubmissionIdempotencyKey = require('../src/models/SubmissionIdempotencyKey');
const {
  acquireSubmissionIdempotencyLock,
  buildProofSubmissionIdempotencyKey,
  buildStravaSubmissionIdempotencyKey
} = require('../src/services/submission-idempotency.service');

test.before(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
});

test.afterEach(async () => {
  await SubmissionIdempotencyKey.deleteMany({ scope: /^test_/ });
});

test.after(async () => {
  await mongoose.disconnect();
});

test('submission idempotency lock rejects concurrent duplicate keys and releases on failure', async () => {
  const key = buildProofSubmissionIdempotencyKey({
    runnerId: new mongoose.Types.ObjectId(),
    proofHash: 'abc123'
  });

  const first = await acquireSubmissionIdempotencyLock(key, {
    scope: 'test_proof_submission',
    message: 'Already running.'
  });

  await assert.rejects(
    () => acquireSubmissionIdempotencyLock(key, {
      scope: 'test_proof_submission',
      message: 'Already running.'
    }),
    /Already running\./
  );

  await first.release();
  const second = await acquireSubmissionIdempotencyLock(key, {
    scope: 'test_proof_submission'
  });
  await second.release();
});

test('submission idempotency keys include Strava event scope', () => {
  const runnerId = new mongoose.Types.ObjectId();
  const firstEvent = new mongoose.Types.ObjectId();
  const secondEvent = new mongoose.Types.ObjectId();

  const first = buildStravaSubmissionIdempotencyKey({
    runnerId,
    eventId: firstEvent,
    stravaActivityId: 123
  });
  const second = buildStravaSubmissionIdempotencyKey({
    runnerId,
    eventId: secondEvent,
    stravaActivityId: 123
  });

  assert.notEqual(first, second);
});
