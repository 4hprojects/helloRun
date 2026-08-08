// src/services/kit-inventory.service.js
// Per-size race-kit stock.
//
// The same shape as category-capacity.service.js, and for the same reason: two staff at a
// kit table can scan the last medium at the same moment, so the check and the claim have to
// be one operation. Counting rows and then writing would let both through.
//
// The unit here is deliberately "handed over", not "reserved". A slot is claimed when
// somebody registers, months ahead; a shirt is claimed when it physically leaves the table.
// Reserving at registration would be the wrong model — an event routinely registers more
// people than it has shirts and tops up later, and a no-show should not hold a shirt.

const Event = require('../models/Event');
const logger = require('../utils/logger');

/**
 * Normalise a size the way the schema does, so a comparison cannot fail on case or spacing.
 */
function normaliseSize(value) {
  return String(value || '').trim().toUpperCase().slice(0, 12);
}

function isTrackingSizes(event) {
  return Array.isArray(event?.kitInventory) && event.kitInventory.length > 0;
}

function findSize(event, size) {
  const wanted = normaliseSize(size);
  return (event?.kitInventory || []).find((entry) => normaliseSize(entry.size) === wanted);
}

/**
 * The sizes an event offers, for a form to render.
 */
function getOfferedSizes(event) {
  return (event?.kitInventory || [])
    .map((entry) => normaliseSize(entry.size))
    .filter(Boolean);
}

/**
 * What is left of each size.
 *
 * `released` may be absent on rows written before it existed; that reads as zero rather
 * than as a reason to skip the row.
 */
function getInventorySummary(event) {
  return (event?.kitInventory || []).map((entry) => {
    const stock = Number(entry.stock) || 0;
    const released = Number(entry.released) || 0;
    return {
      size: normaliseSize(entry.size),
      stock,
      released,
      // Clamped at zero: an organiser who lowers stock below what has already gone out
      // should see "none left", not a negative number that reads like a bug.
      remaining: Math.max(0, stock - released)
    };
  });
}

/**
 * Is this a size the event actually offers?
 *
 * An event that is not tracking sizes accepts anything, including nothing — that is what
 * every event did before this existed.
 */
function isOfferedSize(event, size) {
  if (!isTrackingSizes(event)) return true;
  return Boolean(findSize(event, size));
}

/**
 * Take one of a size, or report that there is none left.
 *
 * The bound is inside the filter, so the check and the decrement are a single atomic
 * update — two desks handing over the last medium cannot both succeed.
 *
 * @returns {Promise<{claimed: boolean, tracked: boolean, remaining?: number, reason?: string}>}
 *   `tracked: false` means the event does not track sizes and nothing was claimed.
 */
async function claimKitSize(eventId, size) {
  const wanted = normaliseSize(size);
  const event = await Event.findById(eventId).select('kitInventory').lean();

  if (!isTrackingSizes(event)) return { claimed: false, tracked: false };
  if (!wanted) return { claimed: false, tracked: true, reason: 'no_size' };

  const entry = findSize(event, wanted);
  if (!entry) return { claimed: false, tracked: true, reason: 'unknown_size' };

  const stock = Number(entry.stock) || 0;

  // A size with no stock has to be refused here rather than by the filter below. The
  // `$exists: false` branch exists so `$inc` can create `released` on first use, but when
  // stock is zero that branch matches unconditionally — an absent counter is not less than
  // zero, it simply is not there — and the first claim on a sold-out size would succeed.
  // Found by a live probe: stock 0 handed out a shirt.
  if (stock <= 0) return { claimed: false, tracked: true, reason: 'out_of_stock', remaining: 0 };

  const updated = await Event.findOneAndUpdate(
    {
      _id: eventId,
      kitInventory: {
        $elemMatch: {
          size: wanted,
          // Absent `released` means never tracked, which reads as zero. Matching on
          // absence as well as on the bound is what lets $inc create the field.
          $or: [{ released: { $exists: false } }, { released: { $lt: stock } }]
        }
      }
    },
    { $inc: { 'kitInventory.$.released': 1 } },
    { new: true, projection: { kitInventory: 1 } }
  ).lean();

  if (!updated) {
    return { claimed: false, tracked: true, reason: 'out_of_stock', remaining: 0 };
  }

  const after = findSize(updated, wanted);
  return {
    claimed: true,
    tracked: true,
    remaining: Math.max(0, (Number(after?.stock) || 0) - (Number(after?.released) || 0))
  };
}

/**
 * Put one back.
 *
 * Called when a kit release is undone or a registration is cancelled after collection.
 * Guarded above zero so a double return cannot invent stock that was never there.
 */
async function returnKitSize(eventId, size) {
  const wanted = normaliseSize(size);
  if (!wanted) return false;

  try {
    const updated = await Event.findOneAndUpdate(
      {
        _id: eventId,
        kitInventory: { $elemMatch: { size: wanted, released: { $gt: 0 } } }
      },
      { $inc: { 'kitInventory.$.released': -1 } },
      { new: true, projection: { _id: 1 } }
    ).lean();

    return Boolean(updated);
  } catch (error) {
    // Returning stock is a correction, never the caller's main job. Losing one leaves a
    // shirt unaccounted for, which is better than failing the cancellation that caused it.
    logger.error(`[KitInventory] Could not return ${wanted} for event ${eventId}: ${error.message}`);
    return false;
  }
}

/**
 * Recompute `released` from the registrations that actually collected a kit.
 *
 * Available for repair, and the only honest way to correct a count that has drifted —
 * hand-editing `released` would just move the drift somewhere else.
 */
async function recountKitInventory(eventId) {
  const Registration = require('../models/Registration');
  const event = await Event.findById(eventId).select('kitInventory').lean();
  if (!isTrackingSizes(event)) return { updated: 0, sizes: 0 };

  const counts = await Registration.aggregate([
    {
      $match: {
        eventId: event._id ? event._id : eventId,
        status: { $ne: 'cancelled' },
        kitSizeReleased: { $nin: ['', null] }
      }
    },
    { $group: { _id: '$kitSizeReleased', total: { $sum: 1 } } }
  ]);

  const bySize = new Map(counts.map((row) => [normaliseSize(row._id), row.total]));
  const kitInventory = (event.kitInventory || []).map((entry) => ({
    ...entry,
    released: bySize.get(normaliseSize(entry.size)) || 0
  }));

  await Event.updateOne({ _id: eventId }, { $set: { kitInventory } });
  return { updated: kitInventory.length, sizes: kitInventory.length };
}

module.exports = {
  claimKitSize,
  returnKitSize,
  recountKitInventory,
  getInventorySummary,
  getOfferedSizes,
  isOfferedSize,
  isTrackingSizes,
  normaliseSize
};
