'use strict';

require('dotenv').config();
const mongoose = require('mongoose');
const { prepareAcceptableUseDraft } = require('../services/acceptable-use-draft.service');

(async () => {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not set.');
  await mongoose.connect(process.env.MONGODB_URI);
  const result = await prepareAcceptableUseDraft();
  console.log(result.baselineCreated
    ? 'Recorded the existing Acceptable Use Policy as published v1.0 without an update notice.'
    : `Existing published Acceptable Use baseline v${result.baseline.versionNumber} retained.`);
  console.log(result.draftCreated
    ? `Created Acceptable Use draft v${result.policy.versionNumber}.`
    : `Matching Acceptable Use draft v${result.policy.versionNumber} already exists.`);
  await mongoose.disconnect();
})().catch(async (error) => {
  console.error('Acceptable Use draft preparation failed:', error);
  try { await mongoose.disconnect(); } catch (_error) {}
  process.exit(1);
});
