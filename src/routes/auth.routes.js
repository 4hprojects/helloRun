const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

// Signup
router.get('/signup', authController.getSignup);
router.post('/signup', authController.postSignup);

// Login
router.get('/login', authController.getLogin);
router.post('/login', authController.postLogin);

// Logout
router.get('/logout', authController.logout);

// Email verification
router.get('/verify-email/:token', authController.verifyEmail);
router.get('/verify-email-sent', authController.getVerifyEmailSent);

// Resend verification
router.get('/resend-verification', authController.getResendVerification);
router.post('/resend-verification', authController.postResendVerification);

module.exports = router;