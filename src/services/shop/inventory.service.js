const { getPostgresClient } = require('../../db/postgres');

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
  computeAvailableQuantity
};
