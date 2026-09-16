const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../src/models/User');
const Blog = require('../src/models/Blog');
const BlogRevision = require('../src/models/BlogRevision');
const { buildTrustedEditorialReview } = require('../src/utils/blog-content-eligibility');

const ROOT = path.resolve(__dirname, '..');
const TEST_PORT = 3120;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

let serverProc = null;
let seed = null;
const loginCookies = new Map();

test.before(async () => {
  serverProc = spawn(process.execPath, ['src/server.js'], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(TEST_PORT), NODE_ENV: 'test', CSRF_PROTECTION: '0' },
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

test('author can create a structured blog draft through API', async () => {
  const cookie = await login(seed.author.email, seed.password);
  await waitForSessionReady('/blogs/me/dashboard', cookie);
  const response = await fetch(`${BASE_URL}/blogs/me`, {
    method: 'POST',
    headers: {
      Cookie: cookie,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify({
      title: `Structured Draft ${seed.stamp}`,
      excerpt: 'Structured draft excerpt',
      category: 'Training',
      coverImageUrl: `https://example.com/structured-${seed.stamp}.jpg`,
      coverImageAlt: 'Runner training on a road',
      templateKey: 'training_journal',
      tags: ['structured', 'training'],
      contentBlocksJson: JSON.stringify([
        { type: 'heading', content: { text: 'Workout Summary' }, metadata: { level: 2 } },
        {
          type: 'paragraph',
          content: {
            text: 'This structured post has enough useful detail for runners reviewing a training session.'
          }
        },
        { type: 'bulletList', content: { items: ['Warm up', 'Run steady', 'Recover well'] } },
        { type: 'closing', content: { text: 'The next goal is to stay consistent.' } }
      ])
    })
  });

  assert.equal(response.status, 201);
  const body = await response.json();
  assert.equal(body.success, true);
  assert.equal(body.post.templateKey, 'training_journal');
  assert.equal(body.post.contentBlocks.length, 4);
  assert.match(body.post.contentHtml, /<h2>Workout Summary<\/h2>/);
  assert.equal(body.post.coverImageAlt, 'Runner training on a road');
  seed.createdPostIds.push(String(body.post._id));
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

test('admin autosave tracks structured block changes', async () => {
  const cookie = await login(seed.admin.email, seed.password);
  await waitForAdminSessionReady(cookie);
  const response = await fetch(`${BASE_URL}/admin/blog/posts/${seed.structuredPost.id}/autosave`, {
    method: 'PATCH',
    headers: {
      Cookie: cookie,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify({
      title: seed.structuredPost.title,
      excerpt: 'Updated structured excerpt',
      category: 'Training',
      coverImageUrl: `https://example.com/cover-structured-${seed.stamp}.jpg`,
      coverImageAlt: 'Runner doing structured training',
      templateKey: 'training_journal',
      status: 'pending',
      tags: ['structured'],
      contentBlocks: [
        { type: 'heading', content: { text: 'Updated Workout Summary' }, metadata: { level: 2 } },
        ...makeEligibleParagraphs('structured-update').map((text) => ({
          type: 'paragraph',
          content: { text }
        })),
        { type: 'closing', content: { text: 'Consistency remains the goal.' } }
      ]
    })
  });

  const body = await response.json();
  assert.equal(response.status, 200, JSON.stringify(body));
  assert.equal(body.success, true);
  assert.ok(body.post.changedFields.includes('contentBlocks'));
  assert.match(body.post.contentHtml, /Updated Workout Summary/);

  await ensureConnected();
  const revision = await BlogRevision.findOne({ postId: seed.structuredPost.id }).sort({ editedAt: -1 });
  assert.ok(revision);
  assert.ok(revision.changedFields.includes('contentBlocks'));
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
    body: JSON.stringify({ originalityConfirmed: true, publicationMode: 'now' }),
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

test('admin and author scheduled filters show the correct owned post', async () => {
  const adminCookie = await login(seed.admin.email, seed.password);
  await waitForAdminSessionReady(adminCookie);
  const adminResponse = await fetch(`${BASE_URL}/admin/blog/review?status=scheduled`, {
    headers: { Cookie: adminCookie, Accept: 'text/html' }
  });
  assert.equal(adminResponse.status, 200);
  assert.match(await adminResponse.text(), new RegExp(escapeRegex(seed.scheduledPost.title)));

  const authorCookie = await login(seed.author.email, seed.password);
  await waitForSessionReady('/blogs/me/dashboard', authorCookie);
  const authorResponse = await fetch(`${BASE_URL}/blogs/me/dashboard?status=scheduled`, {
    headers: { Cookie: authorCookie, Accept: 'text/html' }
  });
  assert.equal(authorResponse.status, 200);
  const html = await authorResponse.text();
  assert.match(html, new RegExp(escapeRegex(seed.scheduledPost.title)));
  assert.match(html, /Propose Update/);
});

test('admin can reschedule and then publish an eligible scheduled post with stale updates rejected', async () => {
  const cookie = await login(seed.admin.email, seed.password);
  await waitForAdminSessionReady(cookie);
  const scheduledFor = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString();
  const reschedule = await fetch(`${BASE_URL}/admin/blog/posts/${seed.scheduledPost.id}/reschedule`, {
    method: 'POST',
    headers: { Cookie: cookie, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ workflowVersion: 0, scheduledFor })
  });
  assert.equal(reschedule.status, 200);
  const rescheduled = await reschedule.json();
  assert.equal(new Date(rescheduled.post.scheduledFor).toISOString(), scheduledFor);
  assert.equal(rescheduled.post.publishedAt, null);

  const stale = await fetch(`${BASE_URL}/admin/blog/posts/${seed.scheduledPost.id}/reschedule`, {
    method: 'POST',
    headers: { Cookie: cookie, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ workflowVersion: 0, scheduledFor: new Date(Date.now() + 21 * 86400000).toISOString() })
  });
  assert.equal(stale.status, 409);

  const publish = await fetch(`${BASE_URL}/admin/blog/posts/${seed.scheduledPost.id}/publish-now`, {
    method: 'POST',
    headers: { Cookie: cookie, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ workflowVersion: 1 })
  });
  assert.equal(publish.status, 200);
  const published = await Blog.findById(seed.scheduledPost.id).lean();
  assert.equal(published.status, 'published');
  assert.equal(published.scheduledFor, null);
  assert.ok(published.publishedAt);
});

test('admin can return a scheduled post to draft and clear publication review state', async () => {
  const cookie = await login(seed.admin.email, seed.password);
  await waitForAdminSessionReady(cookie);
  const response = await fetch(`${BASE_URL}/admin/blog/posts/${seed.scheduledDraftPost.id}/return-draft`, {
    method: 'POST',
    headers: { Cookie: cookie, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ workflowVersion: 0 })
  });
  assert.equal(response.status, 200);
  const post = await Blog.findById(seed.scheduledDraftPost.id).lean();
  assert.equal(post.status, 'draft');
  assert.equal(post.scheduledFor, null);
  assert.equal(post.publishedAt, null);
  assert.equal(post.approvedAt, null);
  assert.equal(post.publicationReview, null);
});

test('scheduled author updates remain revisions through rejection and approval', async () => {
  const authorCookie = await login(seed.author.email, seed.password);
  await waitForSessionReady('/blogs/me/dashboard', authorCookie);
  const original = await Blog.findById(seed.scheduledRevisionPost.id).lean();
  const proposedTitle = `Revised Scheduled Article ${seed.stamp}`.slice(0, 120);
  const submitRevision = async (title) => fetch(`${BASE_URL}/blogs/me/${seed.scheduledRevisionPost.id}`, {
    method: 'POST',
    headers: { Cookie: authorCookie, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      action: 'submit_review',
      title,
      excerpt: 'A revised scheduled article awaiting editorial approval.',
      category: 'General',
      coverImageUrl: original.coverImageUrl,
      coverImageAlt: original.coverImageAlt,
      contentHtml: makeEligibleHtml('scheduled-revision-update')
    })
  });

  const firstSubmit = await submitRevision(proposedTitle);
  assert.equal(firstSubmit.status, 200);
  let source = await Blog.findById(seed.scheduledRevisionPost.id).lean();
  assert.equal(source.status, 'scheduled');
  assert.equal(source.title, original.title);
  assert.equal(source.activeRevisionStatus, 'pending');

  const adminCookie = await login(seed.admin.email, seed.password);
  await waitForAdminSessionReady(adminCookie);
  const reject = await fetch(`${BASE_URL}/admin/blog/posts/${seed.scheduledRevisionPost.id}/reject`, {
    method: 'POST',
    headers: { Cookie: adminCookie, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ rejectionReason: 'Please clarify the scheduled article before publication.' })
  });
  assert.equal(reject.status, 200);
  source = await Blog.findById(seed.scheduledRevisionPost.id).lean();
  assert.equal(source.status, 'scheduled');
  assert.equal(source.title, original.title);
  assert.equal(source.activeRevisionStatus, 'rejected');

  const approvedTitle = `Approved Scheduled Revision ${seed.stamp}`.slice(0, 120);
  const secondSubmit = await submitRevision(approvedTitle);
  assert.equal(secondSubmit.status, 200);
  const schedule = new Date(source.scheduledFor).toISOString();
  const approve = await fetch(`${BASE_URL}/admin/blog/posts/${seed.scheduledRevisionPost.id}/approve`, {
    method: 'POST',
    headers: { Cookie: adminCookie, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      originalityConfirmed: true,
      publicationMode: 'scheduled',
      scheduledFor: schedule
    })
  });
  assert.equal(approve.status, 200);
  source = await Blog.findById(seed.scheduledRevisionPost.id).lean();
  assert.equal(source.status, 'scheduled');
  assert.equal(source.title, approvedTitle);
  assert.equal(source.publishedAt, null);
  assert.equal(source.activeRevisionStatus, '');
  assert.notEqual(source.contentEligibility.sourceHash, original.contentEligibility.sourceHash);
  assert.equal(source.contentEligibility.sourceHash, source.publicationReview.sourceHash);
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

function makeEligibleText(prefix) {
  const stem = String(prefix).replace(/[^a-z]/gi, '').toLowerCase();
  const suffixFor = (number) => {
    let value = number + 1;
    let suffix = '';
    while (value > 0) {
      value -= 1;
      suffix = String.fromCharCode(97 + (value % 26)) + suffix;
      value = Math.floor(value / 26);
    }
    return suffix;
  };
  return Array.from({ length: 540 }, (_, index) => `${stem}${suffixFor(index)}`).join(' ');
}

function makeEligibleHtml(prefix) {
  const sections = makeEligibleParagraphs(prefix);
  return [0, 1, 2].map((section) => (
    `<h2>${prefix} section ${section + 1}</h2><p>${sections[section]}</p>`
  )).join('');
}

function makeEligibleParagraphs(prefix) {
  const words = makeEligibleText(prefix).split(' ');
  return [0, 1, 2].map((section) => words.slice(section * 180, (section + 1) * 180).join(' '));
}

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
    contentHtml: makeEligibleHtml('pending-alpha'),
    contentText: makeEligibleText('pending-alpha'),
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

  const structuredPost = await Blog.create({
    authorId: author._id,
    title: `BAW Structured Pending ${stamp}`.slice(0, 150),
    slug: makeSlug('structured'),
    excerpt: 'Structured pending excerpt',
    contentHtml: `<h2>Workout Summary</h2><p>${makeEligibleText('structured-seed')}</p><h2>Takeaway</h2><p>Consistency remains the goal.</p>`,
    contentText: makeEligibleText('structured-seed'),
    templateKey: 'training_journal',
    contentBlocks: [
      { type: 'heading', order: 0, content: { text: 'Workout Summary' }, metadata: { level: 2 } },
      {
        type: 'paragraph',
        order: 1,
        content: { text: makeEligibleText('structured-seed') },
        metadata: {}
      }
    ],
    coverImageUrl: `https://example.com/cover-structured-${stamp}.jpg`,
    coverImageAlt: 'Runner training',
    category: 'Training',
    status: 'pending',
    submittedAt: new Date()
  });

  const createScheduledPost = async (label, daysAhead) => {
    const reviewedAt = new Date();
    const scheduledFor = new Date(reviewedAt.getTime() + daysAhead * 24 * 60 * 60 * 1000);
    const payload = {
      authorId: author._id,
      title: `BAW Scheduled ${label} ${stamp}`.slice(0, 150),
      slug: makeSlug(`scheduled-${label}`),
      excerpt: `Scheduled ${label} excerpt`,
      contentHtml: makeEligibleHtml(`scheduled-${label}`),
      contentText: makeEligibleText(`scheduled-${label}`),
      contentRaw: makeEligibleText(`scheduled-${label}`),
      coverImageUrl: `https://example.com/cover-scheduled-${label}-${stamp}.jpg`,
      coverImageAlt: `Runner for scheduled ${label} article`,
      category: 'General',
      status: 'scheduled',
      scheduledFor,
      publishedAt: null,
      approvedAt: reviewedAt,
      approvedBy: admin._id,
      contentRisk: 'general',
      searchIndexingStatus: 'noindex',
      searchIndexingReason: 'pending_value_review'
    };
    Object.assign(payload, buildTrustedEditorialReview(payload, admin._id, reviewedAt));
    return Blog.create(payload);
  };

  const scheduledPost = await createScheduledPost('actions', 10);
  const scheduledDraftPost = await createScheduledPost('draft', 11);
  const scheduledRevisionPost = await createScheduledPost('revision', 12);

  return {
    stamp,
    password,
    admin: { id: String(admin._id), email: admin.email },
    author: { id: String(author._id), email: author.email },
    pendingPost: { id: String(pendingPost._id), title: pendingPost.title },
    pendingPost2: { id: String(pendingPost2._id), title: pendingPost2.title },
    publishedPost: { id: String(publishedPost._id) },
    draftPost: { id: String(draftPost._id) },
    structuredPost: { id: String(structuredPost._id), title: structuredPost.title },
    scheduledPost: { id: String(scheduledPost._id), title: scheduledPost.title },
    scheduledDraftPost: { id: String(scheduledDraftPost._id) },
    scheduledRevisionPost: { id: String(scheduledRevisionPost._id), title: scheduledRevisionPost.title },
    createdPostIds: []
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
          currentSeed.draftPost?.id,
          currentSeed.structuredPost?.id,
          currentSeed.scheduledPost?.id,
          currentSeed.scheduledDraftPost?.id,
          currentSeed.scheduledRevisionPost?.id,
          ...(currentSeed.createdPostIds || [])
        ].filter(Boolean)
      }
    }),
    BlogRevision.deleteMany({ postId: { $in: [
      currentSeed.structuredPost?.id,
      currentSeed.scheduledRevisionPost?.id
    ].filter(Boolean) } }),
    User.deleteMany({
      email: { $in: [currentSeed.admin?.email, currentSeed.author?.email].filter(Boolean) }
    })
  ]);
}

async function login(email, password) {
  if (loginCookies.has(email)) return loginCookies.get(email);
  const response = await fetch(`${BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ email, password }),
    redirect: 'manual'
  });
  assert.equal(response.status, 302);
  const setCookie = response.headers.get('set-cookie');
  assert.ok(setCookie);
  const cookie = setCookie.split(';')[0];
  loginCookies.set(email, cookie);
  return cookie;
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

async function waitForSessionReady(sessionPath, cookie) {
  const maxAttempts = 20;
  for (let i = 0; i < maxAttempts; i += 1) {
    const response = await fetch(`${BASE_URL}${sessionPath}`, {
      headers: { Cookie: cookie },
      redirect: 'manual'
    });
    if (response.status !== 302) return true;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  return false;
}

function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
