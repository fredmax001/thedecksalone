require('dotenv').config({ path: '../.env' });
require('dotenv').config({ path: '.env' });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const passport = require('passport');
const { prisma } = require('./utils/prisma');
const { authMiddleware } = require('./middleware/auth');
const { generalLimiter } = require('./utils/rateLimiter');
const { serveUploads } = require('./utils/upload');
require('./utils/passport'); // Initialize passport strategies

const authRoutes = require('./routes/auth');
const djRoutes = require('./routes/djs');
const mixRoutes = require('./routes/mixes');
const rankingRoutes = require('./routes/rankings');
const bookingRoutes = require('./routes/bookings');
const eventRoutes = require('./routes/events');
const reviewRoutes = require('./routes/reviews');
const battleRoutes = require('./routes/battles');
const dashboardRoutes = require('./routes/dashboard');
const adminRoutes = require('./routes/admin');
const paymentRoutes = require('./routes/payments');
const messageRoutes = require('./routes/messages');
const ogRoutes = require('./routes/og');
const userRoutes = require('./routes/users');
const discoverRoutes = require('./routes/discover');
const campaignRoutes = require('./routes/campaigns');

const app = express();
const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const ALLOWED_ORIGINS = FRONTEND_URL.split(',').map((u) => u.trim()).filter(Boolean);
// Add common dev server origins for local development
['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000', 'http://127.0.0.1:3001'].forEach((origin) => {
  if (!ALLOWED_ORIGINS.includes(origin)) ALLOWED_ORIGINS.push(origin);
});

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false, // API returns JSON; CSP is enforced by the frontend
}));

// Middleware — permissive CORS for local dev; restrict in production
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parsers — strict 1 MB limit for JSON (DoS prevention).
// File uploads use multer directly on routes and bypass this limit.
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Passport initialization
app.use(passport.initialize());

// Global rate limiting
app.use(generalLimiter);

// Serve uploaded files statically
serveUploads(app);

// Health check
app.get('/health', (req, res) => {
  res.json({ success: true, message: 'Deck Salone API is running', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/djs', djRoutes);
app.use('/api/mixes', mixRoutes);
app.use('/api/rankings', rankingRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/battles', battleRoutes);
app.use('/api/dashboard', authMiddleware, dashboardRoutes);
app.use('/api/admin', authMiddleware, adminRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/messages', authMiddleware, messageRoutes);
app.use('/api/users', authMiddleware, userRoutes);
app.use('/api/discover', discoverRoutes);
app.use('/api/campaigns', campaignRoutes);

// OG Meta routes for social media sharing (own file)
app.use('/og', ogRoutes);

// Serve built frontend static files (production build) with cache-busting
const path = require('path');
app.use(express.static(path.join(__dirname, '../dist'), {
  setHeaders: (res, filePath) => {
    // No cache for HTML (always fresh)
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
    // Long cache for hashed assets (JS/CSS with content hash)
    else if (filePath.match(/\.[a-f0-9]{8,}\.(js|css)$/)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
  }
}));

// SPA fallback for React Router — serve index.html for non-API routes
app.use((req, res, next) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/og/')) {
    return next();
  }
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: `Route ${req.method} ${req.path} not found` });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// Graceful shutdown
async function shutdown() {
  console.log('Shutting down...');
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('SIGHUP', () => console.log('SIGHUP ignored'));

app.listen(PORT, () => {
  console.log(`Deck Salone API running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

module.exports = app;
