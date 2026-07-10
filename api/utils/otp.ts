/**
 * Phone OTP Service
 * Simple in-memory store for OTPs. For production, use Redis + a real SMS provider
 * (e.g., Twilio, MessageBird, Termii for Sierra Leone).
 */

const crypto = require('crypto');
const { signToken } = require('./jwt');

// In-memory OTP store: { phone: { code, expiry, attempts } }
// In production, replace with Redis
const otpStore = new Map();

const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS = 3;

function generateOtp() {
  // 6-digit numeric OTP using cryptographically secure random
  return crypto.randomInt(100000, 999999).toString();
}

/**
 * Send OTP to a phone number.
 * In production, this calls an SMS provider API.
 * For now, we log to console and return the code (dev mode).
 */
async function sendOtp(phone) {
  // Normalize phone number (basic)
  const normalizedPhone = phone.trim().replace(/\s/g, '');
  const code = generateOtp();
  const expiry = Date.now() + OTP_EXPIRY_MS;

  otpStore.set(normalizedPhone, {
    code,
    expiry,
    attempts: 0,
  });

  // TODO: Replace with actual SMS provider (Termii, Twilio, etc.)
  // For Sierra Leone, Termii or Twilio are good options
  console.log(`[OTP] Sent code ${code} to ${normalizedPhone}`);

  return { phone: normalizedPhone, sent: true, devCode: process.env.NODE_ENV === 'development' ? code : undefined };
}

/**
 * Verify OTP and return a JWT if valid.
 */
async function verifyOtp(phone, code) {
  const normalizedPhone = phone.trim().replace(/\s/g, '');
  const record = otpStore.get(normalizedPhone);

  if (!record) {
    return { valid: false, error: 'OTP not found or expired. Request a new one.' };
  }

  if (Date.now() > record.expiry) {
    otpStore.delete(normalizedPhone);
    return { valid: false, error: 'OTP expired. Request a new one.' };
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    otpStore.delete(normalizedPhone);
    return { valid: false, error: 'Too many attempts. Request a new OTP.' };
  }

  record.attempts += 1;

  if (record.code !== code) {
    return { valid: false, error: 'Invalid OTP code.' };
  }

  // OTP is valid - clean up
  otpStore.delete(normalizedPhone);
  return { valid: true };
}

/**
 * Clean up expired OTPs periodically (every 30 minutes)
 */
setInterval(() => {
  const now = Date.now();
  for (const [phone, record] of otpStore.entries()) {
    if (now > record.expiry) {
      otpStore.delete(phone);
    }
  }
}, 30 * 60 * 1000);

module.exports = { sendOtp, verifyOtp };
