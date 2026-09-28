const { prisma } = require('./prisma');

export interface SubscriptionConfig {
  paymentMethod: string;
  paymentNumber: string;
  whatsappNumber: string;
  proPrice: number;
  legendPrice: number;
  proPriceAnnual: number;
  legendPriceAnnual: number;
  currency: string;
  plans: Array<{ id: string; name: string; price: number }>;
}

const CONFIG_KEYS = {
  paymentMethod: 'subscription.paymentMethod',
  paymentNumber: 'subscription.paymentNumber',
  whatsappNumber: 'subscription.whatsappNumber',
  proPrice: 'subscription.proPrice',
  legendPrice: 'subscription.legendPrice',
  proPriceAnnual: 'subscription.proPriceAnnual',
  legendPriceAnnual: 'subscription.legendPriceAnnual',
  currency: 'subscription.currency',
};

const DEFAULTS: SubscriptionConfig = {
  paymentMethod: process.env.SUBSCRIPTION_PAYMENT_METHOD || 'Orange Money',
  paymentNumber: process.env.PLATFORM_PAYMENT_NUMBER || '+23272011156',
  whatsappNumber: process.env.PLATFORM_WHATSAPP_NUMBER || process.env.PLATFORM_PAYMENT_NUMBER || '+23272011156',
  proPrice: Number(process.env.PRO_SUBSCRIPTION_PRICE) || 150,
  legendPrice: Number(process.env.LEGEND_SUBSCRIPTION_PRICE) || 250,
  // PAY-4: annual defaults mirror the PayPal flow (what paying users are
  // actually charged) so every rail validates against the same price.
  proPriceAnnual: Number(process.env.PRO_SUBSCRIPTION_PRICE_ANNUAL) || 1000,
  legendPriceAnnual: Number(process.env.LEGEND_SUBSCRIPTION_PRICE_ANNUAL) || 1500,
  currency: process.env.SUBSCRIPTION_CURRENCY || 'SLE',
  plans: [],
};

export async function getSubscriptionConfig(): Promise<SubscriptionConfig> {
  const rows = await prisma.systemConfig.findMany({
    where: {
      key: {
        in: Object.values(CONFIG_KEYS),
      },
    },
  });

  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));

  const paymentMethod = map[CONFIG_KEYS.paymentMethod] || DEFAULTS.paymentMethod;
  const paymentNumber = map[CONFIG_KEYS.paymentNumber] || DEFAULTS.paymentNumber;
  const whatsappNumber = map[CONFIG_KEYS.whatsappNumber] || paymentNumber;
  const proPrice = Number(map[CONFIG_KEYS.proPrice] || DEFAULTS.proPrice);
  const legendPrice = Number(map[CONFIG_KEYS.legendPrice] || DEFAULTS.legendPrice);
  const proPriceAnnual = Number(map[CONFIG_KEYS.proPriceAnnual] || DEFAULTS.proPriceAnnual);
  const legendPriceAnnual = Number(map[CONFIG_KEYS.legendPriceAnnual] || DEFAULTS.legendPriceAnnual);
  const currency = map[CONFIG_KEYS.currency] || DEFAULTS.currency;

  return {
    paymentMethod,
    paymentNumber,
    whatsappNumber,
    proPrice,
    legendPrice,
    proPriceAnnual,
    legendPriceAnnual,
    currency,
    plans: [
      { id: 'pro', name: 'Pro', price: proPrice },
      { id: 'legend', name: 'Pro+', price: legendPrice },
    ],
  };
}

export async function setSubscriptionConfig(
  data: Partial<Omit<SubscriptionConfig, 'plans'>>,
  updatedBy?: string
): Promise<SubscriptionConfig> {
  const entries = [
    { key: CONFIG_KEYS.paymentMethod, value: data.paymentMethod },
    { key: CONFIG_KEYS.paymentNumber, value: data.paymentNumber },
    { key: CONFIG_KEYS.whatsappNumber, value: data.whatsappNumber },
    { key: CONFIG_KEYS.proPrice, value: data.proPrice !== undefined ? String(data.proPrice) : undefined },
    { key: CONFIG_KEYS.legendPrice, value: data.legendPrice !== undefined ? String(data.legendPrice) : undefined },
    { key: CONFIG_KEYS.proPriceAnnual, value: data.proPriceAnnual !== undefined ? String(data.proPriceAnnual) : undefined },
    { key: CONFIG_KEYS.legendPriceAnnual, value: data.legendPriceAnnual !== undefined ? String(data.legendPriceAnnual) : undefined },
    { key: CONFIG_KEYS.currency, value: data.currency },
  ].filter((e): e is { key: string; value: string } => e.value !== undefined && e.value !== '');

  await prisma.$transaction(
    entries.map((e) =>
      prisma.systemConfig.upsert({
        where: { key: e.key },
        update: { value: e.value, updatedBy },
        create: { key: e.key, value: e.value, updatedBy },
      })
    )
  );

  return getSubscriptionConfig();
}

/**
 * PAY-4: single price source — every purchase rail (manual request, Orange
 * Money, PayPal) validates amounts through this helper so a plan can never be
 * bought cheaper via whichever rail hardcodes the lowest price.
 */
export function getExpectedPlanAmount(config: SubscriptionConfig, plan: string): number {
  const isAnnual = plan.includes('annual');
  const basePlan = plan.includes('legend') ? 'legend' : 'pro';
  return isAnnual
    ? (basePlan === 'legend' ? config.legendPriceAnnual : config.proPriceAnnual)
    : (basePlan === 'legend' ? config.legendPrice : config.proPrice);
}
