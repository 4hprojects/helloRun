'use strict';

require('dotenv').config();

const mongoose = require('mongoose');
const Event = require('../models/Event');
const EventCoOrganizer = require('../models/EventCoOrganizer');
const User = require('../models/User');
const { inviteCoOrganizer } = require('../services/event-co-organizer.service');

const EVENT_SLUG = 'cns-move-more-challenge-2026';
const INVITEE_EMAIL = 'a.baniaga@bsu.edu.ph';
const APPLY = process.argv.includes('--apply');

async function main() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required.');
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });

  const [event, user] = await Promise.all([
    Event.findOne({ slug: EVENT_SLUG, isDeleted: { $ne: true } }).select('_id slug title organizerId').lean(),
    User.findOne({ email: INVITEE_EMAIL }).select('_id email firstName lastName role emailVerified accountStatus').lean()
  ]);
  if (!event) throw new Error(`Event not found: ${EVENT_SLUG}`);
  if (!user) throw new Error(`User not found: ${INVITEE_EMAIL}`);
  if (!user.emailVerified || user.accountStatus !== 'active') throw new Error('Invitee must be active and email verified.');

  const existing = await EventCoOrganizer.findOne({ eventId: event._id, userId: user._id }).lean();
  const noActionNeeded = existing?.status === 'active' || (existing?.status === 'pending' && existing.expiresAt > new Date());

  if (!APPLY || noActionNeeded) {
    console.log(JSON.stringify({
      mode: APPLY ? 'apply' : 'dry-run',
      event: event.slug,
      invitee: { email: user.email, name: [user.firstName, user.lastName].filter(Boolean).join(' '), role: user.role },
      currentStatus: existing?.status || 'not_invited',
      action: noActionNeeded ? 'none' : 'create_invitation',
      mutationApplied: false
    }, null, 2));
    return;
  }

  const result = await inviteCoOrganizer({
    eventId: event._id,
    email: user.email,
    invitedBy: event.organizerId,
    now: new Date(),
    send: true,
    awaitAudit: true
  });
  console.log(JSON.stringify({
    mode: 'apply',
    event: event.slug,
    invitee: user.email,
    invitationId: String(result.membership._id),
    status: result.membership.status,
    expiresAt: result.membership.expiresAt,
    auditRecorded: result.auditRecorded,
    auditWarning: result.auditError ? 'The invitation is recorded, but the external critical-audit store was unavailable.' : null,
    mutationApplied: true
  }, null, 2));
}

if (require.main === module) {
  main()
    .catch((error) => { console.error(error?.stack || error); process.exitCode = 1; })
    .finally(async () => { if (mongoose.connection.readyState !== 0) await mongoose.disconnect(); });
}

module.exports = { EVENT_SLUG, INVITEE_EMAIL };
