const { getPostgresClient } = require('../../db/postgres');

async function listProducts(options = {}) {
  const sql = getPostgresClient();
  const eventId = String(options.eventId || '').trim();
  const limit = normalizeLimit(options.limit, 50);

  if (!eventId) return [];

  const rows = await sql`
    select id, event_id, organiser_id, name, slug, product_type, base_price, currency, status,
           is_visible, show_during_registration, show_in_event_shop, created_at, updated_at
    from products_core
    where event_id::text = ${eventId}
    order by created_at desc
    limit ${limit}
  `;

  return rows;
}

async function listProductsByMongoEventId(mongoEventId, options = {}) {
  const sql = getPostgresClient();
  const safeMongoEventId = String(mongoEventId || '').trim();
  const limit = normalizeLimit(options.limit, 50);
  if (!safeMongoEventId) return [];

  const rows = await sql`
    select p.id, p.event_id, p.organiser_id, p.name, p.slug, p.product_type, p.base_price, p.currency,
           p.status, p.is_visible, p.show_during_registration, p.show_in_event_shop, p.created_at, p.updated_at
    from products_core p
    join events_core ec on ec.id = p.event_id
    where ec.mongo_event_id = ${safeMongoEventId}
    order by p.created_at desc
    limit ${limit}
  `;

  return rows;
}

async function getProductById(productId) {
  const sql = getPostgresClient();
  const id = String(productId || '').trim();
  if (!id) return null;

  const rows = await sql`
    select * from products_core
    where id::text = ${id}
    limit 1
  `;
  return rows[0] || null;
}

function normalizeLimit(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, 200);
}

module.exports = {
  listProducts,
  listProductsByMongoEventId,
  getProductById
};
