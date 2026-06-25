import { motion } from 'framer-motion';
import {
  Check,
  Star,
  Zap,
  Crown,
  Music,
  BarChart3,
  Calendar,
  Globe,
  Headphones,
  Loader2,
} from 'lucide-react';
import { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface Plan {
  id: string;
  name: string;
  price: number;
  period: string;
  description: string;
  icon: React.ElementType;
  features: string[];
  highlighted: boolean;
  cta: string;
}

const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    period: 'forever',
    description: 'Perfect for getting started and building your presence.',
    icon: Music,
    features: [
      'Public DJ profile',
      'Upload up to 5 mixes',
      'Basic analytics',
      'Receive booking inquiries',
      'Community support',
    ],
    highlighted: false,
    cta: 'Current Plan',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 250,
    period: 'month',
    description: 'For working DJs who want to grow their brand and bookings.',
    icon: Zap,
    features: [
      'Everything in Free',
      'Unlimited mix uploads',
      'Advanced analytics & insights',
      'Priority in search results',
      'Verified badge',
      'Direct booking payments',
      'Email support',
    ],
    highlighted: true,
    cta: 'Upgrade to Pro',
  },
  {
    id: 'legend',
    name: 'Legend',
    price: 750,
    period: 'month',
    description: 'For top-tier DJs who demand the full platform experience.',
    icon: Crown,
    features: [
      'Everything in Pro',
      'Featured on homepage',
      'Custom profile themes',
      'Dedicated account manager',
      'Event promotion boost',
      'Exclusive industry partnerships',
      'Priority support 24/7',
      'API access',
    ],
    highlighted: false,
    cta: 'Upgrade to Legend',
  },
];

export default function Subscription() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState<string | null>(null);
  const currentPlan = user?.subscription?.plan || 'free';

  const handleSubscribe = async (planId: string) => {
    if (planId === currentPlan) {
      toast('You are already on this plan');
      return;
    }
    setLoading(planId);
    // Simulate payment flow — wire to /api/payments/create-subscription when ready
    await new Promise((r) => setTimeout(r, 1500));
    toast('Coming soon — subscription payments will be available shortly.');
    setLoading(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-text-primary uppercase tracking-wide">
            Subscription
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Choose the plan that fits your DJ career.
          </p>
        </div>
        <Badge
          variant="outline"
          className="border-gold/30 text-gold bg-gold/5 px-3 py-1 text-sm"
        >
          <Star className="w-3.5 h-3.5 mr-1.5" />
          Current: {PLANS.find((p) => p.id === currentPlan)?.name || 'Free'}
        </Badge>
      </div>

      {/* Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PLANS.map((plan, i) => {
          const Icon = plan.icon;
          const isCurrent = plan.id === currentPlan;

          return (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
            >
              <Card
                className={`h-full bg-black-surface border transition-all duration-300 ${
                  plan.highlighted
                    ? 'border-gold/40 shadow-[0_0_30px_rgba(212,162,74,0.08)]'
                    : 'border-dark-gray hover:border-gold/20'
                }`}
              >
                <CardContent className="p-6 flex flex-col h-full">
                  {/* Header */}
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        plan.highlighted
                          ? 'bg-gold/20 text-gold'
                          : 'bg-black-elevated text-text-secondary'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-text-primary">{plan.name}</h3>
                      <p className="text-xs text-text-muted">{plan.description}</p>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="mb-6">
                    <span className="text-4xl font-bold text-text-primary">
                      {plan.price === 0 ? 'Free' : `SLE ${plan.price}`}
                    </span>
                    {plan.price > 0 && (
                      <span className="text-sm text-text-muted"> / {plan.period}</span>
                    )}
                  </div>

                  {/* Features */}
                  <ul className="space-y-3 mb-6 flex-1">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm text-text-secondary">
                        <Check className="w-4 h-4 text-green mt-0.5 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <Button
                    onClick={() => handleSubscribe(plan.id)}
                    disabled={isCurrent || loading === plan.id}
                    className={`w-full font-semibold uppercase ${
                      plan.highlighted
                        ? 'bg-gold-gradient text-black hover:opacity-90'
                        : isCurrent
                        ? 'bg-black-elevated border border-dark-gray text-text-muted cursor-default'
                        : 'bg-black-elevated border border-dark-gray text-text-primary hover:border-gold/30'
                    }`}
                  >
                    {loading === plan.id ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : null}
                    {isCurrent ? 'Current Plan' : plan.cta}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* FAQ / Info */}
      <Card className="bg-black-surface border-dark-gray">
        <CardContent className="p-6">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-text-primary mb-4">
            Frequently Asked Questions
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                q: 'Can I cancel anytime?',
                a: 'Yes — you can cancel or downgrade your subscription at any time from this page.',
              },
              {
                q: 'What currency is used?',
                a: 'All prices are in Sierra Leonean Leone (SLE). We plan to add USD and mobile-money options soon.',
              },
              {
                q: 'Do you offer yearly discounts?',
                a: 'Yearly billing with 2 months free is coming soon. Stay tuned!',
              },
              {
                q: 'What happens to my mixes if I downgrade?',
                a: 'Your mixes remain published. If you exceed the Free plan limit, new uploads will be paused until you upgrade.',
              },
            ].map(({ q, a }) => (
              <div key={q} className="p-4 rounded-xl bg-black-elevated">
                <p className="text-sm font-medium text-text-primary mb-1">{q}</p>
                <p className="text-xs text-text-secondary">{a}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
