const express = require('express');
const router = express.Router();
const certificateVerificationController = require('../controllers/certificateVerification.controller');
const { requireCsrfProtection } = require('../middleware/csrf.middleware');
const { createRateLimiter } = require('../middleware/rate-limit.middleware');

const verificationLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  maxRequests: 60,
  message: 'Too many certificate verification attempts. Please try again later.',
  keyFn: (req) => `certificate-verify|${req.ip || 'unknown-ip'}`
});

router.get('/certificates/verify', verificationLimiter, certificateVerificationController.getVerificationSearch);
router.post('/certificates/verify', verificationLimiter, requireCsrfProtection, certificateVerificationController.postVerificationSearch);
router.get('/certificates/verify/:certificateNumber', verificationLimiter, certificateVerificationController.getVerificationResult);

module.exports = router;
