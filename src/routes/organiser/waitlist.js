// src/routes/organiser/waitlist.js
// The organiser's view of the queue for a full category.
//
// Deliberately protectEventRead/Mutation rather than the onsite guards: promoting somebody
// hands out a slot and takes capacity, which is an organiser decision about who gets into
// the event, not a race-day check-in job.

const express = require('express');
const router = express.Router();
const Event = require('../../models/Event');
const WaitlistEntry = require('../../models/WaitlistEntry');
const logger = require('../../utils/logger');
const { createRateLimiter } = require('../../middleware/rate-limit.middleware');
const { protectEventRead, protectEventMutation } = require('./event-route-protection');
const {
  getQueue,
  offerNextSlotAndNotify,
  withdrawEntry,
  countWaiting
} = require('../../services/waitlist.service');

// Each promotion sends an email against a shared daily allowance, so this is tighter than
// an ordinary read-modify-write.
const waitlistActionLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  maxRequests: 30,
  message: 'Too many waitlist actions. Please wait a few minutes and try again.'
});

router.get('/events/:eventId/waitlist', protectEventRead, async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.eventId)
      .select('title slug raceCategories waitlistEnabled waitlistOfferHours')
      .lean();
    if (!event) {
      return res.status(404).render('error', {
        title: '404 - Event Not Found',
        status: 404,
        message: 'Event not found.'
      });
    }

    // Resolved entries are included: an organiser needs to see that an offer expired, not
    // just that somebody quietly vanished from the list.
    const entries = await getQueue(event._id, { includeResolved: true });

    // Capacity per category, so the page can say whether promoting is even possible.
    const categories = (event.raceCategories || []).map((category) => {
      const slots = Number(category.slots);
      const reserved = Number(category.reserved) || 0;
      return {
        categoryId: String(category.categoryId || ''),
        label: category.distanceLabel || category.name || category.categoryId || '',
        slots: Number.isFinite(slots) && slots > 0 ? slots : null,
        reserved,
        waiting: entries.filter(
          (entry) =>
            String(entry.categoryId || '') === String(category.categoryId || '') &&
            ['waiting', 'offered'].includes(entry.status)
        ).length
      };
    });

    return res.render('organizer/event-waitlist', {
      title: `Waitlist — ${event.title}`,
      event,
      eventId: String(event._id),
      entries,
      categories,
      totalWaiting: await countWaiting(event._id)
    });
  } catch (error) {
    return next(error);
  }
});

// Offer the next slot in a category.
router.post(
  '/events/:eventId/waitlist/offers',
  protectEventMutation,
  waitlistActionLimiter,
  async (req, res, next) => {
    try {
      const event = await Event.findById(req.params.eventId).lean();
      if (!event) return res.status(404).json({ success: false, error: 'Event not found.' });
      if (!event.waitlistEnabled) {
        return res.status(400).json({ success: false, error: 'The waitlist is switched off for this event.' });
      }

      const categoryId = String(req.body.categoryId || '');
      const result = await offerNextSlotAndNotify({
        event,
        categoryId,
        actedByUserId: req.session?.userId || null
      });

      if (!result.offered) {
        // Each reason is a different thing for the organiser to do about it, so they are
        // not collapsed into one failure message.
        const reasons = {
          empty: 'Nobody is waiting for that category.',
          no_capacity: 'That category is full — free a slot before promoting anyone.',
          notify_failed: 'The offer email could not be sent, so the offer was withdrawn and the slot released.'
        };
        return res.status(409).json({
          success: false,
          error: reasons[result.reason] || 'Could not make an offer.',
          reason: result.reason
        });
      }

      return res.json({
        success: true,
        message: `Offer sent to ${result.entry.participant.email}. It expires ${new Date(
          result.entry.offerExpiresAt
        ).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}.`,
        entryId: String(result.entry._id)
      });
    } catch (error) {
      logger.error('Waitlist offer failed:', error);
      return next(error);
    }
  }
);

// Take somebody off the list. Releases the slot if an offer was holding one.
router.post(
  '/events/:eventId/waitlist/:entryId/withdraw',
  protectEventMutation,
  waitlistActionLimiter,
  async (req, res, next) => {
    try {
      const entry = await WaitlistEntry.findOne({
        _id: req.params.entryId,
        eventId: req.params.eventId
      }).exec();
      if (!entry) return res.status(404).json({ success: false, error: 'Waitlist entry not found.' });

      if (!['waiting', 'offered'].includes(entry.status)) {
        return res.status(409).json({ success: false, error: 'That entry is no longer active.' });
      }

      await withdrawEntry(entry, req.session?.userId || null);
      return res.json({ success: true, message: 'Removed from the waitlist.' });
    } catch (error) {
      logger.error('Waitlist withdraw failed:', error);
      return next(error);
    }
  }
);

module.exports = router;
