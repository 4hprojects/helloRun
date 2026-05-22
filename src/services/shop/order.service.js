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

async function listOrdersByMongoEventId(mongoEventId, options = {}) {
  const sql = getPostgresClient();
  const safeMongoEventId = String(mongoEventId || '').trim();
  const limit = normalizeLimit(options.limit, 50);
  if (!safeMongoEventId) return [];

  return sql`
    select o.id, o.order_number, o.buyer_user_id, o.event_id, o.organiser_id,
           o.subtotal, o.delivery_fee, o.platform_fee, o.total_amount, o.currency,
           o.payment_status, o.fulfilment_status, o.delivery_method, o.customer_note,
           o.created_at, o.updated_at, au.mongo_user_id as buyer_mongo_user_id,
           au.email as buyer_email, au.display_name as buyer_display_name
    from orders o
    join events_core ec on ec.id = o.event_id
    left join app_users au on au.id = o.buyer_user_id
    where ec.mongo_event_id = ${safeMongoEventId}
    order by o.created_at desc
    limit ${limit}
  `;
}

async function listOrdersForAdmin(options = {}) {
  const limit = normalizeLimit(options.limit, 50);
  return getPostgresClient()`
    select o.id, o.order_number, o.buyer_user_id, o.event_id, o.organiser_id,
           o.subtotal, o.delivery_fee, o.platform_fee, o.total_amount, o.currency,
           o.payment_status, o.fulfilment_status, o.created_at, o.updated_at,
           ec.slug as event_slug, ec.title as event_title,
           au.email as buyer_email, au.display_name as buyer_display_name
    from orders o
    left join events_core ec on ec.id = o.event_id
    left join app_users au on au.id = o.buyer_user_id
    order by o.created_at desc
    limit ${limit}
  `;
}

async function getOrderById(orderId) {
  const id = String(orderId || '').trim();
  if (!id) return null;

  const rows = await getPostgresClient()`
    select o.id, o.order_number, o.buyer_user_id, o.event_id, o.organiser_id,
           o.subtotal, o.delivery_fee, o.platform_fee, o.total_amount, o.currency,
           o.payment_status, o.fulfilment_status, o.delivery_method, o.customer_note,
           o.created_at, o.updated_at, ec.mongo_event_id, ec.slug as event_slug,
           ec.title as event_title, au.mongo_user_id as buyer_mongo_user_id,
           au.email as buyer_email, au.display_name as buyer_display_name
    from orders o
    left join events_core ec on ec.id = o.event_id
    left join app_users au on au.id = o.buyer_user_id
    where o.id::text = ${id}
    limit 1
  `;
  const order = rows[0] || null;
  if (!order) return null;

  order.items = await listOrderItems(order.id);
  return order;
}

async function getOrderByIdForMongoEvent(orderId, mongoEventId) {
  const order = await getOrderById(orderId);
  if (!order || String(order.mongo_event_id || '') !== String(mongoEventId || '')) return null;
  return order;
}

async function getOrderByNumberForMongoUser(orderNumber, mongoUserId) {
  const safeOrderNumber = String(orderNumber || '').trim();
  const safeMongoUserId = String(mongoUserId || '').trim();
  if (!safeOrderNumber || !safeMongoUserId) return null;

  const rows = await getPostgresClient()`
    select o.id, o.order_number, o.buyer_user_id, o.event_id, o.organiser_id,
           o.subtotal, o.delivery_fee, o.platform_fee, o.total_amount, o.currency,
           o.payment_status, o.fulfilment_status, o.delivery_method, o.customer_note,
           o.created_at, o.updated_at, ec.slug as event_slug, ec.title as event_title,
           au.mongo_user_id as buyer_mongo_user_id
    from orders o
    join app_users au on au.id = o.buyer_user_id
    left join events_core ec on ec.id = o.event_id
    where o.order_number = ${safeOrderNumber}
      and au.mongo_user_id = ${safeMongoUserId}
    limit 1
  `;
  const order = rows[0] || null;
  if (!order) return null;

  order.items = await listOrderItems(order.id);
  return order;
}

async function updateFulfilment(orderId, payload = {}, actorAppUserId = null) {
  const existing = await getOrderById(orderId);
  if (!existing) return null;

  const status = String(payload.fulfilmentStatus || payload.fulfilment_status || payload.status || '').trim();
  const note = String(payload.note || payload.fulfilmentNote || payload.fulfilment_note || '').trim();
  const actorId = actorAppUserId ? String(actorAppUserId) : null;
  const sql = getPostgresClient();

  const rows = await sql`
    update orders
    set fulfilment_status = ${status},
        order_status = ${mapFulfilmentToOrderStatus(status)},
        updated_at = now()
    where id::text = ${String(orderId || '').trim()}
    returning id, order_number, payment_status, fulfilment_status, updated_at
  `;

  if (rows[0]) {
    await sql`
      insert into shop_fulfilment_logs (order_id, old_status, new_status, note, updated_by)
      values (${existing.id}, ${existing.fulfilment_status}, ${status}, ${note || null}, ${actorId})
    `;
  }

  return rows[0] || null;
}

async function listOrderItems(orderId) {
  const id = String(orderId || '').trim();
  if (!id) return [];

  return getPostgresClient()`
    select id, order_id, product_id, variant_id, name_snapshot, variant_snapshot,
           quantity, unit_price, line_total
    from order_items
    where order_id::text = ${id}
    order by id asc
  `;
}

function mapFulfilmentToOrderStatus(status) {
  switch (status) {
    case 'preparing':
      return 'processing';
    case 'shipped':
      return 'shipped';
    case 'claimed':
    case 'completed':
      return 'delivered';
    case 'cancelled':
      return 'cancelled';
    default:
      return 'pending';
  }
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
  listOrdersByMongoEventId,
  listOrdersForAdmin,
  getOrderById,
  getOrderByIdForMongoEvent,
  getOrderByNumberForMongoUser,
  updateFulfilment,
  recalculateOrderTotals
};
