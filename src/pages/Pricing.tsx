import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check,
  Crown,
  Zap,
  Music,
  Headphones,
  ArrowRight,
  UploadCloud,
  Loader2,
  X,
  PhoneCall,
  Radio,
  Heart,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/api';
import { toast } from 'sonner';
import SEOHead from '@/components/SEOHead';
import { cn } from '@/lib/utils';

interface PlanDetails {
  id: 'free' | 'pro' | 'legend';
  name: string;
  badge?: string;
  monthlyPrice: number;
  annualPrice: number;
  description: string;
  icon: any;
  highlighted?: boolean;
  color: string;
  listenerPerks: string[];
  djPerks: string[];
}

const PLANS: PlanDetails[] = [
  {
    id: 'free',
    name: 'Free Fan',
    monthlyPrice: 0,
    annualPrice: 0,
    description: 'Essential streaming and discovery for every Sierra Leone music lover.',
    icon: Music,
    color: '#888888',
    listenerPerks: [
      'Unlimited free audio streaming',
      'Discover & follow top Sierra Leone DJs',
      'Create and manage custom playlists',
      'Drop live emoji reactions & likes',
      'Standard audio quality',
    ],
    djPerks: [
      'Public DJ profile & bio',
      'Upload up to 5 public mixes',
      'Basic play & follower counts',
      'Receive booking inquiries',
    ],
  },
  {
    id: 'pro',
    name: 'Pro Member',
    badge: 'MOST POPULAR',
    monthlyPrice: 100,
    annualPrice: 1000,
    description: 'For dedicated music lovers & working DJs who want unrestricted downloads and reach.',
    icon: Zap,
    highlighted: true,
    color: '#f4e059',
    listenerPerks: [
      'Unlimited 320kbps MP3 downloads',
      '100% Ad-free uninterrupted listening',
      'Access to exclusive & VIP mix sets',
      '100 monthly promotion boost points',
      'Verified Pro Listener badge on profile',
      'Early access to DJ event ticket sales',
    ],
    djPerks: [
      'Unlimited mix uploads (no file limits)',
      '100 monthly points to boost your mixes',
      'Advanced listener analytics & geo stats',
      'Priority placement in search & rankings',
      'Direct booking payments & requests',
      'Verified DJ checkmark eligible',
    ],
  },
  {
    id: 'legend',
    name: 'Pro+ VIP',
    badge: 'VIP PASS',
    monthlyPrice: 150,
    annualPrice: 1500,
    description: 'The ultimate VIP tier with live event ticket discounts, direct DJ support, and event ticketing.',
    icon: Crown,
    color: '#eab308',
    listenerPerks: [
      'Everything in Pro Member',
      'VIP Exclusive live sets & bootlegs',
      'Event ticket discounts (up to 20% off)',
      'Direct messaging & chat with Pro DJs',
      '1 Free monthly direct DJ subscription support',
      'Golden VIP badge on leaderboard & profile',
      'Priority 24/7 VIP support',
    ],
    djPerks: [
      'Everything in Pro DJ',
      'Ticketed events with QR code scanner',
      'Event RSVP, countdown & gallery uploads',
      'Homepage spotlight feature placement',
      'Custom DJ profile themes & branding',
      'Direct fan subscription monetization (keep 90%)',
      'Dedicated account manager & priority 24/7 support',
    ],
  },
];

export default function Pricing() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [audience, setAudience] = useState<'listeners' | 'djs'>('listeners');
  const [selectedPlan, setSelectedPlan] = useState<PlanDetails | null>(null);

  const { isAuthenticated, user } = useAuthStore();
  const navigate = useNavigate();

  // Modal checkout state
  const [paymentReference, setPaymentReference] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSelectPlan = (plan: PlanDetails) => {
    if (plan.id === 'free') {
      if (!isAuthenticated) navigate('/register');
      else navigate(user?.role === 'DJ' ? '/dashboard' : '/user/dashboard');
      return;
    }
    if (!isAuthenticated) {
      toast.info('Please log in or create an account to activate your subscription.');
      navigate('/login?redirect=/pricing');
      return;
    }
    setSelectedPlan(plan);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    toast.success('Payment receipt screenshot attached!');
  };

  const handleSubmitSubscription = async () => {
    if (!selectedPlan) return;
    if (!selectedFile && !paymentReference) {
      toast.error('Please attach your payment screenshot or enter your transaction reference.');
      return;
    }
    try {
      setSubmitting(true);
      const amount = billingCycle === 'monthly' ? selectedPlan.monthlyPrice : selectedPlan.annualPrice;
      const planCode = billingCycle === 'annual' ? `${selectedPlan.id}_annual` : selectedPlan.id;

      const formData = new FormData();
      formData.append('plan', planCode);
      formData.append('amount', String(amount));
      formData.append('currency', 'SLE');
      if (paymentReference) formData.append('paymentReference', paymentReference);
      if (selectedFile) formData.append('proof', selectedFile);

      const res = await api.post('/users/subscription/request', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.success) {
        toast.success(`🎉 Upgrade request submitted for ${selectedPlan.name}!`, {
          description: 'Our team is verifying your payment. Your perks will activate once approved.',
        });
        setSelectedPlan(null);
        setPaymentReference('');
        setSelectedFile(null);
        navigate(user?.role === 'DJ' ? '/dashboard/subscription' : '/user/subscription');
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Failed to submit upgrade request.';
      toast.error('Error', { description: errorMsg });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080808] text-text-primary pb-32">
      <SEOHead
        title="Membership & Pro Subscription Plans — Deck Salone"
        description="Upgrade to Deck Salone Pro or Pro+ VIP. Unlimited 320kbps MP3 downloads, ad-free streaming, exclusive mixes, and DJ monetization."
      />

      {/* ─── HERO HEADER ─── */}
      <section className="relative pt-12 pb-16 px-4 sm:px-6 overflow-hidden bg-gradient-to-b from-[#141410] via-[#0d0d0c] to-[#080808] border-b border-white/[0.06]">
        {/* Glow ambient background */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#f4e059]/10 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#f4e059]/10 border border-[#f4e059]/30 text-[#f4e059] text-xs font-bold uppercase tracking-widest mb-4">
            <Crown className="w-4 h-4" />
            Deck Salone Membership & Pro Plans
          </div>

          <h1 className="font-display text-3xl sm:text-5xl font-black uppercase tracking-tight text-white max-w-3xl mx-auto leading-tight">
            Unlock the Full Power of Sierra Leone's #1 DJ Platform
          </h1>

          {/* Toggle Switches */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
            {/* Audience Toggle (Listeners vs DJs) */}
            <div className="flex items-center p-1 rounded-2xl bg-white/[0.04] border border-white/[0.08] shadow-inner">
              <button
                onClick={() => setAudience('listeners')}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all',
                  audience === 'listeners'
                    ? 'bg-[#f4e059] text-black shadow-md shadow-[#f4e059]/20'
                    : 'text-text-secondary hover:text-white'
                )}
              >
                <Headphones className="w-4 h-4" />
                For Music Listeners & Fans
              </button>
              <button
                onClick={() => setAudience('djs')}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all',
                  audience === 'djs'
                    ? 'bg-[#f4e059] text-black shadow-md shadow-[#f4e059]/20'
                    : 'text-text-secondary hover:text-white'
                )}
              >
                <Radio className="w-4 h-4" />
                For DJs & Creators
              </button>
            </div>

            {/* Monthly vs Annual Toggle */}
            <div className="flex items-center p-1 rounded-2xl bg-white/[0.04] border border-white/[0.08]">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={cn(
                  'px-3.5 py-2 rounded-xl text-xs font-bold transition-all',
                  billingCycle === 'monthly'
                    ? 'bg-white text-black'
                    : 'text-text-secondary hover:text-white'
                )}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle('annual')}
                className={cn(
                  'px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5',
                  billingCycle === 'annual'
                    ? 'bg-white text-black'
                    : 'text-text-secondary hover:text-white'
                )}
              >
                <span>Annual</span>
                <span className="text-[9px] uppercase font-black px-1.5 py-0.2 rounded bg-green-500 text-white">
                  Save 20%
                </span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ─── PRICING CARDS GRID ─── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-stretch">
          {PLANS.map((plan) => {
            const Icon = plan.icon;
            const price = billingCycle === 'monthly' ? plan.monthlyPrice : plan.annualPrice;
            const perks = audience === 'listeners' ? plan.listenerPerks : plan.djPerks;

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  'relative rounded-3xl p-6 sm:p-8 flex flex-col justify-between transition-all border overflow-hidden',
                  plan.highlighted
                    ? 'bg-gradient-to-b from-[#1c1a12] via-[#121210] to-[#0e0e0d] border-[#f4e059] shadow-2xl shadow-[#f4e059]/15 md:-translate-y-2'
                    : 'bg-[#101010] border-white/[0.08] hover:border-white/[0.15]'
                )}
              >
                {/* Highlight Badge */}
                {plan.badge && (
                  <div
                    className={cn(
                      'absolute top-0 right-0 px-4 py-1 rounded-bl-2xl text-[10px] font-black uppercase tracking-widest shadow-md',
                      plan.highlighted
                        ? 'bg-[#f4e059] text-black'
                        : 'bg-white/10 text-white border-l border-b border-white/20'
                    )}
                  >
                    {plan.badge}
                  </div>
                )}

                <div>
                  {/* Top Icon & Title */}
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border"
                      style={{
                        backgroundColor: `${plan.color}15`,
                        borderColor: `${plan.color}30`,
                        color: plan.color,
                      }}
                    >
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-display text-xl font-bold uppercase tracking-tight text-white">
                        {plan.name}
                      </h3>
                      <p className="text-xs text-text-muted">
                        {audience === 'listeners' ? 'Fan Membership' : 'DJ Creator Tier'}
                      </p>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="mt-6 mb-4">
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-mono text-4xl sm:text-5xl font-black text-white">
                        {price === 0 ? 'FREE' : `SLE ${price}`}
                      </span>
                      {price > 0 && (
                        <span className="text-xs text-text-muted font-mono">
                          /{billingCycle === 'monthly' ? 'month' : 'year'}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-text-secondary mt-2 min-h-[32px]">
                      {plan.description}
                    </p>
                  </div>

                  {/* Perks List */}
                  <div className="pt-5 border-t border-white/[0.08] space-y-3">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                      What's Included:
                    </p>
                    {perks.map((perk, i) => (
                      <div key={i} className="flex items-start gap-2.5 text-xs text-text-secondary">
                        <Check className="w-4 h-4 text-[#f4e059] shrink-0 mt-0.5" />
                        <span>{perk}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* CTA Button */}
                <div className="mt-8 pt-4">
                  <button
                    onClick={() => handleSelectPlan(plan)}
                    className={cn(
                      'w-full py-3.5 rounded-full font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md',
                      plan.highlighted
                        ? 'bg-[#f4e059] hover:brightness-110 text-black shadow-[#f4e059]/25 active:scale-95'
                        : 'bg-white/[0.08] hover:bg-white/[0.15] text-white border border-white/[0.1]'
                    )}
                  >
                    {plan.id === 'free' ? (
                      'Get Started Free'
                    ) : (
                      <>
                        <span>Upgrade to {plan.name}</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ─── SUPPORT DJS SECTION ─── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-20">
        <div className="rounded-3xl bg-gradient-to-r from-[#181611] via-[#121210] to-[#15130f] border border-[#f4e059]/30 p-6 sm:p-10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-full bg-[#f4e059]/5 blur-[80px] pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="max-w-2xl space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#f4e059]/10 border border-[#f4e059]/30 text-[#f4e059] text-[11px] font-bold uppercase tracking-wider">
                <Heart className="w-3.5 h-3.5" />
                Support Sierra Leonean DJs
              </div>
              <h2 className="font-display text-2xl sm:text-3xl font-black uppercase text-white tracking-tight">
                Want to Support a Specific DJ Directly?
              </h2>
              <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                Send a one-time support payment of any amount directly to your favourite DJ on their profile. 100% of your support goes to the artist — no subscriptions, no fixed tiers.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
              <Link
                to="/discover"
                className="w-full sm:w-auto px-6 py-3.5 rounded-full bg-[#f4e059] hover:brightness-110 text-black font-bold text-xs uppercase tracking-wider transition-all text-center shadow-lg shadow-[#f4e059]/20"
              >
                Browse DJs to Support
              </Link>
              <Link
                to="/mixes"
                className="w-full sm:w-auto px-6 py-3.5 rounded-full bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] text-white font-bold text-xs uppercase tracking-wider transition-all text-center"
              >
                Explore Mixes
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── PAYMENT & ACTIVATION MODAL ─── */}
      {selectedPlan && (
        <AnimatePresence>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg rounded-3xl bg-[#141414] border border-[#f4e059]/40 shadow-2xl p-6 sm:p-8 space-y-5 overflow-hidden"
            >
              {/* Close Button */}
              <button
                onClick={() => setSelectedPlan(null)}
                className="absolute top-5 right-5 p-2 rounded-full bg-white/5 hover:bg-white/10 text-text-muted hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Modal Header */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#f4e059]/15 border border-[#f4e059]/30 text-[#f4e059] flex items-center justify-center">
                  <Crown className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-display text-xl font-bold uppercase text-white">
                    Upgrade to {selectedPlan.name}
                  </h3>
                  <p className="text-xs text-text-muted font-mono">
                    Total: SLE {billingCycle === 'monthly' ? selectedPlan.monthlyPrice : selectedPlan.annualPrice} / {billingCycle}
                  </p>
                </div>
              </div>

              {/* Mobile Money Payment Instructions */}
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-[#f4e059] flex items-center gap-1.5">
                  <PhoneCall className="w-3.5 h-3.5" /> Mobile Money Payment Details:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-3 rounded-xl bg-black/50 border border-white/5 space-y-0.5">
                    <span className="text-[10px] text-orange-400 font-bold uppercase">Orange Money</span>
                    <p className="font-mono text-white font-bold text-sm">+232 72 011156</p>
                    <span className="text-[10px] text-text-muted">Deck Salone Official</span>
                  </div>

                  <div className="p-3 rounded-xl bg-black/50 border border-white/5 space-y-0.5">
                    <span className="text-[10px] text-amber-400 font-bold uppercase">Afrimoney</span>
                    <p className="font-mono text-white font-bold text-sm">+232 79 188814</p>
                    <span className="text-[10px] text-text-muted">Deck Salone Official</span>
                  </div>
                </div>

                <p className="text-[11px] text-text-muted leading-relaxed">
                  Send <strong>SLE {billingCycle === 'monthly' ? selectedPlan.monthlyPrice : selectedPlan.annualPrice}</strong> via Orange Money or Afrimoney, then upload your SMS confirmation screenshot or enter your transaction ID below.
                </p>
              </div>

              {/* Reference ID input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-secondary uppercase">
                  Transaction / Reference ID (Optional)
                </label>
                <input
                  type="text"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="e.g. TXN98726154"
                  className="w-full h-11 px-4 rounded-xl bg-black/60 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-[#f4e059]"
                />
              </div>

              {/* Upload screenshot */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-secondary uppercase">
                  Payment SMS Receipt Screenshot
                </label>
                {selectedFile ? (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-green-500/10 border border-green-500/30 text-xs text-green-400">
                    <span className="truncate max-w-[280px]">✓ {selectedFile.name}</span>
                    <button
                      type="button"
                      onClick={() => setSelectedFile(null)}
                      className="text-text-muted hover:text-red-400 text-xs font-bold shrink-0 ml-2"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center p-4 rounded-xl bg-black/60 border border-dashed border-white/20 hover:border-[#f4e059] cursor-pointer transition-colors">
                    <UploadCloud className="w-5 h-5 text-[#f4e059] mb-1" />
                    <span className="text-xs text-text-secondary">Click to attach Orange Money / Afrimoney screenshot</span>
                    <span className="text-[10px] text-text-muted mt-0.5">PNG, JPG, JPEG, WEBP up to 10MB</span>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Submit CTA */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleSubmitSubscription}
                  disabled={submitting}
                  className="w-full py-3.5 rounded-full bg-[#f4e059] hover:brightness-110 text-black font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-[#f4e059]/25 disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-black" />
                      <span>Submitting Request...</span>
                    </>
                  ) : (
                    <span>Confirm & Activate Subscription</span>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        </AnimatePresence>
      )}
    </div>
  );
}
