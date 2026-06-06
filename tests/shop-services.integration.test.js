const test = require('node:test');
const assert = require('node:assert/strict');

const { recalculateOrderTotals } = require('../src/services/shop/order.service');
const {
  canTransitionPaymentStatus,
  REVIEWABLE_STATUSES,
  TERMINAL_STATUSES
} = require('../src/services/shop/payment-review.service');
const { computeAvailableQuantity } = require('../src/services/shop/inventory.service');

test('recalculateOrderTotals computes a non-negative server-side total', () => {
  const totals = recalculateOrderTotals({
    subtotal: 199.995,
    deliveryFee: 50,
    platformFee: 10.125
  });

  assert.equal(totals.subtotal, 200);
  assert.equal(totals.deliveryFee, 50);
  assert.equal(totals.platformFee, 10.13);
  assert.equal(totals.totalAmount, 260.13);
});

test('recalculateOrderTotals clamps invalid and negative values to 0', () => {
  const totals = recalculateOrderTotals({
    subtotal: -12,
    deliveryFee: Number.NaN,
    platformFee: -1
  });

  assert.deepEqual(totals, {
    subtotal: 0,
    deliveryFee: 0,
    platformFee: 0,
    totalAmount: 0
  });
});

test('payment review state machine allows only valid review transitions', () => {
  assert.equal(canTransitionPaymentStatus('pending_review', 'paid'), true);
  assert.equal(canTransitionPaymentStatus('pending_review', 'rejected'), true);
  assert.equal(canTransitionPaymentStatus('correction_required', 'paid'), true);

  assert.equal(canTransitionPaymentStatus('paid', 'rejected'), false);
  assert.equal(canTransitionPaymentStatus('rejected', 'paid'), false);
  assert.equal(canTransitionPaymentStatus('pending_review', 'pending_review'), false);
  assert.equal(canTransitionPaymentStatus('', 'paid'), false);
});

test('payment review status sets remain aligned with manual review workflow', () => {
  assert.deepEqual(Array.from(REVIEWABLE_STATUSES).sort(), ['correction_required', 'pending_review']);
  assert.deepEqual(Array.from(TERMINAL_STATUSES).sort(), ['cancelled', 'paid', 'rejected']);
});

test('computeAvailableQuantity uses stock - reserved - sold rule', () => {
  assert.equal(
    computeAvailableQuantity({ stock_quantity: 100, reserved_quantity: 12, sold_quantity: 33 }),
    55
  );

  assert.equal(
    computeAvailableQuantity({ stock_quantity: '10', reserved_quantity: '2', sold_quantity: '3' }),
    5
  );

  assert.equal(computeAvailableQuantity({}), 0);
});
