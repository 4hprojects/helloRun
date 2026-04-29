const express = require('express');
const router = express.Router();
const runnerController = require('../controllers/runner.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireCsrfProtection } = require('../middleware/csrf.middleware');

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
router.get('/runner/dashboard/result-submissions', requireAuth, runnerController.getDashboardResultSubmissions);
router.get('/runner/submissions/eligible', requireAuth, runnerController.getEligibleResultSubmissionOptions);
router.get('/runner/profile', requireAuth, runnerController.getProfilePage);
router.get('/runner/notifications', requireAuth, runnerController.getNotifications);
router.get('/runner/groups', requireAuth, runnerController.getRunningGroupsPage);
router.get('/runner/groups/create', requireAuth, runnerController.getCreateRunningGroupPage);
router.get('/runner/submissions', requireAuth, runnerController.getRunnerSubmissionsPage);
router.get('/runner/submissions/:submissionId/proof', requireAuth, runnerController.getRunnerSubmissionProof);
router.get('/runner/submissions/:submissionId', requireAuth, runnerController.getRunnerSubmissionDetailPage);
router.get('/runner/groups/:slug', requireAuth, runnerController.getRunningGroupDetail);
router.get('/runner/security/password', requireAuth, runnerController.getPasswordSettings);
router.post('/runner/profile', requireAuth, runnerController.updateProfile);
router.post('/runner/profile/contact', requireAuth, runnerController.updateProfileContact);
router.post('/runner/profile/emergency', requireAuth, runnerController.updateProfileEmergency);
router.post('/runner/security/password', requireAuth, runnerController.updatePasswordSettings);
router.post('/runner/auth/google/unlink', requireAuth, runnerController.unlinkGoogleAuth);
router.post('/runner/notifications/read-all', requireAuth, runnerController.markAllNotificationsRead);
router.post('/runner/notifications/:notificationId/read', requireAuth, runnerController.markNotificationRead);
router.post('/runner/groups/create', requireAuth, runnerController.createRunningGroup);
router.post('/runner/groups/join', requireAuth, runnerController.joinRunningGroup);
router.post('/runner/groups/leave', requireAuth, runnerController.leaveRunningGroup);

module.exports = router;
