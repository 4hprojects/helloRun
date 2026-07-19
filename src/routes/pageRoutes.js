const express = require('express');
const logger = require('../utils/logger');
const fs = require('fs/promises');
const router = express.Router();
const pageController = require('../controllers/page.controller');
const blogInteractionController = require('../controllers/blog-interaction.controller');
const PrivacyPolicy = require('../models/PrivacyPolicy');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireCsrfProtection } = require('../middleware/csrf.middleware');
const { createRateLimiter } = require('../middleware/rate-limit.middleware');
const uploadService = require('../services/upload.service');
const { listPolicyDocuments } = require('../services/policy-registry.service');
const { markdownToHtml } = require('../utils/markdown');
const { sanitizeHtml } = require('../utils/sanitize');
const { buildPublicPolicyPresentation } = require('../services/public-policy-presentation.service');
const {
  COOKIE_NAME,
  cookieOptions,
  normalizePreferences,
  serializePreferences
} = require('../services/cookie-preference.service');

const paymentProofUploadLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  maxRequests: 8,
  message: 'Too many payment receipt submissions. Please wait a few minutes and try again.'
});
const contactOrganiserLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  maxRequests: 5,
  message: 'You have reached the hourly message limit for this event. Please wait up to one hour before contacting this organiser again.',
  keyFn: (req) => `contact-organiser|${req.session?.userId || req.ip || 'anon'}|${req.params.slug || ''}`
});
const resultSubmissionLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  maxRequests: 8,
  message: 'Too many result submissions. Please wait a few minutes and try again.',
  keyFn: (req) => `result-submission|${req.session?.userId || req.ip || 'anon'}`
});
const quickProfileUpdateLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  maxRequests: 15,
  message: 'Too many profile updates. Please wait a few minutes and try again.'
});

router.get('/', pageController.getHome);
router.post('/cookie-preferences', requireCsrfProtection, (req, res) => {
  const preferences = normalizePreferences(req.body || {});
  const serialized = serializePreferences(preferences, process.env.SESSION_SECRET);
  res.cookie(COOKIE_NAME, serialized, cookieOptions(process.env.NODE_ENV === 'production'));

  const acceptsJson = req.get('accept')?.includes('application/json') || req.xhr;
  if (acceptsJson) return res.json({ ok: true, preferences, reload: true });

  const requestedReturn = String(req.body?.returnTo || '').trim();
  const returnTo = requestedReturn.startsWith('/') && !requestedReturn.startsWith('//') && !/[\r\n]/.test(requestedReturn)
    ? requestedReturn
    : '/cookie-policy#cookie-choices';
  return res.redirect(returnTo);
});
router.get('/unsubscribe', requireAuth, async (req, res) => {
  try {
    const key = String(req.query.key || '').trim();
    if (key !== 'event.promotion') {
      return res.redirect('/runner/profile?section=notifications&type=error&msg=Unknown+email+preference.');
    }

    const user = await User.findById(req.session.userId).select('role').lean();
    await User.updateOne(
      { _id: req.session.userId },
      { $addToSet: { 'notificationPreferences.emailOptOut': key } }
    );

    if (user?.role !== 'runner') {
      return res.redirect('/');
    }

    return res.redirect('/runner/profile?section=notifications&type=success&msg=You+have+been+unsubscribed+from+event+promotion+emails.');
  } catch (error) {
    logger.error('Unsubscribe preference update failed:', error);
    return res.redirect('/runner/profile?section=notifications&type=error&msg=Unable+to+update+email+preference.');
  }
});

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
router.post(
  '/runner/submissions/:submissionId/edit-metadata',
  requireAuth,
  resultSubmissionLimiter,
  requireCsrfProtection,
  pageController.postEditSubmissionMetadata
);
router.get('/my-submissions/:submissionId/certificate', requireAuth, pageController.getSubmissionCertificateDownload);
router.get('/runners/:userId/badges/share-image.svg', pageController.getPublicRunnerBadgeCollectionShareImage);
router.get('/runners/:userId/badges', pageController.getPublicRunnerBadgeCollection);
router.get('/runners/:userId', pageController.getPublicRunnerProfile);
router.get('/badges/:userBadgeId/share-image.svg', pageController.getPublicBadgeShareImage);
router.get('/badges/:userBadgeId/open-badge.json', pageController.getPublicOpenBadgeMetadata);
router.get('/badges/:userBadgeId/verify', pageController.getPublicBadgeVerification);
router.get('/badges/:userBadgeId', pageController.getPublicBadgePage);
router.get('/events/:slug/badges', pageController.getEventBadges);
router.post('/events/:slug/contact-organiser', requireAuth, requireCsrfProtection, contactOrganiserLimiter, pageController.postContactOrganiser);
router.get('/events/:slug', pageController.getEventDetails);
router.get('/sitemap.xml', pageController.getSitemapXml);


// Blog public routes
router.get('/blog', pageController.getBlogList);
router.get('/blog/category/:categorySlug', pageController.getBlogCategoryPage);
router.get('/blog/tag/:tagSlug', pageController.getBlogTagPage);
router.get('/blog/:slug', pageController.getBlogPost);

const commentLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000,
  maxRequests: 10,
  message: 'Too many comments. Please wait a few minutes and try again.'
});
const commentEditLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000,
  maxRequests: 15,
  message: 'Too many comment edits. Please wait a few minutes and try again.',
  keyFn: (req) => `blog-comment-edit|${req.session?.userId || req.ip || 'anon'}`
});
const commentRevisionRedactionLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  maxRequests: 10,
  message: 'Too many revision redactions. Please wait before trying again.',
  keyFn: (req) => `blog-comment-redaction|${req.session?.userId || req.ip || 'anon'}`
});
const likeLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 30,
  message: 'Too many like requests. Please slow down.'
});

router.get('/blog/:slug/comments', blogInteractionController.listComments);
router.get('/blog/:slug/comments/:commentId/replies', blogInteractionController.listCommentReplies);
router.get('/blog/:slug/comments/:commentId/history', blogInteractionController.getCommentHistory);
router.post('/blog/:slug/comments', requireAuth, commentLimiter, requireCsrfProtection, blogInteractionController.createComment);
router.patch('/blog/:slug/comments/:commentId', requireAuth, commentEditLimiter, requireCsrfProtection, blogInteractionController.editComment);
router.delete('/blog/:slug/comments/:commentId', requireAuth, requireCsrfProtection, blogInteractionController.deleteComment);
router.post('/blog/:slug/comments/:commentId/history/:revisionId/redact', requireAuth, commentRevisionRedactionLimiter, requireCsrfProtection, blogInteractionController.redactCommentRevision);
router.post('/blog/:slug/like', requireAuth, likeLimiter, requireCsrfProtection, blogInteractionController.toggleLike);
router.post('/blog/:slug/report', requireAuth, requireCsrfProtection, blogInteractionController.reportPost);
router.post('/blog/:slug/comments/:commentId/report', requireAuth, requireCsrfProtection, blogInteractionController.reportComment);

router.get('/about', pageController.getAbout);

router.get('/how-it-works', pageController.getHowItWorks);

router.get('/contact', pageController.getContact);

router.get('/faq', pageController.getFaq);

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
        .select('contentHtml contentMarkdown versionNumber effectiveDate updatedAt summaryOfChanges')
        .lean();

      if (currentPolicy) {
        policyHtml = currentPolicy.contentHtml || buildPublicPolicyHtml(currentPolicy.contentMarkdown || '');
        policyMeta = {
          versionNumber: currentPolicy.versionNumber || '',
          effectiveDate: currentPolicy.effectiveDate || null,
          updatedAt: currentPolicy.updatedAt || null,
          summaryOfChanges: currentPolicy.summaryOfChanges || ''
        };
      }
    } catch (error) {
      logger.error(`${policyDocument.title} DB load error:`, error);
    }

    if (!policyHtml) {
      try {
        const fallbackMarkdown = await fs.readFile(policyDocument.fallbackFile, 'utf8');
        policyHtml = buildPublicPolicyHtml(fallbackMarkdown);
        policyLoadedFromFile = true;
        policyMeta = {
          versionNumber: policyDocument.fallbackVersion || '',
          effectiveDate: policyDocument.fallbackEffectiveDate || null,
          updatedAt: policyDocument.fallbackEffectiveDate || null
        };
      } catch (error) {
        if (error.code !== 'ENOENT') {
          logger.error(`${policyDocument.title} fallback load error:`, error);
        }
      }
    }

    const policyPresentation = buildPublicPolicyPresentation({ policyDocument, policyHtml, policyMeta });
    policyHtml = policyPresentation.contentHtml;
    const appBaseUrl = String(process.env.APP_BASE_URL || process.env.BASE_URL || 'https://hellorun.online').replace(/\/$/, '');
    return res.render('pages/policy', {
      title: `${policyDocument.title} - HelloRun`,
      seo: {
        description: policyDocument.key === 'terms'
          ? 'Read the HelloRun Terms and Conditions covering accounts, event participation, activity review, payments, community conduct, safety, and platform responsibilities.'
          : policyDocument.key === 'dataUsage'
            ? 'Understand how HelloRun uses account, registration, payment, activity, community, security, result, and recognition data across runner and organizer workflows.'
            : policyDocument.key === 'acceptableUse'
              ? 'Learn the HelloRun rules for fair accounts, events, payments, activity proof, community participation, participant data, automation, and platform security.'
            : policyDocument.key === 'organiserTerms'
              ? 'Review HelloRun organizer responsibilities for event publication, participant operations, payment and result review, safety, commerce, data handling, recognition, and closure.'
            : policyDocument.key === 'communityGuidelines'
              ? 'Learn how to participate respectfully in HelloRun blogs, comments, running groups, event discussions, profiles, messages, and community reporting.'
            : policyDocument.key === 'refund'
              ? 'Understand HelloRun registration and shop cancellations, refund requests, duplicate payments, event changes, organizer responsibilities, and available remedies.'
            : policyDocument.key === 'cookie'
              ? 'Learn which cookies and browser storage HelloRun uses, what is essential, how optional Analytics and Advertising work, and how to manage your choices.'
            : `Read the current HelloRun ${policyDocument.title}.`,
        canonicalUrl: `${appBaseUrl}${policyDocument.publicPath}`
      },
      policyDocument,
      policyHtml,
      policyLoadedFromFile,
      policyMeta,
      policyPresentation
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
