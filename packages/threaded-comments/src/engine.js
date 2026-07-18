'use strict';

const { normalizePolicy, clampPage } = require('./policy');
const { ThreadedCommentsError, fail } = require('./errors');
const { createLifecycleBus, LIFECYCLE_EVENTS } = require('./events');
const { presentComment, presentRevision } = require('./presentation');

function requireMethod(target, name) {
  if (!target || typeof target[name] !== 'function') throw new TypeError(`Repository method ${name} is required`);
}

function createThreadedComments(options = {}) {
  const policy = normalizePolicy(options.policy);
  const repositories = options.repositories || {};
  const comments = repositories.comments;
  const reports = repositories.reports;
  const resources = repositories.resources;
  const identities = repositories.identities;
  const counts = repositories.counts;
  const clock = options.clock || { now: () => new Date() };
  const ids = options.ids || { next: () => `${Date.now()}-${Math.random().toString(36).slice(2)}` };
  const sanitize = options.sanitize || ((value) => String(value || '').trim());
  const analyzeSafety = options.analyzeSafety || (() => ({ flags: [], summary: '' }));
  const events = options.events || createLifecycleBus();
  const mapComment = options.presentComment || ((comment, extra) => presentComment(comment, policy, extra));

  ['findActive', 'create', 'updateIfVersion', 'remove', 'listThreads', 'listReplies', 'listHistory', 'redactRevision'].forEach((name) => requireMethod(comments, name));
  requireMethod(resources, 'findVisible');

  const validateContent = (value, current = null) => {
    const raw = String(value || '').trim();
    if (!raw) fail('content_required', 'Comment content is required.', 400);
    if (raw.length > policy.maxContentLength) fail('content_too_long', `Comment must not exceed ${policy.maxContentLength} characters.`, 400);
    const content = String(sanitize(raw) || '').trim();
    if (!content) fail('content_required', 'Comment content is required.', 400);
    if (current !== null && content === String(current || '')) fail('content_unchanged', 'Make a change before saving your comment.', 400);
    return content;
  };

  const actorId = (actor) => String(actor?.id || actor?._id || '');
  const requireActor = (actor) => {
    if (!actorId(actor)) fail('authentication_required', 'Authentication required.', 401);
  };

  async function resolveResource(key) {
    const resource = await resources.findVisible(key);
    if (!resource) fail('resource_not_found', 'Resource not found.', 404);
    return resource;
  }

  async function create({ resourceKey, actor, content: input, replyToCommentId = null }) {
    requireActor(actor);
    const resource = await resolveResource(resourceKey);
    const content = validateContent(input);
    let target = null;
    let rootId = null;
    if (replyToCommentId) {
      target = await comments.findActive(resource.id || resource._id, replyToCommentId);
      if (!target) fail('reply_target_unavailable', 'The comment you are replying to is unavailable.', 404);
      rootId = target.parentCommentId || target.id || target._id;
    }
    const safety = await analyzeSafety(content, { actor, resource, operation: 'create' });
    const created = await comments.create({
      id: ids.next(), resourceId: resource.id || resource._id, authorId: actorId(actor),
      parentCommentId: rootId, replyToCommentId: target ? (target.id || target._id) : null,
      content, moderationFlags: safety.flags || [], moderationFlagSummary: safety.summary || '',
      createdAt: clock.now()
    });
    if (counts?.increment) await counts.increment(resource, 1);
    const name = target ? LIFECYCLE_EVENTS.REPLY_CREATED : LIFECYCLE_EVENTS.COMMENT_CREATED;
    await events.emit(name, { resource, actor, comment: created, target, rootCommentId: rootId });
    return mapComment(created);
  }

  async function edit({ resourceKey, commentId, actor, content: input, expectedVersion }) {
    requireActor(actor);
    const resource = await resolveResource(resourceKey);
    const comment = await comments.findActive(resource.id || resource._id, commentId);
    if (!comment) fail('comment_not_found', 'Comment not found.', 404);
    if (String(comment.authorId?.id || comment.authorId?._id || comment.authorId) !== actorId(actor)) fail('not_owner', 'You can only edit your own comment.', 403);
    const now = clock.now();
    const created = new Date(comment.createdAt);
    if (!Number.isFinite(created.getTime()) || now.getTime() >= created.getTime() + policy.editWindowMs) fail('edit_window_closed', 'The comment editing window has ended.', 409);
    if (Number(comment.editCount || 0) >= policy.maxEdits) fail('edit_limit_reached', 'This comment has reached its edit limit.', 409);
    if (!expectedVersion) fail('version_required', 'Refresh the discussion before editing this comment.', 400);
    const content = validateContent(input, comment.content);
    const safety = await analyzeSafety(content, { actor, resource, operation: 'edit' });
    const revision = { id: ids.next(), content: comment.content, effectiveAt: comment.lastEditedAt || comment.createdAt, replacedAt: now };
    const updated = await comments.updateIfVersion(comment, expectedVersion, {
      content, lastEditedAt: now, revision, moderationFlags: safety.flags || [], moderationFlagSummary: safety.summary || ''
    });
    if (!updated) fail('stale_version', 'This comment changed in another session. Refresh and try again.', 409);
    await events.emit(LIFECYCLE_EVENTS.COMMENT_EDITED, { resource, actor, comment: updated, previous: comment });
    return mapComment(updated);
  }

  async function remove({ resourceKey, commentId, actor, canModerate = false, moderationNote = '' }) {
    requireActor(actor);
    const resource = await resolveResource(resourceKey);
    const comment = await comments.findActive(resource.id || resource._id, commentId);
    if (!comment) fail('comment_not_found', 'Comment not found.', 404);
    const owner = String(comment.authorId?.id || comment.authorId?._id || comment.authorId) === actorId(actor);
    if (!owner && !canModerate) fail('not_authorized', 'Not authorised to delete this comment.', 403);
    const result = await comments.remove(comment, { actorId: actorId(actor), at: clock.now(), moderationNote });
    if (counts?.increment) await counts.increment(resource, -1);
    await events.emit(LIFECYCLE_EVENTS.COMMENT_DELETED, { resource, actor, comment, result, moderated: !owner });
    return result;
  }

  async function history({ resourceKey, commentId }) {
    if (!policy.publicHistory) fail('history_private', 'Comment history is not public.', 403);
    const resource = await resolveResource(resourceKey);
    const comment = await comments.findActive(resource.id || resource._id, commentId);
    if (!comment) fail('comment_not_found', 'Comment not found.', 404);
    const versions = (await comments.listHistory(comment)).map((revision) => presentRevision(revision, policy));
    versions.sort((a, b) => new Date(a.effectiveAt) - new Date(b.effectiveAt));
    versions.push(presentRevision({ id: comment.id || comment._id, content: comment.content, effectiveAt: comment.lastEditedAt || comment.createdAt }, policy, { isCurrent: true }));
    return { comment: mapComment(comment), versions };
  }

  async function redact({ resourceKey, commentId, revisionId, actor }) {
    requireActor(actor);
    const resource = await resolveResource(resourceKey);
    const comment = await comments.findActive(resource.id || resource._id, commentId);
    if (!comment) fail('comment_not_found', 'Comment not found.', 404);
    if (String(comment.authorId?.id || comment.authorId?._id || comment.authorId) !== actorId(actor)) fail('not_owner', 'You can only redact revisions from your own comment.', 403);
    const changed = await comments.redactRevision(comment, revisionId, { actorId: actorId(actor), at: clock.now() });
    if (!changed) fail('revision_not_found', 'Revision not found.', 404);
    await events.emit(LIFECYCLE_EVENTS.REVISION_REDACTED, { resource, actor, comment, revisionId });
    return history({ resourceKey, commentId });
  }

  async function report({ resourceKey, commentId, actor, reason, note = '' }) {
    requireActor(actor);
    requireMethod(reports, 'create');
    const resource = await resolveResource(resourceKey);
    const comment = await comments.findActive(resource.id || resource._id, commentId);
    if (!comment) fail('comment_not_found', 'Comment not found.', 404);
    if (String(comment.authorId?.id || comment.authorId?._id || comment.authorId) === actorId(actor)) fail('self_report', 'You cannot report your own comment.', 403);
    if (!policy.reportReasons.includes(String(reason || ''))) fail('invalid_report_reason', 'A valid report reason is required.', 400);
    const safeNote = String(note || '').trim().slice(0, policy.maxReportNoteLength);
    const reportRecord = await reports.create({
      resourceId: resource.id || resource._id, commentId: comment.id || comment._id,
      reporterId: actorId(actor), reason, note: safeNote,
      snapshot: { content: comment.content, authorId: comment.authorId, revisionAt: comment.lastEditedAt || comment.createdAt, editCount: Number(comment.editCount || 0) }
    });
    await events.emit(LIFECYCLE_EVENTS.COMMENT_REPORTED, { resource, actor, comment, report: reportRecord });
    return reportRecord;
  }

  async function list({ resourceKey, page, focusThreadId, focusReplyId }) {
    const resource = await resolveResource(resourceKey);
    return comments.listThreads(resource, { page: clampPage(page, policy), focusThreadId, focusReplyId, policy, mapComment, identities });
  }

  async function replies({ resourceKey, rootCommentId, page }) {
    const resource = await resolveResource(resourceKey);
    return comments.listReplies(resource, rootCommentId, { page: clampPage(page, policy), policy, mapComment, identities });
  }

  return { policy, events, validateContent, resolveResource, list, replies, create, edit, remove, history, redact, report };
}

module.exports = { createThreadedComments, ThreadedCommentsError };
