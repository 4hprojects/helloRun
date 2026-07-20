const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const logger = require('../utils/logger');

const NOTIFICATION_VIEWS = new Set(['all', 'unread', 'archived']);

const TYPE_PRESENTATION = [
  { match: /privacy_policy_updated/, category: 'Account and policy', icon: 'shield-user', tone: 'account', actionLabel: 'Review privacy policy' },
  { match: /cookie_policy_updated/, category: 'Account and policy', icon: 'cookie', tone: 'account', actionLabel: 'Review cookie policy' },
  { match: /refund_policy_updated/, category: 'Account and policy', icon: 'receipt-text', tone: 'account', actionLabel: 'Review refund policy' },
  { match: /community_guidelines_updated/, category: 'Account and policy', icon: 'users-round', tone: 'account', actionLabel: 'Review community guidelines' },
  { match: /organiser_terms_updated/, category: 'Account and policy', icon: 'clipboard-check', tone: 'account', actionLabel: 'Review organiser terms' },
  { match: /acceptable_use_policy_updated/, category: 'Account and policy', icon: 'shield-check', tone: 'account', actionLabel: 'Review acceptable use' },
  { match: /data_usage_policy_updated/, category: 'Account and policy', icon: 'database-zap', tone: 'account', actionLabel: 'Review data use' },
  { match: /terms_policy_updated/, category: 'Account and policy', icon: 'file-check-2', tone: 'account', actionLabel: 'Review terms' },
  { match: /blog_comment_reply/, category: 'Community', icon: 'message-circle-reply', tone: 'community', actionLabel: 'View reply' },
  { match: /running_group_reply/, category: 'Community', icon: 'message-circle-reply', tone: 'community', actionLabel: 'View reply' },
  { match: /running_group_announcement/, category: 'Community', icon: 'megaphone', tone: 'community', actionLabel: 'View announcement' },
  { match: /payment_rejected/, category: 'Payment', icon: 'credit-card', tone: 'attention', actionLabel: 'Fix payment' },
  { match: /result_rejected/, category: 'Activity review', icon: 'circle-alert', tone: 'attention', actionLabel: 'Fix entry' },
  { match: /certificate/, category: 'Recognition', icon: 'award', tone: 'recognition', actionLabel: 'Download certificate' },
  { match: /result_approved/, category: 'Activity review', icon: 'circle-check', tone: 'success', actionLabel: 'View result' },
  { match: /payment_(approved|proof_submitted)/, category: 'Payment', icon: 'credit-card', tone: 'progress', actionLabel: 'View registration' },
  { match: /registration/, category: 'Registration', icon: 'clipboard-check', tone: 'progress', actionLabel: 'View registration' },
  { match: /profile/, category: 'Account', icon: 'user-round', tone: 'account', actionLabel: 'Complete profile' },
  { match: /badge/, category: 'Achievement', icon: 'medal', tone: 'recognition', actionLabel: 'View achievements' },
  { match: /group/, category: 'Community', icon: 'users', tone: 'community', actionLabel: 'View group' }
];

async function createNotification(payload = {}) {
  const userId = normalizeObjectId(payload.userId);
  if (!userId) {
    throw new Error('Notification userId is required.');
  }

  const type = String(payload.type || '').trim().slice(0, 80);
  const title = String(payload.title || '').trim().slice(0, 160);
  const message = String(payload.message || '').trim().slice(0, 600);
  const href = String(payload.href || '').trim().slice(0, 300);
  const dedupeKey = String(payload.dedupeKey || '').trim().slice(0, 180);

  if (!type) throw new Error('Notification type is required.');
  if (!title) throw new Error('Notification title is required.');
  if (!message) throw new Error('Notification message is required.');

  return Notification.create({
    userId: new mongoose.Types.ObjectId(userId),
    type,
    title,
    message,
    href,
    dedupeKey,
    metadata: payload.metadata && typeof payload.metadata === 'object' ? payload.metadata : {}
  });
}

async function createNotificationSafe(payload = {}, context = 'notification') {
  try {
    return await createNotification(payload);
  } catch (error) {
    logger.error(`Failed to create ${context}:`, error.message);
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
  const view = options.unreadOnly === true ? 'unread' : normalizeNotificationView(options.view);

  const query = {
    userId: new mongoose.Types.ObjectId(normalizedUserId),
    archivedAt: view === 'archived' ? { $ne: null } : null
  };
  if (view === 'unread') {
    query.readAt = null;
  }

  const [totalItems, counts] = await Promise.all([
    Notification.countDocuments(query),
    getNotificationCounts(normalizedUserId)
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
    unreadCount: counts.unread,
    counts,
    view,
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
    archivedAt: null,
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
      archivedAt: null,
      readAt: null
    },
    {
      $set: { readAt: new Date() }
    }
  );
  if (result.matchedCount > 0) return { matched: true, modified: true };
  const existing = await Notification.exists({
    _id: new mongoose.Types.ObjectId(normalizedNotificationId),
    userId: new mongoose.Types.ObjectId(normalizedUserId),
    archivedAt: null
  });
  return { matched: Boolean(existing), modified: false };
}

async function markAllNotificationsAsRead(userId) {
  const normalizedUserId = normalizeObjectId(userId);
  if (!normalizedUserId) return { modifiedCount: 0 };

  const result = await Notification.updateMany(
    {
      userId: new mongoose.Types.ObjectId(normalizedUserId),
      archivedAt: null,
      readAt: null
    },
    {
      $set: { readAt: new Date() }
    }
  );

  return { modifiedCount: Number(result.modifiedCount || 0) };
}

async function archiveNotification(userId, notificationId) {
  const normalizedUserId = normalizeObjectId(userId);
  const normalizedNotificationId = normalizeObjectId(notificationId);
  if (!normalizedUserId || !normalizedNotificationId) return { matched: false };
  const now = new Date();
  const result = await Notification.updateOne(
    {
      _id: new mongoose.Types.ObjectId(normalizedNotificationId),
      userId: new mongoose.Types.ObjectId(normalizedUserId),
      archivedAt: null
    },
    [{ $set: { archivedAt: now, readAt: { $ifNull: ['$readAt', now] } } }]
  );
  return { matched: result.matchedCount > 0 };
}

async function restoreNotification(userId, notificationId) {
  const normalizedUserId = normalizeObjectId(userId);
  const normalizedNotificationId = normalizeObjectId(notificationId);
  if (!normalizedUserId || !normalizedNotificationId) return { matched: false };
  const result = await Notification.updateOne(
    {
      _id: new mongoose.Types.ObjectId(normalizedNotificationId),
      userId: new mongoose.Types.ObjectId(normalizedUserId),
      archivedAt: { $ne: null }
    },
    { $set: { archivedAt: null } }
  );
  return { matched: result.matchedCount > 0 };
}

async function archiveAllReadNotifications(userId) {
  const normalizedUserId = normalizeObjectId(userId);
  if (!normalizedUserId) return { modifiedCount: 0 };
  const result = await Notification.updateMany(
    {
      userId: new mongoose.Types.ObjectId(normalizedUserId),
      archivedAt: null,
      readAt: { $ne: null }
    },
    { $set: { archivedAt: new Date() } }
  );
  return { modifiedCount: Number(result.modifiedCount || 0) };
}

async function getNotificationCounts(userId) {
  const normalizedUserId = normalizeObjectId(userId);
  if (!normalizedUserId) return { current: 0, unread: 0, archived: 0, read: 0 };
  const objectId = new mongoose.Types.ObjectId(normalizedUserId);
  const [current, unread, archived, read] = await Promise.all([
    Notification.countDocuments({ userId: objectId, archivedAt: null }),
    Notification.countDocuments({ userId: objectId, archivedAt: null, readAt: null }),
    Notification.countDocuments({ userId: objectId, archivedAt: { $ne: null } }),
    Notification.countDocuments({ userId: objectId, archivedAt: null, readAt: { $ne: null } })
  ]);
  return { current, unread, archived, read };
}

function normalizeNotificationView(value, legacyUnread = false) {
  if (legacyUnread === true || String(legacyUnread || '').trim() === '1') return 'unread';
  const safe = String(value || '').trim().toLowerCase();
  return NOTIFICATION_VIEWS.has(safe) ? safe : 'all';
}

function buildNotificationListUrl(view = 'all', page = 1) {
  const params = new URLSearchParams();
  const normalizedView = normalizeNotificationView(view);
  const normalizedPage = clampInt(page, 1, 500, 1);
  if (normalizedView !== 'all') params.set('view', normalizedView);
  if (normalizedPage > 1) params.set('page', String(normalizedPage));
  const query = params.toString();
  return `/runner/notifications${query ? `?${query}` : ''}`;
}

function buildNotificationPresentation(item = {}) {
  const type = String(item.type || '').trim().toLowerCase();
  const definition = TYPE_PRESENTATION.find((entry) => entry.match.test(type)) || {
    category: 'HelloRun update', icon: 'bell', tone: 'general', actionLabel: 'View update'
  };
  const message = String(item.message || '').trim();
  const href = sanitizeNotificationHref(item.href);
  return {
    category: definition.category,
    icon: definition.icon,
    tone: definition.tone,
    actionLabel: href ? definition.actionLabel : '',
    href,
    preview: buildMessagePreview(message),
    isRead: Boolean(item.readAt),
    isArchived: Boolean(item.archivedAt)
  };
}

function sanitizeNotificationHref(value) {
  const raw = String(value || '').trim();
  if (!/^\/(?!\/)/.test(raw) || raw.includes('\\') || /[\r\n]/.test(raw)) return '';
  try {
    const parsed = new URL(raw, 'https://hellorun.local');
    return parsed.origin === 'https://hellorun.local' ? `${parsed.pathname}${parsed.search}${parsed.hash}` : '';
  } catch (error) {
    return '';
  }
}

function buildMessagePreview(value, maxLength = 150) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(1, maxLength - 1)).trimEnd()}…`;
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
  getNotificationCounts,
  countUnreadNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  archiveNotification,
  restoreNotification,
  archiveAllReadNotifications,
  normalizeNotificationView,
  buildNotificationListUrl,
  buildNotificationPresentation,
  sanitizeNotificationHref
};
