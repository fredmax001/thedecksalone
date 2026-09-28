const rateLimit = require('express-rate-limit');

// Try to use Redis store for rate limiting if available (persistent across restarts)
// Install: npm install rate-limit-redis
let RedisStore = null;
let redisClient = null;
try {
  RedisStore = require('rate-limit-redis');
  const redisModule = require('./redis');
  redisClient = redisModule.default || redisModule.redisClient;
} catch {
  // Redis store not available — falling back to in-memory store
}

function getClientIp(req: any): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    // Behind exactly one trusted nginx proxy, the rightmost XFF entry is the
    // real peer IP — the first entry is client-spoofable.
    const parts = forwarded.split(',').map((p) => p.trim()).filter(Boolean);
    if (parts.length > 0) return parts[parts.length - 1];
  }
  return req.headers['x-real-ip'] || req.ip || req.socket?.remoteAddress || 'unknown';
}

// express-rate-limit requires each limiter to have its own Store instance with unique prefix.
function getRedisStore(prefix: string) {
  return RedisStore && redisClient
    ? { store: new RedisStore({ sendCommand: (...args: any[]) => redisClient.call(...args), prefix: `rl:${prefix}:` }) }
    : {};
}

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5000, // Generous limit for multi-query SPA frontend
  keyGenerator: (req: any) => getClientIp(req),
  message: {
    success: false,
    error: 'Too many requests. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  ...getRedisStore('general'),
});

// Dedicated login rate limiter: Max 25 requests per email/IP per 1 minute
const loginRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 25,
  skip: (req: any) => {
    if (process.env.NODE_ENV === 'production') return false;
    const ip = getClientIp(req);
    return ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.');
  },
  keyGenerator: (req: any) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.toLowerCase().trim() : '';
    return email ? `login:${email}` : `login_ip:${getClientIp(req)}`;
  },
  message: {
    success: false,
    error: 'Too many login attempts. Please try again in a minute.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  ...getRedisStore('login'),
});

// General auth rate limiter (signup, otp, password reset): Max 60 attempts per 15 minutes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 60,
  skip: (req: any) => {
    if (process.env.NODE_ENV === 'production') return false;
    const ip = getClientIp(req);
    return ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.');
  },
  keyGenerator: (req: any) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.toLowerCase().trim() : '';
    return email ? `auth:${email}` : `auth_ip:${getClientIp(req)}`;
  },
  message: {
    success: false,
    error: 'Too many authentication attempts. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  ...getRedisStore('auth'),
});

// Booking creation limiter
const bookingLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  message: {
    success: false,
    error: 'Too many booking requests. Please try again in an hour.',
  },
  keyGenerator: (req: any) => (req.user?.id ? `booking:${req.user.id}` : `booking_ip:${getClientIp(req)}`),
  standardHeaders: true,
  legacyHeaders: false,
  ...getRedisStore('booking'),
});

// Dedicated Battle Vote limiter: Max 30 votes per 15 minutes per authenticated user
const voteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,
  message: {
    success: false,
    error: 'Too many votes submitted. Please try again in 15 minutes.',
  },
  keyGenerator: (req: any) => (req.user?.id ? `vote:user_${req.user.id}` : `vote_ip:${getClientIp(req)}`),
  standardHeaders: true,
  legacyHeaders: false,
  ...getRedisStore('vote'),
});

// Mix play limiter — cap play-count inflation per mix per IP/user
const playLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  skip: (req: any) => {
    if (process.env.NODE_ENV === 'production') return false;
    const ip = getClientIp(req);
    return ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.');
  },
  keyGenerator: (req: any) => `play:${req.user?.id || getClientIp(req)}:${req.params.id}`, 
  message: {
    success: false,
    error: 'Too many plays. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  ...getRedisStore('play'),
});

// Ticket purchase limiter — prevent spam pending orders
const purchaseLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  skip: (req: any) => {
    if (process.env.NODE_ENV === 'production') return false;
    const ip = getClientIp(req);
    return ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.');
  },
  keyGenerator: (req: any) => (req.user?.id ? `purchase:${req.user.id}` : `purchase_ip:${getClientIp(req)}`),
  message: {
    success: false,
    error: 'Too many ticket purchase attempts. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  ...getRedisStore('purchase'),
});

// Report submission limiter — cap anonymous report spam / admin email bomb (SOC-7)
const reportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  keyGenerator: (req: any) => (req.user?.id ? `report:${req.user.id}` : `report_ip:${getClientIp(req)}`),
  message: {
    success: false,
    error: 'Too many reports submitted. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  ...getRedisStore('report'),
});

// Message sending limiter — cap mass-messaging spam (SOC-9)
const messageLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 20,
  keyGenerator: (req: any) => (req.user?.id ? `message:${req.user.id}` : `message_ip:${getClientIp(req)}`),
  message: {
    success: false,
    error: 'Too many messages sent. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  ...getRedisStore('message'),
});

// Analytics beacon limiter — cap unauthenticated DB write amplification (SOC-10)
const analyticsVisitLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60,
  keyGenerator: (req: any) => `analytics:${getClientIp(req)}`,
  message: {
    success: false,
    error: 'Too many analytics requests.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  ...getRedisStore('analytics'),
});

// Developer application limiter — cap unauthenticated admin notification/email spam (SOC-17)
const developerApplyLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  keyGenerator: (req: any) => (req.user?.id ? `devapply:${req.user.id}` : `devapply_ip:${getClientIp(req)}`),
  message: {
    success: false,
    error: 'Too many application attempts. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  ...getRedisStore('devapply'),
});

// Search / discovery limiter — cap expensive text-search queries
const searchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60,
  skip: (req: any) => {
    if (process.env.NODE_ENV === 'production') return false;
    const ip = getClientIp(req);
    return ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.');
  },
  keyGenerator: (req: any) => `search:${getClientIp(req)}`,
  message: {
    success: false,
    error: 'Too many search requests. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  ...getRedisStore('search'),
});

function conditionalSearchLimiter(req: any, res: any, next: any) {
  if (req.query.search || req.query.q) {
    return searchLimiter(req, res, next);
  }
  next();
}

module.exports = { getClientIp, generalLimiter, loginRateLimiter, authLimiter, bookingLimiter, voteLimiter, playLimiter, purchaseLimiter, searchLimiter, conditionalSearchLimiter, reportLimiter, messageLimiter, analyticsVisitLimiter, developerApplyLimiter };
