const productService = require('../services/shop/product.service');
const orderService = require('../services/shop/order.service');
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
      limit: req.shopPagination?.limit || 100
    });

    return res.json({
      success: true,
      event: {
        id: String(event._id),
        slug: event.slug,
        title: event.title
      },
      products,
      count: products.length
    });
  } catch (error) {
    return next(error);
  }
};

exports.getProductDetail = async (_req, res) => {
  return res.status(501).render('error', {
    title: 'Shop Not Live Yet',
    status: 501,
    message: 'Product detail is scaffolded but not yet live.'
  });
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

exports.getOrderDetail = async (_req, res) => {
  return res.status(501).render('error', {
    title: 'Orders Not Live Yet',
    status: 501,
    message: 'Order detail is scaffolded but not yet live.'
  });
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
