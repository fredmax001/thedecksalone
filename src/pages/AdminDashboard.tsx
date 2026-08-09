import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  ResponsiveContainer, BarChart, Bar,
  PieChart, Pie, Cell,
} from 'recharts';
import {
  LayoutDashboard, Users, CalendarCheck,
  CheckCircle2, Play, Server,
  ChevronRight, Radio, Mic,
  Menu, Crown, LogOut, Volume2,
  BarChart2, MonitorPlay, AudioLines,
  BadgeCheck, Ban,
  Loader2, Search, Save, Eye, Trash2, Star, Lock, ChevronLeft,
  Settings, Bell, AlertTriangle,
  Music, DollarSign, Calendar,
  Check, X as XIcon,
  Package,
  HardDrive,
  Shield,
  Megaphone,
  ExternalLink,
  CreditCard,
  BellRing,
  Send,
  Clock,
  Trophy,
  Plus,
  FileText,
  Globe,
  Ticket,
  QrCode,
  Wallet,
  RefreshCcw,
  Mail,
  ShieldAlert,
  Upload,
  Gift,
  Share2,
  Copy,
} from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import { useAuthStore } from '@/stores/authStore';
import { useNavigate } from 'react-router-dom';
import {
  useAdminStats, useAdminAnalytics, useAdminDjs,
  useAdminRankings, useAdminMixes, useAdminBookings,
  useAdminEvents, useAdminUsers,
  useAdminEventTicketingStats, useAdminEventTickets,
  useAdminEventScanLogs, useSuspendEvent, useRestoreEvent,
  useAdminPayments, useAdminStaff,
  useAdminSystem, useAdminNotifications,
  useMarkAdminNotificationsRead, useClearAdminNotifications,
  useAdminSecurityLogs, useAdminSubscriptions,
  useAdminGeography,
  useAdminAds, useAdminPlatforms,
  useAdminBattles, useCreateBattle, useCloseBattle,
  useVerifyDj, useToggleDjSuspend, useDeleteDj,
  useCreateAd, useUpdateAd, useAdminVerificationRequests,
  useRejectDjVerification, useRequestDjInfo,
  useUpdateCampaignStatus,
  useToggleMixFeature, useToggleMixVisibility, useUpdateBookingStatus,
  useUpdateUserRole, useUpdateUserStatus, useRecalculateRankings,
  useSendNotification, useDeleteMix, useUpdateRanking,
  useNotifyTop3Rankings, useUploadNotifMedia,
  useTestEmail, useAdminPromo, useActivatePromo, useGrantPlan,
  useAdminBirthdays, useSendBirthdayWish, useTriggerBirthdayCron,
  useAdminSystemErrors, useTriggerBugReportDigest, useSendCustomEmail,
  useIncompleteProfiles, useSendProfileNudge,


  useAdminProSubscriptionRequests,
  useApproveProSubscriptionRequest,
  useRejectProSubscriptionRequest,
  useAdminSubscriptionConfig,
  useUpdateSubscriptionConfig,

  useAdminOpportunities,
  useToggleDjHallOfFame,
  useToggleMixHallOfFame,
} from '@/hooks/useAdmin';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '@/lib/api';

/* ─────────────────────── Types ─────────────────────── */

type AdminSection =
  | 'dashboard' | 'djs' | 'rankings' | 'mixes' | 'bookings'
  | 'users' | 'events' | 'revenue' | 'analytics' | 'platforms'
  | 'verification' | 'notifications' | 'subscriptions' | 'security'
  | 'ads' | 'roles' | 'settings' | 'battles' | 'opportunities'
  | 'halloffame' | 'violations' | 'promo';

interface SidebarItem {
  id: AdminSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  group: 'Control' | 'Marketplace' | 'Growth' | 'Operations' | 'System';
}

/* ─────────────────────── Sidebar Navigation ─────────────────────── */

const sidebarItems: SidebarItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, group: 'Control' },
  { id: 'analytics', label: 'Analytics', icon: BarChart2, group: 'Control' },
  { id: 'revenue', label: 'Revenue', icon: DollarSign, group: 'Control' },
  { id: 'djs', label: 'DJs', icon: Mic, group: 'Marketplace' },
  { id: 'users', label: 'Users', icon: Users, group: 'Marketplace' },
  { id: 'verification', label: 'Verification', icon: BadgeCheck, group: 'Marketplace' },
  { id: 'halloffame', label: 'Hall of Fame', icon: Trophy, group: 'Marketplace' },
  { id: 'rankings', label: 'Rankings', icon: Star, group: 'Marketplace' },
  { id: 'mixes', label: 'Mixes', icon: Music, group: 'Marketplace' },
  { id: 'bookings', label: 'Bookings', icon: CalendarCheck, group: 'Operations' },
  { id: 'events', label: 'Events', icon: Calendar, group: 'Operations' },
  { id: 'violations', label: 'Violations & Alerts', icon: ShieldAlert, group: 'Operations' },
  { id: 'battles', label: 'DJ Battles', icon: Trophy, group: 'Operations' },
  { id: 'subscriptions', label: 'Subscriptions', icon: CreditCard, group: 'Operations' },
  { id: 'opportunities', label: 'Opportunities', icon: Plus, group: 'Growth' },
  { id: 'promo', label: 'Promo & Referrals', icon: Gift, group: 'Growth' },
  { id: 'ads', label: 'Ads Manager', icon: Megaphone, group: 'Growth' },
  { id: 'notifications', label: 'Notifications', icon: BellRing, group: 'Growth' },
  { id: 'platforms', label: 'API & Integrations', icon: Server, group: 'System' },
  { id: 'security', label: 'Security Logs', icon: Shield, group: 'System' },
  { id: 'roles', label: 'Roles & Permissions', icon: Crown, group: 'System' },
  { id: 'settings', label: 'Settings', icon: Settings, group: 'System' },
];

const sidebarGroups = ['Control', 'Marketplace', 'Operations', 'Growth', 'System'] as const;

/* ─────────────────────── Helpers ─────────────────────── */

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    verified: { label: 'Verified', color: '#22C55E', bg: 'rgba(34,197,94,0.1)' },
    active: { label: 'Active', color: '#22C55E', bg: 'rgba(34,197,94,0.1)' },
    pending: { label: 'Pending', color: '#F97316', bg: 'rgba(249,115,22,0.1)' },
    suspended: { label: 'Suspended', color: '#EF4444', bg: 'rgba(239,68,68,0.1)' },
    upcoming: { label: 'Upcoming', color: '#3B82F6', bg: 'rgba(59,130,246,0.1)' },
    completed: { label: 'Completed', color: '#22C55E', bg: 'rgba(34,197,94,0.1)' },
    cancelled: { label: 'Cancelled', color: '#EF4444', bg: 'rgba(239,68,68,0.1)' },
    featured: { label: 'Featured', color: '#D4A24A', bg: 'rgba(212,162,74,0.1)' },
    user: { label: 'User', color: '#3B82F6', bg: 'rgba(59,130,246,0.1)' },
    dj: { label: 'DJ', color: '#22C55E', bg: 'rgba(34,197,94,0.1)' },
    admin: { label: 'Admin', color: '#D4A24A', bg: 'rgba(212,162,74,0.1)' },
    moderator: { label: 'Moderator', color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)' },
    success: { label: 'Success', color: '#22C55E', bg: 'rgba(34,197,94,0.1)' },
    failed: { label: 'Failed', color: '#EF4444', bg: 'rgba(239,68,68,0.1)' },
    connected: { label: 'Connected', color: '#22C55E', bg: 'rgba(34,197,94,0.1)' },
    disconnected: { label: 'Disconnected', color: '#EF4444', bg: 'rgba(239,68,68,0.1)' },
    info: { label: 'Info', color: '#3B82F6', bg: 'rgba(59,130,246,0.1)' },
    warning: { label: 'Warning', color: '#F97316', bg: 'rgba(249,115,22,0.1)' },
    critical: { label: 'Critical', color: '#EF4444', bg: 'rgba(239,68,68,0.1)' },
    paused: { label: 'Paused', color: '#F97316', bg: 'rgba(249,115,22,0.1)' },
    draft: { label: 'Draft', color: '#6B7280', bg: 'rgba(107,114,128,0.1)' },
    pending_payment: { label: 'Pending Payment', color: '#F97316', bg: 'rgba(249,115,22,0.1)' },
    rejected: { label: 'Rejected', color: '#EF4444', bg: 'rgba(239,68,68,0.1)' },
    info_requested: { label: 'Info Requested', color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)' },
    approved: { label: 'Approved', color: '#22C55E', bg: 'rgba(34,197,94,0.1)' },
    pro: { label: 'Pro', color: '#D4A24A', bg: 'rgba(212,162,74,0.1)' },
    legend: { label: 'Pro+', color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)' },
  };
  const s = map[status.toLowerCase()] ?? { label: status, color: '#6B6B6B', bg: 'rgba(107,107,107,0.1)' };
  return (
    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full" style={{ color: s.color, background: s.bg }}>
      {s.label}
    </span>
  );
}

function SectionHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h2 className="font-display text-xl font-bold uppercase tracking-tight text-text-primary">{title}</h2>
        {subtitle && <p className="text-sm text-text-muted mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

type TimeRange = '1m' | '3m' | '6m' | '12m' | 'all';

function TimeRangeSelector({ selected, onChange }: { selected: TimeRange; onChange: (range: TimeRange) => void }) {
  const options: { id: TimeRange; label: string }[] = [
    { id: '1m', label: '1 Month' },
    { id: '3m', label: '3 Months' },
    { id: '6m', label: '6 Months' },
    { id: '12m', label: '1 Year' },
    { id: 'all', label: 'All Time' },
  ];

  return (
    <div className="inline-flex items-center p-1 rounded-xl bg-white/[0.04] border border-white/10 gap-1">
      <Calendar className="w-3.5 h-3.5 text-[#D4A24A] ml-2 mr-1 opacity-80" />
      {options.map((opt) => {
        const isActive = selected === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all duration-200 ${
              isActive
                ? 'bg-[#D4A24A] text-black shadow-md shadow-[#D4A24A]/20'
                : 'text-text-muted hover:text-text-primary hover:bg-white/[0.06]'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function LoadingCenter() {
  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-10 h-10 text-[#D4A24A] animate-spin" />
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return <p className="text-sm text-text-muted text-center py-8">{message}</p>;
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="rounded-2xl p-5 border border-white/5" style={{ background: 'var(--bg-card)' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}15` }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
      </div>
      <p className="text-2xl font-bold text-text-primary">{value}</p>
      <p className="text-xs text-text-muted mt-1 uppercase tracking-wider">{label}</p>
    </div>
  );
}

function formatCompact(value: number) {
  return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(value || 0);
}

function formatCurrency(value: number) {
  return `SLE ${new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(value || 0)}`;
}

/* ─────────────────────── Section 1: Dashboard ─────────────────────── */

function DashboardSection() {
  const [timeRange, setTimeRange] = useState<TimeRange>('6m');
  const { data: stats, isLoading, error } = useAdminStats();
  const { data: analytics } = useAdminAnalytics(timeRange);
  const { data: djsData } = useAdminDjs({ limit: 100 });
  const { data: geography } = useAdminGeography();

  const priorityData = [
    { label: 'Pending Verifications', value: stats?.pendingVerifications || 0, icon: BadgeCheck, color: '#F97316', detail: 'DJ profiles waiting for review' },
    { label: 'Pending Bookings', value: stats?.pendingBookings || 0, icon: CalendarCheck, color: '#3B82F6', detail: 'Booking requests needing attention' },
    { label: 'Monthly Revenue', value: formatCurrency(stats?.estimatedRevenue || 0), icon: DollarSign, color: '#22C55E', detail: 'Payments and subscriptions' },
    { label: 'Visits Today', value: formatCompact(stats?.totalVisitsToday || 0), icon: Globe, color: '#EC4899', detail: `${formatCompact(stats?.uniqueVisitorsToday || 0)} unique visitors` },
  ];

  const healthData = [
    { label: 'DJs', value: formatCompact(stats?.totalDjs || 0), icon: Mic, color: '#D4A24A' },
    { label: 'Users', value: formatCompact(stats?.totalUsers || 0), icon: Users, color: '#3B82F6' },
    { label: 'Mixes', value: formatCompact(stats?.totalMixes || 0), icon: Music, color: '#8B5CF6' },
    { label: 'Streams', value: formatCompact(stats?.totalStreams || 0), icon: Play, color: '#F97316' },
    { label: 'Bookings', value: formatCompact(stats?.totalBookings || 0), icon: CalendarCheck, color: '#22C55E' },
    { label: 'Events', value: formatCompact(stats?.totalEvents || 0), icon: Calendar, color: '#06B6D4' },
    { label: 'Monthly Visits', value: formatCompact(stats?.totalVisitsMonth || 0), icon: Globe, color: '#EC4899' },
    { label: 'Battles', value: formatCompact(stats?.activeBattles || 0), icon: Trophy, color: '#D4A24A' },
  ];

  const mixesData = useMemo(() => {
    if (!analytics || analytics.length === 0) return [];
    return analytics.map((a: any) => ({ month: a.month, mixes: a.mixes || 0 }));
  }, [analytics]);

  const djGrowthData = useMemo(() => {
    if (!analytics || analytics.length === 0) return [];
    return analytics.map((a: any) => ({ month: a.month, djs: a.djs || 0 }));
  }, [analytics]);

  const bookingTrendData = useMemo(() => {
    if (!analytics || analytics.length === 0) return [];
    return analytics.map((a: any) => ({ month: a.month, bookings: a.bookings || 0 }));
  }, [analytics]);

  const revenueGrowthData = useMemo(() => {
    if (!analytics || analytics.length === 0) return [];
    return analytics.map((a: any) => ({ month: a.month, revenue: a.revenue || 0 }));
  }, [analytics]);

  const visitsData = useMemo(() => {
    if (!analytics || analytics.length === 0) return [];
    return analytics.map((a: any) => ({ month: a.month, visits: a.visits || 0 }));
  }, [analytics]);

  const topGenres = useMemo(() => {
    if (!djsData?.data) return [];
    const counts: Record<string, number> = {};
    djsData.data.forEach((dj: any) => {
      (dj.genres || []).forEach((g: string) => { counts[g] = (counts[g] || 0) + 1; });
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [djsData]);

  if (isLoading) return <LoadingCenter />;

  if (error) return (
    <div className="rounded-2xl border border-red-500/20 p-6 text-center" style={{ background: 'var(--bg-error)' }}>
      <p className="text-red-400 font-medium">Failed to load data</p>
      <p className="text-red-400/60 text-sm mt-1">{(error as any)?.response?.data?.error || (error as any)?.message || 'Unknown error'}</p>
    </div>
  );

  return (
    <div className="space-y-7">
      <div className="rounded-2xl border border-white/10 bg-[#101010] p-5 md:p-6 overflow-hidden relative">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#D4A24A]/60 to-transparent" />
        <div className="grid gap-5 xl:grid-cols-[1.1fr_1.9fr] xl:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#D4A24A]">Admin command center</p>
            <h2 className="mt-2 font-display text-2xl font-bold uppercase tracking-tight text-text-primary">Deck Salone operations</h2>
            <p className="mt-2 max-w-2xl text-sm text-text-muted">
              Live health, revenue, verification, bookings, content and growth signals in one place.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {priorityData.map((kpi) => (
              <div key={kpi.label} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">{kpi.label}</p>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${kpi.color}1A` }}>
                    <kpi.icon className="w-4 h-4" style={{ color: kpi.color }} />
                  </div>
                </div>
                <p className="mt-3 font-mono text-2xl font-bold text-text-primary">{kpi.value}</p>
                <p className="mt-1 text-xs text-text-muted">{kpi.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
        {healthData.map((kpi, i) => (
          <motion.div
            key={kpi.label}
            className="rounded-xl p-4 border border-white/10 hover:border-gold/30 transition-all duration-300"
            style={{ background: 'var(--bg-card)' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.4 }}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${kpi.color}1A` }}>
                <kpi.icon className="w-4 h-4" style={{ color: kpi.color }} />
              </div>
              <p className="font-mono text-xl font-bold text-text-primary truncate">{kpi.value}</p>
            </div>
            <p className="mt-3 text-[10px] uppercase tracking-wider text-text-muted font-bold truncate">{kpi.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
        <div>
          <h3 className="font-display text-lg font-bold uppercase tracking-tight text-text-primary">Performance & Growth Trends</h3>
          <p className="text-xs text-text-muted">Filter analytics data by time period</p>
        </div>
        <TimeRangeSelector selected={timeRange} onChange={setTimeRange} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <motion.div className="rounded-2xl p-6 border border-white/5" style={{ background: 'var(--bg-card)' }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#D4A24A] mb-4">Monthly Mix Uploads</p>
          {mixesData.length > 0 ? (
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mixesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E1E1E" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6B6B6B' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#6B6B6B' }} />
                  <Area type="monotone" dataKey="mixes" stroke="#D4A24A" fill="rgba(212,162,74,0.1)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[260px] flex items-center justify-center"><p className="font-mono text-text-muted">--</p></div>
          )}
        </motion.div>

        <motion.div className="rounded-2xl p-6 border border-white/5" style={{ background: 'var(--bg-card)' }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#D4A24A] mb-4">New DJs per Month</p>
          {djGrowthData.length > 0 ? (
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={djGrowthData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E1E1E" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6B6B6B' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#6B6B6B' }} />
                  <Bar dataKey="djs" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[260px] flex items-center justify-center"><p className="font-mono text-text-muted">--</p></div>
          )}
        </motion.div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <motion.div className="rounded-2xl p-6 border border-white/5" style={{ background: 'var(--bg-card)' }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#D4A24A] mb-4">Booking Trends</p>
          {bookingTrendData.length > 0 ? (
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={bookingTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E1E1E" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6B6B6B' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#6B6B6B' }} />
                  <Area type="monotone" dataKey="bookings" stroke="#22C55E" fill="rgba(34,197,94,0.1)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[260px] flex items-center justify-center"><p className="font-mono text-text-muted">--</p></div>
          )}
        </motion.div>

        <motion.div className="rounded-2xl p-6 border border-white/5" style={{ background: 'var(--bg-card)' }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#D4A24A] mb-4">Revenue Growth</p>
          {revenueGrowthData.length > 0 ? (
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueGrowthData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E1E1E" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6B6B6B' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#6B6B6B' }} />
                  <Area type="monotone" dataKey="revenue" stroke="#D4A24A" fill="rgba(212,162,74,0.1)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[260px] flex items-center justify-center"><p className="font-mono text-text-muted">--</p></div>
          )}
        </motion.div>

        <motion.div className="rounded-2xl p-6 border border-white/5" style={{ background: 'var(--bg-card)' }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.475 }}>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#D4A24A] mb-4">Monthly Site Visits</p>
          {visitsData.length > 0 ? (
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={visitsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E1E1E" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6B6B6B' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#6B6B6B' }} />
                  <Area type="monotone" dataKey="visits" stroke="#EC4899" fill="rgba(236,72,153,0.1)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[260px] flex items-center justify-center"><p className="font-mono text-text-muted">--</p></div>
          )}
        </motion.div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <motion.div className="rounded-2xl p-6 border border-white/5" style={{ background: 'var(--bg-card)' }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#D4A24A] mb-4">Top Visitor Countries</p>
          <div className="space-y-3">
            {geography?.countries && geography.countries.length > 0 ? geography.countries.map((c) => (
              <div key={c.name || 'Unknown'} className="flex items-center justify-between text-sm">
                <span className="text-text-primary">{c.name || 'Unknown'}</span>
                <span className="font-mono text-text-muted">{c.visits} visits</span>
              </div>
            )) : <EmptyState message="No visitor geography data available." />}
          </div>
        </motion.div>

        <motion.div className="rounded-2xl p-6 border border-white/5" style={{ background: 'var(--bg-card)' }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#D4A24A] mb-4">Top Genres</p>
          <div className="space-y-3">
            {topGenres.length > 0 ? topGenres.map(([genre, count]) => (
              <div key={genre} className="flex items-center justify-between text-sm">
                <span className="text-text-primary">{genre}</span>
                <span className="font-mono text-text-muted">{count} DJs</span>
              </div>
            )) : <EmptyState message="No genre data available." />}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

/* ─────────────────────── Section 2: DJs ─────────────────────── */

function DJsSection() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [verificationFilter, setVerificationFilter] = useState<string>('all');
  const navigate = useNavigate();
  const { data, isLoading, error } = useAdminDjs({
    search,
    status: statusFilter !== 'all' ? statusFilter.toUpperCase() : undefined,
    verified: verificationFilter !== 'all' ? verificationFilter === 'verified' : undefined,
    limit: 50,
  });
  const verifyMutation = useVerifyDj();
  const suspendMutation = useToggleDjSuspend();
  const deleteMutation = useDeleteDj();
  const queryClient = useQueryClient();

  const djs = data?.data || [];

  const handleVerify = (id: string) => {
    verifyMutation.mutate({ id }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: ['adminDjs'] }) });
  };

  const handleSuspend = (id: string) => {
    suspendMutation.mutate(id, { onSuccess: () => queryClient.invalidateQueries({ queryKey: ['adminDjs'] }) });
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this DJ?')) {
      deleteMutation.mutate(id, { onSuccess: () => queryClient.invalidateQueries({ queryKey: ['adminDjs'] }) });
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader title="DJ Management" subtitle="Manage DJs, verifications, and suspensions" />

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search DJs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#111111] border border-white/5 rounded-xl text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-[#D4A24A]/30"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-xs rounded-lg bg-[#111111] text-text-primary border border-white/5 focus:outline-none"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
        <select
          value={verificationFilter}
          onChange={(e) => setVerificationFilter(e.target.value)}
          className="px-3 py-2 text-xs rounded-lg bg-[#111111] text-text-primary border border-white/5 focus:outline-none"
        >
          <option value="all">All Verification</option>
          <option value="verified">Verified</option>
          <option value="pending">Pending</option>
        </select>
      </div>

      {isLoading && <LoadingCenter />}

      {error && (
        <div className="rounded-2xl border border-red-500/20 p-6 text-center" style={{ background: 'var(--bg-error)' }}>
          <p className="text-red-400 font-medium">Failed to load data</p>
          <p className="text-red-400/60 text-sm mt-1">{(error as any)?.response?.data?.error || (error as any)?.message || 'Unknown error'}</p>
        </div>
      )}

      {!isLoading && !error && (
        <div className="rounded-2xl border border-white/5 overflow-hidden" style={{ background: 'var(--bg-card)' }}>
          <table className="w-full text-left">
            <thead className="border-b border-white/5 text-[10px] uppercase text-text-muted">
              <tr>
                <th className="p-4">Photo</th>
                <th className="p-4">DJ Name</th>
                <th className="p-4">City</th>
                <th className="p-4">Verification</th>
                <th className="p-4">Ranking</th>
                <th className="p-4">Streams</th>
                <th className="p-4">Followers</th>
                <th className="p-4">Mixes</th>
                <th className="p-4">Bookings</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {djs.map((dj: any) => (
                <tr key={dj.id} className="border-b border-white/5 text-sm">
                  <td className="p-4">
                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center overflow-hidden">
                      {dj.avatar ? <img src={dj.avatar} alt="" className="w-full h-full object-cover" /> : <Mic className="w-4 h-4 text-text-muted" />}
                    </div>
                  </td>
                  <td className="p-4 font-bold text-text-primary">{dj.stageName}</td>
                  <td className="p-4 text-text-secondary">{dj.city || '--'}</td>
                  <td className="p-4"><StatusBadge status={dj.verified ? 'verified' : 'pending'} /></td>
                  <td className="p-4 font-mono text-text-primary">#{dj.rankingPosition || '--'}</td>
                  <td className="p-4 font-mono text-text-primary">{(dj.totalStreams || 0).toLocaleString()}</td>
                  <td className="p-4 font-mono text-text-primary">{(dj.totalFollowers || 0).toLocaleString()}</td>
                  <td className="p-4 font-mono text-text-primary">{dj.totalMixes || 0}</td>
                  <td className="p-4 font-mono text-text-primary">{dj.totalBookings || 0}</td>
                  <td className="p-4"><StatusBadge status={dj.status?.toLowerCase() || 'active'} /></td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => navigate(`/dj/${dj.id}`)} className="p-2 rounded-lg bg-white/5 text-text-muted hover:bg-white/10" title="View"><Eye className="w-3.5 h-3.5" /></button>
                      {!dj.verified && (
                        <button onClick={() => handleVerify(dj.id)} className="p-2 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20" title="Verify"><Check className="w-3.5 h-3.5" /></button>
                      )}
                      <button onClick={() => handleSuspend(dj.id)} className="p-2 rounded-lg bg-orange-500/10 text-orange-400 hover:bg-orange-500/20" title="Suspend"><Ban className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDelete(dj.id)} className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {djs.length === 0 && <EmptyState message="No DJs found." />}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────── Section 3: Rankings ─────────────────────── */

function RankingsSection() {
  const navigate = useNavigate();
  const { data, isLoading, error } = useAdminRankings();
  const recalcMutation = useRecalculateRankings();
  const notifyTop3Mutation = useNotifyTop3Rankings();
  const updateRankingMutation = useUpdateRanking();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editScores, setEditScores] = useState<Record<string, number>>({});

  const rankings = data || [];

  const startEdit = (dj: any) => {
    setEditingId(dj.id);
    setEditScores({
      [dj.id + '_rankingScore']: dj.rankingScore || 0,
      [dj.id + '_digitalScore']: dj.digitalScore || 0,
      [dj.id + '_industryScore']: dj.industryScore || 0,
      [dj.id + '_communityScore']: dj.communityScore || 0,
    });
  };

  const saveEdit = (id: string) => {
    updateRankingMutation.mutate({
      id,
      rankingScore: editScores[id + '_rankingScore'],
      digitalScore: editScores[id + '_digitalScore'],
      industryScore: editScores[id + '_industryScore'],
      communityScore: editScores[id + '_communityScore'],
    }, {
      onSuccess: () => {
        setEditingId(null);
        queryClient.invalidateQueries({ queryKey: ['adminRankings'] });
      }
    });
  };

  const ScoreInput = ({ dj, field }: { dj: any; field: string }) => {
    const key = dj.id + '_' + field;
    const isEditing = editingId === dj.id;
    const value = isEditing ? editScores[key] : dj[field];
    if (!isEditing) return <span className="font-mono text-text-primary">{value?.toFixed(1) || '--'}</span>;
    return (
      <input
        type="number"
        step="0.1"
        value={value}
        onChange={(e) => setEditScores(prev => ({ ...prev, [key]: parseFloat(e.target.value) || 0 }))}
        className="w-16 px-1 py-0.5 bg-white/5 border border-white/10 rounded text-xs text-text-primary font-mono focus:outline-none focus:border-[#D4A24A]/30"
      />
    );
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="DJ Rankings"
        subtitle="Top 100 DJs by overall score"
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                notifyTop3Mutation.mutate(undefined, {
                  onSuccess: () => toast.success('Weekly Top 3 notification emails sent successfully!'),
                  onError: (err: any) => toast.error(err?.response?.data?.error || 'Failed to send notifications'),
                });
              }}
              disabled={notifyTop3Mutation.isPending}
              className="px-4 py-2 bg-purple-500/10 text-purple-400 border border-purple-500/30 rounded-xl text-xs font-bold hover:bg-purple-500/20 flex items-center gap-2 transition-colors"
            >
              {notifyTop3Mutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
              Send Top 3 Emails
            </button>
            <button
              onClick={() => recalcMutation.mutate(undefined, { onSuccess: () => { toast.success('Rankings recalculated & synced!'); queryClient.invalidateQueries({ queryKey: ['adminRankings'] }); } })}
              disabled={recalcMutation.isPending}
              className="px-4 py-2 bg-[#D4A24A]/10 text-[#D4A24A] rounded-xl text-xs font-bold hover:bg-[#D4A24A]/20 flex items-center gap-2 transition-colors"
            >
              {recalcMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Recalculate Rankings
            </button>
          </div>
        }
      />

      {isLoading && <LoadingCenter />}

      {error && (
        <div className="rounded-2xl border border-red-500/20 p-6 text-center" style={{ background: 'var(--bg-error)' }}>
          <p className="text-red-400 font-medium">Failed to load data</p>
          <p className="text-red-400/60 text-sm mt-1">{(error as any)?.response?.data?.error || (error as any)?.message || 'Unknown error'}</p>
        </div>
      )}

      {!isLoading && !error && (
        <div className="rounded-2xl border border-white/5 overflow-hidden" style={{ background: 'var(--bg-card)' }}>
          <table className="w-full text-left">
            <thead className="border-b border-white/5 text-[10px] uppercase text-text-muted">
              <tr>
                <th className="p-4">Rank</th>
                <th className="p-4">DJ Name</th>
                <th className="p-4">Overall Score</th>
                <th className="p-4">Digital Score</th>
                <th className="p-4">Industry Score</th>
                <th className="p-4">Community Score</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rankings.slice(0, 100).map((dj: any, i: number) => (
                <tr key={dj.id} className="border-b border-white/5 text-sm">
                  <td className="p-4 font-mono font-bold text-[#D4A24A]">#{i + 1}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center overflow-hidden">
                        {dj.avatar ? <img src={dj.avatar} alt="" className="w-full h-full object-cover" /> : <Mic className="w-4 h-4 text-text-muted" />}
                      </div>
                      <span className="font-bold text-text-primary">{dj.stageName}</span>
                    </div>
                  </td>
                  <td className="p-4"><ScoreInput dj={dj} field="rankingScore" /></td>
                  <td className="p-4"><ScoreInput dj={dj} field="digitalScore" /></td>
                  <td className="p-4"><ScoreInput dj={dj} field="industryScore" /></td>
                  <td className="p-4"><ScoreInput dj={dj} field="communityScore" /></td>
                  <td className="p-4 text-right">
                    {editingId === dj.id ? (
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => saveEdit(dj.id)} className="px-2 py-1 text-xs rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 flex items-center gap-1">
                          <Check className="w-3 h-3" /> Save
                        </button>
                        <button onClick={() => setEditingId(null)} className="px-2 py-1 text-xs rounded-lg bg-white/5 text-text-muted hover:bg-white/10 flex items-center gap-1">
                          <XIcon className="w-3 h-3" /> Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => startEdit(dj)} className="px-3 py-1.5 text-xs rounded-lg bg-white/5 text-text-muted hover:bg-white/10 flex items-center gap-1">
                          <Star className="w-3 h-3" /> Edit
                        </button>
                        <button onClick={() => navigate(`/dj/${dj.id}`)} className="px-3 py-1.5 text-xs rounded-lg bg-white/5 text-text-muted hover:bg-white/10 flex items-center gap-1 ml-auto">
                          <Eye className="w-3 h-3" /> View Profile
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rankings.length === 0 && <EmptyState message="No rankings found." />}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────── Section 4: Mixes ─────────────────────── */

function MixesSection() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'public' | 'private' | 'featured' | 'hallOfFame'>('all');
  const [page, setPage] = useState(1);

  const queryParams = useMemo(() => {
    const p: any = { page, limit: 50 };
    if (search.trim()) p.search = search.trim();
    if (filter === 'public') p.isPublic = 'true';
    if (filter === 'private') p.isPublic = 'false';
    if (filter === 'featured') p.featured = 'true';
    if (filter === 'hallOfFame') p.hallOfFame = 'true';
    return p;
  }, [search, filter, page]);

  const { data, isLoading, error } = useAdminMixes(queryParams);
  const toggleFeatureMutation = useToggleMixFeature();
  const toggleVisibilityMutation = useToggleMixVisibility();
  const toggleHallOfFameMutation = useToggleMixHallOfFame();
  const deleteMixMutation = useDeleteMix();
  const queryClient = useQueryClient();

  const mixes = data?.data || [];
  const meta = data?.meta || { total: 0, page: 1, totalPages: 1 };

  const handleToggleFeature = (id: string, featured: boolean) => {
    toggleFeatureMutation.mutate({ id, featured: !featured }, {
      onSuccess: () => {
        toast.success(featured ? 'Unfeatured mix' : '⭐ Mix featured!');
        queryClient.invalidateQueries({ queryKey: ['adminMixes'] });
      },
    });
  };

  const handleToggleVisibility = (id: string, isPublic: boolean) => {
    toggleVisibilityMutation.mutate({ id, isPublic: !isPublic }, {
      onSuccess: () => {
        toast.success(isPublic ? '🔒 Mix set to Private' : '🌐 Mix published Public');
        queryClient.invalidateQueries({ queryKey: ['adminMixes'] });
      },
    });
  };

  const handleToggleHallOfFame = (id: string) => {
    toggleHallOfFameMutation.mutate(id, {
      onSuccess: () => {
        toast.success('🏛️ Hall of Fame status updated!');
        queryClient.invalidateQueries({ queryKey: ['adminMixes'] });
      },
    });
  };

  const handlePlayMix = (mix: any) => {
    const track = {
      id: mix.id,
      title: mix.title,
      dj: mix.dj?.stageName || 'Unknown DJ',
      duration: mix.duration || 0,
      cover: mix.coverImage || '/placeholder.jpg',
      genre: mix.genre || 'Salone Mix',
      audioUrl: mix.audioUrl,
      audioSource: mix.audioSource,
    };
    window.dispatchEvent(new CustomEvent('play-mix', { detail: track }));
  };

  return (
    <div className="space-y-6">
      <SectionHeader title="Mix Management" subtitle={`Review and manage all ${meta.total.toLocaleString()} mixes on platform`} />

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search title, DJ name, genre..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 bg-[#111111] border border-white/5 rounded-xl text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-[#D4A24A]/30"
          />
        </div>

        <div className="flex gap-1.5 flex-wrap">
          {[
            { id: 'all', label: 'All Mixes' },
            { id: 'public', label: '🌐 Public' },
            { id: 'private', label: '🔒 Private' },
            { id: 'featured', label: '⭐ Featured' },
            { id: 'hallOfFame', label: '🏛️ Hall of Fame' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => {
                setFilter(f.id as any);
                setPage(1);
              }}
              className={`px-3 py-1.5 text-xs rounded-lg font-bold uppercase transition-colors ${
                filter === f.id ? 'bg-[#D4A24A] text-black' : 'bg-white/5 text-text-muted hover:bg-white/10'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading && <LoadingCenter />}

      {error && (
        <div className="rounded-2xl border border-red-500/20 p-6 text-center" style={{ background: 'var(--bg-error)' }}>
          <p className="text-red-400 font-medium">Failed to load mixes</p>
          <p className="text-red-400/60 text-sm mt-1">{(error as any)?.response?.data?.error || (error as any)?.message || 'Unknown error'}</p>
        </div>
      )}

      {!isLoading && !error && (
        <div className="rounded-2xl border border-white/5 overflow-hidden" style={{ background: 'var(--bg-card)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="border-b border-white/5 text-[10px] uppercase text-text-muted">
                <tr>
                  <th className="p-4">Cover</th>
                  <th className="p-4">Title</th>
                  <th className="p-4">DJ Name</th>
                  <th className="p-4">Genre</th>
                  <th className="p-4">Plays</th>
                  <th className="p-4">Visibility</th>
                  <th className="p-4">Badges</th>
                  <th className="p-4">Upload Date</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {mixes.map((mix: any) => (
                  <tr key={mix.id} className="border-b border-white/5 text-sm hover:bg-white/[0.02] transition-colors">
                    <td className="p-4">
                      <div
                        className="w-11 h-11 rounded-lg bg-white/5 flex items-center justify-center overflow-hidden relative group/cover cursor-pointer border border-white/10"
                        onClick={() => handlePlayMix(mix)}
                        title="Play Mix"
                      >
                        {mix.coverImage ? (
                          <img src={mix.coverImage} alt="" className="w-full h-full object-cover group-hover/cover:scale-105 transition-transform" />
                        ) : (
                          <Music className="w-5 h-5 text-text-muted" />
                        )}
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/cover:opacity-100 transition-opacity">
                          <Play className="w-5 h-5 text-[#D4A24A] fill-[#D4A24A]" />
                        </div>
                      </div>
                    </td>

                    <td className="p-4 font-bold text-text-primary">
                      <p className="line-clamp-1">{mix.title}</p>
                      {mix.description && <p className="text-xs font-normal text-text-muted line-clamp-1 mt-0.5">{mix.description}</p>}
                    </td>

                    <td className="p-4 text-text-secondary">
                      <span className="font-semibold text-text-primary">{mix.dj?.stageName || '--'}</span>
                      {mix.dj?.subscriptionTier && mix.dj.subscriptionTier !== 'free' && (
                        <span className="ml-1.5 px-1.5 py-0.5 text-[9px] font-bold uppercase rounded bg-[#D4A24A]/20 text-[#D4A24A]">
                          {mix.dj.subscriptionTier}
                        </span>
                      )}
                    </td>

                    <td className="p-4 text-text-secondary">
                      <span className="px-2 py-1 rounded-md bg-white/5 text-xs">{mix.genre || 'Salone Mix'}</span>
                    </td>

                    <td className="p-4 font-mono font-bold text-[#D4A24A]">
                      {(mix.plays || 0).toLocaleString()}
                    </td>

                    <td className="p-4">
                      <button
                        onClick={() => handleToggleVisibility(mix.id, mix.isPublic)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
                          mix.isPublic
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                            : 'bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20'
                        }`}
                        title="Click to toggle Public / Private"
                      >
                        {mix.isPublic ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                        {mix.isPublic ? 'Public' : 'Private'}
                      </button>
                    </td>

                    <td className="p-4">
                      <div className="flex items-center gap-1 flex-wrap">
                        {mix.featured && (
                          <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-[#D4A24A]/20 text-[#D4A24A] border border-[#D4A24A]/30">
                            ⭐ Featured
                          </span>
                        )}
                        {mix.hallOfFame && (
                          <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            🏛️ Hall of Fame
                          </span>
                        )}
                        {!mix.featured && !mix.hallOfFame && (
                          <span className="text-xs text-text-muted">--</span>
                        )}
                      </div>
                    </td>

                    <td className="p-4 text-xs text-text-muted">
                      {mix.createdAt ? new Date(mix.createdAt).toLocaleDateString() : '--'}
                    </td>

                    <td className="p-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleToggleVisibility(mix.id, mix.isPublic)}
                          className={`p-2 rounded-lg transition-colors ${
                            mix.isPublic ? 'bg-purple-500/10 text-purple-400 hover:bg-purple-500/20' : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                          }`}
                          title={mix.isPublic ? 'Make Private' : 'Make Public'}
                        >
                          {mix.isPublic ? <Lock className="w-3.5 h-3.5" /> : <Globe className="w-3.5 h-3.5" />}
                        </button>

                        <button
                          onClick={() => handleToggleFeature(mix.id, mix.featured)}
                          className={`p-2 rounded-lg transition-colors ${
                            mix.featured ? 'bg-[#D4A24A] text-black font-bold' : 'bg-[#D4A24A]/10 text-[#D4A24A] hover:bg-[#D4A24A]/20'
                          }`}
                          title={mix.featured ? 'Unfeature' : 'Feature Mix'}
                        >
                          <Star className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleToggleHallOfFame(mix.id)}
                          className={`p-2 rounded-lg transition-colors ${
                            mix.hallOfFame ? 'bg-amber-500 text-black font-bold' : 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
                          }`}
                          title="Toggle Hall of Fame"
                        >
                          <Crown className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => {
                            if (confirm(`Delete "${mix.title}"? This cannot be undone.`)) {
                              deleteMixMutation.mutate(mix.id, {
                                onSuccess: () => {
                                  toast.success('Mix deleted');
                                  queryClient.invalidateQueries({ queryKey: ['adminMixes'] });
                                },
                              });
                            }
                          }}
                          className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20"
                          title="Delete Mix"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {mixes.length === 0 && <EmptyState message="No mixes found for this query." />}

          {/* Pagination Controls */}
          {meta.totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-white/5 text-xs text-text-muted">
              <span>
                Showing {((meta.page - 1) * 50) + 1} – {Math.min(meta.page * 50, meta.total)} of {meta.total} mixes
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-lg bg-white/5 text-text-primary disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Prev
                </button>
                <span className="font-semibold text-text-primary px-2">
                  Page {meta.page} of {meta.totalPages}
                </span>
                <button
                  disabled={page >= meta.totalPages}
                  onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                  className="px-3 py-1.5 rounded-lg bg-white/5 text-text-primary disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 flex items-center gap-1"
                >
                  Next <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────── Section 5: Bookings ─────────────────────── */

function BookingsSection() {
  const [filter, setFilter] = useState<'all' | 'PENDING' | 'COMPLETED' | 'CANCELLED'>('all');
  const [viewBooking, setViewBooking] = useState<any>(null);
  const { data, isLoading, error } = useAdminBookings({ limit: 50 });
  const updateStatusMutation = useUpdateBookingStatus();
  const queryClient = useQueryClient();

  const bookings = data?.data || [];
  const filtered = useMemo(() => {
    if (filter === 'all') return bookings;
    return bookings.filter((b: any) => b.status === filter);
  }, [bookings, filter]);

  const totalValue = bookings.reduce((sum: number, b: any) => sum + ((b.finalPrice ?? b.budget) || 0), 0);
  const commission = totalValue * 0.15;
  const mostBooked = useMemo(() => {
    const counts: Record<string, number> = {};
    bookings.forEach((b: any) => { counts[b.dj?.stageName || 'Unknown'] = (counts[b.dj?.stageName || 'Unknown'] || 0) + 1; });
    const entries = Object.entries(counts);
    return entries.length > 0 ? entries.sort((a, b) => b[1] - a[1])[0][0] : '--';
  }, [bookings]);

  const handleUpdateStatus = (id: string, status: string) => {
    updateStatusMutation.mutate({ id, status }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: ['adminBookings'] }) });
  };

  return (
    <div className="space-y-6">
      <SectionHeader title="Booking Management" subtitle="Manage event bookings and commissions" />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="rounded-2xl p-5 border border-white/5" style={{ background: 'var(--bg-card)' }}>
          <p className="text-[10px] uppercase tracking-wider text-text-muted font-semibold">Total Booking Value</p>
          <p className="font-mono text-2xl font-bold text-text-primary mt-2">SLE {totalValue.toLocaleString()}</p>
        </div>
        <div className="rounded-2xl p-5 border border-white/5" style={{ background: 'var(--bg-card)' }}>
          <p className="text-[10px] uppercase tracking-wider text-text-muted font-semibold">Commission Earned</p>
          <p className="font-mono text-2xl font-bold text-[#D4A24A] mt-2">SLE {Math.round(commission).toLocaleString()}</p>
        </div>
        <div className="rounded-2xl p-5 border border-white/5" style={{ background: 'var(--bg-card)' }}>
          <p className="text-[10px] uppercase tracking-wider text-text-muted font-semibold">Most Booked DJ</p>
          <p className="font-mono text-2xl font-bold text-text-primary mt-2">{mostBooked}</p>
        </div>
      </div>

      <div className="flex gap-2">
        {(['all', 'PENDING', 'COMPLETED', 'CANCELLED'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-xs rounded-lg font-bold uppercase ${filter === f ? 'bg-[#D4A24A] text-black' : 'bg-white/5 text-text-muted hover:bg-white/10'}`}
          >
            {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {isLoading && <LoadingCenter />}

      {error && (
        <div className="rounded-2xl border border-red-500/20 p-6 text-center" style={{ background: 'var(--bg-error)' }}>
          <p className="text-red-400 font-medium">Failed to load data</p>
          <p className="text-red-400/60 text-sm mt-1">{(error as any)?.response?.data?.error || (error as any)?.message || 'Unknown error'}</p>
        </div>
      )}

      {!isLoading && !error && (
        <div className="rounded-2xl border border-white/5 overflow-hidden" style={{ background: 'var(--bg-card)' }}>
          <table className="w-full text-left">
            <thead className="border-b border-white/5 text-[10px] uppercase text-text-muted">
              <tr>
                <th className="p-4">Client</th>
                <th className="p-4">DJ</th>
                <th className="p-4">Event Type</th>
                <th className="p-4">Date</th>
                <th className="p-4">Location</th>
                <th className="p-4">Status</th>
                <th className="p-4">Amount</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((b: any) => (
                <tr key={b.id} className="border-b border-white/5 text-sm">
                  <td className="p-4 text-text-primary">{b.client?.email || '--'}</td>
                  <td className="p-4 text-text-primary">{b.dj?.stageName || '--'}</td>
                  <td className="p-4 text-text-secondary">{b.eventType}</td>
                  <td className="p-4 font-mono text-text-secondary">{b.eventDate ? new Date(b.eventDate).toLocaleDateString() : '--'}</td>
                  <td className="p-4 text-text-secondary">{b.eventLocation || '--'}</td>
                  <td className="p-4"><StatusBadge status={b.status} /></td>
                  <td className="p-4 font-mono text-text-primary">SLE {((b.finalPrice ?? b.budget) || 0).toLocaleString()}</td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setViewBooking(b)} className="px-3 py-1.5 text-xs rounded-lg bg-white/5 text-text-muted hover:bg-white/10 flex items-center gap-1" title="View details"><Eye className="w-3 h-3" /> View</button>
                      <select
                        onChange={(e) => handleUpdateStatus(b.id, e.target.value)}
                        className="px-3 py-1.5 text-xs rounded-lg bg-white/5 text-text-primary border border-white/5 focus:outline-none"
                      >
                        <option value="">Update</option>
                        <option value="PENDING">Pending</option>
                        <option value="NEGOTIATING">Negotiating</option>
                        <option value="CONFIRMED">Confirmed</option>
                        <option value="DEPOSIT_PAID">Deposit Paid</option>
                        <option value="COMPLETED">Completed</option>
                        <option value="CANCELLED">Cancelled</option>
                        <option value="REFUNDED">Refunded</option>
                      </select>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <EmptyState message="No bookings found." />}
        </div>
      )}

      {viewBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setViewBooking(null)}>
          <div className="w-full max-w-lg rounded-2xl border border-white/10 p-6 space-y-4" style={{ background: 'var(--bg-modal)' }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-text-primary">Booking Details</h3>
              <button onClick={() => setViewBooking(null)} className="p-1 rounded-lg hover:bg-white/5 text-text-muted"><XIcon className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-text-muted">Client</span><span className="text-text-primary">{viewBooking.client?.email || '--'}</span></div>
              <div className="flex justify-between"><span className="text-text-muted">DJ</span><span className="text-text-primary">{viewBooking.dj?.stageName || '--'}</span></div>
              <div className="flex justify-between"><span className="text-text-muted">Event Type</span><span className="text-text-primary">{viewBooking.eventType}</span></div>
              <div className="flex justify-between"><span className="text-text-muted">Date</span><span className="text-text-primary">{viewBooking.eventDate ? new Date(viewBooking.eventDate).toLocaleDateString() : '--'}</span></div>
              <div className="flex justify-between"><span className="text-text-muted">Location</span><span className="text-text-primary">{viewBooking.eventLocation || '--'}</span></div>
              <div className="flex justify-between"><span className="text-text-muted">Amount</span><span className="text-text-primary">SLE {((viewBooking.finalPrice ?? viewBooking.budget) || 0).toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-text-muted">Status</span><span className="text-text-primary"><StatusBadge status={viewBooking.status} /></span></div>
              <div className="flex justify-between"><span className="text-text-muted">Created</span><span className="text-text-primary">{viewBooking.createdAt ? new Date(viewBooking.createdAt).toLocaleDateString() : '--'}</span></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────── Section 6: Users ─────────────────────── */

function UsersSection() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const { data, isLoading, error } = useAdminUsers({
    role: roleFilter !== 'all' ? roleFilter : undefined,
    limit: 50,
  });
  const updateRoleMutation = useUpdateUserRole();
  const updateStatusMutation = useUpdateUserStatus();
  const queryClient = useQueryClient();

  const users = data?.data || [];
  const [roleDrafts, setRoleDrafts] = useState<Record<string, string>>({});
  const [statusDrafts, setStatusDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    setRoleDrafts((prev) => {
      const next = { ...prev };
      users.forEach((u: any) => {
        if (!(u.id in next)) next[u.id] = u.role;
      });
      return next;
    });
    setStatusDrafts((prev) => {
      const next = { ...prev };
      users.forEach((u: any) => {
        if (!(u.id in next)) next[u.id] = u.status;
      });
      return next;
    });
  }, [users]);

  const filtered = useMemo(() => {
    let result = users;
    if (search) result = result.filter((u: any) => u.email?.toLowerCase().includes(search.toLowerCase()) || u.djProfile?.stageName?.toLowerCase().includes(search.toLowerCase()));
    return result;
  }, [users, search]);

  const handleSaveRole = (id: string) => {
    const role = roleDrafts[id];
    const current = users.find((u: any) => u.id === id)?.role;
    if (!role || role === current) return;
    updateRoleMutation.mutate(
      { id, role },
      {
        onSuccess: () => {
          toast.success('Role saved');
          queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
        },
        onError: (err: any) => {
          toast.error(err?.response?.data?.error || 'Failed to save role');
        },
      }
    );
  };

  const handleSaveStatus = (id: string) => {
    const status = statusDrafts[id];
    const current = users.find((u: any) => u.id === id)?.status;
    if (!status || status === current) return;
    updateStatusMutation.mutate(
      { id, status },
      {
        onSuccess: () => {
          toast.success('Status saved');
          queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
        },
        onError: (err: any) => {
          toast.error(err?.response?.data?.error || 'Failed to save status');
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      <SectionHeader title="User Management" subtitle="Manage platform users and roles" />

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#111111] border border-white/5 rounded-xl text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-[#D4A24A]/30"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-2 text-xs rounded-lg bg-[#111111] text-text-primary border border-white/5 focus:outline-none"
        >
          <option value="all">All Roles</option>
          <option value="user">User</option>
          <option value="dj">DJ</option>
          <option value="admin">Admin</option>
          <option value="moderator">Moderator</option>
        </select>
      </div>

      {isLoading && <LoadingCenter />}

      {error && (
        <div className="rounded-2xl border border-red-500/20 p-6 text-center" style={{ background: 'var(--bg-error)' }}>
          <p className="text-red-400 font-medium">Failed to load data</p>
          <p className="text-red-400/60 text-sm mt-1">{(error as any)?.response?.data?.error || (error as any)?.message || 'Unknown error'}</p>
        </div>
      )}

      {!isLoading && !error && (
        <div className="rounded-2xl border border-white/5 overflow-hidden" style={{ background: 'var(--bg-card)' }}>
          <table className="w-full text-left">
            <thead className="border-b border-white/5 text-[10px] uppercase text-text-muted">
              <tr>
                <th className="p-4">Email</th>
                <th className="p-4">Display Name</th>
                <th className="p-4">Role</th>
                <th className="p-4">Joined Date</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u: any) => (
                <tr key={u.id} className="border-b border-white/5 text-sm">
                  <td className="p-4 text-text-primary">{u.email}</td>
                  <td className="p-4 text-text-primary">{u.djProfile?.stageName || u.username || '--'}</td>
                  <td className="p-4"><StatusBadge status={u.role || 'user'} /></td>
                  <td className="p-4 font-mono text-text-secondary">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '--'}</td>
                  <td className="p-4"><StatusBadge status={u.status?.toLowerCase() || 'active'} /></td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-1 flex-wrap">
                      <div className="flex items-center gap-1">
                        <select
                          value={roleDrafts[u.id] ?? u.role}
                          onChange={(e) => setRoleDrafts((prev) => ({ ...prev, [u.id]: e.target.value }))}
                          className="px-3 py-1.5 text-xs rounded-lg bg-white/5 text-text-primary border border-white/5 focus:outline-none"
                        >
                          <option value="USER">User</option>
                          <option value="DJ">DJ</option>
                          <option value="ADMIN">Admin</option>
                          <option value="MODERATOR">Moderator</option>
                          <option value="FINANCE_ADMIN">Finance Admin</option>
                          <option value="VERIFICATION_ADMIN">Verification Admin</option>
                        </select>
                        {roleDrafts[u.id] && roleDrafts[u.id] !== u.role && (
                          <button
                            onClick={() => handleSaveRole(u.id)}
                            disabled={updateRoleMutation.isPending}
                            className="px-2 py-1.5 text-xs rounded-lg bg-[#D4A24A] text-black font-semibold hover:opacity-90 disabled:opacity-50 flex items-center gap-1"
                            title="Save role"
                          >
                            <Save className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <select
                          value={statusDrafts[u.id] ?? u.status}
                          onChange={(e) => setStatusDrafts((prev) => ({ ...prev, [u.id]: e.target.value }))}
                          className="px-3 py-1.5 text-xs rounded-lg bg-white/5 text-text-primary border border-white/5 focus:outline-none"
                        >
                          <option value="ACTIVE">Active</option>
                          <option value="SUSPENDED">Suspended</option>
                          <option value="BANNED">Banned</option>
                        </select>
                        {statusDrafts[u.id] && statusDrafts[u.id] !== u.status && (
                          <button
                            onClick={() => handleSaveStatus(u.id)}
                            disabled={updateStatusMutation.isPending}
                            className="px-2 py-1.5 text-xs rounded-lg bg-[#D4A24A] text-black font-semibold hover:opacity-90 disabled:opacity-50 flex items-center gap-1"
                            title="Save status"
                          >
                            <Save className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      <button
                        onClick={() => u.djProfile?.id ? navigate(`/dj/${u.djProfile.id}`) : alert('No DJ profile for this user')}
                        className="px-3 py-1.5 text-xs rounded-lg bg-white/5 text-text-muted hover:bg-white/10 flex items-center gap-1"
                        title="View profile"
                      >
                        <Eye className="w-3 h-3" /> View
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <EmptyState message="No users found." />}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────── Section 7: Events ─────────────────────── */

function EventsSection() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [publishStatus, setPublishStatus] = useState<string>('all');
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [detailTab, setDetailTab] = useState<'tickets' | 'scans'>('tickets');

  const filters = {
    search: search || undefined,
    publishStatus: publishStatus === 'all' ? undefined : publishStatus,
    limit: 50,
  };

  const { data, isLoading, error } = useAdminEvents(filters);
  const { data: statsData } = useAdminEventTicketingStats();
  const events = data?.data || [];
  const stats = statsData?.data || {};
  const suspendMutation = useSuspendEvent();
  const restoreMutation = useRestoreEvent();

  const handleSuspend = (id: string) => {
    const reason = window.prompt('Suspension reason (optional):');
    if (reason === null) return;
    suspendMutation.mutate({ id, reason: reason || undefined }, {
      onSuccess: () => toast.success('Event suspended'),
      onError: (err: any) => toast.error(err?.response?.data?.error || 'Failed to suspend event'),
    });
  };

  const handleRestore = (id: string) => {
    if (!confirm('Restore this event to published?')) return;
    restoreMutation.mutate(id, {
      onSuccess: () => toast.success('Event restored'),
      onError: (err: any) => toast.error(err?.response?.data?.error || 'Failed to restore event'),
    });
  };

  const formatMoney = (val?: number) =>
    `SLE ${Math.round(val || 0).toLocaleString()}`;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Event Monitoring"
        subtitle="Track ticket sales, flagged events, and organizer activity across the platform"
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Events" value={stats.totalEvents || 0} icon={Calendar} color="#3B82F6" />
        <StatCard label="Tickets Sold" value={stats.totalTickets || 0} icon={Ticket} color="#D4A24A" />
        <StatCard label="Ticket Revenue" value={formatMoney(stats.totalRevenue)} icon={Wallet} color="#22C55E" />
        <StatCard label="Checked In" value={stats.checkedInTickets || 0} icon={QrCode} color="#8B5CF6" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl p-5 border border-white/5" style={{ background: 'var(--bg-card)' }}>
          <p className="text-[10px] uppercase tracking-wider text-text-muted font-semibold">Published Events</p>
          <p className="font-mono text-2xl font-bold text-text-primary mt-2">{(stats.publishedEvents || 0).toLocaleString()}</p>
        </div>
        <div className="rounded-2xl p-5 border border-white/5" style={{ background: 'var(--bg-card)' }}>
          <p className="text-[10px] uppercase tracking-wider text-text-muted font-semibold">Pending Tickets</p>
          <p className="font-mono text-2xl font-bold text-[#F97316] mt-2">{(stats.pendingTickets || 0).toLocaleString()}</p>
        </div>
        <div className="rounded-2xl p-5 border border-white/5" style={{ background: 'var(--bg-card)' }}>
          <p className="text-[10px] uppercase tracking-wider text-text-muted font-semibold">Pending Payments</p>
          <p className="font-mono text-2xl font-bold text-[#F97316] mt-2">{(stats.pendingPayments || 0).toLocaleString()}</p>
        </div>
        <div className="rounded-2xl p-5 border border-white/5" style={{ background: 'var(--bg-card)' }}>
          <p className="text-[10px] uppercase tracking-wider text-text-muted font-semibold">Suspended / Flagged</p>
          <p className="font-mono text-2xl font-bold text-[#EF4444] mt-2">{(stats.suspendedEvents || 0).toLocaleString()}</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search events, DJs, cities, venues..."
            className="w-full pl-9 pr-4 py-2 bg-black/40 border border-white/10 rounded-lg text-sm text-text-primary focus:outline-none focus:border-[#D4A24A]/30"
          />
        </div>
        <select
          value={publishStatus}
          onChange={(e) => setPublishStatus(e.target.value)}
          className="px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-sm text-text-primary focus:outline-none focus:border-[#D4A24A]/30"
        >
          <option value="all">All Publish Statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="suspended">Suspended</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {isLoading && <LoadingCenter />}

      {error && (
        <div className="rounded-2xl border border-red-500/20 p-6 text-center" style={{ background: 'var(--bg-error)' }}>
          <p className="text-red-400 font-medium">Failed to load data</p>
          <p className="text-red-400/60 text-sm mt-1">{(error as any)?.response?.data?.error || (error as any)?.message || 'Unknown error'}</p>
        </div>
      )}

      {!isLoading && !error && (
        <div className="rounded-2xl border border-white/5 overflow-hidden" style={{ background: 'var(--bg-card)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[900px]">
              <thead className="border-b border-white/5 text-[10px] uppercase text-text-muted">
                <tr>
                  <th className="p-4">Title</th>
                  <th className="p-4">DJ / Organizer</th>
                  <th className="p-4">Date</th>
                  <th className="p-4">Publish</th>
                  <th className="p-4 text-right">Tickets</th>
                  <th className="p-4 text-right">Checked In</th>
                  <th className="p-4 text-right">Pending</th>
                  <th className="p-4 text-right">Revenue</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e: any) => {
                  const ts = e.ticketStats || {};
                  return (
                    <tr key={e.id} className="border-b border-white/5 text-sm">
                      <td className="p-4 font-bold text-text-primary">{e.title}</td>
                      <td className="p-4 text-text-primary">{e.dj?.stageName || e.organizerName || '--'}</td>
                      <td className="p-4 font-mono text-text-secondary">{e.date ? new Date(e.date).toLocaleDateString() : '--'}</td>
                      <td className="p-4"><StatusBadge status={e.publishStatus || 'draft'} /></td>
                      <td className="p-4 text-right font-mono text-text-primary">{ts.sold || 0}{ts.totalTickets ? ` / ${ts.totalTickets}` : ''}</td>
                      <td className="p-4 text-right font-mono text-text-primary">{ts.checkedIn || 0}</td>
                      <td className="p-4 text-right font-mono text-[#F97316]">{ts.pending || 0}</td>
                      <td className="p-4 text-right font-mono text-text-primary">{formatMoney(ts.revenue)}</td>
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setSelectedEvent(e)} className="px-3 py-1.5 text-xs rounded-lg bg-white/5 text-text-muted hover:bg-white/10 flex items-center gap-1" title="Monitor event"><Eye className="w-3 h-3" /> Monitor</button>
                          <button onClick={() => navigate(`/events/${e.id}`)} className="px-3 py-1.5 text-xs rounded-lg bg-white/5 text-text-muted hover:bg-white/10 flex items-center gap-1" title="View public page"><ExternalLink className="w-3 h-3" /></button>
                          {e.publishStatus === 'suspended' ? (
                            <button onClick={() => handleRestore(e.id)} disabled={restoreMutation.isPending} className="px-3 py-1.5 text-xs rounded-lg bg-[#22C55E]/10 text-[#22C55E] hover:bg-[#22C55E]/20 flex items-center gap-1 disabled:opacity-50" title="Restore event"><RefreshCcw className="w-3 h-3" /> Restore</button>
                          ) : (
                            <button onClick={() => handleSuspend(e.id)} disabled={suspendMutation.isPending} className="px-3 py-1.5 text-xs rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 flex items-center gap-1 disabled:opacity-50" title="Suspend event"><Ban className="w-3 h-3" /> Suspend</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {events.length === 0 && <EmptyState message="No events found." />}
        </div>
      )}

      {selectedEvent && (
        <EventMonitorModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          activeTab={detailTab}
          onTabChange={setDetailTab}
        />
      )}
    </div>
  );
}

function EventMonitorModal({
  event,
  onClose,
  activeTab,
  onTabChange,
}: {
  event: any;
  onClose: () => void;
  activeTab: 'tickets' | 'scans';
  onTabChange: (tab: 'tickets' | 'scans') => void;
}) {
  const [ticketStatus, setTicketStatus] = useState<string>('all');
  const [ticketSearch, setTicketSearch] = useState('');
  const { data: ticketsData, isLoading: ticketsLoading } = useAdminEventTickets(event.id, {
    status: ticketStatus === 'all' ? undefined : ticketStatus,
    search: ticketSearch || undefined,
    limit: 50,
  });
  const { data: scansData, isLoading: scansLoading } = useAdminEventScanLogs(event.id, { limit: 50 });
  const tickets = ticketsData?.data || [];
  const scans = scansData?.data || [];
  const ts = event.ticketStats || {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-2xl border border-white/10 flex flex-col" style={{ background: 'var(--bg-modal)' }} onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-white/5 flex items-start justify-between">
          <div>
            <h3 className="font-bold text-text-primary text-lg">{event.title}</h3>
            <p className="text-sm text-text-muted mt-1">{event.dj?.stageName || event.organizerName || '--'} • {event.city} • {event.date ? new Date(event.date).toLocaleString() : '--'}</p>
            <div className="flex items-center gap-3 mt-3">
              <div className="px-3 py-1 rounded-lg bg-white/5 text-xs text-text-muted">Sold: <span className="text-text-primary font-mono font-bold">{ts.sold || 0}</span></div>
              <div className="px-3 py-1 rounded-lg bg-white/5 text-xs text-text-muted">Checked In: <span className="text-text-primary font-mono font-bold">{ts.checkedIn || 0}</span></div>
              <div className="px-3 py-1 rounded-lg bg-white/5 text-xs text-text-muted">Revenue: <span className="text-[#D4A24A] font-mono font-bold">SLE {Math.round(ts.revenue || 0).toLocaleString()}</span></div>
              <div className="px-3 py-1 rounded-lg bg-white/5 text-xs text-text-muted">Pending: <span className="text-[#F97316] font-mono font-bold">{ts.pending || 0}</span></div>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/5 text-text-muted"><XIcon className="w-5 h-5" /></button>
        </div>

        <div className="flex border-b border-white/5">
          <button onClick={() => onTabChange('tickets')} className={`px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 ${activeTab === 'tickets' ? 'border-[#D4A24A] text-[#D4A24A]' : 'border-transparent text-text-muted hover:text-text-primary'}`}>Tickets</button>
          <button onClick={() => onTabChange('scans')} className={`px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 ${activeTab === 'scans' ? 'border-[#D4A24A] text-[#D4A24A]' : 'border-transparent text-text-muted hover:text-text-primary'}`}>Scan Logs</button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {activeTab === 'tickets' && (
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <input
                    type="text"
                    value={ticketSearch}
                    onChange={(e) => setTicketSearch(e.target.value)}
                    placeholder="Search buyer, email, phone, ticket number..."
                    className="w-full pl-9 pr-4 py-2 bg-black/40 border border-white/10 rounded-lg text-sm text-text-primary focus:outline-none focus:border-[#D4A24A]/30"
                  />
                </div>
                <select
                  value={ticketStatus}
                  onChange={(e) => setTicketStatus(e.target.value)}
                  className="px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-sm text-text-primary focus:outline-none focus:border-[#D4A24A]/30"
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="checked_in">Checked In</option>
                  <option value="rejected">Rejected</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="refunded">Refunded</option>
                </select>
              </div>

              {ticketsLoading && <LoadingCenter />}
              {!ticketsLoading && (
                <div className="rounded-xl border border-white/5 overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-white/5 text-[10px] uppercase text-text-muted">
                      <tr>
                        <th className="p-3">Ticket #</th>
                        <th className="p-3">Buyer</th>
                        <th className="p-3">Type</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right">Amount</th>
                        <th className="p-3">Purchased</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tickets.map((t: any) => (
                        <tr key={t.id} className="border-b border-white/5">
                          <td className="p-3 font-mono text-text-primary">{t.ticketNumber || '--'}</td>
                          <td className="p-3 text-text-primary">{t.buyerName || t.user?.name || '--'}</td>
                          <td className="p-3 text-text-secondary">{t.ticketType?.name || '--'}</td>
                          <td className="p-3"><StatusBadge status={t.status} /></td>
                          <td className="p-3 text-right font-mono text-text-primary">SLE {Math.round(t.amount || 0).toLocaleString()}</td>
                          <td className="p-3 text-text-secondary">{t.createdAt ? new Date(t.createdAt).toLocaleDateString() : '--'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {tickets.length === 0 && <EmptyState message="No tickets found." />}
                </div>
              )}
            </div>
          )}

          {activeTab === 'scans' && (
            <div className="space-y-4">
              {scansLoading && <LoadingCenter />}
              {!scansLoading && (
                <div className="rounded-xl border border-white/5 overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-white/5 text-[10px] uppercase text-text-muted">
                      <tr>
                        <th className="p-3">Time</th>
                        <th className="p-3">Ticket #</th>
                        <th className="p-3">Scanner</th>
                        <th className="p-3">Role</th>
                        <th className="p-3">Result</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scans.map((s: any) => (
                        <tr key={s.id} className="border-b border-white/5">
                          <td className="p-3 text-text-secondary">{s.createdAt ? new Date(s.createdAt).toLocaleString() : '--'}</td>
                          <td className="p-3 font-mono text-text-primary">{s.ticket?.ticketNumber || '--'}</td>
                          <td className="p-3 text-text-primary">{s.scannedBy?.slice(0, 8) || '--'}</td>
                          <td className="p-3 text-text-secondary">{s.scannerRole || '--'}</td>
                          <td className="p-3"><StatusBadge status={s.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {scans.length === 0 && <EmptyState message="No scan logs found." />}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────── Section 7b: Battles ─────────────────────── */

function BattlesSection() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<'all' | 'ACTIVE' | 'CLOSED'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ title: '', weekStart: '', weekEnd: '', theme: '', metricType: 'COMPOSITE' });
  const { data, isLoading, error } = useAdminBattles({ limit: 50 });
  const createBattleMutation = useCreateBattle();
  const closeBattleMutation = useCloseBattle();
  const queryClient = useQueryClient();

  const battles = data?.data || [];
  const filtered = useMemo(() => {
    if (statusFilter === 'all') return battles;
    return battles.filter((b: any) => b.status === statusFilter);
  }, [battles, statusFilter]);

  const activeCount = battles.filter((b: any) => b.status === 'ACTIVE').length;
  const totalEntries = battles.reduce((sum: number, b: any) => sum + (b.entries?.length || 0), 0);
  const totalVotes = battles.reduce((sum: number, b: any) => sum + (b.entries?.reduce((s: number, e: any) => s + (e.voteCount || e.votes || 0), 0) || 0), 0);

  const handleCreate = () => {
    if (!createForm.title || !createForm.weekStart || !createForm.weekEnd) return;
    createBattleMutation.mutate(createForm, {
      onSuccess: () => {
        setShowCreateModal(false);
        setCreateForm({ title: '', weekStart: '', weekEnd: '', theme: '', metricType: 'COMPOSITE' });
        queryClient.invalidateQueries({ queryKey: ['adminBattles'] });
      },
    });
  };

  return (
    <div className="space-y-6">
      <SectionHeader title="DJ Battles" subtitle="Manage battles and competitions" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl p-5 border border-white/5" style={{ background: 'var(--bg-card)' }}>
          <p className="text-[10px] uppercase tracking-wider text-text-muted font-semibold">Total Battles</p>
          <p className="font-mono text-2xl font-bold text-text-primary mt-2">{battles.length.toLocaleString()}</p>
        </div>
        <div className="rounded-2xl p-5 border border-white/5" style={{ background: 'var(--bg-card)' }}>
          <p className="text-[10px] uppercase tracking-wider text-text-muted font-semibold">Active</p>
          <p className="font-mono text-2xl font-bold text-[#D4A24A] mt-2">{activeCount.toLocaleString()}</p>
        </div>
        <div className="rounded-2xl p-5 border border-white/5" style={{ background: 'var(--bg-card)' }}>
          <p className="text-[10px] uppercase tracking-wider text-text-muted font-semibold">Total Entries</p>
          <p className="font-mono text-2xl font-bold text-text-primary mt-2">{totalEntries.toLocaleString()}</p>
        </div>
        <div className="rounded-2xl p-5 border border-white/5" style={{ background: 'var(--bg-card)' }}>
          <p className="text-[10px] uppercase tracking-wider text-text-muted font-semibold">Total Votes</p>
          <p className="font-mono text-2xl font-bold text-text-primary mt-2">{totalVotes.toLocaleString()}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {(['all', 'ACTIVE', 'CLOSED'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setStatusFilter(f)}
            className={`px-3 py-1.5 text-xs rounded-lg font-bold uppercase ${statusFilter === f ? 'bg-[#D4A24A] text-black' : 'bg-white/5 text-text-muted hover:bg-white/10'}`}
          >
            {f === 'all' ? 'All' : f}
          </button>
        ))}
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-3 py-1.5 text-xs rounded-lg font-bold uppercase bg-[#D4A24A] text-black hover:bg-[#D4A24A]/90 ml-auto"
        >
          + New Battle
        </button>
      </div>

      {isLoading && <LoadingCenter />}

      {error && (
        <div className="rounded-2xl border border-red-500/20 p-6 text-center" style={{ background: 'var(--bg-error)' }}>
          <p className="text-red-400 font-medium">Failed to load data</p>
          <p className="text-red-400/60 text-sm mt-1">{(error as any)?.response?.data?.error || (error as any)?.message || 'Unknown error'}</p>
        </div>
      )}

      {!isLoading && !error && (
        <div className="rounded-2xl border border-white/5 overflow-hidden" style={{ background: 'var(--bg-card)' }}>
          <table className="w-full text-left">
            <thead className="border-b border-white/5 text-[10px] uppercase text-text-muted">
              <tr>
                <th className="p-4">Title</th>
                <th className="p-4">Theme</th>
                <th className="p-4">Week</th>
                <th className="p-4">Entries</th>
                <th className="p-4">Status</th>
                <th className="p-4">Created</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((b: any) => (
                <tr key={b.id} className="border-b border-white/5 text-sm">
                  <td className="p-4 font-bold text-text-primary">{b.title}</td>
                  <td className="p-4 text-text-secondary">{b.theme || '--'}</td>
                  <td className="p-4 font-mono text-text-secondary">
                    {b.weekStart ? new Date(b.weekStart).toLocaleDateString() : '--'} - {b.weekEnd ? new Date(b.weekEnd).toLocaleDateString() : '--'}
                  </td>
                  <td className="p-4 font-mono text-text-primary">{b.entries?.length || 0}</td>
                  <td className="p-4"><StatusBadge status={b.status === 'ACTIVE' ? 'active' : 'inactive'} /></td>
                  <td className="p-4 font-mono text-text-secondary">{b.createdAt ? new Date(b.createdAt).toLocaleDateString() : '--'}</td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => navigate('/battles')} className="px-3 py-1.5 text-xs rounded-lg bg-white/5 text-text-muted hover:bg-white/10 flex items-center gap-1" title="View battles page"><Eye className="w-3 h-3" /> View</button>
                      {b.status === 'ACTIVE' && (
                        <button
                          onClick={() => { if (confirm('Close this battle?')) closeBattleMutation.mutate(b.id, { onSuccess: () => queryClient.invalidateQueries({ queryKey: ['adminBattles'] }) }); }}
                          className="px-3 py-1.5 text-xs rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 flex items-center gap-1"
                          title="Close battle"
                        >
                          <Ban className="w-3 h-3" /> Close
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <EmptyState message="No battles found." />}
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowCreateModal(false)}>
          <div className="w-full max-w-md rounded-2xl border border-white/10 p-6 space-y-4" style={{ background: 'var(--bg-modal)' }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-text-primary">Create New Battle</h3>
              <button onClick={() => setShowCreateModal(false)} className="p-1 rounded-lg hover:bg-white/5 text-text-muted"><XIcon className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-text-muted block mb-1">Title</label>
                <input value={createForm.title} onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })} className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-sm text-text-primary focus:outline-none focus:border-[#D4A24A]/30" placeholder="Battle title" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-text-muted block mb-1">Week Start</label>
                  <input type="date" value={createForm.weekStart} onChange={(e) => setCreateForm({ ...createForm, weekStart: e.target.value })} className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-sm text-text-primary focus:outline-none focus:border-[#D4A24A]/30" />
                </div>
                <div>
                  <label className="text-xs text-text-muted block mb-1">Week End</label>
                  <input type="date" value={createForm.weekEnd} onChange={(e) => setCreateForm({ ...createForm, weekEnd: e.target.value })} className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-sm text-text-primary focus:outline-none focus:border-[#D4A24A]/30" />
                </div>
              </div>
              <div>
                <label className="text-xs text-text-muted block mb-1">Theme</label>
                <input value={createForm.theme} onChange={(e) => setCreateForm({ ...createForm, theme: e.target.value })} className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-sm text-text-primary focus:outline-none focus:border-[#D4A24A]/30" placeholder="e.g. Afrobeat Mix" />
              </div>
              <div>
                <label className="text-xs text-text-muted block mb-1">Metric Type</label>
                <select value={createForm.metricType} onChange={(e) => setCreateForm({ ...createForm, metricType: e.target.value })} className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-sm text-text-primary focus:outline-none focus:border-[#D4A24A]/30">
                  <option value="PLAYS">Plays</option>
                  <option value="VOTES">Votes</option>
                  <option value="LIKES">Likes</option>
                  <option value="COMMENTS">Comments</option>
                </select>
              </div>
              <button onClick={handleCreate} disabled={createBattleMutation.isPending} className="w-full py-2 bg-[#D4A24A] text-black font-bold rounded-lg hover:bg-[#D4A24A]/90 disabled:opacity-50">
                {createBattleMutation.isPending ? 'Creating...' : 'Create Battle'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────── Section 8: Revenue ─────────────────────── */

function RevenueSection() {
  const [timeRange, setTimeRange] = useState<TimeRange>('6m');
  const { data: stats } = useAdminStats();
  const { data: paymentsData, isLoading, error } = useAdminPayments({ limit: 50 });
  const { data: analytics } = useAdminAnalytics(timeRange);

  const payments = paymentsData?.data || [];
  const commission = (stats?.estimatedRevenue || 0) * 0.15;
  const totalPayments = stats?.totalPayments || 0;
  const totalBookings = stats?.totalBookings || 0;
  const activeBookings = totalBookings - (stats?.pendingBookings || 0);

  const revenueByMonth = useMemo(() => {
    if (!analytics || analytics.length === 0) return [];
    return analytics.map((a: any) => ({ month: a.month, revenue: a.revenue || 0 }));
  }, [analytics]);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Revenue Dashboard"
        subtitle="Platform revenue and payment tracking"
        action={<TimeRangeSelector selected={timeRange} onChange={setTimeRange} />}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl p-5 border border-white/5" style={{ background: 'var(--bg-card)' }}>
          <p className="text-[10px] uppercase tracking-wider text-text-muted font-semibold">Total Payments</p>
          <p className="font-mono text-2xl font-bold text-text-primary mt-2">SLE {Math.round(totalPayments).toLocaleString()}</p>
        </div>
        <div className="rounded-2xl p-5 border border-white/5" style={{ background: 'var(--bg-card)' }}>
          <p className="text-[10px] uppercase tracking-wider text-text-muted font-semibold">Booking Commission (15%)</p>
          <p className="font-mono text-2xl font-bold text-[#D4A24A] mt-2">SLE {Math.round(commission).toLocaleString()}</p>
        </div>
        <div className="rounded-2xl p-5 border border-white/5" style={{ background: 'var(--bg-card)' }}>
          <p className="text-[10px] uppercase tracking-wider text-text-muted font-semibold">Completed Bookings</p>
          <p className="font-mono text-2xl font-bold text-text-primary mt-2">{activeBookings.toLocaleString()}</p>
        </div>
        <div className="rounded-2xl p-5 border border-white/5" style={{ background: 'var(--bg-card)' }}>
          <p className="text-[10px] uppercase tracking-wider text-text-muted font-semibold">Pending Bookings</p>
          <p className="font-mono text-2xl font-bold text-[#F97316] mt-2">{(stats?.pendingBookings || 0).toLocaleString()}</p>
        </div>
      </div>

      <div className="rounded-2xl p-6 border border-white/5" style={{ background: 'var(--bg-card)' }}>
        <p className="text-xs font-semibold uppercase tracking-wider text-[#D4A24A] mb-4">Revenue by Month</p>
        {revenueByMonth.length > 0 ? (
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E1E1E" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6B6B6B' }} />
                <YAxis tick={{ fontSize: 11, fill: '#6B6B6B' }} />
                <Bar dataKey="revenue" fill="#D4A24A" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-[260px] flex items-center justify-center"><p className="font-mono text-text-muted">--</p></div>
        )}
      </div>

      {isLoading && <LoadingCenter />}

      {error && (
        <div className="rounded-2xl border border-red-500/20 p-6 text-center" style={{ background: 'var(--bg-error)' }}>
          <p className="text-red-400 font-medium">Failed to load data</p>
          <p className="text-red-400/60 text-sm mt-1">{(error as any)?.response?.data?.error || (error as any)?.message || 'Unknown error'}</p>
        </div>
      )}

      {!isLoading && !error && (
        <div className="rounded-2xl border border-white/5 overflow-hidden" style={{ background: 'var(--bg-card)' }}>
          <p className="text-xs font-semibold uppercase tracking-wider text-text-muted p-4 pb-0">All Payments</p>
          <table className="w-full text-left mt-4">
            <thead className="border-b border-white/5 text-[10px] uppercase text-text-muted">
              <tr>
                <th className="p-4">ID</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Currency</th>
                <th className="p-4">Type</th>
                <th className="p-4">Status</th>
                <th className="p-4">Provider</th>
                <th className="p-4">Date</th>
                <th className="p-4">Booking</th>
                <th className="p-4">Client</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p: any) => (
                <tr key={p.id} className="border-b border-white/5 text-sm">
                  <td className="p-4 font-mono text-text-muted">{p.id?.slice(0, 8)}</td>
                  <td className="p-4 font-mono text-text-primary">SLE {(p.amount || 0).toLocaleString()}</td>
                  <td className="p-4 text-text-secondary">{p.currency || 'SLE'}</td>
                  <td className="p-4 text-text-secondary">{p.type}</td>
                  <td className="p-4"><StatusBadge status={p.status || 'pending'} /></td>
                  <td className="p-4 text-text-secondary">{p.provider || '--'}</td>
                  <td className="p-4 font-mono text-text-secondary">{p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '--'}</td>
                  <td className="p-4 text-text-secondary">{p.bookingId?.slice(0, 8) || '--'}</td>
                  <td className="p-4 text-text-secondary">{p.client?.email || '--'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {payments.length === 0 && <EmptyState message="No payments found." />}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────── Section 9: Analytics ─────────────────────── */

function AnalyticsSection() {
  const [timeRange, setTimeRange] = useState<TimeRange>('6m');
  const { data: analytics, isLoading, error } = useAdminAnalytics(timeRange);
  const { data: rankingsData } = useAdminRankings();
  const { data: djsData } = useAdminDjs({ limit: 100 });
  const { data: platformsData } = useAdminPlatforms();
  const { data: geography } = useAdminGeography();

  const streamData = useMemo(() => {
    if (!analytics || analytics.length === 0) return [];
    return analytics.map((a: any) => ({ month: a.month, revenue: a.revenue || 0 }));
  }, [analytics]);

  const visitsData = useMemo(() => {
    if (!analytics || analytics.length === 0) return [];
    return analytics.map((a: any) => ({ month: a.month, visits: a.visits || 0 }));
  }, [analytics]);

  const topDjsByStreams = useMemo(() => {
    if (!rankingsData || rankingsData.length === 0) return [];
    return [...rankingsData].sort((a: any, b: any) => (b.totalStreams || 0) - (a.totalStreams || 0)).slice(0, 5);
  }, [rankingsData]);

  const topDjsByFollowers = useMemo(() => {
    if (!rankingsData || rankingsData.length === 0) return [];
    return [...rankingsData].sort((a: any, b: any) => (b.totalFollowers || 0) - (a.totalFollowers || 0)).slice(0, 5);
  }, [rankingsData]);

  const genreCounts = useMemo(() => {
    if (!djsData?.data) return [];
    const counts: Record<string, number> = {};
    djsData.data.forEach((dj: any) => {
      (dj.genres || []).forEach((g: string) => { counts[g] = (counts[g] || 0) + 1; });
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [djsData]);

  const platformData = useMemo(() => {
    if (!platformsData || platformsData.length === 0) return [];
    const colors = ['#FF5500', '#FF5722', '#D4A24A', '#8B5CF6', '#3B82F6', '#22C55E'];
    return platformsData.map((p: any, i: number) => ({
      name: p.name,
      value: (p.streams || 0) + (p.followers || 0) + (p.uploads || 0),
      color: colors[i % colors.length],
    })).filter((p: any) => p.value > 0);
  }, [platformsData]);

  if (isLoading) return <LoadingCenter />;

  if (error) return (
    <div className="rounded-2xl border border-red-500/20 p-6 text-center" style={{ background: 'var(--bg-error)' }}>
      <p className="text-red-400 font-medium">Failed to load data</p>
      <p className="text-red-400/60 text-sm mt-1">{(error as any)?.response?.data?.error || (error as any)?.message || 'Unknown error'}</p>
    </div>
  );

  return (
    <div className="space-y-8">
      <SectionHeader
        title="Platform Analytics"
        subtitle="Deep dive into platform performance metrics"
        action={<TimeRangeSelector selected={timeRange} onChange={setTimeRange} />}
      />

      <div className="grid lg:grid-cols-2 gap-6">
        <motion.div className="rounded-2xl p-6 border border-white/5" style={{ background: 'var(--bg-card)' }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#D4A24A] mb-4">Monthly Revenue</p>
          {streamData.length > 0 ? (
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={streamData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E1E1E" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6B6B6B' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#6B6B6B' }} />
                  <Area type="monotone" dataKey="revenue" stroke="#D4A24A" fill="rgba(212,162,74,0.1)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[260px] flex items-center justify-center"><p className="font-mono text-text-muted">--</p></div>
          )}
        </motion.div>

        <motion.div className="rounded-2xl p-6 border border-white/5" style={{ background: 'var(--bg-card)' }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#D4A24A] mb-4">Monthly Site Visits</p>
          {visitsData.length > 0 ? (
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={visitsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E1E1E" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6B6B6B' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#6B6B6B' }} />
                  <Area type="monotone" dataKey="visits" stroke="#EC4899" fill="rgba(236,72,153,0.1)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[260px] flex items-center justify-center"><p className="font-mono text-text-muted">--</p></div>
          )}
        </motion.div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <motion.div className="rounded-2xl p-6 border border-white/5" style={{ background: 'var(--bg-card)' }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#D4A24A] mb-4">Top DJs by Streams</p>
          <div className="space-y-3">
            {topDjsByStreams.length > 0 ? topDjsByStreams.map((dj: any) => (
              <div key={dj.id} className="flex items-center justify-between text-sm">
                <span className="text-text-primary">{dj.stageName}</span>
                <span className="font-mono text-text-muted">{(dj.totalStreams || 0).toLocaleString()}</span>
              </div>
            )) : <EmptyState message="No data available." />}
          </div>
        </motion.div>

        <motion.div className="rounded-2xl p-6 border border-white/5" style={{ background: 'var(--bg-card)' }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#D4A24A] mb-4">Top DJs by Followers</p>
          <div className="space-y-3">
            {topDjsByFollowers.length > 0 ? topDjsByFollowers.map((dj: any) => (
              <div key={dj.id} className="flex items-center justify-between text-sm">
                <span className="text-text-primary">{dj.stageName}</span>
                <span className="font-mono text-text-muted">{(dj.totalFollowers || 0).toLocaleString()}</span>
              </div>
            )) : <EmptyState message="No data available." />}
          </div>
        </motion.div>

        <motion.div className="rounded-2xl p-6 border border-white/5" style={{ background: 'var(--bg-card)' }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#D4A24A] mb-4">Most Popular Genres</p>
          <div className="space-y-3">
            {genreCounts.length > 0 ? genreCounts.map(([genre, count]) => (
              <div key={genre} className="flex items-center justify-between text-sm">
                <span className="text-text-primary">{genre}</span>
                <span className="font-mono text-text-muted">{count}</span>
              </div>
            )) : <EmptyState message="No genre data available." />}
          </div>
        </motion.div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <motion.div className="rounded-2xl p-6 border border-white/5" style={{ background: 'var(--bg-card)' }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#D4A24A] mb-4">Top Visitor Cities</p>
          <div className="space-y-3">
            {geography?.cities && geography.cities.length > 0 ? geography.cities.map((c) => (
              <div key={c.name || 'Unknown'} className="flex items-center justify-between text-sm">
                <span className="text-text-primary">{c.name || 'Unknown'}</span>
                <span className="font-mono text-text-muted">{c.visits} visits</span>
              </div>
            )) : <EmptyState message="No visitor geography data available." />}
          </div>
        </motion.div>

        <motion.div className="rounded-2xl p-6 border border-white/5" style={{ background: 'var(--bg-card)' }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#D4A24A] mb-4">Streaming Platforms</p>
          {platformData.length > 0 ? (
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={platformData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value">
                    {platformData.map((entry: any) => <Cell key={entry.name} fill={entry.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[180px] flex items-center justify-center"><p className="font-mono text-text-muted">--</p></div>
          )}
          <div className="flex flex-wrap gap-3 justify-center mt-2">
            {platformData.map((entry: any) => (
              <div key={entry.name} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-xs text-text-secondary">{entry.name}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

/* ─────────────────────── Section 10: Platform Integrations ─────────────────────── */

function PlatformsSection() {
  const { data: system, isLoading: systemLoading, error: systemError } = useAdminSystem();
  const { data: platforms, isLoading: platformsLoading, error: platformsError } = useAdminPlatforms();

  const uptime = system?.uptime ? `${Math.floor(system.uptime / 60)}m` : 'N/A';
  const memory = system?.memory ? `${Math.round((system.memory.heapUsed || 0) / 1024 / 1024)}MB` : 'N/A';
  const counts = system && typeof system.counts === 'object' && system.counts ? system.counts : {};
  const platformList = Array.isArray(platforms) ? platforms : [];

  if (systemLoading || platformsLoading) return <LoadingCenter />;

  if (systemError || platformsError) return (
    <div className="rounded-2xl border border-red-500/20 p-6 text-center" style={{ background: 'var(--bg-error)' }}>
      <p className="text-red-400 font-medium">Failed to load data</p>
      <p className="text-red-400/60 text-sm mt-1">{(systemError as any)?.response?.data?.error || (platformsError as any)?.response?.data?.error || (systemError as any)?.message || (platformsError as any)?.message || 'Unknown error'}</p>
    </div>
  );

  const getPlatform = (name: string) => platformList.find((p: any) => p && (p.name === name || p.platform === name));

  const totalRecords = Object.values(counts).reduce((a: number, b: any) => a + (Number(b) || 0), 0);

  const platformCards = [
    { name: 'Database', icon: HardDrive, status: system?.dbStatus === 'connected' ? 'connected' : 'disconnected', latency: '< 50ms', records: `${totalRecords.toLocaleString()} rows` },
    { name: 'Server', icon: Server, status: 'connected', uptime, memory },
    { name: 'YouTube', icon: MonitorPlay, status: getPlatform('YouTube') ? 'connected' : 'disconnected', lastSync: 'Auto-sync', djs: getPlatform('YouTube')?.djs || 0, followers: getPlatform('YouTube')?.followers || 0, streams: getPlatform('YouTube')?.streams || 0 },
    { name: 'Audiomack', icon: AudioLines, status: getPlatform('Audiomack') ? 'connected' : 'disconnected', lastSync: 'Auto-sync', djs: getPlatform('Audiomack')?.djs || 0, followers: getPlatform('Audiomack')?.followers || 0, streams: getPlatform('Audiomack')?.streams || 0 },
    { name: 'Mixcloud', icon: Radio, status: getPlatform('Mixcloud') ? 'connected' : 'disconnected', lastSync: 'Auto-sync', djs: getPlatform('Mixcloud')?.djs || 0, followers: getPlatform('Mixcloud')?.followers || 0, streams: getPlatform('Mixcloud')?.streams || 0 },
    { name: 'HearThis', icon: Volume2, status: getPlatform('HearThis') ? 'connected' : 'disconnected', lastSync: 'Auto-sync', djs: getPlatform('HearThis')?.djs || 0, followers: getPlatform('HearThis')?.followers || 0, streams: getPlatform('HearThis')?.streams || 0 },
    { name: 'SoundCloud', icon: Music, status: getPlatform('SoundCloud') ? 'connected' : 'disconnected', lastSync: 'Auto-sync', djs: getPlatform('SoundCloud')?.djs || 0, followers: getPlatform('SoundCloud')?.followers || 0, streams: getPlatform('SoundCloud')?.streams || 0 },
    { name: 'Cloudinary', icon: HardDrive, status: 'connected', storage: 'Active' },
    { name: 'AWS S3', icon: Package, status: 'connected', storage: 'Active' },
  ];


  return (
    <div className="space-y-6">
      <SectionHeader title="API & Integrations" subtitle="Platform health and connection status" />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {platformCards.map((card, i) => (
          <motion.div
            key={card.name}
            className="rounded-2xl p-5 border border-white/5"
            style={{ background: 'var(--bg-card)' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                  <card.icon className="w-5 h-5 text-[#D4A24A]" />
                </div>
                <div>
                  <p className="text-sm font-bold text-text-primary">{card.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className="w-2 h-2 rounded-full" style={{ background: card.status === 'connected' ? '#22C55E' : '#EF4444' }} />
                    <span className="text-[10px] uppercase tracking-wider text-text-muted">{card.status === 'connected' ? 'Connected' : 'Disconnected'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2 text-xs text-text-muted">
              {'latency' in card && <div className="flex justify-between"><span>Latency</span><span className="font-mono text-text-secondary">{card.latency}</span></div>}
              {'records' in card && <div className="flex justify-between"><span>Records</span><span className="font-mono text-text-secondary">{card.records}</span></div>}
              {'uptime' in card && <div className="flex justify-between"><span>Uptime</span><span className="font-mono text-text-secondary">{card.uptime}</span></div>}
              {'memory' in card && <div className="flex justify-between"><span>Memory</span><span className="font-mono text-text-secondary">{card.memory}</span></div>}
              {'lastSync' in card && <div className="flex justify-between"><span>Last Sync</span><span className="font-mono text-text-secondary">{card.lastSync}</span></div>}
              {'djs' in card && <div className="flex justify-between"><span>Connected DJs</span><span className="font-mono text-text-secondary">{card.djs}</span></div>}
              {'followers' in card && card.followers != null && card.followers > 0 && <div className="flex justify-between"><span>Followers</span><span className="font-mono text-text-secondary">{(card.followers as number).toLocaleString()}</span></div>}
              {'streams' in card && card.streams != null && card.streams > 0 && <div className="flex justify-between"><span>Streams</span><span className="font-mono text-text-secondary">{(card.streams as number).toLocaleString()}</span></div>}
              {'storage' in card && <div className="flex justify-between"><span>Storage</span><span className="font-mono text-text-secondary">{card.storage}</span></div>}
            </div>

            <div className="flex gap-2 mt-4">
              <button className="px-3 py-1.5 text-xs rounded-lg bg-white/5 text-text-muted hover:bg-white/10 opacity-50 cursor-not-allowed" title="Not implemented">Test Connection</button>
              <button className="px-3 py-1.5 text-xs rounded-lg bg-white/5 text-text-muted hover:bg-white/10 opacity-50 cursor-not-allowed" title="Not implemented">Reconnect</button>
              <button className="px-3 py-1.5 text-xs rounded-lg bg-white/5 text-text-muted hover:bg-white/10 opacity-50 cursor-not-allowed" title="Not implemented">View Logs</button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* System Bug Logs & Error Monitor */}
      <SystemBugLogsWidget />
    </div>
  );
}


/* ─────────────────────── Section 11: Verification ─────────────────────── */

function VerificationSection() {
  const { data: requestsData, isLoading, error } = useAdminVerificationRequests();
  const verifyMutation = useVerifyDj();
  const rejectMutation = useRejectDjVerification();
  const requestInfoMutation = useRequestDjInfo();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<any | null>(null);
  const [action, setAction] = useState<'approve' | 'reject' | 'request' | 'badge' | null>(null);
  const [note, setNote] = useState('');
  const [badgeType, setBadgeType] = useState<'grey' | 'gold'>('grey');
  const [isSavingBadge, setIsSavingBadge] = useState(false);

  const requests = requestsData || [];

  const handleAction = () => {
    if (!selected || !action) return;
    const onSettled = () => {
      setSelected(null);
      setAction(null);
      setNote('');
      queryClient.invalidateQueries({ queryKey: ['adminVerificationRequests'] });
      queryClient.invalidateQueries({ queryKey: ['adminPendingDJs'] });
      queryClient.invalidateQueries({ queryKey: ['adminStats'] });
    };

    if (action === 'approve') {
      verifyMutation.mutate({ id: selected.id, notes: note, badgeType }, { onSettled });
    } else if (action === 'badge') {
      setIsSavingBadge(true);
      api.put(`/admin/djs/${selected.id}/badge-type`, { badgeType }).then(() => {
        toast.success('Badge type updated!');
        onSettled();
      }).catch(() => toast.error('Failed to update badge'))
      .finally(() => setIsSavingBadge(false));
    } else if (action === 'reject') {
      if (!note) return toast.error('Rejection reason is required');
      rejectMutation.mutate({ id: selected.id, reason: note }, { onSettled });
    } else if (action === 'request') {
      if (!note) return toast.error('Request notes are required');
      requestInfoMutation.mutate({ id: selected.id, notes: note }, { onSettled });
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader title="DJ Verification" subtitle="Review passport/ID submissions and approve verified DJs" />

      {isLoading && <LoadingCenter />}

      {error && (
        <div className="rounded-2xl border border-red-500/20 p-6 text-center" style={{ background: 'var(--bg-error)' }}>
          <p className="text-red-400 font-medium">Failed to load data</p>
          <p className="text-red-400/60 text-sm mt-1">{(error as any)?.response?.data?.error || (error as any)?.message || 'Unknown error'}</p>
        </div>
      )}

      {!isLoading && !error && (
        <div className="grid gap-4">
          {requests.map((v: any) => (
            <motion.div
              key={v.id}
              className="rounded-2xl p-5 border border-white/5"
              style={{ background: 'var(--bg-card)' }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-bold text-text-primary">{v.stageName}</p>
                    <StatusBadge status={v.verificationStatus || 'pending'} />
                  </div>
                  <p className="text-xs text-text-muted mt-0.5">{v.user?.email || '--'}</p>
                  <p className="text-xs text-text-muted mt-0.5">Submitted: {v.updatedAt ? new Date(v.updatedAt).toLocaleDateString() : '--'}</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 text-xs">
                    <div className="flex items-center gap-2 text-text-secondary">
                      <Globe className="w-3.5 h-3.5 text-gold" />
                      Nationality: {v.nationality || '--'}
                    </div>
                    <div className="flex items-center gap-2 text-text-secondary">
                      <FileText className="w-3.5 h-3.5 text-gold" />
                      ID Type: {v.idDocumentType ? v.idDocumentType.replace(/_/g, ' ') : '--'}
                    </div>
                    <div className="flex items-center gap-2 text-text-secondary md:col-span-2">
                      <span className="font-semibold">Legal name:</span> {v.legalName || '--'}
                    </div>
                  </div>

                  {v.idDocumentUrl && (
                    <div className="mt-4">
                      <a
                        href={v.idDocumentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 text-text-secondary hover:bg-white/10 text-xs"
                      >
                        <Eye className="w-3.5 h-3.5" /> View Uploaded Document
                      </a>
                    </div>
                  )}

                  {(v.socialProof || v.verificationReason) && (
                    <div className="mt-4 space-y-2 text-xs text-text-secondary bg-white/[0.02] p-3 rounded-xl">
                      {v.socialProof && <p><span className="font-semibold">Social proof:</span> {v.socialProof}</p>}
                      {v.verificationReason && <p><span className="font-semibold">Reason:</span> {v.verificationReason}</p>}
                      {v.verificationNotes && <p><span className="font-semibold">Notes:</span> {v.verificationNotes}</p>}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  {!v.verified && v.verificationStatus?.toLowerCase() !== 'verified' && v.verificationStatus?.toLowerCase() !== 'approved' && (
                    <button onClick={() => { setSelected(v); setAction('approve'); setNote(''); setBadgeType('grey'); }} className="px-4 py-2 bg-green-500/10 text-green-400 rounded-xl text-xs font-bold hover:bg-green-500/20 flex items-center gap-1">
                      <Check className="w-4 h-4" /> Approve
                    </button>
                  )}
                  {(v.verified || v.verificationStatus?.toLowerCase() === 'verified' || v.verificationStatus?.toLowerCase() === 'approved') && (
                    <button onClick={() => { setSelected(v); setAction('badge'); setBadgeType(v.verificationBadgeType || 'grey'); }} className="px-4 py-2 bg-yellow-500/10 text-yellow-400 rounded-xl text-xs font-bold hover:bg-yellow-500/20 flex items-center gap-1">
                      🏅 Change Badge
                    </button>
                  )}
                  {v.verificationStatus?.toLowerCase() !== 'rejected' && (
                    <button onClick={() => { setSelected(v); setAction('reject'); setNote(''); }} className="px-4 py-2 bg-red-500/10 text-red-400 rounded-xl text-xs font-bold hover:bg-red-500/20 flex items-center gap-1">
                      <XIcon className="w-3.5 h-3.5" /> Reject
                    </button>
                  )}
                  {!v.verified && v.verificationStatus?.toLowerCase() !== 'verified' && v.verificationStatus?.toLowerCase() !== 'approved' && (
                    <button onClick={() => { setSelected(v); setAction('request'); setNote(''); }} className="px-4 py-2 bg-white/5 text-text-muted rounded-xl text-xs font-bold hover:bg-white/10 flex items-center gap-1">
                      Request Info
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
          {requests.length === 0 && <EmptyState message="No verification requests." />}
        </div>
      )}

      {selected && action && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setAction(null)}>
          <div className="w-full max-w-md rounded-2xl border border-white/10 p-6 space-y-4" style={{ background: 'var(--bg-modal)' }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-text-primary">
                {action === 'approve' ? 'Approve Verification' : action === 'reject' ? 'Reject Verification' : action === 'badge' ? 'Change Badge Type' : 'Request More Info'}
              </h3>
              <button onClick={() => setAction(null)} className="p-1 rounded-lg hover:bg-white/5 text-text-muted"><XIcon className="w-4 h-4" /></button>
            </div>
            <p className="text-xs text-text-muted">DJ: <span className="text-text-primary font-semibold">{selected.stageName}</span></p>

            {(action === 'approve' || action === 'badge') && (
              <div>
                <label className="block text-xs text-text-muted mb-2">Badge Type</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setBadgeType('grey')}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                      badgeType === 'grey'
                        ? 'bg-gray-400/20 border-gray-400 text-gray-300'
                        : 'bg-white/5 border-white/10 text-text-muted hover:bg-white/10'
                    }`}
                  >
                    ⚪ Grey — Standard Verified
                  </button>
                  <button
                    onClick={() => setBadgeType('gold')}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                      badgeType === 'gold'
                        ? 'bg-yellow-400/20 border-yellow-400 text-yellow-300'
                        : 'bg-white/5 border-white/10 text-text-muted hover:bg-white/10'
                    }`}
                  >
                    🥇 Gold — Monetized / VIP
                  </button>
                </div>
              </div>
            )}

            {action !== 'badge' && (
            <div>
              <label className="block text-xs text-text-muted mb-1.5">
                {action === 'approve' ? 'Approval notes (optional)' : action === 'reject' ? 'Rejection reason (required)' : 'What information do you need? (required)'}
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 bg-white/5 border border-white/5 rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none resize-none"
                placeholder={action === 'approve' ? 'Optional internal notes...' : 'Write your message...'}
              />
            </div>
            )}
            <button
              onClick={handleAction}
              disabled={verifyMutation.isPending || rejectMutation.isPending || requestInfoMutation.isPending || isSavingBadge}
              className={`w-full px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50 ${action === 'approve' ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' : action === 'reject' ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : action === 'badge' ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30' : 'bg-[#D4A24A] text-black hover:bg-[#D4A24A]/90'
                }`}
            >
              {(verifyMutation.isPending || rejectMutation.isPending || requestInfoMutation.isPending || isSavingBadge) && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {action === 'approve' ? 'Confirm Approval' : action === 'reject' ? 'Confirm Rejection' : action === 'badge' ? 'Save' : 'Send Request'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────── Section 12: Notifications ─────────────────────── */

function NotificationsSection() {
  const { data: notifications, isLoading, error } = useAdminNotifications({ limit: 20 });
  const sendMutation = useSendNotification();
  const uploadMediaMutation = useUploadNotifMedia();
  const testEmailMutation = useTestEmail();
  const clearNotifications = useClearAdminNotifications();
  const [notifType, setNotifType] = useState<'Both' | 'Push' | 'Email' | 'WhatsApp' | 'SMS'>('Both');
  const [target, setTarget] = useState('All Users');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [schedule, setSchedule] = useState('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<{ url: string; type: 'image' | 'video' } | null>(null);
  const [uploadedMedia, setUploadedMedia] = useState<{ url: string; type: 'image' | 'video' } | null>(null);
  const [testEmailAddr, setTestEmailAddr] = useState('djfredmax221@gmail.com');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleTestEmail = () => {
    if (!testEmailAddr.trim() || !testEmailAddr.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }
    testEmailMutation.mutate(testEmailAddr, {
      onSuccess: () => {
        toast.success(`✅ Test email sent to ${testEmailAddr}!`);
      },
      onError: (err: any) => {
        toast.error(err?.response?.data?.error || 'Failed to send test email');
      },
    });
  };


  const handleMediaSelect = async (file: File) => {
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    if (!isImage && !isVideo) {
      toast.error('Only images (JPG, PNG, WebP, GIF) and videos (MP4, WebM, MOV) are allowed.');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      toast.error('File too large. Maximum size is 50 MB.');
      return;
    }
    setMediaFile(file);
    setMediaPreview({ url: URL.createObjectURL(file), type: isVideo ? 'video' : 'image' });
    setUploadedMedia(null);

    // Upload immediately
    uploadMediaMutation.mutate(file, {
      onSuccess: (data) => {
        setUploadedMedia({ url: data.url, type: data.type });
        toast.success(`${data.type === 'video' ? '🎬 Video' : '🖼️ Image'} uploaded!`);
      },
      onError: (err: any) => {
        toast.error(err?.response?.data?.error || 'Media upload failed');
        setMediaFile(null);
        setMediaPreview(null);
      },
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleMediaSelect(file);
  };

  const removeMedia = () => {
    setMediaFile(null);
    setMediaPreview(null);
    setUploadedMedia(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSend = () => {
    if (!title.trim() || !message.trim()) return;
    if (mediaFile && !uploadedMedia) {
      toast.error('Please wait for the media to finish uploading.');
      return;
    }
    sendMutation.mutate({
      type: notifType,
      target,
      title,
      message,
      scheduled: schedule || undefined,
      mediaUrl: uploadedMedia?.url,
      mediaType: uploadedMedia?.type,
    }, {
      onSuccess: (data: any) => {
        setTitle('');
        setMessage('');
        setSchedule('');
        removeMedia();
        const wantsEmail = notifType === 'Email' || notifType === 'Both';
        if (wantsEmail && data) {
          const sent = data.emailsSent ?? 0;
          const failed = data.emailsFailed ?? 0;
          if (failed > 0 && sent === 0) {
            toast.error(`Email delivery failed for all ${failed} recipients. Check SMTP config.`);
          } else if (failed > 0) {
            toast.success(`Email sent to ${sent} user${sent !== 1 ? 's' : ''}. ${failed} failed — check server logs.`);
          } else if (sent > 0) {
            toast.success(`✅ Email sent to ${sent} user${sent !== 1 ? 's' : ''}!`);
          } else {
            toast.success('No matching users found for the selected audience.');
          }
        } else {
          toast.success('Notification sent successfully');
        }
      },
      onError: (err: any) => {
        toast.error(err?.response?.data?.error || 'Failed to send notification');
      },
    });
  };

  return (
    <div className="space-y-6">
      <SectionHeader title="Notification Center" subtitle="Send and manage platform notifications" />

      {/* Quick SMTP Test Box */}
      <div className="rounded-2xl p-4 border border-[#D4A24A]/20 bg-[#D4A24A]/5 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#D4A24A]/10 border border-[#D4A24A]/30 flex items-center justify-center text-[#D4A24A]">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-text-primary">Verify SMTP Delivery</p>
            <p className="text-xs text-text-muted">Send an instant test email to verify hostinger email server connection</p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <input
            type="email"
            value={testEmailAddr}
            onChange={(e) => setTestEmailAddr(e.target.value)}
            placeholder="Recipient email..."
            className="px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-text-primary placeholder:text-text-muted focus:outline-none w-full md:w-64"
          />
          <button
            onClick={handleTestEmail}
            disabled={testEmailMutation.isPending}
            className="px-4 py-2 bg-[#D4A24A] hover:bg-[#D4A24A]/90 text-black font-bold rounded-xl text-xs whitespace-nowrap flex items-center gap-1.5 disabled:opacity-50"
          >
            {testEmailMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            Send Test
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Compose Form */}
        <motion.div className="rounded-2xl p-6 border border-white/5" style={{ background: 'var(--bg-card)' }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#D4A24A] mb-4">Compose Notification</p>


          <div className="space-y-4">
            <div>
              <label className="block text-xs text-text-muted mb-1.5">Notification Type</label>
              <div className="flex gap-2">
                {(['Both', 'Push', 'Email', 'WhatsApp', 'SMS'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setNotifType(t)}
                    className={`px-3 py-1.5 text-xs rounded-lg font-bold ${notifType === t ? 'bg-[#D4A24A] text-black' : 'bg-white/5 text-text-muted hover:bg-white/10'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              {notifType === 'WhatsApp' && (
                <div className="mt-2.5 p-3 rounded-xl bg-[#25D366]/10 border border-[#25D366]/30 flex items-center justify-between text-xs text-text-primary">
                  <div className="flex items-center gap-2">
                    <span className="text-base">💬</span>
                    <div>
                      <p className="font-bold text-[#25D366]">Official WhatsApp Line (+232 72 011 156)</p>
                      <p className="text-[11px] text-text-muted">Sends via official Deck Salone WhatsApp number or generates 1-click WhatsApp web links.</p>
                    </div>
                  </div>
                  <a
                    href={`https://wa.me/23272011156?text=${encodeURIComponent(title ? `${title}\n\n${message}` : 'Hello from Deck Salone Admin')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1 bg-[#25D366] text-black font-bold rounded-lg text-[11px] hover:brightness-110 flex items-center gap-1 shrink-0"
                  >
                    Test Line ➔
                  </a>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs text-text-muted mb-1.5">Target Audience</label>
              <select value={target} onChange={(e) => setTarget(e.target.value)} className="w-full px-3 py-2 bg-white/5 border border-white/5 rounded-lg text-sm text-text-primary focus:outline-none">
                <option>All Users</option>
                <option>All DJs</option>
                <option>Verified DJs</option>
                <option>Premium DJs</option>
                <option>Admins</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-text-muted mb-1.5">Title</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Enter notification title..." className="w-full px-3 py-2 bg-white/5 border border-white/5 rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none" />
            </div>

            <div>
              <label className="block text-xs text-text-muted mb-1.5">Message</label>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} placeholder="Write your message here..." className="w-full px-3 py-2 bg-white/5 border border-white/5 rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none resize-none" />
            </div>

            {/* ── Media Upload Zone ── */}
            <div>
              <label className="block text-xs text-text-muted mb-1.5">Attach Media <span className="text-text-muted/60">(image or video, optional)</span></label>

              {!mediaPreview ? (
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  onClick={() => fileInputRef.current?.click()}
                  className="relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-white/10 bg-white/[0.02] hover:border-[#D4A24A]/40 hover:bg-white/[0.04] cursor-pointer transition-all p-6 text-center"
                >
                  <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mb-1">
                    <Upload className="w-4 h-4 text-text-muted" />
                  </div>
                  <p className="text-xs text-text-primary font-medium">Drop image or video here</p>
                  <p className="text-[10px] text-text-muted">JPG, PNG, WebP, GIF, MP4, WebM, MOV — max 50 MB</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/mp4,video/webm,video/quicktime"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleMediaSelect(f); }}
                  />
                </div>
              ) : (
                <div className="relative rounded-xl overflow-hidden border border-white/10 bg-black">
                  {mediaPreview.type === 'image' ? (
                    <img src={mediaPreview.url} alt="Preview" className="w-full max-h-48 object-cover" />
                  ) : (
                    <video src={mediaPreview.url} className="w-full max-h-48 object-cover" controls muted />
                  )}
                  {/* Upload status overlay */}
                  {uploadMediaMutation.isPending && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin text-[#D4A24A]" />
                      <span className="text-xs text-white font-medium">Uploading…</span>
                    </div>
                  )}
                  {uploadedMedia && (
                    <div className="absolute top-2 left-2 bg-green-500/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Uploaded
                    </div>
                  )}
                  <button
                    onClick={removeMedia}
                    className="absolute top-2 right-2 w-6 h-6 bg-black/70 hover:bg-red-500/80 rounded-full flex items-center justify-center transition-colors"
                  >
                    <XIcon className="w-3.5 h-3.5 text-white" />
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs text-text-muted mb-1.5">Schedule (optional)</label>
              <input type="datetime-local" value={schedule} onChange={(e) => setSchedule(e.target.value)} className="w-full px-3 py-2 bg-white/5 border border-white/5 rounded-lg text-sm text-text-primary focus:outline-none" />
            </div>

            <button
              onClick={handleSend}
              disabled={sendMutation.isPending || uploadMediaMutation.isPending || !title.trim() || !message.trim()}
              className="w-full px-4 py-2.5 bg-[#D4A24A] text-black rounded-xl text-xs font-bold hover:bg-[#D4A24A]/90 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {sendMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <Send className="w-3.5 h-3.5" /> Send Now
            </button>
          </div>
        </motion.div>


        {/* Recent Notifications */}
        <motion.div className="rounded-2xl p-6 border border-white/5" style={{ background: 'var(--bg-card)' }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="flex justify-between items-center mb-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#D4A24A]">Recent Notifications</p>
            {notifications && notifications.length > 0 && (
              <button 
                onClick={() => clearNotifications.mutate()}
                disabled={clearNotifications.isPending}
                className="text-xs text-text-muted hover:text-white"
              >
                Clear All
              </button>
            )}
          </div>
          {isLoading && <LoadingCenter />}

          {error && (
            <div className="rounded-2xl border border-red-500/20 p-6 text-center" style={{ background: 'var(--bg-error)' }}>
              <p className="text-red-400 font-medium">Failed to load data</p>
              <p className="text-red-400/60 text-sm mt-1">{(error as any)?.response?.data?.error || (error as any)?.message || 'Unknown error'}</p>
            </div>
          )}

          {!isLoading && !error && (
            <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
              {(notifications || []).length > 0 ? (notifications || []).map((n: any) => (
                <div key={n.id} className="rounded-xl p-3 border border-white/5 bg-white/[0.02]">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: n.type === 'verification' ? 'rgba(249,115,22,0.1)' : n.type === 'booking' ? 'rgba(34,197,94,0.1)' : 'rgba(59,130,246,0.1)' }}>
                      {n.type === 'verification' ? <AlertTriangle className="w-4 h-4 text-orange-400" /> : n.type === 'booking' ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <Bell className="w-4 h-4 text-blue-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-text-primary">{n.title}</p>
                      <p className="text-xs text-text-muted mt-0.5">{n.message}</p>
                      <p className="text-[10px] text-text-muted mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {n.createdAt ? new Date(n.createdAt).toLocaleDateString() : '--'}
                      </p>
                    </div>
                  </div>
                </div>
              )) : <EmptyState message="No recent notifications." />}
            </div>
          )}
        </motion.div>
      </div>

      {/* Direct Custom Email Sender */}
      <DirectEmailSenderWidget />
    </div>
  );
}


/* ─────────────────────── Section 13: Subscriptions ─────────────────────── */

function SubscriptionsSection() {
  const { data: subs, isLoading, error } = useAdminSubscriptions();
  const { data: requests, isLoading: requestsLoading, error: requestsError } = useAdminProSubscriptionRequests();
  const approveMutation = useApproveProSubscriptionRequest();
  const rejectMutation = useRejectProSubscriptionRequest();
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

  const handleApproveSubscription = (id: string) => {
    approveMutation.mutate(
      { id, note: reviewNotes[id] || undefined },
      {
        onSuccess: () => {
          setReviewNotes({ ...reviewNotes, [id]: '' });
          toast.success('✓ Subscription activated! DJ has been notified.');
        },
        onError: (err: any) => toast.error(err.response?.data?.error || 'Failed to approve request'),
      }
    );
  };

  const handleRejectSubscription = (id: string) => {
    rejectMutation.mutate(
      { id, note: reviewNotes[id] || undefined },
      {
        onSuccess: () => {
          setReviewNotes({ ...reviewNotes, [id]: '' });
          toast.success('✓ Request rejected. DJ has been notified.');
        },
        onError: (err: any) => toast.error(err.response?.data?.error || 'Failed to reject request'),
      }
    );
  };

  if (isLoading || requestsLoading) return <LoadingCenter />;

  if (error || requestsError) return (
    <div className="rounded-2xl border border-red-500/20 p-6 text-center" style={{ background: 'var(--bg-error)' }}>
      <p className="text-red-400 font-medium">Failed to load subscription data</p>
      <p className="text-red-400/60 text-sm mt-1">{(error as any)?.response?.data?.error || (error as any)?.message || 'Unknown error'}</p>
    </div>
  );

  // Count requests by status
  const pendingCount = (requests || []).filter(r => r.status === 'pending').length;
  const approvedCount = (requests || []).filter(r => r.status === 'approved').length;
  const rejectedCount = (requests || []).filter(r => r.status === 'rejected').length;

  // Filter requests based on selected filter
  const filteredRequests = (requests || []).filter(r =>
    selectedFilter === 'all' || r.status === selectedFilter
  );

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Subscription Management"
        subtitle="Orange Money Pro subscriptions, revenue tracking, and DJ tier management"
      />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="rounded-2xl p-5 border border-white/5" style={{ background: 'var(--bg-card)' }}>
          <p className="text-[10px] uppercase tracking-wider text-text-muted font-semibold">Total Revenue</p>
          <p className="font-mono text-2xl font-bold text-[#D4A24A] mt-2">SLE {(subs?.totalRevenue || 0).toLocaleString()}</p>
        </div>
        <div className="rounded-2xl p-5 border border-white/5" style={{ background: 'var(--bg-card)' }}>
          <p className="text-[10px] uppercase tracking-wider text-text-muted font-semibold">Monthly Revenue</p>
          <p className="font-mono text-2xl font-bold text-text-primary mt-2">SLE {(subs?.mrr || 0).toLocaleString()}</p>
        </div>
        <div className="rounded-2xl p-5 border border-white/5" style={{ background: 'var(--bg-card)' }}>
          <p className="text-[10px] uppercase tracking-wider text-text-muted font-semibold">Pro DJs</p>
          <p className="font-mono text-2xl font-bold text-text-primary mt-2">{subs?.plans?.[1]?.users || 0}</p>
        </div>
        <div className="rounded-2xl p-5 border border-white/5" style={{ background: 'var(--bg-card)' }}>
          <p className="text-[10px] uppercase tracking-wider text-text-muted font-semibold">Pro+ DJs</p>
          <p className="font-mono text-2xl font-bold text-text-primary mt-2">{subs?.plans?.[2]?.users || 0}</p>
        </div>
        <div className="rounded-2xl p-5 border border-white/5" style={{ background: 'var(--bg-card)' }}>
          <p className="text-[10px] uppercase tracking-wider text-text-muted font-semibold">Pending Proofs</p>
          <p className="font-mono text-2xl font-bold text-[#F97316] mt-2">{pendingCount}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {(subs?.plans || []).map((plan: any, i: number) => (
          <motion.div
            key={plan.id}
            className="rounded-2xl p-6 border border-white/5"
            style={{ background: 'var(--bg-card)' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <div className="flex items-center justify-between mb-4">
              <p className="font-display text-lg font-bold text-text-primary">{plan.name}</p>
              {plan.price > 0 && <p className="font-mono text-xl font-bold text-[#D4A24A]">SLE {plan.price}/mo</p>}
            </div>
            <p className="text-sm text-text-muted mb-4">{plan.users} active subscriber{plan.users !== 1 ? 's' : ''}</p>
            <div className="space-y-2">
              {plan.features.map((f: string) => (
                <div key={f} className="flex items-center gap-2 text-sm text-text-secondary">
                  <Check className="w-3.5 h-3.5 text-green-400" /> {f}
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Orange Money Proof Requests Section */}
      <div className="rounded-2xl p-6 border border-white/5" style={{ background: 'var(--bg-card)' }}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#D4A24A]">📱 Orange Money Subscription Requests</p>
            <p className="text-sm text-text-muted mt-1">Review payment proofs sent by DJs and activate their subscriptions.</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {[
              { label: 'All', value: 'all', count: (requests || []).length },
              { label: 'Pending', value: 'pending', count: pendingCount },
              { label: 'Approved', value: 'approved', count: approvedCount },
              { label: 'Rejected', value: 'rejected', count: rejectedCount },
            ].map(({ label, value, count }) => (
              <button
                key={value}
                onClick={() => setSelectedFilter(value as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${selectedFilter === value
                    ? 'bg-gold/20 text-gold border border-gold/30'
                    : 'bg-white/5 text-text-muted hover:bg-white/10'
                  }`}
              >
                {label} ({count})
              </button>
            ))}
          </div>
        </div>

        {filteredRequests.length === 0 ? (
          <EmptyState message={`No ${selectedFilter !== 'all' ? selectedFilter : ''} subscription requests.`} />
        ) : (
          <div className="space-y-3">
            {filteredRequests.map((request) => (
              <div key={request.id} className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <div className="font-bold text-text-primary text-sm">{request.dj?.stageName || 'Unknown DJ'}</div>
                      <StatusBadge status={request.plan === 'legend' ? 'legend' : 'pro'} />
                      <StatusBadge
                        status={request.status === 'pending' ? 'pending' : request.status === 'approved' ? 'verified' : 'rejected'}
                      />
                      {request.dj?.isPro && <StatusBadge status="active" />}
                    </div>
                    <p className="text-xs text-text-muted">{request.dj?.user?.email || '--'} • {request.dj?.user?.phone || '--'}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-text-secondary">
                      <span>Amount: <span className="font-mono font-bold text-text-primary">{request.currency} {request.amount?.toLocaleString()}</span></span>
                      <span>Tier: <span className="font-bold text-text-primary uppercase">{request.plan || 'pro'}</span></span>
                      <span>Payment: {request.paymentMethod} {request.paymentNumber}</span>
                      <span>Date: <span className="font-mono">{request.createdAt ? new Date(request.createdAt).toLocaleDateString() : '--'}</span></span>
                    </div>
                    {request.note && <p className="text-xs text-orange mt-2">💬 DJ Note: {request.note}</p>}
                    {request.adminNote && <p className="text-xs text-gold mt-2">📝 Admin Note: {request.adminNote}</p>}
                  </div>

                  <div className="flex flex-col gap-2">
                    <a
                      href={request.proofUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-2 bg-white/5 text-text-secondary rounded-lg text-xs font-bold hover:bg-white/10 flex items-center justify-center gap-1 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" /> View Proof
                    </a>
                    {request.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleApproveSubscription(request.id)}
                          disabled={approveMutation.isPending || rejectMutation.isPending}
                          className="px-3 py-2 bg-green-500/10 text-green-400 rounded-lg text-xs font-bold hover:bg-green-500/20 disabled:opacity-50 flex items-center justify-center gap-1 transition-colors"
                        >
                          <Check className="w-3.5 h-3.5" /> Approve
                        </button>
                        <button
                          onClick={() => handleRejectSubscription(request.id)}
                          disabled={approveMutation.isPending || rejectMutation.isPending}
                          className="px-3 py-2 bg-red-500/10 text-red-400 rounded-lg text-xs font-bold hover:bg-red-500/20 disabled:opacity-50 flex items-center justify-center gap-1 transition-colors"
                        >
                          <XIcon className="w-3.5 h-3.5" /> Reject
                        </button>
                        <textarea
                          value={reviewNotes[request.id] || ''}
                          onChange={(e) => setReviewNotes({ ...reviewNotes, [request.id]: e.target.value })}
                          rows={2}
                          maxLength={200}
                          className="px-2 py-1.5 bg-black/40 border border-white/10 rounded-lg text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-gold/30 resize-none"
                          placeholder="Optional: reason or note..."
                        />
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────── Section 14: Security Logs ─────────────────────── */

function SecurityLogsSection() {
  const { data: logs, isLoading, error } = useAdminSecurityLogs({ limit: 50 });

  if (isLoading) return <LoadingCenter />;

  if (error) return (
    <div className="rounded-2xl border border-red-500/20 p-6 text-center" style={{ background: 'var(--bg-error)' }}>
      <p className="text-red-400 font-medium">Failed to load data</p>
      <p className="text-red-400/60 text-sm mt-1">{(error as any)?.response?.data?.error || (error as any)?.message || 'Unknown error'}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <SectionHeader title="Security Logs" subtitle="Audit trail of platform events and actions" />

      <div className="rounded-2xl border border-white/5 overflow-hidden" style={{ background: 'var(--bg-card)' }}>
        <table className="w-full text-left">
          <thead className="border-b border-white/5 text-[10px] uppercase text-text-muted">
            <tr>
              <th className="p-4">Event</th>
              <th className="p-4">User</th>
              <th className="p-4">Details</th>
              <th className="p-4">Severity</th>
              <th className="p-4">Date</th>
            </tr>
          </thead>
          <tbody>
            {(logs || []).map((log: any) => (
              <tr key={log.id} className="border-b border-white/5 text-sm">
                <td className="p-4 text-text-primary">{log.event}</td>
                <td className="p-4 text-text-secondary">{log.user}</td>
                <td className="p-4 text-text-secondary">{log.details}</td>
                <td className="p-4"><StatusBadge status={log.severity} /></td>
                <td className="p-4 font-mono text-text-secondary">{log.createdAt ? new Date(log.createdAt).toLocaleDateString() : '--'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {(logs || []).length === 0 && <EmptyState message="No security logs found." />}
      </div>
    </div>
  );
}

/* ─────────────────────── Section 15: Ads Manager ─────────────────────── */

function AdsManagerSection() {
  const { data: ads, isLoading, error } = useAdminAds();
  const createMutation = useCreateAd();
  const editMutation = useUpdateAd();
  const statusMutation = useUpdateCampaignStatus();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<any | null>(null);
  const [statusMenuId, setStatusMenuId] = useState<string | null>(null);
  const [imageMode, setImageMode] = useState<'upload' | 'url'>('url');
  const [imagePreview, setImagePreview] = useState<string>('');
  const [form, setForm] = useState({
    name: '',
    description: '',
    creativeImageUrl: '',
    ctaUrl: '',
    status: 'draft' as 'active' | 'paused' | 'draft',
    budget: '',
    startDate: '',
    endDate: '',
  });
  // Edit form state (separate)
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    creativeImageUrl: '',
    ctaUrl: '',
    status: 'draft' as 'active' | 'paused' | 'draft',
    budget: '',
    startDate: '',
    endDate: '',
  });
  const [editImagePreview, setEditImagePreview] = useState<string>('');

  const campaigns = ads?.campaigns || [];
  const totalBudget = ads?.totalBudget || 0;
  const totalSpent = ads?.totalSpent || 0;

  const resetForm = () => {
    setForm({ name: '', description: '', creativeImageUrl: '', ctaUrl: '', status: 'draft', budget: '', startDate: '', endDate: '' });
    setImagePreview('');
    setImageMode('url');
  };

  const openEdit = (c: any) => {
    setEditingCampaign(c);
    setEditForm({
      name: c.name || '',
      description: c.description || '',
      creativeImageUrl: c.creativeImageUrl || '',
      ctaUrl: c.ctaUrl || '',
      status: (c.status === 'active' || c.status === 'paused' || c.status === 'draft') ? c.status : 'draft',
      budget: String(c.budget || ''),
      startDate: c.startDate ? c.startDate.slice(0, 10) : '',
      endDate: c.endDate ? c.endDate.slice(0, 10) : '',
    });
    setEditImagePreview(c.creativeImageUrl || '');
  };

  const handleEditImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setEditImagePreview(dataUrl);
      setEditForm((f) => ({ ...f, creativeImageUrl: dataUrl }));
    };
    reader.readAsDataURL(file);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCampaign) return;
    editMutation.mutate(
      {
        id: editingCampaign.id,
        name: editForm.name.trim(),
        description: editForm.description.trim() || undefined,
        creativeImageUrl: editForm.creativeImageUrl.trim() || undefined,
        ctaUrl: editForm.ctaUrl.trim() || undefined,
        status: editForm.status,
        budget: Number(editForm.budget) || 0,
        startDate: editForm.startDate || undefined,
        endDate: editForm.endDate || undefined,
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['adminAds'] });
          setEditingCampaign(null);
        },
      }
    );
  };

  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setImagePreview(dataUrl);
      setForm((f) => ({ ...f, creativeImageUrl: dataUrl }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(
      {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        creativeImageUrl: form.creativeImageUrl.trim() || undefined,
        ctaUrl: form.ctaUrl.trim() || undefined,
        status: form.status,
        budget: Number(form.budget) || 0,
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['adminAds'] });
          resetForm();
          setIsCreateOpen(false);
        },
      }
    );
  };

  const updateStatus = (id: string, status: any) => {
    statusMutation.mutate({ id, status }, { onSuccess: () => setStatusMenuId(null) });
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Ads Manager"
        subtitle="Manage the Home Page Ad Board: paid campaigns, top events, top DJs, and trending mixes"
        action={
          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-4 py-2 bg-[#D4A24A] text-black rounded-xl text-xs font-bold hover:bg-[#D4A24A]/90 flex items-center gap-2"
          >
            <Plus className="w-3.5 h-3.5" /> Create Ad Slot
          </button>
        }
      />

      {/* ─── Home Board Spotlight Panel ─── */}
      <div className="rounded-2xl border border-[#D4A24A]/20 p-5 space-y-4" style={{ background: 'var(--bg-card)' }}>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-xl bg-[#D4A24A]/15 flex items-center justify-center">
            <Megaphone className="w-4 h-4 text-[#D4A24A]" />
          </div>
          <div>
            <p className="text-xs font-extrabold uppercase tracking-widest text-[#D4A24A]">Home Ad Board</p>
            <p className="text-[11px] text-text-muted">Live carousel on the homepage — auto-rotates every 5 seconds</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Paid Ad Slots', value: campaigns.filter((c: any) => c.status === 'active').length, color: '#D4A24A', note: 'Active → shown first' },
            { label: 'Top Events', value: 3, color: '#3B82F6', note: 'Next 3 upcoming events' },
            { label: 'Top DJs', value: 3, color: '#22C55E', note: 'By ranking position' },
            { label: 'Top Mixes', value: 3, color: '#8B5CF6', note: 'By play count' },
          ].map((item) => (
            <div key={item.label} className="rounded-xl p-4 border border-white/5 bg-white/3 text-center">
              <p className="font-mono text-2xl font-black" style={{ color: item.color }}>{item.value}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted mt-1">{item.label}</p>
              <p className="text-[9px] text-text-muted/70 mt-0.5">{item.note}</p>
            </div>
          ))}
        </div>

        <div className="rounded-xl bg-[#D4A24A]/5 border border-[#D4A24A]/15 p-3 flex items-start gap-2">
          <span className="text-[#D4A24A] text-xs mt-0.5">ℹ</span>
          <p className="text-[11px] text-text-muted leading-relaxed">
            <strong className="text-text-primary">Paid ad campaigns</strong> with <strong className="text-[#D4A24A]">Active</strong> status appear first in the carousel (highest budget → first). Top events, DJs, and mixes fill remaining slots automatically. To remove something from the board, set its campaign status to <strong>Paused</strong> or <strong>Completed</strong>.
          </p>
        </div>
      </div>

      {isLoading && <LoadingCenter />}

      {error && (
        <div className="rounded-2xl border border-red-500/20 p-6 text-center" style={{ background: 'var(--bg-error)' }}>
          <p className="text-red-400 font-medium">Failed to load data</p>
          <p className="text-red-400/60 text-sm mt-1">{(error as any)?.response?.data?.error || (error as any)?.message || 'Unknown error'}</p>
        </div>
      )}

      {!isLoading && !error && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-2xl p-5 border border-white/5" style={{ background: 'var(--bg-card)' }}>
              <p className="text-[10px] uppercase tracking-wider text-text-muted font-semibold">Total Budget</p>
              <p className="font-mono text-2xl font-bold text-text-primary mt-2">SLE {totalBudget.toLocaleString()}</p>
            </div>
            <div className="rounded-2xl p-5 border border-white/5" style={{ background: 'var(--bg-card)' }}>
              <p className="text-[10px] uppercase tracking-wider text-text-muted font-semibold">Total Spent</p>
              <p className="font-mono text-2xl font-bold text-[#D4A24A] mt-2">SLE {totalSpent.toLocaleString()}</p>
            </div>
            <div className="rounded-2xl p-5 border border-white/5" style={{ background: 'var(--bg-card)' }}>
              <p className="text-[10px] uppercase tracking-wider text-text-muted font-semibold">Active Campaigns</p>
              <p className="font-mono text-2xl font-bold text-green-400 mt-2">{campaigns.filter((c: any) => c.status === 'active').length}</p>
            </div>
            <div className="rounded-2xl p-5 border border-white/5" style={{ background: 'var(--bg-card)' }}>
              <p className="text-[10px] uppercase tracking-wider text-text-muted font-semibold">Pending Approval</p>
              <p className="font-mono text-2xl font-bold text-orange-400 mt-2">{campaigns.filter((c: any) => c.status === 'pending_payment').length}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-white/5 overflow-hidden" style={{ background: 'var(--bg-card)' }}>
            <table className="w-full text-left">
              <thead className="border-b border-white/5 text-[10px] uppercase text-text-muted">
                <tr>
                  <th className="p-4">Campaign</th>
                  <th className="p-4">Advertiser</th>
                  <th className="p-4">Target</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Reach</th>
                  <th className="p-4">Impr.</th>
                  <th className="p-4">Clicks</th>
                  <th className="p-4">Budget</th>
                  <th className="p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c: any) => (
                  <tr key={c.id} className="border-b border-white/5 text-sm">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-black-elevated overflow-hidden flex-shrink-0">
                          {c.creativeImageUrl ? (
                            <img src={c.creativeImageUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Megaphone className="w-5 h-5 text-text-muted m-2.5" />
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-text-primary">{c.name}</p>
                          {c.ctaUrl && (
                            <a href={c.ctaUrl} target="_blank" rel="noreferrer" className="text-[10px] text-gold hover:underline flex items-center gap-0.5">
                              CTA <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-text-secondary">{c.advertiser?.stageName || '--'}</td>
                    <td className="p-4 text-text-secondary capitalize">{c.targetType}{c.targetId ? ` • ${c.targetId.slice(0, 6)}` : ''}</td>
                    <td className="p-4"><StatusBadge status={c.status} /></td>
                    <td className="p-4 font-mono text-text-primary">{c.reachScore?.toFixed(1) || 0}</td>
                    <td className="p-4 font-mono text-text-primary">{(c.impressions || 0).toLocaleString()}</td>
                    <td className="p-4 font-mono text-text-primary">{(c.clicks || 0).toLocaleString()}</td>
                    <td className="p-4 font-mono text-text-primary">{c.currency || 'SLE'} {(c.budget || 0).toLocaleString()}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEdit(c)}
                          className="px-3 py-1.5 text-xs rounded-lg bg-[#D4A24A]/10 text-[#D4A24A] border border-[#D4A24A]/20 hover:bg-[#D4A24A]/20 font-semibold"
                        >
                          Edit
                        </button>
                        <div className="relative">
                          <button
                            onClick={() => setStatusMenuId(statusMenuId === c.id ? null : c.id)}
                            className="px-3 py-1.5 text-xs rounded-lg bg-white/5 text-text-primary hover:bg-white/10"
                          >
                            Status
                          </button>
                          {statusMenuId === c.id && (
                            <div className="absolute right-0 top-full mt-1 z-10 w-36 rounded-xl border border-white/10 bg-black-surface shadow-lg overflow-hidden">
                              {['pending_payment', 'active', 'paused', 'rejected', 'completed'].map((s) => (
                                <button
                                  key={s}
                                  onClick={() => updateStatus(c.id, s)}
                                  className="w-full text-left px-3 py-2 text-xs text-text-secondary hover:bg-white/5 capitalize"
                                >
                                  {s.replace('_', ' ')}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {campaigns.length === 0 && <EmptyState message="No campaigns found." />}
          </div>
        </>
      )}

      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => { setIsCreateOpen(false); resetForm(); }}>
          <div className="w-full max-w-lg rounded-2xl border border-white/10 p-6 space-y-5 max-h-[90vh] overflow-y-auto" style={{ background: 'var(--bg-modal)' }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-text-primary">Create Ad Campaign</h3>
                <p className="text-[11px] text-text-muted mt-0.5">Appears on the Home Board carousel</p>
              </div>
              <button onClick={() => { setIsCreateOpen(false); resetForm(); }} className="p-1.5 rounded-lg hover:bg-white/5 text-text-muted"><XIcon className="w-4 h-4" /></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Campaign Name */}
              <div>
                <label className="block text-xs font-semibold text-text-muted mb-1.5">Campaign Name <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Summer Promo"
                  className="w-full px-3 py-2 bg-white/5 border border-white/5 rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-[#D4A24A]/40"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-text-muted mb-1.5">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Short text shown under the campaign title on the carousel..."
                  rows={2}
                  className="w-full px-3 py-2 bg-white/5 border border-white/5 rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-[#D4A24A]/40 resize-none"
                />
              </div>

              {/* Ad Image Upload */}
              <div>
                <label className="block text-xs font-semibold text-text-muted mb-2">Ad Image</label>
                {/* Toggle */}
                <div className="flex gap-2 mb-3">
                  <button type="button" onClick={() => setImageMode('upload')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${ imageMode === 'upload' ? 'border-[#D4A24A]/60 bg-[#D4A24A]/10 text-[#D4A24A]' : 'border-white/5 bg-white/5 text-text-muted hover:bg-white/10' }`}>
                    📁 Upload File
                  </button>
                  <button type="button" onClick={() => setImageMode('url')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${ imageMode === 'url' ? 'border-[#D4A24A]/60 bg-[#D4A24A]/10 text-[#D4A24A]' : 'border-white/5 bg-white/5 text-text-muted hover:bg-white/10' }`}>
                    🔗 Image URL
                  </button>
                </div>

                {imageMode === 'upload' ? (
                  <label className="block cursor-pointer">
                    <div className="w-full h-28 rounded-xl border-2 border-dashed border-white/10 hover:border-[#D4A24A]/40 flex items-center justify-center transition-all bg-white/3 group">
                      {imagePreview ? (
                        <img src={imagePreview} alt="preview" className="h-full w-full object-cover rounded-xl" />
                      ) : (
                        <div className="text-center">
                          <p className="text-[#D4A24A] text-xl mb-1">📸</p>
                          <p className="text-xs text-text-muted">Click to upload image</p>
                          <p className="text-[10px] text-text-muted/60 mt-0.5">JPG, PNG, WEBP — max 5 MB</p>
                        </div>
                      )}
                    </div>
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageFile} />
                  </label>
                ) : (
                  <input
                    type="url"
                    value={form.creativeImageUrl}
                    onChange={(e) => { setForm({ ...form, creativeImageUrl: e.target.value }); setImagePreview(e.target.value); }}
                    placeholder="https://example.com/ad-banner.jpg"
                    className="w-full px-3 py-2 bg-white/5 border border-white/5 rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-[#D4A24A]/40"
                  />
                )}

                {/* Preview thumbnail when URL mode has value */}
                {imageMode === 'url' && imagePreview && (
                  <div className="mt-2 rounded-xl overflow-hidden h-24 border border-white/10">
                    <img src={imagePreview} alt="preview" className="w-full h-full object-cover" onError={() => setImagePreview('')} />
                  </div>
                )}
              </div>

              {/* CTA URL */}
              <div>
                <label className="block text-xs font-semibold text-text-muted mb-1.5">CTA Target URL</label>
                <input
                  type="text"
                  value={form.ctaUrl}
                  onChange={(e) => setForm({ ...form, ctaUrl: e.target.value })}
                  placeholder="https://... or /events/abc123"
                  className="w-full px-3 py-2 bg-white/5 border border-white/5 rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-[#D4A24A]/40"
                />
              </div>

              {/* CTA Button Preview */}
              {(form.name || form.ctaUrl) && (
                <div className="rounded-xl border border-[#D4A24A]/20 bg-[#D4A24A]/5 p-4">
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#D4A24A] mb-2">📺 Homepage Preview</p>
                  <div className="flex items-center gap-3">
                    {(imagePreview) ? (
                      <img src={imagePreview} alt="" className="w-14 h-14 rounded-xl object-cover flex-shrink-0 border border-white/10" onError={() => {}} />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-[#D4A24A]/10 border border-[#D4A24A]/20 flex items-center justify-center flex-shrink-0">
                        <Megaphone className="w-6 h-6 text-[#D4A24A]/50" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#D4A24A]">PAID AD</span>
                      <p className="text-sm font-black text-white leading-tight truncate mt-0.5">{form.name || 'Campaign Title'}</p>
                      {form.description && <p className="text-[11px] text-white/60 mt-0.5 truncate">{form.description}</p>}
                      {form.ctaUrl && (
                        <div className="mt-2">
                          <a
                            href={form.ctaUrl}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.preventDefault()}
                            className="inline-flex items-center gap-1 px-4 py-1.5 rounded-full bg-[#D4A24A] text-black text-[11px] font-extrabold uppercase tracking-wider hover:bg-[#D4A24A]/90 transition-all shadow-[0_0_12px_rgba(212,162,74,0.35)]"
                          >
                            Learn More <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Status & Budget */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-text-muted mb-1.5">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as 'active' | 'paused' | 'draft' })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/5 rounded-lg text-sm text-text-primary focus:outline-none focus:border-[#D4A24A]/40"
                  >
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-muted mb-1.5">Budget (SLE)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.budget}
                    onChange={(e) => setForm({ ...form, budget: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-3 py-2 bg-white/5 border border-white/5 rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-[#D4A24A]/40"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-text-muted mb-1.5">Start Date</label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/5 rounded-lg text-sm text-text-primary focus:outline-none focus:border-[#D4A24A]/40"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-muted mb-1.5">End Date</label>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/5 rounded-lg text-sm text-text-primary focus:outline-none focus:border-[#D4A24A]/40"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={createMutation.isPending || !form.name.trim()}
                className="w-full px-4 py-3 bg-[#D4A24A] text-black rounded-xl text-sm font-bold hover:bg-[#D4A24A]/90 flex items-center justify-center gap-2 disabled:opacity-50 shadow-[0_0_20px_rgba(212,162,74,0.25)]"
              >
                {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                <Plus className="w-4 h-4" /> Create Campaign
              </button>

              {createMutation.isError && (
                <p className="text-xs text-red-400 text-center">
                  {(createMutation.error as any)?.response?.data?.error || (createMutation.error as any)?.message || 'Failed to create campaign'}
                </p>
              )}
            </form>
          </div>
        </div>
      )}

      {/* ─── Edit Campaign Modal ─── */}
      {editingCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setEditingCampaign(null)}>
          <div className="w-full max-w-lg rounded-2xl border border-white/10 p-6 space-y-5 max-h-[90vh] overflow-y-auto" style={{ background: 'var(--bg-modal)' }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-text-primary">Edit Campaign</h3>
                <p className="text-[11px] text-text-muted mt-0.5 truncate max-w-xs">{editingCampaign.name}</p>
              </div>
              <button onClick={() => setEditingCampaign(null)} className="p-1.5 rounded-lg hover:bg-white/5 text-text-muted"><XIcon className="w-4 h-4" /></button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-text-muted mb-1.5">Campaign Name <span className="text-red-400">*</span></label>
                <input type="text" required value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} placeholder="e.g. Summer Promo" className="w-full px-3 py-2 bg-white/5 border border-white/5 rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-[#D4A24A]/40" />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-text-muted mb-1.5">Description</label>
                <textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} placeholder="Short text shown on the carousel..." rows={2} className="w-full px-3 py-2 bg-white/5 border border-white/5 rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-[#D4A24A]/40 resize-none" />
              </div>

              {/* Image */}
              <div>
                <label className="block text-xs font-semibold text-text-muted mb-2">Ad Image</label>
                <input
                  type="url"
                  value={editForm.creativeImageUrl}
                  onChange={(e) => { setEditForm({ ...editForm, creativeImageUrl: e.target.value }); setEditImagePreview(e.target.value); }}
                  placeholder="https://example.com/ad-banner.jpg"
                  className="w-full px-3 py-2 bg-white/5 border border-white/5 rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-[#D4A24A]/40"
                />
                <div className="mt-2 flex items-center gap-2">
                  <label className="flex items-center gap-1.5 cursor-pointer px-3 py-1.5 rounded-lg border border-white/5 bg-white/5 hover:bg-white/10 text-xs text-text-muted">
                    📁 Upload instead
                    <input type="file" accept="image/*" className="hidden" onChange={handleEditImageFile} />
                  </label>
                  {editImagePreview && <span className="text-[10px] text-green-400">✓ Image set</span>}
                </div>
                {editImagePreview && (
                  <div className="mt-2 rounded-xl overflow-hidden h-24 border border-white/10">
                    <img src={editImagePreview} alt="preview" className="w-full h-full object-cover" onError={() => setEditImagePreview('')} />
                  </div>
                )}
              </div>

              {/* CTA URL */}
              <div>
                <label className="block text-xs font-semibold text-text-muted mb-1.5">CTA Target URL</label>
                <input type="text" value={editForm.ctaUrl} onChange={(e) => setEditForm({ ...editForm, ctaUrl: e.target.value })} placeholder="https://... or /events/abc123" className="w-full px-3 py-2 bg-white/5 border border-white/5 rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-[#D4A24A]/40" />
              </div>

              {/* Live preview */}
              {(editForm.name || editForm.ctaUrl) && (
                <div className="rounded-xl border border-[#D4A24A]/20 bg-[#D4A24A]/5 p-4">
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#D4A24A] mb-2">📺 Homepage Preview</p>
                  <div className="flex items-center gap-3">
                    {editImagePreview ? (
                      <img src={editImagePreview} alt="" className="w-14 h-14 rounded-xl object-cover flex-shrink-0 border border-white/10" onError={() => {}} />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-[#D4A24A]/10 border border-[#D4A24A]/20 flex items-center justify-center flex-shrink-0">
                        <Megaphone className="w-6 h-6 text-[#D4A24A]/50" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#D4A24A]">PAID AD</span>
                      <p className="text-sm font-black text-white leading-tight truncate mt-0.5">{editForm.name || 'Campaign Title'}</p>
                      {editForm.description && <p className="text-[11px] text-white/60 mt-0.5 truncate">{editForm.description}</p>}
                      {editForm.ctaUrl && (
                        <div className="mt-2">
                          <span className="inline-flex items-center gap-1 px-4 py-1.5 rounded-full bg-[#D4A24A] text-black text-[11px] font-extrabold uppercase tracking-wider shadow-[0_0_12px_rgba(212,162,74,0.35)]">
                            Learn More <ExternalLink className="w-3 h-3" />
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Status & Budget */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-text-muted mb-1.5">Status</label>
                  <select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value as 'active' | 'paused' | 'draft' })} className="w-full px-3 py-2 bg-white/5 border border-white/5 rounded-lg text-sm text-text-primary focus:outline-none focus:border-[#D4A24A]/40">
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-muted mb-1.5">Budget (SLE)</label>
                  <input type="number" min="0" step="0.01" value={editForm.budget} onChange={(e) => setEditForm({ ...editForm, budget: e.target.value })} placeholder="0.00" className="w-full px-3 py-2 bg-white/5 border border-white/5 rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-[#D4A24A]/40" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-text-muted mb-1.5">Start Date</label>
                  <input type="date" value={editForm.startDate} onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })} className="w-full px-3 py-2 bg-white/5 border border-white/5 rounded-lg text-sm text-text-primary focus:outline-none focus:border-[#D4A24A]/40" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-muted mb-1.5">End Date</label>
                  <input type="date" value={editForm.endDate} onChange={(e) => setEditForm({ ...editForm, endDate: e.target.value })} className="w-full px-3 py-2 bg-white/5 border border-white/5 rounded-lg text-sm text-text-primary focus:outline-none focus:border-[#D4A24A]/40" />
                </div>
              </div>

              <button type="submit" disabled={editMutation.isPending || !editForm.name.trim()} className="w-full px-4 py-3 bg-[#D4A24A] text-black rounded-xl text-sm font-bold hover:bg-[#D4A24A]/90 flex items-center justify-center gap-2 disabled:opacity-50 shadow-[0_0_20px_rgba(212,162,74,0.25)]">
                {editMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Save Changes
              </button>

              {editMutation.isError && (
                <p className="text-xs text-red-400 text-center">
                  {(editMutation.error as any)?.response?.data?.error || (editMutation.error as any)?.message || 'Failed to update campaign'}
                </p>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────── Section 16: Roles & Permissions ─────────────────────── */

function RolesSection() {
  const { data: staffData, isLoading, error } = useAdminStaff();
  const { data: usersData } = useAdminUsers({ limit: 100 });
  const updateRoleMutation = useUpdateUserRole();
  const queryClient = useQueryClient();

  const staff = staffData || [];
  const users = usersData?.data || [];

  const handleChangeRole = (id: string, role: string) => {
    updateRoleMutation.mutate({ id, role }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['adminStaff'] });
        queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      }
    });
  };

  return (
    <div className="space-y-8">
      <SectionHeader title="Roles & Permissions" subtitle="Manage staff roles and user access levels" />

      <div className="grid gap-6">
        <div className="rounded-2xl p-6 border border-white/5" style={{ background: 'var(--bg-card)' }}>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#D4A24A] mb-4">Staff Members</p>
          {isLoading && <LoadingCenter />}

          {error && (
            <div className="rounded-2xl border border-red-500/20 p-6 text-center" style={{ background: 'var(--bg-error)' }}>
              <p className="text-red-400 font-medium">Failed to load data</p>
              <p className="text-red-400/60 text-sm mt-1">{(error as any)?.response?.data?.error || (error as any)?.message || 'Unknown error'}</p>
            </div>
          )}

          {!isLoading && !error && (
            <div className="rounded-xl border border-white/5 overflow-hidden">
              <table className="w-full text-left">
                <thead className="border-b border-white/5 text-[10px] uppercase text-text-muted">
                  <tr><th className="p-4">Email</th><th className="p-4">Role</th><th className="p-4">Joined</th><th className="p-4 text-right">Actions</th></tr>
                </thead>
                <tbody>
                  {staff.map((s: any) => (
                    <tr key={s.id} className="border-b border-white/5 text-sm">
                      <td className="p-4 text-text-primary">{s.email}</td>
                      <td className="p-4"><StatusBadge status={s.role || 'user'} /></td>
                      <td className="p-4 font-mono text-text-secondary">{s.createdAt ? new Date(s.createdAt).toLocaleDateString() : '--'}</td>
                      <td className="p-4">
                        <select
                          onChange={(e) => handleChangeRole(s.id, e.target.value)}
                          className="px-3 py-1.5 text-xs rounded-lg bg-white/5 text-text-primary border border-white/5 focus:outline-none ml-auto block"
                        >
                          <option value="">Change Role</option>
                          <option value="USER">User</option>
                          <option value="DJ">DJ</option>
                          <option value="ADMIN">Admin</option>
                          <option value="MODERATOR">Moderator</option>
                          <option value="FINANCE_ADMIN">Finance Admin</option>
                          <option value="VERIFICATION_ADMIN">Verification Admin</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {staff.length === 0 && <EmptyState message="No staff found." />}
            </div>
          )}
        </div>

        <div className="rounded-2xl p-6 border border-white/5" style={{ background: 'var(--bg-card)' }}>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#D4A24A] mb-4">All Users</p>
          <div className="rounded-xl border border-white/5 overflow-hidden">
            <table className="w-full text-left">
              <thead className="border-b border-white/5 text-[10px] uppercase text-text-muted">
                <tr><th className="p-4">Email</th><th className="p-4">Username</th><th className="p-4">Role</th><th className="p-4">Joined</th><th className="p-4 text-right">Actions</th></tr>
              </thead>
              <tbody>
                {users.map((u: any) => (
                  <tr key={u.id} className="border-b border-white/5 text-sm">
                    <td className="p-4 text-text-primary">{u.email}</td>
                    <td className="p-4 text-text-primary">{u.username || '--'}</td>
                    <td className="p-4"><StatusBadge status={u.role || 'user'} /></td>
                    <td className="p-4 font-mono text-text-secondary">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '--'}</td>
                    <td className="p-4">
                      <select
                        onChange={(e) => handleChangeRole(u.id, e.target.value)}
                        className="px-3 py-1.5 text-xs rounded-lg bg-white/5 text-text-primary border border-white/5 focus:outline-none ml-auto block"
                      >
                        <option value="">Change Role</option>
                        <option value="USER">User</option>
                        <option value="DJ">DJ</option>
                        <option value="ADMIN">Admin</option>
                        <option value="MODERATOR">Moderator</option>
                        <option value="FINANCE_ADMIN">Finance Admin</option>
                        <option value="VERIFICATION_ADMIN">Verification Admin</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.length === 0 && <EmptyState message="No users found." />}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────── Section 16.5: Subscription Payment Settings ─────────────────────── */

function SubscriptionPaymentSettings() {
  const { data: config, isLoading } = useAdminSubscriptionConfig();
  const updateConfig = useUpdateSubscriptionConfig();

  const [paymentNumber, setPaymentNumber] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [proPrice, setProPrice] = useState('');
  const [legendPrice, setLegendPrice] = useState('');
  const [currency, setCurrency] = useState('');
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (config) {
      setPaymentNumber(config.paymentNumber || '');
      setWhatsappNumber(config.whatsappNumber || config.paymentNumber || '');
      setProPrice(String(config.proPrice ?? ''));
      setLegendPrice(String(config.legendPrice ?? ''));
      setCurrency(config.currency || '');
      setDirty(false);
    }
  }, [config]);

  const handleSave = async () => {
    const pro = Number(proPrice);
    const legend = Number(legendPrice);
    if (!paymentNumber.trim() || !currency.trim() || !Number.isFinite(pro) || !Number.isFinite(legend)) {
      toast.error('Please fill in valid payment settings.');
      return;
    }
    try {
      await updateConfig.mutateAsync({
        paymentNumber: paymentNumber.trim(),
        whatsappNumber: whatsappNumber.trim() || paymentNumber.trim(),
        proPrice: pro,
        legendPrice: legend,
        currency: currency.trim(),
      });
      toast.success('Payment settings saved.');
      setDirty(false);
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Failed to save payment settings.');
    }
  };

  if (isLoading || !config) {
    return (
      <div className="rounded-2xl p-6 border border-white/5" style={{ background: 'var(--bg-card)' }}>
        <p className="text-xs font-semibold uppercase tracking-wider text-[#D4A24A] mb-4">Subscription Payment Settings</p>
        <div className="flex items-center gap-2 text-text-muted text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading configuration...
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl p-6 border border-white/5" style={{ background: 'var(--bg-card)' }}>
      <p className="text-xs font-semibold uppercase tracking-wider text-[#D4A24A] mb-4">Subscription Payment Settings</p>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs text-text-muted mb-1">Payment Number</label>
          <input
            type="text"
            value={paymentNumber}
            onChange={(e) => { setPaymentNumber(e.target.value); setDirty(true); }}
            className="w-full px-3 py-2 bg-white/5 border border-white/5 rounded-lg text-sm text-text-primary focus:outline-none focus:border-[#D4A24A]/50"
          />
          <p className="text-[10px] text-text-muted mt-1">Manual payment number shown to DJs subscribing to Pro / Pro+.</p>
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1">WhatsApp Number</label>
          <input
            type="text"
            value={whatsappNumber}
            onChange={(e) => { setWhatsappNumber(e.target.value); setDirty(true); }}
            className="w-full px-3 py-2 bg-white/5 border border-white/5 rounded-lg text-sm text-text-primary focus:outline-none focus:border-[#D4A24A]/50"
          />
          <p className="text-[10px] text-text-muted mt-1">Used for the &ldquo;Confirm via WhatsApp&rdquo; link.</p>
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1">Currency</label>
          <input
            type="text"
            value={currency}
            onChange={(e) => { setCurrency(e.target.value); setDirty(true); }}
            className="w-full px-3 py-2 bg-white/5 border border-white/5 rounded-lg text-sm text-text-primary focus:outline-none focus:border-[#D4A24A]/50"
          />
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1">Pro Price</label>
          <input
            type="number"
            min={0}
            value={proPrice}
            onChange={(e) => { setProPrice(e.target.value); setDirty(true); }}
            className="w-full px-3 py-2 bg-white/5 border border-white/5 rounded-lg text-sm text-text-primary focus:outline-none focus:border-[#D4A24A]/50"
          />
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1">Pro+ Price</label>
          <input
            type="number"
            min={0}
            value={legendPrice}
            onChange={(e) => { setLegendPrice(e.target.value); setDirty(true); }}
            className="w-full px-3 py-2 bg-white/5 border border-white/5 rounded-lg text-sm text-text-primary focus:outline-none focus:border-[#D4A24A]/50"
          />
        </div>
      </div>
      <div className="mt-4 flex items-center justify-end gap-3">
        {dirty && (
          <button
            type="button"
            onClick={() => {
              if (config) {
                setPaymentNumber(config.paymentNumber || '');
                setWhatsappNumber(config.whatsappNumber || config.paymentNumber || '');
                setProPrice(String(config.proPrice ?? ''));
                setLegendPrice(String(config.legendPrice ?? ''));
                setCurrency(config.currency || '');
                setDirty(false);
              }
            }}
            disabled={updateConfig.isPending}
            className="px-4 py-2 rounded-lg text-sm border border-white/10 text-text-muted hover:text-text-primary disabled:opacity-50"
          >
            Reset
          </button>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={!dirty || updateConfig.isPending}
          className="px-4 py-2 rounded-lg text-sm font-medium text-black bg-[#D4A24A] hover:bg-[#c79545] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {updateConfig.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          Save Changes
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────── Section 17: Settings ─────────────────────── */

function SettingsSection() {
  return (
    <div className="space-y-8">
      <SectionHeader title="Settings" subtitle="Platform configuration and preferences" />

      <div className="grid gap-6">
        <div className="rounded-2xl p-6 border border-white/5" style={{ background: 'var(--bg-card)' }}>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#D4A24A] mb-4">Branding</p>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-text-muted mb-1">Logo URL</label>
              <input type="text" disabled value="/logo.png" className="w-full px-3 py-2 bg-white/5 border border-white/5 rounded-lg text-sm text-text-primary disabled:opacity-50" />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Primary Color</label>
              <input type="text" disabled value="#D4A24A" className="w-full px-3 py-2 bg-white/5 border border-white/5 rounded-lg text-sm text-text-primary disabled:opacity-50" />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Secondary Color</label>
              <input type="text" disabled value="#111111" className="w-full px-3 py-2 bg-white/5 border border-white/5 rounded-lg text-sm text-text-primary disabled:opacity-50" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl p-6 border border-white/5" style={{ background: 'var(--bg-card)' }}>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#D4A24A] mb-4">Email Settings</p>
          <div className="grid md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs text-text-muted mb-1">SMTP Host</label>
              <input type="text" disabled placeholder="smtp.yourhost.com" className="w-full px-3 py-2 bg-white/5 border border-white/5 rounded-lg text-sm text-text-primary disabled:opacity-50 placeholder:text-text-muted" />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Port</label>
              <input type="text" disabled placeholder="587" className="w-full px-3 py-2 bg-white/5 border border-white/5 rounded-lg text-sm text-text-primary disabled:opacity-50 placeholder:text-text-muted" />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Username</label>
              <input type="text" disabled placeholder="notifications@soundit.com" className="w-full px-3 py-2 bg-white/5 border border-white/5 rounded-lg text-sm text-text-primary disabled:opacity-50 placeholder:text-text-muted" />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Password</label>
              <input type="password" disabled value="********" className="w-full px-3 py-2 bg-white/5 border border-white/5 rounded-lg text-sm text-text-primary disabled:opacity-50" />
            </div>
          </div>
        </div>

        <SubscriptionPaymentSettings />

        <div className="rounded-2xl p-6 border border-white/5" style={{ background: 'var(--bg-card)' }}>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#D4A24A] mb-4">Ranking Weights</p>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { label: 'Digital', value: 40 },
              { label: 'Industry', value: 30 },
              { label: 'Community', value: 30 },
            ].map((w) => (
              <div key={w.label}>
                <label className="block text-xs text-text-muted mb-1">{w.label} ({w.value}%)</label>
                <input type="range" disabled value={w.value} className="w-full disabled:opacity-50 accent-[#D4A24A]" />
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl p-6 border border-white/5" style={{ background: 'var(--bg-card)' }}>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#D4A24A] mb-4">Platform Announcements</p>
          <textarea disabled rows={3} placeholder="No announcements..." className="w-full px-3 py-2 bg-white/5 border border-white/5 rounded-lg text-sm text-text-primary disabled:opacity-50 placeholder:text-text-muted resize-none" />
        </div>

        <div className="rounded-2xl p-6 border border-white/5" style={{ background: 'var(--bg-card)' }}>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#D4A24A] mb-4">Maintenance Mode</p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-5 rounded-full bg-white/10 relative disabled:opacity-50">
              <div className="w-4 h-4 rounded-full bg-text-muted absolute top-0.5 left-0.5" />
            </div>
            <span className="text-sm text-text-muted">Disabled</span>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="rounded-2xl p-6 border border-white/5" style={{ background: 'var(--bg-card)' }}>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#D4A24A] mb-4">Languages</p>
            <p className="text-sm text-text-primary">English</p>
          </div>
          <div className="rounded-2xl p-6 border border-white/5" style={{ background: 'var(--bg-card)' }}>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#D4A24A] mb-4">Countries</p>
            <p className="text-sm text-text-primary">Sierra Leone</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────── Section 18: Hall of Fame ─────────────────────── */

function HallOfFameSection() {
  const [adminTab, setAdminTab] = useState<'djs' | 'mixes'>('djs');
  const [djSearch, setDjSearch] = useState('');
  const [mixSearch, setMixSearch] = useState('');
  const queryClient = useQueryClient();

  const { data: adminDjsData, isLoading: adminDjsLoading } = useAdminDjs({
    search: djSearch,
    page: 1,
    limit: 100,
  });
  const { data: adminMixesData, isLoading: adminMixesLoading } = useAdminMixes({
    search: mixSearch,
    page: 1,
    limit: 100,
  });
  const toggleDjHof = useToggleDjHallOfFame();
  const toggleMixHof = useToggleMixHallOfFame();

  const adminDjs = adminDjsData?.data || [];
  const adminMixes = adminMixesData?.data || [];

  const handleToggleDj = (id: string) => {
    toggleDjHof.mutate(id, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['admin-djs'] });
        queryClient.invalidateQueries({ queryKey: ['hall-of-fame-djs'] });
        toast.success('DJ Hall of Fame status updated');
      },
      onError: () => toast.error('Failed to update DJ status'),
    });
  };

  const handleToggleMix = (id: string) => {
    toggleMixHof.mutate(id, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['admin-mixes'] });
        queryClient.invalidateQueries({ queryKey: ['hall-of-fame-mixes'] });
        toast.success('Mix Hall of Fame status updated');
      },
      onError: () => toast.error('Failed to update mix status'),
    });
  };

  return (
    <div className="space-y-8">
      <SectionHeader
        title="Hall of Fame"
        subtitle="Manage pioneers and legendary mixes in the Hall of Fame"
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Pioneer DJs"
          value={adminDjs.filter((d) => d.hallOfFame).length}
          icon={Star}
          color="#D4A24A"
        />
        <StatCard
          label="Legendary Mixes"
          value={adminMixes.filter((m) => m.hallOfFame).length}
          icon={Music}
          color="#D4A24A"
        />
        <StatCard
          label="Total DJs"
          value={adminDjs.length}
          icon={Users}
          color="#3B82F6"
        />
        <StatCard
          label="Total Mixes"
          value={adminMixes.length}
          icon={Play}
          color="#22C55E"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setAdminTab('djs')}
          className={`px-5 py-2 rounded-full text-xs font-semibold uppercase transition-colors ${
            adminTab === 'djs'
              ? 'bg-[#D4A24A] text-black'
              : 'bg-white/10 text-text-secondary hover:bg-white/20'
          }`}
        >
          Pioneer DJs ({adminDjs.filter((d) => d.hallOfFame).length})
        </button>
        <button
          onClick={() => setAdminTab('mixes')}
          className={`px-5 py-2 rounded-full text-xs font-semibold uppercase transition-colors ${
            adminTab === 'mixes'
              ? 'bg-[#D4A24A] text-black'
              : 'bg-white/10 text-text-secondary hover:bg-white/20'
          }`}
        >
          Legendary Mixes ({adminMixes.filter((m) => m.hallOfFame).length})
        </button>
      </div>

      {/* Content */}
      <div className="rounded-2xl border border-white/5" style={{ background: 'var(--bg-card)' }}>
        {adminTab === 'djs' ? (
          <div className="p-6">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="text"
                placeholder="Search DJs..."
                value={djSearch}
                onChange={(e) => setDjSearch(e.target.value)}
                className="w-full bg-black-surface border border-dark-gray rounded-lg pl-10 pr-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-[#D4A24A] outline-none"
              />
            </div>
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {adminDjsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 text-[#D4A24A] animate-spin" />
                </div>
              ) : adminDjs.length === 0 ? (
                <p className="text-sm text-text-muted text-center py-8">No DJs found</p>
              ) : (
                [...adminDjs].sort((a, b) => (b.hallOfFame ? 1 : 0) - (a.hallOfFame ? 1 : 0)).map((dj) => (
                  <div
                    key={dj.id}
                    className={`flex items-center justify-between p-3 rounded-xl transition-colors ${
                      dj.hallOfFame ? 'bg-[#D4A24A]/5 border border-[#D4A24A]/20' : 'hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={dj.avatar || '/placeholder.jpg'}
                        alt={dj.stageName}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div>
                        <p className="text-sm font-semibold text-text-primary">{dj.stageName}</p>
                        <p className="text-xs text-text-muted">
                          {dj.city || 'Sierra Leone'} • {dj.verified ? 'Verified' : 'Unverified'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggleDj(dj.id)}
                      disabled={toggleDjHof.isPending}
                      className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                        dj.hallOfFame
                          ? 'bg-[#D4A24A] text-black'
                          : 'bg-white/10 text-text-secondary hover:bg-white/20'
                      }`}
                    >
                      {dj.hallOfFame ? (
                        <>
                          <Check className="w-3 h-3" /> In Hall of Fame
                        </>
                      ) : (
                        <>
                          <Star className="w-3 h-3" /> Add
                        </>
                      )}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="p-6">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="text"
                placeholder="Search mixes..."
                value={mixSearch}
                onChange={(e) => setMixSearch(e.target.value)}
                className="w-full bg-black-surface border border-dark-gray rounded-lg pl-10 pr-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-[#D4A24A] outline-none"
              />
            </div>
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {adminMixesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 text-[#D4A24A] animate-spin" />
                </div>
              ) : adminMixes.length === 0 ? (
                <p className="text-sm text-text-muted text-center py-8">No mixes found</p>
              ) : (
                [...adminMixes].sort((a, b) => (b.hallOfFame ? 1 : 0) - (a.hallOfFame ? 1 : 0)).map((mix) => (
                  <div
                    key={mix.id}
                    className={`flex items-center justify-between p-3 rounded-xl transition-colors ${
                      mix.hallOfFame ? 'bg-[#D4A24A]/5 border border-[#D4A24A]/20' : 'hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-black-elevated flex items-center justify-center">
                        <Music className="w-5 h-5 text-[#D4A24A]" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-text-primary">{mix.title}</p>
                        <p className="text-xs text-text-muted">
                          {mix.dj?.stageName || 'Unknown DJ'} • {mix.plays} plays
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggleMix(mix.id)}
                      disabled={toggleMixHof.isPending}
                      className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                        mix.hallOfFame
                          ? 'bg-[#D4A24A] text-black'
                          : 'bg-white/10 text-text-secondary hover:bg-white/20'
                      }`}
                    >
                      {mix.hallOfFame ? (
                        <>
                          <Check className="w-3 h-3" /> In Hall of Fame
                        </>
                      ) : (
                        <>
                          <Star className="w-3 h-3" /> Add
                        </>
                      )}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────── Violations & Moderation Section ─────────────────────── */

function ViolationsSection() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('ALL');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/reports?status=${filter}`);
      setReports(res.data.data || []);
    } catch (err: any) {
      toast.error('Failed to load violation reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [filter]);

  const handleUserAction = async (targetUserId: string, status: 'SUSPENDED' | 'BANNED', reportReason: string) => {
    if (!confirm(`Are you sure you want to set this user's account to ${status}? This action will send an immediate formal notification email to the user.`)) return;

    setProcessingId(targetUserId);
    try {
      await api.put(`/admin/users/${targetUserId}/status`, { status, reason: `Violation Report (${reportReason})` });
      toast.success(`User account has been ${status.toLowerCase()} and notified by email.`);
      fetchReports();
    } catch (err: any) {
      toast.error(err.response?.data?.error || `Failed to set user status`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleResolveReport = async (reportId: string, actionTaken: string) => {
    try {
      await api.patch(`/admin/reports/${reportId}`, { status: 'RESOLVED', actionTaken });
      toast.success('Report resolved successfully.');
      fetchReports();
    } catch (err: any) {
      toast.error('Failed to resolve report');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#121212] p-6 rounded-2xl border border-white/10">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <ShieldAlert className="text-red-500 w-6 h-6" />
            Terms & Privacy Violation Moderation
          </h2>
          <p className="text-xs text-text-muted mt-1">
            Real-time compliance monitoring aligned with the Cyber Security & Crimes Act 2021 and Laws of Sierra Leone.
          </p>
        </div>
        <div className="flex gap-2">
          {['ALL', 'PENDING', 'RESOLVED'].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors ${
                filter === s ? 'bg-[#D4A24A] text-black' : 'bg-white/5 text-text-muted hover:bg-white/10'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-text-muted flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#D4A24A]" />
        </div>
      ) : reports.length === 0 ? (
        <div className="py-16 text-center bg-[#121212] rounded-2xl border border-white/10">
          <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3 opacity-60" />
          <p className="text-sm font-semibold text-white">No Violation Reports Found</p>
          <p className="text-xs text-text-muted mt-1">All content and accounts are compliant with terms.</p>
        </div>
      ) : (
        <div className="bg-[#121212] rounded-2xl border border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-white">
              <thead className="bg-white/5 uppercase text-text-muted font-bold text-[10px] tracking-wider border-b border-white/10">
                <tr>
                  <th className="p-4">Report ID / Date</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Reporter</th>
                  <th className="p-4">Target Account / Content</th>
                  <th className="p-4">Details</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Moderation Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {reports.map((r: any) => (
                  <tr key={r.id} className="hover:bg-white/[0.02]">
                    <td className="p-4 font-mono">
                      #{r.id.slice(-6)}
                      <span className="block text-[10px] text-text-muted mt-0.5">
                        {new Date(r.createdAt).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-1 rounded bg-red-500/10 border border-red-500/30 text-red-400 font-bold uppercase text-[10px]">
                        {r.reason}
                      </span>
                    </td>
                    <td className="p-4 text-text-muted">
                      {r.reporter ? r.reporter.email : 'Anonymous'}
                    </td>
                    <td className="p-4">
                      {r.targetUser ? (
                        <div>
                          <div className="font-bold text-white">{r.targetUser.name || r.targetUser.username}</div>
                          <div className="text-[10px] text-text-muted">{r.targetUser.email}</div>
                          <div className="mt-1">
                            <StatusBadge status={r.targetUser.status.toLowerCase()} />
                          </div>
                        </div>
                      ) : r.mix ? (
                        <div className="text-[#D4A24A] font-bold">Mix: {r.mix.title}</div>
                      ) : r.event ? (
                        <div className="text-blue-400 font-bold">Event: {r.event.title}</div>
                      ) : (
                        <span className="text-text-muted">General Platform</span>
                      )}
                    </td>
                    <td className="p-4 max-w-xs text-text-secondary leading-relaxed">
                      {r.details}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded font-bold text-[10px] uppercase ${
                        r.status === 'PENDING' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' : 'bg-green-500/20 text-green-400 border border-green-500/30'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      {r.targetUser && r.targetUser.status === 'ACTIVE' && (
                        <>
                          <button
                            onClick={() => handleUserAction(r.targetUser.id, 'SUSPENDED', r.reason)}
                            disabled={processingId === r.targetUser.id}
                            className="px-2.5 py-1 rounded bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/40 text-yellow-300 font-bold text-[10px] uppercase transition-colors"
                          >
                            Suspend
                          </button>
                          <button
                            onClick={() => handleUserAction(r.targetUser.id, 'BANNED', r.reason)}
                            disabled={processingId === r.targetUser.id}
                            className="px-2.5 py-1 rounded bg-red-600/30 hover:bg-red-600/50 border border-red-500 text-red-300 font-bold text-[10px] uppercase transition-colors"
                          >
                            Ban User
                          </button>
                        </>
                      )}
                      {r.status === 'PENDING' && (
                        <button
                          onClick={() => handleResolveReport(r.id, 'DISMISSED')}
                          className="px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-white font-bold text-[10px] uppercase transition-colors"
                        >
                          Resolve / Dismiss
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────── Direct Custom Email Sender Widget ─────────────────────── */

function DirectEmailSenderWidget() {
  const [to, setTo] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const sendMutation = useSendCustomEmail();

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!to || !to.includes('@')) {
      toast.error('Valid target email is required');
      return;
    }
    if (!subject.trim()) {
      toast.error('Subject line is required');
      return;
    }
    if (!message.trim()) {
      toast.error('Message content is required');
      return;
    }

    sendMutation.mutate(
      { to, subject, message, recipientName },
      {
        onSuccess: (res: any) => {
          toast.success(res?.data?.message || `Email sent successfully to ${to}!`);
          setTo('');
          setRecipientName('');
          setSubject('');
          setMessage('');
        },
        onError: (err: any) => {
          toast.error(err?.response?.data?.error || 'Failed to send custom email');
        },
      }
    );
  };

  return (
    <div className="rounded-2xl border border-white/10 p-6" style={{ background: 'var(--bg-card)' }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
            📧 Send Direct Custom Email
          </h3>
          <p className="text-xs text-text-muted">Dispatch a branded Deck Salone email to any selected user or email address</p>
        </div>
      </div>

      <form onSubmit={handleSend} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">Target Email Address *</label>
            <input
              type="email"
              placeholder="e.g. dj@example.com"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-text-primary focus:border-[#D4A24A] outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">Recipient Name (Optional)</label>
            <input
              type="text"
              placeholder="e.g. DJ Alimamy"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-text-primary focus:border-[#D4A24A] outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-text-secondary mb-1">Email Subject *</label>
          <input
            type="text"
            placeholder="e.g. Welcome to Deck Salone — Important Account Update"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-text-primary focus:border-[#D4A24A] outline-none"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-text-secondary mb-1">Message Content (Text / Paragraphs) *</label>
          <textarea
            rows={5}
            placeholder="Type your message here. Formatting paragraphs will be converted automatically to HTML."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-xs text-text-primary focus:border-[#D4A24A] outline-none resize-y"
            required
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={sendMutation.isPending}
            className="px-6 py-2.5 bg-gradient-to-r from-[#D4A24A] to-amber-500 text-black font-bold rounded-xl text-xs flex items-center gap-2 hover:brightness-110 disabled:opacity-50 transition-all shadow-md"
          >
            {sendMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
            Send Email Now
          </button>
        </div>
      </form>
    </div>
  );
}

/* ─────────────────────── System Bug & Error Logs Widget ─────────────────────── */

function SystemBugLogsWidget() {
  const { data: errorRes, isLoading } = useAdminSystemErrors();
  const triggerDigest = useTriggerBugReportDigest();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const errors = errorRes?.data || [];


  return (
    <div className="rounded-2xl border border-red-500/20 p-6 space-y-4" style={{ background: 'var(--bg-card)' }}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
            🚨 Captured System Bug & Error Logs
          </h3>
          <p className="text-xs text-text-muted">
            Automated capture of backend 500 errors and uncaught exceptions. Daily digest sent automatically to support@decksalone.com
          </p>
        </div>

        <button
          onClick={() =>
            triggerDigest.mutate(undefined, {
              onSuccess: (res: any) => toast.success(res?.data?.message || 'Daily bug report email sent to support@decksalone.com!'),
              onError: (err: any) => toast.error(err?.response?.data?.error || 'Failed to dispatch bug report'),
            })
          }
          disabled={triggerDigest.isPending}
          className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md disabled:opacity-50 transition-colors"
        >
          {triggerDigest.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <AlertTriangle className="w-3.5 h-3.5" />}
          Dispatch Bug Report to support@decksalone.com
        </button>
      </div>

      {isLoading ? (
        <LoadingCenter />
      ) : errors.length === 0 ? (
        <div className="p-8 text-center rounded-xl bg-emerald-500/5 border border-emerald-500/20">
          <p className="text-emerald-400 font-bold text-sm">✅ Zero System Errors Logged</p>
          <p className="text-text-muted text-xs mt-1">All API routes and application services are operating cleanly without exceptions.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/5 text-text-muted uppercase text-[10px] tracking-wider border-b border-white/10">
              <tr>
                <th className="p-3">Level</th>
                <th className="p-3">Source / Path</th>
                <th className="p-3">Message</th>
                <th className="p-3">User</th>
                <th className="p-3">Time</th>
                <th className="p-3 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {errors.map((err: any) => (
                <React.Fragment key={err.id}>
                  <tr className="hover:bg-white/[0.02]">
                    <td className="p-3 font-bold text-red-400">
                      <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 text-[10px]">
                        {err.level}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-text-primary">
                      {err.method ? <span className="font-bold text-[#D4A24A] mr-1">{err.method}</span> : null}
                      {err.path || err.source}
                    </td>
                    <td className="p-3 text-text-secondary max-w-xs truncate font-mono text-[11px]">
                      {err.message}
                    </td>
                    <td className="p-3 text-text-muted">
                      {err.userEmail || err.userId || 'Guest'}
                    </td>
                    <td className="p-3 text-text-muted">
                      {new Date(err.createdAt).toLocaleTimeString()}
                    </td>
                    <td className="p-3 text-right">
                      {err.stackTrace && (
                        <button
                          onClick={() => setExpandedId(expandedId === err.id ? null : err.id)}
                          className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-text-muted text-[10px] uppercase font-bold"
                        >
                          {expandedId === err.id ? 'Hide Stack' : 'View Stack'}
                        </button>
                      )}
                    </td>
                  </tr>
                  {expandedId === err.id && (
                    <tr>
                      <td colSpan={6} className="p-3 bg-black-elevated/80 border-b border-white/10">
                        <pre className="text-[10px] font-mono text-red-300/90 whitespace-pre-wrap overflow-x-auto max-h-40 p-2 bg-black rounded">
                          {err.stackTrace}
                        </pre>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────── Incomplete Profiles & 5-Step Nudge Widget ─────────────────────── */

function IncompleteProfilesWidget() {
  const { data: incData, isLoading } = useIncompleteProfiles();
  const nudgeMutation = useSendProfileNudge();

  const incompleteUsers = incData?.data || [];

  return (
    <div className="rounded-2xl border border-amber-500/20 p-6 space-y-4" style={{ background: 'var(--bg-card)' }}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
            📋 Incomplete Profiles & 5-Step Activation Checklist
          </h3>
          <p className="text-xs text-text-muted">
            Track users with incomplete profiles (&lt; 100%). Send automated 5-step checklist nudge emails to activate their accounts.
          </p>
        </div>

        {incompleteUsers.length > 0 && (
          <button
            onClick={() =>
              nudgeMutation.mutate(
                { allIncomplete: true },
                {
                  onSuccess: (res: any) => toast.success(res?.data?.message || '5-step profile nudge emails sent!'),
                  onError: (err: any) => toast.error(err?.response?.data?.error || 'Failed to send nudge emails'),
                }
              )
            }
            disabled={nudgeMutation.isPending}
            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-[#D4A24A] text-black font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md disabled:opacity-50"
          >
            {nudgeMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
            Auto-Nudge All Incomplete ({incompleteUsers.length})
          </button>
        )}
      </div>

      {isLoading ? (
        <LoadingCenter />
      ) : incompleteUsers.length === 0 ? (
        <div className="p-8 text-center rounded-xl bg-emerald-500/5 border border-emerald-500/20">
          <p className="text-emerald-400 font-bold text-sm">🎉 All User Profiles Are 100% Complete!</p>
          <p className="text-text-muted text-xs mt-1">Every registered user and DJ has completed their profile photo, bio, mix, and email verification.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/5 text-text-muted uppercase text-[10px] tracking-wider border-b border-white/10">
              <tr>
                <th className="p-3">User / DJ</th>
                <th className="p-3">Role</th>
                <th className="p-3">Profile Completion</th>
                <th className="p-3">Pending Steps</th>
                <th className="p-3">Last Nudge</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {incompleteUsers.map((u: any) => {
                const completion = u.completion || {};
                const pendingSteps = (completion.steps || []).filter((s: any) => !s.completed);

                return (
                  <tr key={u.id} className="hover:bg-white/[0.02]">
                    <td className="p-3">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={u.avatar || '/default-dj-avatar.jpg'}
                          alt=""
                          className="w-8 h-8 rounded-full object-cover border border-white/10"
                        />
                        <div>
                          <p className="font-bold text-text-primary">{u.stageName || u.name || u.username}</p>
                          <p className="text-[10px] text-text-muted">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${u.role === 'DJ' ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="w-32">
                        <div className="flex justify-between items-center text-[10px] font-bold mb-1">
                          <span className="text-amber-400">{completion.percentage}%</span>
                          <span className="text-text-muted">{completion.completedCount}/5</span>
                        </div>
                        <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-amber-500 h-full rounded-full" style={{ width: `${completion.percentage}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {pendingSteps.map((s: any) => (
                          <span key={s.id} className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] text-text-muted">
                            {s.title.split('.')[1] || s.title}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-3 text-text-muted">
                      {u.lastProfileNudgeSentAt ? new Date(u.lastProfileNudgeSentAt).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() =>
                          nudgeMutation.mutate(
                            { userId: u.id },
                            {
                              onSuccess: (res: any) => toast.success(res?.data?.message || `Nudge email sent to ${u.email}!`),
                              onError: (err: any) => toast.error(err?.response?.data?.error || 'Failed to send nudge email'),
                            }
                          )
                        }
                        disabled={nudgeMutation.isPending}
                        className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/40 rounded-lg font-bold text-[10px] uppercase transition-colors"
                      >
                        Send Nudge Email
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────── Birthday Manager Widget ─────────────────────── */

function BirthdayWidget() {
  const { data: bdayData, isLoading } = useAdminBirthdays();
  const sendWish = useSendBirthdayWish();
  const triggerCron = useTriggerBirthdayCron();

  const todaysCelebrants = bdayData?.todaysCelebrants || [];
  const upcomingBirthdays = bdayData?.upcomingBirthdays || [];

  return (
    <div className="rounded-2xl border border-white/5 p-6" style={{ background: 'var(--bg-card)' }}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
            🎂 Birthday Celebrants & Automated Wishes
          </h3>
          <p className="text-xs text-text-muted">Users and DJs celebrating their birthday today and in the next 30 days (16+ only)</p>
        </div>

        <button
          onClick={() =>
            triggerCron.mutate(undefined, {
              onSuccess: (data: any) => toast.success(data?.data?.message || 'Birthday emails sent!'),
              onError: (err: any) => toast.error(err?.response?.data?.error || 'Failed to trigger birthday emails'),
            })
          }
          disabled={triggerCron.isPending}
          className="px-4 py-2 bg-gradient-to-r from-amber-500 to-[#D4A24A] text-black font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md hover:brightness-110 disabled:opacity-50"
        >
          {triggerCron.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
          Dispatch Today's Birthday Emails
        </button>
      </div>

      {isLoading ? (
        <LoadingCenter />
      ) : (
        <div className="space-y-6">
          {/* Today's Celebrants */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#D4A24A] mb-3 flex items-center gap-1.5">
              🎉 Celebrating Today ({todaysCelebrants.length})
            </h4>

            {todaysCelebrants.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {todaysCelebrants.map((c: any) => (
                  <div key={c.id} className="p-4 rounded-xl border border-[#D4A24A]/30 bg-[#D4A24A]/10 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <img src={c.avatar || '/logo-icon.png'} alt={c.displayName} className="w-10 h-10 rounded-full object-cover border border-[#D4A24A]" />
                      <div>
                        <p className="font-bold text-white text-sm">{c.displayName} <span className="text-xs font-normal text-text-muted">({c.age} yrs)</span></p>
                        <p className="text-xs text-text-muted">{c.email} • <span className="text-[#D4A24A] font-medium">{c.role}</span></p>
                      </div>
                    </div>

                    <button
                      onClick={() =>
                        sendWish.mutate(c.id, {
                          onSuccess: (data: any) => toast.success(data?.message || `Wish sent to ${c.displayName}!`),
                          onError: (err: any) => toast.error(err?.response?.data?.error || 'Failed to send wish'),
                        })
                      }
                      disabled={sendWish.isPending}
                      className="px-3 py-1.5 bg-[#D4A24A] hover:bg-[#D4A24A]/90 text-black text-xs font-bold rounded-lg whitespace-nowrap flex items-center gap-1"
                    >
                      {sendWish.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Mail className="w-3 h-3" />}
                      Send Wish
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-text-muted italic bg-white/5 p-4 rounded-xl">No users or DJs are celebrating a birthday today.</p>
            )}
          </div>

          {/* Upcoming Birthdays */}
          {upcomingBirthdays.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-3">
                🗓️ Upcoming Birthdays (Next 30 Days)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {upcomingBirthdays.map((u: any) => (
                  <div key={u.id} className="p-3 rounded-xl border border-white/5 bg-white/[0.02] flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <img src={u.avatar || '/logo-icon.png'} alt={u.displayName} className="w-8 h-8 rounded-full object-cover" />
                      <div>
                        <p className="text-xs font-bold text-white">{u.displayName}</p>
                        <p className="text-[10px] text-text-muted">In {u.daysUntil} day{u.daysUntil > 1 ? 's' : ''} ({new Date(u.dateOfBirth).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })})</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-[#D4A24A] bg-[#D4A24A]/10 px-2 py-0.5 rounded-md">
                      Age {u.age + 1}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────── Section 18: Promo & Referrals ─────────────────────── */

function PromoSection() {

  const [filterEligible, setFilterEligible] = useState(false);
  const { data: promoRes, isLoading, error } = useAdminPromo({ eligible: filterEligible });
  const { data: djsRes } = useAdminDjs({ limit: 100 });
  const activatePromo = useActivatePromo();
  const grantPlan = useGrantPlan();

  // Grant Modal state
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [selectedDjId, setSelectedDjId] = useState('');
  const [grantPlanType, setGrantPlanType] = useState<'pro' | 'legend'>('legend');
  const [grantMonths, setGrantMonths] = useState(1);
  const [grantReason, setGrantReason] = useState('');

  const djsList = djsRes?.data || [];
  const promoDjs = promoRes?.data || [];
  const eligibleCount = promoDjs.filter((d: any) => d.isEligible).length;

  const handleGrantSubmit = () => {
    if (!selectedDjId) {
      toast.error('Please select a DJ');
      return;
    }
    grantPlan.mutate(
      { djId: selectedDjId, plan: grantPlanType, months: grantMonths, reason: grantReason || undefined },
      {
        onSuccess: (data) => {
          toast.success(data?.message || 'Subscription granted successfully!');
          setShowGrantModal(false);
          setSelectedDjId('');
          setGrantReason('');
        },
        onError: (err: any) => {
          toast.error(err?.response?.data?.error || 'Failed to grant plan');
        },
      }
    );
  };

  const copyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    toast.success('Referral link copied to clipboard!');
  };

  return (
    <div className="space-y-6">
      <SectionHeader title="Promo & Referral Manager" subtitle="Manage referral rewards and grant Pro/Pro+ subscriptions to DJs" />

      {/* Header Stat Cards & Grant Plan Action */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl p-5 border border-white/5 bg-[#D4A24A]/5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#D4A24A]">Active Campaign</span>
            <Gift className="w-5 h-5 text-[#D4A24A]" />
          </div>
          <p className="text-lg font-extrabold text-white">5 DJ Referrals = 1 Mo Pro+</p>
          <p className="text-xs text-text-muted mt-1">DJs share unique link to earn free Pro+ tier</p>
        </div>

        <div className="rounded-2xl p-5 border border-white/5" style={{ background: 'var(--bg-card)' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-green-400">Pending Activations</span>
            <Trophy className="w-5 h-5 text-green-400" />
          </div>
          <p className="text-2xl font-extrabold text-white">{eligibleCount}</p>
          <p className="text-xs text-text-muted mt-1">DJs reached 5 referrals & waiting activation</p>
        </div>

        <div className="rounded-2xl p-5 border border-[#D4A24A]/30 bg-[#D4A24A]/10 flex flex-col justify-center items-start">
          <p className="text-xs font-bold text-[#D4A24A] uppercase tracking-wider mb-1">Direct Grant</p>
          <p className="text-xs text-text-muted mb-3">Manually give Pro or Pro+ to any DJ account</p>
          <button
            onClick={() => setShowGrantModal(true)}
            className="w-full py-2.5 px-4 bg-[#D4A24A] hover:bg-[#D4A24A]/90 text-black font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all"
          >
            <Crown className="w-4 h-4" /> Grant Plan to DJ
          </button>
        </div>
      </div>

      {/* Referral Leaderboard */}
      <div className="rounded-2xl border border-white/5 p-6" style={{ background: 'var(--bg-card)' }}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
              <Share2 className="w-5 h-5 text-[#D4A24A]" /> DJ Referral Leaderboard
            </h3>
            <p className="text-xs text-text-muted">Track which DJs are sharing their referral links</p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setFilterEligible(false)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                !filterEligible ? 'bg-[#D4A24A] text-black' : 'bg-white/5 text-text-muted hover:text-white'
              }`}
            >
              All DJs ({promoDjs.length})
            </button>
            <button
              onClick={() => setFilterEligible(true)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filterEligible ? 'bg-green-500 text-black' : 'bg-white/5 text-text-muted hover:text-white'
              }`}
            >
              🎁 Eligible for Pro+ ({eligibleCount})
            </button>
          </div>
        </div>

        {isLoading && <LoadingCenter />}

        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            Failed to load promo data.
          </div>
        )}

        {!isLoading && !error && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-text-secondary">
              <thead className="bg-white/5 text-text-muted uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-4">DJ Name</th>
                  <th className="p-4">Current Tier</th>
                  <th className="p-4">Referrals Made</th>
                  <th className="p-4">Unique Link</th>
                  <th className="p-4">Promo Status</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {promoDjs.length > 0 ? (
                  promoDjs.map((dj: any) => (
                    <tr key={dj.id} className="hover:bg-white/[0.02]">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={dj.avatar || '/logo-icon.png'}
                            alt={dj.stageName}
                            className="w-9 h-9 rounded-full object-cover border border-white/10"
                          />
                          <div>
                            <p className="font-bold text-text-primary">{dj.stageName}</p>
                            <p className="text-xs text-text-muted">{dj.user?.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                            dj.subscriptionTier === 'legend'
                              ? 'bg-[#D4A24A]/20 text-[#D4A24A] border border-[#D4A24A]/40'
                              : dj.subscriptionTier === 'pro'
                              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                              : 'bg-white/5 text-text-muted'
                          }`}
                        >
                          {dj.subscriptionTier === 'legend' ? 'Pro+' : dj.subscriptionTier === 'pro' ? 'Pro' : 'Free'}
                        </span>
                      </td>
                      <td className="p-4 font-mono font-bold text-white">
                        <div className="flex items-center gap-2">
                          <span>{dj.referralCount || 0} / 5</span>
                          <div className="w-16 h-2 rounded-full bg-white/10 overflow-hidden">
                            <div
                              className="h-full bg-[#D4A24A]"
                              style={{ width: `${Math.min(100, ((dj.referralCount || 0) / 5) * 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        {dj.referralLink ? (
                          <button
                            onClick={() => copyLink(dj.referralLink)}
                            className="flex items-center gap-1.5 px-2.5 py-1 bg-white/5 hover:bg-white/10 rounded-lg text-xs text-text-muted font-mono"
                          >
                            <Copy className="w-3 h-3 text-[#D4A24A]" />
                            <span className="truncate max-w-[140px]">{dj.user?.referralCode}</span>
                          </button>
                        ) : (
                          <span className="text-text-muted text-xs">No code</span>
                        )}
                      </td>
                      <td className="p-4">
                        {dj.isPromoActive ? (
                          <span className="text-xs font-bold text-green-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Pro+ Active (Expires {new Date(dj.promoExpiresAt).toLocaleDateString()})
                          </span>
                        ) : dj.isEligible ? (
                          <span className="text-xs font-bold text-[#D4A24A] animate-pulse">
                            🎁 Eligible for 1 Mo Free Pro+
                          </span>
                        ) : (
                          <span className="text-xs text-text-muted">
                            Need {Math.max(0, 5 - (dj.referralCount || 0))} more referral(s)
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        {dj.isEligible ? (
                          <button
                            onClick={() =>
                              activatePromo.mutate(
                                { djId: dj.id },
                                {
                                  onSuccess: () => toast.success(`🎉 1 Month Free Pro+ activated for ${dj.stageName}!`),
                                  onError: (err: any) => toast.error(err?.response?.data?.error || 'Failed to activate promo'),
                                }
                              )
                            }
                            disabled={activatePromo.isPending}
                            className="px-3 py-1.5 bg-[#D4A24A] hover:bg-[#D4A24A]/90 text-black font-bold rounded-lg text-xs flex items-center gap-1 ml-auto disabled:opacity-50"
                          >
                            {activatePromo.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Gift className="w-3.5 h-3.5" />}
                            Activate Pro+ Now
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setSelectedDjId(dj.id);
                              setShowGrantModal(true);
                            }}
                            className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-text-secondary rounded-lg text-xs font-medium ml-auto"
                          >
                            Grant Plan
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-text-muted">
                      No DJs found matching criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 🎂 Birthday Celebrants & Automated Wishes Section */}
      <BirthdayWidget />

      {/* 📋 Incomplete Profiles & 5-Step Activation Nudges */}
      <IncompleteProfilesWidget />


      {/* Grant Plan Modal */}

      {showGrantModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-[#111] border border-white/10 rounded-2xl p-6 space-y-4 text-left"
          >
            <div className="flex justify-between items-center pb-3 border-b border-white/10">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Crown className="w-5 h-5 text-[#D4A24A]" /> Grant Plan to DJ
              </h3>
              <button onClick={() => setShowGrantModal(false)} className="text-text-muted hover:text-white">
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1.5">Select DJ</label>
                <select
                  value={selectedDjId}
                  onChange={(e) => setSelectedDjId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-text-primary focus:outline-none"
                >
                  <option value="">-- Pick a DJ --</option>
                  {djsList.map((d: any) => (
                    <option key={d.id} value={d.id}>
                      {d.stageName} ({d.user?.email || d.subscriptionTier})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-muted mb-1.5">Subscription Plan</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setGrantPlanType('pro')}
                    className={`p-3 rounded-xl border text-center font-bold text-xs transition-all ${
                      grantPlanType === 'pro'
                        ? 'border-purple-500 bg-purple-500/20 text-purple-300'
                        : 'border-white/10 bg-white/5 text-text-muted'
                    }`}
                  >
                    Pro Plan
                  </button>
                  <button
                    onClick={() => setGrantPlanType('legend')}
                    className={`p-3 rounded-xl border text-center font-bold text-xs transition-all ${
                      grantPlanType === 'legend'
                        ? 'border-[#D4A24A] bg-[#D4A24A]/20 text-[#D4A24A]'
                        : 'border-white/10 bg-white/5 text-text-muted'
                    }`}
                  >
                    Pro+ (Legend)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-muted mb-1.5">Duration</label>
                <select
                  value={grantMonths}
                  onChange={(e) => setGrantMonths(Number(e.target.value))}
                  className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-text-primary focus:outline-none"
                >
                  <option value={1}>1 Month</option>
                  <option value={3}>3 Months</option>
                  <option value={6}>6 Months</option>
                  <option value={12}>12 Months (1 Year)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-muted mb-1.5">Reason / Note (optional)</label>
                <input
                  type="text"
                  value={grantReason}
                  onChange={(e) => setGrantReason(e.target.value)}
                  placeholder="e.g. VIP partner, Event sponsor, Competition winner"
                  className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-text-primary focus:outline-none"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  onClick={() => setShowGrantModal(false)}
                  className="w-1/2 py-2.5 border border-white/10 text-text-muted hover:text-white rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGrantSubmit}
                  disabled={grantPlan.isPending}
                  className="w-1/2 py-2.5 bg-[#D4A24A] hover:bg-[#D4A24A]/90 text-black font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {grantPlan.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crown className="w-4 h-4" />}
                  Activate Now
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────── Main Component ─────────────────────── */

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [section, setSection] = useState<AdminSection>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() => typeof window === 'undefined' ? true : window.innerWidth >= 1024);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [bellOpen, setBellOpen] = useState(false);
  const { user, logout } = useAuthStore();

  useEffect(() => {
    if (user?.role === 'MODERATOR') {
      navigate('/moderator', { replace: true });
    }
  }, [user, navigate]);

  if (user?.role === 'MODERATOR') {
    return null;
  }

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= 1024);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const sectionComponents: Record<AdminSection, React.ReactNode> = {
    dashboard: <DashboardSection />,
    djs: <DJsSection />,
    rankings: <RankingsSection />,
    mixes: <MixesSection />,
    bookings: <BookingsSection />,
    users: <UsersSection />,
    events: <EventsSection />,
    battles: <BattlesSection />,
    revenue: <RevenueSection />,
    analytics: <AnalyticsSection />,
    subscriptions: <SubscriptionsSection />,
    platforms: <PlatformsSection />,
    verification: <VerificationSection />,
    notifications: <NotificationsSection />,
    security: <SecurityLogsSection />,
    ads: <AdsManagerSection />,
    roles: <RolesSection />,
    halloffame: <HallOfFameSection />,
    settings: <SettingsSection />,
    opportunities: <OpportunitiesSection />,
    violations: <ViolationsSection />,
    promo: <PromoSection />,
  };


  const currentLabel = sidebarItems.find((i) => i.id === section)?.label || 'Dashboard';
  const currentSection = sidebarItems.find((i) => i.id === section);
  const adminName = user?.username || user?.email?.split('@')[0] || 'Admin';

  return (
    <div className="min-h-screen flex bg-[#080808] text-text-primary" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* ──────────────── SIDEBAR ──────────────── */}
      <motion.aside
        className="fixed top-0 left-0 h-screen z-50 hidden lg:flex flex-col border-r border-white/10 bg-[#0C0C0C]"
        style={{ width: sidebarCollapsed ? 80 : 288 }}
        animate={{ width: sidebarCollapsed ? 80 : 288 }}
      >
        {/* Logo */}
        <div className="px-4 py-5 border-b border-white/10 flex-shrink-0">
          {!sidebarCollapsed ? (
            <a href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="h-10 w-10 rounded-xl border border-[#D4A24A]/25 bg-[#D4A24A]/10 flex items-center justify-center overflow-hidden">
                <img src="/logo-web.png?v=4" alt="Deck Salone" className="h-8 w-auto object-contain" />
              </div>
              <div className="min-w-0">
                <p className="font-display text-sm font-bold text-text-primary uppercase tracking-wide truncate">Deck Salone</p>
                <p className="text-[10px] text-text-muted uppercase tracking-[0.22em]">Admin Console</p>
              </div>
            </a>
          ) : (
            <a href="/" className="hover:opacity-80 transition-opacity flex justify-center">
              <img src="/logo-mobile.png?v=4" alt="Deck Salone" className="h-8 w-auto object-contain" />
            </a>
          )}
        </div>

        {/* Nav Items */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
          {sidebarGroups.map((group) => (
            <div key={group}>
              {!sidebarCollapsed && (
                <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-text-muted">{group}</p>
              )}
              <div className="space-y-1">
                {sidebarItems.filter((item) => item.group === group).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSection(item.id)}
                    title={sidebarCollapsed ? item.label : undefined}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${section === item.id
                        ? 'bg-[#D4A24A] text-black shadow-[0_12px_28px_rgba(212,162,74,0.16)]'
                        : 'text-text-muted hover:text-text-primary hover:bg-white/[0.06]'
                      }`}
                  >
                    <item.icon className="w-4 h-4 flex-shrink-0" />
                    {!sidebarCollapsed && <span className="text-sm font-semibold truncate">{item.label}</span>}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom */}
        <div className="border-t border-white/10 p-4 flex-shrink-0">
          {sidebarCollapsed ? (
            <button onClick={() => setSidebarCollapsed(false)} className="w-full flex justify-center p-2 rounded-lg text-text-muted hover:bg-white/5">
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[rgba(212,162,74,0.14)] border border-[#D4A24A]/20 flex items-center justify-center">
                <Crown className="w-4 h-4 text-[#D4A24A]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-text-primary truncate">{adminName}</p>
                <p className="text-[10px] text-text-muted uppercase tracking-wider">Super Admin</p>
              </div>
              <button onClick={logout} className="p-1.5 text-text-muted hover:text-red-400 transition-colors" title="Logout">
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </motion.aside>

      {/* ──────────────── MAIN CONTENT ──────────────── */}
      <main
        className="flex-1 flex flex-col min-h-screen overflow-hidden"
        style={{ marginLeft: isDesktop ? (sidebarCollapsed ? 80 : 288) : 0, transition: 'margin-left 0.25s' }}
      >
        {/* Header */}
        <header className="sticky top-0 z-40 border-b border-white/10 bg-[#080808]/90 backdrop-blur-xl px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarCollapsed((c) => !c)} className="hidden lg:flex p-2 rounded-lg text-text-muted hover:bg-white/5">
              <Menu className="w-4 h-4" />
            </button>
            <select
              value={section}
              onChange={(event) => setSection(event.target.value as AdminSection)}
              className="lg:hidden max-w-[150px] rounded-lg border border-white/10 bg-[#111111] px-3 py-2 text-xs font-semibold text-text-primary focus:outline-none focus:border-[#D4A24A]/50"
              aria-label="Admin section"
            >
              {sidebarItems.map((item) => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
            </select>
            {currentSection && (
              <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center">
                <currentSection.icon className="w-5 h-5 text-[#D4A24A]" />
              </div>
            )}
            <div>
              <h1 className="font-display text-lg font-bold uppercase tracking-wide text-text-primary">{currentLabel}</h1>
              <p className="text-xs text-text-muted">
                {currentTime.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="hidden sm:flex p-2 rounded-lg text-text-muted hover:bg-white/5">
              <Search className="w-4 h-4" />
            </button>
            <ThemeToggle />
            <div className="relative">
              <AdminBellButton bellOpen={bellOpen} setBellOpen={setBellOpen} />
              {bellOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 rounded-2xl border theme-border-card shadow-xl overflow-hidden z-50 theme-bg-elevated">
                  <AdminBellDropdown setBellOpen={setBellOpen} />
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 xl:px-8 py-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={section}
              className="mx-auto w-full max-w-[1600px]"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.2 }}
            >
              {sectionComponents[section]}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

function AdminBellButton({ bellOpen, setBellOpen }: { bellOpen: boolean; setBellOpen: (v: boolean) => void }) {
  const { data: notifications } = useAdminNotifications({ limit: 10 });
  const unreadCount = notifications?.filter((n) => !n.read).length || 0;

  return (
    <button onClick={() => setBellOpen(!bellOpen)} className="p-2 rounded-lg text-text-muted hover:bg-white/5 relative">
      <Bell className="w-4 h-4" />
      {unreadCount > 0 && (
        <span className="absolute top-0.5 right-0.5 min-w-[14px] h-[14px] px-1 rounded-full bg-[#D4A24A] text-[9px] font-bold text-black flex items-center justify-center">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  );
}

function AdminBellDropdown({ setBellOpen }: { setBellOpen: (v: boolean) => void }) {
  const { data: notifications, isLoading } = useAdminNotifications({ limit: 10 });
  const markAllRead = useMarkAdminNotificationsRead();
  const clearAll = useClearAdminNotifications();
  const unreadCount = notifications?.filter((n: any) => !n.read).length || 0;

  return (
    <>
      {/* Header */}
      <div className="p-3 border-b theme-border-card flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-xs font-bold text-text-primary">Notifications</p>
          {unreadCount > 0 && (
            <span className="text-[10px] bg-[#D4A24A]/20 text-[#D4A24A] px-1.5 py-0.5 rounded-full">{unreadCount} new</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); markAllRead.mutate(); }}
              disabled={markAllRead.isPending}
              className="text-[10px] text-text-muted hover:text-text-primary px-1.5 py-0.5"
              title="Mark all read"
            >
              {markAllRead.isPending ? '...' : 'Mark read'}
            </button>
          )}
          {notifications && notifications.length > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); clearAll.mutate(); }}
              disabled={clearAll.isPending}
              className="text-[10px] text-red hover:text-red/80 px-1.5 py-0.5"
              title="Clear all"
            >
              {clearAll.isPending ? '...' : 'Clear all'}
            </button>
          )}
          <button onClick={() => setBellOpen(false)} className="text-[10px] text-text-muted hover:text-text-primary px-1.5 py-0.5">Close</button>
        </div>
      </div>

      {/* Content */}
      <div className="max-h-72 overflow-y-auto p-2 space-y-2">
        {isLoading ? (
          <div className="p-4 flex justify-center"><Loader2 className="w-5 h-5 text-[#D4A24A] animate-spin" /></div>
        ) : !notifications || notifications.length === 0 ? (
          <p className="text-xs text-text-muted text-center py-4">No notifications</p>
        ) : (
          notifications.map((n: any) => (
            <div key={n.id} className={`rounded-xl p-2.5 border border-white/5 flex items-start gap-2.5 ${!n.read ? 'bg-[#D4A24A]/5' : 'bg-white/[0.02]'}`}>
              <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: n.type === 'verification' ? 'rgba(249,115,22,0.1)' : n.type === 'booking' ? 'rgba(34,197,94,0.1)' : 'rgba(59,130,246,0.1)' }}>
                {n.type === 'verification' ? <AlertTriangle className="w-3 h-3 text-orange-400" /> : n.type === 'booking' ? <CheckCircle2 className="w-3 h-3 text-green-400" /> : <Bell className="w-3 h-3 text-blue-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-xs truncate ${!n.read ? 'font-bold text-text-primary' : 'text-text-secondary'}`}>{n.title}</p>
                <p className="text-[10px] text-text-muted truncate">{n.message}</p>
                <p className="text-[10px] text-text-muted mt-0.5">{n.createdAt ? new Date(n.createdAt).toLocaleDateString() : '--'}</p>
              </div>
              {!n.read && <div className="w-1.5 h-1.5 rounded-full bg-[#D4A24A] flex-shrink-0 mt-1" />}
            </div>
          ))
        )}
      </div>
    </>
  );
}

function OpportunitiesSection() {
  const { data: opportunities, isLoading, error } = useAdminOpportunities();

  if (isLoading) return <LoadingCenter />;
  if (error) return (
    <div className="rounded-2xl border border-red-500/20 p-6 text-center" style={{ background: 'var(--bg-error)' }}>
      <p className="text-red-400 font-medium">Failed to load opportunities</p>
      <p className="text-red-400/60 text-sm mt-1">{(error as any)?.response?.data?.error || (error as any)?.message || 'Unknown error'}</p>
    </div>
  );

  const pendingCount = (opportunities || []).reduce((acc: number, opp: any) => acc + (opp.applicants?.filter((a: any) => a.status === 'pending').length || 0), 0);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Opportunities"
        subtitle="Manage available gigs, featured posts, and track DJ applications"
        action={
          <button className="flex items-center gap-2 bg-gold text-black px-4 py-2 rounded-lg text-sm font-bold hover:opacity-90 transition-opacity">
            <Plus className="w-4 h-4" /> Create Opportunity
          </button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl p-5 border border-white/5" style={{ background: 'var(--bg-card)' }}>
          <p className="text-[10px] uppercase tracking-wider text-text-muted font-semibold">Total Opportunities</p>
          <p className="font-mono text-2xl font-bold text-text-primary mt-2">{(opportunities || []).length}</p>
        </div>
        <div className="rounded-2xl p-5 border border-white/5" style={{ background: 'var(--bg-card)' }}>
          <p className="text-[10px] uppercase tracking-wider text-text-muted font-semibold">Pending Applications</p>
          <p className="font-mono text-2xl font-bold text-[#F97316] mt-2">{pendingCount}</p>
        </div>
      </div>

      <div className="space-y-4">
        {(opportunities || []).length === 0 ? (
          <EmptyState message="No opportunities available." />
        ) : (
          (opportunities || []).map((opp: any) => (
            <div key={opp.id} className="rounded-2xl border border-white/5 bg-white/[0.02] p-5">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-text-primary text-lg">{opp.title}</h3>
                    {opp.isFeatured && <StatusBadge status="featured" />}
                    <StatusBadge status={opp.status} />
                  </div>
                  <p className="text-sm text-text-secondary">{opp.eventLocation} • {new Date(opp.eventDate).toLocaleDateString()}</p>
                  <p className="text-sm font-mono text-[#D4A24A] mt-1">{opp.budgetCurrency} {opp.budget?.toLocaleString()}</p>
                  <div className="flex items-center gap-2 mt-3">
                    <StatusBadge status={opp.requiredTier === 'legend' ? 'legend' : 'pro'} />
                    <span className="text-xs text-text-muted">{opp.applicants?.length || 0} Applicants</span>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button className="px-3 py-1.5 bg-white/5 text-text-secondary rounded-lg text-xs font-bold hover:bg-white/10 transition-colors">
                    Edit
                  </button>
                  <button className="px-3 py-1.5 bg-red-500/10 text-red-400 rounded-lg text-xs font-bold hover:bg-red-500/20 transition-colors">
                    Close
                  </button>
                </div>
              </div>

              {opp.applicants && opp.applicants.length > 0 && (
                <div className="mt-5 border-t border-white/5 pt-5">
                  <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Applicants</p>
                  <div className="space-y-2">
                    {opp.applicants.map((app: any) => (
                      <div key={app.id} className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/5">
                        <div className="flex items-center gap-3">
                          <img src={app.dj?.avatar || '/default-avatar.jpg'} alt={app.dj?.stageName} className="w-8 h-8 rounded-full border border-gold/30 object-cover" />
                          <div>
                            <p className="text-sm font-bold text-text-primary">{app.dj?.stageName}</p>
                            <StatusBadge status={app.status} />
                          </div>
                        </div>
                        <div className="flex gap-2">
                           <button className="px-2 py-1 bg-green-500/10 text-green-400 rounded hover:bg-green-500/20 text-xs font-bold">Accept</button>
                           <button className="px-2 py-1 bg-red-500/10 text-red-400 rounded hover:bg-red-500/20 text-xs font-bold">Reject</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
