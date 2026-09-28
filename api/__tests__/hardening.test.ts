/**
 * Regression tests for hardening/phase-2 items D1–D6 (audit 3b/3d brief):
 *
 * D1 (UPL-12) — MulterError / fileFilter-error mapping: LIMIT_FILE_SIZE → 413,
 *   other MulterError codes → 400, upload.ts fileFilter rejections → 400.
 * D2 (3b)    — redactUrlToken: token= JWTs never reach request/error logs.
 * D3 (3b)    — Cache-Control: no-store on gated uploads + client Referrer-Policy.
 * D4 (3b)    — GET /health/readiness: 200 only when DB AND Redis are healthy.
 * D5 (3b)    — scheduler logs via winston; stopScheduledJobs stops cron tasks
 *   (start → stop → start must not double-register jobs).
 * D6 (3d)    — uploadLimiter (30/10min per IP) wired before multer; audioLimiter
 *   (120/min per IP+mix) on GET /:id/audio and /:id/download-file.
 */
import request from 'supertest';
import express from 'express';
import fs from 'fs';
import path from 'path';

// Mutable Redis client handle for D4 (mocked module below reads it live).
let mockRedisClient: any = null;

jest.mock('../utils/redis', () => ({
  __esModule: true,
  get default() {
    return mockRedisClient;
  },
  get redisClient() {
    return mockRedisClient;
  },
  withCache: (_k: string, _t: number, fn: () => Promise<unknown>) => fn(),
  clearCache: jest.fn(),
  getCache: jest.fn(),
  setCache: jest.fn(),
}));

jest.mock('../utils/prisma', () => ({
  prisma: {
    $queryRaw: jest.fn(),
    user: { findUnique: jest.fn() },
    eventTicket: { findFirst: jest.fn() },
    djProfile: { findUnique: jest.fn() },
    djPhoto: { count: jest.fn(), create: jest.fn() },
  },
}));

jest.mock('../utils/jwt', () => ({
  verifyToken: jest.fn(),
  signToken: jest.fn(),
}));

// Keep the real redactUrlToken (D2) but route scheduler/server logs through a spy.
const mockLogger = { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() };
jest.mock('../utils/logger', () => ({
  ...(jest.requireActual('../utils/logger') as object),
  default: mockLogger,
  logger: mockLogger,
}));

jest.mock('../utils/rankingAlgorithm', () => ({
  recalculateAllRankingsV2: jest.fn(),
}));

jest.mock('../jobs/recalculateDiscoveryScores', () => ({
  recalculateAllDiscoveryScores: jest.fn(),
  recalculateStaleDiscoveryScores: jest.fn(),
}));

jest.mock('../utils/subscriptionExpiry', () => ({
  processSubscriptionExpirations: jest.fn(),
}));

jest.mock('node-cron', () => ({
  schedule: jest.fn(() => ({ stop: jest.fn() })),
}));

jest.mock('../middleware/auth', () => ({
  authMiddleware: (req: any, _res: any, next: any) => {
    req.user = { id: 'test-user-1', role: 'USER', status: 'ACTIVE' };
    next();
  },
  softAuthMiddleware: (req: any, _res: any, next: any) => next(),
}));

jest.mock('../utils/storage', () => ({
  uploadBuffer: jest.fn().mockResolvedValue('/uploads/photos/x.webp'),
  deleteFile: jest.fn(),
  keyFromUrl: jest.fn(),
  isSafeUploadUrl: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { prisma } = require('../utils/prisma');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { verifyToken } = require('../utils/jwt');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getUploadErrorResponse, gatedUploadsAuth } = require('../utils/upload');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { redactUrlToken } = require('../utils/logger');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { readinessHandler } = require('../utils/readiness');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const rateLimiter = require('../utils/rateLimiter');

// ---------------------------------------------------------------------------
// D1 — MulterError / fileFilter error mapping (UPL-12)
// ---------------------------------------------------------------------------
describe('D1: upload error mapping (UPL-12)', () => {
  const multer = require('multer');

  describe('getUploadErrorResponse helper', () => {
    it('maps LIMIT_FILE_SIZE to 413 with a safe message', () => {
      const err = new multer.MulterError('LIMIT_FILE_SIZE');
      expect(getUploadErrorResponse(err)).toEqual({
        status: 413,
        message: 'File too large. Please upload a smaller file.',
      });
    });

    it('maps other MulterError codes to 400', () => {
      const err = new multer.MulterError('LIMIT_UNEXPECTED_FILE');
      expect(getUploadErrorResponse(err)).toEqual({
        status: 400,
        message: err.message,
      });
    });

    it('maps upload.ts fileFilter rejections (statusCode 400 Error) to 400 with that message', () => {
      const err: any = new Error('Invalid image format. Allowed: jpeg, png, webp, gif');
      err.statusCode = 400;
      expect(getUploadErrorResponse(err)).toEqual({
        status: 400,
        message: 'Invalid image format. Allowed: jpeg, png, webp, gif',
      });
    });

    it('returns null for unrelated errors (existing handling unchanged)', () => {
      expect(getUploadErrorResponse(new Error('boom'))).toBeNull();
      expect(getUploadErrorResponse(null)).toBeNull();
      expect(getUploadErrorResponse({ status: 404, message: 'nope' })).toBeNull();
    });
  });

  describe('route-level: LIMIT_FILE_SIZE returns 413, not 500', () => {
    let app: express.Application;

    beforeAll(() => {
      const strictUpload = multer({
        storage: multer.memoryStorage(),
        limits: { fileSize: 16 }, // 16 bytes — any attachment trips LIMIT_FILE_SIZE
      });

      app = express();
      app.post('/upload', strictUpload.single('file'), (_req, res) => res.json({ ok: true }));
      // Same mapping the global error handler in server.ts uses.
      app.use((err: any, _req: any, res: any, _next: any) => {
        const mapped = getUploadErrorResponse(err);
        if (mapped) {
          return res.status(mapped.status).json({ success: false, error: mapped.message });
        }
        return res.status(500).json({ success: false, error: 'Internal server error' });
      });
    });

    it('413 for an over-limit upload', async () => {
      const res = await request(app)
        .post('/upload')
        .attach('file', Buffer.alloc(1024), 'big.mp3');
      expect(res.status).toBe(413);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/too large/i);
    });
  });
});

// ---------------------------------------------------------------------------
// D2 — token redaction in logs (3b)
// ---------------------------------------------------------------------------
describe('D2: redactUrlToken', () => {
  it('redacts ?token= value', () => {
    expect(redactUrlToken('/api/mixes/x/audio?token=abc')).toBe('/api/mixes/x/audio?token=[redacted]');
  });

  it('redacts &token= value and keeps surrounding params', () => {
    expect(redactUrlToken('/uploads/documents/a.pdf?foo=1&token=secret&bar=2')).toBe(
      '/uploads/documents/a.pdf?foo=1&token=[redacted]&bar=2'
    );
  });

  it('handles non-string input safely', () => {
    expect(redactUrlToken(undefined)).toBe('');
    expect(redactUrlToken(null)).toBe('');
  });

  it('leaves token-less URLs untouched', () => {
    expect(redactUrlToken('/api/mixes?search=afro')).toBe('/api/mixes?search=afro');
  });

  it('server.ts request log redacts originalUrl and error paths are redacted', () => {
    const serverSrc = fs.readFileSync(path.join(__dirname, '../server.ts'), 'utf8');
    expect(serverSrc).toMatch(/url: redactUrlToken\(req\.originalUrl\)/);
    expect(serverSrc).toMatch(/path: redactUrlToken\(req\.path\)/);
  });
});

// ---------------------------------------------------------------------------
// D3 — no-store on gated uploads + Referrer-Policy (3b)
// ---------------------------------------------------------------------------
describe('D3: gated uploads no-store + client Referrer-Policy', () => {
  let app: express.Application;
  const STAFF_USER = { id: 'staff-1', role: 'ADMIN', status: 'ACTIVE', tokenVersion: 0 };

  beforeAll(() => {
    verifyToken.mockReturnValue({ id: STAFF_USER.id, tokenVersion: 0 });
    prisma.user.findUnique.mockResolvedValue(STAFF_USER);

    app = express();
    app.use('/uploads', gatedUploadsAuth, (_req, res) => res.json({ served: true }));
  });

  it.each([
    ['/uploads/documents/kyc.pdf'],
    ['/uploads/subscription-proofs/proof.png'],
    ['/uploads/tickets/shot.webp'],
  ])('sets Cache-Control: no-store on gated prefix %s', async (url) => {
    const res = await request(app).get(url).set('Authorization', 'Bearer token');
    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toContain('no-store');
  });

  it('does not set no-store on public prefixes', async () => {
    const res = await request(app).get('/uploads/avatars/x.webp');
    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBeUndefined();
  });

  it('index.html carries <meta name="referrer" content="no-referrer">', () => {
    const html = fs.readFileSync(path.resolve(__dirname, '../../index.html'), 'utf8');
    expect(html).toMatch(/<meta\s+name="referrer"\s+content="no-referrer"\s*\/?>/);
  });
});

// ---------------------------------------------------------------------------
// D4 — readiness endpoint (3b)
// ---------------------------------------------------------------------------
describe('D4: GET /health/readiness handler', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.get('/health/readiness', readinessHandler);
  });

  beforeEach(() => {
    mockRedisClient = null;
    prisma.$queryRaw.mockReset();
  });

  it('200 { status: ready } when DB and Redis are healthy', async () => {
    prisma.$queryRaw.mockResolvedValue(1);
    mockRedisClient = { status: 'ready', ping: jest.fn().mockResolvedValue('PONG') };

    const res = await request(app).get('/health/readiness');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ready', db: true, redis: true });
  });

  it('503 with redis:false when Redis is down (ping rejects)', async () => {
    prisma.$queryRaw.mockResolvedValue(1);
    mockRedisClient = { status: 'ready', ping: jest.fn().mockRejectedValue(new Error('down')) };

    const res = await request(app).get('/health/readiness');
    expect(res.status).toBe(503);
    expect(res.body).toEqual({ status: 'not_ready', db: true, redis: false });
  });

  it('503 with redis:false when no Redis client exists, and db:false when DB fails', async () => {
    prisma.$queryRaw.mockResolvedValue(1);
    let res = await request(app).get('/health/readiness');
    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({ db: true, redis: false });

    prisma.$queryRaw.mockRejectedValue(new Error('db down'));
    mockRedisClient = { status: 'ready', ping: jest.fn().mockResolvedValue('PONG') };
    res = await request(app).get('/health/readiness');
    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({ db: false, redis: true });
  });

  it('is mounted unauthenticated in server.ts and /health is unchanged', () => {
    const serverSrc = fs.readFileSync(path.join(__dirname, '../server.ts'), 'utf8');
    expect(serverSrc).toMatch(/app\.get\('\/health\/readiness', require\('\.\/utils\/readiness'\)\.readinessHandler\)/);
    // Existing /health keeps its original DB-only shape (compose references it).
    expect(serverSrc).toMatch(/app\.get\('\/health', async \(req, res\) => \{/);
  });
});

// ---------------------------------------------------------------------------
// D5 — scheduler structured logging + stop guard (INFRA-18 / RANK-13)
// ---------------------------------------------------------------------------
describe('D5: scheduler stop guard + structured logging', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const cron = require('node-cron');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const scheduler = require('../jobs/scheduler');

  beforeEach(() => {
    // Fake timers keep the scheduler's 30s startup-backfill setTimeout from
    // firing while jest is still alive.
    jest.useFakeTimers();
    scheduler.stopScheduledJobs();
    cron.schedule.mockClear();
  });

  afterEach(() => {
    scheduler.stopScheduledJobs();
    jest.useRealTimers();
  });

  it('start → stop → start registers exactly one cron task per job per start (no double-fire)', () => {
    scheduler.startScheduledJobs();
    expect(cron.schedule).toHaveBeenCalledTimes(4);

    const firstHandles = cron.schedule.mock.results.map((r: any) => r.value);
    scheduler.stopScheduledJobs();
    firstHandles.forEach((h: any) => expect(h.stop).toHaveBeenCalledTimes(1));

    scheduler.startScheduledJobs();
    expect(cron.schedule).toHaveBeenCalledTimes(8); // 4 + 4, not 4 + 8

    // Each of the 4 schedules appears exactly twice total (once per start).
    const schedules = cron.schedule.mock.calls.map((c: any[]) => c[0]);
    for (const s of ['0 2 * * 0', '0 * * * *', '0 3 * * *', '30 3 * * *']) {
      expect(schedules.filter((x: string) => x === s)).toHaveLength(2);
    }

    scheduler.stopScheduledJobs();
    const secondHandles = cron.schedule.mock.results.slice(4).map((r: any) => r.value);
    secondHandles.forEach((h: any) => expect(h.stop).toHaveBeenCalledTimes(1));
  });

  it('double start without stop does not re-register jobs', () => {
    scheduler.startScheduledJobs();
    scheduler.startScheduledJobs();
    expect(cron.schedule).toHaveBeenCalledTimes(4);
  });

  it('logs through the winston logger, not console.*', () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    scheduler.startScheduledJobs();

    expect(mockLogger.info).toHaveBeenCalledWith('[Scheduler] Starting background cron jobs...');
    expect(logSpy).not.toHaveBeenCalled();
    expect(errSpy).not.toHaveBeenCalled();

    logSpy.mockRestore();
    errSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// D6 — uploadLimiter / audioLimiter (3d)
// ---------------------------------------------------------------------------
describe('D6: uploadLimiter + audioLimiter wiring', () => {
  it('exports both limiters', () => {
    expect(typeof rateLimiter.uploadLimiter).toBe('function');
    expect(typeof rateLimiter.audioLimiter).toBe('function');
  });

  it('mixes.ts: audioLimiter on /:id/audio and /:id/download-file; uploadLimiter before uploadMix', () => {
    const src = fs.readFileSync(path.join(__dirname, '../routes/mixes.ts'), 'utf8');
    expect(src).toMatch(/router\.get\('\/:id\/audio', softAuthMiddleware, audioLimiter,/);
    expect(src).toMatch(/router\.get\('\/:id\/download-file', softAuthMiddleware, audioLimiter,/);
    expect(src).toMatch(/router\.post\('\/', authMiddleware, requireTrialOrSubscription, uploadLimiter, uploadMix,/);
    expect(src).toMatch(/router\.put\('\/:id', authMiddleware, uploadLimiter, uploadMix,/);
  });

  it('users.ts / events.ts / photos.ts: uploadLimiter before multer', () => {
    const users = fs.readFileSync(path.join(__dirname, '../routes/users.ts'), 'utf8');
    expect(users).toMatch(/router\.put\('\/avatar', authMiddleware, uploadLimiter, uploadAvatar\.single\('avatar'\)/);
    const events = fs.readFileSync(path.join(__dirname, '../routes/events.ts'), 'utf8');
    expect(events).toMatch(/router\.post\('\/:id\/gallery', authMiddleware, uploadLimiter, uploadGallery\.array\('photos', 20\)/);
    const photos = fs.readFileSync(path.join(__dirname, '../routes/photos.ts'), 'utf8');
    expect(photos).toMatch(/router\.post\('\/', authMiddleware, uploadLimiter, uploadPhoto\.single\('photo'\)/);
  });

  describe('live: tripped uploadLimiter responds 429 without reaching the handler', () => {
    let app: express.Application;

    beforeAll(() => {
      prisma.djProfile.findUnique.mockResolvedValue({ id: 'dj-1' });
      prisma.djPhoto.count.mockResolvedValue(0);
      prisma.djPhoto.create.mockResolvedValue({ id: 'photo-1' });

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const photoRoutes = require('../routes/photos');
      app = express();
      app.use(express.json());
      app.use('/api/photos', photoRoutes);
    });

    it('429s the 31st upload in 10 minutes (30/10min per IP), before multer parsing', async () => {
      let last: any;
      for (let i = 0; i < 30; i++) {
        last = await request(app).post('/api/photos').send({ caption: 'x' });
        expect(last.status).toBe(400); // reaches handler (no file) — limiter lets it through
        expect(last.body.error).toBe('Photo file required');
      }
      last = await request(app).post('/api/photos').send({ caption: 'x' });
      expect(last.status).toBe(429); // limiter trips — never reaches the handler
      expect(last.body.error).toMatch(/too many uploads/i);
    }, 30000);
  });
});
