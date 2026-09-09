'use strict';

require('dotenv').config();

const mongoose = require('mongoose');
const Blog = require('../models/Blog');

async function migrateScheduledFor({ BlogModel = Blog, dryRun = true } = {}) {
  const query = {
    status: 'scheduled',
    scheduledFor: null,
    publishedAt: { $ne: null }
  };
  const records = await BlogModel.find(query).select('_id title publishedAt').lean();
  if (!dryRun && records.length) {
    await Promise.all(records.map((record) => BlogModel.updateOne(
      { _id: record._id, status: 'scheduled', scheduledFor: null },
      { $set: { scheduledFor: record.publishedAt, publishedAt: null } }
    )));
  }
  return { dryRun, matched: records.length, ids: records.map((record) => String(record._id)) };
}

async function main() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required.');
  const apply = process.argv.includes('--apply');
  await mongoose.connect(process.env.MONGODB_URI);
  try {
    console.log(JSON.stringify(await migrateScheduledFor({ dryRun: !apply }), null, 2));
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`${error.name}: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { migrateScheduledFor };
