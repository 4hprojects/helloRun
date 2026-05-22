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
    const [products, orders, paymentReviews] = await Promise.all([
      productService.listProductsByMongoEventId(req.params.eventId, { limit: 100 }),
      orderService.listOrdersByMongoEventId(req.params.eventId, { limit: 100 }),
      paymentReviewService.listPendingPaymentReviewsByMongoEventId(req.params.eventId, { limit: 100 })
    ]);

    const payload = {
      success: true,
      summary: {
        productCount: products.length,
        orderCount: orders.length,
        pendingPaymentReviewCount: paymentReviews.length
      },
      csrfToken: res.locals.csrfToken || '',
      products,
      orders,
      paymentReviews
    };

    if (wantsHtml(req)) {
      return res.status(200).send(renderManagementHtml('Organizer Shop', payload));
    }

    return res.json(payload);
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

exports.getNewProduct = async (req, res) => res.status(200).send(renderProductFormHtml('New Product', req.params.eventId));

exports.postProduct = async (req, res, next) => {
  try {
    const product = await productService.createProductForMongoEvent(
      req.params.eventId,
      req.body,
      req.shopActorAppUserId
    );
    if (!product) return res.status(404).json({ success: false, message: 'Event shop record not found.' });
    return res.status(201).json({ success: true, product });
  } catch (error) {
    return next(error);
  }
};

exports.getEditProduct = async (req, res, next) => {
  try {
    const product = await productService.getProductById(req.params.productId);
    if (!product) return res.status(404).render('error', { title: 'Product Not Found', status: 404, message: 'Product not found.' });
    return res.status(200).send(renderProductFormHtml('Edit Product', req.params.eventId, product));
  } catch (error) {
    return next(error);
  }
};

exports.patchProduct = async (req, res, next) => {
  try {
    const product = await productService.updateProduct(req.params.productId, req.body, req.shopActorAppUserId);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });
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
    if (wantsHtml(req)) return res.status(200).send(renderOrderHtml(order));
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

exports.getReports = async (_req, res) => notLive(res, 'Organizer shop reports are scaffolded but not yet live.');
exports.exportReportCsv = async (_req, res) => res.status(501).json({ success: false, message: 'CSV export is not live yet.' });
exports.exportReportXlsx = async (_req, res) => res.status(501).json({ success: false, message: 'XLSX export is not live yet.' });

function wantsHtml(req) {
  const accept = String(req.get('accept') || '').toLowerCase();
  return accept.includes('text/html') && !accept.includes('application/json');
}

function renderManagementHtml(title, payload) {
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head>
<body>
  <main>
    <h1>${escapeHtml(title)}</h1>
    <input type="hidden" name="_csrf" value="${escapeHtml(String(payload.csrfToken || ''))}">
    <p>Products: ${payload.summary.productCount}</p>
    <p>Orders: ${payload.summary.orderCount}</p>
    <p>Pending payment reviews: ${payload.summary.pendingPaymentReviewCount}</p>
  </main>
</body></html>`;
}

function renderProductFormHtml(title, eventId, product = {}) {
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head>
<body>
  <main>
    <h1>${escapeHtml(title)}</h1>
    <form method="post" action="/organizer/events/${escapeHtml(String(eventId))}/shop/products">
      <input type="hidden" name="_csrf" value="">
      <input name="name" value="${escapeHtml(product.name || '')}">
      <input name="slug" value="${escapeHtml(product.slug || '')}">
      <input name="basePrice" value="${escapeHtml(String(product.base_price || '0'))}">
    </form>
  </main>
</body></html>`;
}

function renderOrderHtml(order) {
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>${escapeHtml(order.order_number)}</title></head>
<body><main>
  <h1>${escapeHtml(order.order_number)}</h1>
  <p>Payment: ${escapeHtml(order.payment_status)}</p>
  <p>Fulfilment: ${escapeHtml(order.fulfilment_status)}</p>
</main></body></html>`;
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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
