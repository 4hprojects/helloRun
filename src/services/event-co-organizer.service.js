'use strict';

const mongoose = require('mongoose');
const Event = require('../models/Event');
const EventCoOrganizer = require('../models/EventCoOrganizer');
const User = require('../models/User');
const { generateToken, hashToken } = require('./token.service');
const { createNotificationSafe } = require('./notification.service');
const {
  recordCriticalAuditEvent,
  recordCriticalAuditEventInBackground
} = require('./critical-audit.service');
const communicationService = require('./communication.service');

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const USER_FACING_ERRORS = new Set([
  'Event not found.',
  'Only the primary event owner can manage co-organizers.',
  'No HelloRun account uses that email address. Ask them to sign up first.',
  'The invited account must be active and email verified.',
  'That account already owns this event.',
  'That account is already a co-organizer.',
  'An active invitation already exists for that account.',
  'Co-organizer record not found.',
  'Only pending invitations can be cancelled.',
  'Only active co-organizers can be revoked.',
  'Only pending invitations can be resent.',
  'The invited account is no longer eligible.',
  'The invited account email has changed. Cancel this invitation and invite the current address.'
]);

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function isActiveAccount(user) {
  const status = String(user?.accountStatus || '').trim();
  return Boolean(user) && (!status || status === 'active');
}

async function requireOwner(eventId, actorId, actorRole = '') {
  const event = await Event.findOne({ _id: eventId, isDeleted: { $ne: true } }).lean();
  if (!event) throw new Error('Event not found.');
  if (actorRole !== 'admin' && String(event.organizerId || '') !== String(actorId || '')) {
    const error = new Error('Only the primary event owner can manage co-organizers.');
    error.code = 'OWNER_REQUIRED';
    throw error;
  }
  return event;
}

async function inviteCoOrganizer({ eventId, email, invitedBy, actorRole = '', now = new Date(), send = true, awaitAudit = false }) {
  const event = await requireOwner(eventId, invitedBy, actorRole);
  const invitedEmail = normalizeEmail(email);
  const user = await User.findOne({ email: invitedEmail })
    .select('_id email firstName lastName emailVerified accountStatus')
    .lean();
  if (!user) throw new Error('No HelloRun account uses that email address. Ask them to sign up first.');
  if (!user.emailVerified || !isActiveAccount(user)) {
    throw new Error('The invited account must be active and email verified.');
  }
  if (String(user._id) === String(event.organizerId)) throw new Error('That account already owns this event.');

  const existing = await EventCoOrganizer.findOne({ eventId, userId: user._id }).select('+tokenHash');
  if (existing?.status === 'active') throw new Error('That account is already a co-organizer.');
  if (existing?.status === 'pending' && existing.expiresAt && existing.expiresAt > now) {
    throw new Error('An active invitation already exists for that account.');
  }

  const token = generateToken(32);
  const values = {
    invitedEmail,
    status: 'pending',
    tokenHash: hashToken(token),
    expiresAt: new Date(now.getTime() + INVITE_TTL_MS),
    invitedBy,
    invitedAt: now,
    acceptedAt: null,
    declinedAt: null,
    cancelledAt: null,
    cancelledBy: null,
    revokedAt: null,
    revokedBy: null
  };
  const membership = existing || new EventCoOrganizer({ eventId, userId: user._id });
  membership.set(values);
  await membership.save();

  if (send) await sendCoOrganizerInvite({ event, membership, user, token });
  let auditRecorded = null;
  let auditError = null;
  if (awaitAudit) {
    try {
      await writeAudit('event.co_organizer_invited', event, invitedBy, membership, user._id);
      auditRecorded = true;
    } catch (error) {
      auditRecorded = false;
      auditError = error;
    }
  } else {
    audit('event.co_organizer_invited', event, invitedBy, membership, user._id);
  }
  return { event, membership, user, token, auditRecorded, auditError };
}

async function resolveInvitation(rawToken) {
  const token = String(rawToken || '').trim();
  if (!/^[a-f0-9]{64}$/i.test(token)) return { ok: false, reason: 'invalid' };
  const membership = await EventCoOrganizer.findOne({ tokenHash: hashToken(token) }).select('+tokenHash');
  if (!membership) return { ok: false, reason: 'invalid' };
  if (membership.status !== 'pending') return { ok: false, reason: membership.status };
  if (!membership.expiresAt || membership.expiresAt <= new Date()) {
    membership.status = 'expired';
    membership.tokenHash = '';
    await membership.save();
    return { ok: false, reason: 'expired' };
  }
  return { ok: true, membership };
}

async function resolveAccountInvitation({ membershipId, user, now = new Date() }) {
  if (!mongoose.Types.ObjectId.isValid(String(membershipId || ''))) return { ok: false, reason: 'invalid' };
  const membership = await EventCoOrganizer.findById(membershipId).select('+tokenHash');
  if (!membership) return { ok: false, reason: 'invalid' };
  if (membership.status !== 'pending') return { ok: false, reason: membership.status };
  if (!membership.expiresAt || membership.expiresAt <= now) {
    membership.status = 'expired';
    membership.tokenHash = '';
    await membership.save();
    return { ok: false, reason: 'expired' };
  }
  if (!user || String(user._id) !== String(membership.userId) || normalizeEmail(user.email) !== membership.invitedEmail) {
    return { ok: false, reason: 'account_mismatch' };
  }
  if (!user.emailVerified || !isActiveAccount(user)) return { ok: false, reason: 'account_ineligible' };
  const event = await Event.findById(membership.eventId).lean();
  if (!event || event.isDeleted) return { ok: false, reason: 'event_unavailable' };
  return { ok: true, membership, event };
}

async function respondToInvitation({ token, user, decision }) {
  const resolved = await resolveInvitation(token);
  if (!resolved.ok) return resolved;
  const membership = resolved.membership;
  if (!user || String(user._id) !== String(membership.userId) || normalizeEmail(user.email) !== membership.invitedEmail) {
    return { ok: false, reason: 'account_mismatch' };
  }
  if (!user.emailVerified || !isActiveAccount(user)) {
    return { ok: false, reason: 'account_ineligible' };
  }
  const event = await Event.findById(membership.eventId).lean();
  if (!event || event.isDeleted) return { ok: false, reason: 'event_unavailable' };
  const now = new Date();
  const updatedMembership = await EventCoOrganizer.findOneAndUpdate({
    _id: membership._id,
    tokenHash: hashToken(String(token || '').trim()),
    status: 'pending',
    expiresAt: { $gt: now },
    userId: user._id,
    invitedEmail: normalizeEmail(user.email)
  }, {
    $set: {
      status: decision === 'accept' ? 'active' : 'declined',
      acceptedAt: decision === 'accept' ? now : null,
      declinedAt: decision === 'decline' ? now : null,
      tokenHash: ''
    }
  }, { new: true });
  if (!updatedMembership) return { ok: false, reason: 'used' };
  audit(`event.co_organizer_${decision === 'accept' ? 'accepted' : 'declined'}`, event, user._id, updatedMembership, user._id);
  return { ok: true, membership: updatedMembership, event };
}

async function respondToAccountInvitation({ membershipId, user, decision }) {
  const resolved = await resolveAccountInvitation({ membershipId, user });
  if (!resolved.ok) return resolved;
  const now = new Date();
  const membership = resolved.membership;
  const updatedMembership = await EventCoOrganizer.findOneAndUpdate({
    _id: membership._id,
    status: 'pending',
    expiresAt: { $gt: now },
    userId: user._id,
    invitedEmail: normalizeEmail(user.email)
  }, {
    $set: {
      status: decision === 'accept' ? 'active' : 'declined',
      acceptedAt: decision === 'accept' ? now : null,
      declinedAt: decision === 'decline' ? now : null,
      tokenHash: ''
    }
  }, { new: true });
  if (!updatedMembership) return { ok: false, reason: 'used' };
  audit(`event.co_organizer_${decision === 'accept' ? 'accepted' : 'declined'}`, resolved.event, user._id, updatedMembership, user._id);
  return { ok: true, membership: updatedMembership, event: resolved.event };
}

async function cancelOrRevoke({ eventId, membershipId, actorId, actorRole = '', action }) {
  const event = await requireOwner(eventId, actorId, actorRole);
  const membership = await EventCoOrganizer.findOne({ _id: membershipId, eventId }).select('+tokenHash');
  if (!membership) throw new Error('Co-organizer record not found.');
  const now = new Date();
  if (action === 'cancel' && membership.status !== 'pending') throw new Error('Only pending invitations can be cancelled.');
  if (action === 'revoke' && membership.status !== 'active') throw new Error('Only active co-organizers can be revoked.');
  membership.status = action === 'cancel' ? 'cancelled' : 'revoked';
  membership.tokenHash = '';
  if (action === 'cancel') { membership.cancelledAt = now; membership.cancelledBy = actorId; }
  else { membership.revokedAt = now; membership.revokedBy = actorId; }
  await membership.save();
  audit(`event.co_organizer_${action === 'cancel' ? 'cancelled' : 'revoked'}`, event, actorId, membership, membership.userId);
  if (action === 'revoke') {
    await createNotificationSafe({
      userId: membership.userId,
      type: 'event_co_organizer_revoked',
      title: 'Co-organizer access removed',
      message: `Your co-organizer access to ${event.title} has been removed.`,
      href: `/events/${event.slug}`,
      dedupeKey: `event-co-organizer-revoked-${membership._id}-${membership.updatedAt?.getTime?.() || Date.now()}`
    }, 'co-organizer revocation notification');
  }
  return membership;
}

async function resendInvitation({ eventId, membershipId, actorId, actorRole = '', now = new Date() }) {
  const event = await requireOwner(eventId, actorId, actorRole);
  const membership = await EventCoOrganizer.findOne({ _id: membershipId, eventId }).select('+tokenHash');
  if (!membership || membership.status !== 'pending') throw new Error('Only pending invitations can be resent.');
  const user = await User.findById(membership.userId).select('_id email firstName lastName emailVerified accountStatus').lean();
  if (!user || !user.emailVerified || !isActiveAccount(user)) throw new Error('The invited account is no longer eligible.');
  if (normalizeEmail(user.email) !== membership.invitedEmail) throw new Error('The invited account email has changed. Cancel this invitation and invite the current address.');
  const token = generateToken(32);
  membership.tokenHash = hashToken(token);
  membership.expiresAt = new Date(now.getTime() + INVITE_TTL_MS);
  membership.invitedAt = now;
  membership.invitedBy = actorId;
  await membership.save();
  await sendCoOrganizerInvite({ event, membership, user, token });
  audit('event.co_organizer_invitation_resent', event, actorId, membership, user._id);
  return membership;
}

async function listCoOrganizers(eventId) {
  const rows = await EventCoOrganizer.find({ eventId })
    .sort({ status: 1, invitedAt: -1 })
    .populate('userId', 'firstName lastName email')
    .lean();
  return rows.map((row) => ({
    ...row,
    id: String(row._id),
    name: [row.userId?.firstName, row.userId?.lastName].filter(Boolean).join(' ') || 'Unnamed account',
    email: row.userId?.email || row.invitedEmail
  }));
}

async function listEventTeamSummary(eventId, { now = new Date() } = {}) {
  const rows = await EventCoOrganizer.find({
    eventId,
    $or: [
      { status: 'active' },
      { status: 'pending', expiresAt: { $gt: now } }
    ]
  })
    .sort({ status: 1, acceptedAt: 1, invitedAt: 1, _id: 1 })
    .populate('userId', 'firstName lastName email displayName accountStatus')
    .lean();
  return rows
    .filter((row) => isActiveAccount(row.userId))
    .map((row) => ({
      id: String(row._id),
      userId: String(row.userId._id),
      name: row.userId.displayName || [row.userId.firstName, row.userId.lastName].filter(Boolean).join(' ') || 'Unnamed account',
      email: row.userId.email || row.invitedEmail,
      status: row.status,
      expiresAt: row.status === 'pending' ? row.expiresAt : null
    }));
}

function getCoOrganizerErrorMessage(error) {
  const message = String(error?.message || '');
  return USER_FACING_ERRORS.has(message)
    ? message
    : 'Unable to update the event team. Please try again.';
}

async function listPublicCoOrganizers(eventId) {
  const rows = await EventCoOrganizer.find({ eventId, status: 'active' })
    .sort({ acceptedAt: 1, _id: 1 })
    .populate('userId', 'firstName lastName displayName accountStatus')
    .lean();
  return rows
    .filter((row) => isActiveAccount(row.userId))
    .map((row) => row.userId.displayName || [row.userId.firstName, row.userId.lastName].filter(Boolean).join(' '))
    .filter(Boolean);
}

async function sendCoOrganizerInvite({ event, membership, user, token }) {
  const baseUrl = String(process.env.APP_URL || 'https://hellorun.online').replace(/\/$/, '');
  const invitationUrl = `${baseUrl}/organizer/co-organizer-invitations/${token}`;
  await communicationService.notify('event.co_organizer_invited', {
    notification: {
      userId: user._id,
      type: 'event_co_organizer_invited',
      title: 'Co-organizer invitation',
      message: `You were invited to help manage ${event.title}.`,
      // This authenticated route uses the membership id, never the raw email token.
      href: `/organizer/co-organizer-invitations/account/${membership._id}`,
      dedupeKey: `event-co-organizer-invite-${membership._id}-${membership.invitedAt.getTime()}`,
      metadata: { eventId: String(event._id), membershipId: String(membership._id) }
    },
    email: {
      to: user.email,
      firstName: user.firstName || '',
      eventTitle: event.title,
      invitationUrl,
      expiresAt: membership.expiresAt.toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' }),
      metadata: { eventId: String(event._id), membershipId: String(membership._id) }
    }
  });
}

function buildAuditInput(action, event, actorMongoUserId, membership, targetUserId) {
  return {
    action,
    actorMongoUserId,
    targetType: 'event',
    targetId: String(event._id),
    notes: JSON.stringify({ membershipId: String(membership._id), targetUserId: String(targetUserId) }),
    idempotencyKey: `event-co-organizer:${action}:${membership._id}`
  };
}

function audit(action, event, actorMongoUserId, membership, targetUserId) {
  recordCriticalAuditEventInBackground(buildAuditInput(action, event, actorMongoUserId, membership, targetUserId));
}

function writeAudit(action, event, actorMongoUserId, membership, targetUserId) {
  return recordCriticalAuditEvent(buildAuditInput(action, event, actorMongoUserId, membership, targetUserId));
}

module.exports = {
  INVITE_TTL_MS,
  normalizeEmail,
  isActiveAccount,
  inviteCoOrganizer,
  resolveInvitation,
  resolveAccountInvitation,
  respondToInvitation,
  respondToAccountInvitation,
  cancelOrRevoke,
  resendInvitation,
  listCoOrganizers,
  listEventTeamSummary,
  listPublicCoOrganizers,
  getCoOrganizerErrorMessage,
  requireOwner
};
