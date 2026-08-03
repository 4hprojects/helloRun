require('dotenv').config();

const mongoose = require('mongoose');
const Event = require('../models/Event');

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 120000
  });

  const filter = {
    virtualCompletionMode: 'accumulated_distance',
    $or: [
      { challengeMetrics: { $exists: false } },
      { challengeMetrics: { $size: 0 } },
      { primaryChallengeMetric: { $exists: false } },
      { primaryChallengeMetric: null }
    ]
  };
  const matched = await Event.countDocuments(filter);
  let modified = 0;

  if (!dryRun && matched) {
    const result = await Event.updateMany(filter, {
      $set: {
        challengeMetrics: ['distance'],
        primaryChallengeMetric: 'distance',
        targetSteps: null
      }
    });
    modified = result.modifiedCount;
  }

  console.log(JSON.stringify({ dryRun, matched, modified }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
