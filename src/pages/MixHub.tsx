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
  Search,
  Loader2,
  Upload,
  ListMusic,
  Music,
  Shuffle,
  Radio,
  ChevronRight,
  Rocket,
  Code2,
  Plus,
  Download,
  Eye,
  Repeat2,
  LineChart,
  Edit2,
  Lock,
  Clock,
} from 'lucide-react';
import api, { getMediaUrl } from '@/lib/api';
import { type MixTrack } from '@/stores/playerStore';
import { useMixes, useTrendingMixes, useLikeMix, useMixGenres, type GenreWithCount } from '@/hooks/useMixes';
import { useAuthStore } from '@/stores/authStore';
import { usePlayerStore } from '@/stores/playerStore';
import { GENRES } from '@/constants/genres';
import { cn } from '@/lib/utils';
import { computeGenreRanks } from '@/utils/mixRanking';
import WaveformPlayer from '@/components/WaveformPlayer';
import ReachListenersModal from '@/components/ReachListenersModal';
import DjFanSubscribeModal from '@/components/DjFanSubscribeModal';
import MixDownloadModal from '@/components/MixDownloadModal';
import EmbedMixModal from '@/components/EmbedMixModal';
import { toast } from 'sonner';

/* ──────────────────────── Helpers ──────────────────────── */
function formatDuration(seconds: number): string {
  if (!seconds) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatCompact(n: number): string {
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return 'Recent';
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

function toMixTrack(mix: any): MixTrack {
  return {
    id: mix.id,
    title: mix.title,
    dj: mix.dj?.stageName || 'Unknown DJ',
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
    subscriptionPrice: mix.dj?.subscriptionPrice || 100,
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

/* ──────────────────────── 🌟 1. WAVEFORM CARD (MATCHING USER REFERENCE IMAGE) ──────────────────────── */
function MixReleaseWaveformCard({
  mix,
  rank,
  onPlay,
  isCurrent,
  isPlaying,
  currentTime,
  onSeek,
  onOpenPromote,
  onOpenSubscribe,
  onOpenEmbed,
  onOpenDownloadAuth,
  onOpenDownloadSubscribe,
  onOpenDownloadRepost,
  onOpenDownloadFollow,
  isOwner,
}: {
  mix: MixTrack;
  rank: number;
  onPlay: (mix: MixTrack) => void;
  isCurrent: boolean;
  isPlaying: boolean;
  currentTime: number;
  onSeek: (seconds: number) => void;
  onOpenPromote: (mix: MixTrack) => void;
  onOpenSubscribe: (mix: MixTrack) => void;
  onOpenEmbed: (mix: MixTrack) => void;
  onOpenDownloadAuth?: (mix: MixTrack) => void;
  onOpenDownloadSubscribe?: (mix: MixTrack) => void;
  onOpenDownloadRepost?: (mix: MixTrack) => void;
  onOpenDownloadFollow?: (mix: MixTrack) => void;
  isOwner?: boolean;
}) {
  const { isAuthenticated } = useAuthStore();
  const { addToQueue } = usePlayerStore();
  const { mutate: likeMix } = useLikeMix();

  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(mix.likes || 0);
  const [reupped, setReupped] = useState(false);
  const [reupsCount, setReupsCount] = useState(mix.reups || 0);
  const [downloadsCount, setDownloadsCount] = useState(mix.downloads || 0);
  const [downloading, setDownloading] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);

  const [userReactions, setUserReactions] = useState<{ pos: number; emoji: string }[]>([]);
  const [showReactionPicker, setShowReactionPicker] = useState(false);

  // Handle Real User Reaction at Timestamp
  const handleAddReaction = (emoji: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      toast.error('Please login to react to this mix.');
      return;
    }
    const pos = duration > 0 ? Math.min(1, Math.max(0.01, currentTime / duration)) : 0.5;
    const newReaction = { pos, emoji };
    setUserReactions((prev) => [...prev, newReaction]);
    setShowReactionPicker(false);
    toast.success(`Dropped ${emoji} at ${formatDuration(currentTime)}!`);

    // Post reaction to backend
    api.post(`/mixes/${mix.id}/reactions`, { emoji, timestamp: currentTime, position: pos }).catch(() => {});
  };

  const isProDj = mix.djTier === 'pro' || mix.djTier === 'legend';
  const isPromoted = mix.promotedUntil && new Date(mix.promotedUntil) > new Date();

  // Handle Like
  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      toast.error('Please login to like this mix.');
      return;
    }
    setLiked((prev) => !prev);
    setLikesCount((prev) => (liked ? Math.max(0, prev - 1) : prev + 1));
    likeMix(mix.id);
  };

  // Handle Re-up
  const handleReup = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      toast.error('Please login to re-up this mix.');
      return;
    }
    try {
      if (reupped) {
        await api.delete(`/mixes/${mix.id}/reup`);
        setReupped(false);
        setReupsCount((c) => Math.max(0, c - 1));
        toast.info('Re-up removed');
      } else {
        await api.post(`/mixes/${mix.id}/reup`);
        setReupped(true);
        setReupsCount((c) => c + 1);
        toast.success('Mix re-upped to your DJ profile!');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Re-up failed.');
    }
  };

  // Direct Audio Download
  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      if (onOpenDownloadAuth) onOpenDownloadAuth(mix);
      else onOpenSubscribe(mix);
      return;
    }

    try {
      setDownloading(true);
      toast.info(`Preparing download for "${mix.title}"...`);

      // Verify subscription and permissions via backend API
      const res = await api.post(`/mixes/${mix.id}/download`);
      const downloadEndpoint = res.data.downloadUrl || `/api/mixes/${mix.id}/download-file`;

      const link = document.createElement('a');
      link.href = downloadEndpoint;
      link.setAttribute('download', `${mix.title}.mp3`);
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setDownloadsCount((c) => c + 1);
      toast.success(`Download started! Enjoy the mix.`);
    } catch (err: any) {
      if (err.response?.status === 403) {
        if (err.response?.data?.requiresRepost) {
          if (onOpenDownloadRepost) onOpenDownloadRepost(mix);
          else if (onOpenDownloadSubscribe) onOpenDownloadSubscribe(mix);
          else onOpenSubscribe(mix);
        } else if (err.response?.data?.requiresFollow) {
          if (onOpenDownloadFollow) onOpenDownloadFollow(mix);
          else if (onOpenDownloadSubscribe) onOpenDownloadSubscribe(mix);
          else onOpenSubscribe(mix);
        } else if (err.response?.data?.requiresSubscription) {
          if (onOpenDownloadSubscribe) onOpenDownloadSubscribe(mix);
          else onOpenSubscribe(mix);
        } else {
          toast.error('Download failed', { description: err.response?.data?.error || 'Please check your subscription and connection.' });
        }
      } else if (err.response?.status === 401) {
        if (onOpenDownloadAuth) onOpenDownloadAuth(mix);
        else onOpenSubscribe(mix);
      } else {
        toast.error('Download failed', { description: err.response?.data?.error || 'Please check your subscription and connection.' });
      }
    } finally {
      setDownloading(false);
    }
  };

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (mix.isExclusive && !isOwner) {
      onOpenSubscribe(mix);
      return;
    }
    onPlay(mix);
  };

  const duration = mix.duration || 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'group relative rounded-2xl sm:rounded-3xl border p-3.5 sm:p-5 transition-all overflow-hidden',
        isPromoted
          ? 'bg-gradient-to-r from-[#1c180f] via-[#141412] to-[#121210] border-[#f4e059]/40 shadow-xl shadow-[#f4e059]/10'
          : 'bg-[#121110] hover:bg-[#161413] border-white/[0.08] hover:border-white/[0.15]'
      )}
    >
      {/* Background warm ambient overlay matching reference image */}
      <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-[#f4e059]/5 via-transparent to-transparent pointer-events-none" />

      <div className="relative flex flex-col md:flex-row items-start md:items-center gap-4 sm:gap-5">
        {/* ─── LEFT: ALBUM COVER + CORNER RANK BADGE ─── */}
        <div className="relative w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-xl sm:rounded-2xl overflow-hidden bg-black shrink-0 shadow-2xl">
          <img
            src={mix.cover}
            alt={mix.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />

          {/* PINNED CORNER RANK BADGE (#1, #2, #12...) */}
          <div
            className={cn(
              'absolute top-0 left-0 px-2 py-0.5 rounded-br-lg text-[10px] sm:text-xs font-black tracking-tighter shadow-md z-10 flex items-center gap-0.5',
              rank === 1
                ? 'bg-[#f4e059] text-black'
                : rank === 2
                ? 'bg-amber-400 text-black'
                : rank === 3
                ? 'bg-amber-500 text-black'
                : 'bg-black/90 text-[#f4e059] border-r border-b border-[#f4e059]/40'
            )}
          >
            <span>#{rank}</span>
          </div>

          {/* Exclusive VIP Lock Overlay if mix is subscribers-only */}
          {mix.isExclusive && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex flex-col items-center justify-center p-2 text-center">
              <Lock className="w-6 h-6 text-[#f4e059] mb-1" />
              <span className="text-[9px] font-black uppercase text-[#f4e059] tracking-wider">
                Subscribers Only
              </span>
            </div>
          )}
        </div>

        {/* ─── MIDDLE & RIGHT: TRACK INFO, WAVEFORM & ACTION BAR ─── */}
        <div className="min-w-0 flex-1 w-full space-y-2.5">
          {/* Top Row: Play Button, DJ, Title, Genre, Duration */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {/* Circular Play / Pause Button matching reference image */}
              <button
                onClick={handlePlayClick}
                aria-label={isCurrent && isPlaying ? 'Pause' : 'Play'}
                className={cn(
                  'w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center border transition-all shrink-0 shadow-lg',
                  isCurrent && isPlaying
                    ? 'bg-[#f4e059] text-black border-[#f4e059] scale-105'
                    : 'bg-black/60 hover:bg-[#f4e059] text-white hover:text-black border-white/80 hover:border-[#f4e059] hover:scale-105'
                )}
              >
                {isCurrent && isPlaying ? (
                  <Pause className="w-5 h-5 fill-current" />
                ) : (
                  <Play className="w-5 h-5 fill-current ml-0.5" />
                )}
              </button>

              {/* DJ & Title */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                  <Link
                    to={`/dj/${mix.djUsername || mix.djId || mix.dj}`}
                    className="font-semibold text-white hover:text-[#f4e059] hover:underline transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {mix.dj}
                  </Link>
                  <span className="inline-flex items-center text-[#f4e059]" title="Verified DJ">
                    ✓
                  </span>
                  <span className="text-xs">🇸🇱</span>
                  {isProDj && (
                    <span className="text-[8px] uppercase font-black px-1.5 py-0.2 rounded bg-[#f4e059]/20 text-[#f4e059] border border-[#f4e059]/30 shadow-sm">
                      PRO
                    </span>
                  )}
                  {isPromoted && (
                    <span className="text-[8px] uppercase font-black px-1.5 py-0.2 rounded bg-[#f4e059] text-black font-bold animate-pulse">
                      ⚡ BOOSTED
                    </span>
                  )}
                </div>

                <div className="flex items-baseline gap-2 mt-0.5">
                  <Link to={`/mix/${mix.id}`}>
                    <h3 className="font-display text-sm sm:text-base font-bold text-white uppercase tracking-tight truncate hover:text-[#f4e059] transition-colors">
                      {mix.title}
                    </h3>
                  </Link>
                  <span className="text-[10px] font-mono text-text-muted hidden sm:inline">
                    320kbit/s
                  </span>
                </div>
              </div>
            </div>

            {/* Top Right: Genre & Duration */}
            <div className="text-right shrink-0">
              <div className="text-xs sm:text-sm font-semibold text-text-primary uppercase tracking-tight">
                {mix.genre}
              </div>
              <div className="text-xs font-mono text-text-muted mt-0.5">
                {formatDuration(mix.duration)}
              </div>
            </div>
          </div>

          {/* Interactive Waveform Component (Deck Salone Yellow Gold Theme - with real user reaction pins) */}
          <div className="w-full py-0.5">
            <WaveformPlayer
              trackId={mix.id}
              isCurrent={isCurrent}
              duration={mix.duration}
              currentTime={currentTime}
              onSeek={onSeek}
              reactions={userReactions}
            />
          </div>

          {/* ─── BOTTOM ACTION & STATS ROW ─── */}
          <div className="pt-2 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-3 text-xs">
            {/* Left Action Buttons */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-nowrap overflow-x-auto scrollbar-hide py-0.5">
              {/* Edit button (STRICTLY shown ONLY for the DJ who owns this mix) */}
              {isOwner && (
                <Link
                  to={`/dashboard/mixes`}
                  className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#f4e059] text-black flex items-center justify-center hover:brightness-110 shadow shrink-0"
                  title="Edit Your Mix"
                >
                  <Edit2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </Link>
              )}

              {/* 🚀 REACH MORE LISTENERS / PROMOTE (PRO & PRO+ FEATURE) */}
              <button
                onClick={() => onOpenPromote(mix)}
                className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-[#f4e059] hover:brightness-110 text-black font-bold text-[10px] sm:text-[11px] uppercase tracking-wider shadow-md shadow-[#f4e059]/20 active:scale-95 transition-all shrink-0"
              >
                <Rocket className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span className="hidden sm:inline">Reach more listeners!</span>
                <span className="sm:hidden">Promote</span>
              </button>

              {/* </> Embed Button */}
              <button
                onClick={() => onOpenEmbed(mix)}
                className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-text-secondary hover:text-white text-[10px] sm:text-[11px] font-medium transition-colors shrink-0"
              >
                <Code2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span>Embed</span>
              </button>

              {/* + Add Dropdown */}
              <div className="relative shrink-0">
                <button
                  onClick={() => setShowAddMenu((prev) => !prev)}
                  className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-text-secondary hover:text-white text-[10px] sm:text-[11px] font-medium transition-colors"
                >
                  <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  <span>Add ▾</span>
                </button>

                {showAddMenu && (
                  <div className="absolute left-0 bottom-full mb-1 w-44 rounded-xl bg-[#1a1a1a] border border-white/10 shadow-2xl p-1.5 z-30 space-y-1">
                    <button
                      onClick={() => {
                        addToQueue(mix);
                        setShowAddMenu(false);
                        toast.success(`Added "${mix.title}" to play queue`);
                      }}
                      className="w-full text-left px-3 py-1.5 rounded-lg text-xs text-white hover:bg-white/10 flex items-center gap-2"
                    >
                      <ListMusic className="w-3.5 h-3.5 text-[#f4e059]" />
                      Add to Play Queue
                    </button>
                    <Link
                      to={`/playlists`}
                      onClick={() => setShowAddMenu(false)}
                      className="w-full text-left px-3 py-1.5 rounded-lg text-xs text-white hover:bg-white/10 flex items-center gap-2"
                    >
                      <Plus className="w-3.5 h-3.5 text-[#f4e059]" />
                      Save to Playlist
                    </Link>
                  </div>
                )}
              </div>

              {/* ⬇ Download Button */}
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-text-secondary hover:text-white text-[10px] sm:text-[11px] font-medium transition-colors shrink-0"
              >
                {downloading ? (
                  <Loader2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 animate-spin text-[#f4e059]" />
                ) : (
                  <Download className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#f4e059]" />
                )}
                <span>{mix.isExclusive ? 'VIP' : 'Download'}</span>
              </button>
            </div>

            {/* Right Stats & Real Reaction Controls */}
            <div className="flex items-center gap-3 sm:gap-4 text-[11px] text-text-muted font-mono">
              <span>on {formatDate(mix.createdAt)}</span>

              {/* Plays */}
              <span className="flex items-center gap-1 text-text-secondary" title="Total Plays">
                <Eye className="w-3.5 h-3.5 text-text-muted" />
                {mix.plays?.toLocaleString() || 0}
              </span>

              {/* Downloads */}
              <span className="flex items-center gap-1 text-text-secondary" title="Downloads">
                <Download className="w-3.5 h-3.5 text-text-muted" />
                {downloadsCount}
              </span>

              {/* Interactive Emoji Reaction Trigger Button */}
              <div className="relative">
                <button
                  onClick={() => setShowReactionPicker((prev) => !prev)}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-white/[0.08] text-text-secondary hover:text-white transition-colors"
                  title="Drop emoji reaction at current timestamp"
                >
                  <span>🔥</span>
                  <span className="text-[10px] font-bold">React</span>
                </button>

                {showReactionPicker && (
                  <div className="absolute right-0 bottom-full mb-1 flex items-center gap-1.5 p-1.5 rounded-full bg-[#181818] border border-white/20 shadow-2xl z-30 animate-in fade-in zoom-in-95">
                    {['🔥', '❤️', '⚡', '🙌', '💥', '👑'].map((emoji) => (
                      <button
                        key={emoji}
                        onClick={(e) => handleAddReaction(emoji, e)}
                        className="w-7 h-7 rounded-full hover:scale-125 transition-transform flex items-center justify-center text-sm"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Likes */}
              <button
                onClick={handleLike}
                className="flex items-center gap-1 hover:text-white transition-colors"
                title="Like Mix"
              >
                <Heart className={cn('w-3.5 h-3.5', liked ? 'text-red-500 fill-red-500' : 'text-text-muted')} />
                {likesCount}
              </button>

              {/* Re-ups */}
              <button
                onClick={handleReup}
                className="flex items-center gap-1 hover:text-white transition-colors"
                title="Re-up Mix"
              >
                <Repeat2 className={cn('w-3.5 h-3.5', reupped ? 'text-green-400' : 'text-text-muted')} />
                {reupsCount}
              </button>

              {/* Charts Link */}
              <Link to="/rankings" title="View Chart Rankings">
                <LineChart className="w-3.5 h-3.5 text-[#f4e059] hover:scale-110 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
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
  const [liked, setLiked] = useState(false);
  const { mutate: likeMix } = useLikeMix();
  const { isAuthenticated } = useAuthStore();

  const handleLike = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setLiked((prev) => !prev);
    if (isAuthenticated) likeMix(mix.id);
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
          <Link to={`/mix/${mix.id}`}>
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
              <span className="text-[9px] px-1 py-0.2 rounded bg-[#f4e059]/15 text-[#f4e059] font-bold border border-[#f4e059]/30">PRO</span>
            )}
          </p>
        </div>
      </div>

      {/* Metadata & Actions Footer */}
      <div className="pt-3 mt-3 border-t border-white/[0.04] flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-[10px] text-text-muted font-mono">
          <span>{formatCompact(mix.plays || 0)} plays</span>
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
  const [liked, setLiked] = useState(false);
  const { mutate: likeMix } = useLikeMix();
  const { isAuthenticated } = useAuthStore();

  const handleLike = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setLiked((prev) => !prev);
    if (isAuthenticated) likeMix(mix.id);
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
          to={`/mix/${mix.id}`}
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
            <span className="text-[8px] px-1 rounded bg-[#f4e059]/20 text-[#f4e059] font-bold">PRO</span>
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
        {formatCompact(mix.plays || 0)} plays
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

/* ═══════════════════════════ MAIN MIX HUB PAGE ═══════════════════════════ */
export default function MixHub() {
  const { user } = useAuthStore();
  const { currentTrack, isPlaying, play, pause, setQueue, currentTime, setCurrentTime } = usePlayerStore();

  const [activeGenre, setActiveGenre] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState<'waveform' | 'grid' | 'list'>('waveform');
  const [page, setPage] = useState(1);

  // Modals state
  const [promoteModalMix, setPromoteModalMix] = useState<MixTrack | null>(null);
  const [subscribeModalDj, setSubscribeModalDj] = useState<any | null>(null);
  const [embedModalMix, setEmbedModalMix] = useState<MixTrack | null>(null);
  const [downloadModalData, setDownloadModalData] = useState<{ mix: any; mode: 'auth' | 'subscribe' | 'repost' | 'follow' } | null>(null);

  const [officialPlaylists, setOfficialPlaylists] = useState<any[]>([]);
  const [playlistsLoading, setPlaylistsLoading] = useState(true);

  useEffect(() => {
    const fetchPlaylists = async () => {
      try {
        setPlaylistsLoading(true);
        const res = await api.get('/official-playlists');
        if (res.data.success) {
          setOfficialPlaylists(res.data.data || []);
        }
      } catch (err) {
        console.error('Failed to load official playlists', err);
      } finally {
        setPlaylistsLoading(false);
      }
    };
    fetchPlaylists();
  }, []);

  // Sync URL genre param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const rawParam = params.get('genre') || params.get('category');
    if (rawParam) {
      const normalized = rawParam.replace(/-/g, ' ').toLowerCase();
      const matched = GENRES.find((g) => g.toLowerCase() === normalized);
      setActiveGenre(matched || rawParam);
    }
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (activeGenre === 'all') {
      url.searchParams.delete('genre');
      url.searchParams.delete('category');
    } else {
      url.searchParams.set('genre', activeGenre);
    }
    window.history.replaceState({}, '', url.toString());
  }, [activeGenre]);

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
  const latest = useMemo(() => (latestData?.data || []).map(toMixTrack), [latestData]);

  const allMixesForRank = useMemo(() => {
    const combined = [...trending, ...latest];
    return combined.filter((m, idx, arr) => arr.findIndex((x) => x.id === m.id) === idx);
  }, [trending, latest]);

  const genreRanks = useMemo(() => computeGenreRanks(allMixesForRank), [allMixesForRank]);

  // Handle Play
  const handlePlay = useCallback(
    (mix: MixTrack) => {
      if (currentTrack?.id === mix.id) {
        if (isPlaying) pause();
        else play();
        return;
      }
      const allVisible = [...trending, ...latest];
      const uniqueQueue = allVisible.filter((t, i, arr) => arr.findIndex((x) => x.id === t.id) === i);
      setQueue(uniqueQueue);
      play(mix);
    },
    [currentTrack, isPlaying, trending, latest, play, pause, setQueue]
  );

  // Handle Waveform Seek
  const handleSeek = useCallback(
    (mix: MixTrack, seekSeconds: number) => {
      if (currentTrack?.id !== mix.id) {
        handlePlay(mix);
      }
      setCurrentTime(seekSeconds);
      const audioEl = document.querySelector('audio');
      if (audioEl) audioEl.currentTime = seekSeconds;
    },
    [currentTrack, handlePlay, setCurrentTime]
  );

  // Handle Shuffle Play
  const handleShufflePlay = useCallback(() => {
    const allVisible = [...trending, ...latest];
    if (allVisible.length === 0) return;
    const shuffled = [...allVisible].sort(() => Math.random() - 0.5);
    setQueue(shuffled);
    play(shuffled[0]);
  }, [trending, latest, setQueue, play]);

  const featuredMix = trending[0] || latest[0];
  const isDj = user?.role === 'DJ' || (user as any)?.djProfile;

  return (
    <div className="min-h-screen bg-[#080808] text-text-primary pb-32">
      {/* ─── 🎧 SPOTIFY / APPLE MUSIC SPOTLIGHT HERO ─── */}
      <section className="relative overflow-hidden border-b border-white/[0.06] bg-gradient-to-b from-[#141412] via-[#0A0A0A] to-[#080808] pt-6 pb-10 sm:pt-10 sm:pb-14">
        {/* Subtle Ambient Radial Glow */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#f4e059]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-12 gap-8 items-center">
            {/* Left Hero Content */}
            <div className="lg:col-span-7 space-y-4">
              <h1 className="font-display text-3xl sm:text-5xl font-black uppercase tracking-tight text-white leading-none">
                Experience Sierra Leone's <span className="text-[#f4e059]">Finest DJ Sets</span>
              </h1>

              <p className="text-sm text-text-secondary max-w-xl">
                Stream non-stop Afrobeats, Amapiano, Dancehall, Hip-Hop, and traditional Salone sounds curated and uploaded daily by verified DJs.
              </p>

              {/* Search Bar */}
              <div className="pt-2 max-w-lg">
                <div className="relative flex items-center">
                  <Search className="w-4 h-4 text-text-muted absolute left-3.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setPage(1);
                    }}
                    placeholder="Search by mix title, DJ name, or genre..."
                    className="w-full h-11 pl-10 pr-10 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder:text-text-muted focus:outline-none focus:border-[#f4e059] focus:bg-black transition-all"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3.5 text-xs text-text-muted hover:text-white font-bold"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

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

                {isDj && (
                  <Link
                    to="/dashboard/mixes"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#f4e059] text-black font-bold text-xs uppercase tracking-wider hover:brightness-110 transition-all shadow"
                  >
                    <Upload className="w-4 h-4" />
                    Upload Set
                  </Link>
                )}
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
                      {formatCompact(featuredMix.plays || 0)} plays
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

      {/* ─── 🎵 OFFICIAL CURATED PLAYLISTS SECTION ─── */}
      {(playlistsLoading || officialPlaylists.length > 0) && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-10">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#f4e059]/10 flex items-center justify-center border border-[#f4e059]/30">
                <ListMusic className="w-4 h-4 text-[#f4e059]" />
              </div>
              <div>
                <h2 className="font-display text-lg sm:text-xl font-bold uppercase tracking-tight text-white">
                  Official Playlists
                </h2>
                <p className="text-xs text-text-muted">Curated by Deck Salone team & moderators</p>
              </div>
            </div>

            <Link
              to="/playlists"
              className="inline-flex items-center gap-1 text-xs font-bold uppercase text-[#f4e059] hover:underline"
            >
              See All Playlists <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {playlistsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-[#f4e059] animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {officialPlaylists.slice(0, 3).map((pl: any) => (
                <Link key={pl.id} to={`/playlist/${pl.slug || pl.id}`}>
                  <div className="group rounded-2xl bg-[#121110] border border-white/[0.06] hover:border-[#f4e059]/40 p-4 transition-all hover:bg-[#161413] h-full flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="relative aspect-video rounded-xl bg-black overflow-hidden">
                        {pl.coverImage ? (
                          <img
                            src={getMediaUrl(pl.coverImage)}
                            alt={pl.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#f4e059]/20 via-[#111] to-black">
                            <ListMusic className="w-8 h-8 text-[#f4e059] mb-1" />
                            <span className="text-[10px] text-[#f4e059] font-bold uppercase tracking-widest">
                              Deck Salone
                            </span>
                          </div>
                        )}
                        {pl.isFeatured && (
                          <span className="absolute top-2 left-2 bg-[#f4e059] text-black font-black text-[9px] px-2 py-0.5 rounded shadow">
                            ★ FEATURED
                          </span>
                        )}
                      </div>

                      <div>
                        <h3 className="text-sm font-bold text-white uppercase group-hover:text-[#f4e059] transition-colors truncate">
                          {pl.title}
                        </h3>
                        <p className="text-xs text-text-secondary line-clamp-2 mt-1">
                          {pl.description || 'Official Deck Salone curated playlist.'}
                        </p>
                      </div>
                    </div>

                    <div className="pt-3 mt-3 border-t border-white/[0.04] flex items-center justify-between text-xs text-text-muted">
                      <span className="flex items-center gap-1 font-mono text-[11px]">
                        <Music className="w-3 h-3 text-[#f4e059]" />
                        {pl._count?.items || pl.items?.length || 0} Mixes
                      </span>
                      <span className="text-xs font-bold text-[#f4e059]">Open Playlist →</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ─── 🎛️ GENRE CAPSULES & CONTROLS BAR ─── */}
      <section className="sticky top-16 lg:top-20 z-20 bg-[#080808]/95 backdrop-blur-xl border-y border-white/[0.06] my-10 py-3">
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
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  setPage(1);
                }}
                className="h-9 rounded-xl bg-white/[0.04] border border-white/[0.08] px-3 text-xs font-bold text-text-primary outline-none focus:border-[#f4e059]"
                aria-label="Sort mixes"
              >
                <option value="newest" className="bg-[#111] text-white">
                  ✨ Newest Uploads
                </option>
                <option value="plays" className="bg-[#111] text-white">
                  🔥 Most Streamed
                </option>
                <option value="downloads" className="bg-[#111] text-white">
                  ⬇ Most Downloaded
                </option>
                <option value="likes" className="bg-[#111] text-white">
                  ♡ Most Liked
                </option>
              </select>

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
            <p className="text-xs text-text-muted">
              Showing {latest.length} mix sets {activeGenre !== 'all' ? `in ${activeGenre}` : ''}
            </p>
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

        {/* Loading Spinner */}
        {latestLoading && page === 1 ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-[#f4e059] animate-spin" />
          </div>
        ) : viewMode === 'waveform' ? (
          /* 1. Full Waveform Cards (Matching User Reference Image) */
          <div className="space-y-4">
            {latest.map((mix: MixTrack, i: number) => {
              const rank = genreRanks[mix.id] || (page - 1) * 16 + (i + 1);
              const isOwner = !!(user && ((user as any)?.djProfile?.id === mix.djId || user.id === mix.djId));

              return (
                <MixReleaseWaveformCard
                  key={mix.id}
                  mix={mix}
                  rank={rank}
                  onPlay={handlePlay}
                  isCurrent={currentTrack?.id === mix.id}
                  isPlaying={isPlaying}
                  currentTime={currentTime}
                  onSeek={(seekSec) => handleSeek(mix, seekSec)}
                  onOpenPromote={(m) => setPromoteModalMix(m)}
                  onOpenSubscribe={(m) =>
                    setSubscribeModalDj({
                      id: m.djId,
                      stageName: m.dj,
                      avatar: m.djAvatar || m.cover,
                      subscriptionPrice: m.subscriptionPrice || 100,
                    })
                  }
                  onOpenEmbed={(m) => setEmbedModalMix(m)}
                  onOpenDownloadAuth={(m) => setDownloadModalData({ mix: m, mode: 'auth' })}
                  onOpenDownloadSubscribe={(m) => setDownloadModalData({ mix: m, mode: 'subscribe' })}
                  onOpenDownloadRepost={(m) => setDownloadModalData({ mix: m, mode: 'repost' })}
                  onOpenDownloadFollow={(m) => setDownloadModalData({ mix: m, mode: 'follow' })}
                  isOwner={!!isOwner}
                />
              );
            })}
          </div>
        ) : viewMode === 'grid' ? (
          /* 2. Grid Cards (Spotify & Audiomack 4-Column Grid) */
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
            {latest.map((mix: MixTrack, i: number) => {
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
                    setSubscribeModalDj({
                      id: m.djId,
                      stageName: m.dj,
                      avatar: m.djAvatar || m.cover,
                      subscriptionPrice: m.subscriptionPrice || 100,
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

            {latest.map((mix: MixTrack, i: number) => (
              <MixTracklistRow
                key={mix.id}
                mix={mix}
                index={i}
                onPlay={handlePlay}
                isCurrent={currentTrack?.id === mix.id}
                isPlaying={isPlaying}
                genreRank={genreRanks[mix.id]}
                onOpenSubscribe={(m) =>
                  setSubscribeModalDj({
                    id: m.djId,
                    stageName: m.dj,
                    avatar: m.djAvatar || m.cover,
                    subscriptionPrice: m.subscriptionPrice || 100,
                  })
                }
              />
            ))}
          </div>
        )}

        {/* Empty State */}
        {latest.length === 0 && !latestLoading && (
          <div className="rounded-3xl border border-white/[0.06] bg-[#101010] p-12 text-center max-w-lg mx-auto my-8">
            <Radio className="w-12 h-12 text-[#f4e059] mx-auto mb-3 opacity-60" />
            <h3 className="text-base font-bold text-white uppercase">No mixes found</h3>
            <p className="text-xs text-text-muted mt-1">
              {searchQuery ? `No results matching "${searchQuery}".` : 'Be the first DJ to upload a mix in this genre!'}
            </p>
            {isDj && (
              <Link
                to="/dashboard/mixes"
                className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 bg-[#f4e059] text-black font-bold text-xs uppercase rounded-full shadow-lg"
              >
                <Upload className="w-4 h-4" /> Upload Now
              </Link>
            )}
          </div>
        )}

        {/* Pagination Load More */}
        {(latestData?.meta?.totalPages || 0) > page && (
          <div className="flex justify-center mt-10">
            <button
              onClick={() => setPage((p) => p + 1)}
              className="px-8 py-3 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-white text-xs font-bold uppercase rounded-full hover:border-[#f4e059] transition-all"
            >
              Load More Releases
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
      {subscribeModalDj && (
        <DjFanSubscribeModal
          isOpen={!!subscribeModalDj}
          onClose={() => setSubscribeModalDj(null)}
          dj={subscribeModalDj}
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
                  subscriptionPrice: 50,
                },
              }
            : null
        }
        onOpenDjSubscribe={(dj) => setSubscribeModalDj(dj)}
      />
    </div>
  );
}
