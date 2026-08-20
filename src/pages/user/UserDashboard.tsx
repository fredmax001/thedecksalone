import { Link, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  CalendarCheck,
  MessageSquare,
  Users,
  Activity,
  Bell,
  User,
  Settings,
  ArrowRight,
  Crown,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

import { ProfileCompletionCard } from '@/components/ProfileCompletionCard';

const quickLinks = [
  { icon: Crown, label: 'Membership & Pro', path: '/user/subscription', desc: 'Manage perks & DJ subscriptions' },
  { icon: CalendarCheck, label: 'My Bookings', path: '/user/bookings', desc: 'View & manage your bookings' },
  { icon: MessageSquare, label: 'Messages', path: '/user/messages', desc: 'Chat with DJs' },
  { icon: Users, label: 'Following', path: '/user/following', desc: 'DJs you follow' },
  { icon: Activity, label: 'My Activity', path: '/user/activity', desc: 'Likes, ratings & votes' },
  { icon: Bell, label: 'Notifications', path: '/user/notifications', desc: 'Updates & alerts' },
  { icon: User, label: 'Profile', path: '/user/profile', desc: 'Edit your profile' },
  { icon: Settings, label: 'Settings', path: '/user/settings', desc: 'Account preferences' },
];

export default function UserDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const displayName = user?.username || user?.email?.split('@')[0] || 'Fan';
  const userTier = user?.subscriptionTier?.toLowerCase() || 'free';
  const isPro = userTier === 'pro' || userTier === 'legend';
  const isLegend = userTier === 'legend';

  useEffect(() => {
    if (user?.role === 'MODERATOR') {
      navigate('/moderator', { replace: true });
    }
  }, [user, navigate]);

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="rounded-2xl bg-[#101010] border border-white/5 p-6 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#f4e059]/50 to-transparent"></div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-text-primary font-display">
              Welcome back, {displayName}! 👋
            </h1>
            {isLegend ? (
              <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded bg-gradient-to-r from-amber-400 to-[#f4e059] text-black shadow">
                PRO+ VIP
              </span>
            ) : isPro ? (
              <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded bg-[#f4e059]/20 text-[#f4e059] border border-[#f4e059]/30">
                PRO USER
              </span>
            ) : (
              <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-white/10 text-text-muted">
                FREE FAN
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-text-muted">
            Here's what's happening in your Deck Salone space today.
          </p>
        </div>

        <Link
          to="/pricing"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#f4e059] hover:brightness-110 text-black text-xs font-bold uppercase tracking-wider shadow-md shadow-[#f4e059]/20 transition-all shrink-0"
        >
          <Crown className="w-3.5 h-3.5" />
          {isLegend ? 'VIP Perks Active' : isPro ? 'Upgrade to Pro+' : 'Upgrade to Pro (SLE 100)'}
        </Link>
      </motion.div>

      {/* Profile Completion 5-Step Checklist */}
      <ProfileCompletionCard />

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Bookings" value="0" icon={CalendarCheck} />
        <StatCard label="Messages" value="0" icon={MessageSquare} />
        <StatCard label="Following" value="0" icon={Users} />
        <StatCard label="Notifications" value="0" icon={Bell} />
      </div>

      {/* Quick Links Grid */}
      <div>
        <h2 className="text-sm font-bold text-white uppercase tracking-wider pl-3 border-l-2 border-[#f4e059] mb-4">Quick Navigation</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickLinks.map((link, i) => (
            <motion.div
              key={link.path}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
            >
              <Link
                to={link.path}
                className="group rounded-2xl bg-[#101010] border border-white/5 hover:border-[#f4e059]/30 hover:bg-[#f4e059]/5 transition-all p-4 flex items-center gap-4"
              >
                <div className="w-11 h-11 rounded-xl bg-[#f4e059]/10 group-hover:bg-[#f4e059]/20 flex items-center justify-center transition-colors">
                  <link.icon className="w-5 h-5 text-[#f4e059]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-text-primary transition-colors">
                    {link.label}
                  </p>
                  <p className="text-xs text-text-muted truncate">{link.desc}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-text-muted group-hover:text-[#f4e059] transition-colors" />
              </Link>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Recent Activity Placeholder */}
      <div className="rounded-2xl bg-[#101010] border border-white/5 p-6">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider pl-3 border-l-2 border-[#f4e059] mb-4">Recent Activity</h2>
        <div className="text-center py-8">
          <div className="w-16 h-16 rounded-full bg-white/[0.02] flex items-center justify-center mx-auto mb-4 border border-white/5">
            <Activity className="w-8 h-8 text-text-muted" />
          </div>
          <p className="text-sm font-semibold text-white">No recent activity yet.</p>
          <p className="text-xs text-text-muted mt-1 max-w-sm mx-auto">
            Start exploring mixes, events, and DJs to see your activity here.
          </p>
          <Link
            to="/discover"
            className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 bg-[#f4e059] text-black text-sm font-bold rounded-lg hover:bg-[#f4e059]/90 transition-colors"
          >
            Explore Deck Salone
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon }: { label: string; value: string; icon: React.ElementType }) {
  return (
    <div className="rounded-2xl bg-[#101010] border border-white/5 p-5 hover:border-[#f4e059]/20 transition-all group flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="w-10 h-10 rounded-xl bg-[#f4e059]/10 flex items-center justify-center">
          <Icon className="w-5 h-5 text-[#f4e059]" />
        </div>
      </div>
      <div>
        <p className="font-mono text-2xl font-bold text-text-primary">{value}</p>
        <p className="text-[10px] uppercase tracking-wider text-text-muted font-semibold mt-1">{label}</p>
      </div>
    </div>
  );
}
