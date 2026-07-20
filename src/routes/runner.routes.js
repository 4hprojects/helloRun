const express = require('express');
const router = express.Router();
const runnerController = require('../controllers/runner.controller');
const groupCommunityController = require('../controllers/running-group-community.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireCsrfProtection } = require('../middleware/csrf.middleware');
const { createRateLimiter } = require('../middleware/rate-limit.middleware');
const uploadService = require('../services/upload.service');
const User = require('../models/User');
const Event = require('../models/Event');

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

const groupCommunityLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000,
  maxRequests: 20,
  message: 'Too many community actions. Please wait a few minutes and try again.'
});

const submissionEligibilityLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 30,
  message: 'Too many submission eligibility checks. Please wait a moment and try again.'
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
router.get('/runner/submissions/eligible', requireAuth, submissionEligibilityLimiter, runnerController.getEligibleResultSubmissionOptions);
router.get('/runner/profile', requireAuth, runnerController.getProfilePage);
router.get('/runner/profile/badges', requireAuth, runnerController.getRunnerBadges);
router.get('/runner/profile/badge-progress', requireAuth, runnerController.getRunnerBadgeProgress);
router.get('/runner/notifications', requireAuth, runnerController.getNotifications);
router.get('/runner/groups', requireAuth, runnerController.getRunningGroupsPage);
router.get('/runner/groups/create', requireAuth, runnerController.getCreateRunningGroupPage);
router.get('/runner/submissions', requireAuth, runnerController.getRunnerSubmissionsPage);
router.get('/runner/submissions/:submissionId/proof', requireAuth, runnerController.getRunnerSubmissionProof);
router.get('/runner/submissions/:submissionId', requireAuth, runnerController.getRunnerSubmissionDetailPage);
router.get('/runner/groups/:slug/announcements/:announcementId/comments', requireAuth, groupCommunityController.listComments);
router.get('/runner/groups/:slug/announcements/:announcementId/comments/:commentId/replies', requireAuth, groupCommunityController.listReplies);
router.get('/runner/groups/:slug/announcements/:announcementId/comments/:commentId/history', requireAuth, groupCommunityController.commentHistory);
router.post('/runner/groups/:slug/announcements', requireAuth, groupCommunityLimiter, groupCommunityController.createAnnouncement);
router.get('/runner/groups/:slug/announcements/:announcementId/history', requireAuth, groupCommunityController.announcementHistory);
router.patch('/runner/groups/:slug/announcements/:announcementId', requireAuth, groupCommunityLimiter, requireCsrfProtection, groupCommunityController.editAnnouncement);
router.delete('/runner/groups/:slug/announcements/:announcementId', requireAuth, groupCommunityLimiter, requireCsrfProtection, groupCommunityController.deleteAnnouncement);
router.post('/runner/groups/:slug/announcements/:announcementId/history/:revisionId/redact', requireAuth, groupCommunityLimiter, groupCommunityController.redactAnnouncementRevision);
router.post('/runner/groups/:slug/announcements/:announcementId/report', requireAuth, groupCommunityLimiter, groupCommunityController.reportAnnouncement);
router.post('/runner/groups/:slug/announcements/:announcementId/comments', requireAuth, groupCommunityLimiter, groupCommunityController.createComment);
router.patch('/runner/groups/:slug/announcements/:announcementId/comments/:commentId', requireAuth, groupCommunityLimiter, requireCsrfProtection, groupCommunityController.editComment);
router.delete('/runner/groups/:slug/announcements/:announcementId/comments/:commentId', requireAuth, groupCommunityLimiter, requireCsrfProtection, groupCommunityController.deleteComment);
router.post('/runner/groups/:slug/announcements/:announcementId/comments/:commentId/report', requireAuth, groupCommunityLimiter, groupCommunityController.reportComment);
router.post('/runner/groups/:slug/announcements/:announcementId/comments/:commentId/history/:revisionId/redact', requireAuth, groupCommunityLimiter, groupCommunityController.redactCommentRevision);
router.get('/runner/groups/:slug', requireAuth, runnerController.getRunningGroupDetail);
router.get('/runner/security/password', requireAuth, runnerController.getPasswordSettings);
router.post('/runner/profile', requireAuth, profileUpdateLimiter, runnerController.updateProfile);
router.post('/runner/profile/identity', requireAuth, profileUpdateLimiter, runnerController.updateProfileIdentity);
router.post('/runner/profile/contact', requireAuth, profileUpdateLimiter, runnerController.updateProfileContact);
router.post('/runner/profile/location', requireAuth, profileUpdateLimiter, runnerController.updateProfileLocation);
router.post('/runner/profile/emergency', requireAuth, profileUpdateLimiter, runnerController.updateProfileEmergency);
router.post('/runner/profile/badges/featured', requireAuth, profileUpdateLimiter, runnerController.updateFeaturedBadge);
router.post('/runner/security/password', requireAuth, profileUpdateLimiter, runnerController.updatePasswordSettings);
router.post('/runner/profile/notifications', requireAuth, profileUpdateLimiter, runnerController.updateNotificationSettings);
router.post('/runner/auth/google/unlink', requireAuth, profileUpdateLimiter, runnerController.unlinkGoogleAuth);
router.post('/runner/notifications/read-all', requireAuth, runnerController.markAllNotificationsRead);
router.post('/runner/notifications/archive-read', requireAuth, runnerController.archiveReadRunnerNotifications);
router.post('/runner/notifications/:notificationId/read', requireAuth, runnerController.markNotificationRead);
router.post('/runner/notifications/:notificationId/archive', requireAuth, runnerController.archiveRunnerNotification);
router.post('/runner/notifications/:notificationId/restore', requireAuth, runnerController.restoreRunnerNotification);
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

router.post('/runner/events/:eventSlug/save-toggle', requireAuth, groupActionLimiter, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId).select('savedEvents');
    if (!user) return res.status(401).json({ success: false, message: 'Not authenticated.' });

    const slug = String(req.params.eventSlug || '').trim();
    const event = await Event.findOne({ slug, status: 'published' }).select('_id');
    if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });

    const alreadySaved = user.savedEvents.some((id) => id.equals(event._id));

    if (alreadySaved) {
      await User.updateOne({ _id: user._id }, { $pull: { savedEvents: event._id } });
      return res.json({ success: true, saved: false });
    } else {
      await User.updateOne({ _id: user._id }, { $addToSet: { savedEvents: event._id } });
      return res.json({ success: true, saved: true });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update saved events.' });
  }
});

module.exports = router;
