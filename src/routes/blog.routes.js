const express = require('express');
const router = express.Router();
const blogController = require('../controllers/blog.controller');
const uploadService = require('../services/upload.service');
const { createRateLimiter } = require('../middleware/rate-limit.middleware');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireCsrfProtection } = require('../middleware/csrf.middleware');

const blogWriteLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  maxRequests: 40,
  message: 'Too many blog write actions. Please wait and try again.'
});
const blogSubmitLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 15,
  message: 'Too many submit actions. Please try again later.'
});

router.get('/blogs/me/dashboard', requireAuth, blogController.renderAuthorDashboard);
router.get('/blogs/me/new', requireAuth, blogController.renderCreatePage);
router.post('/blogs/me/new', requireAuth, blogWriteLimiter, uploadService.uploadBlogAssets, requireCsrfProtection, blogController.createDraftPage);
router.get('/blogs/me/:id/edit', requireAuth, blogController.renderEditPage);
router.post('/blogs/me/:id/edit', requireAuth, blogWriteLimiter, uploadService.uploadBlogAssets, requireCsrfProtection, blogController.updateDraftPage);
router.post('/blogs/me/:id/submit-form', requireAuth, blogSubmitLimiter, requireCsrfProtection, blogController.submitForReviewPage);
router.post('/blogs/me/:id/delete-form', requireAuth, blogWriteLimiter, requireCsrfProtection, blogController.deleteMyDraftPage);
router.post('/blogs/me/:id/revision/discard-form', requireAuth, blogWriteLimiter, requireCsrfProtection, blogController.discardRevisionPage);
router.post('/blogs/uploads/images', requireAuth, blogWriteLimiter, uploadService.uploadBlogAssets, requireCsrfProtection, blogController.uploadBlogImagesForEditor);

router.get('/blogs/me', requireAuth, blogController.getMyBlogs);
router.get('/blogs/me/:id', requireAuth, blogController.getMyBlogById);
router.post('/blogs/me', requireAuth, blogWriteLimiter, uploadService.uploadBlogAssets, requireCsrfProtection, blogController.createDraft);
router.post('/blogs/me/:id', requireAuth, blogWriteLimiter, uploadService.uploadBlogAssets, requireCsrfProtection, blogController.updateDraft);
router.post('/blogs/me/:id/submit', requireAuth, blogSubmitLimiter, requireCsrfProtection, blogController.submitForReview);
router.post('/blogs/me/:id/delete', requireAuth, blogWriteLimiter, requireCsrfProtection, blogController.deleteMyDraft);
router.post('/blogs/me/:id/revision/discard', requireAuth, blogWriteLimiter, requireCsrfProtection, blogController.discardRevision);

module.exports = router;
