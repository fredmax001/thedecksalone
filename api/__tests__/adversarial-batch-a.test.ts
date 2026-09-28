/**
 * Adversarial review batch A regression tests.
 *
 * 1. UPL-1/UPL-2 gate bypass via encoding/normalization mismatch in the
 *    /uploads static gate (gatedUploadsAuth).
 * 2. ADM-2: ADMIN self-grants SUPER_ADMIN via PUT /api/admin/users/:id/role.
 * 3. UPL-9: listener JWT exfiltration via host-blind withAuthToken predicate
 *    (shouldAttachToken must be same-origin only).
 * 4. INFRA-16: play dedup + login lockout keyed on spoofable req.ip
 *    (leftmost XFF); both must use getClientIp (rightmost-trusted XFF).
 * 5. PAY-5: booking deposit/full-payment double-pay TOCTOU.
 * 6. UPL-1: smart playlists leak raw /uploads/mixes/... audioUrl.
 * 7. PAY-2 residual: capture 422 self-heal when PayPal already captured.
 */
import request from 'supertest';
import express from 'express';
import fs from 'fs';
import os from 'os';
import path from 'path';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-that-is-at-least-32-characters-long';
process.env.PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || 'test-paypal-client';
process.env.PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || 'test-paypal-secret';

const uploadsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'adv-batch-a-'));
process.env.UPLOADS_DIR = uploadsDir;

// Test-double auth: `Authorization: Bearer <userId>` resolves the user.
const mockUsers: Record<string, any> = {
  'admin-1': { id: 'admin-1', email: 'admin@example.com', role: 'ADMIN', status: 'ACTIVE' },
  'super-1': { id: 'super-1', email: 'super@example.com', role: 'SUPER_ADMIN', status: 'ACTIVE' },
  'user-1': { id: 'user-1', email: 'dj@example.com', role: 'DJ', status: 'ACTIVE' },
};

jest.mock('../middleware/auth', () => ({
  authMiddleware: (req: any, res: any, next: any) => {
    const token = String(req.headers.authorization || '').replace('Bearer ', '');
    const user = token ? mockUsers[token] : null;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });
    req.user = user;
    next();
  },
  softAuthMiddleware: (req: any, _res: any, next: any) => next(),
  requireRole: () => (req: any, res: any, next: any) => next(),
  invalidateUserAuthCache: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../middleware/permissions', () => ({
  activateSubscriptionFeatures: jest.fn().mockResolvedValue(undefined),
  resetSubscriptionFeatures: jest.fn().mockResolvedValue(undefined),
  requirePro: () => (req: any, res: any, next: any) => next(),
}));

jest.mock('axios', () => ({
  post: jest.fn(),
  get: jest.fn(),
}));

jest.mock('../utils/rateLimiter', () => {
  const actual = jest.requireActual('../utils/rateLimiter') as object;
  const passthrough = (req: any, res: any, next: any) => next();
  return {
    ...actual,
    playLimiter: passthrough,
    conditionalSearchLimiter: passthrough,
    purchaseLimiter: passthrough,
  };
});

const hashIp = jest.fn((ip: string) => `hashed:${ip}`);
const wasPlayRecentlyRecorded = jest.fn().mockResolvedValue(true);
jest.mock('../utils/monthlyListeners', () => ({
  hashIp: (ip: string) => hashIp(ip),
  wasPlayRecentlyRecorded: (...args: any[]) => wasPlayRecentlyRecorded(...args),
  recordMixPlay: jest.fn().mockResolvedValue(undefined),
  recalculateMonthlyListeners: jest.fn().mockResolvedValue(undefined),
}));

// INFRA-16: observe the lockout primitives. Stubbed wholesale (no
// requireActual) because the real module starts an unref-less setInterval
// that keeps Jest from exiting.
const mockCheckAccountLockout = jest.fn((..._args: any[]) => ({ isLocked: false, delayMs: 0 }));
const mockRecordFailedAttempt = jest.fn((..._args: any[]) => Promise.resolve(undefined));
const mockRecordSuccessfulLogin = jest.fn((..._args: any[]) => undefined);
jest.mock('../utils/authSecurity', () => ({
  sanitizeString: (s: any) => s,
  sanitizeAuthPayload: (o: any) => o,
  checkAccountLockout: (...args: any[]) => mockCheckAccountLockout(...args),
  recordFailedAttempt: (...args: any[]) => mockRecordFailedAttempt(...args),
  recordSuccessfulLogin: (...args: any[]) => mockRecordSuccessfulLogin(...args),
  verifyAndMigratePassword: jest.fn(() => Promise.resolve(true)),
  hashPassword: jest.fn(() => Promise.resolve('hashed')),
  BCRYPT_SALT_ROUNDS: 10,
}));

const passthrough = (req: any, res: any, next: any) => next();
jest.mock('../utils/upload', () => ({
  uploadMix: passthrough,
  uploadMixAudio: { single: () => passthrough },
  uploadMixCover: { single: () => passthrough },
  uploadAdminMedia: { single: () => passthrough },
  uploadDocument: { single: () => passthrough },
  extFromMime: jest.fn(),
}));

jest.mock('../utils/storage', () => ({
  uploadBuffer: jest.fn(),
  deleteFile: jest.fn(),
}));

jest.mock('../utils/imageProcessor', () => ({
  processMixCover: jest.fn(),
}));

jest.mock('../utils/audioResolver', () => ({
  resolveAudioUrl: jest.fn(),
  resolveHearthisSet: jest.fn(),
}));

jest.mock('../utils/trial', () => ({
  requireTrialOrSubscription: (req: any, res: any, next: any) => next(),
  calculateTrialStatus: jest.fn(() => ({ hasFeatureAccess: true })),
}));

jest.mock('../utils/notifications', () => ({
  createNotification: jest.fn().mockResolvedValue(undefined),
  createNotificationForDj: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../utils/subscriptionConfig', () => ({
  getSubscriptionConfig: jest.fn().mockResolvedValue({
    proPrice: 200,
    legendPrice: 350,
    proPriceAnnual: 2000,
    legendPriceAnnual: 4000,
  }),
}));

jest.mock('../utils/email', () => ({
  sendTicketApprovalEmail: jest.fn().mockResolvedValue(undefined),
  sendEmail: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../utils/ticketQr', () => ({
  buildLegacyTicketQr: jest.fn(() => 'qr'),
  generateTicketNumber: jest.fn(() => 'TICKET-1'),
}));

jest.mock('../utils/redis', () => ({
  getCache: jest.fn(),
  setCache: jest.fn(),
  clearCache: jest.fn(),
  withCache: jest.fn((_key: string, _ttl: number, fn: () => Promise<unknown>) => fn()),
}));

jest.mock('../utils/cache', () => ({
  withCache: jest.fn((_key: string, _ttl: number, fn: () => Promise<unknown>) => fn()),
  clearCache: jest.fn(),
}));

const generateSmartPlaylistItems = jest.fn();
const ensureDefaultSmartPlaylists = jest.fn().mockResolvedValue(undefined);
jest.mock('../services/smartPlaylist.service', () => ({
  generateSmartPlaylistItems: (...args: any[]) => generateSmartPlaylistItems(...args),
  ensureDefaultSmartPlaylists: (...args: any[]) => ensureDefaultSmartPlaylists(...args),
}));

jest.mock('../utils/prisma', () => ({
  prisma: {
    user: { findUnique: jest.fn(), findMany: jest.fn(), count: jest.fn(), update: jest.fn() },
    djProfile: { findFirst: jest.fn(), findUnique: jest.fn() },
    mix: { findUnique: jest.fn(), findMany: jest.fn(), findFirst: jest.fn(), count: jest.fn() },
    eventTicket: { findFirst: jest.fn() },
    payment: { aggregate: jest.fn(), findFirst: jest.fn(), create: jest.fn() },
    payPalPayment: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      aggregate: jest.fn(),
    },
    booking: { findUnique: jest.fn(), update: jest.fn(), aggregate: jest.fn() },
    notification: { create: jest.fn().mockResolvedValue(undefined) },
    smartPlaylist: { findMany: jest.fn(), findFirst: jest.fn() },
    auditLog: { create: jest.fn().mockResolvedValue(undefined) },
  },
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prismaMock = () => require('../utils/prisma').prisma as any;
const auth = (id: string) => ({ Authorization: `Bearer ${id}` });

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { signToken } = require('../utils/jwt');

describe('1. gatedUploadsAuth: encoding/normalization bypass closed (UPL-1/UPL-2)', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let gatedUploadsAuth: any;

  const runGate = async (reqPath: string, opts?: { token?: string }) => {
    const req: any = {
      path: reqPath,
      headers: opts?.token ? { authorization: `Bearer ${opts.token}` } : {},
      query: {},
    };
    const res: any = {
      statusCode: 0,
      status(code: number) { this.statusCode = code; return this; },
      json() { return this; },
      end() { return this; },
      setHeader() { return this; },
    };
    let nextCalled = false;
    await gatedUploadsAuth(req, res, () => { nextCalled = true; });
    return { statusCode: res.statusCode, nextCalled };
  };

  beforeAll(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    gatedUploadsAuth = jest.requireActual('../utils/upload').gatedUploadsAuth;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET /uploads/./mixes/<file> is rejected 404 WITHOUT any user lookup', async () => {
    const { statusCode, nextCalled } = await runGate('/./mixes/a1.mp3');
    expect(statusCode).toBe(404);
    expect(nextCalled).toBe(false);
    expect(prismaMock().user.findUnique).not.toHaveBeenCalled();
  });

  it('GET /uploads/mixes%2f..%2fdocuments/<file> is rejected 400 WITHOUT any user lookup', async () => {
    const { statusCode, nextCalled } = await runGate('/mixes%2f..%2fdocuments/id.pdf');
    expect(statusCode).toBe(400);
    expect(nextCalled).toBe(false);
    expect(prismaMock().user.findUnique).not.toHaveBeenCalled();
  });

  it('GET /uploads/avatars%2f..%2ftickets/<file> is rejected 400 WITHOUT any user lookup', async () => {
    const { statusCode, nextCalled } = await runGate('/avatars%2f..%2ftickets/x.png');
    expect(statusCode).toBe(400);
    expect(nextCalled).toBe(false);
    expect(prismaMock().user.findUnique).not.toHaveBeenCalled();
  });

  it('a normal public path /avatars/x.webp still passes', async () => {
    const { statusCode, nextCalled } = await runGate('/avatars/x.webp');
    expect(statusCode).toBe(0);
    expect(nextCalled).toBe(true);
  });

  it('an admin ?token=/header token on /documents/x.pdf still reaches the JWT check', async () => {
    prismaMock().user.findUnique.mockResolvedValue({ id: 'admin-1', role: 'SUPER_ADMIN', status: 'ACTIVE' });
    const token = signToken({ id: 'admin-1', role: 'SUPER_ADMIN' });
    const { statusCode, nextCalled } = await runGate('/documents/x.pdf', { token });
    expect(nextCalled).toBe(true);
    expect(prismaMock().user.findUnique).toHaveBeenCalled();
  });
});

describe('2. ADM-2: ADMIN cannot self-grant SUPER_ADMIN', () => {
  let app: express.Application;

  beforeAll(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const adminRoutes = require('../routes/admin');
    app = express();
    app.use(express.json());
    app.use('/api/admin', mockAuthMiddleware, adminRoutes);
  });

  function mockAuthMiddleware(req: any, res: any, next: any) {
    const token = String(req.headers.authorization || '').replace('Bearer ', '');
    const user = token ? mockUsers[token] : null;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });
    req.user = user;
    next();
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('ADMIN setting their own role to SUPER_ADMIN → 403, no update', async () => {
    prismaMock().user.findUnique.mockResolvedValue({
      id: 'admin-1', email: 'admin@example.com', username: 'admin', name: null, role: 'ADMIN',
    });

    const res = await request(app)
      .put('/api/admin/users/admin-1/role')
      .set(auth('admin-1'))
      .send({ role: 'SUPER_ADMIN' });

    expect(res.status).toBe(403);
    expect(prismaMock().user.update).not.toHaveBeenCalled();
  });

  it('SUPER_ADMIN granting SUPER_ADMIN to another user → 200', async () => {
    const target = {
      id: 'user-1', email: 'dj@example.com', username: 'dj', name: null,
      role: 'USER', status: 'ACTIVE', createdAt: new Date(), djProfile: null,
    };
    prismaMock().user.findUnique.mockResolvedValue(target);
    prismaMock().user.update.mockResolvedValue(target);

    const res = await request(app)
      .put('/api/admin/users/user-1/role')
      .set(auth('super-1'))
      .send({ role: 'SUPER_ADMIN' });

    expect(res.status).toBe(200);
    expect(prismaMock().user.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'user-1' }, data: { role: 'SUPER_ADMIN' } })
    );
  });
});

describe('3. UPL-9: shouldAttachToken is same-origin only', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { shouldAttachToken } = require('../../src/lib/shouldAttachToken');
  const origin = 'https://decksalone.com';

  it('external https://evil.example/api/mixes/x.mp3 → false (no JWT leak)', () => {
    expect(shouldAttachToken('https://evil.example/api/mixes/x.mp3', origin)).toBe(false);
  });

  it('relative /api/mixes/1/audio → true', () => {
    expect(shouldAttachToken('/api/mixes/1/audio', origin)).toBe(true);
  });

  it('same-origin https://decksalone.com/uploads/x → true', () => {
    expect(shouldAttachToken('https://decksalone.com/uploads/x', origin)).toBe(true);
  });

  it('data:/blob: URLs → false', () => {
    expect(shouldAttachToken('data:audio/mp3;base64,AAA', origin)).toBe(false);
    expect(shouldAttachToken('blob:https://decksalone.com/xyz', origin)).toBe(false);
  });
});

describe('4. INFRA-16: play dedup keys on getClientIp (rightmost trusted XFF)', () => {
  let app: express.Application;

  beforeAll(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mixRoutes = require('../routes/mixes');
    app = express();
    app.use(express.json());
    app.use('/api/mixes', mixRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    wasPlayRecentlyRecorded.mockResolvedValue(true);
    prismaMock().mix.findUnique.mockResolvedValue({ id: 'mix-1', djId: 'dj-1', plays: 10 });
  });

  it('anonymous play dedup identity uses the rightmost XFF entry, not the spoofable leftmost', async () => {
    const res = await request(app)
      .post('/api/mixes/mix-1/play')
      .set('X-Forwarded-For', '1.1.1.1, 2.2.2.2');

    expect(res.status).toBe(200);
    // Leftmost (1.1.1.1) is the client-spoofed entry; dedup must key on 2.2.2.2.
    expect(hashIp).toHaveBeenCalledWith('2.2.2.2');
    expect(wasPlayRecentlyRecorded).toHaveBeenCalledWith('playdedup:mix-1:hashed:2.2.2.2');
  });
});

describe('4b. INFRA-16: login lockout keys on getClientIp (rightmost trusted XFF)', () => {
  let app: express.Application;

  beforeAll(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const authRoutes = require('../routes/auth');
    app = express();
    app.use(express.json());
    app.use('/api/auth', authRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckAccountLockout.mockReturnValue({ isLocked: false, delayMs: 0 });
    prismaMock().user.findUnique.mockResolvedValue(null); // unknown user -> 401 path
  });

  it('failed login records the lockout against the rightmost XFF entry, not the spoofable leftmost', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('X-Forwarded-For', '9.9.9.9, 8.8.8.8')
      .send({ email: 'nobody@example.com', password: 'Whatever1x' });

    expect(res.status).toBe(401);
    expect(mockRecordFailedAttempt).toHaveBeenCalledWith('nobody@example.com', '8.8.8.8');
    expect(mockRecordFailedAttempt).not.toHaveBeenCalledWith('nobody@example.com', '9.9.9.9');
  });
});

describe('5. PAY-5: booking deposit double-pay TOCTOU', () => {
  let app: express.Application;

  beforeAll(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const paypalRoutes = require('../routes/paypal');
    app = express();
    app.use(express.json());
    app.use('/api/payments/paypal', paypalRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('second booking-order for a deposit with a PENDING payment → 409, no PayPal order created', async () => {
    const p = prismaMock();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const axios = require('axios');
    p.booking.findUnique.mockResolvedValue({
      id: 'booking-1',
      clientId: 'user-1',
      djId: 'dj-1',
      status: 'CONFIRMED',
      deposit: 500,
      finalPrice: 1000,
      eventType: 'Wedding',
    });
    p.payment.aggregate.mockResolvedValue({ _sum: { amount: 0 } });
    // A deposit payment is already in flight.
    p.payment.findFirst.mockResolvedValue({ id: 'pay-1', type: 'DEPOSIT', status: 'PENDING' });

    const res = await request(app)
      .post('/api/payments/paypal/booking-order')
      .set(auth('user-1'))
      .send({ bookingId: 'booking-1', type: 'DEPOSIT' });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/in progress/);
    expect(axios.post).not.toHaveBeenCalled();
  });
});

describe('6. UPL-1: smart playlists rewrite item mix audioUrl', () => {
  let app: express.Application;

  const playlist = { id: 'sp-1', slug: 'hot-now', badge: null, trackLimit: 30, isPublished: true };
  const rawMix = {
    id: 'mix-1',
    title: 'Hot Mix',
    audioUrl: '/uploads/mixes/mix-1.mp3',
  };

  beforeAll(() => {
    generateSmartPlaylistItems.mockResolvedValue({
      items: [rawMix],
      total: 1,
      topDj: null,
      topMix: null,
      topDjAvatar: null,
      topDjName: null,
      dynamicCover: null,
      badge: null,
      accentColor: null,
    });
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const smartPlaylistRoutes = require('../routes/smartPlaylists');
    app = express();
    app.use('/api/smart-playlists', smartPlaylistRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET /api/smart-playlists rewrites item mix audioUrl to /api/mixes/<id>/audio', async () => {
    prismaMock().smartPlaylist.findMany.mockResolvedValue([playlist]);

    const res = await request(app).get('/api/smart-playlists');
    expect(res.status).toBe(200);
    expect(res.body.data[0].items[0].mix.audioUrl).toBe('/api/mixes/mix-1/audio');
    expect(JSON.stringify(res.body)).not.toContain('/uploads/');
  });

  it('GET /api/smart-playlists/:slug rewrites item mix audioUrl to /api/mixes/<id>/audio', async () => {
    prismaMock().smartPlaylist.findFirst.mockResolvedValue(playlist);

    const res = await request(app).get('/api/smart-playlists/hot-now');
    expect(res.status).toBe(200);
    expect(res.body.data.items[0].mix.audioUrl).toBe('/api/mixes/mix-1/audio');
    expect(JSON.stringify(res.body)).not.toContain('/uploads/');
  });
});

describe('7. PAY-2 residual: capture 422 self-heals when PayPal already captured', () => {
  let app: express.Application;

  beforeAll(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const paypalRoutes = require('../routes/paypal');
    app = express();
    app.use(express.json());
    app.use('/api/payments/paypal', paypalRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('422 + PayPal order COMPLETED → row set CAPTURED and grant path runs (payment + booking updated)', async () => {
    const p = prismaMock();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const axios = require('axios');

    p.payPalPayment.findUnique.mockResolvedValue({
      id: 'pp-book-1',
      userId: 'user-1',
      orderId: 'ORDER-BOOK-1',
      purpose: 'BOOKING',
      plan: 'DEPOSIT',
      status: 'CREATED',
      amountSle: 500,
      amountUsd: 45,
      rate: 0.09,
      refId: 'booking-1',
      meta: { type: 'DEPOSIT' },
    });
    p.payPalPayment.updateMany.mockResolvedValue({ count: 1 });
    p.payPalPayment.update.mockResolvedValue({});
    p.booking.findUnique.mockResolvedValue({
      id: 'booking-1',
      clientId: 'user-1',
      djId: 'dj-1',
      status: 'CONFIRMED',
      deposit: 500,
      finalPrice: 1000,
      eventType: 'Wedding',
      dj: { userId: 'dj-user-1' },
    });
    p.payment.findFirst.mockResolvedValue(null); // no duplicate payment
    p.payment.create.mockResolvedValue({ id: 'pay-1' });
    p.booking.update.mockResolvedValue({});

    // First axios.post = OAuth token; second = capture → 422 (already captured).
    axios.post
      .mockResolvedValueOnce({ data: { access_token: 'token', expires_in: 32400 } })
      .mockRejectedValueOnce({
        response: { status: 422, data: { message: 'ORDER_ALREADY_CAPTURED' } },
        message: 'Request failed with status code 422',
      });
    // Verification: PayPal reports the order COMPLETED.
    axios.get.mockResolvedValue({
      data: {
        status: 'COMPLETED',
        payer: { payer_id: 'PAYER-1' },
        purchase_units: [{ custom_id: 'deck:user-1:BOOKING:pp-book-1' }],
      },
    });

    const res = await request(app)
      .post('/api/payments/paypal/capture-booking')
      .set(auth('user-1'))
      .send({ orderId: 'ORDER-BOOK-1' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('CAPTURED');
    // Self-heal: row promoted to CAPTURED, then the normal grant path ran.
    expect(p.payPalPayment.updateMany).toHaveBeenCalledWith({
      where: { orderId: 'ORDER-BOOK-1', status: { not: 'CAPTURED' } },
      data: expect.objectContaining({ status: 'CAPTURED' }),
    });
    expect(p.payment.create).toHaveBeenCalled();
    expect(p.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'booking-1' }, data: { status: 'DEPOSIT_PAID', deposit: 500 } })
    );
  });
});
