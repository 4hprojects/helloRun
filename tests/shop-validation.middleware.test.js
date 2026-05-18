const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const {
  validateObjectIdParam,
  validateShopPagination
} = require('../src/middleware/shop-validation.middleware');

function createRenderRes() {
  const state = {
    statusCode: 200,
    renderCalls: []
  };

  return {
    state,
    status(code) {
      state.statusCode = code;
      return this;
    },
    render(view, payload) {
      state.renderCalls.push({ view, payload });
      return this;
    }
  };
}

test('validateShopPagination sets defaults when page/limit are invalid', () => {
  const req = { query: { page: 'abc', limit: '-1' } };
  const res = {};
  let nextCalled = false;

  validateShopPagination(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.deepEqual(req.shopPagination, { page: 1, limit: 20 });
});

test('validateShopPagination respects bounds and max limit of 100', () => {
  const req = { query: { page: '3', limit: '999' } };
  const res = {};

  validateShopPagination(req, res, () => {});

  assert.deepEqual(req.shopPagination, { page: 3, limit: 20 });
});

test('validateShopPagination accepts valid page/limit values', () => {
  const req = { query: { page: '2', limit: '40' } };
  const res = {};

  validateShopPagination(req, res, () => {});

  assert.deepEqual(req.shopPagination, { page: 2, limit: 40 });
});

test('validateObjectIdParam rejects invalid object id and renders 400', () => {
  const req = { params: { productId: 'not-an-id' } };
  const res = createRenderRes();
  let nextCalled = false;

  const middleware = validateObjectIdParam('productId');
  middleware(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(res.state.statusCode, 400);
  assert.equal(res.state.renderCalls.length, 1);
  assert.equal(res.state.renderCalls[0].view, 'error');
  assert.match(String(res.state.renderCalls[0].payload.message || ''), /Invalid productId/i);
});

test('validateObjectIdParam allows valid object id', () => {
  const req = {
    params: {
      productId: new mongoose.Types.ObjectId().toString()
    }
  };
  const res = createRenderRes();
  let nextCalled = false;

  const middleware = validateObjectIdParam('productId');
  middleware(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(res.state.renderCalls.length, 0);
});
