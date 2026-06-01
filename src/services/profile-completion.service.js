const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const { createNotificationSafe } = require('./notification.service');

const PROFILE_NOTIFICATION_TYPE = 'profile_incomplete';
const PROFILE_NOTIFICATION_HREF = '/runner/profile?source=notification#overview';

const PROFILE_COMPLETENESS_FIELDS = [
  { key: 'firstName', label: 'First Name', section: 'identity' },
  { key: 'lastName', label: 'Last Name', section: 'identity' },
  { key: 'mobile', label: 'Mobile', section: 'contact' },
  { key: 'country', label: 'Country', section: 'contact' },
  { key: 'dateOfBirth', label: 'Date of Birth', section: 'identity' },
  { key: 'gender', label: 'Gender', section: 'identity' },
  { key: 'emergencyContactName', label: 'Emergency Contact Name', section: 'emergency' },
  { key: 'emergencyContactNumber', label: 'Emergency Contact Number', section: 'emergency' }
];

function getRunnerProfileCompleteness(user = {}) {
  const missing = PROFILE_COMPLETENESS_FIELDS
    .filter((item) => !String(user[item.key] || '').trim())
    .map((item) => item.label);
  const completedCount = PROFILE_COMPLETENESS_FIELDS.length - missing.length;

  return {
    requiredCount: PROFILE_COMPLETENESS_FIELDS.length,
    completedCount,
    percent: Math.round((completedCount / PROFILE_COMPLETENESS_FIELDS.length) * 100),
    missingFields: missing
  };
}

function isRunnerProfileIncomplete(user = {}) {
  if (!user || user.role !== 'runner') return false;
  return getRunnerProfileCompleteness(user).missingFields.length > 0;
}

async function ensureProfileCompletionNotification(user = {}) {
  if (!isRunnerProfileIncomplete(user) || !mongoose.Types.ObjectId.isValid(String(user._id || ''))) {
    return null;
  }

  const userId = new mongoose.Types.ObjectId(String(user._id));
  const existing = await Notification.findOne({
    userId,
    type: PROFILE_NOTIFICATION_TYPE,
    readAt: null
  }).lean();

  if (existing) return existing;

  return createNotificationSafe({
    userId,
    type: PROFILE_NOTIFICATION_TYPE,
    title: 'Complete your runner profile',
    message: 'Add your runner details so registrations, leaderboards, certificates, and emergency contact records are accurate.',
    href: PROFILE_NOTIFICATION_HREF,
    metadata: {
      source: user.authProvider === 'google' ? 'google_auth' : 'profile_check'
    }
  }, 'profile completion notification');
}

async function clearProfileCompletionNotifications(userId) {
  if (!mongoose.Types.ObjectId.isValid(String(userId || ''))) {
    return { modifiedCount: 0 };
  }

  const result = await Notification.updateMany(
    {
      userId: new mongoose.Types.ObjectId(String(userId)),
      type: PROFILE_NOTIFICATION_TYPE,
      readAt: null
    },
    {
      $set: { readAt: new Date() }
    }
  );

  return { modifiedCount: Number(result.modifiedCount || 0) };
}

async function syncProfileCompletionNotification(user = {}) {
  if (isRunnerProfileIncomplete(user)) {
    return ensureProfileCompletionNotification(user);
  }
  return clearProfileCompletionNotifications(user._id);
}

module.exports = {
  PROFILE_NOTIFICATION_TYPE,
  getRunnerProfileCompleteness,
  isRunnerProfileIncomplete,
  ensureProfileCompletionNotification,
  clearProfileCompletionNotifications,
  syncProfileCompletionNotification
};
