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

async function createVariant(productId, payload = {}) {
  const id = String(productId || '').trim();
  if (!id) return null;

  const rows = await getPostgresClient()`
    insert into product_variants (
      product_id, variant_name, sku, size, colour, price_override,
      stock_quantity, reserved_quantity, sold_quantity, low_stock_threshold, is_active
    )
    values (
      ${id},
      ${normalizeVariantName(payload)},
      ${nullableText(payload.sku)},
      ${nullableText(payload.size)},
      ${nullableText(payload.colour ?? payload.color)},
      ${nullableMoney(payload.priceOverride ?? payload.price_override)},
      ${normalizeInteger(payload.stockQuantity ?? payload.stock_quantity, 0)},
      0,
      0,
      ${normalizeInteger(payload.lowStockThreshold ?? payload.low_stock_threshold, 5)},
      ${toBoolean(payload.isActive ?? payload.is_active, true)}
    )
    returning id, product_id, variant_name, sku, size, colour, price_override,
              stock_quantity, reserved_quantity, sold_quantity, low_stock_threshold,
              is_active, created_at, updated_at
  `;
  return rows[0] || null;
}

async function updateVariant(variantId, payload = {}) {
  const existing = await getVariantById(variantId);
  if (!existing) return null;

  const rows = await getPostgresClient()`
    update product_variants
    set variant_name = ${normalizeVariantName(payload, existing.variant_name)},
        sku = ${nullableText(payload.sku ?? existing.sku)},
        size = ${nullableText(payload.size ?? existing.size)},
        colour = ${nullableText(payload.colour ?? payload.color ?? existing.colour)},
        price_override = ${nullableMoney(payload.priceOverride ?? payload.price_override ?? existing.price_override)},
        stock_quantity = ${normalizeInteger(payload.stockQuantity ?? payload.stock_quantity ?? existing.stock_quantity, 0)},
        low_stock_threshold = ${normalizeInteger(payload.lowStockThreshold ?? payload.low_stock_threshold ?? existing.low_stock_threshold, 5)},
        is_active = ${toBoolean(payload.isActive ?? payload.is_active, existing.is_active)},
        updated_at = now()
    where id::text = ${String(variantId || '').trim()}
    returning id, product_id, variant_name, sku, size, colour, price_override,
              stock_quantity, reserved_quantity, sold_quantity, low_stock_threshold,
              is_active, created_at, updated_at
  `;
  return rows[0] || null;
}

async function deactivateVariant(variantId) {
  const rows = await getPostgresClient()`
    update product_variants
    set is_active = false,
        updated_at = now()
    where id::text = ${String(variantId || '').trim()}
    returning id, product_id, variant_name, sku, size, colour, price_override,
              stock_quantity, reserved_quantity, sold_quantity, low_stock_threshold,
              is_active, created_at, updated_at
  `;
  return rows[0] || null;
}

async function getVariantById(variantId) {
  const id = String(variantId || '').trim();
  if (!id) return null;

  const rows = await getPostgresClient()`
    select id, product_id, variant_name, sku, size, colour, price_override,
           stock_quantity, reserved_quantity, sold_quantity, low_stock_threshold,
           is_active, created_at, updated_at
    from product_variants
    where id::text = ${id}
    limit 1
  `;
  return rows[0] || null;
}

function normalizeVariantName(payload = {}, fallback = 'Default') {
  const explicit = String(payload.variantName ?? payload.variant_name ?? '').trim();
  if (explicit) return explicit;
  const combined = [payload.size, payload.colour ?? payload.color]
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .join(' / ');
  return combined || String(fallback || 'Default').trim() || 'Default';
}

function nullableText(value) {
  const text = String(value || '').trim();
  return text || null;
}

function nullableMoney(value) {
  if (value === undefined || value === null || value === '') return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return Math.max(0, Math.round(numeric * 100) / 100);
}

function normalizeInteger(value, fallback) {
  const numeric = Number(value);
  return Number.isInteger(numeric) && numeric >= 0 ? numeric : fallback;
}

function toBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') return Boolean(fallback);
  if (typeof value === 'boolean') return value;
  return ['true', '1', 'yes', 'on'].includes(String(value).trim().toLowerCase());
}

module.exports = {
  listVariantsByProductId,
  createVariant,
  updateVariant,
  deactivateVariant,
  getVariantById
};
