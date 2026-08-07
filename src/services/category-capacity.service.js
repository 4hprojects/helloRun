// src/services/category-capacity.service.js
// Atomic race-category capacity.
//
// The old check counted confirmed registrations and then inserted. Two people submitting
// for the last slot both read the same count and both got in. Counting is not a
// reservation, however close to the insert it happens.
//
// MongoDB guarantees atomicity for a single document update, so the counter lives on the
// event's own category subdocument and the bound is enforced inside the update filter.
// A slot is either taken by exactly one caller or the update matches nothing.

const mongoose = require('mongoose');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const logger = require('../utils/logger');

/**
 * Whether a category is capacity-limited at all. Most are not.
 */
function hasSlotLimit(category) {
  const slots = Number(category?.slots);
  return Number.isFinite(slots) && slots > 0;
}

function findCategory(event, categoryId) {
  return (event?.raceCategories || []).find(
    (category) => String(category.categoryId || '') === String(categoryId || '')
  ) || null;
}

/**
 * Take one slot, or report that the category is full.
 *
 * @returns {Promise<{reserved: boolean, limited: boolean, slots?: number, category?: Object}>}
 *   `limited: false` means the category has no cap and nothing was reserved.
 */
async function reserveCategorySlot(eventId, categoryId) {
  const event = await Event.findById(eventId).select('raceCategories').lean();
  const category = findCategory(event, categoryId);

  if (!category || !hasSlotLimit(category)) {
    return { reserved: false, limited: false, category };
  }

  const slots = Number(category.slots);

  // The bound is part of the filter, so the increment and the check are one operation.
  // `reserved` may be absent on categories created before this existed; treat that as
  // zero rather than failing to match, and let $inc create it.
  const updated = await Event.findOneAndUpdate(
    {
      _id: eventId,
      raceCategories: {
        $elemMatch: {
          categoryId: String(categoryId),
          $or: [{ reserved: { $exists: false } }, { reserved: { $lt: slots } }]
        }
      }
    },
    { $inc: { 'raceCategories.$.reserved': 1 } },
    { new: true, projection: { raceCategories: 1 } }
  ).lean();

  if (!updated) {
    return { reserved: false, limited: true, slots, category };
  }

  return { reserved: true, limited: true, slots, category };
}

/**
 * Hand a slot back.
 *
 * Called when a reservation was taken but the registration did not complete, and when a
 * registration is cancelled. Guarded at zero so a double release cannot drive the counter
 * negative and silently create extra capacity.
 */
async function releaseCategorySlot(eventId, categoryId) {
  if (!categoryId) return false;

  try {
    const updated = await Event.findOneAndUpdate(
      {
        _id: eventId,
        raceCategories: {
          $elemMatch: {
            categoryId: String(categoryId),
            reserved: { $gt: 0 }
          }
        }
      },
      { $inc: { 'raceCategories.$.reserved': -1 } },
      { new: true, projection: { _id: 1 } }
    ).lean();

    return Boolean(updated);
  } catch (error) {
    // Releasing is a correction, never the caller's main job; losing one leaves a slot
    // unavailable, which is far better than failing the operation that triggered it.
    logger.error(`[Capacity] Could not release slot for event ${eventId}: ${error.message}`);
    return false;
  }
}

/**
 * Recompute `reserved` from the registrations that actually exist.
 *
 * Used by the backfill and available for repair. Counts the same set the old check did,
 * so behaviour is preserved exactly: every live registration holds its slot from the
 * moment it is created.
 */
async function recountCategoryReservations(eventId) {
  const event = await Event.findById(eventId).select('raceCategories').lean();
  if (!event) return { updated: 0, categories: 0 };

  const limited = (event.raceCategories || []).filter(hasSlotLimit);
  if (limited.length === 0) return { updated: 0, categories: 0 };

  let updated = 0;
  for (const category of limited) {
    const categoryId = String(category.categoryId || '');
    if (!categoryId) continue;

    const filled = await Registration.countDocuments({
      eventId: new mongoose.Types.ObjectId(String(eventId)),
      'pricingSnapshot.raceCategoryId': categoryId,
      status: { $in: ['confirmed'] },
      paymentStatus: { $nin: ['refunded'] }
    });

    if (Number(category.reserved) === filled) continue;

    await Event.updateOne(
      { _id: eventId, 'raceCategories.categoryId': categoryId },
      { $set: { 'raceCategories.$.reserved': filled } }
    );
    updated += 1;
  }

  return { updated, categories: limited.length };
}

module.exports = {
  reserveCategorySlot,
  releaseCategorySlot,
  recountCategoryReservations,
  hasSlotLimit,
  findCategory
};
