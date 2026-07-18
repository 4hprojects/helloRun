'use strict';

function defaultAuthorName(identity = {}) {
  return String(identity.displayName || `${identity.firstName || ''} ${identity.lastName || ''}`)
    .replace(/\s+/g, ' ').trim() || 'Community member';
}

function stringId(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (typeof value.toHexString === 'function') return value.toHexString();
  if (value._id !== undefined && value._id !== value) return stringId(value._id);
  if ((typeof value.id === 'string' || typeof value.id === 'number')) return String(value.id);
  return String(value);
}

function presentRevision(revision = {}, policy, options = {}) {
  const redacted = Boolean(revision.redactedAt);
  return {
    _id: stringId(revision._id || revision.id),
    content: redacted ? policy.redactedRevisionText : String(revision.content || ''),
    effectiveAt: revision.effectiveAt || null,
    replacedAt: revision.replacedAt || null,
    redactedAt: revision.redactedAt || null,
    isRedacted: redacted,
    isCurrent: options.isCurrent === true
  };
}

function presentComment(comment = {}, policy, options = {}) {
  const author = options.author || comment.author || comment.authorId || {};
  const targetAuthor = options.replyTargetAuthor || comment.replyTargetAuthor || {};
  const tombstone = options.isTombstone === true || comment.isDeleted === true || comment.status === 'removed';
  const createdAt = comment.createdAt || null;
  return {
    _id: stringId(comment._id || comment.id),
    content: tombstone ? policy.tombstoneText : String(comment.content || ''),
    createdAt,
    updatedAt: comment.updatedAt || createdAt,
    editCount: Number(comment.editCount || 0),
    lastEditedAt: comment.lastEditedAt || null,
    editableUntil: createdAt ? new Date(new Date(createdAt).getTime() + policy.editWindowMs) : null,
    hasEditHistory: !tombstone && Array.isArray(comment.editHistory) && comment.editHistory.length > 0,
    editLimitReached: Number(comment.editCount || 0) >= policy.maxEdits,
    parentCommentId: comment.parentCommentId ? stringId(comment.parentCommentId) : null,
    replyToCommentId: comment.replyToCommentId ? stringId(comment.replyToCommentId) : null,
    authorId: {
      _id: stringId(author._id || (typeof author.toHexString === 'function' ? author : author.id) || comment.authorId),
      firstName: String(author.firstName || ''),
      lastName: String(author.lastName || ''),
      displayName: String(author.displayName || ''),
      avatarUrl: String(author.avatarUrl || '')
    },
    authorName: tombstone ? policy.tombstoneText : (options.getAuthorName || defaultAuthorName)(author),
    replyToAuthorName: Object.keys(targetAuthor).length ? (options.getAuthorName || defaultAuthorName)(targetAuthor) : '',
    isDeleted: tombstone,
    isTombstone: tombstone
  };
}

module.exports = { defaultAuthorName, stringId, presentComment, presentRevision };
