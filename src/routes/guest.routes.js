// src/routes/guest.routes.js
// Registering, and reaching your registration, without a HelloRun account.
//
// These are the only registration routes reachable without a session, so every one of
// them is rate limited, and the write path additionally goes through Turnstile when it
// is configured. A guest's link is their credential, so it is never put in a redirect,
// a flash message, or a log line.

const express = require('express');
const router = express.Router();

const Event = require('../models/Event');
const Registration = require('../models/Registration');
const logger = require('../utils/logger');
const { createRateLimiter } = require('../middleware/rate-limit.middleware');
const { requireCsrfProtection } = require('../middleware/csrf.middleware');
const {
  isTurnstileConfigured,
  getTurnstileSiteKey,
  verifyTurnstileToken
} = require('../services/auth-abuse.service');
const {
  validateGuestForm,
  getGuestRegistrationBlock,
  createGuestRegistration
} = require('../services/guest-registration.service');
const {
  resolveToken,
  touchLastUsed
} = require('../services/guest-registration-token.service');
const { getPublicEventVisibilityQuery } = require('../utils/public-event-visibility');

// Unauthenticated writes, so tighter than the signed-in equivalents.
const guestRegistrationLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 5,
  message: 'Too many registration attempts. Please wait a few minutes and try again.',
  keyFn: (req) => `guest-register|${req.ip || 'unknown-ip'}|${req.params.slug || ''}`
});

// Guessing a 64-hex token is not realistic, but a slow trickle should still not be free.
const guestLookupLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  maxRequests: 30,
  message: 'Too many attempts. Please wait a few minutes and try again.',
  keyFn: (req) => `guest-lookup|${req.ip || 'unknown-ip'}`
});

async function loadPublicEvent(slug) {
  return Event.findOne({ slug, ...getPublicEventVisibilityQuery() }).lean();
}

function renderForm(res, { event, form = {}, errors = {}, status = 200 }) {
  return res.status(status).render('pages/guest-register', {
    title: `Register as a guest - ${event.title}`,
    event,
    form,
    errors,
    turnstileSiteKey: isTurnstileConfigured() ? getTurnstileSiteKey() : ''
  });
}

router.get('/events/:slug/register/guest', guestLookupLimiter, async (req, res, next) => {
  try {
    const event = await loadPublicEvent(req.params.slug);
    const block = getGuestRegistrationBlock(event);
    if (block) {
      return res.status(404).render('error', {
        title: 'Guest registration unavailable',
        status: 404,
        message: block
      });
    }
    return renderForm(res, { event });
  } catch (error) {
    return next(error);
  }
});

router.post(
  '/events/:slug/register/guest',
  guestRegistrationLimiter,
  requireCsrfProtection,
  async (req, res, next) => {
    try {
      const event = await loadPublicEvent(req.params.slug);
      const block = getGuestRegistrationBlock(event);
      if (block) {
        return res.status(403).render('error', {
          title: 'Guest registration unavailable',
          status: 403,
          message: block
        });
      }

      const { form, errors } = validateGuestForm(req.body);

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
        return renderForm(res, { event, form, errors, status: 400 });
      }

      const { registration, manageToken, hasAccount } = await createGuestRegistration({
        event,
        form,
        requestMeta: { ipAddress: req.ip, userAgent: req.get('user-agent') }
      });

      // Rendered directly, never redirected to: a token in a URL ends up in browser
      // history, referrer headers and server logs.
      return res.render('pages/guest-register-success', {
        title: `You are registered - ${event.title}`,
        event,
        registration,
        manageToken,
        hasAccount
      });
    } catch (error) {
      if (error.code === 'DUPLICATE_GUEST' || error.code === 'CAPACITY' || error.code === 'PRICING') {
        const event = await loadPublicEvent(req.params.slug);
        const { form } = validateGuestForm(req.body);
        return renderForm(res, {
          event,
          form,
          errors: { form: error.message },
          status: 409
        });
      }
      logger.error('Guest registration failed:', error);
      return next(error);
    }
  }
);

// A guest reaching their own registration. The token in the path is the credential.
router.get('/guest/registrations/:token', guestLookupLimiter, async (req, res, next) => {
  try {
    const resolved = await resolveToken(req.params.token, 'manage');
    if (!resolved.ok) {
      // Deliberately one message for every failure reason. Telling a visitor whether a
      // link was revoked, expired or never existed tells them something about a
      // registration that may not be theirs.
      return res.status(404).render('error', {
        title: 'Link not valid',
        status: 404,
        message: 'That link is not valid. Ask the organizer to send a new one.'
      });
    }

    const registration = await Registration.findById(resolved.registrationId).lean();
    if (!registration) {
      return res.status(404).render('error', {
        title: 'Registration not found',
        status: 404,
        message: 'That registration no longer exists.'
      });
    }

    const event = await Event.findById(registration.eventId)
      .select('title slug eventStartAt venueName feeMode')
      .lean();

    touchLastUsed(resolved.record._id);

    return res.render('pages/guest-registration', {
      title: `Your registration - ${event?.title || 'Event'}`,
      event,
      registration
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
