const express = require('express');
const router = express.Router();
const { requireAdmin, requireFullAdmin } = require('../middleware/auth.middleware');
const { requireCsrfProtection } = require('../middleware/csrf.middleware');
const { createRateLimiter } = require('../middleware/rate-limit.middleware');
const uploadService = require('../services/upload.service');
const controller = require('../controllers/admin/ocr-training.controller');
const dataController = require('../controllers/admin/ocr-training-data.controller');

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
router.get('/audit', controller.renderAudit);

module.exports = router;
module.exports._limiters = { ocrMutationLimiter, ocrTestLimiter, requireFullAdmin };
