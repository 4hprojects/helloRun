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
const BlogReport = require('../src/models/BlogReport');
const Notification = require('../src/models/Notification');

const ROOT = path.resolve(__dirname, '..');
const TEST_PORT = 3124;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

let serverProc = null;
let seed = null;
const sessionCookies = new Map();

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
    serverProc.kill('SIGKILL');
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

// ─── PATCH /blog/:slug/comments/:commentId and public history ────────────────

test('unauthenticated users cannot edit comments', async () => {
  const comment = await BlogComment.findById(seed.editableCommentId).lean();
  const response = await fetch(`${BASE_URL}/blog/${seed.post.slug}/comments/${seed.editableCommentId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: 'Anonymous edit', expectedUpdatedAt: comment.updatedAt }),
    redirect: 'manual'
  });
  assert.equal(response.status, 302);
});

test('comment owner can review and save an edit without changing thread identity', async () => {
  const cookie = await login(seed.runner.email, seed.password);
  const before = await BlogComment.findById(seed.editableCommentId).lean();
  const response = await fetch(`${BASE_URL}/blog/${seed.post.slug}/comments/${seed.editableCommentId}`, {
    method: 'PATCH',
    headers: { Cookie: cookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: 'Edited runner comment', expectedUpdatedAt: before.updatedAt })
  });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.comment._id, seed.editableCommentId);
  assert.equal(body.comment.content, 'Edited runner comment');
  assert.equal(body.comment.editCount, 1);
  assert.equal(body.comment.hasEditHistory, true);

  const stored = await BlogComment.findById(seed.editableCommentId).lean();
  assert.equal(stored.editHistory.length, 1);
  assert.equal(stored.editHistory[0].content, 'Original editable comment');
  assert.equal(String(stored.parentCommentId || ''), '');
});

test('public comment history returns chronological previous and current versions', async () => {
  const response = await fetch(`${BASE_URL}/blog/${seed.post.slug}/comments/${seed.editableCommentId}/history`);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.versions.length, 2);
  assert.equal(body.versions[0].content, 'Original editable comment');
  assert.equal(body.versions[0].isCurrent, false);
  assert.equal(body.versions[1].content, 'Edited runner comment');
  assert.equal(body.versions[1].isCurrent, true);
});

test('non-owners cannot edit and stale expected versions are rejected', async () => {
  const ownerCookie = await login(seed.runner.email, seed.password);
  const otherCookie = await login(seed.otherRunner.email, seed.password);
  const current = await BlogComment.findById(seed.staleEditCommentId).lean();
  const unchanged = await fetch(`${BASE_URL}/blog/${seed.post.slug}/comments/${seed.staleEditCommentId}`, {
    method: 'PATCH',
    headers: { Cookie: ownerCookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: current.content, expectedUpdatedAt: current.updatedAt })
  });
  assert.equal(unchanged.status, 400);
  const forbidden = await fetch(`${BASE_URL}/blog/${seed.post.slug}/comments/${seed.staleEditCommentId}`, {
    method: 'PATCH',
    headers: { Cookie: otherCookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: 'Not mine', expectedUpdatedAt: current.updatedAt })
  });
  assert.equal(forbidden.status, 403);

  await BlogComment.updateOne({ _id: seed.staleEditCommentId }, { $set: { content: 'Changed elsewhere' } });
  const stale = await fetch(`${BASE_URL}/blog/${seed.post.slug}/comments/${seed.staleEditCommentId}`, {
    method: 'PATCH',
    headers: { Cookie: ownerCookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: 'Stale attempt', expectedUpdatedAt: current.updatedAt })
  });
  assert.equal(stale.status, 409);

  const crossArticle = await fetch(`${BASE_URL}/blog/${seed.post.slug}/comments/${seed.draftCommentId}`, {
    method: 'PATCH',
    headers: { Cookie: ownerCookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: 'Wrong article', expectedUpdatedAt: current.updatedAt })
  });
  assert.equal(crossArticle.status, 404);
});

test('expired and five-edit comments reject additional edits', async () => {
  const cookie = await login(seed.runner.email, seed.password);
  for (const [commentId, expectedMessage] of [
    [seed.expiredEditCommentId, '30-minute'],
    [seed.maxedEditCommentId, 'five-edit']
  ]) {
    const comment = await BlogComment.findById(commentId).lean();
    const response = await fetch(`${BASE_URL}/blog/${seed.post.slug}/comments/${commentId}`, {
      method: 'PATCH',
      headers: { Cookie: cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: `Updated ${commentId}`, expectedUpdatedAt: comment.updatedAt })
    });
    assert.equal(response.status, 409);
    assert.match((await response.json()).message, new RegExp(expectedMessage, 'i'));
  }
});

test('authors can redact historical text while preserving its public marker', async () => {
  const cookie = await login(seed.runner.email, seed.password);
  const comment = await BlogComment.findById(seed.editableCommentId).lean();
  const revisionId = String(comment.editHistory[0]._id);
  const response = await fetch(`${BASE_URL}/blog/${seed.post.slug}/comments/${seed.editableCommentId}/history/${revisionId}/redact`, {
    method: 'POST',
    headers: { Cookie: cookie, 'Content-Type': 'application/json' },
    body: '{}'
  });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.versions[0].content, 'Revision removed by author');
  assert.equal(body.versions[0].isRedacted, true);
  const stored = await BlogComment.findById(seed.editableCommentId).lean();
  assert.equal(stored.editHistory[0].content, '');
  assert.ok(stored.editHistory[0].redactedAt);
});

test('comment reports retain the reported version after its author edits', async () => {
  const reporterCookie = await login(seed.otherRunner.email, seed.password);
  const ownerCookie = await login(seed.runner.email, seed.password);
  const reportResponse = await fetch(`${BASE_URL}/blog/${seed.post.slug}/comments/${seed.reportSnapshotCommentId}/report`, {
    method: 'POST',
    headers: { Cookie: reporterCookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason: 'abuse', note: 'Snapshot test' })
  });
  assert.equal(reportResponse.status, 201);
  const before = await BlogComment.findById(seed.reportSnapshotCommentId).lean();
  const editResponse = await fetch(`${BASE_URL}/blog/${seed.post.slug}/comments/${seed.reportSnapshotCommentId}`, {
    method: 'PATCH',
    headers: { Cookie: ownerCookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: 'Revised safety check xxxxxxx', expectedUpdatedAt: before.updatedAt })
  });
  assert.equal(editResponse.status, 200);
  const report = await BlogReport.findOne({ commentId: seed.reportSnapshotCommentId, note: 'Snapshot test' }).lean();
  assert.equal(report.commentContentSnapshot, 'Original wording captured by report');
  assert.equal(String(report.commentAuthorIdSnapshot), String(seed.runner.id));
  assert.equal(report.commentEditCountSnapshot, 0);
  assert.ok(report.commentRevisionAtSnapshot);
  const edited = await BlogComment.findById(seed.reportSnapshotCommentId).lean();
  assert.ok(edited.moderationFlags.includes('comment_repeated_characters'));

  const revisionId = String(edited.editHistory[0]._id);
  const forbiddenRedaction = await fetch(`${BASE_URL}/blog/${seed.post.slug}/comments/${seed.reportSnapshotCommentId}/history/${revisionId}/redact`, {
    method: 'POST',
    headers: { Cookie: reporterCookie, 'Content-Type': 'application/json' },
    body: '{}'
  });
  assert.equal(forbiddenRedaction.status, 403);
});

test('authenticated runners can reply to comments and receive a focused notification', async () => {
  const cookie = await login(seed.otherRunner.email, seed.password);
  await waitForSessionReady('/runner/dashboard', cookie);
  const response = await fetch(`${BASE_URL}/blog/${seed.post.slug}/comments`, {
    method: 'POST',
    headers: { Cookie: cookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: 'This is a nested reply.', replyToCommentId: seed.threadRootId })
  });
  assert.equal(response.status, 201);
  const body = await response.json();
  assert.equal(body.comment.parentCommentId, seed.threadRootId);
  assert.equal(body.comment.replyToCommentId, seed.threadRootId);
  seed.createdReplyId = body.comment._id;

  const notification = await Notification.findOne({
    userId: seed.runner.id,
    type: 'blog_comment_reply',
    'metadata.replyId': body.comment._id
  }).lean();
  assert.ok(notification);
  assert.match(notification.href, new RegExp(`thread=${seed.threadRootId}`));
  assert.match(notification.href, new RegExp(`reply=${body.comment._id}`));
});

test('replies to replies remain at one visual level and target the specific reply', async () => {
  const cookie = await login(seed.runner.email, seed.password);
  await waitForSessionReady('/runner/dashboard', cookie);
  const response = await fetch(`${BASE_URL}/blog/${seed.post.slug}/comments`, {
    method: 'POST',
    headers: { Cookie: cookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: 'Replying within the same thread.', replyToCommentId: seed.createdReplyId })
  });
  assert.equal(response.status, 201);
  const body = await response.json();
  assert.equal(body.comment.parentCommentId, seed.threadRootId);
  assert.equal(body.comment.replyToCommentId, seed.createdReplyId);
});

test('self-replies do not create runner notifications', async () => {
  const cookie = await login(seed.runner.email, seed.password);
  await waitForSessionReady('/runner/dashboard', cookie);
  const response = await fetch(`${BASE_URL}/blog/${seed.post.slug}/comments`, {
    method: 'POST',
    headers: { Cookie: cookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: 'Adding context to my own comment.', replyToCommentId: seed.threadRootId })
  });
  assert.equal(response.status, 201);
  const body = await response.json();
  const notification = await Notification.findOne({
    userId: seed.runner.id,
    type: 'blog_comment_reply',
    'metadata.replyId': body.comment._id
  }).lean();
  assert.equal(notification, null);
});

test('invalid reply identifiers are rejected', async () => {
  const cookie = await login(seed.runner.email, seed.password);
  const response = await fetch(`${BASE_URL}/blog/${seed.post.slug}/comments`, {
    method: 'POST',
    headers: { Cookie: cookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: 'Invalid target.', replyToCommentId: 'not-an-object-id' })
  });
  assert.equal(response.status, 400);
});

test('reply targets from another article are rejected', async () => {
  const cookie = await login(seed.otherRunner.email, seed.password);
  await waitForSessionReady('/runner/dashboard', cookie);
  const response = await fetch(`${BASE_URL}/blog/${seed.post.slug}/comments`, {
    method: 'POST',
    headers: { Cookie: cookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: 'Wrong thread.', replyToCommentId: seed.draftCommentId })
  });
  assert.equal(response.status, 404);
});

test('thread listings preview three replies and paginate all replies chronologically', async () => {
  const response = await fetch(`${BASE_URL}/blog/${seed.post.slug}/comments?thread=${seed.previewThreadRootId}`);
  assert.equal(response.status, 200);
  const body = await response.json();
  const thread = body.comments.find((item) => item._id === seed.previewThreadRootId)
    || (body.focusedThread?._id === seed.previewThreadRootId ? body.focusedThread : null);
  assert.ok(thread);
  assert.equal(thread.replyCount, 4);
  assert.equal(thread.replies.length, 3);
  assert.equal(thread.hasMoreReplies, true);

  const repliesResponse = await fetch(`${BASE_URL}/blog/${seed.post.slug}/comments/${seed.previewThreadRootId}/replies`);
  assert.equal(repliesResponse.status, 200);
  const repliesBody = await repliesResponse.json();
  assert.equal(repliesBody.replies.length, 4);
  assert.deepEqual(repliesBody.replies.map((item) => item.content), [
    'Preview reply 1', 'Preview reply 2', 'Preview reply 3', 'Preview reply 4'
  ]);
});

test('deleting a parent keeps a tombstone while its active replies remain', async () => {
  const cookie = await login(seed.runner.email, seed.password);
  await waitForSessionReady('/runner/dashboard', cookie);
  const response = await fetch(`${BASE_URL}/blog/${seed.post.slug}/comments/${seed.deleteThreadRootId}`, {
    method: 'DELETE',
    headers: { Cookie: cookie }
  });
  assert.equal(response.status, 200);

  const listResponse = await fetch(`${BASE_URL}/blog/${seed.post.slug}/comments?thread=${seed.deleteThreadRootId}`);
  const body = await listResponse.json();
  const thread = body.comments.find((item) => item._id === seed.deleteThreadRootId)
    || (body.focusedThread?._id === seed.deleteThreadRootId ? body.focusedThread : null);
  assert.ok(thread);
  assert.equal(thread.isTombstone, true);
  assert.equal(thread.content, 'Comment deleted');
  assert.equal(thread.replyCount, 1);

  const replyAttemptCookie = await login(seed.otherRunner.email, seed.password);
  const replyAttempt = await fetch(`${BASE_URL}/blog/${seed.post.slug}/comments`, {
    method: 'POST',
    headers: { Cookie: replyAttemptCookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: 'Cannot reply directly to a deleted parent.', replyToCommentId: seed.deleteThreadRootId })
  });
  assert.equal(replyAttempt.status, 404);

  const deleteReplyResponse = await fetch(`${BASE_URL}/blog/${seed.post.slug}/comments/${seed.deleteThreadReplyId}`, {
    method: 'DELETE',
    headers: { Cookie: replyAttemptCookie }
  });
  assert.equal(deleteReplyResponse.status, 200);
  const emptyThreadResponse = await fetch(`${BASE_URL}/blog/${seed.post.slug}/comments?thread=${seed.deleteThreadRootId}`);
  const emptyThreadBody = await emptyThreadResponse.json();
  assert.ok(!emptyThreadBody.comments.some((item) => item._id === seed.deleteThreadRootId));
  assert.notEqual(emptyThreadBody.focusedThread?._id, seed.deleteThreadRootId);
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

  const historyResponse = await fetch(`${BASE_URL}/blog/${seed.post.slug}/comments/${seed.deleteableCommentId}/history`);
  assert.equal(historyResponse.status, 404);
});

test('deleted comment no longer appears in comments list', async () => {
  const response = await fetch(`${BASE_URL}/blog/${seed.post.slug}/comments`);
  const body = await response.json();
  assert.ok(Array.isArray(body.comments));
  assert.ok(!body.comments.some((c) => String(c._id) === seed.deleteableCommentId));
});

// ─── POST /blog/:slug/comments/:commentId/report ─────────────────────────────

test('unauthenticated users cannot report comments', async () => {
  const response = await fetch(
    `${BASE_URL}/blog/${seed.post.slug}/comments/${seed.reportableCommentId}/report`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason: 'spam' }), redirect: 'manual' }
  );
  assert.equal(response.status, 302);
});

test('runner cannot report their own comment', async () => {
  const cookie = await login(seed.runner.email, seed.password);
  await waitForSessionReady('/runner/dashboard', cookie);
  const response = await fetch(
    `${BASE_URL}/blog/${seed.post.slug}/comments/${seed.reportableCommentId}/report`,
    { method: 'POST', headers: { Cookie: cookie, 'Content-Type': 'application/json' }, body: JSON.stringify({ reason: 'abuse' }) }
  );
  assert.equal(response.status, 403);
  assert.equal((await response.json()).message, 'You cannot report your own comment.');
});

test('another runner can submit every supported comment report reason with an optional note', async () => {
  const cookie = await login(seed.otherRunner.email, seed.password);
  await waitForSessionReady('/runner/dashboard', cookie);
  for (const reason of BlogReport.REPORT_REASONS) {
    const response = await fetch(
      `${BASE_URL}/blog/${seed.post.slug}/comments/${seed.reportableCommentId}/report`,
      {
        method: 'POST',
        headers: { Cookie: cookie, 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, note: `Context for ${reason}` })
      }
    );
    assert.equal(response.status, 201, `Expected ${reason} to be accepted`);
    const report = await BlogReport.findOne({ commentId: seed.reportableCommentId, reporterId: seed.otherRunner.id }).lean();
    assert.equal(report.reason, reason);
    assert.equal(report.note, `Context for ${reason}`);
    await BlogReport.deleteOne({ _id: report._id });
  }
});

test('missing and invalid comment report reasons are rejected', async () => {
  const cookie = await login(seed.otherRunner.email, seed.password);
  await waitForSessionReady('/runner/dashboard', cookie);
  for (const body of [{}, { reason: 'not-a-reason' }]) {
    const response = await fetch(
      `${BASE_URL}/blog/${seed.post.slug}/comments/${seed.invalidReportCommentId}/report`,
      { method: 'POST', headers: { Cookie: cookie, 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
    );
    assert.equal(response.status, 400);
  }
});

test('duplicate open comment reports remain blocked', async () => {
  const cookie = await login(seed.otherRunner.email, seed.password);
  await waitForSessionReady('/runner/dashboard', cookie);
  const url = `${BASE_URL}/blog/${seed.post.slug}/comments/${seed.duplicateReportCommentId}/report`;
  const request = () => fetch(url, {
    method: 'POST',
    headers: { Cookie: cookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason: 'spam' })
  });
  assert.equal((await request()).status, 201);
  const duplicate = await request();
  assert.equal(duplicate.status, 409);
  assert.match((await duplicate.json()).message, /already have an open report/i);
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
  const reportableComment = await BlogComment.create({
    blogId: post._id,
    authorId: runner._id,
    content: 'A comment another runner may report'
  });
  const invalidReportComment = await BlogComment.create({
    blogId: post._id,
    authorId: runner._id,
    content: 'A comment used to validate report reasons'
  });
  const duplicateReportComment = await BlogComment.create({
    blogId: post._id,
    authorId: runner._id,
    content: 'A comment used to prevent duplicate reports'
  });
  const editableComment = await BlogComment.create({
    blogId: post._id,
    authorId: runner._id,
    content: 'Original editable comment'
  });
  const staleEditComment = await BlogComment.create({
    blogId: post._id,
    authorId: runner._id,
    content: 'Comment for concurrency protection'
  });
  const expiredEditComment = await BlogComment.create({
    blogId: post._id,
    authorId: runner._id,
    content: 'Comment with an expired edit window',
    createdAt: new Date(Date.now() - 30 * 60 * 1000),
    updatedAt: new Date(Date.now() - 30 * 60 * 1000)
  });
  const maxedEditComment = await BlogComment.create({
    blogId: post._id,
    authorId: runner._id,
    content: 'Comment at the edit limit',
    editCount: 5
  });
  const reportSnapshotComment = await BlogComment.create({
    blogId: post._id,
    authorId: runner._id,
    content: 'Original wording captured by report'
  });
  const threadRoot = await BlogComment.create({
    blogId: post._id,
    authorId: runner._id,
    content: 'A root comment with nested replies'
  });
  const previewThreadRoot = await BlogComment.create({
    blogId: post._id,
    authorId: runner._id,
    content: 'A root comment with a reply preview'
  });
  const previewBaseTime = Date.now() - 10000;
  for (let index = 1; index <= 4; index += 1) {
    await BlogComment.create({
      blogId: post._id,
      authorId: otherRunner._id,
      parentCommentId: previewThreadRoot._id,
      replyToCommentId: previewThreadRoot._id,
      content: `Preview reply ${index}`,
      createdAt: new Date(previewBaseTime + index * 1000),
      updatedAt: new Date(previewBaseTime + index * 1000)
    });
  }
  const deleteThreadRoot = await BlogComment.create({
    blogId: post._id,
    authorId: runner._id,
    content: 'A parent that will become a tombstone'
  });
  const deleteThreadReply = await BlogComment.create({
    blogId: post._id,
    authorId: otherRunner._id,
    parentCommentId: deleteThreadRoot._id,
    replyToCommentId: deleteThreadRoot._id,
    content: 'This active reply keeps the thread visible'
  });
  const draftComment = await BlogComment.create({
    blogId: draftPost._id,
    authorId: runner._id,
    content: 'A comment belonging to another article'
  });
  await Blog.updateOne({ _id: post._id }, { $set: { commentsCount: 17 } });

  return {
    stamp,
    password,
    admin: { id: admin._id, email: admin.email },
    runner: { id: runner._id, email: runner.email },
    otherRunner: { id: otherRunner._id, email: otherRunner.email },
    post: { id: post._id, slug: post.slug },
    draftPost: { id: draftPost._id, slug: draftPost.slug },
    deleteableCommentId: String(deleteableComment._id),
    reportableCommentId: String(reportableComment._id),
    invalidReportCommentId: String(invalidReportComment._id),
    duplicateReportCommentId: String(duplicateReportComment._id),
    editableCommentId: String(editableComment._id),
    staleEditCommentId: String(staleEditComment._id),
    expiredEditCommentId: String(expiredEditComment._id),
    maxedEditCommentId: String(maxedEditComment._id),
    reportSnapshotCommentId: String(reportSnapshotComment._id),
    threadRootId: String(threadRoot._id),
    previewThreadRootId: String(previewThreadRoot._id),
    deleteThreadRootId: String(deleteThreadRoot._id),
    deleteThreadReplyId: String(deleteThreadReply._id),
    draftCommentId: String(draftComment._id)
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
    BlogReport.deleteMany({ blogId: { $in: postIds } }),
    Notification.deleteMany({
      $or: [
        { userId: { $in: [currentSeed.runner?.id, currentSeed.otherRunner?.id].filter(Boolean) } },
        { 'metadata.blogId': String(currentSeed.post?.id || '') }
      ]
    }),
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
  if (sessionCookies.has(email)) return sessionCookies.get(email);
  const response = await fetch(`${BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ email, password }),
    redirect: 'manual'
  });
  assert.equal(response.status, 302, `Login failed for ${email}`);
  const setCookie = response.headers.get('set-cookie');
  assert.ok(setCookie, 'Expected Set-Cookie header after login');
  const cookie = setCookie.split(';')[0];
  sessionCookies.set(email, cookie);
  return cookie;
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
