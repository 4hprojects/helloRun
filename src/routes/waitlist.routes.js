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
const { validateGuestForm, createGuestRegistration } = require('../services/guest-registration.service');
const { getPublicEventVisibilityQuery } = require('../utils/public-event-visibility');

const waitlistJoinLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 5,
  message: 'Too many attempts. Please wait a few minutes and try again.',
  keyFn: (req) => `waitlist-join|${req.ip || 'unknown-ip'}|${req.params.slug || ''}`
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
    if (!resolved.ok) {
      // Deliberately the same message for "never existed" and "expired": a stranger
      // guessing tokens learns nothing from the difference.
      const message =
        resolved.reason === 'expired'
          ? 'This offer has expired and the slot has gone to the next person in line.'
          : 'This link is no longer valid.';
      return unavailable(res, message, 410);
    }

    const event = await Event.findById(resolved.entry.eventId).lean();
    if (!event) return unavailable(res, 'Event not found.', 404);

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

// Taking the offer. The slot is already held by the offer, so this must not reserve again.
router.post(
  '/waitlist/offers/:token',
  waitlistJoinLimiter,
  requireCsrfProtection,
  async (req, res, next) => {
    let resolved;
    try {
      resolved = await resolveOfferToken(req.params.token);
      if (!resolved.ok) {
        const message =
          resolved.reason === 'expired'
            ? 'This offer has expired and the slot has gone to the next person in line.'
            : 'This link is no longer valid.';
        return unavailable(res, message, 410);
      }

      const event = await Event.findById(resolved.entry.eventId).lean();
      if (!event) return unavailable(res, 'Event not found.', 404);

      // The waitlist collected only enough to reach the person; a registration needs the
      // waiver, the emergency contact and the rest, which is what this form supplies.
      const { form, errors } = validateGuestForm({
        ...req.body,
        email: resolved.entry.participant.email // fixed: the offer belongs to this address
      });

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
        // The offer took the slot when it was made. Reserving again would count one slot
        // twice and close the category a place early.
        skipCapacityReservation: true
      });

      await markPromoted(resolved.entry, registration._id);

      return res.render('pages/guest-register-success', {
        title: `You are registered - ${event.title}`,
        event,
        registration,
        manageToken,
        hasAccount
      });
    } catch (error) {
      logger.error('Waitlist offer claim failed:', error);
      return next(error);
    }
  }
);

module.exports = router;
module.exports.positionOf = positionOf;
