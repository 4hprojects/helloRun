const express = require('express');
const router = express.Router();

const organizerShopController = require('../controllers/organizer-shop.controller');
const { requireAuth, requireApprovedOrganizer } = require('../middleware/auth.middleware');
const { requireCsrfProtection } = require('../middleware/csrf.middleware');
const { createRateLimiter } = require('../middleware/rate-limit.middleware');
const {
  canManageEventShop,
  canReviewShopPayment,
  canUpdateFulfilment,
  canViewShopOrder,
  canManageShopProduct
} = require('../middleware/shop-access.middleware');
const {
  validateObjectIdParam,
  validateUuidParam,
  validateShopPagination,
  validateShopMutationPayload
} = require('../middleware/shop-validation.middleware');

const shopReportExportLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  maxRequests: 10,
  message: 'Too many shop report exports. Please wait a few minutes and try again.'
});

router.use(requireAuth, requireApprovedOrganizer);

router.get('/events/:eventId/shop', validateObjectIdParam('eventId'), canManageEventShop, organizerShopController.getShopDashboard);

router.get('/events/:eventId/shop/products', validateObjectIdParam('eventId'), canManageEventShop, validateShopPagination, organizerShopController.getProducts);
router.get('/events/:eventId/shop/products/new', validateObjectIdParam('eventId'), canManageEventShop, organizerShopController.getNewProduct);
router.post('/events/:eventId/shop/products', validateObjectIdParam('eventId'), requireCsrfProtection, canManageEventShop, validateShopMutationPayload('product'), organizerShopController.postProduct);
router.get('/events/:eventId/shop/products/:productId/edit', validateObjectIdParam('eventId'), validateUuidParam('productId'), canManageEventShop, canManageShopProduct, organizerShopController.getEditProduct);
router.patch('/events/:eventId/shop/products/:productId', validateObjectIdParam('eventId'), validateUuidParam('productId'), requireCsrfProtection, canManageEventShop, canManageShopProduct, validateShopMutationPayload('product'), organizerShopController.patchProduct);
router.post('/events/:eventId/shop/products/:productId/archive', validateObjectIdParam('eventId'), validateUuidParam('productId'), requireCsrfProtection, canManageEventShop, canManageShopProduct, organizerShopController.archiveProduct);
router.post('/events/:eventId/shop/products/:productId/hide', validateObjectIdParam('eventId'), validateUuidParam('productId'), requireCsrfProtection, canManageEventShop, canManageShopProduct, organizerShopController.hideProduct);

router.get('/events/:eventId/shop/products/:productId/variants', validateObjectIdParam('eventId'), validateUuidParam('productId'), canManageEventShop, canManageShopProduct, organizerShopController.getProductVariants);
router.post('/events/:eventId/shop/products/:productId/variants', validateObjectIdParam('eventId'), validateUuidParam('productId'), requireCsrfProtection, canManageEventShop, canManageShopProduct, validateShopMutationPayload('variant'), organizerShopController.postProductVariant);
router.patch('/events/:eventId/shop/products/:productId/variants/:variantId', validateObjectIdParam('eventId'), validateUuidParam('productId'), validateUuidParam('variantId'), requireCsrfProtection, canManageEventShop, canManageShopProduct, validateShopMutationPayload('variant'), organizerShopController.patchProductVariant);
router.delete('/events/:eventId/shop/products/:productId/variants/:variantId', validateObjectIdParam('eventId'), validateUuidParam('productId'), validateUuidParam('variantId'), requireCsrfProtection, canManageEventShop, canManageShopProduct, organizerShopController.deleteProductVariant);

router.get('/events/:eventId/shop/orders', validateObjectIdParam('eventId'), canManageEventShop, validateShopPagination, organizerShopController.getOrders);
router.get('/events/:eventId/shop/orders/:orderId', validateObjectIdParam('eventId'), validateUuidParam('orderId'), canManageEventShop, canViewShopOrder, organizerShopController.getOrderDetail);
router.patch('/events/:eventId/shop/orders/:orderId/fulfilment', validateObjectIdParam('eventId'), validateUuidParam('orderId'), requireCsrfProtection, canManageEventShop, canUpdateFulfilment, validateShopMutationPayload('fulfilment'), organizerShopController.patchOrderFulfilment);

router.get('/events/:eventId/shop/payment-reviews', validateObjectIdParam('eventId'), canManageEventShop, validateShopPagination, organizerShopController.getPaymentReviews);
router.patch('/events/:eventId/shop/payment-reviews/:paymentId', validateObjectIdParam('eventId'), validateUuidParam('paymentId'), requireCsrfProtection, canManageEventShop, canReviewShopPayment, validateShopMutationPayload('paymentReview'), organizerShopController.patchPaymentReview);

router.get('/events/:eventId/shop/reports', validateObjectIdParam('eventId'), canManageEventShop, organizerShopController.getReports);
router.get('/events/:eventId/shop/reports/export.csv', validateObjectIdParam('eventId'), canManageEventShop, shopReportExportLimiter, organizerShopController.exportReportCsv);
router.get('/events/:eventId/shop/reports/export.xlsx', validateObjectIdParam('eventId'), canManageEventShop, shopReportExportLimiter, organizerShopController.exportReportXlsx);

module.exports = router;
