const test = require('node:test');
const assert = require('node:assert/strict');
require('dotenv').config();

const { getPostgresClient, closePostgresClient } = require('../src/db/postgres');

function requireDatabaseUrl() {
  if (!String(process.env.DATABASE_URL || '').trim()) {
    test.skip('DATABASE_URL is not configured for schema smoke tests');
    return false;
  }
  return true;
}

test.after(async () => {
  await closePostgresClient();
});

test('shop schema tables exist after migration run', async () => {
  if (!requireDatabaseUrl()) return;
  const sql = getPostgresClient();
  const expectedTables = [
    'products_core',
    'product_variants',
    'inventory_movements',
    'orders',
    'order_items',
    'shop_payments',
    'shop_fulfilment_logs',
    'shop_platform_fees'
  ];

  for (const tableName of expectedTables) {
    const rows = await sql`
      select to_regclass(${`public.${tableName}`}) as relation_name
    `;
    assert.equal(rows.length, 1);
    assert.ok(rows[0].relation_name, `Expected table ${tableName} to exist`);
  }
});

test('shop schema critical constraints are present', async () => {
  if (!requireDatabaseUrl()) return;
  const sql = getPostgresClient();
  const expectedConstraints = [
    'products_core_product_type_check',
    'products_core_owner_type_check',
    'orders_order_source_check',
    'orders_fulfilment_status_check',
    'shop_payments_status_check',
    'orders_amounts_non_negative_check',
    'shop_payments_amount_paid_non_negative_check'
  ];

  for (const constraintName of expectedConstraints) {
    const rows = await sql`
      select conname
      from pg_constraint
      where conname = ${constraintName}
      limit 1
    `;
    assert.equal(rows.length, 1, `Expected constraint ${constraintName} to exist`);
  }
});

test('shop schema critical indexes and views are present', async () => {
  if (!requireDatabaseUrl()) return;
  const sql = getPostgresClient();
  const expectedIndexes = [
    'idx_products_core_registration_visibility',
    'idx_shop_payments_status',
    'idx_shop_payments_review_queue',
    'idx_orders_payment_review_queue'
  ];
  const expectedViews = ['v_shop_variant_inventory', 'v_shop_order_queue'];

  for (const indexName of expectedIndexes) {
    const rows = await sql`
      select to_regclass(${`public.${indexName}`}) as relation_name
    `;
    assert.equal(rows.length, 1);
    assert.ok(rows[0].relation_name, `Expected index ${indexName} to exist`);
  }

  for (const viewName of expectedViews) {
    const rows = await sql`
      select to_regclass(${`public.${viewName}`}) as relation_name
    `;
    assert.equal(rows.length, 1);
    assert.ok(rows[0].relation_name, `Expected view ${viewName} to exist`);
  }
});
