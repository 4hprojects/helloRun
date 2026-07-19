'use strict';

require('dotenv').config();
const mongoose = require('mongoose');
const { prepareDataUsageDraft } = require('../services/data-usage-draft.service');

(async () => {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not set.');
  await mongoose.connect(process.env.MONGODB_URI);
  const result = await prepareDataUsageDraft();
  console.log(result.created
    ? `Created Data Usage draft v${result.policy.versionNumber}.`
    : `Matching Data Usage draft v${result.policy.versionNumber} already exists.`);
  await mongoose.disconnect();
})().catch(async (error) => {
  console.error('Data Usage draft preparation failed:', error);
  try { await mongoose.disconnect(); } catch (_error) {}
  process.exit(1);
});
