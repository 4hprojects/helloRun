const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../src/models/User');
const Blog = require('../src/models/Blog');

const ROOT = path.resolve(__dirname, '..');
const TEST_PORT = 3120;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

let serverProc = null;
let seed = null;

test.before(async () => {
  serverProc = spawn(process.execPath, ['src/server.js'], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(TEST_PORT) },
    stdio: ['ignore', 'ignore', 'ignore']
  });
  await waitForServerReady();
  seed = await seedFixture();
});

test.after(async () => {
  if (serverProc && !serverProc.killed) {
    serverProc.kill('SIGTERM');
  }
  await cleanupSeed(seed);
  await mongoose.disconnect();
});

// ─── Access Control ──────────────────────────────────────────────────────────

test('non-admin cannot access blog review queue', async () => {
  const cookie = await login(seed.author.email, seed.password);
  const response = await fetch(`${BASE_URL}/admin/blog/review`, {
    headers: { Cookie: cookie },
    redirect: 'manual'
  });
  assert.ok(response.status === 403 || response.status === 302);
});

// ─── Review Queue ─────────────────────────────────────────────────────────────

test('admin can view blog review queue with pending post', async () => {
  const cookie = await login(seed.admin.email, seed.password);
  await waitForAdminSessionReady(cookie);
  const response = await fetch(`${BASE_URL}/admin/blog/review`, {
    headers: { Cookie: cookie },
    redirect: 'manual'
  });
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, new RegExp(escapeRegex(seed.pendingPost.title)));
});

test('admin can view individual post review page', async () => {
  const cookie = await login(seed.admin.email, seed.password);
  await waitForAdminSessionReady(cookie);
  const response = await fetch(`${BASE_URL}/admin/blog/posts/${seed.pendingPost.id}/review`, {
    headers: { Cookie: cookie },
    redirect: 'manual'
  });
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, new RegExp(escapeRegex(seed.pendingPost.title)));
});

// ─── Approve ─────────────────────────────────────────────────────────────────

test('admin can approve a pending blog post', async () => {
  const cookie = await login(seed.admin.email, seed.password);
  await waitForAdminSessionReady(cookie);
  const response = await fetch(`${BASE_URL}/admin/blog/posts/${seed.pendingPost.id}/approve`, {
    method: 'POST',
    headers: {
      Cookie: cookie,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    redirect: 'manual'
  });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.success, true);

  // Verify DB state
  await ensureConnected();
  const updated = await Blog.findById(seed.pendingPost.id);
  assert.equal(updated.status, 'published');
  assert.ok(updated.approvedBy);
  assert.ok(updated.approvedAt);
});

test('approving a non-pending post returns 409', async () => {
  // The draft post is not in pending state
  const cookie = await login(seed.admin.email, seed.password);
  await waitForAdminSessionReady(cookie);
  const response = await fetch(`${BASE_URL}/admin/blog/posts/${seed.draftPost.id}/approve`, {
    method: 'POST',
    headers: {
      Cookie: cookie,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    redirect: 'manual'
  });
  assert.equal(response.status, 409);
  const body = await response.json();
  assert.equal(body.success, false);
});

// ─── Reject ──────────────────────────────────────────────────────────────────

test('admin reject without reason returns 400 and does not change DB', async () => {
  const cookie = await login(seed.admin.email, seed.password);
  await waitForAdminSessionReady(cookie);
  const response = await fetch(`${BASE_URL}/admin/blog/posts/${seed.pendingPost2.id}/reject`, {
    method: 'POST',
    headers: {
      Cookie: cookie,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify({ rejectionReason: '' }),
    redirect: 'manual'
  });
  assert.equal(response.status, 400);
  const body = await response.json();
  assert.equal(body.success, false);

  // DB unchanged
  await ensureConnected();
  const unchanged = await Blog.findById(seed.pendingPost2.id);
  assert.equal(unchanged.status, 'pending');
});

test('admin can reject a pending blog post with a valid reason', async () => {
  const cookie = await login(seed.admin.email, seed.password);
  await waitForAdminSessionReady(cookie);
  const reason = 'Content does not meet community guidelines. Please revise and resubmit.';
  const response = await fetch(`${BASE_URL}/admin/blog/posts/${seed.pendingPost2.id}/reject`, {
    method: 'POST',
    headers: {
      Cookie: cookie,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify({ rejectionReason: reason }),
    redirect: 'manual'
  });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.success, true);

  // Verify DB state
  await ensureConnected();
  const updated = await Blog.findById(seed.pendingPost2.id);
  assert.equal(updated.status, 'rejected');
  assert.equal(updated.rejectionReason, reason);
  assert.ok(updated.rejectedBy);
  assert.ok(updated.rejectedAt);
});

// ─── Archive ─────────────────────────────────────────────────────────────────

test('admin can archive a published blog post', async () => {
  const cookie = await login(seed.admin.email, seed.password);
  await waitForAdminSessionReady(cookie);
  const response = await fetch(`${BASE_URL}/admin/blog/posts/${seed.publishedPost.id}/archive`, {
    method: 'POST',
    headers: {
      Cookie: cookie,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    redirect: 'manual'
  });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.success, true);

  // Verify DB state
  await ensureConnected();
  const updated = await Blog.findById(seed.publishedPost.id);
  assert.equal(updated.status, 'archived');
});

test('archiving a non-published post returns 409', async () => {
  const cookie = await login(seed.admin.email, seed.password);
  await waitForAdminSessionReady(cookie);
  const response = await fetch(`${BASE_URL}/admin/blog/posts/${seed.draftPost.id}/archive`, {
    method: 'POST',
    headers: {
      Cookie: cookie,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    redirect: 'manual'
  });
  assert.equal(response.status, 409);
  const body = await response.json();
  assert.equal(body.success, false);
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function seedFixture() {
  await ensureConnected();
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const password = 'Pass1234';
  const passwordHash = await bcrypt.hash(password, 10);

  const admin = await User.create({
    userId: `UBALAD${stamp}`.slice(0, 22),
    email: `baw.admin.${stamp}@example.com`,
    passwordHash,
    role: 'admin',
    firstName: 'Blog',
    lastName: 'Admin',
    emailVerified: true
  });

  const author = await User.create({
    userId: `UBALAR${stamp}`.slice(0, 22),
    email: `baw.author.${stamp}@example.com`,
    passwordHash,
    role: 'runner',
    firstName: 'Blog',
    lastName: 'Author',
    emailVerified: true
  });

  const makeSlug = (label) =>
    `baw-${label}-${stamp}`.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 160);

  // Post 1: pending — will be approved
  const pendingPost = await Blog.create({
    authorId: author._id,
    title: `BAW Pending Post Alpha ${stamp}`.slice(0, 150),
    slug: makeSlug('pending-alpha'),
    excerpt: 'Pending alpha excerpt',
    contentHtml: '<p>Pending alpha content</p>',
    coverImageUrl: `https://example.com/cover-alpha-${stamp}.jpg`,
    category: 'General',
    status: 'pending',
    submittedAt: new Date()
  });

  // Post 2: pending — will be rejected
  const pendingPost2 = await Blog.create({
    authorId: author._id,
    title: `BAW Pending Post Beta ${stamp}`.slice(0, 150),
    slug: makeSlug('pending-beta'),
    excerpt: 'Pending beta excerpt',
    contentHtml: '<p>Pending beta content</p>',
    coverImageUrl: `https://example.com/cover-beta-${stamp}.jpg`,
    category: 'General',
    status: 'pending',
    submittedAt: new Date()
  });

  // Post 3: published — will be archived
  const publishedPost = await Blog.create({
    authorId: author._id,
    title: `BAW Published Post ${stamp}`.slice(0, 150),
    slug: makeSlug('published'),
    excerpt: 'Published excerpt',
    contentHtml: '<p>Published content</p>',
    coverImageUrl: `https://example.com/cover-pub-${stamp}.jpg`,
    category: 'General',
    status: 'published',
    publishedAt: new Date(),
    approvedAt: new Date(),
    approvedBy: admin._id
  });

  // Post 4: draft — used to test invalid state transitions (cannot approve/archive a draft)
  const draftPost = await Blog.create({
    authorId: author._id,
    title: `BAW Draft Post ${stamp}`.slice(0, 150),
    slug: makeSlug('draft'),
    excerpt: 'Draft excerpt',
    contentHtml: '<p>Draft content</p>',
    coverImageUrl: `https://example.com/cover-draft-${stamp}.jpg`,
    category: 'General',
    status: 'draft'
  });

  return {
    stamp,
    password,
    admin: { id: String(admin._id), email: admin.email },
    author: { id: String(author._id), email: author.email },
    pendingPost: { id: String(pendingPost._id), title: pendingPost.title },
    pendingPost2: { id: String(pendingPost2._id), title: pendingPost2.title },
    publishedPost: { id: String(publishedPost._id) },
    draftPost: { id: String(draftPost._id) }
  };
}

async function cleanupSeed(currentSeed) {
  if (!currentSeed || !currentSeed.stamp) return;
  await ensureConnected();
  await Promise.all([
    Blog.deleteMany({
      _id: {
        $in: [
          currentSeed.pendingPost?.id,
          currentSeed.pendingPost2?.id,
          currentSeed.publishedPost?.id,
          currentSeed.draftPost?.id
        ].filter(Boolean)
      }
    }),
    User.deleteMany({
      email: { $in: [currentSeed.admin?.email, currentSeed.author?.email].filter(Boolean) }
    })
  ]);
}

async function login(email, password) {
  const response = await fetch(`${BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ email, password }),
    redirect: 'manual'
  });
  assert.equal(response.status, 302);
  const setCookie = response.headers.get('set-cookie');
  assert.ok(setCookie);
  return setCookie.split(';')[0];
}

async function waitForServerReady() {
  const maxAttempts = 40;
  for (let i = 0; i < maxAttempts; i += 1) {
    try {
      const response = await fetch(`${BASE_URL}/`);
      if (response.status >= 200 && response.status < 500) return;
    } catch (_) {
      // server booting
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Server did not become ready at ${BASE_URL}`);
}

async function ensureConnected() {
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect(process.env.MONGODB_URI);
}

async function waitForAdminSessionReady(cookie) {
  const maxAttempts = 10;
  for (let i = 0; i < maxAttempts; i += 1) {
    const response = await fetch(`${BASE_URL}/admin/dashboard`, {
      headers: { Cookie: cookie },
      redirect: 'manual'
    });
    if (response.status !== 302) return true;
    // eslint-disable-next-line no-await-in-loop
    await new Promise((resolve) => setTimeout(resolve, 80));
  }
  return false;
}

function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
