const mongoose = require('mongoose');
const Blog = require('../models/Blog');
const BlogComment = require('../models/BlogComment');
const User = require('../models/User');
const { sanitizeHtml } = require('../utils/sanitize');
const { analyzeCommentSafety } = require('../utils/blog-safety');
const { createNotificationSafe } = require('./notification.service');
const {
  normalizePolicy,
  presentComment: presentPackageComment,
  presentRevision: presentPackageRevision,
  createLifecycleBus,
  LIFECYCLE_EVENTS,
  createMongooseRepositories
} = require('@hellorun/threaded-comments');

const COMMENT_POLICY = normalizePolicy({
  commentsPageSize: 20,
  repliesPageSize: 20,
  replyPreviewSize: 3,
  maxContentLength: BlogComment.MAX_COMMENT_LENGTH,
  editWindowMs: 30 * 60 * 1000,
  maxEdits: 5,
  tombstoneText: 'Comment deleted',
  redactedRevisionText: 'Revision removed by author',
  reportReasons: ['spam', 'plagiarism', 'promotion', 'unsafe_medical', 'abuse', 'other']
});
const COMMENTS_PAGE_SIZE = COMMENT_POLICY.commentsPageSize;
const REPLIES_PAGE_SIZE = COMMENT_POLICY.repliesPageSize;
const REPLY_PREVIEW_SIZE = COMMENT_POLICY.replyPreviewSize;
const MAX_COMMENT_LENGTH = COMMENT_POLICY.maxContentLength;
const EDIT_WINDOW_MS = COMMENT_POLICY.editWindowMs;
const MAX_COMMENT_EDITS = COMMENT_POLICY.maxEdits;
const REDACTED_REVISION_TEXT = COMMENT_POLICY.redactedRevisionText;
const commentLifecycle = createLifecycleBus();
const compatibilityRepositories = createMongooseRepositories({
  models: { Comment: BlogComment, Resource: Blog, Identity: User },
  fields: {
    resourceId: 'blogId',
    resourceKey: 'slug',
    resourceVisibleQuery: { status: 'published', isDeleted: { $ne: true } },
    contributionCount: 'commentsCount'
  },
  createId: () => new mongoose.Types.ObjectId(),
  toObjectId: (value) => normalizeObjectId(value) || value,
  populate: populateComments
});

class BlogCommentError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = 'BlogCommentError';
    this.status = status;
  }
}

function normalizeObjectId(value) {
  const safe = String(value || '').trim();
  return mongoose.Types.ObjectId.isValid(safe) ? safe : '';
}

function clampPage(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, 500) : 1;
}

function sanitizeCommentContent(value) {
  return sanitizeHtml(String(value || ''), { allowedTags: [], allowedAttributes: {} }).trim();
}

function getAuthorName(author = {}) {
  return String(author.displayName || `${author.firstName || ''} ${author.lastName || ''}`)
    .replace(/\s+/g, ' ')
    .trim() || 'HelloRun runner';
}

commentLifecycle.on(LIFECYCLE_EVENTS.REPLY_CREATED, async ({ post, target, comment, parentCommentId, actor }) => {
  if (!target || String(target.authorId) === String(actor?._id || actor?.id || actor)) return;
  const authorName = getAuthorName(actor || {});
  await createNotificationSafe({
    userId: target.authorId,
    type: 'blog_comment_reply',
    title: 'New reply to your comment',
    message: `${authorName} replied to your comment on “${post.title || 'a community story'}.”`,
    href: `/blog/${encodeURIComponent(post.slug)}?thread=${String(parentCommentId)}&reply=${String(comment._id)}#comment-${String(comment._id)}`,
    metadata: {
      blogId: String(post._id),
      rootCommentId: String(parentCommentId),
      replyToCommentId: String(target._id),
      replyId: String(comment._id)
    }
  }, 'blog comment reply notification');
});

async function getPublishedBlogBySlug(slug) {
  return compatibilityRepositories.resources.findVisible(slug);
}

async function populateComments(comments) {
  return BlogComment.populate(comments, [
    { path: 'authorId', select: 'displayName firstName lastName avatarUrl' },
    {
      path: 'replyToCommentId',
      select: 'authorId',
      populate: { path: 'authorId', select: 'displayName firstName lastName' }
    }
  ]);
}

function presentComment(comment = {}, options = {}) {
  const authorIsPopulated = comment.authorId && typeof comment.authorId === 'object'
    && ['displayName', 'firstName', 'lastName', 'avatarUrl'].some((field) => Object.hasOwn(comment.authorId, field));
  const author = authorIsPopulated ? comment.authorId : { _id: comment.authorId };
  const replyTarget = comment.replyToCommentId && typeof comment.replyToCommentId === 'object'
    && comment.replyToCommentId.authorId
    ? comment.replyToCommentId
    : null;
  const presented = presentPackageComment(comment, COMMENT_POLICY, {
    ...options,
    author,
    replyTargetAuthor: replyTarget?.authorId || {},
    getAuthorName
  });
  // Preserve HelloRun's established tombstone identity copy and populated target ID shape.
  if (presented.isTombstone) presented.authorName = 'Deleted comment';
  if (replyTarget?._id) presented.replyToCommentId = String(replyTarget._id);
  return presented;
}

function validateCommentInput(input, currentContent = null) {
  const rawContent = String(input || '').trim();
  if (!rawContent) throw new BlogCommentError('Comment content is required.', 400);
  if (rawContent.length > MAX_COMMENT_LENGTH) {
    throw new BlogCommentError(`Comment must not exceed ${MAX_COMMENT_LENGTH} characters.`, 400);
  }
  const content = sanitizeCommentContent(rawContent);
  if (!content) throw new BlogCommentError('Comment content is required.', 400);
  if (currentContent !== null && content === String(currentContent || '')) {
    throw new BlogCommentError('Make a change before saving your comment.', 400);
  }
  return content;
}

function presentRevision(revision = {}, options = {}) {
  return presentPackageRevision(revision, COMMENT_POLICY, options);
}

async function getActiveCommentForPost(post, commentId) {
  const normalizedId = normalizeObjectId(commentId);
  if (!normalizedId) throw new BlogCommentError('Invalid comment id.', 400);
  const comment = await BlogComment.findOne({
    _id: normalizedId,
    blogId: post._id,
    status: 'active',
    isDeleted: { $ne: true }
  }).lean();
  if (!comment) throw new BlogCommentError('Comment not found.', 404);
  return comment;
}

async function listCommentHistory(post, commentId) {
  const comment = await getActiveCommentForPost(post, commentId);
  const [populated] = await populateComments([comment]);
  const history = Array.isArray(populated.editHistory)
    ? populated.editHistory.map((revision) => presentRevision(revision))
    : [];
  history.sort((a, b) => new Date(a.effectiveAt) - new Date(b.effectiveAt));
  history.push(presentRevision({
    _id: populated._id,
    content: populated.content,
    effectiveAt: populated.lastEditedAt || populated.createdAt,
    replacedAt: null,
    redactedAt: null
  }, { isCurrent: true }));
  return {
    comment: presentComment(populated),
    versions: history
  };
}

async function editComment({ post, commentId, userId, content: input, expectedUpdatedAt, now = new Date() }) {
  const comment = await getActiveCommentForPost(post, commentId);
  if (String(comment.authorId) !== String(userId)) {
    throw new BlogCommentError('You can only edit your own comment.', 403);
  }
  const createdAt = new Date(comment.createdAt);
  if (!Number.isFinite(createdAt.getTime()) || now.getTime() >= createdAt.getTime() + EDIT_WINDOW_MS) {
    throw new BlogCommentError('The 30-minute editing window has ended.', 409);
  }
  if (Number(comment.editCount || 0) >= MAX_COMMENT_EDITS) {
    throw new BlogCommentError('This comment has reached its five-edit limit.', 409);
  }
  const expectedDate = new Date(expectedUpdatedAt);
  if (!expectedUpdatedAt || !Number.isFinite(expectedDate.getTime())) {
    throw new BlogCommentError('Refresh the discussion before editing this comment.', 400);
  }
  if (new Date(comment.updatedAt).getTime() !== expectedDate.getTime()) {
    throw new BlogCommentError('This comment changed in another session. Refresh and try again.', 409);
  }
  const content = validateCommentInput(input, comment.content);
  const safety = analyzeCommentSafety(content);
  const revision = {
    _id: new mongoose.Types.ObjectId(),
    content: String(comment.content || ''),
    effectiveAt: comment.lastEditedAt || comment.createdAt,
    replacedAt: now
  };
  const result = await BlogComment.updateOne(
    {
      _id: comment._id,
      blogId: post._id,
      authorId: userId,
      status: 'active',
      isDeleted: { $ne: true },
      updatedAt: expectedDate
    },
    {
      $set: {
        content,
        lastEditedAt: now,
        moderationFlags: safety.flags,
        moderationFlagSummary: safety.summary
      },
      $inc: { editCount: 1 },
      $push: { editHistory: revision }
    }
  );
  if (result.modifiedCount !== 1) {
    throw new BlogCommentError('This comment changed in another session. Refresh and try again.', 409);
  }
  const updated = await BlogComment.findById(comment._id).lean();
  const [populated] = await populateComments([updated]);
  return presentComment(populated);
}

async function redactCommentRevision({ post, commentId, revisionId, userId, now = new Date() }) {
  const comment = await getActiveCommentForPost(post, commentId);
  if (String(comment.authorId) !== String(userId)) {
    throw new BlogCommentError('You can only redact revisions from your own comment.', 403);
  }
  const normalizedRevisionId = normalizeObjectId(revisionId);
  if (!normalizedRevisionId) throw new BlogCommentError('Invalid revision id.', 400);
  const revision = (comment.editHistory || []).find((item) => String(item._id) === normalizedRevisionId);
  if (!revision) throw new BlogCommentError('Revision not found.', 404);
  if (!revision.redactedAt) {
    const result = await BlogComment.updateOne(
      {
        _id: comment._id,
        authorId: userId,
        status: 'active',
        isDeleted: { $ne: true },
        'editHistory._id': normalizedRevisionId
      },
      {
        $set: {
          'editHistory.$.content': '',
          'editHistory.$.redactedAt': now,
          'editHistory.$.redactedBy': userId
        }
      }
    );
    if (result.modifiedCount !== 1) throw new BlogCommentError('Revision could not be redacted.', 409);
  }
  return listCommentHistory(post, commentId);
}

async function getVisibleRootIds(blogId) {
  return BlogComment.distinct('parentCommentId', {
    blogId,
    parentCommentId: { $ne: null },
    status: 'active',
    isDeleted: { $ne: true }
  });
}

function buildVisibleRootQuery(blogId, rootsWithReplies) {
  return {
    blogId,
    parentCommentId: null,
    $or: [
      { status: 'active', isDeleted: { $ne: true } },
      { _id: { $in: rootsWithReplies } }
    ]
  };
}

async function buildReplyPreviews(rootIds) {
  if (!rootIds.length) return new Map();
  const grouped = await BlogComment.aggregate([
    {
      $match: {
        parentCommentId: { $in: rootIds },
        status: 'active',
        isDeleted: { $ne: true }
      }
    },
    { $sort: { createdAt: 1, _id: 1 } },
    {
      $group: {
        _id: '$parentCommentId',
        replyCount: { $sum: 1 },
        replies: { $push: '$$ROOT' }
      }
    },
    { $project: { replyCount: 1, replies: { $slice: ['$replies', REPLY_PREVIEW_SIZE] } } }
  ]);
  await populateComments(grouped.flatMap((entry) => entry.replies));
  return new Map(grouped.map((entry) => [String(entry._id), entry]));
}

async function presentThreads(roots) {
  await populateComments(roots);
  const previews = await buildReplyPreviews(roots.map((root) => root._id));
  return roots.map((root) => {
    const preview = previews.get(String(root._id)) || { replyCount: 0, replies: [] };
    return {
      ...presentComment(root, { isTombstone: root.isDeleted === true || root.status === 'removed' }),
      replies: preview.replies.map((reply) => presentComment(reply)),
      replyCount: Number(preview.replyCount || 0),
      hasMoreReplies: Number(preview.replyCount || 0) > REPLY_PREVIEW_SIZE
    };
  });
}

async function listCommentThreads(post, options = {}) {
  const page = clampPage(options.page);
  const rootsWithReplies = await getVisibleRootIds(post._id);
  const query = buildVisibleRootQuery(post._id, rootsWithReplies);
  const total = await BlogComment.countDocuments(query);
  const totalPages = Math.max(1, Math.ceil(total / COMMENTS_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const roots = await BlogComment.find(query)
    .sort({ createdAt: -1, _id: -1 })
    .skip((currentPage - 1) * COMMENTS_PAGE_SIZE)
    .limit(COMMENTS_PAGE_SIZE)
    .lean();
  const comments = await presentThreads(roots);

  let focusedThread = null;
  const focusThreadId = normalizeObjectId(options.focusThreadId);
  if (focusThreadId && !comments.some((comment) => comment._id === focusThreadId)) {
    const focusedRoot = await BlogComment.findOne({ ...query, _id: focusThreadId }).lean();
    if (focusedRoot) [focusedThread] = await presentThreads([focusedRoot]);
  }

  const focusReplyId = normalizeObjectId(options.focusReplyId);
  if (focusReplyId) {
    const focusedReply = await BlogComment.findOne({
      _id: focusReplyId,
      blogId: post._id,
      parentCommentId: { $ne: null },
      status: 'active',
      isDeleted: { $ne: true }
    }).lean();
    if (focusedReply) {
      await populateComments([focusedReply]);
      const rootId = String(focusedReply.parentCommentId);
      let thread = comments.find((comment) => comment._id === rootId);
      if (!thread && focusedThread?._id === rootId) thread = focusedThread;
      if (!thread) {
        const root = await BlogComment.findOne({ ...query, _id: focusedReply.parentCommentId }).lean();
        if (root) {
          [focusedThread] = await presentThreads([root]);
          thread = focusedThread;
        }
      }
      if (thread && !thread.replies.some((reply) => reply._id === focusReplyId)) {
        thread.replies.push(presentComment(focusedReply));
        thread.replies.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      }
    }
  }

  return {
    comments,
    focusedThread,
    pagination: {
      page: currentPage,
      pageSize: COMMENTS_PAGE_SIZE,
      total,
      totalPages
    },
    totalContributions: Number(post.commentsCount || 0)
  };
}

async function listThreadReplies(post, rootCommentId, options = {}) {
  const rootId = normalizeObjectId(rootCommentId);
  if (!rootId) throw new BlogCommentError('Invalid comment id.', 400);
  const activeReplyCount = await BlogComment.countDocuments({
    blogId: post._id,
    parentCommentId: rootId,
    status: 'active',
    isDeleted: { $ne: true }
  });
  const root = await BlogComment.findOne({ _id: rootId, blogId: post._id, parentCommentId: null }).lean();
  if (!root || ((root.isDeleted === true || root.status === 'removed') && activeReplyCount === 0)) {
    throw new BlogCommentError('Comment thread not found.', 404);
  }

  const page = clampPage(options.page);
  const totalPages = Math.max(1, Math.ceil(activeReplyCount / REPLIES_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const replies = await BlogComment.find({
    blogId: post._id,
    parentCommentId: root._id,
    status: 'active',
    isDeleted: { $ne: true }
  })
    .sort({ createdAt: 1, _id: 1 })
    .skip((currentPage - 1) * REPLIES_PAGE_SIZE)
    .limit(REPLIES_PAGE_SIZE)
    .lean();
  await populateComments(replies);
  return {
    replies: replies.map((reply) => presentComment(reply)),
    pagination: {
      page: currentPage,
      pageSize: REPLIES_PAGE_SIZE,
      total: activeReplyCount,
      totalPages
    }
  };
}

async function createComment({ post, userId, content: input, replyToCommentId }) {
  const content = validateCommentInput(input);

  let target = null;
  let parentCommentId = null;
  let normalizedReplyToId = null;
  if (String(replyToCommentId || '').trim()) {
    normalizedReplyToId = normalizeObjectId(replyToCommentId);
    if (!normalizedReplyToId) throw new BlogCommentError('Invalid reply target.', 400);
    target = await BlogComment.findOne({
      _id: normalizedReplyToId,
      blogId: post._id,
      status: 'active',
      isDeleted: { $ne: true }
    }).lean();
    if (!target) throw new BlogCommentError('The comment you are replying to is unavailable.', 404);
    parentCommentId = target.parentCommentId || target._id;
  }

  const safety = analyzeCommentSafety(content);
  const comment = await compatibilityRepositories.comments.create({
    resourceId: post._id,
    authorId: userId,
    parentCommentId,
    replyToCommentId: normalizedReplyToId,
    content,
    moderationFlags: safety.flags,
    moderationFlagSummary: safety.summary,
    createdAt: new Date()
  });
  await compatibilityRepositories.counts.increment(post, 1);

  if (target && String(target.authorId) !== String(userId)) {
    const author = await User.findById(userId).select('displayName firstName lastName').lean();
    await commentLifecycle.emit(LIFECYCLE_EVENTS.REPLY_CREATED, {
      post,
      target,
      comment,
      parentCommentId,
      actor: author || { _id: userId }
    });
  }

  return presentComment(comment);
}

async function removeComment({ commentId, userId, isAdmin = false, moderationNote = '' }) {
  const normalizedId = normalizeObjectId(commentId);
  if (!normalizedId) throw new BlogCommentError('Invalid comment id.', 400);
  const comment = await BlogComment.findOne({ _id: normalizedId, isDeleted: { $ne: true } }).lean();
  if (!comment) throw new BlogCommentError('Comment not found.', 404);
  if (!isAdmin && String(comment.authorId) !== String(userId)) {
    throw new BlogCommentError('Not authorised to delete this comment.', 403);
  }
  await BlogComment.updateOne(
    { _id: comment._id, isDeleted: { $ne: true } },
    {
      $set: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: userId,
        status: 'removed',
        moderationNote: String(moderationNote || '').trim().slice(0, 500)
      }
    }
  );
  await Blog.updateOne(
    { _id: comment.blogId, commentsCount: { $gt: 0 } },
    { $inc: { commentsCount: -1 } }
  );
  return {
    commentId: String(comment._id),
    rootCommentId: String(comment.parentCommentId || comment._id),
    wasReply: Boolean(comment.parentCommentId)
  };
}

module.exports = {
  COMMENT_POLICY,
  commentLifecycle,
  compatibilityRepositories,
  COMMENTS_PAGE_SIZE,
  REPLIES_PAGE_SIZE,
  REPLY_PREVIEW_SIZE,
  EDIT_WINDOW_MS,
  MAX_COMMENT_EDITS,
  REDACTED_REVISION_TEXT,
  BlogCommentError,
  normalizeObjectId,
  sanitizeCommentContent,
  getAuthorName,
  presentComment,
  presentRevision,
  getPublishedBlogBySlug,
  listCommentThreads,
  listThreadReplies,
  listCommentHistory,
  createComment,
  editComment,
  redactCommentRevision,
  removeComment
};
