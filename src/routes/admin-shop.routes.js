const express = require('express');
const router = express.Router();

const adminShopController = require('../controllers/admin-shop.controller');
const { requireAdmin } = require('../middleware/auth.middleware');
const { requireCsrfProtection } = require('../middleware/csrf.middleware');
const { validateUuidParam, validateShopPagination } = require('../middleware/shop-validation.middleware');

router.use(requireAdmin);

router.get('/shop', adminShopController.getShopDashboard);
router.get('/shop/products', validateShopPagination, adminShopController.getProducts);
router.get('/shop/product-approvals', validateShopPagination, adminShopController.getProductApprovals);
router.patch('/shop/product-approvals/:productId', validateUuidParam('productId'), requireCsrfProtection, adminShopController.patchProductApproval);
router.get('/shop/orders', validateShopPagination, adminShopController.getOrders);
router.get('/shop/payments', validateShopPagination, adminShopController.getPayments);
router.get('/shop/reports', adminShopController.getReports);
router.get('/shop/settings', adminShopController.getSettings);
router.patch('/shop/settings', requireCsrfProtection, adminShopController.patchSettings);

module.exports = router;
