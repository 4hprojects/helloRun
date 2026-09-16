'use strict';

require('dotenv').config();

const mongoose = require('mongoose');
const Blog = require('../models/Blog');

async function migrateScheduledFor({ BlogModel = Blog, dryRun = true } = {}) {
  const query = {
    status: 'scheduled',
    $or: [
      { scheduledFor: null, publishedAt: { $ne: null } },
      { approvedAt: null, 'publicationReview.reviewedAt': { $ne: null } }
    ]
  };
  const records = await BlogModel.find(query)
    .select('_id title scheduledFor publishedAt approvedAt publicationReview.reviewedAt')
    .lean();
  if (!dryRun && records.length) {
    await Promise.all(records.map((record) => {
      const set = {};
      if (!record.scheduledFor && record.publishedAt) {
        set.scheduledFor = record.publishedAt;
        set.publishedAt = null;
      }
      if (!record.approvedAt && record.publicationReview?.reviewedAt) {
        set.approvedAt = record.publicationReview.reviewedAt;
      }
      if (!Object.keys(set).length) return null;
      return BlogModel.updateOne(
        { _id: record._id, status: 'scheduled' },
        { $set: set }
      );
    }));
  }
  return {
    dryRun,
    matched: records.length,
    records: records.map((record) => ({
      id: String(record._id),
      scheduledFor: record.scheduledFor || record.publishedAt || null,
      backfillApprovedAt: !record.approvedAt && Boolean(record.publicationReview?.reviewedAt)
    }))
  };
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
