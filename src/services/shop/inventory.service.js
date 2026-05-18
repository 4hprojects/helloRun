const { getPostgresClient } = require('../../db/postgres');

async function listInventoryByProductId(productId) {
  const sql = getPostgresClient();
  const id = String(productId || '').trim();
  if (!id) return [];

  return sql`
    select id, product_id, variant_id, movement_type, quantity, reason,
           related_order_id, created_by, created_at
    from inventory_movements
    where product_id::text = ${id}
    order by created_at desc
    limit 200
  `;
}

function computeAvailableQuantity(variant = {}) {
  const stock = asInt(variant.stock_quantity);
  const reserved = asInt(variant.reserved_quantity);
  const sold = asInt(variant.sold_quantity);
  return stock - reserved - sold;
}

function asInt(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed)) return 0;
  return parsed;
}

module.exports = {
  listInventoryByProductId,
  computeAvailableQuantity
};
