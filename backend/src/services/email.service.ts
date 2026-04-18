import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_PORT === '465',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const emailService = {
  /**
   * Send magic link email
   */
  async sendMagicLink(email: string, magicLinkUrl: string) {
    try {
      await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: email,
        subject: 'Your HRVerified Resume Magic Link',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Sign in to HRVerified Resume</h2>
            <p>Click the link below to sign in (valid for 24 hours):</p>
            <a href="${magicLinkUrl}" style="display: inline-block; padding: 12px 24px; background-color: #2563EB; color: white; text-decoration: none; border-radius: 4px;">
              Sign In
            </a>
            <p>Or copy this link: <code>${magicLinkUrl}</code></p>
            <p>If you didn't request this link, you can safely ignore it.</p>
          </div>
        `,
      });

      logger.info(`Magic link email sent to ${email}`);
    } catch (error) {
      logger.error('Send magic link email failed:', error);
      throw error;
    }
  },

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(email: string, name: string) {
    try {
      await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: email,
        subject: 'Welcome to HRVerified Resume',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Welcome to HRVerified Resume, ${name}!</h2>
            <p>Your account has been created successfully.</p>
            <p>Start building your resume and explore our features:</p>
            <ul>
              <li>Create professional resumes</li>
              <li>Match your resume with job descriptions</li>
              <li>Get interview preparation</li>
              <li>Connect with professionals</li>
            </ul>
          </div>
        `,
      });

      logger.info(`Welcome email sent to ${email}`);
    } catch (error) {
      logger.error('Send welcome email failed:', error);
      throw error;
    }
  },
};
