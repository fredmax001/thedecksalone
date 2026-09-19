import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Play,
  Users,
  Music2,
  Star,
  MapPin,
  ChevronRight,
} from 'lucide-react';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import SEOHead from '@/components/SEOHead';
import { useDJs } from '@/hooks/useDJs';
import { useMixes, useTrendingMixes } from '@/hooks/useMixes';
import { useRecommendedDjs } from '@/hooks/useRecommendations';
import { usePlayerStore, type MixTrack } from '@/stores/playerStore';
import { imageFallback, getAvatarImageUrl } from '@/lib/utils';
import { getMediaUrl } from '@/lib/api';
import { formatCurrency } from '@/lib/formatting';

/* ─────────────────── Helpers ─────────────────── */

function formatNumber(n: number | null | undefined): string {
  const num = n ?? 0;
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  }
  return num.toLocaleString();
}

function formatPrice(dj: any): string {
  const min = dj.bookingFeeMin ?? 0;
  const max = dj.bookingFeeMax;
  if (max && max > min) {
    return `${formatCurrency(min)} - ${formatCurrency(max)}`;
  }
  if (min > 0) {
    return `${formatCurrency(min)}+`;
  }
  return 'Contact for Rates';
}

function toMixTrack(m: any): MixTrack {
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

/* ─────────────────── Section Header ─────────────────── */

function DiscoverSectionHeader({
  title,
  viewAllLink,
}: {
  title: string;
  viewAllLink?: string;
}) {
  return (
    <div className="flex items-center justify-between mb-3 sm:mb-4">
      <h2 className="font-display text-lg sm:text-xl md:text-2xl font-black uppercase tracking-tight text-white">
        {title}
      </h2>
      {viewAllLink && (
        <Link
          to={viewAllLink}
          className="text-xs sm:text-sm font-bold text-white/80 hover:text-gold transition-colors inline-flex items-center gap-1"
        >
          View All
          <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </Link>
      )}
    </div>
  );
}

/* ─────────────────── Recommended DJ Feature Card ─────────────────── */

function RecommendedDjCard({
  dj,
  onPlay,
}: {
  dj: any;
  onPlay: (dj: any, e: React.MouseEvent) => void;
}) {
  const avatarUrl = getAvatarImageUrl(dj.avatar);
  const location = [dj.community, dj.city].filter(Boolean).join(', ') || 'Sierra Leone';
  const followersCount = dj.totalFollowers || dj._count?.followers || 0;
  const playsCount = dj.totalPlays || 0;
  const mixesCount = dj.totalMixes || dj._count?.mixes || 0;

  return (
    <div className="w-full rounded-2xl sm:rounded-3xl bg-black border border-white/10 hover:border-gold/40 p-3 sm:p-4 flex items-center gap-3 sm:gap-4 transition-all duration-300 hover:shadow-card group">
      {/* Left Avatar */}
      <Link
        to={`/dj/${dj.user?.username || dj.username || dj.id}`}
        className="relative w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-xl sm:rounded-2xl overflow-hidden shrink-0 bg-neutral-900 border border-white/5 block"
      >
        <img
          src={avatarUrl}
          alt={dj.stageName}
          onError={imageFallback}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
      </Link>

      {/* Right Details */}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <div className="flex items-center gap-1.5 min-w-0">
          <Link
            to={`/dj/${dj.user?.username || dj.username || dj.id}`}
            className="block min-w-0"
          >
            <h3 className="font-display text-sm sm:text-base font-bold text-white uppercase tracking-tight truncate group-hover:text-gold transition-colors">
              {dj.stageName}
            </h3>
          </Link>
          {dj.verified && <VerifiedBadge dj={dj} size={15} className="shrink-0" />}
        </div>

        {/* Plays / Mixes (real data only) */}
        <div className="font-bold text-xs sm:text-sm text-white/90 mt-0.5 truncate">
          {playsCount > 0 ? `${formatNumber(playsCount)} Plays` : `${formatNumber(mixesCount)} Mixes`}
        </div>

        {/* Location & followers */}
        <div className="text-[11px] sm:text-xs text-text-muted truncate mt-0.5">
          {location} · {followersCount} followers
        </div>

        {/* Action Row */}
        <div className="flex items-center gap-2 mt-2 sm:mt-2.5">
          <Link
            to={`/dj/${dj.user?.username || dj.username || dj.id}`}
            className="px-3 sm:px-4 py-1.5 rounded-full bg-gold hover:brightness-110 text-black text-xs font-bold uppercase tracking-wider transition-transform hover:scale-105 shrink-0"
          >
            VIEW PROFILE
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

/* ─────────────────── Rounded Mix Card ─────────────────── */

function RoundedMixCard({
  mix,
  onClick,
}: {
  mix: any;
  onClick: (mix: any) => void;
}) {
  const coverUrl = getMediaUrl(mix.coverImage || mix.cover) || '/images/genres/salone-mix.jpg';
  const title = mix.genre || mix.title || 'Mix';
  const subtitle = mix.title || `${mix.genre || 'Afrobeats'} Mix`;

  return (
    <div
      onClick={() => onClick(mix)}
      className="shrink-0 w-32 xs:w-36 sm:w-44 md:w-48 group cursor-pointer select-none"
    >
      {/* Artwork with smooth rounded-2xl / rounded-3xl corners */}
      <div className="relative aspect-[4/5] sm:aspect-square w-full rounded-2xl sm:rounded-3xl overflow-hidden bg-neutral-900 border border-white/10 group-hover:border-gold/40 transition-all shadow-md">
        <img
          src={coverUrl}
          alt={title}
          onError={imageFallback}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        {/* Subtle Play Overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gold text-black flex items-center justify-center shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-transform">
            <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-black ml-0.5" />
          </div>
        </div>
      </div>

      {/* Info Underneath */}
      <div className="mt-1.5 sm:mt-2 px-0.5">
        <h4 className="font-display font-bold text-xs sm:text-sm md:text-base text-white truncate group-hover:text-gold transition-colors">
          {title}
        </h4>
        <p className="text-[11px] sm:text-xs text-text-secondary truncate mt-0.5">
          {subtitle}
        </p>
      </div>
    </div>
  );
}

/* ─────────────────── Ranked DJ Leaderboard Row ─────────────────── */

function RankedDjRow({ dj, rank }: { dj: any; rank: number }) {
  const avatarUrl = getAvatarImageUrl(dj.avatar);
  const location = [dj.community, dj.city].filter(Boolean).join(', ') || 'Sierra Leone';
  const followersCount = dj.totalFollowers || dj._count?.followers || 0;
  const mixesCount = dj.totalMixes || dj._count?.mixes || 0;
  const rating = dj.averageRating || 0.0;
  const genres = Array.isArray(dj.genres) ? dj.genres : [];

  return (
    <div className="rounded-2xl bg-black hover:bg-[#141414] border border-white/10 hover:border-gold/40 p-3 sm:p-4 flex items-center gap-3 sm:gap-4 transition-all duration-300 shadow-md group">
      {/* Rank Badge */}
      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gold text-black font-black text-xs sm:text-sm flex items-center justify-center shrink-0 shadow">
        {rank}
      </div>

      {/* DJ Avatar */}
      <Link
        to={`/dj/${dj.username || dj.id}`}
        className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden shrink-0 border border-white/10 block"
      >
        <img
          src={avatarUrl}
          alt={dj.stageName}
          onError={imageFallback}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
      </Link>

      {/* DJ Main Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <Link
            to={`/dj/${dj.username || dj.id}`}
            className="font-display text-sm sm:text-base font-bold text-white uppercase tracking-tight truncate group-hover:text-gold transition-colors"
          >
            {dj.stageName}
          </Link>
          {dj.verified && <VerifiedBadge dj={dj} size={15} className="shrink-0" />}
        </div>

        {/* Location & followers */}
        <div className="flex items-center gap-1 text-[11px] sm:text-xs text-text-muted mt-0.5 truncate">
          <MapPin className="w-3 h-3 text-text-muted shrink-0" />
          <span className="truncate">{location}</span>
          <span className="text-text-muted/50">·</span>
          <span className="shrink-0">{followersCount} followers</span>
        </div>

        {/* Genre Tags */}
        {genres.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {genres.slice(0, 3).map((g: string) => (
              <span
                key={g}
                className="px-2 py-0.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider rounded-md bg-white/[0.06] text-text-secondary border border-white/5"
              >
                {g}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Stats (Followers, Mixes, Rating) */}
      <div className="hidden sm:flex items-center gap-3 sm:gap-4 text-xs text-text-secondary shrink-0 font-medium">
        <div className="flex items-center gap-1" title="Followers">
          <Users className="w-3.5 h-3.5 text-text-muted" />
          <span>{followersCount}</span>
        </div>
        <div className="flex items-center gap-1" title="Total Mixes">
          <Music2 className="w-3.5 h-3.5 text-text-muted" />
          <span>{mixesCount}</span>
        </div>
        <div className="flex items-center gap-1" title="Rating">
          <Star className="w-3.5 h-3.5 text-gold fill-gold/20" />
          <span>{rating.toFixed(1)}</span>
        </div>
      </div>

      {/* Price & Book Button */}
      <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 sm:gap-3 shrink-0">
        <span className="font-semibold text-xs sm:text-sm text-white/90 hidden md:block">
          {formatPrice(dj)}
        </span>
        <Link
          to={`/dj/${dj.username || dj.id}`}
          className="px-4 sm:px-5 py-1.5 text-xs font-bold uppercase tracking-wider rounded-full border border-gold text-gold hover:bg-gold hover:text-black transition-colors shrink-0"
        >
          BOOK
        </Link>
      </div>
    </div>
  );
}

/* ─────────────────── Main Discover Component ─────────────────── */

export default function Discover() {
  const { play, setQueue } = usePlayerStore();

  /* ── 1. Recommended DJs ── */
  const { data: recommendedDjs = [] } = useRecommendedDjs(6);

  /* ── 2. All/Top DJs for circular avatars & leaderboard ── */
  const djsQuery = useDJs({ limit: 16, sortBy: 'ranking' });
  const djs: any[] = (djsQuery.data as any)?.data || [];

  /* ── 3. Todays Hits (Trending Mixes) ── */
  const trendingQuery = useTrendingMixes(10);
  const trendingMixes: any[] = (trendingQuery.data as any) || [];

  /* ── 4. Recently Added (Newest Mixes) ── */
  const newestMixesQuery = useMixes({ sortBy: 'newest', limit: 10 });
  const newestMixes: any[] = (newestMixesQuery.data as any)?.data || [];

  /* ── 5. Recently Played (from store or popular mixes fallback) ── */
  const playerHistory = usePlayerStore((s) => s.history);
  const recentlyPlayedList = useMemo(() => {
    const list = Object.values(playerHistory || {})
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
      .map((item) => item.track)
      .filter(Boolean);

    if (list.length > 0) return list.slice(0, 10);
    // Fallback to top mixes if history is empty
    return trendingMixes.slice(0, 10);
  }, [playerHistory, trendingMixes]);

  /* ── Playback Handlers ── */
  const handlePlayMix = (mix: any) => {
    const track = toMixTrack(mix);
    const queue = [
      track,
      ...trendingMixes.map(toMixTrack).filter((t) => t.id !== track.id),
    ];
    setQueue(queue);
    play(track);
  };

  const handlePlayDj = (dj: any, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (dj.mixes && dj.mixes.length > 0) {
      const topMix = dj.mixes[0];
      handlePlayMix(topMix);
      return;
    }
    // Fallback: play first available trending mix or first mix
    if (trendingMixes.length > 0) {
      handlePlayMix(trendingMixes[0]);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-black pb-32 text-white">
      <SEOHead
        title="Discover"
        description="Discover top trending Sierra Leonean DJs, today's hits, recently added mixes, and book verified DJs."
      />

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 space-y-10 sm:space-y-12">
        {/* ════════ Page Header: Discover ════════ */}
        <div>
          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-white">
            Discover
          </h1>
        </div>

        {/* ════════ Section 1: Recommended for You ════════ */}
        {recommendedDjs.length > 0 && (
          <section className="space-y-4">
            <h2 className="font-display text-lg sm:text-xl font-bold uppercase tracking-tight text-white">
              Recommended for You
            </h2>
            <div className="flex items-center gap-3 sm:gap-4 md:gap-5 overflow-x-auto scrollbar-hide py-1">
              {recommendedDjs.map((dj: any) => (
                <div key={dj.id} className="w-[280px] xs:w-[320px] sm:w-[360px] md:w-[380px] shrink-0">
                  <RecommendedDjCard dj={dj} onPlay={handlePlayDj} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ════════ Section 2: DJs (Circular Avatars) ════════ */}
        {djs.length > 0 && (
          <section>
            <DiscoverSectionHeader title="DJs" viewAllLink="/rankings" />
            <div className="flex items-center gap-4 sm:gap-6 overflow-x-auto scrollbar-hide py-2">
              {djs.map((dj: any) => (
                <Link
                  key={dj.id}
                  to={`/dj/${dj.username || dj.id}`}
                  className="flex flex-col items-center gap-2 shrink-0 group"
                >
                  <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-full overflow-hidden border-2 border-white/10 group-hover:border-gold transition-all duration-300 group-hover:scale-105 shadow-md bg-neutral-900">
                    <img
                      src={getAvatarImageUrl(dj.avatar)}
                      alt={dj.stageName}
                      onError={imageFallback}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <span className="text-xs font-bold text-text-secondary group-hover:text-gold transition-colors truncate max-w-[90px] sm:max-w-[110px] text-center">
                    {dj.stageName}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ════════ Section 3: Todays hits ════════ */}
        {trendingMixes.length > 0 && (
          <section>
            <DiscoverSectionHeader title="Todays hits" viewAllLink="/mixes?sortBy=trending" />
            <div className="flex items-start gap-4 sm:gap-5 overflow-x-auto scrollbar-hide py-1">
              {trendingMixes.map((mix: any) => (
                <RoundedMixCard key={mix.id} mix={mix} onClick={handlePlayMix} />
              ))}
            </div>
          </section>
        )}

        {/* ════════ Section 4: Recently Played ════════ */}
        {recentlyPlayedList.length > 0 && (
          <section>
            <DiscoverSectionHeader title="Recently Played" viewAllLink="/library" />
            <div className="flex items-start gap-4 sm:gap-5 overflow-x-auto scrollbar-hide py-1">
              {recentlyPlayedList.map((mix: any) => (
                <RoundedMixCard key={mix.id} mix={mix} onClick={handlePlayMix} />
              ))}
            </div>
          </section>
        )}

        {/* ════════ Section 5: Recently Added ════════ */}
        {newestMixes.length > 0 && (
          <section>
            <DiscoverSectionHeader title="Recently Added" viewAllLink="/mixes?sortBy=newest" />
            <div className="flex items-start gap-4 sm:gap-5 overflow-x-auto scrollbar-hide py-1">
              {newestMixes.map((mix: any) => (
                <RoundedMixCard key={mix.id} mix={mix} onClick={handlePlayMix} />
              ))}
            </div>
          </section>
        )}

        {/* ════════ Section 6: Ranked DJs Leaderboard ════════ */}
        {djs.length > 0 && (
          <section className="space-y-3 pt-4">
            <DiscoverSectionHeader title="Top Rated DJs" viewAllLink="/rankings" />
            <div className="space-y-3">
              {djs.slice(0, 10).map((dj: any, index: number) => (
                <RankedDjRow key={dj.id} dj={dj} rank={index + 1} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}