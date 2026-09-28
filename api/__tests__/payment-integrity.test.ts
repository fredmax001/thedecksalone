import request from 'supertest';
import express from 'express';

// PAY-1 / PAY-2 / PAY-4 / PAY-10 regression tests — payment integrity cluster.

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-that-is-at-least-32-characters-long';

const activateSubscriptionFeatures = jest.fn().mockResolvedValue(undefined);

jest.mock('../middleware/auth', () => ({
  // Test double auth: `Authorization: Bearer <userId>` resolves the user.
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
  resetSubscriptionFeatures: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('axios', () => ({
  post: jest.fn(),
  get: jest.fn(),
}));

jest.mock('../utils/prisma', () => ({
  prisma: {
    user: { findUnique: jest.fn(), count: jest.fn() },
    proSubscriptionRequest: {
      findUnique: jest.fn(),
      updateMany: jest.fn(),
      aggregate: jest.fn(),
    },
    auditLog: { create: jest.fn() },
    eventTicket: { aggregate: jest.fn() },
    booking: { aggregate: jest.fn(), count: jest.fn() },
    payment: { aggregate: jest.fn() },
    payPalPayment: {
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      aggregate: jest.fn(),
    },
    djProfile: { count: jest.fn() },
    mix: { count: jest.fn(), aggregate: jest.fn() },
    event: { count: jest.fn() },
    review: { count: jest.fn() },
    follow: { count: jest.fn() },
    officialPlaylist: { count: jest.fn() },
    appDownload: { count: jest.fn() },
    battle: { count: jest.fn() },
    siteVisit: { count: jest.fn(), groupBy: jest.fn() },
    systemConfig: { findMany: jest.fn() },
  },
}));

const users: Record<string, any> = {
  'admin-1': { id: 'admin-1', email: 'admin@example.com', role: 'ADMIN', status: 'ACTIVE' },
  'user-1': { id: 'user-1', email: 'dj@example.com', role: 'DJ', status: 'ACTIVE' },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prismaMock = () => require('../utils/prisma').prisma as any;
const auth = (id: string) => ({ Authorization: `Bearer ${id}` });

describe('PAY-1: admin pro-subscription approve/reject is idempotent', () => {
  let app: express.Application;

  const pendingRequest = {
    id: 'req-1',
    userId: 'user-1',
    plan: 'pro',
    status: 'pending',
    dj: { userId: null },
    user: { id: 'user-1', username: 'djmax' },
  };

  beforeAll(() => {
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
    activateSubscriptionFeatures.mockClear();
  });

  it('approve with status already approved → 409 and no activation (PAY-1)', async () => {
    const p = prismaMock();
    p.proSubscriptionRequest.findUnique.mockResolvedValue({ ...pendingRequest, status: 'approved' });
    p.proSubscriptionRequest.updateMany.mockResolvedValue({ count: 0 });

    const res = await request(app)
      .post('/api/admin/pro-subscription-requests/req-1/approve')
      .set(auth('admin-1'))
      .send({});

    expect(res.status).toBe(409);
    expect(p.proSubscriptionRequest.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'req-1', status: 'pending' } })
    );
    expect(activateSubscriptionFeatures).not.toHaveBeenCalled();
    expect(p.auditLog.create).not.toHaveBeenCalled();
  });

  it('approve with status pending → claims once, activates, audit-logs (PAY-1 happy path)', async () => {
    const p = prismaMock();
    p.proSubscriptionRequest.findUnique.mockResolvedValue(pendingRequest);
    p.proSubscriptionRequest.updateMany.mockResolvedValue({ count: 1 });

    const res = await request(app)
      .post('/api/admin/pro-subscription-requests/req-1/approve')
      .set(auth('admin-1'))
      .send({ note: 'verified' });

    expect(res.status).toBe(200);
    expect(p.proSubscriptionRequest.updateMany).toHaveBeenCalledWith({
      where: { id: 'req-1', status: 'pending' },
      data: expect.objectContaining({ status: 'approved', reviewedById: 'admin-1' }),
    });
    expect(activateSubscriptionFeatures).toHaveBeenCalledWith('user-1', 'pro');
    expect(p.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'PRO_APPROVE', entityId: 'req-1' }),
      })
    );
  });

  it('reject with status already rejected → 409 (PAY-1 same guard on reject)', async () => {
    const p = prismaMock();
    p.proSubscriptionRequest.findUnique.mockResolvedValue({ ...pendingRequest, status: 'rejected' });
    p.proSubscriptionRequest.updateMany.mockResolvedValue({ count: 0 });

    const res = await request(app)
      .post('/api/admin/pro-subscription-requests/req-1/reject')
      .set(auth('admin-1'))
      .send({});

    expect(res.status).toBe(409);
    expect(activateSubscriptionFeatures).not.toHaveBeenCalled();
    expect(p.auditLog.create).not.toHaveBeenCalled();
  });

  it('reject with status pending → claims once and audit-logs (PAY-1 happy path)', async () => {
    const p = prismaMock();
    p.proSubscriptionRequest.findUnique.mockResolvedValue(pendingRequest);
    p.proSubscriptionRequest.updateMany.mockResolvedValue({ count: 1 });

    const res = await request(app)
      .post('/api/admin/pro-subscription-requests/req-1/reject')
      .set(auth('admin-1'))
      .send({ note: 'proof unclear' });

    expect(res.status).toBe(200);
    expect(p.proSubscriptionRequest.updateMany).toHaveBeenCalledWith({
      where: { id: 'req-1', status: 'pending' },
      data: expect.objectContaining({ status: 'rejected', reviewedById: 'admin-1' }),
    });
    expect(activateSubscriptionFeatures).not.toHaveBeenCalled();
    expect(p.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'PRO_REJECT', entityId: 'req-1' }),
      })
    );
  });

  it('revenue aggregation filters PayPal payments by CAPTURED, not COMPLETED (PAY-10)', async () => {
    const p = prismaMock();
    p.user.count.mockResolvedValue(1);
    p.djProfile.count.mockResolvedValue(0);
    p.mix.count.mockResolvedValue(0);
    p.mix.aggregate.mockResolvedValue({ _sum: { plays: 0 } });
    p.booking.count.mockResolvedValue(0);
    p.event.count.mockResolvedValue(0);
    p.review.count.mockResolvedValue(0);
    p.follow.count.mockResolvedValue(0);
    p.officialPlaylist.count.mockResolvedValue(0);
    p.appDownload.count.mockResolvedValue(0);
    p.battle.count.mockResolvedValue(0);
    p.siteVisit.count.mockResolvedValue(0);
    p.siteVisit.groupBy.mockResolvedValue([]);
    p.proSubscriptionRequest.aggregate.mockResolvedValue({ _sum: { amount: 0 } });
    p.eventTicket.aggregate.mockResolvedValue({ _sum: { amount: 0 } });
    p.booking.aggregate.mockResolvedValue({ _sum: { finalPrice: 0, deposit: 0 } });
    p.payment.aggregate.mockResolvedValue({ _sum: { amount: 0 } });
    p.payPalPayment.aggregate.mockResolvedValue({ _sum: { amountSle: 1234 } });

    const res = await request(app).get('/api/admin/stats').set(auth('admin-1'));

    expect(res.status).toBe(200);
    expect(p.payPalPayment.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'CAPTURED' }),
        _sum: { amountSle: true },
      })
    );
    expect(res.body.data.totalPayments).toBe(1234);
  });
});

describe('PAY-4: single subscription price source', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('getSubscriptionConfig exposes monthly and annual prices (defaults)', async () => {
    const p = prismaMock();
    p.systemConfig.findMany.mockResolvedValue([]);

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getSubscriptionConfig } = require('../utils/subscriptionConfig');
    const config = await getSubscriptionConfig();

    expect(config.proPrice).toBe(150);
    expect(config.legendPrice).toBe(250);
    expect(config.proPriceAnnual).toBe(1000);
    expect(config.legendPriceAnnual).toBe(1500);
  });

  it('getSubscriptionConfig reads DB-overridden annual prices', async () => {
    const p = prismaMock();
    p.systemConfig.findMany.mockResolvedValue([
      { key: 'subscription.proPriceAnnual', value: '2500' },
      { key: 'subscription.legendPriceAnnual', value: '5000' },
    ]);

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getSubscriptionConfig } = require('../utils/subscriptionConfig');
    const config = await getSubscriptionConfig();

    expect(config.proPriceAnnual).toBe(2500);
    expect(config.legendPriceAnnual).toBe(5000);
  });

  it('getExpectedPlanAmount (used by users.ts validation) reads from config, not hardcoded constants', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getExpectedPlanAmount } = require('../utils/subscriptionConfig');
    const config = {
      proPrice: 200,
      legendPrice: 350,
      proPriceAnnual: 2000,
      legendPriceAnnual: 4000,
    };

    expect(getExpectedPlanAmount(config, 'pro')).toBe(200);
    expect(getExpectedPlanAmount(config, 'legend')).toBe(350);
    expect(getExpectedPlanAmount(config, 'pro_annual')).toBe(2000);
    expect(getExpectedPlanAmount(config, 'legend_annual')).toBe(4000);

    // Admin config changes propagate to the expected amount.
    const overridden = { ...config, proPrice: 250, proPriceAnnual: 2500 };
    expect(getExpectedPlanAmount(overridden, 'pro')).toBe(250);
    expect(getExpectedPlanAmount(overridden, 'pro_annual')).toBe(2500);
  });
});

describe('PAY-2: PayPal capture 422 never overwrites CAPTURED with FAILED', () => {
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

  it('capture-order 422 (already captured) issues conditional updateMany excluding CAPTURED rows', async () => {
    const p = prismaMock();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const axios = require('axios');

    p.payPalPayment.findUnique.mockResolvedValue({
      id: 'pp-1',
      userId: 'user-1',
      orderId: 'ORDER-123456',
      plan: 'pro',
      status: 'CREATED',
      amountSle: 200,
      amountUsd: 18,
      rate: 0.09,
    });
    // The handler chains .catch(() => {}) on the updateMany promise.
    p.payPalPayment.updateMany.mockResolvedValue({ count: 1 });
    // First axios.post = OAuth token, second = PayPal capture (422: already captured).
    axios.post
      .mockResolvedValueOnce({ data: { access_token: 'token', expires_in: 32400 } })
      .mockRejectedValueOnce({
        response: { status: 422, data: { message: 'ORDER_ALREADY_CAPTURED' } },
        message: 'Request failed with status code 422',
      });

    const res = await request(app)
      .post('/api/payments/paypal/capture-order')
      .set(auth('user-1'))
      .send({ orderId: 'ORDER-123456' });

    expect(res.status).toBe(502);
    expect(p.payPalPayment.updateMany).toHaveBeenCalledWith({
      where: { orderId: 'ORDER-123456', status: { not: 'CAPTURED' } },
      data: { status: 'FAILED' },
    });
    // The unconditional overwrite path must be gone.
    expect(p.payPalPayment.update).not.toHaveBeenCalled();
  });
});
