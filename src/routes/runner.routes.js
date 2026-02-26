const express = require('express');
const router = express.Router();
const runnerController = require('../controllers/runner.controller');
const { requireAuth } = require('../middleware/auth.middleware');

router.get('/runner/dashboard', requireAuth, runnerController.getDashboard);
router.post('/runner/profile', requireAuth, runnerController.updateProfile);

module.exports = router;
