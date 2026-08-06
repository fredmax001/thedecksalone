const rateLimit = require('express-rate-limit');

// General API rate limiter
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  skip: (req: any) => {
    if (process.env.NODE_ENV === 'production') return false;
    const ip = req.ip || req.connection.remoteAddress || '';
    return ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.');
  },
  message: {
    success: false,
    error: 'Too many requests. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Dedicated login rate limiter: Max 10 requests per IP per 1 minute
const loginRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // Max 10 login attempts per IP per minute
  skip: (req: any) => {
    if (process.env.NODE_ENV === 'production') return false;
    const ip = req.ip || req.connection.remoteAddress || '';
    return ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.');
  },
  message: {
    success: false,
    error: 'Incorrect email or password', // Generic error message
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// General auth rate limiter (signup, otp, password reset)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15,
  skip: (req: any) => {
    if (process.env.NODE_ENV === 'production') return false;
    const ip = req.ip || req.connection.remoteAddress || '';
    return ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.');
  },
  message: {
    success: false,
    error: 'Too many authentication attempts. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
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
});

// Mix play limiter — cap play-count inflation per mix per IP/user
const playLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  skip: (req: any) => {
    if (process.env.NODE_ENV === 'production') return false;
    const ip = req.ip || req.connection.remoteAddress || '';
    return ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.');
  },
  keyGenerator: (req: any) => `${req.ip || 'unknown'}:${req.params.id || req.params.id}`,
  message: {
    success: false,
    error: 'Too many plays. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Ticket purchase limiter — prevent spam pending orders
const purchaseLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  skip: (req: any) => {
    if (process.env.NODE_ENV === 'production') return false;
    const ip = req.ip || req.connection.remoteAddress || '';
    return ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.');
  },
  keyGenerator: (req: any) => req.user?.id || req.ip || 'unknown',
  message: {
    success: false,
    error: 'Too many ticket purchase attempts. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Search / discovery limiter — cap expensive text-search queries
const searchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  skip: (req: any) => {
    if (process.env.NODE_ENV === 'production') return false;
    const ip = req.ip || req.connection.remoteAddress || '';
    return ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.');
  },
  keyGenerator: (req: any) => req.ip || 'unknown',
  message: {
    success: false,
    error: 'Too many search requests. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

function conditionalSearchLimiter(req: any, res: any, next: any) {
  if (req.query.search || req.query.q) {
    return searchLimiter(req, res, next);
  }
  next();
}

module.exports = { generalLimiter, loginRateLimiter, authLimiter, bookingLimiter, voteLimiter, playLimiter, purchaseLimiter, searchLimiter, conditionalSearchLimiter };
