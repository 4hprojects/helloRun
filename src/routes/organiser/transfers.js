// src/routes/organiser/transfers.js
// The organiser's side of a transfer: start one, see what is pending, approve or decline.
//
// protectEventRead/Mutation rather than the onsite guards, for the same reason promoting
// from a waitlist is: replacing who holds an entry is a decision about who is in the event,
// not a race-day check-in job.

const express = require('express');
const router = express.Router();
const Event = require('../../models/Event');
const Registration = require('../../models/Registration');
const RegistrationTransfer = require('../../models/RegistrationTransfer');
const logger = require('../../utils/logger');
const { createRateLimiter } = require('../../middleware/rate-limit.middleware');
const { protectEventRead, protectEventMutation } = require('./event-route-protection');
const {
  initiateTransfer,
  sendTransferInvite,
  completeTransfer,
  resolveWithout,
  listTransfersForEvent,
  getTransferBlock
} = require('../../services/registration-transfer.service');

// Each initiation sends an email against a shared daily allowance.
const transferActionLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  maxRequests: 30,
  message: 'Too many transfer actions. Please wait a few minutes and try again.'
});

router.get('/events/:eventId/transfers', protectEventRead, async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.eventId)
      .select('title slug transfersEnabled transferDeadlineAt transferRequiresApproval registrationCloseAt eventStartAt')
      .lean();
    if (!event) {
      return res.status(404).render('error', {
        title: '404 - Event Not Found',
        status: 404,
        message: 'Event not found.'
      });
    }

    const transfers = await listTransfersForEvent(event._id);
    return res.render('organizer/event-transfers', {
      title: `Transfers — ${event.title}`,
      event,
      eventId: String(event._id),
      transfers,
      block: getTransferBlock(event)
    });
  } catch (error) {
    return next(error);
  }
});

// Start a transfer on a participant's behalf.
router.post(
  '/events/:eventId/transfers',
  protectEventMutation,
  transferActionLimiter,
  async (req, res, next) => {
    try {
      const event = await Event.findById(req.params.eventId).lean();
      if (!event) return res.status(404).json({ success: false, error: 'Event not found.' });

      const registration = await Registration.findOne({
        _id: String(req.body.registrationId || ''),
        eventId: event._id
      }).exec();
      if (!registration) {
        return res.status(404).json({ success: false, error: 'Registration not found for this event.' });
      }

      const { transfer, token } = await initiateTransfer({
        event,
        registration,
        toEmail: req.body.toEmail,
        reason: req.body.reason,
        initiatedByUserId: req.session?.userId || null
      });

      try {
        await sendTransferInvite({ event, transfer, token });
      } catch (error) {
        // An invite nobody received leaves the registration blocked by the unique index
        // with no way for anyone to act, so undo it rather than leaving it pending.
        await resolveWithout(transfer, 'cancelled', { reason: 'Invite email could not be sent.' });
        logger.error(`[Transfer] Invite email failed for ${transfer._id}: ${error.message}`);
        return res.status(502).json({
          success: false,
          error: 'The invite email could not be sent, so the transfer was cancelled. Try again.'
        });
      }

      return res.json({
        success: true,
        message: `Invite sent to ${transfer.toEmail}.`,
        transferId: String(transfer._id)
      });
    } catch (error) {
      const known = [
        'TRANSFER_UNAVAILABLE',
        'NOT_TRANSFERABLE',
        'INVALID_RECIPIENT',
        'RECIPIENT_REGISTERED',
        'TRANSFER_IN_PROGRESS'
      ];
      if (known.includes(error.code)) {
        return res.status(409).json({ success: false, error: error.message, reason: error.code });
      }
      logger.error('Transfer initiation failed:', error);
      return next(error);
    }
  }
);

router.post(
  '/events/:eventId/transfers/:transferId/approve',
  protectEventMutation,
  transferActionLimiter,
  async (req, res, next) => {
    try {
      const event = await Event.findById(req.params.eventId).lean();
      if (!event) return res.status(404).json({ success: false, error: 'Event not found.' });

      const transfer = await RegistrationTransfer.findOne({
        _id: req.params.transferId,
        eventId: event._id
      }).exec();
      if (!transfer) return res.status(404).json({ success: false, error: 'Transfer not found.' });

      // Only a transfer the recipient has actually accepted can be approved — approving
      // one that is still pending would move the entry to somebody who never signed.
      if (transfer.status !== 'pending_approval') {
        return res.status(409).json({
          success: false,
          error: 'That transfer is not waiting for approval.'
        });
      }

      // No form is passed: completeTransfer reads what the recipient actually supplied off
      // the transfer record. Synthesising one here wiped their emergency contact and stored
      // a waiver signature they never typed.
      const result = await completeTransfer({
        transfer,
        event,
        approvedByUserId: req.session?.userId || null
      });

      return res.json({
        success: true,
        message: `Entry transferred to ${result.registration.participant.email}.`
      });
    } catch (error) {
      if (['TRANSFER_UNAVAILABLE', 'NOT_TRANSFERABLE', 'NOT_FOUND'].includes(error.code)) {
        return res.status(409).json({ success: false, error: error.message });
      }
      logger.error('Transfer approval failed:', error);
      return next(error);
    }
  }
);

router.post(
  '/events/:eventId/transfers/:transferId/decline',
  protectEventMutation,
  transferActionLimiter,
  async (req, res, next) => {
    try {
      const transfer = await RegistrationTransfer.findOne({
        _id: req.params.transferId,
        eventId: req.params.eventId
      }).exec();
      if (!transfer) return res.status(404).json({ success: false, error: 'Transfer not found.' });
      if (!['pending_recipient', 'pending_approval'].includes(transfer.status)) {
        return res.status(409).json({ success: false, error: 'That transfer is already resolved.' });
      }

      await resolveWithout(transfer, 'declined', {
        reason: req.body.reason,
        actedByUserId: req.session?.userId || null
      });
      return res.json({ success: true, message: 'Transfer declined.' });
    } catch (error) {
      logger.error('Transfer decline failed:', error);
      return next(error);
    }
  }
);

module.exports = router;
