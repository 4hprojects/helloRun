const express = require('express');
const fs = require('fs/promises');
const router = express.Router();
const pageController = require('../controllers/page.controller');
const blogInteractionController = require('../controllers/blog-interaction.controller');
const PrivacyPolicy = require('../models/PrivacyPolicy');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireCsrfProtection } = require('../middleware/csrf.middleware');
const { createRateLimiter } = require('../middleware/rate-limit.middleware');
const uploadService = require('../services/upload.service');
const { listPolicyDocuments } = require('../services/policy-registry.service');
const { markdownToHtml } = require('../utils/markdown');
const { sanitizeHtml } = require('../utils/sanitize');

const paymentProofUploadLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  maxRequests: 8,
  message: 'Too many payment receipt submissions. Please wait a few minutes and try again.'
});
const resultSubmissionLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  maxRequests: 8,
  message: 'Too many result submissions. Please wait a few minutes and try again.'
});
const quickProfileUpdateLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  maxRequests: 15,
  message: 'Too many profile updates. Please wait a few minutes and try again.'
});

router.get('/', pageController.getHome);

router.get('/events', pageController.getEvents);
router.get('/my-registrations', requireAuth, pageController.getMyRegistrations);
router.get('/events/:slug/register', requireAuth, pageController.getEventRegistrationForm);
router.post('/events/:slug/register', requireAuth, requireCsrfProtection, pageController.postEventRegistration);
router.get('/events/:slug/leaderboard', pageController.getEventLeaderboardPage);
router.get('/events/:slug/leaderboard/data', pageController.getEventLeaderboardData);
router.get('/events/:slug/leaderboard/my-standing', pageController.getEventLeaderboardMyStanding);
router.post('/profile/quick-update', requireAuth, requireCsrfProtection, quickProfileUpdateLimiter, pageController.postQuickProfileUpdate);
router.post(
  '/my-registrations/:registrationId/payment-proof',
  requireAuth,
  paymentProofUploadLimiter,
  uploadService.uploadPaymentProof,
  requireCsrfProtection,
  pageController.postUploadPaymentProof
);
router.post(
  '/my-registrations/:registrationId/submit-result',
  requireAuth,
  resultSubmissionLimiter,
  uploadService.uploadResultProof,
  requireCsrfProtection,
  pageController.postSubmitResult
);
router.post(
  '/my-registrations/:registrationId/resubmit-result',
  requireAuth,
  resultSubmissionLimiter,
  uploadService.uploadResultProof,
  requireCsrfProtection,
  pageController.postResubmitResult
);
router.get('/my-submissions/:submissionId/certificate', requireAuth, pageController.getSubmissionCertificateDownload);
router.get('/runners/:userId/badges/share-image.svg', pageController.getPublicRunnerBadgeCollectionShareImage);
router.get('/runners/:userId/badges', pageController.getPublicRunnerBadgeCollection);
router.get('/badges/:userBadgeId/share-image.svg', pageController.getPublicBadgeShareImage);
router.get('/badges/:userBadgeId/open-badge.json', pageController.getPublicOpenBadgeMetadata);
router.get('/badges/:userBadgeId/verify', pageController.getPublicBadgeVerification);
router.get('/badges/:userBadgeId', pageController.getPublicBadgePage);
router.get('/events/:slug/badges', pageController.getEventBadges);
router.get('/events/:slug', pageController.getEventDetails);
router.get('/sitemap.xml', pageController.getSitemapXml);

router.get('/blog', pageController.getBlogList);
router.get('/blog/:slug', pageController.getBlogPost);

const commentLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000,
  maxRequests: 10,
  message: 'Too many comments. Please wait a few minutes and try again.'
});
const likeLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 30,
  message: 'Too many like requests. Please slow down.'
});

router.get('/blog/:slug/comments', blogInteractionController.listComments);
router.post('/blog/:slug/comments', requireAuth, commentLimiter, requireCsrfProtection, blogInteractionController.createComment);
router.delete('/blog/:slug/comments/:commentId', requireAuth, requireCsrfProtection, blogInteractionController.deleteComment);
router.post('/blog/:slug/like', requireAuth, likeLimiter, requireCsrfProtection, blogInteractionController.toggleLike);
router.post('/blog/:slug/report', requireAuth, requireCsrfProtection, blogInteractionController.reportPost);
router.post('/blog/:slug/comments/:commentId/report', requireAuth, requireCsrfProtection, blogInteractionController.reportComment);

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
    title: 'Contact - helloRun',
    source: req.query.source || ''
  });
});

router.get('/faq', (req, res) => {
  res.render('pages/faq', {
    title: 'FAQ - helloRun'
  });
});

const PUBLIC_POLICY_ALLOWED_TAGS = ['h1', 'h2', 'h3', 'h4', 'p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'blockquote', 'a', 'code', 'pre', 'hr'];
const PUBLIC_POLICY_ALLOWED_ATTRIBUTES = {
  a: ['href', 'rel', 'target']
};

function buildPublicPolicyHtml(markdown) {
  return sanitizeHtml(markdownToHtml(markdown || ''), {
    allowedTags: PUBLIC_POLICY_ALLOWED_TAGS,
    allowedAttributes: PUBLIC_POLICY_ALLOWED_ATTRIBUTES
  });
}

function createPolicyPageRenderer(policyDocument) {
  return async (req, res) => {
    let policyHtml = '';
    let policyLoadedFromFile = false;
    let policyMeta = null;

    try {
      const currentPolicy = await PrivacyPolicy.findOne({
        slug: policyDocument.slug,
        status: 'published',
        isCurrent: true
      })
        .select('contentHtml contentMarkdown versionNumber effectiveDate updatedAt')
        .lean();

      if (currentPolicy) {
        policyHtml = currentPolicy.contentHtml || buildPublicPolicyHtml(currentPolicy.contentMarkdown || '');
        policyMeta = {
          versionNumber: currentPolicy.versionNumber || '',
          effectiveDate: currentPolicy.effectiveDate || null,
          updatedAt: currentPolicy.updatedAt || null
        };
      }
    } catch (error) {
      console.error(`${policyDocument.title} DB load error:`, error);
    }

    if (!policyHtml) {
      try {
        const fallbackMarkdown = await fs.readFile(policyDocument.fallbackFile, 'utf8');
        policyHtml = buildPublicPolicyHtml(fallbackMarkdown);
        policyLoadedFromFile = true;
        policyMeta = {
          versionNumber: '',
          effectiveDate: null,
          updatedAt: null
        };
      } catch (error) {
        if (error.code !== 'ENOENT') {
          console.error(`${policyDocument.title} fallback load error:`, error);
        }
      }
    }

    return res.render('pages/policy', {
      title: `${policyDocument.title} - helloRun`,
      policyDocument,
      policyHtml,
      policyLoadedFromFile,
      policyMeta
    });
  };
}

for (const policyDocument of listPolicyDocuments()) {
  const renderer = createPolicyPageRenderer(policyDocument);
  router.get(policyDocument.publicPath, renderer);
  for (const alias of policyDocument.aliases || []) {
    router.get(alias, renderer);
  }
}

router.get('/leaderboard', pageController.getLeaderboard);

module.exports = router;
