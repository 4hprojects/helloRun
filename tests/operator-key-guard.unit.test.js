'use strict';

// MongoDB operator injection: `?email[$ne]=x`, `{"id": {"$ne": null}}` or a multipart field
// named `email[$ne]` all become objects with `$` keys. Handlers coerce their inputs, and the
// guard refuses such requests before any handler runs so a missed coercion cannot matter.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const express = require('express');

const {
  MAX_DEPTH,
  findOperatorKey,
  rejectOperatorKeys
} = require('../src/middleware/operator-key-guard.middleware');

const ROOT = path.resolve(__dirname, '..');

test('findOperatorKey reports the path of the first $-prefixed key at any depth', () => {
  assert.equal(findOperatorKey({ email: { $ne: '' } }), 'email.$ne');
  assert.equal(findOperatorKey({ filters: [{ status: 'ok' }, { status: { $gt: 0 } }] }), 'filters.1.status.$gt');
  assert.equal(findOperatorKey({ $where: 'sleep(1000)' }), '$where');
});

test('findOperatorKey accepts ordinary payloads, including values that contain $', () => {
  assert.equal(findOperatorKey(undefined), null);
  assert.equal(findOperatorKey('plain'), null);
  assert.equal(findOperatorKey({ email: 'a@example.com', price: '$5', note: '{"$ne": 1}' }), null);
  assert.equal(findOperatorKey({ 'participant.email': 'x', tags: ['a', 'b'], nested: { ok: true } }), null);
});

test('findOperatorKey refuses absurd nesting instead of walking it', () => {
  let deep = { leaf: 1 };
  for (let i = 0; i <= MAX_DEPTH + 1; i += 1) deep = { d: deep };
  assert.ok(findOperatorKey(deep));
});

async function withApp(run) {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use(rejectOperatorKeys);
  app.all('/echo', (req, res) => res.json({ reached: true, query: req.query, body: req.body }));
  const server = await new Promise((resolve) => {
    const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
  });
  try {
    await run(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test('the guard refuses operator keys in the query string and JSON body before handlers run', async () => {
  await withApp(async (base) => {
    const json = { Accept: 'application/json' };

    const query = await fetch(`${base}/echo?email[$ne]=x`, { headers: json });
    assert.equal(query.status, 400);
    assert.equal((await query.json()).reached, undefined);

    const body = await fetch(`${base}/echo`, {
      method: 'POST',
      headers: { ...json, 'Content-Type': 'application/json' },
      body: JSON.stringify({ replyToCommentId: { $ne: null } })
    });
    assert.equal(body.status, 400);

    const fine = await fetch(`${base}/echo?q=5k&page=2`, {
      method: 'POST',
      headers: { ...json, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'a@example.com', price: '$5' })
    });
    assert.equal(fine.status, 200);
    assert.equal((await fine.json()).reached, true);
  });
});

test('every multipart upload middleware re-checks the body that multer parsed', async () => {
  const uploadService = require('../src/services/upload.service');

  assert.equal(uploadService.MULTIPART_UPLOAD_MIDDLEWARE.length, 9);
  for (const name of uploadService.MULTIPART_UPLOAD_MIDDLEWARE) {
    assert.equal(typeof uploadService[name], 'function', `${name} is not exported`);

    // Not multipart, so multer passes straight through and only the guard decides.
    const req = {
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      get(header) { return this.headers[String(header).toLowerCase()]; },
      body: { email: { $ne: '' } },
      path: '/upload'
    };
    const res = {
      statusCode: 200,
      headers: {},
      set(key, value) { this.headers[key] = value; return this; },
      status(code) { this.statusCode = code; return this; },
      json(payload) { this.payload = payload; return this; }
    };
    let reachedNext = false;
    await new Promise((resolve) => {
      res.json = function json(payload) { this.payload = payload; resolve(); return this; };
      uploadService[name](req, res, () => { reachedNext = true; resolve(); });
    });
    assert.equal(reachedNext, false, `${name} let an operator key through`);
    assert.equal(res.statusCode, 400, name);
  }
});

test('the guard runs globally, straight after the body parsers', () => {
  const server = fs.readFileSync(path.join(ROOT, 'src/server.js'), 'utf8');
  const urlencoded = server.indexOf('app.use(express.urlencoded(');
  const guard = server.indexOf("require('./middleware/operator-key-guard.middleware').rejectOperatorKeys");
  const firstRoute = server.indexOf("app.get('/healthz'");
  assert.ok(urlencoded > -1 && guard > urlencoded && guard < firstRoute);
});

test('comment adapters map invalid ids to null instead of passing the raw value through', () => {
  for (const file of ['src/services/blog-comment.service.js', 'src/services/running-group-community.service.js']) {
    const source = fs.readFileSync(path.join(ROOT, file), 'utf8');
    assert.match(source, /toObjectId: \(value\) => [a-zA-Z]+\(value\) \|\| null,/, file);
    assert.doesNotMatch(source, /toObjectId: \(value\) => [a-zA-Z]+\(value\) \|\| value/, file);
  }
});
