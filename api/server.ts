const path = require('path');
const dotenv = require('dotenv');
const isCompiledServer = __dirname.endsWith('/dist') || __dirname.endsWith('\\dist');
const projectRoot = path.join(__dirname, isCompiledServer ? '../..' : '..');
dotenv.config({ path: path.join(projectRoot, '.env') });
dotenv.config({ path: path.join(projectRoot, 'api', '.env'), override: true });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const passport = require('passport');
const cookieParser = require('cookie-parser');
const { prisma } = require('./utils/prisma');
const { authMiddleware } = require('./middleware/auth');
const { generalLimiter } = require('./utils/rateLimiter');
const { serveUploads } = require('./utils/upload');
require('./utils/passport'); // Initialize passport strategies

// NEW: Import compression and logger
const compression = require('compression');
const { logger } = require('./utils/logger');
const promClient = require('prom-client');
const { v4: uuidv4 } = require('uuid');

// Configure Prometheus default metrics
promClient.collectDefaultMetrics();
const httpRequestDurationMicroseconds = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});

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
const gigRoutes = require('./routes/gigs');
const photoRoutes = require('./routes/photos');
const opportunityRoutes = require('./routes/opportunities');
const setRoutes = require('./routes/sets');

const notificationRoutes = require('./routes/notifications');
const analyticsRoutes = require('./routes/analytics');
const ticketRoutes = require('./routes/tickets');
const eventTicketingRoutes = require('./routes/eventTicketing');
const userTicketRoutes = require('./routes/userTickets');
const sitemapRoutes = require('./routes/sitemap');
const reportRoutes = require('./routes/reports');
const moderatorRoutes = require('./routes/moderator');
const officialPlaylistRoutes = require('./routes/officialPlaylists');
const developerRoutes = require('./routes/developers');

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const ALLOWED_ORIGINS = FRONTEND_URL.split(',').map((u) => u.trim()).filter(Boolean);
// Add common dev server origins for local development only
if (process.env.NODE_ENV !== 'production') {
  ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000', 'http://127.0.0.1:3001'].forEach((origin) => {
    if (!ALLOWED_ORIGINS.includes(origin)) ALLOWED_ORIGINS.push(origin);
  });
}

// Security headers hardened for production
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false, // API returns JSON; CSP is enforced by the frontend
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  frameguard: { action: 'deny' },
  xssFilter: true,
  noSniff: true,
}));

// User & Auth Cache-Control isolation: Prevent any shared, proxy, browser, or SW caching of authenticated or user-specific API data
app.use((req, res, next) => {
  if (req.headers.authorization || req.path.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  next();
});

function isAllowedOrigin(origin: string | undefined) {
  if (!origin) return true; // Allow requests without Origin header (mobile apps, curl, etc.)
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  if (/^https?:\/\/([a-z0-9-]+\.)*decksalone\.com$/i.test(origin)) return true;
  return process.env.NODE_ENV !== 'production' && /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);
}

// Middleware - restrict browser origins in production.
app.use(cors({
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (isAllowedOrigin(origin)) return callback(null, true);
    logger.warn('CORS origin rejected', { origin });
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parsers — strict 1 MB limit for JSON (DoS prevention).
// File uploads use multer directly on routes and bypass this limit.
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Add compression middleware to scale network throughput
app.use(compression());

// Request tracing middleware
app.use((req, res, next) => {
  req.id = req.headers['x-request-id'] || uuidv4();
  res.setHeader('X-Request-Id', req.id);
  
  // Start timer for Prometheus metrics
  res.locals.startEpoch = Date.now();
  
  res.on('finish', () => {
    const responseTimeInMs = Date.now() - res.locals.startEpoch;
    httpRequestDurationMicroseconds
      .labels(req.method, req.route ? req.route.path : req.path, res.statusCode)
      .observe(responseTimeInMs / 1000);
      
    // Log request completion
    logger.info('HTTP Request', {
      requestId: req.id,
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: responseTimeInMs
    });
  });
  
  next();
});

// Cookie parser — required for Google OAuth state cookie validation
app.use(cookieParser());

// Passport initialization
app.use(passport.initialize());

// Serve uploaded files statically
serveUploads(app);

// Health check
app.get('/health', (req, res) => {
  res.json({ success: true, message: 'Deck Salone API is running', timestamp: new Date().toISOString() });
});

// Expose Prometheus metrics endpoint (restricted to internal IPs or bearer token)
app.get('/metrics', async (req, res) => {
  const allowedIps = ['127.0.0.1', '::1', '::ffff:127.0.0.1'];
  const forwarded = req.headers['x-forwarded-for'];
  const clientIp = forwarded ? String(forwarded).split(',')[0].trim() : (req.ip || req.socket?.remoteAddress || '');
  const token = req.headers.authorization?.replace('Bearer ', '');
  const expectedToken = process.env.METRICS_TOKEN;

  const isInternal = allowedIps.includes(clientIp);
  const hasValidToken = expectedToken && token === expectedToken;

  if (!isInternal && !hasValidToken) {
    return res.status(403).json({ success: false, error: 'Forbidden' });
  }

  res.set('Content-Type', promClient.register.contentType);
  res.end(await promClient.register.metrics());
});

// Rate limit API traffic only. Static frontend assets should not consume API quota.
app.use('/api', generalLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/djs', djRoutes);
app.use('/api/mixes', mixRoutes);
app.use('/api/rankings', rankingRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/events/:id/tickets', ticketRoutes);
app.use('/api/events/:id/ticketing', eventTicketingRoutes);
app.use('/api/user/tickets', userTicketRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/battles', battleRoutes);
app.use('/api/dashboard', authMiddleware, dashboardRoutes);
app.use('/api/admin', authMiddleware, adminRoutes);
app.use('/api/moderator', moderatorRoutes);
app.use('/api/official-playlists', officialPlaylistRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/messages', authMiddleware, messageRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/users', userRoutes);

app.use('/api/discover', discoverRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/gigs', gigRoutes);
app.use('/api/opportunities', authMiddleware, opportunityRoutes);
app.use('/api/photos', photoRoutes);
app.use('/api/sets', setRoutes);
app.use('/api/notifications', authMiddleware, notificationRoutes);
app.use('/api/developers', developerRoutes);

// OG Meta routes for social media sharing (own file)
app.use('/og', ogRoutes);
app.use('/sitemap.xml', sitemapRoutes);

// Serve built frontend static files (production build) with cache-busting
// Handle both ts-node (runs from api/) and compiled dist (runs from api/dist/)
const isCompiled = __dirname.endsWith('/dist') || __dirname.endsWith('\\dist');
const distDir = path.join(__dirname, isCompiled ? '../../dist' : '../dist');
app.use(express.static(distDir, {
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

const fs = require('fs');

// Simple in-memory LRU cache for SSR meta tags (30s TTL) to avoid DB hits on every page load
const META_CACHE_TTL_MS = 30_000;
const metaCache = new Map();
function getCachedMeta(path) {
  const entry = metaCache.get(path);
  if (!entry) return null;
  if (Date.now() - entry.ts > META_CACHE_TTL_MS) {
    metaCache.delete(path);
    return null;
  }
  return entry.data;
}
function setCachedMeta(path, data) {
  metaCache.set(path, { ts: Date.now(), data });
  // Simple LRU: cap at 200 entries
  if (metaCache.size > 200) {
    const firstKey = metaCache.keys().next().value;
    metaCache.delete(firstKey);
  }
}

// Dynamic Open Graph & Meta Tag SSR handler for social media previews (WhatsApp, Instagram, Twitter, FB, etc.)
async function serveAppWithMeta(req, res) {
  if (req.path.startsWith('/assets/') || req.path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|json|woff2?|ttf|eot)$/)) {
    return res.status(404).send('Asset Not Found');
  }

  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  const indexPath = path.join(distDir, 'index.html');
  if (!fs.existsSync(indexPath)) {
    return res.status(404).send('App not built yet');
  }

  let html = fs.readFileSync(indexPath, 'utf8');

  const makeAbsoluteUrl = (u) => {
    if (!u) return 'https://decksalone.com/logo-web.png';
    if (u.startsWith('http://') || u.startsWith('https://')) return u;
    return `https://decksalone.com${u.startsWith('/') ? '' : '/'}${u}`;
  };

  // Default site metadata fallback
  let title = "Deck Salone — Sierra Leone's Official DJ Platform";
  let description = "Discover top DJs, listen to exclusive Sierra Leonean mixes, book DJs for events, and experience live DJ battles on Deck Salone.";
  let image = "https://decksalone.com/logo-web.png";
  let pageUrl = `https://decksalone.com${req.path}`;

  // Check cache first to avoid DB queries on every page load
  const cached = getCachedMeta(req.path);
  if (cached) {
    title = cached.title;
    description = cached.description;
    image = cached.image;
    pageUrl = cached.pageUrl;
  } else {
    try {
      // 1. Mix Detail Route: /mix/:id
      const mixMatch = req.path.match(/^\/mix\/([a-zA-Z0-9_-]+)/);
      if (mixMatch) {
        const mixId = mixMatch[1];
        const mix = await prisma.mix.findUnique({
          where: { id: mixId },
          include: { dj: true },
        });
        if (mix) {
          const djName = mix.dj?.stageName || 'DJ';
          title = `🎵 ${mix.title} by ${djName} — Deck Salone`;
          description = mix.description
            ? mix.description.slice(0, 160)
            : `Listen to "${mix.title}" by ${djName} (${mix.genre || 'Mix'}). ${mix.plays || 0} plays on Deck Salone.`;
          image = makeAbsoluteUrl(mix.coverImage || mix.dj?.avatar);
        }
      }

      // 2. DJ Profile Route: /dj/:identifier
      const djMatch = req.path.match(/^\/dj\/([a-zA-Z0-9_-]+)/);
      if (djMatch) {
        const identifier = djMatch[1];
        const dj = await prisma.djProfile.findFirst({
          where: {
            OR: [
              { id: identifier },
              { user: { username: { equals: identifier, mode: 'insensitive' } } },
            ],
          },
          include: { user: true },
        });
        if (dj) {
          title = `🎧 ${dj.stageName} — Official DJ Profile on Deck Salone`;
          description = dj.bio
            ? dj.bio.slice(0, 160)
            : `Book ${dj.stageName} for events, listen to mixes, and explore official DJ rankings on Deck Salone.`;
          image = makeAbsoluteUrl(dj.avatar || dj.coverBanner);
        }
      }

      // 3. User Profile Route: /user/:username
      const userMatch = req.path.match(/^\/user\/([a-zA-Z0-9_-]+)/);
      if (userMatch) {
        const username = userMatch[1].toLowerCase();
        const user = await prisma.user.findUnique({
          where: { username },
          include: { djProfile: true },
        });
        if (user) {
          const nameStr = user.djProfile?.stageName || user.name || user.username;
          title = `👤 ${nameStr} (@${user.username}) — Deck Salone`;
          description = user.bio
            ? user.bio.slice(0, 160)
            : `Check out ${nameStr}'s profile on Deck Salone, Sierra Leone's #1 DJ platform.`;
          image = makeAbsoluteUrl(user.avatar || user.djProfile?.avatar);
        }
      }

      // 4. Event Detail Route: /events/:id or /event/:id
      const eventMatch = req.path.match(/^\/(?:events|event)\/([a-zA-Z0-9_-]+)/);
      if (eventMatch) {
        const eventId = eventMatch[1];
        const event = await prisma.event.findUnique({
          where: { id: eventId },
          include: { dj: true },
        });
        if (event) {
          const djStr = event.dj ? ` by ${event.dj.stageName}` : '';
          title = `🎉 ${event.title}${djStr} — Event on Deck Salone`;
          description = event.description
            ? event.description.slice(0, 160)
            : `Get tickets and details for ${event.title} at ${event.venue || event.city || 'Sierra Leone'} on Deck Salone.`;
          image = makeAbsoluteUrl(event.coverImage || event.dj?.avatar);
        }
      }

      // 5. Hall of Fame Route: /hall-of-fame
      if (req.path.startsWith('/hall-of-fame')) {
        title = `👑 Hall of Fame — Deck Salone Legends`;
        description = `Celebrating Sierra Leone's most legendary DJs and iconic mixes of all time on Deck Salone.`;
        const legendDj = await prisma.djProfile.findFirst({
          where: { isPublic: true },
          orderBy: { rankingScore: 'desc' },
        });
        image = makeAbsoluteUrl(legendDj?.avatar || legendDj?.coverBanner);
      }

      // 6. Rankings Route: /rankings
      if (req.path.startsWith('/rankings')) {
        title = `🏆 Official DJ Rankings — Deck Salone`;
        description = `Top rated DJs in Sierra Leone based on weekly streams, gig bookings, community votes, and activity.`;
        const topDj = await prisma.djProfile.findFirst({
          where: { isPublic: true },
          orderBy: { rankingScore: 'desc' },
        });
        image = makeAbsoluteUrl(topDj?.avatar);
      }

      // Store result in cache for subsequent requests
      setCachedMeta(req.path, { title, description, image, pageUrl });
    } catch (err) {
      logger.error('Meta injection error:', { error: err.message, path: req.path });
    }
  }

  const escapeHtml = (str) =>
    str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const safeTitle = escapeHtml(title);
  const safeDesc = escapeHtml(description);
  const safeImage = escapeHtml(image);
  const safeUrl = escapeHtml(pageUrl);

  html = html
    .replace(/<title>.*?<\/title>/gi, `<title>${safeTitle}</title>`)
    .replace(/<meta name="description" content=".*?" \/>/gi, `<meta name="description" content="${safeDesc}" />`)
    .replace(/<meta property="og:title" content=".*?" \/>/gi, `<meta property="og:title" content="${safeTitle}" />`)
    .replace(/<meta property="og:description" content=".*?" \/>/gi, `<meta property="og:description" content="${safeDesc}" />`)
    .replace(/<meta property="og:image" content=".*?" \/>/gi, `<meta property="og:image" content="${safeImage}" />`)
    .replace(/<meta property="og:url" content=".*?" \/>/gi, `<meta property="og:url" content="${safeUrl}" />`)
    .replace(/<meta name="twitter:title" content=".*?" \/>/gi, `<meta name="twitter:title" content="${safeTitle}" />`)
    .replace(/<meta name="twitter:description" content=".*?" \/>/gi, `<meta name="twitter:description" content="${safeDesc}" />`)
    .replace(/<meta name="twitter:image" content=".*?" \/>/gi, `<meta name="twitter:image" content="${safeImage}" />`);

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
}

// SPA fallback for React Router — serve index.html with dynamic Open Graph tags for social sharing
app.use((req, res, next) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/og/')) {
    return next();
  }
  serveAppWithMeta(req, res);
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: `Route ${req.method} ${req.path} not found` });
});

const { logSystemError, checkAndSendDailyBugReport } = require('./utils/bugReport');

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Error:', { error: err.message, stack: err.stack, path: req.path });
  const status = err.status || 500;
  const message = status >= 500 ? 'Internal server error' : (err.message || 'Internal server error');

  // Log 500 server errors into SystemErrorLog
  if (status >= 500) {
    logSystemError({
      level: 'ERROR',
      source: 'API',
      message: err.message || 'Internal server error',
      stackTrace: err.stack,
      path: req.path,
      method: req.method,
      userId: req.user?.id || null,
      userEmail: req.user?.email || null,
      ipAddress: req.ip || req.socket?.remoteAddress || null,
    }).catch(() => {});
  }

  res.status(status).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// Graceful shutdown
async function shutdown() {
  logger.info('Shutting down gracefully...');
  await prisma.$disconnect();
  // Close the server if it's attached (handled outside this function usually)
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('SIGHUP', () => logger.info('SIGHUP ignored'));

const { checkAndSendTrialNotifications } = require('./utils/trial');
const { cleanupOldNotifications } = require('./utils/notifications');

if (require.main === module) {
  app.listen(PORT, () => {
    logger.info(`Deck Salone API running on port ${PORT}`);
    logger.info(`Health check: http://localhost:${PORT}/health`);

    // Run 14-day trial notifications check on startup and every 6 hours
    checkAndSendTrialNotifications();
    setInterval(checkAndSendTrialNotifications, 6 * 60 * 60 * 1000);

    // Run daily bug report check every 24 hours (and 30 seconds after startup)
    setTimeout(() => {
      checkAndSendDailyBugReport();
    }, 30 * 1000);
    setInterval(checkAndSendDailyBugReport, 24 * 60 * 60 * 1000);

    // Clean up read notifications older than 30 days every 24 hours (and on startup)
    cleanupOldNotifications(30).catch((err: any) => logger.error('[Server] Notification cleanup failed:', err));
    setInterval(() => {
      cleanupOldNotifications(30).catch((err: any) => logger.error('[Server] Notification cleanup failed:', err));
    }, 24 * 60 * 60 * 1000);
  });
}

module.exports = app;

