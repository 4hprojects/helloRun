const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middleware/auth.middleware');
const { createRateLimiter } = require('../middleware/rate-limit.middleware');
const adminController = require('../controllers/admin.controller');
const blogController = require('../controllers/blog.controller');

const adminModerationLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  maxRequests: 60,
  message: 'Too many moderation actions. Please wait and try again.'
});
const adminBlogAutosaveLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  maxRequests: 600,
  message: 'Too many auto-save requests. Please wait and try again.'
});

// List all organizer applications
router.get('/applications', requireAdmin, adminController.listApplications);

// View details for a specific application
router.get('/applications/:id', requireAdmin, adminController.viewApplication);

// Approve application
router.post('/applications/:id/approve', requireAdmin, adminController.approveApplication);

// Reject application
router.post('/applications/:id/reject', requireAdmin, adminController.rejectApplication);

// Admin dashboard
router.get('/dashboard', requireAdmin, adminController.dashboard);

// Blog moderation queue
router.get('/blog/review', requireAdmin, blogController.renderAdminQueuePage);
router.get('/blog/posts/:id/review', requireAdmin, blogController.renderAdminReviewPage);
router.post('/blog/posts/:id/approve-form', requireAdmin, adminModerationLimiter, blogController.approveBlogPostPage);
router.post('/blog/posts/:id/reject-form', requireAdmin, adminModerationLimiter, blogController.rejectBlogPostPage);
router.post('/blog/posts/:id/archive-form', requireAdmin, adminModerationLimiter, blogController.archiveBlogPostPage);

router.get('/blog/pending', requireAdmin, blogController.listPendingBlogs);
router.get('/blog/posts/:id', requireAdmin, blogController.previewBlogPost);
router.post('/blog/posts/:id/approve', requireAdmin, adminModerationLimiter, blogController.approveBlogPost);
router.post('/blog/posts/:id/reject', requireAdmin, adminModerationLimiter, blogController.rejectBlogPost);
router.post('/blog/posts/:id/archive', requireAdmin, adminModerationLimiter, blogController.archiveBlogPost);
router.patch('/blog/posts/:id/autosave', requireAdmin, adminBlogAutosaveLimiter, blogController.autosaveBlogPostAdmin);

module.exports = router;
