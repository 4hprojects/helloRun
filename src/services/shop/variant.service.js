const { getPostgresClient } = require('../../db/postgres');

async function listVariantsByProductId(productId) {
  const sql = getPostgresClient();
  const id = String(productId || '').trim();
  if (!id) return [];

  return sql`
    select id, product_id, variant_name, sku, size, colour, price_override,
           stock_quantity, reserved_quantity, sold_quantity, low_stock_threshold,
           is_active, created_at, updated_at
    from product_variants
    where product_id::text = ${id}
    order by created_at asc
  `;
}

module.exports = {
  listVariantsByProductId
};
