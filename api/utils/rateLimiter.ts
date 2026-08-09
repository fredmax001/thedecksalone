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

const storeOptions = RedisStore && redisClient
  ? { store: new RedisStore({ sendCommand: (...args) => redisClient.call(...args) }) }
  : {};

// General API rate limiter
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  skip: (req: any) => {
    if (process.env.NODE_ENV === 'production') return false;
    const ip = req.ip || req.socket?.remoteAddress || '';
    return ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.');
  },
  message: {
    success: false,
    error: 'Too many requests. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  ...storeOptions,
});

// Dedicated login rate limiter: Max 10 requests per IP per 1 minute
const loginRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // Max 10 login attempts per IP per minute
  skip: (req: any) => {
    if (process.env.NODE_ENV === 'production') return false;
    const ip = req.ip || req.socket?.remoteAddress || '';
    return ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.');
  },
  message: {
    success: false,
    error: 'Incorrect email or password', // Generic error message
  },
  standardHeaders: true,
  legacyHeaders: false,
  ...storeOptions,
});

// General auth rate limiter (signup, otp, password reset)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15,
  skip: (req: any) => {
    if (process.env.NODE_ENV === 'production') return false;
    const ip = req.ip || req.socket?.remoteAddress || '';
    return ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.');
  },
  message: {
    success: false,
    error: 'Too many authentication attempts. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  ...storeOptions,
});

// Booking creation limiter
const bookingLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: {
    success: false,
    error: 'Too many booking requests. Please try again in an hour.',
  },
  keyGenerator: (req: any) => req.user?.id || req.ip,
  standardHeaders: true,
  legacyHeaders: false,
  ...storeOptions,
});

// Vote limiter
const voteLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    error: 'Too many votes. Please try again in an hour.',
  },
  keyGenerator: (req: any) => req.user?.id || req.ip,
  standardHeaders: true,
  legacyHeaders: false,
  ...storeOptions,
});

// Mix play limiter — cap play-count inflation per mix per IP/user
const playLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  skip: (req: any) => {
    if (process.env.NODE_ENV === 'production') return false;
    const ip = req.ip || req.socket?.remoteAddress || '';
    return ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.');
  },
  keyGenerator: (req: any) => `${req.ip || 'unknown'}:${req.params.id || req.params.id}`,
  message: {
    success: false,
    error: 'Too many plays. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  ...storeOptions,
});

// Ticket purchase limiter — prevent spam pending orders
const purchaseLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  skip: (req: any) => {
    if (process.env.NODE_ENV === 'production') return false;
    const ip = req.ip || req.socket?.remoteAddress || '';
    return ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.');
  },
  keyGenerator: (req: any) => req.user?.id || req.ip || 'unknown',
  message: {
    success: false,
    error: 'Too many ticket purchase attempts. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  ...storeOptions,
});

// Search / discovery limiter — cap expensive text-search queries
const searchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  skip: (req: any) => {
    if (process.env.NODE_ENV === 'production') return false;
    const ip = req.ip || req.socket?.remoteAddress || '';
    return ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.');
  },
  keyGenerator: (req: any) => req.ip || 'unknown',
  message: {
    success: false,
    error: 'Too many search requests. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  ...storeOptions,
});

function conditionalSearchLimiter(req: any, res: any, next: any) {
  if (req.query.search || req.query.q) {
    return searchLimiter(req, res, next);
  }
  next();
}

module.exports = { generalLimiter, loginRateLimiter, authLimiter, bookingLimiter, voteLimiter, playLimiter, purchaseLimiter, searchLimiter, conditionalSearchLimiter };
