// src/services/race-kit-release.service.js
// Handing a race kit over at the table.
//
// Two records have to agree: the bib assignment in Postgres, which is what the roster and
// the check-in console read, and the per-size stock in Mongo, which is what tells an
// organiser whether there are any mediums left. The stock is claimed first because it is
// the one that can legitimately refuse — running out of a size is an ordinary Saturday, and
// the desk needs to hear about it before the kit is marked as gone.

const Registration = require('../models/Registration');
const Event = require('../models/Event');
const { markRaceKitReleased } = require('./onsite-operations.service');
const { claimKitSize, returnKitSize, isTrackingSizes, normaliseSize } = require('./kit-inventory.service');
const logger = require('../utils/logger');

/**
 * Release a kit, taking one of the right size out of stock.
 *
 * @param {Object} input
 * @param {string} input.eventId
 * @param {string} input.registrationId
 * @param {string} [input.size] - a substitute, when the size they chose has run out
 * @returns {Promise<{bib: Object, size: string, remaining: number|null, substituted: boolean}>}
 */
async function releaseRaceKit({ eventId, registrationId, size = '' }) {
  const registration = await Registration.findOne({ _id: registrationId, eventId })
    .select('kitSize kitSizeReleased participant')
    .exec();
  if (!registration) {
    const error = new Error('Registration not found for this event.');
    error.code = 'NOT_FOUND';
    throw error;
  }

  // Releasing twice must not take a second shirt out of stock. The desk re-scanning
  // somebody is far more likely than a genuine second kit.
  if (registration.kitSizeReleased) {
    const error = new Error(
      `This kit was already released${registration.kitSizeReleased ? ` (${registration.kitSizeReleased})` : ''}.`
    );
    error.code = 'ALREADY_RELEASED';
    throw error;
  }

  const event = await Event.findById(eventId).select('kitInventory kitSizeRequired').lean();
  const tracking = isTrackingSizes(event);

  // An explicit size is a substitution the desk is making on purpose; otherwise honour
  // what the participant chose.
  const requested = normaliseSize(size) || normaliseSize(registration.kitSize);
  const substituted = Boolean(normaliseSize(size)) && normaliseSize(size) !== normaliseSize(registration.kitSize);

  let remaining = null;
  if (tracking) {
    const claim = await claimKitSize(eventId, requested);
    if (!claim.claimed) {
      const reasons = {
        no_size: 'No kit size recorded for this participant. Choose a size to hand over.',
        unknown_size: `${requested} is not a size this event stocks.`,
        out_of_stock: `No ${requested} left. Choose another size to hand over instead.`
      };
      const error = new Error(reasons[claim.reason] || 'Could not take a kit from stock.');
      error.code = 'NO_STOCK';
      error.reason = claim.reason;
      throw error;
    }
    remaining = claim.remaining;
  }

  let bib;
  try {
    bib = await markRaceKitReleased(eventId, registrationId);
  } catch (error) {
    // The shirt is already out of stock at this point and no kit was handed over, so put
    // it back rather than losing one to a failed write.
    if (tracking) await returnKitSize(eventId, requested);
    throw error;
  }

  try {
    registration.kitSizeReleased = tracking ? requested : normaliseSize(registration.kitSize);
    await registration.save();
  } catch (error) {
    // The kit is marked released in Postgres and the stock is decremented, so the counts
    // are right; only the per-registration record of which size went out is missing.
    // recountKitInventory is the repair for the drift this causes.
    logger.error(`[RaceKit] Could not record released size for ${registrationId}: ${error.message}`);
  }

  return { bib, size: requested, remaining, substituted };
}

/**
 * Put a collected kit back into stock.
 *
 * Called when a registration is cancelled after the kit was handed over. Nothing physically
 * comes back, but the count has to reflect that this person is no longer a participant —
 * otherwise the organiser is short a shirt on paper that they still have in a box.
 */
async function returnKitForRegistration(registration) {
  if (!registration?.kitSizeReleased) return false;
  const returned = await returnKitSize(registration.eventId, registration.kitSizeReleased);
  return returned;
}

module.exports = { releaseRaceKit, returnKitForRegistration };
