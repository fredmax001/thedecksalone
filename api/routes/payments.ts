const express = require('express');
const { z } = require('zod');
const { prisma } = require('../utils/prisma');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { uploadDocument } = require('../utils/upload');
const { uploadBuffer, deleteFile } = require('../utils/storage');
const { getSubscriptionConfig } = require('../utils/subscriptionConfig');

const router = express.Router();

const paymentSchema = z.object({
  bookingId: z.string(),
  amount: z.number().min(0),
  currency: z.string().default('SLE'),
  type: z.enum(['DEPOSIT', 'FULL_PAYMENT', 'REFUND', 'PLATFORM_FEE']).optional(),
});

const paymentProcessSchema = z.object({
  provider: z.string().default('manual'), // 'paystack', 'stripe', 'manual'
  providerRef: z.string().optional(),
});

const proSubscriptionSchema = z.object({
  plan: z.enum(['pro', 'legend']).default('pro'),
  note: z.string().max(500).optional(),
});

function extFromMime(mimetype: string, fallbackName = '') {
  const fromMime: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'application/pdf': 'pdf',
  };
  if (fromMime[mimetype]) return fromMime[mimetype];
  const ext = fallbackName.split('.').pop();
  return ext && ext.length <= 5 ? ext : 'bin';
}

// GET /api/payments/pro-subscription/config - Manual Orange Money instructions
router.get('/pro-subscription/config', authMiddleware, async (_req, res) => {
  try {
    const config = await getSubscriptionConfig();
    return res.json({ success: true, data: config });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/payments/pro-subscription/current - Current DJ pro status and latest request
router.get('/pro-subscription/current', authMiddleware, async (req, res) => {
  try {
    const dj = await prisma.djProfile.findUnique({
      where: { userId: req.user.id },
      select: {
        id: true,
        stageName: true,
        isPro: true,
        subscriptionTier: true,
        subscriptionActivatedAt: true,
        proSubscriptionRequests: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!dj) {
      return res.status(404).json({ success: false, error: 'DJ profile not found' });
    }

    return res.json({
      success: true,
      data: {
        isPro: dj.isPro,
        activePlan: dj.subscriptionTier || (dj.isPro ? 'pro' : 'free'),
        subscriptionActivatedAt: dj.subscriptionActivatedAt,
        latestRequest: dj.proSubscriptionRequests[0] || null,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/payments/pro-subscription - Submit Orange Money proof for Pro review
router.post('/pro-subscription', authMiddleware, uploadDocument.single('proof'), async (req, res) => {
  try {
    const parsed = proSubscriptionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid input', details: parsed.error.flatten() });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Payment proof is required' });
    }

    const dj = await prisma.djProfile.findUnique({
      where: { userId: req.user.id },
      select: { id: true, isPro: true, subscriptionTier: true },
    });

    if (!dj) {
      return res.status(404).json({ success: false, error: 'DJ profile not found' });
    }

    const requestedPlan = parsed.data.plan;
    const activePlan = dj.subscriptionTier || (dj.isPro ? 'pro' : 'free');
    const config = await getSubscriptionConfig();
    const plan = config.plans.find((p: any) => p.id === requestedPlan);

    if (activePlan === requestedPlan) {
      return res.status(400).json({ success: false, error: `Your ${plan?.name || requestedPlan} subscription is already active` });
    }

    const proofUrl = await uploadBuffer(req.file.buffer, 'subscription-proofs', {
      ext: extFromMime(req.file.mimetype, req.file.originalname),
      contentType: req.file.mimetype,
    });

    const existingPending = await prisma.proSubscriptionRequest.findFirst({
      where: { djId: dj.id, status: 'pending' },
      orderBy: { createdAt: 'desc' },
    });

    const data = {
      plan: requestedPlan,
      amount: plan?.price || (requestedPlan === 'legend' ? 750 : 250),
      currency: config.currency,
      paymentMethod: config.paymentMethod,
      paymentNumber: config.paymentNumber,
      proofUrl,
      note: parsed.data.note || null,
      status: 'pending',
      adminNote: null,
      reviewedAt: null,
      reviewedById: null,
    };

    const request = existingPending
      ? await prisma.proSubscriptionRequest.update({ where: { id: existingPending.id }, data })
      : await prisma.proSubscriptionRequest.create({ data: { ...data, djId: dj.id } });

    if (existingPending?.proofUrl) {
      deleteFile(existingPending.proofUrl).catch(() => {});
    }

    return res.status(existingPending ? 200 : 201).json({ success: true, data: request });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/payments - List payments for the authenticated user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { status, type, page, limit } = req.query;

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where: any = { clientId: req.user.id };
    if (status) where.status = status;
    if (type) where.type = type;

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
        include: {
          booking: {
            include: {
              dj: { select: { id: true, stageName: true, avatar: true } },
            },
          },
        },
      }),
      prisma.payment.count({ where }),
    ]);

    return res.json({
      success: true,
      data: payments,
      meta: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/payments/:id - Get a single payment
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const payment = await prisma.payment.findUnique({
      where: { id: req.params.id },
      include: {
        booking: {
          include: {
            client: { select: { id: true, email: true } },
            dj: { select: { id: true, stageName: true, avatar: true } },
          },
        },
      },
    });

    if (!payment) {
      return res.status(404).json({ success: false, error: 'Payment not found' });
    }

    if (payment.clientId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    return res.json({ success: true, data: payment });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/payments - Create a payment record for a booking
router.post('/', authMiddleware, async (req, res) => {
  try {
    const parsed = paymentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid input', details: parsed.error.flatten() });
    }

    const { bookingId, amount, currency, type } = parsed.data;

    // Verify booking exists and belongs to the user
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { dj: { select: { id: true, userId: true } } },
    });

    if (!booking) {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }

    if (booking.clientId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    // Check if payment already exists for this booking and type
    const existingPayment = await prisma.payment.findFirst({
      where: { bookingId, type: type || 'DEPOSIT', status: { in: ['PENDING', 'PROCESSING', 'COMPLETED'] } },
    });

    if (existingPayment) {
      return res.status(409).json({ success: false, error: 'Payment already exists for this booking' });
    }

    const payment = await prisma.payment.create({
      data: {
        bookingId,
        clientId: req.user.id,
        djId: booking.djId,
        amount,
        currency,
        type: type || 'DEPOSIT',
        status: 'PENDING',
      },
      include: {
        booking: {
          include: {
            dj: { select: { id: true, stageName: true, avatar: true } },
          },
        },
      },
    });

    return res.status(201).json({ success: true, data: payment });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/payments/:id/process - Mark a payment as completed after staff verification.
// Public/client-side payment completion must be done by a real payment provider webhook,
// not by trusting the browser to claim money was paid.
router.post('/:id/process', authMiddleware, requireRole('ADMIN', 'FINANCE_ADMIN'), async (req, res) => {
  try {
    const parsed = paymentProcessSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid input' });
    }

    const { provider, providerRef } = parsed.data;

    const payment = await prisma.payment.findUnique({
      where: { id: req.params.id },
      include: { booking: true },
    });

    if (!payment) {
      return res.status(404).json({ success: false, error: 'Payment not found' });
    }

    if (payment.status === 'COMPLETED') {
      return res.status(400).json({ success: false, error: 'Payment already completed' });
    }

    const updated = await prisma.payment.update({
      where: { id: req.params.id },
      data: {
        status: 'COMPLETED',
        provider: provider || 'manual',
        providerRef: providerRef || null,
        paidAt: new Date(),
      },
      include: {
        booking: {
          include: {
            dj: { select: { id: true, stageName: true } },
          },
        },
      },
    });

    // If it's a deposit payment, update booking status
    if (updated.type === 'DEPOSIT' && updated.status === 'COMPLETED') {
      await prisma.booking.update({
        where: { id: updated.bookingId },
        data: { status: 'DEPOSIT_PAID', deposit: updated.amount },
      });
    }

    // If it's a full payment, mark booking as completed
    if (updated.type === 'FULL_PAYMENT' && updated.status === 'COMPLETED') {
      await prisma.booking.update({
        where: { id: updated.bookingId },
        data: { status: 'COMPLETED' },
      });
    }

    return res.json({ success: true, data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/payments/:id/refund - Refund a payment (admin only)
router.post('/:id/refund', authMiddleware, requireRole('ADMIN', 'FINANCE_ADMIN'), async (req, res) => {
  try {
    const payment = await prisma.payment.findUnique({
      where: { id: req.params.id },
      include: { booking: true },
    });

    if (!payment) {
      return res.status(404).json({ success: false, error: 'Payment not found' });
    }

    if (payment.status !== 'COMPLETED') {
      return res.status(400).json({ success: false, error: 'Only completed payments can be refunded' });
    }

    const updated = await prisma.payment.update({
      where: { id: req.params.id },
      data: { status: 'REFUNDED' },
    });

    // Create a refund payment record
    await prisma.payment.create({
      data: {
        bookingId: payment.bookingId,
        clientId: payment.clientId,
        djId: payment.djId,
        amount: -payment.amount,
        currency: payment.currency,
        type: 'REFUND',
        status: 'COMPLETED',
        provider: payment.provider,
        providerRef: `REFUND_${payment.id}`,
        paidAt: new Date(),
      },
    });

    // Update booking status to refunded
    await prisma.booking.update({
      where: { id: payment.bookingId },
      data: { status: 'REFUNDED' },
    });

    return res.json({ success: true, data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
