// src/services/event-staff.service.js
// Event-scoped race-day staff.
//
// Until this existed, checking runners in required the organiser's own login on the
// organiser's own phone — the first thing a pilot organiser with volunteers hits.

const mongoose = require('mongoose');
const EventStaff = require('../models/EventStaff');
const User = require('../models/User');
const { STAFF_PERMISSIONS } = require('../models/EventStaff');

function normalisePermissions(input) {
  const requested = Array.isArray(input) ? input : [input];
  const cleaned = requested
    .map((value) => String(value || '').trim())
    .filter((value) => STAFF_PERMISSIONS.includes(value));
  return [...new Set(cleaned)];
}

/**
 * Live permissions a user holds on an event. Empty when they hold none.
 * Revoked assignments grant nothing.
 */
async function getStaffPermissions(eventId, userId) {
  if (!mongoose.Types.ObjectId.isValid(String(eventId || ''))) return [];
  if (!mongoose.Types.ObjectId.isValid(String(userId || ''))) return [];

  const assignment = await EventStaff.findOne({
    eventId,
    userId,
    revokedAt: null
  })
    .select('permissions')
    .lean();

  return assignment?.permissions || [];
}

/**
 * Assign or update a staff member by email.
 *
 * By email rather than by user id because an organiser knows their volunteers' emails,
 * not their database ids. The account must already exist — this grants access, it does
 * not create accounts.
 */
async function assignStaffByEmail({ eventId, email, permissions, assignedBy }) {
  const normalisedEmail = String(email || '').trim().toLowerCase();
  if (!normalisedEmail) {
    throw new Error('Enter the email address of the person to add.');
  }

  const cleanPermissions = normalisePermissions(permissions);
  if (cleanPermissions.length === 0) {
    throw new Error('Choose at least one thing this person may do.');
  }

  const user = await User.findOne({ email: normalisedEmail }).select('_id firstName lastName email').lean();
  if (!user) {
    throw new Error('No HelloRun account uses that email address. Ask them to sign up first.');
  }

  if (String(user._id) === String(assignedBy)) {
    throw new Error('You already have full access to this event.');
  }

  const assignment = await EventStaff.findOneAndUpdate(
    { eventId, userId: user._id },
    {
      $set: {
        permissions: cleanPermissions,
        assignedBy,
        assignedAt: new Date(),
        // Re-adding someone previously removed reinstates them rather than failing on
        // the unique index.
        revokedAt: null,
        revokedBy: null
      }
    },
    { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
  ).lean();

  return { assignment, user };
}

async function revokeStaff({ eventId, staffId, revokedBy }) {
  const assignment = await EventStaff.findOneAndUpdate(
    { _id: staffId, eventId, revokedAt: null },
    { $set: { revokedAt: new Date(), revokedBy } },
    { new: true }
  ).lean();

  if (!assignment) {
    throw new Error('That staff assignment was not found, or is already removed.');
  }
  return assignment;
}

/**
 * Current staff for an event, newest first, with the person's name resolved.
 */
async function listEventStaff(eventId) {
  const assignments = await EventStaff.find({ eventId, revokedAt: null })
    .sort({ assignedAt: -1 })
    .populate('userId', 'firstName lastName email')
    .lean();

  return assignments.map((assignment) => ({
    id: String(assignment._id),
    permissions: assignment.permissions || [],
    assignedAt: assignment.assignedAt,
    name:
      [assignment.userId?.firstName, assignment.userId?.lastName].filter(Boolean).join(' ') ||
      'Unnamed account',
    email: assignment.userId?.email || ''
  }));
}

module.exports = {
  getStaffPermissions,
  assignStaffByEmail,
  revokeStaff,
  listEventStaff,
  normalisePermissions,
  STAFF_PERMISSIONS
};
