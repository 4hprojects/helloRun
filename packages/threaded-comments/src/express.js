'use strict';

const { ThreadedCommentsError } = require('./errors');

function createExpressCommentsRouter(options = {}) {
  const express = options.express || require('express');
  const workflow = options.workflow;
  if (!workflow) throw new TypeError('workflow is required');
  const router = express.Router(options.routerOptions);
  const actor = options.resolveActor || ((req) => req.user || null);
  const key = options.resolveResourceKey || ((req) => req.params.resourceKey);
  const beforeWrite = [].concat(options.beforeWrite || []).filter(Boolean);
  const beforeEdit = [].concat(options.beforeEdit || beforeWrite).filter(Boolean);
  const beforeRedact = [].concat(options.beforeRedact || beforeWrite).filter(Boolean);
  const mapError = options.mapError || ((error) => ({ success: false, message: error.message, code: error.code }));
  const send = (handler, successStatus = 200) => async (req, res, next) => {
    try { return res.status(successStatus).json({ success: true, ...(await handler(req)) }); }
    catch (error) {
      if (error instanceof ThreadedCommentsError) return res.status(error.status).json(mapError(error, req));
      return next(error);
    }
  };
  const route = (method, path, middleware, handler, status) => router[method](path, ...middleware, send(handler, status));

  route('get', '/', [], async (req) => workflow.list({ resourceKey: key(req), page: req.query.page, focusThreadId: req.query.thread, focusReplyId: req.query.reply }));
  route('get', '/:commentId/replies', [], async (req) => workflow.replies({ resourceKey: key(req), rootCommentId: req.params.commentId, page: req.query.page }));
  route('get', '/:commentId/history', [], async (req) => workflow.history({ resourceKey: key(req), commentId: req.params.commentId }));
  route('post', '/', beforeWrite, async (req) => ({ comment: await workflow.create({ resourceKey: key(req), actor: actor(req), content: req.body.content, replyToCommentId: req.body.replyToCommentId }) }), 201);
  route('patch', '/:commentId', beforeEdit, async (req) => ({ comment: await workflow.edit({ resourceKey: key(req), commentId: req.params.commentId, actor: actor(req), content: req.body.content, expectedVersion: req.body.expectedVersion || req.body.expectedUpdatedAt }) }));
  route('delete', '/:commentId', beforeWrite, async (req) => workflow.remove({ resourceKey: key(req), commentId: req.params.commentId, actor: actor(req), canModerate: options.canModerate?.(req) === true }));
  route('post', '/:commentId/report', beforeWrite, async (req) => ({ report: await workflow.report({ resourceKey: key(req), commentId: req.params.commentId, actor: actor(req), reason: req.body.reason, note: req.body.note }) }), 201);
  route('post', '/:commentId/history/:revisionId/redact', beforeRedact, async (req) => workflow.redact({ resourceKey: key(req), commentId: req.params.commentId, revisionId: req.params.revisionId, actor: actor(req) }));
  return router;
}

module.exports = { createExpressCommentsRouter };
