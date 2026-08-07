require('dotenv').config();

const mongoose = require('mongoose');
const Registration = require('../models/Registration');
const { getPostgresClient, closePostgresClient } = require('../db/postgres');
const { syncRegistrationPaymentShadow } = require('../services/registration-payment-shadow.service');

// Keyset pagination rather than one long-lived cursor.
//
// Each registration takes a round trip to Postgres, so a single `.cursor()` over the whole
// collection sits idle long enough for the server to reap it — on 3,070 records this died
// partway through with "cursor id not found", leaving the shadow half-populated. Reading a
// page at a time keeps every query short, and paging by `_id` means a rerun resumes rather
// than starting over.
const PAGE_SIZE = 200;

/**
 * Registrations already present in the shadow.
 *
 * The sync is idempotent, so a rerun is safe — but not free: every record costs a round
 * trip, and on this collection a full pass outlives most sensible time limits. Skipping
 * what is already there is what makes an interrupted backfill resumable instead of
 * endlessly restarting. Pass --force to re-sync everything anyway.
 */
async function loadAlreadySynced() {
  const sql = getPostgresClient();
  const rows = await sql`SELECT mongo_registration_id FROM registrations`;
  return new Set(rows.map((row) => row.mongo_registration_id));
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 120000
  });

  const dryRun = process.argv.includes('--dry-run');
  const quiet = process.argv.includes('--quiet');
  const force = process.argv.includes('--force');

  const alreadySynced = force ? new Set() : await loadAlreadySynced();
  if (!force) {
    console.log(`Already in shadow: ${alreadySynced.size}. Skipping those; pass --force to re-sync.`);
  }

  let total = 0;
  let synced = 0;
  let failed = 0;
  let skipped = 0;
  let lastId = null;

  for (;;) {
    const filter = lastId ? { _id: { $gt: lastId } } : {};
    const page = await Registration.find(filter).sort({ _id: 1 }).limit(PAGE_SIZE);
    if (page.length === 0) break;

    for (const registration of page) {
      total += 1;
      lastId = registration._id;

      if (alreadySynced.has(String(registration._id))) {
        skipped += 1;
        continue;
      }

      if (dryRun) {
        synced += 1;
        continue;
      }

      try {
        await syncRegistrationPaymentShadow(registration, { operation: 'backfill' });
        synced += 1;
      } catch (error) {
        failed += 1;
        console.error(
          `failed registration=${String(registration._id)} confirmation=${registration.confirmationCode}: ${error.message}`
        );
      }
    }

    if (!quiet) {
      console.log(`  processed ${total} (synced ${synced}, skipped ${skipped}, failed ${failed})`);
    }
  }

  console.log(JSON.stringify({ dryRun, total, synced, skipped, failed }, null, 2));
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
