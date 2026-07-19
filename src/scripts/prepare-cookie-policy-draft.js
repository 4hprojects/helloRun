'use strict';

require('dotenv').config();
const mongoose = require('mongoose');
const { prepareCookiePolicyDraft } = require('../services/cookie-policy-draft.service');

(async () => {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not set.');
  await mongoose.connect(process.env.MONGODB_URI);
  const result = await prepareCookiePolicyDraft();
  console.log(result.baselineCreated
    ? 'Recorded the existing Cookie Policy as published v1.0 without an update notice.'
    : `Existing published Cookie Policy baseline v${result.baseline.versionNumber} retained.`);
  console.log(result.draftCreated
    ? `Created Cookie Policy draft v${result.policy.versionNumber}.`
    : `Matching Cookie Policy draft v${result.policy.versionNumber} already exists.`);
  await mongoose.disconnect();
})().catch(async (error) => {
  console.error('Cookie Policy draft preparation failed:', error);
  try { await mongoose.disconnect(); } catch (_error) {}
  process.exit(1);
});
