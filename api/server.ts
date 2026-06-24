require('dotenv').config({ path: '../.env' });
require('dotenv').config({ path: '.env' });
const express = require('express');
const cors = require('cors');
const passport = require('passport');
const { prisma } = require('./utils/prisma');
const { authMiddleware } = require('./middleware/auth');
const { generalLimiter } = require('./utils/rateLimiter');
const { serveUploads } = require('./utils/upload');
require('./utils/passport'); // Initialize passport strategies

// Import routes
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

const app = express();
const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const ALLOWED_ORIGINS = FRONTEND_URL.split(',').map((u: string) => u.trim()).filter(Boolean);

// Middleware
app.use(cors({
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

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

// API Routes
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

app.listen(PORT, () => {
  console.log(`Deck Salone API running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

module.exports = app;
