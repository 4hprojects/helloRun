const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  createFinisherEligibilityService,
  NOT_ELIGIBLE_MESSAGE
} = require('../src/services/shop/finisher-eligibility.service');

const EVENT_ID = '6b03f0e6828e10075486eb83';

function fakeSql(rulesByProduct) {
  const calls = [];
  const sql = (strings, ...values) => {
    calls.push({ text: strings.join('?'), values });
    return Promise.resolve(rulesByProduct[values[0]] || []);
  };
  return { sql, calls };
}

function buildService({ rules = {}, registrations = [], completed = new Set() } = {}) {
  const { sql, calls } = fakeSql(rules);
  const registrationQueries = [];
  const service = createFinisherEligibilityService({
    getSql: () => sql,
    findRegistrations: async (filter) => {
      registrationQueries.push(filter);
      return registrations.filter((item) => item.userId === filter.userId && item.eventId === filter.eventId);
    },
    getProgress: async (registrationId) => ({ completed: completed.has(String(registrationId)) })
  });
  return { service, calls, registrationQueries };
}

test('a product without a finisher rule is open to every shopper', async () => {
  const { service } = buildService();
  assert.deepEqual(await service.checkProductEligibility({ userId: 'u1', productId: 'p-open' }), { gated: false, eligible: true });
});

test('a non-finisher is refused a gated product', async () => {
  const { service, registrationQueries } = buildService({
    rules: { 'p-bundle': [{ id: 'r1', event_id: 'core-1', mongo_event_id: EVENT_ID }] },
    registrations: [{ _id: 'reg-1', userId: 'u1', eventId: EVENT_ID }]
  });
  const result = await service.checkProductEligibility({ userId: 'u1', productId: 'p-bundle' });
  assert.equal(result.eligible, false);
  assert.equal(result.message, NOT_ELIGIBLE_MESSAGE);
  assert.deepEqual(registrationQueries[0], { userId: 'u1', eventId: EVENT_ID, status: 'confirmed', paymentStatus: 'paid' });
});

test('a verified finisher of that exact event may buy the gated product', async () => {
  const { service } = buildService({
    rules: { 'p-bundle': [{ id: 'r1', event_id: 'core-1', mongo_event_id: EVENT_ID }] },
    registrations: [{ _id: 'reg-1', userId: 'u1', eventId: EVENT_ID }],
    completed: new Set(['reg-1'])
  });
  assert.deepEqual(await service.checkProductEligibility({ userId: 'u1', productId: 'p-bundle' }), { gated: true, eligible: true });
});

test('finishing a different event, or another runner finishing, does not qualify', async () => {
  const { service } = buildService({
    rules: { 'p-bundle': [{ id: 'r1', event_id: 'core-1', mongo_event_id: EVENT_ID }] },
    registrations: [
      { _id: 'reg-other-event', userId: 'u1', eventId: 'another-event' },
      { _id: 'reg-other-user', userId: 'u2', eventId: EVENT_ID }
    ],
    completed: new Set(['reg-other-event', 'reg-other-user'])
  });
  assert.equal((await service.checkProductEligibility({ userId: 'u1', productId: 'p-bundle' })).eligible, false);
});

test('a rule whose event cannot be resolved fails closed, and anonymous shoppers are refused', async () => {
  const { service } = buildService({ rules: { 'p-bundle': [{ id: 'r1', event_id: null, mongo_event_id: null }] } });
  assert.equal((await service.checkProductEligibility({ userId: 'u1', productId: 'p-bundle' })).eligible, false);

  const gated = buildService({ rules: { 'p-bundle': [{ id: 'r1', event_id: 'core-1', mongo_event_id: EVENT_ID }] } });
  assert.equal((await gated.service.checkProductEligibility({ userId: '', productId: 'p-bundle' })).eligible, false);
});

test('order-level checks refuse when any item is gated and the buyer is not a finisher', async () => {
  const { service } = buildService({
    rules: { 'p-bundle': [{ id: 'r1', event_id: 'core-1', mongo_event_id: EVENT_ID }] }
  });
  assert.deepEqual(await service.assertProductsEligible({ userId: 'u1', productIds: ['p-open', 'p-open'] }), { eligible: true });
  const refused = await service.assertProductsEligible({ userId: 'u1', productIds: ['p-open', 'p-bundle'] });
  assert.equal(refused.eligible, false);
  assert.equal(refused.productId, 'p-bundle');
});

test('the rule query reads only active finisher rules for the product', async () => {
  const { service, calls } = buildService();
  await service.listFinisherRules('p-bundle');
  assert.match(calls[0].text, /achievement_merchandise_rules/);
  assert.match(calls[0].text, /achievement_type = 'finisher'/);
  assert.match(calls[0].text, /COALESCE\(r\.status, 'active'\) = 'active'/);
  assert.deepEqual(calls[0].values, ['p-bundle']);
});

test('every shop purchase entry point applies the finisher gate', () => {
  const source = fs.readFileSync(path.join(__dirname, '../src/controllers/shop.controller.js'), 'utf8');
  const addToCart = source.slice(source.indexOf('exports.addToCart'), source.indexOf('exports.', source.indexOf('exports.addToCart') + 10));
  assert.match(addToCart, /finisherEligibility\.checkProductEligibility/);
  const proof = source.slice(source.indexOf('exports.postOrderPaymentProof'));
  assert.match(proof.slice(0, 2000), /finisherEligibility\.assertProductsEligible/);
  const loader = source.slice(source.indexOf('async function loadCartLines'));
  assert.match(loader.slice(0, 1200), /finisherEligibility\.checkProductEligibility/);
  assert.doesNotMatch(source, /loadCartLines\(cart\)/);
});
