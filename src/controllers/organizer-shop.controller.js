const ExcelJS = require('exceljs');
const productService = require('../services/shop/product.service');
const variantService = require('../services/shop/variant.service');
const orderService = require('../services/shop/order.service');
const paymentReviewService = require('../services/shop/payment-review.service');
const Registration = require('../models/Registration');
const User = require('../models/User');
const Event = require('../models/Event');
const communicationService = require('../services/communication.service');
const { evaluateRegistrationAchievementsInBackground } = require('../services/achievement.service');
const { recordCriticalAuditEventInBackground } = require('../services/critical-audit.service');

function notLive(res, message) {
  return res.status(501).render('error', {
    title: 'Shop Management Not Live Yet',
    status: 501,
    message
  });
}

exports.getShopDashboard = async (req, res, next) => {
  try {
    const [event, products, orders, paymentReviews] = await Promise.all([
      Event.findById(req.params.eventId).select('_id slug title status').lean(),
      productService.listProductsByMongoEventId(req.params.eventId, { limit: 100 }),
      orderService.listOrdersByMongoEventId(req.params.eventId, { limit: 100 }),
      paymentReviewService.listPendingPaymentReviewsByMongoEventId(req.params.eventId, { limit: 100 })
    ]);

    if (!event) {
      return res.status(404).render('error', { title: 'Event Not Found', status: 404, message: 'Event not found.' });
    }

    const summary = {
      productCount: products.length,
      orderCount: orders.length,
      pendingPaymentReviewCount: paymentReviews.length
    };

    if (wantsHtml(req)) {
      return res.render('organizer/event-shop-dashboard', {
        title: `Shop Manager - ${event.title}`,
        event,
        summary,
        products: products.slice(0, 10),
        orders: orders.slice(0, 10),
        paymentReviews: paymentReviews.slice(0, 10),
        formatCurrency,
        statusTone
      });
    }

    return res.json({
      success: true,
      summary,
      csrfToken: res.locals.csrfToken || '',
      products,
      orders,
      paymentReviews
    });
  } catch (error) {
    return next(error);
  }
};

exports.getProducts = async (req, res, next) => {
  try {
    const products = await productService.listProductsByMongoEventId(req.params.eventId, {
      limit: req.shopPagination?.limit || 100
    });
    return res.json({ success: true, products, count: products.length });
  } catch (error) {
    return next(error);
  }
};

exports.getNewProduct = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.eventId).select('_id slug title').lean();
    if (!event) return res.status(404).render('error', { title: 'Event Not Found', status: 404, message: 'Event not found.' });
    return res.render('organizer/shop-product-form', {
      title: `New Product - ${event.title}`,
      event,
      product: null,
      message: getPageMessage(req.query)
    });
  } catch (error) {
    return next(error);
  }
};

exports.postProduct = async (req, res, next) => {
  try {
    const product = await productService.createProductForMongoEvent(
      req.params.eventId,
      req.body,
      req.shopActorAppUserId
    );
    if (!product) {
      if (wantsHtml(req)) {
        return res.redirect(`/organizer/events/${req.params.eventId}/shop/products/new?type=error&msg=${encodeURIComponent('Event shop record not found.')}`);
      }
      return res.status(404).json({ success: false, message: 'Event shop record not found.' });
    }

    if (wantsHtml(req)) {
      return res.redirect(`/organizer/events/${req.params.eventId}/shop/products/${product.id}/edit?type=success&msg=${encodeURIComponent('Product created.')}`);
    }
    return res.status(201).json({ success: true, product });
  } catch (error) {
    return next(error);
  }
};

exports.getEditProduct = async (req, res, next) => {
  try {
    const [event, product] = await Promise.all([
      Event.findById(req.params.eventId).select('_id slug title').lean(),
      productService.getProductById(req.params.productId)
    ]);
    if (!event) return res.status(404).render('error', { title: 'Event Not Found', status: 404, message: 'Event not found.' });
    if (!product) return res.status(404).render('error', { title: 'Product Not Found', status: 404, message: 'Product not found.' });
    return res.render('organizer/shop-product-form', {
      title: `Edit Product - ${event.title}`,
      event,
      product,
      message: getPageMessage(req.query)
    });
  } catch (error) {
    return next(error);
  }
};

exports.patchProduct = async (req, res, next) => {
  try {
    const product = await productService.updateProduct(req.params.productId, req.body, req.shopActorAppUserId);
    if (!product) {
      if (wantsHtml(req)) {
        return res.redirect(`/organizer/events/${req.params.eventId}/shop/products/${req.params.productId}/edit?type=error&msg=${encodeURIComponent('Product not found.')}`);
      }
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    if (wantsHtml(req)) {
      return res.redirect(`/organizer/events/${req.params.eventId}/shop/products/${product.id}/edit?type=success&msg=${encodeURIComponent('Product updated.')}`);
    }
    return res.json({ success: true, product });
  } catch (error) {
    return next(error);
  }
};

exports.archiveProduct = async (req, res, next) => {
  try {
    const product = await productService.archiveProduct(req.params.productId, req.shopActorAppUserId);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });
    return res.json({ success: true, product });
  } catch (error) {
    return next(error);
  }
};

exports.hideProduct = async (req, res, next) => {
  try {
    const product = await productService.hideProduct(req.params.productId, req.shopActorAppUserId);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });
    return res.json({ success: true, product });
  } catch (error) {
    return next(error);
  }
};

exports.getProductVariants = async (req, res, next) => {
  try {
    const variants = await variantService.listVariantsByProductId(req.params.productId);
    return res.json({ success: true, variants, count: variants.length });
  } catch (error) {
    return next(error);
  }
};

exports.postProductVariant = async (req, res, next) => {
  try {
    const variant = await variantService.createVariant(req.params.productId, req.body);
    return res.status(201).json({ success: true, variant });
  } catch (error) {
    return next(error);
  }
};

exports.patchProductVariant = async (req, res, next) => {
  try {
    const variant = await variantService.updateVariant(req.params.variantId, req.body);
    if (!variant || String(variant.product_id) !== String(req.params.productId)) {
      return res.status(404).json({ success: false, message: 'Variant not found.' });
    }
    return res.json({ success: true, variant });
  } catch (error) {
    return next(error);
  }
};

exports.deleteProductVariant = async (req, res, next) => {
  try {
    const variant = await variantService.deactivateVariant(req.params.variantId);
    if (!variant || String(variant.product_id) !== String(req.params.productId)) {
      return res.status(404).json({ success: false, message: 'Variant not found.' });
    }
    return res.json({ success: true, variant });
  } catch (error) {
    return next(error);
  }
};

exports.getOrders = async (req, res, next) => {
  try {
    const orders = await orderService.listOrdersByMongoEventId(req.params.eventId, {
      limit: req.shopPagination?.limit || 100
    });
    return res.json({ success: true, orders, count: orders.length });
  } catch (error) {
    return next(error);
  }
};

exports.getOrderDetail = async (req, res, next) => {
  try {
    const order = await orderService.getOrderByIdForMongoEvent(req.params.orderId, req.params.eventId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

    if (wantsHtml(req)) {
      const event = await Event.findById(req.params.eventId).select('_id slug title').lean();
      if (!event) return res.status(404).render('error', { title: 'Event Not Found', status: 404, message: 'Event not found.' });

      return res.render('organizer/shop-order-detail', {
        title: `${order.order_number} · Shop Order`,
        event,
        order,
        formatCurrency,
        statusTone,
        message: getPageMessage(req.query)
      });
    }

    return res.json({ success: true, order });
  } catch (error) {
    return next(error);
  }
};

exports.patchOrderFulfilment = async (req, res, next) => {
  try {
    const order = await orderService.updateFulfilment(req.params.orderId, req.body, req.shopActorAppUserId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
    return res.json({ success: true, order });
  } catch (error) {
    return next(error);
  }
};

exports.getPaymentReviews = async (req, res, next) => {
  try {
    const items = await paymentReviewService.listPendingPaymentReviewsByMongoEventId(req.params.eventId, {
      limit: req.shopPagination?.limit || 100
    });
    return res.json({ success: true, items, count: items.length });
  } catch (error) {
    return next(error);
  }
};

exports.patchPaymentReview = async (req, res, next) => {
  try {
    const payment = await paymentReviewService.getPaymentReviewByIdForMongoEvent(req.params.paymentId, req.params.eventId);
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment review item not found.' });
    }

    const nextStatus = String(req.body.status || '').trim();
    const reviewNote = String(req.body.reviewNote || '').trim();
    const rejectionReason = String(req.body.rejectionReason || '').trim();

    if (!paymentReviewService.canTransitionPaymentStatus(payment.status, nextStatus)) {
      return res.status(400).json({ success: false, message: 'Invalid payment status transition.' });
    }

    if ((nextStatus === 'rejected' || nextStatus === 'correction_required') && rejectionReason.length < 5) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason must be at least 5 characters.'
      });
    }

    const reviewedBy = req.shopActorAppUserId ? String(req.shopActorAppUserId) : null;
    const updatedPayment = await paymentReviewService.updatePaymentReviewDecision(payment.id, {
      status: nextStatus,
      reviewedBy,
      reviewNote,
      rejectionReason
    });

    const nextOrderPaymentStatus = nextStatus === 'paid' ? 'paid' : 'proof_rejected';
    await paymentReviewService.updateOrderPaymentStatus(payment.order_id, nextOrderPaymentStatus);

    recordCriticalAuditEventInBackground({
      actorMongoUserId: req.shopActor?._id,
      action: nextOrderPaymentStatus === 'paid' ? 'payment.approved' : 'payment.rejected',
      targetType: 'shop_payment',
      targetId: String(payment.id),
      statusFrom: String(payment.order_payment_status || ''),
      statusTo: nextOrderPaymentStatus,
      notes: nextOrderPaymentStatus === 'paid'
        ? (reviewNote || 'Organizer approved shop payment proof.')
        : (rejectionReason || reviewNote || 'Organizer rejected shop payment proof.'),
      ipAddress: getRequestIpAddress(req),
      userAgent: getRequestUserAgent(req),
      occurredAt: new Date()
    });

    const registrationId = extractRegistrationIdFromOrderNote(payment.customer_note);
    let registration = null;
    if (registrationId) {
      registration = await Registration.findById(registrationId)
        .select('userId confirmationCode paymentStatus paymentReviewedAt paymentReviewedBy paymentReviewNotes paymentRejectionReason')
        .lean();

      if (registration) {
        await Registration.updateOne(
          { _id: registrationId },
          {
            $set: {
              paymentStatus: nextOrderPaymentStatus,
              paymentReviewedAt: new Date(),
              paymentReviewedBy: req.shopActor?._id || null,
              paymentReviewNotes: reviewNote,
              paymentRejectionReason: nextStatus === 'paid' ? '' : rejectionReason
            }
          }
        );
      }
    }

    if (registration && nextOrderPaymentStatus === 'paid') {
      evaluateRegistrationAchievementsInBackground(registrationId, {
        performedBy: req.shopActor?._id
      });
    }

    if (registration?.userId) {
      try {
        const [runner, event] = await Promise.all([
          User.findById(registration.userId).select('email firstName').lean(),
          Event.findById(req.params.eventId).select('title').lean()
        ]);

        if (nextOrderPaymentStatus === 'paid') {
          await communicationService.notify('payment.approved', {
            notification: {
              userId: registration.userId,
              type: 'payment_approved',
              title: 'Payment Approved',
              message: `Your payment for ${event?.title || 'the event'} has been approved.`,
              href: '/my-registrations',
              metadata: {
                registrationId: String(registrationId),
                eventId: String(req.params.eventId || ''),
                eventTitle: event?.title || ''
              }
            },
            email: runner?.email ? {
              to: runner.email,
              firstName: runner.firstName || 'Runner',
              eventTitle: event?.title || 'Event',
              confirmationCode: registration.confirmationCode || '',
              recipientUserId: registration.userId,
              metadata: {
                registrationId: String(registrationId),
                eventId: String(req.params.eventId || '')
              }
            } : null
          });
        } else {
          await communicationService.notify('payment.rejected', {
            notification: {
              userId: registration.userId,
              type: 'payment_rejected',
              title: 'Payment Needs Update',
              message: `Your payment receipt for ${event?.title || 'the event'} was rejected. Please review and resubmit.`,
              href: '/my-registrations',
              metadata: {
                registrationId: String(registrationId),
                eventId: String(req.params.eventId || ''),
                eventTitle: event?.title || ''
              }
            },
            email: runner?.email ? {
              to: runner.email,
              firstName: runner.firstName || 'Runner',
              eventTitle: event?.title || 'Event',
              confirmationCode: registration.confirmationCode || '',
              rejectionReason,
              reviewNotes: reviewNote,
              recipientUserId: registration.userId,
              metadata: {
                registrationId: String(registrationId),
                eventId: String(req.params.eventId || '')
              }
            } : null
          });
        }
      } catch (communicationError) {
        console.error('Shop payment review communication failed:', {
          paymentId: String(payment.id || ''),
          error: communicationError?.message || String(communicationError)
        });
      }
    }

    return res.json({
      success: true,
      payment: updatedPayment,
      orderPaymentStatus: nextOrderPaymentStatus
    });
  } catch (error) {
    return next(error);
  }
};

exports.getReports = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.eventId).select('_id slug title status').lean();
    if (!event) {
      return res.status(404).render('error', { title: 'Event Not Found', status: 404, message: 'Event not found.' });
    }

    const orders = await orderService.listOrdersByMongoEventId(req.params.eventId, { limit: 1000 });
    const stats = computeOrderStats(orders);

    return res.render('organizer/shop-reports', {
      title: `Shop Reports — ${event.title}`,
      event,
      stats,
      formatCurrency,
      statusTone
    });
  } catch (error) {
    return next(error);
  }
};

exports.exportReportCsv = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.eventId).select('_id slug title').lean();
    if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });

    const orders = await orderService.listOrdersByMongoEventId(req.params.eventId, { limit: 1000 });
    const { headers, rows } = getOrderExportData(orders);

    const csvContent = [headers, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');
    const safeSlug = String(event.slug || 'event').replace(/[^a-zA-Z0-9-_]/g, '');
    const timestamp = new Date().toISOString().slice(0, 10);

    recordCriticalAuditEventInBackground({
      actorMongoUserId: req.session.userId,
      action: 'organiser.shop_orders_exported',
      targetType: 'event',
      targetId: String(event._id),
      notes: `CSV shop order export generated with ${rows.length} row(s).`,
      ipAddress: getRequestIpAddress(req),
      userAgent: getRequestUserAgent(req),
      occurredAt: new Date()
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${safeSlug}-shop-orders-${timestamp}.csv"`);
    return res.status(200).send(csvContent);
  } catch (error) {
    return next(error);
  }
};

exports.exportReportXlsx = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.eventId).select('_id slug title').lean();
    if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });

    const orders = await orderService.listOrdersByMongoEventId(req.params.eventId, { limit: 1000 });
    const { headers, rows } = getOrderExportData(orders);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'HelloRun';
    workbook.created = new Date();
    const worksheet = workbook.addWorksheet('Shop Orders');
    worksheet.addRow(headers);
    rows.forEach((row) => worksheet.addRow(row));
    worksheet.getRow(1).font = { bold: true };
    worksheet.columns.forEach((column) => {
      let maxLength = 12;
      column.eachCell({ includeEmpty: true }, (cell) => {
        maxLength = Math.max(maxLength, String(cell.value || '').length);
      });
      column.width = Math.min(maxLength + 2, 48);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const safeSlug = String(event.slug || 'event').replace(/[^a-zA-Z0-9-_]/g, '');
    const timestamp = new Date().toISOString().slice(0, 10);

    recordCriticalAuditEventInBackground({
      actorMongoUserId: req.session.userId,
      action: 'organiser.shop_orders_exported',
      targetType: 'event',
      targetId: String(event._id),
      notes: `XLSX shop order export generated with ${rows.length} row(s).`,
      ipAddress: getRequestIpAddress(req),
      userAgent: getRequestUserAgent(req),
      occurredAt: new Date()
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${safeSlug}-shop-orders-${timestamp}.xlsx"`);
    return res.status(200).send(buffer);
  } catch (error) {
    return next(error);
  }
};

function wantsHtml(req) {
  const accept = String(req.get('accept') || '').toLowerCase();
  return accept.includes('text/html') && !accept.includes('application/json');
}

function formatCurrency(value, currency = 'PHP') {
  const amount = Math.max(0, Number(value || 0));
  return `${String(currency || 'PHP').trim().toUpperCase()} ${amount.toLocaleString('en-US', {
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2
  })}`;
}

const STATUS_TONES = {
  positive: ['active', 'published', 'paid', 'completed', 'approved', 'claimed', 'shipped'],
  warning: ['draft', 'pending', 'pending_review', 'preparing', 'correction_required', 'awaiting_payment'],
  negative: ['archived', 'rejected', 'cancelled', 'refunded', 'unpaid', 'proof_rejected', 'closed']
};

function statusTone(status) {
  const value = String(status || '').trim().toLowerCase();
  if (STATUS_TONES.positive.includes(value)) return 'positive';
  if (STATUS_TONES.warning.includes(value)) return 'warning';
  if (STATUS_TONES.negative.includes(value)) return 'negative';
  return 'neutral';
}

function getPageMessage(query) {
  const msg = typeof query.msg === 'string' ? query.msg.trim() : '';
  if (!msg) return null;
  const type = query.type === 'error' ? 'error' : 'success';
  return { type, text: msg.slice(0, 200) };
}

function extractRegistrationIdFromOrderNote(orderNote) {
  const raw = String(orderNote || '').trim();
  const match = raw.match(/^registration:([a-f0-9]{24})$/i);
  return match ? match[1] : null;
}

function getRequestIpAddress(req) {
  const forwardedFor = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const directIp = String(req.ip || '').trim();
  return (forwardedFor || directIp).slice(0, 120);
}

function getRequestUserAgent(req) {
  return String(req.get('user-agent') || '').trim().slice(0, 500);
}

function computeOrderStats(orders) {
  const byPaymentStatus = {};
  const byFulfilmentStatus = {};
  let totalRevenue = 0;
  let paidCount = 0;

  for (const order of orders) {
    const ps = String(order.payment_status || 'unknown');
    const fs = String(order.fulfilment_status || 'unknown');
    byPaymentStatus[ps] = (byPaymentStatus[ps] || 0) + 1;
    byFulfilmentStatus[fs] = (byFulfilmentStatus[fs] || 0) + 1;
    if (ps === 'paid') {
      totalRevenue += Number(order.total_amount || 0);
      paidCount++;
    }
  }

  return {
    totalOrders: orders.length,
    paidOrders: paidCount,
    totalRevenue,
    currency: orders[0]?.currency || 'PHP',
    byPaymentStatus,
    byFulfilmentStatus
  };
}

function getOrderExportData(orders) {
  const headers = ['Order #', 'Buyer Name', 'Buyer Email', 'Total', 'Currency', 'Payment Status', 'Fulfilment Status', 'Delivery Method', 'Date'];
  const rows = orders.map((o) => [
    o.order_number,
    o.buyer_display_name || '',
    o.buyer_email || '',
    Number(o.total_amount || 0).toFixed(2),
    o.currency || 'PHP',
    o.payment_status || '',
    o.fulfilment_status || '',
    o.delivery_method || '',
    o.created_at ? new Date(o.created_at).toISOString().slice(0, 10) : ''
  ]);
  return { headers, rows };
}

function csvEscape(value) {
  const raw = String(value ?? '');
  const escaped = raw.replace(/"/g, '""');
  return `"${escaped}"`;
}
