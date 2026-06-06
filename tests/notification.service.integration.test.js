const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../src/models/User');
const Notification = require('../src/models/Notification');
const {
  createNotification,
  getUserNotifications,
  countUnreadNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead
} = require('../src/services/notification.service');

test.before(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
});

test.after(async () => {
  await mongoose.disconnect();
});

test('notification service creates, lists, and updates read state', async () => {
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const passwordHash = await bcrypt.hash('Pass1234', 10);
  const runner = await User.create({
    userId: `UNSF${stamp}`.slice(0, 22),
    email: `notification.service.${stamp}@example.com`,
    passwordHash,
    role: 'runner',
    firstName: 'Notify',
    lastName: 'Runner',
    emailVerified: true
  });

  try {
    const created = await Promise.all([
      createNotification({
        userId: runner._id,
        type: 'result_approved',
        title: 'Result Approved',
        message: 'Your latest result was approved.',
        href: '/runner/dashboard'
      }),
      createNotification({
        userId: runner._id,
        type: 'certificate_issued',
        title: 'Certificate Ready',
        message: 'Your certificate is now available.',
        href: '/my-registrations'
      }),
      createNotification({
        userId: runner._id,
        type: 'group_update',
        title: 'Group Activity',
        message: 'A member joined your running group.',
        href: '/runner/groups'
      })
    ]);

    let unreadCount = await countUnreadNotifications(runner._id);
    assert.equal(unreadCount, 3);

    const page1 = await getUserNotifications(runner._id, { page: 1, limit: 2 });
    assert.equal(page1.items.length, 2);
    assert.equal(page1.unreadCount, 3);
    assert.equal(page1.totalItems, 3);
    assert.equal(page1.totalPages, 2);

    const markSingle = await markNotificationAsRead(runner._id, created[0]._id);
    assert.equal(markSingle.matched, true);
    unreadCount = await countUnreadNotifications(runner._id);
    assert.equal(unreadCount, 2);

    const unreadOnly = await getUserNotifications(runner._id, { unreadOnly: true });
    assert.equal(unreadOnly.items.length, 2);

    const markAll = await markAllNotificationsAsRead(runner._id);
    assert.ok(markAll.modifiedCount >= 2);
    unreadCount = await countUnreadNotifications(runner._id);
    assert.equal(unreadCount, 0);
  } finally {
    await Notification.deleteMany({ userId: runner._id });
    await User.deleteOne({ _id: runner._id });
  }
});
