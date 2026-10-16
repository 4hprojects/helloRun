const express = require('express');
const router = express.Router();
const { requireAdmin, requireFullAdmin, isFullAdminTier } = require('../middleware/auth.middleware');
const User = require('../models/User');
const { requireCsrfProtection } = require('../middleware/csrf.middleware');
const { createRateLimiter } = require('../middleware/rate-limit.middleware');
const uploadService = require('../services/upload.service');
const controller = require('../controllers/admin/ocr-training.controller');
const dataController = require('../controllers/admin/ocr-training-data.controller');
const modelsController = require('../controllers/admin/ocr-training-models.controller');
const insightsController = require('../controllers/admin/ocr-training-insights.controller');

// OCR Training Center (docs/improvement-plan/ocr-platform-aware). Mounted at
// /admin/ocr-training. Every route requires an admin; model activation and rollback
// require the full admin tier. CSRF is enforced on every non-multipart mutation here and
// explicitly after Multer on the one multipart route.

const actorKey = (prefix) => (req) => `${prefix}|${String(req.session?.userId || 'anon')}`;
const ocrMutationLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  maxRequests: 60,
  message: 'Too many OCR administration actions. Please wait and try again.',
  keyFn: actorKey('ocr-admin-mutation')
});
const ocrTestLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  maxRequests: 10,
  message: 'Too many Test OCR runs. Please wait a few minutes and try again.',
  keyFn: actorKey('ocr-admin-test')
});

router.use(requireAdmin);
// Lets pages show or hide deployment controls; the deployment routes still enforce the tier.
async function attachAdminTier(req, res, next) {
  try {
    const user = await User.findById(req.session.userId).select('adminTier').lean();
    res.locals.isFullAdmin = isFullAdminTier(user);
    next();
  } catch (error) {
    next(error);
  }
}
const ocrExportLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  maxRequests: 10,
  message: 'Too many exports. Please wait a few minutes and try again.',
  keyFn: actorKey('ocr-admin-export')
});
const ocrTestEmailLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  maxRequests: 5,
  message: 'Too many test emails. Please wait an hour and try again.',
  keyFn: actorKey('ocr-admin-test-email')
});
const ocrDeployLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  maxRequests: 10,
  message: 'Too many model deployment actions. Please wait and try again.',
  keyFn: actorKey('ocr-admin-deploy')
});
router.use((req, res, next) => {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(String(req.method || '').toUpperCase())) return next();
  if (String(req.headers['content-type'] || '').startsWith('multipart/form-data')) return next();
  return requireCsrfProtection(req, res, next);
});

router.get('/', controller.renderOverview);
router.get('/platforms', controller.renderPlatforms);
router.post('/platforms/test', ocrTestLimiter, uploadService.uploadOcrTestImage, requireCsrfProtection, controller.testOcr);
router.post('/platforms/:profileId/status', ocrMutationLimiter, controller.updateProfileStatus);
router.post('/entries/:kind/:entryId/reprocess', ocrMutationLimiter, controller.reprocessEntry);
router.get('/samples', dataController.renderSamples);
router.post('/samples/upload', ocrTestLimiter, uploadService.uploadOcrTestImage, requireCsrfProtection, dataController.uploadTrainingScreenshot);
router.post('/samples/participant-exclusion', ocrMutationLimiter, dataController.excludeRunnerSamples);
router.post('/samples/:sampleId/review', ocrMutationLimiter, dataController.reviewSample);
router.post('/datasets', ocrMutationLimiter, dataController.createDataset);
router.get('/datasets/:datasetId/manifest.json', dataController.downloadDatasetManifest);
router.get('/jobs', modelsController.renderJobs);
router.post('/jobs', ocrMutationLimiter, modelsController.startJob);
router.get('/jobs/:jobId', modelsController.getJob);
router.get('/jobs/:jobId/log', modelsController.downloadJobLog);
router.post('/jobs/:jobId/cancel', ocrMutationLimiter, modelsController.cancelJob);
router.get('/models', attachAdminTier, modelsController.renderModels);
router.post('/models/:modelId/approve', requireFullAdmin, ocrDeployLimiter, modelsController.approveModel);
router.post('/models/:modelId/activate', requireFullAdmin, ocrDeployLimiter, modelsController.activateModel);
router.post('/models/rollback', requireFullAdmin, ocrDeployLimiter, modelsController.rollbackModel);
router.get('/analytics', attachAdminTier, insightsController.renderAnalytics);
router.get('/analytics/research-export.csv', requireFullAdmin, ocrExportLimiter, insightsController.exportResearchCsv);
router.get('/settings', attachAdminTier, insightsController.renderSettings);
router.post('/settings', requireFullAdmin, ocrMutationLimiter, insightsController.updateSettings);
router.post('/settings/test-email', ocrTestEmailLimiter, insightsController.sendTestEmail);
router.get('/audit', controller.renderAudit);

module.exports = router;
module.exports._limiters = { ocrMutationLimiter, ocrTestLimiter, ocrDeployLimiter, requireFullAdmin };
