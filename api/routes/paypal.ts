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
const crypto = require('crypto');
const { z } = require('zod');
const axios = require('axios');
const { prisma } = require('../utils/prisma');
const { authMiddleware } = require('../middleware/auth');
const { ok, fail } = require('../utils/response');
const { getSubscriptionConfig } = require('../utils/subscriptionConfig');
const { activateSubscriptionFeatures } = require('../middleware/permissions');
const { invalidateUserAuthCache } = require('../middleware/auth');
const { createNotification } = require('../utils/notifications');
const { purchaseLimiter } = require('../utils/rateLimiter');
const { sendTicketApprovalEmail } = require('../utils/email');
const { buildLegacyTicketQr, generateTicketNumber } = require('../utils/ticketQr');

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

// ══════════════════════════════════════════════════════════════════════════
// SHARED HELPERS — generic one-time order + verified capture for all flows
// ══════════════════════════════════════════════════════════════════════════

function buildCustomId(userId: string, purpose: string, recordId: string) {
  return `deck:${userId}:${purpose}:${recordId}`;
}

/**
 * Creates a PayPal order for any platform flow and records it in PayPalPayment.
 * The PayPalPayment row is created first so its id can be embedded in the
 * order's custom_id, making capture tamper-proof.
 */
async function createPayPalOrderRecord(
  req: any,
  opts: { purpose: string; tag: string; refId?: string; amountSle: number; description: string; meta?: any }
) {
  const rate = await getSleToUsd();
  const amountUsd = Math.max(1, Math.round(opts.amountSle * rate * 100) / 100); // PayPal minimum is ~$1

  const record = await prisma.payPalPayment.create({
    data: {
      userId: req.user.id,
      orderId: `pending-${crypto.randomUUID()}`, // replaced once PayPal returns the real id
      purpose: opts.purpose,
      refId: opts.refId ?? null,
      plan: opts.tag,
      amountSle: opts.amountSle,
      amountUsd,
      rate,
      meta: opts.meta ?? undefined,
    },
  });

  const accessToken = await getAccessToken();
  const { data: order } = await axios.post(
    `${PAYPAL_API}/v2/checkout/orders`,
    {
      intent: 'CAPTURE',
      purchase_units: [
        {
          custom_id: buildCustomId(req.user.id, opts.purpose, record.id),
          description: opts.description.slice(0, 127),
          amount: { currency_code: 'USD', value: amountUsd.toFixed(2) },
        },
      ],
    },
    { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }, timeout: 20000 }
  );

  await prisma.payPalPayment.update({ where: { id: record.id }, data: { orderId: order.id } });
  return { orderId: order.id, amountUsd, amountSle: opts.amountSle, rate, recordId: record.id };
}

/**
 * Captures a PayPal order for the logged-in user and verifies it belongs to
 * them and the expected flow. Idempotent: a replayed capture returns
 * `{ replay: true }` without side effects.
 */
async function captureVerifiedOrder(req: any, orderId: string, purpose: string) {
  const record = await prisma.payPalPayment.findUnique({ where: { orderId } });
  if (!record) return { error: [404, 'Unknown order'] as const };
  if (record.userId !== req.user.id) return { error: [403, 'This order belongs to another user'] as const };
  if (record.purpose !== purpose) return { error: [400, 'Order purpose mismatch'] as const };
  if (record.status === 'CAPTURED') return { record, replay: true as const };

  const accessToken = await getAccessToken();
  let capture: any;
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
    if (status === 422) {
      await prisma.payPalPayment.update({ where: { orderId }, data: { status: 'FAILED' } }).catch(() => {});
    }
    return { error: [502, `PayPal capture failed: ${detail}`] as const };
  }

  if (capture.status !== 'COMPLETED') {
    return { error: [502, `PayPal capture returned status ${capture.status}`] as const };
  }

  const expectedCustomId = buildCustomId(req.user.id, purpose, record.id);
  if ((capture.purchase_units?.[0]?.custom_id || '') !== expectedCustomId) {
    console.error(`[PayPal] custom_id mismatch for ${orderId}`);
    return { error: [409, 'Order verification failed'] as const };
  }

  const payerId = capture.payer?.payer_id || null;
  await prisma.payPalPayment.update({
    where: { orderId },
    data: { status: 'CAPTURED', payerId, capturedAt: new Date() },
  });
  return { record: { ...record, status: 'CAPTURED' }, payerId, capture };
}

async function notifyUserQuiet(userId: string, type: string, title: string, body: string, actionUrl?: string) {
  try {
    await prisma.notification.create({
      data: { userId, type, title, body, actionUrl: actionUrl || null, entityType: 'Payment' },
    });
  } catch {}
}

// ══════════════════════════════════════════════════════════════════════════
// EVENT TICKETS — create order → capture creates approved, paid tickets
// ══════════════════════════════════════════════════════════════════════════

const ticketOrderSchema = z.object({
  eventId: z.string(),
  ticketTypeId: z.string(),
  quantity: z.number().int().min(1).max(10),
  buyerName: z.string().max(120).optional(),
  buyerEmail: z.string().max(160).optional(),
  buyerPhone: z.string().max(40).optional(),
  notes: z.string().max(500).optional(),
});

async function validateTicketSale(eventId: string, ticketTypeId: string, qty: number) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) return { error: 'Event not found' as const };
  if (!event.isTicketed) return { error: 'This event does not sell tickets' as const };
  if (event.publishStatus === 'cancelled' || event.publishStatus === 'suspended') {
    return { error: 'Ticket sales are unavailable for this event' as const };
  }
  if (event.ticketSalesClosed) return { error: 'Ticket sales for this event have been closed' as const };
  if (new Date(event.date) < new Date()) return { error: 'Event has already passed' as const };
  const now = new Date();
  if (event.ticketSaleStartsAt && now < event.ticketSaleStartsAt) return { error: 'Ticket sales have not started' as const };
  if (event.ticketSaleEndsAt && now > event.ticketSaleEndsAt) return { error: 'Ticket sales have ended' as const };

  const ticketType = await prisma.eventTicketType.findUnique({ where: { id: ticketTypeId, eventId: event.id } });
  if (!ticketType || !ticketType.isActive) return { error: 'Ticket type not found' as const };
  if (qty > ticketType.maxPerOrder) return { error: `Maximum ${ticketType.maxPerOrder} tickets per order` as const };
  if (ticketType.price * qty <= 0) return { error: 'This ticket type is free — no payment needed' as const };
  return { event, ticketType };
}

async function updateEventAggregates(eventId: string) {
  const [soldAgg, revenueAgg] = await Promise.all([
    prisma.eventTicket.aggregate({ where: { eventId, status: { in: ['approved', 'checked_in'] } }, _sum: { quantity: true } }),
    prisma.eventTicket.aggregate({ where: { eventId, status: { in: ['approved', 'checked_in'] }, paymentStatus: 'paid' }, _sum: { amount: true } }),
  ]);
  await prisma.event.update({
    where: { id: eventId },
    data: { ticketsSold: soldAgg._sum.quantity || 0, totalRevenue: revenueAgg._sum.amount || 0 },
  });
}

router.post('/ticket-order', authMiddleware, purchaseLimiter, asyncHandlerCompat(async (req: any, res: any) => {
  if (!CLIENT_ID || !CLIENT_SECRET) return fail(res, 503, 'PayPal is not configured');
  const parsed = ticketOrderSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 400, 'Invalid input', { details: parsed.error.flatten() });

  const { eventId, ticketTypeId, quantity } = parsed.data;
  const check = await validateTicketSale(eventId, ticketTypeId, quantity);
  if ('error' in check) return fail(res, 400, check.error);

  const totalAmount = check.ticketType.price * quantity;
  const result = await createPayPalOrderRecord(req, {
    purpose: 'TICKET',
    refId: eventId,
    tag: check.ticketType.name,
    amountSle: totalAmount,
    description: `${quantity}x ${check.ticketType.name} — ${check.event.title}`,
    meta: {
      eventId,
      ticketTypeId,
      quantity,
      unitPrice: check.ticketType.price,
      currency: check.ticketType.currency,
      buyerName: parsed.data.buyerName || null,
      buyerEmail: parsed.data.buyerEmail || null,
      buyerPhone: parsed.data.buyerPhone || null,
      notes: parsed.data.notes || null,
    },
  });
  return ok(res, result);
}));

router.post('/capture-ticket', authMiddleware, asyncHandlerCompat(async (req: any, res: any) => {
  const schema = z.object({ orderId: z.string().min(8).max(64) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return fail(res, 400, 'Invalid input');

  const outcome = await captureVerifiedOrder(req, parsed.data.orderId, 'TICKET');
  if ('error' in outcome) return fail(res, outcome.error[0], outcome.error[1]);
  const { record, replay } = outcome as any;

  const meta = (record.meta || {}) as any;
  if (replay && Array.isArray(meta.ticketIds) && meta.ticketIds.length > 0) {
    return ok(res, { status: 'CAPTURED', alreadyCaptured: true, ticketIds: meta.ticketIds });
  }

  // Re-validate at capture time (event could have sold out / been cancelled)
  const check = await validateTicketSale(meta.eventId, meta.ticketTypeId, meta.quantity);
  if ('error' in check) {
    console.error(`[PayPal] Ticket order ${record.orderId} captured but sale no longer valid: ${check.error} — manual follow-up required`);
    return fail(res, 409, `Payment received but the sale could not be completed: ${check.error}. Support has been notified.`);
  }
  const { event, ticketType } = check;

  const tickets = await prisma.$transaction(async (tx: any) => {
    const incrementResult = await tx.$executeRawUnsafe(
      'UPDATE event_ticket_types SET sold = sold + $1 WHERE id = $2 AND (quantity IS NULL OR sold + $1 <= quantity)',
      meta.quantity,
      ticketType.id
    );
    if (incrementResult !== 1) throw new Error('CAPACITY');

    const list: any[] = [];
    for (let i = 0; i < meta.quantity; i++) {
      const created = await tx.eventTicket.create({
        data: {
          eventId: event.id,
          ticketTypeId: ticketType.id,
          userId: req.user.id,
          ticketNumber: generateTicketNumber(),
          status: 'approved',
          paymentStatus: 'paid',
          paymentMethod: 'paypal',
          paymentScreenshot: null,
          amount: meta.unitPrice,
          currency: meta.currency || 'SLE',
          quantity: 1,
          buyerName: meta.buyerName || req.user.name || null,
          buyerEmail: meta.buyerEmail || req.user.email || null,
          buyerPhone: meta.buyerPhone || req.user.phone || null,
          notes: meta.notes || null,
          approvedAt: new Date(),
        },
      });
      const finalQr = buildLegacyTicketQr(created.id, created.ticketNumber);
      await tx.eventTicket.update({ where: { id: created.id }, data: { qrPayload: finalQr, qrCode: finalQr } });
      created.qrPayload = finalQr;
      list.push(created);
    }
    return list;
  }).catch((err: any) => {
    if (err?.message === 'CAPACITY') return null;
    throw err;
  });

  if (!tickets) {
    console.error(`[PayPal] Ticket order ${record.orderId} captured but capacity exhausted — manual follow-up required`);
    return fail(res, 409, 'Payment received but tickets just sold out. Support has been notified for a refund.');
  }

  await prisma.payPalPayment.update({
    where: { orderId: record.orderId },
    data: { meta: { ...meta, ticketIds: tickets.map((t: any) => t.id) } },
  });
  await updateEventAggregates(event.id);

  await notifyUserQuiet(
    req.user.id,
    'TICKET_APPROVED',
    '🎟️ Tickets Confirmed',
    `Your ${meta.quantity}x ${ticketType.name} ticket(s) for "${event.title}" are paid and approved.`,
    '/user/tickets'
  );

  const organizer = event.djId ? await prisma.djProfile.findUnique({ where: { id: event.djId }, select: { userId: true } }) : null;
  if (organizer?.userId) {
    await notifyUserQuiet(
      organizer.userId,
      'TICKET_PURCHASED',
      'Tickets Sold via PayPal',
      `${req.user.name || req.user.username} paid for ${meta.quantity}x ${ticketType.name} ("${event.title}") via PayPal.`,
      `/dashboard/events/${event.id}/tickets`
    );
  }

  for (const ticket of tickets) {
    const recipientEmail = ticket.buyerEmail;
    if (recipientEmail) {
      sendTicketApprovalEmail({
        to: recipientEmail,
        buyerName: ticket.buyerName || req.user.name || 'Attendee',
        eventTitle: event.title,
        eventDate: event.date,
        eventVenue: event.venue || event.location,
        eventCity: event.city,
        ticketTypeName: ticketType.name,
        ticketNumber: ticket.ticketNumber,
        ticketId: ticket.id,
        quantity: 1,
      }, 'approval email').catch(() => {});
    }
  }

  return ok(res, { status: 'CAPTURED', ticketIds: tickets.map((t: any) => t.id), tickets });
}));

// ══════════════════════════════════════════════════════════════════════════
// BOOKING PAYMENTS — client pays deposit or full balance on their booking
// ══════════════════════════════════════════════════════════════════════════

const bookingOrderSchema = z.object({
  bookingId: z.string(),
  type: z.enum(['DEPOSIT', 'FULL_PAYMENT']),
});

router.post('/booking-order', authMiddleware, asyncHandlerCompat(async (req: any, res: any) => {
  if (!CLIENT_ID || !CLIENT_SECRET) return fail(res, 503, 'PayPal is not configured');
  const parsed = bookingOrderSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 400, 'Invalid input', { details: parsed.error.flatten() });

  const booking = await prisma.booking.findUnique({ where: { id: parsed.data.bookingId }, include: { dj: true } });
  if (!booking || booking.clientId !== req.user.id) return fail(res, 404, 'Booking not found');

  const completedSum = await prisma.payment.aggregate({
    where: { bookingId: booking.id, status: 'COMPLETED', type: { not: 'REFUND' } },
    _sum: { amount: true },
  });
  const paidSoFar = completedSum._sum.amount || 0;

  let amountSle: number;
  if (parsed.data.type === 'DEPOSIT') {
    if (!(booking.deposit > 0)) return fail(res, 400, 'No deposit is set for this booking yet');
    if (booking.status !== 'CONFIRMED') return fail(res, 400, `Deposit can only be paid once the booking is confirmed (current: ${booking.status})`);
    const existing = await prisma.payment.findFirst({ where: { bookingId: booking.id, type: 'DEPOSIT', status: 'COMPLETED' } });
    if (existing) return fail(res, 409, 'Deposit already paid');
    amountSle = booking.deposit;
  } else {
    if (!(booking.finalPrice > 0)) return fail(res, 400, 'The final price has not been set by the DJ yet');
    if (!['CONFIRMED', 'DEPOSIT_PAID'].includes(booking.status)) {
      return fail(res, 400, `Full payment is not due for this booking yet (current: ${booking.status})`);
    }
    amountSle = Math.max(0, booking.finalPrice - paidSoFar);
    if (amountSle <= 0) return fail(res, 400, 'This booking is already fully paid');
  }

  const result = await createPayPalOrderRecord(req, {
    purpose: 'BOOKING',
    refId: booking.id,
    tag: parsed.data.type,
    amountSle,
    description: `${parsed.data.type === 'DEPOSIT' ? 'Deposit' : 'Full payment'} — booking for ${booking.eventType}`,
    meta: { type: parsed.data.type },
  });
  return ok(res, result);
}));

router.post('/capture-booking', authMiddleware, asyncHandlerCompat(async (req: any, res: any) => {
  const schema = z.object({ orderId: z.string().min(8).max(64) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return fail(res, 400, 'Invalid input');

  const outcome = await captureVerifiedOrder(req, parsed.data.orderId, 'BOOKING');
  if ('error' in outcome) return fail(res, outcome.error[0], outcome.error[1]);
  const { record, replay } = outcome as any;
  if (replay) return ok(res, { status: 'CAPTURED', alreadyCaptured: true, type: record.plan });

  const booking = await prisma.booking.findUnique({ where: { id: record.refId }, include: { dj: true } });
  if (!booking) return fail(res, 404, 'Booking not found');

  await prisma.payment.create({
    data: {
      bookingId: booking.id,
      clientId: req.user.id,
      djId: booking.djId,
      amount: record.amountSle,
      currency: 'SLE',
      type: record.plan, // DEPOSIT | FULL_PAYMENT
      status: 'COMPLETED',
      provider: 'paypal',
      providerRef: record.orderId,
      paidAt: new Date(),
    },
  });

  if (record.plan === 'DEPOSIT') {
    await prisma.booking.update({ where: { id: booking.id }, data: { status: 'DEPOSIT_PAID', deposit: record.amountSle } });
  } else {
    await prisma.booking.update({ where: { id: booking.id }, data: { status: 'COMPLETED' } });
  }

  const typeLabel = record.plan === 'DEPOSIT' ? 'deposit' : 'full payment';
  await notifyUserQuiet(
    req.user.id,
    'PAYMENT_RECEIVED',
    'Payment Confirmed',
    `Your ${typeLabel} of SLE ${record.amountSle} for the ${booking.eventType} booking was received.`,
    '/user/bookings'
  );
  if (booking.dj?.userId) {
    await notifyUserQuiet(
      booking.dj.userId,
      'PAYMENT_RECEIVED',
      'Booking Payment Received',
      `${req.user.name || req.user.username} paid a ${typeLabel} of SLE ${record.amountSle} via PayPal for the ${booking.eventType} booking.`,
      '/dashboard/bookings'
    );
  }

  return ok(res, { status: 'CAPTURED', type: record.plan, bookingStatus: record.plan === 'DEPOSIT' ? 'DEPOSIT_PAID' : 'COMPLETED' });
}));

// ══════════════════════════════════════════════════════════════════════════
// DJ TIPS / SUPPORT — fan sends a one-time tip, recorded as COMPLETED
// ══════════════════════════════════════════════════════════════════════════

const supportOrderSchema = z.object({
  djId: z.string(),
  amount: z.number().min(5).max(100000),
  message: z.string().max(300).optional(),
});

router.post('/support-order', authMiddleware, asyncHandlerCompat(async (req: any, res: any) => {
  if (!CLIENT_ID || !CLIENT_SECRET) return fail(res, 503, 'PayPal is not configured');
  const parsed = supportOrderSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 400, 'Invalid input', { details: parsed.error.flatten() });

  const dj = await prisma.djProfile.findUnique({ where: { id: parsed.data.djId }, select: { id: true, stageName: true, userId: true } });
  if (!dj) return fail(res, 404, 'DJ not found');
  if (dj.userId === req.user.id) return fail(res, 400, 'You cannot support yourself');

  const result = await createPayPalOrderRecord(req, {
    purpose: 'SUPPORT',
    refId: dj.id,
    tag: 'tip',
    amountSle: parsed.data.amount,
    description: `Support tip for ${dj.stageName} on Deck Salone`,
    meta: { message: parsed.data.message || null },
  });
  return ok(res, result);
}));

router.post('/capture-support', authMiddleware, asyncHandlerCompat(async (req: any, res: any) => {
  const schema = z.object({ orderId: z.string().min(8).max(64) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return fail(res, 400, 'Invalid input');

  const outcome = await captureVerifiedOrder(req, parsed.data.orderId, 'SUPPORT');
  if ('error' in outcome) return fail(res, outcome.error[0], outcome.error[1]);
  const { record, replay } = outcome as any;
  if (replay) return ok(res, { status: 'CAPTURED', alreadyCaptured: true });

  const meta = (record.meta || {}) as any;
  const support = await prisma.djSupport.create({
    data: {
      djId: record.refId,
      userId: req.user.id,
      amount: record.amountSle,
      currency: 'SLE',
      paymentReference: `paypal:${record.orderId}`,
      paymentProofUrl: `paypal:${record.orderId}`,
      status: 'COMPLETED',
      message: meta.message || null,
    },
  });

  const dj = await prisma.djProfile.findUnique({ where: { id: record.refId }, select: { userId: true, stageName: true } });
  if (dj?.userId) {
    await notifyUserQuiet(
      dj.userId,
      'PAYMENT_RECEIVED',
      `💛 You received a tip!`,
      `${req.user.name || req.user.username} sent you a SLE ${record.amountSle} tip via PayPal.`,
      '/dashboard/earnings'
    );
  }

  return ok(res, { status: 'CAPTURED', supportId: support.id });
}));

// Local wrapper so async errors hit Express next() without importing asyncHandler
function asyncHandlerCompat(fn: any) {
  return (req: any, res: any, next: any) => Promise.resolve(fn(req, res, next)).catch(next);
}

module.exports = router;
