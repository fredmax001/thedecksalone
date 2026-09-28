import request from 'supertest';
import express from 'express';

jest.mock('../utils/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    djProfile: {
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    payment: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    booking: {
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    message: {
      findMany: jest.fn(),
    },
    adCampaign: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock('../utils/redis', () => ({
  getCache: jest.fn(),
  setCache: jest.fn(),
  clearCache: jest.fn(),
}));

describe('Admin authorization hardening (ADM-1, ADM-2, ADM-3, MOD-1, AUTH-7)', () => {
  let app: express.Application;

  const users: Record<string, any> = {
    'super-admin': { id: 'super-admin', email: 'super@example.com', role: 'SUPER_ADMIN', status: 'ACTIVE' },
    'plain-admin': { id: 'plain-admin', email: 'admin@example.com', role: 'ADMIN', status: 'ACTIVE' },
    'plain-admin-2': { id: 'plain-admin-2', email: 'admin2@example.com', role: 'ADMIN', status: 'ACTIVE' },
    'finance-admin': { id: 'finance-admin', email: 'finance@example.com', role: 'FINANCE_ADMIN', status: 'ACTIVE' },
    'verification-admin': { id: 'verification-admin', email: 'verify@example.com', role: 'VERIFICATION_ADMIN', status: 'ACTIVE' },
    'moderator': { id: 'moderator', email: 'mod@example.com', role: 'MODERATOR', status: 'ACTIVE' },
    'target-user': { id: 'target-user', email: 'target@example.com', role: 'USER', status: 'ACTIVE' },
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prismaMock = () => require('../utils/prisma').prisma as any;

  const tokenFor = (id: string) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { signToken } = require('../utils/jwt');
    const u = users[id];
    return signToken({ id: u.id, email: u.email, role: u.role });
  };

  const auth = (id: string) => ({ Authorization: `Bearer ${tokenFor(id)}` });

  beforeAll(() => {
    process.env.JWT_SECRET = 'test-secret-that-is-at-least-32-characters-long';

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { authMiddleware } = require('../middleware/auth');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const adminRoutes = require('../routes/admin');

    app = express();
    app.use(express.json());
    app.use('/api/admin', authMiddleware, adminRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    const p = prismaMock();

    // authMiddleware user lookup (select: id, email, role, status)
    p.user.findUnique.mockImplementation(({ where, select }: any) => {
      const u = users[where.id];
      if (!u) return Promise.resolve(null);
      if (select && 'role' in select && Object.keys(select).length <= 3) {
        // role/status endpoint target lookup: { id, role }
        return Promise.resolve({ id: u.id, role: u.role });
      }
      return Promise.resolve({
        id: u.id, email: u.email, username: u.username || null, name: null,
        role: u.role, status: u.status,
      });
    });
  });

  describe('ADM-1/AUTH-7: role hierarchy on PUT /users/:id/role', () => {
    it('ADMIN cannot change a SUPER_ADMIN role (403)', async () => {
      const res = await request(app)
        .put('/api/admin/users/super-admin/role')
        .set(auth('plain-admin'))
        .send({ role: 'USER' });
      expect(res.status).toBe(403);
      expect(prismaMock().user.update).not.toHaveBeenCalled();
    });

    it('non-SUPER_ADMIN ADMIN cannot grant the ADMIN role (ADM-2)', async () => {
      const res = await request(app)
        .put('/api/admin/users/target-user/role')
        .set(auth('plain-admin'))
        .send({ role: 'ADMIN' });
      expect(res.status).toBe(403);
      expect(prismaMock().user.update).not.toHaveBeenCalled();
    });

    it('SUPER_ADMIN can grant the ADMIN role', async () => {
      const p = prismaMock();
      p.user.update.mockResolvedValue({
        id: 'target-user', email: 'target@example.com', username: null, name: null,
        role: 'ADMIN', status: 'ACTIVE', createdAt: new Date(), djProfile: null,
      });
      p.user.findUnique.mockImplementation(({ select }: any) => {
        if (select && 'status' in select) {
          // authMiddleware lookup
          return Promise.resolve({ id: 'super-admin', email: 'super@example.com', role: 'SUPER_ADMIN', status: 'ACTIVE' });
        }
        return Promise.resolve({ id: 'target-user', email: 'target@example.com', username: null, name: null, role: 'USER' });
      });

      const res = await request(app)
        .put('/api/admin/users/target-user/role')
        .set(auth('super-admin'))
        .send({ role: 'ADMIN' });
      expect(res.status).toBe(200);
      expect(p.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'target-user' }, data: { role: 'ADMIN' } })
      );
    });

    it('SUPER_ADMIN cannot change their own role (self-demotion guard)', async () => {
      const res = await request(app)
        .put('/api/admin/users/super-admin/role')
        .set(auth('super-admin'))
        .send({ role: 'ADMIN' });
      expect(res.status).toBe(403);
      expect(prismaMock().user.update).not.toHaveBeenCalled();
    });

    it('ADM-1 residual: ADMIN cannot demote a peer ADMIN (403)', async () => {
      const res = await request(app)
        .put('/api/admin/users/plain-admin/role')
        .set(auth('plain-admin-2'))
        .send({ role: 'USER' });
      expect(res.status).toBe(403);
      expect(prismaMock().user.update).not.toHaveBeenCalled();
    });
  });

  describe('ADM-1: role hierarchy on PUT /users/:id/status', () => {
    it('ADMIN cannot change a SUPER_ADMIN status (403)', async () => {
      const res = await request(app)
        .put('/api/admin/users/super-admin/status')
        .set(auth('plain-admin'))
        .send({ status: 'BANNED' });
      expect(res.status).toBe(403);
      expect(prismaMock().$transaction).not.toHaveBeenCalled();
    });

    it('ADM-1 residual: ADMIN cannot change another ADMIN\'s status (403)', async () => {
      const res = await request(app)
        .put('/api/admin/users/plain-admin/status')
        .set(auth('plain-admin-2'))
        .send({ status: 'BANNED' });
      expect(res.status).toBe(403);
      expect(prismaMock().$transaction).not.toHaveBeenCalled();
    });

    it('SUPER_ADMIN can change an ADMIN\'s status (200)', async () => {
      const p = prismaMock();
      p.$transaction.mockResolvedValue([{ id: 'plain-admin', email: 'admin@example.com', status: 'SUSPENDED' }]);
      p.djProfile.updateMany.mockResolvedValue({ count: 0 });

      const res = await request(app)
        .put('/api/admin/users/plain-admin/status')
        .set(auth('super-admin'))
        .send({ status: 'SUSPENDED' });
      expect(res.status).toBe(200);
      expect(p.$transaction).toHaveBeenCalled();
    });
  });

  describe('ADM-3: least-privilege per-route gates', () => {
    it('FINANCE_ADMIN gets 403 on GET /messages', async () => {
      const res = await request(app).get('/api/admin/messages').set(auth('finance-admin'));
      expect(res.status).toBe(403);
      expect(prismaMock().message.findMany).not.toHaveBeenCalled();
    });

    it('FINANCE_ADMIN gets 403 on GET /users (verification PII)', async () => {
      const res = await request(app).get('/api/admin/users').set(auth('finance-admin'));
      expect(res.status).toBe(403);
      expect(prismaMock().user.findMany).not.toHaveBeenCalled();
    });

    it('FINANCE_ADMIN can still access GET /payments', async () => {
      const p = prismaMock();
      p.payment.findMany.mockResolvedValue([]);
      p.payment.count.mockResolvedValue(0);
      const res = await request(app).get('/api/admin/payments').set(auth('finance-admin'));
      expect(res.status).toBe(200);
      expect(p.payment.findMany).toHaveBeenCalled();
    });

    it('MODERATOR gets 403 on PUT /campaigns/:id', async () => {
      const res = await request(app)
        .put('/api/admin/campaigns/camp-1')
        .set(auth('moderator'))
        .send({ name: 'x' });
      expect(res.status).toBe(403);
    });

    it('VERIFICATION_ADMIN gets 403 on PUT /campaigns/:id', async () => {
      const res = await request(app)
        .put('/api/admin/campaigns/camp-1')
        .set(auth('verification-admin'))
        .send({ name: 'x' });
      expect(res.status).toBe(403);
      expect(prismaMock().adCampaign.findUnique).not.toHaveBeenCalled();
    });

    it('ADM-3 residual: FINANCE_ADMIN gets 403 on PUT /bookings/:id/status (money control)', async () => {
      const res = await request(app)
        .put('/api/admin/bookings/booking-1/status')
        .set(auth('finance-admin'))
        .send({ status: 'CONFIRMED' });
      expect(res.status).toBe(403);
      expect(prismaMock().booking.update).not.toHaveBeenCalled();
    });

    it('ADM-3 residual: FINANCE_ADMIN can still read GET /bookings', async () => {
      const p = prismaMock();
      p.booking.findMany.mockResolvedValue([]);
      p.booking.count.mockResolvedValue(0);
      const res = await request(app).get('/api/admin/bookings').set(auth('finance-admin'));
      expect(res.status).toBe(200);
      expect(p.booking.findMany).toHaveBeenCalled();
    });

    it('ADM-3 residual: MODERATOR gets 403 on GET /security-logs', async () => {
      const res = await request(app).get('/api/admin/security-logs').set(auth('moderator'));
      expect(res.status).toBe(403);
    });
  });

  describe('ADM-5: POST /notifications returns counts only, never phone numbers', () => {
    it('whatsapp send keeps working but the response has no per-user phone list', async () => {
      const p = prismaMock();
      p.user.findMany.mockResolvedValue([
        { id: 'dj-1', username: 'djone', phone: '23272011156', djProfile: { stageName: 'DJ One', whatsappNumber: null } },
        { id: 'dj-2', username: 'djtwo', phone: null, djProfile: null },
      ]);

      const res = await request(app)
        .post('/api/admin/notifications')
        .set(auth('plain-admin'))
        .send({ type: 'WhatsApp', target: 'All Users', title: 'Hello', message: 'World' });

      expect(res.status).toBe(200);
      expect(res.body.data.whatsappCount).toBe(1);
      expect(res.body.data.notificationCount).toBe(0);
      expect(res.body.data.whatsappTargets).toBeUndefined();
      expect(JSON.stringify(res.body)).not.toContain('23272011156');
    });
  });

  describe('MOD-1: DJ suspend toggle restricted to ADMIN', () => {
    it('MODERATOR gets 403 on PUT /djs/:id/suspend and user.status is never written', async () => {
      const res = await request(app)
        .put('/api/admin/djs/dj-1/suspend')
        .set(auth('moderator'));
      expect(res.status).toBe(403);
      expect(prismaMock().$transaction).not.toHaveBeenCalled();
      expect(prismaMock().user.update).not.toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: expect.anything() }) })
      );
    });
  });
});
