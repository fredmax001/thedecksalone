import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Crown,
  Music,
  ArrowRight,
  Headphones,
  Download,
  Sparkles,
  Loader2,
  ExternalLink,
  Clock,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/api';
import SEOHead from '@/components/SEOHead';

interface SubscriptionRequest {
  id: string;
  plan: string;
  amount: number;
  currency: string;
  status: 'pending' | 'approved' | 'rejected';
  adminNote?: string;
  reviewedAt?: string;
  createdAt: string;
}

interface SubscriptionStatus {
  tier: string;
  activatedAt?: string;
  latestRequest?: SubscriptionRequest | null;
}

export default function UserSubscription() {
  const { user, fetchMe } = useAuthStore();
  const [subscribedDjs, setSubscribedDjs] = useState<any[]>([]);
  const [loadingDjs, setLoadingDjs] = useState(true);
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);

  useEffect(() => {
    // Refresh the auth user so subscriptionTier from /auth/me is up to date
    fetchMe().catch(() => {});

    const fetchData = async () => {
      try {
        setLoadingDjs(true);
        setLoadingStatus(true);

        const [subsRes, statusRes] = await Promise.all([
          api.get('/users/my-dj-subscriptions').catch(() => ({ data: { success: false } })),
          api.get('/users/subscription/status').catch(() => ({ data: { success: false } })),
        ]);

        if (subsRes.data.success) {
          setSubscribedDjs(subsRes.data.data || []);
        } else {
          setSubscribedDjs([]);
        }

        if (statusRes.data.success) {
          setStatus(statusRes.data.data);
        }
      } catch (err) {
        setSubscribedDjs([]);
      } finally {
        setLoadingDjs(false);
        setLoadingStatus(false);
      }
    };

    fetchData();
  }, [fetchMe]);

  const userTier = (status?.tier || user?.subscriptionTier || 'free').toLowerCase();
  const isPro = userTier === 'pro' || userTier === 'legend';
  const isLegend = userTier === 'legend';
  const latestRequest = status?.latestRequest;

  return (
    <div className="space-y-8 pb-16">
      <SEOHead
        title="My Membership & Subscriptions — Deck Salone"
        description="Manage your Deck Salone user subscription tier, unlock 320kbps MP3 downloads, and view your subscribed Sierra Leone DJs."
      />

      {/* ─── HEADER BANNER ─── */}
      <div className="relative rounded-3xl bg-gradient-to-r from-[#1c1a12] via-[#121210] to-[#141412] border border-[#f4e059]/30 p-6 sm:p-8 overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-full bg-[#f4e059]/5 blur-[80px] pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#f4e059]/10 border border-[#f4e059]/30 text-[#f4e059] text-xs font-bold uppercase tracking-wider">
              <Crown className="w-3.5 h-3.5" />
              Current Plan: {isLegend ? 'PRO+ VIP' : isPro ? 'PRO MEMBER' : 'FREE FAN'}
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-black uppercase text-white tracking-tight">
              Membership & Subscriptions
            </h1>
            <p className="text-xs sm:text-sm text-text-secondary max-w-xl">
              {isLegend
                ? 'You are enjoying full Pro+ VIP perks: unlimited downloads, VIP exclusive sets, ticket discounts, and direct DJ support.'
                : isPro
                ? 'You have active Pro access: unlimited 320kbps downloads, ad-free streaming, and mix promotion points.'
                : 'You are on the Free Fan plan. Upgrade to Pro for SLE 100/mo or Pro+ VIP for SLE 150/mo to unlock unlimited MP3 downloads and exclusive sets.'}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              to="/pricing"
              className="px-6 py-3 rounded-full bg-[#f4e059] hover:brightness-110 text-black font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-[#f4e059]/20"
            >
              {isLegend ? 'Manage Membership' : 'Upgrade Plan →'}
            </Link>
          </div>
        </div>
      </div>

      {/* ─── STATUS / PENDING REQUEST BANNER ─── */}
      {loadingStatus ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-5 h-5 text-[#f4e059] animate-spin" />
        </div>
      ) : latestRequest ? (
        <div
          className={`rounded-2xl border p-5 flex flex-col sm:flex-row sm:items-center gap-4 ${
            latestRequest.status === 'pending'
              ? 'bg-amber-500/5 border-amber-500/30'
              : latestRequest.status === 'approved'
              ? 'bg-green-500/5 border-green-500/30'
              : 'bg-red-500/5 border-red-500/30'
          }`}
        >
          <div className="shrink-0">
            {latestRequest.status === 'pending' ? (
              <Clock className="w-8 h-8 text-amber-400" />
            ) : latestRequest.status === 'approved' ? (
              <CheckCircle2 className="w-8 h-8 text-green-400" />
            ) : (
              <XCircle className="w-8 h-8 text-red-400" />
            )}
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold uppercase text-white">
              {latestRequest.status === 'pending'
                ? 'Subscription Request Pending'
                : latestRequest.status === 'approved'
                ? 'Subscription Approved'
                : 'Subscription Request Rejected'}
            </h3>
            <p className="text-xs text-text-secondary mt-1">
              {latestRequest.status === 'pending'
                ? `Your ${latestRequest.plan.replace('_', ' ')} upgrade request (SLE ${latestRequest.amount}) is being reviewed by our team. This usually takes a few hours.`
                : latestRequest.status === 'approved'
                ? `Your ${latestRequest.plan.replace('_', ' ')} subscription has been activated. Enjoy your perks!`
                : `Your ${latestRequest.plan.replace('_', ' ')} request was not approved. ${
                    latestRequest.adminNote ? `Note: ${latestRequest.adminNote}` : 'Please contact support for more information.'
                  }`}
            </p>
          </div>
          {latestRequest.status === 'rejected' && (
            <Link
              to="/pricing"
              className="px-5 py-2.5 rounded-full bg-[#f4e059] text-black font-bold text-xs uppercase tracking-wider hover:brightness-110 transition-all shrink-0 text-center"
            >
              Try Again
            </Link>
          )}
        </div>
      ) : null}

      {/* ─── ACTIVE PERKS OVERVIEW ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-[#121110] border border-white/[0.06] p-5 space-y-2">
          <div className="w-10 h-10 rounded-xl bg-[#f4e059]/10 border border-[#f4e059]/30 text-[#f4e059] flex items-center justify-center">
            <Download className="w-5 h-5" />
          </div>
          <h3 className="font-display text-sm font-bold uppercase text-white">Audio Downloads</h3>
          <p className="text-xs text-text-secondary">
            {isPro || isLegend ? 'Unlimited 320kbps MP3 downloads unlocked' : 'Requires Pro membership (SLE 100/mo)'}
          </p>
        </div>

        <div className="rounded-2xl bg-[#121110] border border-white/[0.06] p-5 space-y-2">
          <div className="w-10 h-10 rounded-xl bg-[#f4e059]/10 border border-[#f4e059]/30 text-[#f4e059] flex items-center justify-center">
            <Music className="w-5 h-5" />
          </div>
          <h3 className="font-display text-sm font-bold uppercase text-white">Exclusive Mixes</h3>
          <p className="text-xs text-text-secondary">
            {isPro || isLegend ? 'Full access to exclusive DJ sets and private mixes' : 'Upgrade to listen to exclusive releases'}
          </p>
        </div>

        <div className="rounded-2xl bg-[#121110] border border-white/[0.06] p-5 space-y-2">
          <div className="w-10 h-10 rounded-xl bg-[#f4e059]/10 border border-[#f4e059]/30 text-[#f4e059] flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <h3 className="font-display text-sm font-bold uppercase text-white">Promotion Points</h3>
          <p className="text-xs text-text-secondary">
            {isPro || isLegend ? 'Gain points to boost your favourite DJ mixes' : 'Subscribe to get 100 monthly boost points'}
          </p>
        </div>
      </div>

      {/* ─── MY SUBSCRIBED DJS SECTION ─── */}
      <div className="rounded-3xl bg-[#101010] border border-white/[0.06] p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-bold uppercase text-white tracking-tight flex items-center gap-2">
              <Headphones className="w-5 h-5 text-[#f4e059]" />
              My Subscribed DJs
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              Individual Sierra Leone DJs you have subscribed to directly for private sets and exclusive content.
            </p>
          </div>

          <Link
            to="/discover"
            className="inline-flex items-center gap-1 text-xs text-[#f4e059] font-bold hover:underline"
          >
            Explore More DJs <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loadingDjs ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-[#f4e059] animate-spin" />
          </div>
        ) : subscribedDjs.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-2xl bg-white/[0.02] border border-dashed border-white/10 space-y-3">
            <div className="w-12 h-12 rounded-full bg-white/[0.04] text-text-muted flex items-center justify-center mx-auto">
              <Headphones className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-white uppercase">No DJ Subscriptions Yet</h3>
            <p className="text-xs text-text-secondary max-w-md mx-auto">
              You haven't subscribed to any individual DJs directly yet. Visit any DJ's profile to subscribe from just <strong>SLE 50/mo</strong> and unlock their private mix releases!
            </p>
            <Link
              to="/discover"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#f4e059] text-black font-bold text-xs uppercase shadow-md shadow-[#f4e059]/20 hover:brightness-110 transition-all mt-2"
            >
              Browse DJs to Support
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {subscribedDjs.map((sub: any) => (
              <div
                key={sub.id}
                className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-[#141414] border border-white/[0.06] hover:border-[#f4e059]/40 transition-all"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={sub.dj?.avatar || '/default-avatar.jpg'}
                    alt={sub.dj?.stageName || 'DJ'}
                    className="w-12 h-12 rounded-full object-cover border border-[#f4e059]/40 shrink-0"
                  />
                  <div className="min-w-0">
                    <h4 className="font-display text-sm font-bold text-white truncate">
                      {sub.dj?.stageName}
                    </h4>
                    <span className="text-[10px] text-green-400 font-mono flex items-center gap-1">
                      ✓ VIP Fan Active
                    </span>
                  </div>
                </div>

                <Link
                  to={`/dj/${sub.dj?.username || sub.dj?.id}`}
                  className="p-2 rounded-xl bg-white/[0.04] hover:bg-[#f4e059] hover:text-black text-text-muted transition-all shrink-0"
                  title="Visit Profile"
                >
                  <ExternalLink className="w-4 h-4" />
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
