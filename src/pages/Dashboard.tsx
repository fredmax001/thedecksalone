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
  Play,
  CalendarCheck,
  Star,
  Trophy,
  Music,
  Loader2,
  ArrowUpRight,
  User,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/api';
import FadeIn from '@/components/FadeIn';

interface DashboardData {
  overview: {
    totalMixes: number;
    totalStreams: number;
    totalBookings: number;
    totalReviews: number;
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
  backgroundColor: '#111111',
  border: '1px solid #2A2A2A',
  borderRadius: '8px',
  padding: '8px 12px',
  fontSize: '12px',
  color: '#F5F5F5',
};

export default function Dashboard() {
  const { user } = useAuthStore();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isDj = user?.role === 'DJ';
  const djProfile = user?.djProfile;
  const setAuth = useAuthStore((state) => state.setAuth);
  const [newUsername, setNewUsername] = useState(user?.username || '');
  const [usernameStatus, setUsernameStatus] = useState<{ message: string; type: 'success' | 'error' | '' }>({ message: '', type: '' });
  const [updatingUsername, setUpdatingUsername] = useState(false);

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
      <div className="min-h-screen pt-32 flex items-center justify-center bg-black">
        <Loader2 className="w-10 h-10 text-gold animate-spin" />
      </div>
    );
  }

  // User dashboard (non-DJ)
  if (!isDj) {
    return (
      <div className="min-h-screen bg-black pt-32 pb-20">
        <div className="container-main">
          <FadeIn>
            <div className="max-w-2xl mx-auto text-center">
              <div className="w-20 h-20 bg-gold/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <User className="w-10 h-10 text-gold" />
              </div>
              <h1 className="text-3xl font-display font-bold text-text-primary uppercase mb-4">
                Welcome, {user?.email.split('@')[0]}
              </h1>
              <p className="text-text-secondary mb-8">
                You are signed in as a fan / event organizer. Browse DJs, book talent, and explore mixes.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  to="/discover"
                  className="inline-flex items-center justify-center h-12 px-8 bg-gold-gradient text-black font-semibold text-sm uppercase tracking-wide rounded-full hover:scale-[1.02] transition-transform"
                >
                  Discover DJs
                </Link>
                <Link
                  to="/booking"
                  className="inline-flex items-center justify-center h-12 px-8 border border-dark-gray text-text-primary font-semibold text-sm uppercase tracking-wide rounded-full hover:bg-medium-gray transition-colors"
                >
                  Book a DJ
                </Link>
              </div>
            </div>
          </FadeIn>
        </div>
      </div>
    );
  }

  // DJ dashboard
  const overview = data?.overview;
  const rankingChartData =
    data?.rankingHistory.map((h, i) => ({
      label: `W${i + 1}`,
      position: h.position,
      score: Math.round(h.score),
    })) || [];

  return (
    <div className="min-h-screen bg-black pt-28 pb-20">
      <div className="container-main">
        <FadeIn>
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-10">
            <div>
              <h1 className="text-3xl font-display font-bold text-text-primary uppercase">
                {djProfile?.stageName || 'DJ'} Dashboard
              </h1>
              <p className="text-text-secondary mt-1">
                Track your performance, bookings, and rankings.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                to="/mixes"
                className="inline-flex items-center gap-2 h-11 px-5 bg-gold-gradient text-black text-sm font-semibold uppercase tracking-wide rounded-full hover:scale-[1.02] transition-transform"
              >
                <Music className="w-4 h-4" />
                Upload Mix
              </Link>
            </div>
          </div>

          {error && (
            <div className="mb-8 p-4 rounded-lg bg-red/10 border border-red/30 text-red text-sm">
              {error}
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
            <StatCard
              icon={Play}
              label="Total Streams"
              value={overview?.totalStreams?.toLocaleString() || '0'}
            />
            <StatCard
              icon={Music}
              label="Mixes"
              value={overview?.totalMixes?.toLocaleString() || '0'}
            />
            <StatCard
              icon={CalendarCheck}
              label="Bookings"
              value={overview?.totalBookings?.toLocaleString() || '0'}
            />
            <StatCard
              icon={Star}
              label="Rating"
              value={overview?.averageRating?.toFixed(1) || '0.0'}
            />
          </div>

          {/* Rank & Score */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
            <div className="lg:col-span-2 bg-black-surface border border-dark-gray rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-text-primary">Ranking History</h2>
                <span className="text-sm text-gold">
                  #{overview?.rankingPosition || '-'} · {overview?.rankingScore?.toFixed(1) || '0'} pts
                </span>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={rankingChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
                    <XAxis dataKey="label" stroke="#666" fontSize={12} />
                    <YAxis reversed stroke="#666" fontSize={12} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Line
                      type="monotone"
                      dataKey="position"
                      stroke="#D4A24A"
                      strokeWidth={2}
                      dot={{ r: 3, fill: '#D4A24A' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-black-surface border border-dark-gray rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-text-primary mb-4">Rank Snapshot</h2>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-full bg-gold/10 flex items-center justify-center">
                  <Trophy className="w-8 h-8 text-gold" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-text-primary">
                    #{overview?.rankingPosition || '-'}
                  </p>
                  <p className="text-sm text-text-secondary">Current rank</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">Score</span>
                  <span className="text-text-primary font-medium">
                    {overview?.rankingScore?.toFixed(1) || '0.0'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">Reviews</span>
                  <span className="text-text-primary font-medium">
                    {overview?.totalReviews || 0}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Bookings & Top Mixes */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-black-surface border border-dark-gray rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-text-primary mb-4">Recent Bookings</h2>
              {data?.recentBookings?.length ? (
                <div className="space-y-3">
                  {data.recentBookings.slice(0, 5).map((b) => (
                    <div
                      key={b.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-black-elevated"
                    >
                      <div>
                        <p className="text-sm font-medium text-text-primary capitalize">
                          {b.eventType}
                        </p>
                        <p className="text-xs text-text-secondary">
                          {new Date(b.eventDate).toLocaleDateString()} · {b.eventLocation}
                        </p>
                      </div>
                      <span
                        className={`text-xs font-medium px-2 py-1 rounded-full ${
                          b.status === 'CONFIRMED'
                            ? 'bg-green/10 text-green'
                            : b.status === 'PENDING'
                            ? 'bg-yellow-500/10 text-yellow-500'
                            : 'bg-red/10 text-red'
                        }`}
                      >
                        {b.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-text-secondary text-sm">No bookings yet.</p>
              )}
            </div>

            <div className="bg-black-surface border border-dark-gray rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-text-primary mb-4">Top Mixes</h2>
              {data?.topMixes?.length ? (
                <div className="space-y-3">
                  {data.topMixes.slice(0, 5).map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-black-elevated"
                    >
                      <div>
                        <p className="text-sm font-medium text-text-primary">{m.title}</p>
                        <p className="text-xs text-text-secondary capitalize">{m.genre}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-text-primary">{m.plays.toLocaleString()}</p>
                        <p className="text-xs text-text-secondary">plays</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-text-secondary text-sm">No mixes uploaded yet.</p>
              )}
            </div>
          </div>
        </FadeIn>
      </div>

      {/* Username Settings */}
      <FadeIn>
        <div className="mt-10 bg-black-surface border border-dark-gray rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Profile URL</h2>
          <p className="text-sm text-text-secondary mb-4">
            Your public profile is at:{' '}
            <span className="text-gold">thedeckslone.com/dj/{user?.username || '...'}</span>
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value.toLowerCase())}
              placeholder="username"
              className="flex-1 bg-black border border-dark-gray rounded-lg px-4 py-2.5 text-sm text-text-primary focus:border-gold focus:outline-none"
            />
            <button
              onClick={async () => {
                setUpdatingUsername(true);
                setUsernameStatus({ message: '', type: '' });
                try {
                  const res = await api.put('/auth/me', { username: newUsername });
                  if (res.data.success) {
                    setAuth(res.data.data, localStorage.getItem('soundit_token') || '');
                    setUsernameStatus({ message: 'Username updated', type: 'success' });
                  }
                } catch (err: any) {
                  setUsernameStatus({ message: err.response?.data?.error || 'Update failed', type: 'error' });
                }
                setUpdatingUsername(false);
              }}
              disabled={updatingUsername || !newUsername || newUsername === user?.username}
              className="px-5 py-2.5 bg-gold text-black text-sm font-semibold rounded-lg hover:bg-gold/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {updatingUsername ? 'Saving...' : 'Update Username'}
            </button>
          </div>
          {usernameStatus.message && (
            <p className={`mt-3 text-sm ${usernameStatus.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
              {usernameStatus.message}
            </p>
          )}
        </div>
      </FadeIn>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="bg-black-surface border border-dark-gray rounded-2xl p-5"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center">
          <Icon className="w-5 h-5 text-gold" />
        </div>
        <ArrowUpRight className="w-4 h-4 text-text-muted" />
      </div>
      <p className="text-2xl font-bold text-text-primary">{value}</p>
      <p className="text-sm text-text-secondary mt-1">{label}</p>
    </motion.div>
  );
}
