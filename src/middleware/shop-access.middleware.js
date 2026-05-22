const mongoose = require('mongoose');
const Event = require('../models/Event');
const User = require('../models/User');
const { getPostgresClient } = require('../db/postgres');

async function requireRunner(req, res, next) {
  try {
    const user = await getSessionUser(req);
    if (!user || user.role !== 'runner') {
      return renderAccessDenied(res, 'Runner access is required.');
    }
    req.shopActor = user;
    return next();
  } catch (error) {
    return next(error);
  }
}

async function requireOrganizer(req, res, next) {
  try {
    const user = await getSessionUser(req);
    if (!user || user.role !== 'organiser') {
      return renderAccessDenied(res, 'Organizer access is required.');
    }
    req.shopActor = user;
    return next();
  } catch (error) {
    return next(error);
  }
}

async function canManageEventShop(req, res, next) {
  try {
    const user = req.shopActor || await getSessionUser(req);
    if (!user) return renderAccessDenied(res, 'Authentication required.');
    req.shopActor = user;
    req.shopActorAppUserId = await getAppUserIdForMongoUser(user._id);
    if (user.role !== 'organiser') return renderAccessDenied(res, 'Organizer access is required.');

    const eventId = String(req.params.eventId || req.body.eventId || '').trim();
    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return renderBadRequest(res, 'Invalid event reference.');
    }

    const event = await Event.findById(eventId).select('organizerId').lean();
    if (!event || String(event.organizerId || '') !== String(user._id)) {
      return renderAccessDenied(res, 'You can only manage shop data for your own events.');
    }

    req.shopEvent = event;
    return next();
  } catch (error) {
    return next(error);
  }
}

async function canReviewShopPayment(req, res, next) {
  try {
    const paymentId = String(req.params.paymentId || req.body.paymentId || '').trim();
    const eventId = String(req.params.eventId || req.body.eventId || '').trim();
    if (!isUuid(paymentId)) return renderBadRequest(res, 'Invalid payment reference.');
    if (!mongoose.Types.ObjectId.isValid(eventId)) return renderBadRequest(res, 'Invalid event reference.');

    const rows = await getPostgresClient()`
      select sp.id, sp.status, o.event_id, ec.mongo_event_id
      from shop_payments sp
      join orders o on o.id = sp.order_id
      join events_core ec on ec.id = o.event_id
      where sp.id::text = ${paymentId}
        and ec.mongo_event_id = ${eventId}
      limit 1
    `;

    if (!rows.length) {
      return renderAccessDenied(res, 'You can only review shop payments for your own events.');
    }

    req.shopPaymentReview = rows[0];
    return next();
  } catch (error) {
    return next(error);
  }
}

async function canUpdateFulfilment(req, res, next) {
  try {
    const orderId = String(req.params.orderId || req.body.orderId || '').trim();
    const eventId = String(req.params.eventId || req.body.eventId || '').trim();
    if (!isUuid(orderId)) return renderBadRequest(res, 'Invalid order reference.');
    if (!mongoose.Types.ObjectId.isValid(eventId)) return renderBadRequest(res, 'Invalid event reference.');

    const order = await findOrderForMongoEvent(orderId, eventId);
    if (!order) {
      return renderAccessDenied(res, 'You can only update fulfilment for orders in your own events.');
    }

    req.shopOrder = order;
    return next();
  } catch (error) {
    return next(error);
  }
}

async function canViewShopOrder(req, res, next) {
  try {
    const user = req.shopActor || await getSessionUser(req);
    if (!user) return renderAccessDenied(res, 'Authentication required.');
    req.shopActor = user;

    const orderId = String(req.params.orderId || req.body.orderId || '').trim();
    if (!isUuid(orderId)) return renderBadRequest(res, 'Invalid order reference.');

    const rows = await getPostgresClient()`
      select o.id, o.order_number, o.buyer_user_id, au.mongo_user_id as buyer_mongo_user_id
      from orders o
      left join app_users au on au.id = o.buyer_user_id
      where o.id::text = ${orderId}
      limit 1
    `;
    const order = rows[0] || null;
    if (!order) return renderAccessDenied(res, 'Order not found or inaccessible.');

    if (user.role === 'runner' && String(order.buyer_mongo_user_id || '') !== String(user._id)) {
      return renderAccessDenied(res, 'You can only view your own shop orders.');
    }

    if (user.role === 'organiser') {
      const eventId = String(req.params.eventId || req.body.eventId || '').trim();
      const eventOrder = await findOrderForMongoEvent(orderId, eventId);
      if (!eventOrder) return renderAccessDenied(res, 'You can only view shop orders for your own events.');
      req.shopOrder = eventOrder;
      return next();
    }

    req.shopOrder = order;
    return next();
  } catch (error) {
    return next(error);
  }
}

async function canManageShopProduct(req, res, next) {
  try {
    const productId = String(req.params.productId || req.body.productId || '').trim();
    const eventId = String(req.params.eventId || req.body.eventId || '').trim();
    if (!isUuid(productId)) return renderBadRequest(res, 'Invalid product reference.');
    if (!mongoose.Types.ObjectId.isValid(eventId)) return renderBadRequest(res, 'Invalid event reference.');

    const rows = await getPostgresClient()`
      select p.id, p.event_id, p.status, ec.mongo_event_id
      from products_core p
      join events_core ec on ec.id = p.event_id
      where p.id::text = ${productId}
        and ec.mongo_event_id = ${eventId}
      limit 1
    `;

    if (!rows.length) {
      return renderAccessDenied(res, 'You can only manage products for your own events.');
    }

    req.shopProduct = rows[0];
    return next();
  } catch (error) {
    return next(error);
  }
}

async function getSessionUser(req) {
  if (!req.session || !req.session.userId) return null;
  return User.findById(req.session.userId).select('role organizerStatus').lean();
}

async function getAppUserIdForMongoUser(mongoUserId) {
  const safeMongoUserId = String(mongoUserId || '').trim();
  if (!safeMongoUserId) return null;

  const rows = await getPostgresClient()`
    select id
    from app_users
    where mongo_user_id = ${safeMongoUserId}
    limit 1
  `;
  return rows[0]?.id || null;
}

async function findOrderForMongoEvent(orderId, mongoEventId) {
  if (!isUuid(orderId) || !mongoose.Types.ObjectId.isValid(String(mongoEventId || ''))) return null;

  const rows = await getPostgresClient()`
    select o.id, o.order_number, o.event_id, o.payment_status, o.fulfilment_status, ec.mongo_event_id
    from orders o
    join events_core ec on ec.id = o.event_id
    where o.id::text = ${orderId}
      and ec.mongo_event_id = ${String(mongoEventId)}
    limit 1
  `;
  return rows[0] || null;
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));
}

function renderAccessDenied(res, message) {
  return res.status(403).render('error', {
    title: '403 - Access Denied',
    status: 403,
    message
  });
}

function renderBadRequest(res, message) {
  return res.status(400).render('error', {
    title: '400 - Bad Request',
    status: 400,
    message
  });
}

module.exports = {
  requireRunner,
  requireOrganizer,
  canManageEventShop,
  canReviewShopPayment,
  canUpdateFulfilment,
  canViewShopOrder,
  canManageShopProduct
};
