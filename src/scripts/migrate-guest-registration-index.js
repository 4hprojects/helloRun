#!/usr/bin/env node
/**
 * Drop the pre-guest unique index on registrations.
 *
 * `eventId_1_userId_1` is unique and not partial, so a second guest registration — which
 * carries no user — would collide with the first on null. Its replacement,
 * `eventId_1_userId_1_account_unique`, is partial on `userId` being an ObjectId and is
 * created by the application from the schema.
 *
 * Run this AFTER the schema change has shipped, never before: until the replacement
 * exists, dropping this one leaves nothing enforcing one-registration-per-account. Both
 * enforce the same rule for account registrations, so the overlap is safe.
 *
 *   node src/scripts/migrate-guest-registration-index.js --dry-run
 *   node src/scripts/migrate-guest-registration-index.js
 */

require('dotenv').config();

const mongoose = require('mongoose');

const OLD_INDEX = 'eventId_1_userId_1';
const NEW_INDEX = 'eventId_1_userId_1_account_unique';

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  await mongoose.connect(process.env.MONGODB_URI);

  const collection = mongoose.connection.db.collection('registrations');
  const indexes = await collection.indexes();
  const names = indexes.map((index) => index.name);

  console.log(`${dryRun ? 'DRY RUN — nothing will change' : 'APPLYING'} on ${new URL(process.env.MONGODB_URI).hostname}`);
  console.log(`  ${OLD_INDEX}: ${names.includes(OLD_INDEX) ? 'present' : 'already gone'}`);
  console.log(`  ${NEW_INDEX}: ${names.includes(NEW_INDEX) ? 'present' : 'MISSING'}`);

  if (!names.includes(NEW_INDEX)) {
    throw new Error(
      `${NEW_INDEX} does not exist yet. Deploy the schema change first, or nothing would ` +
      'enforce one registration per account once the old index is dropped.'
    );
  }

  if (!names.includes(OLD_INDEX)) {
    console.log('Nothing to do.');
    return;
  }

  if (dryRun) {
    console.log(`Would drop ${OLD_INDEX}.`);
    return;
  }

  await collection.dropIndex(OLD_INDEX);
  console.log(`Dropped ${OLD_INDEX}.`);
}

main()
  .catch((error) => {
    console.error(`Index migration failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => {});
  });
