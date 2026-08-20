const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { prisma } = require('./prisma');
const { sendEmail, isEmailConfigured } = require('./email');
const { getFrontendUrl } = require('./url');

const BCRYPT_SALT_ROUNDS = 12;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

// In-memory failed login tracking store (Key: normalized email or IP)
interface FailedAttemptRecord {
  count: number;
  lockoutUntil: number | null;
  lastAttempt: number;
}

const failedAttemptStore = new Map<string, FailedAttemptRecord>();

/**
 * Strips HTML tags, script tags, and dangerous control characters from string inputs
 */
function sanitizeString(input: unknown): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove <script> tags
    .replace(/<[^>]*>?/gm, '') // Remove HTML tags
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove dangerous ASCII control chars
    .trim();
}

/**
 * Sanitizes auth payload fields
 */
function sanitizeAuthPayload<T extends Record<string, any>>(body: T): T {
  if (!body || typeof body !== 'object') return body;
  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(body)) {
    if (typeof value === 'string') {
      // Keep passwords intact for hashing, but strip control chars
      if (key.toLowerCase().includes('password')) {
        sanitized[key] = value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
      } else {
        sanitized[key] = sanitizeString(value);
      }
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized as T;
}

/**
 * Checks if an email/IP account is locked and calculates progressive delay
 */
function checkAccountLockout(email: string, ip: string): { isLocked: boolean; delayMs: number } {
  const normalizedEmail = email ? email.toLowerCase().trim() : '';
  const key = `${normalizedEmail}:${ip}`;
  const record = failedAttemptStore.get(key) || failedAttemptStore.get(normalizedEmail);

  if (!record) {
    return { isLocked: false, delayMs: 0 };
  }

  const now = Date.now();

  // Check if account is locked out
  if (record.lockoutUntil && now < record.lockoutUntil) {
    return { isLocked: true, delayMs: 0 };
  }

  // If lockout expired, reset
  if (record.lockoutUntil && now >= record.lockoutUntil) {
    failedAttemptStore.delete(key);
    failedAttemptStore.delete(normalizedEmail);
    return { isLocked: false, delayMs: 0 };
  }

  // Progressive delay calculation (1s, 2s, 4s, 8s based on consecutive failures)
  let delayMs = 0;
  if (record.count === 1) delayMs = 0;
  else if (record.count === 2) delayMs = 1000;
  else if (record.count === 3) delayMs = 2000;
  else if (record.count >= 4) delayMs = 4000;

  return { isLocked: false, delayMs };
}

/**
 * Records a failed login attempt, calculates lockouts, and notifies user via email if locked
 */
async function recordFailedAttempt(email: string, ip: string): Promise<void> {
  const normalizedEmail = email ? email.toLowerCase().trim() : '';
  const key = `${normalizedEmail}:${ip}`;
  const now = Date.now();

  const record = failedAttemptStore.get(key) || { count: 0, lockoutUntil: null, lastAttempt: now };
  record.count += 1;
  record.lastAttempt = now;

  if (record.count >= MAX_FAILED_ATTEMPTS) {
    record.lockoutUntil = now + LOCKOUT_DURATION_MS;

    console.warn(`[Security Alert] Account locked for 15 minutes due to ${record.count} failed login attempts: ${normalizedEmail} (IP: ${ip})`);

    // Asynchronously send lockout notification & password reset link
    if (normalizedEmail) {
      sendLockoutNotification(normalizedEmail).catch((err) => {
        console.error('[Security Alert] Failed to send lockout email notification:', err);
      });
    }
  } else {
    console.warn(`[Auth Monitoring] Failed login attempt ${record.count}/${MAX_FAILED_ATTEMPTS} for ${normalizedEmail} (IP: ${ip})`);
  }

  failedAttemptStore.set(key, record);
  if (normalizedEmail) {
    failedAttemptStore.set(normalizedEmail, record);
  }
}

/**
 * Resets failed attempts after a successful login
 */
function recordSuccessfulLogin(email: string, ip: string): void {
  const normalizedEmail = email ? email.toLowerCase().trim() : '';
  const key = `${normalizedEmail}:${ip}`;
  failedAttemptStore.delete(key);
  if (normalizedEmail) {
    failedAttemptStore.delete(normalizedEmail);
  }
}

/**
 * Sends a security lockout alert email with password reset link
 */
async function sendLockoutNotification(email: string): Promise<void> {
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return; // User does not exist, silent return

    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiry = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordResetToken: hashedToken, passwordResetExpiry: expiry },
    });

    const frontendUrl = getFrontendUrl();
    const resetUrl = `${frontendUrl}/reset-password?token=${rawToken}`;

    if (isEmailConfigured()) {
      await sendEmail({
        to: email,
        subject: 'Security Alert: Multiple Failed Login Attempts - Deck Salone',
        text: `Security Alert: We detected 5 consecutive failed login attempts on your Deck Salone account. Your account has been temporarily locked for 15 minutes for your security.\n\nIf this was not you, please reset your password immediately using the link below:\n\n${resetUrl}\n\nThis reset link expires in 15 minutes.`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #d9534f;">Security Alert: Failed Login Attempts</h2>
            <p>We detected multiple failed login attempts on your Deck Salone account. To protect your data, account access is temporarily paused for 15 minutes.</p>
            <p>If you forgot your password or suspect unauthorized access, click below to reset your password:</p>
            <p><a href="${resetUrl}" style="background-color: #f4e059; color: #000; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 20px; display: inline-block;">Reset Your Password</a></p>
            <p style="font-size: 12px; color: #777; margin-top: 20px;">If you triggered this login attempt, you can log in after 15 minutes.</p>
          </div>
        `,
      });
    } else {
      console.log(`[Dev Security Alert] Password reset link for locked user ${email}: ${resetUrl}`);
    }
  } catch (err) {
    console.error('[Security Alert Error]', err);
  }
}

/**
 * Hashes password using bcrypt with salt rounds >= 12
 */
async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
}

/**
 * Verifies password with constant-time bcrypt compare and transparently migrates weak hashes to cost factor 12
 */
async function verifyAndMigratePassword(
  plainPassword: string,
  user: { id: string; password?: string | null }
): Promise<boolean> {
  if (!user || !user.password) return false;

  const isValid = await bcrypt.compare(plainPassword, user.password);
  if (!isValid) return false;

  // Check if hash rounds < 12 (Migration requirement)
  try {
    const rounds = bcrypt.getRounds(user.password);
    if (rounds < BCRYPT_SALT_ROUNDS) {
      console.log(`[Security Audit] Transparently upgrading password hash rounds from ${rounds} to ${BCRYPT_SALT_ROUNDS} for user ${user.id}`);
      const newHash = await hashPassword(plainPassword);
      await prisma.user.update({
        where: { id: user.id },
        data: { password: newHash },
      });
    }
  } catch (e) {
    // If getRounds fails or hash is legacy format, force rehash to bcrypt 12
    const newHash = await hashPassword(plainPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: newHash },
    });
  }

  return true;
}

// Cleanup expired lockout records periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of failedAttemptStore.entries()) {
    if (now - record.lastAttempt > 30 * 60 * 1000) {
      failedAttemptStore.delete(key);
    }
  }
}, 15 * 60 * 1000);

module.exports = {
  sanitizeString,
  sanitizeAuthPayload,
  checkAccountLockout,
  recordFailedAttempt,
  recordSuccessfulLogin,
  hashPassword,
  verifyAndMigratePassword,
  BCRYPT_SALT_ROUNDS,
};
