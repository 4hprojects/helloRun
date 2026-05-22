const productService = require('../services/shop/product.service');
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

    const payload = {
      success: true,
      summary: {
        productCount: products.length,
        pendingProductApprovalCount: approvals.length,
        orderCount: orders.length,
        paymentCount: payments.length
      },
      csrfToken: res.locals.csrfToken || ''
    };

    if (wantsHtml(req)) return res.status(200).send(renderAdminDashboardHtml(payload));
    return res.json(payload);
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

exports.getOrders = async (req, res, next) => {
  try {
    const orders = await orderService.listOrdersForAdmin({ limit: req.shopPagination?.limit || 100 });
    return res.json({ success: true, orders, count: orders.length });
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
exports.getReports = async (_req, res) => notLive(res, 'Admin reports are scaffolded but not yet live.');
exports.getSettings = async (_req, res) => notLive(res, 'Admin shop settings are scaffolded but not yet live.');
exports.patchSettings = async (_req, res) => res.status(501).json({ success: false, message: 'Admin shop settings update is not live yet.' });

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

function wantsHtml(req) {
  const accept = String(req.get('accept') || '').toLowerCase();
  return accept.includes('text/html') && !accept.includes('application/json');
}

function renderAdminDashboardHtml(payload) {
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>Admin Shop</title></head>
<body>
  <main>
    <h1>Admin Shop</h1>
    <input type="hidden" name="_csrf" value="${escapeHtml(payload.csrfToken)}">
    <p>Products: ${payload.summary.productCount}</p>
    <p>Pending approvals: ${payload.summary.pendingProductApprovalCount}</p>
    <p>Orders: ${payload.summary.orderCount}</p>
    <p>Payments: ${payload.summary.paymentCount}</p>
  </main>
</body></html>`;
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
