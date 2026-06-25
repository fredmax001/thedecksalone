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
const messageRoutes = require('./routes/messages');

const app = express();
const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const ALLOWED_ORIGINS = FRONTEND_URL.split(',').map((u: string) => u.trim()).filter(Boolean);

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false, // API returns JSON; CSP is enforced by the frontend
}));

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

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

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
app.use('/api/messages', authMiddleware, messageRoutes);

// OG Meta route for social media sharing
app.get('/og/dj/:identifier', async (req, res) => {
  try {
    const identifier = req.params.identifier;
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    const dj = await prisma.djProfile.findFirst({
      where: {
        OR: [
          { id: identifier },
          { user: { username: { equals: identifier, mode: 'insensitive' } } },
        ],
      },
      include: {
        user: { select: { username: true } },
      },
    });

    if (!dj) {
      return res.status(404).send('<h1>DJ Not Found</h1>');
    }

    const profileUrl = `${baseUrl}/dj/${dj.user.username || dj.id}`;
    const title = `${dj.stageName} — The Deck Salone`;
    const description = dj.bio?.slice(0, 200) || `Check out ${dj.stageName} on The Deck Salone, Sierra Leone's premier DJ platform.`;
    const image = dj.avatar || dj.coverBanner || `${baseUrl}/cover-placeholder.jpg`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <meta name="description" content="${description}">
  <meta property="og:type" content="profile">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:url" content="${profileUrl}">
  <meta property="og:image" content="${image}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:site_name" content="The Deck Salone">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${image}">
  <link rel="canonical" href="${profileUrl}">
  <script>window.location.href = "${profileUrl}";</script>
</head>
<body>
  <p>Redirecting to <a href="${profileUrl}">${profileUrl}</a>...</p>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    res.status(500).send('<h1>Server Error</h1>');
  }
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

app.listen(PORT, () => {
  console.log(`Deck Salone API running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

module.exports = app;
