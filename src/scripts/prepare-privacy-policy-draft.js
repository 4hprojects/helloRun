'use strict';

require('dotenv').config();
const mongoose = require('mongoose');
const { preparePrivacyPolicyDraft } = require('../services/privacy-policy-draft.service');

(async () => {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not set.');
  await mongoose.connect(process.env.MONGODB_URI);
  const result = await preparePrivacyPolicyDraft();
  console.log(result.baselineCreated
    ? 'Recorded the existing Privacy Policy fallback as published v1.0 without an update notice.'
    : `Existing published Privacy Policy baseline v${result.baseline.versionNumber} retained.`);
  console.log(result.draftCreated
    ? `Created Privacy Policy draft v${result.policy.versionNumber}.`
    : `Matching Privacy Policy draft v${result.policy.versionNumber} already exists.`);
  await mongoose.disconnect();
})().catch(async (error) => {
  console.error('Privacy Policy draft preparation failed:', error);
  try { await mongoose.disconnect(); } catch (_error) {}
  process.exit(1);
});
