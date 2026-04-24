const express = require('express');
const fs = require('fs/promises');
const path = require('path');
const router = express.Router();
const pageController = require('../controllers/page.controller');
const blogInteractionController = require('../controllers/blog-interaction.controller');
const PrivacyPolicy = require('../models/PrivacyPolicy');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireCsrfProtection } = require('../middleware/csrf.middleware');
const { createRateLimiter } = require('../middleware/rate-limit.middleware');
const uploadService = require('../services/upload.service');
const { markdownToHtml } = require('../utils/markdown');
const { sanitizeHtml } = require('../utils/sanitize');

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
const quickProfileUpdateLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  maxRequests: 15,
  message: 'Too many profile updates. Please wait a few minutes and try again.'
});

router.get('/', (req, res) => {
  res.render('pages/home', {
    title: 'helloRun - Virtual Running Events'
  });
});

router.get('/events', pageController.getEvents);
router.get('/my-registrations', requireAuth, pageController.getMyRegistrations);
router.get('/events/:slug/register', requireAuth, pageController.getEventRegistrationForm);
router.post('/events/:slug/register', requireAuth, requireCsrfProtection, pageController.postEventRegistration);
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
    title: 'Contact - helloRun'
  });
});

router.get('/faq', (req, res) => {
  res.render('pages/faq', {
    title: 'FAQ - helloRun'
  });
});

async function renderCookiePolicyPage(req, res) {
  try {
    const currentPolicy = await PrivacyPolicy.findOne({
      slug: 'cookie-policy',
      status: 'published',
      isCurrent: true
    })
      .select('contentHtml contentMarkdown versionNumber effectiveDate updatedAt')
      .lean();

    if (currentPolicy) {
      const policyHtml = currentPolicy.contentHtml || sanitizeHtml(markdownToHtml(currentPolicy.contentMarkdown || ''), {
        allowedTags: ['h1', 'h2', 'h3', 'h4', 'p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'blockquote', 'a', 'code', 'pre', 'hr'],
        allowedAttributes: {
          a: ['href', 'rel', 'target']
        }
      });

      return res.render('pages/cookie-policy', {
        title: 'Cookie Policy - helloRun',
        policyHtml,
        policyLoadedFromFile: true,
        policyMeta: {
          versionNumber: currentPolicy.versionNumber || '',
          effectiveDate: currentPolicy.effectiveDate || null,
          updatedAt: currentPolicy.updatedAt || null
        }
      });
    }
  } catch (error) {
    console.error('Cookie policy DB load error:', error);
  }

  try {
    const fallbackPath = path.resolve(__dirname, '../../docs/contents/Cookie Policy.md');
    const fallbackMarkdown = await fs.readFile(fallbackPath, 'utf8');
    const policyHtml = sanitizeHtml(markdownToHtml(fallbackMarkdown), {
      allowedTags: ['h1', 'h2', 'h3', 'h4', 'p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'blockquote', 'a', 'code', 'pre', 'hr'],
      allowedAttributes: {
        a: ['href', 'rel', 'target']
      }
    });

    return res.render('pages/cookie-policy', {
      title: 'Cookie Policy - helloRun',
      policyHtml,
      policyLoadedFromFile: true,
      policyMeta: {
        versionNumber: '',
        effectiveDate: null,
        updatedAt: null
      }
    });
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error('Cookie policy fallback load error:', error);
    }

    return res.render('pages/cookie-policy', {
      title: 'Cookie Policy - helloRun',
      policyHtml: '',
      policyLoadedFromFile: false,
      policyMeta: null
    });
  }
}

router.get('/cookie-policy', renderCookiePolicyPage);
router.get('/cookies', renderCookiePolicyPage);

router.get('/privacy', async (req, res) => {
  try {
    const currentPolicy = await PrivacyPolicy.findOne({
      slug: 'privacy-policy',
      status: 'published',
      isCurrent: true
    })
      .select('contentHtml contentMarkdown versionNumber effectiveDate updatedAt')
      .lean();

    if (currentPolicy) {
      const policyHtml = currentPolicy.contentHtml || sanitizeHtml(markdownToHtml(currentPolicy.contentMarkdown || ''), {
        allowedTags: ['h1', 'h2', 'h3', 'h4', 'p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'blockquote', 'a', 'code', 'pre', 'hr'],
        allowedAttributes: {
          a: ['href', 'rel', 'target']
        }
      });

      return res.render('pages/privacy', {
        title: 'Privacy Policy - helloRun',
        policyHtml,
        policyLoadedFromFile: true,
        policyMeta: {
          versionNumber: currentPolicy.versionNumber || '',
          effectiveDate: currentPolicy.effectiveDate || null,
          updatedAt: currentPolicy.updatedAt || null
        }
      });
    }
  } catch (error) {
    console.error('Privacy policy DB load error:', error);
  }

  try {
    const fallbackPath = path.resolve(__dirname, '../../docs/contents/Privacy Policy.md');
    const fallbackMarkdown = await fs.readFile(fallbackPath, 'utf8');
    const policyHtml = sanitizeHtml(markdownToHtml(fallbackMarkdown), {
      allowedTags: ['h1', 'h2', 'h3', 'h4', 'p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'blockquote', 'a', 'code', 'pre', 'hr'],
      allowedAttributes: {
        a: ['href', 'rel', 'target']
      }
    });

    return res.render('pages/privacy', {
      title: 'Privacy Policy - helloRun',
      policyHtml,
      policyLoadedFromFile: true,
      policyMeta: {
        versionNumber: '',
        effectiveDate: null,
        updatedAt: null
      }
    });
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error('Privacy policy fallback load error:', error);
    }

    return res.render('pages/privacy', {
      title: 'Privacy Policy - helloRun',
      policyHtml: '',
      policyLoadedFromFile: false,
      policyMeta: null
    });
  }
});

router.get('/terms', async (req, res) => {
  try {
    const currentPolicy = await PrivacyPolicy.findOne({
      slug: 'terms-of-service',
      status: 'published',
      isCurrent: true
    })
      .select('contentHtml contentMarkdown versionNumber effectiveDate updatedAt')
      .lean();

    if (currentPolicy) {
      const policyHtml = currentPolicy.contentHtml || sanitizeHtml(markdownToHtml(currentPolicy.contentMarkdown || ''), {
        allowedTags: ['h1', 'h2', 'h3', 'h4', 'p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'blockquote', 'a', 'code', 'pre', 'hr'],
        allowedAttributes: {
          a: ['href', 'rel', 'target']
        }
      });

      return res.render('pages/terms', {
        title: 'Terms and Conditions - helloRun',
        policyHtml,
        policyLoadedFromFile: true,
        policyMeta: {
          versionNumber: currentPolicy.versionNumber || '',
          effectiveDate: currentPolicy.effectiveDate || null,
          updatedAt: currentPolicy.updatedAt || null
        }
      });
    }
  } catch (error) {
    console.error('Terms and conditions DB load error:', error);
  }

  try {
    const fallbackPath = path.resolve(__dirname, '../../docs/contents/Terms and Conditions.md');
    const fallbackMarkdown = await fs.readFile(fallbackPath, 'utf8');
    const policyHtml = sanitizeHtml(markdownToHtml(fallbackMarkdown), {
      allowedTags: ['h1', 'h2', 'h3', 'h4', 'p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'blockquote', 'a', 'code', 'pre', 'hr'],
      allowedAttributes: {
        a: ['href', 'rel', 'target']
      }
    });

    return res.render('pages/terms', {
      title: 'Terms and Conditions - helloRun',
      policyHtml,
      policyLoadedFromFile: true,
      policyMeta: {
        versionNumber: '',
        effectiveDate: null,
        updatedAt: null
      }
    });
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error('Terms and conditions fallback load error:', error);
    }

    return res.render('pages/terms', {
      title: 'Terms and Conditions - helloRun',
      policyHtml: '',
      policyLoadedFromFile: false,
      policyMeta: null
    });
  }
});

router.get('/leaderboard', pageController.getLeaderboard);

module.exports = router;
