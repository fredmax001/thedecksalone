/**
 * Phone OTP Service backed by Redis.
 * For production, use Redis + a real SMS provider
 * (e.g., Twilio, MessageBird, Termii for Sierra Leone).
 */

const crypto = require('crypto');
import redisClient from './redis';

const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const OTP_EXPIRY_SECONDS = OTP_EXPIRY_MS / 1000;
const MAX_ATTEMPTS = 3;

function generateOtp() {
  // 6-digit numeric OTP using cryptographically secure random
  return crypto.randomInt(100000, 999999).toString();
}

function getOtpKey(phone: string): string {
  return `otp:${phone.trim().replace(/\s/g, '')}`;
}

/**
 * Send OTP to a phone number.
 * In production, this calls an SMS provider API.
 * For now, we log to console and return the code (dev mode).
 */
async function sendOtp(phone) {
  if (!redisClient) {
    throw new Error('Redis is not configured. OTP service unavailable.');
  }

  const normalizedPhone = phone.trim().replace(/\s/g, '');
  const code = generateOtp();
  const expiry = Date.now() + OTP_EXPIRY_MS;

  await redisClient.setex(
    getOtpKey(phone),
    OTP_EXPIRY_SECONDS,
    JSON.stringify({ code, expiry, attempts: 0 })
  );

  // TODO: Replace with actual SMS provider (Termii, Twilio, etc.)
  // For Sierra Leone, Termii or Twilio are good options
  console.log(`[OTP] Sent code ${code} to ${normalizedPhone}`);

  return { phone: normalizedPhone, sent: true, devCode: process.env.NODE_ENV === 'development' ? code : undefined };
}

/**
 * Verify OTP and return a result object.
 */
async function verifyOtp(phone, code) {
  if (!redisClient) {
    return { valid: false, error: 'OTP service unavailable.' };
  }

  const key = getOtpKey(phone);
  const data = await redisClient.get(key);

  if (!data) {
    return { valid: false, error: 'OTP not found or expired. Request a new one.' };
  }

  let record;
  try {
    record = JSON.parse(data);
  } catch {
    await redisClient.del(key);
    return { valid: false, error: 'OTP not found or expired. Request a new one.' };
  }

  if (Date.now() > record.expiry) {
    await redisClient.del(key);
    return { valid: false, error: 'OTP expired. Request a new one.' };
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    await redisClient.del(key);
    return { valid: false, error: 'Too many attempts. Request a new OTP.' };
  }

  record.attempts += 1;

  if (record.code !== code) {
    const remainingTtl = Math.max(1, Math.ceil((record.expiry - Date.now()) / 1000));
    await redisClient.setex(key, remainingTtl, JSON.stringify(record));
    return { valid: false, error: 'Invalid OTP code.' };
  }

  // OTP is valid - clean up
  await redisClient.del(key);
  return { valid: true };
}

module.exports = { sendOtp, verifyOtp };
