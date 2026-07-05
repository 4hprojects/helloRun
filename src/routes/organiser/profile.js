// src/routes/organiser/profile.js
const express = require('express');
const router = express.Router();
const {
  logger,
  User,
  OrganiserApplication,
  requireAuth,
  requireCsrfProtection,
  uploadService,
  communicationService,
  isValidPhone,
  validateFiles,
  wantsJsonResponse
} = require('./_shared');
const { extractIdNameMatch } = require('../../services/id-ocr.service');

/* ==========================================
   GET: Complete Profile Page
   ========================================== */

router.get('/complete-profile', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    // Try to find the user's organizer application
    const application = await OrganiserApplication.findOne({ userId: user._id });
    const editMode = Boolean(
      application &&
      ['pending', 'under_review', 'rejected'].includes(application.status) &&
      String(req.query.edit || '') === '1'
    );
    const submittedAt = application ? new Date(application.submittedAt || application.createdAt || Date.now()) : null;
    const reviewDays = parseInt(process.env.ORGANIZER_REVIEW_TIME_DAYS, 10) || 3;
    const estimatedAt = submittedAt ? new Date(submittedAt) : null;
    if (estimatedAt) estimatedAt.setDate(estimatedAt.getDate() + reviewDays);

    res.render('organizer/complete-profile', {
      title: 'Complete Organizer Profile - HelloRun',
      user: user,
      application: application || null,
      editMode,
      reviewDays,
      daysAgo: submittedAt ? Math.floor((Date.now() - submittedAt) / (1000 * 60 * 60 * 24)) : 0,
      submittedDate: submittedAt
        ? submittedAt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
        : '',
      estimatedDate: estimatedAt
        ? estimatedAt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
        : ''
    });
  } catch (error) {
    logger.error('Error loading complete-profile:', error);
    res.status(500).send('Server error');
  }
});

/* ==========================================
   POST: Complete Profile Submission
   ========================================== */

router.post(
  '/complete-profile',
  requireAuth,
  uploadService.uploadOrganizerDocs,
  requireCsrfProtection,
  async (req, res) => {
    const uploadedObjectKeys = [];
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

      const canUpdateExistingApplication = existingApplication &&
        ['pending', 'under_review', 'rejected'].includes(existingApplication.status);

      if (existingApplication && !canUpdateExistingApplication) {
        return res.status(400).json({
          success: false,
          message: 'This application can no longer be updated.'
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

      // Validate required fields. Individuals don't have a business — their
      // "business name" defaults to the account name and address is optional;
      // organisations must instead carry real evidence (registration number + proof).
      const errors = {};
      const isIndividual = businessType === 'individual';
      const accountFullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
      const resolvedBusinessName = isIndividual
        ? (businessName?.trim() || accountFullName)
        : businessName;

      if (!resolvedBusinessName || resolvedBusinessName.trim().length < 2) {
        errors.businessName = 'Business name is required (minimum 2 characters)';
      }

      if (!businessType || !['individual', 'company', 'ngo', 'sports_club'].includes(businessType)) {
        errors.businessType = 'Please select a valid business type';
      }

      if (!isIndividual && !businessRegistrationNumber?.trim()) {
        errors.businessRegistrationNumber = 'Registration number is required for companies, NGOs, and sports clubs';
      }

      if (!contactPhone || !isValidPhone(contactPhone)) {
        errors.contactPhone = 'Please provide a valid phone number';
      }

      if (!isIndividual && !businessAddress?.trim()) {
        errors.businessAddress = 'Business address is required for companies, NGOs, and sports clubs';
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
        if (existingApplication?.idProofUrl) {
          req.files = {};
        } else {
          return res.status(400).json({
            success: false,
            message: 'Please upload an ID proof document.'
          });
        }
      }

      const idProofFile = req.files.idProof ? req.files.idProof[0] : null;
      const businessProofFile = req.files.businessProof ? req.files.businessProof[0] : null;

      if (!idProofFile && !existingApplication?.idProofUrl) {
        return res.status(400).json({
          success: false,
          message: 'ID proof document is required'
        });
      }

      if (!isIndividual && !businessProofFile && !existingApplication?.businessProofUrl) {
        return res.status(400).json({
          success: false,
          message: 'Business proof document is required for companies, NGOs, and sports clubs'
        });
      }

      const fileValidation = validateFiles([idProofFile, businessProofFile].filter(Boolean));
      if (!fileValidation.valid) {
        return res.status(400).json({
          success: false,
          message: fileValidation.error
        });
      }

      // ========== STEP 4b: OCR-Assist Name Check (advisory only) ==========
      // Pre-computes a name-match verdict for the admin reviewer. Runs only on a
      // fresh ID upload; any OCR problem falls back to 'not_checked' and the
      // submission continues normally.
      let idNameMatch = null;
      if (idProofFile?.buffer) {
        idNameMatch = await extractIdNameMatch({
          buffer: idProofFile.buffer,
          mimetype: idProofFile.mimetype,
          accountName: accountFullName
        });
      }

      const duplicatePhoneCount = await OrganiserApplication.countDocuments({
        contactPhone: contactPhone.trim(),
        userId: { $ne: userId }
      }).catch(() => 0);

      // ========== STEP 5: Upload Documents to Cloudflare R2 ==========
      let uploadedDocs = { idProof: null, businessProof: null };
      try {
        if (idProofFile || businessProofFile) {
          uploadedDocs = await uploadService.uploadOrganizerDocsToR2({
            userId,
            idProofFile,
            businessProofFile
          });
          if (uploadedDocs.idProof?.key) uploadedObjectKeys.push(uploadedDocs.idProof.key);
          if (uploadedDocs.businessProof?.key) uploadedObjectKeys.push(uploadedDocs.businessProof.key);
        }
      } catch (uploadError) {
        logger.error('R2 upload error:', uploadError);
        return res.status(500).json({
          success: false,
          message: 'Failed to upload documents. Please try again.'
        });
      }

      // ========== STEP 6: Create OrganiserApplication Record ==========
      let application;

      try {
        application = existingApplication || new OrganiserApplication({
          userId: userId,
          submittedAt: new Date()
        });

        const oldDocumentKeys = [];
        if (uploadedDocs.idProof?.url && application.idProofUrl) {
          oldDocumentKeys.push(uploadService.extractObjectKeyFromPublicUrl(application.idProofUrl));
        }
        if (uploadedDocs.businessProof?.url && application.businessProofUrl) {
          oldDocumentKeys.push(uploadService.extractObjectKeyFromPublicUrl(application.businessProofUrl));
        }

        application.businessName = resolvedBusinessName.trim();
        application.businessType = businessType;
        application.contactPhone = contactPhone.trim();
        application.businessRegistrationNumber = businessRegistrationNumber?.trim() || '';
        application.businessAddress = businessAddress?.trim() || '';
        application.idProofUrl = uploadedDocs.idProof?.url || application.idProofUrl || '';
        application.businessProofUrl = uploadedDocs.businessProof?.url || application.businessProofUrl || '';
        application.additionalInfo = additionalInfo?.trim() || '';
        if (idNameMatch) {
          application.idNameMatchStatus = idNameMatch.status;
          application.idDetectedName = idNameMatch.detectedName || '';
        }
        application.duplicatePhoneCount = duplicatePhoneCount;
        // 'not_detected' routes to the under_review triage lane for a closer look;
        // 'matched' and 'not_checked' (OCR unavailable) queue as normal.
        application.status = application.idNameMatchStatus === 'not_detected' ? 'under_review' : 'pending';
        application.rejectionReason = '';
        application.reviewedBy = undefined;
        application.reviewedAt = undefined;
        if (existingApplication) application.submittedAt = new Date();

        await application.save();
        await uploadService.deleteObjects(oldDocumentKeys.filter(Boolean));
      } catch (dbError) {
        logger.error('Database save error:', dbError);

        // Delete uploaded cloud objects on database failure
        await uploadService.deleteObjects(uploadedObjectKeys);

        return res.status(500).json({
          success: false,
          message: 'Failed to save application. Please try again.'
        });
      }

      // ========== STEP 7: Update User Status ==========
      try {
        user.organizerApplicationId = application._id;
        user.organizerStatus = 'pending';
        await user.save();
      } catch (updateError) {
        logger.error('User update error:', updateError);
        // Continue even if user update fails - application is already saved
      }

      // ========== STEP 8: Send Confirmation Email ==========
      try {
        await communicationService.notify('organiser.application_submitted', {
          email: {
            to: user.email,
            firstName: user.firstName || 'Organizer',
            applicationId: application.applicationId,
            recipientUserId: user._id,
            metadata: { applicationId: application.applicationId }
          }
        });
      } catch (emailError) {
        logger.error('Email sending error:', emailError);
        // Don't fail the submission if email fails
      }

      // ========== STEP 9: Send Success Response ==========
      if (!wantsJsonResponse(req)) {
        return res.redirect('/organizer/application-status');
      }
      return res.status(201).json({
        success: true,
        message: existingApplication ? 'Application updated successfully!' : 'Application submitted successfully!',
        applicationId: application.applicationId,
        redirectUrl: '/organizer/application-status'
      });

    } catch (error) {
      logger.error('Unexpected error in complete-profile POST:', error);

      // Attempt to delete uploaded cloud objects if they exist
      if (uploadedObjectKeys.length > 0) {
        await uploadService.deleteObjects(uploadedObjectKeys);
      }

      return res.status(500).json({
        success: false,
        message: 'An unexpected error occurred. Please try again later.'
      });
    }
  }
);

/* ==========================================
   GET: Application Status
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
      title: 'Application Status - HelloRun',
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
    logger.error('Error loading application status:', error);
    res.status(500).render('error', {
      title: 'Server Error',
      status: 500,
      message: 'An error occurred while loading your application status.'
    });
  }
});

module.exports = router;
