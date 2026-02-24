const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middleware/auth.middleware');
const adminController = require('../controllers/admin.controller');

// List all organizer applications
router.get('/applications', requireAdmin, adminController.listApplications);

// View details for a specific application
router.get('/applications/:id', requireAdmin, adminController.viewApplication);

// Approve application
router.post('/applications/:id/approve', requireAdmin, adminController.approveApplication);

// Reject application
router.post('/applications/:id/reject', requireAdmin, adminController.rejectApplication);

// Admin dashboard
router.get('/dashboard', requireAdmin, adminController.dashboard);

module.exports = router;
