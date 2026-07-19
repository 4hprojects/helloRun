'use strict';

require('dotenv').config();
const mongoose = require('mongoose');
const { prepareOrganiserTermsDraft } = require('../services/organiser-terms-draft.service');

(async () => {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not set.');
  await mongoose.connect(process.env.MONGODB_URI);
  const result = await prepareOrganiserTermsDraft();
  console.log(result.baselineCreated
    ? 'Recorded the existing Organiser Terms as published v1.0 without an update notice.'
    : `Existing published Organiser Terms baseline v${result.baseline.versionNumber} retained.`);
  console.log(result.draftCreated
    ? `Created Organiser Terms draft v${result.policy.versionNumber}.`
    : `Matching Organiser Terms draft v${result.policy.versionNumber} already exists.`);
  await mongoose.disconnect();
})().catch(async (error) => {
  console.error('Organiser Terms draft preparation failed:', error);
  try { await mongoose.disconnect(); } catch (_error) {}
  process.exit(1);
});
