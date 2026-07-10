import { useState, useEffect } from 'react';
import {
  BarChart3,
  Loader2,
  TrendingUp,
  Headphones,
  Calendar,
  Star,
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
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const COLORS = ['#D4A24A', '#22C55E', '#3B82F6', '#8B5CF6', '#EF4444', '#F97316'];

export default function Analytics() {
  const { user } = useAuthStore();
  const { isFree } = useFeatureAccess();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const isDj = user?.role === 'DJ';

  useEffect(() => {
    if (!isDj) {
      setLoading(false);
      return;
    }

    const fetchStats = async () => {
      try {
        const res = await api.get('/dashboard/stats');
        if (res.data.success) {
          setStats(res.data.data);
        }
      } catch (err) {
        console.error('Failed to load analytics', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [isDj]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-10 h-10 text-gold animate-spin" />
      </div>
    );
  }

  const genreData = stats?.genreBreakdown || [];
  const monthlyData = stats?.monthlyActivity || [];

  const tooltipStyle = {
    backgroundColor: '#111111',
    border: '1px solid #2A2A2A',
    borderRadius: '8px',
    padding: '8px 12px',
    fontSize: '12px',
    color: '#F5F5F5',
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-text-primary uppercase tracking-wide">
            Analytics
          </h1>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-black-surface border-dark-gray">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Headphones className="w-4 h-4 text-gold" />
              <span className="text-xs text-text-secondary">Streams This Month</span>
            </div>
            <p className="text-2xl font-bold text-text-primary font-display">
              {stats?.newStreams?.toLocaleString() || '0'}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-black-surface border-dark-gray">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-gold" />
              <span className="text-xs text-text-secondary">Bookings This Month</span>
            </div>
            <p className="text-2xl font-bold text-text-primary font-display">
              {stats?.bookingsThisMonth || '0'}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-black-surface border-dark-gray">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Star className="w-4 h-4 text-gold" />
              <span className="text-xs text-text-secondary">Avg Rating</span>
            </div>
            <p className="text-2xl font-bold text-text-primary font-display">
              {stats?.rankingScore?.toFixed(1) || '0.0'}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-black-surface border-dark-gray">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-green" />
              <span className="text-xs text-text-secondary">Engagement Rate</span>
            </div>
            <p className="text-2xl font-bold text-text-primary font-display">
              {stats?.engagementRate || '0'}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <FeatureLock isLocked={isFree} tier="pro" message="Advanced analytics and charts">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-black-surface border-dark-gray">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-text-primary">Monthly Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
                  <XAxis dataKey="month" stroke="#666" fontSize={12} />
                  <YAxis stroke="#666" fontSize={12} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="plays" fill="#D4A24A" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="bookings" fill="#22C55E" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-black-surface border-dark-gray">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-text-primary">Genre Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={genreData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
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
            <div className="flex flex-wrap gap-3 justify-center mt-2">
              {genreData.map((entry: { name: string; value: number }, index: number) => (
                <div key={entry.name} className="flex items-center gap-1.5">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-xs text-text-secondary">{entry.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Performing Mixes */}
      <Card className="bg-black-surface border-dark-gray">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold text-text-primary">Top Performing Mixes</CardTitle>
          <Link to="/dashboard/mixes">
            <Button variant="ghost" size="sm" className="text-gold hover:bg-gold/10">
              View All <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <BarChart3 className="w-12 h-12 text-text-muted mx-auto mb-3" />
            <p className="text-text-secondary mb-2">Detailed mix analytics coming soon</p>
            <p className="text-sm text-text-muted">
              Per-mix play tracking, listener retention, and geographic data will be available here.
            </p>
          </div>
        </CardContent>
      </Card>
      </FeatureLock>
    </div>
  );
}
