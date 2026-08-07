#!/usr/bin/env node
/**
 * Recompute `reserved` on every capacity-limited race category from the registrations
 * that actually exist.
 *
 * Registration now takes a slot atomically via a counter on the category. Existing
 * categories predate that counter, so it has to be seeded from reality once. Safe to run
 * repeatedly: it recounts rather than adjusting, so a second run is a no-op, and it can
 * be used later to repair drift.
 *
 *   node src/scripts/backfill-category-reservations.js --dry-run
 *   node src/scripts/backfill-category-reservations.js
 */

require('dotenv').config();

const mongoose = require('mongoose');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const { hasSlotLimit } = require('../services/category-capacity.service');

const dryRun = process.argv.includes('--dry-run');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);

  const host = new URL(process.env.MONGODB_URI).hostname;
  console.log(`${dryRun ? 'DRY RUN — nothing will be written' : 'APPLYING'} against ${host}`);

  const events = await Event.find({ 'raceCategories.slots': { $gt: 0 } })
    .select('title raceCategories')
    .lean();

  console.log(`Events with a capacity-limited category: ${events.length}`);

  let changed = 0;
  let examined = 0;

  for (const event of events) {
    for (const category of (event.raceCategories || []).filter(hasSlotLimit)) {
      const categoryId = String(category.categoryId || '');
      if (!categoryId) continue;
      examined += 1;

      const filled = await Registration.countDocuments({
        eventId: event._id,
        'pricingSnapshot.raceCategoryId': categoryId,
        status: { $in: ['confirmed'] },
        paymentStatus: { $nin: ['refunded'] }
      });

      const current = Number(category.reserved);
      if (current === filled) continue;

      console.log(
        `  ${event.title.slice(0, 40)} | ${category.distanceLabel || category.name || categoryId}` +
        ` | reserved ${Number.isFinite(current) ? current : '(unset)'} -> ${filled} of ${category.slots}`
      );
      changed += 1;

      if (!dryRun) {
        await Event.updateOne(
          { _id: event._id, 'raceCategories.categoryId': categoryId },
          { $set: { 'raceCategories.$.reserved': filled } }
        );
      }
    }
  }

  console.log(`Categories examined: ${examined}; ${dryRun ? 'would change' : 'changed'}: ${changed}`);
}

main()
  .catch((error) => {
    console.error(`Backfill failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => {});
  });
