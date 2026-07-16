const { prisma } = require('./prisma');

export interface SubscriptionConfig {
  paymentMethod: string;
  paymentNumber: string;
  whatsappNumber: string;
  proPrice: number;
  legendPrice: number;
  currency: string;
  plans: Array<{ id: string; name: string; price: number }>;
}

const CONFIG_KEYS = {
  paymentMethod: 'subscription.paymentMethod',
  paymentNumber: 'subscription.paymentNumber',
  whatsappNumber: 'subscription.whatsappNumber',
  proPrice: 'subscription.proPrice',
  legendPrice: 'subscription.legendPrice',
  currency: 'subscription.currency',
};

const DEFAULTS: SubscriptionConfig = {
  paymentMethod: process.env.SUBSCRIPTION_PAYMENT_METHOD || 'Orange Money',
  paymentNumber: process.env.PLATFORM_PAYMENT_NUMBER || '+23272011156',
  whatsappNumber: process.env.PLATFORM_WHATSAPP_NUMBER || process.env.PLATFORM_PAYMENT_NUMBER || '+23272011156',
  proPrice: Number(process.env.PRO_SUBSCRIPTION_PRICE) || 200,
  legendPrice: Number(process.env.LEGEND_SUBSCRIPTION_PRICE) || 350,
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
  const currency = map[CONFIG_KEYS.currency] || DEFAULTS.currency;

  return {
    paymentMethod,
    paymentNumber,
    whatsappNumber,
    proPrice,
    legendPrice,
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
