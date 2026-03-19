const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../src/models/User');
const Blog = require('../src/models/Blog');
const BlogComment = require('../src/models/BlogComment');
const BlogLike = require('../src/models/BlogLike');

const ROOT = path.resolve(__dirname, '..');
const TEST_PORT = 3124;
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

// ─── GET /blog/:slug/comments ─────────────────────────────────────────────────

test('GET /blog/:slug/comments returns 404 for unknown slug', async () => {
  const response = await fetch(`${BASE_URL}/blog/nonexistent-post-slug-xyz/comments`);
  assert.equal(response.status, 404);
  const body = await response.json();
  assert.equal(body.success, false);
});

test('GET /blog/:slug/comments returns empty list for new published post', async () => {
  const response = await fetch(`${BASE_URL}/blog/${seed.post.slug}/comments`);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.success, true);
  assert.ok(Array.isArray(body.comments));
});

test('GET /blog/:slug/comments returns 404 for unpublished post', async () => {
  const response = await fetch(`${BASE_URL}/blog/${seed.draftPost.slug}/comments`);
  assert.equal(response.status, 404);
});

// ─── POST /blog/:slug/comments ────────────────────────────────────────────────

test('unauthenticated user cannot post a comment (redirected to login)', async () => {
  const response = await fetch(`${BASE_URL}/blog/${seed.post.slug}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: 'Hello from anon' }),
    redirect: 'manual'
  });
  // requireAuth redirects unauthenticated requests to /login
  assert.equal(response.status, 302);
  assert.ok((response.headers.get('location') || '').includes('/login'));
});

test('authenticated runner can post a comment', async () => {
  const cookie = await login(seed.runner.email, seed.password);
  await waitForSessionReady('/runner/dashboard', cookie);
  const response = await fetch(`${BASE_URL}/blog/${seed.post.slug}/comments`, {
    method: 'POST',
    headers: {
      Cookie: cookie,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ content: 'Great post!' })
  });
  assert.equal(response.status, 201);
  const body = await response.json();
  assert.equal(body.success, true);
  assert.ok(body.comment._id);
  assert.equal(body.comment.content, 'Great post!');
});

test('comment with empty content is rejected', async () => {
  const cookie = await login(seed.runner.email, seed.password);
  await waitForSessionReady('/runner/dashboard', cookie);
  const response = await fetch(`${BASE_URL}/blog/${seed.post.slug}/comments`, {
    method: 'POST',
    headers: {
      Cookie: cookie,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ content: '' })
  });
  assert.equal(response.status, 400);
  const body = await response.json();
  assert.equal(body.success, false);
});

test('comment exceeding max length is rejected', async () => {
  const cookie = await login(seed.runner.email, seed.password);
  await waitForSessionReady('/runner/dashboard', cookie);
  const overlong = 'x'.repeat(1001);
  const response = await fetch(`${BASE_URL}/blog/${seed.post.slug}/comments`, {
    method: 'POST',
    headers: {
      Cookie: cookie,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ content: overlong })
  });
  assert.equal(response.status, 400);
  const body = await response.json();
  assert.equal(body.success, false);
});

test('posted comment appears in GET comments list', async () => {
  const response = await fetch(`${BASE_URL}/blog/${seed.post.slug}/comments`);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.success, true);
  assert.ok(body.comments.length >= 1);
  assert.ok(body.comments.some((c) => c.content === 'Great post!'));
});

// ─── DELETE /blog/:slug/comments/:commentId ───────────────────────────────────

test('another user cannot delete someone elses comment', async () => {
  // seed.deleteableCommentId was pre-created in the fixture (authored by runner)
  const otherCookie = await login(seed.otherRunner.email, seed.password);
  await waitForSessionReady('/runner/dashboard', otherCookie);
  const response = await fetch(
    `${BASE_URL}/blog/${seed.post.slug}/comments/${seed.deleteableCommentId}`,
    {
      method: 'DELETE',
      headers: { Cookie: otherCookie }
    }
  );
  assert.equal(response.status, 403);
});

test('runner can delete their own comment', async () => {
  // seed.deleteableCommentId was pre-created in the fixture and authored by runner
  const cookie = await login(seed.runner.email, seed.password);
  await waitForSessionReady('/runner/dashboard', cookie);
  const response = await fetch(
    `${BASE_URL}/blog/${seed.post.slug}/comments/${seed.deleteableCommentId}`,
    {
      method: 'DELETE',
      headers: { Cookie: cookie }
    }
  );
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.success, true);
});

test('deleted comment no longer appears in comments list', async () => {
  const response = await fetch(`${BASE_URL}/blog/${seed.post.slug}/comments`);
  const body = await response.json();
  assert.ok(Array.isArray(body.comments));
  assert.ok(!body.comments.some((c) => String(c._id) === seed.deleteableCommentId));
});

// ─── POST /blog/:slug/like ────────────────────────────────────────────────────

test('unauthenticated user cannot like a post (redirected to login)', async () => {
  const response = await fetch(`${BASE_URL}/blog/${seed.post.slug}/like`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    redirect: 'manual'
  });
  // requireAuth redirects unauthenticated requests to /login
  assert.equal(response.status, 302);
  assert.ok((response.headers.get('location') || '').includes('/login'));
});

test('authenticated runner can like a post', async () => {
  const cookie = await login(seed.runner.email, seed.password);
  await waitForSessionReady('/runner/dashboard', cookie);
  const response = await fetch(`${BASE_URL}/blog/${seed.post.slug}/like`, {
    method: 'POST',
    headers: { Cookie: cookie, 'Content-Type': 'application/json' }
  });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.success, true);
  assert.equal(body.liked, true);
});

test('liking the same post again unlikes it (toggle)', async () => {
  const cookie = await login(seed.runner.email, seed.password);
  await waitForSessionReady('/runner/dashboard', cookie);
  const response = await fetch(`${BASE_URL}/blog/${seed.post.slug}/like`, {
    method: 'POST',
    headers: { Cookie: cookie, 'Content-Type': 'application/json' }
  });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.success, true);
  assert.equal(body.liked, false);
});

test('liking a non-existent post returns 404', async () => {
  const cookie = await login(seed.runner.email, seed.password);
  await waitForSessionReady('/runner/dashboard', cookie);
  const response = await fetch(`${BASE_URL}/blog/no-such-slug-xyz/like`, {
    method: 'POST',
    headers: { Cookie: cookie, 'Content-Type': 'application/json' }
  });
  assert.equal(response.status, 404);
  const body = await response.json();
  assert.equal(body.success, false);
});

// ─── Admin: GET /admin/blog/comments ─────────────────────────────────────────

test('admin can list all blog comments', async () => {
  const cookie = await login(seed.admin.email, seed.password);
  await waitForAdminSessionReady(cookie);
  const response = await fetch(`${BASE_URL}/admin/blog/comments`, {
    headers: { Cookie: cookie }
  });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.success, true);
  assert.ok(Array.isArray(body.comments));
});

test('non-admin cannot access admin comment list', async () => {
  const cookie = await login(seed.runner.email, seed.password);
  const response = await fetch(`${BASE_URL}/admin/blog/comments`, {
    headers: { Cookie: cookie },
    redirect: 'manual'
  });
  assert.ok(response.status === 403 || response.status === 302);
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function seedFixture() {
  await ensureConnected();
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const password = 'Pass1234';
  const passwordHash = await bcrypt.hash(password, 10);

  const admin = await User.create({
    userId: `UBIAD${stamp}`.slice(0, 22),
    email: `bi.admin.${stamp}@example.com`,
    passwordHash,
    role: 'admin',
    firstName: 'Blog',
    lastName: 'AdminBI',
    emailVerified: true
  });

  const runner = await User.create({
    userId: `UBIR${stamp}`.slice(0, 22),
    email: `bi.runner.${stamp}@example.com`,
    passwordHash,
    role: 'runner',
    firstName: 'Blog',
    lastName: 'RunnerBI',
    emailVerified: true
  });

  const otherRunner = await User.create({
    userId: `UBIOR${stamp}`.slice(0, 22),
    email: `bi.other.${stamp}@example.com`,
    passwordHash,
    role: 'runner',
    firstName: 'Other',
    lastName: 'RunnerBI',
    emailVerified: true
  });

  const makeSlug = (label) =>
    `bi-${label}-${stamp}`.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 160);

  const post = await Blog.create({
    authorId: admin._id,
    title: `BI Published Post ${stamp}`.slice(0, 150),
    slug: makeSlug('published'),
    excerpt: 'Blog interaction test post',
    contentHtml: '<p>Test content</p>',
    coverImageUrl: `https://example.com/cover-bi-${stamp}.jpg`,
    category: 'General',
    status: 'published',
    publishedAt: new Date(),
    approvedAt: new Date(),
    approvedBy: admin._id
  });

  const draftPost = await Blog.create({
    authorId: admin._id,
    title: `BI Draft Post ${stamp}`.slice(0, 150),
    slug: makeSlug('draft'),
    excerpt: 'Draft — should not accept comments/likes',
    contentHtml: '<p>Draft content</p>',
    coverImageUrl: `https://example.com/cover-draft-${stamp}.jpg`,
    category: 'General',
    status: 'draft'
  });

  // Pre-create a comment authored by runner — used for delete tests (no cross-test state)
  const deleteableComment = await BlogComment.create({
    blogId: post._id,
    authorId: runner._id,
    content: 'This comment will be deleted by its author'
  });

  return {
    stamp,
    password,
    admin: { id: admin._id, email: admin.email },
    runner: { id: runner._id, email: runner.email },
    otherRunner: { id: otherRunner._id, email: otherRunner.email },
    post: { id: post._id, slug: post.slug },
    draftPost: { id: draftPost._id, slug: draftPost.slug },
    deleteableCommentId: String(deleteableComment._id)
  };
}

async function cleanupSeed(currentSeed) {
  if (!currentSeed || !currentSeed.stamp) return;
  await ensureConnected();
  const postIds = [currentSeed.post?.id, currentSeed.draftPost?.id].filter(Boolean);
  await Promise.all([
    Blog.deleteMany({ _id: { $in: postIds } }),
    BlogComment.deleteMany({ blogId: { $in: postIds } }),
    BlogLike.deleteMany({ blogId: { $in: postIds } }),
    User.deleteMany({
      email: {
        $in: [
          currentSeed.admin?.email,
          currentSeed.runner?.email,
          currentSeed.otherRunner?.email
        ].filter(Boolean)
      }
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
  assert.equal(response.status, 302, `Login failed for ${email}`);
  const setCookie = response.headers.get('set-cookie');
  assert.ok(setCookie, 'Expected Set-Cookie header after login');
  return setCookie.split(';')[0];
}

// Wait until an authenticated request to `path` is no longer a 302 redirect,
// indicating the session has been persisted in MongoDB and is ready.
async function waitForSessionReady(sessionPath, cookie) {
  const maxAttempts = 20;
  for (let i = 0; i < maxAttempts; i += 1) {
    const res = await fetch(`${BASE_URL}${sessionPath}`, {
      headers: { Cookie: cookie },
      redirect: 'manual'
    });
    if (res.status !== 302) return;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
}

async function waitForAdminSessionReady(cookie) {
  const maxAttempts = 20;
  for (let i = 0; i < maxAttempts; i += 1) {
    const res = await fetch(`${BASE_URL}/admin/dashboard`, {
      headers: { Cookie: cookie },
      redirect: 'manual'
    });
    if (res.status === 200) return;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
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
