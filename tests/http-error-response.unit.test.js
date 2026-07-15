const test = require('node:test');
const assert = require('node:assert/strict');

const {
  sendHttpError,
  prefersJson,
  safeLocalPath,
  defaultRecovery
} = require('../src/utils/http-error-response');

function makeReq({ accept = 'text/html', path = '/', xhr = false } = {}) {
  return {
    headers: { accept },
    path,
    originalUrl: path,
    xhr,
    get(name) {
      return this.headers[String(name).toLowerCase()];
    }
  };
}

function makeRes() {
  return {
    statusCode: 200,
    headers: {},
    rendered: null,
    jsonBody: null,
    set(name, value) {
      this.headers[name] = value;
      return this;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    render(view, locals) {
      this.rendered = { view, locals };
      return this;
    },
    json(body) {
      this.jsonBody = body;
      return this;
    }
  };
}

test('content negotiation chooses JSON only for explicit JSON, XHR, or API requests', () => {
  assert.equal(prefersJson(makeReq({ accept: 'text/html' })), false);
  assert.equal(prefersJson(makeReq({ accept: 'application/json' })), true);
  assert.equal(prefersJson(makeReq({ accept: '*/*', xhr: true })), true);
  assert.equal(prefersJson(makeReq({ accept: '*/*', path: '/api/status' })), true);
  assert.equal(prefersJson(makeReq({ accept: 'text/html,application/json' })), false);
});

test('HTML errors render the shared view with contextual recovery', () => {
  const req = makeReq({ path: '/organizer/events/abc' });
  const res = makeRes();

  sendHttpError(req, res, {
    status: 403,
    message: 'Organizer approval is required.',
    detail: 'Review your application status.'
  });

  assert.equal(res.statusCode, 403);
  assert.equal(res.headers['Cache-Control'], 'no-store');
  assert.equal(res.rendered.view, 'error');
  assert.equal(res.rendered.locals.heading, 'Access restricted');
  assert.equal(res.rendered.locals.actionHref, '/organizer/dashboard');
  assert.equal(res.rendered.locals.message, 'Organizer approval is required.');
  assert.equal(res.jsonBody, null);
});

test('JSON errors retain a stable structured contract for 403, 429, and 503', () => {
  for (const status of [403, 429, 503]) {
    const req = makeReq({ accept: 'application/json', path: '/api/action' });
    const res = makeRes();
    sendHttpError(req, res, { status, message: `Failure ${status}`, retryable: status !== 403 });
    assert.deepEqual(res.jsonBody, {
      success: false,
      message: `Failure ${status}`,
      status,
      retryable: status !== 403
    });
    assert.equal(res.rendered, null);
  }
});

test('recovery paths reject external and protocol-relative targets', () => {
  assert.equal(safeLocalPath('https://evil.example/path', '/safe'), '/safe');
  assert.equal(safeLocalPath('//evil.example/path', '/safe'), '/safe');
  assert.equal(safeLocalPath('/admin/dashboard', '/safe'), '/admin/dashboard');
  assert.deepEqual(defaultRecovery(makeReq({ path: '/admin/users' }), 403), {
    href: '/admin/dashboard',
    label: 'Return to Admin Dashboard'
  });
});
