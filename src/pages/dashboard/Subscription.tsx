import { motion } from 'framer-motion';
import type { ChangeEvent, ElementType } from 'react';
import {
  Check,
  Star,
  Zap,
  Crown,
  Music,
  Loader2,
  Upload,
  Smartphone,
  MessageCircle,
  FileText,
  Calendar,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

interface Plan {
  id: string;
  annualId: string;
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  period: string;
  description: string;
  icon: ElementType;
  features: string[];
  highlighted: boolean;
  cta: string;
}

interface ProSubscriptionStatus {
  isPro: boolean;
  activePlan: string;
  subscriptionActivatedAt?: string | null;
  latestRequest: {
    id: string;
    plan: 'pro' | 'legend' | 'pro_annual' | 'legend_annual';
    status: 'pending' | 'approved' | 'rejected';
    proofUrl: string;
    amount: number;
    currency: string;
    adminNote?: string | null;
    createdAt: string;
  } | null;
}

interface PaymentConfig {
  paymentMethod: string;
  paymentNumber: string;
  whatsappNumber: string;
  proPrice: number;
  legendPrice: number;
  currency: string;
  plans: Array<{ id: 'pro' | 'legend'; name: string; price: number }>;
}

const DEFAULT_PAYMENT_CONFIG: PaymentConfig = {
  paymentMethod: 'Orange Money',
  paymentNumber: '+23272011156',
  whatsappNumber: '+23272011156',
  proPrice: 200,
  legendPrice: 350,
  currency: 'SLE',
  plans: [
    { id: 'pro', name: 'Pro', price: 200 },
    { id: 'legend', name: 'Pro+', price: 350 },
  ],
};

const PLANS: Plan[] = [
  {
    id: 'free',
    annualId: 'free',
    name: 'Free',
    monthlyPrice: 0,
    annualPrice: 0,
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
    annualId: 'pro_annual',
    name: 'Pro',
    monthlyPrice: 200,
    annualPrice: 2000,
    period: 'month',
    description: 'For working DJs who want to grow their brand and bookings.',
    icon: Zap,
    features: [
      'Everything in Free',
      'Unlimited mix uploads',
      'Advanced analytics & insights',
      'Priority in search results',
      'Direct booking payments',
      'Email support',
    ],
    highlighted: true,
    cta: 'Upgrade to Pro',
  },
  {
    id: 'legend',
    annualId: 'legend_annual',
    name: 'Pro+',
    monthlyPrice: 350,
    annualPrice: 4000,
    period: 'month',
    description: 'For top-tier DJs who demand the full platform experience.',
    icon: Crown,
    features: [
      'Everything in Pro',
      'Ticketed Events with QR codes',
      'Event RSVP & countdown',
      'Event gallery uploads',
      'Featured on homepage',
      'Custom profile themes',
      'Dedicated account manager',
      'Event promotion boost',
      'Exclusive industry partnerships',
      'Priority support 24/7',
      'API access',
    ],
    highlighted: false,
    cta: 'Upgrade to Pro+',
  },
];

export default function Subscription() {
  const [loading, setLoading] = useState<string | null>(null);
  const [status, setStatus] = useState<ProSubscriptionStatus | null>(null);
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig>(DEFAULT_PAYMENT_CONFIG);
  const [statusLoading, setStatusLoading] = useState(true);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [selectedProof, setSelectedProof] = useState<File | null>(null);
  const [note, setNote] = useState('');
  const [requestSent, setRequestSent] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');
  const { fetchMe } = useAuthStore();
  const currentPlan = status?.activePlan || (status?.isPro ? 'pro' : 'free');
  const latestRequest = status?.latestRequest;

  // Derive the actual plan ID to submit based on billing period
  const getSubmitPlanId = (basePlanId: string) => {
    if (basePlanId === 'free') return 'free';
    if (billingPeriod === 'annual') {
      return PLANS.find(p => p.id === basePlanId)?.annualId || basePlanId;
    }
    return basePlanId;
  };

  // Get price for selected plan based on billing period
  const getPlanPrice = (plan: Plan) => {
    if (plan.monthlyPrice === 0) return 0;
    return billingPeriod === 'annual' ? plan.annualPrice : plan.monthlyPrice;
  };

  useEffect(() => {
    let mounted = true;
    Promise.all([
      api.get('/payments/pro-subscription/current'),
      api.get('/payments/pro-subscription/config'),
    ])
      .then(([statusRes, configRes]) => {
        if (!mounted) return;
        setStatus(statusRes.data.data);
        setPaymentConfig(configRes.data.data);
        if (statusRes.data.data?.latestRequest) {
          setSelectedPlanId(statusRes.data.data.latestRequest.plan);
        } else if (statusRes.data.data?.activePlan && statusRes.data.data.activePlan !== 'free') {
          setSelectedPlanId(statusRes.data.data.activePlan);
        }
      })
      .catch((err) => {
        toast.error(err.response?.data?.error || 'Failed to load subscription status');
      })
      .finally(() => {
        if (mounted) setStatusLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (latestRequest?.status !== 'pending' || status?.isPro) return;

    console.log('Starting subscription status poll...');
    const intervalId = window.setInterval(async () => {
      try {
        const res = await api.get('/payments/pro-subscription/current');
        const nextStatus = res.data.data;

        console.log('Poll result:', nextStatus);

        setStatus(nextStatus);

        // Check if the subscription was just approved
        if (nextStatus?.isPro && !status?.isPro) {
          clearInterval(intervalId);
          setRequestSent(false);
          setSelectedPlanId(nextStatus.activePlan || 'pro');
          await fetchMe();
          toast.success('🎉 Active now! Your subscription has been confirmed by admin.');
        }
      } catch (err) {
        console.error('Poll error:', err);
      }
    }, 5000); // Poll every 5 seconds instead of 15 for faster feedback

    return () => {
      clearInterval(intervalId);
    };
  }, [latestRequest?.status, status?.isPro, fetchMe]);


  const handleSubscribe = async (planId: string) => {
    if (planId === 'free') {
      toast('Free plan is your current plan');
      return;
    }

    if (planId === currentPlan) {
      toast(`You're already on the ${PLANS.find(p => p.id === planId)?.name} plan`);
      return;
    }

    setSelectedPlanId(planId);
    setRequestSent(false);

    // Scroll to payment panel after a brief delay to allow state update
    setTimeout(() => {
      const element = document.getElementById('pro-payment-proof');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  const handleSubmitProof = async () => {
    if (!selectedPlanId || selectedPlanId === 'free') {
      toast.error('Please select a subscription tier first');
      return;
    }

    if (!selectedProof) {
      toast.error('Upload a screenshot or receipt first');
      return;
    }

    const submitPlanId = getSubmitPlanId(selectedPlanId);
    const selectedPlanDef = PLANS.find(p => p.id === selectedPlanId);
    const amount = selectedPlanDef ? getPlanPrice(selectedPlanDef) : 0;

    setLoading('pro-proof');
    try {
      const formData = new FormData();
      formData.append('plan', submitPlanId);
      formData.append('proof', selectedProof);
      if (note.trim()) formData.append('note', note.trim());
      formData.append('amount', String(amount));
      formData.append('billingPeriod', billingPeriod);

      console.log('Submitting proof for plan:', submitPlanId, 'File:', selectedProof.name);

      const res = await api.post('/payments/pro-subscription', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('Proof submission response:', res.data);

      if (res.data.success && res.data.data) {
        setStatus((prev) => ({
          isPro: prev?.isPro || false,
          activePlan: prev?.activePlan || 'free',
          subscriptionActivatedAt: prev?.subscriptionActivatedAt || null,
          latestRequest: res.data.data,
        }));
        setSelectedProof(null);
        setNote('');
        setRequestSent(true);
        await fetchMe();
        toast.success('✓ Request sent! Your subscription is pending admin confirmation.');
      } else {
        toast.error('Failed to process request. Please try again.');
      }
    } catch (err: any) {
      console.error('Proof submission error:', err);
      const errorMsg = err.response?.data?.error || err.message || 'Failed to upload payment proof';
      toast.error(errorMsg);
    } finally {
      setLoading(null);
    }
  };

  const selectedPlan = PLANS.find((plan) => plan.id === selectedPlanId);

  const hasPendingRequest = latestRequest?.status === 'pending';
  const isSelectedCurrentPaidPlan = !!selectedPlanId && selectedPlanId !== 'free' && selectedPlanId === currentPlan;
  const shouldShowPaymentPanel = (!!selectedPlanId && selectedPlanId !== 'free') || !!latestRequest || (status?.isPro && currentPlan !== 'free');
  const whatsappUrl = `https://wa.me/${paymentConfig.whatsappNumber.replace(/\D/g, '')}`;

  if (statusLoading) {
    return (
      <div className="min-h-[320px] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gold" />
      </div>
    );
  }

  const onProofChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setSelectedProof(null);
      return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast.error(`File is too large. Maximum size is 10MB. Your file is ${(file.size / 1024 / 1024).toFixed(1)}MB.`);
      event.target.value = ''; // Reset input
      setSelectedProof(null);
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('File type not supported. Please upload a PNG, JPG, WEBP, or PDF.');
      event.target.value = ''; // Reset input
      setSelectedProof(null);
      return;
    }

    setSelectedProof(file);
    toast.success(`File selected: ${file.name}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-text-primary uppercase tracking-wide">
            Subscription
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {/* Billing Period Toggle */}
          <div className="flex items-center bg-black-elevated border border-dark-gray rounded-xl p-1">
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                billingPeriod === 'monthly'
                  ? 'bg-gold text-black shadow'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod('annual')}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5 ${
                billingPeriod === 'annual'
                  ? 'bg-gold text-black shadow'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              Annual
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                billingPeriod === 'annual' ? 'bg-black/20' : 'bg-gold/20 text-gold'
              }`}>SAVE</span>
            </button>
          </div>
          <Badge
            variant="outline"
            className="border-gold/30 text-gold bg-gold/5 px-3 py-1 text-sm"
          >
            <Star className="w-3.5 h-3.5 mr-1.5" />
            Current: {PLANS.find((p) => p.id === currentPlan)?.name || 'Free'}
          </Badge>
        </div>
      </div>

      {/* Annual savings banner */}
      {billingPeriod === 'annual' && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl bg-gold/10 border border-gold/30 p-3 flex items-center gap-3"
        >
          <Calendar className="w-5 h-5 text-gold flex-shrink-0" />
          <p className="text-sm text-gold">
            <span className="font-bold">Annual billing active.</span>{' '}
            Save with 1 year upfront — Pro: <strong>SLE 2,000/yr</strong> &nbsp;·&nbsp; Pro+: <strong>SLE 4,000/yr</strong>
          </p>
        </motion.div>
      )}

      {shouldShowPaymentPanel && (
        <Card id="pro-payment-proof" className="bg-black-surface border-gold/30">
          <CardContent className="p-6">
            <div className="grid lg:grid-cols-[1fr_1.2fr] gap-6">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-orange/15 text-orange flex items-center justify-center">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-text-primary">
                      {isSelectedCurrentPaidPlan ? `${selectedPlan?.name || 'Subscription'} Active` : `${selectedPlan?.name || 'Subscription'} Payment`}
                    </h3>
                    <p className="text-xs text-text-muted">Manual confirmation for Sierra Leone payments</p>
                  </div>
                </div>
                <div className="space-y-3 text-sm text-text-secondary">
                  {isSelectedCurrentPaidPlan ? (
                    <div className="rounded-xl border border-green/20 bg-green/10 p-4">
                      <p className="text-sm font-semibold text-green">✓ Active Now</p>
                      <p className="text-xs text-green/80 mt-1">Your {selectedPlan?.name || 'subscription'} has been confirmed by admin.</p>
                    </div>
                  ) : (
                    <>
                      <p className="font-semibold text-text-primary">Pay to this Orange Money Number:</p>
                      <div className="rounded-xl bg-black-elevated border border-white/10 p-4">
                        <p className="text-[10px] uppercase tracking-wider text-text-muted font-semibold">
                          {paymentConfig.paymentMethod} Number
                        </p>
                        <p className="font-mono text-2xl text-text-primary mt-1">{paymentConfig.paymentNumber}</p>
                        <p className="text-xs text-text-muted mt-2">
                          Amount: {paymentConfig.currency} {(billingPeriod === 'annual' ? selectedPlan?.annualPrice : selectedPlan?.monthlyPrice) || paymentConfig.proPrice}
                        </p>
                      </div>
                      <p className="text-sm font-medium text-text-primary">Next Step:</p>
                      <p className="text-xs text-text-muted">Take a screenshot of your payment receipt and upload it below. Our admin will verify and activate your {selectedPlan?.name} subscription.</p>
                    </>
                  )}
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-gold hover:text-gold/80 text-sm font-semibold mt-3"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Questions? Contact us on WhatsApp
                  </a>
                </div>
              </div>

              <div className="rounded-xl bg-black-elevated border border-white/10 p-4">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div>
                    <p className="text-sm font-semibold text-text-primary">
                      {isSelectedCurrentPaidPlan ? 'Subscription Status' : 'Upload Payment Proof'}
                    </p>
                    <p className="text-xs text-text-muted">
                      {isSelectedCurrentPaidPlan ? 'Admin confirmation complete' : 'Accepted: screenshot or PDF receipt'}
                    </p>
                  </div>
                  {isSelectedCurrentPaidPlan ? (
                    <Badge variant="outline" className="border-green/30 text-green">✓ Active</Badge>
                  ) : latestRequest?.plan === selectedPlanId ? (
                    <Badge variant="outline" className={`border-${latestRequest.status === 'pending' ? 'orange' : latestRequest.status === 'approved' ? 'green' : 'red'}/30 text-${latestRequest.status === 'pending' ? 'orange' : latestRequest.status === 'approved' ? 'green' : 'red'}`}>
                      {latestRequest.status === 'pending' ? '⏳ Pending' : latestRequest.status === 'approved' ? '✓ Approved' : '✗ Rejected'}
                    </Badge>
                  ) : null}
                </div>

                {(requestSent || hasPendingRequest) && !isSelectedCurrentPaidPlan && latestRequest?.plan === selectedPlanId && (
                  <div className="mb-4 rounded-lg border border-orange/20 bg-orange/10 p-3 text-xs text-orange">
                    <div className="flex items-start gap-2">
                      <span className="text-lg">⏳</span>
                      <div>
                        <p className="font-semibold">Request Sent!</p>
                        <p>Your subscription is pending admin confirmation. We'll check within 24 hours and notify you via email.</p>
                      </div>
                    </div>
                  </div>
                )}
                {latestRequest?.status === 'rejected' && latestRequest.plan === selectedPlanId && (
                  <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">
                    <p className="font-semibold">Request Rejected</p>
                    {latestRequest.adminNote ? (
                      <p className="mt-1">Reason: {latestRequest.adminNote}</p>
                    ) : (
                      <p className="mt-1">Please resubmit with a clearer receipt or contact support.</p>
                    )}
                  </div>
                )}
                {isSelectedCurrentPaidPlan && (
                  <div className="mb-4 rounded-lg border border-green/20 bg-green/10 p-3 text-xs text-green">
                    <p className="font-semibold">✓ Subscription Active</p>
                    <p className="mt-1">Enjoy unlimited access to premium features!</p>
                  </div>
                )}

                {!isSelectedCurrentPaidPlan && (
                  <>
                    <label className="block">
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,application/pdf"
                        onChange={onProofChange}
                        className="hidden"
                      />
                      <div className="border border-dashed border-white/15 rounded-xl p-5 text-center cursor-pointer hover:border-gold/40 transition-colors">
                        {selectedProof ? (
                          <div className="flex items-center justify-center gap-2 text-text-primary">
                            <FileText className="w-4 h-4 text-gold" />
                            <span className="text-sm font-semibold">{selectedProof.name}</span>
                          </div>
                        ) : (
                          <div className="text-text-muted">
                            <Upload className="w-6 h-6 mx-auto mb-2 text-gold" />
                            <p className="text-sm font-semibold">Choose screenshot or receipt</p>
                            <p className="text-xs text-text-muted mt-1">PNG, JPG, WEBP, or PDF (max 10MB)</p>
                          </div>
                        )}
                      </div>
                    </label>

                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      rows={2}
                      className="w-full mt-3 px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-gold/30 resize-none"
                      placeholder="Optional: transaction ID, sender name, or additional details"
                    />

                    <Button
                      type="button"
                      onClick={handleSubmitProof}
                      disabled={loading === 'pro-proof' || !selectedProof}
                      className="w-full mt-3 bg-gold-gradient text-black hover:opacity-90 font-semibold uppercase disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading === 'pro-proof' && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                      {loading === 'pro-proof' ? 'Submitting...' : hasPendingRequest && latestRequest?.plan === selectedPlanId ? 'Replace Proof & Resubmit' : 'Submit for Admin Review'}
                    </Button>
                    {hasPendingRequest && latestRequest?.plan === selectedPlanId && (
                      <p className="text-[11px] text-text-muted mt-2">
                        You already have a pending request. You can resubmit with a new proof to replace it.
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PLANS.map((plan, i) => {
          const Icon = plan.icon;
          const isCurrent = plan.id === currentPlan;
          const isPendingPlan = latestRequest?.plan === plan.id && hasPendingRequest && plan.id !== currentPlan;
          const displayPrice = getPlanPrice(plan);
          const savings = plan.monthlyPrice > 0 && billingPeriod === 'annual'
            ? plan.monthlyPrice * 12 - plan.annualPrice
            : 0;

          return (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
            >
              <Card
                className={`h-full bg-black-surface border transition-all duration-300 ${plan.highlighted
                  ? 'border-gold/40 shadow-[0_0_30px_rgba(212,162,74,0.08)]'
                  : 'border-dark-gray hover:border-gold/20'
                  }`}
              >
                <CardContent className="p-6 flex flex-col h-full">
                  {/* Header */}
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${plan.highlighted
                        ? 'bg-gold/20 text-gold'
                        : 'bg-black-elevated text-text-secondary'
                        }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-text-primary">{plan.name}</h3>
                        {savings > 0 && billingPeriod === 'annual' && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-green/15 text-green font-bold">
                            SAVE SLE {savings.toLocaleString()}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-text-muted">{plan.description}</p>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="mb-6">
                    <span className="text-4xl font-bold text-text-primary">
                      {displayPrice === 0 ? 'Free' : `SLE ${displayPrice.toLocaleString()}`}
                    </span>
                    {displayPrice > 0 && (
                      <span className="text-sm text-text-muted"> / {billingPeriod === 'annual' ? 'year' : plan.period}</span>
                    )}
                    {displayPrice > 0 && billingPeriod === 'monthly' && (
                      <p className="text-xs text-text-muted mt-1">
                        Or <span className="text-gold font-semibold">SLE {plan.annualPrice.toLocaleString()}/yr</span> annually
                      </p>
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
                    className={`w-full font-semibold uppercase ${plan.highlighted
                      ? 'bg-gold-gradient text-black hover:opacity-90'
                      : isCurrent
                        ? 'bg-black-elevated border border-dark-gray text-text-muted cursor-default'
                        : 'bg-black-elevated border border-dark-gray text-text-primary hover:border-gold/30'
                      }`}
                  >
                    {loading === plan.id ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : null}
                    {isCurrent ? 'Current Plan' : isPendingPlan ? 'Pending Review' : plan.cta}
                    {!isCurrent && displayPrice > 0 && billingPeriod === 'annual' && (
                      <span className="ml-1 text-xs opacity-70">(Annual)</span>
                    )}
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
                a: 'All prices are in Sierra Leonean Leone (SLE). Paid subscriptions are currently handled through Orange Money.',
              },
              {
                q: 'Do you offer yearly discounts?',
                a: 'Yearly billing can be arranged manually. Contact the platform on WhatsApp for details.',
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
