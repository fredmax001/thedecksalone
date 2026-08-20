const express = require('express');
const axios = require('axios');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { z } = require('zod');
const passport = require('passport');
const { prisma } = require('../utils/prisma');
const { signToken } = require('../utils/jwt');
const { authMiddleware } = require('../middleware/auth');
const { sendOtp, verifyOtp } = require('../utils/otp');
const { authLimiter } = require('../utils/rateLimiter');
const { sendEmail, isEmailConfigured, sendWelcomeEmail, sendOtpEmail, sendPasswordResetEmail } = require('../utils/email');
const { getFrontendUrl } = require('../utils/url');
const { getCache, setCache, clearCache } = require('../utils/redis');
const { RESERVED_USERNAMES, isValidUsername, generateUsername } = require('../utils/username');
const { calculateTrialStatus } = require('../utils/trial');

const router = express.Router();

const GENDER_VALUES = ['MALE', 'FEMALE', 'NON_BINARY', 'OTHER', 'PREFER_NOT_TO_SAY'] as const;

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  }),
  username: z.string().optional(),
  phone: z.string().optional(),
  role: z.enum(['USER', 'DJ']).optional(),
  gender: z.enum(GENDER_VALUES).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const phoneSchema = z.object({
  phone: z.string().min(8).max(20),
});

const phoneVerifySchema = z.object({
  phone: z.string().min(8).max(20),
  code: z.string().length(6),
});

const emailOtpSchema = z.object({
  email: z.string().email(),
});

const emailOtpVerifySchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
});

const passwordResetSchema = z.object({
  email: z.string().email(),
});

const passwordResetConfirmSchema = z.object({
  token: z.string(),
  newPassword: z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  }),
});

// POST /api/auth/register
router.post('/register', authLimiter, async (req, res) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid input', details: parsed.error.flatten() });
    }

    const { email, password, phone, role, gender } = parsed.data;
    let { username } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ success: false, error: 'Email already registered' });
    }

    if (phone) {
      const existingPhone = await prisma.user.findUnique({ where: { phone } });
      if (existingPhone) {
        return res.status(409).json({ success: false, error: 'Phone number already registered' });
      }
    }

    if (username) {
      username = username.toLowerCase();
      if (!isValidUsername(username)) {
        return res.status(400).json({ success: false, error: 'Invalid or reserved username' });
      }
      const existingUsername = await prisma.user.findUnique({ where: { username } });
      if (existingUsername) {
        return res.status(409).json({ success: false, error: 'Username already taken' });
      }
    } else {
      username = await generateUsername(email);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userRole = role === 'DJ' ? 'DJ' : 'USER';
    const user = await prisma.user.create({
      data: { email, username, password: hashedPassword, phone: phone || null, role: userRole, gender: gender || undefined },
      select: { id: true, email: true, username: true, role: true, gender: true, createdAt: true },
    });

    // Send welcome email and in-app notification asynchronously — don't block the response
    sendWelcomeEmail({ to: user.email, username: user.username, role: user.role }).catch((err) => {
      console.error('[Auth] Failed to send welcome email:', err);
    });
    prisma.notification.create({
      data: {
        userId: user.id,
        type: 'SYSTEM',
        title: 'Welcome to Deck Salone!',
        body: 'Your account has been created. Explore mixes, follow DJs, and book events.',
      },
    }).catch((err) => {
      console.error('[Auth] Failed to create welcome notification:', err);
    });

    const token = signToken({ id: user.id, email: user.email, role: user.role });
    return res.status(201).json({ success: true, data: { user, token } });
  } catch (error) {
    console.error('Internal server error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/auth/login
router.post('/login', authLimiter, async (req, res) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid input' });
    }

    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.password) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const token = signToken({ id: user.id, email: user.email, role: user.role });
    return res.json({
      success: true,
      data: {
        user: { id: user.id, email: user.email, username: user.username, role: user.role },
        token,
      },
    });
  } catch (error) {
    console.error('Internal server error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/auth/phone/send-otp - Send OTP to phone
router.post('/phone/send-otp', authLimiter, async (req, res) => {
  try {
    const parsed = phoneSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid phone number' });
    }

    const { phone } = parsed.data;
    const result = await sendOtp(phone);

    return res.json({
      success: true,
      data: {
        phone: result.phone,
        sent: result.sent,
        ...(result.devCode && { devCode: result.devCode }), // Only in development
      },
    });
  } catch (error) {
    console.error('Internal server error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/auth/phone/verify - Verify OTP and login/register
router.post('/phone/verify', authLimiter, async (req, res) => {
  try {
    const parsed = phoneVerifySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid input' });
    }

    const { phone, code } = parsed.data;
    const otpResult = await verifyOtp(phone, code);

    if (!otpResult.valid) {
      return res.status(400).json({ success: false, error: otpResult.error });
    }

    // Find or create user by phone
    let user = await prisma.user.findUnique({ where: { phone } });

    if (!user) {
      // Create new user with phone — generate a real username and use correct brand domain
      const phoneUsername = await generateUsername(`phone${Date.now()}@decksalone.com`);
      user = await prisma.user.create({
        data: {
          email: `phone_${Date.now()}@decksalone.com`, // Temporary email — user can update in settings
          username: phoneUsername,
          phone,
          phoneVerified: true,
          role: 'USER',
        },
      });
    } else {
      // Mark phone as verified
      user = await prisma.user.update({
        where: { id: user.id },
        data: { phoneVerified: true },
      });
    }

    const token = signToken({ id: user.id, email: user.email, role: user.role });
    return res.json({
      success: true,
      data: {
        user: { id: user.id, email: user.email, phone: user.phone, role: user.role },
        token,
        isNewUser: !user.updatedAt || user.createdAt.getTime() === user.updatedAt.getTime(),
      },
    });
  } catch (error) {
    console.error('Internal server error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// EMAIL OTP (for email verification & passwordless login)
// ═══════════════════════════════════════════════════════════════════════════════

const EMAIL_OTP_TTL_SECONDS = 10 * 60; // 10 minutes
const EMAIL_MAX_ATTEMPTS = 3;

function generateEmailOtp() {
  return crypto.randomInt(100000, 999999).toString();
}

function otpRedisKey(email: string) {
  return `email_otp:${email}`;
}

// Fallback in-memory store (used only when Redis is unavailable)
const emailOtpFallback = new Map<string, { code: string; expiry: number; attempts: number }>();

async function saveEmailOtp(email: string, code: string) {
  const record = { code, expiry: Date.now() + EMAIL_OTP_TTL_SECONDS * 1000, attempts: 0 };
  const stored = await setCache(otpRedisKey(email), record, EMAIL_OTP_TTL_SECONDS).then(() => true).catch(() => false);
  if (!stored) emailOtpFallback.set(email, record);
}

async function getEmailOtp(email: string) {
  const fromRedis = await getCache(otpRedisKey(email));
  if (fromRedis) return { record: fromRedis, source: 'redis' as const };
  const fallback = emailOtpFallback.get(email);
  return fallback ? { record: fallback, source: 'fallback' as const } : null;
}

async function deleteEmailOtp(email: string) {
  clearCache(otpRedisKey(email));
  emailOtpFallback.delete(email);
}

async function incrementOtpAttempts(email: string, record: any) {
  record.attempts += 1;
  // Re-save with remaining TTL so attempts persist
  const remainingTtl = Math.max(1, Math.floor((record.expiry - Date.now()) / 1000));
  const saved = await setCache(otpRedisKey(email), record, remainingTtl).then(() => true).catch(() => false);
  if (!saved) emailOtpFallback.set(email, record);
}

// POST /api/auth/email/send-otp - Send OTP to email
router.post('/email/send-otp', authLimiter, async (req, res) => {
  try {
    const parsed = emailOtpSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid email' });
    }

    const { email } = parsed.data;
    const normalizedEmail = email.toLowerCase().trim();
    const code = generateEmailOtp();

    await saveEmailOtp(normalizedEmail, code);

    // Send OTP via email
    if (isEmailConfigured()) {
      const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
      await sendOtpEmail({
        to: normalizedEmail,
        code,
        username: user?.username || user?.email?.split('@')[0],
      });
    } else {
      console.log(`[Email OTP] Code for ${normalizedEmail}: ${code}`);
    }

    return res.json({
      success: true,
      data: { email: normalizedEmail, sent: true },
    });
  } catch (error) {
    console.error('Internal server error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/auth/email/verify - Verify email OTP
router.post('/email/verify', authLimiter, async (req, res) => {
  try {
    const parsed = emailOtpVerifySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid input' });
    }

    const { email, code } = parsed.data;
    const normalizedEmail = email.toLowerCase().trim();
    const result = await getEmailOtp(normalizedEmail);

    if (!result) {
      return res.status(400).json({ success: false, error: 'OTP not found or expired. Request a new one.' });
    }

    const { record } = result;

    if (Date.now() > record.expiry) {
      await deleteEmailOtp(normalizedEmail);
      return res.status(400).json({ success: false, error: 'OTP expired. Request a new one.' });
    }

    if (record.attempts >= EMAIL_MAX_ATTEMPTS) {
      await deleteEmailOtp(normalizedEmail);
      return res.status(400).json({ success: false, error: 'Too many attempts. Request a new OTP.' });
    }

    if (record.code !== code) {
      await incrementOtpAttempts(normalizedEmail, record);
      return res.status(400).json({ success: false, error: 'Invalid OTP code.' });
    }

    // OTP is valid — clean up
    await deleteEmailOtp(normalizedEmail);

    // Mark email as verified
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: true },
      });
    }

    return res.json({ success: true, data: { message: 'Email verified successfully' } });
  } catch (error) {
    console.error('Internal server error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/auth/forgot-password - Request password reset
router.post('/forgot-password', authLimiter, async (req, res) => {
  try {
    const parsed = passwordResetSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid email' });
    }

    const { email } = parsed.data;
    const user = await prisma.user.findUnique({ where: { email } });

    // Always return the same response to prevent user enumeration
    const successResponse = { success: true, data: { message: 'If an account exists, a reset email has been sent.' } };

    if (!user) {
      return res.json(successResponse);
    }

    // Generate a secure, random single-use token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Persist only the hash — raw token is sent to user and never stored
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordResetToken: hashedToken, passwordResetExpiry: expiry },
    });

    const frontendUrl = getFrontendUrl();
    const resetUrl = `${frontendUrl}/reset-password?token=${rawToken}`;

    // Send the reset email if SMTP is configured; otherwise log the URL in development
    if (isEmailConfigured()) {
      const emailResult = await sendPasswordResetEmail({
        to: email,
        username: user.username || 'User',
        resetUrl,
      });

      if (!emailResult.success) {
        // Don't expose email configuration issues to the client
        console.error('[Auth] Failed to send password reset email:', emailResult.error);
      }
    } else if (process.env.NODE_ENV === 'development') {
      console.log(`[Dev] Password reset URL for ${email}: ${resetUrl}`);
    } else {
      console.warn('[Auth] SMTP not configured; password reset email cannot be sent.');
    }

    return res.json(successResponse);
  } catch (error) {
    console.error('Internal server error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/auth/reset-password - Confirm password reset
router.post('/reset-password', authLimiter, async (req, res) => {
  try {
    const parsed = passwordResetConfirmSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid input' });
    }

    const { token, newPassword } = parsed.data;

    // Hash the incoming raw token to compare against stored hash
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: hashedToken,
        passwordResetExpiry: { gt: new Date() }, // Must not be expired
      },
    });

    if (!user) {
      return res.status(400).json({ success: false, error: 'Invalid or expired reset token' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and immediately invalidate the reset token (single-use)
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpiry: null,
      },
    });

    return res.json({ success: true, data: { message: 'Password updated successfully' } });
  } catch (error) {
    console.error('Internal server error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Google OAuth Routes
// GET /api/auth/google or /api/v1/auth/google - Initiate Google OAuth
router.get('/google', (req, res, next) => {
  const state = crypto.randomBytes(32).toString('hex');
  // Store state in cookie with root path so it is accessible on both /api/auth and /api/v1/auth
  res.cookie('oauth_state', state, {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 10 * 60 * 1000, // 10 minutes
  });
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    state,
    session: false,
  })(req, res, next);
});

// GET /api/auth/google/callback or /api/v1/auth/google/callback - Google OAuth callback
router.get('/google/callback', (req, res, next) => {
  const FRONTEND_URL = getFrontendUrl();

  // Check if Google returned an error directly (e.g. user cancelled login)
  if (req.query.error) {
    console.warn('[Google OAuth] Google returned error:', req.query.error);
    return res.redirect(`${FRONTEND_URL}/login?error=${encodeURIComponent(String(req.query.error))}`);
  }

  // Clear the state cookie
  res.clearCookie('oauth_state', { path: '/' });

  passport.authenticate('google', { session: false }, async (err: any, user: any, info: any) => {
    try {
      if (err) {
        console.error('[Google OAuth] Authentication error:', err);
        return res.redirect(`${FRONTEND_URL}/login?error=${encodeURIComponent(err.message || 'google_auth_failed')}`);
      }

      if (!user) {
        const message = info?.message || 'google_auth_failed';
        console.warn('[Google OAuth] No user returned:', message);
        return res.redirect(`${FRONTEND_URL}/login?error=${encodeURIComponent(message)}`);
      }

      const token = signToken({ id: user.id, email: user.email, role: user.role });
      const redirectUrl = `${FRONTEND_URL}/auth/callback?token=${encodeURIComponent(token)}#token=${encodeURIComponent(token)}`;
      return res.redirect(redirectUrl);
    } catch (callbackErr: any) {
      console.error('[Google OAuth] Callback processing error:', callbackErr);
      return res.redirect(`${FRONTEND_URL}/login?error=server_error`);
    }
  })(req, res, next);
});

// ─────────────────────────────────────────────────────────────
// SoundCloud Authentication Routes
// ─────────────────────────────────────────────────────────────
// GET /api/auth/soundcloud or /api/v1/auth/soundcloud
router.get('/soundcloud', (req, res) => {
  const FRONTEND_URL = getFrontendUrl();
  const SOUNDCLOUD_CLIENT_ID = process.env.SOUNDCLOUD_CLIENT_ID;
  const BACKEND_URL = process.env.BACKEND_URL || 'https://decksalone.com';

  if (!SOUNDCLOUD_CLIENT_ID) {
    // If OAuth app is not configured with client ID, open the quick connect modal
    return res.redirect(`${FRONTEND_URL}/login?soundcloud_modal=true`);
  }

  const redirectUri = encodeURIComponent(`${BACKEND_URL}/api/v1/auth/soundcloud/callback`);
  const soundcloudAuthUrl = `https://secure.soundcloud.com/authorize?client_id=${SOUNDCLOUD_CLIENT_ID}&response_type=code&redirect_uri=${redirectUri}&scope=non-expiring`;
  return res.redirect(soundcloudAuthUrl);
});

// GET /api/auth/soundcloud/callback
router.get('/soundcloud/callback', async (req, res) => {
  const FRONTEND_URL = getFrontendUrl();
  const code = req.query.code;

  if (!code) {
    return res.redirect(`${FRONTEND_URL}/login?error=soundcloud_auth_cancelled`);
  }

  try {
    const SOUNDCLOUD_CLIENT_ID = process.env.SOUNDCLOUD_CLIENT_ID;
    const SOUNDCLOUD_CLIENT_SECRET = process.env.SOUNDCLOUD_CLIENT_SECRET;
    const BACKEND_URL = process.env.BACKEND_URL || 'https://decksalone.com';
    const redirectUri = `${BACKEND_URL}/api/v1/auth/soundcloud/callback`;

    const tokenRes = await axios.post(
      'https://api.soundcloud.com/oauth2/token',
      new URLSearchParams({
        client_id: SOUNDCLOUD_CLIENT_ID || '',
        client_secret: SOUNDCLOUD_CLIENT_SECRET || '',
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
        code: String(code),
      }).toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const accessToken = tokenRes.data?.access_token;
    if (!accessToken) {
      return res.redirect(`${FRONTEND_URL}/login?error=soundcloud_token_failed`);
    }

    const meRes = await axios.get('https://api.soundcloud.com/me', {
      headers: { Authorization: `OAuth ${accessToken}` },
    });

    const scUser = meRes.data;
    const soundcloudId = String(scUser.id);
    const email = scUser.email || `soundcloud_${soundcloudId}@decksalone.com`;
    const stageName = scUser.username || scUser.full_name || 'SoundCloud DJ';
    const avatar = scUser.avatar_url || null;
    const bio = scUser.description || null;

    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { djProfile: { stageName: { equals: stageName, mode: 'insensitive' } } },
        ],
      },
      include: { djProfile: true },
    });

    if (!user) {
      const username = await generateUsername(stageName);
      user = await prisma.user.create({
        data: {
          email,
          username,
          name: stageName,
          avatar,
          role: 'DJ',
          djProfile: {
            create: {
              stageName,
              bio,
              avatar,
              genres: ['Afrobeats', 'Salone Mix'],
            },
          },
        },
        include: { djProfile: true },
      });
    }

    const token = signToken({ id: user.id, email: user.email, role: user.role });
    return res.redirect(`${FRONTEND_URL}/auth/callback?token=${encodeURIComponent(token)}#token=${encodeURIComponent(token)}`);
  } catch (err) {
    console.error('[SoundCloud OAuth Callback Error]:', err);
    return res.redirect(`${FRONTEND_URL}/login?error=soundcloud_auth_failed`);
  }
});

// POST /api/auth/soundcloud/login - Connect or Sign In with SoundCloud profile username / link
router.post('/soundcloud/login', async (req, res) => {
  try {
    const { profileUrl } = req.body;
    if (!profileUrl || typeof profileUrl !== 'string') {
      return res.status(400).json({ success: false, error: 'SoundCloud profile URL or username is required' });
    }

    const cleaned = profileUrl.trim().replace(/^https?:\/\/(www\.)?soundcloud\.com\//i, '').replace(/\/+$/, '');
    const cleanUsername = cleaned.split('/')[0] || 'soundcloud_user';
    const email = `sc_${cleanUsername.toLowerCase().replace(/[^a-z0-9_-]/g, '')}@decksalone.com`;
    const stageName = cleanUsername.replace(/[-_]/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());

    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { username: { equals: cleanUsername, mode: 'insensitive' } },
          { djProfile: { stageName: { equals: stageName, mode: 'insensitive' } } },
        ],
      },
      include: { djProfile: true },
    });

    if (!user) {
      const username = await generateUsername(cleanUsername);
      user = await prisma.user.create({
        data: {
          email,
          username,
          name: stageName,
          avatar: '/default-avatar.jpg',
          role: 'DJ',
          djProfile: {
            create: {
              stageName,
              bio: `DJ and artist on SoundCloud (soundcloud.com/${cleanUsername})`,
              genres: ['Afrobeats', 'Salone Mix', 'Club Mixes'],
            },
          },
        },
        include: { djProfile: true },
      });
    }

    const token = signToken({ id: user.id, email: user.email, role: user.role });
    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        djProfile: user.djProfile,
      },
    });
  } catch (error) {
    console.error('[SoundCloud Direct Login Error]:', error);
    return res.status(500).json({ success: false, error: 'Failed to authenticate with SoundCloud' });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        avatar: true,
        bio: true,
        location: true,
        role: true,
        phone: true,
        phoneVerified: true,
        gender: true,
        dateOfBirth: true,
        favoriteGenres: true,
        createdAt: true,
        notificationPreferences: true,
        privacyPreferences: true,
        djProfile: true,
      },
    });
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    const trialStatus = calculateTrialStatus(user, user.djProfile);
    return res.json({ success: true, data: { ...user, trialStatus } });
  } catch (error) {
    console.error('Internal server error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

const updateProfileSchema = z.object({
  username: z.string().min(3).max(30).optional(),
  email: z.string().email().optional(),
  gender: z.enum(GENDER_VALUES).optional().or(z.literal('')),
});

const updateMeSchema = z.object({
  username: z.string().trim().min(3).max(30).regex(/^[a-z0-9_-]+$/i).optional(),
  email: z.string().trim().email().max(254).optional(),
  gender: z.string().optional(),
  phone: z.string().trim().min(8).max(20).optional(),
  dateOfBirth: z.string().datetime().or(z.literal('')).optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  }),
});

// PUT /api/auth/me - Update current user's profile (username, email, gender, phone, dateOfBirth)
router.put('/me', authMiddleware, async (req, res) => {
  try {
    const parsed = updateMeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid input' });
    }

    const { username, email, gender, phone, dateOfBirth } = parsed.data;
    const updateData: any = {};

    if (gender !== undefined) {
      updateData.gender = gender === '' ? null : gender;
    }

    if (phone !== undefined) {
      updateData.phone = phone.trim() || null;
    }

    if (dateOfBirth !== undefined) {
      if (!dateOfBirth || dateOfBirth.trim() === '') {
        updateData.dateOfBirth = null;
      } else {
        const parsed = new Date(dateOfBirth);
        if (!Number.isNaN(parsed.getTime())) {
          updateData.dateOfBirth = parsed;
        }
      }
    }

    if (username !== undefined) {
      const normalized = username.toLowerCase();
      if (!isValidUsername(normalized)) {
        return res.status(400).json({ success: false, error: 'Invalid or reserved username' });
      }
      const existing = await prisma.user.findUnique({ where: { username: normalized } });
      if (existing && existing.id !== req.user.id) {
        return res.status(409).json({ success: false, error: 'Username already taken' });
      }
      updateData.username = normalized;
    }

    if (email !== undefined) {
      const normalizedEmail = email.toLowerCase().trim();
      const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
      if (existing && existing.id !== req.user.id) {
        return res.status(409).json({ success: false, error: 'Email already in use' });
      }
      updateData.email = normalizedEmail;
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData,
      select: {
        id: true, email: true, username: true, role: true,
        phone: true, phoneVerified: true, gender: true,
        dateOfBirth: true, createdAt: true, djProfile: true,
      },
    });

    return res.json({ success: true, data: user });
  } catch (error) {
    console.error('Internal server error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/auth/change-password - Change current user's password
router.post('/change-password', authMiddleware, async (req, res) => {
  try {
    const parsed = changePasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid input', details: parsed.error.flatten() });
    }

    const { currentPassword, newPassword } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, password: true },
    });

    if (!user || !user.password) {
      return res.status(400).json({ success: false, error: 'User not found or no password set' });
    }

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      return res.status(401).json({ success: false, error: 'Current password is incorrect' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: req.user.id },
      data: { password: hashedPassword },
    });

    return res.json({ success: true, data: { message: 'Password updated successfully' } });
  } catch (error) {
    console.error('Internal server error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

module.exports = router;
