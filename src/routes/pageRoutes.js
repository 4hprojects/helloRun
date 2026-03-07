const express = require('express');
const router = express.Router();
const pageController = require('../controllers/page.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { createRateLimiter } = require('../middleware/rate-limit.middleware');
const uploadService = require('../services/upload.service');

const paymentProofUploadLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  maxRequests: 8,
  message: 'Too many payment proof submissions. Please wait a few minutes and try again.'
});
const resultSubmissionLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  maxRequests: 8,
  message: 'Too many result submissions. Please wait a few minutes and try again.'
});

router.get('/', (req, res) => {
  res.render('pages/home', {
    title: 'helloRun - Virtual Running Events'
  });
});

router.get('/events', pageController.getEvents);
router.get('/my-registrations', requireAuth, pageController.getMyRegistrations);
router.get('/events/:slug/register', requireAuth, pageController.getEventRegistrationForm);
router.post('/events/:slug/register', requireAuth, pageController.postEventRegistration);
router.post(
  '/my-registrations/:registrationId/payment-proof',
  requireAuth,
  paymentProofUploadLimiter,
  uploadService.uploadPaymentProof,
  pageController.postUploadPaymentProof
);
router.post(
  '/my-registrations/:registrationId/submit-result',
  requireAuth,
  resultSubmissionLimiter,
  uploadService.uploadResultProof,
  pageController.postSubmitResult
);
router.post(
  '/my-registrations/:registrationId/resubmit-result',
  requireAuth,
  resultSubmissionLimiter,
  uploadService.uploadResultProof,
  pageController.postResubmitResult
);
router.get('/my-submissions/:submissionId/certificate', requireAuth, pageController.getSubmissionCertificateDownload);
router.get('/events/:slug', pageController.getEventDetails);

router.get('/blog', pageController.getBlogList);
router.get('/blog/:slug', pageController.getBlogPost);

router.get('/about', (req, res) => {
  res.render('pages/about', {
    title: 'About - helloRun'
  });
});

router.get('/how-it-works', (req, res) => {
  res.render('pages/how-it-works', {
    title: 'How It Works - helloRun'
  });
});

router.get('/contact', (req, res) => {
  res.render('pages/contact', {
    title: 'Contact - helloRun'
  });
});

router.get('/faq', (req, res) => {
  res.render('pages/faq', {
    title: 'FAQ - helloRun'
  });
});

router.get('/privacy', (req, res) => {
  res.render('pages/privacy', {
    title: 'Privacy Policy - helloRun'
  });
});

router.get('/terms', (req, res) => {
  res.render('pages/terms', {
    title: 'Terms of Service - helloRun'
  });
});

router.get('/leaderboard', pageController.getLeaderboard);

module.exports = router;
