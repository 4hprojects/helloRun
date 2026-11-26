'use strict';

const express = require('express');
const controller = require('../controllers/raceBib.controller');
const uploadService = require('../services/upload.service');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireCsrfProtection } = require('../middleware/csrf.middleware');

const router = express.Router();
router.use(requireAuth);
router.get('/events/:eventId/bib-design', controller.getDesign);
router.post('/events/:eventId/bib-design', requireCsrfProtection, controller.postSaveDesign);
router.post('/events/:eventId/bib-design/artwork', uploadService.uploadRaceBibArtwork, requireCsrfProtection, controller.postArtwork);
router.post('/events/:eventId/bib-design/preview', requireCsrfProtection, controller.postPreview);
router.post('/events/:eventId/bib-design/copy', requireCsrfProtection, controller.postCopy);
router.post('/events/:eventId/bib-design/publish', requireCsrfProtection, controller.postPublish);
router.post('/events/:eventId/bib-design/release', requireCsrfProtection, controller.postRelease);
router.post('/events/:eventId/bib-design/pause', requireCsrfProtection, controller.postPause);
router.get('/events/:eventId/bib-design/export.pdf', controller.getOrganizerExport);

module.exports = router;
