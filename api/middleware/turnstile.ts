const axios = require('axios');
const { fail } = require('../utils/response');
const { getClientIp } = require('../utils/rateLimiter');
import logger from '../utils/logger';

/**
 * Cloudflare Turnstile server-side verification middleware.
 * Verifies cf-turnstile-response token submitted in request body or headers.
 */
export async function verifyTurnstile(req: any, res: any, next: any) {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;
  // AUTH-5 residual: only explicit development/test environments may skip
  // captcha. Every other case — including NODE_ENV unset — must fail closed.
  const canSkipCaptcha = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';

  // AUTH-5: the public test key is only acceptable in development/test.
  if (secretKey === '1x0000000000000000000000000000000AA') {
    if (canSkipCaptcha) {
      return next();
    }
    // Fail closed outside dev/test — a test key configured in prod means captcha is not really configured.
    return fail(res, 500, 'Captcha not configured');
  }

  // AUTH-5: missing secret — fail closed outside development/test.
  if (!secretKey) {
    if (canSkipCaptcha) {
      return next();
    }
    return fail(res, 500, 'Captcha not configured');
  }

  const token = req.body?.turnstileToken || req.body?.['cf-turnstile-response'] || req.headers['cf-turnstile-response'];
  if (!token) {
    return fail(res, 400, 'Security verification required. Please complete the captcha check.');
  }

  try {
    // AUTH-5: rightmost XFF entry is the real peer IP behind our trusted proxy
    // (the leftmost entry is client-spoofable) — same resolution as the rate limiter.
    const remoteIp = getClientIp(req);
    const formData = new URLSearchParams();
    formData.append('secret', secretKey);
    formData.append('response', token);
    if (remoteIp) {
      formData.append('remoteip', remoteIp);
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
    // On unexpected Cloudflare API failure, fail closed everywhere except
    // explicit development/test environments.
    if (canSkipCaptcha) {
      return next();
    }
    return fail(res, 500, 'Security verification service temporarily unavailable.');
  }
}
