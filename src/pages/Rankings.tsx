import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Play,
  TrendingUp,
  TrendingDown,
  Minus,
  MapPin,
} from 'lucide-react';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import SEOHead from '@/components/SEOHead';
import { useRankings } from '@/hooks/useRankings';
import { usePlayerStore, type MixTrack } from '@/stores/playerStore';
import { getAvatarImageUrl, imageFallback } from '@/lib/utils';
import { getMediaUrl } from '@/lib/api';

/* ─────────────────── Helpers ─────────────────── */

function toTrack(m: any): MixTrack {
  return {
    id: m.id,
    title: m.title,
    dj: m.dj?.stageName || m.dj || 'DJ',
    duration: typeof m.duration === 'number' ? m.duration : parseInt(m.duration) || 0,
    cover: getMediaUrl(m.coverImage || m.cover) || '',
    genre: m.genre || '',
    plays: m.plays || 0,
    audioUrl: getMediaUrl(m.audioUrl) || '',
    djAvatar: m.dj?.avatar,
    djUsername: m.dj?.username,
  };
}

/* ─────────────────── Trend Arrow Component ─────────────────── */

function TrendArrow({ trend }: { trend?: number }) {
  const val = trend ?? 0;
  if (val > 0) {
    return (
      <span className="inline-flex items-center text-emerald-400" title={`Climbed up +${val}`}>
        <TrendingUp className="w-3.5 h-3.5" />
      </span>
    );
  }
  if (val < 0) {
    return (
      <span className="inline-flex items-center text-rose-500" title={`Dropped ${val}`}>
        <TrendingDown className="w-3.5 h-3.5" />
      </span>
    );
  }
  return (
    <span className="inline-flex items-center text-neutral-500" title="Unchanged position">
      <Minus className="w-3.5 h-3.5" />
    </span>
  );
}

/* ─────────────────── Top 3 Podium Card ─────────────────── */

function TopPodiumCard({
  dj,
  rank,
  onPlay,
}: {
  dj: any;
  rank: number;
  onPlay: (dj: any, e: React.MouseEvent) => void;
}) {
  const avatarUrl = getAvatarImageUrl(dj.avatar);
  const location = [dj.community, dj.city].filter(Boolean).join(', ') || 'Sierra Leone';
  const followersCount = dj.totalFollowers || dj._count?.followers || 0;
  const score = dj.rankingScore || 0;
  const progressPercent = Math.min(100, Math.max(10, (score / 10) * 100));

  return (
    <div className="rounded-3xl bg-black border border-white/10 hover:border-gold/40 p-3.5 sm:p-4 flex items-center gap-3.5 sm:gap-4 transition-all duration-300 shadow-md group">
      {/* Left DJ Avatar with #1 / #2 / #3 badge */}
      <div className="relative w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-2xl overflow-hidden shrink-0 bg-neutral-900 border border-white/5">
        <Link to={`/dj/${dj.username || dj.user?.username || dj.id}`} className="block w-full h-full">
          <img
            src={avatarUrl}
            alt={dj.stageName}
            onError={imageFallback}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        </Link>
        {/* Yellow Rank Badge at bottom-left corner of avatar */}
        <div className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded-md bg-gold text-black font-mono font-black text-[10px] sm:text-xs uppercase shadow-md">
          #{rank}
        </div>
      </div>

      {/* Right Details */}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <div className="flex items-center gap-1.5 min-w-0">
          <Link
            to={`/dj/${dj.username || dj.user?.username || dj.id}`}
            className="font-display text-base sm:text-lg font-bold text-white uppercase tracking-tight truncate group-hover:text-gold transition-colors"
          >
            {dj.stageName}
          </Link>
          {dj.verified && <VerifiedBadge dj={dj} size={15} className="shrink-0" />}
        </div>

        {/* Location & followers */}
        <div className="text-[11px] sm:text-xs text-text-muted truncate mt-0.5">
          {location} · {followersCount} followers
        </div>

        {/* Score bar & Trend Line */}
        <div className="flex items-center gap-2 sm:gap-3 mt-2">
          {/* Progress bar line with indicator dot */}
          <div className="flex-1 h-1.5 bg-neutral-800 rounded-full relative overflow-hidden">
            <div
              className="h-full bg-gold rounded-full relative"
              style={{ width: `${progressPercent}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-gold shadow-sm ring-2 ring-black" />
            </div>
          </div>

          {/* Score number */}
          <span className="font-bold text-xs sm:text-sm text-white/90 shrink-0">
            {score.toFixed(1)}
          </span>

          {/* Trend arrow */}
          <div className="shrink-0 flex items-center">
            <TrendArrow trend={dj.trend} />
          </div>

          {/* View Link */}
          <Link
            to={`/dj/${dj.username || dj.user?.username || dj.id}`}
            className="text-[10px] font-bold text-text-muted hover:text-gold uppercase tracking-wider shrink-0"
          >
            VIEW
          </Link>
        </div>

        {/* Action Row */}
        <div className="flex items-center gap-2 mt-2 sm:mt-3">
          <Link
            to={`/dj/${dj.username || dj.user?.username || dj.id}`}
            className="px-3 sm:px-4 py-1.5 rounded-full bg-gold hover:brightness-110 text-black text-xs font-bold uppercase tracking-wider transition-transform hover:scale-102 shrink-0"
          >
            View Profile
          </Link>
          <button
            onClick={(e) => onPlay(dj, e)}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gold hover:brightness-110 flex items-center justify-center text-black shrink-0 transition-transform hover:scale-105 shadow"
            title="Play Top Mix"
          >
            <Play className="w-3.5 h-3.5 fill-black ml-0.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────── Ranked Table Row ─────────────────── */

function RankedRow({
  dj,
  rank,
}: {
  dj: any;
  rank: number;
}) {
  const avatarUrl = getAvatarImageUrl(dj.avatar);
  const location = [dj.community, dj.city].filter(Boolean).join(', ') || 'Freetown';
  const genres = Array.isArray(dj.genres) ? dj.genres : [];
  const score = dj.rankingScore || 0;
  const progressPercent = Math.min(100, Math.max(8, (score / 10) * 100));

  return (
    <div className="rounded-2xl bg-black hover:bg-[#151515] border border-white/10 hover:border-gold/40 p-3 sm:p-4 flex items-center gap-3 sm:gap-4 transition-all duration-300 shadow-md group">
      {/* Rank number */}
      <span className="font-bold text-xs sm:text-sm text-neutral-400 w-6 text-center shrink-0">
        {rank}
      </span>

      {/* Small circular DJ avatar */}
      <Link
        to={`/dj/${dj.username || dj.user?.username || dj.id}`}
        className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden shrink-0 border border-white/10 block bg-neutral-900"
      >
        <img
          src={avatarUrl}
          alt={dj.stageName}
          onError={imageFallback}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
      </Link>

      {/* DJ Name, genres & location */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <Link
            to={`/dj/${dj.username || dj.user?.username || dj.id}`}
            className="font-display text-xs sm:text-sm font-bold text-white uppercase tracking-tight truncate group-hover:text-gold transition-colors"
          >
            {dj.stageName}
          </Link>
          {dj.verified && <VerifiedBadge dj={dj} size={14} className="shrink-0" />}
        </div>

        {/* Genre Tags & Location */}
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          {genres.slice(0, 3).map((g: string) => (
            <span
              key={g}
              className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-md bg-white/[0.06] text-text-secondary border border-white/5"
            >
              {g}
            </span>
          ))}
          <span className="inline-flex items-center gap-0.5 text-[10px] text-text-muted truncate">
            <MapPin className="w-2.5 h-2.5 text-text-muted shrink-0" />
            {location}
          </span>
        </div>
      </div>

      {/* Right Score & Trend Section */}
      <div className="flex items-center gap-3 sm:gap-4 shrink-0">
        {/* Progress bar line */}
        <div className="w-20 sm:w-32 md:w-44 h-1.5 bg-neutral-800 rounded-full relative overflow-hidden hidden xs:block">
          <div
            className="h-full bg-gold rounded-full relative"
            style={{ width: `${progressPercent}%` }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-gold shadow-sm ring-2 ring-black" />
          </div>
        </div>

        {/* Score value */}
        <span className="font-bold text-xs sm:text-sm text-white/90 min-w-[32px] text-right">
          {score.toFixed(1)}
        </span>

        {/* Trend Arrow */}
        <div className="flex items-center">
          <TrendArrow trend={dj.trend} />
        </div>

        {/* View Link */}
        <Link
          to={`/dj/${dj.username || dj.user?.username || dj.id}`}
          className="text-[10px] font-bold text-text-muted hover:text-gold uppercase tracking-wider transition-colors shrink-0"
        >
          VIEW
        </Link>
      </div>
    </div>
  );
}

/* ─────────────────── Main Rankings Page ─────────────────── */

export default function Rankings() {
  const { play, setQueue } = usePlayerStore();
  const { data: djs = [], isLoading } = useRankings({ limit: 50 });

  const top3 = useMemo(() => djs.slice(0, 3), [djs]);
  const remainingDjs = useMemo(() => djs.slice(3), [djs]);

  const handlePlayDj = (dj: any, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (dj.mixes && dj.mixes.length > 0) {
      const topMix = dj.mixes[0];
      const track = toTrack(topMix);
      setQueue([track]);
      play(track);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-bg-page pb-32 text-white">
      <SEOHead
        title="Official DJ Rankings — Deck Salone"
        description="Live verified Sierra Leonean DJ rankings and weekly leaderboard based on performance, stream volume, and live sets."
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 space-y-8 sm:space-y-10">
        {/* ════════ Page Header: Ranking ════════ */}
        <div>
          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-white">
            Ranking
          </h1>
        </div>

        {isLoading ? (
          <div className="space-y-4 animate-pulse">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 bg-neutral-900 rounded-3xl border border-white/5" />
              ))}
            </div>
            <div className="space-y-3">
              {[4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="h-16 bg-neutral-900 rounded-2xl border border-white/5" />
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* ════════ Top 3 Podium Cards ════════ */}
            {top3.length > 0 && (
              <section className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
                {top3.map((dj: any, index: number) => (
                  <TopPodiumCard
                    key={dj.id}
                    dj={dj}
                    rank={index + 1}
                    onPlay={handlePlayDj}
                  />
                ))}
              </section>
            )}

            {/* ════════ Remaining Ranked DJs (4 to N) ════════ */}
            {remainingDjs.length > 0 && (
              <section className="space-y-3">
                {remainingDjs.map((dj: any, index: number) => (
                  <RankedRow
                    key={dj.id}
                    dj={dj}
                    rank={index + 4}
                  />
                ))}
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
