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
 * The query that decides whether a registration occupies a slot in a category.
 *
 * Three ways to match, because the identifier has changed shape over time and the label is
 * all some rows ever had:
 *   - the slug, which is what a registration written today stores;
 *   - the subdocument `_id`, which is what rows written while `getRaceCategoryOptions`
 *     preferred `_id` stored — those never matched anything, which is why capacity was a
 *     no-op and why a recount would have scored every category zero;
 *   - no id at all plus a matching distance label, which is every row written on a free or
 *     option-priced event, where the category was never resolved in the first place.
 *
 * The status filter is deliberately unchanged: `confirmed` and not refunded, so the number
 * keeps meaning exactly what it meant before.
 */
function buildCategoryOccupancyQuery(eventId, category) {
  const categoryId = String(category.categoryId || '');
  const labels = [category.distanceLabel, category.name]
    .map((value) => String(value || '').trim())
    .filter(Boolean);

  const byId = [{ 'pricingSnapshot.raceCategoryId': categoryId }];
  if (category._id) byId.push({ 'pricingSnapshot.raceCategoryId': String(category._id) });

  const byLabel = labels.length
    ? [
        {
          $and: [
            { $or: [{ 'pricingSnapshot.raceCategoryId': '' }, { 'pricingSnapshot.raceCategoryId': { $exists: false } }] },
            {
              $or: labels.flatMap((label) => {
                // Anchored and case-insensitive: a label is free text, so it must not be
                // read as a regular expression.
                const exact = new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
                return [{ 'pricingSnapshot.raceDistance': exact }, { raceDistance: exact }];
              })
            }
          ]
        }
      ]
    : [];

  return {
    eventId: new mongoose.Types.ObjectId(String(eventId)),
    status: { $in: ['confirmed'] },
    paymentStatus: { $nin: ['refunded'] },
    $or: [...byId, ...byLabel]
  };
}

/**
 * Recompute `reserved` from the registrations that actually exist.
 *
 * The only honest way to correct a counter that has drifted — editing `reserved` by hand
 * just moves the drift somewhere else. Idempotent by construction.
 *
 * @param {string} eventId
 * @param {Object} [options]
 * @param {boolean} [options.dryRun] - compute and report without writing
 * @returns {Promise<{updated: number, categories: number, changes: Array}>}
 */
async function recountCategoryReservations(eventId, { dryRun = false } = {}) {
  const event = await Event.findById(eventId).select('title raceCategories').lean();
  if (!event) return { updated: 0, categories: 0, changes: [] };

  const limited = (event.raceCategories || []).filter(hasSlotLimit);
  if (limited.length === 0) return { updated: 0, categories: 0, changes: [] };

  let updated = 0;
  const changes = [];

  for (const category of limited) {
    const categoryId = String(category.categoryId || '');
    // A category with no slug cannot be claimed against, so it cannot be recounted either.
    // Reported rather than skipped silently: the organiser needs to re-save the event.
    if (!categoryId) {
      changes.push({
        categoryId: '',
        label: category.distanceLabel || category.name || '(unnamed)',
        unidentifiable: true,
        slots: Number(category.slots) || 0
      });
      continue;
    }

    const filled = await Registration.countDocuments(buildCategoryOccupancyQuery(event._id, category));
    const current = Number(category.reserved);
    if (current === filled) continue;

    changes.push({
      categoryId,
      label: category.distanceLabel || category.name || categoryId,
      from: Number.isFinite(current) ? current : null,
      to: filled,
      slots: Number(category.slots) || 0,
      willBeFull: filled >= (Number(category.slots) || 0)
    });

    if (!dryRun) {
      await Event.updateOne(
        { _id: event._id, 'raceCategories.categoryId': categoryId },
        { $set: { 'raceCategories.$.reserved': filled } }
      );
    }
    updated += 1;
  }

  return { updated, categories: limited.length, changes };
}

module.exports = {
  buildCategoryOccupancyQuery,
  reserveCategorySlot,
  releaseCategorySlot,
  recountCategoryReservations,
  hasSlotLimit,
  findCategory
};
