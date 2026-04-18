import express, { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/authMiddleware';
import { validateEmail, validatePhone } from '../middleware/validation';
import rateLimit from 'express-rate-limit';

const router = Router();

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'Too many authentication attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

const magicLinkLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 magic link requests per hour
  message: 'Too many magic link requests, please try again later',
});

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 OTP requests per 15 minutes
  message: 'Too many OTP requests, please try again later',
});

// ========== GMAIL OAUTH ROUTES ==========

/**
 * @route   GET /api/auth/gmail
 * @desc    Redirect to Gmail OAuth consent screen
 * @access  Public
 */
router.get('/gmail', authController.initiateGmailOAuth);

/**
 * @route   GET /api/auth/gmail/callback
 * @desc    Gmail OAuth callback handler
 * @access  Public
 */
router.get('/gmail/callback', authLimiter, authController.handleGmailCallback);

// ========== MAGIC LINK ROUTES ==========

/**
 * @route   POST /api/auth/magic-link/send
 * @desc    Send magic link to email
 * @access  Public
 * @body    { email: string }
 */
router.post(
  '/magic-link/send',
  magicLinkLimiter,
  validateEmail,
  authController.sendMagicLink
);

/**
 * @route   GET /api/auth/magic-link/verify
 * @desc    Verify magic link token
 * @access  Public
 * @query   { token: string }
 */
router.get('/magic-link/verify', authController.verifyMagicLink);

// ========== OTP ROUTES ==========

/**
 * @route   POST /api/auth/otp/send
 * @desc    Send OTP to phone number
 * @access  Public
 * @body    { phone: string, email?: string }
 */
router.post(
  '/otp/send',
  otpLimiter,
  validatePhone,
  authController.sendOTP
);

/**
 * @route   POST /api/auth/otp/verify
 * @desc    Verify OTP and create/login user
 * @access  Public
 * @body    { phone: string, otp: string }
 */
router.post('/otp/verify', authLimiter, authController.verifyOTP);

// ========== LINKEDIN OAUTH ROUTES ==========

/**
 * @route   GET /api/auth/linkedin
 * @desc    Redirect to LinkedIn OAuth consent screen
 * @access  Public
 */
router.get('/linkedin', authController.initiateLinkedInOAuth);

/**
 * @route   GET /api/auth/linkedin/callback
 * @desc    LinkedIn OAuth callback handler
 * @access  Public
 */
router.get('/linkedin/callback', authLimiter, authController.handleLinkedInCallback);

// ========== PROTECTED ROUTES ==========

/**
 * @route   GET /api/auth/me
 * @desc    Get current authenticated user
 * @access  Private
 * @header  Authorization: Bearer <token>
 */
router.get('/me', authMiddleware, authController.getCurrentUser);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (invalidate token)
 * @access  Private
 * @header  Authorization: Bearer <token>
 */
router.post('/logout', authMiddleware, authController.logout);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh JWT token
 * @access  Public
 * @body    { refreshToken: string }
 */
router.post('/refresh', authController.refreshToken);

/**
 * @route   GET /api/auth/verify-token
 * @desc    Verify if token is valid
 * @access  Private
 * @header  Authorization: Bearer <token>
 */
router.get('/verify-token', authMiddleware, authController.verifyToken);

// ========== PROFILE SETUP ROUTES ==========

/**
 * @route   POST /api/auth/profile/setup
 * @desc    Complete profile setup after first login
 * @access  Private
 * @header  Authorization: Bearer <token>
 * @body    { name, headline, bio, photo_url, university_id }
 */
router.post(
  '/profile/setup',
  authMiddleware,
  authController.completeProfileSetup
);

/**
 * @route   POST /api/auth/add-auth-method
 * @desc    Add additional authentication method to account
 * @access  Private
 * @header  Authorization: Bearer <token>
 * @body    { method: string, oauth_id?: string }
 */
router.post(
  '/add-auth-method',
  authMiddleware,
  authController.addAuthenticationMethod
);

export default router;
