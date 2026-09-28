import request from 'supertest';
import express from 'express';

process.env.JWT_SECRET = 'test-secret-that-is-at-least-32-characters-long';

// In-memory redis stand-in so auth-cache behavior (including invalidation) is observable.
jest.mock('../utils/redis', () => {
  const store = new Map<string, any>();
  return {
    getCache: jest.fn((key: string) => Promise.resolve(store.has(key) ? store.get(key) : null)),
    setCache: jest.fn((key: string, value: any) => { store.set(key, value); return Promise.resolve(); }),
    clearCache: jest.fn((key: string) => { store.delete(key); return Promise.resolve(); }),
    withCache: jest.fn(async (_key: string, _ttl: number, fetcher: () => Promise<any>) => fetcher()),
  };
});

jest.mock('../utils/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  },
}));

// Keep the real lockout store/checks; stub only the bcrypt helpers so password
// flows can run without real hashes.
jest.mock('../utils/authSecurity', () => {
  const actual = jest.requireActual('../utils/authSecurity');
  return {
    ...actual,
    verifyAndMigratePassword: jest.fn(() => Promise.resolve(true)),
    hashPassword: jest.fn(() => Promise.resolve('hashed-new-password')),
  };
});

jest.mock('axios', () => ({
  post: jest.fn(),
}));

describe('Auth lifecycle hardening (AUTH-1 / AUTH-2 / AUTH-5)', () => {
  const { prisma } = require('../utils/prisma');
  const { clearCache } = require('../utils/redis');
  const { signToken } = require('../utils/jwt');
  const authRoutes = require('../routes/auth');
  const { authMiddleware } = require('../middleware/auth');
  const { verifyTurnstile } = require('../middleware/turnstile');
  const {
    checkAccountLockout,
    recordFailedAttempt,
    recordSuccessfulLogin,
  } = require('../utils/authSecurity');

  let app: express.Application;
  let userSeq = 0;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/auth', authRoutes);
    app.get('/api/protected', authMiddleware, (req: any, res: any) =>
      res.json({ success: true, userId: req.user.id }));
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Register a fresh mocked user (unique per test so the shared auth cache never leaks).
  // tokenVersion: number pins the DB value; undefined omits the field entirely (legacy row shape).
  function mockUser(tokenVersion: number | undefined) {
    userSeq += 1;
    const id = `lifecycle-user-${userSeq}`;
    const email = `lifecycle-${userSeq}@example.com`;
    prisma.user.findUnique.mockImplementation(({ select }: { select?: Record<string, boolean> }) => {
      if (select && select.password) {
        return Promise.resolve({ id, password: 'hashed-old-password' });
      }
      const user: Record<string, any> = { id, email, role: 'USER', status: 'ACTIVE' };
      if (tokenVersion !== undefined) user.tokenVersion = tokenVersion;
      return Promise.resolve(user);
    });
    return { id, email };
  }

  describe('AUTH-1: tokenVersion revocation in authMiddleware', () => {
    it('rejects a token whose tokenVersion is stale', async () => {
      const { id, email } = mockUser(1); // bumped after a password change
      const staleToken = signToken({ id, email, role: 'USER', tokenVersion: 0 });
      const res = await request(app)
        .get('/api/protected')
        .set('Authorization', `Bearer ${staleToken}`);
      expect(res.status).toBe(401);
    });

    it('accepts a token whose tokenVersion matches the user', async () => {
      const { id, email } = mockUser(1);
      const token = signToken({ id, email, role: 'USER', tokenVersion: 1 });
      const res = await request(app)
        .get('/api/protected')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.userId).toBe(id);
    });

    it('treats a legacy token without tokenVersion as version 0', async () => {
      const { id, email } = mockUser(0);
      const legacyToken = signToken({ id, email, role: 'USER' });
      const res = await request(app)
        .get('/api/protected')
        .set('Authorization', `Bearer ${legacyToken}`);
      expect(res.status).toBe(200);
    });

    it('rejects a legacy token (no tokenVersion) once the user version has moved past 0', async () => {
      const { id, email } = mockUser(1);
      const legacyToken = signToken({ id, email, role: 'USER' });
      const res = await request(app)
        .get('/api/protected')
        .set('Authorization', `Bearer ${legacyToken}`);
      expect(res.status).toBe(401);
    });
  });

  describe('AUTH-1: change-password bumps tokenVersion and invalidates the auth cache', () => {
    it('increments tokenVersion and clears the cached auth session', async () => {
      const { id, email } = mockUser(0);
      const token = signToken({ id, email, role: 'USER', tokenVersion: 0 });

      const res = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: 'whatever', newPassword: 'NewPass123' });

      expect(res.status).toBe(200);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id },
        data: {
          password: 'hashed-new-password',
          tokenVersion: { increment: 1 },
        },
      });
      expect(clearCache).toHaveBeenCalledWith(`auth_user:${id}`);
    });
  });

  describe('AUTH-2: lockout is per email:ip only', () => {
    const email = `lockout-${Date.now()}@example.com`;
    const ipA = '10.1.1.1';
    const ipB = '10.2.2.2';

    beforeEach(() => {
      // Ensure clean state even if another test used the same email/IP pair.
      recordSuccessfulLogin(email, ipA);
      recordSuccessfulLogin(email, ipB);
    });

    it('locks the email:ip pair after 5 failures', async () => {
      for (let i = 0; i < 5; i++) {
        await recordFailedAttempt(email, ipA);
      }
      expect(checkAccountLockout(email, ipA).isLocked).toBe(true);
    });

    it('failed attempts from another IP do not affect the locked pair and create no email-wide lockout', async () => {
      for (let i = 0; i < 5; i++) {
        await recordFailedAttempt(email, ipA);
      }
      await recordFailedAttempt(email, ipB);

      // IP-A stays locked.
      expect(checkAccountLockout(email, ipA).isLocked).toBe(true);

      // No bare-email record: a fresh IP is neither locked nor progressively delayed.
      const fresh = checkAccountLockout(email, '10.9.9.9');
      expect(fresh.isLocked).toBe(false);
      expect(fresh.delayMs).toBe(0);

      // IP-B has its own count of 1 → no progressive delay yet.
      expect(checkAccountLockout(email, ipB).delayMs).toBe(0);
    });
  });

  describe('AUTH-5: turnstile fail-closed configuration', () => {
    const axios = require('axios');
    const ORIGINAL_ENV = process.env.NODE_ENV;
    const TEST_KEY = '1x0000000000000000000000000000000AA';

    function mockRes() {
      const res: any = {};
      res.status = jest.fn(() => res);
      res.json = jest.fn(() => res);
      return res;
    }

    afterEach(() => {
      process.env.NODE_ENV = ORIGINAL_ENV;
      delete process.env.TURNSTILE_SECRET_KEY;
    });

    it('fails closed in production when the secret key is missing', async () => {
      process.env.NODE_ENV = 'production';
      delete process.env.TURNSTILE_SECRET_KEY;
      const next = jest.fn();
      const res = mockRes();
      await verifyTurnstile({ body: {}, headers: {} }, res, next);
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('fails closed in production when the public test key is configured', async () => {
      process.env.NODE_ENV = 'production';
      process.env.TURNSTILE_SECRET_KEY = TEST_KEY;
      const next = jest.fn();
      const res = mockRes();
      await verifyTurnstile({ body: {}, headers: {} }, res, next);
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('passes through with the test key outside production', async () => {
      process.env.NODE_ENV = 'test';
      process.env.TURNSTILE_SECRET_KEY = TEST_KEY;
      const next = jest.fn();
      await verifyTurnstile({ body: {}, headers: {} }, mockRes(), next);
      expect(next).toHaveBeenCalled();
    });

    it('AUTH-5 residual: fails closed when NODE_ENV is unset and no secret is configured', async () => {
      delete process.env.NODE_ENV;
      delete process.env.TURNSTILE_SECRET_KEY;
      const next = jest.fn();
      const res = mockRes();
      await verifyTurnstile({ body: {}, headers: {} }, res, next);
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('sends the rightmost (trusted) XFF entry as remoteip', async () => {
      process.env.NODE_ENV = 'production';
      process.env.TURNSTILE_SECRET_KEY = 'real-production-secret-key';
      axios.post.mockResolvedValue({ data: { success: true } });

      const next = jest.fn();
      await verifyTurnstile(
        { body: { turnstileToken: 'tok' }, headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' } },
        mockRes(),
        next,
      );

      expect(next).toHaveBeenCalled();
      const [, body] = axios.post.mock.calls[0];
      const formData = new URLSearchParams(body);
      expect(formData.get('remoteip')).toBe('5.6.7.8');
    });
  });
});
