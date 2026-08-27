const express = require('express');
const axios = require('axios');
const { checkAccountLockout, recordFailedAttempt, recordSuccessfulLogin, verifyAndMigratePassword, hashPassword } = require('../utils/authSecurity');
const crypto = require('crypto');
const { z } = require('zod');
const passport = require('passport');
const { prisma } = require('../utils/prisma');
const { signToken } = require('../utils/jwt');
const { authMiddleware, invalidateUserAuthCache } = require('../middleware/auth');
const { sendOtp, verifyOtp } = require('../utils/otp');
const { authLimiter, loginRateLimiter } = require('../utils/rateLimiter');
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

    let { email, password, phone, role, gender } = parsed.data;
    let { username } = parsed.data;

    email = email.toLowerCase();

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

    const hashedPassword = await hashPassword(password);
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
router.post('/login', loginRateLimiter, async (req, res) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid input' });
    }

    const { email, password } = parsed.data;
    const clientIp = req.ip || req.socket?.remoteAddress || 'unknown';

    // Check account lockout / progressive delay
    const { isLocked, delayMs } = checkAccountLockout(email, clientIp);
    if (isLocked) {
      return res.status(429).json({ success: false, error: 'Account temporarily locked due to too many failed attempts. Try again in 15 minutes.' });
    }
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user || !user.password) {
      await recordFailedAttempt(email, clientIp);
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const valid = await verifyAndMigratePassword(password, user);
    if (!valid) {
      await recordFailedAttempt(email, clientIp);
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    if (user.status === 'SUSPENDED') {
      return res.status(403).json({ success: false, error: 'Account suspended. Contact support.' });
    }

    recordSuccessfulLogin(email, clientIp);

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

    const hashedPassword = await hashPassword(newPassword);

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
// Build the OAuth callback URL from the incoming request host so it always matches
// the domain the user hit (important when the API is served from app.decksalone.com
// but BACKEND_URL might be configured differently).
const getOAuthCallbackUrl = (req: any) => {
  if (process.env.BACKEND_URL && !process.env.BACKEND_URL.includes('localhost')) {
    return `${process.env.BACKEND_URL.replace(/\/$/, '')}/api/v1/auth/google/callback`;
  }
  const host = req.get('host') || 'decksalone.com';
  const isLocal = host.includes('localhost') || host.includes('127.0.0.1');
  const protocol = isLocal ? (req.protocol === 'https' ? 'https' : 'http') : 'https';
  return `${protocol}://${host}/api/v1/auth/google/callback`;
};

// Set the OAuth state cookie on a shared parent domain so it is available on both
// the initiate domain (e.g. app.decksalone.com) and the callback domain (e.g. decksalone.com).
const getOAuthCookieOptions = (req: any): any => {
  const backendUrl = process.env.BACKEND_URL || '';
  const requestHost = req.get('host') || 'decksalone.com';
  const host = backendUrl ? backendUrl.replace(/^https?:\/\//, '').split(':')[0] : requestHost;
  const isProduction = process.env.NODE_ENV === 'production';
  const options: any = {
    path: '/',
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 10 * 60 * 1000,
  };
  // Share cookie across subdomains in production (e.g. .decksalone.com)
  if (isProduction && host && host.includes('.')) {
    const parts = host.split('.');
    if (parts.length >= 2) {
      options.domain = `.${parts.slice(-2).join('.')}`;
    }
  }
  return options;
};

// Google OAuth Routes
// GET /api/auth/google or /api/v1/auth/google - Initiate Google OAuth (web)
router.get('/google', (req, res, next) => {
  const state = crypto.randomBytes(32).toString('hex');
  // Store state in cookie with shared domain so it is accessible on both /api/auth and /api/v1/auth
  res.cookie('oauth_state', state, getOAuthCookieOptions(req));
  // Encode platform in state so the callback knows where to redirect
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    state: `web:${state}`,
    session: false,
    callbackURL: getOAuthCallbackUrl(req),
  })(req, res, next);
});

// GET /api/auth/google/mobile or /api/v1/auth/google/mobile - Initiate Google OAuth (native app)
router.get('/google/mobile', async (req, res, next) => {
  try {
    const state = crypto.randomBytes(32).toString('hex');
    const deviceId = String(req.query.device_id || '');

    // Native apps (Chrome Custom Tab / SFSafariViewController) don't always send the oauth_state
    // cookie back on the callback, so we also store the state in Redis keyed by a device_id passed
    // by the app. The callback can then verify the state without relying on cookies.
    if (deviceId) {
      await setCache(`oauth_state:${deviceId}`, state, 10 * 60);
    }

    res.cookie('oauth_state', state, getOAuthCookieOptions(req));
    passport.authenticate('google', {
      scope: ['profile', 'email'],
      state: `android:${deviceId}:${state}`,
      session: false,
      callbackURL: getOAuthCallbackUrl(req),
    })(req, res, next);
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/google/callback or /api/v1/auth/google/callback - Google OAuth callback
router.get('/google/callback', async (req, res, next) => {
  const FRONTEND_URL = getFrontendUrl();

  // Extract platform from state (format: platform:device_id:nonce for mobile, platform:nonce for web).
  // Defaults to web for backward compatibility.
  const rawState = String(req.query.state || '');
  const stateParts = rawState.includes(':') ? rawState.split(':') : ['web', rawState];
  const platform = stateParts[0];
  const isMobile = platform === 'android' || platform === 'ios';
  const deviceId = isMobile && stateParts.length >= 2 ? stateParts[1] : '';
  const state = isMobile && stateParts.length >= 3
    ? stateParts.slice(2).join(':')
    : (stateParts.length >= 2 ? stateParts[1] : rawState);

  const mobileErrorUrl = (error: string) => `decksalone://auth/callback?error=${encodeURIComponent(error)}`;
  const mobileSuccessUrl = (token: string) => `decksalone://auth/callback?token=${encodeURIComponent(token)}#token=${encodeURIComponent(token)}`;

  // Check if Google returned an error directly (e.g. user cancelled login)
  if (req.query.error) {
    console.warn('[Google OAuth] Google returned error:', req.query.error);
    if (isMobile) {
      return res.redirect(mobileErrorUrl(String(req.query.error)));
    }
    return res.redirect(`${FRONTEND_URL}/login?error=${encodeURIComponent(String(req.query.error))}`);
  }

  // Validate OAuth state parameter to prevent CSRF / session fixation.
  // For mobile we prefer a Redis-stored state keyed by device_id because Chrome Custom Tabs
  // don't reliably send the oauth_state cookie back. We fall back to the cookie for safety.
  let stateValid = false;
  const cookieState = req.cookies?.oauth_state;

  if (isMobile && deviceId) {
    try {
      const cachedState = await getCache(`oauth_state:${deviceId}`);
      if (cachedState && cachedState === state) {
        stateValid = true;
        clearCache(`oauth_state:${deviceId}`);
      }
    } catch (e) {
      console.warn('[Google OAuth] Failed to read mobile state from cache:', e);
    }
  }

  if (!stateValid && cookieState && state && cookieState === state) {
    stateValid = true;
  }

  if (!stateValid) {
    console.warn('[Google OAuth] Invalid or missing state parameter', {
      platform,
      isMobile,
      hasDeviceId: !!deviceId,
      hasCookieState: !!cookieState,
      hasQueryState: !!state,
    });
    res.clearCookie('oauth_state', getOAuthCookieOptions(req));
    if (deviceId) {
      clearCache(`oauth_state:${deviceId}`);
    }
    if (isMobile) {
      return res.redirect(mobileErrorUrl('invalid_state'));
    }
    return res.redirect(`${FRONTEND_URL}/login?error=invalid_state`);
  }

  // Clear the state cookie
  res.clearCookie('oauth_state', getOAuthCookieOptions(req));

  passport.authenticate('google', { session: false }, async (err: any, user: any, info: any) => {
    try {
      if (err) {
        console.error('[Google OAuth] Authentication error:', err);
        if (isMobile) {
          return res.redirect(mobileErrorUrl(err.message || 'google_auth_failed'));
        }
        return res.redirect(`${FRONTEND_URL}/login?error=${encodeURIComponent(err.message || 'google_auth_failed')}`);
      }

      if (!user) {
        const message = info?.message || 'google_auth_failed';
        console.warn('[Google OAuth] No user returned:', message);
        if (isMobile) {
          return res.redirect(mobileErrorUrl(message));
        }
        return res.redirect(`${FRONTEND_URL}/login?error=${encodeURIComponent(message)}`);
      }

      console.log('[Google OAuth] User authenticated:', { id: user.id, email: user.email, role: user.role, isMobile });

      const token = signToken({ id: user.id, email: user.email, role: user.role });
      if (isMobile) {
        const mobileUrl = mobileSuccessUrl(token);
        console.log('[Google OAuth] Mobile redirect URL:', mobileUrl);
        return res.redirect(mobileUrl);
      }
      const redirectUrl = `${FRONTEND_URL}/auth/callback?token=${encodeURIComponent(token)}#token=${encodeURIComponent(token)}`;
      return res.redirect(redirectUrl);
    } catch (callbackErr: any) {
      console.error('[Google OAuth] Callback processing error:', callbackErr);
      if (isMobile) {
        return res.redirect(mobileErrorUrl('server_error'));
      }
      return res.redirect(`${FRONTEND_URL}/login?error=server_error`);
    }
  })(req, res, next);
});

// GET /api/auth/me

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
        subscriptionTier: true,
        subscriptionActivatedAt: true,
        notificationPreferences: true,
        privacyPreferences: true,
        djProfile: {
          select: {
            id: true,
            stageName: true,
            fullName: true,
            avatar: true,
            coverBanner: true,
            bio: true,
            city: true,
            community: true,
            country: true,
            genres: true,
            verified: true,
            isPublic: true,
            isPro: true,
            subscriptionTier: true,
            subscriptionActivatedAt: true,
            totalFollowers: true,
            totalStreams: true,
            totalMixes: true,
            totalEvents: true,
            totalBookings: true,
            averageRating: true,
            rankingPosition: true,
            rankingScore: true,
            monthlyListeners: true,
            canReceivePayments: true,
            canViewAnalytics: true,
            whatsappNumber: true,
            user: { select: { username: true } },
          },
        },
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
  username: z.string().trim().max(50).optional().nullable().or(z.literal('')),
  email: z.string().trim().max(254).optional().nullable().or(z.literal('')),
  gender: z.string().optional().nullable().or(z.literal('')),
  phone: z.string().trim().max(30).optional().nullable().or(z.literal('')),
  dateOfBirth: z.string().optional().nullable().or(z.literal('')),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  }),
});

const confirmEmailChangeSchema = z.object({
  code: z.string().length(6),
});

// PUT /api/auth/me - Update current user's profile (username, email, gender, phone, dateOfBirth)
router.put('/me', authMiddleware, async (req, res) => {
  try {
    const parsed = updateMeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid input', details: parsed.error.flatten() });
    }

    const { username, email, gender, phone, dateOfBirth } = parsed.data;
    const updateData: any = {};

    if (gender !== undefined) {
      updateData.gender = gender === '' ? null : gender;
    }

    if (phone !== undefined) {
      updateData.phone = phone ? phone.trim() : null;
    }

    if (dateOfBirth !== undefined) {
      if (!dateOfBirth || dateOfBirth.trim() === '') {
        updateData.dateOfBirth = null;
      } else {
        const parsedDob = new Date(dateOfBirth);
        if (!Number.isNaN(parsedDob.getTime())) {
          updateData.dateOfBirth = parsedDob;
        }
      }
    }

    if (username && username.trim() !== '') {
      const normalized = username.toLowerCase().trim();
      if (!isValidUsername(normalized)) {
        return res.status(400).json({
          success: false,
          error: 'Username must be 3-30 characters with letters, numbers, hyphens, or underscores only and not reserved',
        });
      }
      const existing = await prisma.user.findUnique({ where: { username: normalized } });
      if (existing && existing.id !== req.user.id) {
        return res.status(409).json({ success: false, error: 'Username already taken' });
      }
      updateData.username = normalized;
    }

    // Only initiate email verification flow if email actually CHANGED
    if (email && email.trim() !== '') {
      const normalizedEmail = email.toLowerCase().trim();
      if (normalizedEmail !== req.user.email?.toLowerCase()) {
        const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
        if (existing && existing.id !== req.user.id) {
          return res.status(409).json({ success: false, error: 'Email already in use' });
        }

        // Email changes must be verified before the new address is saved.
        // Send a one-time code to the new address and store the pending change.
        const code = crypto.randomInt(100000, 999999).toString();
        await setCache(`email_change:${req.user.id}`, { newEmail: normalizedEmail, code, expiry: Date.now() + 10 * 60 * 1000 }, 10 * 60);

        sendOtpEmail({
          to: normalizedEmail,
          code,
          username: req.user.email?.split('@')[0] || 'User',
        }).catch((err) => console.error('[Auth] Failed to send email change OTP:', err));

        // Save other non-email fields first if any were modified
        if (Object.keys(updateData).length > 0) {
          await prisma.user.update({
            where: { id: req.user.id },
            data: updateData,
          });
        }

        return res.status(202).json({
          success: true,
          data: {
            message: 'A verification code has been sent to the new email address. Use /confirm-email-change to apply the update.',
            pendingEmail: normalizedEmail,
          },
        });
      }
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData,
      select: {
        id: true, email: true, username: true, role: true,
        name: true, avatar: true, bio: true, location: true,
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

// POST /api/auth/confirm-email-change - Verify and apply a pending email change
router.post('/confirm-email-change', authMiddleware, async (req, res) => {
  try {
    const parsed = confirmEmailChangeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid input' });
    }

    const { code } = parsed.data;
    const cacheKey = `email_change:${req.user.id}`;
    const pending = await getCache(cacheKey);

    if (!pending || pending.code !== code || Date.now() > pending.expiry) {
      return res.status(400).json({ success: false, error: 'Invalid or expired verification code' });
    }

    const existing = await prisma.user.findUnique({ where: { email: pending.newEmail } });
    if (existing && existing.id !== req.user.id) {
      await clearCache(cacheKey);
      return res.status(409).json({ success: false, error: 'Email already in use' });
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { email: pending.newEmail, emailVerified: true },
      select: { id: true, email: true, username: true, role: true, emailVerified: true },
    });

    await clearCache(cacheKey);
    invalidateUserAuthCache(req.user.id);

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

    const valid = await verifyAndMigratePassword(currentPassword, user);
    if (!valid) {
      return res.status(401).json({ success: false, error: 'Current password is incorrect' });
    }

    const hashedPassword = await hashPassword(newPassword);
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
