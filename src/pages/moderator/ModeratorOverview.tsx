import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  CheckCircle2,
  Music,
  AlertTriangle,
  ListMusic,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

import api, { getMediaUrl } from '@/lib/api';
import { DashboardSkeleton } from '@/components/ui/page-skeletons';
import { useDelayedLoading } from '@/hooks/use-delayed-loading';
import { Button } from '@/components/ui/button';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { getAvatarImageUrl } from '@/lib/utils';


export function ModeratorOverview() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const showSkeleton = useDelayedLoading(loading);

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
    return showSkeleton ? <DashboardSkeleton /> : null;
  }

  const statCards = [
    { label: 'Total DJs', value: stats?.totalDjs || 0, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'Verified DJs', value: stats?.verifiedDjs || 0, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'Total Mixes', value: stats?.totalMixes || 0, icon: Music, color: 'text-[#f4e059]', bg: 'bg-[#f4e059]/10' },
    { label: 'Awaiting Review', value: stats?.awaitingReview || 0, icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    { label: 'Reported Mixes', value: stats?.reportedMixes || 0, icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10' },
    { label: 'Reported Users', value: stats?.reportedUsers || 0, icon: AlertTriangle, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { label: 'Official Playlists', value: stats?.officialPlaylistsCount || 0, icon: ListMusic, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl overflow-hidden relative bg-[#101010] border border-white/5 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#f4e059]/50 to-transparent"></div>
        <div>
          <span className="text-[#f4e059] text-[10px] uppercase font-bold tracking-widest mb-2 block">
            MODERATOR OVERVIEW
          </span>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl font-bold text-white">Content & Community Dashboard</h2>
          </div>
          <p className="text-sm text-text-muted">
            Manage published mixes, curate official playlists, review DJ rankings, and resolve community reports.
          </p>
        </div>
        <Link to="/moderator/playlists">
          <Button size="sm" className="bg-[#f4e059] text-black hover:bg-[#f4e059]/90 font-bold px-5 py-2 h-auto rounded-lg gap-2 hidden sm:flex transition-colors">
            <Sparkles className="w-4 h-4" />
            Create Playlist
          </Button>
        </Link>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="rounded-2xl p-5 border border-white/5 bg-[#101010] hover:border-white/20 transition-all flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] uppercase tracking-wider text-text-muted font-semibold">{stat.label}</p>
                <div className={`w-9 h-9 rounded-xl ${stat.bg} flex items-center justify-center`}>
                  <Icon className={`w-4 h-4 ${stat.color}`} />
                </div>
              </div>
              <p className="font-mono text-2xl font-bold text-text-primary mt-auto">{stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* Two Column Layout: Top Ranked DJs & Recent Uploads */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top-Ranked DJs */}
        <div className="rounded-2xl bg-[#101010] border border-white/5 p-5">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/[0.04]">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider pl-3 border-l-2 border-[#f4e059]">Top-Ranked DJs</h3>
            </div>
            <Link to="/moderator/rankings" className="text-xs text-text-muted hover:text-[#f4e059] transition-colors flex items-center gap-1">
              Manage Rankings <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-3">
            {stats?.topRankedDjs?.length === 0 ? (
              <p className="text-xs text-text-muted py-4 text-center">No ranked DJs available</p>
            ) : (
              stats?.topRankedDjs?.map((dj: any, index: number) => (
                <div key={dj.id} className="flex items-center justify-between rounded-xl bg-white/[0.03] border border-white/[0.05] p-3 hover:bg-white/[0.05] transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-[#f4e059] w-5 text-center">#{index + 1}</span>
                    <img
                      src={getAvatarImageUrl(dj.avatar)}
                      alt={dj.stageName}
                      className="w-10 h-10 rounded-full object-cover border border-white/10"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-semibold text-white">{dj.stageName}</p>
                        <VerifiedBadge dj={dj} size={14} />
                      </div>
                      <p className="text-[11px] text-text-muted">Rank Position #{dj.rankingPosition || index + 1}</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-[#f4e059] bg-[#f4e059]/10 px-2.5 py-1 rounded-lg border border-[#f4e059]/20 font-mono">
                    {Math.round(dj.rankingScore || 0)} pts
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Uploads */}
        <div className="rounded-2xl bg-[#101010] border border-white/5 p-5">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/[0.04]">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider pl-3 border-l-2 border-[#f4e059]">Recent Uploads</h3>
            </div>
            <Link to="/moderator/mixes" className="text-xs text-text-muted hover:text-[#f4e059] transition-colors flex items-center gap-1">
              View All Mixes <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-3">
            {stats?.recentUploads?.length === 0 ? (
              <p className="text-xs text-text-muted py-4 text-center">No recent uploads</p>
            ) : (
              stats?.recentUploads?.map((mix: any) => (
                <div key={mix.id} className="flex items-center justify-between rounded-xl bg-white/[0.03] border border-white/[0.05] p-3 hover:bg-white/[0.05] transition-colors">
                  <div className="flex items-center gap-3">
                    <img
                      src={getMediaUrl(mix.coverImage) || '/placeholder-mix.jpg'}
                      alt={mix.title}
                      className="w-12 h-12 rounded-lg object-cover border border-white/10"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate max-w-[180px] sm:max-w-[240px]">
                        {mix.title}
                      </p>
                      <p className="text-[11px] text-text-muted truncate mt-0.5">
                        by <span className="text-text-primary font-medium">{mix.dj?.stageName || 'DJ'}</span> • <span className="text-[#f4e059]">{mix.genre}</span>
                      </p>
                    </div>
                  </div>
                  <Link to="/moderator/mixes">
                    <Button size="sm" variant="ghost" className="text-xs font-semibold h-8 text-[#f4e059] hover:text-white bg-[#f4e059]/5 hover:bg-[#f4e059]/20 transition-colors">
                      Review
                    </Button>
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ModeratorOverview;
