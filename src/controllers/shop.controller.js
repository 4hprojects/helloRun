const mongoose = require('mongoose');
const productService = require('../services/shop/product.service');
const orderService = require('../services/shop/order.service');
const variantService = require('../services/shop/variant.service');
const paymentReviewService = require('../services/shop/payment-review.service');
const uploadService = require('../services/upload.service');
const Event = require('../models/Event');
const { getPublicEventVisibilityQuery } = require('../utils/public-event-visibility');

exports.getEventShop = async (req, res, next) => {
  try {
    const slug = String(req.params.eventSlug || '').trim();
    const event = await Event.findOne({ slug, ...getPublicEventVisibilityQuery(new Date()) })
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
        title: `${event.title} Shop - HelloRun`,
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

exports.getGlobalShop = async (req, res, next) => {
  try {
    // Visibility (status/isDeleted/publicListingAvailableAt) lives only on the Mongo Event
    // model, not in events_core, so resolve visible events here first, then scope the
    // cross-event Postgres product query to their ids. If event volume grows large enough
    // for this cap to matter, mirror visibility flags into events_core and do this in SQL.
    const events = await Event.find(getPublicEventVisibilityQuery(new Date()))
      .select('_id slug title')
      .limit(500)
      .lean();

    const mongoEventIds = events.map((event) => String(event._id));
    const search = String(req.query.q || '').trim().slice(0, 120);
    const eventSlug = String(req.query.event || '').trim();
    const { page, limit } = req.shopPagination || { page: 1, limit: 20 };

    const { rows, totalCount } = await productService.listPublicProductsAcrossEvents({ mongoEventIds, search, eventSlug, page, limit });

    const totalPages = Math.max(1, Math.ceil(totalCount / limit));
    const currentPage = Math.min(page, totalPages);
    const products = rows.map(normalizeGlobalProductForView);
    const filters = { q: search, event: eventSlug };
    const filteredEvent = eventSlug ? events.find((event) => event.slug === eventSlug) || null : null;

    if (wantsHtml(req)) {
      return res.render('pages/shop', {
        title: 'Shop - HelloRun',
        products,
        count: products.length,
        totalCount,
        filters,
        filteredEvent: filteredEvent ? { slug: filteredEvent.slug, title: filteredEvent.title } : null,
        pagination: {
          currentPage,
          totalPages,
          getPageUrl: (pageNumber) => buildGlobalShopPageUrl(filters, pageNumber)
        },
        formatCurrency,
        message: getPageMessage(req.query)
      });
    }

    return res.json({
      success: true,
      products,
      count: products.length,
      totalCount,
      pagination: { currentPage, totalPages }
    });
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

    const event = await Event.findOne({
      slug: String(req.params.eventSlug || '').trim(),
      ...getPublicEventVisibilityQuery(new Date())
    }).select('_id').lean();
    if (!event) {
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
        title: `${normalizedProduct.name} - ${payload.event.title} Shop - HelloRun`,
        event: payload.event,
        product: payload.product,
        variants: payload.variants,
        formatCurrency,
        canAddToCart: Boolean(req.session && req.session.userId && req.session.role === 'runner'),
        message: getPageMessage(req.query)
      });
    }

    return res.json(payload);
  } catch (error) {
    return next(error);
  }
};

exports.getPlatformProductDetail = async (req, res, next) => {
  try {
    const product = await productService.getPublicPlatformProductBySlug(req.params.productSlug);

    if (!product) {
      if (wantsHtml(req)) {
        return res.status(404).render('error', {
          title: 'Product Not Found',
          status: 404,
          message: 'This product is not available in the HelloRun shop.'
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
      event: null,
      product: normalizedProduct,
      variants: normalizedVariants
    };

    if (wantsHtml(req)) {
      return res.render('pages/product-detail', {
        title: `${normalizedProduct.name} - HelloRun Shop`,
        event: null,
        product: payload.product,
        variants: payload.variants,
        formatCurrency,
        canAddToCart: Boolean(req.session && req.session.userId && req.session.role === 'runner'),
        message: getPageMessage(req.query)
      });
    }

    return res.json(payload);
  } catch (error) {
    return next(error);
  }
};

exports.getCart = async (req, res, next) => {
  try {
    const cart = getCartFromSession(req);
    const lines = await loadCartLines(cart);
    req.session.shopCart = cart;
    const summary = summarizeCartLines(lines);

    if (wantsHtml(req)) {
      return res.render('pages/shop-cart', {
        title: 'Your Cart - HelloRun',
        lines,
        summary,
        eventSlug: lines.length ? lines[0].eventSlug : null,
        message: getPageMessage(req.query)
      });
    }

    return res.json({ success: true, items: lines, summary });
  } catch (error) {
    return next(error);
  }
};

exports.addToCart = async (req, res, next) => {
  try {
    const cart = getCartFromSession(req);
    const productId = String(req.body.productId || req.body.product_id || '').trim();
    const variantId = String(req.body.variantId || req.body.variant_id || '').trim();
    const requestedQuantity = clampQuantity(req.body.quantity || 1) || 1;

    const product = await productService.getProductWithEventById(productId);
    if (!product || product.status !== 'active' || product.is_visible === false || product.show_in_event_shop !== true) {
      return res.status(404).json({ success: false, message: 'This product is not available in the event shop.' });
    }

    const cartBucketKey = getCartBucketKeyForProduct(product);

    const activeVariants = (await variantService.listVariantsByProductId(product.id))
      .filter((candidate) => candidate.is_active !== false);

    let variant = null;
    let availableQuantity = null;
    if (activeVariants.length) {
      if (!variantId) {
        return res.status(400).json({ success: false, message: 'Please select a variant before adding this product to your cart.' });
      }
      variant = activeVariants.find((candidate) => String(candidate.id) === variantId) || null;
      if (!variant) {
        return res.status(400).json({ success: false, message: 'The selected variant is not available for this product.' });
      }
      const stockQuantity = Math.max(0, Number(variant.stock_quantity || 0));
      const reservedQuantity = Math.max(0, Number(variant.reserved_quantity || 0));
      const soldQuantity = Math.max(0, Number(variant.sold_quantity || 0));
      availableQuantity = Math.max(0, stockQuantity - reservedQuantity - soldQuantity);
      if (availableQuantity <= 0) {
        return res.status(409).json({ success: false, message: 'This variant is currently out of stock.' });
      }
    }

    if (cart.items.length && cart.mongoEventId && cart.mongoEventId !== cartBucketKey) {
      return res.status(409).json({
        success: false,
        message: 'Your cart contains items from a different event. Please clear your cart before adding items from another event.'
      });
    }

    const existing = cart.items.find((item) => item.productId === String(product.id)
      && (item.variantId || null) === (variant ? String(variant.id) : null));

    let nextQuantity = (existing ? existing.quantity : 0) + requestedQuantity;
    if (availableQuantity !== null) nextQuantity = Math.min(nextQuantity, availableQuantity);
    nextQuantity = clampQuantity(nextQuantity);

    if (existing) {
      existing.quantity = nextQuantity;
    } else {
      cart.items.push({
        itemId: new mongoose.Types.ObjectId().toString(),
        productId: String(product.id),
        variantId: variant ? String(variant.id) : null,
        quantity: nextQuantity
      });
    }
    cart.mongoEventId = cartBucketKey;
    req.session.shopCart = cart;
    await new Promise((resolve) => req.session.save(() => resolve()));

    return res.json({ success: true, message: 'Added to cart.' });
  } catch (error) {
    return next(error);
  }
};

exports.updateCartItem = async (req, res, next) => {
  try {
    const cart = getCartFromSession(req);
    const itemId = String(req.params.itemId || '').trim();
    const item = cart.items.find((entry) => entry.itemId === itemId);
    if (!item) return res.status(404).json({ success: false, message: 'Cart item not found.' });

    const quantity = clampQuantity(req.body.quantity);
    if (quantity === null) {
      return res.status(400).json({ success: false, message: 'Quantity must be a number from 1 to 99.' });
    }

    item.quantity = quantity;
    req.session.shopCart = cart;
    return res.json({ success: true, message: 'Cart updated.' });
  } catch (error) {
    return next(error);
  }
};

exports.deleteCartItem = async (req, res, next) => {
  try {
    const cart = getCartFromSession(req);
    const itemId = String(req.params.itemId || '').trim();
    const nextItems = cart.items.filter((entry) => entry.itemId !== itemId);
    if (nextItems.length === cart.items.length) {
      return res.status(404).json({ success: false, message: 'Cart item not found.' });
    }

    cart.items = nextItems;
    if (!cart.items.length) cart.mongoEventId = null;
    req.session.shopCart = cart;
    return res.json({ success: true, message: 'Item removed from cart.' });
  } catch (error) {
    return next(error);
  }
};

exports.getCheckout = async (req, res, next) => {
  try {
    const cart = getCartFromSession(req);
    const lines = await loadCartLines(cart);
    req.session.shopCart = cart;

    if (!lines.length) {
      return res.redirect(`/shop/cart?type=error&msg=${encodeURIComponent('Your cart is empty. Add an item before checking out.')}`);
    }

    const summary = summarizeCartLines(lines);
    const buyer = await orderService.resolveBuyerForMongoUser(req.session.userId);

    return res.render('pages/shop-checkout', {
      title: 'Checkout - HelloRun',
      lines,
      summary,
      buyer,
      formatCurrency,
      message: getPageMessage(req.query)
    });
  } catch (error) {
    return next(error);
  }
};

exports.postCheckout = async (req, res, next) => {
  try {
    const cart = getCartFromSession(req);
    const lines = await loadCartLines(cart);
    req.session.shopCart = cart;

    if (!lines.length) {
      return res.status(409).json({ success: false, message: 'Your cart is empty.' });
    }

    const summary = summarizeCartLines(lines);
    const deliveryMethod = String(req.body.deliveryMethod || req.body.delivery_method || '').trim();
    const deliveryAddress = String(req.body.deliveryAddress || req.body.delivery_address || '').trim();
    const customerNote = String(req.body.customerNote || req.body.customer_note || '').trim();

    if (!['pickup', 'delivery'].includes(deliveryMethod)) {
      return res.status(400).json({ success: false, message: 'Please select a delivery method.' });
    }
    if (deliveryMethod === 'pickup' && !summary.allowPickup) {
      return res.status(409).json({ success: false, message: 'Pickup is not available for the items in your cart.' });
    }
    if (deliveryMethod === 'delivery') {
      if (!summary.allowDelivery) {
        return res.status(409).json({ success: false, message: 'Delivery is not available for the items in your cart.' });
      }
      if (!deliveryAddress) {
        return res.status(400).json({ success: false, message: 'Please provide a delivery address.' });
      }
    }

    const buyer = await orderService.resolveBuyerForMongoUser(req.session.userId);
    if (!buyer) {
      return res.status(403).json({ success: false, message: 'We could not verify your account. Please sign in again.' });
    }

    const order = await orderService.createOrderFromCart({
      buyerAppUserId: buyer.id,
      mongoEventId: cart.mongoEventId,
      lines,
      summary,
      deliveryMethod,
      deliveryAddress,
      customerNote
    });

    if (!order) {
      return res.status(500).json({ success: false, message: 'Unable to place your order. Please try again.' });
    }

    req.session.shopCart = { mongoEventId: null, items: [] };

    return res.json({
      success: true,
      message: 'Order placed.',
      orderNumber: order.order_number,
      redirectTo: `/orders/${order.order_number}`
    });
  } catch (error) {
    return next(error);
  }
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
      return res.render('pages/order-detail', {
        title: `${order.order_number} - Order - HelloRun`,
        order,
        formatCurrency,
        statusTone,
        canSubmitPaymentProof: canSubmitPaymentProof(order),
        canCancelOrder: canCancelOrder(order),
        message: getPageMessage(req.query)
      });
    }

    return res.json({ success: true, order });
  } catch (error) {
    return next(error);
  }
};

exports.getOrderPaymentPage = async (req, res, next) => {
  try {
    const order = await orderService.getOrderByNumberForMongoUser(req.params.orderNumber, req.session.userId);
    if (!order) {
      return res.status(404).render('error', {
        title: 'Order Not Found',
        status: 404,
        message: 'This shop order was not found.'
      });
    }

    return res.render('pages/order-payment', {
      title: `Payment - ${order.order_number} - HelloRun`,
      order,
      formatCurrency,
      statusTone,
      canSubmitPaymentProof: canSubmitPaymentProof(order),
      message: getPageMessage(req.query)
    });
  } catch (error) {
    return next(error);
  }
};

exports.postOrderPaymentProof = async (req, res, next) => {
  let uploadedProofKey = '';
  try {
    const order = await orderService.getOrderByNumberForMongoUser(req.params.orderNumber, req.session.userId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    if (!canSubmitPaymentProof(order)) {
      return res.status(409).json({ success: false, message: 'Payment proof upload is not available for this order.' });
    }

    if (req.uploadError) {
      return res.status(400).json({ success: false, message: req.uploadError });
    }

    const proofFile = req.file;
    if (!proofFile) {
      return res.status(400).json({ success: false, message: 'Please select a payment receipt file before submitting.' });
    }

    const uploadedProof = await uploadService.uploadPaymentProofToR2({
      userId: req.session.userId,
      paymentProofFile: proofFile
    });
    uploadedProofKey = uploadedProof.key;

    const paymentMethod = String(req.body.paymentMethod || req.body.payment_method || '').trim();
    const paymentReference = String(req.body.paymentReference || req.body.payment_reference || '').trim();

    await paymentReviewService.submitPaymentProofForOrder(order.id, {
      paymentMethod: paymentMethod || 'manual_receipt',
      paymentReference,
      proofUrl: uploadedProof.url,
      amountPaid: order.total_amount
    });

    uploadedProofKey = '';

    return res.json({ success: true, message: 'Payment proof submitted for review.' });
  } catch (error) {
    if (uploadedProofKey) {
      await uploadService.deleteObjects([uploadedProofKey]);
    }
    return next(error);
  }
};

exports.cancelOrder = async (req, res, next) => {
  try {
    const order = await orderService.getOrderByNumberForMongoUser(req.params.orderNumber, req.session.userId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    if (!canCancelOrder(order)) {
      return res.status(409).json({ success: false, message: 'This order can no longer be cancelled.' });
    }

    const updated = await orderService.updateFulfilment(order.id, {
      fulfilmentStatus: 'cancelled',
      note: 'Cancelled by runner.'
    }, order.buyer_user_id);

    if (!updated) {
      return res.status(500).json({ success: false, message: 'Unable to cancel order.' });
    }

    return res.json({ success: true, order: updated });
  } catch (error) {
    return next(error);
  }
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

function normalizeGlobalProductForView(product) {
  const base = normalizeProductForView(product);
  const eventSlug = String(product.event_slug || '').trim();

  if (!eventSlug) {
    return {
      ...base,
      eventSlug: null,
      eventTitle: null,
      detailUrl: `/shop/${base.slug}`
    };
  }

  return {
    ...base,
    eventSlug,
    eventTitle: String(product.event_title || '').trim(),
    detailUrl: `/events/${eventSlug}/shop/${base.slug}`
  };
}

function buildGlobalShopPageUrl(filters, pageNumber) {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.event) params.set('event', filters.event);
  if (pageNumber > 1) params.set('page', String(pageNumber));
  const query = params.toString();
  return query ? `/shop?${query}` : '/shop';
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

const SUBMITTABLE_PAYMENT_STATUSES = new Set(['unpaid', 'awaiting_payment', 'proof_rejected']);
const CANCELLABLE_PAYMENT_STATUSES = new Set(['unpaid', 'awaiting_payment', 'pending_review', 'proof_submitted', 'proof_rejected']);

function canSubmitPaymentProof(order) {
  return SUBMITTABLE_PAYMENT_STATUSES.has(String(order?.payment_status || '').trim());
}

function canCancelOrder(order) {
  return String(order?.fulfilment_status || '').trim() === 'not_started'
    && CANCELLABLE_PAYMENT_STATUSES.has(String(order?.payment_status || '').trim());
}

function getPageMessage(query) {
  const msg = typeof query.msg === 'string' ? query.msg.trim() : '';
  if (!msg) return null;
  const type = query.type === 'error' ? 'error' : 'success';
  return { type, text: msg.slice(0, 200) };
}

const CART_QUANTITY_MIN = 1;
const CART_QUANTITY_MAX = 99;

function getCartFromSession(req) {
  const cart = req.session.shopCart;
  if (!cart || !Array.isArray(cart.items)) {
    req.session.shopCart = { mongoEventId: null, items: [] };
  }
  return req.session.shopCart;
}

function getCartBucketKeyForProduct(product) {
  if (!product.event_id) return 'platform';
  return product.mongo_event_id;
}

function clampQuantity(value) {
  const quantity = Math.trunc(Number(value));
  if (!Number.isFinite(quantity)) return null;
  return Math.min(CART_QUANTITY_MAX, Math.max(CART_QUANTITY_MIN, quantity));
}

function variantAvailableQuantity(variant) {
  const stockQuantity = Math.max(0, Number(variant.stock_quantity || 0));
  const reservedQuantity = Math.max(0, Number(variant.reserved_quantity || 0));
  const soldQuantity = Math.max(0, Number(variant.sold_quantity || 0));
  return Math.max(0, stockQuantity - reservedQuantity - soldQuantity);
}

async function loadCartLines(cart) {
  const lines = [];
  const keptItems = [];

  for (const item of cart.items) {
    const product = await productService.getProductWithEventById(item.productId);
    if (!product || product.status !== 'active' || product.is_visible === false || product.show_in_event_shop !== true) {
      continue;
    }

    let variant = null;
    if (item.variantId) {
      const candidate = await variantService.getVariantById(item.variantId);
      if (!candidate || String(candidate.product_id) !== String(product.id) || candidate.is_active === false) {
        continue;
      }
      variant = candidate;
    }

    let quantity = clampQuantity(item.quantity);
    if (quantity === null) continue;

    if (variant) {
      const availableQuantity = variantAvailableQuantity(variant);
      if (availableQuantity <= 0) continue;
      quantity = Math.min(quantity, availableQuantity);
    }

    const currency = String(product.currency || 'PHP').trim().toUpperCase();
    const unitPrice = (variant && variant.price_override !== null && variant.price_override !== undefined)
      ? Math.max(0, Number(variant.price_override))
      : Math.max(0, Number(product.base_price || 0));
    const lineTotal = Math.round(unitPrice * quantity * 100) / 100;

    keptItems.push({ itemId: item.itemId, productId: item.productId, variantId: item.variantId || null, quantity });
    lines.push({
      itemId: item.itemId,
      productId: String(product.id),
      productName: String(product.name || '').trim(),
      productSlug: String(product.slug || '').trim(),
      eventSlug: product.event_slug,
      eventTitle: product.event_title,
      variantId: variant ? String(variant.id) : null,
      variantName: variant ? String(variant.variant_name || variant.size || variant.colour || 'Default').trim() : '',
      quantity,
      unitPrice,
      unitPriceLabel: formatCurrency(unitPrice, currency),
      lineTotal,
      lineTotalLabel: formatCurrency(lineTotal, currency),
      currency,
      allowPickup: product.allow_pickup !== false,
      allowDelivery: product.allow_delivery === true,
      deliveryFee: Math.max(0, Number(product.delivery_fee || 0))
    });
  }

  cart.items = keptItems;
  if (!keptItems.length) cart.mongoEventId = null;

  return lines;
}

function summarizeCartLines(lines) {
  const currency = lines.length ? lines[0].currency : 'PHP';
  const subtotal = Math.round(lines.reduce((sum, line) => sum + line.lineTotal, 0) * 100) / 100;
  const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0);

  const allowPickup = lines.length ? lines.every((line) => line.allowPickup) : true;
  const allowDelivery = lines.length ? lines.every((line) => line.allowDelivery) : false;

  const seenProductIds = new Set();
  let deliveryFee = 0;
  for (const line of lines) {
    if (seenProductIds.has(line.productId)) continue;
    seenProductIds.add(line.productId);
    deliveryFee += line.deliveryFee || 0;
  }
  deliveryFee = Math.round(deliveryFee * 100) / 100;

  return {
    currency,
    subtotal,
    subtotalLabel: formatCurrency(subtotal, currency),
    itemCount,
    allowPickup,
    allowDelivery,
    deliveryFee,
    deliveryFeeLabel: formatCurrency(deliveryFee, currency)
  };
}
