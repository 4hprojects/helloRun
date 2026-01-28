const User = require('../models/User');
const passwordService = require('../services/password.service');
const counterService = require('../services/counter.service');
const tokenService = require('../services/token.service');
const emailService = require('../services/email.service');

exports.getLogin = (req, res) => {
  res.render('auth/login', { 
    title: 'Login - helloRun',
    error: null,
    email: req.query.email || null
  });
};

exports.getSignup = (req, res) => {
  res.render('auth/signup', { 
    title: 'Sign Up - helloRun',
    error: null,
    emailExists: false,
    email: null
  });
};

exports.postSignup = async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.render('auth/signup', {
        title: 'Sign Up - HelloRun',
        error: null,
        emailExists: true,
        email: email,
        authProvider: existingUser.authProvider || 'local'
      });
    }

    // Generate unique userId
    const userId = await counterService.getNextUserId();

    // Hash password
    const passwordHash = await passwordService.hashPassword(password);

    // Create new user
    const user = new User({
      userId,
      firstName,
      lastName,
      email: email.toLowerCase(),
      passwordHash,
      authProvider: 'local'
    });

    await user.save();

    // Generate verification token
    const verificationToken = emailService.generateVerificationToken();
    
    user.emailVerificationToken = verificationToken;
    user.emailVerificationExpires = Date.now() + parseInt(process.env.EMAIL_VERIFICATION_EXPIRY);
    await user.save();

    // Send verification email
    await emailService.sendVerificationEmail(user, verificationToken);

    res.render('auth/verify-email-sent', {
      title: 'Verify Your Email - HelloRun',
      email: user.email,
      emailSent: true  // Add this line
    });

  } catch (error) {
    console.error('Signup error:', error);
    res.render('auth/signup', {
      title: 'Sign Up - HelloRun',
      error: 'An error occurred during signup. Please try again.',
      emailExists: false,
      email: req.body.email || ''
    });
  }
};

exports.postLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.render('auth/login', {
        title: 'Login - helloRun',
        error: 'Email and password are required',
        email: email || null
      });
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.render('auth/login', {
        title: 'Login - helloRun',
        error: 'Invalid email or password',
        email: email || null
      });
    }

    // Check if email is verified
    if (!user.emailVerified) {
      return res.render('auth/login', {
        title: 'Login - helloRun',
        error: 'Please verify your email before logging in.',
        email: email || null,
        showResendLink: true,
        userId: user._id
      });
    }

    // Check auth provider
    if (user.authProvider !== 'local') {
      return res.render('auth/login', {
        title: 'Login - helloRun',
        error: `This email is registered with ${user.authProvider}. Please use ${user.authProvider} to login.`,
        email: email || null
      });
    }

    // Verify password
    const isPasswordValid = await passwordService.comparePassword(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.render('auth/login', {
        title: 'Login - helloRun',
        error: 'Invalid email or password',
        email: email || null
      });
    }

    console.log(`User logged in: ${user.userIdFormatted} (${user.email})`);

    // Create session
    req.session.user = {
      id: user._id,
      userId: user.userId,
      userIdFormatted: user.userIdFormatted,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      authProvider: user.authProvider,
      emailVerified: user.emailVerified
    };

    res.redirect('/');
  } catch (error) {
    console.error('Login error:', error);
    res.render('auth/login', {
      title: 'Login - helloRun',
      error: 'An error occurred. Please try again.',
      email: req.body.email || null
    });
  }
};

exports.logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
    }
    res.redirect('/');
  });
};

// Email verification handler
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.render('auth/verify-email-expired', {
        title: 'Verification Link Expired - helloRun'
      });
    }

    // Verify email
    user.emailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpires = null;
    await user.save();

    console.log(`Email verified: ${user.userIdFormatted} (${user.email})`);

    res.render('auth/verify-email-success', {
      title: 'Email Verified - helloRun',
      email: user.email
    });

  } catch (error) {
    console.error('Email verification error:', error);
    res.render('error', {
      title: 'Error - helloRun',
      message: 'An error occurred during verification. Please try again.',
      user: null
    });
  }
};

// Resend verification email
exports.resendVerification = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.render('auth/resend-verification', {
        title: 'Resend Verification - helloRun',
        error: 'No account found with this email',
        success: false
      });
    }

    if (user.emailVerified) {
      return res.render('auth/resend-verification', {
        title: 'Resend Verification - helloRun',
        error: 'This email is already verified',
        success: false
      });
    }

    // Check rate limit
    if (!user.canReceiveVerificationEmail()) {
      return res.render('auth/resend-verification', {
        title: 'Resend Verification - helloRun',
        error: 'Too many verification emails sent. Please try again later.',
        success: false
      });
    }

    // Generate new token
    const { token, expires } = tokenService.generateEmailVerificationToken();
    user.emailVerificationToken = token;
    user.emailVerificationExpires = expires;

    // Send email
    const emailResult = await emailService.sendVerificationEmail(user, token);

    if (!emailResult.success) {
      return res.render('auth/resend-verification', {
        title: 'Resend Verification - helloRun',
        error: 'Failed to send email. Please try again later.',
        success: false
      });
    }

    // Increment count
    user.incrementVerificationEmailCount();
    await user.save();

    res.render('auth/resend-verification', {
      title: 'Resend Verification - helloRun',
      error: null,
      success: true,
      email: user.email
    });

  } catch (error) {
    console.error('Resend verification error:', error);
    res.render('auth/resend-verification', {
      title: 'Resend Verification - helloRun',
      error: 'An error occurred. Please try again.',
      success: false
    });
  }
};

exports.getResendVerification = (req, res) => {
  res.render('auth/resend-verification', {
    title: 'Resend Verification - helloRun',
    error: null,
    success: false,
    email: req.query.email || null
  });
};

// Forgot password - show form
exports.getForgotPassword = (req, res) => {
  res.render('auth/forgot-password', {
    title: 'Forgot Password - helloRun',
    error: null,
    email: req.query.email || null
  });
};

// Forgot password - send reset email
exports.postForgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Always show success message (security - don't reveal if email exists)
    const user = await User.findOne({ email: email.toLowerCase() });

    if (user && user.authProvider === 'local') {
      // Generate reset token
      const { token, expires } = tokenService.generatePasswordResetToken();
      user.passwordResetToken = token;
      user.passwordResetExpires = expires;
      user.lastPasswordResetSent = new Date();
      await user.save();

      // Send email
      await emailService.sendPasswordResetEmail(user, token);
    }

    // Always show success (don't reveal if email exists)
    res.render('auth/reset-email-sent', {
      title: 'Reset Email Sent - helloRun',
      email: email
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.render('auth/forgot-password', {
      title: 'Forgot Password - helloRun',
      error: 'An error occurred. Please try again.',
      email: req.body.email || null
    });
  }
};

// Reset password - show form
exports.getResetPassword = async (req, res) => {
  try {
    const { token } = req.params;

    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.render('auth/reset-password-expired', {
        title: 'Reset Link Expired - helloRun'
      });
    }

    res.render('auth/reset-password', {
      title: 'Reset Password - helloRun',
      token: token,
      error: null
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.render('error', {
      title: 'Error - helloRun',
      message: 'An error occurred. Please try again.',
      user: null
    });
  }
};

// Reset password - update password
exports.postResetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password, confirmPassword } = req.body;

    // Validation
    if (!password || !confirmPassword) {
      return res.render('auth/reset-password', {
        title: 'Reset Password - helloRun',
        token: token,
        error: 'All fields are required'
      });
    }

    if (password !== confirmPassword) {
      return res.render('auth/reset-password', {
        title: 'Reset Password - helloRun',
        token: token,
        error: 'Passwords do not match'
      });
    }

    if (!passwordService.validatePassword(password)) {
      return res.render('auth/reset-password', {
        title: 'Reset Password - helloRun',
        token: token,
        error: 'Password must be at least 8 characters and contain one uppercase letter, one lowercase letter, and one number'
      });
    }

    // Find user
    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.render('auth/reset-password-expired', {
        title: 'Reset Link Expired - helloRun'
      });
    }

    // Update password
    user.passwordHash = await passwordService.hashPassword(password);
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    await user.save();

    console.log(`Password reset: ${user.userIdFormatted} (${user.email})`);

    res.render('auth/reset-success', {
      title: 'Password Reset Successful - helloRun',
      email: user.email
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.render('auth/reset-password', {
      title: 'Reset Password - helloRun',
      token: req.params.token,
      error: 'An error occurred. Please try again.'
    });
  }
};