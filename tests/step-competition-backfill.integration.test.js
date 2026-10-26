'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
require('dotenv').config({ path: process.env.DOTENV_CONFIG_PATH || '.env' });

const Event = require('../src/models/Event');
const { backfillStepCompetitionDefaults } = require('../src/scripts/backfill-step-competition-defaults');

const eventIds = [];

test.before(async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is required for step-competition backfill integration tests.');
  }
  await mongoose.connect(process.env.MONGODB_URI);
});

test.after(async () => {
  await Event.deleteMany({ _id: { $in: eventIds } });
  await mongoose.disconnect();
});

test('legacy step-competition defaults are dry-run safe and idempotent', async () => {
  const legacyId = new mongoose.Types.ObjectId();
  const modernId = new mongoose.Types.ObjectId();
  const deletedLegacyId = new mongoose.Types.ObjectId();
  eventIds.push(legacyId, modernId, deletedLegacyId);

  // Raw inserts preserve the exact pre-migration shape; schema defaults would hide the
  // missing fields this backfill is responsible for repairing.
  await Event.collection.insertMany([
    {
      _id: legacyId,
      title: 'REL-06 legacy accumulated event',
      slug: `rel-06-legacy-${legacyId}`,
      virtualCompletionMode: 'accumulated_distance'
    },
    {
      _id: modernId,
      title: 'REL-06 modern accumulated event',
      slug: `rel-06-modern-${modernId}`,
      virtualCompletionMode: 'accumulated_activity',
      challengeMetrics: ['steps'],
      primaryChallengeMetric: 'steps',
      targetSteps: 100_000
    },
    {
      _id: deletedLegacyId,
      title: 'Deleted legacy accumulated event',
      slug: `rel-06-deleted-${deletedLegacyId}`,
      virtualCompletionMode: 'accumulated_distance',
      isDeleted: true
    }
  ]);

  const dryRun = await backfillStepCompetitionDefaults();
  assert.deepEqual(dryRun, { dryRun: true, matched: 1, modified: 0 });
  const afterDryRun = await Event.collection.findOne({ _id: legacyId });
  assert.equal(afterDryRun.challengeMetrics, undefined);

  const applied = await backfillStepCompetitionDefaults({ dryRun: false });
  assert.deepEqual(applied, { dryRun: false, matched: 1, modified: 1 });
  const repaired = await Event.collection.findOne({ _id: legacyId });
  assert.deepEqual(repaired.challengeMetrics, ['distance']);
  assert.equal(repaired.primaryChallengeMetric, 'distance');
  assert.equal(repaired.targetSteps, null);

  const deleted = await Event.collection.findOne({ _id: deletedLegacyId });
  assert.equal(deleted.challengeMetrics, undefined);

  const modern = await Event.collection.findOne({ _id: modernId });
  assert.deepEqual(modern.challengeMetrics, ['steps']);
  assert.equal(modern.primaryChallengeMetric, 'steps');
  assert.equal(modern.targetSteps, 100_000);

  const repeated = await backfillStepCompetitionDefaults({ dryRun: false });
  assert.deepEqual(repeated, { dryRun: false, matched: 0, modified: 0 });
});
