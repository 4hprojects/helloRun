'use strict';

const mongoose = require('mongoose');
const Event = require('../models/Event');
const EventCoOrganizer = require('../models/EventCoOrganizer');

function validId(value) {
  return mongoose.Types.ObjectId.isValid(String(value || ''));
}

async function getActiveCoOrganizerEventIds(userId) {
  if (!validId(userId)) return [];
  const rows = await EventCoOrganizer.find({ userId, status: 'active' }).select('eventId').lean();
  return rows.map((row) => row.eventId);
}

async function hasOrganizerWorkspaceAccess(user) {
  if (!user || ['suspended', 'closed', 'restricted'].includes(String(user.accountStatus || ''))) return false;
  if (user.role === 'admin' || user.role === 'organiser') return true;
  return Boolean(await EventCoOrganizer.exists({ userId: user._id, status: 'active' }));
}

async function resolveEventAccess({ eventId, userId, userRole = '' }) {
  if (!validId(eventId) || !validId(userId)) return null;
  const event = await Event.findOne({ _id: eventId, isDeleted: { $ne: true } });
  if (!event) return null;
  if (userRole === 'admin') return { event, level: 'admin', canManageTeam: true, canArchiveOrDelete: true };
  if (String(event.organizerId || '') === String(userId)) {
    return { event, level: 'owner', canManageTeam: true, canArchiveOrDelete: true };
  }
  const membership = await EventCoOrganizer.findOne({ eventId: event._id, userId, status: 'active' }).lean();
  if (!membership) return null;
  return { event, membership, level: 'co_organizer', canManageTeam: false, canArchiveOrDelete: false };
}

async function getAccessibleEvent(eventId, user) {
  const access = await resolveEventAccess({ eventId, userId: user?._id, userRole: user?.role });
  return access?.event || null;
}

async function getAccessibleEventIdQuery(user) {
  if (!user?._id) return { _id: null };
  if (user.role === 'admin') return {};
  const assignedIds = await getActiveCoOrganizerEventIds(user._id);
  return { $or: [{ organizerId: user._id }, { _id: { $in: assignedIds } }] };
}

module.exports = {
  getActiveCoOrganizerEventIds,
  hasOrganizerWorkspaceAccess,
  resolveEventAccess,
  getAccessibleEvent,
  getAccessibleEventIdQuery
};
