const express = require('express');
const router = express.Router();

const organizerShopController = require('../controllers/organizer-shop.controller');
const { requireAuth, requireApprovedOrganizer } = require('../middleware/auth.middleware');
const { requireCsrfProtection } = require('../middleware/csrf.middleware');
const {
  canManageEventShop,
  canReviewShopPayment,
  canUpdateFulfilment,
  canManageShopProduct
} = require('../middleware/shop-access.middleware');
const { validateObjectIdParam, validateShopPagination } = require('../middleware/shop-validation.middleware');

router.use(requireAuth, requireApprovedOrganizer);

router.get('/events/:eventId/shop', validateObjectIdParam('eventId'), canManageEventShop, organizerShopController.getShopDashboard);

router.get('/events/:eventId/shop/products', validateObjectIdParam('eventId'), canManageEventShop, validateShopPagination, organizerShopController.getProducts);
router.get('/events/:eventId/shop/products/new', validateObjectIdParam('eventId'), canManageEventShop, organizerShopController.getNewProduct);
router.post('/events/:eventId/shop/products', validateObjectIdParam('eventId'), requireCsrfProtection, canManageEventShop, organizerShopController.postProduct);
router.get('/events/:eventId/shop/products/:productId/edit', validateObjectIdParam('eventId'), validateObjectIdParam('productId'), canManageEventShop, canManageShopProduct, organizerShopController.getEditProduct);
router.patch('/events/:eventId/shop/products/:productId', validateObjectIdParam('eventId'), validateObjectIdParam('productId'), requireCsrfProtection, canManageEventShop, canManageShopProduct, organizerShopController.patchProduct);
router.post('/events/:eventId/shop/products/:productId/archive', validateObjectIdParam('eventId'), validateObjectIdParam('productId'), requireCsrfProtection, canManageEventShop, canManageShopProduct, organizerShopController.archiveProduct);
router.post('/events/:eventId/shop/products/:productId/hide', validateObjectIdParam('eventId'), validateObjectIdParam('productId'), requireCsrfProtection, canManageEventShop, canManageShopProduct, organizerShopController.hideProduct);

router.get('/events/:eventId/shop/products/:productId/variants', validateObjectIdParam('eventId'), validateObjectIdParam('productId'), canManageEventShop, canManageShopProduct, organizerShopController.getProductVariants);
router.post('/events/:eventId/shop/products/:productId/variants', validateObjectIdParam('eventId'), validateObjectIdParam('productId'), requireCsrfProtection, canManageEventShop, canManageShopProduct, organizerShopController.postProductVariant);
router.patch('/events/:eventId/shop/products/:productId/variants/:variantId', validateObjectIdParam('eventId'), validateObjectIdParam('productId'), validateObjectIdParam('variantId'), requireCsrfProtection, canManageEventShop, canManageShopProduct, organizerShopController.patchProductVariant);
router.delete('/events/:eventId/shop/products/:productId/variants/:variantId', validateObjectIdParam('eventId'), validateObjectIdParam('productId'), validateObjectIdParam('variantId'), requireCsrfProtection, canManageEventShop, canManageShopProduct, organizerShopController.deleteProductVariant);

router.get('/events/:eventId/shop/orders', validateObjectIdParam('eventId'), canManageEventShop, validateShopPagination, organizerShopController.getOrders);
router.get('/events/:eventId/shop/orders/:orderId', validateObjectIdParam('eventId'), validateObjectIdParam('orderId'), canManageEventShop, organizerShopController.getOrderDetail);
router.patch('/events/:eventId/shop/orders/:orderId/fulfilment', validateObjectIdParam('eventId'), validateObjectIdParam('orderId'), requireCsrfProtection, canManageEventShop, canUpdateFulfilment, organizerShopController.patchOrderFulfilment);

router.get('/events/:eventId/shop/payment-reviews', validateObjectIdParam('eventId'), canManageEventShop, validateShopPagination, organizerShopController.getPaymentReviews);
router.patch('/events/:eventId/shop/payment-reviews/:paymentId', validateObjectIdParam('eventId'), requireCsrfProtection, canManageEventShop, canReviewShopPayment, organizerShopController.patchPaymentReview);

router.get('/events/:eventId/shop/reports', validateObjectIdParam('eventId'), canManageEventShop, organizerShopController.getReports);
router.get('/events/:eventId/shop/reports/export.csv', validateObjectIdParam('eventId'), canManageEventShop, organizerShopController.exportReportCsv);
router.get('/events/:eventId/shop/reports/export.xlsx', validateObjectIdParam('eventId'), canManageEventShop, organizerShopController.exportReportXlsx);

module.exports = router;
