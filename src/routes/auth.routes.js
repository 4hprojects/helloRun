const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { requireGuest } = require('../middleware/auth.middleware');

// Login & Signup
router.get('/login', requireGuest, authController.getLogin);
router.get('/signup', requireGuest, authController.getSignup);
router.post('/login', requireGuest, authController.postLogin);
router.post('/signup', requireGuest, authController.postSignup);
router.get('/logout', authController.logout);

// Email Verification
router.get('/verify-email/:token', authController.verifyEmail);
router.get('/resend-verification', requireGuest, authController.getResendVerification);
router.post('/resend-verification', requireGuest, authController.resendVerification);

// Password Reset
router.get('/forgot-password', requireGuest, authController.getForgotPassword);
router.post('/forgot-password', requireGuest, authController.postForgotPassword);
router.get('/reset-password/:token', requireGuest, authController.getResetPassword);
router.post('/reset-password/:token', requireGuest, authController.postResetPassword);

module.exports = router;