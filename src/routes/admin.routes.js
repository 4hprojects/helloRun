const express = require('express');
const router = express.Router();
const { requireAdmin, requireFullAdmin } = require('../middleware/auth.middleware');
const { requireCsrfProtection } = require('../middleware/csrf.middleware');
const { createRateLimiter } = require('../middleware/rate-limit.middleware');
const adminController = require('../controllers/admin.controller');
const adminAuditController = require('../controllers/admin-audit.controller');
const blogController = require('../controllers/blog.controller');
const blogInteractionController = require('../controllers/blog-interaction.controller');
const uploadService = require('../services/upload.service');
const { listPolicyDocuments } = require('../services/policy-registry.service');

const adminModerationLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  maxRequests: 60,
  message: 'Too many moderation actions. Please wait and try again.'
});
const adminAccountActionLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  maxRequests: 30,
  message: 'Too many account actions. Please wait an hour and try again.',
  keyFn: (req) => `admin-account|${String(req.session?.userId || 'anon')}`
});
const adminBlogAutosaveLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  maxRequests: 600,
  message: 'Too many auto-save requests. Please wait and try again.'
});
const adminExportLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  maxRequests: 10,
  message: 'Too many exports. Please wait a few minutes and try again.',
  keyFn: (req) => `admin-export|${String(req.session?.userId || 'anon')}`
});
const adminContentSettingsLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  maxRequests: 120,
  message: 'Too many settings/content changes. Please wait and try again.'
});
const adminTestEmailLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  maxRequests: 20,
  message: 'Too many test emails sent. Please wait an hour and try again.',
  keyFn: (req) => `admin-test-email|${String(req.session?.userId || 'anon')}`
});
const adminPromotionLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  maxRequests: 5,
  message: 'Too many promotion campaigns sent. Please wait an hour and try again.',
  keyFn: (req) => `admin-promote|${String(req.session?.userId || 'anon')}`
});
const adminTestDataPurgeLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  maxRequests: 5,
  message: 'Too many test-data purge attempts. Please wait an hour and try again.',
  keyFn: (req) => `admin-test-data-purge|${String(req.session?.userId || 'anon')}`
});
const adminTestUserPurgeLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  maxRequests: 5,
  message: 'Too many test-user purge attempts. Please wait an hour and try again.',
  keyFn: (req) => `admin-test-user-purge|${String(req.session?.userId || 'anon')}`
});

router.use((req, res, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(String(req.method || '').toUpperCase())) {
    // Multipart fields are not available until Multer parses the request. Multipart
    // routes validate CSRF explicitly after their authenticated upload middleware.
    const contentType = String(req.headers['content-type'] || '');
    if (contentType.startsWith('multipart/form-data')) return next();
    return requireCsrfProtection(req, res, next);
  }
  return next();
});

// Analytics
router.get('/analytics', requireAdmin, adminController.analyticsPage);
router.get('/analytics/export.csv', requireAdmin, requireFullAdmin, adminExportLimiter, adminController.exportAnalyticsCsv);
router.get('/analytics/export.xlsx', requireAdmin, requireFullAdmin, adminExportLimiter, adminController.exportAnalyticsXlsx);

// User management
router.get('/users', requireAdmin, adminController.listUsers);
router.get('/users/export.csv', requireAdmin, requireFullAdmin, adminExportLimiter, adminController.exportUsersCsv);
router.get('/users/export.xlsx', requireAdmin, requireFullAdmin, adminExportLimiter, adminController.exportUsersXlsx);
router.post('/users/delete', requireAdmin, requireFullAdmin, adminAccountActionLimiter, adminController.deleteUsers);
router.post('/users/test-fixtures/purge', requireAdmin, requireFullAdmin, adminTestUserPurgeLimiter, adminController.purgeTestUsers);
router.get('/users/:id/edit', requireAdmin, adminController.renderEditUser);
router.post('/users/:id/edit', requireAdmin, adminAccountActionLimiter, adminController.updateUser);
router.get('/users/:id', requireAdmin, adminController.viewUser);
router.post('/users/:id/delete', requireAdmin, requireFullAdmin, adminAccountActionLimiter, adminController.deleteUsers);

// Admin governance
router.post('/users/:id/notes', requireAdmin, adminAccountActionLimiter, adminController.addAdminNote);
router.post('/users/:id/resend-verification', requireAdmin, adminAccountActionLimiter, adminController.resendVerificationEmail);
router.post('/users/:id/verify-email', requireAdmin, adminAccountActionLimiter, adminController.overrideEmailVerification);
router.post('/users/:id/account-status', requireAdmin, adminAccountActionLimiter, adminController.updateAccountStatus);

// Event management
router.get('/events', requireAdmin, adminController.listEvents);
router.post('/events/bulk-delete', requireAdmin, requireFullAdmin, adminModerationLimiter, adminController.bulkDeleteEvents);
router.post('/events/test-data/purge', requireAdmin, requireFullAdmin, adminTestDataPurgeLimiter, adminController.purgeTestData);
router.get('/badges', requireAdmin, adminController.listBadges);
router.post('/badges/recalculate', requireAdmin, adminModerationLimiter, adminController.recalculateBadges);
router.post('/badge-definitions/:badgeDefinitionId/status', requireAdmin, adminModerationLimiter, adminController.updateBadgeDefinitionStatus);
router.post('/badge-definitions/:badgeDefinitionId/email', requireAdmin, adminModerationLimiter, adminController.updateBadgeDefinitionEmailLevel);
router.post('/user-badges/:userBadgeId/revoke', requireAdmin, adminModerationLimiter, adminController.revokeBadge);
router.get('/events/:id', requireAdmin, adminController.viewEvent);
router.get('/events/:id/edit', requireAdmin, adminController.renderEditEvent);
router.post('/events/:id/edit', requireAdmin, adminModerationLimiter, uploadService.uploadEventBranding, requireCsrfProtection, adminController.updateEvent);
router.post('/events/:id/media/remove', requireAdmin, adminModerationLimiter, adminController.removeEventMedia);
router.post('/events/:id/sitemap-toggle', requireAdmin, adminModerationLimiter, adminController.toggleEventSitemapExclusion);
router.post('/events/:id/approve', requireAdmin, adminModerationLimiter, adminController.approveEvent);
router.post('/events/:id/archive', requireAdmin, adminModerationLimiter, adminController.archiveEvent);
router.post('/events/:id/delete', requireAdmin, requireFullAdmin, adminModerationLimiter, adminController.deleteEvent);

// List all organizer applications
router.get('/applications', requireAdmin, adminController.listApplications);

// View details for a specific application
router.get('/applications/:id', requireAdmin, adminController.viewApplication);

// Approve application
router.post('/applications/:id/approve', requireAdmin, adminModerationLimiter, adminController.approveApplication);

// Reject application
router.post('/applications/:id/reject', requireAdmin, adminModerationLimiter, adminController.rejectApplication);

// Admin dashboard
router.get('/dashboard', requireAdmin, adminController.dashboard);
router.get('/search', requireAdmin, adminController.universalSearch);
router.get('/cases/user/:id', requireAdmin, adminController.userCaseView);
router.get('/audit', requireAdmin, adminAuditController.listCriticalAudit);
router.get('/audit/export.csv', requireAdmin, requireFullAdmin, adminExportLimiter, adminAuditController.exportCriticalAuditCsv);
router.get('/audit/export.xlsx', requireAdmin, requireFullAdmin, adminExportLimiter, adminAuditController.exportCriticalAuditXlsx);
router.get('/communications', requireAdmin, adminController.renderCommunications);
router.get('/communications/logs', requireAdmin, adminController.renderCommunications);
router.get('/communications/retries', requireAdmin, adminController.renderCommunicationRetries);
router.get('/communications/failures/:eventKey', requireAdmin, adminController.renderCommunicationFailureDetail);
router.post('/communications/retries/:retryId/retry', requireAdmin, adminModerationLimiter, adminController.retryCommunicationDelivery);
router.post('/communications/settings', requireAdmin, requireFullAdmin, adminContentSettingsLimiter, adminController.updateCommunicationSettings);
router.post('/communications/events/:eventKey', requireAdmin, requireFullAdmin, adminContentSettingsLimiter, adminController.updateCommunicationEvent);
router.post('/communications/test-email', requireAdmin, requireFullAdmin, adminTestEmailLimiter, adminController.sendCommunicationTestEmail);
router.get('/homepage-carousel', requireAdmin, adminController.renderHomepageCarouselSettings);
router.post('/homepage-carousel', requireAdmin, requireFullAdmin, adminContentSettingsLimiter, adminController.updateHomepageCarouselSettings);
router.get('/ads', requireAdmin, adminController.renderAdSettings);
router.post('/ads', requireAdmin, requireFullAdmin, adminContentSettingsLimiter, adminController.updateAdSettings);
router.get('/reviews', requireAdmin, adminController.reviewQueue);
router.get('/submissions', requireAdmin, adminController.listSubmissions);
router.post('/submissions/bulk-reject', requireAdmin, adminModerationLimiter, adminController.bulkRejectSubmissions);
router.post('/submissions/:submissionId/correct', requireAdmin, requireFullAdmin, adminModerationLimiter, adminController.correctSubmission);
router.get('/privacy-policy', requireAdmin, adminController.listPrivacyPolicies);
router.get('/privacy-policy/new', requireAdmin, adminController.renderNewPrivacyPolicyDraft);
router.post('/privacy-policy', requireAdmin, adminContentSettingsLimiter, adminController.createPrivacyPolicyDraft);
router.post('/privacy-policy/format', requireAdmin, adminContentSettingsLimiter, adminController.formatNewPrivacyPolicyDraft);
router.post('/privacy-policy/preview', requireAdmin, adminContentSettingsLimiter, adminController.previewNewPrivacyPolicyDraft);
router.get('/privacy-policy/:id', requireAdmin, adminController.viewPrivacyPolicyVersion);
router.get('/privacy-policy/:id/edit', requireAdmin, adminController.renderEditPrivacyPolicyDraft);
router.post('/privacy-policy/:id/save', requireAdmin, adminContentSettingsLimiter, adminController.updatePrivacyPolicyDraft);
router.post('/privacy-policy/:id/format', requireAdmin, adminContentSettingsLimiter, adminController.formatExistingPrivacyPolicyDraft);
router.post('/privacy-policy/:id/preview', requireAdmin, adminContentSettingsLimiter, adminController.previewExistingPrivacyPolicyDraft);
router.post('/privacy-policy/:id/publish', requireAdmin, requireFullAdmin, adminContentSettingsLimiter, adminController.publishPrivacyPolicyDraft);
router.post('/privacy-policy/:id/clone', requireAdmin, adminContentSettingsLimiter, adminController.clonePrivacyPolicyVersion);
router.post('/privacy-policy/:id/archive', requireAdmin, adminContentSettingsLimiter, adminController.archivePrivacyPolicyVersion);
router.get('/terms-and-conditions', requireAdmin, adminController.listTermsPolicies);
router.get('/terms-and-conditions/new', requireAdmin, adminController.renderNewTermsPolicyDraft);
router.post('/terms-and-conditions', requireAdmin, adminContentSettingsLimiter, adminController.createTermsPolicyDraft);
router.post('/terms-and-conditions/format', requireAdmin, adminContentSettingsLimiter, adminController.formatNewTermsPolicyDraft);
router.post('/terms-and-conditions/preview', requireAdmin, adminContentSettingsLimiter, adminController.previewNewTermsPolicyDraft);
router.get('/terms-and-conditions/:id', requireAdmin, adminController.viewTermsPolicyVersion);
router.get('/terms-and-conditions/:id/edit', requireAdmin, adminController.renderEditTermsPolicyDraft);
router.post('/terms-and-conditions/:id/save', requireAdmin, adminContentSettingsLimiter, adminController.updateTermsPolicyDraft);
router.post('/terms-and-conditions/:id/format', requireAdmin, adminContentSettingsLimiter, adminController.formatExistingTermsPolicyDraft);
router.post('/terms-and-conditions/:id/preview', requireAdmin, adminContentSettingsLimiter, adminController.previewExistingTermsPolicyDraft);
router.post('/terms-and-conditions/:id/publish', requireAdmin, requireFullAdmin, adminContentSettingsLimiter, adminController.publishTermsPolicyDraft);
router.post('/terms-and-conditions/:id/clone', requireAdmin, adminContentSettingsLimiter, adminController.cloneTermsPolicyVersion);
router.post('/terms-and-conditions/:id/archive', requireAdmin, adminContentSettingsLimiter, adminController.archiveTermsPolicyVersion);
router.get('/cookie-policy', requireAdmin, adminController.listCookiePolicies);
router.get('/cookie-policy/new', requireAdmin, adminController.renderNewCookiePolicyDraft);
router.post('/cookie-policy', requireAdmin, adminContentSettingsLimiter, adminController.createCookiePolicyDraft);
router.post('/cookie-policy/format', requireAdmin, adminContentSettingsLimiter, adminController.formatNewCookiePolicyDraft);
router.post('/cookie-policy/preview', requireAdmin, adminContentSettingsLimiter, adminController.previewNewCookiePolicyDraft);
router.get('/cookie-policy/:id', requireAdmin, adminController.viewCookiePolicyVersion);
router.get('/cookie-policy/:id/edit', requireAdmin, adminController.renderEditCookiePolicyDraft);
router.post('/cookie-policy/:id/save', requireAdmin, adminContentSettingsLimiter, adminController.updateCookiePolicyDraft);
router.post('/cookie-policy/:id/format', requireAdmin, adminContentSettingsLimiter, adminController.formatExistingCookiePolicyDraft);
router.post('/cookie-policy/:id/preview', requireAdmin, adminContentSettingsLimiter, adminController.previewExistingCookiePolicyDraft);
router.post('/cookie-policy/:id/publish', requireAdmin, requireFullAdmin, adminContentSettingsLimiter, adminController.publishCookiePolicyDraft);
router.post('/cookie-policy/:id/clone', requireAdmin, adminContentSettingsLimiter, adminController.cloneCookiePolicyVersion);
router.post('/cookie-policy/:id/archive', requireAdmin, adminContentSettingsLimiter, adminController.archiveCookiePolicyVersion);

for (const policyDocument of listPolicyDocuments().filter((item) => !['privacy', 'terms', 'cookie'].includes(item.key))) {
  const adminSlug = policyDocument.adminPath.replace(/^\/admin\//, '');
  router.get(`/${adminSlug}`, requireAdmin, adminController.listPolicyDocument);
  router.get(`/${adminSlug}/new`, requireAdmin, adminController.renderNewPolicyDocumentDraft);
  router.post(`/${adminSlug}`, requireAdmin, adminContentSettingsLimiter, adminController.createPolicyDocumentDraft);
  router.post(`/${adminSlug}/format`, requireAdmin, adminContentSettingsLimiter, adminController.formatNewPolicyDocumentDraft);
  router.post(`/${adminSlug}/preview`, requireAdmin, adminContentSettingsLimiter, adminController.previewNewPolicyDocumentDraft);
  router.get(`/${adminSlug}/:id`, requireAdmin, adminController.viewPolicyDocumentVersion);
  router.get(`/${adminSlug}/:id/edit`, requireAdmin, adminController.renderEditPolicyDocumentDraft);
  router.post(`/${adminSlug}/:id/save`, requireAdmin, adminContentSettingsLimiter, adminController.updatePolicyDocumentDraft);
  router.post(`/${adminSlug}/:id/format`, requireAdmin, adminContentSettingsLimiter, adminController.formatExistingPolicyDocumentDraft);
  router.post(`/${adminSlug}/:id/preview`, requireAdmin, adminContentSettingsLimiter, adminController.previewExistingPolicyDocumentDraft);
  router.post(`/${adminSlug}/:id/publish`, requireAdmin, requireFullAdmin, adminContentSettingsLimiter, adminController.publishPolicyDocumentDraft);
  router.post(`/${adminSlug}/:id/clone`, requireAdmin, adminContentSettingsLimiter, adminController.clonePolicyDocumentVersion);
  router.post(`/${adminSlug}/:id/archive`, requireAdmin, adminContentSettingsLimiter, adminController.archivePolicyDocumentVersion);
}

// Event promotion
router.get('/promote', requireAdmin, adminController.promotePage);
router.get('/promote/preview', requireAdmin, adminController.promotePreview);
router.post('/promote', requireAdmin, requireFullAdmin, adminPromotionLimiter, adminController.promoteSend);

// Blog moderation queue
router.get('/blog/review', requireAdmin, blogController.renderAdminQueuePage);
router.get('/blog/posts/:id/review', requireAdmin, blogController.renderAdminReviewPage);
router.post('/blog/posts/:id/assets-upload', requireAdmin, adminModerationLimiter, uploadService.uploadBlogAssets, requireCsrfProtection, blogController.uploadAdminBlogAssets);
router.post('/blog/posts/:id/approve-form', requireAdmin, adminModerationLimiter, blogController.approveBlogPostPage);
router.post('/blog/posts/:id/reject-form', requireAdmin, adminModerationLimiter, blogController.rejectBlogPostPage);
router.post('/blog/posts/:id/archive-form', requireAdmin, adminModerationLimiter, blogController.archiveBlogPostPage);

router.get('/blog/pending', requireAdmin, blogController.listPendingBlogs);
router.get('/blog/posts/:id', requireAdmin, blogController.previewBlogPost);
router.post('/blog/posts/:id/approve', requireAdmin, adminModerationLimiter, blogController.approveBlogPost);
router.post('/blog/posts/:id/reject', requireAdmin, adminModerationLimiter, blogController.rejectBlogPost);
router.post('/blog/posts/:id/archive', requireAdmin, adminModerationLimiter, blogController.archiveBlogPost);
router.patch('/blog/posts/:id/autosave', requireAdmin, adminBlogAutosaveLimiter, uploadService.uploadBlogAssets, requireCsrfProtection, blogController.autosaveBlogPostAdmin);

// Blog comment moderation
router.get('/blog/comments', requireAdmin, blogInteractionController.adminListComments);
router.post('/blog/comments/:commentId/remove', requireAdmin, adminModerationLimiter, blogInteractionController.adminRemoveComment);
router.post('/blog/comments/:commentId/restore', requireAdmin, adminModerationLimiter, blogInteractionController.adminRestoreComment);
router.get('/blog/reports', requireAdmin, blogInteractionController.adminListReports);
router.post('/blog/reports/:reportId/resolve', requireAdmin, adminModerationLimiter, blogInteractionController.adminResolveReport);
router.post('/blog/reports/:reportId/dismiss', requireAdmin, adminModerationLimiter, blogInteractionController.adminDismissReport);

module.exports = router;
