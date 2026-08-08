// src/routes/transfer.routes.js
// Taking over somebody else's entry.
//
// Unauthenticated, like the guest and waitlist routes: the person receiving a transfer
// usually has no HelloRun account, and requiring one first would strand the entry. So the
// link is the credential — rate limited, CSRF-protected, never redirected to or logged.

const express = require('express');
const router = express.Router();

const Event = require('../models/Event');
const logger = require('../utils/logger');
const { createRateLimiter } = require('../middleware/rate-limit.middleware');
const { requireCsrfProtection } = require('../middleware/csrf.middleware');
const {
  resolveTransferToken,
  acceptTransfer,
  resolveWithout,
  getTransferBlock
} = require('../services/registration-transfer.service');
const { isTrackingSizes, isOfferedSize, normaliseSize } = require('../services/kit-inventory.service');

const transferLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 10,
  message: 'Too many attempts. Please wait a few minutes and try again.',
  keyFn: (req) => `transfer|${req.ip || 'unknown-ip'}`
});

function unavailable(res, message, status) {
  return res.status(status).render('error', { title: 'Transfer unavailable', status, message });
}

// The same answer for expired and invented, so a stranger guessing tokens learns nothing.
function rejectionMessage(reason) {
  return reason === 'expired'
    ? 'This transfer link has expired. Ask the person transferring the entry to start again.'
    : 'This link is no longer valid.';
}

/**
 * Check what the recipient has to supply. The waiver is theirs, not the previous person's.
 */
function validateAcceptForm(body = {}, event = null) {
  const form = {
    firstName: String(body.firstName || '').trim().slice(0, 60),
    lastName: String(body.lastName || '').trim().slice(0, 60),
    mobile: String(body.mobile || '').trim().slice(0, 40),
    emergencyContactName: String(body.emergencyContactName || '').trim().slice(0, 120),
    emergencyContactNumber: String(body.emergencyContactNumber || '').trim().slice(0, 40),
    waiverAccepted: body.waiverAccepted === 'on' || body.waiverAccepted === true,
    waiverSignature: String(body.waiverSignature || '').trim().slice(0, 120),
    kitSize: normaliseSize(body.kitSize)
  };

  const errors = {};
  if (!form.firstName) errors.firstName = 'Enter your first name.';
  if (!form.lastName) errors.lastName = 'Enter your last name.';
  if (!form.mobile) errors.mobile = 'Enter a contact number.';
  if (!form.waiverAccepted) errors.waiverAccepted = 'You must accept the waiver to take this entry.';
  if (!form.waiverSignature) errors.waiverSignature = 'Type your name to sign the waiver.';

  if (event && isTrackingSizes(event)) {
    if (!form.kitSize && event.kitSizeRequired) {
      errors.kitSize = 'Choose a kit size.';
    } else if (form.kitSize && !isOfferedSize(event, form.kitSize)) {
      errors.kitSize = 'Choose one of the sizes this event offers.';
    }
  } else {
    form.kitSize = '';
  }

  return { form, errors };
}

function renderAccept(res, { event, transfer, token, form = {}, errors = {}, status = 200 }) {
  return res.status(status).render('pages/transfer-accept', {
    title: `Take over this entry - ${event.title}`,
    event,
    transfer,
    token,
    form,
    errors
  });
}

router.get('/transfers/:token', transferLimiter, async (req, res, next) => {
  try {
    const resolved = await resolveTransferToken(req.params.token);
    if (!resolved.ok) return unavailable(res, rejectionMessage(resolved.reason), 410);

    const event = await Event.findById(resolved.transfer.eventId).lean();
    if (!event) return unavailable(res, 'Event not found.', 404);

    // The event's own rules still apply — the deadline can pass while a link sits unread.
    const block = getTransferBlock(event);
    if (!block.allowed) return unavailable(res, block.message, 410);

    return renderAccept(res, { event, transfer: resolved.transfer, token: req.params.token });
  } catch (error) {
    return next(error);
  }
});

router.post('/transfers/:token', transferLimiter, requireCsrfProtection, async (req, res, next) => {
  try {
    const resolved = await resolveTransferToken(req.params.token);
    if (!resolved.ok) return unavailable(res, rejectionMessage(resolved.reason), 410);

    const event = await Event.findById(resolved.transfer.eventId).lean();
    if (!event) return unavailable(res, 'Event not found.', 404);

    const block = getTransferBlock(event);
    if (!block.allowed) return unavailable(res, block.message, 410);

    // Declining is a first-class outcome: an entry nobody wanted should not sit pending
    // until it expires, blocking the owner from transferring it to somebody else.
    if (req.body.decline === '1') {
      await resolveWithout(resolved.transfer, 'declined', { reason: req.body.declineReason });
      return res.render('pages/transfer-result', {
        title: `Transfer declined - ${event.title}`,
        event,
        heading: 'Transfer declined',
        message: 'You have declined this entry. Nothing has changed for either of you.',
        registration: null,
        manageToken: ''
      });
    }

    const { form, errors } = validateAcceptForm(req.body, event);
    if (Object.keys(errors).length > 0) {
      return renderAccept(res, {
        event,
        transfer: resolved.transfer,
        token: req.params.token,
        form,
        errors,
        status: 400
      });
    }

    const result = await acceptTransfer({
      transfer: resolved.transfer,
      event,
      form,
      acceptedByUserId: req.session?.userId || null
    });

    return res.render('pages/transfer-result', {
      title: result.completed ? `Entry transferred - ${event.title}` : `Waiting for approval - ${event.title}`,
      event,
      heading: result.completed ? 'The entry is yours' : 'Sent to the organiser',
      message: result.completed
        ? 'The entry has been transferred to you. Keep the link below — it is how you reach your registration.'
        : 'Your details have been recorded. The organiser has to approve this transfer before the entry moves, and you will hear from them.',
      registration: result.registration || null,
      manageToken: result.manageToken || ''
    });
  } catch (error) {
    if (['TRANSFER_UNAVAILABLE', 'NOT_TRANSFERABLE', 'NOT_FOUND'].includes(error.code)) {
      return unavailable(res, error.message, 409);
    }
    logger.error('Transfer acceptance failed:', error);
    return next(error);
  }
});

module.exports = router;
