const express = require('express');
const { z } = require('zod');
const { prisma } = require('../utils/prisma');
const { authMiddleware, requireRole, invalidateUserAuthCache } = require('../middleware/auth');
const { activateSubscriptionFeatures, resetSubscriptionFeatures } = require('../middleware/permissions');
const { uploadDocument } = require('../utils/upload');
const { uploadBuffer, deleteFile } = require('../utils/storage');
const { getSubscriptionConfig } = require('../utils/subscriptionConfig');
const { getSubscriptionState, addMonths } = require('../utils/subscription');
const { ok, fail } = require('../utils/response');
const { purchaseLimiter } = require('../utils/rateLimiter');

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
  // Annual variants are submitted when the user picks yearly billing; the
  // admin approval flow normalizes them (annual => 12 months on activation).
  plan: z.enum(['pro', 'legend', 'pro_annual', 'legend_annual']).default('pro'),
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
    return ok(res, config);
  } catch (error) {
    console.error('[payments.ts] Unhandled error:', error);
    return fail(res, 500, 'Internal server error');
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
        subscriptionExpiresAt: true,
        proSubscriptionRequests: {
          where: { NOT: { proofUrl: 'restorable_snapshot' } },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!dj) {
      return fail(res, 404, 'DJ profile not found');
    }

    // Report lapsed subscriptions as free so the UI prompts a renewal
    const subState = getSubscriptionState(dj);
    const paidActive = subState === 'active' || subState === 'grace';

    return ok(res, {
        isPro: paidActive ? (dj.isPro || dj.subscriptionTier === 'pro' || dj.subscriptionTier === 'legend') : false,
        activePlan: paidActive ? (dj.subscriptionTier || (dj.isPro ? 'pro' : 'free')) : 'free',
        subscriptionState: subState,
        subscriptionActivatedAt: dj.subscriptionActivatedAt,
        subscriptionExpiresAt: dj.subscriptionExpiresAt,
        latestRequest: dj.proSubscriptionRequests[0] || null,
      });
  } catch (error) {
    console.error('[payments.ts] Unhandled error:', error);
    return fail(res, 500, 'Internal server error');
  }
});

// POST /api/payments/pro-subscription - Submit Orange Money proof for Pro review
router.post('/pro-subscription', authMiddleware, purchaseLimiter, uploadDocument.single('proof'), async (req, res) => {
  try {
    const parsed = proSubscriptionSchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, 400, 'Invalid input', { details: parsed.error.flatten() });
    }

    if (!req.file) {
      return fail(res, 400, 'Payment proof is required');
    }

    const dj = await prisma.djProfile.findUnique({
      where: { userId: req.user.id },
      select: { id: true, isPro: true, subscriptionTier: true, country: true },
    });

    if (!dj) {
      return fail(res, 404, 'DJ profile not found');
    }

    // Manual mobile-money payments are for Sierra Leone only — other countries use PayPal
    if ((dj.country || 'Sierra Leone') !== 'Sierra Leone') {
      return fail(res, 403, 'Manual payments are only available in Sierra Leone. Please use PayPal checkout.');
    }

    const requestedPlan = parsed.data.plan;
    const isAnnual = requestedPlan.endsWith('_annual');
    const basePlanId = isAnnual ? requestedPlan.replace('_annual', '') : requestedPlan;
    const activePlan = dj.subscriptionTier || (dj.isPro ? 'pro' : 'free');
    const config = await getSubscriptionConfig();
    const plan = config.plans.find((p: any) => p.id === basePlanId);

    if (activePlan === requestedPlan) {
      return fail(res, 400, `Your ${plan?.name || basePlanId} subscription is already active`);
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
      userId: req.user.id,
      plan: requestedPlan,
      // PAY-4: amount comes solely from the subscription config — the old
      // fallback hardcoded 4200/350/2400/200 here.
      amount: isAnnual
        ? (basePlanId === 'legend' ? config.legendPriceAnnual : config.proPriceAnnual)
        : (basePlanId === 'legend' ? config.legendPrice : config.proPrice),
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
    console.error('[payments.ts] Unhandled error:', error);
    return fail(res, 500, 'Internal server error');
  }
});

// POST /api/payments/pro-subscription/cancel - Cancel active subscription or pending upgrade request
router.post('/pro-subscription/cancel', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const cancelPendingOnly = Boolean(req.body?.cancelPendingOnly);

    const [user, dj] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          subscriptionTier: true,
          subscriptionActivatedAt: true,
          subscriptionExpiresAt: true,
        },
      }),
      prisma.djProfile.findUnique({
        where: { userId },
        select: {
          id: true,
          stageName: true,
          isPro: true,
          subscriptionTier: true,
          subscriptionActivatedAt: true,
          subscriptionExpiresAt: true,
        },
      }),
    ]);

    if (!user) {
      return fail(res, 404, 'User not found');
    }

    const requestOwnerFilter = dj ? { OR: [{ userId }, { djId: dj.id }] } : { userId };

    const pendingRequests = await prisma.proSubscriptionRequest.findMany({
      where: {
        ...requestOwnerFilter,
        status: 'pending',
      },
      orderBy: { createdAt: 'desc' },
    });

    if (cancelPendingOnly) {
      if (pendingRequests.length === 0) {
        return fail(res, 400, 'No pending subscription request to cancel');
      }

      await prisma.proSubscriptionRequest.updateMany({
        where: {
          id: { in: pendingRequests.map((r: any) => r.id) },
          status: 'pending',
        },
        data: {
          status: 'cancelled',
          adminNote: 'Cancelled by user',
          reviewedAt: new Date(),
        },
      });

      const subState = getSubscriptionState(dj || user);
      const paidActive = subState === 'active' || subState === 'grace';
      const latestRequest = await prisma.proSubscriptionRequest.findFirst({
        where: { ...requestOwnerFilter, NOT: { proofUrl: 'restorable_snapshot' } },
        orderBy: { createdAt: 'desc' },
      });

      return ok(
        res,
        {
          cancelled: true,
          cancelledPendingOnly: true,
          isPro: paidActive ? Boolean(dj?.isPro || dj?.subscriptionTier === 'pro' || dj?.subscriptionTier === 'legend') : false,
          activePlan: paidActive ? (dj?.subscriptionTier || user.subscriptionTier || 'free') : 'free',
          subscriptionState: subState,
          subscriptionActivatedAt: dj?.subscriptionActivatedAt || user.subscriptionActivatedAt || null,
          subscriptionExpiresAt: dj?.subscriptionExpiresAt || user.subscriptionExpiresAt || null,
          latestRequest: latestRequest || null,
        },
        'Pending subscription request cancelled.'
      );
    }

    const djSubState = getSubscriptionState(dj);
    const userSubState = getSubscriptionState(user);
    const hasActivePaid =
      djSubState === 'active' ||
      djSubState === 'grace' ||
      userSubState === 'active' ||
      userSubState === 'grace';

    if (!hasActivePaid && pendingRequests.length === 0) {
      return fail(res, 400, 'You do not have an active subscription or pending request to cancel');
    }

    if (pendingRequests.length > 0) {
      await prisma.proSubscriptionRequest.updateMany({
        where: {
          id: { in: pendingRequests.map((r: any) => r.id) },
          status: 'pending',
        },
        data: {
          status: 'cancelled',
          adminNote: 'Cancelled by user',
          reviewedAt: new Date(),
        },
      });
    }

    if (hasActivePaid) {
      const activeTier =
        dj?.subscriptionTier && dj.subscriptionTier !== 'free'
          ? dj.subscriptionTier
          : user.subscriptionTier && user.subscriptionTier !== 'free'
          ? user.subscriptionTier
          : 'pro';
      const currentActivatedAt =
        dj?.subscriptionActivatedAt || user.subscriptionActivatedAt || new Date();
      const currentExpiresAt =
        dj?.subscriptionExpiresAt !== undefined
          ? dj.subscriptionExpiresAt
          : user.subscriptionExpiresAt !== undefined
          ? user.subscriptionExpiresAt
          : addMonths(new Date(currentActivatedAt), 1);

      // Preserve a restorable snapshot of the current paid period so Restore Purchase
      // can recover an active subscription even if it was granted directly by an admin.
      const existingApproved = await prisma.proSubscriptionRequest.findFirst({
        where: {
          ...requestOwnerFilter,
          status: 'approved',
        },
        orderBy: { createdAt: 'desc' },
      });

      const snapshotMeta = JSON.stringify({
        originalExpiresAt: currentExpiresAt ? new Date(currentExpiresAt).toISOString() : null,
        originalActivatedAt: new Date(currentActivatedAt).toISOString(),
        cancelledAt: new Date().toISOString(),
      });

      if (existingApproved) {
        try {
          await prisma.proSubscriptionRequest.update({
            where: { id: existingApproved.id },
            data: { adminNote: snapshotMeta },
          });
        } catch {}
      } else {
        try {
          await prisma.proSubscriptionRequest.create({
            data: {
              djId: dj?.id || null,
              userId,
              plan: activeTier,
              amount: 0,
              currency: 'SLE',
              paymentMethod: 'Restorable Plan',
              proofUrl: 'restorable_snapshot',
              status: 'approved',
              reviewedAt: new Date(currentActivatedAt),
              adminNote: snapshotMeta,
            },
          });
        } catch {}
      }

      await resetSubscriptionFeatures(userId);
      await invalidateUserAuthCache(userId);

      try {
        await prisma.notification.create({
          data: {
            userId,
            type: 'SUBSCRIPTION',
            title: 'Subscription Cancelled',
            message: 'Your subscription has been cancelled and your account is now on the Free plan. You can restore an active purchase or upgrade again anytime.',
          },
        });
      } catch {}
    }

    const latestRequest = await prisma.proSubscriptionRequest.findFirst({
      where: { ...requestOwnerFilter, NOT: { proofUrl: 'restorable_snapshot' } },
      orderBy: { createdAt: 'desc' },
    });

    return ok(
      res,
      {
        cancelled: true,
        isPro: false,
        activePlan: 'free',
        subscriptionState: 'none',
        subscriptionActivatedAt: null,
        subscriptionExpiresAt: null,
        latestRequest: latestRequest || null,
      },
      hasActivePaid
        ? 'Your subscription has been cancelled.'
        : 'Your pending subscription request has been cancelled.'
    );
  } catch (error) {
    console.error('[payments.ts] Cancel subscription error:', error);
    return fail(res, 500, 'Internal server error');
  }
});

// POST /api/payments/pro-subscription/restore - Restore an active subscription purchase
router.post('/pro-subscription/restore', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();

    const [user, dj] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          subscriptionTier: true,
          subscriptionActivatedAt: true,
          subscriptionExpiresAt: true,
        },
      }),
      prisma.djProfile.findUnique({
        where: { userId },
        select: {
          id: true,
          stageName: true,
          isPro: true,
          subscriptionTier: true,
          subscriptionActivatedAt: true,
          subscriptionExpiresAt: true,
        },
      }),
    ]);

    if (!user) {
      return fail(res, 404, 'User not found');
    }

    const requestOwnerFilter = dj ? { OR: [{ userId }, { djId: dj.id }] } : { userId };

    const [latestPayPal, latestApprovedRequest, latestVisibleRequest] = await Promise.all([
      prisma.payPalPayment.findFirst({
        where: {
          userId,
          purpose: 'SUBSCRIPTION',
          status: 'CAPTURED',
        },
        orderBy: [{ capturedAt: 'desc' }, { createdAt: 'desc' }],
      }),
      prisma.proSubscriptionRequest.findFirst({
        where: {
          ...requestOwnerFilter,
          status: 'approved',
        },
        orderBy: [{ reviewedAt: 'desc' }, { createdAt: 'desc' }],
      }),
      prisma.proSubscriptionRequest.findFirst({
        where: {
          ...requestOwnerFilter,
          NOT: { proofUrl: 'restorable_snapshot' },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    type CandidatePurchase = {
      plan: string;
      activatedAt: Date;
      expiresAt: Date | null;
      source: string;
    };

    const candidates: CandidatePurchase[] = [];

    // 1. Check if User or DJ profile already has an active subscription (e.g. out-of-sync flags)
    const djState = getSubscriptionState(dj, now);
    if ((djState === 'active' || djState === 'grace') && dj) {
      candidates.push({
        plan: dj.subscriptionTier && dj.subscriptionTier !== 'free' ? dj.subscriptionTier : 'pro',
        activatedAt: dj.subscriptionActivatedAt ? new Date(dj.subscriptionActivatedAt) : now,
        expiresAt: dj.subscriptionExpiresAt ? new Date(dj.subscriptionExpiresAt) : null,
        source: 'profile',
      });
    }

    const userState = getSubscriptionState(user, now);
    if (userState === 'active' || userState === 'grace') {
      candidates.push({
        plan: user.subscriptionTier && user.subscriptionTier !== 'free' ? user.subscriptionTier : 'pro',
        activatedAt: user.subscriptionActivatedAt ? new Date(user.subscriptionActivatedAt) : now,
        expiresAt: user.subscriptionExpiresAt ? new Date(user.subscriptionExpiresAt) : null,
        source: 'user',
      });
    }

    // 2. Check latest captured PayPal subscription payment
    if (latestPayPal && latestPayPal.plan) {
      const activatedAt = new Date(latestPayPal.capturedAt || latestPayPal.createdAt);
      const months = String(latestPayPal.plan).includes('annual') ? 12 : 1;
      const expiresAt = addMonths(activatedAt, months);
      if (expiresAt.getTime() > now.getTime()) {
        candidates.push({
          plan: latestPayPal.plan,
          activatedAt,
          expiresAt,
          source: 'paypal',
        });
      }
    }

    // 3. Check latest approved ProSubscriptionRequest (including preserved snapshot)
    if (latestApprovedRequest && latestApprovedRequest.plan) {
      let activatedAt = new Date(latestApprovedRequest.reviewedAt || latestApprovedRequest.createdAt);
      const months = String(latestApprovedRequest.plan).includes('annual') ? 12 : 1;
      let expiresAt: Date | null = addMonths(activatedAt, months);
      let hasExplicitLifetime = false;

      if (latestApprovedRequest.adminNote && latestApprovedRequest.adminNote.startsWith('{')) {
        try {
          const parsedNote = JSON.parse(latestApprovedRequest.adminNote);
          if (parsedNote.originalActivatedAt) {
            activatedAt = new Date(parsedNote.originalActivatedAt);
          }
          if (parsedNote.originalExpiresAt === null) {
            expiresAt = null;
            hasExplicitLifetime = true;
          } else if (parsedNote.originalExpiresAt) {
            expiresAt = new Date(parsedNote.originalExpiresAt);
          }
        } catch {
          // Ignore malformed JSON in adminNote
        }
      }

      if (hasExplicitLifetime || (expiresAt && expiresAt.getTime() > now.getTime())) {
        candidates.push({
          plan: latestApprovedRequest.plan,
          activatedAt,
          expiresAt,
          source: 'request',
        });
      }
    }

    if (candidates.length === 0) {
      const hasPendingRequest = latestVisibleRequest?.status === 'pending';
      return ok(
        res,
        {
          restored: false,
          hasPendingRequest,
          isPro: false,
          activePlan: 'free',
          subscriptionState: 'none',
          subscriptionActivatedAt: null,
          subscriptionExpiresAt: null,
          latestRequest: latestVisibleRequest || null,
        },
        hasPendingRequest
          ? 'Your subscription request is currently pending admin verification.'
          : 'No active subscription purchases found to restore.'
      );
    }

    // Pick candidate with the furthest expiry (lifetime = Infinity)
    candidates.sort((a, b) => {
      const aTime = a.expiresAt === null ? Number.MAX_SAFE_INTEGER : a.expiresAt.getTime();
      const bTime = b.expiresAt === null ? Number.MAX_SAFE_INTEGER : b.expiresAt.getTime();
      return bTime - aTime;
    });

    const best = candidates[0];
    const normalizedPlan = String(best.plan).includes('legend') ? 'legend' : 'pro';
    const wasAlreadyActive =
      (djState === 'active' || djState === 'grace') &&
      dj?.subscriptionTier === normalizedPlan &&
      dj?.isPro === true;

    await activateSubscriptionFeatures(userId, best.plan, {
      activatedAt: best.activatedAt,
      expiresAt: best.expiresAt,
    });
    await invalidateUserAuthCache(userId);

    if (!wasAlreadyActive) {
      await prisma.notification.create({
        data: {
          userId,
          type: 'SUBSCRIPTION',
          title: 'Subscription Restored',
          message: `Your ${normalizedPlan === 'legend' ? 'Pro+ VIP' : 'Pro'} subscription has been restored!`,
        },
      }).catch(() => {});
    }

    const updatedDj = dj
      ? await prisma.djProfile.findUnique({
          where: { userId },
          select: {
            id: true,
            isPro: true,
            subscriptionTier: true,
            subscriptionActivatedAt: true,
            subscriptionExpiresAt: true,
          },
        })
      : null;

    const updatedState = getSubscriptionState(updatedDj || { subscriptionTier: normalizedPlan, subscriptionExpiresAt: best.expiresAt, isPro: true });

    return ok(
      res,
      {
        restored: true,
        alreadyActive: wasAlreadyActive,
        isPro: true,
        activePlan: normalizedPlan,
        subscriptionState: updatedState,
        subscriptionActivatedAt: best.activatedAt,
        subscriptionExpiresAt: best.expiresAt,
        latestRequest: latestVisibleRequest || null,
      },
      wasAlreadyActive
        ? 'Your subscription is active and all features are synced.'
        : `Your ${normalizedPlan === 'legend' ? 'Pro+ VIP' : 'Pro'} subscription has been restored!`
    );
  } catch (error) {
    console.error('[payments.ts] Restore subscription error:', error);
    return fail(res, 500, 'Internal server error');
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
    console.error('[payments.ts] Unhandled error:', error);
    return fail(res, 500, 'Internal server error');
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
      return fail(res, 404, 'Payment not found');
    }

    if (payment.clientId !== req.user.id && !['ADMIN', 'FINANCE_ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) {
      return fail(res, 403, 'Forbidden');
    }

    return ok(res, payment);
  } catch (error) {
    console.error('[payments.ts] Unhandled error:', error);
    return fail(res, 500, 'Internal server error');
  }
});

// POST /api/payments - Create a payment record for a booking
router.post('/', authMiddleware, async (req, res) => {
  try {
    const parsed = paymentSchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, 400, 'Invalid input', { details: parsed.error.flatten() });
    }

    const { bookingId, amount, currency, type } = parsed.data;

    // Verify booking exists and belongs to the user
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { dj: { select: { id: true, userId: true } } },
    });

    if (!booking) {
      return fail(res, 404, 'Booking not found');
    }

    if (booking.clientId !== req.user.id && req.user.role !== 'ADMIN') {
      return fail(res, 403, 'Forbidden');
    }

    // Check if payment already exists for this booking and type
    const existingPayment = await prisma.payment.findFirst({
      where: { bookingId, type: type || 'DEPOSIT', status: { in: ['PENDING', 'PROCESSING', 'COMPLETED'] } },
    });

    if (existingPayment) {
      return fail(res, 409, 'Payment already exists for this booking');
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
    console.error('[payments.ts] Unhandled error:', error);
    return fail(res, 500, 'Internal server error');
  }
});

// POST /api/payments/:id/process - Mark a payment as completed after staff verification.
// Public/client-side payment completion must be done by a real payment provider webhook,
// not by trusting the browser to claim money was paid.
router.post('/:id/process', authMiddleware, requireRole('ADMIN', 'FINANCE_ADMIN'), async (req, res) => {
  try {
    const parsed = paymentProcessSchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, 400, 'Invalid input');
    }

    const { provider, providerRef } = parsed.data;

    const payment = await prisma.payment.findUnique({
      where: { id: req.params.id },
      include: { booking: true },
    });

    if (!payment) {
      return fail(res, 404, 'Payment not found');
    }

    if (payment.status === 'COMPLETED') {
      return fail(res, 400, 'Payment already completed');
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

    return ok(res, updated);
  } catch (error) {
    console.error('[payments.ts] Unhandled error:', error);
    return fail(res, 500, 'Internal server error');
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
      return fail(res, 404, 'Payment not found');
    }

    if (payment.status !== 'COMPLETED') {
      return fail(res, 400, 'Only completed payments can be refunded');
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

    return ok(res, updated);
  } catch (error) {
    console.error('[payments.ts] Unhandled error:', error);
    return fail(res, 500, 'Internal server error');
  }
});

module.exports = router;
