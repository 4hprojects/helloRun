'use strict';

require('dotenv').config({ path: process.env.DOTENV_CONFIG_PATH || '.env' });

const mongoose = require('mongoose');
const Event = require('../models/Event');

const LEGACY_FILTER = {
  isDeleted: { $ne: true },
  virtualCompletionMode: 'accumulated_distance',
  $or: [
    { challengeMetrics: { $exists: false } },
    { challengeMetrics: { $size: 0 } },
    { primaryChallengeMetric: { $exists: false } },
    { primaryChallengeMetric: null }
  ]
};

async function backfillStepCompetitionDefaults({ dryRun = true, EventModel = Event } = {}) {
  const matched = await EventModel.countDocuments(LEGACY_FILTER);
  let modified = 0;

  if (!dryRun && matched) {
    const result = await EventModel.updateMany(LEGACY_FILTER, {
      $set: {
        challengeMetrics: ['distance'],
        primaryChallengeMetric: 'distance',
        targetSteps: null
      }
    });
    modified = result.modifiedCount;
  }

  return { dryRun, matched, modified };
}

async function main() {
  const apply = process.argv.includes('--apply');
  if (process.argv.includes('--dry-run') && apply) {
    throw new Error('Choose either --dry-run or --apply, not both.');
  }
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required.');
  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 120000
  });

  const result = await backfillStepCompetitionDefaults({ dryRun: !apply });
  console.log(JSON.stringify({
    mode: apply ? 'apply' : 'dry-run',
    mutation: apply,
    ...result
  }, null, 2));
}

if (require.main === module) {
  main()
    .catch((error) => {
      console.error(error?.stack || error);
      process.exitCode = 1;
    })
    .finally(() => mongoose.disconnect());
}

module.exports = { LEGACY_FILTER, backfillStepCompetitionDefaults };
