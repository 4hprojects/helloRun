// src/routes/organizer.routes.js
// Barrel router — assembles all organiser sub-routers
const express = require('express');
const router = express.Router();
const onsiteOperationsRoutes = require('./organiser/onsite-operations');
const onsitePageRoutes = require('./organiser/onsite-pages');
const qrAndDashboardRoutes = require('./organiser/qr-and-dashboard');
const dashboardRoutes = require('./organiser/dashboard');
const eventCreationRoutes = require('./organiser/event-creation');
const eventManagementRoutes = require('./organiser/event-management');
const registrantsRoutes = require('./organiser/registrants');
const waitlistRoutes = require('./organiser/waitlist');
const transferRoutes = require('./organiser/transfers');
const reviewRoutes = require('./organiser/review');
const profileRoutes = require('./organiser/profile');

router.use('/', onsiteOperationsRoutes);
router.use('/', onsitePageRoutes);
router.use('/', qrAndDashboardRoutes);
router.use('/', dashboardRoutes);
router.use('/', eventCreationRoutes);
router.use('/', eventManagementRoutes);
router.use('/', registrantsRoutes);
router.use('/', waitlistRoutes);
router.use('/', transferRoutes);
router.use('/', reviewRoutes);
router.use('/', profileRoutes);

module.exports = router;
