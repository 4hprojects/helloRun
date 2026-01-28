const crypto = require('crypto');
const { Resend } = require('resend');

class EmailService {
  constructor() {
    // Initialize Resend
    if (!process.env.RESEND_API_KEY) {
      console.error('❌ RESEND_API_KEY not found in environment variables');
      throw new Error('Email service not configured');
    }
    
    this.resend = new Resend(process.env.RESEND_API_KEY);
    
    // Choose email based on environment
    this.fromEmail = process.env.NODE_ENV === 'production' 
      ? process.env.EMAIL_FROM_PROD 
      : process.env.EMAIL_FROM_DEV;
    
    this.fromName = process.env.EMAIL_FROM_NAME || 'HelloRun';
    
    console.log(`📧 Email Service initialized (Resend)`);
    console.log(`📧 Environment: ${process.env.NODE_ENV}`);
    console.log(`📧 Sending from: ${this.fromEmail}`);
  }

  generateVerificationToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  async sendEmail(mailOptions) {
    try {
      const result = await this.resend.emails.send(mailOptions);
      console.log(`✅ Email sent via Resend to ${mailOptions.to}`);
      return { success: true, result };
    } catch (error) {
      console.error(`❌ Error sending email via Resend:`, error);
      console.error('Error details:', error.message);
      return { success: false, error: error.message };
    }
  }

  async sendVerificationEmail(user, token) {
    const verificationUrl = `${process.env.APP_URL}/auth/verify-email?token=${token}`;
    const expiryHours = parseInt(process.env.EMAIL_VERIFICATION_EXPIRY) / (1000 * 60 * 60);

    const mailOptions = {
      from: `${this.fromName} <${this.fromEmail}>`,
      to: user.email,
      subject: 'Verify Your Email - HelloRun',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: ${process.env.BRAND_PRIMARY_COLOR}; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .button { display: inline-block; padding: 12px 24px; background-color: ${process.env.BRAND_PRIMARY_COLOR}; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
            .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to HelloRun!</h1>
            </div>
            <div class="content">
              <p>Hi ${user.firstName},</p>
              <p>Thank you for signing up! Please verify your email address to activate your account.</p>
              <p>Click the button below to verify your email:</p>
              <a href="${verificationUrl}" class="button">Verify Email</a>
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
              <p>This link will expire in ${expiryHours} hours.</p>
              <p>If you didn't create an account, please ignore this email.</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} HelloRun. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    return await this.sendEmail(mailOptions);
  }

  async sendPasswordResetEmail(user, token) {
    const resetUrl = `${process.env.APP_URL}/auth/reset-password?token=${token}`;
    const expiryMinutes = parseInt(process.env.PASSWORD_RESET_EXPIRY) / (1000 * 60);

    const mailOptions = {
      from: `${this.fromName} <${this.fromEmail}>`,
      to: user.email,
      subject: 'Reset Your Password - HelloRun',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: ${process.env.BRAND_PRIMARY_COLOR}; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .button { display: inline-block; padding: 12px 24px; background-color: ${process.env.BRAND_PRIMARY_COLOR}; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
            .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Reset Request</h1>
            </div>
            <div class="content">
              <p>Hi ${user.firstName},</p>
              <p>We received a request to reset your password. Click the button below to create a new password:</p>
              <a href="${resetUrl}" class="button">Reset Password</a>
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #666;">${resetUrl}</p>
              <p>This link will expire in ${expiryMinutes} minutes.</p>
              <p>If you didn't request a password reset, please ignore this email.</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} HelloRun. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    return await this.sendEmail(mailOptions);
  }
}

module.exports = new EmailService();