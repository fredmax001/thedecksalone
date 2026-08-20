import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  CalendarCheck,
  Trophy,
  Music,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Headphones,
  TrendingUp,
  MessageSquare,
  ChevronRight,
  Calendar,
  User,
  Users,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';


interface DashboardData {
  overview: {
    totalMixes: number;
    totalStreams: number;
    totalBookings: number;
    totalReviews: number;
    totalFollowers: number;
    averageRating: number;
    rankingPosition: number;
    rankingScore: number;
  };
  recentBookings: any[];
  topMixes: any[];
  recentReviews: any[];
  rankingHistory: { week: string; position: number; score: number }[];
  recentEvents: any[];
  battleEntries: any[];
  payments: any[];
  bookingStatusCounts: { status: string; _count: { status: number } }[];
}

const tooltipStyle = {
  backgroundColor: '#111',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '10px',
  padding: '8px 12px',
  fontSize: '12px',
  color: '#F5F5F5',
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
};

export default function Overview() {
  const { user } = useAuthStore();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isDj = user?.role === 'DJ';

  useEffect(() => {
    if (!isDj) {
      setLoading(false);
      return;
    }

    api
      .get('/dashboard')
      .then((res) => {
        if (res.data.success) {
          setData(res.data.data);
        }
      })
      .catch((err) => {
        setError(err.response?.data?.error || 'Could not load dashboard');
      })
      .finally(() => setLoading(false));
  }, [isDj]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-10 h-10 text-[#f4e059] animate-spin" />
      </div>
    );
  }

  if (!isDj) {
    return <FanDashboard user={user} />;
  }

  const overview = data?.overview;
  const rankingChartData =
    data?.rankingHistory.map((h, i) => ({
      label: `W${i + 1}`,
      position: h.position,
      score: Math.round(h.score),
    })) || [];

  const pendingBookings = data?.recentBookings?.filter((b) => b.status === 'PENDING') || [];
  const confirmedBookings = data?.recentBookings?.filter((b) => b.status === 'CONFIRMED') || [];
  const upcomingEvents = confirmedBookings.slice(0, 3);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="rounded-2xl bg-[#101010] border border-white/5 p-5 md:p-6 relative overflow-hidden flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#f4e059]/60 to-transparent" />
        <div>
          <span className="text-[10px] uppercase tracking-wider text-[#f4e059] font-semibold mb-1 block">DJ COMMAND CENTER</span>
          <h1 className="text-2xl font-display font-bold text-white uppercase tracking-wide">
            {user?.name || user?.email?.split('@')[0] || 'DJ Overview'}
          </h1>
          <p className="text-sm text-[#888888] mt-1">Manage your career and track your performance</p>
        </div>
        <div className="flex items-center gap-3 relative z-10">
          <Link to="/dashboard/bookings">
            <Button variant="outline" className="border-white/10 text-white hover:bg-white/5">
              <CalendarCheck className="w-4 h-4 mr-2" />
              Manage Bookings
            </Button>
          </Link>
          <Link to="/dashboard/mixes">
            <Button className="bg-[#f4e059] text-black hover:bg-[#f4e059]/90 border-0">
              <Music className="w-4 h-4 mr-2" />
              Upload Mix
            </Button>
          </Link>
        </div>
      </motion.div>

      {error && (
        <motion.div variants={itemVariants} className="p-4 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/20 text-[#EF4444] text-sm">
          {error}
        </motion.div>
      )}

      {/* KPI Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <KpiCard
          icon={CalendarCheck}
          label="Total Bookings"
          value={overview?.totalBookings?.toLocaleString() || '0'}
          change="+12%"
          trend="up"
          color="#f4e059"
        />
        <KpiCard
          icon={Trophy}
          label="Ranking Position"
          value={`#${overview?.rankingPosition || '-'}`}
          change="Top 5%"
          trend="up"
          color="#f4e059"
        />
        <KpiCard
          icon={Headphones}
          label="Total Streams"
          value={overview?.totalStreams?.toLocaleString() || '0'}
          change="-2%"
          trend="down"
          color="#f4e059"
        />
        <KpiCard
          icon={Users}
          label="Total Followers"
          value={overview?.totalFollowers?.toLocaleString() || '0'}
          change="+5%"
          trend="up"
          color="#f4e059"
        />
        <KpiCard
          icon={Wallet}
          label="Earnings"
          value={`SLE ${data?.payments?.reduce((sum, p) => sum + (p.amount || 0), 0)?.toLocaleString() || '0'}`}
          change="+18%"
          trend="up"
          color="#22C55E"
        />
      </motion.div>

      {/* Row 2: Rank Chart + Snapshot */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl bg-[#101010] border border-white/5 p-5">
          <div className="flex flex-row items-center justify-between pb-4">
            <h2 className="text-[10px] uppercase tracking-wider text-[#f4e059] font-semibold">Ranking History</h2>
            <span className="text-sm text-[#f4e059] font-medium">
              #{overview?.rankingPosition || '-'} · {overview?.rankingScore?.toFixed(1) || '0'} pts
            </span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rankingChartData}>
                <CartesianGrid stroke="#1E1E1E" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" stroke="#6B6B6B" tick={{ fontSize: 11, fill: '#6B6B6B' }} axisLine={false} tickLine={false} />
                <YAxis reversed stroke="#6B6B6B" tick={{ fontSize: 11, fill: '#6B6B6B' }} axisLine={false} tickLine={false} width={30} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line
                  type="monotone"
                  dataKey="position"
                  stroke="#f4e059"
                  strokeWidth={2}
                  dot={{ r: 4, fill: '#101010', stroke: '#f4e059', strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: '#f4e059', stroke: '#101010', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl bg-[#101010] border border-white/5 p-5">
          <h2 className="text-[10px] uppercase tracking-wider text-[#f4e059] font-semibold mb-6">Rank Snapshot</h2>
          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 rounded-2xl bg-[#f4e059]/10 flex items-center justify-center relative">
              <div className="absolute inset-0 bg-[#f4e059] opacity-20 blur-xl rounded-2xl"></div>
              <Trophy className="w-8 h-8 text-[#f4e059] relative z-10" />
            </div>
            <div>
              <p className="font-mono text-4xl font-bold text-white">
                #{overview?.rankingPosition || '-'}
              </p>
              <p className="text-[10px] uppercase tracking-wider text-[#888888] font-semibold mt-1">Current rank</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-white/[0.04] text-sm">
              <span className="text-[#888888]">Score</span>
              <span className="font-mono text-white font-medium">
                {overview?.rankingScore?.toFixed(1) || '0.0'}
              </span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-white/[0.04] text-sm">
              <span className="text-[#888888]">Reviews</span>
              <span className="font-mono text-white font-medium">
                {overview?.totalReviews || 0}
              </span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-white/[0.04] text-sm">
              <span className="text-[#888888]">Rating</span>
              <span className="font-mono text-white font-medium flex items-center gap-1">
                {overview?.averageRating?.toFixed(1) || '0.0'} <span className="text-[#f4e059]">★</span>
              </span>
            </div>
          </div>
          <Link to="/dashboard/analytics">
            <Button variant="ghost" className="w-full mt-4 text-[#f4e059] hover:bg-[#f4e059]/10 hover:text-[#f4e059]">
              View Analytics <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
      </motion.div>

      {/* Row 3: Recent Bookings + Top Mixes */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl bg-[#101010] border border-white/5 p-5">
          <div className="flex flex-row items-center justify-between mb-4">
            <h2 className="text-[10px] uppercase tracking-wider text-[#f4e059] font-semibold pl-3 border-l-2 border-[#f4e059]">Recent Bookings</h2>
            <Link to="/dashboard/bookings">
              <Button variant="ghost" size="sm" className="text-[#f4e059] hover:bg-[#f4e059]/10 hover:text-[#f4e059] h-8 px-2 text-xs">
                View All <ChevronRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </div>
          <div className="space-y-3">
            {data?.recentBookings?.length ? (
              data.recentBookings.slice(0, 5).map((b) => (
                <div
                  key={b.id}
                  className="rounded-xl bg-white/[0.03] border border-white/[0.04] p-3 hover:bg-white/[0.06] transition-colors flex items-center justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white capitalize truncate">
                      {b.eventType}
                    </p>
                    <p className="text-[11px] text-[#888888] mt-0.5">
                      {new Date(b.eventDate).toLocaleDateString()} · {b.eventLocation}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                      b.status === 'CONFIRMED' && 'bg-[#22C55E]/10 text-[#22C55E]',
                      b.status === 'PENDING' && 'bg-[#F97316]/10 text-[#F97316]',
                      b.status === 'COMPLETED' && 'bg-[#3B82F6]/10 text-[#3B82F6]',
                      b.status === 'CANCELLED' && 'bg-[#EF4444]/10 text-[#EF4444]',
                      b.status === 'NEGOTIATING' && 'bg-[#8B5CF6]/10 text-[#8B5CF6]'
                    )}
                  >
                    {b.status}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Calendar className="w-10 h-10 text-[#888888] mx-auto mb-3 opacity-50" />
                <p className="text-sm text-[#888888] mb-2">No bookings yet</p>
                <Link to="/discover">
                  <Button variant="outline" size="sm" className="border-white/10 text-white hover:bg-white/5">
                    Promote Your Profile
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl bg-[#101010] border border-white/5 p-5">
          <div className="flex flex-row items-center justify-between mb-4">
            <h2 className="text-[10px] uppercase tracking-wider text-[#f4e059] font-semibold pl-3 border-l-2 border-[#f4e059]">Top Mixes</h2>
            <Link to="/dashboard/mixes">
              <Button variant="ghost" size="sm" className="text-[#f4e059] hover:bg-[#f4e059]/10 hover:text-[#f4e059] h-8 px-2 text-xs">
                View All <ChevronRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </div>
          <div className="space-y-3">
            {data?.topMixes?.length ? (
              data.topMixes.slice(0, 5).map((m) => (
                <div
                  key={m.id}
                  className="rounded-xl bg-white/[0.03] border border-white/[0.04] p-3 hover:bg-white/[0.06] transition-colors flex items-center justify-between"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-[#f4e059]/10 flex items-center justify-center flex-shrink-0">
                      <Music className="w-4 h-4 text-[#f4e059]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{m.title}</p>
                      <p className="text-[11px] text-[#888888] capitalize mt-0.5">{m.genre}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-mono text-sm text-white font-medium">{m.plays.toLocaleString()}</p>
                    <p className="text-[10px] uppercase tracking-wider text-[#888888]">plays</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Music className="w-10 h-10 text-[#888888] mx-auto mb-3 opacity-50" />
                <p className="text-sm text-[#888888] mb-2">No mixes uploaded yet</p>
                <Link to="/dashboard/mixes">
                  <Button variant="outline" size="sm" className="border-white/10 text-white hover:bg-white/5">
                    Upload Your First Mix
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Row 4: Upcoming Events + Quick Actions */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="rounded-2xl bg-[#101010] border border-white/5 p-5">
          <h2 className="text-[10px] uppercase tracking-wider text-[#f4e059] font-semibold mb-4 pl-3 border-l-2 border-[#f4e059]">Upcoming Events</h2>
          {upcomingEvents.length > 0 ? (
            <div className="space-y-3">
              {upcomingEvents.map((e) => (
                <div key={e.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.04]">
                  <div className="w-10 h-10 rounded-lg bg-[#f4e059]/10 flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-4 h-4 text-[#f4e059]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white capitalize truncate">{e.eventType}</p>
                    <p className="text-[11px] text-[#888888] mt-0.5">{new Date(e.eventDate).toLocaleDateString()}</p>
                  </div>
                  <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-[#22C55E]/10 text-[#22C55E]">
                    Confirmed
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <Calendar className="w-8 h-8 text-[#888888] mx-auto mb-2 opacity-50" />
              <p className="text-sm text-[#888888]">No upcoming events</p>
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-[#101010] border border-white/5 p-5 lg:col-span-2">
          <h2 className="text-[10px] uppercase tracking-wider text-[#f4e059] font-semibold mb-4 pl-3 border-l-2 border-[#f4e059]">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link to="/dashboard/profile">
              <div className="rounded-xl bg-white/[0.03] border border-white/[0.05] hover:border-[#f4e059]/30 hover:bg-[#f4e059]/[0.03] p-4 flex items-center gap-3 transition-all cursor-pointer group">
                <div className="w-10 h-10 rounded-lg bg-[#f4e059]/10 group-hover:bg-[#f4e059]/20 transition-colors flex items-center justify-center">
                  <User className="w-5 h-5 text-[#f4e059]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Edit Profile</p>
                  <p className="text-[11px] text-[#888888] mt-0.5">Update bio, photos, pricing</p>
                </div>
              </div>
            </Link>
            <Link to="/dashboard/bookings">
              <div className="rounded-xl bg-white/[0.03] border border-white/[0.05] hover:border-[#f4e059]/30 hover:bg-[#f4e059]/[0.03] p-4 flex items-center gap-3 transition-all cursor-pointer group">
                <div className="w-10 h-10 rounded-lg bg-[#f4e059]/10 group-hover:bg-[#f4e059]/20 transition-colors flex items-center justify-center">
                  <CalendarCheck className="w-5 h-5 text-[#f4e059]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Check Bookings</p>
                  <p className="text-[11px] text-[#888888] mt-0.5">
                    {pendingBookings.length > 0 ? `${pendingBookings.length} pending requests` : 'No pending requests'}
                  </p>
                </div>
              </div>
            </Link>
            <Link to="/dashboard/messages">
              <div className="rounded-xl bg-white/[0.03] border border-white/[0.05] hover:border-[#f4e059]/30 hover:bg-[#f4e059]/[0.03] p-4 flex items-center gap-3 transition-all cursor-pointer group">
                <div className="w-10 h-10 rounded-lg bg-[#f4e059]/10 group-hover:bg-[#f4e059]/20 transition-colors flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-[#f4e059]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Messages</p>
                  <p className="text-[11px] text-[#888888] mt-0.5">Chat with clients</p>
                </div>
              </div>
            </Link>
            <Link to="/dashboard/analytics">
              <div className="rounded-xl bg-white/[0.03] border border-white/[0.05] hover:border-[#f4e059]/30 hover:bg-[#f4e059]/[0.03] p-4 flex items-center gap-3 transition-all cursor-pointer group">
                <div className="w-10 h-10 rounded-lg bg-[#f4e059]/10 group-hover:bg-[#f4e059]/20 transition-colors flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-[#f4e059]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">View Analytics</p>
                  <p className="text-[11px] text-[#888888] mt-0.5">Track performance</p>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─────────── Fan Dashboard (non-DJ) ─────────── */
function FanDashboard({ user }: { user: any }) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="max-w-2xl mx-auto mt-8"
    >
      <div className="rounded-2xl bg-[#101010] border border-white/5 p-8 md:p-12 relative overflow-hidden text-center">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#f4e059]/60 to-transparent" />
        <motion.div variants={itemVariants} className="w-20 h-20 bg-[#f4e059]/10 rounded-full flex items-center justify-center mx-auto mb-6 relative">
          <div className="absolute inset-0 bg-[#f4e059] opacity-20 blur-xl rounded-full"></div>
          <User className="w-10 h-10 text-[#f4e059] relative z-10" />
        </motion.div>
        <motion.h1 variants={itemVariants} className="text-3xl font-display font-bold text-white uppercase tracking-wide mb-4">
          Welcome, {user?.name || user?.email?.split('@')[0]}
        </motion.h1>
        <motion.p variants={itemVariants} className="text-[#888888] mb-8 max-w-md mx-auto">
          You are signed in as a fan / event organizer. Browse DJs, book talent, and explore mixes.
        </motion.p>
        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/discover"
            className="inline-flex items-center justify-center h-12 px-8 bg-[#f4e059] text-black font-semibold text-sm uppercase tracking-wide rounded-full hover:scale-[1.02] transition-transform"
          >
            Discover DJs
          </Link>
          <Link
            to="/booking"
            className="inline-flex items-center justify-center h-12 px-8 border border-white/10 text-white font-semibold text-sm uppercase tracking-wide rounded-full hover:bg-white/5 transition-colors"
          >
            Book a DJ
          </Link>
        </motion.div>
      </div>
    </motion.div>
  );
}

/* ─────────── Components ─────────── */
function KpiCard({
  icon: Icon,
  label,
  value,
  change,
  trend,
  color = '#f4e059',
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'neutral';
  color?: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      className="group"
    >
      <div className="rounded-2xl bg-[#101010] border border-white/5 hover:border-[#f4e059]/20 hover:bg-[#f4e059]/[0.02] transition-all duration-300 p-5 relative overflow-hidden h-full">
        <div 
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" 
          style={{ background: `linear-gradient(135deg, ${color}08 0%, transparent 100%)` }}
        />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}1A` }}>
              <Icon className="w-5 h-5" style={{ color }} />
            </div>
            {trend !== 'neutral' && (
              <div className={cn('flex items-center gap-0.5 font-bold', trend === 'up' ? 'text-[#22C55E]' : 'text-[#EF4444]')}>
                {trend === 'up' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                <span className="text-xs">{change}</span>
              </div>
            )}
          </div>
          <p className="font-mono text-2xl font-bold text-white mt-3">{value}</p>
          <p className="text-[10px] uppercase tracking-wider text-[#888888] font-semibold mt-1">{label}</p>
          <p className="text-[10px] text-[#666666] mt-2">vs last period</p>
        </div>
      </div>
    </motion.div>
  );
}

function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(' ');
}
