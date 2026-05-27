const express = require('express');
const router = express.Router();
const certificateController = require('../controllers/certificate.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireCsrfProtection } = require('../middleware/csrf.middleware');

router.post('/events/:eventId/certificates/regenerate/:certificateId', requireAuth, requireCsrfProtection, certificateController.regenerateCertificate);
router.post('/events/:eventId/certificates/revoke/:certificateId', requireAuth, requireCsrfProtection, certificateController.revokeCertificate);

module.exports = router;
