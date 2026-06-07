const express = require('express');
const router = express.Router();

const adminShopController = require('../controllers/admin-shop.controller');
const { requireAdmin } = require('../middleware/auth.middleware');
const { requireCsrfProtection } = require('../middleware/csrf.middleware');
const { canManagePlatformProduct } = require('../middleware/shop-access.middleware');
const {
  validateUuidParam,
  validateShopPagination,
  validateShopMutationPayload
} = require('../middleware/shop-validation.middleware');

router.use(requireAdmin);

router.get('/shop', adminShopController.getShopDashboard);
router.get('/shop/products', validateShopPagination, adminShopController.getProducts);

router.get('/shop/products/new', adminShopController.getNewPlatformProduct);
router.post('/shop/products', requireCsrfProtection, validateShopMutationPayload('product'), adminShopController.postPlatformProduct);
router.get('/shop/products/:productId/edit', validateUuidParam('productId'), canManagePlatformProduct, adminShopController.getEditPlatformProduct);
router.patch('/shop/products/:productId', validateUuidParam('productId'), requireCsrfProtection, canManagePlatformProduct, validateShopMutationPayload('product'), adminShopController.patchPlatformProduct);
router.post('/shop/products/:productId/archive', validateUuidParam('productId'), requireCsrfProtection, canManagePlatformProduct, adminShopController.archivePlatformProduct);
router.post('/shop/products/:productId/hide', validateUuidParam('productId'), requireCsrfProtection, canManagePlatformProduct, adminShopController.hidePlatformProduct);

router.get('/shop/products/:productId/variants', validateUuidParam('productId'), canManagePlatformProduct, adminShopController.getPlatformProductVariants);
router.post('/shop/products/:productId/variants', validateUuidParam('productId'), requireCsrfProtection, canManagePlatformProduct, validateShopMutationPayload('variant'), adminShopController.postPlatformProductVariant);
router.patch('/shop/products/:productId/variants/:variantId', validateUuidParam('productId'), validateUuidParam('variantId'), requireCsrfProtection, canManagePlatformProduct, validateShopMutationPayload('variant'), adminShopController.patchPlatformProductVariant);
router.delete('/shop/products/:productId/variants/:variantId', validateUuidParam('productId'), validateUuidParam('variantId'), requireCsrfProtection, canManagePlatformProduct, adminShopController.deletePlatformProductVariant);

router.get('/shop/product-approvals', validateShopPagination, adminShopController.getProductApprovals);
router.patch('/shop/product-approvals/:productId', validateUuidParam('productId'), requireCsrfProtection, adminShopController.patchProductApproval);
router.get('/shop/orders', validateShopPagination, adminShopController.getOrders);
router.get('/shop/platform-orders', validateShopPagination, adminShopController.getPlatformOrders);
router.get('/shop/platform-orders/:orderId', validateUuidParam('orderId'), adminShopController.getPlatformOrderDetail);
router.patch('/shop/platform-orders/:orderId/fulfilment', validateUuidParam('orderId'), requireCsrfProtection, validateShopMutationPayload('fulfilment'), adminShopController.patchPlatformOrderFulfilment);
router.get('/shop/payments', validateShopPagination, adminShopController.getPayments);
router.get('/shop/platform-payment-reviews', validateShopPagination, adminShopController.getPlatformPaymentReviews);
router.patch('/shop/platform-payment-reviews/:paymentId', validateUuidParam('paymentId'), requireCsrfProtection, validateShopMutationPayload('paymentReview'), adminShopController.patchPlatformPaymentReview);
router.get('/shop/reports', adminShopController.getReports);
router.get('/shop/settings', adminShopController.getSettings);
router.patch('/shop/settings', requireCsrfProtection, adminShopController.patchSettings);

module.exports = router;
