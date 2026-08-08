// src/services/waitlist.service.js
// The queue for a category that is full.
//
// The one invariant that everything here protects: **an offer holds a real slot**. Making
// an offer takes capacity through the same atomic reservation an ordinary registration
// uses, so two people cannot be promoted into one slot, and nobody can register past a
// promoted person while they are still deciding. The cost of that is an offer must always
// end — claimed, declined, or expired — because an offer that is never resolved takes
// capacity out of circulation permanently. Every path out of `offered` releases the slot.
//
// See models/WaitlistEntry.js for why a waitlist entry is not a Registration.

const WaitlistEntry = require('../models/WaitlistEntry');
const Registration = require('../models/Registration');
const { reserveCategorySlot, releaseCategorySlot } = require('./category-capacity.service');
const { generateToken, hashToken } = require('./token.service');
const communicationService = require('./communication.service');
const logger = require('../utils/logger');

const DEFAULT_OFFER_HOURS = 48;

function normaliseEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function findCategory(event, categoryId) {
  return (event?.raceCategories || []).find(
    (category) => String(category.categoryId || '') === String(categoryId || '')
  );
}

function categoryLabelOf(category) {
  if (!category) return '';
  return String(category.distanceLabel || category.name || '').slice(0, 100);
}

/**
 * How long an offer stands, in milliseconds.
 *
 * Clamped rather than trusted: the field is bounded in the schema, but an event document
 * written before that bound existed could carry anything.
 */
function offerWindowMs(event) {
  const hours = Number(event?.waitlistOfferHours);
  const safe = Number.isFinite(hours) && hours >= 1 && hours <= 336 ? hours : DEFAULT_OFFER_HOURS;
  return safe * 60 * 60 * 1000;
}

/**
 * Is a category actually full?
 *
 * The waitlist only makes sense past capacity. Letting someone queue for a category with
 * slots left would leave them waiting behind a door that is open.
 */
function categoryIsFull(category) {
  const slots = Number(category?.slots);
  if (!Number.isFinite(slots) || slots <= 0) return false; // uncapped: never full
  const reserved = Number(category?.reserved) || 0;
  return reserved >= slots;
}

/**
 * Why the waitlist is or is not available for this category.
 *
 * Mirrors getGuestRegistrationBlock: a reason the caller can render, rather than a bare
 * boolean that leaves the page guessing what to say.
 */
function getWaitlistBlock(event, categoryId) {
  if (!event) return { allowed: false, reason: 'unknown_event', message: 'Event not found.' };
  if (!event.waitlistEnabled) {
    return { allowed: false, reason: 'disabled', message: 'This event does not keep a waitlist.' };
  }
  if (event.status && event.status !== 'published') {
    return { allowed: false, reason: 'not_published', message: 'This event is not open.' };
  }

  // A blank categoryId used to skip both checks below, because each was guarded
  // `if (categoryId && ...)`. Since the value comes from a hidden form field, omitting it
  // was a one-line bypass of the fullness rule — and the resulting entry could never be
  // promoted, because the organiser's promote buttons are built per category.
  const cappedCategories = (event.raceCategories || []).filter((candidate) => {
    const slots = Number(candidate.slots);
    return Number.isFinite(slots) && slots > 0;
  });

  if (!categoryId) {
    if (cappedCategories.length > 0) {
      return {
        allowed: false,
        reason: 'category_required',
        message: 'Choose which category you want to wait for.'
      };
    }
    // No capped category anywhere: nothing can fill up, so there is nothing to wait for.
    return {
      allowed: false,
      reason: 'not_full',
      message: 'This event has no category that can fill up — you can register now.'
    };
  }

  const category = findCategory(event, categoryId);
  if (!category) {
    return { allowed: false, reason: 'unknown_category', message: 'That category no longer exists.' };
  }
  if (!categoryIsFull(category)) {
    return {
      allowed: false,
      reason: 'not_full',
      message: 'That category still has slots — you can register now.'
    };
  }

  return { allowed: true, reason: '', message: '', category };
}

/**
 * Check the details needed to register this person later.
 *
 * Deliberately lighter than validateGuestForm: joining a queue is not registering. The
 * waiver, emergency contact and participation mode are collected at promotion, when there
 * is actually a slot, rather than demanded from someone who may never get one.
 */
function validateWaitlistForm(input = {}) {
  const form = {
    firstName: String(input.firstName || '').trim().slice(0, 60),
    lastName: String(input.lastName || '').trim().slice(0, 60),
    email: normaliseEmail(input.email).slice(0, 160),
    // The guest registration form names this field `mobile`; accept either so the two
    // forms can be filled from the same data without a silent blank.
    mobileNumber: String(input.mobileNumber || input.mobile || '').trim().slice(0, 40),
    categoryId: String(input.categoryId || '').trim().slice(0, 80)
  };

  const errors = {};
  if (!form.firstName) errors.firstName = 'First name is required.';
  if (!form.lastName) errors.lastName = 'Last name is required.';
  if (!form.email) errors.email = 'Email is required.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = 'Enter a valid email address.';
  if (!form.mobileNumber) errors.mobileNumber = 'Contact number is required.';

  return { form, errors };
}

/**
 * Join the queue.
 *
 * @returns {Promise<{entry: Object, position: number}>}
 */
async function joinWaitlist({ event, form, userId = null }) {
  const block = getWaitlistBlock(event, form.categoryId);
  if (!block.allowed) {
    const error = new Error(block.message);
    error.code = 'WAITLIST_UNAVAILABLE';
    error.reason = block.reason;
    throw error;
  }

  const email = normaliseEmail(form.email);

  // Already registered is a different answer from already queued, and saying so saves
  // somebody waiting for a slot they are standing in.
  const registered = await Registration.findOne({
    eventId: event._id,
    status: { $ne: 'cancelled' },
    $or: [{ 'participant.email': email }, ...(userId ? [{ userId }] : [])]
  })
    .select('confirmationCode')
    .lean();
  if (registered) {
    const error = new Error('You are already registered for this event.');
    error.code = 'ALREADY_REGISTERED';
    error.confirmationCode = registered.confirmationCode;
    throw error;
  }

  let entry;
  try {
    entry = await WaitlistEntry.create({
      eventId: event._id,
      categoryId: form.categoryId || '',
      categoryLabel: categoryLabelOf(block.category),
      userId: userId || null,
      participant: {
        firstName: form.firstName,
        lastName: form.lastName,
        email,
        mobileNumber: form.mobileNumber
      },
      status: 'waiting'
    });
  } catch (error) {
    // The partial unique index is what actually prevents a double entry; catching it here
    // rather than pre-checking means two simultaneous submissions cannot both pass.
    if (error?.code === 11000) {
      const duplicate = new Error('You are already on the waitlist for this category.');
      duplicate.code = 'ALREADY_WAITING';
      throw duplicate;
    }
    throw error;
  }

  return { entry, position: await positionOf(entry) };
}

/**
 * Where an entry sits in its queue, counting from 1.
 *
 * Offers ahead of it still count: those people are ahead in line, and telling someone they
 * are next when two live offers sit in front would be a lie.
 */
async function positionOf(entry) {
  if (!entry || !['waiting', 'offered'].includes(entry.status)) return 0;
  const ahead = await WaitlistEntry.countDocuments({
    eventId: entry.eventId,
    categoryId: entry.categoryId || '',
    status: { $in: ['waiting', 'offered'] },
    createdAt: { $lt: entry.createdAt }
  });
  return ahead + 1;
}

/**
 * The queue for an organiser to work through.
 */
async function getQueue(eventId, { categoryId = null, includeResolved = false } = {}) {
  const query = { eventId };
  if (categoryId !== null) query.categoryId = categoryId || '';
  if (!includeResolved) query.status = { $in: ['waiting', 'offered'] };

  const entries = await WaitlistEntry.find(query).sort({ createdAt: 1 }).lean();

  // Position is arrival order within a category, so it cannot be the index of a mixed list.
  const seen = new Map();
  return entries.map((entry) => {
    const key = entry.categoryId || '';
    const live = ['waiting', 'offered'].includes(entry.status);
    const next = live ? (seen.get(key) || 0) + 1 : null;
    if (live) seen.set(key, next);
    return { ...entry, position: next };
  });
}

/**
 * Offer the next slot in a category.
 *
 * Takes the slot before marking the entry, so a failure to reserve leaves the queue
 * untouched rather than promoting somebody into capacity that is not there.
 *
 * @returns {Promise<{offered: boolean, reason?: string, entry?: Object, token?: string}>}
 */
async function offerNextSlot({ event, categoryId = '', actedByUserId = null }) {
  const next = await WaitlistEntry.findOne({
    eventId: event._id,
    categoryId: categoryId || '',
    status: 'waiting'
  })
    .sort({ createdAt: 1 })
    .exec();

  if (!next) return { offered: false, reason: 'empty' };

  // An uncapped category has no slot to take; the offer is still meaningful, it just does
  // not need to hold anything.
  let slotHeld = false;
  if (categoryId) {
    const reservation = await reserveCategorySlot(event._id, categoryId);
    if (reservation.limited && !reservation.reserved) {
      return { offered: false, reason: 'no_capacity' };
    }
    slotHeld = Boolean(reservation.reserved);
  }

  const token = generateToken(32);
  const now = new Date();

  try {
    next.status = 'offered';
    next.offeredAt = now;
    next.offerExpiresAt = new Date(now.getTime() + offerWindowMs(event));
    next.offerTokenHash = hashToken(token);
    next.slotHeld = slotHeld;
    next.actedByUserId = actedByUserId || null;
    await next.save();
  } catch (error) {
    // The slot is already taken at this point. Give it back rather than leaking capacity.
    if (slotHeld) await releaseCategorySlot(event._id, categoryId);
    throw error;
  }

  return { offered: true, entry: next, token };
}

/**
 * Tell someone their slot is waiting.
 *
 * Awaited rather than backgrounded, unlike the guest confirmation: the offer is on a clock
 * and the link is the only way to act on it, so an organiser needs to know at the moment
 * they promote somebody whether the message actually went. The token is passed in because
 * it exists only here — it is never stored in a form that can be read back.
 */
async function sendOfferEmail({ event, entry, token }) {
  const baseUrl = String(process.env.APP_URL || '').replace(/\/$/, '');
  await communicationService.notify('registration.waitlist_offer', {
    email: {
      to: entry.participant.email,
      firstName: entry.participant.firstName,
      eventTitle: event.title || 'your event',
      categoryLabel: entry.categoryLabel || '',
      offerUrl: `${baseUrl}/waitlist/offers/${token}`,
      expiresAt: entry.offerExpiresAt
        ? new Date(entry.offerExpiresAt).toLocaleString('en-PH', {
            dateStyle: 'medium',
            timeStyle: 'short'
          })
        : '',
      metadata: {
        waitlistEntryId: String(entry._id),
        eventId: String(event._id)
      }
    }
  });
}

/**
 * Offer the next slot and tell them about it.
 *
 * If the email cannot be sent the offer is rolled back rather than left standing: an offer
 * nobody was told about would hold a slot until it expired, for no reason at all.
 */
async function offerNextSlotAndNotify({ event, categoryId = '', actedByUserId = null }) {
  const result = await offerNextSlot({ event, categoryId, actedByUserId });
  if (!result.offered) return result;

  try {
    await sendOfferEmail({ event, entry: result.entry, token: result.token });
    return { ...result, notified: true };
  } catch (error) {
    logger.error(`[Waitlist] Offer email failed for ${result.entry._id}: ${error.message}`);
    await releaseOffer(result.entry, 'expired').catch((rollbackError) => {
      // Now the slot really is stuck; say so loudly rather than reporting a clean failure.
      logger.error(`[Waitlist] Could not roll back offer ${result.entry._id}: ${rollbackError.message}`);
    });
    return { offered: false, reason: 'notify_failed', error };
  }
}

/**
 * Resolve an offer link.
 *
 * Returns a reason rather than throwing, so a page can tell "this offer ran out" apart
 * from "this link was never valid" without revealing which to a stranger.
 */
async function resolveOfferToken(rawToken) {
  const token = String(rawToken || '').trim();
  if (!token) return { ok: false, reason: 'missing' };
  if (!/^[a-f0-9]{64}$/i.test(token)) return { ok: false, reason: 'malformed' };

  const entry = await WaitlistEntry.findOne({ offerTokenHash: hashToken(token) }).exec();
  if (!entry) return { ok: false, reason: 'unknown' };
  if (entry.status === 'promoted') return { ok: false, reason: 'used', entry };
  if (entry.status !== 'offered') return { ok: false, reason: 'inactive', entry };
  if (entry.offerExpiresAt && entry.offerExpiresAt.getTime() < Date.now()) {
    return { ok: false, reason: 'expired', entry };
  }
  return { ok: true, entry };
}

/**
 * The offer was taken: link the registration and stand the entry down.
 *
 * The slot stays held — it is now the registration's. Marking `slotHeld` false is what
 * stops a later expiry sweep releasing capacity that is legitimately occupied.
 */
async function markPromoted(entry, registrationId) {
  entry.status = 'promoted';
  entry.promotedAt = new Date();
  entry.registrationId = registrationId;
  entry.offerTokenHash = ''; // single use
  entry.slotHeld = false;
  await entry.save();
  return entry;
}

/**
 * End an offer without a registration, and give the slot back.
 *
 * Guarded on `slotHeld` so a release can only ever happen once per offer, however many
 * times this is called — the expiry sweep and an organiser acting manually can race.
 */
async function releaseOffer(entry, status = 'expired') {
  if (!['expired', 'withdrawn'].includes(status)) {
    throw new Error(`releaseOffer cannot set status ${status}`);
  }

  const heldCategoryId = entry.slotHeld ? String(entry.categoryId || '') : '';

  entry.status = status;
  entry.offerTokenHash = '';
  entry.slotHeld = false;
  if (status === 'withdrawn') entry.withdrawnAt = new Date();
  await entry.save();

  if (heldCategoryId) {
    await releaseCategorySlot(entry.eventId, heldCategoryId);
  }
  return entry;
}

/**
 * Release every offer that has run out.
 *
 * Returns what it did rather than logging and forgetting, so the worker can report it.
 */
async function expireStaleOffers({ now = new Date(), limit = 200 } = {}) {
  const stale = await WaitlistEntry.find({
    status: 'offered',
    offerExpiresAt: { $ne: null, $lt: now }
  })
    .sort({ offerExpiresAt: 1 })
    .limit(limit)
    .exec();

  const expired = [];
  for (const entry of stale) {
    try {
      await releaseOffer(entry, 'expired');
      expired.push(entry);
    } catch (error) {
      // One bad entry must not stop the sweep: every other held slot is still stuck.
      logger.error(`[Waitlist] Could not expire offer ${entry._id}: ${error.message}`);
    }
  }
  return { expired: expired.length, entries: expired };
}

/**
 * Expire what has run out, then pass each freed slot straight to the next in line.
 *
 * The cascade is the point. Expiring an offer without re-offering would return the slot to
 * general availability, where the next person on the list has no better claim on it than a
 * stranger refreshing the event page — which defeats the queue. Doing both here also means
 * a slot is never unheld for longer than one pass.
 *
 * One entry per category per pass: offering two slots in a category that only freed one
 * would oversell it. The next pass picks up the rest.
 */
async function processExpiredOffers({ now = new Date(), limit = 200 } = {}) {
  const { expired, entries } = await expireStaleOffers({ now, limit });

  const Event = require('../models/Event');
  const eventCache = new Map();
  const handled = new Set();
  let reoffered = 0;

  for (const entry of entries) {
    const key = `${entry.eventId}|${entry.categoryId || ''}`;
    if (handled.has(key)) continue;
    handled.add(key);

    try {
      const eventId = String(entry.eventId);
      if (!eventCache.has(eventId)) {
        eventCache.set(eventId, await Event.findById(entry.eventId).lean());
      }
      const event = eventCache.get(eventId);

      // An organiser who switched the waitlist off mid-flight has decided to stop; the
      // slot still goes back, it just is not handed on.
      if (!event?.waitlistEnabled) continue;

      const result = await offerNextSlotAndNotify({ event, categoryId: entry.categoryId || '' });
      if (result.offered) reoffered += 1;
    } catch (error) {
      // One category must not stop the rest: every other expired slot is still stuck.
      logger.error(`[Waitlist] Could not re-offer after expiry on ${entry._id}: ${error.message}`);
    }
  }

  return { expired, reoffered };
}

/**
 * Take an entry off the list at the participant's or organiser's request.
 */
async function withdrawEntry(entry, actedByUserId = null) {
  entry.actedByUserId = actedByUserId || null;
  return releaseOffer(entry, 'withdrawn');
}

/**
 * How many people are waiting, for a summary line.
 */
async function countWaiting(eventId, categoryId = null) {
  const query = { eventId, status: { $in: ['waiting', 'offered'] } };
  if (categoryId !== null) query.categoryId = categoryId || '';
  return WaitlistEntry.countDocuments(query);
}

module.exports = {
  joinWaitlist,
  validateWaitlistForm,
  getWaitlistBlock,
  categoryIsFull,
  getQueue,
  positionOf,
  offerNextSlot,
  offerNextSlotAndNotify,
  sendOfferEmail,
  resolveOfferToken,
  markPromoted,
  releaseOffer,
  expireStaleOffers,
  processExpiredOffers,
  withdrawEntry,
  countWaiting,
  offerWindowMs,
  DEFAULT_OFFER_HOURS
};
