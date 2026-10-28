import request from 'supertest';
import express from 'express';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-that-is-at-least-32-characters-long';

const activateSubscriptionFeatures = jest.fn().mockResolvedValue(undefined);
const resetSubscriptionFeatures = jest.fn().mockResolvedValue(undefined);

jest.mock('../middleware/auth', () => ({
  authMiddleware: (req: any, res: any, next: any) => {
    const token = String(req.headers.authorization || '').replace('Bearer ', '');
    const user = token ? users[token] : null;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });
    req.user = user;
    next();
  },
  requireRole: () => (req: any, res: any, next: any) => next(),
  invalidateUserAuthCache: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../middleware/permissions', () => ({
  activateSubscriptionFeatures: (...args: any[]) => activateSubscriptionFeatures(...args),
  resetSubscriptionFeatures: (...args: any[]) => resetSubscriptionFeatures(...args),
}));

jest.mock('../utils/prisma', () => ({
  prisma: {
    user: { findUnique: jest.fn(), update: jest.fn() },
    djProfile: { findUnique: jest.fn(), update: jest.fn() },
    proSubscriptionRequest: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      updateMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    payPalPayment: { findFirst: jest.fn() },
    notification: { create: jest.fn().mockResolvedValue({}) },
    auditLog: { create: jest.fn().mockResolvedValue({}) },
  },
}));

const users: Record<string, any> = {
  'dj-pro': { id: 'user-dj-1', email: 'dj@example.com', role: 'DJ', status: 'ACTIVE' },
  'dj-free': { id: 'user-dj-2', email: 'dj2@example.com', role: 'DJ', status: 'ACTIVE' },
};

const prismaMock = () => require('../utils/prisma').prisma as any;
const auth = (id: string) => ({ Authorization: `Bearer ${id}` });

describe('Subscription Cancel & Restore APIs', () => {
  let app: express.Application;

  beforeAll(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const paymentRoutes = require('../routes/payments');
    app = express();
    app.use(express.json());
    app.use('/api/payments', paymentRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('cancel active subscription resets features and sets activePlan to free', async () => {
    const p = prismaMock();
    p.user.findUnique.mockResolvedValue({
      id: 'user-dj-1',
      subscriptionTier: 'pro',
      subscriptionActivatedAt: new Date(),
      subscriptionExpiresAt: new Date(Date.now() + 15 * 86400000),
    });
    p.djProfile.findUnique.mockResolvedValue({
      id: 'dj-1',
      userId: 'user-dj-1',
      stageName: 'DJ Test',
      isPro: true,
      subscriptionTier: 'pro',
      subscriptionActivatedAt: new Date(),
      subscriptionExpiresAt: new Date(Date.now() + 15 * 86400000),
    });
    p.proSubscriptionRequest.findMany.mockResolvedValue([]);
    p.proSubscriptionRequest.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/payments/pro-subscription/cancel')
      .set(auth('dj-pro'))
      .send({ reason: 'Taking a break' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.cancelled).toBe(true);
    expect(res.body.data.activePlan).toBe('free');
    expect(resetSubscriptionFeatures).toHaveBeenCalledWith('user-dj-1');
  });

  it('cancel pending request cancels pending requests without touching active tier', async () => {
    const p = prismaMock();
    p.user.findUnique.mockResolvedValue({
      id: 'user-dj-2',
      subscriptionTier: 'free',
      subscriptionActivatedAt: null,
      subscriptionExpiresAt: null,
    });
    p.djProfile.findUnique.mockResolvedValue({
      id: 'dj-2',
      userId: 'user-dj-2',
      stageName: 'DJ Free',
      isPro: false,
      subscriptionTier: 'free',
      subscriptionActivatedAt: null,
      subscriptionExpiresAt: null,
    });
    p.proSubscriptionRequest.findMany.mockResolvedValue([
      { id: 'req-pending-1', status: 'pending' },
    ]);
    p.proSubscriptionRequest.updateMany.mockResolvedValue({ count: 1 });
    p.proSubscriptionRequest.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/payments/pro-subscription/cancel')
      .set(auth('dj-free'))
      .send({ cancelPendingOnly: true });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.cancelled).toBe(true);
    expect(res.body.data.cancelledPendingOnly).toBe(true);
    expect(p.proSubscriptionRequest.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['req-pending-1'] }, status: 'pending' },
      data: expect.objectContaining({ status: 'cancelled' }),
    });
    expect(resetSubscriptionFeatures).not.toHaveBeenCalled();
  });

  it('restore purchase restores an active unexpired purchase', async () => {
    const p = prismaMock();
    p.user.findUnique.mockResolvedValue({
      id: 'user-dj-2',
      subscriptionTier: 'free',
      subscriptionActivatedAt: null,
      subscriptionExpiresAt: null,
    });
    p.djProfile.findUnique.mockResolvedValue({
      id: 'dj-2',
      userId: 'user-dj-2',
      stageName: 'DJ Free',
      isPro: false,
      subscriptionTier: 'free',
      subscriptionActivatedAt: null,
      subscriptionExpiresAt: null,
    });
    p.payPalPayment.findFirst.mockResolvedValue({
      id: 'pp-1',
      userId: 'user-dj-2',
      plan: 'pro',
      status: 'CAPTURED',
      capturedAt: new Date(Date.now() - 5 * 86400000),
    });
    p.proSubscriptionRequest.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/payments/pro-subscription/restore')
      .set(auth('dj-free'))
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.restored).toBe(true);
    expect(res.body.data.activePlan).toBe('pro');
    expect(activateSubscriptionFeatures).toHaveBeenCalledWith(
      'user-dj-2',
      'pro',
      expect.objectContaining({
        expiresAt: expect.any(Date),
      })
    );
  });

  it('restore purchase returns restored: false when no active purchases exist', async () => {
    const p = prismaMock();
    p.user.findUnique.mockResolvedValue({
      id: 'user-dj-2',
      subscriptionTier: 'free',
      subscriptionActivatedAt: null,
      subscriptionExpiresAt: null,
    });
    p.djProfile.findUnique.mockResolvedValue({
      id: 'dj-2',
      userId: 'user-dj-2',
      stageName: 'DJ Free',
      isPro: false,
      subscriptionTier: 'free',
      subscriptionActivatedAt: null,
      subscriptionExpiresAt: null,
    });
    p.payPalPayment.findFirst.mockResolvedValue(null);
    p.proSubscriptionRequest.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/payments/pro-subscription/restore')
      .set(auth('dj-free'))
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.restored).toBe(false);
    expect(res.body.data.activePlan).toBe('free');
    expect(activateSubscriptionFeatures).not.toHaveBeenCalled();
  });
});
