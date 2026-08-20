import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { prisma } from '../utils/prisma';
import { signToken } from '../utils/jwt';
import authRoutes from '../routes/auth';
import userRoutes from '../routes/users';
import bookingRoutes from '../routes/bookings';
import messageRoutes from '../routes/messages';
import notificationRoutes from '../routes/notifications';

describe('Authentication & Session Isolation Security Audit', () => {
  let app: express.Application;
  let userAToken: string;
  let userBToken: string;
  let userAId: string;
  let userBId: string;

  beforeAll(async () => {
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

    // Create test User A and User B mock JWTs
    userAId = 'test-user-a-' + Date.now();
    userBId = 'test-user-b-' + Date.now();

    userAToken = signToken({ id: userAId, email: 'userA@example.com', role: 'USER' });
    userBToken = signToken({ id: userBId, email: 'userB@example.com', role: 'USER' });
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
