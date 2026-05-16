require('dotenv').config();

const mongoose = require('mongoose');
const Registration = require('../models/Registration');
const { closePostgresClient } = require('../db/postgres');
const { syncRegistrationPaymentShadow } = require('../services/registration-payment-shadow.service');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 120000
  });

  const dryRun = process.argv.includes('--dry-run');
  const registrations = Registration.find({}).sort({ registeredAt: 1, createdAt: 1 }).cursor();
  let total = 0;
  let synced = 0;
  let failed = 0;

  for await (const registration of registrations) {
    total += 1;
    if (dryRun) {
      synced += 1;
      continue;
    }

    try {
      await syncRegistrationPaymentShadow(registration, { operation: 'backfill' });
      synced += 1;
    } catch (error) {
      failed += 1;
      console.error(`failed registration=${String(registration._id)} confirmation=${registration.confirmationCode}: ${error.message}`);
    }
  }

  console.log(JSON.stringify({ dryRun, total, synced, failed }, null, 2));
  if (failed > 0) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
    await closePostgresClient();
  });
