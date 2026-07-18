const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const BlogComment = require('../src/models/BlogComment');
const {
  REPLY_PREVIEW_SIZE,
  REPLIES_PAGE_SIZE,
  EDIT_WINDOW_MS,
  MAX_COMMENT_EDITS,
  REDACTED_REVISION_TEXT,
  getAuthorName,
  sanitizeCommentContent,
  presentComment,
  presentRevision
} = require('../src/services/blog-comment.service');
const { buildNotificationPresentation } = require('../src/services/notification.service');

test('blog comments store root and specific reply targets in the existing collection', () => {
  assert.equal(BlogComment.schema.path('parentCommentId').options.ref, 'BlogComment');
  assert.equal(BlogComment.schema.path('replyToCommentId').options.ref, 'BlogComment');
  assert.equal(BlogComment.schema.path('parentCommentId').options.default, null);
  assert.equal(BlogComment.schema.path('replyToCommentId').options.default, null);
  assert.equal(REPLY_PREVIEW_SIZE, 3);
  assert.equal(REPLIES_PAGE_SIZE, 20);
  assert.equal(EDIT_WINDOW_MS, 30 * 60 * 1000);
  assert.equal(MAX_COMMENT_EDITS, 5);
  assert.equal(BlogComment.schema.path('editCount').options.max, 5);
  assert.ok(BlogComment.schema.path('editHistory'));
});

test('comment presentation exposes bounded editing metadata without revision contents', () => {
  const createdAt = new Date('2026-07-18T01:00:00.000Z');
  const lastEditedAt = new Date('2026-07-18T01:05:00.000Z');
  const result = presentComment({
    _id: new mongoose.Types.ObjectId(),
    authorId: new mongoose.Types.ObjectId(),
    content: 'Revised text',
    status: 'active',
    createdAt,
    updatedAt: lastEditedAt,
    editCount: 1,
    lastEditedAt,
    editHistory: [{ _id: new mongoose.Types.ObjectId(), content: 'Original text' }]
  });
  assert.equal(result.editCount, 1);
  assert.equal(result.hasEditHistory, true);
  assert.equal(result.editLimitReached, false);
  assert.equal(new Date(result.editableUntil).getTime(), createdAt.getTime() + EDIT_WINDOW_MS);
  assert.equal(Object.hasOwn(result, 'editHistory'), false);
});

test('public revision presentation replaces redacted text while preserving timestamps', () => {
  const revisionId = new mongoose.Types.ObjectId();
  const revision = presentRevision({
    _id: revisionId,
    content: 'Sensitive text',
    effectiveAt: new Date('2026-07-18T01:00:00.000Z'),
    replacedAt: new Date('2026-07-18T01:05:00.000Z'),
    redactedAt: new Date('2026-07-18T01:10:00.000Z')
  });
  assert.equal(revision._id, String(revisionId));
  assert.equal(revision.content, REDACTED_REVISION_TEXT);
  assert.equal(revision.isRedacted, true);
  assert.equal(revision.isCurrent, false);
});

test('comment content is text-only and author names use deterministic fallbacks', () => {
  assert.equal(sanitizeCommentContent(' <strong>Hello</strong> <script>bad()</script> '), 'Hello');
  assert.equal(getAuthorName({ displayName: 'Trail Runner', firstName: 'Ignored' }), 'Trail Runner');
  assert.equal(getAuthorName({ firstName: 'June', lastName: 'Runner' }), 'June Runner');
  assert.equal(getAuthorName({}), 'HelloRun runner');
});

test('reply presentation identifies the specific runner being answered', () => {
  const authorId = new mongoose.Types.ObjectId();
  const targetId = new mongoose.Types.ObjectId();
  const reply = presentComment({
    _id: new mongoose.Types.ObjectId(),
    authorId: { _id: authorId, firstName: 'Replying', lastName: 'Runner' },
    parentCommentId: new mongoose.Types.ObjectId(),
    replyToCommentId: {
      _id: targetId,
      authorId: { firstName: 'Original', lastName: 'Runner' }
    },
    content: 'A nested response',
    status: 'active',
    createdAt: new Date('2026-07-18T01:00:00.000Z')
  });
  assert.equal(reply.authorName, 'Replying Runner');
  assert.equal(reply.replyToAuthorName, 'Original Runner');
  assert.equal(reply.replyToCommentId, String(targetId));
  assert.equal(reply.isTombstone, false);
});

test('removed parent presentation preserves a neutral thread tombstone', () => {
  const result = presentComment({
    _id: new mongoose.Types.ObjectId(),
    authorId: new mongoose.Types.ObjectId(),
    content: 'Removed content',
    status: 'removed',
    isDeleted: true
  });
  assert.equal(result.content, 'Comment deleted');
  assert.equal(result.authorName, 'Deleted comment');
  assert.equal(result.isTombstone, true);
});

test('reply notifications use community presentation and a direct action', () => {
  const presentation = buildNotificationPresentation({
    type: 'blog_comment_reply',
    message: 'A runner replied to your comment.',
    href: '/blog/community-story?thread=abc&reply=def#comment-def'
  });
  assert.equal(presentation.category, 'Community');
  assert.equal(presentation.actionLabel, 'View reply');
  assert.equal(presentation.icon, 'message-circle-reply');
  assert.equal(presentation.href, '/blog/community-story?thread=abc&reply=def#comment-def');
});
