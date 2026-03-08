const mongoose = require('mongoose');
const Notification = require('../models/Notification');

async function createNotification(payload = {}) {
  const userId = normalizeObjectId(payload.userId);
  if (!userId) {
    throw new Error('Notification userId is required.');
  }

  const type = String(payload.type || '').trim().slice(0, 80);
  const title = String(payload.title || '').trim().slice(0, 160);
  const message = String(payload.message || '').trim().slice(0, 600);
  const href = String(payload.href || '').trim().slice(0, 300);

  if (!type) throw new Error('Notification type is required.');
  if (!title) throw new Error('Notification title is required.');
  if (!message) throw new Error('Notification message is required.');

  return Notification.create({
    userId: new mongoose.Types.ObjectId(userId),
    type,
    title,
    message,
    href,
    metadata: payload.metadata && typeof payload.metadata === 'object' ? payload.metadata : {}
  });
}

async function createNotificationSafe(payload = {}, context = 'notification') {
  try {
    return await createNotification(payload);
  } catch (error) {
    console.error(`Failed to create ${context}:`, error.message);
    return null;
  }
}

async function getUserNotifications(userId, options = {}) {
  const normalizedUserId = normalizeObjectId(userId);
  if (!normalizedUserId) {
    return {
      items: [],
      unreadCount: 0,
      page: 1,
      totalPages: 1,
      totalItems: 0
    };
  }

  const page = clampInt(options.page, 1, 500, 1);
  const limit = clampInt(options.limit, 1, 100, 20);
  const unreadOnly = options.unreadOnly === true;

  const query = {
    userId: new mongoose.Types.ObjectId(normalizedUserId)
  };
  if (unreadOnly) {
    query.readAt = null;
  }

  const [totalItems, unreadCount] = await Promise.all([
    Notification.countDocuments(query),
    Notification.countDocuments({ userId: query.userId, readAt: null })
  ]);

  const totalPages = Math.max(1, Math.ceil(totalItems / limit));
  const currentPage = Math.min(page, totalPages);
  const skip = (currentPage - 1) * limit;

  const items = await Notification.find(query)
    .sort({ createdAt: -1, _id: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  return {
    items,
    unreadCount,
    page: currentPage,
    totalPages,
    totalItems
  };
}

async function countUnreadNotifications(userId) {
  const normalizedUserId = normalizeObjectId(userId);
  if (!normalizedUserId) return 0;
  return Notification.countDocuments({
    userId: new mongoose.Types.ObjectId(normalizedUserId),
    readAt: null
  });
}

async function markNotificationAsRead(userId, notificationId) {
  const normalizedUserId = normalizeObjectId(userId);
  const normalizedNotificationId = normalizeObjectId(notificationId);
  if (!normalizedUserId || !normalizedNotificationId) return { matched: false };

  const result = await Notification.updateOne(
    {
      _id: new mongoose.Types.ObjectId(normalizedNotificationId),
      userId: new mongoose.Types.ObjectId(normalizedUserId),
      readAt: null
    },
    {
      $set: { readAt: new Date() }
    }
  );

  return { matched: result.matchedCount > 0 };
}

async function markAllNotificationsAsRead(userId) {
  const normalizedUserId = normalizeObjectId(userId);
  if (!normalizedUserId) return { modifiedCount: 0 };

  const result = await Notification.updateMany(
    {
      userId: new mongoose.Types.ObjectId(normalizedUserId),
      readAt: null
    },
    {
      $set: { readAt: new Date() }
    }
  );

  return { modifiedCount: Number(result.modifiedCount || 0) };
}

function normalizeObjectId(value) {
  const safe = String(value || '').trim();
  if (!mongoose.Types.ObjectId.isValid(safe)) return '';
  return safe;
}

function clampInt(value, min, max, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

module.exports = {
  createNotification,
  createNotificationSafe,
  getUserNotifications,
  countUnreadNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead
};
