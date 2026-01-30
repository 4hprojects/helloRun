const express = require('express');
const router = express.Router();
const User = require('../models/User');
const OrganiserApplication = require('../models/OrganiserApplication');
const uploadService = require('../services/upload.service');
const emailService = require('../services/email.service');
const { requireAuth } = require('../middleware/auth.middleware');

// Complete Profile Page (GET)
router.get('/complete-profile', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    
    // Check if user is organizer
    if (user.role !== 'organiser') {
      return res.redirect('/');
    }
    
    // Check if already applied
    if (user.organizerStatus !== 'not_applied') {
      return res.redirect('/organizer/application-status');
    }
    
    res.render('organizer/complete-profile', {
      error: null,
      success: null,
      user: user
    });
  } catch (error) {
    console.error('Complete profile error:', error);
    res.redirect('/');
  }
});

// Application Status Page
router.get('/application-status', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId).populate('organizerApplicationId');
    
    if (user.role !== 'organiser') {
      return res.redirect('/');
    }
    
    res.render('organizer/application-status', {
      user: user,
      application: user.organizerApplicationId
    });
  } catch (error) {
    console.error('Application status error:', error);
    res.redirect('/');
  }
});

module.exports = router;