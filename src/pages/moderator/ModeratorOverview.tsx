import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  CheckCircle2,
  Music,
  AlertTriangle,
  ListMusic,
  Trophy,
  ArrowRight,
  Loader2,
  Settings,
  Sparkles,
} from 'lucide-react';
import api, { getMediaUrl } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { VerifiedBadge } from '@/components/VerifiedBadge';

export function ModeratorOverview() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await api.get('/moderator/stats');
      if (res.data.success) {
        setStats(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load moderator stats', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-gold animate-spin" />
      </div>
    );
  }

  const statCards = [
    { label: 'Total DJs', value: stats?.totalDjs || 0, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'Verified DJs', value: stats?.verifiedDjs || 0, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'Total Mixes', value: stats?.totalMixes || 0, icon: Music, color: 'text-gold', bg: 'bg-gold/10' },
    { label: 'Awaiting Review', value: stats?.awaitingReview || 0, icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    { label: 'Reported Mixes', value: stats?.reportedMixes || 0, icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10' },
    { label: 'Reported Users', value: stats?.reportedUsers || 0, icon: AlertTriangle, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { label: 'Official Playlists', value: stats?.officialPlaylistsCount || 0, icon: ListMusic, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex items-center justify-between bg-gradient-to-r from-gold/10 via-black-surface to-black-elevated p-4 sm:p-6 rounded-xl border border-gold/20">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Settings className="w-5 h-5 text-gold animate-spin-slow" />
            <h2 className="text-lg font-bold text-white">Content & Community Dashboard</h2>
          </div>
          <p className="text-xs text-text-secondary">
            Manage published mixes, curate official playlists, review DJ rankings, and resolve community reports.
          </p>
        </div>
        <Link to="/moderator/playlists">
          <Button size="sm" className="bg-gold text-black hover:bg-gold-light font-semibold text-xs gap-1.5 hidden sm:flex">
            <Sparkles className="w-3.5 h-3.5" />
            Create Playlist
          </Button>
        </Link>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <Card key={i} className="bg-black-elevated border-dark-gray p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-text-secondary">{stat.label}</p>
                <p className="text-xl sm:text-2xl font-bold text-white mt-1">{stat.value}</p>
              </div>
              <div className={`p-2.5 rounded-lg ${stat.bg}`}>
                <Icon className={`w-5 h-5 ${stat.color}`} />
              </div>
            </Card>
          );
        })}
      </div>

      {/* Two Column Layout: Top Ranked DJs & Recent Uploads */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top-Ranked DJs */}
        <Card className="bg-black-elevated border-dark-gray p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-dark-gray">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-gold" />
              <h3 className="text-sm font-bold text-white">Top-Ranked DJs</h3>
            </div>
            <Link to="/moderator/rankings" className="text-xs text-gold hover:underline flex items-center gap-1">
              Manage Rankings <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-3">
            {stats?.topRankedDjs?.length === 0 ? (
              <p className="text-xs text-text-muted py-4 text-center">No ranked DJs available</p>
            ) : (
              stats?.topRankedDjs?.map((dj: any, index: number) => (
                <div key={dj.id} className="flex items-center justify-between p-2.5 rounded-lg bg-black-surface border border-dark-gray/50">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-gold w-5 text-center">#{index + 1}</span>
                    <img
                      src={getMediaUrl(dj.avatar) || '/placeholder-dj.jpg'}
                      alt={dj.stageName}
                      className="w-8 h-8 rounded-full object-cover border border-gold/20"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-semibold text-white">{dj.stageName}</p>
                        <VerifiedBadge dj={dj} size={12} />
                      </div>
                      <p className="text-[10px] text-text-muted">Rank Position #{dj.rankingPosition || index + 1}</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-gold bg-gold/10 px-2 py-0.5 rounded border border-gold/20">
                    {Math.round(dj.rankingScore || 0)} pts
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Recent Uploads */}
        <Card className="bg-black-elevated border-dark-gray p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-dark-gray">
            <div className="flex items-center gap-2">
              <Music className="w-4 h-4 text-gold" />
              <h3 className="text-sm font-bold text-white">Recent Uploads</h3>
            </div>
            <Link to="/moderator/mixes" className="text-xs text-gold hover:underline flex items-center gap-1">
              View All Mixes <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-3">
            {stats?.recentUploads?.length === 0 ? (
              <p className="text-xs text-text-muted py-4 text-center">No recent uploads</p>
            ) : (
              stats?.recentUploads?.map((mix: any) => (
                <div key={mix.id} className="flex items-center justify-between p-2.5 rounded-lg bg-black-surface border border-dark-gray/50">
                  <div className="flex items-center gap-3">
                    <img
                      src={getMediaUrl(mix.coverImage) || '/placeholder-mix.jpg'}
                      alt={mix.title}
                      className="w-10 h-10 rounded object-cover border border-dark-gray"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white truncate max-w-[180px] sm:max-w-[240px]">
                        {mix.title}
                      </p>
                      <p className="text-[10px] text-text-secondary truncate">
                        by {mix.dj?.stageName || 'DJ'} • <span className="text-gold">{mix.genre}</span>
                      </p>
                    </div>
                  </div>
                  <Link to="/moderator/mixes">
                    <Button size="sm" variant="ghost" className="text-[10px] h-7 text-gold hover:text-white">
                      Review
                    </Button>
                  </Link>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

export default ModeratorOverview;
