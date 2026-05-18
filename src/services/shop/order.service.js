const { getPostgresClient } = require('../../db/postgres');

async function listOrdersByUserId(userId, options = {}) {
  const sql = getPostgresClient();
  const safeUserId = String(userId || '').trim();
  const limit = normalizeLimit(options.limit, 50);
  if (!safeUserId) return [];

  return sql`
    select id, order_number, buyer_user_id, event_id, organiser_id,
           subtotal, delivery_fee, platform_fee, total_amount, currency,
           payment_status, fulfilment_status, created_at, updated_at
    from orders
    where buyer_user_id::text = ${safeUserId}
    order by created_at desc
    limit ${limit}
  `;
}

async function listOrdersByMongoUserId(mongoUserId, options = {}) {
  const sql = getPostgresClient();
  const safeMongoUserId = String(mongoUserId || '').trim();
  const limit = normalizeLimit(options.limit, 50);
  if (!safeMongoUserId) return [];

  return sql`
    select o.id, o.order_number, o.buyer_user_id, o.event_id, o.organiser_id,
           o.subtotal, o.delivery_fee, o.platform_fee, o.total_amount, o.currency,
           o.payment_status, o.fulfilment_status, o.created_at, o.updated_at
    from orders o
    join app_users au on au.id = o.buyer_user_id
    where au.mongo_user_id = ${safeMongoUserId}
    order by o.created_at desc
    limit ${limit}
  `;
}

function recalculateOrderTotals({ subtotal = 0, deliveryFee = 0, platformFee = 0 } = {}) {
  const sub = asMoney(subtotal);
  const del = asMoney(deliveryFee);
  const fee = asMoney(platformFee);
  return {
    subtotal: sub,
    deliveryFee: del,
    platformFee: fee,
    totalAmount: asMoney(sub + del + fee)
  };
}

function asMoney(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.round(numeric * 100) / 100);
}

function normalizeLimit(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, 200);
}

module.exports = {
  listOrdersByUserId,
  listOrdersByMongoUserId,
  recalculateOrderTotals
};
