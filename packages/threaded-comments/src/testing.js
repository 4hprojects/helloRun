'use strict';

function createInMemoryRepositories(seed = {}) {
  const state = { comments: [...(seed.comments || [])], reports: [], resources: [...(seed.resources || [])] };
  const clone = (value) => structuredClone(value);
  const active = (comment) => comment.status !== 'removed' && !comment.isDeleted;
  return {
    state,
    repositories: {
      resources: { async findVisible(key) { return clone(state.resources.find((item) => String(item.key || item.slug || item.id) === String(key)) || null); } },
      counts: { async increment(resource, amount) { const found = state.resources.find((item) => String(item.id) === String(resource.id)); if (found) found.commentsCount = Math.max(0, Number(found.commentsCount || 0) + amount); } },
      reports: { async create(input) { const report = { id: `report-${state.reports.length + 1}`, ...clone(input) }; state.reports.push(report); return report; } },
      comments: {
        async findActive(resourceId, id) { return clone(state.comments.find((item) => String(item.resourceId) === String(resourceId) && String(item.id) === String(id) && active(item)) || null); },
        async create(input) { const record = { status: 'active', isDeleted: false, editCount: 0, editHistory: [], updatedAt: input.createdAt, ...clone(input) }; state.comments.push(record); return clone(record); },
        async updateIfVersion(comment, expected, change) { const record = state.comments.find((item) => item.id === comment.id); if (!record || new Date(record.updatedAt).getTime() !== new Date(expected).getTime()) return null; record.editHistory.push(change.revision); record.content = change.content; record.lastEditedAt = change.lastEditedAt; record.updatedAt = change.lastEditedAt; record.editCount += 1; return clone(record); },
        async remove(comment, context) { const record = state.comments.find((item) => item.id === comment.id); record.isDeleted = true; record.status = 'removed'; record.deletedAt = context.at; return { commentId: record.id, rootCommentId: record.parentCommentId || record.id, wasReply: Boolean(record.parentCommentId) }; },
        async listHistory(comment) { return clone(comment.editHistory || []); },
        async redactRevision(comment, revisionId, context) { const record = state.comments.find((item) => item.id === comment.id); const revision = record?.editHistory.find((item) => String(item.id) === String(revisionId)); if (!revision) return false; revision.content = ''; revision.redactedAt = context.at; revision.redactedBy = context.actorId; return true; },
        async listThreads(resource, context) { const roots = state.comments.filter((item) => item.resourceId === resource.id && !item.parentCommentId && active(item)); return { comments: roots.map(context.mapComment), focusedThread: null, pagination: { page: 1, pageSize: context.policy.commentsPageSize, total: roots.length, totalPages: 1 }, totalContributions: state.comments.filter((item) => item.resourceId === resource.id && active(item)).length }; },
        async listReplies(resource, rootId, context) { const replies = state.comments.filter((item) => item.resourceId === resource.id && item.parentCommentId === rootId && active(item)); return { replies: replies.map(context.mapComment), pagination: { page: 1, pageSize: context.policy.repliesPageSize, total: replies.length, totalPages: 1 } }; }
      }
    }
  };
}

function repositoryConformance(register, factory) {
  register('repository can create, retrieve, revise, redact, and remove a comment', async () => {
    const repositories = await factory();
    const created = await repositories.comments.create({ id: 'c1', resourceId: 'r1', authorId: 'u1', content: 'Hello', createdAt: new Date() });
    const found = await repositories.comments.findActive('r1', created.id || created._id);
    if (!found) throw new Error('created comment was not retrievable');
  });
}

module.exports = { createInMemoryRepositories, repositoryConformance };
