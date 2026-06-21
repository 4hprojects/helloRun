const productService = require('../services/shop/product.service');
const variantService = require('../services/shop/variant.service');
const orderService = require('../services/shop/order.service');
const paymentReviewService = require('../services/shop/payment-review.service');
const { getPostgresClient } = require('../db/postgres');

exports.getShopDashboard = async (req, res, next) => {
  try {
    const [products, approvals, orders, payments] = await Promise.all([
      productService.listProductsForAdmin({ limit: 100 }),
      productService.listPendingProductApprovals({ limit: 100 }),
      orderService.listOrdersForAdmin({ limit: 100 }),
      paymentReviewService.listPaymentsForAdmin({ limit: 100 })
    ]);

    const summary = {
      productCount: products.length,
      pendingProductApprovalCount: approvals.length,
      orderCount: orders.length,
      paymentCount: payments.length
    };

    if (wantsHtml(req)) {
      return res.render('admin/shop-dashboard', {
        title: 'Admin Shop - HelloRun',
        summary,
        approvals: approvals.slice(0, 10),
        orders: orders.slice(0, 10),
        payments: payments.slice(0, 10),
        formatCurrency,
        statusTone
      });
    }

    return res.json({ success: true, summary, csrfToken: res.locals.csrfToken || '' });
  } catch (error) {
    return next(error);
  }
};

exports.getProducts = async (req, res, next) => {
  try {
    const products = await productService.listProductsForAdmin({ limit: req.shopPagination?.limit || 100 });
    return res.json({ success: true, products, count: products.length });
  } catch (error) {
    return next(error);
  }
};

exports.getProductApprovals = async (req, res, next) => {
  try {
    const products = await productService.listPendingProductApprovals({ limit: req.shopPagination?.limit || 100 });
    return res.json({ success: true, products, count: products.length });
  } catch (error) {
    return next(error);
  }
};

exports.patchProductApproval = async (req, res, next) => {
  try {
    const status = String(req.body.status || req.body.decision || '').trim();
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Approval status must be approved or rejected.' });
    }

    const actorAppUserId = await getAppUserIdForMongoUser(req.session.userId);
    const product = await productService.updateProductApproval(req.params.productId, status, actorAppUserId);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });
    return res.json({ success: true, product });
  } catch (error) {
    return next(error);
  }
};

exports.getNewPlatformProduct = async (req, res, next) => {
  try {
    return res.render('admin/shop-product-form', {
      title: 'New HelloRun Product',
      product: null,
      message: getPageMessage(req.query)
    });
  } catch (error) {
    return next(error);
  }
};

exports.postPlatformProduct = async (req, res, next) => {
  try {
    const actorAppUserId = await getAppUserIdForMongoUser(req.session.userId);
    const product = await productService.createPlatformProduct(req.body, actorAppUserId);
    if (!product) {
      if (wantsHtml(req)) {
        return res.redirect(`/admin/shop/products/new?type=error&msg=${encodeURIComponent('Unable to create product.')}`);
      }
      return res.status(400).json({ success: false, message: 'Unable to create product.' });
    }

    if (wantsHtml(req)) {
      return res.redirect(`/admin/shop/products/${product.id}/edit?type=success&msg=${encodeURIComponent('Product created.')}`);
    }
    return res.status(201).json({ success: true, product });
  } catch (error) {
    return next(error);
  }
};

exports.getEditPlatformProduct = async (req, res, next) => {
  try {
    const product = await productService.getProductById(req.params.productId);
    if (!product || product.owner_type !== 'hellorun') {
      return res.status(404).render('error', { title: 'Product Not Found', status: 404, message: 'Product not found.' });
    }
    return res.render('admin/shop-product-form', {
      title: `Edit Product - ${product.name}`,
      product,
      message: getPageMessage(req.query)
    });
  } catch (error) {
    return next(error);
  }
};

exports.patchPlatformProduct = async (req, res, next) => {
  try {
    const actorAppUserId = await getAppUserIdForMongoUser(req.session.userId);
    const product = await productService.updateProduct(req.params.productId, req.body, actorAppUserId);
    if (!product) {
      if (wantsHtml(req)) {
        return res.redirect(`/admin/shop/products/${req.params.productId}/edit?type=error&msg=${encodeURIComponent('Product not found.')}`);
      }
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    if (wantsHtml(req)) {
      return res.redirect(`/admin/shop/products/${product.id}/edit?type=success&msg=${encodeURIComponent('Product updated.')}`);
    }
    return res.json({ success: true, product });
  } catch (error) {
    return next(error);
  }
};

exports.archivePlatformProduct = async (req, res, next) => {
  try {
    const actorAppUserId = await getAppUserIdForMongoUser(req.session.userId);
    const product = await productService.archiveProduct(req.params.productId, actorAppUserId);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });
    return res.json({ success: true, product });
  } catch (error) {
    return next(error);
  }
};

exports.hidePlatformProduct = async (req, res, next) => {
  try {
    const actorAppUserId = await getAppUserIdForMongoUser(req.session.userId);
    const product = await productService.hideProduct(req.params.productId, actorAppUserId);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });
    return res.json({ success: true, product });
  } catch (error) {
    return next(error);
  }
};

exports.getPlatformProductVariants = async (req, res, next) => {
  try {
    const variants = await variantService.listVariantsByProductId(req.params.productId);
    return res.json({ success: true, variants, count: variants.length });
  } catch (error) {
    return next(error);
  }
};

exports.postPlatformProductVariant = async (req, res, next) => {
  try {
    const variant = await variantService.createVariant(req.params.productId, req.body);
    return res.status(201).json({ success: true, variant });
  } catch (error) {
    return next(error);
  }
};

exports.patchPlatformProductVariant = async (req, res, next) => {
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

exports.deletePlatformProductVariant = async (req, res, next) => {
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
    const orders = await orderService.listOrdersForAdmin({ limit: req.shopPagination?.limit || 100 });
    return res.json({ success: true, orders, count: orders.length });
  } catch (error) {
    return next(error);
  }
};

exports.getPlatformOrders = async (req, res, next) => {
  try {
    const orders = await orderService.listPlatformOrders({ limit: req.shopPagination?.limit || 100 });

    if (wantsHtml(req)) {
      return res.render('admin/shop-platform-orders', {
        title: 'Platform Orders - Admin Shop - HelloRun',
        orders,
        formatCurrency,
        statusTone,
        message: getPageMessage(req.query)
      });
    }

    return res.json({ success: true, orders, count: orders.length });
  } catch (error) {
    return next(error);
  }
};

exports.getPlatformOrderDetail = async (req, res, next) => {
  try {
    const order = await orderService.getPlatformOrderById(req.params.orderId);
    if (!order) {
      if (wantsHtml(req)) {
        return res.status(404).render('error', { title: 'Order Not Found', status: 404, message: 'Platform order not found.' });
      }
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    if (wantsHtml(req)) {
      return res.render('admin/shop-platform-order-detail', {
        title: `${order.order_number} · Platform Order`,
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

exports.patchPlatformOrderFulfilment = async (req, res, next) => {
  try {
    const existing = await orderService.getPlatformOrderById(req.params.orderId);
    if (!existing) return res.status(404).json({ success: false, message: 'Order not found.' });

    const actorAppUserId = await getAppUserIdForMongoUser(req.session.userId);
    const order = await orderService.updateFulfilment(req.params.orderId, req.body, actorAppUserId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
    return res.json({ success: true, order });
  } catch (error) {
    return next(error);
  }
};

exports.getPayments = async (req, res, next) => {
  try {
    const payments = await paymentReviewService.listPaymentsForAdmin({ limit: req.shopPagination?.limit || 100 });
    return res.json({ success: true, payments, count: payments.length });
  } catch (error) {
    return next(error);
  }
};

exports.getPlatformPaymentReviews = async (req, res, next) => {
  try {
    const items = await paymentReviewService.listPendingPlatformPaymentReviews({ limit: req.shopPagination?.limit || 100 });

    if (wantsHtml(req)) {
      return res.render('admin/shop-platform-payment-reviews', {
        title: 'Platform Payment Reviews - Admin Shop - HelloRun',
        items,
        formatCurrency,
        statusTone,
        message: getPageMessage(req.query)
      });
    }

    return res.json({ success: true, items, count: items.length });
  } catch (error) {
    return next(error);
  }
};

exports.patchPlatformPaymentReview = async (req, res, next) => {
  try {
    const payment = await paymentReviewService.getPlatformPaymentReviewById(req.params.paymentId);
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
      return res.status(400).json({ success: false, message: 'Rejection reason must be at least 5 characters.' });
    }

    const reviewedBy = await getAppUserIdForMongoUser(req.session.userId);
    const updatedPayment = await paymentReviewService.updatePaymentReviewDecision(payment.id, {
      status: nextStatus,
      reviewedBy,
      reviewNote,
      rejectionReason
    });

    const nextOrderPaymentStatus = nextStatus === 'paid' ? 'paid' : 'proof_rejected';
    await paymentReviewService.updateOrderPaymentStatus(payment.order_id, nextOrderPaymentStatus);

    return res.json({ success: true, payment: updatedPayment });
  } catch (error) {
    return next(error);
  }
};
exports.getReports = async (_req, res, next) => {
  try {
    const orders = await orderService.listOrdersForAdmin({ limit: 1000 });

    const byPaymentStatus = {};
    const byFulfilmentStatus = {};
    const byEvent = {};
    let totalRevenue = 0;
    let paidCount = 0;

    for (const order of orders) {
      const ps = String(order.payment_status || 'unknown');
      const fs = String(order.fulfilment_status || 'unknown');
      byPaymentStatus[ps] = (byPaymentStatus[ps] || 0) + 1;
      byFulfilmentStatus[fs] = (byFulfilmentStatus[fs] || 0) + 1;

      const eventLabel = order.event_title || 'Platform (HelloRun)';
      if (!byEvent[eventLabel]) byEvent[eventLabel] = { count: 0, revenue: 0 };
      byEvent[eventLabel].count++;

      if (ps === 'paid') {
        totalRevenue += Number(order.total_amount || 0);
        paidCount++;
        byEvent[eventLabel].revenue += Number(order.total_amount || 0);
      }
    }

    const topEvents = Object.entries(byEvent)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 20)
      .map(([name, data]) => ({ name, ...data }));

    const stats = {
      totalOrders: orders.length,
      paidOrders: paidCount,
      totalRevenue,
      currency: orders[0]?.currency || 'PHP',
      byPaymentStatus,
      byFulfilmentStatus
    };

    return res.render('admin/shop-reports', {
      title: 'Admin Shop Reports',
      stats,
      topEvents,
      formatCurrency,
      statusTone
    });
  } catch (error) {
    return next(error);
  }
};

exports.getSettings = async (req, res, next) => {
  try {
    const rows = await getPostgresClient()`
      select payment_methods, fulfilment_defaults, shop_enabled, updated_at
      from shop_platform_config
      where id = 'platform'
      limit 1
    `;
    const config = rows[0] || {
      payment_methods: ['gcash', 'bank_transfer'],
      fulfilment_defaults: {},
      shop_enabled: true
    };

    return res.render('admin/shop-settings', {
      title: 'Admin Shop Settings',
      config,
      pageMessage: getPageMessage(req.query)
    });
  } catch (error) {
    return next(error);
  }
};

exports.patchSettings = async (req, res, next) => {
  try {
    const shopEnabled = req.body.shop_enabled === '1' || req.body.shop_enabled === true;

    const rawMethods = String(req.body.payment_methods || '').trim();
    const paymentMethods = rawMethods
      .split(',')
      .map((m) => m.trim().toLowerCase())
      .filter((m) => m.length > 0);

    if (paymentMethods.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one payment method is required.' });
    }

    let fulfilmentDefaults = {};
    const rawDefaults = String(req.body.fulfilment_defaults || '').trim();
    if (rawDefaults) {
      try {
        fulfilmentDefaults = JSON.parse(rawDefaults);
      } catch {
        return res.status(400).json({ success: false, message: 'Fulfilment defaults must be valid JSON.' });
      }
    }

    await getPostgresClient()`
      update shop_platform_config
      set payment_methods      = ${paymentMethods},
          fulfilment_defaults  = ${JSON.stringify(fulfilmentDefaults)},
          shop_enabled         = ${shopEnabled},
          updated_at           = now()
      where id = 'platform'
    `;

    return res.json({ success: true, message: 'Settings saved.' });
  } catch (error) {
    return next(error);
  }
};

function notLive(res, message) {
  return res.status(501).render('error', {
    title: 'Admin Shop Not Live Yet',
    status: 501,
    message
  });
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

function getPageMessage(query) {
  const msg = typeof query.msg === 'string' ? query.msg.trim() : '';
  if (!msg) return null;
  const type = query.type === 'error' ? 'error' : 'success';
  return { type, text: msg.slice(0, 200) };
}

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
