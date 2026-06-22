const express = require('express');
const router = express.Router();
const runnerController = require('../controllers/runner.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireCsrfProtection } = require('../middleware/csrf.middleware');
const { createRateLimiter } = require('../middleware/rate-limit.middleware');
const uploadService = require('../services/upload.service');
const User = require('../models/User');

const profileUpdateLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  maxRequests: 15,
  message: 'Too many profile update requests. Please wait a few minutes and try again.'
});

const groupActionLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  maxRequests: 10,
  message: 'Too many group actions. Please wait a few minutes and try again.'
});

router.use((req, res, next) => {
  if (req.method === 'POST') {
    // Skip blanket CSRF check for multipart/form-data — multer hasn't parsed the body yet
    // at this point, so req.body._csrf is unavailable. Multipart organizer routes run
    // requireCsrfProtection explicitly after their multer middleware.
    const contentType = String(req.headers['content-type'] || '');
    if (contentType.startsWith('multipart/form-data')) {
      return next();
    }
    return requireCsrfProtection(req, res, next);
  }
  return next();
});

router.get('/runner/dashboard', requireAuth, runnerController.getDashboard);
router.get('/runner/dashboard/refresh', requireAuth, runnerController.getDashboardRefresh);
router.get('/runner/dashboard/result-submissions', requireAuth, runnerController.getDashboardResultSubmissions);
router.get('/runner/dashboard/badges', requireAuth, runnerController.getRunnerBadges);
router.get('/runner/dashboard/badge-progress', requireAuth, runnerController.getRunnerBadgeProgress);
router.get('/runner/submissions/eligible', requireAuth, runnerController.getEligibleResultSubmissionOptions);
router.get('/runner/profile', requireAuth, runnerController.getProfilePage);
router.get('/runner/profile/badges', requireAuth, runnerController.getRunnerBadges);
router.get('/runner/profile/badge-progress', requireAuth, runnerController.getRunnerBadgeProgress);
router.get('/runner/notifications', requireAuth, runnerController.getNotifications);
router.get('/runner/groups', requireAuth, runnerController.getRunningGroupsPage);
router.get('/runner/groups/create', requireAuth, runnerController.getCreateRunningGroupPage);
router.get('/runner/submissions', requireAuth, runnerController.getRunnerSubmissionsPage);
router.get('/runner/submissions/:submissionId/proof', requireAuth, runnerController.getRunnerSubmissionProof);
router.get('/runner/submissions/:submissionId', requireAuth, runnerController.getRunnerSubmissionDetailPage);
router.get('/runner/groups/:slug', requireAuth, runnerController.getRunningGroupDetail);
router.get('/runner/security/password', requireAuth, runnerController.getPasswordSettings);
router.post('/runner/profile', requireAuth, profileUpdateLimiter, runnerController.updateProfile);
router.post('/runner/profile/identity', requireAuth, profileUpdateLimiter, runnerController.updateProfileIdentity);
router.post('/runner/profile/contact', requireAuth, profileUpdateLimiter, runnerController.updateProfileContact);
router.post('/runner/profile/emergency', requireAuth, profileUpdateLimiter, runnerController.updateProfileEmergency);
router.post('/runner/profile/badges/featured', requireAuth, profileUpdateLimiter, runnerController.updateFeaturedBadge);
router.post('/runner/security/password', requireAuth, profileUpdateLimiter, runnerController.updatePasswordSettings);
router.post('/runner/auth/google/unlink', requireAuth, profileUpdateLimiter, runnerController.unlinkGoogleAuth);
router.post('/runner/notifications/read-all', requireAuth, runnerController.markAllNotificationsRead);
router.post('/runner/notifications/:notificationId/read', requireAuth, runnerController.markNotificationRead);
router.post('/runner/groups/create', requireAuth, groupActionLimiter, runnerController.createRunningGroup);
router.post('/runner/groups/join', requireAuth, groupActionLimiter, runnerController.joinRunningGroup);
router.post('/runner/groups/leave', requireAuth, groupActionLimiter, runnerController.leaveRunningGroup);

router.post('/runner/profile/avatar', requireAuth, uploadService.uploadAvatarImage, requireCsrfProtection, async (req, res) => {
  try {
    if (req.uploadError) return res.status(400).json({ success: false, message: req.uploadError });
    if (!req.file) return res.status(400).json({ success: false, message: 'No image file provided.' });

    const uploaded = await uploadService.uploadBufferToR2({
      userId: String(req.session.userId),
      buffer: req.file.buffer,
      contentType: req.file.mimetype,
      category: 'avatar-images',
      fileName: req.file.originalname || 'avatar.jpg'
    });

    await User.updateOne({ _id: req.session.userId }, { $set: { avatarUrl: uploaded.url } });

    return res.json({ success: true, avatarUrl: uploaded.url });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Avatar upload failed.' });
  }
});

module.exports = router;
