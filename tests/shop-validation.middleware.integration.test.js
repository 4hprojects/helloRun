const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const {
  validateObjectIdParam,
  validateUuidParam,
  validateShopPagination,
  validateShopMutationPayload,
  getMutationErrors
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

function createJsonRes() {
  const state = {
    statusCode: 200,
    jsonCalls: []
  };

  return {
    state,
    status(code) {
      state.statusCode = code;
      return this;
    },
    json(payload) {
      state.jsonCalls.push(payload);
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

test('validateUuidParam rejects invalid UUID', () => {
  const req = { params: { productId: 'not-a-uuid' } };
  const res = createRenderRes();
  let nextCalled = false;

  validateUuidParam('productId')(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(res.state.statusCode, 400);
  assert.match(String(res.state.renderCalls[0].payload.message || ''), /Invalid productId/i);
});

test('validateUuidParam allows valid UUID', () => {
  const req = { params: { productId: '123e4567-e89b-42d3-a456-426614174000' } };
  const res = createRenderRes();
  let nextCalled = false;

  validateUuidParam('productId')(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
});

test('getMutationErrors validates product payloads', () => {
  assert.deepEqual(getMutationErrors('product', {
    name: 'Event Shirt',
    slug: 'event-shirt',
    basePrice: '250',
    status: 'active'
  }), []);

  const errors = getMutationErrors('product', {
    name: 'No',
    slug: 'Bad Slug!',
    basePrice: '-1',
    status: 'live'
  });
  assert.ok(errors.length >= 4);
});

test('getMutationErrors validates cart, fulfilment, and payment review payloads', () => {
  assert.deepEqual(getMutationErrors('cart', {
    productId: '123e4567-e89b-42d3-a456-426614174000',
    quantity: '2'
  }), []);
  assert.ok(getMutationErrors('cart', { productId: 'bad', quantity: '0' }).length >= 2);

  assert.deepEqual(getMutationErrors('fulfilment', {
    status: 'shipped',
    note: 'Tracking added'
  }), []);
  assert.ok(getMutationErrors('fulfilment', { status: 'lost' }).length >= 1);

  assert.deepEqual(getMutationErrors('paymentReview', {
    status: 'paid',
    reviewNote: 'Confirmed'
  }), []);
  assert.ok(getMutationErrors('paymentReview', {
    status: 'rejected',
    rejectionReason: 'bad'
  }).length >= 1);
});

test('validateShopMutationPayload returns JSON errors before controller', () => {
  const req = {
    body: {
      productId: 'bad',
      quantity: '0'
    }
  };
  const res = createJsonRes();
  let nextCalled = false;

  validateShopMutationPayload('cart')(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(res.state.statusCode, 400);
  assert.equal(res.state.jsonCalls[0].success, false);
  assert.ok(Array.isArray(res.state.jsonCalls[0].errors));
});
