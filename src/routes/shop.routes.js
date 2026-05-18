const express = require('express');
const router = express.Router();

const shopController = require('../controllers/shop.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireCsrfProtection } = require('../middleware/csrf.middleware');
const { requireRunner } = require('../middleware/shop-access.middleware');
const { validateObjectIdParam, validateShopPagination } = require('../middleware/shop-validation.middleware');

router.get('/events/:eventSlug/shop', validateShopPagination, shopController.getEventShop);
router.get('/events/:eventSlug/shop/:productSlug', shopController.getProductDetail);

router.get('/shop/cart', requireAuth, requireRunner, shopController.getCart);
router.post('/shop/cart/add', requireAuth, requireRunner, requireCsrfProtection, shopController.addToCart);
router.patch('/shop/cart/items/:itemId', requireAuth, requireRunner, requireCsrfProtection, validateObjectIdParam('itemId'), shopController.updateCartItem);
router.delete('/shop/cart/items/:itemId', requireAuth, requireRunner, requireCsrfProtection, validateObjectIdParam('itemId'), shopController.deleteCartItem);

router.get('/shop/checkout', requireAuth, requireRunner, shopController.getCheckout);
router.post('/shop/checkout', requireAuth, requireRunner, requireCsrfProtection, shopController.postCheckout);

router.get('/orders', requireAuth, requireRunner, validateShopPagination, shopController.getOrders);
router.get('/orders/:orderNumber', requireAuth, requireRunner, shopController.getOrderDetail);
router.get('/orders/:orderNumber/payment', requireAuth, requireRunner, shopController.getOrderPaymentPage);
router.post('/orders/:orderNumber/payment-proof', requireAuth, requireRunner, requireCsrfProtection, shopController.postOrderPaymentProof);
router.post('/orders/:orderNumber/cancel', requireAuth, requireRunner, requireCsrfProtection, shopController.cancelOrder);

module.exports = router;
