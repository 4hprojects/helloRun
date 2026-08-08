// src/routes/waitlist.routes.js
// Joining the queue for a full category, and taking a slot when one is offered.
//
// Reachable without a session, like the guest routes and for the same reason: the people
// most likely to be waitlisted are the ones who did not get in, and requiring an account
// first would lose them. So the same rules apply — every route is rate limited, the write
// path goes through Turnstile where it is configured, and the offer token is the
// credential, which means it is never redirected to, flashed, or logged.

const express = require('express');
const router = express.Router();

const Event = require('../models/Event');
const logger = require('../utils/logger');
const { createRateLimiter } = require('../middleware/rate-limit.middleware');
const { requireCsrfProtection } = require('../middleware/csrf.middleware');
const {
  isTurnstileConfigured,
  getTurnstileSiteKey,
  verifyTurnstileToken
} = require('../services/auth-abuse.service');
const {
  joinWaitlist,
  validateWaitlistForm,
  getWaitlistBlock,
  resolveOfferToken,
  markPromoted,
  positionOf
} = require('../services/waitlist.service');
const {
  validateGuestForm,
  createGuestRegistration,
  getGuestRegistrationBlock
} = require('../services/guest-registration.service');
const { getPublicEventVisibilityQuery } = require('../utils/public-event-visibility');

const waitlistJoinLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 5,
  message: 'Too many attempts. Please wait a few minutes and try again.',
  keyFn: (req) => `waitlist-join|${req.ip || 'unknown-ip'}|${req.params.slug || ''}`
});

// Separate from the join limiter: that one keys on `:slug`, which this route does not
// have, so every claim from one IP collapsed into a single bucket and two people behind one
// office IP could lock each other out of a time-limited slot.
const waitlistClaimLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 10,
  message: 'Too many attempts. Please wait a few minutes and try again.',
  keyFn: (req) => `waitlist-claim|${req.ip || 'unknown-ip'}|${req.params.token || ''}`
});

const waitlistLookupLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  maxRequests: 30,
  message: 'Too many attempts. Please wait a few minutes and try again.',
  keyFn: (req) => `waitlist-lookup|${req.ip || 'unknown-ip'}`
});

async function loadPublicEvent(slug) {
  return Event.findOne({ slug: String(slug || ''), ...getPublicEventVisibilityQuery() }).lean();
}

function renderJoinForm(res, { event, form = {}, errors = {}, status = 200 }) {
  return res.status(status).render('pages/waitlist-join', {
    title: `Join the waitlist - ${event.title}`,
    event,
    form,
    errors,
    turnstileSiteKey: isTurnstileConfigured() ? getTurnstileSiteKey() : ''
  });
}

// The same answer for "never existed" and "expired": a stranger guessing tokens learns
// nothing from the difference.
function offerRejectionMessage(reason) {
  return reason === 'expired'
    ? 'This offer has expired and the slot has gone to the next person in line.'
    : 'This link is no longer valid.';
}

/**
 * The category this offer is for, as the registration form's `raceDistance` value.
 *
 * Derived from the entry, never from the post: the offer was made for one category and
 * reserved a slot in it. Letting the claimant pick another would oversell that one and
 * strand the held slot in this one forever.
 */
function offeredRaceDistance(event, entry) {
  const category = (event.raceCategories || []).find(
    (candidate) => String(candidate.categoryId || '') === String(entry.categoryId || '')
  );
  return String(category?.distanceLabel || category?.name || entry.categoryLabel || '').trim();
}

function unavailable(res, message, status) {
  return res.status(status).render('error', {
    title: 'Waitlist unavailable',
    status,
    message
  });
}

router.get('/events/:slug/waitlist', waitlistLookupLimiter, async (req, res, next) => {
  try {
    const event = await loadPublicEvent(req.params.slug);
    if (!event) return unavailable(res, 'Event not found.', 404);

    const categoryId = String(req.query.category || '');
    const block = getWaitlistBlock(event, categoryId);
    if (!block.allowed) return unavailable(res, block.message, 404);

    return renderJoinForm(res, { event, form: { categoryId } });
  } catch (error) {
    return next(error);
  }
});

router.post(
  '/events/:slug/waitlist',
  waitlistJoinLimiter,
  requireCsrfProtection,
  async (req, res, next) => {
    try {
      const event = await loadPublicEvent(req.params.slug);
      if (!event) return unavailable(res, 'Event not found.', 404);

      const { form, errors } = validateWaitlistForm(req.body);

      const block = getWaitlistBlock(event, form.categoryId);
      if (!block.allowed) return unavailable(res, block.message, 403);

      if (isTurnstileConfigured()) {
        const verified = await verifyTurnstileToken({
          token: req.body['cf-turnstile-response'],
          remoteIp: req.ip
        });
        if (!verified?.success) {
          errors.turnstile = 'Please complete the verification and try again.';
        }
      }

      if (Object.keys(errors).length > 0) {
        return renderJoinForm(res, { event, form, errors, status: 400 });
      }

      const { entry, position } = await joinWaitlist({
        event,
        form,
        userId: req.session?.userId || null
      });

      return res.render('pages/waitlist-joined', {
        title: `You are on the waitlist - ${event.title}`,
        event,
        entry,
        position
      });
    } catch (error) {
      if (['ALREADY_WAITING', 'ALREADY_REGISTERED', 'WAITLIST_UNAVAILABLE'].includes(error.code)) {
        const event = await loadPublicEvent(req.params.slug);
        // The event can be unpublished between the two reads; renderJoinForm dereferences
        // event.title, so re-rendering with null would turn a handled 409 into a 500.
        if (!event) return unavailable(res, 'Event not found.', 404);
        const { form } = validateWaitlistForm(req.body);
        return renderJoinForm(res, {
          event,
          form,
          errors: { form: error.message },
          status: 409
        });
      }
      logger.error('Waitlist join failed:', error);
      return next(error);
    }
  }
);

// The offer. The token in the path is the credential, so this is a lookup, never a redirect.
router.get('/waitlist/offers/:token', waitlistLookupLimiter, async (req, res, next) => {
  try {
    const resolved = await resolveOfferToken(req.params.token);
    if (!resolved.ok) return unavailable(res, offerRejectionMessage(resolved.reason), 410);

    const event = await Event.findById(resolved.entry.eventId).lean();
    if (!event) return unavailable(res, 'Event not found.', 404);

    // The event's own rules still apply. An offer window runs up to 336 hours, so
    // registration can close — or the organiser can turn guest entry off — while the link
    // sits unread. Without this the waitlist was a way around both.
    const block = getGuestRegistrationBlock(event);
    if (block) return unavailable(res, block, 410);

    return res.render('pages/waitlist-offer', {
      title: `A slot is available - ${event.title}`,
      event,
      entry: resolved.entry,
      token: req.params.token,
      form: {},
      errors: {}
    });
  } catch (error) {
    return next(error);
  }
});

// Taking the offer.
router.post(
  '/waitlist/offers/:token',
  waitlistClaimLimiter,
  requireCsrfProtection,
  async (req, res, next) => {
    let resolved;
    let event;
    try {
      resolved = await resolveOfferToken(req.params.token);
      if (!resolved.ok) return unavailable(res, offerRejectionMessage(resolved.reason), 410);

      event = await Event.findById(resolved.entry.eventId).lean();
      if (!event) return unavailable(res, 'Event not found.', 404);

      const block = getGuestRegistrationBlock(event);
      if (block) return unavailable(res, block, 410);

      // The waitlist collected only enough to reach the person; a registration needs the
      // waiver, the emergency contact and the rest, which is what this form supplies.
      const offeredDistance = offeredRaceDistance(event, resolved.entry);
      const { form, errors } = validateGuestForm(
        {
          ...req.body,
          email: resolved.entry.participant.email, // fixed: the offer belongs to this address
          // Fixed for the same reason. The offer reserved a slot in one category; a posted
          // value could otherwise register into a different one, overselling that category
          // and stranding this one's slot for good.
          ...(offeredDistance ? { raceDistance: offeredDistance } : {})
        },
        event
      );

      if (Object.keys(errors).length > 0) {
        return res.status(400).render('pages/waitlist-offer', {
          title: `A slot is available - ${event.title}`,
          event,
          entry: resolved.entry,
          token: req.params.token,
          form,
          errors
        });
      }

      const { registration, manageToken, hasAccount } = await createGuestRegistration({
        event,
        form,
        requestMeta: { ipAddress: req.ip, userAgent: req.get('user-agent') },
        // Skip only when this offer actually holds a slot. An entry with no category — or
        // one in an uncapped category — never reserved anything, so skipping would let it
        // register with no capacity check at all.
        skipCapacityReservation: Boolean(resolved.entry.slotHeld)
      });

      try {
        await markPromoted(resolved.entry, registration._id);
      } catch (error) {
        // The registration exists and is correct. If this fails the entry stays `offered`
        // with slotHeld true, and the expiry sweep would later release a slot the new
        // registration occupies — so say so loudly rather than failing a completed claim.
        logger.error(
          `[Waitlist] Registration ${registration._id} created but entry ${resolved.entry._id} not marked promoted: ${error.message}`
        );
      }

      return res.render('pages/guest-register-success', {
        title: `You are registered - ${event.title}`,
        event,
        registration,
        manageToken,
        hasAccount
      });
    } catch (error) {
      // A duplicate, a category that filled, or a distance with no price are all things the
      // claimant can act on — and their offer is still live and on a clock, so a 500 page
      // would be the worst possible answer.
      if (['DUPLICATE_GUEST', 'CAPACITY', 'PRICING'].includes(error.code) && event && resolved?.entry) {
        return res.status(409).render('pages/waitlist-offer', {
          title: `A slot is available - ${event.title}`,
          event,
          entry: resolved.entry,
          token: req.params.token,
          form: {},
          errors: { form: error.message }
        });
      }
      logger.error('Waitlist offer claim failed:', error);
      return next(error);
    }
  }
);

module.exports = router;
module.exports.positionOf = positionOf;
