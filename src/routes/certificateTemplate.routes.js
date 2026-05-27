const express = require('express');
const router = express.Router();
const certificateTemplateController = require('../controllers/certificateTemplate.controller');
const uploadService = require('../services/upload.service');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireCsrfProtection } = require('../middleware/csrf.middleware');

router.get('/events/:eventId/certificate', requireAuth, certificateTemplateController.getCertificateSetup);
router.post('/events/:eventId/certificate', requireAuth, requireCsrfProtection, certificateTemplateController.postCertificateSetup);
router.post('/events/:eventId/certificate/assets', requireAuth, uploadService.uploadCertificateAssets, requireCsrfProtection, certificateTemplateController.postCertificateAssets);
router.post('/events/:eventId/certificate/preview', requireAuth, requireCsrfProtection, certificateTemplateController.postCertificatePreview);
router.post('/events/:eventId/certificate/publish', requireAuth, requireCsrfProtection, certificateTemplateController.postCertificatePublish);
router.post('/events/:eventId/certificate/archive', requireAuth, requireCsrfProtection, certificateTemplateController.postCertificateArchive);

module.exports = router;
