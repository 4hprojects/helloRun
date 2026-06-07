const express = require('express');
const router = express.Router();

const shopController = require('../controllers/shop.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireCsrfProtection } = require('../middleware/csrf.middleware');
const { requireRunner } = require('../middleware/shop-access.middleware');
const { createRateLimiter } = require('../middleware/rate-limit.middleware');
const uploadService = require('../services/upload.service');
const { validateObjectIdParam, validateShopPagination, validateShopMutationPayload } = require('../middleware/shop-validation.middleware');

const orderPaymentProofUploadLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  maxRequests: 8,
  message: 'Too many payment receipt submissions. Please wait a few minutes and try again.'
});

router.get('/shop', validateShopPagination, shopController.getGlobalShop);
router.get('/events/:eventSlug/shop', validateShopPagination, shopController.getEventShop);
router.get('/events/:eventSlug/shop/:productSlug', shopController.getProductDetail);

router.get('/shop/cart', requireAuth, requireRunner, shopController.getCart);
router.post('/shop/cart/add', requireAuth, requireRunner, requireCsrfProtection, validateShopMutationPayload('cart'), shopController.addToCart);
router.patch('/shop/cart/items/:itemId', requireAuth, requireRunner, requireCsrfProtection, validateObjectIdParam('itemId'), shopController.updateCartItem);
router.delete('/shop/cart/items/:itemId', requireAuth, requireRunner, requireCsrfProtection, validateObjectIdParam('itemId'), shopController.deleteCartItem);

router.get('/shop/checkout', requireAuth, requireRunner, shopController.getCheckout);
router.post('/shop/checkout', requireAuth, requireRunner, requireCsrfProtection, validateShopMutationPayload('checkout'), shopController.postCheckout);

// Must be registered after the more specific /shop/cart* and /shop/checkout* routes above,
// otherwise this catch-all would shadow them (e.g. :productSlug = 'cart').
router.get('/shop/:productSlug', shopController.getPlatformProductDetail);

router.get('/orders', requireAuth, requireRunner, validateShopPagination, shopController.getOrders);
router.get('/orders/:orderNumber', requireAuth, requireRunner, shopController.getOrderDetail);
router.get('/orders/:orderNumber/payment', requireAuth, requireRunner, shopController.getOrderPaymentPage);
router.post(
  '/orders/:orderNumber/payment-proof',
  requireAuth,
  requireRunner,
  orderPaymentProofUploadLimiter,
  uploadService.uploadPaymentProof,
  requireCsrfProtection,
  validateShopMutationPayload('paymentProof'),
  shopController.postOrderPaymentProof
);
router.post('/orders/:orderNumber/cancel', requireAuth, requireRunner, requireCsrfProtection, shopController.cancelOrder);

module.exports = router;
