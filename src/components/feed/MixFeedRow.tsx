import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  Heart,
  Clock,
  Eye,
  Download,
  Flame,
  Plus,
  Code2,
  Rocket,
  Lock,
  ListMusic,
  MessageSquare,
  Edit2,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { usePlayerStore, type MixTrack } from '@/stores/playerStore';
import { useLikeMix, useMixLike } from '@/hooks/useMixes';
import { WaveformPlayer } from '@/components/WaveformPlayer';
import { cn } from '@/lib/utils';
import api, { getMediaUrl, downloadMixFile } from '@/lib/api';
import { toast } from 'sonner';
import MixDownloadModal from '@/components/MixDownloadModal';
import ShareButton from '@/components/ShareButton';
import { ReupButton } from '@/components/ReupButton';
import { RepostButton } from '@/components/RepostButton';
import { getMixUrl, getMixShareUrl } from '@/lib/slug';
import MixComments from '@/components/MixComments';
import { formatCompactNumber } from '@/lib/formatting';
import type { FeedMix } from './types';
import { getApiErrorMessage } from '@/lib/apiErrors';
import { isAdminRole } from '@/constants/roles';

interface MixFeedRowProps {
  mix: FeedMix;
  index?: number;
  rank?: number;
  variant?: 'waveform' | 'compact';
  onOpenPromote?: (mix: any) => void;
  onOpenEmbed?: (mix: any) => void;
  onOpenDjSupport?: (dj: any) => void;
}

function formatDuration(seconds = 0) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatDate(d?: string) {
  if (!d) return '';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '';
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `on ${day}.${month}.${year}`;
}

export default function MixFeedRow({
  mix,
  index = 0,
  rank,
  variant = 'waveform',
  onOpenPromote,
  onOpenEmbed,
  onOpenDjSupport,
}: MixFeedRowProps) {
  const { user, isAuthenticated } = useAuthStore();
  const { currentTrack, isPlaying, currentTime, play, pause, setCurrentTime, addToQueue } = usePlayerStore();
  const { mutate: likeMix } = useLikeMix();

  const { data: likeState } = useMixLike(mix.id, mix.likes || 0);
  const liked = likeState?.liked ?? false;
  const likesCount = likeState?.likes ?? mix.likes ?? 0;
  const [downloadsCount, setDownloadsCount] = useState<number>(mix.downloads || 0);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [userReactions, setUserReactions] = useState<{ pos: number; emoji: string }[]>([]);
  const [downloadModalMode, setDownloadModalMode] = useState<'auth' | 'subscribe' | 'repost' | 'follow' | null>(null);

  const cover = getMediaUrl(mix.coverImage || mix.cover || mix.dj?.avatar) || '/mix-placeholder.jpg';
  const djName = mix.dj?.stageName || (typeof mix.dj === 'string' ? mix.dj : '') || mix.djName || (mix as any).djProfile?.stageName || (mix as any).dj?.user?.name || (mix as any).dj?.user?.username || 'DJ Fredmax';
  const genre = mix.genre || mix.category || 'Afrobeats';
  const isCurrent = currentTrack?.id === mix.id;
  const isOwner = Boolean(user?.id && mix.dj?.userId === user.id);
  const isProDj = mix.dj?.subscriptionTier === 'pro' || mix.dj?.subscriptionTier === 'legend' || mix.djTier === 'pro';
  const isDjUser = isAdminRole(user?.role) || user?.role === 'DJ' || Boolean(user?.djProfile);

  const convertedTrack: MixTrack = {
    id: mix.id,
    title: mix.title,
    dj: djName,
    duration: mix.duration || 0,
    cover,
    genre,
    audioUrl: mix.audioUrl,
    audioSource: mix.audioSource,
    originalUrl: mix.originalUrl,
    plays: mix.plays || 0,
    djTier: mix.dj?.subscriptionTier || mix.djTier,
    isExclusive: mix.isExclusive,
  };

  const handlePlay = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (mix.isExclusive && !isOwner) {
        if (onOpenDjSupport) onOpenDjSupport(mix.dj);
        return;
      }
      if (isCurrent) {
        if (isPlaying) pause();
        else play();
        return;
      }
      play(convertedTrack);
    },
    [convertedTrack, isCurrent, isPlaying, mix.isExclusive, isOwner, onOpenDjSupport, pause, play]
  );

  const handleSeek = (time: number) => {
    if (!isCurrent) {
      play(convertedTrack, time);
    } else {
      setCurrentTime(time);
    }
  };

  const handleLike = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!isAuthenticated) {
        toast.info('Sign in to like mixes');
        return;
      }
      likeMix(mix.id);
    },
    [mix.id, isAuthenticated, likeMix]
  );

  const handleAddReaction = (emoji: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const duration = mix.duration || 1;
    const pos = isCurrent && duration > 0 ? Math.min(1, Math.max(0.01, currentTime / duration)) : 0.5;
    setUserReactions((prev) => [...prev, { pos, emoji }]);
    setShowReactionPicker(false);
    api.post(`/mixes/${mix.id}/reactions`, { emoji, timestamp: currentTime, position: pos }).catch(() => {});
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      setDownloadModalMode('auth');
      return;
    }

    try {
      toast.info(`Preparing download for "${mix.title}"...`);
      const res = await api.post(`/mixes/${mix.id}/download`);
      if (res.data.success) {
        setDownloadsCount((c: number) => c + 1);
        const downloadEndpoint = res.data.downloadUrl || `/api/mixes/${mix.id}/download-file`;
        await downloadMixFile(downloadEndpoint, res.data.directAudioUrl, `${mix.title}.mp3`);
        toast.success(`Download started! Enjoy the mix.`);
      }
    } catch (err: any) {
      if (err.response?.status === 403) {
        if (err.response?.data?.requiresRepost) {
          setDownloadModalMode('repost');
        } else if (err.response?.data?.requiresFollow) {
          setDownloadModalMode('follow');
        } else if (err.response?.data?.requiresSubscription) {
          setDownloadModalMode('subscribe');
        } else {
          toast.error(getApiErrorMessage(err, 'Download failed. Please check your subscription.'));
        }
      } else if (err.response?.status === 401) {
        setDownloadModalMode('auth');
      } else {
        toast.error(getApiErrorMessage(err, 'Download failed. Please check your subscription.'));
      }
    }
  };

  /* ═══════════════════════════════════════════════════════════════════════
     COMPACT LIST VARIANT (MATCHING USER REFERENCE IMAGE 1 "TRENDING NOW")
     ═══════════════════════════════════════════════════════════════════════ */
  if (variant === 'compact') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.02 }}
        onClick={handlePlay}
        className={cn(
          'flex items-center justify-between gap-3 sm:gap-4 p-2.5 sm:p-3.5 rounded-2xl transition-all cursor-pointer border group',
          isCurrent
            ? 'bg-gold/10 border-gold/40 text-white shadow-lg shadow-gold/10'
            : 'bg-[#121110] hover:bg-[#181818] border-dark-gray hover:border-white/10'
        )}
      >
        <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
          <button
            onClick={handlePlay}
            aria-label={isCurrent && isPlaying ? 'Pause' : 'Play'}
            className={cn(
              'btn-press w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 transition-transform shadow-md',
              isCurrent && isPlaying
                ? 'bg-gold text-black scale-105'
                : 'bg-white/[0.08] group-hover:bg-gold text-white group-hover:text-black group-hover:scale-105'
            )}
          >
            {isCurrent && isPlaying ? (
              <Pause className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 fill-current ml-0.5" />
            )}
          </button>

          <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-xl overflow-hidden shrink-0 bg-black shadow">
            <img src={cover} alt={mix.title} className="w-full h-full object-cover" loading="lazy" />
            {rank && (
              <span className="absolute top-0 left-0 text-[9px] font-black px-1 rounded-br bg-gold text-black">
                #{rank}
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <Link
              to={getMixUrl(mix as any)}
              onClick={(e) => e.stopPropagation()}
              className="font-display text-xs sm:text-sm font-bold uppercase tracking-tight text-white hover:text-gold transition-colors truncate block"
            >
              {mix.title}
            </Link>
            <p className="text-[11px] text-text-secondary truncate mt-0.5 flex items-center gap-1">
              <span>{djName}</span>
              <span className="text-gold text-[10px]">✓</span>
            </p>
          </div>
        </div>

        <div className="hidden md:block shrink-0">
          <span className="text-[10px] font-semibold text-text-secondary px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.06]">
            {genre}
          </span>
        </div>

        <div className="flex items-center gap-3 sm:gap-4 shrink-0 text-xs font-mono text-text-muted">
          <span className="hidden sm:inline-flex items-center gap-1">
            <Eye className="w-3.5 h-3.5" />
            {formatCompactNumber(mix.plays)}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 hidden sm:inline" />
            {formatDuration(mix.duration)}
          </span>
          <button
            onClick={handleLike}
            className="btn-press p-1.5 rounded-full hover:bg-white/[0.08] transition-colors"
          >
            <Heart className={cn('w-3.5 h-3.5', liked ? 'text-red-500 fill-red-500' : 'text-text-muted')} />
          </button>
        </div>
      </motion.div>
    );
  }

  /* ═══════════════════════════════════════════════════════════════════════
     WAVEFORM CARD VARIANT (MATCHING USER REFERENCE IMAGE 2 "MIX HUB CARD")
     ═══════════════════════════════════════════════════════════════════════ */
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className={cn(
        'group relative rounded-2xl sm:rounded-3xl border p-3.5 sm:p-5 transition-all overflow-hidden',
        isCurrent
          ? 'bg-gradient-to-r from-[#1c180f] via-[#141412] to-[#121210] border-gold/40 shadow-xl shadow-gold/10'
          : 'bg-[#121110] hover:bg-[#161413] border-white/[0.08] hover:border-white/[0.15]'
      )}
    >
      {/* Warm ambient background */}
      <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-gold/5 via-transparent to-transparent pointer-events-none" />

      <div className="relative flex flex-col sm:flex-row sm:items-stretch gap-3.5 sm:gap-5">
        {/* ─── DESKTOP ONLY: FULL HEIGHT COVER ARTWORK ON LEFT ─── */}
        <div className="hidden sm:block relative sm:w-28 sm:h-28 md:w-32 md:h-32 lg:w-36 lg:h-36 rounded-2xl overflow-hidden bg-black shrink-0 shadow-2xl">
          <img
            src={cover}
            alt={mix.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />

          {/* Corner Rank Badge */}
          {rank !== undefined && (
            <div
              className={cn(
                'absolute top-0 left-0 px-2 py-0.5 rounded-br-lg text-[10px] sm:text-xs font-black tracking-tighter shadow-md z-10 flex items-center gap-0.5',
                rank === 1
                  ? 'bg-gold text-black'
                  : rank === 2
                  ? 'bg-amber-400 text-black'
                  : rank === 3
                  ? 'bg-amber-500 text-black'
                  : 'bg-black/90 text-gold border-r border-b border-gold/40'
              )}
            >
              <span>#{rank}</span>
            </div>
          )}

          {mix.isExclusive && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex flex-col items-center justify-center p-2 text-center">
              <Lock className="w-5 h-5 text-gold mb-0.5" />
              <span className="text-[8px] font-black uppercase text-gold tracking-wider">
                VIP
              </span>
            </div>
          )}
        </div>

        {/* ─── RIGHT CONTAINER (DESKTOP) / MAIN CONTAINER (MOBILE) ─── */}
        <div className="min-w-0 flex-1 flex flex-col justify-between gap-2.5 sm:gap-3">
          {/* ─── TOP HEADER: (MOBILE INCLUDES COVER) + TRACK INFO & PLAY BUTTON ─── */}
          <div className="flex items-center sm:items-start gap-3 sm:gap-4">
            {/* ─── MOBILE ONLY: COMPACT COVER ON LEFT ─── */}
            <div className="sm:hidden relative w-16 h-16 min-w-[4rem] min-h-[4rem] max-w-[4rem] max-h-[4rem] rounded-xl overflow-hidden bg-black shrink-0 shadow-xl aspect-square">
              <img
                src={cover}
                alt={mix.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                loading="lazy"
              />

              {rank !== undefined && (
                <div
                  className={cn(
                    'absolute top-0 left-0 px-1.5 py-0.5 rounded-br-lg text-[9px] font-black tracking-tighter shadow-md z-10',
                    rank === 1
                      ? 'bg-gold text-black'
                      : rank === 2
                      ? 'bg-amber-400 text-black'
                      : rank === 3
                      ? 'bg-amber-500 text-black'
                      : 'bg-black/90 text-gold border-r border-b border-gold/40'
                  )}
                >
                  #{rank}
                </div>
              )}

              {mix.isExclusive && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex flex-col items-center justify-center p-1 text-center">
                  <Lock className="w-4 h-4 text-gold mb-0.5" />
                  <span className="text-[7px] font-black uppercase text-gold">
                    VIP
                  </span>
                </div>
              )}
            </div>

            {/* PLAY BUTTON, DJ, TITLE */}
            <div className="min-w-0 flex-1 flex items-center gap-2.5 sm:gap-3.5">
              <button
                onClick={handlePlay}
                aria-label={isCurrent && isPlaying ? 'Pause' : 'Play'}
                className={cn(
                  'btn-press w-9 h-9 sm:w-11 sm:h-11 md:w-12 md:h-12 rounded-full flex items-center justify-center border transition-all shrink-0 shadow-lg',
                  isCurrent && isPlaying
                    ? 'bg-gold text-black border-gold scale-105'
                    : 'bg-black/60 hover:bg-gold text-white hover:text-black border-white/80 hover:border-gold hover:scale-105'
                )}
              >
                {isCurrent && isPlaying ? (
                  <Pause className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
                ) : (
                  <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current ml-0.5" />
                )}
              </button>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-xs text-text-secondary flex-wrap">
                  {mix.dj?.id || (mix as any).djId || djName ? (
                    <Link
                      to={`/dj/${(mix.dj as any)?.username || mix.dj?.id || (mix as any).djId || mix.dj?.stageName || djName}`}
                      className="font-semibold text-white hover:text-gold hover:underline transition-colors truncate"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {djName}
                    </Link>
                  ) : (
                    <span className="font-semibold text-white">
                      {djName}
                    </span>
                  )}
                  <span className="inline-flex items-center text-gold" title="Verified DJ">
                    ✓
                  </span>
                  {isProDj && (
                    <span className="text-[8px] uppercase font-black px-1.5 py-0.2 rounded bg-gold/20 text-gold border border-gold/30 shadow-sm">
                      PRO
                    </span>
                  )}
                </div>

                <div className="flex items-baseline gap-2 mt-0.5">
                  <Link to={getMixUrl(mix as any)}>
                    <h3 className="font-display text-xs sm:text-base md:text-lg font-bold text-white uppercase tracking-tight truncate hover:text-gold transition-colors">
                      {mix.title}
                    </h3>
                  </Link>
                  <span className="text-[9px] sm:text-[10px] font-mono text-text-muted hidden sm:inline">
                    320kbit/s
                  </span>
                </div>
              </div>
            </div>

            {/* GENRE & DURATION */}
            <div className="text-right shrink-0">
              <div className="text-[10px] sm:text-xs font-semibold text-text-primary uppercase tracking-tight">
                {genre}
              </div>
              <div className="text-[9px] sm:text-xs font-mono text-text-muted mt-0.5">
                {formatDuration(mix.duration)}
              </div>
            </div>
          </div>

          {/* ─── WAVEFORM DISPLAY ─── */}
          <div className="w-full py-0.5">
            <WaveformPlayer
              trackId={mix.id}
              isCurrent={isCurrent}
              duration={mix.duration}
              currentTime={currentTime}
              onSeek={handleSeek}
              reactions={userReactions}
            />
          </div>

        {/* ─── BOTTOM ACTION & STATS ROW ─── */}
        <div className="pt-2 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Left Action Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-nowrap overflow-x-auto scrollbar-hide py-0.5">
            {/* If DJ Owner: Show Edit & Reach more listeners! / Promote */}
            {user && ((user as any)?.djProfile?.id === (mix.dj?.id || (mix as any).djId) || user.id === (mix.dj?.id || (mix as any).djId) || user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') ? (
              <div className="flex items-center gap-1.5 shrink-0">
                <Link
                  to={`/dashboard/mixes/${mix.id}/edit`}
                  className="w-7 h-7 rounded-full bg-gold text-black flex items-center justify-center hover:brightness-110 shadow shrink-0 active:scale-95 transition-all"
                  title="Edit Your Mix"
                >
                  <Edit2 className="w-3 h-3" />
                </Link>
                <button
                  onClick={() => (onOpenPromote ? onOpenPromote(convertedTrack) : null)}
                  className="inline-flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-gold hover:brightness-110 text-black font-bold text-[10px] sm:text-[11px] uppercase tracking-wider shadow-md shadow-gold/20 active:scale-95 transition-all shrink-0"
                  title="Reach more listeners"
                >
                  <Rocket className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Reach more listeners!</span>
                  <span className="sm:hidden">Promote</span>
                </button>
              </div>
            ) : (
              /* If regular user / listener: Show Comment button dropdown toggle */
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowComments((prev) => !prev);
                }}
                className={cn(
                  'inline-flex items-center justify-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full font-bold text-[10px] sm:text-[11px] uppercase tracking-wider border shadow-sm active:scale-95 transition-all shrink-0',
                  showComments
                    ? 'bg-gold text-black border-gold'
                    : 'bg-white/[0.08] hover:bg-gold text-white hover:text-black border-white/10 hover:border-gold'
                )}
                title={showComments ? 'Hide Comments' : 'Comment on this mix'}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{showComments ? 'Hide Comments' : 'Comment'}</span>
                <span className="sm:hidden">{showComments ? 'Hide' : 'Comment'}</span>
              </button>
            )}

            {/* </> Embed */}
            <button
              onClick={() => (onOpenEmbed ? onOpenEmbed(convertedTrack) : null)}
              className="btn-press inline-flex items-center justify-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-text-secondary hover:text-white text-[10px] sm:text-[11px] font-medium transition-colors shrink-0"
              title="Embed"
            >
              <Code2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Embed</span>
            </button>

              {/* + Add Dropdown */}
              <div className="relative shrink-0">
                <button
                  onClick={() => setShowAddMenu((prev) => !prev)}
                  className="btn-press inline-flex items-center justify-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-text-secondary hover:text-white text-[10px] sm:text-[11px] font-medium transition-colors"
                  title="Add"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Add ▾</span>
                </button>

                {showAddMenu && (
                  <div className="absolute left-0 bottom-full mb-1 w-44 rounded-xl bg-[#1a1a1a] border border-white/10 shadow-2xl p-1.5 z-30 space-y-1">
                    <button
                      onClick={() => {
                        addToQueue(convertedTrack);
                        setShowAddMenu(false);
                      }}
                      className="w-full text-left px-3 py-1.5 rounded-lg text-xs text-white hover:bg-white/10 flex items-center gap-2"
                    >
                      <ListMusic className="w-3.5 h-3.5 text-gold" />
                      Add to Play Queue
                    </button>
                    {isDjUser && (
                      <ReupButton
                        mixId={mix.id}
                        size="sm"
                        showCount={false}
                        className="w-full text-left px-3 py-1.5 rounded-lg text-xs text-white hover:bg-white/10 flex items-center gap-2"
                      />
                    )}
                  </div>
                )}
              </div>

              {/* ⬇ Download */}
              <button
                onClick={handleDownload}
                className="btn-press inline-flex items-center justify-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-text-secondary hover:text-white text-[10px] sm:text-[11px] font-medium transition-colors shrink-0"
                title="Download"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Download</span>
              </button>
            </div>

            {/* Right Side: Date, Views, Downloads, Reactions, Likes, Share */}
            <div className="flex items-center gap-2.5 sm:gap-4 font-mono text-[11px] text-text-muted shrink-0">
              {mix.createdAt && (
                <span className="hidden md:inline text-text-muted/70">{formatDate(mix.createdAt)}</span>
              )}

              {/* Views */}
              <span className="flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" />
                <span>{mix.plays || 0}</span>
              </span>

              {/* Downloads count */}
              <span className="flex items-center gap-1">
                <Download className="w-3.5 h-3.5" />
                <span>{downloadsCount}</span>
              </span>

              {/* 🔥 React Button */}
              <div className="relative">
                <button
                  onClick={() => setShowReactionPicker((prev) => !prev)}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 transition-colors"
                >
                  <Flame className="w-3.5 h-3.5 fill-amber-400" />
                  <span className="font-sans font-bold text-[10px]">React</span>
                </button>

                {showReactionPicker && (
                  <div className="absolute right-0 bottom-full mb-1 flex items-center gap-1.5 p-1.5 rounded-full bg-[#1e1e1e] border border-white/20 shadow-2xl z-30">
                    {['🔥', '💣', '🎧', '⚡', '❤️', '🙌'].map((emoji) => (
                      <button
                        key={emoji}
                        onClick={(e) => handleAddReaction(emoji, e)}
                        className="text-sm p-1 hover:scale-125 transition-transform"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Heart Like */}
              <button
                onClick={handleLike}
                className="btn-press flex items-center gap-1 hover:text-white transition-colors"
              >
                <Heart className={cn('w-3.5 h-3.5', liked ? 'text-red-500 fill-red-500' : '')} />
                <span>{likesCount}</span>
              </button>

              {/* Repost */}
              <RepostButton mixId={mix.id} size="sm" showCount={true} />

              {/* Share */}
              <ShareButton
                url={getMixShareUrl(mix as any)}
                title={mix.title}
                preview={{
                  type: 'mix',
                  title: mix.title,
                  coverImage: cover,
                  djName,
                  genre,
                  plays: mix.plays,
                  duration: mix.duration,
                }}
                size="sm"
                menuPosition="top"
              />
            </div>
          </div>

          {/* ─── INLINE COMMENTS DROPDOWN DRAWER ─── */}
          <AnimatePresence>
            {showComments && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
                className="w-full pt-3 mt-2 border-t border-white/10 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <MixComments
                  mixId={mix.id}
                  djUserId={mix.dj?.id || (mix as any).djId}
                  className="mt-1 pt-1 border-0"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Download Modal (Auth / Subscribe) */}
      <MixDownloadModal
        isOpen={!!downloadModalMode}
        onClose={() => setDownloadModalMode(null)}
        mode={downloadModalMode || 'auth'}
        mix={mix}
        onOpenDjSupport={onOpenDjSupport}
        onActionComplete={() => handleDownload({ stopPropagation: () => {} } as React.MouseEvent)}
      />
    </motion.div>
  );
}
