/**
 * PayPal one-time payments for Pro/Legend subscriptions.
 *
 * Flow: frontend loads the PayPal v6 SDK with our client ID, creates an order
 * here (amount converted SLE→USD), buyer approves in PayPal's popup, then the
 * frontend calls capture here. A successful capture activates the subscription
 * instantly. PayPalPayment.orderId is unique and doubles as the idempotency
 * key — double-capture returns the first result instead of double-activating.
 */
const express = require('express');
const { z } = require('zod');
const axios = require('axios');
const { prisma } = require('../utils/prisma');
const { authMiddleware } = require('../middleware/auth');
const { ok, fail } = require('../utils/response');
const { getSubscriptionConfig } = require('../utils/subscriptionConfig');
const { activateSubscriptionFeatures } = require('../middleware/permissions');
const { invalidateUserAuthCache } = require('../middleware/auth');
const { createNotification } = require('../utils/notifications');

const router = express.Router();

const CLIENT_ID = process.env.PAYPAL_CLIENT_ID || '';
const CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || '';
const IS_SANDBOX = (process.env.PAYPAL_ENV || 'sandbox') !== 'live';
const PAYPAL_API = IS_SANDBOX ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com';
const SLE_USD_FALLBACK = Number(process.env.PAYPAL_SLE_USD_RATE) || 0.09; // USD per 1 SLE

// Annual prices (SLE) — mirrors the frontend PLANS constants; server config
// only tracks monthly prices.
const ANNUAL_PRICES_SLE: Record<string, number> = { pro: 2000, legend: 4000 };

const createOrderSchema = z.object({
  plan: z.enum(['pro', 'legend']),
  billingPeriod: z.enum(['monthly', 'annual']).default('monthly'),
});
const captureOrderSchema = z.object({ orderId: z.string().min(8).max(64) });

// ── PayPal OAuth token (cached ~6h; PayPal tokens live ~9h) ──────────────
let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token;
  }
  const res = await axios.post(
    `${PAYPAL_API}/v1/oauth2/token`,
    'grant_type=client_credentials',
    {
      auth: { username: CLIENT_ID, password: CLIENT_SECRET },
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 15000,
    }
  );
  cachedToken = {
    token: res.data.access_token,
    expiresAt: Date.now() + (res.data.expires_in || 32_400) * 1000,
  };
  return cachedToken.token;
}

// ── SLE → USD exchange rate (open.er-api.com, no key, cached 1h) ────────
let cachedRate: { rate: number; at: number } | null = null;

async function getSleToUsd(): Promise<number> {
  if (cachedRate && Date.now() - cachedRate.at < 3_600_000) return cachedRate.rate;
  try {
    const { data } = await axios.get('https://open.er-api.com/v6/latest/SLE', { timeout: 10000 });
    const rate = Number(data?.rates?.USD);
    if (Number.isFinite(rate) && rate > 0) {
      cachedRate = { rate, at: Date.now() };
      return rate;
    }
  } catch (err: any) {
    console.warn('[PayPal] exchange rate fetch failed, using fallback:', err.message);
  }
  return cachedRate?.rate ?? SLE_USD_FALLBACK;
}

// ── GET /api/payments/paypal/config — public client config for the SDK ──
router.get('/config', async (req: any, res: any) => {
  return ok(res, {
    enabled: Boolean(CLIENT_ID && CLIENT_SECRET),
    clientId: CLIENT_ID, // public by design — PayPal SDK runs in the browser
    environment: IS_SANDBOX ? 'sandbox' : 'live',
    currency: 'USD',
  });
});

// ── POST /api/payments/paypal/create-order ──────────────────────────────
router.post('/create-order', authMiddleware, asyncHandlerCompat(async (req: any, res: any) => {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    return fail(res, 503, 'PayPal is not configured');
  }
  const parsed = createOrderSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 400, 'Invalid input', { details: parsed.error.flatten() });

  const { plan, billingPeriod } = parsed.data;
  const config = await getSubscriptionConfig();
  const amountSle = billingPeriod === 'annual'
    ? (ANNUAL_PRICES_SLE[plan] ?? (plan === 'legend' ? config.legendPrice : config.proPrice) * 12)
    : (plan === 'legend' ? config.legendPrice : config.proPrice);
  const storedPlan = billingPeriod === 'annual' ? `${plan}_annual` : plan;

  const rate = await getSleToUsd();
  const amountUsd = Math.max(1, Math.round(amountSle * rate * 100) / 100); // PayPal minimum is ~$1

  const accessToken = await getAccessToken();
  const { data: order } = await axios.post(
    `${PAYPAL_API}/v2/checkout/orders`,
    {
      intent: 'CAPTURE',
      purchase_units: [
        {
          custom_id: `decksub:${req.user.id}:${plan}`,
          description: `Deck Salone ${plan === 'legend' ? 'Pro+' : 'Pro'} subscription (1 period)`,
          amount: { currency_code: 'USD', value: amountUsd.toFixed(2) },
        },
      ],
    },
    { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }, timeout: 20000 }
  );

  await prisma.payPalPayment.upsert({
    where: { orderId: order.id },
    update: { userId: req.user.id, plan: storedPlan, amountSle, amountUsd, rate, status: 'CREATED' },
    create: { userId: req.user.id, orderId: order.id, plan: storedPlan, amountSle, amountUsd, rate },
  });

  return ok(res, { orderId: order.id, amountUsd, amountSle, rate });
}));

// ── POST /api/payments/paypal/capture-order ─────────────────────────────
router.post('/capture-order', authMiddleware, asyncHandlerCompat(async (req: any, res: any) => {
  const parsed = captureOrderSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 400, 'Invalid input');
  const { orderId } = parsed.data;

  const record = await prisma.payPalPayment.findUnique({ where: { orderId } });
  if (!record) return fail(res, 404, 'Unknown order');
  if (record.userId !== req.user.id) return fail(res, 403, 'This order belongs to another user');
  // Idempotent replay: a completed capture always returns the same result
  if (record.status === 'CAPTURED') {
    return ok(res, { status: 'CAPTURED', alreadyCaptured: true, plan: record.plan });
  }

  const accessToken = await getAccessToken();
  let capture;
  try {
    const { data } = await axios.post(
      `${PAYPAL_API}/v2/checkout/orders/${orderId}/capture`,
      {},
      { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }, timeout: 20000 }
    );
    capture = data;
  } catch (err: any) {
    const status = err.response?.status;
    const detail = err.response?.data?.message || err.message;
    await prisma.payPalPayment.update({
      where: { orderId },
      data: { status: status === 422 ? 'FAILED' : record.status },
    }).catch(() => {});
    return fail(res, 502, `PayPal capture failed: ${detail}`);
  }

  if (capture.status !== 'COMPLETED') {
    return fail(res, 502, `PayPal capture returned status ${capture.status}`);
  }

  // Verify the captured order really belongs to this user and plan
  const customId = capture.purchase_units?.[0]?.custom_id || '';
  const [, customUserId, customPlan] = customId.split(':');
  if (customUserId !== req.user.id || customPlan !== record.plan.split('_')[0]) {
    console.error(`[PayPal] custom_id mismatch for ${orderId}:`, customId);
    return fail(res, 409, 'Order verification failed');
  }

  const payerId = capture.payer?.payer_id || null;

  await prisma.$transaction([
    prisma.payPalPayment.update({
      where: { orderId },
      data: { status: 'CAPTURED', payerId, capturedAt: new Date() },
    }),
    // Record in the admin-visible request history as an instantly-approved entry
    prisma.proSubscriptionRequest.create({
      data: {
        userId: req.user.id,
        plan: record.plan,
        amount: record.amountSle,
        currency: 'SLE',
        paymentMethod: 'PayPal',
        proofUrl: `paypal:${orderId}`,
        status: 'approved',
        adminNote: `Auto-activated via PayPal capture ${orderId} ($${record.amountUsd.toFixed(2)}, rate ${record.rate})`,
        reviewedAt: new Date(),
      },
    }),
  ]);

  await activateSubscriptionFeatures(req.user.id, record.plan);
  await invalidateUserAuthCache(req.user.id).catch(() => {});
  await createNotification({
    userId: req.user.id,
    type: 'SUBSCRIPTION_STATUS',
    title: 'Subscription active',
    body: `Your ${record.plan === 'legend' ? 'Pro+' : 'Pro'} subscription is now active. Welcome aboard!`,
    sendEmail: true,
    emailSubject: 'Your Deck Salone subscription is active',
  }).catch(() => {});

  return ok(res, { status: 'CAPTURED', plan: record.plan });
}));

// Local wrapper so async errors hit Express next() without importing asyncHandler
function asyncHandlerCompat(fn: any) {
  return (req: any, res: any, next: any) => Promise.resolve(fn(req, res, next)).catch(next);
}

module.exports = router;
