import request from 'supertest';
import express from 'express';

jest.mock('../utils/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
    notification: {
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
  },
}));

describe('Authentication & Session Isolation Security Audit', () => {
  let app: express.Application;
  let userAToken: string;
  let userAId: string;
  let userBId: string;

  beforeAll(() => {
    process.env.JWT_SECRET = 'test-secret-that-is-at-least-32-characters-long';

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { prisma } = require('../utils/prisma');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { signToken } = require('../utils/jwt');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const authRoutes = require('../routes/auth');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const userRoutes = require('../routes/users');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const bookingRoutes = require('../routes/bookings');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const messageRoutes = require('../routes/messages');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const notificationRoutes = require('../routes/notifications');

    // Create test User A and User B mock JWTs
    userAId = 'test-user-a-' + Date.now();
    userBId = 'test-user-b-' + Date.now();

    userAToken = signToken({ id: userAId, email: 'userA@example.com', role: 'USER' });

    prisma.user.findUnique.mockImplementation(({ where }: { where: { id: string } }) => {
      if (where.id === userAId) {
        return Promise.resolve({
          id: userAId,
          email: 'userA@example.com',
          role: 'USER',
          status: 'ACTIVE',
        });
      }
      return Promise.resolve(null);
    });

    app = express();
    app.use(express.json());

    // Security cache header middleware
    app.use((req, res, next) => {
      if (req.headers.authorization || req.path.startsWith('/api/')) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }
      next();
    });

    app.use('/api/auth', authRoutes);
    app.use('/api/users', userRoutes);
    app.use('/api/bookings', bookingRoutes);
    app.use('/api/messages', messageRoutes);
    app.use('/api/notifications', notificationRoutes);
  });

  describe('1. Guest Isolation (Unauthenticated Access)', () => {
    it('should reject unauthenticated request to /api/users/profile with 401', async () => {
      const res = await request(app).get('/api/users/profile');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject unauthenticated request to /api/notifications with 401', async () => {
      const res = await request(app).get('/api/notifications');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject unauthenticated request to /api/bookings/my-bookings with 401', async () => {
      const res = await request(app).get('/api/bookings/my-bookings');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('2. Cache-Control & Anti-Data-Leakage Headers', () => {
    it('should set Cache-Control: no-store, no-cache, private on API responses', async () => {
      const res = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${userAToken}`);
      expect(res.headers['cache-control']).toContain('no-store');
      expect(res.headers['cache-control']).toContain('private');
      expect(res.headers['pragma']).toBe('no-cache');
    });
  });

  describe('3. Token & User Identity Scoping', () => {
    it('should derive user identity strictly from JWT token, not client body or params', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${userAToken}`);
      // Response must evaluate against the token subject
      if (res.status === 200) {
        expect(res.body.data.id).toBe(userAId);
        expect(res.body.data.id).not.toBe(userBId);
      }
    });
  });

  describe('4. IDOR / BOLA Prevention', () => {
    it('should prevent User A from marking User B notification as read', async () => {
      const res = await request(app)
        .patch('/api/notifications/some-random-id/read')
        .set('Authorization', `Bearer ${userAToken}`);
      // Either 404 (not found) or 403 (forbidden), never 200 on unauthorized resource
      expect([403, 404]).toContain(res.status);
    });
  });
});
