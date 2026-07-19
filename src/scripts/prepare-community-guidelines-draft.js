'use strict';

require('dotenv').config();
const mongoose = require('mongoose');
const { prepareCommunityGuidelinesDraft } = require('../services/community-guidelines-draft.service');

(async () => {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not set.');
  await mongoose.connect(process.env.MONGODB_URI);
  const result = await prepareCommunityGuidelinesDraft();
  console.log(result.baselineCreated
    ? 'Recorded the existing Community Guidelines as published v1.0 without an update notice.'
    : `Existing published Community Guidelines baseline v${result.baseline.versionNumber} retained.`);
  console.log(result.draftCreated
    ? `Created Community Guidelines draft v${result.policy.versionNumber}.`
    : `Matching Community Guidelines draft v${result.policy.versionNumber} already exists.`);
  await mongoose.disconnect();
})().catch(async (error) => {
  console.error('Community Guidelines draft preparation failed:', error);
  try { await mongoose.disconnect(); } catch (_error) {}
  process.exit(1);
});
