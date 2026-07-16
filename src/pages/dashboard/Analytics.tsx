import { useState, useEffect, useMemo } from 'react';
import {
  BarChart3,
  Loader2,
  TrendingUp,
  Headphones,
  Calendar,
  Star,
  Users,
  Music2,
  DollarSign,
  Eye,
  Crown,
  BarChart,
  LineChart,
  Activity,
  ChevronRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FeatureLock } from '@/components/FeatureLock';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import {
  BarChart as ReBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart as ReLineChart,
  Line,
  AreaChart,
  Area,
  Legend,
} from 'recharts';

/* ─────────────────── Constants ─────────────────── */

const COLORS = ['#D4A24A', '#22C55E', '#3B82F6', '#8B5CF6', '#EF4444', '#F97316', '#06B6D4', '#EC4899'];
const GOLD = '#D4A24A';
const GREEN = '#22C55E';

/* ─────────────────── Types ─────────────────── */

interface StatsData {
  mixesThisMonth: number;
  bookingsThisMonth: number;
  newStreams: number;
  newStreamsThisWeek: number;
  profileViews: number | null;
  monthlyListeners: number;
  mixLikesThisMonth: number;
  topGenre: string;
  engagementRate: number;
  rankingPosition: number;
  rankingScore: number;
  monthlyActivity: Array<{ month: string; plays: number; bookings: number }>;
  genreBreakdown: Array<{ name: string; value: number }>;
}

interface DashboardData {
  overview: {
    totalMixes: number;
    totalStreams: number;
    totalBookings: number;
    totalReviews: number;
    totalEvents: number;
    averageRating: number;
    rankingPosition: number;
    rankingScore: number;
    totalFollowers: number;
    monthlyListeners: number;
    liveScores: any;
  };
  recentBookings: any[];
  topMixes: any[];
  recentReviews: any[];
  rankingHistory: any[];
  recentEvents: any[];
  battleEntries: any[];
  payments: any[];
  bookingStatusCounts: any[];
}

/* ─────────────────── Helpers ─────────────────── */

function formatNumber(n: number | null | undefined): string {
  if (n == null) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

const tooltipStyle = {
  backgroundColor: '#111111',
  border: '1px solid #2A2A2A',
  borderRadius: '8px',
  padding: '10px 14px',
  fontSize: '12px',
  color: '#F5F5F5',
};

/* ─────────────────── KPI Card ─────────────────── */

function KPICard({
  icon: Icon,
  label,
  value,
  subtext,
  trend,
  color = 'gold',
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  subtext?: string;
  trend?: React.ReactNode;
  color?: 'gold' | 'green' | 'blue' | 'purple' | 'red';
}) {
  const colorMap = {
    gold: 'text-gold bg-gold/10',
    green: 'text-green bg-green/10',
    blue: 'text-blue-400 bg-blue-400/10',
    purple: 'text-purple-400 bg-purple-400/10',
    red: 'text-red-400 bg-red-400/10',
  };

  return (
    <Card className="bg-black-surface border-dark-gray hover:border-gold/20 transition-colors">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colorMap[color]}`}>
              <Icon className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs text-text-muted uppercase tracking-wider font-medium">{label}</p>
              <p className="text-2xl font-bold text-text-primary font-display mt-1">{value}</p>
              {subtext && <p className="text-xs text-text-muted mt-1">{subtext}</p>}
              {trend && <div className="mt-2">{trend}</div>}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─────────────────── Tab Button ─────────────────── */

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded-full transition-all ${
        active
          ? 'bg-gold-gradient text-black'
          : 'text-text-muted hover:text-text-primary hover:bg-white/5'
      }`}
    >
      {children}
    </button>
  );
}

/* ─────────────────── Main Component ─────────────────── */

export default function Analytics() {
  const { user } = useAuthStore();
  const { isFree } = useFeatureAccess();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'streams' | 'bookings' | 'audience'>('overview');
  const isDj = user?.role === 'DJ';

  useEffect(() => {
    if (!isDj) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const [statsRes, dashboardRes] = await Promise.all([
          api.get('/dashboard/stats'),
          api.get('/dashboard'),
        ]);
        if (statsRes.data.success) setStats(statsRes.data.data);
        if (dashboardRes.data.success) setDashboard(dashboardRes.data.data);
      } catch (err) {
        console.error('Failed to load analytics', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isDj]);

  /* ── Derived Data ── */
  const monthlyData = useMemo(() => stats?.monthlyActivity || [], [stats]);
  const genreData = useMemo(() => stats?.genreBreakdown || [], [stats]);
  const rankingHistory = useMemo(() => dashboard?.rankingHistory || [], [dashboard]);
  const topMixes = useMemo(() => dashboard?.topMixes || [], [dashboard]);
  const bookingStatus = useMemo(() => dashboard?.bookingStatusCounts || [], [dashboard]);
  const overview = dashboard?.overview;

  const totalStreams = overview?.totalStreams || 0;
  const totalMixes = overview?.totalMixes || 0;
  const avgStreamsPerMix = totalMixes > 0 ? Math.round(totalStreams / totalMixes) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-10 h-10 text-gold animate-spin" />
      </div>
    );
  }

  if (!isDj) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center">
        <BarChart3 className="w-16 h-16 text-text-muted mb-4" />
        <h2 className="text-xl font-bold text-text-primary mb-2">Analytics for DJs Only</h2>
        <p className="text-sm text-text-muted max-w-md">
          Upgrade to a DJ profile to access detailed analytics about your mixes, streams, and audience.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-text-primary uppercase tracking-wide">
            Analytics
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Track your performance, audience growth, and engagement metrics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')}>
            Overview
          </TabButton>
          <TabButton active={activeTab === 'streams'} onClick={() => setActiveTab('streams')}>
            Streams
          </TabButton>
          <TabButton active={activeTab === 'bookings'} onClick={() => setActiveTab('bookings')}>
            Bookings
          </TabButton>
          <TabButton active={activeTab === 'audience'} onClick={() => setActiveTab('audience')}>
            Audience
          </TabButton>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          icon={Headphones}
          label="Total Streams"
          value={formatNumber(overview?.totalStreams)}
          subtext={`${formatNumber(stats?.newStreamsThisWeek)} this week`}
          color="gold"
        />
        <KPICard
          icon={Music2}
          label="Total Mixes"
          value={formatNumber(overview?.totalMixes)}
          subtext={`${avgStreamsPerMix} avg streams/mix`}
          color="blue"
        />
        <KPICard
          icon={Calendar}
          label="Bookings"
          value={formatNumber(overview?.totalBookings)}
          subtext={`${stats?.bookingsThisMonth || 0} this month`}
          color="green"
        />
        <KPICard
          icon={Users}
          label="Followers"
          value={formatNumber(overview?.totalFollowers)}
          subtext={`Rank #${overview?.rankingPosition || '--'}`}
          color="purple"
        />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          icon={Star}
          label="Avg Rating"
          value={(overview?.averageRating || 0).toFixed(1)}
          subtext={`${overview?.totalReviews || 0} reviews`}
          color="gold"
        />
        <KPICard
          icon={Eye}
          label="Monthly Listeners"
          value={formatNumber(overview?.monthlyListeners)}
          subtext="Unique listeners / 28 days"
          color="blue"
        />
        <KPICard
          icon={Crown}
          label="Ranking Score"
          value={formatNumber(overview?.rankingScore)}
          subtext={`Top Genre: ${stats?.topGenre || 'N/A'}`}
          color="purple"
        />
        <KPICard
          icon={Activity}
          label="Engagement Rate"
          value={`${stats?.engagementRate || 0}%`}
          subtext={`${formatNumber(stats?.mixLikesThisMonth)} likes this month`}
          color="green"
        />
      </div>

      <FeatureLock isLocked={isFree} tier="pro" message="Advanced analytics and charts">
        {/* ── OVERVIEW TAB ── */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Monthly Activity Chart */}
            <Card className="bg-black-surface border-dark-gray">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-semibold text-text-primary flex items-center gap-2">
                  <LineChart className="w-4 h-4 text-gold" />
                  Monthly Activity
                </CardTitle>
                <span className="text-xs text-text-muted">Last 6 months</span>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyData}>
                      <defs>
                        <linearGradient id="playsGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={GOLD} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={GOLD} stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="bookingsGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={GREEN} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={GREEN} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
                      <XAxis dataKey="month" stroke="#666" fontSize={12} />
                      <YAxis stroke="#666" fontSize={12} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend
                        wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                        formatter={(value: string) => (
                          <span className="text-text-secondary capitalize">{value}</span>
                        )}
                      />
                      <Area
                        type="monotone"
                        dataKey="plays"
                        stroke={GOLD}
                        fill="url(#playsGradient)"
                        strokeWidth={2}
                        name="Streams"
                      />
                      <Area
                        type="monotone"
                        dataKey="bookings"
                        stroke={GREEN}
                        fill="url(#bookingsGradient)"
                        strokeWidth={2}
                        name="Bookings"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Genre Breakdown */}
              <Card className="bg-black-surface border-dark-gray">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-semibold text-text-primary flex items-center gap-2">
                    <BarChart className="w-4 h-4 text-gold" />
                    Genre Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={genreData}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={85}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {genreData.map((_entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    {genreData.map((entry: any, index: number) => (
                      <div key={entry.name} className="flex items-center gap-2">
                        <div
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="text-xs text-text-secondary truncate">{entry.name}</span>
                        <span className="text-xs text-text-muted ml-auto">{entry.value}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Ranking History */}
              <Card className="bg-black-surface border-dark-gray">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-semibold text-text-primary flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-gold" />
                    Ranking History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <ReLineChart data={rankingHistory}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
                        <XAxis
                          dataKey="week"
                          stroke="#666"
                          fontSize={11}
                          tickFormatter={(value: string) => {
                            const d = new Date(value);
                            return `${d.getMonth() + 1}/${d.getDate()}`;
                          }}
                        />
                        <YAxis stroke="#666" fontSize={12} reversed />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Line
                          type="monotone"
                          dataKey="position"
                          stroke={GOLD}
                          strokeWidth={2}
                          dot={{ fill: GOLD, strokeWidth: 0, r: 3 }}
                          activeDot={{ r: 5, fill: GOLD }}
                          name="Position"
                        />
                      </ReLineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Top Performing Mixes */}
            <Card className="bg-black-surface border-dark-gray">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-semibold text-text-primary flex items-center gap-2">
                  <Music2 className="w-4 h-4 text-gold" />
                  Top Performing Mixes
                </CardTitle>
                <Link to="/dashboard/mixes">
                  <Button variant="ghost" size="sm" className="text-gold hover:bg-gold/10">
                    View All <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                {topMixes.length > 0 ? (
                  <div className="space-y-2">
                    {topMixes.slice(0, 5).map((mix: any, index: number) => (
                      <div
                        key={mix.id}
                        className="flex items-center gap-4 p-3 rounded-xl bg-black-elevated border border-dark-gray hover:border-gold/20 transition-colors"
                      >
                        <div className="w-8 h-8 rounded-lg bg-gold/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-bold text-gold">{index + 1}</span>
                        </div>
                        <img
                          src={mix.coverImage || '/mix-placeholder.jpg'}
                          alt={mix.title}
                          className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-text-primary truncate">{mix.title}</p>
                          <p className="text-xs text-text-muted">{mix.genre}</p>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-text-muted">
                          <span className="flex items-center gap-1">
                            <Headphones className="w-3 h-3 text-gold" />
                            {formatNumber(mix.plays)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Star className="w-3 h-3 text-gold" />
                            {formatNumber(mix.likes)}
                          </span>
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3 text-gold" />
                            {formatNumber(mix.downloads || 0)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <BarChart3 className="w-12 h-12 text-text-muted mx-auto mb-3" />
                    <p className="text-text-secondary mb-2">No mix data yet</p>
                    <p className="text-sm text-text-muted">
                      Upload your first mix to see performance analytics
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── STREAMS TAB ── */}
        {activeTab === 'streams' && (
          <div className="space-y-6">
            <Card className="bg-black-surface border-dark-gray">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-text-primary">Stream Growth</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <ReBarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
                      <XAxis dataKey="month" stroke="#666" fontSize={12} />
                      <YAxis stroke="#666" fontSize={12} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend wrapperStyle={{ fontSize: '12px' }} />
                      <Bar dataKey="plays" fill={GOLD} radius={[4, 4, 0, 0]} name="Streams" />
                    </ReBarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-black-surface border-dark-gray">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-text-primary">Mix Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  {topMixes.length > 0 ? (
                    <div className="space-y-3">
                      {topMixes.map((mix: any) => (
                        <div key={mix.id} className="flex items-center gap-3">
                          <img
                            src={mix.coverImage || '/mix-placeholder.jpg'}
                            alt={mix.title}
                            className="w-10 h-10 rounded-lg object-cover"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-text-primary truncate">{mix.title}</p>
                            <div className="w-full bg-black-elevated rounded-full h-1.5 mt-1">
                              <div
                                className="bg-gold rounded-full h-1.5 transition-all"
                                style={{
                                  width: `${Math.min(100, ((mix.plays || 0) / (topMixes[0]?.plays || 1)) * 100)}%`,
                                }}
                              />
                            </div>
                          </div>
                          <span className="text-xs text-text-muted">{formatNumber(mix.plays)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-text-muted text-center py-8">No mix data available</p>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-black-surface border-dark-gray">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-text-primary">Stream Sources</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={genreData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {genreData.map((_entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* ── BOOKINGS TAB ── */}
        {activeTab === 'bookings' && (
          <div className="space-y-6">
            <Card className="bg-black-surface border-dark-gray">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-text-primary">Booking Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <ReBarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
                      <XAxis dataKey="month" stroke="#666" fontSize={12} />
                      <YAxis stroke="#666" fontSize={12} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="bookings" fill={GREEN} radius={[4, 4, 0, 0]} name="Bookings" />
                    </ReBarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-black-surface border-dark-gray">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-text-primary">Booking Status</CardTitle>
                </CardHeader>
                <CardContent>
                  {bookingStatus.length > 0 ? (
                    <div className="space-y-3">
                      {bookingStatus.map((status: any) => (
                        <div key={status.status} className="flex items-center gap-3">
                          <div className="flex-1">
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-text-primary">{status.status}</span>
                              <span className="text-text-muted">{status._count.status}</span>
                            </div>
                            <div className="w-full bg-black-elevated rounded-full h-2">
                              <div
                                className="bg-gold rounded-full h-2 transition-all"
                                style={{
                                  width: `${Math.min(100, (status._count.status / (overview?.totalBookings || 1)) * 100)}%`,
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-text-muted text-center py-8">No booking data</p>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-black-surface border-dark-gray">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-text-primary">Recent Bookings</CardTitle>
                </CardHeader>
                <CardContent>
                  {dashboard?.recentBookings && dashboard.recentBookings.length > 0 ? (
                    <div className="space-y-2">
                      {dashboard.recentBookings.slice(0, 5).map((booking: any) => (
                        <div
                          key={booking.id}
                          className="flex items-center justify-between p-3 rounded-xl bg-black-elevated border border-dark-gray"
                        >
                          <div>
                            <p className="text-sm text-text-primary">{booking.eventType}</p>
                            <p className="text-xs text-text-muted">
                              {new Date(booking.eventDate).toLocaleDateString()}
                            </p>
                          </div>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              booking.status === 'CONFIRMED'
                                ? 'bg-green/10 text-green'
                                : booking.status === 'PENDING'
                                ? 'bg-gold/10 text-gold'
                                : 'bg-text-muted/10 text-text-muted'
                            }`}
                          >
                            {booking.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-text-muted text-center py-8">No recent bookings</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* ── AUDIENCE TAB ── */}
        {activeTab === 'audience' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="bg-black-surface border-dark-gray lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-text-primary">Audience Growth</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={monthlyData}>
                        <defs>
                          <linearGradient id="audienceGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
                        <XAxis dataKey="month" stroke="#666" fontSize={12} />
                        <YAxis stroke="#666" fontSize={12} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Area
                          type="monotone"
                          dataKey="plays"
                          stroke="#8B5CF6"
                          fill="url(#audienceGradient)"
                          strokeWidth={2}
                          name="Listeners"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-black-surface border-dark-gray">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-text-primary">Top Genres</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={genreData}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={70}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {genreData.map((_entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2 mt-4">
                    {genreData.slice(0, 4).map((entry: any, index: number) => (
                      <div key={entry.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <span className="text-xs text-text-secondary">{entry.name}</span>
                        </div>
                        <span className="text-xs text-text-muted">{entry.value}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-black-surface border-dark-gray">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-text-primary">Recent Reviews</CardTitle>
              </CardHeader>
              <CardContent>
                {dashboard?.recentReviews && dashboard.recentReviews.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {dashboard.recentReviews.slice(0, 6).map((review: any) => (
                      <div
                        key={review.id}
                        className="p-4 rounded-xl bg-black-elevated border border-dark-gray"
                      >
                        <div className="flex items-center gap-1 mb-2">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3 h-3 ${
                                i < review.rating ? 'text-gold fill-gold' : 'text-text-muted'
                              }`}
                            />
                          ))}
                        </div>
                        <p className="text-sm text-text-secondary line-clamp-2">{review.comment}</p>
                        <p className="text-xs text-text-muted mt-2">
                          {new Date(review.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-text-muted text-center py-8">No reviews yet</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </FeatureLock>
    </div>
  );
}
