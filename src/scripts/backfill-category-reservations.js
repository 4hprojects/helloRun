#!/usr/bin/env node
/**
 * Recompute `reserved` on every capacity-limited race category from the registrations
 * that actually exist.
 *
 * Registration takes a slot atomically via a counter on the category. Existing categories
 * predate that counter, so it has to be seeded from reality once. Safe to run repeatedly:
 * it recounts rather than adjusting, so a second run is a no-op, and it is the repair for
 * drift later.
 *
 * The counting itself lives in category-capacity.service.js and is shared with the repair
 * path — this script used to carry its own copy of the query, which is how the service
 * function ended up dead code and how the two could have drifted apart.
 *
 *   node src/scripts/backfill-category-reservations.js --dry-run
 *   node src/scripts/backfill-category-reservations.js
 */

require('dotenv').config();

const mongoose = require('mongoose');
const Event = require('../models/Event');
const { recountCategoryReservations } = require('../services/category-capacity.service');

const dryRun = process.argv.includes('--dry-run');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);

  const host = new URL(process.env.MONGODB_URI).hostname;
  console.log(`${dryRun ? 'DRY RUN — nothing will be written' : 'APPLYING'} against ${host}`);

  const events = await Event.find({ 'raceCategories.slots': { $gt: 0 } })
    .select('title')
    .lean();

  console.log(`Events with a capacity-limited category: ${events.length}`);

  let examined = 0;
  let changed = 0;
  // Kept apart from the running log: a category that flips to full stops taking
  // registrations the moment this is applied, and that is the one thing worth a decision
  // before it happens.
  const becomingFull = [];
  const unidentifiable = [];

  for (const event of events) {
    const { categories, changes } = await recountCategoryReservations(event._id, { dryRun });
    examined += categories;

    for (const change of changes) {
      if (change.unidentifiable) {
        unidentifiable.push(`${event.title.slice(0, 40)} | ${change.label}`);
        continue;
      }

      changed += 1;
      console.log(
        `  ${event.title.slice(0, 40)} | ${change.label}` +
        ` | reserved ${change.from === null ? '(unset)' : change.from} -> ${change.to} of ${change.slots}`
      );
      if (change.willBeFull) {
        becomingFull.push(`${event.title.slice(0, 40)} | ${change.label} | ${change.to} of ${change.slots}`);
      }
    }
  }

  console.log(`\nCategories examined: ${examined}; ${dryRun ? 'would change' : 'changed'}: ${changed}`);

  if (becomingFull.length > 0) {
    console.log(`\n*** ${becomingFull.length} categor${becomingFull.length === 1 ? 'y' : 'ies'} will be FULL and stop accepting registrations:`);
    becomingFull.forEach((line) => console.log(`      ${line}`));
    console.log('    Tell those organisers, or have them raise the slot count, before applying.');
  }

  if (unidentifiable.length > 0) {
    console.log(`\n${unidentifiable.length} capped categor${unidentifiable.length === 1 ? 'y has' : 'ies have'} no categoryId and cannot be counted or claimed against.`);
    unidentifiable.forEach((line) => console.log(`      ${line}`));
    console.log('    Re-saving the event in the organiser form mints one.');
  }
}

main()
  .catch((error) => {
    console.error(`Backfill failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => {});
  });
