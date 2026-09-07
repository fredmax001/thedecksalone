import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Play,
  Pause,
  Heart,
  Grid2X2,
  List,
  LayoutList,
  Loader2,
  Shuffle,
  Radio,
  Download,
  Lock,
  Clock,
  Flame,
  Sparkles,
  Check,
  ChevronDown,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import api, { downloadMixFile } from '@/lib/api';
import { type MixTrack } from '@/stores/playerStore';
import { useMixes, useTrendingMixes, useLikeMix, useMixLike, useMixGenres, type GenreWithCount } from '@/hooks/useMixes';
import { useAuthStore } from '@/stores/authStore';
import { usePlayerStore } from '@/stores/playerStore';
import { GENRES } from '@/constants/genres';
import { cn } from '@/lib/utils';
import { formatCompactNumber } from '@/lib/formatting';
import { computeGenreRanks } from '@/utils/mixRanking';
import ReachListenersModal from '@/components/ReachListenersModal';
import DjSupportModal from '@/components/DjSupportModal';
import MixDownloadModal from '@/components/MixDownloadModal';
import EmbedMixModal from '@/components/EmbedMixModal';
import { getMixUrl } from '@/lib/slug';
import MixFeedRow from '@/components/feed/MixFeedRow';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/lib/apiErrors';
import { FeedSectionSkeleton } from '@/components/ui/page-skeletons';
import { useDelayedLoading } from '@/hooks/use-delayed-loading';

/* ──────────────────────── Helpers ──────────────────────── */
function formatDuration(seconds: number): string {
  if (!seconds) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

async function triggerMixDownload(mix: { id: string; title: string }) {
  toast.info(`Preparing download for "${mix.title}"...`);
  const res = await api.post(`/mixes/${mix.id}/download`);
  const downloadEndpoint = res.data.downloadUrl || `/api/mixes/${mix.id}/download-file`;
  await downloadMixFile(downloadEndpoint, res.data.directAudioUrl, `${mix.title}.mp3`);
  toast.success(`Download started! Enjoy the mix.`);
}

function toMixTrack(mix: any): MixTrack {
  return {
    id: mix.id,
    title: mix.title,
    dj: mix.dj?.stageName || (typeof mix.dj === 'string' ? mix.dj : '') || mix.djName || mix.dj?.user?.username || mix.dj?.user?.name || (mix.dj as any)?.stage_name || 'DJ Fredmax',
    djId: mix.dj?.id || mix.djId,
    djAvatar: mix.dj?.avatar,
    djUsername: mix.dj?.user?.username || mix.dj?.username,
    duration: mix.duration || 0,
    cover: mix.coverImage || mix.dj?.avatar || '/mix-placeholder.jpg',
    genre: mix.genre || mix.category || 'Mix',
    audioUrl: mix.audioUrl,
    audioSource: mix.audioSource,
    originalUrl: mix.originalUrl,
    plays: mix.plays || 0,
    downloads: mix.downloads || 0,
    likes: mix.likes || mix._count?.mixLikes || 0,
    reups: mix._count?.reups || 0,
    djTier: mix.dj?.subscriptionTier || 'free',
    isExclusive: mix.isExclusive || false,
    promotedUntil: mix.promotedUntil,
    createdAt: mix.createdAt,
  };
}

/* ──────────────────────── Animated Wave Equalizer (Deck Gold) ──────────────────────── */
function PlayingWaveIndicator() {
  return (
    <div className="flex items-end gap-[3px] h-3.5">
      <motion.div
        className="w-[2.5px] bg-[#f4e059] rounded-full"
        animate={{ height: ['4px', '14px', '6px', '12px', '4px'] }}
        transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="w-[2.5px] bg-[#f4e059] rounded-full"
        animate={{ height: ['12px', '4px', '14px', '6px', '12px'] }}
        transition={{ duration: 0.7, repeat: Infinity, ease: 'easeInOut', delay: 0.15 }}
      />
      <motion.div
        className="w-[2.5px] bg-[#f4e059] rounded-full"
        animate={{ height: ['6px', '14px', '4px', '10px', '6px'] }}
        transition={{ duration: 0.85, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
      />
    </div>
  );
}

/* ──────────────────────── 🌟 2. SPOTIFY / AUDIOMACK GRID CARD ──────────────────────── */
function MixGridCard({
  mix,
  rank,
  onPlay,
  isCurrent,
  isPlaying,
  onOpenSubscribe,
}: {
  mix: MixTrack;
  rank?: number;
  onPlay: (mix: MixTrack) => void;
  isCurrent?: boolean;
  isPlaying?: boolean;
  onOpenSubscribe: (mix: MixTrack) => void;
}) {
  const { data: likeState } = useMixLike(mix.id, mix.likes || 0);
  const liked = likeState?.liked ?? false;
  const { mutate: likeMix } = useLikeMix();
  const { isAuthenticated } = useAuthStore();

  const handleLike = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      toast.info('Sign in to like mixes');
      return;
    }
    likeMix(mix.id);
  }, [mix.id, isAuthenticated, likeMix]);

  const handleCardPlay = () => {
    if (mix.isExclusive) {
      onOpenSubscribe(mix);
      return;
    }
    onPlay(mix);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className="group relative rounded-2xl bg-[#101010] border border-white/[0.06] hover:border-[#f4e059]/40 hover:bg-[#141414] transition-all p-3 sm:p-3.5 flex flex-col justify-between"
    >
      <div className="space-y-3">
        {/* Cover Art + Floating Play Button */}
        <div className="relative aspect-square rounded-xl overflow-hidden bg-[#050505]">
          <img
            src={mix.cover}
            alt={mix.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />

          {/* Rank Badge */}
          {rank && rank <= 10 && (
            <div className="absolute top-2 left-2 px-2 py-0.5 rounded-lg bg-black/85 text-[#f4e059] border border-[#f4e059]/40 text-[10px] font-black tracking-wider shadow-lg z-10">
              #{rank}
            </div>
          )}

          {/* Exclusive VIP Lock */}
          {mix.isExclusive && (
            <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-[#f4e059] text-black text-[9px] font-extrabold tracking-wider shadow">
              VIP ONLY
            </div>
          )}

          {/* Spotify Style Floating Play Button */}
          <button
            onClick={handleCardPlay}
            aria-label={isCurrent && isPlaying ? 'Pause mix' : 'Play mix'}
            className={cn(
              'absolute bottom-3 right-3 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#f4e059] text-black flex items-center justify-center shadow-2xl transition-all duration-300 z-10 hover:scale-110 active:scale-95',
              isCurrent && isPlaying ? 'opacity-100 scale-100' : 'opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0'
            )}
          >
            {isCurrent && isPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
          </button>

          {/* Playing wave overlay */}
          {isCurrent && isPlaying && (
            <div className="absolute bottom-3 left-3 px-2 py-1 rounded-md bg-black/80 backdrop-blur-md flex items-center gap-1.5 z-10">
              <PlayingWaveIndicator />
              <span className="text-[10px] font-bold text-[#f4e059] uppercase tracking-wider">Playing</span>
            </div>
          )}
        </div>

        {/* Title & DJ */}
        <div className="space-y-1">
          <Link to={getMixUrl(mix as any)}>
            <h4 className="font-display text-sm font-bold text-text-primary uppercase tracking-tight truncate hover:text-[#f4e059] transition-colors">
              {mix.title}
            </h4>
          </Link>
          <p className="text-xs text-text-secondary truncate flex items-center gap-1">
            <Link
              to={`/dj/${mix.djUsername || mix.djId || mix.dj}`}
              onClick={(e) => e.stopPropagation()}
              className="hover:text-[#f4e059] hover:underline transition-colors"
            >
              {mix.dj}
            </Link>
            {mix.djTier === 'legend' && (
              <span className="text-[9px] px-1 py-0.2 rounded bg-[#f4e059]/15 text-[#f4e059] font-bold border border-[#f4e059]/30">PRO+</span>
            )}
          </p>
        </div>
      </div>

      {/* Metadata & Actions Footer */}
      <div className="pt-3 mt-3 border-t border-white/[0.04] flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-[10px] text-text-muted font-mono">
          <span>{formatCompactNumber(mix.plays || 0)} plays</span>
          <span>•</span>
          <span className="flex items-center gap-0.5">
            <Clock className="w-3 h-3 text-text-muted" />
            {formatDuration(mix.duration)}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleLike}
            className="p-1.5 rounded-full hover:bg-white/[0.08] transition-colors"
            title="Like mix"
          >
            <Heart className={cn('w-3.5 h-3.5', liked ? 'text-red-500 fill-red-500' : 'text-text-muted')} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

/* ──────────────────────── 🌟 3. APPLE MUSIC & MOBILE COMPACT TRACKLIST ROW ──────────────────────── */
function MixTracklistRow({
  mix,
  index,
  onPlay,
  isCurrent,
  isPlaying,
  genreRank,
  onOpenSubscribe,
}: {
  mix: MixTrack;
  index: number;
  onPlay: (mix: MixTrack) => void;
  isCurrent?: boolean;
  isPlaying?: boolean;
  genreRank?: number;
  onOpenSubscribe: (mix: MixTrack) => void;
}) {
  const { data: likeState } = useMixLike(mix.id, mix.likes || 0);
  const liked = likeState?.liked ?? false;
  const { mutate: likeMix } = useLikeMix();
  const { isAuthenticated } = useAuthStore();

  const handleLike = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      toast.info('Sign in to like mixes');
      return;
    }
    likeMix(mix.id);
  }, [mix.id, isAuthenticated, likeMix]);

  const handleRowClick = () => {
    if (mix.isExclusive) {
      onOpenSubscribe(mix);
      return;
    }
    onPlay(mix);
  };

  return (
    <div
      onClick={handleRowClick}
      className={cn(
        'group flex items-center gap-3 sm:gap-4 p-2.5 sm:p-3 rounded-xl transition-all cursor-pointer border',
        isCurrent
          ? 'bg-[#f4e059]/10 border-[#f4e059]/30 text-white'
          : 'bg-[#101010]/70 hover:bg-[#161616] border-white/[0.04] hover:border-white/[0.08]'
      )}
    >
      {/* Index number or Play trigger */}
      <div className="w-6 sm:w-8 flex items-center justify-center shrink-0">
        {isCurrent && isPlaying ? (
          <PlayingWaveIndicator />
        ) : (
          <span className="font-mono text-xs text-text-muted group-hover:hidden">
            {genreRank ? `#${genreRank}` : String(index + 1).padStart(2, '0')}
          </span>
        )}
        <button
          className={cn(
            'w-6 h-6 rounded-full bg-[#f4e059] text-black flex items-center justify-center transition-transform',
            isCurrent && isPlaying ? 'hidden' : 'hidden group-hover:flex'
          )}
        >
          <Play className="w-3 h-3 fill-current ml-0.5" />
        </button>
      </div>

      {/* Album artwork thumbnail */}
      <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-lg overflow-hidden shrink-0 bg-black">
        <img src={mix.cover} alt={mix.title} className="w-full h-full object-cover" loading="lazy" />
        {mix.isExclusive && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Lock className="w-3.5 h-3.5 text-[#f4e059]" />
          </div>
        )}
      </div>

      {/* Title & DJ */}
      <div className="min-w-0 flex-1">
        <Link
          to={getMixUrl(mix as any)}
          onClick={(e) => e.stopPropagation()}
          className="font-display text-xs sm:text-sm font-bold uppercase tracking-tight text-text-primary hover:text-[#f4e059] transition-colors truncate block"
        >
          {mix.title}
        </Link>
        <p className="text-[11px] text-text-secondary truncate mt-0.5 flex items-center gap-1">
          <Link
            to={`/dj/${mix.djUsername || mix.djId || mix.dj}`}
            onClick={(e) => e.stopPropagation()}
            className="hover:text-[#f4e059] hover:underline transition-colors"
          >
            {mix.dj}
          </Link>
          {mix.djTier === 'legend' && (
            <span className="text-[8px] px-1 rounded bg-[#f4e059]/20 text-[#f4e059] font-bold">PRO+</span>
          )}
        </p>
      </div>

      {/* Genre Chip */}
      <div className="hidden md:block w-28 text-left">
        <span className="text-[10px] font-semibold text-text-secondary px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.06]">
          {mix.genre}
        </span>
      </div>

      {/* Stream Count */}
      <div className="hidden sm:block w-24 text-right font-mono text-xs text-text-muted">
        {formatCompactNumber(mix.plays || 0)} plays
      </div>

      {/* Duration */}
      <div className="w-14 sm:w-16 text-right font-mono text-xs text-text-muted flex items-center justify-end gap-1">
        <Clock className="w-3 h-3 text-text-muted hidden sm:inline" />
        {formatDuration(mix.duration)}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
        <button onClick={handleLike} className="p-1.5 rounded-full hover:bg-white/[0.08] transition-colors">
          <Heart className={cn('w-3.5 h-3.5', liked ? 'text-red-500 fill-red-500' : 'text-text-muted')} />
        </button>
      </div>
    </div>
  );
}

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest Uploads', icon: Sparkles },
  { value: 'plays', label: 'Most Streamed', icon: Flame },
  { value: 'downloads', label: 'Most Downloaded', icon: Download },
  { value: 'likes', label: 'Most Liked', icon: Heart },
];

/* ═══════════════════════════ MAIN MIX HUB PAGE ═══════════════════════════ */
export default function MixHub() {
  const { currentTrack, isPlaying, play, pause, setQueue } = usePlayerStore();

  const [activeGenre, setActiveGenre] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState<'waveform' | 'grid' | 'list'>('waveform');
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');

  // Accumulate loaded pages for true "Load More" behavior
  const [allMixes, setAllMixes] = useState<MixTrack[]>([]);

  // Modals state
  const [promoteModalMix, setPromoteModalMix] = useState<MixTrack | null>(null);
  const [supportModalDj, setSupportModalDj] = useState<any | null>(null);
  const [embedModalMix, setEmbedModalMix] = useState<MixTrack | null>(null);
  const [downloadModalData, setDownloadModalData] = useState<{ mix: any; mode: 'auth' | 'subscribe' | 'repost' | 'follow' } | null>(null);

  // Sync URL genre & search params (deep links from Feed / Official Playlists)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const rawParam = params.get('genre') || params.get('category');
    if (rawParam) {
      const normalized = rawParam.replace(/-/g, ' ').toLowerCase();
      const matched = GENRES.find((g) => g.toLowerCase() === normalized);
      setActiveGenre(matched || rawParam);
    }
    setSearchQuery(params.get('search') || '');
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (activeGenre === 'all') {
      url.searchParams.delete('genre');
      url.searchParams.delete('category');
    } else {
      url.searchParams.set('genre', activeGenre);
    }
    if (searchQuery) {
      url.searchParams.set('search', searchQuery);
    } else {
      url.searchParams.delete('search');
    }
    window.history.replaceState({}, '', url.toString());
  }, [activeGenre, searchQuery]);

  const { data: genres = [] } = useMixGenres();
  const { data: trendingData = [] } = useTrendingMixes(
    10,
    activeGenre !== 'all' ? activeGenre : undefined
  );

  const { data: latestData, isLoading: latestLoading, refetch: refetchLatest } = useMixes({
    genre: activeGenre !== 'all' ? activeGenre : undefined,
    search: searchQuery || undefined,
    sortBy,
    page,
    limit: 16,
  });

  const trending = useMemo(() => (trendingData || []).map(toMixTrack), [trendingData]);

  // Accumulate paginated mixes so "Load More" appends instead of replacing
  useEffect(() => {
    if (!latestData?.data) return;
    const pageMixes: MixTrack[] = (latestData.data || []).map(toMixTrack);
    if (page === 1) {
      setAllMixes(pageMixes);
    } else {
      setAllMixes((prev) => {
        const existingIds = new Set(prev.map((m) => m.id));
        const newMixes = pageMixes.filter((m) => !existingIds.has(m.id));
        return [...prev, ...newMixes];
      });
    }
  }, [latestData, page]);

  const sortedLatest = useMemo(() => {
    const list = [...allMixes];
    if (sortBy === 'plays') return list.sort((a, b) => (b.plays || 0) - (a.plays || 0));
    if (sortBy === 'downloads') return list.sort((a, b) => (b.downloads || 0) - (a.downloads || 0));
    if (sortBy === 'likes') return list.sort((a, b) => (b.likes || 0) - (a.likes || 0));
    // For "newest", preserve the API order: promoted mixes first, then createdAt desc
    return list;
  }, [allMixes, sortBy]);

  const allMixesForRank = useMemo(() => {
    const combined = [...trending, ...sortedLatest];
    return combined.filter((m, idx, arr) => arr.findIndex((x) => x.id === m.id) === idx);
  }, [trending, sortedLatest]);

  const genreRanks = useMemo(() => computeGenreRanks(allMixesForRank), [allMixesForRank]);

  // Handle Play
  const handlePlay = useCallback(
    (mix: MixTrack) => {
      if (currentTrack?.id === mix.id) {
        if (isPlaying) pause();
        else play();
        return;
      }
      const allVisible = [...trending, ...sortedLatest];
      const uniqueQueue = allVisible.filter((t, i, arr) => arr.findIndex((x) => x.id === t.id) === i);
      setQueue(uniqueQueue);
      play(mix);
    },
    [currentTrack, isPlaying, trending, sortedLatest, play, pause, setQueue]
  );

  // Handle Shuffle Play
  const handleShufflePlay = useCallback(() => {
    const allVisible = [...trending, ...sortedLatest];
    if (allVisible.length === 0) return;
    const shuffled = [...allVisible].sort(() => Math.random() - 0.5);
    setQueue(shuffled);
    play(shuffled[0]);
  }, [trending, sortedLatest, setQueue, play]);

  const featuredMix = trending[0] || allMixes[0];

  const showSkeleton = useDelayedLoading(latestLoading && page === 1);

  return (
    <div className="min-h-screen bg-[#080808] text-text-primary pb-32">
      {/* ─── 🎧 SPOTIFY / APPLE MUSIC SPOTLIGHT HERO (Desktop only) ─── */}
      <section className="hidden md:block relative overflow-hidden border-b border-white/[0.06] bg-gradient-to-b from-[#141412] via-[#0A0A0A] to-[#080808] pt-6 pb-10 sm:pt-10 sm:pb-14">
        {/* Subtle Ambient Radial Glow */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#f4e059]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-12 gap-8 items-center">
            {/* Left Hero Content */}
            <div className="lg:col-span-7 space-y-4">
              <img
                src="/logo-mobile.png?v=3"
                alt="Deck Salone"
                className="lg:hidden h-10 w-auto object-contain"
              />
              <h1 className="font-display text-3xl sm:text-5xl font-black uppercase tracking-tight text-white leading-none">
                Experience Sierra Leone's <span className="text-[#f4e059]">Finest DJ Sets</span>
              </h1>

              {/* Quick Actions */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                {featuredMix && (
                  <button
                    onClick={() => handlePlay(featuredMix)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#f4e059] text-black font-bold text-xs uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-[#f4e059]/20"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    Play Spotlight Mix
                  </button>
                )}

                <button
                  onClick={handleShufflePlay}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-white font-bold text-xs uppercase tracking-wider transition-all"
                >
                  <Shuffle className="w-4 h-4 text-[#f4e059]" />
                  Shuffle Play
                </button>
              </div>
            </div>

            {/* Right Featured Billboard Card */}
            {featuredMix && (
              <div className="lg:col-span-5">
                <div
                  onClick={() => handlePlay(featuredMix)}
                  className="group relative rounded-3xl p-5 bg-gradient-to-br from-[#181814] via-[#121212] to-[#0A0A0A] border border-[#f4e059]/30 hover:border-[#f4e059]/60 shadow-2xl transition-all cursor-pointer overflow-hidden"
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] uppercase tracking-widest font-black text-[#f4e059] bg-[#f4e059]/10 px-2.5 py-1 rounded-full border border-[#f4e059]/30">
                      ★ #1 SPOTLIGHT MIX
                    </span>
                    <span className="text-xs font-mono text-text-muted">
                      {formatCompactNumber(featuredMix.plays || 0)} plays
                    </span>
                  </div>

                  <div className="flex gap-4 items-center">
                    <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden shrink-0 shadow-lg bg-black">
                      <img
                        src={featuredMix.cover}
                        alt={featuredMix.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-10 h-10 rounded-full bg-[#f4e059] text-black flex items-center justify-center">
                          <Play className="w-5 h-5 fill-current ml-0.5" />
                        </div>
                      </div>
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <h3 className="font-display text-base sm:text-lg font-bold text-white uppercase tracking-tight truncate group-hover:text-[#f4e059] transition-colors">
                        {featuredMix.title}
                      </h3>
                      <p className="text-xs text-text-secondary truncate">{featuredMix.dj}</p>
                      <div className="pt-2 flex items-center gap-2">
                        <span className="text-[10px] font-bold text-white px-2 py-0.5 rounded-md bg-white/[0.08]">
                          {featuredMix.genre}
                        </span>
                        <span className="text-[10px] font-mono text-text-muted">
                          {formatDuration(featuredMix.duration)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {currentTrack?.id === featuredMix.id && isPlaying && (
                    <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs text-[#f4e059]">
                      <span className="font-bold flex items-center gap-2">
                        <PlayingWaveIndicator /> Currently Live on Deck Player
                      </span>
                      <span className="text-[10px] uppercase font-mono">Streaming</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ─── 🎛️ GENRE CAPSULES & CONTROLS BAR ─── */}
      <section className="sticky top-14 sm:top-16 lg:top-20 z-20 bg-[#080808]/95 backdrop-blur-xl border-y border-white/[0.06] mb-8 py-3">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Genre Capsules Bar */}
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-1">
              <button
                onClick={() => {
                  setActiveGenre('all');
                  setPage(1);
                }}
                className={cn(
                  'px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all',
                  activeGenre === 'all'
                    ? 'bg-[#f4e059] text-black shadow-md shadow-[#f4e059]/20'
                    : 'bg-white/[0.04] text-text-secondary hover:text-white hover:bg-white/[0.08] border border-white/[0.06]'
                )}
              >
                All Genres
              </button>

              {genres.map((g: GenreWithCount) => (
                <button
                  key={g.name}
                  onClick={() => {
                    setActiveGenre(g.name);
                    setPage(1);
                  }}
                  className={cn(
                    'px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5',
                    activeGenre === g.name
                      ? 'bg-[#f4e059] text-black shadow-md shadow-[#f4e059]/20'
                      : 'bg-white/[0.04] text-text-secondary hover:text-white hover:bg-white/[0.08] border border-white/[0.06]'
                  )}
                >
                  <span>{g.name}</span>
                  <span
                    className={cn(
                      'text-[10px] font-mono',
                      activeGenre === g.name ? 'text-black/80' : 'text-text-muted'
                    )}
                  >
                    ({g.count})
                  </span>
                </button>
              ))}
            </div>

            {/* View Toggle & Sort Options */}
            <div className="flex items-center justify-between lg:justify-end gap-3 shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="h-9 px-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:border-[#f4e059]/50 text-xs font-bold text-text-primary flex items-center gap-2 transition-all cursor-pointer shadow-sm"
                    aria-label="Sort mixes"
                  >
                    {(() => {
                      const current = SORT_OPTIONS.find((s) => s.value === sortBy) || SORT_OPTIONS[0];
                      const Icon = current.icon;
                      return (
                        <>
                          <Icon className="w-3.5 h-3.5 text-[#f4e059]" />
                          <span>{current.label}</span>
                          <ChevronDown className="w-3.5 h-3.5 text-text-muted ml-0.5" />
                        </>
                      );
                    })()}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-[#121212] border-white/10 w-52 shadow-2xl z-50 p-1.5 rounded-2xl">
                  {SORT_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    const isSelected = sortBy === opt.value;
                    return (
                      <DropdownMenuItem
                        key={opt.value}
                        onClick={() => {
                          setSortBy(opt.value);
                          setPage(1);
                        }}
                        className={cn(
                          'flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-colors',
                          isSelected
                            ? 'bg-[#f4e059]/15 text-[#f4e059]'
                            : 'text-text-secondary hover:text-white hover:bg-white/[0.06]'
                        )}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon className={cn('w-4 h-4', isSelected ? 'text-[#f4e059]' : 'text-text-muted')} />
                          <span>{opt.label}</span>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-[#f4e059]" />}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* 3-Way Layout Switcher (Waveform Cards | Grid | Tracklist) */}
              <div className="flex rounded-xl bg-white/[0.04] border border-white/[0.08] p-0.5">
                <button
                  type="button"
                  onClick={() => setViewMode('waveform')}
                  className={cn(
                    'px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5',
                    viewMode === 'waveform' ? 'bg-[#f4e059] text-black shadow' : 'text-text-muted hover:text-white'
                  )}
                  title="Full Waveform Cards"
                >
                  <LayoutList className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Cards</span>
                </button>

                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    'px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5',
                    viewMode === 'grid' ? 'bg-[#f4e059] text-black shadow' : 'text-text-muted hover:text-white'
                  )}
                  title="Grid Cards"
                >
                  <Grid2X2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Grid</span>
                </button>

                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={cn(
                    'px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5',
                    viewMode === 'list' ? 'bg-[#f4e059] text-black shadow' : 'text-text-muted hover:text-white'
                  )}
                  title="Compact Tracklist"
                >
                  <List className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">List</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 📻 ALL RELEASES / MIXES LIST ─── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-display text-xl sm:text-2xl font-bold uppercase tracking-tight text-white">
              {activeGenre !== 'all' ? `${activeGenre} Mixes` : 'All Releases'}
            </h2>
          </div>

          {activeGenre !== 'all' && (
            <button
              onClick={() => {
                setActiveGenre('all');
                setPage(1);
              }}
              className="text-xs text-[#f4e059] hover:underline font-bold"
            >
              Reset to All Genres ✕
            </button>
          )}
        </div>

        {/* Loading Skeleton */}
        {latestLoading && page === 1 ? (
          showSkeleton ? <FeedSectionSkeleton /> : null
        ) : viewMode === 'waveform' ? (
          /* 1. Full Waveform Cards (Unified with Feed layout) */
          <div className="space-y-3.5">
            {sortedLatest.map((mix: MixTrack, i: number) => {
              const rank = (page - 1) * 16 + (i + 1);

              return (
                <MixFeedRow
                  key={mix.id}
                  mix={mix as any}
                  index={i}
                  rank={rank}
                  variant="waveform"
                  onOpenPromote={(m) => setPromoteModalMix(m as any)}
                  onOpenEmbed={(m) => setEmbedModalMix(m as any)}
                  onOpenDjSupport={(m) =>
                    setSupportModalDj({
                      id: (m as any).djId || m.id,
                      stageName: (m as any).dj || m.title,
                      avatar: (m as any).djAvatar || (m as any).cover,
                    })
                  }
                />
              );
            })}
          </div>
        ) : viewMode === 'grid' ? (
          /* 2. Grid Cards (6-Column Grid) */
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 sm:gap-5">
            {sortedLatest.map((mix: MixTrack, i: number) => {
              const rank = genreRanks[mix.id] || (page - 1) * 16 + (i + 1);
              return (
                <MixGridCard
                  key={mix.id}
                  mix={mix}
                  rank={rank}
                  onPlay={handlePlay}
                  isCurrent={currentTrack?.id === mix.id}
                  isPlaying={isPlaying}
                  onOpenSubscribe={(m) =>
                    setSupportModalDj({
                      id: m.djId,
                      stageName: m.dj,
                      avatar: m.djAvatar || m.cover,
                    })
                  }
                />
              );
            })}
          </div>
        ) : (
          /* 3. Compact List / Tracklist Table (Apple Music & Mobile List) */
          <div className="space-y-2">
            <div className="hidden sm:flex items-center gap-4 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-text-muted border-b border-white/[0.04]">
              <span className="w-8 text-center">#</span>
              <span className="w-12">Art</span>
              <span className="flex-1">Title & Artist</span>
              <span className="hidden md:block w-28">Genre</span>
              <span className="w-24 text-right">Plays</span>
              <span className="w-16 text-right">Time</span>
              <span className="w-10 text-right">Like</span>
            </div>

            {sortedLatest.map((mix: MixTrack, i: number) => (
              <MixTracklistRow
                key={mix.id}
                mix={mix}
                index={i}
                onPlay={handlePlay}
                isCurrent={currentTrack?.id === mix.id}
                isPlaying={isPlaying}
                genreRank={genreRanks[mix.id]}
                onOpenSubscribe={(m) =>
                  setSupportModalDj({
                    id: m.djId,
                    stageName: m.dj,
                    avatar: m.djAvatar || m.cover,
                  })
                }
              />
            ))}
          </div>
        )}

        {/* Empty State */}
        {sortedLatest.length === 0 && !latestLoading && (
          <div className="rounded-3xl border border-white/[0.06] bg-[#101010] p-12 text-center max-w-lg mx-auto my-8">
            <Radio className="w-12 h-12 text-[#f4e059] mx-auto mb-3 opacity-60" />
            <h3 className="text-base font-bold text-white uppercase">No mixes found</h3>
            <p className="text-xs text-text-muted mt-1">
              {activeGenre !== 'all' ? `No ${activeGenre} mixes found yet.` : 'No mixes found for this filter.'}
            </p>
          </div>
        )}

        {/* Pagination Load More */}
        {(latestData?.meta?.totalPages || 0) > page && (
          <div className="flex justify-center mt-10">
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={latestLoading}
              className="px-8 py-3 bg-white/[0.06] hover:bg-white/[0.1] disabled:opacity-50 disabled:cursor-not-allowed border border-white/[0.08] text-white text-xs font-bold uppercase rounded-full hover:border-[#f4e059] transition-all inline-flex items-center gap-2"
            >
              {latestLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Loading...
                </>
              ) : (
                'Load More Releases'
              )}
            </button>
          </div>
        )}
      </section>

      {/* ─── 🚀 PROMOTION MODAL (PRO & PRO+ FEATURE) ─── */}
      {promoteModalMix && (
        <ReachListenersModal
          isOpen={!!promoteModalMix}
          onClose={() => setPromoteModalMix(null)}
          mix={promoteModalMix}
          onPromoted={() => {
            refetchLatest();
          }}
        />
      )}

      {/* ─── 👑 DJ FAN SUBSCRIBE MODAL (EXCLUSIVE MIXES) ─── */}
      {supportModalDj && (
        <DjSupportModal
          isOpen={!!supportModalDj}
          onClose={() => setSupportModalDj(null)}
          dj={supportModalDj}
          onSuccess={() => {
            refetchLatest();
          }}
        />
      )}

      {/* ─── </> EMBED CODE MODAL ─── */}
      {embedModalMix && (
        <EmbedMixModal
          isOpen={!!embedModalMix}
          onClose={() => setEmbedModalMix(null)}
          mix={embedModalMix}
        />
      )}

      {/* ─── 📥 MIX DOWNLOAD MODAL (AUTH & SUBSCRIBE) ─── */}
      <MixDownloadModal
        isOpen={!!downloadModalData}
        onClose={() => setDownloadModalData(null)}
        mode={downloadModalData?.mode || 'auth'}
        mix={
          downloadModalData?.mix
            ? {
                id: downloadModalData.mix.id,
                title: downloadModalData.mix.title,
                djName: downloadModalData.mix.dj,
                dj: {
                  id: downloadModalData.mix.djId,
                  stageName: downloadModalData.mix.dj,
                  avatar: downloadModalData.mix.djAvatar || downloadModalData.mix.cover,
                },
              }
            : null
        }
        onOpenDjSupport={(dj) => setSupportModalDj(dj)}
        onActionComplete={() => {
          if (downloadModalData?.mix) {
            triggerMixDownload(downloadModalData.mix).catch((err: any) => {
              if (err.response?.status !== 403) {
                toast.error('Download failed', { description: getApiErrorMessage(err, 'Please try again.') });
              }
            });
          }
        }}
      />
    </div>
  );
}
