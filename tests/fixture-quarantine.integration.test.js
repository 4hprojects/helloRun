'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const mongoose = require('mongoose');

const User = require('../src/models/User');
const Blog = require('../src/models/Blog');
const {
  QUARANTINE_REASON,
  collectTargets,
  applyQuarantine,
  rollbackQuarantine
} = require('../src/scripts/quarantine-fixture-users');

const TEST_URI = String(process.env.MONGODB_URI || '');
const skip = !/^mongodb:\/\/(127\.0\.0\.1|localhost)(:\d+)?\//.test(TEST_URI)
  ? 'set MONGODB_URI to a disposable local MongoDB'
  : false;

test('fixture quarantine is count-guarded, reversible, and preserves non-fixture data', { skip }, async () => {
  await mongoose.connect(TEST_URI);
  await mongoose.connection.db.dropDatabase();
  const adminId = new mongoose.Types.ObjectId();
  const runnerId = new mongoose.Types.ObjectId();
  const organizerId = new mongoose.Types.ObjectId();
  const realId = new mongoose.Types.ObjectId();
  const now = new Date('2026-10-27T02:30:00.000Z');
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hellorun-fixture-quarantine-'));
  const manifestPath = path.join(tempDir, 'rollback.json');

  try {
    await User.collection.insertMany([
      { _id: adminId, email: 'admin@example.test', role: 'admin', adminTier: 'full', accountStatus: 'active' },
      { _id: runnerId, email: 'fixture.runner@example.com', role: 'runner', accountStatus: 'active' },
      { _id: organizerId, email: 'fixture.organizer@example.com', role: 'organizer', accountStatus: 'active' },
      { _id: realId, email: 'runner@hellorun.test', role: 'runner', accountStatus: 'active' }
    ]);
    await Blog.collection.insertMany([
      { _id: new mongoose.Types.ObjectId(), authorId: runnerId, title: 'Fixture published', slug: 'fixture-published', status: 'published', isDeleted: false, featured: true, publishedAt: new Date('2026-09-10') },
      { _id: new mongoose.Types.ObjectId(), authorId: organizerId, title: 'Fixture draft', slug: 'fixture-draft', status: 'draft', isDeleted: false, featured: false }
    ]);

    const targets = await collectTargets();
    assert.equal(targets.users.length, 2);
    assert.equal(targets.blogs.length, 2);
    await assert.rejects(
      applyQuarantine(targets, { actorId: adminId, expectedUsers: 99, expectedBlogs: 2, manifestPath, now }),
      /Target counts changed/
    );
    assert.equal(fs.existsSync(manifestPath), false);

    const applied = await applyQuarantine(targets, { actorId: adminId, expectedUsers: 2, expectedBlogs: 2, manifestPath, now });
    assert.equal(applied.mutationApplied, true);
    assert.equal(fs.statSync(manifestPath).mode & 0o777, 0o600);
    assert.equal(await User.countDocuments({ _id: { $in: [runnerId, organizerId] }, accountStatus: 'suspended', accountStatusReason: QUARANTINE_REASON }), 2);
    assert.equal(await Blog.countDocuments({ authorId: { $in: [runnerId, organizerId] }, status: 'archived', featured: false }), 2);
    assert.equal((await User.findById(realId).lean()).accountStatus, 'active');

    const rolledBack = await rollbackQuarantine({ actorId: adminId, manifestPath });
    assert.equal(rolledBack.mutationApplied, true);
    assert.equal(await User.countDocuments({ _id: { $in: [runnerId, organizerId] }, accountStatus: 'active' }), 2);
    assert.equal((await Blog.findOne({ slug: 'fixture-published' }).lean()).status, 'published');
    assert.equal((await Blog.findOne({ slug: 'fixture-published' }).lean()).featured, true);
    assert.equal((await Blog.findOne({ slug: 'fixture-draft' }).lean()).status, 'draft');
  } finally {
    await mongoose.connection.db.dropDatabase().catch(() => {});
    await mongoose.disconnect();
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
