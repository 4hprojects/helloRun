#!/usr/bin/env node
'use strict';

require('dotenv').config();
const mongoose = require('mongoose');
const {
  reconcilePrematureAccumulatedCertificates,
  finalizeDueAccumulatedCertificates
} = require('../services/accumulated-certificate-finalization.service');

async function main() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required.');
  await mongoose.connect(process.env.MONGODB_URI);
  try {
    const reconciliation = await reconcilePrematureAccumulatedCertificates();
    const finalization = await finalizeDueAccumulatedCertificates();
    process.stdout.write(`${JSON.stringify({ reconciliation, finalization }, null, 2)}\n`);
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  process.stderr.write(`[accumulated-certificate-reconcile] ${error.message}\n`);
  process.exitCode = 1;
});
