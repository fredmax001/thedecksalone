import request from 'supertest';
import express from 'express';

// Mock rate limiter factory: each limiter is a jest.fn we can make trip on demand
jest.mock('../utils/rateLimiter', () => ({
  getClientIp: jest.fn(() => '127.0.0.1'),
  reportLimiter: jest.fn((req: any, res: any, next: any) => next()),
  messageLimiter: jest.fn((req: any, res: any, next: any) => next()),
  analyticsVisitLimiter: jest.fn((req: any, res: any, next: any) => next()),
  developerApplyLimiter: jest.fn((req: any, res: any, next: any) => next()),
  purchaseLimiter: jest.fn((req: any, res: any, next: any) => next()),
  searchLimiter: jest.fn((req: any, res: any, next: any) => next()),
  conditionalSearchLimiter: jest.fn((req: any, res: any, next: any) => next()),
  generalLimiter: jest.fn((req: any, res: any, next: any) => next()),
  loginRateLimiter: jest.fn((req: any, res: any, next: any) => next()),
  authLimiter: jest.fn((req: any, res: any, next: any) => next()),
  bookingLimiter: jest.fn((req: any, res: any, next: any) => next()),
  voteLimiter: jest.fn((req: any, res: any, next: any) => next()),
  playLimiter: jest.fn((req: any, res: any, next: any) => next()),
}));

jest.mock('../utils/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    violationReport: {
      create: jest.fn(),
    },
    notification: {
      create: jest.fn(),
      createMany: jest.fn(),
    },
    message: {
      create: jest.fn(),
    },
    siteVisit: {
      create: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  },
}));

jest.mock('../utils/email', () => ({
  sendAdminViolationAlertEmail: jest.fn(),
  sendDeveloperApplicationEmails: jest.fn(),
  sendEmail: jest.fn(),
}));

jest.mock('../utils/sms', () => ({
  sendSentDmSms: jest.fn(),
}));

jest.mock('../utils/redis', () => ({
  getCache: jest.fn(),
  setCache: jest.fn(),
  clearCache: jest.fn(),
}));

jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

describe('Abuse controls (SOC-7/8/9/10/17, ETK-8)', () => {
  let app: express.Application;
  let senderToken: string;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prismaMock = () => require('../utils/prisma').prisma as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rateLimiterMock = () => require('../utils/rateLimiter') as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const emailMock = () => require('../utils/email') as any;

  const sender = { id: 'sender-1', email: 'sender@example.com', role: 'USER', status: 'ACTIVE' };

  beforeAll(() => {
    process.env.JWT_SECRET = 'test-secret-that-is-at-least-32-characters-long';

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { signToken } = require('../utils/jwt');
    senderToken = signToken({ id: sender.id, email: sender.email, role: sender.role });

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const reportsRoutes = require('../routes/reports');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const messagesRoutes = require('../routes/messages');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const analyticsRoutes = require('../routes/analytics');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const developersRoutes = require('../routes/developers');

    app = express();
    app.use(express.json());
    app.use('/api/v1/reports', reportsRoutes);
    app.use('/api/messages', messagesRoutes);
    app.use('/api/analytics', analyticsRoutes);
    app.use('/api/developers', developersRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    const p = prismaMock();
    p.user.findUnique.mockImplementation(({ where }: { where: { id: string } }) => {
      if (where.id === sender.id) return Promise.resolve(sender);
      return Promise.resolve(null);
    });
    p.user.findMany.mockResolvedValue([]);
  });

  describe('SOC-7: reports abuse controls', () => {
    it('rejects details longer than 2000 characters', async () => {
      const res = await request(app)
        .post('/api/v1/reports')
        .send({ reason: 'other', details: 'x'.repeat(2001) });

      expect(res.status).toBe(400);
      expect(prismaMock().violationReport.create).not.toHaveBeenCalled();
    });

    it('report limiter is wired into POST /api/v1/reports', async () => {
      const p = prismaMock();
      p.violationReport.create.mockResolvedValue({ id: 'rep-1' });
      emailMock().sendAdminViolationAlertEmail.mockResolvedValue(undefined);

      const res = await request(app)
        .post('/api/v1/reports')
        .send({ reason: 'other', details: 'This is a valid report body.' });

      expect(res.status).toBe(201);
      expect(rateLimiterMock().reportLimiter).toHaveBeenCalled();
    });
  });

  describe('SOC-8: notification emails never send raw user HTML', () => {
    it('createNotification with HTML-ish body sends no raw html containing the payload', async () => {
      const p = prismaMock();
      p.user.findUnique.mockResolvedValue({
        id: 'receiver-1',
        email: 'receiver@example.com',
        phone: null,
        phoneVerified: false,
        notificationPreferences: {},
      });
      p.notification.create.mockResolvedValue({ id: 'notif-1' });

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { createNotification } = require('../utils/notifications');
      const payload = '<a href="http://evil.example">Steal your credentials</a>';
      await createNotification({
        userId: 'receiver-1',
        type: 'NEW_MESSAGE',
        title: 'New message from Someone',
        body: payload.slice(0, 120),
        sendEmail: true,
        emailSubject: 'New Message - Deck Salone',
      });

      const sendEmailMock = emailMock().sendEmail;
      expect(sendEmailMock).toHaveBeenCalledTimes(1);
      const emailArg = sendEmailMock.mock.calls[0][0];
      // html must be absent or escaped — never the raw payload
      expect(emailArg.html).toBeUndefined();
      if (emailArg.html !== undefined) {
        expect(emailArg.html).not.toContain('<a href=');
      }
      // text part is present and safe
      expect(typeof emailArg.text).toBe('string');
      expect(emailArg.text).not.toContain('<a href=');
    });
  });

  describe('SOC-9: messaging privacy + rate limit', () => {
    it('returns 403 when receiver has allowMessages disabled', async () => {
      const p = prismaMock();
      p.user.findUnique.mockImplementation(({ where }: { where: { id: string } }) => {
        if (where.id === sender.id) return Promise.resolve(sender);
        if (where.id === 'receiver-1') {
          return Promise.resolve({
            ...sender,
            id: 'receiver-1',
            privacyPreferences: { allowMessages: false },
          });
        }
        return Promise.resolve(null);
      });

      const res = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${senderToken}`)
        .send({ receiverId: 'receiver-1', content: 'Hello there' });

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/not accepting messages/i);
      expect(p.message.create).not.toHaveBeenCalled();
    });

    it('message limiter is wired into POST /api/messages and can trip', async () => {
      const rl = rateLimiterMock();
      rl.messageLimiter.mockImplementationOnce((req: any, res: any) =>
        res.status(429).json({ success: false, error: 'Too many messages sent. Please try again later.' })
      );

      const p = prismaMock();
      p.user.findUnique.mockImplementation(({ where }: { where: { id: string } }) => {
        if (where.id === sender.id) return Promise.resolve(sender);
        if (where.id === 'receiver-2') return Promise.resolve({ ...sender, id: 'receiver-2' });
        return Promise.resolve(null);
      });

      const res = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${senderToken}`)
        .send({ receiverId: 'receiver-2', content: 'Hello there' });

      expect(res.status).toBe(429);
      expect(p.message.create).not.toHaveBeenCalled();
    });
  });

  describe('SOC-10: analytics beacon controls', () => {
    it('rejects path longer than 500 characters', async () => {
      const res = await request(app)
        .post('/api/analytics/visit')
        .send({ path: 'x'.repeat(501) });

      expect(res.status).toBe(400);
      expect(prismaMock().siteVisit.create).not.toHaveBeenCalled();
    });

    it('analytics limiter is wired into POST /api/analytics/visit', async () => {
      const res = await request(app).post('/api/analytics/visit').send({ path: '/home' });

      expect(res.status).toBe(200);
      expect(rateLimiterMock().analyticsVisitLimiter).toHaveBeenCalled();
    });
  });

  describe('SOC-17: developer application limiter', () => {
    const validApplication = {
      name: 'Dev One',
      email: 'dev@example.com',
      projectName: 'Cool App',
      projectType: 'web',
      expectedVolume: 'under_10k',
      useCase: 'Building an integration for my platform with the Deck Salone API.',
      agreedToTerms: true,
    };

    it('developer apply limiter is wired into POST /api/developers/apply', async () => {
      const p = prismaMock();
      p.auditLog.create.mockResolvedValue({ id: 'audit-1' });
      emailMock().sendDeveloperApplicationEmails.mockResolvedValue(undefined);

      const res = await request(app).post('/api/developers/apply').send(validApplication);

      expect(res.status).toBe(201);
      expect(rateLimiterMock().developerApplyLimiter).toHaveBeenCalled();
    });
  });

  describe('ETK-8: CSV formula injection guard', () => {
    it("prefixes cells starting with '=', '+', '-', '@' with a single quote", () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const ticketing = require('../routes/eventTicketing');
      const csv = ticketing.buildCsv([
        { Name: 'Guest One', Note: '=HYPERLINK("http://evil.example","click")' },
        { Name: 'Guest Two', Note: '+cmd' },
        { Name: 'Guest Three', Note: '-2+3' },
        { Name: 'Guest Four', Note: '@SUM(A1)' },
        { Name: 'Guest Five', Note: 'plain text' },
      ]);

      expect(csv).toContain(`'=HYPERLINK(`);
      expect(csv).toContain(`'+cmd`);
      expect(csv).toContain(`'-2+3`);
      expect(csv).toContain(`'@SUM(A1)`);
      expect(csv).toContain('plain text');
    });
  });
});
