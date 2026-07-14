const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { z } = require('zod');
const passport = require('passport');
const { prisma } = require('../utils/prisma');
const { signToken } = require('../utils/jwt');
const { authMiddleware } = require('../middleware/auth');
const { sendOtp, verifyOtp } = require('../utils/otp');
const { authLimiter } = require('../utils/rateLimiter');
const { sendEmail, isEmailConfigured, sendWelcomeEmail, sendOtpEmail } = require('../utils/email');

const router = express.Router();

const RESERVED_USERNAMES = new Set([
  'admin', 'api', 'dashboard', 'login', 'logout', 'dj', 'user', 'soundit',
  'thedeck', 'moderator', 'support', 'help', 'about', 'contact', 'terms',
  'privacy', 'settings',
]);

function isValidUsername(username) {
  return (
    typeof username === 'string' &&
    username.length >= 3 &&
    username.length <= 30 &&
    /^[a-z0-9_-]+$/.test(username) &&
    !RESERVED_USERNAMES.has(username.toLowerCase())
  );
}

async function generateUsername(email) {
  const prefix = (email.split('@')[0] || 'user')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '')
    .slice(0, 20)
    .replace(/^[-_]+|[-_]+$/g, '');
  const base = prefix.length >= 3 ? prefix : 'user';

  // First try the bare base name
  const baseExists = await prisma.user.findUnique({ where: { username: base } });
  if (!baseExists && !RESERVED_USERNAMES.has(base)) return base;

  // Append a random 4-char suffix — collision probability is astronomically low
  // (36^4 = 1.6M combinations). Retry up to 5 times for safety.
  for (let i = 0; i < 5; i++) {
    const suffix = crypto.randomBytes(2).toString('hex'); // e.g. "a3f2"
    const candidate = `${base}_${suffix}`;
    if (!RESERVED_USERNAMES.has(candidate)) {
      const existing = await prisma.user.findUnique({ where: { username: candidate } });
      if (!existing) return candidate;
    }
  }
  throw new Error('Unable to generate unique username after retries');
}

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
    return res.status(500).json({ success: false, error: error.message });
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
    return res.status(500).json({ success: false, error: error.message });
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
    return res.status(500).json({ success: false, error: error.message });
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
      // Create new user with phone
      user = await prisma.user.create({
        data: {
          email: `phone_${Date.now()}@soundit.sl`, // Temporary email - user should update
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
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// EMAIL OTP (for email verification & passwordless login)
// ═══════════════════════════════════════════════════════════════════════════════

// In-memory store for email OTPs (production: use Redis)
const emailOtpStore = new Map();
const EMAIL_OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const EMAIL_MAX_ATTEMPTS = 3;

function generateEmailOtp() {
  return crypto.randomInt(100000, 999999).toString();
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
    const expiry = Date.now() + EMAIL_OTP_EXPIRY_MS;

    emailOtpStore.set(normalizedEmail, {
      code,
      expiry,
      attempts: 0,
    });

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
    return res.status(500).json({ success: false, error: error.message });
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
    const record = emailOtpStore.get(normalizedEmail);

    if (!record) {
      return res.status(400).json({ success: false, error: 'OTP not found or expired. Request a new one.' });
    }

    if (Date.now() > record.expiry) {
      emailOtpStore.delete(normalizedEmail);
      return res.status(400).json({ success: false, error: 'OTP expired. Request a new one.' });
    }

    if (record.attempts >= EMAIL_MAX_ATTEMPTS) {
      emailOtpStore.delete(normalizedEmail);
      return res.status(400).json({ success: false, error: 'Too many attempts. Request a new OTP.' });
    }

    record.attempts += 1;

    if (record.code !== code) {
      return res.status(400).json({ success: false, error: 'Invalid OTP code.' });
    }

    // OTP is valid - clean up
    emailOtpStore.delete(normalizedEmail);

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
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Clean up expired email OTPs every 30 minutes
setInterval(() => {
  const now = Date.now();
  for (const [email, record] of emailOtpStore.entries()) {
    if (now > record.expiry) {
      emailOtpStore.delete(email);
    }
  }
}, 30 * 60 * 1000);

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

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetUrl = `${frontendUrl}/reset-password?token=${rawToken}`;

    // Send the reset email if SMTP is configured; otherwise log the URL in development
    if (isEmailConfigured()) {
      const emailResult = await sendEmail({
        to: email,
        subject: 'Reset your Deck Salone password',
        text: `You requested a password reset. Click the link below to reset your password:\n\n${resetUrl}\n\nThis link expires in 15 minutes. If you did not request this, please ignore this email.`,
        html: `<p>You requested a password reset.</p><p><a href="${resetUrl}">Click here to reset your password</a></p><p>This link expires in 15 minutes. If you did not request this, please ignore this email.</p>`,
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
    return res.status(500).json({ success: false, error: error.message });
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
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Google OAuth Routes
// GET /api/auth/google - Initiate Google OAuth with state for CSRF protection
router.get('/google', (req, res, next) => {
  const state = crypto.randomBytes(32).toString('hex');
  // Store state in a short-lived cookie (5 minutes) for validation on callback
  res.cookie('oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 5 * 60 * 1000, // 5 minutes
  });
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    state,
  })(req, res, next);
});

// GET /api/auth/google/callback - Google OAuth callback
router.get('/google/callback', (req, res, next) => {
  // Validate state parameter to prevent CSRF attacks
  const stateFromQuery = req.query.state;
  const stateFromCookie = req.cookies?.oauth_state;

  if (!stateFromQuery || !stateFromCookie || stateFromQuery !== stateFromCookie) {
    const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
    return res.redirect(`${FRONTEND_URL}/login?error=invalid_state`);
  }

  // Clear the state cookie after validation
  res.clearCookie('oauth_state');

  passport.authenticate('google', { session: false })(req, res, next);
}, (req, res) => {
  const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
  try {
    if (!req.user) {
      return res.redirect(`${FRONTEND_URL}/login?error=google_auth_failed`);
    }

    const token = signToken({ id: req.user.id, email: req.user.email, role: req.user.role });
    const redirectUrl = `${FRONTEND_URL}/auth/callback#token=${token}`;
    return res.redirect(redirectUrl);
  } catch (error) {
    return res.redirect(`${FRONTEND_URL}/login?error=server_error`);
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
        role: true,
        phone: true,
        phoneVerified: true,
        gender: true,
        createdAt: true,
        notificationPreferences: true,
        privacyPreferences: true,
        djProfile: true,
      },
    });
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    return res.json({ success: true, data: user });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

const updateProfileSchema = z.object({
  username: z.string().min(3).max(30).optional(),
  email: z.string().email().optional(),
  gender: z.enum(GENDER_VALUES).optional().or(z.literal('')),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  }),
});

// PUT /api/auth/me - Update current user's profile (username, email, etc.)
router.put('/me', authMiddleware, async (req, res) => {
  try {
    const parsed = updateProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid input', details: parsed.error.flatten() });
    }

    const { username, email, gender } = parsed.data;
    const updateData: any = {};

    if (gender !== undefined) {
      updateData.gender = gender === '' ? null : gender;
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
      select: { id: true, email: true, username: true, role: true, phone: true, phoneVerified: true, gender: true, createdAt: true, djProfile: true },
    });

    return res.json({ success: true, data: user });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
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
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
