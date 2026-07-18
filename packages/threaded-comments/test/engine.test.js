'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createThreadedComments, normalizePolicy, ThreadedCommentsError } = require('..');
const { presentComment } = require('../src/presentation');
const { createInMemoryRepositories } = require('../src/testing');

function fixture(now = new Date('2026-07-18T00:10:00.000Z')) {
  const memory = createInMemoryRepositories({ resources: [{ id: 'post-1', key: 'story', commentsCount: 0 }] });
  let sequence = 0;
  let tick = 0;
  const workflow = createThreadedComments({
    repositories: memory.repositories,
    clock: { now: () => new Date(new Date(now).getTime() + (tick++ * 1000)) },
    ids: { next: () => `id-${++sequence}` },
    sanitize: (value) => value.replace(/<[^>]*>/g, '').trim(),
    policy: { editWindowMs: 30 * 60 * 1000, maxEdits: 5 }
  });
  return { ...memory, workflow };
}

test('policy normalization is bounded and integration-owned', () => {
  const policy = normalizePolicy({ commentsPageSize: 999, replyPreviewSize: 4, reportReasons: ['abuse', 'other'] });
  assert.equal(policy.commentsPageSize, 100);
  assert.equal(policy.replyPreviewSize, 4);
  assert.deepEqual(policy.reportReasons, ['abuse', 'other']);
});

test('presentation normalizes Mongoose-style ObjectId references without using their buffer id', () => {
  const objectId = { id: Buffer.from('bad-buffer'), toHexString: () => '6a5b9e6ff8f8e1479efc0b8f' };
  const result = presentComment({ _id: objectId, authorId: objectId, parentCommentId: objectId, replyToCommentId: objectId, content: 'Reply' }, normalizePolicy());
  assert.equal(result._id, '6a5b9e6ff8f8e1479efc0b8f');
  assert.equal(result.authorId._id, '6a5b9e6ff8f8e1479efc0b8f');
  assert.equal(result.parentCommentId, '6a5b9e6ff8f8e1479efc0b8f');
  assert.equal(result.replyToCommentId, '6a5b9e6ff8f8e1479efc0b8f');
});

test('creates roots and normalizes replies to one root', async () => {
  const { workflow, state } = fixture();
  const root = await workflow.create({ resourceKey: 'story', actor: { id: 'u1' }, content: 'Root' });
  const reply = await workflow.create({ resourceKey: 'story', actor: { id: 'u2' }, content: 'Reply', replyToCommentId: root._id });
  const nested = await workflow.create({ resourceKey: 'story', actor: { id: 'u3' }, content: 'Nested', replyToCommentId: reply._id });
  assert.equal(reply.parentCommentId, root._id);
  assert.equal(nested.parentCommentId, root._id);
  assert.equal(state.resources[0].commentsCount, 3);
});

test('editing stores history and rejects a stale version', async () => {
  const { workflow } = fixture();
  const root = await workflow.create({ resourceKey: 'story', actor: { id: 'u1' }, content: 'Original' });
  const edited = await workflow.edit({ resourceKey: 'story', actor: { id: 'u1' }, commentId: root._id, content: 'Changed', expectedVersion: root.updatedAt });
  assert.equal(edited.content, 'Changed');
  await assert.rejects(
    workflow.edit({ resourceKey: 'story', actor: { id: 'u1' }, commentId: root._id, content: 'Again', expectedVersion: root.updatedAt }),
    (error) => error instanceof ThreadedCommentsError && error.code === 'stale_version' && error.status === 409
  );
});

test('reports snapshot the current version and prohibit self-reporting', async () => {
  const { workflow, state } = fixture();
  const root = await workflow.create({ resourceKey: 'story', actor: { id: 'u1' }, content: 'Review me' });
  await assert.rejects(workflow.report({ resourceKey: 'story', actor: { id: 'u1' }, commentId: root._id, reason: 'abuse' }), /cannot report your own/i);
  await workflow.report({ resourceKey: 'story', actor: { id: 'u2' }, commentId: root._id, reason: 'abuse', note: 'Context' });
  assert.equal(state.reports[0].snapshot.content, 'Review me');
  assert.equal(state.reports[0].snapshot.authorId, 'u1');
});

test('deletion retains root identity metadata and decrements contributions', async () => {
  const { workflow, state } = fixture();
  const root = await workflow.create({ resourceKey: 'story', actor: { id: 'u1' }, content: 'Remove me' });
  const result = await workflow.remove({ resourceKey: 'story', actor: { id: 'u1' }, commentId: root._id });
  assert.deepEqual(result, { commentId: root._id, rootCommentId: root._id, wasReply: false });
  assert.equal(state.resources[0].commentsCount, 0);
});
