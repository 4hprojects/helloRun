#!/usr/bin/env node

'use strict';

require('dotenv').config({ path: process.env.DOTENV_CONFIG_PATH || '.env' });

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const User = require('../models/User');
const Blog = require('../models/Blog');

const FIXTURE_QUERY = { email: /@example\.com$/i, role: { $ne: 'admin' } };
const QUARANTINE_REASON = 'Quarantined production fixture account under DEC-07.';

function parseArgs(argv = process.argv.slice(2)) {
  const mode = argv.includes('--apply') ? 'apply' : argv.includes('--rollback') ? 'rollback' : 'dry-run';
  if (argv.includes('--apply') && argv.includes('--rollback')) throw new Error('Choose --apply or --rollback, not both.');
  const value = (name) => {
    const prefix = `${name}=`;
    return argv.find((item) => item.startsWith(prefix))?.slice(prefix.length) || '';
  };
  return {
    mode,
    actorId: value('--actor-id'),
    expectedUsers: Number(value('--expect-users') || 0),
    expectedBlogs: Number(value('--expect-blogs') || 0),
    manifestPath: value('--manifest')
  };
}

function restoreValue(value) {
  return value === null || value === undefined || value === '' ? null : new Date(value);
}

async function collectTargets({ UserModel = User, BlogModel = Blog } = {}) {
  const users = await UserModel.find(FIXTURE_QUERY)
    .select('_id role createdAt accountStatus accountStatusReason accountStatusUpdatedAt accountStatusUpdatedBy')
    .sort({ _id: 1 })
    .lean();
  const userIds = users.map((user) => user._id);
  const blogs = await BlogModel.find({ authorId: { $in: userIds }, isDeleted: { $ne: true } })
    .select('_id status scheduledFor publishedAt reviewedAt featured')
    .sort({ _id: 1 })
    .lean();
  return { users, blogs };
}

function buildManifest(targets, actorId, now) {
  return {
    version: 1,
    decision: 'DEC-07 fixture quarantine',
    createdAt: now.toISOString(),
    actorId: String(actorId),
    users: targets.users.map((user) => ({
      id: String(user._id),
      accountStatus: user.accountStatus || 'active',
      accountStatusReason: user.accountStatusReason || '',
      accountStatusUpdatedAt: user.accountStatusUpdatedAt || null,
      accountStatusUpdatedBy: user.accountStatusUpdatedBy ? String(user.accountStatusUpdatedBy) : null
    })),
    blogs: targets.blogs.map((blog) => ({
      id: String(blog._id),
      status: blog.status,
      scheduledFor: blog.scheduledFor || null,
      publishedAt: blog.publishedAt || null,
      reviewedAt: blog.reviewedAt || null,
      featured: blog.featured === true
    }))
  };
}

function assertApplyPreconditions(targets, options) {
  if (!mongoose.isValidObjectId(options.actorId)) throw new Error('--actor-id must be a valid administrator MongoDB id.');
  if (!options.manifestPath) throw new Error('--manifest is required for apply.');
  if (!Number.isInteger(options.expectedUsers) || options.expectedUsers <= 0) throw new Error('--expect-users is required for apply.');
  if (!Number.isInteger(options.expectedBlogs) || options.expectedBlogs < 0) throw new Error('--expect-blogs is required for apply.');
  if (targets.users.length !== options.expectedUsers || targets.blogs.length !== options.expectedBlogs) {
    throw new Error(`Target counts changed: expected ${options.expectedUsers} users/${options.expectedBlogs} blogs, found ${targets.users.length}/${targets.blogs.length}.`);
  }
  const nonActive = targets.users.filter((user) => (user.accountStatus || 'active') !== 'active');
  if (nonActive.length) throw new Error(`${nonActive.length} fixture users are not active; refresh the audit before apply.`);
  if (targets.blogs.some((blog) => blog.isDeleted === true)) throw new Error('Deleted blogs must not enter the quarantine manifest.');
}

async function applyQuarantine(targets, options, deps = {}) {
  assertApplyPreconditions(targets, options);
  const UserModel = deps.UserModel || User;
  const BlogModel = deps.BlogModel || Blog;
  const actor = await UserModel.findOne({ _id: options.actorId, role: 'admin', accountStatus: { $nin: ['suspended', 'closed'] } }).select('_id').lean();
  if (!actor) throw new Error('Active administrator actor not found.');

  const now = options.now || new Date();
  const manifest = buildManifest(targets, options.actorId, now);
  const manifestPath = path.resolve(options.manifestPath);
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true, mode: 0o700 });
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600, flag: 'wx' });

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const userResult = await UserModel.updateMany(
        { _id: { $in: targets.users.map((user) => user._id) }, ...FIXTURE_QUERY },
        { $set: { accountStatus: 'suspended', accountStatusReason: QUARANTINE_REASON, accountStatusUpdatedAt: now, accountStatusUpdatedBy: actor._id } },
        { session, runValidators: true }
      );
      if (userResult.matchedCount !== targets.users.length) {
        throw new Error(`Fixture-user scope changed during apply: matched ${userResult.matchedCount}/${targets.users.length}.`);
      }
      const blogResult = await BlogModel.updateMany(
        { _id: { $in: targets.blogs.map((blog) => blog._id) }, isDeleted: { $ne: true } },
        { $set: { status: 'archived', scheduledFor: null, featured: false, reviewedAt: now } },
        { session, runValidators: true }
      );
      if (blogResult.matchedCount !== targets.blogs.length) {
        throw new Error(`Fixture-blog scope changed during apply: matched ${blogResult.matchedCount}/${targets.blogs.length}.`);
      }
    });
  } finally {
    await session.endSession();
  }

  const [suspended, archived] = await Promise.all([
    UserModel.countDocuments({ _id: { $in: targets.users.map((user) => user._id) }, accountStatus: 'suspended', accountStatusReason: QUARANTINE_REASON }),
    BlogModel.countDocuments({ _id: { $in: targets.blogs.map((blog) => blog._id) }, status: 'archived', isDeleted: { $ne: true } })
  ]);
  if (suspended !== targets.users.length || archived !== targets.blogs.length) throw new Error(`Quarantine verification failed: ${suspended} users/${archived} blogs.`);
  return { mode: 'apply', users: suspended, blogs: archived, manifestPath, mutationApplied: true };
}

async function rollbackQuarantine(options, deps = {}) {
  if (!options.manifestPath) throw new Error('--manifest is required for rollback.');
  if (!mongoose.isValidObjectId(options.actorId)) throw new Error('--actor-id must be a valid administrator MongoDB id.');
  const manifest = JSON.parse(fs.readFileSync(path.resolve(options.manifestPath), 'utf8'));
  if (manifest.version !== 1 || manifest.decision !== 'DEC-07 fixture quarantine') throw new Error('Unsupported quarantine manifest.');
  const UserModel = deps.UserModel || User;
  const BlogModel = deps.BlogModel || Blog;
  const actor = await UserModel.findOne({ _id: options.actorId, role: 'admin', accountStatus: { $nin: ['suspended', 'closed'] } }).select('_id').lean();
  if (!actor) throw new Error('Active administrator actor not found.');

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      if (manifest.users.length) {
        const userResult = await UserModel.bulkWrite(manifest.users.map((user) => ({ updateOne: {
          filter: { _id: user.id, accountStatus: 'suspended', accountStatusReason: QUARANTINE_REASON },
          update: { $set: {
            accountStatus: user.accountStatus,
            accountStatusReason: user.accountStatusReason,
            accountStatusUpdatedAt: restoreValue(user.accountStatusUpdatedAt),
            accountStatusUpdatedBy: user.accountStatusUpdatedBy || null
          } }
        } })), { session });
        if (userResult.matchedCount !== manifest.users.length) {
          throw new Error(`Rollback user scope changed: matched ${userResult.matchedCount}/${manifest.users.length}.`);
        }
      }
      if (manifest.blogs.length) {
        const blogResult = await BlogModel.bulkWrite(manifest.blogs.map((blog) => ({ updateOne: {
          filter: { _id: blog.id, status: 'archived', isDeleted: { $ne: true } },
          update: { $set: {
            status: blog.status,
            scheduledFor: restoreValue(blog.scheduledFor),
            publishedAt: restoreValue(blog.publishedAt),
            reviewedAt: restoreValue(blog.reviewedAt),
            featured: blog.featured === true
          } }
        } })), { session });
        if (blogResult.matchedCount !== manifest.blogs.length) {
          throw new Error(`Rollback blog scope changed: matched ${blogResult.matchedCount}/${manifest.blogs.length}.`);
        }
      }
    });
  } finally {
    await session.endSession();
  }
  return { mode: 'rollback', users: manifest.users.length, blogs: manifest.blogs.length, mutationApplied: true };
}

async function main() {
  const options = parseArgs();
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required.');
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10_000 });
  if (options.mode === 'rollback') {
    console.log(JSON.stringify(await rollbackQuarantine(options), null, 2));
    return;
  }
  const targets = await collectTargets();
  if (options.mode === 'apply') {
    console.log(JSON.stringify(await applyQuarantine(targets, options), null, 2));
    return;
  }
  const createdTimes = targets.users
    .map((user) => new Date(user.createdAt).getTime())
    .filter(Number.isFinite);
  console.log(JSON.stringify({
    mode: 'dry-run',
    mutationApplied: false,
    users: targets.users.length,
    userRoles: targets.users.reduce((counts, user) => ({ ...counts, [user.role]: (counts[user.role] || 0) + 1 }), {}),
    userCreationRange: {
      earliest: createdTimes.length ? new Date(Math.min(...createdTimes)).toISOString() : null,
      latest: createdTimes.length ? new Date(Math.max(...createdTimes)).toISOString() : null
    },
    userStatuses: targets.users.reduce((counts, user) => ({ ...counts, [user.accountStatus || 'active']: (counts[user.accountStatus || 'active'] || 0) + 1 }), {}),
    blogs: targets.blogs.length,
    blogStatuses: targets.blogs.reduce((counts, blog) => ({ ...counts, [blog.status]: (counts[blog.status] || 0) + 1 }), {}),
    action: 'Suspend fixture users and archive their blogs; preserve all events, registrations, assets, and evidence.'
  }, null, 2));
}

if (require.main === module) {
  main().catch((error) => { console.error(error?.stack || error); process.exitCode = 1; })
    .finally(async () => { if (mongoose.connection.readyState !== 0) await mongoose.disconnect(); });
}

module.exports = {
  FIXTURE_QUERY,
  QUARANTINE_REASON,
  parseArgs,
  collectTargets,
  buildManifest,
  assertApplyPreconditions,
  applyQuarantine,
  rollbackQuarantine
};
