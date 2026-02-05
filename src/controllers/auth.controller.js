const User = require('../models/user.model');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const emailService = require('../services/email.service');

exports.getSignup = (req, res) => {
  res.render('auth/signup', {
    title: 'Sign Up - HelloRun',
    error: null,
    emailExists: false,
    formData: { firstName: '', lastName: '', email: '', role: '' }
  });
};

exports.postSignup = async (req, res) => {
  try {
    const { firstName, lastName, email, password, confirmPassword, role, agreeTerms } = req.body;

    // Store form data for re-rendering on error
    const formData = { firstName, lastName, email, role };

    // 1. Validate all required fields
    if (!firstName || !lastName || !email || !password || !confirmPassword || !role) {
      return res.render('auth/signup', {
        title: 'Sign Up - HelloRun',
        error: 'All fields are required',
        emailExists: false,
        formData
      });
    }

    // 2. Validate first name
    if (firstName.trim().length < 2 || firstName.trim().length > 50) {
      return res.render('auth/signup', {
        title: 'Sign Up - HelloRun',
        error: 'First name must be between 2 and 50 characters',
        emailExists: false,
        formData
      });
    }

    // 3. Validate last name
    if (lastName.trim().length < 2 || lastName.trim().length > 50) {
      return res.render('auth/signup', {
        title: 'Sign Up - HelloRun',
        error: 'Last name must be between 2 and 50 characters',
        emailExists: false,
        formData
      });
    }

    // 4. Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.render('auth/signup', {
        title: 'Sign Up - HelloRun',
        error: 'Please enter a valid email address',
        emailExists: false,
        formData
      });
    }

    // 5. Check if email already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.render('auth/signup', {
        title: 'Sign Up - HelloRun',
        error: 'Email already registered',
        emailExists: true,
        formData
      });
    }

    // 6. Validate password strength
    if (password.length < 8) {
      return res.render('auth/signup', {
        title: 'Sign Up - HelloRun',
        error: 'Password must be at least 8 characters long',
        emailExists: false,
        formData
      });
    }

    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
      return res.render('auth/signup', {
        title: 'Sign Up - HelloRun',
        error: 'Password must contain uppercase, lowercase, and a number',
        emailExists: false,
        formData
      });
    }

    // 7. Validate password match
    if (password !== confirmPassword) {
      return res.render('auth/signup', {
        title: 'Sign Up - HelloRun',
        error: 'Passwords do not match',
        emailExists: false,
        formData
      });
    }

    // 8. Validate role
    if (!['runner', 'organiser'].includes(role)) {
      return res.render('auth/signup', {
        title: 'Sign Up - HelloRun',
        error: 'Please select a valid role',
        emailExists: false,
        formData
      });
    }

    // 9. Validate terms agreement
    if (agreeTerms !== 'on') {
      return res.render('auth/signup', {
        title: 'Sign Up - HelloRun',
        error: 'You must agree to the Terms and Conditions',
        emailExists: false,
        formData
      });
    }

    // ✅ 10. Generate email verification token BEFORE saving
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpiry = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // ✅ 11. Create new user WITH verification token
    const user = new User({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.toLowerCase(),
      password: hashedPassword,
      role,
      authProvider: 'local',
      isVerified: false,
      emailVerified: false,
      emailVerificationToken: verificationToken,
      emailVerificationExpires: verificationExpiry
    });

    // ✅ 12. Save user to database
    await user.save();
    console.log('✅ User created:', user.email);

    // ✅ 13. Send verification email (using APP_URL from .env)
    const verificationUrl = `${process.env.APP_URL}/verify-email/${verificationToken}`;
    
    try {
      await emailService.sendVerificationEmail(
        user.email,
        user.firstName,
        verificationUrl
      );
      console.log('✅ Verification email sent to:', user.email);
    } catch (emailError) {
      console.error('❌ Failed to send verification email:', emailError);
      // Don't fail registration if email fails
    }

    // ✅ 14. Redirect to "check your email" page
    res.redirect('/verify-email-sent?email=' + encodeURIComponent(user.email));

  } catch (error) {
    console.error('❌ Signup error:', error);
    res.render('auth/signup', {
      title: 'Sign Up - HelloRun',
      error: 'Something went wrong. Please try again.',
      emailExists: false,
      formData: { firstName: '', lastName: '', email: '', role: '' }
    });
  }
};

// ✅ LOGIN - Simplified (no passwordService dependency)
exports.getLogin = (req, res) => {
  res.render('auth/login', {
    title: 'Login - HelloRun',
    error: null,
    showResendLink: false,
    userEmail: null
  });
};

exports.postLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.render('auth/login', {
        title: 'Login - HelloRun',
        error: 'Invalid email or password',
        showResendLink: false,
        userEmail: null
      });
    }

    // 2. Check auth provider
    if (user.authProvider !== 'local') {
      return res.render('auth/login', {
        title: 'Login - HelloRun',
        error: `This account uses ${user.authProvider} authentication. Please use the ${user.authProvider} login button.`,
        showResendLink: false,
        userEmail: null
      });
    }

    // 3. Verify password (using bcrypt directly)
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.render('auth/login', {
        title: 'Login - HelloRun',
        error: 'Invalid email or password',
        showResendLink: false,
        userEmail: null
      });
    }

    // 4. Check if email is verified
    if (!user.emailVerified) {
      return res.render('auth/login', {
        title: 'Login - HelloRun',
        error: 'Please verify your email before logging in.',
        showResendLink: true,
        userEmail: user.email
      });
    }

    // 5. Create session
    req.session.userId = user._id;
    req.session.role = user.role;
    
    // Add success flash message with user's name
    req.session.loginSuccess = true;
    req.session.userName = user.firstName;

    // Redirect based on role and organizer status
    if (user.role === 'organiser') {
      // If organizer application is pending review
      if (user.organizerStatus === 'pending') {
        return res.redirect('/organizer/application-status');
      }
      
      // If organizer is approved
      if (user.organizerStatus === 'approved') {
        // TODO: Phase 6B - Redirect to /organiser/dashboard when built
        // Temporary: redirect to events page
        return res.redirect('/events');
      }
      
      // If organizer hasn't completed profile yet
      return res.redirect('/organizer/complete-profile');
    }

    // For runners
    // TODO: Phase 6A - Redirect to /dashboard when built
    // Temporary: redirect to events page
    return res.redirect('/events');

  } catch (error) {
    console.error('❌ Login error:', error);
    res.render('auth/login', {
      title: 'Login - HelloRun',
      error: 'An error occurred during login. Please try again.',
      showResendLink: false,
      userEmail: null
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

// ✅ EMAIL VERIFICATION
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.render('auth/verify-email-expired', {
        title: 'Verification Link Expired - HelloRun'
      });
    }

    // Verify email
    user.emailVerified = true;
    user.isVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpires = null;
    await user.save();

    console.log(`✅ Email verified: ${user.email}`);

    res.render('auth/verify-email-success', {
      title: 'Email Verified - HelloRun',
      email: user.email
    });

  } catch (error) {
    console.error('❌ Email verification error:', error);
    res.render('error', {
      title: 'Error - HelloRun',
      message: 'An error occurred during verification. Please try again.'
    });
  }
};

// ✅ VERIFY EMAIL SENT PAGE
exports.getVerifyEmailSent = (req, res) => {
  const email = req.query.email || 'your email';
  res.render('auth/verify-email-sent', {
    title: 'Check Your Email - HelloRun',
    email: email
  });
};

// ✅ RESEND VERIFICATION
exports.getResendVerification = (req, res) => {
  res.render('auth/resend-verification', {
    title: 'Resend Verification - HelloRun',
    error: null,
    success: false,
    email: req.query.email || null
  });
};

exports.postResendVerification = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.render('auth/resend-verification', {
        title: 'Resend Verification - HelloRun',
        error: 'No account found with this email',
        success: false,
        email: email
      });
    }

    if (user.emailVerified) {
      return res.render('auth/resend-verification', {
        title: 'Resend Verification - HelloRun',
        error: 'This email is already verified',
        success: false,
        email: email
      });
    }

    // Check rate limit
    if (!user.canReceiveVerificationEmail()) {
      return res.render('auth/resend-verification', {
        title: 'Resend Verification - HelloRun',
        error: 'Too many verification emails sent. Please try again later.',
        success: false,
        email: email
      });
    }

    // Generate new token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpiry = new Date(Date.now() + 48 * 60 * 60 * 1000);
    
    user.emailVerificationToken = verificationToken;
    user.emailVerificationExpires = verificationExpiry;

    // Send email (using APP_URL from .env)
    const verificationUrl = `${process.env.APP_URL}/verify-email/${verificationToken}`;
    await emailService.sendVerificationEmail(user.email, user.firstName, verificationUrl);

    // Increment count
    user.incrementVerificationEmailCount();
    await user.save();

    console.log(`✅ Verification email resent to: ${user.email}`);

    res.render('auth/resend-verification', {
      title: 'Resend Verification - HelloRun',
      error: null,
      success: true,
      email: user.email
    });

  } catch (error) {
    console.error('❌ Resend verification error:', error);
    res.render('auth/resend-verification', {
      title: 'Resend Verification - HelloRun',
      error: 'An error occurred. Please try again.',
      success: false,
      email: req.body.email || null
    });
  }
};