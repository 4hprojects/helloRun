const express = require('express');
const router = express.Router();
const runnerController = require('../controllers/runner.controller');
const { requireAuth } = require('../middleware/auth.middleware');

router.get('/runner/dashboard', requireAuth, runnerController.getDashboard);
router.get('/runner/notifications', requireAuth, runnerController.getNotifications);
router.get('/runner/groups/:slug', requireAuth, runnerController.getRunningGroupDetail);
router.post('/runner/profile', requireAuth, runnerController.updateProfile);
router.post('/runner/notifications/read-all', requireAuth, runnerController.markAllNotificationsRead);
router.post('/runner/notifications/:notificationId/read', requireAuth, runnerController.markNotificationRead);
router.post('/runner/groups/create', requireAuth, runnerController.createRunningGroup);
router.post('/runner/groups/join', requireAuth, runnerController.joinRunningGroup);
router.post('/runner/groups/leave', requireAuth, runnerController.leaveRunningGroup);

module.exports = router;
