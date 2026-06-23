const test = require('node:test');
const assert = require('node:assert/strict');

const {
  DEFAULT_CLIENT_MESSAGE,
  sendJsonServerError
} = require('../src/utils/json-error-response');

test('sendJsonServerError logs internal details and returns generic client response', () => {
  const calls = [];
  const res = createResponse();
  const error = new Error('database password leaked in stack');

  sendJsonServerError(res, 'Route failed:', error, {
    logger: {
      error(message, details) {
        calls.push({ message, details });
      }
    }
  });

  assert.equal(res.statusCode, 500);
  assert.deepEqual(res.body, { error: DEFAULT_CLIENT_MESSAGE });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].message, 'Route failed:');
  assert.equal(calls[0].details, error);
});

test('sendJsonServerError preserves safe response fields when provided', () => {
  const res = createResponse();

  sendJsonServerError(res, 'Health check failed:', new Error('connection refused'), {
    status: 503,
    clientMessage: 'Postgres unavailable.',
    body: { ok: false },
    logger: { error() {} }
  });

  assert.equal(res.statusCode, 503);
  assert.deepEqual(res.body, {
    ok: false,
    error: 'Postgres unavailable.'
  });
});

function createResponse() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    }
  };
}
