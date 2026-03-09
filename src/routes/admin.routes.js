const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middleware/auth.middleware');
const { requireCsrfProtection } = require('../middleware/csrf.middleware');
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

router.use((req, res, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(String(req.method || '').toUpperCase())) {
    return requireCsrfProtection(req, res, next);
  }
  return next();
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
router.get('/privacy-policy', requireAdmin, adminController.listPrivacyPolicies);
router.get('/privacy-policy/new', requireAdmin, adminController.renderNewPrivacyPolicyDraft);
router.post('/privacy-policy', requireAdmin, adminController.createPrivacyPolicyDraft);
router.post('/privacy-policy/format', requireAdmin, adminController.formatNewPrivacyPolicyDraft);
router.post('/privacy-policy/preview', requireAdmin, adminController.previewNewPrivacyPolicyDraft);
router.get('/privacy-policy/:id', requireAdmin, adminController.viewPrivacyPolicyVersion);
router.get('/privacy-policy/:id/edit', requireAdmin, adminController.renderEditPrivacyPolicyDraft);
router.post('/privacy-policy/:id/save', requireAdmin, adminController.updatePrivacyPolicyDraft);
router.post('/privacy-policy/:id/format', requireAdmin, adminController.formatExistingPrivacyPolicyDraft);
router.post('/privacy-policy/:id/preview', requireAdmin, adminController.previewExistingPrivacyPolicyDraft);
router.post('/privacy-policy/:id/publish', requireAdmin, adminController.publishPrivacyPolicyDraft);
router.post('/privacy-policy/:id/clone', requireAdmin, adminController.clonePrivacyPolicyVersion);
router.post('/privacy-policy/:id/archive', requireAdmin, adminController.archivePrivacyPolicyVersion);
router.get('/terms-and-conditions', requireAdmin, adminController.listTermsPolicies);
router.get('/terms-and-conditions/new', requireAdmin, adminController.renderNewTermsPolicyDraft);
router.post('/terms-and-conditions', requireAdmin, adminController.createTermsPolicyDraft);
router.post('/terms-and-conditions/format', requireAdmin, adminController.formatNewTermsPolicyDraft);
router.post('/terms-and-conditions/preview', requireAdmin, adminController.previewNewTermsPolicyDraft);
router.get('/terms-and-conditions/:id', requireAdmin, adminController.viewTermsPolicyVersion);
router.get('/terms-and-conditions/:id/edit', requireAdmin, adminController.renderEditTermsPolicyDraft);
router.post('/terms-and-conditions/:id/save', requireAdmin, adminController.updateTermsPolicyDraft);
router.post('/terms-and-conditions/:id/format', requireAdmin, adminController.formatExistingTermsPolicyDraft);
router.post('/terms-and-conditions/:id/preview', requireAdmin, adminController.previewExistingTermsPolicyDraft);
router.post('/terms-and-conditions/:id/publish', requireAdmin, adminController.publishTermsPolicyDraft);
router.post('/terms-and-conditions/:id/clone', requireAdmin, adminController.cloneTermsPolicyVersion);
router.post('/terms-and-conditions/:id/archive', requireAdmin, adminController.archiveTermsPolicyVersion);
router.get('/cookie-policy', requireAdmin, adminController.listCookiePolicies);
router.get('/cookie-policy/new', requireAdmin, adminController.renderNewCookiePolicyDraft);
router.post('/cookie-policy', requireAdmin, adminController.createCookiePolicyDraft);
router.post('/cookie-policy/format', requireAdmin, adminController.formatNewCookiePolicyDraft);
router.post('/cookie-policy/preview', requireAdmin, adminController.previewNewCookiePolicyDraft);
router.get('/cookie-policy/:id', requireAdmin, adminController.viewCookiePolicyVersion);
router.get('/cookie-policy/:id/edit', requireAdmin, adminController.renderEditCookiePolicyDraft);
router.post('/cookie-policy/:id/save', requireAdmin, adminController.updateCookiePolicyDraft);
router.post('/cookie-policy/:id/format', requireAdmin, adminController.formatExistingCookiePolicyDraft);
router.post('/cookie-policy/:id/preview', requireAdmin, adminController.previewExistingCookiePolicyDraft);
router.post('/cookie-policy/:id/publish', requireAdmin, adminController.publishCookiePolicyDraft);
router.post('/cookie-policy/:id/clone', requireAdmin, adminController.cloneCookiePolicyVersion);
router.post('/cookie-policy/:id/archive', requireAdmin, adminController.archiveCookiePolicyVersion);

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
