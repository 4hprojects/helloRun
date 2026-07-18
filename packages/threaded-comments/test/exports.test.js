'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const pkg = require('..');

test('public package factories and lifecycle contracts are exported', () => {
  ['createThreadedComments', 'createExpressCommentsRouter', 'createMongooseRepositories', 'normalizePolicy', 'presentComment', 'createLifecycleBus'].forEach((name) => assert.equal(typeof pkg[name], 'function'));
  assert.equal(pkg.LIFECYCLE_EVENTS.REPLY_CREATED, 'reply.created');
});
