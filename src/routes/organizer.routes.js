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
    
    if (!user) {
      return res.redirect('/auth/login');
    }

    // Check if user role is organiser
    if (user.role !== 'organiser') {
      return res.redirect('/');
    }

    // Check if already has pending/approved application
    if (user.organizerStatus === 'pending' || user.organizerStatus === 'approved') {
      return res.redirect('/organizer/application-status');
    }

    res.render('organizer/complete-profile', {
      title: 'Complete Organizer Profile',
      user: user
    });
  } catch (error) {
    console.error('Error loading complete profile page:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while loading the page.'
    });
  }
});

// Complete Profile Submission (POST)
router.post('/complete-profile', requireAuth, uploadService.uploadOrganizerDocs, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if user role is organiser
    if (user.role !== 'organiser') {
      return res.status(403).json({ error: 'Access denied. Only organizers can submit applications.' });
    }

    // Check if already has pending/approved application
    if (user.organizerStatus === 'pending' || user.organizerStatus === 'approved') {
      return res.status(400).json({ error: 'You already have an application submitted.' });
    }

    // Validate uploaded files
    if (!req.files || !req.files.idProof || !req.files.businessProof) {
      // Clean up any uploaded files
      if (req.files) {
        uploadService.deleteFiles([
          req.files.idProof?.[0]?.filename,
          req.files.businessProof?.[0]?.filename
        ].filter(Boolean));
      }
      return res.status(400).json({ error: 'Both ID proof and business proof are required.' });
    }

    // Validate file types and sizes
    const validationError = uploadService.validateFiles([
      req.files.idProof[0],
      req.files.businessProof[0]
    ]);

    if (validationError) {
      // Clean up uploaded files
      uploadService.deleteFiles([
        req.files.idProof[0].filename,
        req.files.businessProof[0].filename
      ]);
      return res.status(400).json({ error: validationError });
    }

    // Validate form data
    const { businessName, businessType, contactPhone } = req.body;

    if (!businessName || businessName.trim().length < 3) {
      uploadService.deleteFiles([
        req.files.idProof[0].filename,
        req.files.businessProof[0].filename
      ]);
      return res.status(400).json({ error: 'Business name must be at least 3 characters long.' });
    }

    if (!businessType) {
      uploadService.deleteFiles([
        req.files.idProof[0].filename,
        req.files.businessProof[0].filename
      ]);
      return res.status(400).json({ error: 'Business type is required.' });
    }

    if (!contactPhone) {
      uploadService.deleteFiles([
        req.files.idProof[0].filename,
        req.files.businessProof[0].filename
      ]);
      return res.status(400).json({ error: 'Contact phone is required.' });
    }

    // Validate phone format
    const phoneRegex = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/;
    if (!phoneRegex.test(contactPhone.trim())) {
      uploadService.deleteFiles([
        req.files.idProof[0].filename,
        req.files.businessProof[0].filename
      ]);
      return res.status(400).json({ error: 'Invalid phone number format.' });
    }

    // Create application
    const application = new OrganiserApplication({
      userId: user._id,
      businessName: businessName.trim(),
      businessType: businessType,
      contactPhone: contactPhone.trim(),
      businessRegistrationNumber: req.body.businessRegistrationNumber?.trim() || '',
      businessAddress: req.body.businessAddress?.trim() || '',
      idProofUrl: `/uploads/organizer-docs/${req.files.idProof[0].filename}`,
      businessProofUrl: `/uploads/organizer-docs/${req.files.businessProof[0].filename}`,
      additionalInfo: req.body.additionalInfo?.trim() || '',
      status: 'pending',
      submittedAt: new Date()
    });

    await application.save();

    // Update user document
    user.organizerStatus = 'pending';
    user.organizerApplicationId = application._id;
    await user.save();

    // Send confirmation email
    try {
      await emailService.sendApplicationSubmittedEmail(
        user.email,
        user.firstName,
        application.applicationId
      );
    } catch (emailError) {
      console.error('Error sending confirmation email:', emailError);
      // Don't fail the request if email fails
    }

    res.status(200).json({
      success: true,
      message: 'Application submitted successfully!',
      applicationId: application.applicationId
    });

  } catch (error) {
    console.error('Error submitting application:', error);
    
    // Clean up uploaded files on error
    if (req.files) {
      uploadService.deleteFiles([
        req.files.idProof?.[0]?.filename,
        req.files.businessProof?.[0]?.filename
      ].filter(Boolean));
    }

    res.status(500).json({ error: 'An error occurred while submitting your application. Please try again.' });
  }
});

// Application Status Page
router.get('/application-status', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId).populate('organizerApplicationId');
    
    if (!user) {
      return res.redirect('/auth/login');
    }

    // Check if user has an application
    if (!user.organizerApplicationId) {
      return res.redirect('/organizer/complete-profile');
    }

    const application = user.organizerApplicationId;

    res.render('organizer/application-status', {
      title: 'Application Status',
      user: user,
      application: application
    });
  } catch (error) {
    console.error('Error loading application status:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while loading your application status.'
    });
  }
});

module.exports = router;