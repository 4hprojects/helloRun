'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createExpressCommentsRouter } = require('..');

test('Express factory registers compatibility lifecycle routes and injected write middleware', () => {
  const registrations = [];
  const router = {};
  for (const method of ['get', 'post', 'patch', 'delete']) router[method] = (path, ...handlers) => registrations.push({ method, path, handlers });
  const express = { Router: () => router };
  const guard = (_req, _res, next) => next();
  const workflow = new Proxy({}, { get: () => async () => ({}) });
  const result = createExpressCommentsRouter({ express, workflow, beforeWrite: [guard], beforeEdit: [guard], beforeRedact: [guard] });
  assert.equal(result, router);
  assert.deepEqual(registrations.map(({ method, path }) => `${method.toUpperCase()} ${path}`), [
    'GET /', 'GET /:commentId/replies', 'GET /:commentId/history', 'POST /', 'PATCH /:commentId',
    'DELETE /:commentId', 'POST /:commentId/report', 'POST /:commentId/history/:revisionId/redact'
  ]);
  assert.ok(registrations.find((item) => item.method === 'post' && item.path === '/').handlers.includes(guard));
});
