const express = require('express');
const router = express.Router();
const User = require('../models/User');
const passwordService = require('../services/password.service');
const emailService = require('../services/email.service');
const googleOAuthService = require('../services/google-oauth.service');
const crypto = require('crypto');
const { redirectIfAuth } = require('../middleware/auth.middleware');

function resolveSafeReturnTo(value, fallback = null) {
  if (typeof value === 'string' && value.startsWith('/') && !value.startsWith('//')) {
    return value;
  }
  return fallback;
}

function startAuthenticatedSession(req, user) {
  req.session.userId = user._id;
  req.session.role = user.role;
  req.session.userName = user.firstName || '';
  req.session.user = user;
  req.session.loginSuccess = true;
}

function redirectAfterLogin(req, res, user) {
  const returnTo = resolveSafeReturnTo(req.session.returnTo);
  if (returnTo) {
    delete req.session.returnTo;
    return res.redirect(returnTo);
  }

  if (user.role === 'organiser') {
    if (user.organizerStatus === 'pending') {
      return res.redirect('/organizer/application-status');
    }
    if (user.organizerStatus === 'approved') {
      return res.redirect('/organizer/dashboard');
    }
    return res.redirect('/organizer/complete-profile');
  }

  if (user.role === 'admin') {
    return res.redirect('/admin/dashboard');
  }

  return res.redirect('/runner/dashboard');
}

// Login Page - redirect if already logged in
router.get('/login', redirectIfAuth, (req, res) => {
  const queryMessage = typeof req.query.message === 'string' ? req.query.message : null;
  const queryType = typeof req.query.type === 'string' ? req.query.type : '';
  res.render('auth/login', {
    error: queryType === 'error' ? queryMessage : null,
    success: null
  });
});

// Login Form Handler - redirect if already logged in
router.post('/login', redirectIfAuth, async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.render('auth/login', {
        error: 'Invalid email or password',
        success: null,
        showResendLink: false,
        userEmail: null
      });
    }

    // Check if email is verified
    if (!user.emailVerified) {
      return res.render('auth/login', {
        error: 'Please verify your email before logging in.',
        success: null,
        showResendLink: true,
        userEmail: user.email
      });
    }

    if (user.authProvider === 'google' && !user.passwordHash) {
      return res.render('auth/login', {
        error: 'This account uses Google sign-in. Use Continue with Google.',
        success: null,
        showResendLink: false,
        userEmail: null
      });
    }

    const isMatch = await passwordService.comparePassword(password, user.passwordHash || '');
    if (!isMatch) {
      return res.render('auth/login', {
        error: 'Invalid email or password',
        success: null,
        showResendLink: false,
        userEmail: null
      });
    }

    startAuthenticatedSession(req, user);
    return redirectAfterLogin(req, res, user);
    
  } catch (error) {
    console.error('Login error:', error);
    res.render('auth/login', {
      error: 'An error occurred. Please try again.',
      success: null,
      showResendLink: false,
      userEmail: null
    });
  }
});

// Register/Signup Page - redirect if already logged in
router.get('/register', redirectIfAuth, (req, res) => {
  res.render('auth/signup', {
    error: null,
    success: null
  });
});

router.get('/signup', redirectIfAuth, (req, res) => {
  res.render('auth/signup', {
    error: null,
    success: null
  });
});

// Registration handler function
async function handleRegistration(req, res) {
  try {
    const { firstName, lastName, email, password, confirmPassword, role } = req.body;

    // Validate passwords match
    if (password !== confirmPassword) {
      return res.render('auth/signup', {
        error: 'Passwords do not match.',
        success: null
      });
    }

    // Validate password strength
    if (!passwordService.validatePassword(password)) {
      return res.render('auth/signup', {
        error: 'Password must be at least 8 characters with uppercase, lowercase, and number.',
        success: null
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.render('auth/signup', {
        error: 'An account with this email already exists.',
        success: null
      });
    }

    // Hash password
    const passwordHash = await passwordService.hashPassword(password);

    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = passwordService.hashToken(verificationToken);

    // Create user
    const userRole = role === 'organiser' ? 'organiser' : 'runner';
    const newUser = new User({
      firstName,
      lastName,
      email: email.toLowerCase(),
      passwordHash,
      role: userRole,
      emailVerified: false,
      emailVerificationToken: hashedToken,
      emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      organizerStatus: userRole === 'organiser' ? 'incomplete' : undefined
    });

    await newUser.save();

    // Send verification email
    await emailService.sendVerificationEmail(
      newUser.email,
      verificationToken,
      newUser.role,
      newUser.firstName
    );

    // Redirect to verification sent page
    res.redirect(`/verify-email-sent?email=${encodeURIComponent(newUser.email)}`);

  } catch (error) {
    console.error('Registration error:', error);
    res.render('auth/signup', {
      error: 'An error occurred during registration. Please try again.',
      success: null
    });
  }
}

// Shared registration handler - redirect if already logged in
router.post('/register', redirectIfAuth, handleRegistration);
router.post('/signup', redirectIfAuth, handleRegistration);

router.get('/auth/google', redirectIfAuth, (req, res) => {
  if (!googleOAuthService.isConfigured()) {
    return res.redirect('/login?type=error&message=Google+sign-in+is+not+configured');
  }

  const state = googleOAuthService.createStateToken();
  req.session.googleOAuthState = state;
  req.session.googleOAuthStateCreatedAt = Date.now();

  const maybeReturnTo = resolveSafeReturnTo(req.query.returnTo, null);
  if (maybeReturnTo) {
    req.session.googleOAuthReturnTo = maybeReturnTo;
  } else {
    delete req.session.googleOAuthReturnTo;
  }

  const authUrl = googleOAuthService.buildAuthorizationUrl({ state });
  return res.redirect(authUrl);
});

router.get('/auth/google/callback', redirectIfAuth, async (req, res) => {
  try {
    if (!googleOAuthService.isConfigured()) {
      return res.redirect('/login?type=error&message=Google+sign-in+is+not+configured');
    }

    if (req.query.error) {
      return res.redirect('/login?type=error&message=Google+sign-in+was+canceled');
    }

    const stateFromGoogle = String(req.query.state || '');
    const expectedState = String(req.session.googleOAuthState || '');
    const stateCreatedAt = Number(req.session.googleOAuthStateCreatedAt || 0);

    delete req.session.googleOAuthState;
    delete req.session.googleOAuthStateCreatedAt;

    if (!stateFromGoogle || !expectedState || stateFromGoogle !== expectedState) {
      return res.redirect('/login?type=error&message=Google+sign-in+state+is+invalid');
    }

    if (!stateCreatedAt || (Date.now() - stateCreatedAt) > (10 * 60 * 1000)) {
      return res.redirect('/login?type=error&message=Google+sign-in+session+expired');
    }

    const code = String(req.query.code || '');
    if (!code) {
      return res.redirect('/login?type=error&message=Google+sign-in+code+is+missing');
    }

    const tokens = await googleOAuthService.exchangeCodeForTokens({ code });
    if (!tokens || !tokens.access_token) {
      return res.redirect('/login?type=error&message=Google+token+exchange+failed');
    }

    const profile = await googleOAuthService.fetchUserInfo({ accessToken: tokens.access_token });
    const googleId = String(profile.sub || '').trim();
    const email = String(profile.email || '').trim().toLowerCase();
    const emailVerified = Boolean(profile.email_verified);

    if (!googleId || !email || !emailVerified) {
      return res.redirect('/login?type=error&message=Google+account+is+missing+verified+email');
    }

    let user = await User.findOne({ googleId });
    if (!user) {
      user = await User.findOne({ email });

      if (user) {
        if (user.googleId && user.googleId !== googleId) {
          return res.redirect('/login?type=error&message=Google+account+link+conflict');
        }

        user.googleId = googleId;
        user.avatarUrl = String(profile.picture || user.avatarUrl || '');
        if (!user.emailVerified) {
          user.emailVerified = true;
          user.emailVerificationToken = null;
          user.emailVerificationExpires = null;
        }
        await user.save();
      } else {
        const fullName = String(profile.name || '').trim();
        let firstName = String(profile.given_name || '').trim();
        let lastName = String(profile.family_name || '').trim();

        if (!firstName && fullName) {
          const parts = fullName.split(/\s+/).filter(Boolean);
          firstName = parts[0] || 'Runner';
          lastName = parts.slice(1).join(' ');
        }

        user = await User.create({
          firstName: firstName || 'Runner',
          lastName,
          email,
          role: 'runner',
          emailVerified: true,
          authProvider: 'google',
          googleId,
          avatarUrl: String(profile.picture || ''),
          organizerStatus: 'not_applied'
        });
      }
    }

    startAuthenticatedSession(req, user);

    const googleReturnTo = resolveSafeReturnTo(req.session.googleOAuthReturnTo);
    delete req.session.googleOAuthReturnTo;
    if (googleReturnTo) {
      return res.redirect(googleReturnTo);
    }

    return redirectAfterLogin(req, res, user);
  } catch (error) {
    console.error('Google OAuth callback error:', error);
    return res.redirect('/login?type=error&message=Google+sign-in+failed');
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

// Email Verification Handler - Handles all scenarios
router.get('/verify-email/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const email = req.query.email || null;

    // SCENARIO 5: Handle null/malformed token
    if (!token || token.trim() === '') {
      console.warn('[Email Verification] Empty token provided');
      return res.render('auth/verify-email-result', {
        success: false,
        message: 'Invalid verification link.',
        isOrganizer: false,
        showResendButton: true,
        email: email
      });
    }

    // Hash the token for database lookup
    const hashedToken = passwordService.hashToken(token);

    // Find user by verification token
    const user = await User.findOne({
      emailVerificationToken: hashedToken
    });

    // SCENARIO 4: Token doesn't exist in database
    if (!user) {
      console.warn(`[Email Verification] Token not found in database: ${token.substring(0, 10)}...`);
      
      // SCENARIO 3 & 6: Check if email was provided and user exists with that email
      if (email) {
        const userByEmail = await User.findOne({ email: email.toLowerCase() });
        
        if (userByEmail) {
          // User exists - check if already verified
          if (userByEmail.emailVerified === true) {
            console.info(`[Email Verification] Email already verified: ${email}`);
            return res.render('auth/verify-email-already-verified', {
              email: email,
              firstName: userByEmail.firstName
            });
          } else if (!userByEmail.emailVerificationToken) {
            // Token was cleared but email not verified - likely expired
            console.info(`[Email Verification] Token expired/cleared for: ${email}`);
            return res.render('auth/verify-email-expired', {
              email: email
            });
          }
        }
      }

      // Generic invalid link response
      return res.render('auth/verify-email-result', {
        success: false,
        message: 'Invalid verification link.',
        isOrganizer: false,
        showResendButton: true,
        email: email
      });
    }

    // User found by token - now check expiration
    const now = Date.now();
    const expiresAt = user.emailVerificationExpires?.getTime?.() || user.emailVerificationExpires;

    // SCENARIO 2: Token exists but IS expired
    if (expiresAt && expiresAt < now) {
      console.warn(`[Email Verification] Token expired for user: ${user.email}`);
      return res.render('auth/verify-email-expired', {
        email: user.email
      });
    }

    // SCENARIO 1: Valid token + Not expired → Verify email ✅
    console.info(`[Email Verification] Successfully verified email: ${user.email}`);
    
    // Update user: mark as verified, clear token
    await User.findByIdAndUpdate(
      user._id,
      {
        $set: {
          emailVerified: true,
          emailVerificationToken: null,
          emailVerificationExpires: null
        }
      },
      { new: true }
    );

    // Set session
    req.session.userId = user._id;

    // SCENARIO 7: Render success page
    res.render('auth/verify-email-success', {
      email: user.email,
      firstName: user.firstName,
      role: user.role,
      isOrganizer: user.role === 'organiser'
    });

  } catch (error) {
    console.error('[Email Verification] Unexpected error:', error);
    res.status(500).render('auth/verify-email-result', {
      success: false,
      message: 'An error occurred during email verification. Please try again.',
      isOrganizer: false,
      showResendButton: true,
      email: req.query.email || null
    });
  }
});

// Logout Handler (POST) - should already be at root level
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.redirect('/');
    }
    res.clearCookie('connect.sid');
    res.clearCookie('hr.sid');
    res.redirect('/');
  });
});

// ============================================================================
// EMAIL RESEND VERIFICATION ROUTES
// ============================================================================

// Resend Verification Page
router.get('/resend-verification', (req, res) => {
  console.log('📄 GET /resend-verification - Showing form');
  res.render('auth/resend-verification', {
    success: req.query.success || null,
    error: req.query.error || null,
    prefillEmail: req.query.email || ''
  });
});

// Resend Verification Form Handler
router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;
    
    console.log('========================================');
    console.log('🔍 RESEND VERIFICATION REQUEST');
    console.log('========================================');
    console.log('📧 Raw email from form:', email);
    console.log('📧 Email type:', typeof email);
    
    // ✅ Validate & trim email
    if (!email || typeof email !== 'string') {
      console.warn('❌ VALIDATION FAILED: Email is missing or not a string');
      return res.render('auth/resend-verification', {
        error: 'Email is required.',
        prefillEmail: ''
      });
    }

    const trimmedEmail = email.trim().toLowerCase();
    console.log('✅ Trimmed & lowercased email:', trimmedEmail);

    // ✅ Case-insensitive search
    console.log('🔎 Searching database for user...');
    
    const user = await User.findOne({ 
      email: { $regex: `^${trimmedEmail}$`, $options: 'i' } 
    });

    console.log('---');
    if (!user) {
      console.warn('❌ USER NOT FOUND in database');
      console.log('---');
      console.log('💡 Debugging tips:');
      console.log('   - Searched for:', trimmedEmail);
      
      // Debug: Find all users
      const allUsers = await User.find({}, 'email emailVerified');
      console.log('📋 All users in database:');
      allUsers.forEach((u, index) => {
        console.log(`   ${index + 1}. ${u.email} (verified: ${u.emailVerified})`);
      });
      
      return res.render('auth/resend-verification', {
        error: 'Email not found. Please check your email address.',
        prefillEmail: trimmedEmail
      });
    }

    console.log('✅ USER FOUND!');
    console.log('---');
    console.log('👤 User Details:');
    console.log('   - Email:', user.email);
    console.log('   - Name:', user.firstName, user.lastName);
    console.log('   - Email Verified:', user.emailVerified);
    console.log('   - Has token:', !!user.emailVerificationToken);
    console.log('   - Token expires:', user.emailVerificationExpires);
    console.log('---');

    // ✅ Check if already verified
    if (user.emailVerified) {
      console.warn('⚠️  EMAIL ALREADY VERIFIED');
      console.log('---');
      return res.render('auth/resend-verification', {
        error: 'This email is already verified. Please log in.',
        prefillEmail: trimmedEmail
      });
    }

    console.log('✅ Email not yet verified - proceeding to resend');

    // ✅ Generate new token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    console.log('🔐 Generated new verification token');
    console.log('   - Token (first 20 chars):', verificationToken.substring(0, 20) + '...');
    console.log('   - Expires at:', verificationExpires);

    // ✅ Hash token (using your password service)
    const hashedToken = passwordService.hashToken(verificationToken);

    // ✅ Update user with new token
    user.emailVerificationToken = hashedToken;
    user.emailVerificationExpires = verificationExpires;
    await user.save();
    
    console.log('💾 Token saved to database');
    console.log('   - Hashed token (first 20 chars):', hashedToken.substring(0, 20) + '...');

    // ✅ Send verification email
    console.log('📨 Sending verification email...');
    await emailService.sendVerificationEmail(
      user.email,
      verificationToken,
      user.role,
      user.firstName
    );
    
    console.log('✅ Verification email sent successfully!');

    // ✅ Success response
    console.log('---');
    console.log('✅ RESEND VERIFICATION SUCCESS');
    console.log('========================================');
    
    return res.render('auth/resend-verification', {
      success: 'Verification email sent! Check your inbox and spam folder.',
      prefillEmail: trimmedEmail
    });

  } catch (error) {
    console.error('========================================');
    console.error('❌ RESEND VERIFICATION ERROR');
    console.error('========================================');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('========================================');
    
    return res.render('auth/resend-verification', {
      error: 'Something went wrong. Please try again later.',
      prefillEmail: req.body.email || ''
    });
  }
});

module.exports = router;
