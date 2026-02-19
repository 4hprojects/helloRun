const express = require('express');
const router = express.Router();
const User = require('../models/User');
const OrganiserApplication = require('../models/OrganiserApplication');
const uploadService = require('../services/upload.service');
const emailService = require('../services/email.service');
const { requireAuth } = require('../middleware/auth.middleware');

/* ==========================================
   GET: Organizer Dashboard
   ========================================== */

router.get('/dashboard', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);

    if (!user) {
      return res.status(404).render('error', {
        title: '404 - User Not Found',
        status: 404,
        message: 'User account not found.'
      });
    }

    // Only organiser role can access
    if (user.role !== 'organiser') {
      return res.status(403).render('error', {
        title: '403 - Access Denied',
        status: 403,
        message: 'Only organizers can access this page.'
      });
    }

    // Get application info
    const application = await OrganiserApplication.findOne({
      userId: req.session.userId
    });

    // If no application, redirect to complete profile
    if (!application) {
      return res.redirect('/organizer/complete-profile');
    }

    // If application is pending, redirect to status page
    if (application.status === 'pending' || application.status === 'under_review') {
      return res.redirect('/organizer/application-status');
    }

    // If rejected, redirect to status page
    if (application.status === 'rejected') {
      return res.redirect('/organizer/application-status');
    }

    // Build dashboard data
    const dashboardData = {
      title: 'Organizer Dashboard - helloRun',
      user: user,
      application: application,
      adminEmail: process.env.ADMIN_EMAIL || 'hellorunonline@gmail.com',
      stats: {
        totalEvents: 0,
        activeEvents: 0,
        totalRegistrations: 0,
        upcomingEvents: 0
      },
      recentEvents: [],
      quickActions: [
        {
          icon: 'plus-circle',
          label: 'Create Event',
          href: '/organizer/create-event',
          description: 'Set up a new running event'
        },
        {
          icon: 'calendar',
          label: 'My Events',
          href: '/organizer/events',
          description: 'Manage your events'
        },
        {
          icon: 'users',
          label: 'Participants',
          href: '/organizer/participants',
          description: 'View registrations'
        },
        {
          icon: 'settings',
          label: 'Settings',
          href: '/organizer/settings',
          description: 'Account settings'
        }
      ],
      approvedDate: application.reviewedAt
        ? new Date(application.reviewedAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })
        : new Date(application.submittedAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })
    };

    res.render('organizer/dashboard', dashboardData);
  } catch (error) {
    console.error('Error loading organizer dashboard:', error);
    res.status(500).render('error', {
      title: 'Server Error',
      status: 500,
      message: 'An error occurred while loading the dashboard.'
    });
  }
});

/* ==========================================
   GET: Complete Profile Page
   ========================================== */

router.get('/complete-profile', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    
    if (!user) {
      return res.status(404).render('error', {
        title: '404 - User Not Found',
        status: 404,
        message: 'User account not found.'
      });
    }

    // Check if user role is organiser
    if (user.role !== 'organiser') {
      return res.status(403).render('error', {
        title: '403 - Access Denied',
        status: 403,
        message: 'Only organizers can access this page.'
      });
    }

    // Check if user has already submitted an application
    const existingApplication = await OrganiserApplication.findOne({
      userId: req.session.userId
    });

    if (existingApplication && existingApplication.status === 'approved') {
      return res.redirect('/organizer/dashboard');
    }

    // Render form
    res.render('organizer/complete-profile', {
      title: 'Complete Organizer Profile - helloRun',
      user: user,
      ORGANIZER_REVIEW_TIME_DAYS: process.env.ORGANIZER_REVIEW_TIME_DAYS || 3
    });
  } catch (error) {
    console.error('Error loading complete profile page:', error);
    res.status(500).render('error', {
      title: 'Server Error',
      status: 500,
      message: 'An error occurred while loading the form.'
    });
  }
});

/* ==========================================
   POST: Complete Profile Submission
   ========================================== */

router.post(
  '/complete-profile',
  requireAuth,
  uploadService.uploadOrganizerDocs,
  async (req, res) => {
    try {
      // ========== STEP 1: Validate Authentication ==========
      const userId = req.session.userId;
      const user = await User.findById(userId);

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User not found or session expired.'
        });
      }

      if (user.role !== 'organiser') {
        return res.status(403).json({
          success: false,
          message: 'Only organizers can submit applications.'
        });
      }

      // ========== STEP 2: Validate Existing Application ==========
      const existingApplication = await OrganiserApplication.findOne({
        userId: userId
      });

      if (existingApplication && existingApplication.status === 'approved') {
        return res.status(400).json({
          success: false,
          message: 'You have already been approved as an organizer.'
        });
      }

      if (existingApplication && existingApplication.status === 'pending') {
        return res.status(400).json({
          success: false,
          message: 'Your application is already under review. Please wait for feedback.'
        });
      }

      // ========== STEP 3: Validate Request Body ==========
      const {
        businessName,
        businessType,
        contactPhone,
        businessRegistrationNumber,
        businessAddress,
        additionalInfo,
        terms: agreeTerms
      } = req.body;

      // Validate required fields
      const errors = {};

      if (!businessName || businessName.trim().length < 2) {
        errors.businessName = 'Business name is required (minimum 2 characters)';
      }

      if (!businessType || !['individual', 'company', 'ngo', 'sports_club'].includes(businessType)) {
        errors.businessType = 'Please select a valid business type';
      }

      if (!contactPhone || !isValidPhone(contactPhone)) {
        errors.contactPhone = 'Please provide a valid phone number';
      }

      if (businessAddress && businessAddress.length > 500) {
        errors.businessAddress = 'Address must not exceed 500 characters';
      }

      if (additionalInfo && additionalInfo.length > 500) {
        errors.additionalInfo = 'Additional info must not exceed 500 characters';
      }

      if (!agreeTerms) {
        errors.agreeTerms = 'You must accept the terms and conditions';
      }

      // Return validation errors if any
      if (Object.keys(errors).length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Please fix the errors and try again',
          errors: errors
        });
      }

      // ========== STEP 4: Validate File Uploads ==========
      if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Please upload both ID proof and business proof documents'
        });
      }

      const idProofFile = req.files.idProof ? req.files.idProof[0] : null;
      const businessProofFile = req.files.businessProof ? req.files.businessProof[0] : null;

      if (!idProofFile) {
        return res.status(400).json({
          success: false,
          message: 'ID proof document is required'
        });
      }

      if (!businessProofFile) {
        return res.status(400).json({
          success: false,
          message: 'Business proof document is required'
        });
      }

      const fileValidation = validateFiles([idProofFile, businessProofFile]);
      if (!fileValidation.valid) {
        // Delete uploaded files on validation failure
        uploadService.deleteFiles([idProofFile.filename, businessProofFile.filename]);
        
        return res.status(400).json({
          success: false,
          message: fileValidation.error
        });
      }

      // ========== STEP 5: Create OrganiserApplication Record ==========
      let application;

      try {
        application = new OrganiserApplication({
          userId: userId,
          businessName: businessName.trim(),
          businessType: businessType,
          contactPhone: contactPhone.trim(),
          businessRegistrationNumber: businessRegistrationNumber?.trim() || '',
          businessAddress: businessAddress?.trim() || '',
          idProofUrl: `/uploads/organizer-docs/${idProofFile.filename}`,
          businessProofUrl: `/uploads/organizer-docs/${businessProofFile.filename}`,
          additionalInfo: additionalInfo?.trim() || '',
          status: 'pending',
          submittedAt: new Date()
        });

        // Save application (auto-generates applicationId via pre-save hook)
        await application.save();
      } catch (dbError) {
        console.error('Database save error:', dbError);

        // Delete uploaded files on database failure
        uploadService.deleteFiles([idProofFile.filename, businessProofFile.filename]);

        return res.status(500).json({
          success: false,
          message: 'Failed to save application. Please try again.'
        });
      }

      // ========== STEP 6: Update User Status ==========
      try {
        user.organizerApplicationId = application._id;
        user.organizerStatus = 'pending';
        await user.save();
      } catch (updateError) {
        console.error('User update error:', updateError);
        // Continue even if user update fails - application is already saved
      }

      // ========== STEP 7: Send Confirmation Email ==========
      try {
        await emailService.sendApplicationSubmittedEmail(
          user.email,
          user.firstName || 'Organizer',
          application.applicationId
        );
      } catch (emailError) {
        console.error('Email sending error:', emailError);
        // Don't fail the submission if email fails
      }

      // ========== STEP 8: Send Success Response ==========
      return res.status(201).json({
        success: true,
        message: 'Application submitted successfully!',
        applicationId: application.applicationId,
        redirectUrl: '/organizer/application-status'
      });

    } catch (error) {
      console.error('Unexpected error in complete-profile POST:', error);

      // Attempt to delete uploaded files if they exist
      if (req.files) {
        const filenames = [];
        if (req.files.idProof && req.files.idProof[0]) filenames.push(req.files.idProof[0].filename);
        if (req.files.businessProof && req.files.businessProof[0]) filenames.push(req.files.businessProof[0].filename);

        if (filenames.length > 0) {
          uploadService.deleteFiles(filenames);
        }
      }

      return res.status(500).json({
        success: false,
        message: 'An unexpected error occurred. Please try again later.'
      });
    }
  }
);

/* ==========================================
   GET: Application Status Page
   ========================================== */

router.get('/application-status', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);

    if (!user) {
      return res.status(404).render('error', {
        title: '404 - User Not Found',
        status: 404,
        message: 'User account not found.'
      });
    }

    // Check if user has submitted an application
    const application = await OrganiserApplication.findOne({
      userId: req.session.userId
    });

    if (!application) {
      return res.redirect('/organizer/complete-profile');
    }

    // Calculate days since submission
    const submittedDate = new Date(application.submittedAt);
    const daysAgo = Math.floor((Date.now() - submittedDate) / (1000 * 60 * 60 * 24));

    // Calculate estimated review completion date
    const reviewDays = parseInt(process.env.ORGANIZER_REVIEW_TIME_DAYS) || 3;
    const estimatedDate = new Date(submittedDate);
    estimatedDate.setDate(estimatedDate.getDate() + reviewDays);

    res.render('organizer/application-status', {
      title: 'Application Status - helloRun',
      user: user,
      application: application,
      daysAgo: daysAgo,
      estimatedDate: estimatedDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      submittedDate: submittedDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      reviewDays: reviewDays,
      adminEmail: process.env.ADMIN_EMAIL || 'hellorunonline@gmail.com'
    });
  } catch (error) {
    console.error('Error loading application status:', error);
    res.status(500).render('error', {
      title: 'Server Error',
      status: 500,
      message: 'An error occurred while loading your application status.'
    });
  }
});

/* ==========================================
   HELPER METHODS
   ========================================== */

/**
 * Validate phone number format
 */
function isValidPhone(phone) {
  if (!phone || typeof phone !== 'string') {
    return false;
  }
  // Allow various phone formats with at least 7 digits
  const phoneRegex = /^[\d\s\-\+\(\)]+$/;
  const digitsOnly = phone.replace(/\D/g, '');
  return phoneRegex.test(phone) && digitsOnly.length >= 7;
}

/**
 * Validate uploaded files
 */
function validateFiles(files) {
  const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
  const maxSize = parseInt(process.env.UPLOAD_MAX_SIZE) || 5242880; // 5MB

  for (const file of files) {
    // Check file type
    if (!allowedTypes.includes(file.mimetype)) {
      return {
        valid: false,
        error: `Invalid file type: ${file.originalname}. Please upload PDF, JPG, or PNG files only.`
      };
    }

    // Check file size
    if (file.size > maxSize) {
      const maxSizeMB = Math.round(maxSize / 1024 / 1024);
      return {
        valid: false,
        error: `File ${file.originalname} exceeds ${maxSizeMB}MB limit.`
      };
    }
  }

  return { valid: true };
}

module.exports = router;