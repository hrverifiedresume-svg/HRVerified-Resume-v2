import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { logger } from '../utils/logger';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export const authService = {
  /**
   * Generate JWT tokens (access and refresh)
   */
  generateTokens(userId: string, email: string) {
    const accessToken = jwt.sign(
      { id: userId, email },
      process.env.JWT_SECRET!,
      { expiresIn: (process.env.JWT_EXPIRES_IN as unknown as number) || '7d' }
    );

    const refreshToken = jwt.sign(
      { id: userId, email, type: 'refresh' },
      process.env.JWT_SECRET!,
      { expiresIn: '30d' }
    );

    return { accessToken, refreshToken };
  },

  /**
   * Verify and decode JWT
   */
  verifyToken(token: string) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!);
      return decoded;
    } catch (error) {
      logger.error('Token verification failed:', error);
      throw new Error('Invalid token');
    }
  },

  /**
   * Generate magic link token
   */
  generateMagicLinkToken() {
    return crypto.randomBytes(32).toString('hex');
  },

  /**
   * Refresh access token using refresh token
   */
  refreshAccessToken(refreshToken: string) {
    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET!) as any;

      if (decoded.type !== 'refresh') {
        throw new Error('Invalid refresh token');
      }

      const newTokens = this.generateTokens(decoded.id, decoded.email);
      return newTokens;
    } catch (error) {
      logger.error('Refresh token failed:', error);
      throw new Error('Invalid refresh token');
    }
  },

  /**
   * Create or update user from Gmail OAuth
   */
  async createOrUpdateGmailUser(email: string, name: string, photoUrl: string, googleId: string) {
    try {
      // Check if user exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (existingUser) {
        // Update existing user
        const { data: updatedUser } = await supabase
          .from('users')
          .update({
            name: name || existingUser.name,
            profile_photo_url: photoUrl || existingUser.profile_photo_url,
            last_login: new Date().toISOString(),
          })
          .eq('id', existingUser.id)
          .select()
          .single();

        return { ...updatedUser, is_new_user: false };
      }

      // Create new user
      const { data: newUser } = await supabase
        .from('users')
        .insert({
          email,
          name: name || email.split('@')[0],
          profile_photo_url: photoUrl,
          is_verified: true,
          last_login: new Date().toISOString(),
        })
        .select()
        .single();

      // Add Gmail auth method
      await supabase
        .from('auth_methods')
        .insert({
          user_id: newUser.id,
          method: 'gmail',
          oauth_id: googleId,
          oauth_email: email,
          is_primary: true,
        });

      // Create user profile
      await supabase
        .from('user_profiles')
        .insert({
          user_id: newUser.id,
          banner_image_url: null,
          location: null,
        });

      logger.info(`New user created via Gmail: ${email}`);

      return { ...newUser, is_new_user: true };
    } catch (error) {
      logger.error('Create/update Gmail user failed:', error);
      throw error;
    }
  },

  /**
   * Create or update user from Magic Link
   */
  async createOrUpdateMagicLinkUser(email: string) {
    try {
      const { data: existingUser } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (existingUser) {
        // Update last login
        await supabase
          .from('users')
          .update({ last_login: new Date().toISOString() })
          .eq('id', existingUser.id);

        return { ...existingUser, is_new_user: false };
      }

      // Create new user
      const { data: newUser } = await supabase
        .from('users')
        .insert({
          email,
          name: email.split('@')[0],
          is_verified: true,
          last_login: new Date().toISOString(),
        })
        .select()
        .single();

      // Add magic link auth method
      await supabase
        .from('auth_methods')
        .insert({
          user_id: newUser.id,
          method: 'magic_link',
          oauth_email: email,
          is_primary: true,
        });

      // Create user profile
      await supabase
        .from('user_profiles')
        .insert({
          user_id: newUser.id,
        });

      logger.info(`New user created via Magic Link: ${email}`);

      return { ...newUser, is_new_user: true };
    } catch (error) {
      logger.error('Create/update magic link user failed:', error);
      throw error;
    }
  },

  /**
   * Create or update user from OTP
   */
  async createOrUpdateOTPUser(phone: string, email?: string) {
    try {
      // Try to find user by phone
      const { data: existingUser } = await supabase
        .from('users')
        .select('*')
        .eq('phone', phone)
        .single();

      if (existingUser) {
        await supabase
          .from('users')
          .update({ last_login: new Date().toISOString() })
          .eq('id', existingUser.id);

        return { ...existingUser, is_new_user: false };
      }

      // Create new user
      const { data: newUser } = await supabase
        .from('users')
        .insert({
          email: email || `${phone}@phone.hrverified.local`,
          phone,
          name: `User-${phone.slice(-4)}`,
          is_verified: true,
          last_login: new Date().toISOString(),
        })
        .select()
        .single();

      // Add OTP auth method
      await supabase
        .from('auth_methods')
        .insert({
          user_id: newUser.id,
          method: 'otp',
          is_primary: true,
        });

      // Create user profile
      await supabase
        .from('user_profiles')
        .insert({
          user_id: newUser.id,
        });

      logger.info(`New user created via OTP: ${phone}`);

      return { ...newUser, is_new_user: true };
    } catch (error) {
      logger.error('Create/update OTP user failed:', error);
      throw error;
    }
  },

  /**
   * Create or update user from LinkedIn OAuth
   */
  async createOrUpdateLinkedInUser(
    email: string,
    name: string,
    photoUrl: string,
    linkedInId: string
  ) {
    try {
      const { data: existingUser } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (existingUser) {
        await supabase
          .from('users')
          .update({
            name: name || existingUser.name,
            profile_photo_url: photoUrl || existingUser.profile_photo_url,
            last_login: new Date().toISOString(),
          })
          .eq('id', existingUser.id);

        return { ...existingUser, is_new_user: false };
      }

      // Create new user
      const { data: newUser } = await supabase
        .from('users')
        .insert({
          email,
          name: name || email.split('@')[0],
          profile_photo_url: photoUrl,
          is_verified: true,
          last_login: new Date().toISOString(),
        })
        .select()
        .single();

      // Add LinkedIn auth method
      await supabase
        .from('auth_methods')
        .insert({
          user_id: newUser.id,
          method: 'linkedin',
          oauth_id: linkedInId,
          oauth_email: email,
          is_primary: true,
        });

      // Create user profile
      await supabase
        .from('user_profiles')
        .insert({
          user_id: newUser.id,
          linkedin_url: `https://linkedin.com/in/${linkedInId}`,
        });

      logger.info(`New user created via LinkedIn: ${email}`);

      return { ...newUser, is_new_user: true };
    } catch (error) {
      logger.error('Create/update LinkedIn user failed:', error);
      throw error;
    }
  },

  /**
   * Invalidate all user tokens
   */
  async invalidateUserTokens(userId: string) {
    try {
      // Store invalidated token IDs (implement with Redis or DB)
      logger.info(`Invalidated tokens for user: ${userId}`);
    } catch (error) {
      logger.error('Invalidate tokens failed:', error);
      throw error;
    }
  },
};
