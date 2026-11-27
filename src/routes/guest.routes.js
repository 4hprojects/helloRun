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
const { getClientIp, getClientIpKey } = require('../utils/client-ip');
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
const { getOnsiteStateForRegistrations } = require('../services/onsite-roster.service');
const { renderBibQrCode } = require('../services/bib-qr-token.service');
const { resolveBibForRegistration } = require('../services/race-bib-assignment.service');
const { renderRaceBibPng, renderRaceBibSocialPng, renderRaceBibPdf } = require('../services/race-bib-renderer.service');
const { _renderData: buildBibRenderData } = require('../controllers/raceBib.controller');

// Unauthenticated writes, so tighter than the signed-in equivalents.
const guestRegistrationLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 5,
  message: 'Too many registration attempts. Please wait a few minutes and try again.',
  keyFn: (req) => `guest-register|${getClientIpKey(req)}|${req.params.slug || ''}`
});

// Guessing a 64-hex token is not realistic, but a slow trickle should still not be free.
const guestLookupLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  maxRequests: 30,
  message: 'Too many attempts. Please wait a few minutes and try again.',
  keyFn: (req) => `guest-lookup|${getClientIpKey(req)}`
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

      const { form, errors } = validateGuestForm(req.body, event);

      if (isTurnstileConfigured()) {
        const verified = await verifyTurnstileToken({
          token: req.body['cf-turnstile-response'],
          remoteIp: getClientIp(req)
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
        requestMeta: { ipAddress: getClientIp(req), userAgent: req.get('user-agent') }
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
        const { form } = validateGuestForm(req.body, event);
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
      .select('title slug eventStartAt venueName feeMode bibSettings')
      .lean();

    // This link is the guest's race pass as well as their receipt. Without it, every guest,
    // walk-in, imported and waitlist-claimed participant had to be found by name at the
    // desk, because the account race pass is session-scoped and a guest has no session.
    // Reusing the manage token rather than minting a second credential: it is already
    // hashed, already single-purpose, and already revoked on cancellation and on claim.
    const onsite =
      (await getOnsiteStateForRegistrations([String(registration._id)])).get(String(registration._id)) || null;
    if (event?.bibSettings?.enabled && registration.participationMode === 'virtual') {
      // Self-heal a retryable signup/payment issuance failure before showing the private receipt.
      await resolveBibForRegistration(registration._id).catch((error) => {
        logger.error(`Guest bib self-heal failed for ${registration._id}: ${error.message}`);
      });
    }

    let qrDataUrl = '';
    if (onsite?.bibNumber) {
      try {
        const qr = await renderBibQrCode(String(registration.eventId), onsite.bibNumber, registration._id);
        qrDataUrl = qr.data_url;
      } catch (error) {
        // The pass is still useful with the bib number alone, so this must not 500 the page.
        logger.error(`Guest race pass QR generation failed for ${registration._id}: ${error.message}`);
      }
    }

    touchLastUsed(resolved.record._id);

    return res.render('pages/guest-registration', {
      title: `Your registration - ${event?.title || 'Event'}`,
      event,
      registration,
      onsite,
      qrDataUrl,
      guestToken: req.params.token
    });
  } catch (error) {
    return next(error);
  }
});

async function resolveGuestBib(req) {
  const resolved = await resolveToken(req.params.token, 'manage');
  if (!resolved.ok) return null;
  const registration = await Registration.findById(resolved.registrationId).lean();
  if (!registration || registration.participantType !== 'guest' || registration.userId) return null;
  const context = await resolveBibForRegistration(registration._id);
  touchLastUsed(resolved.record._id);
  return { registration, context };
}

router.get('/guest/registrations/:token/bib', guestLookupLimiter, async (req, res, next) => {
  try {
    const result = await resolveGuestBib(req);
    if (!result) return res.status(404).render('error', { title: 'Bib not found', status: 404, message: 'That link is not valid.' });
    const { context, registration } = result;
    const bibReady = Boolean(context.eligibility.eligible && context.assignment && context.design);
    return res.status(bibReady ? 200 : 409).render('pages/race-bib', {
      title: `Race bib — ${context.event.title}`,
      context,
      bibReady,
      showName: Boolean(registration.bibPreferences?.showName),
      basePath: `/guest/registrations/${req.params.token}/bib`,
      preferenceAction: `/guest/registrations/${req.params.token}/bib/preferences`,
      backHref: `/guest/registrations/${req.params.token}`,
      racePassHref: `/guest/registrations/${req.params.token}`
    });
  } catch (error) { return next(error); }
});

router.get('/guest/registrations/:token/bib.:format(png|pdf)', guestLookupLimiter, async (req, res, next) => {
  try {
    const result = await resolveGuestBib(req);
    if (!result) return res.status(404).send('Bib not found.');
    const { context } = result;
    if (!context.eligibility.eligible || !context.assignment || !context.design) return res.status(409).send('Bib is not available.');
    const input = buildBibRenderData(context);
    const isPdf = req.params.format === 'pdf';
    const buffer = isPdf ? await renderRaceBibPdf(input) : await renderRaceBibPng(input);
    res.set({
      'Content-Type': isPdf ? 'application/pdf' : 'image/png',
      'Cache-Control': 'private, no-store',
      'Content-Disposition': `${req.query.inline === '1' ? 'inline' : 'attachment'}; filename="${context.event.slug}-bib-${context.assignment.bib_number}.${isPdf ? 'pdf' : 'png'}"`
    });
    return res.send(buffer);
  } catch (error) { return next(error); }
});

router.get('/guest/registrations/:token/bib-share.png', guestLookupLimiter, async (req, res, next) => {
  try {
    const result = await resolveGuestBib(req);
    if (!result) return res.status(404).send('Bib not found.');
    const { context } = result;
    if (!context.eligibility.eligible || !context.assignment || !context.design) return res.status(409).send('Bib is not available.');
    if (!context.design.social?.enabled) return res.status(409).send('Social bib sharing is not enabled for this event.');
    const buffer = await renderRaceBibSocialPng(buildBibRenderData(context));
    res.set({
      'Content-Type': 'image/png',
      'Cache-Control': 'private, no-store',
      'Content-Disposition': `attachment; filename="${context.event.slug}-bib-${context.assignment.bib_number}-share.png"`
    });
    return res.send(buffer);
  } catch (error) { return next(error); }
});

router.post('/guest/registrations/:token/bib/preferences', guestLookupLimiter, requireCsrfProtection, async (req, res, next) => {
  try {
    const resolved = await resolveToken(req.params.token, 'manage');
    if (!resolved.ok) return res.status(404).send('Registration not found.');
    const registration = await Registration.findOne({ _id: resolved.registrationId, participantType: 'guest', userId: null });
    if (!registration) return res.status(404).send('Registration not found.');
    registration.bibPreferences.showName = req.body.showName === 'on' || req.body.showName === '1';
    await registration.save();
    touchLastUsed(resolved.record._id);
    // Keep the credential out of a fresh Location header. The relative redirect resolves
    // from .../bib/preferences back to the existing private .../bib URL in the browser.
    return res.redirect('../bib');
  } catch (error) { return next(error); }
});

module.exports = router;
