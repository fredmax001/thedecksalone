const axios = require('axios');
const { fail } = require('../utils/response');
import logger from '../utils/logger';

/**
 * Cloudflare Turnstile server-side verification middleware.
 * Verifies cf-turnstile-response token submitted in request body or headers.
 */
export async function verifyTurnstile(req: any, res: any, next: any) {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;

  // In test or development environments without secret key, bypass verification
  if (!secretKey || secretKey === '1x0000000000000000000000000000000AA') {
    return next();
  }

  const token = req.body?.turnstileToken || req.body?.['cf-turnstile-response'] || req.headers['cf-turnstile-response'];
  if (!token) {
    return fail(res, 400, 'Security verification required. Please complete the captcha check.');
  }

  try {
    const remoteIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
    const formData = new URLSearchParams();
    formData.append('secret', secretKey);
    formData.append('response', token);
    if (remoteIp) {
      formData.append('remoteip', String(remoteIp).split(',')[0].trim());
    }

    const response = await axios.post('https://challenges.cloudflare.com/turnstile/v0/siteverify', formData.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 5000,
    });

    if (response.data && response.data.success) {
      return next();
    }

    logger.warn('[Turnstile] Verification failed:', response.data);
    return fail(res, 400, 'Security check failed. Please refresh and try again.');
  } catch (error: any) {
    logger.error('[Turnstile] Verification request error:', error.message);
    // On unexpected Cloudflare API failure, fail closed in production, open in dev
    if (process.env.NODE_ENV === 'production') {
      return fail(res, 500, 'Security verification service temporarily unavailable.');
    }
    return next();
  }
}
