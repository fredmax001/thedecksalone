import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import {
  LayoutDashboard, Users, CalendarCheck,
  Shield, TrendingUp,
  CheckCircle2, Play, Zap, Server,
  ChevronLeft, ChevronRight,
  Radio, Mic,
  Menu, Crown,
  RefreshCw, LogOut, Volume2,
  BarChart2, Flag,
  MonitorPlay, AudioLines, BadgeCheck, Wallet,
  MessageCircle, Ban,
  Loader2
} from 'lucide-react';
import { useAdminStats, useAdminUsers, useAdminPendingDJs } from '@/hooks/useAdmin';
import { useDJs } from '@/hooks/useDJs';

/* ─────────────────────── Types ─────────────────────── */
type AdminSection =
  | 'overview' | 'analytics'
  | 'mixcloud' | 'soundcloud' | 'audiomack' | 'youtube' | 'bpm'
  | 'djs' | 'users' | 'verification' | 'staff'
  | 'subscriptions' | 'advertising' | 'payments'
  | 'bookings' | 'messaging' | 'moderation' | 'system';

/* ─────────────────────── Empty Data (No Mocks) ─────────────────────── */

const kpiStats = [
  { label: 'Total DJs', value: '--', change: 'Connect API', positive: true, icon: Mic, color: '#D4A24A', bg: 'rgba(212,162,74,0.1)' },
  { label: 'Monthly Streams', value: '--', change: 'Connect API', positive: true, icon: Play, color: '#3B82F6', bg: 'rgba(59,130,246,0.1)' },
  { label: 'Active Bookings', value: '--', change: 'Connect API', positive: true, icon: CalendarCheck, color: '#22C55E', bg: 'rgba(34,197,94,0.1)' },
  { label: 'Monthly Revenue', value: '--', change: 'Connect API', positive: true, icon: TrendingUp, color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)' },
  { label: 'Platform BPM Avg', value: '--', change: 'Connect API', positive: true, icon: Zap, color: '#06B6D4', bg: 'rgba(6,182,212,0.1)' },
  { label: 'Content Flags', value: '0', change: 'Live', positive: true, icon: Flag, color: '#F97316', bg: 'rgba(249,115,22,0.1)' },
];

const emptyTimeline = [
  { month: 'Jul', streams: 0, revenue: 0 }, { month: 'Aug', streams: 0, revenue: 0 },
  { month: 'Sep', streams: 0, revenue: 0 }, { month: 'Oct', streams: 0, revenue: 0 },
  { month: 'Nov', streams: 0, revenue: 0 }, { month: 'Dec', streams: 0, revenue: 0 },
];

const trafficSources = [
  { name: 'Mixcloud', value: 0, color: '#FF5500' },
  { name: 'SoundCloud', value: 0, color: '#FF5722' },
  { name: 'Audiomack', value: 0, color: '#D4A24A' },
  { name: 'Direct', value: 0, color: '#8B5CF6' },
  { name: 'Social', value: 0, color: '#3B82F6' },
  { name: 'YouTube', value: 0, color: '#22C55E' },
];


/* ─────────────────────── Sidebar Nav Config ─────────────────────── */
const navGroups = [
  {
    label: 'Main',
    items: [
      { id: 'overview' as AdminSection, label: 'Overview', icon: LayoutDashboard },
      { id: 'analytics' as AdminSection, label: 'Analytics', icon: BarChart2 },
    ]
  },
  {
    label: 'Platforms',
    items: [
      { id: 'mixcloud' as AdminSection, label: 'Mixcloud', icon: Radio },
      { id: 'soundcloud' as AdminSection, label: 'SoundCloud', icon: Volume2 },
      { id: 'audiomack' as AdminSection, label: 'Audiomack', icon: AudioLines },
      { id: 'youtube' as AdminSection, label: 'YouTube', icon: MonitorPlay },
      { id: 'bpm' as AdminSection, label: 'BPM Intelligence', icon: Zap },
    ]
  },
  {
    label: 'Management',
    items: [
      { id: 'djs' as AdminSection, label: 'DJ Management', icon: Mic },
      { id: 'users' as AdminSection, label: 'Users', icon: Users },
      { id: 'verification' as AdminSection, label: 'Verification', icon: BadgeCheck },
      { id: 'staff' as AdminSection, label: 'Staff & Admin', icon: Shield },
    ]
  },
  {
    label: 'Revenue',
    items: [
      { id: 'subscriptions' as AdminSection, label: 'Subscriptions', icon: Crown },
      { id: 'advertising' as AdminSection, label: 'Advertising', icon: MonitorPlay },
      { id: 'payments' as AdminSection, label: 'Payments', icon: Wallet },
    ]
  },
  {
    label: 'Operations',
    items: [
      { id: 'bookings' as AdminSection, label: 'Bookings', icon: CalendarCheck },
      { id: 'messaging' as AdminSection, label: 'Messaging', icon: MessageCircle },
      { id: 'moderation' as AdminSection, label: 'Moderation', icon: Flag },
      { id: 'system' as AdminSection, label: 'System Health', icon: Server },
    ]
  }
];

/* ─────────────────────── Sub-components ─────────────────────── */

function StatCard({ stat, delay = 0 }: { stat: typeof kpiStats[0]; delay?: number }) {
  return (
    <motion.div
      className="rounded-2xl p-5 border border-white/5 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #111111 0%, #161616 100%)' }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
    >
      <div className="absolute inset-0 opacity-5" style={{ background: `radial-gradient(circle at top right, ${stat.color}, transparent 70%)` }} />
      <div className="flex items-start justify-between relative">
        <div>
          <p className="text-xs uppercase tracking-wider text-text-muted font-semibold">{stat.label}</p>
          <p className="font-mono text-2xl font-bold text-text-primary mt-2">{stat.value}</p>
          <div className="flex items-center gap-1 mt-2">
            <span className={`text-[10px] font-semibold text-text-muted`}>{stat.change}</span>
          </div>
        </div>
        <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: stat.bg }}>
          <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
        </div>
      </div>
    </motion.div>
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

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    verified: { label: 'Verified', color: '#22C55E', bg: 'rgba(34,197,94,0.1)' },
    active: { label: 'Active', color: '#22C55E', bg: 'rgba(34,197,94,0.1)' },
    pending: { label: 'Pending', color: '#F97316', bg: 'rgba(249,115,22,0.1)' },
    suspended: { label: 'Suspended', color: '#EF4444', bg: 'rgba(239,68,68,0.1)' },
    good: { label: 'Good', color: '#22C55E', bg: 'rgba(34,197,94,0.1)' },
    warning: { label: 'Warning', color: '#F97316', bg: 'rgba(249,115,22,0.1)' },
    running: { label: 'Running', color: '#3B82F6', bg: 'rgba(59,130,246,0.1)' },
  };
  const s = map[status] ?? { label: status, color: '#6B6B6B', bg: 'rgba(107,107,107,0.1)' };
  return (
    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full" style={{ color: s.color, background: s.bg }}>
      {s.label}
    </span>
  );
}

function AwaitingDataOverlay({ message = "Awaiting API Data" }: { message?: string }) {
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px] rounded-2xl">
      <div className="bg-black-elevated border border-white/10 px-4 py-2 rounded-full flex items-center gap-2">
        <RefreshCw className="w-4 h-4 text-text-muted animate-spin-slow" />
        <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">{message}</span>
      </div>
    </div>
  );
}

/* ─────────────────────── Section Panels ─────────────────────── */

function OverviewSection() {
  const { data: stats, isLoading } = useAdminStats();
  const liveKpiStats = useMemo(() => {
    if (!stats) return kpiStats;
    const base = [...kpiStats];
    base[0] = { ...base[0], value: String(stats.totalDjs), change: "Live" };
    base[1] = { ...base[1], value: (stats.totalStreams || 0).toLocaleString(), change: "Live" };
    base[2] = { ...base[2], value: String(stats.totalBookings), change: `${stats.pendingBookings} pending` };
    base[3] = { ...base[3], value: `SLE ${Math.round(stats.estimatedRevenue).toLocaleString()}`, change: "Live" };
    base[4] = { ...base[4], value: String(stats.activeBattles), change: "Active" };
    base[5] = { ...base[5], value: String(stats.pendingVerifications), change: "Pending" };
    return base;
  }, [stats]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-10 h-10 text-gold animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {liveKpiStats.map((s, i) => <StatCard key={s.label} stat={s} delay={i * 0.07} />)}
      </div>

      <div className="grid lg:grid-cols-[60%_40%] gap-6">
        <motion.div className="bg-black-elevated rounded-2xl p-6 border border-white/5 relative"
          initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
          <AwaitingDataOverlay />
          <div className="flex items-center justify-between mb-6">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-gold">Platform Performance</span>
              <p className="font-mono text-2xl font-bold text-text-primary mt-1">--</p>
            </div>
          </div>
          <div className="h-[260px] opacity-30">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={emptyTimeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E1E1E" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6B6B6B' }} />
                <YAxis tick={{ fontSize: 11, fill: '#6B6B6B' }} />
                <Area type="monotone" dataKey="streams" stroke="#D4A24A" fill="transparent" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div className="bg-black-elevated rounded-2xl p-6 border border-white/5 relative"
          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.45 }}>
          <AwaitingDataOverlay />
          <span className="text-xs font-semibold uppercase tracking-wider text-gold">Traffic Sources</span>
          <div className="h-[200px] mt-2 opacity-30">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={trafficSources} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value">
                  {trafficSources.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function AnalyticsSection() {
  return (
    <div className="space-y-6 relative">
      <SectionHeader title="Platform Analytics" subtitle="Deep dive into platform performance metrics" />
      <div className="bg-black-elevated rounded-2xl p-6 border border-white/5 relative min-h-[400px]">
        <AwaitingDataOverlay />
      </div>
    </div>
  );
}

function UsersSection() {
  const { data: usersData, isLoading } = useAdminUsers({ limit: 50 });
  const users = usersData?.data || [];

  return (
    <div className="space-y-6">
      <SectionHeader title="User Info & Management" subtitle="Manage listeners, clients, and user data" />
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-10 h-10 text-gold animate-spin" />
        </div>
      )}
      <div className="bg-black-elevated rounded-2xl border border-white/5 overflow-hidden">
        <table className="w-full text-left">
          <thead className="border-b border-white/5 text-[10px] uppercase text-text-muted">
            <tr><th className="p-4">User</th><th className="p-4">Type</th><th className="p-4">Joined</th><th className="p-4">Status</th></tr>
          </thead>
          <tbody>
            {users.map((u: any) => (
              <tr key={u.id} className="border-b border-white/5 text-sm">
                <td className="p-4">{u.email}</td>
                <td className="p-4"><span className="px-2 py-1 bg-white/5 rounded text-xs">{u.role}</span></td>
                <td className="p-4">{new Date(u.createdAt).toLocaleDateString()}</td>
                <td className="p-4"><StatusBadge status="active" /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!isLoading && users.length === 0 && (
          <p className="p-4 text-sm text-text-muted text-center">No users found.</p>
        )}
      </div>
    </div>
  );
}

function VerificationSection() {
  const { data: pendingData, isLoading } = useAdminPendingDJs();
  const pending = pendingData || [];

  return (
    <div className="space-y-6">
      <SectionHeader title="DJ Verification" subtitle="Review incoming verification requests" />
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-10 h-10 text-gold animate-spin" />
        </div>
      )}
      <div className="grid gap-4">
        {pending.map((v: any) => (
          <div key={v.id} className="bg-black-elevated border border-white/5 p-5 rounded-2xl flex justify-between items-center">
            <div>
              <p className="font-bold">{v.stageName}</p>
              <p className="text-xs text-text-muted">Submitted: {new Date(v.createdAt).toLocaleDateString()}</p>
              <div className="flex gap-4 mt-2 text-xs">
                <span className={v.bio ? "text-green-400" : "text-red-400"}>Profile complete</span>
                <span className="text-red-400">ID provided</span>
                <span className={v.totalMixes > 0 ? "text-green-400" : "text-red-400"}>Mixes uploaded</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="px-4 py-2 bg-green-500/10 text-green-400 rounded-lg text-xs font-bold hover:bg-green-500/20">Approve</button>
              <button className="px-4 py-2 bg-red-500/10 text-red-400 rounded-lg text-xs font-bold hover:bg-red-500/20">Reject (Reason)</button>
            </div>
          </div>
        ))}
      </div>
      {!isLoading && pending.length === 0 && (
        <p className="text-sm text-text-muted text-center">No pending verification requests.</p>
      )}
    </div>
  );
}

function IntegrationSection({ title, color }: { title: string, color: string }) {
  return (
    <div className="space-y-6 relative">
      <SectionHeader title={`${title} Integration`} subtitle={`Platform sync for ${title}`} />
      <div className="bg-black-elevated rounded-2xl p-6 border border-white/5 relative min-h-[400px]">
        <AwaitingDataOverlay message={`Awaiting ${title} API`} />
        <div className="opacity-30 grid grid-cols-3 gap-4">
          <div className="h-32 rounded-xl border border-white/10" style={{ borderColor: color }}></div>
          <div className="h-32 rounded-xl border border-white/10" style={{ borderColor: color }}></div>
          <div className="h-32 rounded-xl border border-white/10" style={{ borderColor: color }}></div>
        </div>
      </div>
    </div>
  );
}

function DJsSection() {
  const [tab, setTab] = useState<'all' | 'search' | 'followed'>('all');
  const [suspendModal, setSuspendModal] = useState<{ open: boolean; djName: string }>({ open: false, djName: '' });
  const { data: djData, isLoading } = useDJs({ limit: 100 });

  const djs = useMemo(() => {
    const list = djData?.data || [];
    return list.map((dj: any) => ({
      id: dj.id,
      name: dj.stageName,
      streams: dj.totalStreams || 0,
      followers: dj.totalFollowers || 0,
      status: dj.verified ? 'verified' as const : 'pending' as const,
    }));
  }, [djData]);

  const displayedDjs = useMemo(() => {
    const sorted = [...djs];
    if (tab === 'search') sorted.sort((a, b) => b.streams - a.streams);
    if (tab === 'followed') sorted.sort((a, b) => b.followers - a.followers);
    return sorted;
  }, [djs, tab]);

  return (
    <div className="space-y-6">
      <SectionHeader title="DJ Management" subtitle="Manage DJs, rankings, and suspensions" />
      <div className="flex gap-2">
        <button onClick={() => setTab('all')} className={`px-4 py-2 text-xs font-bold uppercase rounded-full ${tab === 'all' ? 'bg-gold text-black' : 'bg-white/5 text-text-muted'}`}>All DJs</button>
        <button onClick={() => setTab('search')} className={`px-4 py-2 text-xs font-bold uppercase rounded-full ${tab === 'search' ? 'bg-gold text-black' : 'bg-white/5 text-text-muted'}`}>Most Streamed</button>
        <button onClick={() => setTab('followed')} className={`px-4 py-2 text-xs font-bold uppercase rounded-full ${tab === 'followed' ? 'bg-gold text-black' : 'bg-white/5 text-text-muted'}`}>Most Followed</button>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-10 h-10 text-gold animate-spin" />
        </div>
      )}

      {!isLoading && (
        <div className="bg-black-elevated rounded-2xl border border-white/5 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-white/5 text-[10px] uppercase text-text-muted">
              <tr><th className="p-4">DJ Name</th><th className="p-4">Streams</th><th className="p-4">Followers</th><th className="p-4">Status</th><th className="p-4 text-right">Actions</th></tr>
            </thead>
            <tbody>
              {displayedDjs.map((dj) => (
                <tr key={dj.id} className="border-b border-white/5">
                  <td className="p-4 font-bold">{dj.name}</td>
                  <td className="p-4 font-mono">{dj.streams.toLocaleString()}</td>
                  <td className="p-4 font-mono">{dj.followers.toLocaleString()}</td>
                  <td className="p-4"><StatusBadge status={dj.status} /></td>
                  <td className="p-4 text-right">
                    <button onClick={() => setSuspendModal({ open: true, djName: dj.name })} className="p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 text-xs font-bold flex items-center gap-1 ml-auto">
                      <Ban className="w-3 h-3" /> Suspend
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AnimatePresence>
        {suspendModal.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-black-elevated border border-white/10 rounded-2xl p-6 w-full max-w-md">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Ban className="text-red-500" /> Suspend {suspendModal.djName}</h3>
              <div className="space-y-4 text-sm">
                <div>
                  <label className="block text-text-muted mb-1 text-xs">Reason for suspension</label>
                  <select className="w-full bg-black border border-white/10 rounded-lg p-2 text-text-primary">
                    <option>Copyright Violation</option>
                    <option>Inappropriate Content</option>
                    <option>Fraudulent Booking</option>
                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-text-muted mb-1 text-xs">Duration</label>
                  <select className="w-full bg-black border border-white/10 rounded-lg p-2 text-text-primary">
                    <option>24 Hours</option>
                    <option>7 Days</option>
                    <option>30 Days</option>
                    <option>Permanent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-text-muted mb-1 text-xs">Custom Message to DJ</label>
                  <textarea className="w-full bg-black border border-white/10 rounded-lg p-2 text-text-primary" rows={3}></textarea>
                </div>
                <div className="flex gap-2 justify-end mt-4">
                  <button onClick={() => setSuspendModal({ open: false, djName: '' })} className="px-4 py-2 rounded-lg text-text-muted hover:bg-white/5">Cancel</button>
                  <button onClick={() => setSuspendModal({ open: false, djName: '' })} className="px-4 py-2 rounded-lg bg-red-500 text-white font-bold">Confirm Suspension</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StaffSection() {
  return (
    <div className="space-y-6">
      <SectionHeader title="Staff & Admin" subtitle="Manage roles and permissions" />
      <div className="bg-black-elevated rounded-2xl p-6 border border-white/5 text-center text-sm text-text-muted">
        No staff records available.
      </div>
    </div>
  );
}

function SubscriptionsSection() {
  return (
    <div className="space-y-6">
      <SectionHeader title="DJ Subscriptions" subtitle="Manage subscription tiers and revenue" />
      <div className="bg-black-elevated rounded-2xl p-6 border border-white/5 text-center text-sm text-text-muted">
        Subscription management is not yet connected.
      </div>
    </div>
  );
}

function AdvertisingSection() {
  return (
    <div className="space-y-6">
      <SectionHeader title="Advertising Campaigns" subtitle="Manage audio, banner, and video ad inventory" />
      <div className="bg-black-elevated rounded-2xl p-6 border border-white/5 text-center text-sm text-text-muted">
        No advertising campaigns available.
      </div>
    </div>
  );
}

function PaymentsSection() {
  return (
    <div className="space-y-6 relative">
      <SectionHeader title="Payments & Payouts" subtitle="Subscription receipts, ad payments, and DJ payouts (per terms)" />
      <div className="bg-black-elevated rounded-2xl p-6 border border-white/5 relative min-h-[300px]">
        <AwaitingDataOverlay message="Awaiting Payment Gateway Data" />
      </div>
    </div>
  );
}

function MessagingSection() {
  return (
    <div className="space-y-6">
      <SectionHeader title="Messaging Monitor" subtitle="Monitor booking chat threads for safety and compliance" />
      <div className="bg-black-elevated rounded-2xl p-6 border border-white/5 text-center text-sm text-text-muted">
        No messaging threads to monitor.
      </div>
    </div>
  );
}

function ModerationSection() {
  return (
    <div className="space-y-6 relative">
      <SectionHeader title="Content Moderation" subtitle="Review flagged items" />
      <div className="bg-black-elevated rounded-2xl p-6 border border-white/5 relative min-h-[200px]">
        <div className="flex flex-col items-center justify-center py-10 opacity-50">
          <CheckCircle2 className="w-12 h-12 text-green-400 mb-4" />
          <p className="font-bold">All Clear</p>
        </div>
      </div>
    </div>
  );
}

function SystemSection() {
  return (
    <div className="space-y-6 relative">
      <SectionHeader title="System Health" subtitle="Real-time monitoring" />
      <div className="bg-black-elevated rounded-2xl p-6 border border-white/5 relative min-h-[400px]">
        <AwaitingDataOverlay message="Awaiting System Metrics" />
      </div>
    </div>
  );
}

/* ─────────────────────── Main Component ─────────────────────── */

export default function AdminDashboard() {
  const [section, setSection] = useState<AdminSection>('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const sectionComponents: Record<AdminSection, React.ReactNode> = {
    overview: <OverviewSection />,
    analytics: <AnalyticsSection />,
    bpm: <IntegrationSection title="BPM" color="#06B6D4" />,
    mixcloud: <IntegrationSection title="Mixcloud" color="#FF5500" />,
    soundcloud: <IntegrationSection title="SoundCloud" color="#FF5722" />,
    audiomack: <IntegrationSection title="Audiomack" color="#D4A24A" />,
    youtube: <IntegrationSection title="YouTube" color="#FF0000" />,
    djs: <DJsSection />,
    users: <UsersSection />,
    verification: <VerificationSection />,
    staff: <StaffSection />,
    subscriptions: <SubscriptionsSection />,
    advertising: <AdvertisingSection />,
    payments: <PaymentsSection />,
    bookings: <IntegrationSection title="Bookings" color="#22C55E" />,
    messaging: <MessagingSection />,
    moderation: <ModerationSection />,
    system: <SystemSection />,
  };

  return (
    <div className="min-h-screen bg-black flex" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* ──────────────── SIDEBAR ──────────────── */}
      <motion.aside
        className={`fixed top-0 left-0 h-screen z-50 flex flex-col border-r border-white/5 transition-all duration-300`}
        style={{ background: 'linear-gradient(180deg, #0D0D0D 0%, #0A0A0A 100%)', width: sidebarCollapsed ? 72 : 240 }}
        animate={{ width: sidebarCollapsed ? 72 : 240 }}>
        
        <div className="px-4 py-5 border-b border-white/5 flex items-center justify-between flex-shrink-0">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2">
              <img
                src="/logo.png"
                alt="Deck Salone"
                className="h-8 w-auto object-contain"
              />
              <div><p className="font-display text-sm font-bold text-text-primary uppercase tracking-wide">Sound It</p><p className="text-[9px] text-text-muted uppercase tracking-widest">Admin Console</p></div>
            </div>
          )}
          {sidebarCollapsed && (
            <img
              src="/logo.png"
              alt="Deck Salone"
              className="h-8 w-auto object-contain mx-auto"
            />
          )}
          {!sidebarCollapsed && <button onClick={() => setSidebarCollapsed(true)} className="text-text-muted hover:text-text-primary"><ChevronLeft className="w-4 h-4" /></button>}
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-6">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className={`text-[9px] uppercase tracking-widest text-text-muted font-bold mb-2 ${sidebarCollapsed ? 'text-center' : 'px-2'}`}>
                {!sidebarCollapsed ? group.label : '·'}
              </p>
              {group.items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSection(item.id)}
                  title={sidebarCollapsed ? item.label : undefined}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 text-left transition-all ${section === item.id ? 'bg-gold/10 text-gold border border-gold/20' : 'text-text-muted hover:bg-white/5 border border-transparent'}`}>
                  <item.icon className={`w-4 h-4 flex-shrink-0 ${section === item.id ? 'text-gold' : ''}`} />
                  {!sidebarCollapsed && <span className="text-xs font-semibold truncate">{item.label}</span>}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="border-t border-white/5 p-3 flex-shrink-0">
          {sidebarCollapsed ? (
            <button onClick={() => setSidebarCollapsed(false)} className="w-full flex justify-center p-2 rounded-lg text-text-muted hover:bg-white/5"><ChevronRight className="w-4 h-4" /></button>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center"><Crown className="w-4 h-4 text-gold" /></div>
              <div className="flex-1 min-w-0"><p className="text-xs font-semibold text-text-primary truncate">Super Admin</p></div>
              <button className="p-1.5 text-text-muted hover:text-red-400"><LogOut className="w-3.5 h-3.5" /></button>
            </div>
          )}
        </div>
      </motion.aside>

      {/* ──────────────── MAIN CONTENT ──────────────── */}
      <main className="flex-1 flex flex-col min-h-screen overflow-hidden" style={{ marginLeft: sidebarCollapsed ? 72 : 240, transition: 'margin-left 0.25s' }}>
        <header className="sticky top-0 z-40 border-b border-white/5 px-6 py-3 flex items-center justify-between bg-black/90 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarCollapsed(c => !c)} className="p-2 rounded-lg text-text-muted hover:bg-white/5"><Menu className="w-4 h-4" /></button>
            <div>
              <h1 className="font-display text-base font-bold uppercase tracking-wide text-text-primary">{navGroups.flatMap(g => g.items).find(i => i.id === section)?.label}</h1>
              <p className="text-[10px] text-text-muted font-mono">{currentTime.toLocaleDateString('en-GB')}</p>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          <AnimatePresence mode="wait">
            <motion.div key={section} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
              {sectionComponents[section]}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
