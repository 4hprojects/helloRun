'use strict';

function asId(value) {
  if (value && typeof value.toHexString === 'function') return value;
  return value?._id || value?.id || value;
}

function createMongooseRepositories(options = {}) {
  const { Comment, Report, Resource, Identity } = options.models || {};
  if (!Comment || !Resource) throw new TypeError('Mongoose Comment and Resource models are required');
  const fields = Object.assign({
    resourceId: 'resourceId', authorId: 'authorId', parentId: 'parentCommentId', replyToId: 'replyToCommentId',
    resourceKey: 'slug', resourceVisibleQuery: { status: 'published' }, contributionCount: 'commentsCount'
  }, options.fields || {});
  const toObjectId = options.toObjectId || ((value) => value);
  const populate = options.populate || (async (records) => records);

  const activeQuery = (resourceId, commentId) => ({
    _id: toObjectId(commentId), [fields.resourceId]: asId(resourceId), status: 'active', isDeleted: { $ne: true }
  });

  const comments = {
    async findActive(resourceId, commentId) {
      return Comment.findOne(activeQuery(resourceId, commentId)).lean();
    },
    async create(input) {
      const doc = await Comment.create({
        [fields.resourceId]: input.resourceId, [fields.authorId]: input.authorId,
        [fields.parentId]: input.parentCommentId || null, [fields.replyToId]: input.replyToCommentId || null,
        content: input.content, moderationFlags: input.moderationFlags,
        moderationFlagSummary: input.moderationFlagSummary
      });
      const plain = doc.toObject();
      await populate([plain]);
      return plain;
    },
    async updateIfVersion(comment, expectedVersion, change) {
      const expected = new Date(expectedVersion);
      if (!Number.isFinite(expected.getTime())) return null;
      const revision = Object.assign({}, change.revision);
      delete revision.id;
      if (options.createId) revision._id = options.createId();
      const result = await Comment.findOneAndUpdate(
        { _id: asId(comment), updatedAt: expected, status: 'active', isDeleted: { $ne: true } },
        { $set: { content: change.content, lastEditedAt: change.lastEditedAt, moderationFlags: change.moderationFlags, moderationFlagSummary: change.moderationFlagSummary }, $inc: { editCount: 1 }, $push: { editHistory: revision } },
        { new: true, runValidators: true }
      ).lean();
      if (result) await populate([result]);
      return result;
    },
    async remove(comment, context) {
      await Comment.updateOne({ _id: asId(comment), isDeleted: { $ne: true } }, {
        $set: { isDeleted: true, deletedAt: context.at, deletedBy: context.actorId, status: 'removed', moderationNote: String(context.moderationNote || '').trim().slice(0, 500) }
      });
      return { commentId: String(asId(comment)), rootCommentId: String(comment[fields.parentId] || asId(comment)), wasReply: Boolean(comment[fields.parentId]) };
    },
    async listHistory(comment) { return Array.isArray(comment.editHistory) ? comment.editHistory : []; },
    async redactRevision(comment, revisionId, context) {
      const result = await Comment.updateOne(
        { _id: asId(comment), [`editHistory._id`]: toObjectId(revisionId), status: 'active', isDeleted: { $ne: true } },
        { $set: { 'editHistory.$.content': '', 'editHistory.$.redactedAt': context.at, 'editHistory.$.redactedBy': context.actorId } }
      );
      return result.modifiedCount === 1 || result.matchedCount === 1;
    },
    async listThreads(resource, context) {
      if (typeof options.listThreads === 'function') return options.listThreads(resource, context);
      const resourceId = asId(resource);
      const rootsWithReplies = await Comment.distinct(fields.parentId, { [fields.resourceId]: resourceId, [fields.parentId]: { $ne: null }, status: 'active', isDeleted: { $ne: true } });
      const query = { [fields.resourceId]: resourceId, [fields.parentId]: null, $or: [{ status: 'active', isDeleted: { $ne: true } }, { _id: { $in: rootsWithReplies } }] };
      const total = await Comment.countDocuments(query);
      const totalPages = Math.max(1, Math.ceil(total / context.policy.commentsPageSize));
      const page = Math.min(context.page, totalPages);
      const roots = await Comment.find(query).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * context.policy.commentsPageSize).limit(context.policy.commentsPageSize).lean();
      await populate(roots);
      const presented = [];
      for (const root of roots) {
        const replyQuery = { [fields.resourceId]: resourceId, [fields.parentId]: asId(root), status: 'active', isDeleted: { $ne: true } };
        const [replyCount, preview] = await Promise.all([
          Comment.countDocuments(replyQuery),
          Comment.find(replyQuery).sort({ createdAt: 1, _id: 1 }).limit(context.policy.replyPreviewSize).lean()
        ]);
        await populate(preview);
        presented.push(Object.assign(context.mapComment(root, { isTombstone: root.isDeleted || root.status === 'removed' }), {
          replies: preview.map((entry) => context.mapComment(entry)), replyCount, hasMoreReplies: replyCount > context.policy.replyPreviewSize
        }));
      }
      return { comments: presented, focusedThread: null, pagination: { page, pageSize: context.policy.commentsPageSize, total, totalPages }, totalContributions: Number(resource[fields.contributionCount] || 0) };
    },
    async listReplies(resource, rootCommentId, context) {
      if (typeof options.listReplies === 'function') return options.listReplies(resource, rootCommentId, context);
      const query = { [fields.resourceId]: asId(resource), [fields.parentId]: toObjectId(rootCommentId), status: 'active', isDeleted: { $ne: true } };
      const total = await Comment.countDocuments(query);
      const totalPages = Math.max(1, Math.ceil(total / context.policy.repliesPageSize));
      const page = Math.min(context.page, totalPages);
      const replies = await Comment.find(query).sort({ createdAt: 1, _id: 1 }).skip((page - 1) * context.policy.repliesPageSize).limit(context.policy.repliesPageSize).lean();
      await populate(replies);
      return { replies: replies.map((entry) => context.mapComment(entry)), pagination: { page, pageSize: context.policy.repliesPageSize, total, totalPages } };
    }
  };

  const resources = {
    async findVisible(key) {
      const query = Object.assign({ [fields.resourceKey]: key }, fields.resourceVisibleQuery || {});
      return Resource.findOne(query).lean();
    }
  };
  const identities = Identity ? { async find(id) { return Identity.findById(id).lean(); } } : null;
  const counts = {
    async increment(resource, amount) {
      const update = amount < 0
        ? { $inc: { [fields.contributionCount]: amount } }
        : { $inc: { [fields.contributionCount]: amount } };
      await Resource.updateOne({ _id: asId(resource), ...(amount < 0 ? { [fields.contributionCount]: { $gt: 0 } } : {}) }, update);
    }
  };
  const reports = Report ? {
    async create(input) {
      return Report.create({
        targetType: 'comment', [fields.resourceId]: input.resourceId, commentId: input.commentId,
        reporterId: input.reporterId, reason: input.reason, note: input.note,
        commentContentSnapshot: input.snapshot.content,
        commentAuthorIdSnapshot: input.snapshot.authorId,
        commentRevisionAtSnapshot: input.snapshot.revisionAt,
        commentEditCountSnapshot: input.snapshot.editCount
      });
    }
  } : null;
  return { comments, reports, resources, identities, counts };
}

module.exports = { createMongooseRepositories };
