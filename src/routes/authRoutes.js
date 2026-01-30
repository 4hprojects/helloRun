const express = require('express');
const router = express.Router();
const User = require('../models/User');
const passwordService = require('../services/password.service');
const emailService = require('../services/email.service');

// Login Page
router.get('/login', (req, res) => {
  res.render('auth/login', {
    error: null,
    success: null
  });
});

// Login Form Handler
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.render('auth/login', {
        error: 'Invalid email or password',
        success: null
      });
    }

    const isMatch = await passwordService.comparePassword(password, user.passwordHash);
    if (!isMatch) {
      return res.render('auth/login', {
        error: 'Invalid email or password',
        success: null
      });
    }

    req.session.userId = user._id;
    res.redirect('/');
  } catch (error) {
    console.error('Login error:', error);
    res.render('auth/login', {
      error: 'An error occurred. Please try again.',
      success: null
    });
  }
});

// Register/Signup Page (both routes point to signup.ejs)
router.get('/register', (req, res) => {
  res.render('auth/signup', {
    error: null,
    success: null
  });
});

router.get('/signup', (req, res) => {
  res.render('auth/signup', {
    error: null,
    success: null
  });
});

// Register Form Handler - POST /register
router.post('/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, role } = req.body;
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.render('auth/signup', {
        error: 'Email already exists.',
        success: null
      });
    }

    const passwordHash = await passwordService.hashPassword(password);
    const verificationToken = passwordService.generateResetToken();
    const hashedVerificationToken = passwordService.hashToken(verificationToken);

    const newUser = new User({ 
      email, 
      passwordHash,
      firstName,
      lastName,
      role: role || 'runner',
      emailVerified: false,
      emailVerificationToken: hashedVerificationToken,
      emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      organizerStatus: 'not_applied'
    });
    
    await newUser.save();
    await emailService.sendVerificationEmail(email, verificationToken, firstName, role);

    res.redirect(`/verify-email-sent?email=${encodeURIComponent(email)}`);
  } catch (error) {
    console.error('Register error:', error);
    res.render('auth/signup', {
      error: 'An error occurred. Please try again.',
      success: null
    });
  }
});

// ADD THIS: Signup Form Handler - POST /signup (same as /register)
router.post('/signup', async (req, res) => {
  try {
    const { email, password, firstName, lastName, role } = req.body;
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.render('auth/signup', {
        error: 'Email already exists.',
        success: null
      });
    }

    const passwordHash = await passwordService.hashPassword(password);
    const verificationToken = passwordService.generateResetToken();
    const hashedVerificationToken = passwordService.hashToken(verificationToken);

    const newUser = new User({ 
      email, 
      passwordHash,
      firstName,
      lastName,
      role: role || 'runner',
      emailVerified: false,
      emailVerificationToken: hashedVerificationToken,
      emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      organizerStatus: 'not_applied'
    });
    
    await newUser.save();
    await emailService.sendVerificationEmail(email, verificationToken, firstName, role);

    res.redirect(`/verify-email-sent?email=${encodeURIComponent(email)}`);
  } catch (error) {
    console.error('Register error:', error);
    res.render('auth/signup', {
      error: 'An error occurred. Please try again.',
      success: null
    });
  }
});

// Verification email sent page
router.get('/verify-email-sent', (req, res) => {
  const email = req.query.email || '';
  res.render('auth/verify-email-sent', {
    email: email
  });
});

// Forgot Password Page
router.get('/forgot-password', (req, res) => {
  res.render('auth/forgot-password', {
    error: null,
    success: null
  });
});

// Forgot Password Form Handler
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.render('auth/forgot-password', {
        error: null,
        success: 'If an account exists with that email, you will receive a password reset link shortly.'
      });
    }

    if (!user.canReceivePasswordResetEmail()) {
      return res.render('auth/forgot-password', {
        error: 'Too many password reset requests. Please try again later.',
        success: null
      });
    }

    const resetToken = passwordService.generateResetToken();
    const hashedToken = passwordService.hashToken(resetToken);
    
    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          passwordResetToken: hashedToken,
          passwordResetExpires: new Date(Date.now() + parseInt(process.env.PASSWORD_RESET_EXPIRY))
        }
      }
    );

    await emailService.sendPasswordResetEmail(email, resetToken, user.firstName);

    res.render('auth/forgot-password', {
      error: null,
      success: 'Password reset link sent! Check your email.'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.render('auth/forgot-password', {
      error: 'An error occurred. Please try again.',
      success: null
    });
  }
});

// Reset Password Page (GET)
router.get('/reset-password/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const hashedToken = passwordService.hashToken(token);
    
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.render('auth/reset-password', {
        error: 'Password reset link is invalid or has expired.',
        success: null,
        token: null
      });
    }

    res.render('auth/reset-password', {
      error: null,
      success: null,
      token: token
    });
  } catch (error) {
    console.error('Reset password page error:', error);
    res.render('auth/reset-password', {
      error: 'An error occurred. Please try again.',
      success: null,
      token: null
    });
  }
});

// Reset Password Form Handler (POST)
router.post('/reset-password/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { password, confirmPassword } = req.body;
    
    if (password !== confirmPassword) {
      return res.render('auth/reset-password', {
        error: 'Passwords do not match.',
        success: null,
        token: token
      });
    }

    if (!passwordService.validatePassword(password)) {
      return res.render('auth/reset-password', {
        error: 'Password must be at least 8 characters with uppercase, lowercase, and number.',
        success: null,
        token: token
      });
    }

    const hashedToken = passwordService.hashToken(token);
    
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.render('auth/reset-password', {
        error: 'Password reset link is invalid or has expired.',
        success: null,
        token: null
      });
    }

    const newPasswordHash = await passwordService.hashPassword(password);

    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          passwordHash: newPasswordHash,
          passwordResetToken: null,
          passwordResetExpires: null
        }
      }
    );

    emailService.sendPasswordResetConfirmation(user.email, user.firstName)
      .catch(err => console.error('Failed to send confirmation email:', err));

    res.render('auth/reset-password', {
      error: null,
      success: 'Password reset successful! Redirecting to login...',
      token: null,
      redirectToLogin: true
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.render('auth/reset-password', {
      error: 'An error occurred. Please try again.',
      success: null,
      token: req.params.token
    });
  }
});

// Email Verification Handler
router.get('/verify-email/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const hashedToken = passwordService.hashToken(token);
    
    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.render('auth/verify-email-result', {
        success: false,
        message: 'Email verification link is invalid or has expired.',
        isOrganizer: false
      });
    }

    // Mark email as verified
    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          emailVerified: true,
          emailVerificationToken: null,
          emailVerificationExpires: null
        }
      }
    );

    // Log user in
    req.session.userId = user._id;

    // Check if user selected organizer role and needs to complete profile
    if (user.role === 'organiser' && user.organizerStatus === 'not_applied') {
      return res.redirect('/organizer/complete-profile');
    }

    // Regular runner - redirect to home
    res.redirect('/?verified=true');
  } catch (error) {
    console.error('Email verification error:', error);
    res.render('auth/verify-email-result', {
      success: false,
      message: 'An error occurred. Please try again.',
      isOrganizer: false
    });
  }
});

module.exports = router;