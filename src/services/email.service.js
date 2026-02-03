const crypto = require('crypto');
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

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
                <a href="${process.env.APP_URL}/support">Support</a>
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
                <a href="${process.env.APP_URL}/support">Support</a>
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
                <a href="${process.env.APP_URL}/support">Support</a>
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
