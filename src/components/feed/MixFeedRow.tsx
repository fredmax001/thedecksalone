import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
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
  Share2,
  Lock,
  ListMusic,
  Check,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { usePlayerStore, type MixTrack } from '@/stores/playerStore';
import { useLikeMix } from '@/hooks/useMixes';
import { WaveformPlayer } from '@/components/WaveformPlayer';
import { cn } from '@/lib/utils';
import api, { getMediaUrl } from '@/lib/api';
import type { FeedMix } from './types';

interface MixFeedRowProps {
  mix: FeedMix;
  index?: number;
  rank?: number;
  variant?: 'waveform' | 'compact';
  onOpenPromote?: (mix: any) => void;
  onOpenEmbed?: (mix: any) => void;
  onOpenSubscribe?: (mix: any) => void;
}

function formatDuration(seconds = 0) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatCompact(n = 0) {
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
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
  onOpenSubscribe,
}: MixFeedRowProps) {
  const { user, isAuthenticated } = useAuthStore();
  const { currentTrack, isPlaying, currentTime, play, pause, setCurrentTime, addToQueue } = usePlayerStore();
  const { mutate: likeMix } = useLikeMix();

  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState<number>(mix.likes || 0);
  const [downloadsCount, setDownloadsCount] = useState<number>(mix.downloads || 0);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [userReactions, setUserReactions] = useState<{ pos: number; emoji: string }[]>([]);
  const [copiedLink, setCopiedLink] = useState(false);

  const cover = getMediaUrl(mix.coverImage || mix.cover || mix.dj?.avatar) || '/mix-placeholder.jpg';
  const djName = mix.dj?.stageName || mix.djName || 'Unknown DJ';
  const genre = mix.genre || mix.category || 'Afrobeats';
  const isCurrent = currentTrack?.id === mix.id;
  const isOwner = Boolean(user?.id && mix.dj?.userId === user.id);
  const isProDj = mix.dj?.subscriptionTier === 'pro' || mix.dj?.subscriptionTier === 'legend' || mix.djTier === 'pro';

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
        if (onOpenSubscribe) onOpenSubscribe(mix);
        return;
      }
      if (isCurrent) {
        if (isPlaying) pause();
        else play();
        return;
      }
      play(convertedTrack);
    },
    [convertedTrack, isCurrent, isPlaying, mix.isExclusive, isOwner, onOpenSubscribe, pause, play]
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
      setLiked((prev) => !prev);
      setLikesCount((prev: number) => (liked ? Math.max(0, prev - 1) : prev + 1));
      if (isAuthenticated) likeMix(mix.id);
    },
    [mix.id, liked, isAuthenticated, likeMix]
  );

  const handleAddReaction = (emoji: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const duration = mix.duration || 1;
    const pos = isCurrent && duration > 0 ? Math.min(1, Math.max(0.01, currentTime / duration)) : 0.5;
    setUserReactions((prev) => [...prev, { pos, emoji }]);
    setShowReactionPicker(false);
    api.post(`/mixes/${mix.id}/reactions`, { emoji, timestamp: currentTime, position: pos }).catch(() => {});
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (mix.isExclusive && !isOwner) {
      if (onOpenSubscribe) onOpenSubscribe(mix);
      return;
    }
    setDownloadsCount((c: number) => c + 1);
    const link = document.createElement('a');
    link.href = `/api/mixes/${mix.id}/download-file`;
    link.setAttribute('download', `${mix.title}.mp3`);
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/mix/${mix.id}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
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
              'w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 transition-transform shadow-md',
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
              to={`/mix/${mix.id}`}
              onClick={(e) => e.stopPropagation()}
              className="font-display text-xs sm:text-sm font-bold uppercase tracking-tight text-white hover:text-gold transition-colors truncate block"
            >
              {mix.title}
            </Link>
            <p className="text-[11px] text-text-secondary truncate mt-0.5 flex items-center gap-1">
              <span>{djName}</span>
              <span className="text-gold text-[10px]">✓</span>
              <span>🇸🇱</span>
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
            {formatCompact(mix.plays)}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 hidden sm:inline" />
            {formatDuration(mix.duration)}
          </span>
          <button
            onClick={handleLike}
            className="p-1.5 rounded-full hover:bg-white/[0.08] transition-colors"
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
      <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-gold/5 via-transparent to-transparent pointer-events-none" />

      <div className="relative flex flex-col md:flex-row items-start md:items-center gap-4 sm:gap-5">
        {/* ─── LEFT: ALBUM ARTWORK + PINNED RANK BADGE ─── */}
        <div className="relative w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-xl sm:rounded-2xl overflow-hidden bg-black shrink-0 shadow-2xl">
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
              <Lock className="w-6 h-6 text-gold mb-1" />
              <span className="text-[9px] font-black uppercase text-gold tracking-wider">
                Subscribers Only
              </span>
            </div>
          )}
        </div>

        {/* ─── MIDDLE & RIGHT: TRACK INFO, WAVEFORM & ACTION BAR ─── */}
        <div className="min-w-0 flex-1 w-full space-y-2.5">
          {/* Header Row: Play Button, DJ, Title, Genre, Duration */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <button
                onClick={handlePlay}
                aria-label={isCurrent && isPlaying ? 'Pause' : 'Play'}
                className={cn(
                  'w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center border transition-all shrink-0 shadow-lg',
                  isCurrent && isPlaying
                    ? 'bg-gold text-black border-gold scale-105'
                    : 'bg-black/60 hover:bg-gold text-white hover:text-black border-white/80 hover:border-gold hover:scale-105'
                )}
              >
                {isCurrent && isPlaying ? (
                  <Pause className="w-5 h-5 fill-current" />
                ) : (
                  <Play className="w-5 h-5 fill-current ml-0.5" />
                )}
              </button>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                  <span className="font-semibold text-white hover:underline cursor-pointer">
                    {djName}
                  </span>
                  <span className="inline-flex items-center text-gold" title="Verified DJ">
                    ✓
                  </span>
                  <span className="text-xs">🇸🇱</span>
                  {isProDj && (
                    <span className="text-[8px] uppercase font-black px-1.5 py-0.2 rounded bg-gold/20 text-gold border border-gold/30 shadow-sm">
                      PRO
                    </span>
                  )}
                </div>

                <div className="flex items-baseline gap-2 mt-0.5">
                  <Link to={`/mix/${mix.id}`}>
                    <h3 className="font-display text-sm sm:text-base font-bold text-white uppercase tracking-tight truncate hover:text-gold transition-colors">
                      {mix.title}
                    </h3>
                  </Link>
                  <span className="text-[10px] font-mono text-text-muted hidden sm:inline">
                    320kbit/s
                  </span>
                </div>
              </div>
            </div>

            <div className="text-right shrink-0">
              <div className="text-xs sm:text-sm font-semibold text-text-primary uppercase tracking-tight">
                {genre}
              </div>
              <div className="text-xs font-mono text-text-muted mt-0.5">
                {formatDuration(mix.duration)}
              </div>
            </div>
          </div>

          {/* Interactive Waveform Display */}
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
              {/* 🚀 REACH MORE LISTENERS */}
              <button
                onClick={() => (onOpenPromote ? onOpenPromote(convertedTrack) : null)}
                className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-gold hover:brightness-110 text-black font-bold text-[10px] sm:text-[11px] uppercase tracking-wider shadow-md shadow-gold/20 active:scale-95 transition-all shrink-0"
              >
                <Rocket className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span className="hidden sm:inline">Reach more listeners!</span>
                <span className="sm:hidden">Promote</span>
              </button>

              {/* </> Embed */}
              <button
                onClick={() => (onOpenEmbed ? onOpenEmbed(convertedTrack) : null)}
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
                        addToQueue(convertedTrack);
                        setShowAddMenu(false);
                      }}
                      className="w-full text-left px-3 py-1.5 rounded-lg text-xs text-white hover:bg-white/10 flex items-center gap-2"
                    >
                      <ListMusic className="w-3.5 h-3.5 text-gold" />
                      Add to Play Queue
                    </button>
                    <Link
                      to={`/playlists`}
                      onClick={() => setShowAddMenu(false)}
                      className="w-full text-left px-3 py-1.5 rounded-lg text-xs text-white hover:bg-white/10 flex items-center gap-2"
                    >
                      <Plus className="w-3.5 h-3.5 text-gold" />
                      Save to Playlist
                    </Link>
                  </div>
                )}
              </div>

              {/* ⬇ Download */}
              <button
                onClick={handleDownload}
                className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-text-secondary hover:text-white text-[10px] sm:text-[11px] font-medium transition-colors shrink-0"
              >
                <Download className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span>Download</span>
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
                className="flex items-center gap-1 hover:text-white transition-colors"
              >
                <Heart className={cn('w-3.5 h-3.5', liked ? 'text-red-500 fill-red-500' : '')} />
                <span>{likesCount}</span>
              </button>

              {/* Share */}
              <button
                onClick={handleShare}
                className="hover:text-white transition-colors p-1"
                title="Share Mix"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Share2 className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
