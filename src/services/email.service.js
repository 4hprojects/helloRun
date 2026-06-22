const crypto = require('crypto');
const { Resend } = require('resend');

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : { emails: { send: async () => ({ data: { skipped: true }, error: null }) } };

// Logo URL from GitHub
const LOGO_URL = 'https://raw.githubusercontent.com/4hprojects/helloRun/main/src/public/images/helloRun-icon.webp';

// Send password reset email
exports.sendPasswordResetEmail = async (email, resetToken, firstName) => {
  const resetUrl = `${process.env.APP_URL}/reset-password/${resetToken}`;
  const expiryHours = parseInt(process.env.PASSWORD_RESET_EXPIRY) / (1000 * 60 * 60);

  try {
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Reset Your HelloRun Password',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              color: #1e293b;
              background-color: #f8fafc;
              margin: 0;
              padding: 0;
            }
            .email-container {
              max-width: 600px;
              margin: 0 auto;
              background-color: #ffffff;
            }
            .header {
              background: linear-gradient(135deg, #FA9A4B 0%, #E0A46A 100%);
              padding: 40px 20px;
              text-align: center;
            }
            .header-content {
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 15px;
            }
            .logo {
              width: 48px;
              height: 48px;
              vertical-align: middle;
            }
            .header h1 {
              color: #ffffff;
              margin: 0;
              font-size: 28px;
              font-weight: 700;
              display: inline;
            }
            .content {
              padding: 40px 30px;
            }
            .greeting {
              font-size: 18px;
              font-weight: 600;
              color: #1e293b;
              margin-bottom: 20px;
            }
            .message {
              color: #64748b;
              margin-bottom: 30px;
              font-size: 15px;
            }
            .button-container {
              text-align: center;
              margin: 40px 0;
            }
            .reset-button {
              display: inline-block;
              background: linear-gradient(135deg, #FA9A4B 0%, #E0A46A 100%);
              color: #ffffff !important;
              text-decoration: none;
              padding: 16px 40px;
              border-radius: 8px;
              font-weight: 600;
              font-size: 16px;
              box-shadow: 0 4px 12px rgba(250, 154, 75, 0.3);
            }
            .reset-button:hover {
              box-shadow: 0 6px 16px rgba(250, 154, 75, 0.4);
            }
            .alternative-link {
              background-color: #f1f5f9;
              padding: 20px;
              border-radius: 8px;
              margin: 30px 0;
              word-break: break-all;
            }
            .alternative-link p {
              margin: 0 0 10px 0;
              color: #64748b;
              font-size: 13px;
            }
            .alternative-link a {
              color: #FA9A4B;
              font-size: 13px;
            }
            .security-notice {
              background-color: #fef3c7;
              border-left: 4px solid #f59e0b;
              padding: 15px 20px;
              margin: 30px 0;
              border-radius: 4px;
            }
            .security-notice p {
              margin: 5px 0;
              color: #92400e;
              font-size: 14px;
            }
            .footer {
              background-color: #f8fafc;
              padding: 30px;
              text-align: center;
              border-top: 1px solid #e2e8f0;
            }
            .footer p {
              color: #94a3b8;
              font-size: 13px;
              margin: 5px 0;
            }
            .footer a {
              color: #FA9A4B;
              text-decoration: none;
            }
          </style>
        </head>
        <body>
          <div class="email-container">
            <div class="header">
              <div class="header-content">
                <img src="${LOGO_URL}" alt="HelloRun" class="logo" />
                <h1>HelloRun</h1>
              </div>
            </div>
            
            <div class="content">
              <p class="greeting">Hi ${firstName || 'there'},</p>
              
              <p class="message">
                We received a request to reset your password for your HelloRun account. 
                Click the button below to create a new password.
              </p>
              
              <div class="button-container">
                <a href="${resetUrl}" class="reset-button">Reset Password</a>
              </div>
              
              <div class="alternative-link">
                <p>Or copy and paste this link into your browser:</p>
                <a href="${resetUrl}">${resetUrl}</a>
              </div>
              
              <div class="security-notice">
                <p><strong>⚠️ Security Notice:</strong></p>
                <p>• This link will expire in ${expiryHours} hour(s)</p>
                <p>• If you didn't request this reset, please ignore this email</p>
                <p>• Your password won't change until you create a new one</p>
              </div>
              
              <p class="message">
                Stay safe and keep running! 🏃‍♂️
              </p>
            </div>
            
            <div class="footer">
              <p><strong>HelloRun</strong></p>
              <p>Your running journey companion</p>
              <p style="margin-top: 20px;">
                <a href="${process.env.APP_URL}">Visit HelloRun</a> • 
                <a href="${process.env.APP_URL}/contact">Support</a>
              </p>
              <p style="margin-top: 20px; font-size: 12px;">
                This is an automated email. Please do not reply.
              </p>
            </div>
          </div>
        </body>
        </html>
      `
    });

    if (error) {
      console.error('Resend email error:', error);
      throw new Error('Failed to send password reset email');
    }

    return data;
  } catch (error) {
    console.error('Email service error:', error);
    throw error;
  }
};

// Send password reset confirmation email
exports.sendPasswordResetConfirmation = async (email, firstName) => {
  try {
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Your HelloRun Password Has Been Reset',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              color: #1e293b;
              background-color: #f8fafc;
              margin: 0;
              padding: 0;
            }
            .email-container {
              max-width: 600px;
              margin: 0 auto;
              background-color: #ffffff;
            }
            .header {
              background: linear-gradient(135deg, #10b981 0%, #059669 100%);
              padding: 40px 20px;
              text-align: center;
            }
            .header-content {
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 15px;
            }
            .logo {
              width: 48px;
              height: 48px;
              vertical-align: middle;
            }
            .header h1 {
              color: #ffffff;
              margin: 0;
              font-size: 28px;
              font-weight: 700;
              display: inline;
            }
            .content {
              padding: 40px 30px;
            }
            .success-icon {
              width: 64px;
              height: 64px;
              background: #d1fae5;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              margin: 0 auto 30px;
              font-size: 32px;
            }
            .greeting {
              font-size: 18px;
              font-weight: 600;
              color: #1e293b;
              margin-bottom: 20px;
            }
            .message {
              color: #64748b;
              margin-bottom: 20px;
              font-size: 15px;
            }
            .security-notice {
              background-color: #dbeafe;
              border-left: 4px solid #3b82f6;
              padding: 15px 20px;
              margin: 30px 0;
              border-radius: 4px;
            }
            .security-notice p {
              margin: 5px 0;
              color: #1e40af;
              font-size: 14px;
            }
            .button-container {
              text-align: center;
              margin: 40px 0;
            }
            .login-button {
              display: inline-block;
              background: linear-gradient(135deg, #FA9A4B 0%, #E0A46A 100%);
              color: #ffffff !important;
              text-decoration: none;
              padding: 16px 40px;
              border-radius: 8px;
              font-weight: 600;
              font-size: 16px;
              box-shadow: 0 4px 12px rgba(250, 154, 75, 0.3);
            }
            .footer {
              background-color: #f8fafc;
              padding: 30px;
              text-align: center;
              border-top: 1px solid #e2e8f0;
            }
            .footer p {
              color: #94a3b8;
              font-size: 13px;
              margin: 5px 0;
            }
            .footer a {
              color: #FA9A4B;
              text-decoration: none;
            }
          </style>
        </head>
        <body>
          <div class="email-container">
            <div class="header">
              <div class="header-content">
                <img src="${LOGO_URL}" alt="HelloRun" class="logo" />
                <h1>HelloRun</h1>
              </div>
            </div>
            
            <div class="content">
              <div class="success-icon">✓</div>
              
              <p class="greeting">Hi ${firstName || 'there'},</p>
              
              <p class="message">
                Your password has been successfully reset! You can now log in to your 
                HelloRun account with your new password.
              </p>
              
              <div class="button-container">
                <a href="${process.env.APP_URL}/login" class="login-button">Log In Now</a>
              </div>
              
              <div class="security-notice">
                <p><strong>🔒 Security Reminder:</strong></p>
                <p>• If you didn't make this change, please contact us immediately</p>
                <p>• Keep your password secure and don't share it with anyone</p>
                <p>• Consider using a password manager for better security</p>
              </div>
              
              <p class="message">
                Happy running! 🏃‍♂️
              </p>
            </div>
            
            <div class="footer">
              <p><strong>HelloRun</strong></p>
              <p>Your running journey companion</p>
              <p style="margin-top: 20px;">
                <a href="${process.env.APP_URL}">Visit HelloRun</a> • 
                <a href="${process.env.APP_URL}/contact">Support</a>
              </p>
              <p style="margin-top: 20px; font-size: 12px;">
                This is an automated email. Please do not reply.
              </p>
            </div>
          </div>
        </body>
        </html>
      `
    });

    if (error) {
      console.error('Resend confirmation email error:', error);
      throw new Error('Failed to send confirmation email');
    }

    return data;
  } catch (error) {
    console.error('Email service error:', error);
    throw error;
  }
};

// Send email verification
exports.sendVerificationEmail = async (email, verificationToken, firstName, role) => {
  const verificationUrl = `${process.env.APP_URL}/verify-email/${verificationToken}`;
  
  // Customize message based on role
  const nextSteps = role === 'organiser'
    ? '<p>After verification, you\'ll complete your organizer profile by uploading business documents.</p>'
    : '<p>After verification, you can start browsing and registering for events!</p>';

  try {
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Verify Your HelloRun Email',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              color: #1e293b;
              background-color: #f8fafc;
              margin: 0;
              padding: 0;
            }
            .email-container {
              max-width: 600px;
              margin: 0 auto;
              background-color: #ffffff;
            }
            .header {
              background: linear-gradient(135deg, #FA9A4B 0%, #E0A46A 100%);
              padding: 40px 20px;
              text-align: center;
            }
            .header-content {
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 15px;
            }
            .logo {
              width: 48px;
              height: 48px;
              vertical-align: middle;
            }
            .header h1 {
              color: #ffffff;
              margin: 0;
              font-size: 28px;
              font-weight: 700;
              display: inline;
            }
            .content {
              padding: 40px 30px;
            }
            .greeting {
              font-size: 18px;
              font-weight: 600;
              color: #1e293b;
              margin-bottom: 20px;
            }
            .message {
              color: #64748b;
              margin-bottom: 20px;
              font-size: 15px;
            }
            .button-container {
              text-align: center;
              margin: 40px 0;
            }
            .verify-button {
              display: inline-block;
              background: linear-gradient(135deg, #FA9A4B 0%, #E0A46A 100%);
              color: #ffffff !important;
              text-decoration: none;
              padding: 16px 40px;
              border-radius: 8px;
              font-weight: 600;
              font-size: 16px;
              box-shadow: 0 4px 12px rgba(250, 154, 75, 0.3);
            }
            .alternative-link {
              background-color: #f1f5f9;
              padding: 20px;
              border-radius: 8px;
              margin: 30px 0;
              word-break: break-all;
            }
            .alternative-link p {
              margin: 0 0 10px 0;
              color: #64748b;
              font-size: 13px;
            }
            .alternative-link a {
              color: #FA9A4B;
              font-size: 13px;
            }
            .security-notice {
              background-color: #fef3c7;
              border-left: 4px solid #f59e0b;
              padding: 15px 20px;
              margin: 30px 0;
              border-radius: 4px;
            }
            .security-notice p {
              margin: 5px 0;
              color: #92400e;
              font-size: 14px;
            }
            .footer {
              background-color: #f8fafc;
              padding: 30px;
              text-align: center;
              border-top: 1px solid #e2e8f0;
            }
            .footer p {
              color: #94a3b8;
              font-size: 13px;
              margin: 5px 0;
            }
            .footer a {
              color: #FA9A4B;
              text-decoration: none;
            }
          </style>
        </head>
        <body>
          <div class="email-container">
            <div class="header">
              <div class="header-content">
                <img src="${LOGO_URL}" alt="HelloRun" class="logo" />
                <h1>HelloRun</h1>
              </div>
            </div>
            
            <div class="content">
              <p class="greeting">Hi ${firstName || 'there'},</p>
              
              <p class="message">
                Welcome to HelloRun! Please verify your email address to activate your account.
              </p>
              
              ${nextSteps}
              
              <div class="button-container">
                <a href="${verificationUrl}" class="verify-button">Verify Email Address</a>
              </div>
              
              <div class="alternative-link">
                <p>Or copy and paste this link into your browser:</p>
                <a href="${verificationUrl}">${verificationUrl}</a>
              </div>
              
              <div class="security-notice">
                <p><strong>⚠️ Security Notice:</strong></p>
                <p>• This link will expire in 24 hours</p>
                <p>• If you didn't create this account, please ignore this email</p>
              </div>
            </div>
            
            <div class="footer">
              <p><strong>HelloRun</strong></p>
              <p>Your running journey companion</p>
              <p style="margin-top: 20px;">
                <a href="${process.env.APP_URL}">Visit HelloRun</a> • 
                <a href="${process.env.APP_URL}/contact">Support</a>
              </p>
              <p style="margin-top: 20px; font-size: 12px;">
                This is an automated email. Please do not reply.
              </p>
            </div>
          </div>
        </body>
        </html>
      `
    });

    if (error) {
      throw new Error('Failed to send verification email');
    }

    return data;
  } catch (error) {
    console.error('Email service error:', error);
    throw error;
  }
};

// ========================================
// NEW ORGANIZER APPLICATION EMAIL TEMPLATES
// ========================================

// Send organizer application submitted email
exports.sendApplicationSubmittedEmail = async (email, firstName, applicationId) => {
  try {
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Application Received - HelloRun Organizer',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              color: #1e293b;
              background-color: #f8fafc;
              margin: 0;
              padding: 0;
            }
            .email-container {
              max-width: 600px;
              margin: 0 auto;
              background-color: #ffffff;
            }
            .header {
              background: linear-gradient(135deg, #FA9A4B 0%, #E0A46A 100%);
              padding: 40px 20px;
              text-align: center;
            }
            .header-content {
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 15px;
            }
            .logo {
              width: 48px;
              height: 48px;
              vertical-align: middle;
            }
            .header h1 {
              color: #ffffff;
              margin: 0;
              font-size: 28px;
              font-weight: 700;
              display: inline;
            }
            .content {
              padding: 40px 30px;
            }
            .greeting {
              font-size: 18px;
              font-weight: 600;
              color: #1e293b;
              margin-bottom: 20px;
            }
            .message {
              color: #64748b;
              margin-bottom: 20px;
              font-size: 15px;
            }
            .app-id-box {
              background: #f8fafc;
              padding: 20px;
              border-left: 4px solid #FA9A4B;
              margin: 30px 0;
              border-radius: 4px;
            }
            .app-id-box p {
              margin: 5px 0;
              color: #1e293b;
              font-size: 14px;
            }
            .app-id-box strong {
              color: #FA9A4B;
            }
            .timeline {
              margin: 30px 0;
            }
            .timeline h3 {
              color: #1e293b;
              font-size: 16px;
              margin-bottom: 15px;
            }
            .timeline-item {
              padding: 15px 0 15px 30px;
              border-left: 2px solid #e2e8f0;
              position: relative;
            }
            .timeline-item.active {
              border-color: #FA9A4B;
            }
            .timeline-item strong {
              display: block;
              color: #1e293b;
              font-size: 14px;
              margin-bottom: 5px;
            }
            .timeline-item.active strong {
              color: #FA9A4B;
            }
            .timeline-item small {
              color: #64748b;
              font-size: 13px;
            }
            .button-container {
              text-align: center;
              margin: 40px 0;
            }
            .status-button {
              display: inline-block;
              background: linear-gradient(135deg, #FA9A4B 0%, #E0A46A 100%);
              color: #ffffff !important;
              text-decoration: none;
              padding: 16px 40px;
              border-radius: 8px;
              font-weight: 600;
              font-size: 16px;
              box-shadow: 0 4px 12px rgba(250, 154, 75, 0.3);
            }
            .footer {
              background-color: #f8fafc;
              padding: 30px;
              text-align: center;
              border-top: 1px solid #e2e8f0;
            }
            .footer p {
              color: #94a3b8;
              font-size: 13px;
              margin: 5px 0;
            }
            .footer a {
              color: #FA9A4B;
              text-decoration: none;
            }
          </style>
        </head>
        <body>
          <div class="email-container">
            <div class="header">
              <div class="header-content">
                <img src="${LOGO_URL}" alt="HelloRun" class="logo" />
                <h1>HelloRun</h1>
              </div>
            </div>
            
            <div class="content">
              <p class="greeting">Hi ${firstName},</p>
              
              <p class="message">
                🎉 Thank you for applying to become a HelloRun organizer! We've received your application and it's now under review.
              </p>
              
              <div class="app-id-box">
                <p><strong>Application ID:</strong> ${applicationId}</p>
                <p><strong>Submitted:</strong> ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>

              <div class="timeline">
                <h3>What happens next?</h3>
                <div class="timeline-item active">
                  <strong>✓ Application Submitted</strong>
                  <small>Your documents are with our team</small>
                </div>
                <div class="timeline-item">
                  <strong>Under Review</strong>
                  <small>We'll verify your documents (1-3 business days)</small>
                </div>
                <div class="timeline-item">
                  <strong>Decision</strong>
                  <small>You'll receive an email with our decision</small>
                </div>
              </div>

              <p class="message">
                You can check your application status anytime:
              </p>
              
              <div class="button-container">
                <a href="${process.env.APP_URL}/organizer/application-status" class="status-button">Check Status</a>
              </div>

              <p style="margin-top: 30px; font-size: 14px; color: #64748b;">
                <strong>Need help?</strong> Reply to this email or contact us at support@hellorun.online
              </p>
            </div>
            
            <div class="footer">
              <p><strong>HelloRun</strong></p>
              <p>Your running journey companion</p>
              <p style="margin-top: 20px;">
                <a href="${process.env.APP_URL}">Visit HelloRun</a> • 
                <a href="${process.env.APP_URL}/contact">Support</a>
              </p>
              <p style="margin-top: 20px; font-size: 12px;">
                This is an automated email. Please do not reply.
              </p>
            </div>
          </div>
        </body>
        </html>
      `
    });

    if (error) {
      throw new Error('Failed to send application submitted email');
    }

    return data;
  } catch (error) {
    console.error('Email service error:', error);
    throw error;
  }
};

// Send organizer application approved email
exports.sendApplicationApprovedEmail = async (email, firstName) => {
  try {
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Congratulations! Your Application is Approved - HelloRun',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              color: #1e293b;
              background-color: #f8fafc;
              margin: 0;
              padding: 0;
            }
            .email-container {
              max-width: 600px;
              margin: 0 auto;
              background-color: #ffffff;
            }
            .header {
              background: linear-gradient(135deg, #10b981 0%, #059669 100%);
              padding: 40px 20px;
              text-align: center;
            }
            .header-content {
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 15px;
            }
            .logo {
              width: 48px;
              height: 48px;
              vertical-align: middle;
            }
            .header h1 {
              color: #ffffff;
              margin: 0;
              font-size: 28px;
              font-weight: 700;
              display: inline;
            }
            .content {
              padding: 40px 30px;
            }
            .success-banner {
              background: linear-gradient(135deg, #10b981 0%, #059669 100%);
              color: white;
              padding: 30px;
              text-align: center;
              border-radius: 10px;
              margin: 20px 0;
            }
            .success-banner h2 {
              margin: 10px 0;
              font-size: 24px;
            }
            .success-banner p {
              margin: 0;
              font-size: 16px;
            }
            .greeting {
              font-size: 18px;
              font-weight: 600;
              color: #1e293b;
              margin-bottom: 20px;
            }
            .message {
              color: #64748b;
              margin-bottom: 20px;
              font-size: 15px;
            }
            .features {
              background: #f8fafc;
              padding: 20px;
              border-radius: 8px;
              margin: 20px 0;
            }
            .features h3 {
              margin-top: 0;
              color: #1e293b;
              font-size: 16px;
            }
            .feature-item {
              padding: 10px 0;
              display: flex;
              align-items: start;
              gap: 10px;
            }
            .feature-icon {
              color: #10b981;
              font-size: 20px;
            }
            .button-container {
              text-align: center;
              margin: 40px 0;
            }
            .create-button {
              display: inline-block;
              background: linear-gradient(135deg, #FA9A4B 0%, #E0A46A 100%);
              color: #ffffff !important;
              text-decoration: none;
              padding: 16px 40px;
              border-radius: 8px;
              font-weight: 600;
              font-size: 16px;
              box-shadow: 0 4px 12px rgba(250, 154, 75, 0.3);
            }
            .footer {
              background-color: #f8fafc;
              padding: 30px;
              text-align: center;
              border-top: 1px solid #e2e8f0;
            }
            .footer p {
              color: #94a3b8;
              font-size: 13px;
              margin: 5px 0;
            }
            .footer a {
              color: #FA9A4B;
              text-decoration: none;
            }
          </style>
        </head>
        <body>
          <div class="email-container">
            <div class="header">
              <div class="header-content">
                <img src="${LOGO_URL}" alt="HelloRun" class="logo" />
                <h1>HelloRun</h1>
              </div>
            </div>
            
            <div class="content">
              <div class="success-banner">
                <div style="font-size: 48px; margin-bottom: 10px;">🎉</div>
                <h2>Congratulations!</h2>
                <p>Your organizer application has been approved</p>
              </div>

              <p class="greeting">Hi ${firstName},</p>
              
              <p class="message">
                Great news! Your application to become a HelloRun organizer has been <strong>approved</strong>. 
                You can now start creating and managing events on our platform.
              </p>

              <div class="features">
                <h3>What you can do now:</h3>
                <div class="feature-item">
                  <span class="feature-icon">✓</span>
                  <span>Create unlimited running events</span>
                </div>
                <div class="feature-item">
                  <span class="feature-icon">✓</span>
                  <span>Manage registrations and participants</span>
                </div>
                <div class="feature-item">
                  <span class="feature-icon">✓</span>
                  <span>Track event performance with analytics</span>
                </div>
                <div class="feature-item">
                  <span class="feature-icon">✓</span>
                  <span>Access automated timing and results</span>
                </div>
              </div>

              <p class="message">
                Ready to get started? Create your first event:
              </p>
              
              <div class="button-container">
                <a href="${process.env.APP_URL}/organizer/create-event" class="create-button">Create Your First Event</a>
              </div>

              <p style="margin-top: 30px; font-size: 14px; color: #64748b;">
                <strong>Need help getting started?</strong> Check out our organizer guide or contact us at support@hellorun.online
              </p>
            </div>
            
            <div class="footer">
              <p><strong>HelloRun</strong></p>
              <p>Your running journey companion</p>
              <p style="margin-top: 20px;">
                <a href="${process.env.APP_URL}">Visit HelloRun</a> • 
                <a href="${process.env.APP_URL}/contact">Support</a>
              </p>
              <p style="margin-top: 20px; font-size: 12px;">
                This is an automated email. Please do not reply.
              </p>
            </div>
          </div>
        </body>
        </html>
      `
    });

    if (error) {
      throw new Error('Failed to send application approved email');
    }

    return data;
  } catch (error) {
    console.error('Email service error:', error);
    throw error;
  }
};

// Send organizer application rejected email
exports.sendApplicationRejectedEmail = async (email, firstName, reason) => {
  try {
    const { data, error} = await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Update on Your Organizer Application - HelloRun',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              color: #1e293b;
              background-color: #f8fafc;
              margin: 0;
              padding: 0;
            }
            .email-container {
              max-width: 600px;
              margin: 0 auto;
              background-color: #ffffff;
            }
            .header {
              background: linear-gradient(135deg, #FA9A4B 0%, #E0A46A 100%);
              padding: 40px 20px;
              text-align: center;
            }
            .header-content {
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 15px;
            }
            .logo {
              width: 48px;
              height: 48px;
              vertical-align: middle;
            }
            .header h1 {
              color: #ffffff;
              margin: 0;
              font-size: 28px;
              font-weight: 700;
              display: inline;
            }
            .content {
              padding: 40px 30px;
            }
            .greeting {
              font-size: 18px;
              font-weight: 600;
              color: #1e293b;
              margin-bottom: 20px;
            }
            .message {
              color: #64748b;
              margin-bottom: 20px;
              font-size: 15px;
            }
            .reason-box {
              background: #fef3c7;
              border-left: 4px solid #f59e0b;
              padding: 20px;
              margin: 30px 0;
              border-radius: 4px;
            }
            .reason-box strong {
              display: block;
              color: #92400e;
              margin-bottom: 10px;
            }
            .reason-box p {
              color: #92400e;
              margin: 0;
            }
            .button-container {
              text-align: center;
              margin: 40px 0;
            }
            .reapply-button {
              display: inline-block;
              background: linear-gradient(135deg, #FA9A4B 0%, #E0A46A 100%);
              color: #ffffff !important;
              text-decoration: none;
              padding: 16px 40px;
              border-radius: 8px;
              font-weight: 600;
              font-size: 16px;
              box-shadow: 0 4px 12px rgba(250, 154, 75, 0.3);
            }
            .footer {
              background-color: #f8fafc;
              padding: 30px;
              text-align: center;
              border-top: 1px solid #e2e8f0;
            }
            .footer p {
              color: #94a3b8;
              font-size: 13px;
              margin: 5px 0;
            }
            .footer a {
              color: #FA9A4B;
              text-decoration: none;
            }
          </style>
        </head>
        <body>
          <div class="email-container">
            <div class="header">
              <div class="header-content">
                <img src="${LOGO_URL}" alt="HelloRun" class="logo" />
                <h1>HelloRun</h1>
              </div>
            </div>
            
            <div class="content">
              <p class="greeting">Hi ${firstName},</p>
              
              <p class="message">
                Thank you for your interest in becoming a HelloRun organizer. After careful review, 
                we're unable to approve your application at this time.
              </p>

              <div class="reason-box">
                <strong>Reason:</strong>
                <p>${reason}</p>
              </div>

              <p class="message">
                We encourage you to address the concerns mentioned above and reapply. 
                You can submit a new application anytime:
              </p>
              
              <div class="button-container">
                <a href="${process.env.APP_URL}/organizer/complete-profile" class="reapply-button">Reapply Now</a>
              </div>

              <p style="margin-top: 30px; font-size: 14px; color: #64748b;">
                <strong>Questions?</strong> We're here to help. Contact us at support@hellorun.online
              </p>
            </div>
            
            <div class="footer">
              <p><strong>HelloRun</strong></p>
              <p>Your running journey companion</p>
              <p style="margin-top: 20px;">
                <a href="${process.env.APP_URL}">Visit HelloRun</a> • 
                <a href="${process.env.APP_URL}/contact">Support</a>
              </p>
              <p style="margin-top: 20px; font-size: 12px;">
                This is an automated email. Please do not reply.
              </p>
            </div>
          </div>
        </body>
        </html>
      `
    });

    if (error) {
      throw new Error('Failed to send application rejected email');
    }

    return data;
  } catch (error) {
    console.error('Email service error:', error);
    throw error;
  }
};

// Send event registration confirmation email
exports.sendEventRegistrationConfirmationEmail = async (
  email,
  firstName,
  eventTitle,
  confirmationCode,
  participationMode,
  eventStartAt,
  raceDistance
) => {
  try {
    const eventDateText = eventStartAt
      ? new Date(eventStartAt).toLocaleString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit'
        })
      : 'TBA';

    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: `Registration Confirmed: ${eventTitle}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1f2937;line-height:1.5;">
          <h2 style="margin:0 0 12px;color:#0f172a;">You're Registered!</h2>
          <p>Hi ${firstName || 'Runner'},</p>
          <p>Your registration for <strong>${eventTitle}</strong> is confirmed.</p>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px 14px;margin:16px 0;">
              <p style="margin:0 0 6px;"><strong>Confirmation Code:</strong> ${confirmationCode}</p>
              <p style="margin:0 0 6px;"><strong>Race Distance:</strong> ${raceDistance || 'N/A'}</p>
              <p style="margin:0 0 6px;"><strong>Participation Mode:</strong> ${participationMode}</p>
            <p style="margin:0;"><strong>Event Start:</strong> ${eventDateText}</p>
          </div>
          <p>You can sign in to your HelloRun account anytime for updates.</p>
          <p style="margin-top:20px;color:#64748b;font-size:13px;">This is an automated email. Please do not reply.</p>
        </div>
      `
    });

    if (error) {
      throw new Error('Failed to send event registration confirmation email');
    }

    return data;
  } catch (error) {
    console.error('Email service error:', error);
    throw error;
  }
};

exports.sendPaymentProofSubmittedEmailToOrganizer = async (
  organizerEmail,
  organizerFirstName,
  runnerName,
  eventTitle,
  confirmationCode
) => {
  try {
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to: organizerEmail,
      subject: `Payment Receipt Submitted: ${eventTitle}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1f2937;line-height:1.5;">
          <h2 style="margin:0 0 12px;color:#0f172a;">Payment Receipt Needs Review</h2>
          <p>Hi ${escapeHtml(organizerFirstName || 'Organizer')},</p>
          <p>${escapeHtml(runnerName || 'A runner')} submitted a payment receipt for <strong>${escapeHtml(eventTitle || 'an event')}</strong>.</p>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px 14px;margin:16px 0;">
            <p style="margin:0;"><strong>Confirmation Code:</strong> ${escapeHtml(confirmationCode || 'N/A')}</p>
          </div>
          <p>Review the submission in your organizer registrants dashboard.</p>
        </div>
      `
    });

    if (error) {
      throw new Error('Failed to send payment receipt submission email to organizer');
    }

    return data;
  } catch (error) {
    console.error('Email service error:', error);
    throw error;
  }
};

exports.sendPaymentApprovedEmailToRunner = async (
  runnerEmail,
  runnerFirstName,
  eventTitle,
  confirmationCode
) => {
  try {
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to: runnerEmail,
      subject: `Payment Approved: ${eventTitle}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1f2937;line-height:1.5;">
          <h2 style="margin:0 0 12px;color:#166534;">Payment Approved</h2>
          <p>Hi ${escapeHtml(runnerFirstName || 'Runner')},</p>
          <p>Your payment for <strong>${escapeHtml(eventTitle || 'your event')}</strong> has been approved.</p>
          <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:12px 14px;margin:16px 0;">
            <p style="margin:0;"><strong>Confirmation Code:</strong> ${escapeHtml(confirmationCode || 'N/A')}</p>
          </div>
          <p>Your registration is now marked as paid.</p>
        </div>
      `
    });

    if (error) {
      throw new Error('Failed to send payment approved email');
    }

    return data;
  } catch (error) {
    console.error('Email service error:', error);
    throw error;
  }
};

exports.sendEventPublishedEmailToOrganizer = async (
  organizerEmail,
  organizerFirstName,
  eventTitle,
  eventUrl,
  approvalNote
) => {
  if (!process.env.RESEND_API_KEY) {
    return { skipped: true };
  }
  try {
    const noteText = escapeHtml(approvalNote || '');
    const eventLink = eventUrl
      ? `<p><a href="${escapeHtml(eventUrl)}" style="color:#c2410c;">View the public event page</a></p>`
      : '';
    const noteBlock = noteText
      ? `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px 14px;margin:16px 0;">
            <p style="margin:0;"><strong>Admin note:</strong> ${noteText}</p>
          </div>`
      : '';

    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to: organizerEmail,
      subject: `Event Published: ${eventTitle || 'HelloRun Event'}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1f2937;line-height:1.5;">
          <h2 style="margin:0 0 12px;color:#166534;">Event Published</h2>
          <p>Hi ${escapeHtml(organizerFirstName || 'Organizer')},</p>
          <p>Your event <strong>${escapeHtml(eventTitle || 'your event')}</strong> has been approved and published.</p>
          ${noteBlock}
          ${eventLink}
          <p>You can manage registrants, badges, and event settings from your organiser dashboard.</p>
        </div>
      `
    });

    if (error) {
      throw new Error('Failed to send event published email');
    }

    return data;
  } catch (error) {
    console.error('Email service error:', error);
    throw error;
  }
};

exports.sendPaymentRejectedEmailToRunner = async (
  runnerEmail,
  runnerFirstName,
  eventTitle,
  confirmationCode,
  rejectionReason,
  reviewNotes
) => {
  try {
    const reasonText = escapeHtml(rejectionReason || 'Payment receipt did not pass verification.');
    const notesText = escapeHtml(reviewNotes || '');

    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to: runnerEmail,
      subject: `Payment Rejected: ${eventTitle}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1f2937;line-height:1.5;">
          <h2 style="margin:0 0 12px;color:#991b1b;">Payment Receipt Rejected</h2>
          <p>Hi ${escapeHtml(runnerFirstName || 'Runner')},</p>
          <p>Your payment receipt for <strong>${escapeHtml(eventTitle || 'your event')}</strong> was rejected.</p>
          <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px 14px;margin:16px 0;">
            <p style="margin:0 0 8px;"><strong>Confirmation Code:</strong> ${escapeHtml(confirmationCode || 'N/A')}</p>
            <p style="margin:0 0 8px;"><strong>Reason:</strong> ${reasonText}</p>
            ${notesText ? `<p style="margin:0;"><strong>Notes:</strong> ${notesText}</p>` : ''}
          </div>
          <p>Please upload a new payment receipt from your My Registrations page.</p>
        </div>
      `
    });

    if (error) {
      throw new Error('Failed to send payment rejected email');
    }

    return data;
  } catch (error) {
    console.error('Email service error:', error);
    throw error;
  }
};

exports.sendResultApprovedEmailToRunner = async (
  runnerEmail,
  runnerFirstName,
  eventTitle,
  confirmationCode,
  elapsedLabel
) => {
  if (!process.env.RESEND_API_KEY) {
    return { skipped: true };
  }
  try {
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to: runnerEmail,
      subject: `Result Approved: ${eventTitle}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1f2937;line-height:1.5;">
          <h2 style="margin:0 0 12px;color:#166534;">Result Approved</h2>
          <p>Hi ${escapeHtml(runnerFirstName || 'Runner')},</p>
          <p>Your submitted result for <strong>${escapeHtml(eventTitle || 'your event')}</strong> has been approved.</p>
          <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:12px 14px;margin:16px 0;">
            <p style="margin:0 0 8px;"><strong>Confirmation Code:</strong> ${escapeHtml(confirmationCode || 'N/A')}</p>
            <p style="margin:0;"><strong>Official Time:</strong> ${escapeHtml(elapsedLabel || 'N/A')}</p>
          </div>
          <p>Your ranking and results are now reflected on the leaderboard.</p>
        </div>
      `
    });

    if (error) {
      throw new Error('Failed to send result approved email');
    }
    return data;
  } catch (error) {
    console.error('Email service error:', error);
    throw error;
  }
};

exports.sendResultRejectedEmailToRunner = async (
  runnerEmail,
  runnerFirstName,
  eventTitle,
  confirmationCode,
  rejectionReason,
  reviewNotes
) => {
  if (!process.env.RESEND_API_KEY) {
    return { skipped: true };
  }
  try {
    const reasonText = escapeHtml(rejectionReason || 'Run result evidence did not pass verification.');
    const notesText = escapeHtml(reviewNotes || '');
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to: runnerEmail,
      subject: `Result Rejected: ${eventTitle}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1f2937;line-height:1.5;">
          <h2 style="margin:0 0 12px;color:#991b1b;">Result Rejected</h2>
          <p>Hi ${escapeHtml(runnerFirstName || 'Runner')},</p>
          <p>Your result for <strong>${escapeHtml(eventTitle || 'your event')}</strong> was rejected.</p>
          <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px 14px;margin:16px 0;">
            <p style="margin:0 0 8px;"><strong>Confirmation Code:</strong> ${escapeHtml(confirmationCode || 'N/A')}</p>
            <p style="margin:0 0 8px;"><strong>Reason:</strong> ${reasonText}</p>
            ${notesText ? `<p style="margin:0;"><strong>Notes:</strong> ${notesText}</p>` : ''}
          </div>
          <p>Please upload an updated proof from your My Registrations page and resubmit.</p>
        </div>
      `
    });

    if (error) {
      throw new Error('Failed to send result rejected email');
    }
    return data;
  } catch (error) {
    console.error('Email service error:', error);
    throw error;
  }
};

exports.sendCertificateIssuedEmailToRunner = async (
  runnerEmail,
  runnerFirstName,
  eventTitle,
  confirmationCode,
  certificateUrl
) => {
  if (!process.env.RESEND_API_KEY) {
    return { skipped: true };
  }
  try {
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to: runnerEmail,
      subject: `Certificate Available: ${eventTitle}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1f2937;line-height:1.5;">
          <h2 style="margin:0 0 12px;color:#0f172a;">Your Certificate Is Ready</h2>
          <p>Hi ${escapeHtml(runnerFirstName || 'Runner')},</p>
          <p>Your certificate for <strong>${escapeHtml(eventTitle || 'your event')}</strong> is now available.</p>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px 14px;margin:16px 0;">
            <p style="margin:0 0 8px;"><strong>Confirmation Code:</strong> ${escapeHtml(confirmationCode || 'N/A')}</p>
            <p style="margin:0;"><a href="${escapeHtml(certificateUrl)}">Download Certificate</a></p>
          </div>
          <p>You can also access this from your My Registrations page.</p>
        </div>
      `
    });

    if (error) {
      throw new Error('Failed to send certificate issued email');
    }
    return data;
  } catch (error) {
    console.error('Email service error:', error);
    throw error;
  }
};

exports.sendBadgeEarnedEmailToRunner = async (
  runnerEmail,
  runnerFirstName,
  badgeName,
  badgeDescription,
  badgeUrl,
  options = {}
) => {
  if (!process.env.RESEND_API_KEY) {
    return { skipped: true };
  }
  try {
    const safeBadgeUrl = escapeHtml(badgeUrl || `${process.env.APP_URL || ''}/runner/profile#badges`);
    const safeBadgeName = escapeHtml(badgeName || 'Achievement Badge');
    const safeBadgeType = formatBadgeEmailLabel(options.badgeType || options.badgeScope || 'Achievement');
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to: runnerEmail,
      subject: `Badge Earned: ${badgeName || 'Achievement Badge'}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:0;color:#1f2937;line-height:1.5;background:#ffffff;">
          <div style="background:#0f766e;padding:24px 28px;color:#ffffff;">
            <p style="margin:0 0 6px;font-size:12px;text-transform:uppercase;letter-spacing:.08em;">HelloRun Achievement</p>
            <h2 style="margin:0;font-size:28px;line-height:1.2;">Badge Earned</h2>
          </div>
          <div style="padding:28px;">
          <p>Hi ${escapeHtml(runnerFirstName || 'Runner')},</p>
            <p>You earned the <strong>${safeBadgeName}</strong> badge on HelloRun.</p>
          ${badgeDescription ? `<p>${escapeHtml(badgeDescription)}</p>` : ''}
            <div style="background:#f0fdfa;border:1px solid #99f6e4;border-radius:8px;padding:16px;margin:18px 0;">
              <p style="margin:0 0 8px;color:#115e59;font-size:13px;">${safeBadgeType}</p>
              <p style="margin:0;"><a href="${safeBadgeUrl}" style="color:#0f766e;font-weight:700;">View verified badge</a></p>
          </div>
            <p>You can also manage featured badges from your runner profile.</p>
            <p style="margin-top:24px;color:#64748b;font-size:13px;">Badge emails are sent only for badge definitions enabled by HelloRun admins.</p>
          </div>
        </div>
      `
    });

    if (error) {
      throw new Error('Failed to send badge earned email');
    }
    return data;
  } catch (error) {
    console.error('Email service error:', error);
    throw error;
  }
};

function formatBadgeEmailLabel(value) {
  return String(value || 'Achievement')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

exports.sendWelcomeEmail = async (email, firstName) => {
  if (!process.env.RESEND_API_KEY) return { skipped: true };
  const appUrl = String(process.env.APP_URL || '').replace(/\/$/, '');
  const name = escapeHtml(firstName || 'Runner');
  const { data, error } = await resend.emails.send({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: `Welcome to HelloRun, ${firstName || 'Runner'}!`,
    html: `
      <!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
      <style>
        body{font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#1e293b;background:#f8fafc;margin:0;padding:0}
        .email-container{max-width:600px;margin:0 auto;background:#fff}
        .header{background:linear-gradient(135deg,#f97316 0%,#ea580c 100%);padding:40px 20px;text-align:center}
        .header h1{color:#fff;margin:0;font-size:26px;font-weight:700}
        .header p{color:rgba(255,255,255,0.9);margin:8px 0 0;font-size:15px}
        .content{padding:32px 40px}
        .step{display:flex;align-items:flex-start;margin-bottom:24px;gap:16px}
        .step-num{width:36px;height:36px;border-radius:50%;background:#f97316;color:#fff;font-weight:700;font-size:16px;display:flex;align-items:center;justify-content:center;flex-shrink:0;line-height:36px;text-align:center}
        .step-copy strong{display:block;color:#0f172a;margin-bottom:2px}
        .step-copy a{color:#f97316;text-decoration:none}
        .cta-wrap{text-align:center;margin:32px 0 24px}
        .cta-btn{background:#f97316;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;display:inline-block}
        .footer{background:#f1f5f9;padding:24px 40px;text-align:center;color:#64748b;font-size:13px}
        .footer a{color:#f97316;text-decoration:none}
      </style></head><body>
      <div class="email-container">
        <div class="header">
          <h1>Welcome to HelloRun, ${name}!</h1>
          <p>You're all set. Here's how to get started.</p>
        </div>
        <div class="content">
          <p style="margin:0 0 24px;color:#475569">Hi ${name}, great to have you on HelloRun. Follow these three steps to make the most of the platform:</p>
          <div class="step">
            <div class="step-num">1</div>
            <div class="step-copy">
              <strong><a href="${appUrl}/runner/profile">Complete your profile</a></strong>
              <span style="color:#64748b;font-size:14px">Add your name, emergency contact, and country so your registrations and certificates are accurate.</span>
            </div>
          </div>
          <div class="step">
            <div class="step-num">2</div>
            <div class="step-copy">
              <strong><a href="${appUrl}/events">Browse events</a></strong>
              <span style="color:#64748b;font-size:14px">Find a virtual or in-person run that fits your schedule and distance goal.</span>
            </div>
          </div>
          <div class="step">
            <div class="step-num">3</div>
            <div class="step-copy">
              <strong>Register and run</strong>
              <span style="color:#64748b;font-size:14px">Register for an event, complete your run, submit your result, and earn your certificate and badges.</span>
            </div>
          </div>
          <div class="cta-wrap">
            <a href="${appUrl}/runner/dashboard" class="cta-btn">Go to your dashboard →</a>
          </div>
        </div>
        <div class="footer">
          <p>Need help? <a href="${appUrl}/contact">Contact support</a> &nbsp;•&nbsp; <a href="${appUrl}">HelloRun</a></p>
          <p style="margin:8px 0 0;color:#94a3b8">You received this email because you created an account on HelloRun.</p>
        </div>
      </div>
      </body></html>
    `
  });
  if (error) throw new Error(`Welcome email failed: ${error.message || 'unknown error'}`);
  return { data };
};

exports.sendBasicTestEmail = async (to, subject, message) => {
  if (!process.env.RESEND_API_KEY) {
    return { skipped: true };
  }

  const { data, error } = await resend.emails.send({
    from: process.env.EMAIL_FROM,
    to,
    subject: subject || 'HelloRun test email',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1f2937;line-height:1.5;">
        <h2 style="margin:0 0 12px;color:#0f172a;">HelloRun Test Email</h2>
        <p>${escapeHtml(message || 'This is a test email from HelloRun.')}</p>
        <p style="margin-top:20px;color:#64748b;font-size:13px;">This is an admin-triggered test email.</p>
      </div>
    `
  });

  if (error) {
    throw new Error('Failed to send test email');
  }

  return data;
};

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
