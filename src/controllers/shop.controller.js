const productService = require('../services/shop/product.service');
const orderService = require('../services/shop/order.service');
const variantService = require('../services/shop/variant.service');
const Event = require('../models/Event');

exports.getEventShop = async (req, res, next) => {
  try {
    const slug = String(req.params.eventSlug || '').trim();
    const event = await Event.findOne({ slug, status: 'published', isDeleted: { $ne: true } })
      .select('_id slug title')
      .lean();

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found.'
      });
    }

    const products = await productService.listProductsByMongoEventId(String(event._id), {
      limit: req.shopPagination?.limit || 100,
      publicOnly: true
    });

    const payload = {
      success: true,
      event: {
        id: String(event._id),
        slug: event.slug,
        title: event.title
      },
      products: products.map(normalizeProductForView),
      count: products.length
    };

    if (wantsHtml(req)) {
      return res.render('pages/event-shop', {
        title: `${event.title} Shop - helloRun`,
        event: payload.event,
        products: payload.products,
        count: payload.count,
        formatCurrency
      });
    }

    return res.json(payload);
  } catch (error) {
    return next(error);
  }
};

exports.getProductDetail = async (req, res, next) => {
  try {
    const product = await productService.getPublicProductByEventSlugAndProductSlug(
      req.params.eventSlug,
      req.params.productSlug
    );

    if (!product) {
      if (wantsHtml(req)) {
        return res.status(404).render('error', {
          title: 'Product Not Found',
          status: 404,
          message: 'This product is not available in the event shop.'
        });
      }
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    const variants = await variantService.listVariantsByProductId(product.id);
    const normalizedProduct = normalizeProductForView(product);
    const normalizedVariants = variants
      .filter((variant) => variant.is_active !== false)
      .map(normalizeVariantForView);

    const payload = {
      success: true,
      event: {
        id: String(product.mongo_event_id || ''),
        slug: product.event_slug,
        title: product.event_title
      },
      product: normalizedProduct,
      variants: normalizedVariants
    };

    if (wantsHtml(req)) {
      return res.render('pages/product-detail', {
        title: `${normalizedProduct.name} - ${payload.event.title} Shop - helloRun`,
        event: payload.event,
        product: payload.product,
        variants: payload.variants,
        formatCurrency
      });
    }

    return res.json(payload);
  } catch (error) {
    return next(error);
  }
};

exports.getCart = async (_req, res) => {
  return res.status(501).render('error', {
    title: 'Shop Not Live Yet',
    status: 501,
    message: 'Cart is scaffolded but not yet live.'
  });
};

exports.addToCart = async (_req, res) => {
  return res.status(501).json({ success: false, message: 'Cart is not live yet.' });
};

exports.updateCartItem = async (_req, res) => {
  return res.status(501).json({ success: false, message: 'Cart is not live yet.' });
};

exports.deleteCartItem = async (_req, res) => {
  return res.status(501).json({ success: false, message: 'Cart is not live yet.' });
};

exports.getCheckout = async (_req, res) => {
  return res.status(501).render('error', {
    title: 'Checkout Not Live Yet',
    status: 501,
    message: 'Checkout is scaffolded but not yet live.'
  });
};

exports.postCheckout = async (_req, res) => {
  return res.status(501).json({ success: false, message: 'Checkout is not live yet.' });
};

exports.getOrders = async (req, res, next) => {
  try {
    const orders = await orderService.listOrdersByMongoUserId(req.session.userId, {
      limit: req.shopPagination?.limit || 100
    });
    return res.json({
      success: true,
      orders,
      count: orders.length
    });
  } catch (error) {
    return next(error);
  }
};

exports.getOrderDetail = async (req, res, next) => {
  try {
    const order = await orderService.getOrderByNumberForMongoUser(req.params.orderNumber, req.session.userId);
    if (!order) {
      if (wantsHtml(req)) {
        return res.status(404).render('error', {
          title: 'Order Not Found',
          status: 404,
          message: 'This shop order was not found.'
        });
      }
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    if (wantsHtml(req)) {
      return res.status(200).send(renderOrderDetailHtml(order));
    }

    return res.json({ success: true, order });
  } catch (error) {
    return next(error);
  }
};

exports.getOrderPaymentPage = async (_req, res) => {
  return res.status(501).render('error', {
    title: 'Payment Not Live Yet',
    status: 501,
    message: 'Order payment proof page is scaffolded but not yet live.'
  });
};

exports.postOrderPaymentProof = async (_req, res) => {
  return res.status(501).json({ success: false, message: 'Order payment proof upload is not live yet.' });
};

exports.cancelOrder = async (_req, res) => {
  return res.status(501).json({ success: false, message: 'Order cancellation is not live yet.' });
};

function wantsHtml(req) {
  const accept = String(req.get('accept') || '').toLowerCase();
  return accept.includes('text/html') && !accept.includes('application/json');
}

function normalizeProductForView(product) {
  const currency = String(product.currency || 'PHP').trim().toUpperCase();
  const basePrice = Math.max(0, Number(product.base_price || 0));

  return {
    id: String(product.id || ''),
    name: String(product.name || '').trim(),
    slug: String(product.slug || '').trim(),
    category: String(product.category || '').trim(),
    productType: String(product.product_type || '').trim() || 'event_shop_item',
    basePrice,
    currency,
    priceLabel: formatCurrency(basePrice, currency),
    status: String(product.status || '').trim(),
    isVisible: product.is_visible !== false,
    showInEventShop: product.show_in_event_shop === true,
    allowPickup: product.allow_pickup !== false,
    allowDelivery: product.allow_delivery === true,
    deliveryFee: Math.max(0, Number(product.delivery_fee || 0)),
    deliveryFeeLabel: formatCurrency(Math.max(0, Number(product.delivery_fee || 0)), currency)
  };
}

function normalizeVariantForView(variant) {
  const priceOverride = variant.price_override === null || variant.price_override === undefined
    ? null
    : Math.max(0, Number(variant.price_override || 0));
  const stockQuantity = Math.max(0, Number(variant.stock_quantity || 0));
  const reservedQuantity = Math.max(0, Number(variant.reserved_quantity || 0));
  const soldQuantity = Math.max(0, Number(variant.sold_quantity || 0));
  const availableQuantity = Math.max(0, stockQuantity - reservedQuantity - soldQuantity);

  return {
    id: String(variant.id || ''),
    name: String(variant.variant_name || variant.size || variant.colour || 'Default').trim(),
    sku: String(variant.sku || '').trim(),
    size: String(variant.size || '').trim(),
    colour: String(variant.colour || '').trim(),
    priceOverride,
    stockQuantity,
    reservedQuantity,
    soldQuantity,
    availableQuantity,
    isActive: variant.is_active !== false
  };
}

function formatCurrency(value, currency = 'PHP') {
  const amount = Math.max(0, Number(value || 0));
  return `${String(currency || 'PHP').trim().toUpperCase()} ${amount.toLocaleString('en-US', {
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2
  })}`;
}

function renderOrderDetailHtml(order) {
  const amount = formatCurrency(order.total_amount, order.currency);
  const items = Array.isArray(order.items) ? order.items : [];
  const itemRows = items.map((item) => `<li>${escapeHtml(item.name_snapshot)} x ${escapeHtml(String(item.quantity))}</li>`).join('');

  return `<!doctype html>
<html><head><meta charset="utf-8"><title>${escapeHtml(order.order_number)} - helloRun</title></head>
<body>
  <main>
    <h1>${escapeHtml(order.order_number)}</h1>
    <p>${escapeHtml(amount)}</p>
    <p>Payment: ${escapeHtml(order.payment_status)}</p>
    <p>Fulfilment: ${escapeHtml(order.fulfilment_status)}</p>
    <ul>${itemRows}</ul>
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
