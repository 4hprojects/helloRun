const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../src/models/User');
const Notification = require('../src/models/Notification');
const RunningGroup = require('../src/models/RunningGroup');
const Announcement = require('../src/models/RunningGroupAnnouncement');
const Comment = require('../src/models/RunningGroupComment');
const Report = require('../src/models/RunningGroupCommunityReport');
const { createRunningGroup, joinRunningGroup } = require('../src/services/running-group.service');
const {
  GroupCommunityError,
  createAnnouncement,
  editAnnouncement,
  listAnnouncements,
  removeAnnouncement,
  reportAnnouncement,
  commentWorkflow
} = require('../src/services/running-group-community.service');

test.before(async () => { await mongoose.connect(process.env.MONGODB_URI); });
test.after(async () => { await mongoose.disconnect(); });

test('members post announcements and threaded replies while non-members remain read-only', async () => {
  const creator = await createRunner('creator');
  const member = await createRunner('member');
  const outsider = await createRunner('outsider');
  const group = await createRunningGroup({ user: creator, name: uniqueName(), description: 'Community integration test' });
  await joinRunningGroup({ user: member, groupId: group._id });
  const freshCreator = await User.findById(creator._id);
  const freshMember = await User.findById(member._id);
  let announcement;
  try {
    announcement = await createAnnouncement({ group, user: freshCreator, content: '<strong>Saturday easy run</strong>' });
    assert.equal(announcement.content, 'Saturday easy run');
    const edited = await editAnnouncement({
      group, user: freshCreator, announcementId: announcement._id,
      content: 'Saturday easy run — updated', expectedUpdatedAt: announcement.updatedAt.toISOString()
    });
    assert.equal(edited.content, 'Saturday easy run — updated');
    await assert.rejects(
      () => createAnnouncement({ group, user: outsider, content: 'Should not post' }),
      (error) => error instanceof GroupCommunityError && error.status === 403
    );

    const announcementAlert = await Notification.findOne({ userId: member._id, type: 'running_group_announcement' }).lean();
    assert.ok(announcementAlert);

    const root = await commentWorkflow.create({
      resourceKey: String(announcement._id), actor: { id: String(member._id), _id: member._id, firstName: 'Member', lastName: 'Runner' },
      content: 'I will join.'
    });
    const reply = await commentWorkflow.create({
      resourceKey: String(announcement._id), actor: { id: String(creator._id), _id: creator._id, firstName: 'Creator', lastName: 'Runner' },
      content: 'See you there.', replyToCommentId: root._id
    });
    assert.equal(reply.parentCommentId, root._id);

    const threads = await commentWorkflow.list({ resourceKey: String(announcement._id), page: 1 });
    assert.equal(threads.comments.length, 1);
    assert.equal(threads.comments[0].replyCount, 1);
    assert.equal(threads.totalContributions, 2);
    assert.ok(await Notification.findOne({ userId: creator._id, type: 'running_group_reply' }).lean());
    assert.ok(await Notification.findOne({ userId: member._id, type: 'running_group_reply' }).lean());

    const feed = await listAnnouncements(group, { currentUserId: creator._id });
    assert.equal(feed.items[0].commentsCount, 2);
    await reportAnnouncement({ group, user: outsider, announcementId: announcement._id, reason: 'other', note: 'Review this.' });
    assert.ok(await Report.findOne({ announcementId: announcement._id, reporterId: outsider._id }).lean());

    await removeAnnouncement({ group, user: creator, announcementId: announcement._id });
    const tombstoneFeed = await listAnnouncements(group, { currentUserId: creator._id });
    assert.equal(tombstoneFeed.items.find((item) => item.id === String(announcement._id)).isDeleted, true);
  } finally {
    const announcementIds = await Announcement.find({ groupId: group._id }).distinct('_id');
    await Promise.all([
      Report.deleteMany({ groupId: group._id }), Comment.deleteMany({ announcementId: { $in: announcementIds } }),
      Announcement.deleteMany({ groupId: group._id }), Notification.deleteMany({ userId: { $in: [creator._id, member._id, outsider._id] } }),
      RunningGroup.deleteOne({ _id: group._id }), User.deleteMany({ _id: { $in: [creator._id, member._id, outsider._id] } })
    ]);
  }
});

async function createRunner(tag) {
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  return User.create({
    userId: `UGC${stamp}`.slice(0, 22), email: `group.community.${tag}.${stamp}@example.com`,
    passwordHash: await bcrypt.hash('Pass1234', 8), role: 'runner', firstName: tag[0].toUpperCase() + tag.slice(1),
    lastName: 'Runner', emailVerified: true, accountStatus: 'active', mobile: '09170000000', country: 'PH', gender: 'male'
  });
}

function uniqueName() { return `Community ${Date.now()} ${Math.floor(Math.random() * 10000)}`; }
