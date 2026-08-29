'use strict';

const express = require('express');
const router = express.Router();
const Event = require('../../models/Event');
const User = require('../../models/User');
const { requireAuth } = require('../../middleware/auth.middleware');
const { requireCsrfProtection } = require('../../middleware/csrf.middleware');
const { createRateLimiter } = require('../../middleware/rate-limit.middleware');
const { resolveEventAccess } = require('../../services/event-access.service');
const {
  inviteCoOrganizer,
  resolveInvitation,
  respondToInvitation,
  cancelOrRevoke,
  resendInvitation,
  listCoOrganizers
} = require('../../services/event-co-organizer.service');

const limiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  maxRequests: 20,
  message: 'Too many co-organizer changes. Please wait a few minutes and try again.'
});

async function ownerAccess(req, res, next) {
  try {
    const user = await User.findById(req.session?.userId).select('_id role').lean();
    const access = await resolveEventAccess({ eventId: req.params.eventId, userId: user?._id, userRole: user?.role });
    if (!access) return res.status(404).render('error', { title: 'Event not found', status: 404, message: 'Event not found or inaccessible.' });
    if (!access.canManageTeam) return res.status(403).render('error', { title: 'Owner access required', status: 403, message: 'Only the primary event owner can manage co-organizers.' });
    req.eventAccess = access;
    req.user = user;
    return next();
  } catch (error) { return next(error); }
}

router.get('/events/:eventId/co-organizers', requireAuth, ownerAccess, async (req, res, next) => {
  try {
    return res.render('organizer/event-co-organizers', {
      title: `Co-organizers — ${req.eventAccess.event.title}`,
      event: req.eventAccess.event,
      eventId: String(req.eventAccess.event._id),
      members: await listCoOrganizers(req.eventAccess.event._id),
      message: req.query.msg ? { type: req.query.type === 'error' ? 'error' : 'success', text: String(req.query.msg).slice(0, 240) } : null
    });
  } catch (error) { return next(error); }
});

router.post('/events/:eventId/co-organizers', requireAuth, requireCsrfProtection, ownerAccess, limiter, async (req, res) => {
  const base = `/organizer/events/${req.params.eventId}/co-organizers`;
  try {
    const result = await inviteCoOrganizer({ eventId: req.params.eventId, email: req.body.email, invitedBy: req.user._id, actorRole: req.user.role });
    const name = [result.user.firstName, result.user.lastName].filter(Boolean).join(' ') || result.user.email;
    return res.redirect(`${base}?msg=${encodeURIComponent(`Invitation sent to ${name}.`)}`);
  } catch (error) {
    return res.redirect(`${base}?type=error&msg=${encodeURIComponent(error.message)}`);
  }
});

router.post('/events/:eventId/co-organizers/:membershipId/:action', requireAuth, requireCsrfProtection, ownerAccess, limiter, async (req, res) => {
  const base = `/organizer/events/${req.params.eventId}/co-organizers`;
  const action = req.params.action;
  if (!['cancel', 'revoke', 'resend'].includes(action)) return res.status(400).send('Invalid action.');
  try {
    if (action === 'resend') {
      await resendInvitation({ eventId: req.params.eventId, membershipId: req.params.membershipId, actorId: req.user._id, actorRole: req.user.role });
    } else {
      await cancelOrRevoke({ eventId: req.params.eventId, membershipId: req.params.membershipId, actorId: req.user._id, actorRole: req.user.role, action });
    }
    const success = action === 'cancel' ? 'Invitation cancelled.' : action === 'resend' ? 'Invitation resent.' : 'Co-organizer access removed.';
    return res.redirect(`${base}?msg=${encodeURIComponent(success)}`);
  } catch (error) {
    return res.redirect(`${base}?type=error&msg=${encodeURIComponent(error.message)}`);
  }
});

router.get('/co-organizer-invitations/:token', requireAuth, async (req, res, next) => {
  try {
    const resolved = await resolveInvitation(req.params.token);
    const user = await User.findById(req.session.userId).select('_id email firstName lastName emailVerified accountStatus').lean();
    const event = resolved.ok ? await Event.findById(resolved.membership.eventId).select('title slug organiserName').lean() : null;
    return res.render('organizer/co-organizer-invitation', {
      title: 'Co-organizer invitation',
      token: req.params.token,
      resolved,
      event,
      accountMatches: Boolean(resolved.ok && String(resolved.membership.userId) === String(user?._id) && resolved.membership.invitedEmail === String(user?.email || '').toLowerCase()),
      accountEligible: Boolean(user?.emailVerified && user?.accountStatus === 'active')
    });
  } catch (error) { return next(error); }
});

router.post('/co-organizer-invitations/:token', requireAuth, requireCsrfProtection, limiter, async (req, res, next) => {
  try {
    const user = await User.findById(req.session.userId).select('_id email firstName lastName role emailVerified accountStatus').lean();
    const decision = req.body.decision === 'decline' ? 'decline' : 'accept';
    const result = await respondToInvitation({ token: req.params.token, user, decision });
    if (!result.ok) {
      const forbidden = ['account_mismatch', 'account_ineligible'].includes(result.reason);
      const message = result.reason === 'account_mismatch'
        ? 'Sign in with the account that received this invitation.'
        : result.reason === 'account_ineligible'
          ? 'Your account must be active and email verified before accepting this invitation.'
          : 'This invitation is no longer available.';
      return res.status(forbidden ? 403 : 400).render('error', {
        title: 'Invitation unavailable',
        status: forbidden ? 403 : 400,
        message
      });
    }
    if (decision === 'decline') return res.redirect(`/runner/dashboard?type=success&msg=${encodeURIComponent('Invitation declined.')}`);
    req.session.activeWorkspace = 'organizer';
    return req.session.save((error) => error ? next(error) : res.redirect(`/organizer/events/${result.event._id}?type=success&msg=${encodeURIComponent('Co-organizer invitation accepted.')}`));
  } catch (error) { return next(error); }
});

module.exports = router;
