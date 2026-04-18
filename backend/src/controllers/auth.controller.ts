import { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import { authService } from '../services/auth.service';
import { emailService } from '../services/email.service';
import { smsService } from '../services/sms.service';
import { userService } from '../services/user.service';
import { logger } from '../utils/logger';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export const authController = {
  // ========== GMAIL OAUTH ==========

  /**
   * Initiate Gmail OAuth flow
   */
  async initiateGmailOAuth(req: Request, res: Response) {
    try {
      const clientId = process.env.GMAIL_OAUTH_CLIENT_ID;
      const redirectUri = `${process.env.API_BASE_URL}/api/auth/gmail/callback`;
      const scope = 'openid profile email';
      const state = Buffer.from(JSON.stringify({ timestamp: Date.now() })).toString('base64');

      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.searchParams.set('client_id', clientId!);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('response_type', 'code');
      // Added fix for searchParams vs authParams typo from prompt
      authUrl.searchParams.set('scope', scope);
      authUrl.searchParams.set('state', state);
      authUrl.searchParams.set('access_type', 'offline');
      authUrl.searchParams.set('prompt', 'consent');

      res.redirect(authUrl.toString());
    } catch (error) {
      logger.error('Gmail OAuth initiation failed:', error);
      res.status(500).json({ error: 'Failed to initiate Gmail login' });
    }
  },

  /**
   * Handle Gmail OAuth callback
   */
  async handleGmailCallback(req: Request, res: Response) {
    try {
      const { code, state } = req.query;

      if (!code) {
        return res.status(400).json({ error: 'Authorization code not found' });
      }

      // Exchange code for tokens
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code: code as string,
          client_id: process.env.GMAIL_OAUTH_CLIENT_ID!,
          client_secret: process.env.GMAIL_OAUTH_SECRET!,
          redirect_uri: `${process.env.API_BASE_URL}/api/auth/gmail/callback`,
          grant_type: 'authorization_code',
        }),
      });

      const tokens = await tokenResponse.json();
      if (!tokens.access_token) {
        throw new Error('Failed to obtain access token');
      }

      // Get user info from Google
      const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });

      const googleUser = await userInfoResponse.json();

      // Create or update user in database
      const user = await authService.createOrUpdateGmailUser(
        googleUser.email,
        googleUser.name,
        googleUser.picture,
        googleUser.id
      );

      // Generate JWT tokens
      const { accessToken, refreshToken } = authService.generateTokens(user.id, user.email);

      // Log successful login
      logger.info(`User logged in via Gmail: ${user.email}`);

      // Redirect to frontend with tokens
      const redirectUrl = new URL(`${process.env.FRONTEND_URL}/auth/callback`);
      redirectUrl.searchParams.set('accessToken', accessToken);
      redirectUrl.searchParams.set('refreshToken', refreshToken);
      redirectUrl.searchParams.set('userId', user.id);
      redirectUrl.searchParams.set('isNewUser', user.is_new_user ? 'true' : 'false');

      res.redirect(redirectUrl.toString());
    } catch (error) {
      logger.error('Gmail OAuth callback failed:', error);
      res.redirect(`${process.env.FRONTEND_URL}/login?error=gmail_auth_failed`);
    }
  },

  // ========== MAGIC LINK ==========

  /**
   * Send magic link to email
   */
  async sendMagicLink(req: Request, res: Response) {
    try {
      const { email } = req.body;

      // Generate magic link token
      const token = authService.generateMagicLinkToken();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Store token in database
      await supabase
        .from('magic_links')
        .insert({
          email,
          token,
          expires_at: expiresAt.toISOString(),
          is_used: false,
        });

      // Send email with magic link
      const magicLinkUrl = `${process.env.FRONTEND_URL}/auth/magic-link/verify?token=${token}`;

      await emailService.sendMagicLink(email, magicLinkUrl);

      logger.info(`Magic link sent to ${email}`);

      res.json({
        success: true,
        message: 'Magic link sent to your email',
        email,
      });
    } catch (error) {
      logger.error('Send magic link failed:', error);
      res.status(500).json({ error: 'Failed to send magic link' });
    }
  },

  /**
   * Verify magic link token
   */
  async verifyMagicLink(req: Request, res: Response) {
    try {
      const { token } = req.query;

      if (!token) {
        return res.status(400).json({ error: 'Token not provided' });
      }

      // Verify token in database
      const { data: magicLink, error } = await supabase
        .from('magic_links')
        .select('*')
        .eq('token', token as string)
        .single();

      if (error || !magicLink) {
        return res.status(400).json({ error: 'Invalid or expired token' });
      }

      if (magicLink.is_used) {
        return res.status(400).json({ error: 'Token already used' });
      }

      if (new Date(magicLink.expires_at) < new Date()) {
        return res.status(400).json({ error: 'Token expired' });
      }

      // Create or get user
      const user = await authService.createOrUpdateMagicLinkUser(magicLink.email);

      // Mark token as used
      await supabase
        .from('magic_links')
        .update({ is_used: true, used_at: new Date().toISOString() })
        .eq('id', magicLink.id);

      // Generate JWT tokens
      const { accessToken, refreshToken } = authService.generateTokens(user.id, user.email);

      logger.info(`User logged in via magic link: ${user.email}`);

      // Return tokens (frontend will handle storage and redirect)
      res.json({
        success: true,
        accessToken,
        refreshToken,
        userId: user.id,
        email: user.email,
      });
    } catch (error) {
      logger.error('Magic link verification failed:', error);
      res.status(500).json({ error: 'Failed to verify magic link' });
    }
  },

  // ========== OTP ==========

  /**
   * Send OTP to phone number
   */
  async sendOTP(req: Request, res: Response) {
    try {
      const { phone, email } = req.body;

      // Generate OTP (6 digits)
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Store OTP in database
      await supabase
        .from('otps')
        .insert({
          phone,
          email,
          otp,
          expires_at: expiresAt.toISOString(),
          is_used: false,
          attempts: 0,
        });

      // Send OTP via SMS
      await smsService.sendOTP(phone, otp);

      logger.info(`OTP sent to ${phone}`);

      res.json({
        success: true,
        message: 'OTP sent to your phone',
        phone: phone.slice(-4), // Show only last 4 digits
      });
    } catch (error) {
      logger.error('Send OTP failed:', error);
      res.status(500).json({ error: 'Failed to send OTP' });
    }
  },

  /**
   * Verify OTP
   */
  async verifyOTP(req: Request, res: Response) {
    try {
      const { phone, otp } = req.body;

      // Find OTP record
      const { data: otpRecord, error } = await supabase
        .from('otps')
        .select('*')
        .eq('phone', phone)
        .eq('is_used', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !otpRecord) {
        return res.status(400).json({ error: 'Invalid OTP request' });
      }

      // Check if OTP is expired
      if (new Date(otpRecord.expires_at) < new Date()) {
        return res.status(400).json({ error: 'OTP expired' });
      }

      // Check attempts
      if (otpRecord.attempts >= 3) {
        return res.status(400).json({ error: 'Too many attempts. Please request a new OTP' });
      }

      // Verify OTP
      if (otpRecord.otp !== otp) {
        // Increment attempts
        await supabase
          .from('otps')
          .update({ attempts: otpRecord.attempts + 1 })
          .eq('id', otpRecord.id);

        return res.status(400).json({ error: 'Invalid OTP' });
      }

      // Mark OTP as used
      await supabase
        .from('otps')
        .update({ is_used: true, used_at: new Date().toISOString() })
        .eq('id', otpRecord.id);

      // Create or get user
      const user = await authService.createOrUpdateOTPUser(phone, otpRecord.email);

      // Generate JWT tokens
      const { accessToken, refreshToken } = authService.generateTokens(user.id, user.email);

      logger.info(`User logged in via OTP: ${phone}`);

      res.json({
        success: true,
        accessToken,
        refreshToken,
        userId: user.id,
        email: user.email,
      });
    } catch (error) {
      logger.error('OTP verification failed:', error);
      res.status(500).json({ error: 'Failed to verify OTP' });
    }
  },

  // ========== LINKEDIN OAUTH ==========

  /**
   * Initiate LinkedIn OAuth flow
   */
  async initiateLinkedInOAuth(req: Request, res: Response) {
    try {
      const clientId = process.env.LINKEDIN_OAUTH_CLIENT_ID;
      const redirectUri = `${process.env.API_BASE_URL}/api/auth/linkedin/callback`;
      const scope = 'openid profile email';
      const state = Buffer.from(JSON.stringify({ timestamp: Date.now() })).toString('base64');

      const authUrl = new URL('https://www.linkedin.com/oauth/v2/authorization');
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('client_id', clientId!);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('scope', scope);
      authUrl.searchParams.set('state', state);

      res.redirect(authUrl.toString());
    } catch (error) {
      logger.error('LinkedIn OAuth initiation failed:', error);
      res.status(500).json({ error: 'Failed to initiate LinkedIn login' });
    }
  },

  /**
   * Handle LinkedIn OAuth callback
   */
  async handleLinkedInCallback(req: Request, res: Response) {
    try {
      const { code, state } = req.query;

      if (!code) {
        return res.status(400).json({ error: 'Authorization code not found' });
      }

      // Exchange code for tokens
      const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: code as string,
          client_id: process.env.LINKEDIN_OAUTH_CLIENT_ID!,
          client_secret: process.env.LINKEDIN_OAUTH_SECRET!,
          redirect_uri: `${process.env.API_BASE_URL}/api/auth/linkedin/callback`,
        }),
      });

      const tokens = await tokenResponse.json();
      if (!tokens.access_token) {
        throw new Error('Failed to obtain access token');
      }

      // Get user info from LinkedIn
      const userInfoResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });

      const linkedInUser = await userInfoResponse.json();

      // Create or update user in database
      const user = await authService.createOrUpdateLinkedInUser(
        linkedInUser.email,
        linkedInUser.name,
        linkedInUser.picture,
        linkedInUser.sub
      );

      // Generate JWT tokens
      const { accessToken, refreshToken } = authService.generateTokens(user.id, user.email);

      logger.info(`User logged in via LinkedIn: ${user.email}`);

      // Redirect to frontend with tokens
      const redirectUrl = new URL(`${process.env.FRONTEND_URL}/auth/callback`);
      redirectUrl.searchParams.set('accessToken', accessToken);
      redirectUrl.searchParams.set('refreshToken', refreshToken);
      redirectUrl.searchParams.set('userId', user.id);
      redirectUrl.searchParams.set('isNewUser', user.is_new_user ? 'true' : 'false');

      res.redirect(redirectUrl.toString());
    } catch (error) {
      logger.error('LinkedIn OAuth callback failed:', error);
      res.redirect(`${process.env.FRONTEND_URL}/login?error=linkedin_auth_failed`);
    }
  },

  // ========== PROTECTED ROUTES ==========

  /**
   * Get current authenticated user
   */
  async getCurrentUser(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;

      const user = await userService.getUserById(userId);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          profile_photo_url: user.profile_photo_url,
          headline: user.headline,
          is_verified: user.is_verified,
        },
      });
    } catch (error) {
      logger.error('Get current user failed:', error);
      res.status(500).json({ error: 'Failed to get user' });
    }
  },

  /**
   * Logout user
   */
  async logout(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;

      // Invalidate refresh tokens
      await authService.invalidateUserTokens(userId);

      logger.info(`User logged out: ${userId}`);

      res.json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      logger.error('Logout failed:', error);
      res.status(500).json({ error: 'Failed to logout' });
    }
  },

  /**
   * Refresh JWT token
   */
  async refreshToken(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({ error: 'Refresh token not provided' });
      }

      const newTokens = authService.refreshAccessToken(refreshToken);

      res.json({
        success: true,
        accessToken: newTokens.accessToken,
        refreshToken: newTokens.refreshToken,
      });
    } catch (error) {
      logger.error('Token refresh failed:', error);
      res.status(401).json({ error: 'Invalid refresh token' });
    }
  },

  /**
   * Verify token validity
   */
  async verifyToken(req: Request, res: Response) {
    try {
      res.json({
        success: true,
        message: 'Token is valid',
      });
    } catch (error) {
      res.status(401).json({ error: 'Token verification failed' });
    }
  },

  /**
   * Complete profile setup after first login
   */
  async completeProfileSetup(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { name, headline, bio, photo_url, university_id } = req.body;

      const updatedUser = await userService.updateUserProfile(userId, {
        name,
        headline,
        bio,
        profile_photo_url: photo_url,
        university_id,
      });

      logger.info(`Profile setup completed for user: ${userId}`);

      res.json({
        success: true,
        message: 'Profile setup completed',
        user: updatedUser,
      });
    } catch (error) {
      logger.error('Profile setup failed:', error);
      res.status(500).json({ error: 'Failed to complete profile setup' });
    }
  },

  /**
   * Add additional authentication method
   */
  async addAuthenticationMethod(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { method, oauth_id } = req.body;

      if (!['gmail', 'linkedin', 'otp', 'magic_link'].includes(method)) {
        return res.status(400).json({ error: 'Invalid authentication method' });
      }

      // Check if method already exists
      const existing = await supabase
        .from('auth_methods')
        .select('*')
        .eq('user_id', userId)
        .eq('method', method)
        .single();

      if (!existing.error) {
        return res.status(400).json({ error: 'Authentication method already added' });
      }

      // Add new auth method
      await supabase
        .from('auth_methods')
        .insert({
          user_id: userId,
          method,
          oauth_id,
        });

      logger.info(`Added ${method} authentication method for user: ${userId}`);

      res.json({
        success: true,
        message: 'Authentication method added successfully',
      });
    } catch (error) {
      logger.error('Add auth method failed:', error);
      res.status(500).json({ error: 'Failed to add authentication method' });
    }
  },
};
