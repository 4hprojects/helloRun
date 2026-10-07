'use strict';

// Variant writes must be scoped to the product the caller was authorised for.
//
// The organizer shop routes prove the caller manages :eventId and that :productId belongs to
// it, but variant UUIDs are public on product pages. Before this fix the service updated
// `WHERE id = variantId` and the controller compared product_id only after the write had
// committed, so any organizer could rewrite another organizer's (or HelloRun's) variants.

const test = require('node:test');
const assert = require('node:assert/strict');

const OWN_PRODUCT = '11111111-1111-4111-8111-111111111111';
const OTHER_PRODUCT = '22222222-2222-4222-8222-222222222222';
const OWN_VARIANT = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const OTHER_VARIANT = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

// In-memory stand-in for the postgres tagged-template client. It honours exactly the
// WHERE clauses the service sends, so an unscoped UPDATE would be applied here too.
function createFakeSql() {
  const rows = new Map([
    [OWN_VARIANT, variantRow(OWN_VARIANT, OWN_PRODUCT)],
    [OTHER_VARIANT, variantRow(OTHER_VARIANT, OTHER_PRODUCT)]
  ]);
  const writes = [];

  function sql(strings, ...values) {
    const text = strings.join('?').replace(/\s+/g, ' ').trim().toLowerCase();
    if (text.startsWith('select')) {
      const row = rows.get(values[0]);
      return Promise.resolve(row ? [{ ...row }] : []);
    }
    if (text.startsWith('update product_variants')) {
      const scopedToProduct = text.includes('and product_id::text = ?');
      const variantId = scopedToProduct ? values[values.length - 2] : values[values.length - 1];
      const productId = scopedToProduct ? values[values.length - 1] : null;
      const row = rows.get(variantId);
      if (!row || (scopedToProduct && row.product_id !== productId)) return Promise.resolve([]);
      writes.push({ variantId, scopedToProduct });
      if (text.includes('is_active = false')) row.is_active = false;
      else row.price_override = values[4];
      return Promise.resolve([{ ...row }]);
    }
    throw new Error(`Unexpected query: ${text}`);
  }

  return { sql, rows, writes };
}

function variantRow(id, productId) {
  return {
    id,
    product_id: productId,
    variant_name: 'Medium',
    sku: null,
    size: 'M',
    colour: null,
    price_override: '500.00',
    stock_quantity: 10,
    reserved_quantity: 0,
    sold_quantity: 0,
    low_stock_threshold: 5,
    is_active: true
  };
}

function loadWithFakeSql(fake) {
  const postgresPath = require.resolve('../src/db/postgres');
  const servicePath = require.resolve('../src/services/shop/variant.service');
  const controllerPaths = [
    require.resolve('../src/controllers/organizer-shop.controller'),
    require.resolve('../src/controllers/admin-shop.controller')
  ];
  require(postgresPath);
  require.cache[postgresPath].exports.getPostgresClient = () => fake.sql;
  delete require.cache[servicePath];
  controllerPaths.forEach((p) => delete require.cache[p]);
  return {
    variantService: require(servicePath),
    organizerShop: require(controllerPaths[0]),
    adminShop: require(controllerPaths[1])
  };
}

function fakeRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; }
  };
}

test('updateVariant refuses a variant that belongs to a different product, without writing', async () => {
  const fake = createFakeSql();
  const { variantService } = loadWithFakeSql(fake);

  const result = await variantService.updateVariant(OWN_PRODUCT, OTHER_VARIANT, { priceOverride: 1 });

  assert.equal(result, null);
  assert.equal(fake.writes.length, 0);
  assert.equal(fake.rows.get(OTHER_VARIANT).price_override, '500.00');
});

test('deactivateVariant refuses a variant that belongs to a different product', async () => {
  const fake = createFakeSql();
  const { variantService } = loadWithFakeSql(fake);

  const result = await variantService.deactivateVariant(OWN_PRODUCT, OTHER_VARIANT);

  assert.equal(result, null);
  assert.equal(fake.writes.length, 0);
  assert.equal(fake.rows.get(OTHER_VARIANT).is_active, true);
});

test('variant writes carry the product scope in the UPDATE itself', async () => {
  const fake = createFakeSql();
  const { variantService } = loadWithFakeSql(fake);

  const updated = await variantService.updateVariant(OWN_PRODUCT, OWN_VARIANT, { priceOverride: 650 });
  const deactivated = await variantService.deactivateVariant(OWN_PRODUCT, OWN_VARIANT);

  assert.equal(updated.product_id, OWN_PRODUCT);
  assert.equal(deactivated.is_active, false);
  assert.deepEqual(fake.writes.map((w) => w.scopedToProduct), [true, true]);
});

test('variant writes require both a product and a variant id', async () => {
  const fake = createFakeSql();
  const { variantService } = loadWithFakeSql(fake);

  assert.equal(await variantService.updateVariant('', OWN_VARIANT, {}), null);
  assert.equal(await variantService.deactivateVariant(OWN_PRODUCT, ''), null);
  assert.equal(fake.writes.length, 0);
});

for (const [label, controllerKey, patchFn, deleteFn] of [
  ['organizer', 'organizerShop', 'patchProductVariant', 'deleteProductVariant'],
  ['admin', 'adminShop', 'patchPlatformProductVariant', 'deletePlatformProductVariant']
]) {
  test(`${label} variant routes answer 404 and leave a foreign variant untouched`, async () => {
    const fake = createFakeSql();
    const controller = loadWithFakeSql(fake)[controllerKey];
    const params = { productId: OWN_PRODUCT, variantId: OTHER_VARIANT };

    const patchRes = fakeRes();
    await controller[patchFn]({ params, body: { priceOverride: 1 } }, patchRes, assert.fail);
    const deleteRes = fakeRes();
    await controller[deleteFn]({ params, body: {} }, deleteRes, assert.fail);

    assert.equal(patchRes.statusCode, 404);
    assert.equal(deleteRes.statusCode, 404);
    assert.equal(fake.writes.length, 0);
    assert.deepEqual(fake.rows.get(OTHER_VARIANT), variantRow(OTHER_VARIANT, OTHER_PRODUCT));
  });
}
