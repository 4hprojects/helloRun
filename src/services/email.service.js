const crypto = require('crypto');
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

const emailService = {
  /**
   * Send email verification email
   */
  async sendVerificationEmail(to, firstName, verificationUrl) {
    try {
      const { data, error } = await resend.emails.send({
        from: process.env.EMAIL_FROM || 'noreply@hellorun.online',
        to: to, // ✅ Make sure 'to' is passed correctly
        subject: 'Verify Your HelloRun Account',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #FA9A4B 0%, #E0A46A 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
              .button { display: inline-block; background: #FA9A4B; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🏃 Welcome to HelloRun!</h1>
              </div>
              <div class="content">
                <h2>Hi ${firstName},</h2>
                <p>Thanks for signing up! Please verify your email address to get started.</p>
                <p>Click the button below to verify your account:</p>
                <a href="${verificationUrl}" class="button">Verify Email Address</a>
                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #FA9A4B;">${verificationUrl}</p>
                <p><strong>This link will expire in 48 hours.</strong></p>
                <p>If you didn't create an account, you can safely ignore this email.</p>
              </div>
              <div class="footer">
                <p>© 2026 HelloRun. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `,
      });

      if (error) {
        console.error('❌ Resend error:', error);
        throw error;
      }

      console.log('✅ Email sent via Resend to', to); // ✅ Fixed logging
      return data;
    } catch (error) {
      console.error('❌ Email sending failed:', error);
      throw error;
    }
  },

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(to, firstName, resetUrl) {
    try {
      const { data, error } = await resend.emails.send({
        from: process.env.EMAIL_FROM || 'noreply@hellorun.online',
        to: to,
        subject: 'Reset Your HelloRun Password',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #FA9A4B 0%, #E0A46A 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
              .button { display: inline-block; background: #FA9A4B; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
              .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🔒 Password Reset Request</h1>
              </div>
              <div class="content">
                <h2>Hi ${firstName},</h2>
                <p>We received a request to reset your HelloRun password.</p>
                <p>Click the button below to reset your password:</p>
                <a href="${resetUrl}" class="button">Reset Password</a>
                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #FA9A4B;">${resetUrl}</p>
                <div class="warning">
                  <strong>⚠️ Security Notice:</strong>
                  <ul>
                    <li>This link will expire in 1 hour</li>
                    <li>If you didn't request this, please ignore this email</li>
                    <li>Your password won't change unless you click the link above</li>
                  </ul>
                </div>
              </div>
              <div class="footer">
                <p>© 2026 HelloRun. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `,
      });

      if (error) {
        console.error('❌ Resend error:', error);
        throw error;
      }

      console.log('✅ Password reset email sent to', to);
      return data;
    } catch (error) {
      console.error('❌ Email sending failed:', error);
      throw error;
    }
  },
};

module.exports = emailService;